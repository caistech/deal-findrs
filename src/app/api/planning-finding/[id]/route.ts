import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/require-auth'
import { getCompanyId } from '@/lib/auth/get-company-id'

const ACTION_STATUS: Record<string, string | null> = {
  approve: 'approved',
  edit: 'edited',
  reject: 'rejected',
  note: null, // annotation only — status unchanged
}

/**
 * Planner action on a finding: approve / edit / reject / note. Records the ai_value → human_value
 * correction pair in planning_finding_events (the captured methodology). RLS scopes to the company.
 */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(request)
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: 401 })
  const { user, supabase } = auth
  const company = await getCompanyId(supabase, user)
  if (company.error) return NextResponse.json({ error: company.error }, { status: 403 })

  const body = await request.json().catch(() => ({}))
  const action = String(body.action ?? '')
  if (!(action in ACTION_STATUS)) return NextResponse.json({ error: 'invalid_action' }, { status: 400 })

  const { data: finding, error: fErr } = await supabase
    .from('planning_findings')
    .select('id, assessment_id, claim, status, current_text')
    .eq('id', params.id)
    .single()
  if (fErr || !finding) return NextResponse.json({ error: 'finding_not_found' }, { status: 404 })

  const text = typeof body.text === 'string' ? body.text.trim() : undefined
  const note = typeof body.note === 'string' ? body.note.trim() : undefined
  const toStatus = ACTION_STATUS[action] ?? finding.status

  const update: Record<string, unknown> = {
    status: toStatus,
    reviewed_by: user.id,
    reviewed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  if (action === 'edit' && text !== undefined) update.current_text = text
  if (note !== undefined) update.reviewer_note = note

  const { data: updated, error: uErr } = await supabase
    .from('planning_findings')
    .update(update)
    .eq('id', params.id)
    .select()
    .single()
  if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 })

  await supabase.from('planning_finding_events').insert({
    finding_id: finding.id,
    assessment_id: finding.assessment_id,
    action,
    from_status: finding.status,
    to_status: toStatus,
    ai_value: finding.claim,
    human_value: text ?? note ?? null,
    actor: user.id,
  })

  return NextResponse.json({ finding: updated })
}
