import type { SupabaseClient } from '@supabase/supabase-js'
import type { ClaimField, EvidenceCategory } from './categories'
import { CATEGORY_BACKS } from './categories'

export type { ClaimField, EvidenceCategory } from './categories'
export {
  EVIDENCE_CATEGORIES,
  CLAIM_FIELDS,
  CATEGORY_BACKS,
  CATEGORY_LABELS,
  REQUIRED_CATEGORIES,
  resolveClaimField,
} from './categories'

export interface EvidenceRow {
  id: string
  opportunity_id: string
  company_id: string
  category: EvidenceCategory
  storage_path: string
  original_filename: string | null
  file_size_bytes: number | null
  mime_type: string | null
  extracted_fields: Record<string, unknown>
  extraction_confidence: number | null
  verified_by_user: boolean
  uploader_id: string | null
  received_at: string
}

export interface FieldLink {
  id: string
  opportunity_id: string
  claim_field: ClaimField
  evidence_id: string
  evidence_value_numeric: number | null
  notes: string | null
}

export interface EvidenceForField {
  field: ClaimField
  documents: EvidenceRow[]
  /** Best evidenced numeric value for this field, if any link carried one. */
  evidencedValue: number | null
  /** True if at least one document is attached. */
  isEvidenced: boolean
}

export interface EvidenceIndex {
  /** Raw evidence rows attached to this opportunity. */
  documents: EvidenceRow[]
  /** Raw link rows. */
  links: FieldLink[]
  /** Per-field summary — easy to ask "is X evidenced?". */
  byField: Record<ClaimField, EvidenceForField>
  /** Categories present (regardless of field link). Used for operational checks
   *  like "is there a da_approval document?". */
  categoriesPresent: Set<EvidenceCategory>
}

/**
 * Build a typed evidence index for a single opportunity. Reads
 * deal_evidence and field_evidence_links via the supplied client.
 *
 * Callers should pass either an authenticated user-scoped client (RLS
 * enforces company isolation) or the service-role admin client when the
 * caller has already verified ownership.
 */
export async function buildEvidenceIndex(
  client: SupabaseClient,
  opportunityId: string
): Promise<EvidenceIndex> {
  const [{ data: docs, error: docsErr }, { data: links, error: linksErr }] = await Promise.all([
    client
      .from('deal_evidence')
      .select('id, opportunity_id, company_id, category, storage_path, original_filename, file_size_bytes, mime_type, extracted_fields, extraction_confidence, verified_by_user, uploader_id, received_at')
      .eq('opportunity_id', opportunityId),
    client
      .from('field_evidence_links')
      .select('id, opportunity_id, claim_field, evidence_id, evidence_value_numeric, notes')
      .eq('opportunity_id', opportunityId),
  ])

  if (docsErr) throw new Error(`Failed to load evidence: ${docsErr.message}`)
  if (linksErr) throw new Error(`Failed to load evidence links: ${linksErr.message}`)

  const documents = (docs ?? []) as unknown as EvidenceRow[]
  const linkRows = (links ?? []) as unknown as FieldLink[]

  return assembleIndex(documents, linkRows)
}

/**
 * Pure-functional core — assemble an index from raw rows. Exposed so tests
 * and the regression fixture can build an index without touching the DB.
 */
export function assembleIndex(documents: EvidenceRow[], links: FieldLink[]): EvidenceIndex {
  const docById = new Map(documents.map(d => [d.id, d]))

  const allFields = Object.keys(CATEGORY_BACKS).flatMap(c => CATEGORY_BACKS[c as EvidenceCategory])
  const uniqueFields = Array.from(new Set(allFields)) as ClaimField[]

  const byField: Record<string, EvidenceForField> = {}
  for (const f of uniqueFields) {
    byField[f] = { field: f, documents: [], evidencedValue: null, isEvidenced: false }
  }

  for (const link of links) {
    const bucket = byField[link.claim_field]
    if (!bucket) continue
    const doc = docById.get(link.evidence_id)
    if (doc) {
      bucket.documents.push(doc)
      bucket.isEvidenced = true
      // Prefer link-supplied evidenced value (most recent wins).
      if (typeof link.evidence_value_numeric === 'number' && Number.isFinite(link.evidence_value_numeric)) {
        bucket.evidencedValue = link.evidence_value_numeric
      }
    }
  }

  const categoriesPresent = new Set<EvidenceCategory>(documents.map(d => d.category))

  return {
    documents,
    links,
    byField: byField as EvidenceIndex['byField'],
    categoriesPresent,
  }
}

/**
 * Returns the conservative-evidenced value for a numeric field — the minimum
 * across all evidenced values, since when multiple documents disagree the
 * lender takes the lower figure (the brief: "Land value = the lower of
 * evidenced purchase price and a current independent 'as-is' valuation").
 */
export function evidencedValueForField(idx: EvidenceIndex, field: ClaimField): number | null {
  const bucket = idx.byField[field]
  if (!bucket || !bucket.isEvidenced) return null
  // Collect every numeric value from links for this field
  const numericValues = idx.links
    .filter(l => l.claim_field === field && typeof l.evidence_value_numeric === 'number')
    .map(l => l.evidence_value_numeric as number)
  if (numericValues.length === 0) return null
  return Math.min(...numericValues)
}
