// Import from the source module (not the devfinance barrel) so this stays client-safe — the barrel
// re-exports server-only db helpers.
import { getRegionalFactor, calculateConstructionCost } from '@/lib/devfinance/costs'
import type {
  CivilProgramme,
  DrawdownPhase,
  EstateCostInput,
  EstateCostLine,
  EstateCostPack,
  PiInsurance,
  WorksReconciliation,
} from './types'

/**
 * CANONICAL COST PATH (A3 / D1 — see docs/COST_ENGINE_CANONICAL.md): for an estate/subdivision deal,
 * this module is the SINGLE source of land-development (works) cost and the one feed into the F2K
 * deal-model (via `deriveWorksToTitle`). `devfinance/costs.ts` is NOT a parallel estate cost source —
 * it provides the shared `getRegionalFactor` + `calculateConstructionCost` primitives this module
 * consumes (the latter only for the optional H&L home line). Use `reconcileWorksCost` to surface a
 * mismatch if a legacy devfinance figure is ever compared against the estate figure.
 */

/**
 * A3 drift guard — cross-check the canonical estate works figure against an alternative and flag a
 * material divergence (default tolerance 10%). Surfaces the mismatch; never silently reconciles.
 */
export function reconcileWorksCost(
  estate: number,
  alternative: number,
  tolerancePct = 0.1,
): WorksReconciliation {
  const deltaAbs = alternative - estate
  const deltaPct = estate > 0 ? deltaAbs / estate : alternative > 0 ? 1 : 0
  return {
    estate,
    alternative,
    deltaAbs,
    deltaPct,
    reconciled: Math.abs(deltaPct) <= tolerancePct,
    tolerancePct,
  }
}

/**
 * Build the lot-level QS cost buildup. Pure/stateless. Reuses devfinance's `getRegionalFactor` for
 * the regional multiplier and `calculateConstructionCost` for the optional H&L home line. Benchmark
 * civil/soft rates are INDICATIVE (Sydney baseline, per lot) for a QS to confirm — the review pack's
 * value is review/certify, not rebuild.
 */

/** Indicative per-lot land-subdivision rates, Sydney baseline (× region factor). Source: benchmark. */
const CIVIL_RATES_PER_LOT: { key: string; label: string; sydney: number }[] = [
  { key: 'earthworks', label: 'Bulk earthworks & site regrade', sydney: 18000 },
  { key: 'roadworks', label: 'Roadworks, kerbing & footpaths', sydney: 22000 },
  { key: 'stormwater', label: 'Stormwater drainage', sydney: 12000 },
  { key: 'water_sewer', label: 'Water & sewer reticulation', sydney: 15000 },
  { key: 'power_comms', label: 'Power & comms (NBN) reticulation', sydney: 9000 },
  { key: 'landscaping_pos', label: 'Landscaping & public open space', sydney: 6000 },
]

const SOFT_RATES_PER_LOT: { key: string; label: string; sydney: number }[] = [
  { key: 'eng_survey', label: 'Engineering design & survey', sydney: 4500 },
  { key: 'planning_approvals', label: 'Planning & approvals', sydney: 2500 },
  { key: 'legal_titling', label: 'Legal & titling', sydney: 1500 },
]

/** Civil lines whose cost scales with slope (bulk earthworks + roadworks/kerbing on grade). */
const SLOPE_SENSITIVE_KEYS = new Set(['earthworks', 'roadworks'])

/**
 * Slope → cost adjustment. Mirrors the buildup's topography flags (estate-buildup flags slope > 15%
 * as a civil hard-stop). Returns a multiplier for the slope-sensitive civil lines plus an indicative
 * per-lot retaining allowance (Sydney baseline, × region factor by the caller). Bands: flat ≤5% ·
 * gentle 5–10% · moderate 10–15% · steep >15%.
 */
function slopeAdjustment(slopePercent: number | null | undefined): {
  factor: number
  band: string
  retainingSydney: number
} {
  const s = slopePercent ?? null
  if (s == null) return { factor: 1, band: 'slope unknown — flat assumed', retainingSydney: 0 }
  if (s <= 5) return { factor: 1.0, band: 'flat (≤5%)', retainingSydney: 0 }
  if (s <= 10) return { factor: 1.25, band: 'gentle (5–10%)', retainingSydney: 0 }
  if (s <= 15) return { factor: 1.6, band: 'moderate (10–15%)', retainingSydney: 9000 }
  return { factor: 2.2, band: 'steep (>15%)', retainingSydney: 22000 }
}

