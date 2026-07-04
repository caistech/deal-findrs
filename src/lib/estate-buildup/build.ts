import type { PropertyProfile } from '@/lib/property-services'
import type {
  BuildupGap,
  BuildupLine,
  BuildupOptions,
  ConstraintsYieldBrief,
  YieldResolution,
} from './types'

const DEFAULT_MATERIAL_DISCREPANCY = 0.15

function materiallyDiffers(a: number, b: number, threshold: number): boolean {
  if (a <= 0) return b > 0
  return Math.abs(a - b) / a > threshold
}

/**
 * Build the Estate Constraints & Yield Brief from a persisted property-services profile.
 *
 * Pure and stateless. Yield is DERIVED and authoritative (property-services subdivision analysis);
 * a developer's number is admissible only from a shared feasibility study (reconciled, not
 * overriding); an anecdotal claim is captured as context and, if it materially exceeds derived
 * without a study, flagged as a likely pass. When yield can't be derived (e.g. null zoning), the
 * brief requires a planner referral rather than dead-ending.
 */
export function buildConstraintsYield(
  profile: PropertyProfile,
  opts: BuildupOptions = {},
): ConstraintsYieldBrief {
  const threshold = opts.materialDiscrepancy ?? DEFAULT_MATERIAL_DISCREPANCY
  const lines: BuildupLine[] = []
  const gaps: BuildupGap[] = []

  // ── A. Tenure & title ───────────────────────────────────────
  lines.push({
    key: 'parcel',
    label: 'Parcel',
    value: profile.lot?.lotNumber
      ? `Lot ${profile.lot.lotNumber}${profile.lot.planNumber ? ' / ' + profile.lot.planNumber : ''}`
      : (profile.lot?.parcelId ?? null),
    provenance: profile.lot ? 'derived' : 'needs-input',
    dataset: 'property-services lot data',
  })
  gaps.push({
    dimension: 'tenure',
    label: 'Easements / covenants / road reserves',
    provenance: 'needs-input',
    detail: 'Not derivable from the desktop dataset — confirm from title search + registered plan.',
  })

  // ── B. Planning (zoning + min lot) ──────────────────────────
  const minLotSize = profile.zoning?.minimumLotSize ?? profile.subdivision?.torrens?.minLotSize ?? null
  if (profile.zoning) {
    lines.push({
      key: 'zoning',
      label: 'Zoning',
      value: `${profile.zoning.code} — ${profile.zoning.name}`,
      provenance: 'derived',
      dataset: 'planning dataset',
    })
    lines.push({
      key: 'minLotSize',
      label: 'Minimum lot size',
      value: minLotSize,
      unit: 'sqm',
      provenance: minLotSize != null ? 'derived' : 'needs-input',
      dataset: 'zoning controls',
    })
  } else {
    // Zoning unresolved (e.g. partial LGA coverage) → planner referral; yield can't be derived.
    lines.push({
      key: 'zoning',
      label: 'Zoning',
      value: 'Unresolved (no LGA coverage)',
      provenance: 'planner-referral',
      dataset: 'planning dataset',
      severity: 'blocker',
    })
    gaps.push({
      dimension: 'zoning_use',
      label: 'Zoning + minimum lot size',
      provenance: 'planner-referral',
      detail:
        profile.metadata?.zoningManualLookup
          ? `Refer to the state planner panel. Manual source: ${profile.metadata.zoningManualLookup.source}.`
          : 'Refer to the state planner panel to set the zone.',
    })
  }

  // ── C. Topography & earthworks ──────────────────────────────
  if (profile.terrain) {
    const slope = profile.terrain.slopePercent
    const steep = slope != null && slope > 15
    lines.push({
      key: 'slope',
      label: 'Slope',
      value: slope,
      unit: '%',
      provenance: 'derived',
      dataset: 'terrain (LiDAR/DEM)',
      severity: steep ? 'attention' : 'info',
      working: profile.terrain.buildability ? `Buildability: ${profile.terrain.buildability}` : undefined,
    })
    if (steep) {
      gaps.push({
        dimension: 'constraints',
        label: 'Earthworks / retaining (slope > 15%)',
        provenance: 'formal-required',
        detail: 'Cut/fill + retaining is a civil-engineer hard-stop; slope flags material earthworks cost.',
      })
    }
  }

  // ── E. Environment & overlays ───────────────────────────────
  if (profile.environment?.bal) {
    lines.push({
      key: 'bal',
      label: 'Bushfire (BAL)',
      value: profile.environment.bal,
      provenance: 'derived',
      dataset: 'environment dataset',
      severity: profile.environment.balInOverlay ? 'attention' : 'info',
    })
  }
  for (const overlay of profile.overlays ?? []) {
    lines.push({
      key: `overlay:${overlay.type}`,
      label: `Overlay — ${overlay.name}`,
      value: overlay.requirements.length ? overlay.requirements.join('; ') : 'applies',
      provenance: 'derived',
      dataset: 'planning overlays',
      severity: overlay.requiresReport ? 'attention' : 'info',
    })
    if (overlay.requiresReport) {
      gaps.push({
        dimension: 'constraints',
        label: `${overlay.name} — specialist report required`,
        provenance: 'formal-required',
        detail: `Overlay "${overlay.name}" requires a specialist report (${overlay.requirements.join('; ') || 'per scheme'}).`,
      })
    }
  }

  // ── F. Yield (DERIVED, authoritative) ───────────────────────
  const derivedLots = profile.subdivision?.torrens?.maxLots ?? null
  if (profile.lot?.lotSize != null) {
    lines.push({
      key: 'estateArea',
      label: 'Estate area',
      value: profile.lot.lotSize,
      unit: 'sqm',
      provenance: 'derived',
      dataset: 'property-services lot data',
    })
  }
  const yieldRes = resolveYield({ derivedLots, minLotSize, opts, threshold })
  lines.push({
    key: 'yield',
    label: 'Yield (lots)',
    value: yieldRes.authoritativeLots,
    provenance: yieldRes.basis === 'un-derivable' ? 'planner-referral' : 'derived',
    dataset: 'subdivision analysis',
    working:
      derivedLots != null && minLotSize != null
        ? `Torrens subdivision analysis — net developable area ÷ min lot size (${minLotSize} sqm)`
        : 'Un-derivable without a resolved zone / minimum lot size',
    severity: yieldRes.basis === 'un-derivable' ? 'blocker' : 'info',
  })
  if (yieldRes.basis === 'un-derivable') {
    gaps.push({
      dimension: 'density_yield',
      label: 'Estate yield',
      provenance: 'planner-referral',
      detail: 'Yield cannot be derived without a resolved zone + minimum lot size — resolve via the planner referral.',
    })
  }

  // ── D/G. Services + cost — not derivable here (later stages) ─
  gaps.push({
    dimension: 'services',
    label: 'Servicing (sewer/water/power/stormwater)',
    provenance: 'needs-input',
    detail: 'BYDA/DBYD enquiry + authority capacity — not in the desktop dataset.',
  })

  return {
    yield: yieldRes,
    lines,
    gaps,
    requiresPlannerReferral: yieldRes.basis === 'un-derivable' || !profile.zoning,
  }
}

