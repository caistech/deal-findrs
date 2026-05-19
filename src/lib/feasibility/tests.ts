import type { AdjustedInputs, FeasibilityThresholds } from './substitute'
import type { EvidenceIndex, EvidenceCategory } from './evidence'

export type TestId = 'T1' | 'T2' | 'T3'

/**
 * What a deal would have to *do* to pass a failing test — a document to upload
 * or a dollar amount to bring. Never a relabel; never "submit the form again".
 *
 * Used by the RAG mapper to decide whether a failing test has a credible
 * path-to-pass (AMBER) or no path (RED).
 */
export interface EvidencePathStep {
  kind: 'upload_document' | 'add_cash_equity' | 'increase_margin' | 'reduce_loan'
  /** When kind === 'upload_document': which categories satisfy this step. */
  acceptableCategories?: EvidenceCategory[]
  /** When kind === 'add_cash_equity': the dollar amount required at minimum. */
  requiredAmount?: number
  /** Human-readable description for the operator UI. */
  description: string
}

export interface TestResult {
  id: TestId
  passed: boolean
  /** Computed numbers — surfaced to the UI and the reviewer LLM. */
  computed: Record<string, number>
  reason: string
  /** Steps to flip the verdict. Null = no credible path (RED). */
  evidencePathToPass: EvidencePathStep[] | null
}

// ── T1 — Skin in the Game ────────────────────────────────────────

/**
 * Loan-to-Cost = (TDC − cashEquity) / TDC.
 * Fail if LTC > ltcCeiling. The promoter must close the gap with real cash
 * (not relabelled in-kind), OR reduce the proposed loan.
 */
export function testSkinInTheGame(
  adjusted: AdjustedInputs,
  thresholds: FeasibilityThresholds
): TestResult {
  const tdc = adjusted.totalDevelopmentCost
  const equity = adjusted.equityCash
  const requiredLoan = Math.max(0, tdc - equity)
  const ltc = tdc > 0 ? requiredLoan / tdc : 1
  const passed = tdc > 0 && ltc <= thresholds.ltcCeiling

  const equityRequiredToPass = Math.max(0, tdc * (1 - thresholds.ltcCeiling))
  const equityShortfall = Math.max(0, equityRequiredToPass - equity)

  return {
    id: 'T1',
    passed,
    computed: {
      ltc: round4(ltc),
      ltcCeiling: thresholds.ltcCeiling,
      totalDevelopmentCost: round0(tdc),
      cashEquity: round0(equity),
      requiredLoan: round0(requiredLoan),
      equityRequiredToPass: round0(equityRequiredToPass),
      equityShortfall: round0(equityShortfall),
    },
    reason: passed
      ? `LTC ${pct(ltc)} is within the ${pct(thresholds.ltcCeiling)} ceiling on evidenced cash equity of $${money(equity)}.`
      : `LTC ${pct(ltc)} exceeds the ${pct(thresholds.ltcCeiling)} ceiling. Deal is under-equitised by $${money(equityShortfall)} of real cash.`,
    evidencePathToPass: passed ? null : [
      {
        kind: 'upload_document',
        acceptableCategories: ['equity_proof'],
        description: `Upload equity proof (bank statement, capital call notice, signed equity commitment) totaling at least $${money(equityRequiredToPass)}.`,
      },
      {
        kind: 'add_cash_equity',
        requiredAmount: equityShortfall,
        description: `Add a further $${money(equityShortfall)} of paid-in or contractually committed cash equity.`,
      },
    ],
  }
}

// ── T2 — Provable Sale Value ─────────────────────────────────────

/**
 * Every revenue-side input (land value and GRV) must be backed by attached
 * evidence. The substitution layer already zeroed out unevidenced figures;
 * here we just check whether they survived.
 */
export function testProvableSaleValue(
  adjusted: AdjustedInputs,
  evidence: EvidenceIndex
): TestResult {
  const landEvidenced = adjusted.landValue > 0
  const grvEvidenced  = adjusted.grvTotal  > 0
  const passed = landEvidenced && grvEvidenced

  const missing: string[] = []
  if (!landEvidenced) missing.push('land value')
  if (!grvEvidenced)  missing.push('GRV / revenue')

  const path: EvidencePathStep[] = []
  if (!landEvidenced) {
    path.push({
      kind: 'upload_document',
      acceptableCategories: ['purchase_contract', 'independent_valuation'],
      description: 'Upload the executed purchase contract or an independent "as-is" valuation report.',
    })
  }
  if (!grvEvidenced) {
    path.push({
      kind: 'upload_document',
      acceptableCategories: ['independent_valuation', 'comparable_sales_set', 'executed_offtake', 'waitlist_register'],
      description: 'Upload an on-completion valuation, dated comparable sales, signed offtakes, or verified waitlist registry data.',
    })
  }

  return {
    id: 'T2',
    passed,
    computed: {
      landValue: round0(adjusted.landValue),
      grvTotal: round0(adjusted.grvTotal),
      evidenceDocumentCount: evidence.documents.length,
    },
    reason: passed
      ? `Both land value ($${money(adjusted.landValue)}) and GRV ($${money(adjusted.grvTotal)}) are backed by attached evidence.`
      : `Provable sale value test failed — ${missing.join(' and ')} not evidenced.`,
    evidencePathToPass: passed ? null : path,
  }
}