/** Project management as a % of civil (benchmark). */
const PM_PCT_OF_CIVIL = 0.05
/** Statutory infrastructure contributions / headworks per lot, Sydney baseline (× region factor). */
const HEADWORKS_PER_LOT_SYDNEY = 20000
// Condition-driven cost defaults (indicative — flagged source:'condition' for QS confirmation).
const EDUCATION_DEFAULT_PER_LOT = 1500 // WAPC OP2.4 fallback when a per-ha valuation isn't supplied
const ROAD_UPGRADE_LUMP_SYDNEY = 500000 // external road-frontage upgrades (whole-of-estate lump)
const POS_DEV_RATE_PER_SQM = 60 // POS development to Liveable Neighbourhoods + 2-summer maintenance
const POS_DEV_LUMP_SYDNEY = 300000 // POS development fallback when the POS area isn't known
const DEMOLITION_LUMP_SYDNEY = 80000 // clearing existing improvements on the parent lots
/** Contingency as a % of (civil + soft + statutory). */
const CONTINGENCY_PCT = 0.075

function round(n: number): number {
  return Math.round(n)
}

/** Civil-subdivision drawdown phases (land development), as % of the works — the estate S-curve
 *  shape (NOT the house-build Slab/Frame/… profile, which is for the H&L home line). */
const CIVIL_DRAWDOWN_PHASES: { phase: string; percent: number }[] = [
  { phase: 'Bulk earthworks & site regrade', percent: 20 },
  { phase: 'Roadworks, kerbing, drainage & stormwater', percent: 30 },
  { phase: 'Water, sewer, power & comms reticulation', percent: 30 },
  { phase: 'Landscaping, POS & practical completion', percent: 12 },
  { phase: 'Plan registration & titles', percent: 8 },
]

/** Indicative civil programme length (months) for an estate of N lots. */
export function estateProgrammeMonths(lots: number): number {
  return Math.max(6, Math.min(24, 6 + Math.round(Math.max(0, lots) / 3)))
}

/** Build the civil programme + drawdown S-curve for the land-development works. */
export function buildCivilProgramme(worksTotal: number, programMonths: number): CivilProgramme {
  const works = Math.max(0, worksTotal)
  const months = Math.max(CIVIL_DRAWDOWN_PHASES.length, Math.round(programMonths))
  const monthsPerPhase = months / CIVIL_DRAWDOWN_PHASES.length
  let cumulativeAmount = 0
  let cumulativePercent = 0
  const phases: DrawdownPhase[] = CIVIL_DRAWDOWN_PHASES.map((p, i) => {
    const amount = Math.round(works * (p.percent / 100))
    cumulativeAmount += amount
    cumulativePercent += p.percent
    return {
      phase: p.phase,
      percent: p.percent,
      cumulativePercent,
      amount,
      cumulativeAmount,
      targetMonth: Math.round((i + 1) * monthsPerPhase),
    }
  })
  return { months, worksTotal: works, phases }
}

/**
 * Professional-indemnity cover scaled to the build size (AIQS CFR banding):
 * ≤$5m build → $1m · $5m–$10m → $3m · >$10m → $5m.
 */
export function piInsuranceCover(buildCost: number): PiInsurance {
  if (buildCost <= 5_000_000) return { buildCost, cover: 1_000_000, band: '≤$5m build → $1m cover' }
  if (buildCost <= 10_000_000) return { buildCost, cover: 3_000_000, band: '$5m–$10m build → $3m cover' }
  return { buildCost, cover: 5_000_000, band: '>$10m build → $5m cover' }
}

