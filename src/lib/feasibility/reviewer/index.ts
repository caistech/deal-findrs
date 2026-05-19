import { chat, AI_MODEL } from '@/lib/ai/client'
import { sanitize, validateOutput } from '@/lib/security-gate'
import type { RawInputs, AdjustedInputs, Substitution } from '../substitute'
import type { ThreeTestResult } from '../tests'
import type { EvidenceIndex } from '../evidence'
import { LENDER_PERSONA_SYSTEM, isReviewerVerdict, type ReviewerVerdict } from './lender-persona'

export type { ReviewerVerdict } from './lender-persona'

export interface ReviewerInput {
  raw: RawInputs
  adjusted: AdjustedInputs
  substitutions: Substitution[]
  threeTest: ThreeTestResult
  evidence: EvidenceIndex
}

export interface ReviewerOutput {
  verdict: ReviewerVerdict
  raw: string                    // raw LLM text (for audit / debugging)
  modelUsed: string
  fallback: boolean              // true if the LLM call failed and we synthesised a verdict deterministically
}

/**
 * Run the adversarial reviewer.
 *
 * Pipeline:
 *   1. Build a sanitised JSON payload (numbers + structured evidence only, no
 *      promoter free-text). The reviewer never sees prose to be moved by.
 *   2. Call the LLM via @/lib/ai/client.chat with the lender-persona system
 *      prompt and the payload as the user message. Temperature low.
 *   3. Strip any markdown fencing the model might add.
 *   4. Parse and structurally validate against ReviewerVerdict.
 *   5. Run @/lib/security-gate.validateOutput to catch instruction-leak or
 *      embedded tool-call patterns.
 *   6. If anything fails — parse error, schema mismatch, security flag, network
 *      — fall back to a deterministically-synthesised verdict computed from the
 *      three-test results. The fallback never returns FUNDABLE when any test
 *      failed.
 */
export async function runReviewer(input: ReviewerInput): Promise<ReviewerOutput> {
  const payload = buildPayload(input)
  const sanitised = sanitize(JSON.stringify(payload))
  // Sanitiser would only strip prompt-injection patterns. Payload here is
  // pure JSON of our own composing, so detections should be empty — but if
  // a malicious filename or extraction_field leaked through, sanitise the
  // serialised form rather than the object.

  let raw = ''
  try {
    raw = await chat(
      [
        { role: 'system', content: LENDER_PERSONA_SYSTEM },
        { role: 'user',   content: sanitised.sanitized },
      ],
      { temperature: 0.1, maxTokens: 1600, metadata: { task: 'feasibility_review', opportunity: input.raw.opportunityId } }
    )
  } catch (err) {
    console.error('[reviewer] LLM call failed:', err instanceof Error ? err.message : err)
    return { verdict: synthesiseVerdict(input), raw: '', modelUsed: AI_MODEL, fallback: true }
  }

  const cleaned = raw.replace(/^```(?:json)?\s*|\s*```$/gim, '').trim()

  // Output validation — catch instruction-leak / embedded tool-call patterns
  const outputCheck = validateOutput(cleaned)
  if (!outputCheck.valid) {
    console.error('[reviewer] output validation failed:', outputCheck.warnings)
    return { verdict: synthesiseVerdict(input), raw, modelUsed: AI_MODEL, fallback: true }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(cleaned)
  } catch (err) {
    console.error('[reviewer] JSON parse failed:', err instanceof Error ? err.message : err)
    return { verdict: synthesiseVerdict(input), raw, modelUsed: AI_MODEL, fallback: true }
  }

  if (!isReviewerVerdict(parsed)) {
    console.error('[reviewer] schema validation failed')
    return { verdict: synthesiseVerdict(input), raw, modelUsed: AI_MODEL, fallback: true }
  }

  // Cross-check: the LLM-supplied rederivedMetrics must match the deterministic
  // values the engine computed. If they drift, override with the engine values
  // so the UI can't show a doctored figure.
  const corrected: ReviewerVerdict = {
    ...parsed,
    rederivedMetrics: {
      ltc: input.threeTest.results[0].computed.ltc,
      ltv: input.threeTest.ltvDerived,
      margin: input.threeTest.results[2].computed.margin,
      peakDebt: parsed.rederivedMetrics.peakDebt,
      repaymentCoverage: parsed.rederivedMetrics.repaymentCoverage,
    },
  }

  // Belt-and-braces — if all three tests passed, the verdict cannot be NOT_FUNDABLE,
  // and vice versa. If the LLM disagrees with the deterministic gate, the gate wins.
  if (input.threeTest.passingCount === 3 && corrected.independentVerdict === 'NOT_FUNDABLE') {
    corrected.independentVerdict = 'FUNDABLE'
    corrected.conditions = []
  }
  if (input.threeTest.passingCount < 3 && corrected.independentVerdict === 'FUNDABLE') {
    corrected.independentVerdict = synthesiseVerdict(input).independentVerdict
  }

  return { verdict: corrected, raw, modelUsed: AI_MODEL, fallback: false }
}

// ── Deterministic fallback ──────────────────────────────────────

/**
 * Synthesise a reviewer verdict from the three-test results when the LLM is
 * unavailable or produces invalid output. Never returns FUNDABLE when any test
 * failed, never returns NOT_FUNDABLE when all three passed.
 */
