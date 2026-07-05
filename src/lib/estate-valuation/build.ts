import { computeGst, DEFAULT_GST_SCHEME, runCashflow, cashflowMetrics } from '@caistech/deal-model'
import type {
  AbsorptionCurve,
  AvmGate,
  EstateValuationInput,
  EstateValuationPack,
  SiteRiskAssessment,
  SiteRiskLevel,
  ValuerDcf,
  ValuerResidualPnl,
  ValuerResidualPnlInput,
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
    pnl: null, // attached in the route where the QS costs are known
    dcf: null, // attached in the route (needs land + QS costs)
  }
}

/**
 * DCF metrics (B1) — project IRR + NPV + NPV-basis RLV, computed from a staged project cashflow
 * (works out over N stages, sales in lagged one stage, land at t0) via the shared deal-model
 * `runCashflow` + `cashflowMetrics`. Indicative: stages/duration are derived from lot count +
 * the absorption sell-down. Complements the target-margin residual in {@link buildValuerPnl}.
 */
export function buildValuerDcf(input: {
  grvPerLot: number
  lots: number
  developmentCostExclLand: number
  landAcquisitionCost: number
  absorptionMonths: number
  sellingCostPct?: number
  discountRateAnnual?: number
}): ValuerDcf {
  const lots = Math.max(1, Math.round(input.lots))
  const buildStages = Math.max(2, Math.min(6, Math.ceil(lots / 10)))
  const stageDurationMonths = Math.max(3, Math.round((input.absorptionMonths || 12) / (buildStages + 1)))
  const discountRateAnnual = input.discountRateAnnual ?? 0.12

  const cf = runCashflow({
    totalContributions: 0, // unlevered project IRR — no contribution/funder timing
    contributorPayoutPct: 0,
    totalWorksToTitle: Math.max(0, input.developmentCostExclLand),
    saleableLots: lots,
    buildStages,
    salePricePerLot: Math.max(0, input.grvPerLot),
    sellingCostPct: input.sellingCostPct ?? 0.035,
    stageDurationMonths,
  })
  const m = cashflowMetrics(cf, {
    landOutlay: input.landAcquisitionCost,
    stageDurationMonths,
    discountRateAnnual,
  })
  // NPV-basis RLV: the land price at which NPV = 0 (land sits undiscounted at t0).
  const rlvNpv = m.npvAtDiscount + Math.abs(input.landAcquisitionCost)

  return {
    irrAnnual: m.irrAnnual,
    npvAtDiscount: m.npvAtDiscount,
    discountRateAnnual,
    rlvNpv,
    buildStages,
    stageDurationMonths,
  }
}

/** GST component of a GST-inclusive amount (10% GST → 1/11). */
const GST_DIVISOR = 11

/**
 * Residual-land P&L — the hypothetical-development valuation (Feastudy "Valuer's-Style" method).
 * Derives what the site is WORTH: nets GST off realisation (via the shared deal-model `computeGst`,
 * margin-scheme by default), deducts selling costs + the developer's profit & risk + the QS
 * development costs (the cost/value tie-out), and the remainder is the residual land value. Pure.
 *
 * GST-consistent: every intermediate is ex-GST, so the residual doesn't double-count GST. Under the
 * margin scheme, only the margin is taxed, so net realisation keeps more of the gross (the benefit
 * flows through to a higher residual).
 */
export function buildValuerPnl(input: ValuerResidualPnlInput): ValuerResidualPnl {
  const gstScheme = input.gstScheme ?? DEFAULT_GST_SCHEME
  const sellingCostPct = input.sellingCostPct ?? 0.035
  const profitAndRiskPct = input.profitAndRiskPct ?? 0.2
  const grossRealisation = Math.max(0, input.grossRealisation)
  const developmentCostExclLand = Math.max(0, input.developmentCostExclLand)
  const actualLandCost = Math.max(0, input.landAcquisitionCost)
  const sellingCosts = grossRealisation * sellingCostPct

  // Shared GST engine: output tax on the sale + ITCs on selling + dev costs.
  const gst = computeGst({
    scheme: gstScheme,
    grossRealisation,
    landAcquisitionCost: actualLandCost,
    creditableCosts: sellingCosts + developmentCostExclLand,
  })

  const netRealisationExGst = grossRealisation - gst.gstOnSales
  const sellingCostsExGst = sellingCosts - sellingCosts / GST_DIVISOR
  const grossProfitExGst = netRealisationExGst - sellingCostsExGst
  const profitAndRisk = netRealisationExGst * profitAndRiskPct
  const contributionToDevCosts = grossProfitExGst - profitAndRisk
  const developmentCostExclLandExGst = developmentCostExclLand - developmentCostExclLand / GST_DIVISOR
  const residualLandValue = contributionToDevCosts - developmentCostExclLandExGst
  const landValueHeadroom = residualLandValue - actualLandCost

  const lots = Math.max(1, Math.round(input.lots))
  const totalDevCost = developmentCostExclLand + actualLandCost // land-development TDC incl land
  const perLot = { totalDevCost: totalDevCost / lots, sales: grossRealisation / lots, land: residualLandValue / lots }
  const perSqm =
    input.siteAreaSqm && input.siteAreaSqm > 0
      ? {
          totalDevCost: totalDevCost / input.siteAreaSqm,
          sales: grossRealisation / input.siteAreaSqm,
          land: residualLandValue / input.siteAreaSqm,
        }
      : null

  return {
    gstScheme,
    grossRealisation,
    gstOnSales: gst.gstOnSales,
    netRealisationExGst,
    sellingCostsExGst,
    grossProfitExGst,
    profitAndRisk,
    profitAndRiskPct,
    contributionToDevCosts,
    developmentCostExclLandExGst,
    residualLandValue,
    actualLandCost,
    landValueHeadroom,
    perLot,
    perSqm,
  }
}
