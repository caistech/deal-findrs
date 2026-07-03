import type {
  CivilMode,
  FundingMode,
  Stage,
  StageGateTicks,
  Verdict,
} from '@caistech/deal-model'

/**
 * DealFindrs-facing input for the F2K Generic Estate Deal Model.
 *
 * This is deliberately SEPARATE from the existing `OpportunityInput` / feasibility
 * engine (which answers a different question — lender credibility, RAG). This model
 * answers the F2K PARTNERSHIP question: base price, uplift split, GO/ADJUST/REJECT.
 *
 * The economics numbers here are the ones INGESTED from the external, developer-paid
 * INDICATIVE feasibility study (the numbers that arrive as `deal_evidence` and are
 * extracted / operator-verified). The F2K deal knobs (funding/civil mode, home-capture,
 * splits, thresholds) are F2K's own partnership parameters, not the developer's.
 *
 * UNITS: fields ending `PerLot` are per lot; fields ending `Total` are whole-of-estate.
 */
export interface DealModelDealInput {
  /** Stable opportunity/deal id this snapshot belongs to. */
  opportunityId: string

  // ── Ingested from the ESTATE (opportunity + indicative feasibility study) ──
  lots: number
  marketPricePerLot: number
  landPerLot: number
  infraPerLot: number
  softCostsPerLot: number
  educationPerLot: number
  developerSunkCostTotal: number
  /** Live dev-finance quotes from the study; external average = mean. */
  externalQuotes: number[]

  // ── F2K partnership knobs ──
  fundingMode: FundingMode
  civilMode: CivilMode
  /** 0..1 — fraction of lots F2K builds homes on. */
  homeCaptureRate: number
  f2kContributionTotal: number
  modularMarginPerHome: number

  // ── Stage ──
  /** The 21 evidence gates (drives the entry-stage split). */
  stageGate: StageGateTicks
  /** Manual stage override (logged separately as an audit-distinct action). */
  stageOverride?: Stage
  /** Manual F2K uplift-share override (logged separately). */
  f2kShareOverride?: number
}

/** The headline outcome a DealFindrs caller cares about. */
export interface DealModelVerdict {
  verdict: Verdict
  developerThin: boolean
  reason: string
  stageUsed: Stage
  baseRatePerLot: number
  netUpliftPctOfBase: number
}

export type { CivilMode, FundingMode, Stage, StageGateTicks, Verdict }
