import { chat } from '@/lib/ai/client'
import type { ApprovalCondition, ExtractedApproval } from './types'

const SYSTEM = `You extract structured data from Australian subdivision planning documents (WAPC
decision letters, deposited/subdivision plans, lot-summary tables). Return ONLY a JSON object — no
prose, no code fences. Use null for anything not present. Do not guess numbers; read them from the
document. Convert areas to the requested units. Categorise each condition of approval.`

const SCHEMA_HINT = `Return this exact shape:
{
  "wapcRef": string|null,               // e.g. "202888"
  "approvalDate": string|null,          // ISO date if determinable
  "validUntil": string|null,
  "lga": string|null,                   // Local Government, e.g. "City of Greater Geraldton"
  "parentParcels": string|null,         // parent lots as written
  "planReferences": string|null,        // Plan/Diagram numbers
  "titleReferences": string|null,       // C/T Volume/Folio
  "residentialLots": number|null,       // TOTAL residential/saleable lots (the yield)
  "minLotSizeSqm": number|null,
  "avgLotSizeSqm": number|null,
  "maxLotSizeSqm": number|null,
  "netDevelopableHa": number|null,      // total lot area in hectares
  "parentAreaHa": number|null,          // parent landholding area in hectares
  "posSqm": number|null,                // public open space in m2
  "conditions": [                       // each numbered condition of approval
    { "number": number|null, "text": string, "authority": string|null,
      "category": "servicing"|"civil"|"constraint"|"tenure"|"statutory"|"admin" }
  ]
}
Category guide: servicing = power/water/sewer to each lot; civil = roads/earthworks/drainage/paths;
constraint = geotech/water-management/contamination/UXO; tenure = easements/reserves/POS vesting;
statutory = contributions/levies (education, cash-in-lieu); admin = plan modification/demolition/general.`

/** Strip accidental code fences and parse the model's JSON. */
function parseJson(raw: string): unknown {
  const cleaned = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('extractor returned no JSON object')
  return JSON.parse(cleaned.slice(start, end + 1))
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

/**
 * Extract the structured subdivision-approval fields from a document's text via the DataWizz LLM.
 * The caller passes the merged text of the decision letter (and optionally the plan summary). The
 * result is validated/coerced field-by-field so a malformed model response degrades to nulls rather
 * than throwing downstream.
 */
export async function extractApprovalFromText(text: string): Promise<ExtractedApproval> {
  const clipped = text.slice(0, 24_000) // decision letters + a plan summary fit well within this
  const raw = await chat(
    [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: `${SCHEMA_HINT}\n\nDOCUMENT TEXT:\n${clipped}` },
    ],
    { temperature: 0, maxTokens: 4096, metadata: { task: 'subdivision_approval_extract' } },
  )
  const o = parseJson(raw) as Record<string, unknown>
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
