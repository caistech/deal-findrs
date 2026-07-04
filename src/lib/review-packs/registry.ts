import type { ReviewPackContext, ReviewPackKind, ReviewPackTemplate } from './types'
import { engineerPack } from './engineer'

/**
 * The per-profession review-pack registry. The engineer pack renders fully off the Phase-2a
 * Constraints & Yield buildup. The QS + valuer packs are Phase-3-gated: they need the feasibility/QS
 * cost pack (Checklist 2) and the GRV & absorption model (Checklist 3), which don't exist yet — so
 * they're registered but unavailable, giving the operator visibility of the full pack set without
 * shipping empty PDFs. When Phase 3 lands, each becomes a buildMarkdown + a data source, no new plumbing.
 */

/** A truthful placeholder body for a not-yet-available pack — never fabricates the missing figures. */
function pendingBody(professionLabel: string, dependsOn: string) {
  return (ctx: ReviewPackContext): string => {
    const o = ctx.opportunity
    const where = [o.address, o.city].filter(Boolean).join(', ') || '—'
    return [
      `# ${professionLabel} — Review Pack (pending)`,
      '',
      `**Site:** ${o.name || 'Estate site'} — ${where}`,
      `**Prepared:** ${ctx.preparedOn} · DealFindrs (Factory2Key estate pipeline)`,
      '',
      `This pack is not yet available. It depends on ${dependsOn}, which is produced in a later stage`,
      `of the assessment. No figures are shown rather than estimated ones.`,
    ].join('\n')
  }
}

const qsPack: ReviewPackTemplate = {
  kind: 'qs',
  professionLabel: 'Quantity surveyor',
  title: 'QS Cost Buildup — Review Pack',
  available: () => ({ ok: false, reason: 'Requires the feasibility / QS cost pack (Phase 3).' }),
  buildMarkdown: pendingBody('QS Cost Buildup', 'the feasibility / QS cost pack (Checklist 2)'),
}

const valuerPack: ReviewPackTemplate = {
  kind: 'valuer',
  professionLabel: 'Valuer',
  title: 'GRV & Absorption — Review Pack',
  available: () => ({ ok: false, reason: 'Requires the GRV & absorption model (Phase 3).' }),
  buildMarkdown: pendingBody('GRV & Absorption', 'the GRV & absorption model + comparable evidence (Checklist 3)'),
}

const TEMPLATES: Record<ReviewPackKind, ReviewPackTemplate> = {
  engineer: engineerPack,
  qs: qsPack,
  valuer: valuerPack,
}

export function getReviewPackTemplate(kind: string): ReviewPackTemplate | null {
  return (TEMPLATES as Record<string, ReviewPackTemplate>)[kind] ?? null
}

/** All packs, in hand-off order — for the UI to list availability. */
export function listReviewPacks(): ReviewPackTemplate[] {
  return [engineerPack, qsPack, valuerPack]
}
