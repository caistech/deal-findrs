import type { SupabaseClient } from '@supabase/supabase-js'
import { buildEvidenceIndex, type EvidenceIndex } from './evidence'
import { substitute, type RawInputs, type FeasibilityThresholds, DEFAULT_THRESHOLDS, type AdjustedInputs, type Substitution } from './substitute'
import { runThreeTests, type ThreeTestResult } from './tests'
import { runReviewer, type ReviewerVerdict } from './reviewer'
import { mapToRAG, type RAGStatus } from './rag'

export const ENGINE_VERSION = 'v1'

export interface EngineResult {
  engineVersion: string
  rag: RAGStatus
  rationale: string
  adjusted: AdjustedInputs
  substitutions: Substitution[]
  threeTest: ThreeTestResult
  reviewer: ReviewerVerdict
  reviewerFallback: boolean
  ltvDerived: number
  evidenceDocumentCount: number
  evidenceCategoriesPresent: string[]
}

/**
 * Run the full adversarial feasibility engine for a single set of inputs.
 *
 * Stages:
 *   A. Build evidence index from deal_evidence + field_evidence_links.
 *   B. Substitute conservative values for any unevidenced flattering figures.
 *   C. Run the three lender tests against the substituted inputs.
 *   D. Call the adversarial reviewer LLM (with deterministic fallback).
 *   E. Map to GREEN / AMBER / RED.
 *
 * Pure relative to the inputs — does not write to the DB. The orchestrator
 * route is responsible for persisting the result into the assessments table.
 */
export async function runFeasibilityEngine(args: {
  raw: RawInputs
  evidenceClient: SupabaseClient
  thresholds?: FeasibilityThresholds
  /** When set, runs the engine against this pre-built index instead of querying.
   *  Used by the Branscombe V6 regression test fixture. */
  evidenceOverride?: EvidenceIndex
}): Promise<EngineResult> {
  const thresholds = args.thresholds ?? DEFAULT_THRESHOLDS

  // A. Evidence
  const evidence = args.evidenceOverride
    ?? (await buildEvidenceIndex(args.evidenceClient, args.raw.opportunityId))

  // B. Substitution
  const { adjusted, substitutions } = substitute(args.raw, evidence, thresholds)

  // C. Three tests
  const threeTest = runThreeTests(adjusted, evidence, thresholds)

  // D. Reviewer
  const reviewerOutput = await runReviewer({
    raw: args.raw,
    adjusted,
    substitutions,
    threeTest,
    evidence,
  })

  // E. RAG
  const ragOutcome = mapToRAG(threeTest, reviewerOutput.verdict)

  return {
    engineVersion: ENGINE_VERSION,
    rag: ragOutcome.rag,
    rationale: ragOutcome.rationale,
    adjusted,
    substitutions,
    threeTest,
    reviewer: reviewerOutput.verdict,
    reviewerFallback: reviewerOutput.fallback,
    ltvDerived: threeTest.ltvDerived,
    evidenceDocumentCount: evidence.documents.length,
    evidenceCategoriesPresent: Array.from(evidence.categoriesPresent),
  }
}
