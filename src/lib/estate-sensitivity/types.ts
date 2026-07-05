/**
 * Estate sensitivity (Checklist 1 §10 / Feastudy) — six single-variable sensitivity tables, each
 * flexing ONE driver and reporting margin, margin-on-development-cost (MDC) and IRR per row. This is
 * the standard-anchored replacement for the old combined-scenario `devfinance/sensitivity.ts`.
 */

/** The base feasibility inputs a single point is computed from. */
export interface FeasibilityBase {
  lots: number
  /** GST-inclusive sale price per finished lot. */
  salePricePerLot: number
  /** Development cost EXCLUDING land (civil + soft + statutory + contingency), GST-inclusive. */
  worksTotal: number
  /** Land acquisition cost (GST-inclusive). */
  landCost: number
  /** Construction/works duration in months. */
  constructionMonths: number
  /** Sell-down duration in months (after construction). */
  sellMonths: number
  /** Annual borrowing interest rate (e.g. 0.12). */
  interestRate: number
  /** Selling/agent cost as a fraction of sale value (default 0.035). */
  sellingCostPct?: number
}

/** A computed feasibility point. */
export interface FeasibilityPoint {
  saleValue: number
  /** Total development cost (land + works + selling + finance). */
  devCost: number
  /** Profit = sale value − dev cost. */
  margin: number
  /** Margin on Development Cost = margin / dev cost. */
  mdc: number
  /** Unlevered annualised project IRR (null when not computable). */
  irrAnnual: number | null
}

export interface SensitivityRow extends FeasibilityPoint {
  /** The flexed variable's value at this row (a $, % or month figure per the table unit). */
  variable: number
  /** True for the base-case (unflexed) row. */
  isBase: boolean
}

export type SensitivityKey =
  | 'land'
  | 'construction'
  | 'constructionPeriod'
  | 'sellIncome'
  | 'sellPeriod'
  | 'interest'

export interface SensitivityTable {
  key: SensitivityKey
  label: string
  /** How the `variable` column reads: 'money' | 'months' | 'rate'. */
  unit: 'money' | 'months' | 'rate'
  rows: SensitivityRow[]
}

export interface EstateSensitivity {
  base: FeasibilityPoint
  tables: SensitivityTable[]
}
