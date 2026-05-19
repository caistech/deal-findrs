import type { ThreeTestResult } from './tests'
import type { ReviewerVerdict } from './reviewer'

export type RAGStatus = 'green' | 'amber' | 'red'

export interface RAGOutcome {
  rag: RAGStatus
  rationale: string
}

/**
 * Map three-test results + reviewer verdict to a single RAG status.
 *
 * Rules (from the brief, with thresholds locked in):
 *
 *   GREEN — all three tests pass on evidenced inputs AND reviewer verdict is FUNDABLE.
 *   AMBER — exactly one test fails AND it has a credible evidence-path-to-pass
 *           (a real document or a real dollar, never a relabel) AND the reviewer
 *           verdict is FUNDABLE_IF.
 *   RED   — any other state: two or more failing tests, OR a failing test with no
 *           credible path, OR the reviewer rejects the deal independently.
 *
 * A deal moves RED → AMBER only when a missing document or dollar arrives —
 * never when the submission is rewritten.
 */
export function mapToRAG(tests: ThreeTestResult, reviewer: ReviewerVerdict): RAGOutcome {
  const failing = tests.results.filter(t => !t.passed)

  if (failing.length === 0 && reviewer.independentVerdict === 'FUNDABLE') {
    return {
      rag: 'green',
      rationale: 'All three lender tests pass on evidenced inputs. Reviewer concurs.',
    }
  }

  if (failing.length === 1) {
    const t = failing[0]
    const hasCrediblePath = Array.isArray(t.evidencePathToPass) && t.evidencePathToPass.length > 0
    if (hasCrediblePath && reviewer.independentVerdict === 'FUNDABLE_IF') {
      return {
        rag: 'amber',
        rationale: `Test ${t.id} fails but has an evidenced path to pass: ${t.evidencePathToPass![0].description}`,
      }
    }
  }

  // Anything else is red. Surface why succinctly.
  if (failing.length >= 2) {
    return {
      rag: 'red',
      rationale: `${failing.length} of 3 lender tests fail on evidenced inputs (${failing.map(t => t.id).join(', ')}).`,
    }
  }

  if (failing.length === 1) {
    return {
      rag: 'red',
      rationale: `Test ${failing[0].id} fails with no credible evidenced path to passing, or reviewer rejects the deal.`,
    }
  }

  // All tests passed but reviewer rejected — defer to reviewer.
  return {
    rag: 'red',
    rationale: `Reviewer rejected the deal independently: ${reviewer.killQuestion}`,
  }
}
