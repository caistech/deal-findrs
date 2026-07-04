import type { AbsorptionCurve, AvmGate, EstateValuationInput, EstateValuationPack } from './types'

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

function buildAbsorption(lots: number, input: EstateValuationInput): AbsorptionCurve {
  const preSalesPercent = Math.min(1, Math.max(0, input.preSalesPercent ?? 0))
  const benchmarkRatePerMonth = input.benchmarkRatePerMonth ?? defaultBenchmarkRate(lots)
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
  return {
    lots,
    grvPerLot,
    totalGrv: grvPerLot * lots,
    avm: null,
    absorption: buildAbsorption(lots, input),
  }
}
