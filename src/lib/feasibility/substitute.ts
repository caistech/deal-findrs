import type { EvidenceIndex } from './evidence'
import { evidencedValueForField } from './evidence'

/**
 * Raw inputs to the engine — figures as supplied by the promoter,
 * before any conservative substitution. Most fields are required;
 * any "claimed" figure for which the promoter has no evidenced
 * counterpart will be substituted with the conservative defensible value.
 */
export interface RawInputs {
  // Identifier
  opportunityId: string

  // Asserted land value (promoter's claim of what the land is "worth")
  claimedLandValue: number
  /** Evidenced purchase price from the executed contract, if known to the caller.
   *  Optional — if absent, the engine looks for evidenced numeric values via the index. */
  evidencedPurchasePrice?: number

  // Asserted equity
  claimedTotalEquity: number    // promoter's "Net Project Equity" figure (may include land uplift, in-kind, etc.)
  claimedEquityCash: number     // the cash component (may also be inflated)

  // Asserted revenue
  claimedGRVTotal: number       // total gross realisable value across all units
  numDwellings: number

  // Asserted costs
  constructionPerUnit: number
  infrastructureCosts: number
  promoterContingencyPct: number   // promoter's contingency (decimal, e.g. 0.05)

  // Loan structure (used for LTV derivation only — never an engine input gate)
  proposedLoanAmount: number

  // Build complexity flags (drive forced-contingency tier)
  isOffshoreSupply: boolean
  isComplex: boolean             // heritage overlay, contaminated land, mixed-use, complex civil

  // Pre-sales claim
  claimedPreSalesPercent: number
}

/**
 * Per-company thresholds applied by the substitution + test layers.
 * Sourced from the feasibility_criteria table (migration 003).
 */
export interface FeasibilityThresholds {
  ltcCeiling: number              // T1 — fail if LTC > this. Default 0.70.
  marginFloor: number             // T3 — fail if margin < this. Default 0.20.
  contingencyBaseline: number     // T3 forced-load baseline. Default 0.05.
  contingencyOffshore: number     // T3 forced-load offshore supply. Default 0.075.
  contingencyComplex: number      // T3 forced-load complex/heritage. Default 0.10.
}

export const DEFAULT_THRESHOLDS: FeasibilityThresholds = {
  ltcCeiling:          0.70,
  marginFloor:         0.20,
  contingencyBaseline: 0.05,
  contingencyOffshore: 0.075,
  contingencyComplex:  0.10,
}

/**
 * Adjusted inputs — what the engine actually computes against.
 * Every flattering figure is either evidenced or substituted.
 */
export interface AdjustedInputs {
  landValue: number              // min(evidenced purchase price, evidenced as-is valuation). 0 if neither.
  grvTotal: number               // 0 if not evidenced, else evidenced value (lower bound across attached evidence)
  equityCash: number             // claimedEquityCash only if equity_proof is attached; otherwise 0
  constructionCost: number       // claimed (unchanged — construction is cost-side, not flattering by default)
  contingencyPct: number         // forced: max(promoter, threshold for this deal complexity)
  contingencyAmount: number      // = (land + construction + infra) * contingencyPct
  infrastructureCosts: number
  totalDevelopmentCost: number   // land + construction + infra + contingency
  preSalesPercent: number        // claimed only if waitlist_register OR executed_offtake evidence attached
  proposedLoanAmount: number     // unchanged (it is what it is — not promoter "flattery")
  numDwellings: number
}

export interface Substitution {
  field: keyof AdjustedInputs
  from: number
  to: number
  reason: string
}

export interface SubstitutionResult {
  adjusted: AdjustedInputs
  substitutions: Substitution[]
}

/**
 * Apply the conservative-substitution rules to a set of raw inputs.
 *
 * The rules (from the brief):
 *   - land_value: lower of evidenced purchase price and evidenced independent valuation.
 *                 If neither is evidenced, set to 0 (T2 will fail).
 *   - grv_total:  must be backed by an evidenced numeric value (valuation / contracts / comps).
 *                 If not, set to 0 (T2 will fail).
 *   - equity_cash: must be backed by equity_proof. If not, set to 0 (T1 will fail).
 *   - contingency: force max(promoter, threshold-for-complexity). Promoter cannot reduce it.
 *   - pre_sales:   only counted if waitlist_register OR executed_offtake evidence is present.
 */
