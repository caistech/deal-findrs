import type {
  AbsorptionCurve,
  AvmGate,
  EstateValuationInput,
  EstateValuationPack,
  SiteRiskAssessment,
  SiteRiskLevel,
} from './types'

/**
 * Build the GRV & absorption pack. Pure/stateless — the Domain AVM cross-check is fetched separately
 * (async) and attached to `avm`. Absorption is a two-phase curve: an evidence-gated pre-sold burst
 * then a benchmark monthly tail, emitting a per-month take-up vector.
 */

/** Domain's raw confidence descriptor → whether we assert the cross-check or degrade to indicative. */
export function gateAvmConfidence(raw: string | null | undefined): AvmGate {
  const c = (raw ?? '').toLowerCase()
  return c === 'confident' || c === 'recentlysold' ? 'assert' : 'indicative'
}

/** A conservative default open-market absorption rate, scaled to estate size (never below ~2/month). */
function defaultBenchmarkRate(lots: number): number {
  return Math.max(2, Math.round(lots / 12))
}

/**
 * Score constraint-driven site risk (overlays / contamination / flood) into a level + an absorption
 * multiplier. Mirrors the devfinance `assessMarketRisk` shape (score → banded level + commentary),
 * but on SITE constraints rather than comp confidence. Elevated risk slows the open-market sell-down
 * and flags a GRV constraint-discount for the valuer to determine (degrade-don't-fake: it annotates,
 * it does not silently cut the certified GRV).
 */
export function assessSiteRisk(siteRisk?: EstateValuationInput['siteRisk']): SiteRiskAssessment {
  const overlays = (siteRisk?.overlays ?? []).filter((o) => o && o.trim())
  const factors: string[] = []
  let score = 0

  if (siteRisk?.contaminated) {
    score += 3
    factors.push('contamination recorded')
  }
  const floodByName = overlays.some((o) => /flood/i.test(o))
  if (siteRisk?.floodAffected || floodByName) {
    score += 2
    factors.push('flood exposure')
  }
  if (overlays.some((o) => /heritage|character/i.test(o))) {
    score += 2
    factors.push('heritage/character overlay')
  }
  const other = overlays.filter((o) => !/flood|heritage|character/i.test(o))
  if (other.length) {
    score += 1
    factors.push(`${other.length} planning overlay${other.length > 1 ? 's' : ''} requiring report`)
  }

  const level: SiteRiskLevel = score >= 5 ? 'critical' : score >= 3 ? 'high' : score >= 1 ? 'medium' : 'low'
  const absorptionFactor = level === 'critical' ? 0.6 : level === 'high' ? 0.75 : level === 'medium' ? 0.9 : 1
  const slowdownPct = Math.round((1 - absorptionFactor) * 100)
  const commentary =
    level === 'low'
      ? 'No material site constraints recorded — benchmark absorption applies.'
      : `Site risk is ${level}: ${factors.join(', ')}. Benchmark absorption slowed ${slowdownPct}%; the certified GRV should be reviewed for a constraint discount.`

  return { level, factors, commentary, absorptionFactor }
}

function buildAbsorption(lots: number, input: EstateValuationInput, absorptionFactor = 1): AbsorptionCurve {
  const preSalesPercent = Math.min(1, Math.max(0, input.preSalesPercent ?? 0))
  const benchmarkRatePerMonth = Math.max(
    1,
    Math.round((input.benchmarkRatePerMonth ?? defaultBenchmarkRate(lots)) * absorptionFactor),
  )
  const burstMonths = Math.max(1, input.burstMonths ?? 3)

  const preSoldLots = Math.min(lots, Math.round(lots * preSalesPercent))
  const openMarketLots = lots - preSoldLots
  const tailMonths = benchmarkRatePerMonth > 0 ? Math.ceil(openMarketLots / benchmarkRatePerMonth) : 0

  // Monthly take-up vector: spread the pre-sold burst evenly over burstMonths, then the benchmark tail.
  const monthly: number[] = []
  if (preSoldLots > 0) {
    const per = preSoldLots / burstMonths
    let allocated = 0
    for (let m = 0; m < burstMonths; m++) {
      const isLast = m === burstMonths - 1
      const v = isLast ? preSoldLots - allocated : Math.round(per)
      monthly.push(v)
      allocated += v
    }
  }
  let remaining = openMarketLots
  while (remaining > 0) {
    const v = Math.min(benchmarkRatePerMonth, remaining)
    monthly.push(v)
    remaining -= v
  }

  return {
    preSalesPercent,
    preSoldLots,
    burstMonths: preSoldLots > 0 ? burstMonths : 0,
    benchmarkRatePerMonth,
    tailMonths,
    totalMonths: monthly.length,
    monthly,
    benchmarkOnly: preSoldLots === 0,
  }
}

/**
 * Convert an absorption monthly take-up vector (lots/month) into revenue fractions per month
 * (summing to 1) — the `salesProfile` the devfinance cash-flow consumes (Phase 3c-D), so a
 * front-loaded absorption curve actually shortens the holding period + cuts finance cost. Returns []
 * for an empty/zero vector (the cash-flow then falls back to its even spread).
 */
export function absorptionToSalesProfile(monthly: number[]): number[] {
  const total = monthly.reduce((s, v) => s + v, 0)
  if (total <= 0) return []
  return monthly.map((v) => v / total)
}

export function buildValuationPack(input: EstateValuationInput): EstateValuationPack {
  const lots = Math.max(0, Math.round(input.lots))
  const grvPerLot = Math.max(0, Math.round(input.grvPerLot))
  const siteRisk = assessSiteRisk(input.siteRisk)
  return {
    lots,
    grvPerLot,
    totalGrv: grvPerLot * lots,
    avm: null,
    absorption: buildAbsorption(lots, input, siteRisk.absorptionFactor),
    siteRisk,
  }
}
