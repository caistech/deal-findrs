import { describe, it, expect } from 'vitest'
import { buildSensitivity, runFeasibility } from './build'
import type { FeasibilityBase } from './types'

const BASE: FeasibilityBase = {
  lots: 30,
  salePricePerLot: 400_000, // 12M sale value
  worksTotal: 4_400_000,
  landCost: 3_000_000,
  constructionMonths: 12,
  sellMonths: 18,
  interestRate: 0.12,
}

describe('runFeasibility', () => {
  const p = runFeasibility(BASE)
  it('computes sale value, dev cost (incl finance), margin, MDC, IRR', () => {
    expect(p.saleValue).toBe(30 * 400_000)
    expect(p.devCost).toBeGreaterThan(BASE.landCost + BASE.worksTotal) // + selling + finance
    expect(p.margin).toBeCloseTo(p.saleValue - p.devCost, 2)
    expect(p.mdc).toBeCloseTo(p.margin / p.devCost, 6)
    expect(p.irrAnnual).not.toBeNull()
  })
})

describe('buildSensitivity — six single-variable tables', () => {
  const s = buildSensitivity(BASE)

  it('produces the six axes, 11 rows each, one base row per table', () => {
    expect(s.tables.map((t) => t.key)).toEqual([
      'land',
      'construction',
      'constructionPeriod',
      'sellIncome',
      'sellPeriod',
      'interest',
    ])
    for (const t of s.tables) {
      expect(t.rows).toHaveLength(11)
      expect(t.rows.filter((r) => r.isBase)).toHaveLength(1)
    }
  })

  it('higher construction cost lowers margin + MDC', () => {
    const t = s.tables.find((x) => x.key === 'construction')!
    expect(t.rows[10].margin).toBeLessThan(t.rows[0].margin)
    expect(t.rows[10].mdc).toBeLessThan(t.rows[0].mdc)
  })

  it('higher sell price raises margin (and IRR)', () => {
    const t = s.tables.find((x) => x.key === 'sellIncome')!
    expect(t.rows[10].margin).toBeGreaterThan(t.rows[0].margin)
    if (t.rows[0].irrAnnual != null && t.rows[10].irrAnnual != null) {
      expect(t.rows[10].irrAnnual).toBeGreaterThan(t.rows[0].irrAnnual)
    }
  })

  it('higher interest rate lowers MDC (more finance cost in TDC)', () => {
    const t = s.tables.find((x) => x.key === 'interest')!
    expect(t.rows[10].mdc).toBeLessThan(t.rows[0].mdc)
  })
})
