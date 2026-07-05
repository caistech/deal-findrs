import { chat, aiClient, AI_MODEL } from '@/lib/ai/client'
import type { ApprovalCondition, ExtractedApproval } from './types'

/** Vision-capable model for scanned/image documents; falls back to the default text model. */
const VISION_MODEL = process.env.DOC_VISION_MODEL || AI_MODEL

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

/** Validate/coerce the model's JSON field-by-field so a malformed response degrades to nulls. */
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
 * Extract the structured subdivision-approval fields from a document's TEXT via the DataWizz LLM.
 * Used for text PDFs (the WAPC decision letter). Malformed model output degrades to nulls.
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
  return normaliseExtraction(parseJson(raw) as Record<string, unknown>)
}

/**
 * Extract the structured subdivision-approval fields from page IMAGES via a vision LLM — the
 * scanned/image-PDF path (Phase 5). Reuses the same schema as the text path; mirrors
 * `@caistech/cert-extractor`'s image+vision approach but with our subdivision schema (cert-extractor's
 * output is certificate-specific). Requires a vision-capable `DOC_VISION_MODEL`.
 */
export async function extractApprovalFromImages(imageDataUrls: string[]): Promise<ExtractedApproval> {
  if (imageDataUrls.length === 0) throw new Error('no page images to extract')
  const content: Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }> = [
    { type: 'text', text: `${SCHEMA_HINT}\n\nThe document is provided as page images. Read every page.` },
    ...imageDataUrls.slice(0, 12).map((url) => ({ type: 'image_url' as const, image_url: { url } })),
  ]
  const res = await aiClient.instance.chat.completions.create({
    model: VISION_MODEL,
    temperature: 0,
    max_tokens: 4096,
    messages: [
      { role: 'system', content: SYSTEM },
      { role: 'user', content },
    ],
  })
  const raw = res.choices[0]?.message?.content
  if (!raw) throw new Error('vision extractor returned no content')
  return normaliseExtraction(parseJson(raw) as Record<string, unknown>)
}
