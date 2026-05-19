import { describe, it, expect } from 'vitest'
import { runFeasibilityEngine } from '../engine'
import { BRANSCOMBE_V6_RAW, buildBranscombeEvidence } from './fixtures/branscombe-v6'
import { DEFAULT_THRESHOLDS } from '../substitute'

/**
 * Branscombe V6 — the regression gate.
 *
 * This is the deal that gave DealFindrs a green light in production while
 * being un-fundable in reality. The engine must return RED, with T1 and T3
 * failing on the substituted inputs, and a derived LVR near 88%.
 *
 * If this test ever returns GREEN or AMBER, the engine is broken.
 */
describe('Branscombe V6 regression', () => {
  it('returns RED', async () => {
    const evidence = buildBranscombeEvidence()
    const result = await runFeasibilityEngine({
      raw: BRANSCOMBE_V6_RAW,
      // No DB needed — evidence override supplies the index directly.
      evidenceClient: null as never,
      evidenceOverride: evidence,
      thresholds: DEFAULT_THRESHOLDS,
    })

    expect(result.rag).toBe('red')
  })

  it('substitutes land value from claimed $3.6M down to evidenced $1.41M', async () => {
    const evidence = buildBranscombeEvidence()
    const result = await runFeasibilityEngine({
      raw: BRANSCOMBE_V6_RAW,
      evidenceClient: null as never,
      evidenceOverride: evidence,
      thresholds: DEFAULT_THRESHOLDS,
    })

    expect(result.adjusted.landValue).toBe(1_410_000)
    expect(result.substitutions.some(s => s.field === 'landValue' && s.from === 3_600_000 && s.to === 1_410_000)).toBe(true)
  })

  it('counts only the $500k of real cash equity, not the $2.1M claimed total', async () => {
    const evidence = buildBranscombeEvidence()
    const result = await runFeasibilityEngine({
      raw: BRANSCOMBE_V6_RAW,
      evidenceClient: null as never,
      evidenceOverride: evidence,
      thresholds: DEFAULT_THRESHOLDS,
    })

    expect(result.adjusted.equityCash).toBe(500_000)
    // The substitution log should record the strip from $2.1M total → $500k cash
    expect(result.substitutions.some(s => s.field === 'equityCash' && s.from === 2_100_000 && s.to === 500_000)).toBe(true)
  })

  it('zeroes out the unevidenced $25.15M GRV', async () => {
    const evidence = buildBranscombeEvidence()
    const result = await runFeasibilityEngine({
      raw: BRANSCOMBE_V6_RAW,
      evidenceClient: null as never,
      evidenceOverride: evidence,
      thresholds: DEFAULT_THRESHOLDS,
    })

    expect(result.adjusted.grvTotal).toBe(0)
    expect(result.substitutions.some(s => s.field === 'grvTotal' && s.from === 25_150_000 && s.to === 0)).toBe(true)
  })

  it('fails T1 (Skin in the Game) with LTC well over the 0.70 ceiling', async () => {
    const evidence = buildBranscombeEvidence()
    const result = await runFeasibilityEngine({
      raw: BRANSCOMBE_V6_RAW,
      evidenceClient: null as never,
      evidenceOverride: evidence,
      thresholds: DEFAULT_THRESHOLDS,
    })

    const t1 = result.threeTest.results[0]
    expect(t1.id).toBe('T1')
    expect(t1.passed).toBe(false)
    expect(t1.computed.ltc).toBeGreaterThan(0.85)  // brief said "mid-90s"; the engine confirms
  })

  it('fails T2 (Provable Sale Value) because GRV is not evidenced', async () => {
    const evidence = buildBranscombeEvidence()
    const result = await runFeasibilityEngine({
      raw: BRANSCOMBE_V6_RAW,
      evidenceClient: null as never,
      evidenceOverride: evidence,
      thresholds: DEFAULT_THRESHOLDS,
    })

    const t2 = result.threeTest.results[1]
    expect(t2.id).toBe('T2')
    expect(t2.passed).toBe(false)
  })

  it('fails T3 (Margin with Contingency) — promoter claimed 22.2%, engine recomputes negative', async () => {
    const evidence = buildBranscombeEvidence()
    const result = await runFeasibilityEngine({
      raw: BRANSCOMBE_V6_RAW,
      evidenceClient: null as never,
      evidenceOverride: evidence,
      thresholds: DEFAULT_THRESHOLDS,
    })

    const t3 = result.threeTest.results[2]
    expect(t3.id).toBe('T3')
    expect(t3.passed).toBe(false)
    // With GRV zeroed (unevidenced), margin can't be computed positively
    expect(t3.computed.margin).toBeLessThan(0.20)
  })

  it('reviewer verdict (deterministic fallback when no LLM) is NOT_FUNDABLE', async () => {
    const evidence = buildBranscombeEvidence()
    const result = await runFeasibilityEngine({
      raw: BRANSCOMBE_V6_RAW,
      evidenceClient: null as never,
      evidenceOverride: evidence,
      thresholds: DEFAULT_THRESHOLDS,
    })

    // The reviewer LLM is unreachable in test (no DATAWIZZ creds), so the
    // deterministic fallback fires. Since all three tests fail, the fallback
    // must return NOT_FUNDABLE.
    expect(result.reviewer.independentVerdict).toBe('NOT_FUNDABLE')
    expect(result.reviewerFallback).toBe(true)
  })

  it('forces contingency floor up from the promoter\'s 3% to at least 5%', async () => {
    const evidence = buildBranscombeEvidence()
    const result = await runFeasibilityEngine({
      raw: BRANSCOMBE_V6_RAW,
      evidenceClient: null as never,
      evidenceOverride: evidence,
      thresholds: DEFAULT_THRESHOLDS,
    })

    expect(result.adjusted.contingencyPct).toBeGreaterThanOrEqual(0.05)
    expect(result.substitutions.some(s => s.field === 'contingencyPct' && s.from === 0.03)).toBe(true)
  })
})
