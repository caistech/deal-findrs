import type { TeamMember } from './types'

/**
 * Planner-referral routing — the planner slice of the state team directory.
 *
 * When the derive can't resolve zone/yield, DealFindrs fires an automated refer-to-planner push
 * rather than blocking or faking. This routes the referral to the state's planner-panel member(s):
 * active directory members with occupation 'planner' whose `states` cover the referral's state.
 * Pure — no I/O. See docs/estate-constraints-yield-plan.md ("per-state planner panel routing").
 */

export interface PlannerRoute {
  /** The planner the referral is assigned to (first candidate); null when the state has no panel planner. */
  assigned: TeamMember | null
  /** All active planners covering the state (the panel) — the reassignment options. */
  candidates: TeamMember[]
  /** True when NO planner covers the state → F2K must build out that state's panel. */
  gap: boolean
}

/** A display label for a routed planner: "Name (Firm)" or just the name. */
export function plannerLabel(member: Pick<TeamMember, 'name' | 'firm'>): string {
  return member.firm ? `${member.name} (${member.firm})` : member.name
}

/** Active planners on the given state's panel, in directory order (name-sorted upstream). */
export function matchStatePlanners(directory: TeamMember[], state: string | null | undefined): TeamMember[] {
  if (!state) return []
  const target = state.trim().toUpperCase()
  if (!target) return []
  return directory.filter(
    (m) =>
      m.occupation === 'planner' &&
      m.active !== false &&
      m.states.some((s) => s.trim().toUpperCase() === target),
  )
}

/**
 * Route a referral to the state's planner panel. The first matching planner is the assignee; the
 * full match set are the reassignment candidates; no match → a gap the system flags.
 */
export function routePlanner(directory: TeamMember[], state: string | null | undefined): PlannerRoute {
  const candidates = matchStatePlanners(directory, state)
  return { assigned: candidates[0] ?? null, candidates, gap: candidates.length === 0 }
}