// ── T3 — Margin with Contingency ────────────────────────────────

/**
 * Margin computed on substituted inputs *after* the forced-contingency loading.
 * Fail if margin < marginFloor. The deal must either bring up GRV (with evidence
 * — not relabelling) or reduce costs to clear the floor.
 */
export function testMarginWithContingency(
  adjusted: AdjustedInputs,
  thresholds: FeasibilityThresholds
): TestResult {
  const profit = adjusted.grvTotal - adjusted.totalDevelopmentCost
  const margin = adjusted.grvTotal > 0 ? profit / adjusted.grvTotal : -1
  const passed = adjusted.grvTotal > 0 && margin >= thresholds.marginFloor

  // What GRV is needed to clear the margin floor at current cost base?
  const requiredGrv = thresholds.marginFloor < 1
    ? adjusted.totalDevelopmentCost / (1 - thresholds.marginFloor)
    : 0
  const grvShortfall = Math.max(0, requiredGrv - adjusted.grvTotal)

  return {
    id: 'T3',
    passed,
    computed: {
      profit: round0(profit),
      margin: round4(margin),
      marginFloor: thresholds.marginFloor,
      totalDevelopmentCost: round0(adjusted.totalDevelopmentCost),
      grvTotal: round0(adjusted.grvTotal),
      contingencyPct: round4(adjusted.contingencyPct),
      contingencyAmount: round0(adjusted.contingencyAmount),
      requiredGrvToPass: round0(requiredGrv),
      grvShortfall: round0(grvShortfall),
    },
    reason: passed
      ? `Margin ${pct(margin)} clears the ${pct(thresholds.marginFloor)} floor after a ${pct(adjusted.contingencyPct)} forced contingency.`
      : adjusted.grvTotal <= 0
        ? `Margin not computable — GRV is not evidenced. Fails by construction.`
        : `Margin ${pct(margin)} fails the ${pct(thresholds.marginFloor)} floor after a ${pct(adjusted.contingencyPct)} forced contingency. Profit is $${money(profit)} on $${money(adjusted.totalDevelopmentCost)} of cost.`,
    evidencePathToPass: passed ? null : [
      {
        kind: 'upload_document',
        acceptableCategories: ['executed_offtake', 'independent_valuation', 'comparable_sales_set'],
        description: `Upload evidence (signed offtakes / valuation / dated comps) supporting GRV of at least $${money(requiredGrv)} — an increase of $${money(grvShortfall)} on the current evidenced figure.`,
      },
      {
        kind: 'increase_margin',
        description: 'Re-scope the build to reduce TDC, OR re-price units upward — but only with evidence to back the new GRV.',
      },
    ],
  }
}

// ── Engine entry point ──────────────────────────────────────────

export interface ThreeTestResult {
  results: [TestResult, TestResult, TestResult]
  /** loan / grv — derived last, never an input. */
  ltvDerived: number
  /** Convenience: number of tests passing. */
  passingCount: number
}

export function runThreeTests(
  adjusted: AdjustedInputs,
  evidence: EvidenceIndex,
  thresholds: FeasibilityThresholds
): ThreeTestResult {
  const t1 = testSkinInTheGame(adjusted, thresholds)
  const t2 = testProvableSaleValue(adjusted, evidence)
  const t3 = testMarginWithContingency(adjusted, thresholds)

  // LVR derivation — only meaningful if GRV is evidenced (T2 passed)
  const ltvDerived = adjusted.grvTotal > 0
    ? adjusted.proposedLoanAmount / adjusted.grvTotal
    : 1  // No evidenced GRV → treat LTV as 100% (worst case for surfacing)

  return {
    results: [t1, t2, t3],
    ltvDerived: round4(ltvDerived),
    passingCount: [t1, t2, t3].filter(t => t.passed).length,
  }
}

// ── Formatting helpers ─────────────────────────────────────────

function pct(x: number): string  { return `${(x * 100).toFixed(1)}%` }
function money(x: number): string {
  if (!Number.isFinite(x)) return '0'
  return Math.round(x).toLocaleString('en-AU')
}
function round0(x: number): number { return Math.round(x) }
function round4(x: number): number { return Math.round(x * 10000) / 10000 }
