import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/require-auth'
import { getCompanyId } from '@/lib/auth/get-company-id'

/** Update (toggle done / edit) or delete a kickoff action. RLS scopes to the caller's company. */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(request)
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: 401 })
  const { user, supabase } = auth
  const company = await getCompanyId(supabase, user)
  if (company.error) return NextResponse.json({ error: company.error }, { status: 403 })

  const body = await request.json().catch(() => ({}))
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.status === 'open' || body.status === 'done') update.status = body.status
  if (typeof body.description === 'string') update.description = body.description.trim()
  if ('owner' in body) update.owner = body.owner ? String(body.owner).trim() : null
  if ('dueDate' in body) update.due_date = body.dueDate ? String(body.dueDate) : null

  const { data, error } = await supabase
    .from('estate_kickoff_actions')
    .update(update)
    .eq('id', params.id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ action: data })
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(request)
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: 401 })
  const { user, supabase } = auth
  const company = await getCompanyId(supabase, user)
  if (company.error) return NextResponse.json({ error: company.error }, { status: 403 })

  const { error } = await supabase.from('estate_kickoff_actions').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
