import { describe, it, expect } from 'vitest'
import { buildValuationPack, gateAvmConfidence, absorptionToSalesProfile } from './build'

describe('gateAvmConfidence', () => {
  it('asserts on confident / recentlySold, degrades otherwise', () => {
    expect(gateAvmConfidence('confident')).toBe('assert')
    expect(gateAvmConfidence('recentlySold')).toBe('assert')
    expect(gateAvmConfidence('historic')).toBe('indicative')
    expect(gateAvmConfidence('notAvailable')).toBe('indicative')
    expect(gateAvmConfidence(null)).toBe('indicative')
  })
})

describe('buildValuationPack — GRV', () => {
  it('rolls GRV per lot into a total; AVM starts null (attached async)', () => {
    const p = buildValuationPack({ lots: 30, grvPerLot: 420000 })
    expect(p.totalGrv).toBe(30 * 420000)
    expect(p.avm).toBeNull()
  })
})

describe('buildValuationPack — absorption two-phase curve', () => {
  it('builds a pre-sold burst then a benchmark tail, and the vector sums to lots', () => {
    const p = buildValuationPack({ lots: 40, grvPerLot: 400000, preSalesPercent: 0.5, benchmarkRatePerMonth: 4, burstMonths: 2 })
    const a = p.absorption
    expect(a.preSoldLots).toBe(20)
    expect(a.benchmarkOnly).toBe(false)
    expect(a.burstMonths).toBe(2)
    // remaining 20 at 4/month → 5 tail months
    expect(a.tailMonths).toBe(5)
    expect(a.monthly.reduce((s, v) => s + v, 0)).toBe(40)
    // first two months carry the burst (10 each), heavier than the tail rate
    expect(a.monthly[0]).toBeGreaterThan(a.benchmarkRatePerMonth)
  })

  it('degrades to a benchmark-only tail when there is no pre-sales evidence', () => {
    const p = buildValuationPack({ lots: 24, grvPerLot: 400000, benchmarkRatePerMonth: 3 })
    const a = p.absorption
    expect(a.preSoldLots).toBe(0)
    expect(a.benchmarkOnly).toBe(true)
    expect(a.burstMonths).toBe(0)
    expect(a.totalMonths).toBe(8) // 24 / 3
    expect(a.monthly.every((v) => v <= 3)).toBe(true)
    expect(a.monthly.reduce((s, v) => s + v, 0)).toBe(24)
  })

  it('defaults the benchmark rate from estate size (never below 2/month)', () => {
    expect(buildValuationPack({ lots: 6, grvPerLot: 1 }).absorption.benchmarkRatePerMonth).toBe(2)
    expect(buildValuationPack({ lots: 60, grvPerLot: 1 }).absorption.benchmarkRatePerMonth).toBe(5)
  })
})

describe('absorptionToSalesProfile (3c-D)', () => {
  it('converts a take-up vector to revenue fractions summing to 1', () => {
    const profile = absorptionToSalesProfile([10, 4, 4, 2])
    expect(profile.reduce((s, v) => s + v, 0)).toBeCloseTo(1, 6)
    expect(profile[0]).toBeCloseTo(0.5, 6) // 10/20 front-loaded
  })

  it('returns [] for an empty/zero vector (cash-flow falls back to even spread)', () => {
    expect(absorptionToSalesProfile([])).toEqual([])
    expect(absorptionToSalesProfile([0, 0])).toEqual([])
  })
})
