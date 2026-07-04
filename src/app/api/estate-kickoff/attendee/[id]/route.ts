import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/require-auth'
import { getCompanyId } from '@/lib/auth/get-company-id'

const ACCEPTANCE = new Set(['invited', 'accepted', 'declined', 'tentative'])

/** Update an attendee's acceptance (light meeting log). RLS scopes to the caller's company. */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(request)
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: 401 })
  const { user, supabase } = auth
  const company = await getCompanyId(supabase, user)
  if (company.error) return NextResponse.json({ error: company.error }, { status: 403 })

  const body = await request.json().catch(() => ({}))
  const acceptance = String(body.acceptance ?? '')
  if (!ACCEPTANCE.has(acceptance)) return NextResponse.json({ error: 'invalid_acceptance' }, { status: 400 })

  const { data, error } = await supabase
    .from('estate_kickoff_attendees')
    .update({ acceptance, responded_at: new Date().toISOString() })
    .eq('id', params.id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ attendee: data })
}
