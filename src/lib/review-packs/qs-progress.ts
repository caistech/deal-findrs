import type { EstateCostPack } from '@/lib/estate-cost/types'
import { buildCivilProgramme, estateProgrammeMonths } from '@/lib/estate-cost/build'
import type { ReviewPackContext, ReviewPackTemplate } from './types'

/**
 * QS Progress Report (Checklist 2 — Progress set). The monthly companion to the QS Cost Buildup:
 * a QS-completable template generated from the civil programme + drawdown S-curve, with the actual
 * progress-claim / cost-to-complete / variation / funds-to-complete fields left blank for the QS to
 * complete and certify each drawdown. "Generate the structured report, don't fabricate the actuals."
 */

function money(n: number): string {
  return n.toLocaleString('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 })
}

function worksOf(pack: EstateCostPack): number {
  return pack.totalLandDevCost - pack.landPerLot * pack.lots
}

function buildMarkdown(ctx: ReviewPackContext): string {
  const pack = ctx.costPack!
  const o = ctx.opportunity
  const where = [o.address, o.city].filter(Boolean).join(', ') || '—'
  const worksTotal = worksOf(pack)
  const prog = buildCivilProgramme(worksTotal, estateProgrammeMonths(pack.lots))
  const bankGuarantee = Math.round(worksTotal * 0.05) // typical 5% retention / bank guarantee

  const header = [
    '# QS Progress Report — Drawdown Claim',
    '',
    `**Site:** ${o.name || 'Estate site'} — ${where}`,
    `**State / LGA:** ${[o.state, o.lga].filter(Boolean).join(' / ') || '—'}`,
    `**Prepared:** ${ctx.preparedOn} · DealFindrs (Factory2Key estate pipeline)`,
    '',
    '> Monthly progress-claim template for the QS to complete and certify against the drawdown',
    "> programme. The programme + S-curve are generated; the actual claim, cost-to-complete and",
    '> variations are for the QS to enter from site — this report structures the claim, it does not',
    '> fabricate the actuals.',
  ].join('\n')

  const claimHeader = [
    '## Progress claim',
    '- **Claim no.:** ____   **Period:** __________ to __________   **Date:** ____________',
    `- **Contract works (ex-land):** ${money(worksTotal)}   **Programme:** ${prog.months} months`,
  ].join('\n')

  const scheduleRows = prog.phases
    .map(
      (p) =>
        `| ${p.phase} | M${p.targetMonth} | ${p.cumulativePercent}% | ${money(p.cumulativeAmount)} | ____% | ${'$' + '____'.padEnd(8)} | $________ |`,
    )
    .join('\n')
  const schedule = [
    '## Programme vs actual (drawdown)',
    '| Phase | Target | Planned cum. % | Planned cum. $ | Actual % | This claim $ | Claimed to date $ |',
    '|---|---|---|---|---|---|---|',
    scheduleRows,
  ].join('\n')

  const costToComplete = [
    '## Cost to complete',
    `- **Contract works:** ${money(worksTotal)}`,
    '- **Certified/claimed to date:** $________',
    '- **Approved variations (net):** $________',
    '- **= Cost to complete:** $________ _(contract works + variations − claimed to date)_',
  ].join('\n')

  const variations = [
    '## Variations register',
    '| VO no. | Description | Amount | Approved | Status |',
    '|---|---|---|---|---|',
    '| ____ |  | $________ | ☐ | ☐ pending ☐ approved |',
    '| ____ |  | $________ | ☐ | ☐ pending ☐ approved |',
  ].join('\n')

  const guarantees = [
    '## Bank guarantee / retention schedule',
    `- **Retention / bank guarantee held (5% indicative):** ${money(bankGuarantee)}`,
    '- **Guarantees lodged:** $________   **Released:** $________   **Held:** $________',
    '- [ ] Guarantees / insurances current — certificates of currency sighted.',
  ].join('\n')

  const fundsToComplete = [
    '## Funds-to-complete test ⛔',
    '_External — the financier confirms remaining facility covers the cost to complete before releasing the drawdown._',
    '- **Cost to complete:** $________   **Remaining facility:** $________   **Surplus / (shortfall):** $________',
    '- [ ] Funds-to-complete satisfied (remaining facility ≥ cost to complete).',
  ].join('\n')

  const certification = [
    '## Certification ⛔',
    '_External — the certified QS signs the drawdown; not auto-populated by DealFindrs._',
    '',
    '- [ ] I certify the works claimed have been completed to the value stated.',
    '- [ ] The cost to complete is adequately funded (funds-to-complete satisfied).',
    '- [ ] A statutory declaration for subcontractor/supplier payment is attached.',
    '',
    'Certified QS: ______________________   Firm: ______________________',
    '',
    'Signed: ______________________     Date: ______________',
  ].join('\n')

  return [
    header,
    claimHeader,
    schedule,
    costToComplete,
    variations,
    guarantees,
    fundsToComplete,
    certification,
  ].join('\n\n')
}

export const qsProgressPack: ReviewPackTemplate = {
  kind: 'qs-progress',
  professionLabel: 'Quantity surveyor (progress)',
  title: 'QS Progress Report — Drawdown Claim',
  available: (ctx) =>
    ctx.costPack
      ? { ok: true }
      : { ok: false, reason: 'Requires the QS cost buildup (add estate lots + state to generate it).' },
  buildMarkdown,
}
