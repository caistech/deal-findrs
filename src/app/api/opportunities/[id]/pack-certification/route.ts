import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/require-auth'
import { getCompanyId } from '@/lib/auth/get-company-id'

const VALID_KINDS = new Set(['engineer', 'qs', 'valuer'])

/** List an opportunity's estate pack certifications (engineer / QS / valuer). */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(request)
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: 401 })
  const { user, supabase } = auth
  const company = await getCompanyId(supabase, user)
  if (company.error) return NextResponse.json({ error: company.error }, { status: 403 })

  const { data, error } = await supabase
    .from('estate_pack_certifications')
    .select('kind, certified_by_name, note, certified_at')
    .eq('opportunity_id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ certifications: data ?? [] })
}

/**
 * Record (or update) that a professional has certified a review pack. Upserts on (opportunity, kind)
 * so a re-certify replaces the prior. These certifications gate the bankable (v2) deal-model snapshot.
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(request)
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: 401 })
  const { user, supabase } = auth
  const company = await getCompanyId(supabase, user)
  if (company.error) return NextResponse.json({ error: company.error }, { status: 403 })

  const body = await request.json().catch(() => ({}))
  const kind = String(body.kind ?? '').trim()
  const certifiedByName = String(body.certifiedByName ?? '').trim()
  if (!VALID_KINDS.has(kind)) return NextResponse.json({ error: 'invalid_kind' }, { status: 400 })
  if (!certifiedByName) return NextResponse.json({ error: 'certified_by_required' }, { status: 400 })

  const { data, error } = await supabase
    .from('estate_pack_certifications')
    .upsert(
      {
        opportunity_id: params.id,
        company_id: company.companyId,
        kind,
        certified_by_name: certifiedByName,
        note: body.note ? String(body.note).trim() : null,
        certified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: user.id,
      },
      { onConflict: 'opportunity_id,kind' },
    )
    .select('kind, certified_by_name, note, certified_at')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ certification: data })
}
