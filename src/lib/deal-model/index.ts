import {
  computeDeal,
  runCashflow,
  type DealModelInputs,
  type DealModelResult,
  type CashflowInputs,
  type CashflowResult,
} from '@caistech/deal-model'
import type { DealModelDealInput, DealModelVerdict } from './types'

export * from './types'
export { computeDeal, runCashflow, DEFAULT_CONSTANTS, emptyStageGate, assignStage, resolveStage } from '@caistech/deal-model'
export type { DealModelResult, CashflowInputs, CashflowResult, CashflowStage } from '@caistech/deal-model'

/**
 * Indicative staging placeholders for the funder-cashflow — the workbook's own values
 * (5 build stages × 9 months, 75% first-tranche pay-out). These are OPERATOR-EDITABLE
 * defaults, replaced field-for-field when the Porter / QS staging plan lands (the two
 * hard data gaps in the fit assessment). Marked indicative in the UI so a viewer never
 * mistakes a placeholder for a firmed-up number.
 */
export const INDICATIVE_CASHFLOW_STAGING = {
  buildStages: 5,
  stageDurationMonths: 9,
  contributorPayoutPct: 0.75,
} as const

/**
 * Derive the cashflow's single `totalWorksToTitle` from the deal model's per-lot cost
 * lines, so the two models cannot drift on the works figure (fit assessment §5). Works to
 * title = civil + engineering + soft + education, per lot × lots. `civilEngFee` is the
 * deal model's 8%-of-infra engineering line (`baseRate.components.civilEngFee`).
 */
export function deriveWorksToTitle(deal: DealModelResult, lots: number): number {
  const c = deal.baseRate.components
  return (c.infra + c.civilEngFee + c.soft + c.education) * lots
}

/**
 * Build the canonical `CashflowInputs` from an already-computed deal result plus the
 * operator's cashflow-specific fields (contributions pool + staging). `sellingCostPct`
 * and `interestRate` are left to the engine defaults (the shared deal-model constants),
 * so the two models share one agent % and one rate.
 */
export function toCashflowInputs(args: {
  deal: DealModelResult
  lots: number
  salePricePerLot: number
  totalContributions: number
  contributorPayoutPct: number
  buildStages: number
  stageDurationMonths: number
  /** Optional explicit works total; defaults to the deal-model-derived figure. */
  totalWorksToTitle?: number
}): CashflowInputs {
  return {
    totalContributions: args.totalContributions,
    contributorPayoutPct: args.contributorPayoutPct,
    totalWorksToTitle: args.totalWorksToTitle ?? deriveWorksToTitle(args.deal, args.lots),
    saleableLots: args.lots,
    buildStages: args.buildStages,
    salePricePerLot: args.salePricePerLot,
    stageDurationMonths: args.stageDurationMonths,
  }
}

export function runCashflowFromDeal(args: Parameters<typeof toCashflowInputs>[0]): CashflowResult {
  return runCashflow(toCashflowInputs(args))
}

/**
 * Map the DealFindrs-facing input onto the canonical `@caistech/deal-model` inputs.
 *
 * Kept as a thin, explicit mapping (not a spread) so the field contract is visible and
 * a change in the shared engine surfaces as a type error here rather than silently.
 */
export function toDealModelInputs(input: DealModelDealInput): DealModelInputs {
  return {
    lots: input.lots,
    marketPricePerLot: input.marketPricePerLot,
    fundingMode: input.fundingMode,
    homeCaptureRate: input.homeCaptureRate,
    civilMode: input.civilMode,
    externalQuotes: input.externalQuotes,
    landPerLot: input.landPerLot,
    developerSunkCostTotal: input.developerSunkCostTotal,
    infraPerLot: input.infraPerLot,
    softCostsPerLot: input.softCostsPerLot,
    educationPerLot: input.educationPerLot,
    f2kContributionTotal: input.f2kContributionTotal,
    modularMarginPerHome: input.modularMarginPerHome,
    stageGate: input.stageGate,
    stageOverride: input.stageOverride,
    f2kShareOverride: input.f2kShareOverride,
    constants: input.constants,
  }
}

/**
 * Run the F2K deal model for an ingested deal and return the full result.
 *
 * Pure — no I/O. The route layer is responsible for persisting the result as an
 * immutable, versioned snapshot (see the pending `deal_model_snapshots` migration)
 * and for the GO-gated promotion to F2K-Projects. This function never writes.
 */
export function runDealModel(input: DealModelDealInput): {
  verdict: DealModelVerdict
  result: DealModelResult
} {
  const result = computeDeal(toDealModelInputs(input))
  return {
    verdict: {
      verdict: result.hurdle.verdict,
      developerThin: result.hurdle.developerThin,
      reason: result.hurdle.reason,
      stageUsed: result.stageUsed,
      baseRatePerLot: result.baseRate.baseRatePerLot,
      netUpliftPctOfBase: result.market.netUpliftPctOfBase,
    },
    result,
  }
}
