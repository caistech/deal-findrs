import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/require-auth'
import { getCompanyId } from '@/lib/auth/get-company-id'
import { OCCUPATION_LABELS } from '@/lib/estate-team/types'

const VALID_OCCUPATIONS = new Set(Object.keys(OCCUPATION_LABELS))
const VALID_TYPOLOGIES = new Set(['house_and_land', 'townhouse', 'multi_storey', 'apartments', 'mixed_use'])

/**
 * State team directory — the estate kickoff panel members, per company.
 * GET  → list all members. POST → add a member.
 * User-scoped client so RLS (company_id = get_user_company_id()) is the enforcement layer.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: 401 })
  const { user, supabase } = auth
  const company = await getCompanyId(supabase, user)
  if (company.error) return NextResponse.json({ error: company.error }, { status: 403 })

  const { data, error } = await supabase
    .from('estate_team_members')
    .select('*')
    .order('occupation', { ascending: true })
    .order('name', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ members: data ?? [] })
}

export async function POST(request: NextRequest) {
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

  const name = String(body.name ?? '').trim()
  const occupation = String(body.occupation ?? '').trim()
  if (!name) return NextResponse.json({ error: 'name_required' }, { status: 400 })
  if (!VALID_OCCUPATIONS.has(occupation)) return NextResponse.json({ error: 'invalid_occupation' }, { status: 400 })

  const states = Array.isArray(body.states)
    ? body.states.map((s) => String(s).trim().toUpperCase()).filter(Boolean)
    : []
  const typologies = Array.isArray(body.typologies)
    ? body.typologies.map((t) => String(t)).filter((t) => VALID_TYPOLOGIES.has(t))
    : null

  const { data, error } = await supabase
    .from('estate_team_members')
    .insert({
      company_id: company.companyId,
      name,
      firm: body.firm ? String(body.firm).trim() : null,
      occupation,
      states,
      typologies: occupation === 'modular_supplier' ? typologies : null,
      email: body.email ? String(body.email).trim() : null,
      phone: body.phone ? String(body.phone).trim() : null,
      notes: body.notes ? String(body.notes).trim() : null,
      created_by: user.id,
    })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ member: data })
}
