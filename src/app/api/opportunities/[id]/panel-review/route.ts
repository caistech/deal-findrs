import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/require-auth'
import { getCompanyId } from '@/lib/auth/get-company-id'
import { createPropertyServices, type PropertyProfile } from '@/lib/property-services'
import { FIELD_KEYS, PANEL_REVIEW_FIELDS, type PanelReviewFieldKey } from '@/lib/panel-review/fields'

/**
 * Panel Review — the professional write-back loop over property-services.
 *
 * GET  → the merged panel-review checklist for the opportunity's site (the five
 *        factors no feed can source, with their for-review/completed status + any
 *        prior contributions), via the SDK's dossier().
 * POST → write a completed field back to the SHARED property-services parcel store
 *        via contribute(), so the next dossier for that address (in any consumer)
 *        surfaces it "completed by X".
 *
 * Auth per the repo contract: requireAuth() + getCompanyId(); the opportunity fetch
 * is RLS-scoped by the user-bound client, so company ownership is enforced by RLS.
 */
export const dynamic = 'force-dynamic'

function propertyServices() {
  return createPropertyServices({
    supabaseUrl:
      process.env.PROPERTY_SERVICES_URL ??
      process.env.NEXT_PUBLIC_PROPERTY_SERVICES_URL ??
      '',
    apiKey:
      process.env.PROPERTY_SERVICES_API_KEY ??
      process.env.NEXT_PUBLIC_PROPERTY_SERVICES_API_KEY,
    product: 'dealfindrs',
  })
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(request)
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: 401 })
  const { user, supabase } = auth
  const company = await getCompanyId(supabase, user)
  if (company.error) return NextResponse.json({ error: company.error }, { status: 403 })

  const { data: opp, error } = await supabase
    .from('opportunities')
    .select('id, address, state, property_profile')
    .eq('id', params.id)
    .single()
  if (error || !opp) return NextResponse.json({ error: 'opportunity_not_found' }, { status: 404 })

  const address = ((opp.address as string) ?? '').trim()
  if (!address) return NextResponse.json({ error: 'no_address' }, { status: 400 })

  const profile = opp.property_profile as PropertyProfile | null
  const lat = profile?.address?.lat
  const lng = profile?.address?.lng

  const res = await propertyServices().dossier({
    address,
    lat: typeof lat === 'number' ? lat : undefined,
    lng: typeof lng === 'number' ? lng : undefined,
    state: (opp.state as string) ?? undefined,
  })
  if (!res.success || !res.data) {
    return NextResponse.json({ error: res.error || 'Could not load the site dossier' }, { status: 502 })
  }
  return NextResponse.json({
    address,
    items: res.data.plannerReview,
    contributions: res.data.contributions,
  })
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(request)
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: 401 })
  const { user, supabase } = auth
  const company = await getCompanyId(supabase, user)
  if (company.error) return NextResponse.json({ error: company.error }, { status: 403 })

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const field = String(body.field ?? '').trim()
  const summary = String(body.summary ?? '').trim()
  const source = body.source ? String(body.source).trim().slice(0, 500) : undefined
  const contributor = body.contributor ? String(body.contributor).trim().slice(0, 200) : undefined

  if (!(FIELD_KEYS as readonly string[]).includes(field)) {
    return NextResponse.json({ error: 'invalid_field' }, { status: 400 })
  }
  if (!summary) return NextResponse.json({ error: 'summary_required' }, { status: 400 })
  if (summary.length > 2000) return NextResponse.json({ error: 'summary_too_long' }, { status: 400 })

  const { data: opp, error } = await supabase
    .from('opportunities')
    .select('id, address, state')
    .eq('id', params.id)
    .single()
  if (error || !opp) return NextResponse.json({ error: 'opportunity_not_found' }, { status: 404 })
  const address = ((opp.address as string) ?? '').trim()
  if (!address) return NextResponse.json({ error: 'no_address' }, { status: 400 })

  const res = await propertyServices().contribute({
    field,
    summary,
    address,
    state: (opp.state as string) ?? undefined,
    discipline: PANEL_REVIEW_FIELDS[field as PanelReviewFieldKey].discipline,
    source,
    contributor,
  })
  if (!res.success) {
    return NextResponse.json({ error: res.error || 'Write-back failed' }, { status: 502 })
  }
  return NextResponse.json({ success: true })
}
