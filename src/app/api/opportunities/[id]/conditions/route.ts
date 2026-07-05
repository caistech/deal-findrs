import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/require-auth'
import { getCompanyId } from '@/lib/auth/get-company-id'

const STATUSES = new Set(['outstanding', 'in_progress', 'cleared', 'not_applicable'])

/** List the tracked conditions of approval for an opportunity (the Form-1C clearance register). */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(request)
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: 401 })
  const { user, supabase } = auth
  const company = await getCompanyId(supabase, user)
  if (company.error) return NextResponse.json({ error: company.error }, { status: 403 })

  const { data, error } = await supabase
    .from('development_conditions')
    .select('*')
    .eq('opportunity_id', params.id)
    .order('number', { ascending: true, nullsFirst: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ conditions: data ?? [] })
}

/** Update a condition's clearance status / note (the planner or operator works the register). */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(request)
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: 401 })
  const { user, supabase } = auth
  const company = await getCompanyId(supabase, user)
  if (company.error) return NextResponse.json({ error: company.error }, { status: 403 })

  const body = (await request.json().catch(() => null)) as { conditionId?: string; status?: string; note?: string } | null
  if (!body?.conditionId) return NextResponse.json({ error: 'conditionId_required' }, { status: 400 })

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.status !== undefined) {
    if (!STATUSES.has(body.status)) return NextResponse.json({ error: 'invalid_status' }, { status: 400 })
    update.status = body.status
    update.cleared_at = body.status === 'cleared' ? new Date().toISOString() : null
  }
  if (body.note !== undefined) update.note = body.note

  const { data, error } = await supabase
    .from('development_conditions')
    .update(update)
    .eq('id', body.conditionId)
    .eq('opportunity_id', params.id) // scope to the path opportunity (RLS also gates by company)
    .select('*')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ condition: data })
}
