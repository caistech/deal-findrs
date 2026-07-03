import { describe, it, expect } from 'vitest'
import { runDealModel, emptyStageGate } from '../index'
import type { DealModelDealInput } from '../types'

/**
 * Adapter conformance — the DealFindrs input surface must produce the same V5 verdict
 * as the shared engine's golden sample. If this drifts from `@caistech/deal-model`'s
 * own golden test, the mapping in `toDealModelInputs` is wrong.
 *
 * Sample: 100 lots, $170k comps, Conception, Internal, Contractor, 100% capture
 * -> base ≈ $136,991.23/lot, net uplift ≈ 21.61%, ADJUST.
 */
const SAMPLE: DealModelDealInput = {
  opportunityId: '00000000-0000-0000-0000-000000000000',
  lots: 100,
  marketPricePerLot: 170_000,
  landPerLot: 20_000,
  infraPerLot: 80_000,
  softCostsPerLot: 6_000,
  educationPerLot: 4_000,
  developerSunkCostTotal: 300_000,
  externalQuotes: [0.08, 0.09, 0.12],
  fundingMode: 'Internal',
  civilMode: 'Contractor',
  homeCaptureRate: 1,
  f2kContributionTotal: 0,
  modularMarginPerHome: 30_000,
  stageGate: emptyStageGate(),
}

describe('deal-model adapter', () => {
  it('reproduces the V5 golden verdict through the DealFindrs input surface', () => {
    const { verdict, result } = runDealModel(SAMPLE)
    expect(verdict.verdict).toBe('ADJUST')
    expect(verdict.stageUsed).toBe('Conception')
    expect(verdict.baseRatePerLot).toBeCloseTo(136_991.23, 2)
    expect(verdict.netUpliftPctOfBase).toBeCloseTo(0.2161363, 6)
    expect(result.split.f2kShare).toBeCloseTo(0.6, 6)
    expect(result.partyOutcomes.length).toBe(6)
  })

  it('flips to STOP-style REJECT when the market cannot carry the base', () => {
    const { verdict } = runDealModel({ ...SAMPLE, marketPricePerLot: 150_000 })
    expect(verdict.verdict).toBe('REJECT')
  })
})
