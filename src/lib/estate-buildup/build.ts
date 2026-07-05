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
  const panel = opts.resolvedPanel ?? {}
  const conditions = opts.approvalConditions ?? {}
  const condRef = conditions.wapcRef ? ` (WAPC ${conditions.wapcRef})` : ''
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
  // A panel title write-back resolves the tenure gap (else it stays open as needs-input).
  if (panel.title) {
    lines.push({
      key: 'title',
      label: 'Title & encumbrances',
      value: panel.title,
      provenance: 'operator-resolved',
      dataset: 'panel review (property write-back)',
    })
  } else {
    gaps.push({
      dimension: 'tenure',
      label: 'Easements / covenants / road reserves',
      provenance: 'needs-input',
      detail: 'Not derivable from the desktop dataset — confirm from title search + registered plan.',
    })
  }

  // ── B. Planning (zoning + min lot) ──────────────────────────
  const resolved = opts.operatorResolved
  const minLotSize =
    resolved?.minLotSize ?? profile.zoning?.minimumLotSize ?? profile.subdivision?.torrens?.minLotSize ?? null
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
  } else if (resolved?.zoneCode) {
    // A planner resolved the zone (approved referral) → operator-resolved, no referral.
    lines.push({
      key: 'zoning',
      label: 'Zoning',
      value: `${resolved.zoneCode} (planner-resolved)`,
      provenance: 'operator-resolved',
      dataset: 'planner referral',
    })
    lines.push({
      key: 'minLotSize',
      label: 'Minimum lot size',
      value: minLotSize,
      unit: 'sqm',
      provenance: minLotSize != null ? 'operator-resolved' : 'needs-input',
      dataset: 'planner referral',
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

  // ── B2. Built-form controls (permitted uses + envelope) ─────
  // Zoning carries the built-form envelope — what may be built, how tall, where on the lot, plus
  // any modular provisions + the zone description. Derived context lines that inform the
  // professional's design/feasibility review (height ↔ product mix; setbacks ↔ net developable;
  // permitted uses ↔ as-of-right vs discretionary; modular provisions ↔ the F2K product). They do
  // NOT alter the derived Torrens yield below (additive only).
  if (profile.zoning) {
    const z = profile.zoning
    if (z.permittedUses.length) {
      lines.push({
        key: 'permittedUses',
        label: 'Permitted uses',
        value: z.permittedUses.join(', '),
        provenance: 'derived',
        dataset: 'zoning controls',
      })
    }
    if (z.maximumHeight != null || z.maximumHeightStoreys != null) {
      const parts: string[] = []
      if (z.maximumHeight != null) parts.push(`${z.maximumHeight} m`)
      if (z.maximumHeightStoreys != null) parts.push(`${z.maximumHeightStoreys} storeys`)
      lines.push({
        key: 'maxHeight',
        label: 'Maximum building height',
        value: parts.join(' / '),
        provenance: 'derived',
        dataset: 'zoning controls',
      })
    }
    if (
      z.setbacks &&
      (z.setbacks.front != null || z.setbacks.side != null || z.setbacks.rear != null || z.setbacks.notes)
    ) {
      const sb = z.setbacks
      const dims = [
        sb.front != null ? `front ${sb.front} m` : null,
        sb.side != null ? `side ${sb.side} m` : null,
        sb.rear != null ? `rear ${sb.rear} m` : null,
      ]
        .filter(Boolean)
        .join(' / ')
      lines.push({
        key: 'setbacks',
        label: 'Setbacks',
        value: dims || 'per scheme',
        provenance: 'derived',
        dataset: 'zoning controls',
        working: sb.notes ?? undefined,
      })
    }
    if (z.modularProvisions) {
      lines.push({
        key: 'modularProvisions',
        label: 'Modular / prefab provisions',
        value: z.modularProvisions,
        provenance: 'derived',
        dataset: 'zoning controls',
      })
    }
    if (z.description) {
      lines.push({
        key: 'zoneDescription',
        label: 'Zone description',
        value: z.description,
        provenance: 'derived',
        dataset: 'zoning controls',
      })
    }
  }

  // ── C. Topography & earthworks ──────────────────────────────
  if (profile.terrain) {
    const slope = profile.terrain.slopePercent
    const steep = slope != null && slope > 15
    const t = profile.terrain
    // Fall + elevation are the earthworks drivers alongside slope — total site fall sizes the
    // cut/fill volume; carry them on the slope line's working and as their own lines.
    const earthworksBits: string[] = []
    if (t.buildability) earthworksBits.push(`Buildability: ${t.buildability}`)
    if (t.fallMeters != null) earthworksBits.push(`Total fall ${t.fallMeters} m`)
    if (t.elevationM != null) earthworksBits.push(`Elevation ${t.elevationM} m`)
    lines.push({
      key: 'slope',
      label: 'Slope',
      value: slope,
      unit: '%',
      provenance: 'derived',
      dataset: t.source ? `terrain (${t.source})` : 'terrain (LiDAR/DEM)',
      severity: steep ? 'attention' : 'info',
      working: earthworksBits.length ? earthworksBits.join(' · ') : undefined,
    })
    if (t.fallMeters != null) {
      lines.push({
        key: 'siteFall',
        label: 'Total site fall',
        value: t.fallMeters,
        unit: 'm',
        provenance: 'derived',
        dataset: t.source ? `terrain (${t.source})` : 'terrain (LiDAR/DEM)',
        severity: t.fallMeters > 10 ? 'attention' : 'info',
      })
    }
    if (t.elevationM != null) {
      lines.push({
        key: 'elevation',
        label: 'Elevation (AHD)',
        value: t.elevationM,
        unit: 'm',
        provenance: 'derived',
        dataset: t.source ? `terrain (${t.source})` : 'terrain (LiDAR/DEM)',
      })
    }
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
    provenance:
      yieldRes.basis === 'un-derivable'
        ? 'planner-referral'
        : yieldRes.basis === 'operator-resolved'
          ? 'operator-resolved'
          : 'derived',
    dataset: yieldRes.basis === 'operator-resolved' ? 'planner referral' : 'subdivision analysis',
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

  // ── F2. Subdivision alternatives & analysis notes ───────────
  // The subdivision analysis also assesses a STRATA path and emits recommendations/warnings. Surface
  // strata as an alternative-yield note, its recommendations as context notes, and its warnings as
  // needs-input gaps — all ADDITIVE to the authoritative Torrens yield above (which is unchanged).
  const strata = profile.subdivision?.strata
  if (strata && (strata.feasible || strata.notes)) {
    lines.push({
      key: 'strataYield',
      label: 'Strata subdivision (alternative)',
      value: strata.feasible ? 'feasible' : 'not feasible',
      provenance: 'derived',
      dataset: 'subdivision analysis',
      working:
        [
          strata.notes || null,
          strata.minLotSize != null ? `min lot size ${strata.minLotSize} sqm` : null,
        ]
          .filter(Boolean)
          .join(' — ') || undefined,
      severity: 'info',
    })
  }
  const subdivisionRecs = profile.subdivision?.recommendations ?? []
  for (let i = 0; i < subdivisionRecs.length; i++) {
    lines.push({
      key: `subdivisionRec:${i}`,
      label: 'Subdivision recommendation',
      value: subdivisionRecs[i],
      provenance: 'note',
      dataset: 'subdivision analysis',
      severity: 'info',
    })
  }
  for (const warning of profile.subdivision?.warnings ?? []) {
    gaps.push({
      dimension: 'density_yield',
      label: 'Subdivision analysis warning',
      provenance: 'needs-input',
      detail: warning,
    })
  }

  // A panel contamination write-back — or a contamination/UXO condition of approval — is surfaced as
  // a line (it also drives the valuer's site-risk).
  if (panel.contamination || conditions.contamination) {
    lines.push({
      key: 'contamination',
      label: 'Contamination',
      value: panel.contamination ?? conditions.contamination ?? 'flagged',
      provenance: 'operator-resolved',
      dataset: panel.contamination ? 'panel review (property write-back)' : `conditions of approval${condRef}`,
      severity: 'attention',
    })
  }

  // Constraint conditions of approval — geotech + water management are formal reports the approval
  // mandates before subdivisional works; surface them as constraint gaps (they carry cost + risk).
  if (conditions.geotech) {
    gaps.push({
      dimension: 'constraints',
      label: 'Geotechnical report — required by condition',
      provenance: 'formal-required',
      detail: `A pre-works (and post-works) geotechnical report is a condition of approval${condRef} before subdivisional works.`,
    })
  }
  if (conditions.waterManagement) {
    gaps.push({
      dimension: 'constraints',
      label: 'Water Management Report — required by condition',
      provenance: 'formal-required',
      detail: `A Water Management Report (drainage/stormwater) is a condition of approval${condRef}, approved by the LG in consultation with DWER.`,
    })
  }

  // ── D/G. Services + cost — not derivable here (later stages) ─
  // A panel servicing write-back — or servicing conditions of approval (power/water/sewer to each
  // lot, arrangements mandated with the authorities) — resolves the servicing gap.
  if (panel.servicing || conditions.servicing) {
    lines.push({
      key: 'servicing',
      label: 'Servicing (sewer/water/power/stormwater)',
      value: panel.servicing ?? `Conditioned per approval${condRef} — power/water/sewer to each lot; authority arrangements to be made`,
      provenance: 'operator-resolved',
      dataset: panel.servicing ? 'panel review (property write-back)' : `conditions of approval${condRef}`,
    })
  } else {
    gaps.push({
      dimension: 'services',
      label: 'Servicing (sewer/water/power/stormwater)',
      provenance: 'needs-input',
      detail: 'BYDA/DBYD enquiry + authority capacity — not in the desktop dataset.',
    })
  }
  gaps.push({
    dimension: 'cost',
    label: 'Civil / QS cost buildup',
    provenance: 'needs-input',
    detail: 'Construction/civil cost is out of scope for the desktop derive — built in the QS cost pack (Checklist 2) and fed to the deal-model.',
  })

  return {
    yield: yieldRes,
    lines,
    gaps,
    requiresPlannerReferral:
      yieldRes.basis === 'un-derivable' || (!profile.zoning && !resolved?.zoneCode),
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
  const resolvedLots = opts.operatorResolved?.lots ?? null

  // A planner resolved the yield (approved referral) → authoritative, referral cleared.
  if (resolvedLots != null) {
    return {
      authoritativeLots: resolvedLots,
      derivedLots,
      studyLots,
      developerClaimedLots,
      reconciliationNeeded: false,
      unbackedClaimConflict: false,
      basis: 'operator-resolved',
      note: 'Yield resolved by the planner referral.',
    }
  }

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