function resolveYield(args: {
  derivedLots: number | null
  minLotSize: number | null
  opts: BuildupOptions
  threshold: number
}): YieldResolution {
  const { derivedLots, opts, threshold } = args
  const studyLots = opts.feasibilityStudyLots ?? null
  const developerClaimedLots = opts.developerClaimedLots ?? null

  // Un-derivable → referral; nothing authoritative yet.
  if (derivedLots == null) {
    return {
      authoritativeLots: null,
      derivedLots: null,
      studyLots,
      developerClaimedLots,
      reconciliationNeeded: false,
      unbackedClaimConflict: false,
      basis: 'un-derivable',
      note: 'Yield un-derivable (no resolved zone / min lot size). Planner referral required.',
    }
  }

  // Derived is authoritative. A study reconciles (does not silently override).
  const reconciliationNeeded =
    studyLots != null && materiallyDiffers(derivedLots, studyLots, threshold)

  // An anecdotal claim (no study) that materially exceeds derived → likely pass.
  const unbackedClaimConflict =
    studyLots == null &&
    developerClaimedLots != null &&
    developerClaimedLots > derivedLots &&
    materiallyDiffers(derivedLots, developerClaimedLots, threshold)

  return {
    authoritativeLots: derivedLots,
    derivedLots,
    studyLots,
    developerClaimedLots,
    reconciliationNeeded,
    unbackedClaimConflict,
    basis: 'derived',
    note: reconciliationNeeded
      ? 'Feasibility-study yield differs materially from derived — review discrepancies.'
      : unbackedClaimConflict
        ? 'Developer anecdotal yield exceeds derived with no feasibility study — pass unless they accept our analysis or produce a study.'
        : undefined,
  }
}
