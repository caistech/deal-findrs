import {
  computeDeal,
  type DealModelInputs,
  type DealModelResult,
} from '@caistech/deal-model'
import type { DealModelDealInput, DealModelVerdict } from './types'

export * from './types'
export { computeDeal, DEFAULT_CONSTANTS, emptyStageGate, assignStage, resolveStage } from '@caistech/deal-model'
export type { DealModelResult } from '@caistech/deal-model'

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