export function substitute(
  raw: RawInputs,
  evidence: EvidenceIndex,
  thresholds: FeasibilityThresholds = DEFAULT_THRESHOLDS
): SubstitutionResult {
  const substitutions: Substitution[] = []

  // ── Land value ─────────────────────────────────────────────────
  const evidencedLand = evidencedValueForField(evidence, 'land_value')
  const purchaseFromCaller = raw.evidencedPurchasePrice
  const landCandidates: number[] = []
  if (typeof evidencedLand === 'number')      landCandidates.push(evidencedLand)
  if (typeof purchaseFromCaller === 'number') landCandidates.push(purchaseFromCaller)
  const evidencedLandValue = landCandidates.length > 0 ? Math.min(...landCandidates) : null

  let landValue: number
  if (evidencedLandValue !== null && evidencedLandValue < raw.claimedLandValue) {
    landValue = evidencedLandValue
    substitutions.push({
      field: 'landValue',
      from: raw.claimedLandValue,
      to: evidencedLandValue,
      reason: `Asserted land value not supported by evidence; substituted with lowest evidenced figure.`,
    })
  } else if (evidencedLandValue !== null) {
    landValue = evidencedLandValue
  } else {
    landValue = 0
    substitutions.push({
      field: 'landValue',
      from: raw.claimedLandValue,
      to: 0,
      reason: 'No evidenced purchase price or independent as-is valuation attached.',
    })
  }

  // ── GRV ────────────────────────────────────────────────────────
  const evidencedGRV = evidencedValueForField(evidence, 'grv_total')
  let grvTotal: number
  if (evidencedGRV !== null && evidencedGRV < raw.claimedGRVTotal) {
    grvTotal = evidencedGRV
    substitutions.push({
      field: 'grvTotal',
      from: raw.claimedGRVTotal,
      to: evidencedGRV,
      reason: 'Asserted GRV exceeds evidenced revenue (valuation/contracts/comps); using evidenced figure.',
    })
  } else if (evidencedGRV !== null) {
    grvTotal = evidencedGRV
  } else {
    grvTotal = 0
    substitutions.push({
      field: 'grvTotal',
      from: raw.claimedGRVTotal,
      to: 0,
      reason: 'GRV not backed by an executed contract, signed offtake, independent valuation, or comparable sales set.',
    })
  }

  // ── Equity cash ────────────────────────────────────────────────
  const hasEquityProof = evidence.categoriesPresent.has('equity_proof')
  let equityCash: number
  if (hasEquityProof) {
    equityCash = raw.claimedEquityCash
    // Note any difference between claimed total and claimed cash — promoter's
    // "uplift / in-kind / savings" portion is implicitly stripped here.
    if (raw.claimedTotalEquity > raw.claimedEquityCash) {
      substitutions.push({
        field: 'equityCash',
        from: raw.claimedTotalEquity,
        to: raw.claimedEquityCash,
        reason: 'Non-cash "equity" components (land uplift, in-kind contributions, deferred payments, anticipated savings) stripped; only paid-in or contractually committed cash counts.',
      })
    }
  } else {
    equityCash = 0
    substitutions.push({
      field: 'equityCash',
      from: raw.claimedEquityCash,
      to: 0,
      reason: 'No equity_proof document attached — cash equity claim unsupported.',
    })
  }

  // ── Pre-sales ──────────────────────────────────────────────────
  const hasPreSalesEvidence =
    evidence.categoriesPresent.has('waitlist_register') ||
    evidence.categoriesPresent.has('executed_offtake')
  let preSalesPercent: number
  if (hasPreSalesEvidence) {
    preSalesPercent = raw.claimedPreSalesPercent
  } else {
    preSalesPercent = 0
    if (raw.claimedPreSalesPercent > 0) {
      substitutions.push({
        field: 'preSalesPercent',
        from: raw.claimedPreSalesPercent,
        to: 0,
        reason: 'Pre-sales claim not backed by signed offtakes or waitlist registry data.',
      })
    }
  }

  // ── Contingency (forced) ───────────────────────────────────────
  const requiredContingency = raw.isComplex
    ? thresholds.contingencyComplex
    : raw.isOffshoreSupply
      ? thresholds.contingencyOffshore
      : thresholds.contingencyBaseline

  const contingencyPct = Math.max(raw.promoterContingencyPct, requiredContingency)
  if (contingencyPct > raw.promoterContingencyPct) {
    substitutions.push({
      field: 'contingencyPct',
      from: raw.promoterContingencyPct,
      to: contingencyPct,
      reason: `Forced contingency floor for ${raw.isComplex ? 'complex/heritage' : raw.isOffshoreSupply ? 'offshore-supply' : 'baseline'} build complexity.`,
    })
  }

  // ── Cost rollup ────────────────────────────────────────────────
  const constructionCost = raw.constructionPerUnit * raw.numDwellings
  const preContingency   = landValue + constructionCost + raw.infrastructureCosts
  const contingencyAmount = preContingency * contingencyPct
  const totalDevelopmentCost = preContingency + contingencyAmount

  const adjusted: AdjustedInputs = {
    landValue,
    grvTotal,
    equityCash,
    constructionCost,
    contingencyPct,
    contingencyAmount,
    infrastructureCosts: raw.infrastructureCosts,
    totalDevelopmentCost,
    preSalesPercent,
    proposedLoanAmount: raw.proposedLoanAmount,
    numDwellings: raw.numDwellings,
  }

  return { adjusted, substitutions }
}
