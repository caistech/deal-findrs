import type { ReviewPackKind, ReviewPackTemplate } from './types'
import { engineerPack } from './engineer'
import { qsPack } from './qs'
import { qsProgressPack } from './qs-progress'
import { valuerPack } from './valuer'

/**
 * The per-profession review-pack registry. The engineer pack renders off the Phase-2a Constraints &
 * Yield buildup; the QS pack (Phase 3b) off the lot-level cost buildup; the valuer pack (Phase 3c)
 * off the GRV & absorption pack. Each is available once the context carries its data source, else it
 * reports a reason (so the operator sees the full pack set without an empty PDF). Each pack =
 * a buildMarkdown + a data source, no new plumbing.
 */

const TEMPLATES: Record<ReviewPackKind, ReviewPackTemplate> = {
  engineer: engineerPack,
  qs: qsPack,
  valuer: valuerPack,
  'qs-progress': qsProgressPack,
}

export function getReviewPackTemplate(kind: string): ReviewPackTemplate | null {
  return (TEMPLATES as Record<string, ReviewPackTemplate>)[kind] ?? null
}

/** All packs, in hand-off order — for the UI to list availability. */
export function listReviewPacks(): ReviewPackTemplate[] {
  return [engineerPack, qsPack, valuerPack, qsProgressPack]
}
