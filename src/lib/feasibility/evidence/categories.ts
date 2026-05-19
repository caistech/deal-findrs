/**
 * Evidence category ↔ claim field mapping.
 *
 * Each uploaded evidence document is tagged with a category. The category
 * tells the engine which "flattering figure" claim fields the document can
 * back. Field-level linking is what makes a figure EVIDENCED rather than
 * ASSERTED — and that distinction is what the engine uses to substitute
 * conservative figures when documents are missing.
 *
 * Some categories back exactly one field (purchase_contract → land_value).
 * Some back multiple (independent_valuation backs land_value OR grv_total
 * depending on whether it's "as-is" or "on-completion") and the UI asks
 * the operator which one at link time.
 *
 * Operational evidence (da_approval, title_search) doesn't back a
 * flattering figure directly — it satisfies a critical-criterion check.
 */

export const EVIDENCE_CATEGORIES = [
  'purchase_contract',
  'independent_valuation',
  'comparable_sales_set',
  'executed_offtake',
  'signed_construction_contract',
  'equity_proof',
  'waitlist_register',
  'da_approval',
  'title_search',
  'other',
] as const

export type EvidenceCategory = (typeof EVIDENCE_CATEGORIES)[number]

export const CLAIM_FIELDS = [
  'land_value',
  'grv_total',
  'equity_cash',
  'pre_sales_percent',
  'construction_cost',
] as const

export type ClaimField = (typeof CLAIM_FIELDS)[number]

/**
 * Which claim fields a category can back. Empty array = operational
 * evidence that doesn't back a flattering figure (still required for
 * critical-criterion checks like DA approval / clear title).
 */
export const CATEGORY_BACKS: Record<EvidenceCategory, ClaimField[]> = {
  purchase_contract:            ['land_value'],
  independent_valuation:        ['land_value', 'grv_total'],
  comparable_sales_set:         ['grv_total'],
  executed_offtake:             ['grv_total', 'pre_sales_percent'],
  signed_construction_contract: ['construction_cost'],
  equity_proof:                 ['equity_cash'],
  waitlist_register:            ['pre_sales_percent'],
  da_approval:                  [],
  title_search:                 [],
  other:                        ['land_value', 'grv_total', 'equity_cash', 'pre_sales_percent', 'construction_cost'],
}

/**
 * Human-readable labels (used in the upload UI).
 */
export const CATEGORY_LABELS: Record<EvidenceCategory, { label: string; description: string }> = {
  purchase_contract:            { label: 'Purchase Contract', description: 'Executed contract of sale for the land — backs land value.' },
  independent_valuation:        { label: 'Independent Valuation', description: 'Certified valuer report — backs land value (as-is) or GRV (on-completion).' },
  comparable_sales_set:         { label: 'Comparable Sales', description: 'Dated comparable sales evidence — backs revenue / GRV.' },
  executed_offtake:             { label: 'Signed Offtake', description: 'Executed sale or pre-sale contract — backs GRV and pre-sales count.' },
  signed_construction_contract: { label: 'Construction Contract', description: 'Signed fixed-price construction contract — backs construction cost.' },
  equity_proof:                 { label: 'Equity Proof', description: 'Bank statement, capital call notice, or signed equity commitment — backs cash equity.' },
  waitlist_register:            { label: 'Waitlist Register', description: 'Verified registration data for demand — backs pre-sales / demand evidence.' },
  da_approval:                  { label: 'DA Approval', description: 'Development application approval document — required for non-rezoned deals.' },
  title_search:                 { label: 'Title Search', description: 'Recent title search — confirms clear title.' },
  other:                        { label: 'Other', description: 'Anything else relevant. You will select which figure it backs at link time.' },
}

/**
 * Which categories the engine flags as "required" before assessment can run.
 * Without these, T2 (Provable Sale Value) fails by construction.
 */
export const REQUIRED_CATEGORIES: EvidenceCategory[] = [
  'purchase_contract',
  'equity_proof',
]

/**
 * Helper — given a category and field-pick (only relevant when the category
 * backs more than one field), return the claim_field for the link row.
 */
export function resolveClaimField(
  category: EvidenceCategory,
  pickedField?: ClaimField
): ClaimField | null {
  const backs = CATEGORY_BACKS[category]
  if (backs.length === 0) return null
  if (backs.length === 1) return backs[0]
  if (pickedField && backs.includes(pickedField)) return pickedField
  // Default: first eligible field if no pick provided
  return backs[0]
}
