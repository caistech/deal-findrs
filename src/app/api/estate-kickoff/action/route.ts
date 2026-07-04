import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/require-auth'
import { getCompanyId } from '@/lib/auth/get-company-id'

/** Add an action to a kickoff's light meeting log. */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: 401 })
  const { user, supabase } = auth
  const company = await getCompanyId(supabase, user)
  if (company.error) return NextResponse.json({ error: company.error }, { status: 403 })

  const body = await request.json().catch(() => ({}))
  const kickoffId = String(body.kickoffId ?? '')
  const description = String(body.description ?? '').trim()
  if (!kickoffId) return NextResponse.json({ error: 'kickoff_required' }, { status: 400 })
  if (!description) return NextResponse.json({ error: 'description_required' }, { status: 400 })

  const { data, error } = await supabase
    .from('estate_kickoff_actions')
    .insert({
      kickoff_id: kickoffId,
      description,
      owner: body.owner ? String(body.owner).trim() : null,
      due_date: body.dueDate ? String(body.dueDate) : null,
      created_by: user.id,
    })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ action: data })
}
