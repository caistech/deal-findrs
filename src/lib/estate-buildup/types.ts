/**
 * Estate Constraints & Yield Brief — the buildup model.
 *
 * DealFindrs assesses a 20+ estate as a **buildup of analysis, not a data-entry form**: every
 * derivable figure is computed from the property-services datasets and carries its working + source,
 * so the output is reviewable by a formal professional (they certify, not rebuild). Non-derivable
 * or unresolved figures become explicit gaps (needs-input / formal-required / planner-referral),
 * never blank fields or free-typed guesses.
 *
 * See docs/estate-constraints-yield-plan.md for the governing principle + yield policy.
 */

/** Where a line's value came from — its provenance, always shown. */
export type Provenance =
  | 'derived' // computed from a property-services dataset
  | 'operator-resolved' // a human filled it (manual lookup / picker) — trace kept
  | 'feasibility-study' // from a shared feasibility study (admissible)
  | 'needs-input' // not derivable, no value yet — operator/professional supplies
  | 'formal-required' // a hard-stop: requires the formal professional (⛔)
  | 'planner-referral' // unresolved by data → referred to the state planner panel
  | 'note' // captured for context, NOT an analytical input (e.g. anecdotal claim)

/** One row of the buildup: a figure + how it was reached + where it came from. */
export interface BuildupLine {
  key: string
  label: string
  value: number | string | null
  unit?: string
  provenance: Provenance
  /** The working — how the number was derived (e.g. "net developable ÷ min lot size"). */
  working?: string
  /** The source dataset / instrument (e.g. "property-services lot data", "zoning min-lot-size"). */
  dataset?: string
  /** Attention level for the assessor. */
  severity?: 'info' | 'attention' | 'blocker'
}

/** A gap the buildup surfaces — feeds the recommended-attendees + planner-referral logic. */
export interface BuildupGap {
  dimension: 'zoning_use' | 'density_yield' | 'constraints' | 'tenure' | 'services' | 'cost'
  label: string
  provenance: Extract<Provenance, 'needs-input' | 'formal-required' | 'planner-referral'>
  detail: string
}

/** How yield was resolved under the policy (derived is authoritative; study reconciles; anecdote is a note). */
export interface YieldResolution {
  /** The number the evaluation runs on. Null when un-derivable (→ planner referral). */
  authoritativeLots: number | null
  /** Our derived lot yield from the subdivision analysis. */
  derivedLots: number | null
  /** From a shared feasibility study, if one was provided (admissible). */
  studyLots?: number | null
  /** Developer's anecdotal number — captured as context only, never authoritative. */
  developerClaimedLots?: number | null
  /** Set when a study figure and our derived figure materially disagree → review. */
  reconciliationNeeded: boolean
  /** Set when an anecdotal claim materially exceeds derived and is unbacked → likely pass. */
  unbackedClaimConflict: boolean
  basis: 'derived' | 'feasibility-study' | 'operator-resolved' | 'un-derivable'
  note?: string
}

export interface ConstraintsYieldBrief {
  yield: YieldResolution
  /** The full buildup, in Checklist-1 order (tenure → planning → topography → environment → yield). */
  lines: BuildupLine[]
  /** Gaps: needs-input, formal-required (⛔), and planner-referral items. */
  gaps: BuildupGap[]
  /** True when yield can't be derived (e.g. null zoning) → a planner referral is required to proceed. */
  requiresPlannerReferral: boolean
}

/** Inputs the builder needs beyond the derived profile (the gated, non-derivable figures). */
export interface BuildupOptions {
  /** A shared feasibility study's yield, if the developer has one (admissible). */
  feasibilityStudyLots?: number | null
  /** The developer's anecdotal lot count — captured as a note only, never authoritative. */
  developerClaimedLots?: number | null
  /** Threshold for flagging a material yield discrepancy (fraction, default 0.15 = 15%). */
  materialDiscrepancy?: number
  /**
   * A planner's resolution (from an approved planning referral) — resolves what the datasets
   * couldn't. Fed back into the buildup with 'operator-resolved' provenance; clears the referral.
   */
  operatorResolved?: {
    zoneCode?: string | null
    minLotSize?: number | null
    lots?: number | null
  }
  /**
   * Panel-review write-backs (property-services `contribute()`), keyed by field → summary. A completed
   * field resolves the matching desktop gap instead of leaving it open: `title` clears the tenure
   * (easements/covenants) gap; `servicing` clears the servicing gap; `contamination` is surfaced as a
   * line (and drives the valuer's site-risk). Provenance on the resolved line is 'operator-resolved'.
   */
  resolvedPanel?: Partial<
    Record<'title' | 'contamination' | 'servicing' | 'native_title' | 'survey_geotech', string>
  >
  /**
   * Summary of an ingested subdivision approval's conditions (from the conditions register). This is
   * how the WAPC/LG conditions drive the buildup: a `servicing` condition resolves the servicing gap
   * as "conditioned per approval" (arrangements mandated with the authorities); `geotech` /
   * `waterManagement` conditions raise a formal-required constraint; `contamination` (e.g. a UXO
   * advice) is surfaced as a line and drives the valuer's site-risk.
   */
  approvalConditions?: {
    wapcRef?: string | null
    servicing?: boolean
    geotech?: boolean
    waterManagement?: boolean
    contamination?: string | null
  }
  /**
   * Tenure read off an ingested registered subdivision plan — the reserves (POS / road reserve /
   * drainage) and easements shown ON the plan. These PARTIALLY resolve the tenure gap: the plan
   * evidences the reserves + plan-marked easements, but restrictive covenants + unregistered
   * encumbrances still require a title search, so the gap narrows rather than fully clears (unless a
   * `resolvedPanel.title` write-back also lands).
   */
  planTenure?: {
    easements: { purpose: string; detail: string | null }[]
    reserves: { purpose: string; detail: string | null }[]
  }
}
