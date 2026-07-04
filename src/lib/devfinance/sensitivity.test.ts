import { describe, it, expect } from 'vitest'
import { generateCashFlow } from './sensitivity'

const base = {
  landCost: 1_000_000,
  constructionCost: 0,
  otherCosts: 0,
  totalRevenue: 3_000_000,
  drawDown: [],
  programMonths: 6,
  salesStartMonth: 6,
  salesPeriodMonths: 6,
  interestRate: 0.12,
  loanAmount: 1_000_000,
}

describe('generateCashFlow — demand-backed salesProfile (3c-D)', () => {
  it('a front-loaded absorption curve cuts total interest vs the even spread', () => {
    const even = generateCashFlow(base)
    const frontLoaded = generateCashFlow({ ...base, salesProfile: [0.6, 0.2, 0.1, 0.1] })
    // Revenue arriving earlier pays the debt down sooner → less interest, lower peak debt.
    expect(frontLoaded.totalInterest).toBeLessThan(even.totalInterest)
    expect(frontLoaded.peakDebt).toBeLessThanOrEqual(even.peakDebt)
  })

  it('recognises the whole profile revenue (period length follows the profile, not salesPeriodMonths)', () => {
    const r = generateCashFlow({ ...base, salesPeriodMonths: 2, salesProfile: [0.25, 0.25, 0.25, 0.25] })
    const totalRevenue = r.periods.reduce((s, p) => s + p.revenue, 0)
    expect(totalRevenue).toBeCloseTo(base.totalRevenue, -3) // all 3M recognised across the 4-month profile
  })

  it('falls back to the even spread when no profile is given', () => {
    const even = generateCashFlow(base)
    const revMonths = even.periods.filter((p) => p.revenue > 0)
    expect(revMonths).toHaveLength(6) // salesPeriodMonths
  })
})
