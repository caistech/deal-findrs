/**
 * Estate GRV & absorption (Checklist 3) — the valuer's slice.
 *
 * Phase 3c decisions (docs/estate-constraints-yield-plan.md):
 *  - GRV/lot is the operator/study figure the valuer CERTIFIES, cross-checked against the Domain AVM
 *    of the subject site (a corroborating signal — Domain's tier is estimate-only, no sold comps),
 *    confidence-gated natively by Domain's raw `priceConfidence` enum (degrade-don't-fake).
 *  - Absorption is a two-phase curve: an evidence-gated pre-sales burst → a benchmark monthly tail,
 *    emitting a monthly take-up vector (fed into the cash-flow when scope allows).
 *  - The residual-land P&L (hypothetical-development method) nets GST via the shared deal-model
 *    engine and deducts the QS costs + profit & risk to derive what the land is worth.
 */
import type { GstScheme } from '@caistech/deal-model'

/** How much to trust the AVM cross-check, from Domain's own confidence descriptor. */
export type AvmGate = 'assert' | 'indicative'

/** Independent Domain AVM of the subject SITE (≈ current land value), confidence-gated. */
export interface AvmCrossCheck {
  mid: number | null
  lower: number | null
  upper: number | null
  /** Raw Domain `priceConfidence` (e.g. 'confident' | 'recentlySold' | 'historic' | 'notAvailable'). */
  confidence: string | null
  estimateDate: string | null
  gate: AvmGate
  /** Divergence of a reference value (site/land acquisition) vs the AVM mid, as a signed fraction. Null if no mid/reference. */
  divergencePct: number | null
  /** Set when the AVM couldn't be fetched (no key, notAvailable, error) — the pack degrades, never fakes. */
  unavailableReason?: string
}

/** A two-phase demand-backed take-up curve. */
export interface AbsorptionCurve {
  /** Evidence-gated pre-sales fraction (0..1). 0 when there's no waitlist/offtake evidence. */
  preSalesPercent: number
  preSoldLots: number
  /** Months over which the pre-sold tranche settles (the burst). */
  burstMonths: number
  /** Benchmark lots sold per month for the open-market remainder. */
  benchmarkRatePerMonth: number
  /** Months to clear the open-market remainder after the burst. */
  tailMonths: number
  totalMonths: number
  /** Lots settled per month across the whole sell-down (index 0 = month 1). */
  monthly: number[]
  /** True when there was no demand evidence, so only the benchmark tail applies. */
  benchmarkOnly: boolean
}

/** Constraint-driven site risk (overlays / contamination / flood) — the valuer's saleability lens. */
export type SiteRiskLevel = 'low' | 'medium' | 'high' | 'critical'

export interface SiteRiskAssessment {
  level: SiteRiskLevel
  /** The specific constraints that drove the level (for the pack narrative). */
  factors: string[]
  commentary: string
  /** Multiplier applied to the benchmark open-market absorption rate (≤1 slows the sell-down). */
  absorptionFactor: number
}

export interface EstateValuationPack {
  lots: number
  /** Finished-lot GRV per lot — the operator/study figure the valuer certifies. */
  grvPerLot: number
  totalGrv: number
  /** Independent Domain AVM cross-check (null client-side / when not fetched). */
  avm: AvmCrossCheck | null
  absorption: AbsorptionCurve
  /** Site-constraint risk (overlays/contamination/flood) — informs the certified GRV + absorption. */
  siteRisk: SiteRiskAssessment
  /** Residual-land P&L (hypothetical-development method) — attached in the route where the QS costs
   *  are known. Null when the cost pack isn't available. */
  pnl: ValuerResidualPnl | null
}

// ---- Residual-land P&L (Feastudy "Valuer's-Style" hypothetical-development method) ----

/** Inputs to the residual land valuation — all money is GST-INCLUSIVE (whole-of-project). */
export interface ValuerResidualPnlInput {
  /** Total GST-inclusive gross realisation (all finished lots). */
  grossRealisation: number
  /** GST-inclusive development cost EXCLUDING land — the QS pack's civil + soft + statutory +
   *  contingency (the cost/value tie-out point). Carries claimable GST. */
  developmentCostExclLand: number
  /** The operator's actual/intended GST-inclusive land price — used for the margin-scheme GST calc
   *  AND as the tie-out benchmark against the residual land value. */
  landAcquisitionCost: number
  /** Selling/agent cost as a fraction of GRV (default 0.035). Carries claimable GST. */
  sellingCostPct?: number
  /** Developer's required profit & risk, as a fraction of net (ex-GST) realisation (default 0.20). */
  profitAndRiskPct?: number
  /** GST scheme (default "margin" — the subdivision norm). */
  gstScheme?: GstScheme
  lots: number
  /** Site area (sqm) for the per-m² footer; omit to skip those lines. */
  siteAreaSqm?: number | null
}

/** The residual P&L — the hypothetical-development valuation deriving what the land is worth. */
export interface ValuerResidualPnl {
  gstScheme: GstScheme
  grossRealisation: number
  gstOnSales: number
  netRealisationExGst: number
  sellingCostsExGst: number
  grossProfitExGst: number
  profitAndRisk: number
  profitAndRiskPct: number
  contributionToDevCosts: number
  developmentCostExclLandExGst: number
  /** The residual — what the site is worth given target profit & the QS costs. */
  residualLandValue: number
  /** The operator's actual land price (the tie-out benchmark). */
  actualLandCost: number
  /** residual − actual: positive = headroom (worth more than paid); negative = overpaying. */
  landValueHeadroom: number
  /** Per-lot metrics: total development cost, sales, land — the Feastudy footer. */
  perLot: { totalDevCost: number; sales: number; land: number }
  /** Per-m² metrics (null when site area unknown). */
  perSqm: { totalDevCost: number; sales: number; land: number } | null
}

/** Inputs to the pure buildup — the AVM is attached separately (it's async I/O). */
export interface EstateValuationInput {
  lots: number
  grvPerLot: number
  /** Evidence-gated pre-sales fraction (0..1); 0 or omitted → benchmark-only absorption. */
  preSalesPercent?: number
  /** Benchmark open-market absorption (lots/month). Defaults to a conservative rate scaled to estate size. */
  benchmarkRatePerMonth?: number
  /** Months the pre-sold tranche takes to settle. Default 3. */
  burstMonths?: number
  /**
   * Site constraints that bear on saleability/value: overlay names that require a report (flood,
   * heritage, character, coastal…) + a contamination flag (e.g. from a panel-review write-back).
   * Elevated risk slows the benchmark absorption and flags a GRV constraint-discount for review.
   */
  siteRisk?: { overlays?: string[]; contaminated?: boolean; floodAffected?: boolean }
}
