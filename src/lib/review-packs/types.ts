import type { ConstraintsYieldBrief } from '@/lib/estate-buildup/types'

/**
 * Professional review packs — "the buildup IS each professional's review pack".
 *
 * The internally-generated Constraints & Yield buildup is exported per-profession so the professional
 * REVIEWS / CERTIFIES / REFINES rather than rebuilds (the checklist's core value: compresses cost +
 * turnaround). Each pack is a template over the same buildup, rendered to a branded PDF via
 * @caistech/report-generator — "a new template per professional, not new plumbing".
 * See docs/estate-constraints-yield-plan.md ("professional review packs").
 */

export type ReviewPackKind = 'engineer' | 'qs' | 'valuer'

/** Everything a template renders from — the opportunity meta + the derived buildup. */
export interface ReviewPackContext {
  opportunity: {
    id: string
    name: string | null
    address: string | null
    city: string | null
    state: string | null
    lga: string | null
  }
  brief: ConstraintsYieldBrief
  /** ISO date the pack was prepared (passed in so builders stay pure/testable). */
  preparedOn: string
}

/** Whether a pack can be produced yet — QS/valuer need Phase-3 data (cost / GRV) that doesn't exist. */
export interface ReviewPackAvailability {
  ok: boolean
  /** Why it's unavailable — shown to the operator (e.g. "Requires the feasibility/QS cost pack (Phase 3)."). */
  reason?: string
}

export interface ReviewPackTemplate {
  kind: ReviewPackKind
  /** The profession this pack is handed to. */
  professionLabel: string
  /** The document title. */
  title: string
  /** True once the data this pack needs exists. */
  available: (ctx: ReviewPackContext) => ReviewPackAvailability
  /** Render the pack body as Markdown (report-generator turns it into a branded PDF). */
  buildMarkdown: (ctx: ReviewPackContext) => string
}
