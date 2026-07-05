import { irr, periodToAnnualRate } from '@caistech/deal-model'
import type {
  EstateSensitivity,
  FeasibilityBase,
  FeasibilityPoint,
  SensitivityKey,
  SensitivityRow,
  SensitivityTable,
} from './types'

/**
 * One feasibility point: builds the monthly UNLEVERED project cash-flow (land at t0, works spread
 * over the construction months, net sales over the sell months after) and derives sale value, TDC,
 * margin, MDC and the annualised project IRR (via the shared deal-model `irr`). Finance is an
 * interest-on-outstanding-balance cost folded into TDC; the IRR itself is unlevered (project return).
 * Pure.
 */
export function runFeasibility(b: FeasibilityBase): FeasibilityPoint {
  const sellingCostPct = b.sellingCostPct ?? 0.035
  const saleValue = b.lots * b.salePricePerLot
  const sellingCosts = saleValue * sellingCostPct
  const construction = Math.max(1, Math.round(b.constructionMonths))
  const sell = Math.max(1, Math.round(b.sellMonths))

  // Monthly project net flow: −land at month 0, −works over construction, +net sales over sell.
  const flows: number[] = [-Math.abs(b.landCost)]
  for (let m = 1; m <= construction + sell; m++) {
    let f = 0
    if (m <= construction) f -= b.worksTotal / construction
    if (m > construction) f += (saleValue - sellingCosts) / sell
    flows.push(f)
  }

  // Finance: interest on the running outstanding balance, capitalised monthly (a cost line in TDC).
  let balance = 0
  let financeCost = 0
  const monthlyRate = b.interestRate / 12
  for (const f of flows) {
    balance -= f // an outflow (negative f) grows the balance
    if (balance > 0) {
      const interest = balance * monthlyRate
      financeCost += interest
      balance += interest
    }
  }

  const devCost = Math.abs(b.landCost) + b.worksTotal + sellingCosts + financeCost
  const margin = saleValue - devCost
  const mdc = devCost > 0 ? margin / devCost : 0
  const perPeriod = irr(flows)
  const irrAnnual = perPeriod == null ? null : periodToAnnualRate(perPeriod, 12)

  return { saleValue, devCost, margin, mdc, irrAnnual }
}

/** ±10% in 2% steps (11 rows) — cost/income axes. */
const PCT_STEPS = [-0.1, -0.08, -0.06, -0.04, -0.02, 0, 0.02, 0.04, 0.06, 0.08, 0.1]
/** −3 to +7 months (11 rows) — period axes (matches the Feastudy range). */
const MONTH_STEPS = [-3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7]
/** ±2.5% in 0.5% steps (11 rows) — interest-rate axis. */
const RATE_STEPS = [-0.025, -0.02, -0.015, -0.01, -0.005, 0, 0.005, 0.01, 0.015, 0.02, 0.025]

function buildTable(
  key: SensitivityKey,
  label: string,
  unit: SensitivityTable['unit'],
  steps: number[],
  flex: (delta: number) => FeasibilityBase,
  axisValue: (delta: number) => number,
): SensitivityTable {
  const rows: SensitivityRow[] = steps.map((delta) => ({
    ...runFeasibility(flex(delta)),
    variable: axisValue(delta),
    isBase: delta === 0,
  }))
  return { key, label, unit, rows }
}

/** The six single-variable sensitivity tables, each row reporting Sale / Dev cost / Margin / MDC / IRR. */
export function buildSensitivity(base: FeasibilityBase): EstateSensitivity {
  const tables: SensitivityTable[] = [
    buildTable('land', 'Land cost', 'money', PCT_STEPS,
      (d) => ({ ...base, landCost: base.landCost * (1 + d) }),
      (d) => base.landCost * (1 + d)),
    buildTable('construction', 'Construction cost', 'money', PCT_STEPS,
      (d) => ({ ...base, worksTotal: base.worksTotal * (1 + d) }),
      (d) => base.worksTotal * (1 + d)),
    buildTable('constructionPeriod', 'Construction period', 'months', MONTH_STEPS,
      (d) => ({ ...base, constructionMonths: base.constructionMonths + d }),
      (d) => base.constructionMonths + d),
    buildTable('sellIncome', 'Sell-on income (price/lot)', 'money', PCT_STEPS,
      (d) => ({ ...base, salePricePerLot: base.salePricePerLot * (1 + d) }),
      (d) => base.salePricePerLot * (1 + d)),
    buildTable('sellPeriod', 'Sell-on period', 'months', MONTH_STEPS,
      (d) => ({ ...base, sellMonths: base.sellMonths + d }),
      (d) => base.sellMonths + d),
    buildTable('interest', 'Borrowing interest rate', 'rate', RATE_STEPS,
      (d) => ({ ...base, interestRate: base.interestRate + d }),
      (d) => base.interestRate + d),
  ]
  return { base: runFeasibility(base), tables }
}
