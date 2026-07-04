import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/require-auth'
import { getCompanyId } from '@/lib/auth/get-company-id'

const VALID_TYPOLOGIES = new Set(['house_and_land', 'townhouse', 'multi_storey', 'apartments', 'mixed_use'])

/** Update or delete a directory member (RLS scopes both to the caller's company). */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(request)
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: 401 })
  const { user, supabase } = auth
  const company = await getCompanyId(supabase, user)
  if (company.error) return NextResponse.json({ error: company.error }, { status: 403 })

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (typeof body.name === 'string') update.name = body.name.trim()
  if ('firm' in body) update.firm = body.firm ? String(body.firm).trim() : null
  if ('email' in body) update.email = body.email ? String(body.email).trim() : null
  if ('phone' in body) update.phone = body.phone ? String(body.phone).trim() : null
  if ('notes' in body) update.notes = body.notes ? String(body.notes).trim() : null
  if (typeof body.active === 'boolean') update.active = body.active
  if (Array.isArray(body.states)) {
    update.states = body.states.map((s) => String(s).trim().toUpperCase()).filter(Boolean)
  }
  if (Array.isArray(body.typologies)) {
    update.typologies = body.typologies.map((t) => String(t)).filter((t) => VALID_TYPOLOGIES.has(t))
  }

  const { data, error } = await supabase
    .from('estate_team_members')
    .update(update)
    .eq('id', params.id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ member: data })
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(request)
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: 401 })
  const { user, supabase } = auth
  const company = await getCompanyId(supabase, user)
  if (company.error) return NextResponse.json({ error: company.error }, { status: 403 })

  const { error } = await supabase.from('estate_team_members').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
