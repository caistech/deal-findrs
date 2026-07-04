// Import from the source module (not the devfinance barrel) so this stays client-safe — the barrel
// re-exports server-only db helpers.
import { getRegionalFactor, calculateConstructionCost } from '@/lib/devfinance/costs'
import type { EstateCostInput, EstateCostLine, EstateCostPack } from './types'

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

/** Project management as a % of civil (benchmark). */
const PM_PCT_OF_CIVIL = 0.05
/** Statutory infrastructure contributions / headworks per lot, Sydney baseline (× region factor). */
const HEADWORKS_PER_LOT_SYDNEY = 20000
/** Contingency as a % of (civil + soft + statutory). */
const CONTINGENCY_PCT = 0.075

function round(n: number): number {
  return Math.round(n)
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
  let civilPerLot = 0
  for (const r of CIVIL_RATES_PER_LOT) {
    const v = rate(r.key, r.sydney)
    civilPerLot += v
    lines.push({
      key: r.key,
      label: r.label,
      category: 'Civil / Infrastructure',
      perLot: v,
      basis: `Benchmark $${r.sydney.toLocaleString('en-AU')}/lot × region factor ${regionFactor.toFixed(2)}`,
      source: 'benchmark',
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
  const statutoryPerLot = rate('headworks', HEADWORKS_PER_LOT_SYDNEY)
  lines.push({
    key: 'headworks',
    label: 'Infrastructure contributions / headworks',
    category: 'Statutory / Contributions',
    perLot: statutoryPerLot,
    basis: `Benchmark $${HEADWORKS_PER_LOT_SYDNEY.toLocaleString('en-AU')}/lot × region factor ${regionFactor.toFixed(2)} — confirm with servicing authority`,
    source: 'benchmark',
  })

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
