/**
 * Estate QS cost buildup (Checklist 2) — a LOT-LEVEL cost model for a land subdivision, with an
 * optional House-&-Land construction line layered per captured lot.
 *
 * Phase 3 decision (docs/estate-constraints-yield-plan.md): the deal-model is the lot-based finance
 * home; this buildup reuses devfinance's regional cost engine (getRegionalFactor +
 * calculateConstructionCost for the H&L home line) via a thin lot-level adapter. Every line carries
 * its basis + source so a QS reviews/certifies rather than rebuilds. The land-development per-lot
 * subtotals feed the deal-model inputs (infraPerLot / softCostsPerLot / …); the H&L home line is the
 * buyer's build cost (informational for the QS pack), NOT a land-development input to the deal-model.
 */

export type CostLineSource =
  | 'benchmark' // indicative rate table — QS to confirm
  | 'operator' // supplied by the operator (e.g. known land price)
  | 'devfinance-engine' // computed by the shared devfinance cost engine (H&L home line)

export type CostCategory =
  | 'Land'
  | 'Civil / Infrastructure'
  | 'Professional / Soft'
  | 'Statutory / Contributions'
  | 'Contingency'
  | 'House & Land'

export interface EstateCostLine {
  key: string
  label: string
  category: CostCategory
  /** Dollars per lot. */
  perLot: number
  /** The working — how the figure was reached (rate × region factor, % of civil, engine subtotal…). */
  basis: string
  source: CostLineSource
}

export interface EstateCostPack {
  lots: number
  state: string
  city: string
  /** Regional cost multiplier applied to the benchmark rates (Sydney = 1.00). */
  regionFactor: number
  lines: EstateCostLine[]

  // ── Rolled per-lot subtotals (the land-development figures that feed the deal-model) ──
  landPerLot: number
  civilPerLot: number // → deal-model infraPerLot
  softPerLot: number // → deal-model softCostsPerLot
  statutoryPerLot: number // → deal-model educationPerLot (contributions bucket)
  contingencyPerLot: number
  /** Total land-development cost per lot (excludes the H&L home build). */
  landDevCostPerLot: number

  // ── House & Land (optional) ──
  homeCaptureRate: number // 0..1 — fraction of lots delivered as H&L
  /** Indicative modular home construction cost per delivered home (buyer's build cost). Null if not H&L. */
  homeConstructionPerHome: number | null

  /** Whole-of-estate land-development cost = landDevCostPerLot × lots. */
  totalLandDevCost: number
}

/** Inputs to the buildup — what can't be benchmarked (lots, state, known land price, H&L intent). */
export interface EstateCostInput {
  lots: number
  state: string
  city?: string
  /** Known land price per lot (e.g. opportunity land cost ÷ lots). Benchmarked if omitted. */
  landPerLot?: number
  /** 0..1 — fraction of lots delivered as House & Land; 0 (or omitted) = land subdivision only. */
  homeCaptureRate?: number
  /** The modular home spec for the H&L construction line (only used when homeCaptureRate > 0). */
  homeSpec?: { floorAreaSqm: number; bedrooms: number; bathrooms: number; quality?: 'low' | 'medium' | 'high' }
  /**
   * Terrain from the site profile (property-services `terrain`). Slope scales the slope-sensitive
   * civil lines (bulk earthworks, roadworks) and adds a retaining allowance on moderate/steep sites —
   * so a steep block no longer costs the same as a flat one. Omitted → flat assumption (factor 1.0).
   */
  terrain?: { slopePercent?: number | null; buildability?: string | null }
  /** Operator overrides of any benchmark line, keyed by line key → $/lot. An override wins over the
   *  slope adjustment (the operator's number is final). */
  overrides?: Record<string, number>
}
