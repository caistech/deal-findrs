import type { EstateCostLine, EstateCostPack, CostCategory } from '@/lib/estate-cost/types'
import { buildCivilProgramme, estateProgrammeMonths, piInsuranceCover } from '@/lib/estate-cost/build'
import type { ReviewPackContext, ReviewPackTemplate } from './types'

/**
 * The QS review pack (Checklist 2) — the quantity surveyor's slice: the lot-level cost buildup with
 * every line's rate + basis + source, so they review/certify the numbers rather than rebuild them.
 * Available once the context carries a cost pack; feeds the deal-model's per-lot cost inputs.
 */

const CATEGORY_ORDER: CostCategory[] = [
  'Land',
  'Civil / Infrastructure',
  'Professional / Soft',
  'Statutory / Contributions',
  'Contingency',
  'House & Land',
]

function money(n: number): string {
  return n.toLocaleString('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 })
}

function lineRow(l: EstateCostLine): string {
  return `- **${l.label}:** ${money(l.perLot)}/lot — _${l.source}_ · ${l.basis}`
}

function costSummary(pack: EstateCostPack): string {
  const rows = [
    `- **Land-development cost per lot:** ${money(pack.landDevCostPerLot)}`,
    `  - Land ${money(pack.landPerLot)} · Civil ${money(pack.civilPerLot)} · Soft ${money(pack.softPerLot)} · Statutory ${money(pack.statutoryPerLot)} · Contingency ${money(pack.contingencyPerLot)}`,
    `- **Estate lots:** ${pack.lots} · **Total land-development cost:** ${money(pack.totalLandDevCost)}`,
    `- Region factor ${pack.regionFactor.toFixed(2)} (${pack.state} / ${pack.city}) applied to benchmark rates`,
  ]
  if (pack.homeConstructionPerHome != null) {
    rows.push(
      `- **House & Land:** ${money(pack.homeConstructionPerHome)}/home build at ${Math.round(pack.homeCaptureRate * 100)}% capture (buyer's build cost — not in the land-development total)`,
    )
  }
  return rows.join('\n')
}

/** Construction programme + drawdown S-curve for the civil works. */
function programmeBlock(pack: EstateCostPack): string {
  const worksTotal = pack.totalLandDevCost - pack.landPerLot * pack.lots
  const prog = buildCivilProgramme(worksTotal, estateProgrammeMonths(pack.lots))
  const rows = prog.phases
    .map(
      (p) =>
        `| ${p.phase} | ${p.percent}% | ${p.cumulativePercent}% | ${money(p.amount)} | ${money(p.cumulativeAmount)} | M${p.targetMonth} |`,
    )
    .join('\n')
  // Compact S-curve — a cumulative-% bar per phase (20 cells).
  const bar = (c: number) => '█'.repeat(Math.round((c / 100) * 20)).padEnd(20, '░')
  const curve = prog.phases.map((p) => `M${String(p.targetMonth).padStart(2)} ${bar(p.cumulativePercent)} ${p.cumulativePercent}%`).join('\n')
  return [
    '## Programme & drawdown S-curve',
    `_Indicative ${prog.months}-month civil programme; drawdown against the ${money(worksTotal)} works (ex-land). Confirm against the construction contract._`,
    '',
    '| Phase | Draw | Cum. | Amount | Cum. amount | Target |',
    '|---|---|---|---|---|---|',
    rows,
    '',
    '```',
    curve,
    '```',
  ].join('\n')
}

/** Scaled PI-insurance schedule (AIQS CFR banding). */
function piBlock(pack: EstateCostPack): string {
  const worksTotal = pack.totalLandDevCost - pack.landPerLot * pack.lots
  const pi = piInsuranceCover(worksTotal)
  return [
    '## Consultants & PI insurance',
    `- **Build cost (works, ex-land):** ${money(pi.buildCost)}`,
    `- **Required PI cover:** ${money(pi.cover)} _(${pi.band})_`,
    '- [ ] Each consultant (civil, surveyor, geotech, planner) holds current PI at or above this level — confirm certificates of currency.',
  ].join('\n')
}

function buildMarkdown(ctx: ReviewPackContext): string {
  const pack = ctx.costPack!
  const o = ctx.opportunity
  const where = [o.address, o.city].filter(Boolean).join(', ') || '—'

  const header = [
    '# QS Cost Buildup — Review Pack',
    '',
    `**Site:** ${o.name || 'Estate site'} — ${where}`,
    `**State / LGA:** ${[o.state, o.lga].filter(Boolean).join(' / ') || '—'}`,
    `**Prepared:** ${ctx.preparedOn} · DealFindrs (Factory2Key estate pipeline)`,
    '',
    '> Indicative lot-level cost buildup for your review and certification. Benchmark rates are a',
    "> starting point (Sydney baseline × region factor) — confirm or adjust each line; you should not",
    '> need to rebuild the buildup. Land-development figures feed the F2K deal-model.',
  ].join('\n')

  const parts: string[] = [header, '## Summary', costSummary(pack), '## The buildup']
  for (const cat of CATEGORY_ORDER) {
    const rows = pack.lines.filter((l) => l.category === cat)
    if (!rows.length) continue
    parts.push(`### ${cat}`)
    parts.push(rows.map(lineRow).join('\n'))
  }

  parts.push(programmeBlock(pack))
  parts.push(piBlock(pack))

  parts.push('## Certification')
  parts.push(
    [
      '_Review, confirm or adjust the rates, and certify — you should not need to rebuild the buildup._',
      '',
      `- [ ] I have reviewed the ${pack.lots}-lot cost buildup above.`,
      `- [ ] The land-development cost of ${money(pack.landDevCostPerLot)}/lot is reasonable, or I have noted adjustments.`,
      '- [ ] Benchmark civil/soft/statutory rates are confirmed against current tenders / authority schedules.',
      pack.homeConstructionPerHome != null ? '- [ ] The House & Land home build cost is confirmed against a current modular supplier quote.' : '',
      '',
      'Notes / adjustments:',
      '',
      '',
      'Signed: ______________________     Date: ______________',
    ]
      .filter(Boolean)
      .join('\n'),
  )

  return parts.join('\n\n')
}

export const qsPack: ReviewPackTemplate = {
  kind: 'qs',
  professionLabel: 'Quantity surveyor',
  title: 'QS Cost Buildup — Review Pack',
  available: (ctx) =>
    ctx.costPack
      ? { ok: true }
      : { ok: false, reason: 'Requires the QS cost buildup (add estate lots + state to generate it).' },
  buildMarkdown,
}
