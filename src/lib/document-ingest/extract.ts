import Anthropic from '@anthropic-ai/sdk'
import type { ApprovalCondition, ExtractedApproval } from './types'

/**
 * Subdivision-approval extraction via Claude direct (@anthropic-ai/sdk) — the portfolio-standard
 * document-extraction path (mmcbuild / F2K-Checkpoint / NDIS all use Anthropic-direct, not a gateway).
 *
 * The PDF is sent as a NATIVE `document` block (Claude reads PDFs directly — text AND scanned —
 * so there is no unpdf/pdf-to-text/pdf-to-image branching), and the structured fields are forced
 * through a `tool_use` input_schema so the model returns valid JSON rather than free text we parse.
 * Mirrors mmcbuild's `cert-metadata.ts` (record_cert_metadata tool) + NDIS's ai-extract client.
 */

// Yield (residentialLots) is the load-bearing number, so accuracy > cost here (one call per deal).
// Validated on the Seafields WAPC 202888 letter: sonnet-4-6 reads 145 lots (correct); haiku-4-5
// misread 143. sonnet-4-6 is deterministic at temperature 0 (sonnet-5 rejects temp 0). Overridable.
const MODEL = process.env.DOC_EXTRACT_MODEL || 'claude-sonnet-4-6'

let _client: Anthropic | null = null
function client(): Anthropic {
  if (!_client) {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not configured')
    _client = new Anthropic({ apiKey })
  }
  return _client
}

const SYSTEM = `You extract structured data from Australian subdivision planning documents (WAPC
decision letters, deposited/subdivision plans, lot-summary tables). Read numbers from the document —
never guess them. Use null for anything not present. Convert areas to the requested units. Categorise
each condition of approval. Return the result ONLY via the record_subdivision_approval tool.`

/** Forces the structured shape — the model must call this tool with exactly these fields. */
const EXTRACT_TOOL: Anthropic.Tool = {
  name: 'record_subdivision_approval',
  description: 'Record the structured fields extracted from an Australian subdivision planning document.',
  input_schema: {
    type: 'object',
    properties: {
      wapcRef: { type: ['string', 'null'], description: 'WAPC application reference, e.g. "202888"' },
      approvalDate: { type: ['string', 'null'], description: 'ISO date if determinable' },
      validUntil: { type: ['string', 'null'] },
      lga: { type: ['string', 'null'], description: 'Local Government, e.g. "City of Greater Geraldton"' },
      parentParcels: { type: ['string', 'null'], description: 'parent lots as written' },
      planReferences: { type: ['string', 'null'], description: 'Plan/Diagram numbers' },
      titleReferences: { type: ['string', 'null'], description: 'C/T Volume/Folio' },
      residentialLots: { type: ['number', 'null'], description: 'TOTAL residential/saleable lots (the yield)' },
      minLotSizeSqm: { type: ['number', 'null'] },
      avgLotSizeSqm: { type: ['number', 'null'] },
      maxLotSizeSqm: { type: ['number', 'null'] },
      netDevelopableHa: { type: ['number', 'null'], description: 'total lot area in hectares' },
      parentAreaHa: { type: ['number', 'null'], description: 'parent landholding area in hectares' },
      posSqm: { type: ['number', 'null'], description: 'public open space in m2' },
      conditions: {
        type: 'array',
        description: 'each numbered condition of approval',
        items: {
          type: 'object',
          properties: {
            number: { type: ['number', 'null'] },
            text: { type: 'string' },
            authority: { type: ['string', 'null'] },
            category: {
              type: 'string',
              enum: ['servicing', 'civil', 'constraint', 'tenure', 'statutory', 'admin'],
              description:
                'servicing=power/water/sewer to each lot; civil=roads/earthworks/drainage/paths; ' +
                'constraint=geotech/water-management/contamination/UXO; tenure=easements/reserves/POS vesting; ' +
                'statutory=contributions/levies (education, cash-in-lieu); admin=plan modification/demolition/general',
            },
          },
          required: ['text', 'category'],
        },
      },
    },
    required: ['residentialLots', 'conditions'],
  },
}

function num(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    const n = Number(v.replace(/[, ]/g, ''))
    return Number.isFinite(n) ? n : null
  }
  return null
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null
}

const CATEGORIES = new Set(['servicing', 'civil', 'constraint', 'tenure', 'statutory', 'admin'])

function normaliseConditions(v: unknown): ApprovalCondition[] {
  if (!Array.isArray(v)) return []
  return v
    .map((c): ApprovalCondition | null => {
      if (!c || typeof c !== 'object') return null
      const o = c as Record<string, unknown>
      const text = str(o.text)
      if (!text) return null
      const category = CATEGORIES.has(o.category as string) ? (o.category as ApprovalCondition['category']) : 'admin'
      return { number: num(o.number), text, authority: str(o.authority), category }
    })
    .filter((c): c is ApprovalCondition => c !== null)
}

/** Validate/coerce the tool input field-by-field so a malformed response degrades to nulls. */
function normaliseExtraction(o: Record<string, unknown>): ExtractedApproval {
  return {
    wapcRef: str(o.wapcRef),
    approvalDate: str(o.approvalDate),
    validUntil: str(o.validUntil),
    lga: str(o.lga),
    parentParcels: str(o.parentParcels),
    planReferences: str(o.planReferences),
    titleReferences: str(o.titleReferences),
    residentialLots: num(o.residentialLots),
    minLotSizeSqm: num(o.minLotSizeSqm),
    avgLotSizeSqm: num(o.avgLotSizeSqm),
    maxLotSizeSqm: num(o.maxLotSizeSqm),
    netDevelopableHa: num(o.netDevelopableHa),
    parentAreaHa: num(o.parentAreaHa),
    posSqm: num(o.posSqm),
    conditions: normaliseConditions(o.conditions),
  }
}

/**
 * Extract the structured subdivision-approval fields from a PDF (base64), sent to Claude as a native
 * `document` block. Handles both text and scanned/image PDFs in a single path. Malformed model output
 * degrades to nulls via {@link normaliseExtraction}.
 */
export async function extractApprovalFromPdf(pdfBase64: string): Promise<ExtractedApproval> {
  const res = await client().messages.create({
    model: MODEL,
    max_tokens: 4096,
    temperature: 0,
    system: SYSTEM,
    tools: [EXTRACT_TOOL],
    tool_choice: { type: 'tool', name: 'record_subdivision_approval' },
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 },
          },
          {
            type: 'text',
            text: 'Extract the subdivision-approval fields from this document using the record_subdivision_approval tool. Read every page.',
          },
        ],
      },
    ],
  })

  const toolUse = res.content.find((c): c is Anthropic.ToolUseBlock => c.type === 'tool_use')
  if (!toolUse) throw new Error('extractor returned no structured tool output')
  return normaliseExtraction(toolUse.input as Record<string, unknown>)
}