export function buildEstateCostPack(input: EstateCostInput): EstateCostPack {
  const city = input.city || 'Regional'
  const regionFactor = getRegionalFactor(input.state, city)
  const ov = input.overrides ?? {}
  const rate = (key: string, benchmark: number) => (key in ov ? ov[key] : round(benchmark * regionFactor))

  const lines: EstateCostLine[] = []

  // ── Land ──
  const landPerLot = input.landPerLot != null ? round(input.landPerLot) : rate('land', 120000)
  lines.push({
    key: 'land',
    label: 'Land acquisition per lot',
    category: 'Land',
    perLot: landPerLot,
    basis: input.landPerLot != null ? 'Operator-supplied land price ÷ lots' : 'Benchmark — confirm from contract/valuation',
    source: input.landPerLot != null ? 'operator' : 'benchmark',
  })

  // ── Civil / Infrastructure ──
  // Slope scales the slope-sensitive lines (earthworks/roadworks); an explicit override still wins.
  const slope = slopeAdjustment(input.terrain?.slopePercent)
  let civilPerLot = 0
  for (const r of CIVIL_RATES_PER_LOT) {
    const overridden = r.key in ov
    const slopeScaled = !overridden && slope.factor !== 1 && SLOPE_SENSITIVE_KEYS.has(r.key)
    const v = slopeScaled ? round(rate(r.key, r.sydney) * slope.factor) : rate(r.key, r.sydney)
    civilPerLot += v
    lines.push({
      key: r.key,
      label: r.label,
      category: 'Civil / Infrastructure',
      perLot: v,
      basis: slopeScaled
        ? `Benchmark $${r.sydney.toLocaleString('en-AU')}/lot × region factor ${regionFactor.toFixed(2)} × slope factor ${slope.factor.toFixed(2)} (${slope.band})`
        : `Benchmark $${r.sydney.toLocaleString('en-AU')}/lot × region factor ${regionFactor.toFixed(2)}`,
      source: 'benchmark',
    })
  }

  // Retaining & batter stabilisation — added on moderate/steep sites (or an explicit override).
  const retainingPerLot =
    'retaining' in ov ? ov['retaining'] : slope.retainingSydney > 0 ? round(slope.retainingSydney * regionFactor) : 0
  if (retainingPerLot > 0) {
    civilPerLot += retainingPerLot
    lines.push({
      key: 'retaining',
      label: 'Retaining & batter stabilisation',
      category: 'Civil / Infrastructure',
      perLot: retainingPerLot,
      basis:
        'retaining' in ov
          ? 'Operator-supplied retaining allowance per lot'
          : `Slope ${slope.band} — indicative retaining allowance $${slope.retainingSydney.toLocaleString('en-AU')}/lot × region factor ${regionFactor.toFixed(2)}`,
      source: 'retaining' in ov ? 'operator' : 'benchmark',
    })
  }

  // ── Professional / Soft (incl. PM as % of civil) ──
  let softPerLot = 0
  for (const r of SOFT_RATES_PER_LOT) {
    const v = rate(r.key, r.sydney)
    softPerLot += v
    lines.push({
      key: r.key,
      label: r.label,
      category: 'Professional / Soft',
      perLot: v,
      basis: `Benchmark $${r.sydney.toLocaleString('en-AU')}/lot × region factor ${regionFactor.toFixed(2)}`,
      source: 'benchmark',
    })
  }
  const pmPerLot = 'pm' in ov ? ov['pm'] : round(civilPerLot * PM_PCT_OF_CIVIL)
  softPerLot += pmPerLot
  lines.push({
    key: 'pm',
    label: 'Project & construction management',
    category: 'Professional / Soft',
    perLot: pmPerLot,
    basis: `${(PM_PCT_OF_CIVIL * 100).toFixed(1)}% of civil per lot`,
    source: 'benchmark',
  })

  // ── Statutory / Contributions ──
  let statutoryPerLot = rate('headworks', HEADWORKS_PER_LOT_SYDNEY)
  lines.push({
    key: 'headworks',
    label: 'Infrastructure contributions / headworks',
    category: 'Statutory / Contributions',
    perLot: statutoryPerLot,
    basis: `Benchmark $${HEADWORKS_PER_LOT_SYDNEY.toLocaleString('en-AU')}/lot × region factor ${regionFactor.toFixed(2)} — confirm with servicing authority`,
    source: 'benchmark',
  })

  // ── Condition-driven costs (mandated by the subdivision approval, not benchmark defaults) ──
  const cond = input.approvalConditions
  const condRef = cond?.wapcRef ? ` (WAPC ${cond.wapcRef})` : ''
  if (cond?.education) {
    // WAPC OP2.4 education contribution — 1/1500th of the per-hectare land value, per lot.
    const perLot =
      'education_levy' in ov
        ? ov['education_levy']
        : cond.landValuePerHa != null
          ? round(cond.landValuePerHa / 1500)
          : round(EDUCATION_DEFAULT_PER_LOT * regionFactor)
    statutoryPerLot += perLot
    lines.push({
      key: 'education_levy',
      label: 'Education contribution (WAPC OP2.4)',
      category: 'Statutory / Contributions',
      perLot,
      basis:
        cond.landValuePerHa != null
          ? `1/1500th of $${round(cond.landValuePerHa).toLocaleString('en-AU')}/ha land value, per lot${condRef}`
          : `OP2.4 indicative $${EDUCATION_DEFAULT_PER_LOT.toLocaleString('en-AU')}/lot — confirm from a per-hectare valuation${condRef}`,
      source: 'condition',
    })
  }
  if (cond?.roadUpgrades) {
    const perLot = 'road_upgrades' in ov ? ov['road_upgrades'] : round((ROAD_UPGRADE_LUMP_SYDNEY * regionFactor) / input.lots)
    civilPerLot += perLot
    lines.push({
      key: 'road_upgrades',
      label: 'External road-frontage upgrades',
      category: 'Civil / Infrastructure',
      perLot,
      basis: `Condition — upgrade abutting road frontages to LG spec${condRef}; ~$${ROAD_UPGRADE_LUMP_SYDNEY.toLocaleString('en-AU')} lump ÷ ${input.lots} lots`,
      source: 'condition',
    })
  }
  if (cond?.posDevelopment) {
    const posSqm = cond.posSqm ?? 0
    const lump = posSqm > 0 ? posSqm * POS_DEV_RATE_PER_SQM : POS_DEV_LUMP_SYDNEY
    const perLot = 'pos_development' in ov ? ov['pos_development'] : round((lump * regionFactor) / input.lots)
    civilPerLot += perLot
    lines.push({
      key: 'pos_development',
      label: 'POS development + 2-summer maintenance',
      category: 'Civil / Infrastructure',
      perLot,
      basis:
        posSqm > 0
          ? `${posSqm.toLocaleString('en-AU')} m² × $${POS_DEV_RATE_PER_SQM}/m² (Liveable Neighbourhoods + maintenance)${condRef} ÷ ${input.lots} lots`
          : `Condition — POS development to LG spec${condRef}; ~$${POS_DEV_LUMP_SYDNEY.toLocaleString('en-AU')} lump ÷ ${input.lots} lots`,
      source: 'condition',
    })
  }
  if (cond?.demolition) {
    const perLot = 'demolition' in ov ? ov['demolition'] : round((DEMOLITION_LUMP_SYDNEY * regionFactor) / input.lots)
    civilPerLot += perLot
    lines.push({
      key: 'demolition',
      label: 'Demolition of existing improvements',
      category: 'Civil / Infrastructure',
      perLot,
      basis: `Condition — demolish existing buildings on the parent lots${condRef}; ~$${DEMOLITION_LUMP_SYDNEY.toLocaleString('en-AU')} lump ÷ ${input.lots} lots`,
      source: 'condition',
    })
  }

  // ── Contingency ──
  const contingencyBase = civilPerLot + softPerLot + statutoryPerLot
  const contingencyPerLot = 'contingency' in ov ? ov['contingency'] : round(contingencyBase * CONTINGENCY_PCT)
  lines.push({
    key: 'contingency',
    label: 'Contingency',
    category: 'Contingency',
    perLot: contingencyPerLot,
    basis: `${(CONTINGENCY_PCT * 100).toFixed(1)}% of civil + soft + statutory`,
    source: 'benchmark',
  })

  // ── House & Land (optional) — buyer's build cost, reuses the devfinance cost engine ──
  const homeCaptureRate = input.homeCaptureRate ?? 0
  let homeConstructionPerHome: number | null = null
  if (homeCaptureRate > 0 && input.homeSpec) {
    const { constructionSubtotal } = calculateConstructionCost(
      [{ code: 'HL', name: 'Modular home', count: 1, floorAreaSqm: input.homeSpec.floorAreaSqm, bedrooms: input.homeSpec.bedrooms, bathrooms: input.homeSpec.bathrooms, parking: 1 }],
      input.state,
      city,
      input.homeSpec.quality ?? 'medium',
    )
    homeConstructionPerHome = round(constructionSubtotal)
    lines.push({
      key: 'hl_home',
      label: `House & Land — modular home build (${Math.round(homeCaptureRate * 100)}% capture)`,
      category: 'House & Land',
      perLot: homeConstructionPerHome,
      basis: `devfinance cost engine, ${input.homeSpec.floorAreaSqm} sqm — buyer's build cost per captured home (not a land-development input)`,
      source: 'devfinance-engine',
    })
  }

  const landDevCostPerLot = landPerLot + civilPerLot + softPerLot + statutoryPerLot + contingencyPerLot

  return {
    lots: input.lots,
    state: input.state,
    city,
    regionFactor,
    lines,
    landPerLot,
    civilPerLot,
    softPerLot,
    statutoryPerLot,
    contingencyPerLot,
    landDevCostPerLot,
    homeCaptureRate,
    homeConstructionPerHome,
    totalLandDevCost: landDevCostPerLot * input.lots,
  }
}
