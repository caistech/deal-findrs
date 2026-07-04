import type { BuildupLine, Provenance } from '@/lib/estate-buildup/types'

/** Human labels for provenance — shown against every buildup figure so the source is explicit. */
export const PROVENANCE_LABEL: Record<Provenance, string> = {
  derived: 'derived',
  'operator-resolved': 'planner-resolved',
  'feasibility-study': 'from feasibility study',
  'needs-input': 'needs input',
  'formal-required': '⛔ formal',
  'planner-referral': 'planner referral',
  note: 'note',
}

/** A severity prefix so an assessor's eye lands on blockers/attention first. */
function severityPrefix(line: BuildupLine): string {
  if (line.severity === 'blocker') return '⛔ '
  if (line.severity === 'attention') return '⚠ '
  return ''
}

/** Render one buildup line as a Markdown bullet: figure + provenance + source + working. */
export function lineToMarkdown(line: BuildupLine): string {
  const value =
    line.value === null || line.value === undefined || line.value === ''
      ? '_(not set)_'
      : `${line.value}${line.unit ? ' ' + line.unit : ''}`
  const parts = [`**${severityPrefix(line)}${line.label}:** ${value} — _${PROVENANCE_LABEL[line.provenance]}_`]
  if (line.dataset) parts.push(`source: ${line.dataset}`)
  if (line.working) parts.push(`working: ${line.working}`)
  return `- ${parts.join(' · ')}`
}