export function synthesiseVerdict(input: ReviewerInput): ReviewerVerdict {
  const [t1, t2, t3] = input.threeTest.results
  const passing = input.threeTest.passingCount

  let independentVerdict: ReviewerVerdict['independentVerdict']
  let conditions: string[] = []

  if (passing === 3) {
    independentVerdict = 'FUNDABLE'
  } else if (passing === 2) {
    // FUNDABLE_IF only if the failing test has a credible evidence path.
    const failing = [t1, t2, t3].find(t => !t.passed)
    if (failing && failing.evidencePathToPass && failing.evidencePathToPass.length > 0) {
      independentVerdict = 'FUNDABLE_IF'
      conditions = failing.evidencePathToPass.map(s => s.description)
    } else {
      independentVerdict = 'NOT_FUNDABLE'
    }
  } else {
    independentVerdict = 'NOT_FUNDABLE'
  }

  const rejectedInputs = input.substitutions.map(s => ({
    field: s.field,
    assertedValue: s.from,
    reason: s.reason,
    evidenceRequired: deriveEvidenceRequired(s.field),
  }))

  return {
    independentVerdict,
    conditions,
    rederivedMetrics: {
      ltc: t1.computed.ltc,
      ltv: input.threeTest.ltvDerived,
      margin: t3.computed.margin,
      peakDebt: null,
      repaymentCoverage: null,
    },
    promoterStated: {
      ltc: null,
      ltv: null,
      margin: null,
    },
    rejectedInputs,
    killQuestion: pickKillQuestion(input),
  }
}

function pickKillQuestion(input: ReviewerInput): string {
  const [t1, t2, t3] = input.threeTest.results
  if (!t2.passed) {
    if (input.adjusted.landValue === 0) {
      return 'Where is the executed purchase contract or independent as-is valuation that supports the asserted land value?'
    }
    if (input.adjusted.grvTotal === 0) {
      return 'Where is the signed offtake, on-completion valuation, or comparable sales set that supports the asserted GRV?'
    }
  }
  if (!t1.passed) {
    const shortfall = t1.computed.equityShortfall
    return `Where is the $${Math.round(shortfall).toLocaleString('en-AU')} of paid-in or contractually committed cash equity that closes the LTC gap?`
  }
  if (!t3.passed) {
    return 'What evidence supports the GRV — or what cost reduction — that lifts margin above the lender floor after a forced contingency?'
  }
  return 'No outstanding obstacles — deal funds.'
}

function deriveEvidenceRequired(field: string): string[] {
  switch (field) {
    case 'landValue':       return ['purchase_contract', 'independent_valuation']
    case 'grvTotal':        return ['independent_valuation', 'comparable_sales_set', 'executed_offtake']
    case 'equityCash':      return ['equity_proof']
    case 'preSalesPercent': return ['waitlist_register', 'executed_offtake']
    case 'contingencyPct':  return []  // forced; no document can lower it
    default:                return []
  }
}

// ── Payload builder ─────────────────────────────────────────────

interface ReviewerPayload {
  opportunityId: string
  promoterClaims: {
    landValue: number
    grvTotal: number
    totalEquity: number
    cashEquity: number
    preSalesPercent: number
    contingencyPercent: number
    proposedLoanAmount: number
  }
  engineSubstitutedInputs: {
    landValue: number
    grvTotal: number
    cashEquity: number
    constructionCost: number
    contingencyPercent: number
    contingencyAmount: number
    totalDevelopmentCost: number
    preSalesPercent: number
  }
  substitutions: Substitution[]
  threeTest: {
    t1_skinInTheGame: { passed: boolean; computed: Record<string, number>; reason: string }
    t2_provableSaleValue: { passed: boolean; computed: Record<string, number>; reason: string }
    t3_marginWithContingency: { passed: boolean; computed: Record<string, number>; reason: string }
    ltvDerived: number
    passingCount: number
  }
  evidence: {
    documentCount: number
    categoriesPresent: string[]
    fieldEvidenceStatus: Record<string, { isEvidenced: boolean; evidencedValue: number | null }>
  }
}

function buildPayload(input: ReviewerInput): ReviewerPayload {
  const fieldEvidenceStatus: ReviewerPayload['evidence']['fieldEvidenceStatus'] = {}
  for (const [field, bucket] of Object.entries(input.evidence.byField)) {
    fieldEvidenceStatus[field] = {
      isEvidenced: bucket.isEvidenced,
      evidencedValue: bucket.evidencedValue,
    }
  }

  const [t1, t2, t3] = input.threeTest.results

  return {
    opportunityId: input.raw.opportunityId,
    promoterClaims: {
      landValue:          input.raw.claimedLandValue,
      grvTotal:           input.raw.claimedGRVTotal,
      totalEquity:        input.raw.claimedTotalEquity,
      cashEquity:         input.raw.claimedEquityCash,
      preSalesPercent:    input.raw.claimedPreSalesPercent,
      contingencyPercent: input.raw.promoterContingencyPct,
      proposedLoanAmount: input.raw.proposedLoanAmount,
    },
    engineSubstitutedInputs: {
      landValue:            input.adjusted.landValue,
      grvTotal:             input.adjusted.grvTotal,
      cashEquity:           input.adjusted.equityCash,
      constructionCost:     input.adjusted.constructionCost,
      contingencyPercent:   input.adjusted.contingencyPct,
      contingencyAmount:    input.adjusted.contingencyAmount,
      totalDevelopmentCost: input.adjusted.totalDevelopmentCost,
      preSalesPercent:      input.adjusted.preSalesPercent,
    },
    substitutions: input.substitutions,
    threeTest: {
      t1_skinInTheGame: { passed: t1.passed, computed: t1.computed, reason: t1.reason },
      t2_provableSaleValue: { passed: t2.passed, computed: t2.computed, reason: t2.reason },
      t3_marginWithContingency: { passed: t3.passed, computed: t3.computed, reason: t3.reason },
      ltvDerived: input.threeTest.ltvDerived,
      passingCount: input.threeTest.passingCount,
    },
    evidence: {
      documentCount: input.evidence.documents.length,
      categoriesPresent: Array.from(input.evidence.categoriesPresent),
      fieldEvidenceStatus,
    },
  }
}
