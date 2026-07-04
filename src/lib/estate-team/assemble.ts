import type { ConstraintsYieldBrief } from '@/lib/estate-buildup/types'
import type {
  AssembledKickoff,
  KickoffContext,
  KickoffGap,
  Occupation,
  RequiredOccupation,
  TeamMember,
} from './types'
import { OCCUPATION_LABELS } from './types'

const CORE: Occupation[] = ['client', 'f2k', 'planner', 'selling_agent', 'modular_supplier']
const DRIVE: Occupation[] = [
  'civil_engineer',
  'surveyor',
  'quantity_surveyor',
  'valuer',
  'funder_broker',
  'property_lawyer',
]

/**
 * Determine the occupations the kickoff needs = core + drive-the-numbers + triggered-by-the-brief +
 * context (Civil-JV → the civil contractor is a party). Pure — no I/O.
 */
export function requiredOccupations(
  brief: ConstraintsYieldBrief,
  context: KickoffContext,
): RequiredOccupation[] {
  const req = new Map<Occupation, RequiredOccupation>()
  const add = (occupation: Occupation, tier: RequiredOccupation['tier'], reason: string) => {
    if (!req.has(occupation)) req.set(occupation, { occupation, tier, reason })
  }

  for (const o of CORE) add(o, 'core', 'Always at an estate kickoff')
  for (const o of DRIVE) add(o, 'drive', 'Drives the numbers')

  // Triggered by the brief's gaps.
  for (const gap of brief.gaps) {
    if (gap.dimension === 'services') {
      add('servicing_authority', 'triggered', 'Servicing/headworks questions to resolve')
    }
    if (gap.provenance === 'planner-referral') {
      add('planner', 'triggered', 'Unresolved planning (zone/yield) — planner referral')
    }
    if (gap.provenance === 'formal-required') {
      const lc = gap.label.toLowerCase()
      if (/bushfire|bal/.test(lc)) add('bushfire_consultant', 'triggered', gap.label)
      if (/environment|vegetation|contaminat/.test(lc)) add('environmental_consultant', 'triggered', gap.label)
      if (/earthwork|slope|retain|geotech/.test(lc)) add('geotech_engineer', 'triggered', gap.label)
      if (/heritage/.test(lc)) add('heritage_consultant', 'triggered', gap.label)
      if (/traffic/.test(lc)) add('traffic_engineer', 'triggered', gap.label)
    }
  }

  // A bushfire-in-overlay signal from the buildup lines, even without a formal gap.
  const balLine = brief.lines.find((l) => l.key === 'bal')
  if (balLine?.severity === 'attention') {
    add('bushfire_consultant', 'triggered', 'Site is in a bushfire (BAL) overlay')
  }

  // Civil-JV: the civil contractor is a party, not just an advisor.
  if (context.civilMode === 'Civil-JV') {
    add('civil_contractor', 'triggered', 'Civil-JV — the contractor finances the works (a deal party)')
  }

  return Array.from(req.values())
}

/** True when a member serves the state (and, for suppliers, the typology). */
function memberMatches(member: TeamMember, req: RequiredOccupation, context: KickoffContext): boolean {
  if (member.occupation !== req.occupation) return false
  if (member.active === false) return false
  if (!member.states.includes(context.state)) return false
  if (req.occupation === 'modular_supplier' && context.typology) {
    // A supplier with no typology tags is treated as general-purpose (matches any).
    if (member.typologies && member.typologies.length > 0) {
      return member.typologies.includes(context.typology)
    }
  }
  return true
}

/**
 * Assemble the kickoff team: match each required occupation to state-panel members; any required
 * occupation with no member becomes a gap (F2K needs to add one to that state's panel).
 * `client` and `f2k` are never gaps — they're the deal principals, not directory members.
 */
export function assembleKickoffTeam(
  required: RequiredOccupation[],
  directory: TeamMember[],
  context: KickoffContext,
): AssembledKickoff {
  const nominations = []
  const gaps: KickoffGap[] = []

  for (const req of required) {
    const members = directory.filter((m) => memberMatches(m, req, context))
    nominations.push({ occupation: req.occupation, tier: req.tier, reason: req.reason, members })
    if (members.length === 0 && req.occupation !== 'client' && req.occupation !== 'f2k') {
      gaps.push({
        occupation: req.occupation,
        tier: req.tier,
        reason: req.reason,
        detail: `No ${OCCUPATION_LABELS[req.occupation]} on the ${context.state} panel${
          req.occupation === 'modular_supplier' && context.typology ? ` for ${context.typology}` : ''
        } — add one or engage externally.`,
      })
    }
  }

  return { nominations, gaps }
}
