import type { BuildupLine } from '@/lib/estate-buildup/types'
import type { ReviewPackContext, ReviewPackTemplate } from './types'
import { lineToMarkdown } from './format'

/**
 * The ENGINEER review pack — the civil/consulting engineer's slice of the buildup: constraints,
 * yield, terrain, services + the ⛔ hard-stop items. Fully renderable from the Phase-2a Constraints
 * & Yield buildup; the engineer reviews/certifies rather than rebuilds.
 */

/** Checklist-1 sections, in order; each buildup line maps to one by its key. */
const SECTIONS: { title: string; keys: (key: string) => boolean }[] = [
  { title: 'A. Tenure & title', keys: (k) => k === 'parcel' },
  { title: 'B. Planning & controls', keys: (k) => k === 'zoning' || k === 'minLotSize' },
  { title: 'C. Topography & earthworks', keys: (k) => k === 'slope' },
  { title: 'E. Environment & overlays', keys: (k) => k === 'bal' || k.startsWith('overlay:') },
  { title: 'F. Concept & yield', keys: (k) => k === 'estateArea' || k === 'yield' },
]

function sectionFor(line: BuildupLine): string {
  return SECTIONS.find((s) => s.keys(line.key))?.title ?? 'Other'
}

function yieldSummary(ctx: ReviewPackContext): string {
  const y = ctx.brief.yield
  const n = y.authoritativeLots != null ? `${y.authoritativeLots} lots` : '_un-derivable_'
  const rows = [
    `- **Authoritative yield:** ${n} _(${y.basis})_`,
    `- Derived: ${y.derivedLots ?? '—'} · Study: ${y.studyLots ?? '—'} · Developer-claimed: ${y.developerClaimedLots ?? '—'}`,
  ]
  if (y.reconciliationNeeded) rows.push('- ⚠ **Reconcile:** the feasibility-study yield differs materially from derived.')
  if (y.unbackedClaimConflict) rows.push('- ⚠ **Unbacked claim:** the developer figure exceeds derived with no study — pass unless substantiated.')
  if (y.note) rows.push(`- _${y.note}_`)
  return rows.join('\n')
}

function gapsBlock(ctx: ReviewPackContext): string {
  const out: string[] = []
  const formal = ctx.brief.gaps.filter((g) => g.provenance === 'formal-required')
  const needs = ctx.brief.gaps.filter((g) => g.provenance === 'needs-input')
  const referral = ctx.brief.gaps.filter((g) => g.provenance === 'planner-referral')

  if (formal.length) {
    out.push('## Items requiring your determination (⛔ formal)')
    out.push('These are engineering hard-stops — DealFindrs flags them; it does not compute them.')
    out.push(formal.map((g) => `- **${g.label}** — ${g.detail}`).join('\n'))
  }
  if (needs.length) {
    out.push('## Operator inputs still needed')
    out.push(needs.map((g) => `- **${g.label}** — ${g.detail}`).join('\n'))
  }
  if (referral.length) {
    out.push('## Referred to the state planner panel')
    out.push(referral.map((g) => `- **${g.label}** — ${g.detail}`).join('\n'))
  }
  return out.join('\n\n')
}

function certification(ctx: ReviewPackContext): string {
  const y = ctx.brief.yield.authoritativeLots
  return [
    '## Certification',
    '_Review, refine, and certify — you should not need to rebuild the numbers._',
    '',
    '- [ ] I have reviewed the constraints & yield buildup above.',
    `- [ ] The derived yield${y != null ? ` of ${y} lots` : ''} is reasonable, or I have noted adjustments below.`,
    '- [ ] The ⛔ formal items are addressed or scoped.',
    '',
    'Notes / adjustments:',
    '',
    '',
    'Signed: ______________________     Date: ______________',
  ].join('\n')
}

function buildMarkdown(ctx: ReviewPackContext): string {
  const o = ctx.opportunity
  const where = [o.address, o.city].filter(Boolean).join(', ') || '—'
  const stateLga = [o.state, o.lga].filter(Boolean).join(' / ') || '—'

  const header = [
    `# Engineering Constraints & Yield — Review Pack`,
    '',
    `**Site:** ${o.name || 'Estate site'} — ${where}`,
    `**State / LGA:** ${stateLga}`,
    `**Prepared:** ${ctx.preparedOn} · DealFindrs (Factory2Key estate pipeline)`,
    '',
    '> This is a desktop buildup for your review and certification — not a substitute for formal',
    '> engineering assessment. Every figure carries its working and source; ⛔ items require your',
    '> determination.',
  ].join('\n')

  // The buildup, grouped by section (only sections that have lines).
  const bySection = new Map<string, BuildupLine[]>()
  for (const line of ctx.brief.lines) {
    const s = sectionFor(line)
    if (!bySection.has(s)) bySection.set(s, [])
    bySection.get(s)!.push(line)
  }
  const buildupParts: string[] = ['## The buildup']
  for (const s of SECTIONS) {
    const rows = bySection.get(s.title)
    if (!rows?.length) continue
    buildupParts.push(`### ${s.title}`)
    buildupParts.push(rows.map(lineToMarkdown).join('\n'))
  }
  const other = bySection.get('Other')
  if (other?.length) {
    buildupParts.push('### Other')
    buildupParts.push(other.map(lineToMarkdown).join('\n'))
  }

  return [
    header,
    '## Yield summary',
    yieldSummary(ctx),
    buildupParts.join('\n\n'),
    gapsBlock(ctx),
    certification(ctx),
  ]
    .filter(Boolean)
    .join('\n\n')
}

export const engineerPack: ReviewPackTemplate = {
  kind: 'engineer',
  professionLabel: 'Civil / consulting engineer',
  title: 'Engineering Constraints & Yield — Review Pack',
  available: () => ({ ok: true }),
  buildMarkdown,
}
