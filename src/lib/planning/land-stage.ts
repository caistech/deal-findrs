/**
 * State-aware land-stage labels.
 *
 * The planning-approval term for a subdivision varies by Australian state: WA subdivision goes
 * through the WAPC (not a council DA); VIC/TAS issue a Planning Permit; NSW/QLD/others use a
 * Development Application (DA). The STORED `land_stage` values are stable and national
 * (`da_approved` / `da_lodged` / …) — only the DISPLAY labels flex by the deal's state, so
 * scoring (deriskDaApproved) and persistence are untouched.
 */

export type LandStage =
  | 'da_approved'
  | 'da_lodged'
  | 'needs_rezoning'
  | 'raw_land'
  | 'construction_ready'

interface ApprovalTerms {
  /** Full "approved" option label (carries the ✓). */
  approved: string
  /** Full "lodged/pending" option label. */
  lodged: string
  /** Short badge label for the de-risk summary (no ✓). */
  badge: string
}

// Confident mappings; anything not listed falls back to the national generic "DA".
const APPROVAL_BY_STATE: Record<string, ApprovalTerms> = {
  WA: {
    approved: 'WAPC Subdivision Approved ✓',
    lodged: 'WAPC Subdivision Lodged (Pending)',
    badge: 'WAPC Subdivision Approved',
  },
  VIC: {
    approved: 'Planning Permit Approved ✓',
    lodged: 'Planning Permit Lodged (Pending)',
    badge: 'Planning Permit Approved',
  },
  TAS: {
    approved: 'Planning Permit Approved ✓',
    lodged: 'Planning Permit Lodged (Pending)',
    badge: 'Planning Permit Approved',
  },
}

const DEFAULT_TERMS: ApprovalTerms = {
  approved: 'DA Approved ✓',
  lodged: 'DA Lodged (Pending)',
  badge: 'DA Approved',
}

const NEUTRAL_LABELS: Record<string, string> = {
  needs_rezoning: 'Needs Rezoning',
  raw_land: 'Raw Land',
  construction_ready: 'Construction Ready',
}

function termsForState(state?: string | null): ApprovalTerms {
  const key = state?.trim().toUpperCase()
  return (key && APPROVAL_BY_STATE[key]) || DEFAULT_TERMS
}

/** The full option set for the Land Stage dropdown, labelled for the deal's state. */
export function landStageOptions(state?: string | null): { value: LandStage; label: string }[] {
  const t = termsForState(state)
  return [
    { value: 'da_approved', label: t.approved },
    { value: 'da_lodged', label: t.lodged },
    { value: 'needs_rezoning', label: NEUTRAL_LABELS.needs_rezoning },
    { value: 'raw_land', label: NEUTRAL_LABELS.raw_land },
    { value: 'construction_ready', label: NEUTRAL_LABELS.construction_ready },
  ]
}

/** Display label for a stored land_stage value, in the deal's state's terminology. */
export function landStageLabel(state: string | null | undefined, value: string | null | undefined): string {
  if (!value) return 'Unknown stage'
  const t = termsForState(state)
  if (value === 'da_approved') return t.badge
  if (value === 'da_lodged') return t.lodged.replace(' (Pending)', '')
  return NEUTRAL_LABELS[value] ?? value.replace(/_/g, ' ')
}

/** Short badge label for the "approved" de-risk chip, in the deal's state's terminology. */
export function landApprovalBadgeLabel(state?: string | null): string {
  return termsForState(state).badge
}
