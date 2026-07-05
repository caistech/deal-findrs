import type {
  AbsorptionCurve,
  AvmCrossCheck,
  EstateValuationPack,
  ValuerDcf,
  ValuerResidualPnl,
} from '@/lib/estate-valuation/types'
import type { ReviewPackContext, ReviewPackTemplate } from './types'

/**
 * The valuer review pack (Checklist 3) — GRV & absorption. GRV/lot is the operator/study figure the
 * valuer certifies, shown alongside an independent, confidence-gated Domain AVM cross-check of the
 * subject site, plus the demand-backed two-phase absorption curve. Review/certify, don't rebuild.
 */

function money(n: number): string {
  return n.toLocaleString('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 })
}
function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`
}

function grvBlock(pack: EstateValuationPack): string {
  return [
    '## GRV',
    `- **GRV per lot:** ${money(pack.grvPerLot)} _(operator/study figure — valuer to certify)_`,
    `- **Estate lots:** ${pack.lots} · **Total GRV:** ${money(pack.totalGrv)}`,
  ].join('\n')
}

function avmBlock(avm: AvmCrossCheck | null): string {
  if (!avm || avm.mid == null) {
    const reason = avm?.unavailableReason ? ` (${avm.unavailableReason})` : ''
    return [
      '## Independent AVM cross-check',
      `- **Unavailable${reason}** — no independent estimate; GRV is indicative until the valuer confirms.`,
    ].join('\n')
  }
  const range = avm.lower != null && avm.upper != null ? ` (range ${money(avm.lower)}–${money(avm.upper)})` : ''
  const div = avm.divergencePct != null
    ? `- **Site value vs AVM:** ${avm.divergencePct >= 0 ? '+' : ''}${pct(avm.divergencePct)} (land acquisition vs AVM mid)`
    : ''
  return [
    '## Independent AVM cross-check',
    '_Domain AVM of the subject site (≈ current land value) — a corroborating signal, not the finished-lot GRV._',
    `- **AVM mid:** ${money(avm.mid)}${range}`,
    `- **Confidence:** ${avm.confidence ?? 'unknown'} → **${avm.gate === 'assert' ? 'asserted' : 'indicative — valuer to set'}**${avm.estimateDate ? ` · as at ${avm.estimateDate}` : ''}`,
    div,
  ].filter(Boolean).join('\n')
}

function absorptionBlock(a: AbsorptionCurve): string {
  const head = a.benchmarkOnly
    ? `_No pre-sales evidence — benchmark absorption only (${a.benchmarkRatePerMonth} lots/month)._`
    : `_Two-phase: ${a.preSoldLots} pre-sold lots (${pct(a.preSalesPercent)}) settle over ${a.burstMonths} months, then ${a.benchmarkRatePerMonth} lots/month._`
  // Compact monthly vector (cumulative not needed) — show first 12 months, then a tail note.
  const shown = a.monthly.slice(0, 12).map((v, i) => `M${i + 1}: ${v}`).join(' · ')
  const more = a.monthly.length > 12 ? ` … (+${a.monthly.length - 12} more months)` : ''
  return [
    '## Absorption',
    head,
    `- **Sell-down:** ${a.totalMonths} months total`,
    `- **Monthly take-up (lots):** ${shown}${more}`,
  ].join('\n')
}

function pnlBlock(pnl: ValuerResidualPnl | null): string {
  if (!pnl) {
    return [
      '## Residual land valuation (hypothetical development)',
      '_Unavailable — requires the QS cost pack + a land price to residualise. Certify the GRV above._',
    ].join('\n')
  }
  const scheme = pnl.gstScheme === 'margin' ? 'margin scheme' : 'standard GST'
  const row = (label: string, v: number, opts?: { neg?: boolean; strong?: boolean }) =>
    `| ${opts?.strong ? `**${label}**` : label} | ${opts?.neg ? '−' : ''}${money(Math.abs(v))} |`
  const rows = [
    row('Gross realisation (GST-incl)', pnl.grossRealisation),
    row(`less GST on sales (${scheme})`, pnl.gstOnSales, { neg: true }),
    row('= Net realisation (ex-GST)', pnl.netRealisationExGst, { strong: true }),
    row('less Selling costs (ex-GST)', pnl.sellingCostsExGst, { neg: true }),
    row('= Gross profit (ex-GST)', pnl.grossProfitExGst, { strong: true }),
    row(`less Profit & risk (${pct(pnl.profitAndRiskPct)})`, pnl.profitAndRisk, { neg: true }),
    row('= Contribution to development costs', pnl.contributionToDevCosts, { strong: true }),
    row('less Development costs excl land (ex-GST, from QS pack)', pnl.developmentCostExclLandExGst, { neg: true }),
    row('= Residual land value', pnl.residualLandValue, { strong: true }),
  ].join('\n')
  const h = pnl.landValueHeadroom
  const tieOut =
    h >= 0
      ? `**${money(h)} headroom** — residual land value exceeds the ${money(pnl.actualLandCost)} land cost.`
      : `**${money(-h)} over** — the ${money(pnl.actualLandCost)} land cost EXCEEDS the residual land value; review price / assumptions.`
  const footer = [
    `- **Per lot:** TDC ${money(pnl.perLot.totalDevCost)} · sales ${money(pnl.perLot.sales)} · residual land ${money(pnl.perLot.land)}`,
    pnl.perSqm
      ? `- **Per m²:** TDC ${money(pnl.perSqm.totalDevCost)} · sales ${money(pnl.perSqm.sales)} · residual land ${money(pnl.perSqm.land)}`
      : '',
  ]
    .filter(Boolean)
    .join('\n')
  return [
    '## Residual land valuation (hypothetical development)',
    `_${scheme} · GST via the shared deal-model engine · development cost is the QS pack figure (cost/value tie-out)._`,
    '',
    '| Line | Amount |',
    '|---|---|',
    rows,
    '',
    `**Cost/value tie-out:** ${tieOut}`,
    '',
    footer,
  ].join('\n')
}

function dcfBlock(dcf: ValuerDcf | null): string {
  if (!dcf) {
    return ['## DCF — IRR & NPV', '_Unavailable — requires the QS cost pack + a land price._'].join('\n')
  }
  const irr = dcf.irrAnnual == null ? 'n/a (no positive net flow)' : pct(dcf.irrAnnual)
  return [
    '## DCF — IRR, NPV & NPV-basis RLV',
    `_Unlevered project cashflow: ${dcf.buildStages} build stages × ${dcf.stageDurationMonths} months, sales over the absorption sell-down, discounted at ${pct(dcf.discountRateAnnual)}. Indicative._`,
    '',
    `- **Project IRR (annualised):** ${irr}`,
    `- **NPV @ ${pct(dcf.discountRateAnnual)}:** ${money(dcf.npvAtDiscount)}`,
    `- **Residual land value (NPV basis):** ${money(dcf.rlvNpv)} _(land price at which NPV = 0)_`,
  ].join('\n')
}

function buildMarkdown(ctx: ReviewPackContext): string {
  const pack = ctx.valuationPack!
  const o = ctx.opportunity
  const where = [o.address, o.city].filter(Boolean).join(', ') || '—'
  const header = [
    '# GRV & Absorption — Review Pack',
    '',
    `**Site:** ${o.name || 'Estate site'} — ${where}`,
    `**State / LGA:** ${[o.state, o.lga].filter(Boolean).join(' / ') || '—'}`,
    `**Prepared:** ${ctx.preparedOn} · DealFindrs (Factory2Key estate pipeline)`,
    '',
    '> GRV & absorption for your review and certification. GRV/lot is the operator/study figure — the',
    '> Domain AVM is an independent corroborating estimate of the site, not the finished-lot value.',
    '> Absorption is demand-backed where pre-sales evidence exists, else benchmark. Certify or adjust.',
  ].join('\n')

  return [
    header,
    grvBlock(pack),
    pnlBlock(pack.pnl),
    dcfBlock(pack.dcf),
    avmBlock(pack.avm),
    absorptionBlock(pack.absorption),
    [
      '## Certification',
      '_Review, confirm or adjust, and certify — you should not need to rebuild the valuation._',
      '',
      `- [ ] I have reviewed the GRV of ${money(pack.grvPerLot)}/lot (${money(pack.totalGrv)} total).`,
      '- [ ] The GRV is supported by comparable evidence / my own analysis.',
      `- [ ] The absorption profile (${pack.absorption.totalMonths}-month sell-down) is reasonable.`,
      '',
      'Notes / adjustments:',
      '',
      '',
      'Signed: ______________________     Date: ______________',
    ].join('\n'),
  ].join('\n\n')
}

export const valuerPack: ReviewPackTemplate = {
  kind: 'valuer',
  professionLabel: 'Valuer',
  title: 'GRV & Absorption — Review Pack',
  available: (ctx) =>
    ctx.valuationPack && ctx.valuationPack.grvPerLot > 0
      ? { ok: true }
      : { ok: false, reason: 'Requires an indicative sale price / GRV per lot to generate.' },
  buildMarkdown,
}
