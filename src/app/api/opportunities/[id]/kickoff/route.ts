import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/require-auth'
import { getCompanyId } from '@/lib/auth/get-company-id'
import { buildConstraintsYield } from '@/lib/estate-buildup/build'
import { requiredOccupations, assembleKickoffTeam } from '@/lib/estate-team/assemble'
import { OCCUPATION_LABELS, type KickoffContext, type TeamMember } from '@/lib/estate-team/types'

/** Fetch the persisted kickoff (with attendees + actions) for an opportunity. */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(request)
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: 401 })
  const { user, supabase } = auth
  const company = await getCompanyId(supabase, user)
  if (company.error) return NextResponse.json({ error: company.error }, { status: 403 })

  const { data: kickoff } = await supabase
    .from('estate_kickoffs')
    .select('*')
    .eq('opportunity_id', params.id)
    .maybeSingle()
  if (!kickoff) return NextResponse.json({ kickoff: null })

  const [{ data: attendees }, { data: actions }] = await Promise.all([
    supabase.from('estate_kickoff_attendees').select('*').eq('kickoff_id', kickoff.id).order('occupation'),
    supabase.from('estate_kickoff_actions').select('*').eq('kickoff_id', kickoff.id).order('created_at'),
  ])
  return NextResponse.json({ kickoff, attendees: attendees ?? [], actions: actions ?? [] })
}

/**
 * Assemble + persist the kickoff for an opportunity: recompute the team server-side from the
 * opportunity's profile + the company directory, upsert the snapshot, and seed the attendee meeting
 * log on first creation. Idempotent on opportunity_id.
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(request)
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: 401 })
  const { user, supabase } = auth
  const company = await getCompanyId(supabase, user)
  if (company.error) return NextResponse.json({ error: company.error }, { status: 403 })

  const { data: opp, error: oppErr } = await supabase
    .from('opportunities')
    .select('id, company_id, state, property_profile')
    .eq('id', params.id)
    .single()
  if (oppErr || !opp) return NextResponse.json({ error: 'opportunity_not_found' }, { status: 404 })
  if (!opp.property_profile) return NextResponse.json({ error: 'no_profile' }, { status: 400 })

  const context: KickoffContext = { state: (opp.state as string) || 'WA' }
  const brief = buildConstraintsYield(opp.property_profile, {})
  const { data: dir } = await supabase.from('estate_team_members').select('*').eq('active', true)
  const directory = (dir ?? []) as TeamMember[]
  const required = requiredOccupations(brief, context)
  const assembled = assembleKickoffTeam(required, directory, context)

  // Store a trimmed snapshot (member id/name/firm only).
  const snapshot = {
    nominations: assembled.nominations.map((n) => ({
      occupation: n.occupation, tier: n.tier, reason: n.reason,
      members: n.members.map((m) => ({ id: m.id, name: m.name, firm: m.firm ?? null })),
    })),
    gaps: assembled.gaps,
  }

  const { data: kickoff, error: upErr } = await supabase
    .from('estate_kickoffs')
    .upsert(
      { opportunity_id: opp.id, company_id: company.companyId, state: context.state, assembled: snapshot, created_by: user.id },
      { onConflict: 'opportunity_id' },
    )
    .select()
    .single()
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })

  // Seed attendees on first creation only (preserve acceptance on re-assemble).
  const { count } = await supabase
    .from('estate_kickoff_attendees')
    .select('id', { count: 'exact', head: true })
    .eq('kickoff_id', kickoff.id)

  if (!count) {
    const rows: Record<string, unknown>[] = []
    // Principals — always attend, no directory member.
    for (const occ of ['client', 'f2k'] as const) {
      rows.push({ kickoff_id: kickoff.id, occupation: occ, name: OCCUPATION_LABELS[occ] })
    }
    for (const n of assembled.nominations) {
      if (n.occupation === 'client' || n.occupation === 'f2k') continue
      for (const m of n.members) {
        rows.push({ kickoff_id: kickoff.id, occupation: n.occupation, member_id: m.id, name: m.firm ? `${m.name} (${m.firm})` : m.name })
      }
    }
    if (rows.length) await supabase.from('estate_kickoff_attendees').insert(rows)
  }

  const [{ data: attendees }, { data: actions }] = await Promise.all([
    supabase.from('estate_kickoff_attendees').select('*').eq('kickoff_id', kickoff.id).order('occupation'),
    supabase.from('estate_kickoff_actions').select('*').eq('kickoff_id', kickoff.id).order('created_at'),
  ])
  return NextResponse.json({ kickoff, attendees: attendees ?? [], actions: actions ?? [] })
}
