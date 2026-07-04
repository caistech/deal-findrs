/**
 * Estate GRV & absorption (Checklist 3) — the valuer's slice.
 *
 * Phase 3c decisions (docs/estate-constraints-yield-plan.md):
 *  - GRV/lot is the operator/study figure the valuer CERTIFIES, cross-checked against the Domain AVM
 *    of the subject site (a corroborating signal — Domain's tier is estimate-only, no sold comps),
 *    confidence-gated natively by Domain's raw `priceConfidence` enum (degrade-don't-fake).
 *  - Absorption is a two-phase curve: an evidence-gated pre-sales burst → a benchmark monthly tail,
 *    emitting a monthly take-up vector (fed into the cash-flow when scope allows).
 */

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

export interface EstateValuationPack {
  lots: number
  /** Finished-lot GRV per lot — the operator/study figure the valuer certifies. */
  grvPerLot: number
  totalGrv: number
  /** Independent Domain AVM cross-check (null client-side / when not fetched). */
  avm: AvmCrossCheck | null
  absorption: AbsorptionCurve
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
}
