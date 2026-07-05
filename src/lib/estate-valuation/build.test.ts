import { describe, it, expect } from 'vitest'
import { buildValuationPack, buildValuerPnl, buildValuerDcf, gateAvmConfidence, absorptionToSalesProfile } from './build'

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

describe('buildValuationPack — site risk (overlays / contamination)', () => {
  it('is low with no constraints and leaves the benchmark absorption unchanged', () => {
    const p = buildValuationPack({ lots: 24, grvPerLot: 400000, benchmarkRatePerMonth: 4 })
    expect(p.siteRisk.level).toBe('low')
    expect(p.siteRisk.absorptionFactor).toBe(1)
    expect(p.absorption.benchmarkRatePerMonth).toBe(4)
  })

  it('escalates with contamination + flood and slows the benchmark absorption', () => {
    const clean = buildValuationPack({ lots: 24, grvPerLot: 400000, benchmarkRatePerMonth: 10 })
    const risky = buildValuationPack({
      lots: 24, grvPerLot: 400000, benchmarkRatePerMonth: 10,
      siteRisk: { contaminated: true, overlays: ['Flood planning'] },
    })
    // contamination(3) + flood(2) = 5 → critical
    expect(risky.siteRisk.level).toBe('critical')
    expect(risky.siteRisk.factors).toContain('contamination recorded')
    expect(risky.siteRisk.absorptionFactor).toBeLessThan(1)
    expect(risky.absorption.benchmarkRatePerMonth).toBeLessThan(clean.absorption.benchmarkRatePerMonth)
  })

  it('flags a single report-required overlay as medium risk (0.9x absorption)', () => {
    const p = buildValuationPack({ lots: 20, grvPerLot: 400000, siteRisk: { overlays: ['Vegetation protection'] } })
    expect(p.siteRisk.level).toBe('medium')
    expect(p.siteRisk.absorptionFactor).toBe(0.9)
  })
})

describe('buildValuerPnl — residual land valuation (B6)', () => {
  // $12M GRV, $4.4M dev cost excl land, $3M land, 3.5% selling, 20% P&R, margin scheme.
  const pnl = buildValuerPnl({
    grossRealisation: 12_000_000,
    developmentCostExclLand: 4_400_000,
    landAcquisitionCost: 3_000_000,
    lots: 30,
    siteAreaSqm: 40_000,
  })

  it('nets GST on the margin only (margin scheme default)', () => {
    expect(pnl.gstScheme).toBe('margin')
    expect(pnl.gstOnSales).toBeCloseTo((12_000_000 - 3_000_000) / 11, 2) // 818,181.82
    expect(pnl.netRealisationExGst).toBeCloseTo(12_000_000 - 9_000_000 / 11, 2)
  })
  it('derives the residual land value via the P&L waterfall', () => {
    expect(pnl.grossProfitExGst).toBeCloseTo(10_800_000, 2)
    expect(pnl.profitAndRisk).toBeCloseTo(pnl.netRealisationExGst * 0.2, 2)
    expect(pnl.developmentCostExclLandExGst).toBeCloseTo(4_000_000, 2) // 4.4M ex-GST
    expect(pnl.residualLandValue).toBeCloseTo(4_563_636.36, 1)
  })
  it('ties out residual vs actual land cost (headroom)', () => {
    expect(pnl.landValueHeadroom).toBeCloseTo(pnl.residualLandValue - 3_000_000, 2)
    expect(pnl.landValueHeadroom).toBeGreaterThan(0) // worth more than paid
  })
  it('flags overpaying when land cost exceeds the residual', () => {
    const over = buildValuerPnl({
      grossRealisation: 12_000_000,
      developmentCostExclLand: 4_400_000,
      landAcquisitionCost: 6_000_000,
      lots: 30,
    })
    expect(over.landValueHeadroom).toBeLessThan(0)
  })
  it('emits per-lot and per-m² metrics', () => {
    expect(pnl.perLot.sales).toBeCloseTo(12_000_000 / 30, 2)
    expect(pnl.perSqm?.sales).toBeCloseTo(12_000_000 / 40_000, 2)
  })
  it('standard scheme taxes the full sale (lower net realisation than margin)', () => {
    const std = buildValuerPnl({
      grossRealisation: 12_000_000,
      developmentCostExclLand: 4_400_000,
      landAcquisitionCost: 3_000_000,
      lots: 30,
      gstScheme: 'standard',
    })
    expect(std.gstOnSales).toBeCloseTo(12_000_000 / 11, 2)
    expect(std.netRealisationExGst).toBeLessThan(pnl.netRealisationExGst)
    expect(std.residualLandValue).toBeLessThan(pnl.residualLandValue)
  })
})

describe('buildValuerDcf — IRR/NPV/NPV-basis RLV (B1)', () => {
  const dcf = buildValuerDcf({
    grvPerLot: 400_000,
    lots: 30,
    developmentCostExclLand: 4_400_000,
    landAcquisitionCost: 3_000_000,
    absorptionMonths: 24,
  })

  it('produces a finite annualised IRR and NPV', () => {
    expect(dcf.irrAnnual).not.toBeNull()
    expect(Number.isFinite(dcf.irrAnnual as number)).toBe(true)
    expect(Number.isFinite(dcf.npvAtDiscount)).toBe(true)
  })
  it('NPV-basis RLV = NPV + land (land price at which NPV = 0)', () => {
    expect(dcf.rlvNpv).toBeCloseTo(dcf.npvAtDiscount + 3_000_000, 2)
  })
  it('derives staging from lot count + absorption', () => {
    expect(dcf.buildStages).toBeGreaterThanOrEqual(2)
    expect(dcf.buildStages).toBeLessThanOrEqual(6)
    expect(dcf.stageDurationMonths).toBeGreaterThanOrEqual(3)
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
