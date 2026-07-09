import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '@/lib/auth/require-auth'
import { assembleStatusSnapshot } from '@/lib/status-report/assemble'
import type { PropertyProfile } from '@/lib/property-services'

// HARD RULE: live-state route — must reflect DB changes immediately.
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

// Shape of a share_tokens row. share_tokens is a NEW table, so the generated
// Supabase Database types don't know it yet and reads would otherwise be typed
// `never`. Cast reads via .single<ShareTokenRow>() and inserts via `as never`.
type ShareTokenRow = {
  token: string
  opportunity_name: string | null
  opportunity_address: string | null
  rag_status: 'green' | 'amber' | 'red' | null
  score: number | null
  gross_margin_pct: number | null
  partner_name: string | null
  expires_at: string
  revoked: boolean
}

// Lazy-init admin client (service-role, server-side only).
let _adminClient: ReturnType<typeof createClient> | null = null
function getAdmin() {
  if (!_adminClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) throw new Error('Supabase credentials not configured')
    _adminClient = createClient(url, key)
  }
  return _adminClient
}

// ─── POST /api/share ─────────────────────────────────────────────────────────
// Creates a share token for an assessed opportunity.
// Auth: required — only the owner can create a share link for their deal.
// Body: { opportunity_id: string }
// Returns: { token: string, url: string }
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth.error) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  }
  const { user, supabase } = auth

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const opportunityId =
    typeof body.opportunity_id === 'string' ? body.opportunity_id.trim() : ''
  if (!opportunityId) {
    return NextResponse.json(
      { error: 'opportunity_id is required' },
      { status: 400 }
    )
  }
  // 'status' = the full operational status report (/status/[token]); default = the teaser (/share).
  const kind = body.kind === 'status' ? 'status' : 'assessment'

  try {
    const admin = getAdmin()

    // Fetch the opportunity (RLS-scoped to the owner via the user's client). Fuller field set so a
    // status report can be assembled; the teaser only uses name/address/rag/gm.
    const { data: opp, error: oppErr } = await supabase
      .from('opportunities')
      .select(
        'id, name, address, rag_status, score, gross_margin_percent, company_id, num_lots, ' +
        'property_size, property_size_unit, lifecycle_status, deal_model_stage, developed_lot_price, ' +
        'avg_sale_price, land_purchase_price, infrastructure_costs, construction_per_unit, ' +
        'contingency_percent, property_profile, plan_tenure'
      )
      .eq('id', opportunityId)
      .single()

    if (oppErr || !opp) {
      console.error('[share POST] opportunity fetch failed:', oppErr?.message)
      return NextResponse.json(
        { error: 'Opportunity not found or access denied' },
        { status: 404 }
      )
    }

    const oppRow = opp as unknown as Record<string, unknown>

    const { data: company, error: companyErr } = await supabase
      .from('companies')
      .select('name')
      .eq('id', oppRow.company_id as string)
      .single()
    if (companyErr) {
      console.warn('[share POST] partner-name lookup failed (non-fatal):', companyErr.message)
    }
    const partnerName = (company as { name?: string } | null)?.name ?? null

    const insertPayload: Record<string, unknown> = {
      opportunity_id: oppRow.id,
      company_id: oppRow.company_id,
      created_by: user.id,
      opportunity_name: (oppRow.name as string | null) ?? null,
      opportunity_address: (oppRow.address as string | null) ?? null,
      rag_status: (oppRow.rag_status as string | null) ?? null,
      gross_margin_pct: (oppRow.gross_margin_percent as number | null) ?? null,
      partner_name: partnerName,
      kind,
    }

    // For a status report, assemble the full snapshot: conditions-clearance progress + the resolved
    // yield + the buildup's open gaps.
    if (kind === 'status') {
      const { data: conds } = await supabase
        .from('development_conditions')
        .select('category, status')
        .eq('opportunity_id', oppRow.id)
      const { data: referral } = await supabase
        .from('planning_assessments')
        .select('status, resolved_zone_code, resolved_min_lot_size, resolved_lots')
        .eq('opportunity_id', oppRow.id)
        .maybeSingle()
      const ref = referral as { status?: string; resolved_zone_code?: string | null; resolved_min_lot_size?: number | null; resolved_lots?: number | null } | null
      const operatorResolved = ref?.status === 'approved'
        ? { zoneCode: ref.resolved_zone_code, minLotSize: ref.resolved_min_lot_size, lots: ref.resolved_lots }
        : undefined
      insertPayload.status_snapshot = assembleStatusSnapshot({
        opp: { ...oppRow, property_profile: oppRow.property_profile as PropertyProfile | null },
        conditions: (conds ?? []) as { category: string | null; status: string | null }[],
        operatorResolved,
        partnerName,
        generatedAt: new Date().toISOString(),
      })
    }

    const { data: tokenRow, error: insertErr } = await admin
      .from('share_tokens')
      .insert(insertPayload as never)
      .select('token')
      .single<{ token: string }>()

    if (insertErr || !tokenRow) {
      console.error('[share POST] insert failed:', insertErr?.message)
      return NextResponse.json(
        { error: 'Failed to create share link. Please try again.' },
        { status: 500 }
      )
    }

    const token = tokenRow.token
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ??
      `https://${request.headers.get('host') ?? 'deal-findrs.vercel.app'}`
    const url = `${baseUrl}/${kind === 'status' ? 'status' : 'share'}/${token}`

    return NextResponse.json({ token, url })
  } catch (err) {
    console.error('[share POST] unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── GET /api/share?token=<token> ────────────────────────────────────────────
// Retrieves the public share summary by token.
// PUBLIC_ROUTES justification: this endpoint is intentionally unauthenticated —
// it serves the public share page for lenders, brokers, and prospective partners
// who receive a shared Finance Pack link. The response carries only a snapshot of
// deal-level data (name, RAG status, gross margin, score) that the sharer chose to
// expose. It does NOT return the full opportunity record or any PII.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')?.trim()

  if (!token) {
    return NextResponse.json({ error: 'token is required' }, { status: 400 })
  }

  // Sanitise — hex tokens are 32 chars (16 bytes * 2)
  if (!/^[0-9a-f]{32}$/i.test(token)) {
    return NextResponse.json({ error: 'Invalid token format' }, { status: 400 })
  }

  try {
    const admin = getAdmin()
    const { data, error } = await admin
      .from('share_tokens')
      .select(
        'token, kind, status_snapshot, opportunity_name, opportunity_address, rag_status, score, gross_margin_pct, partner_name, expires_at, revoked'
      )
      .eq('token', token)
      .eq('revoked', false)
      .gt('expires_at', new Date().toISOString())
      .single<ShareTokenRow & { kind?: string; status_snapshot?: unknown }>()

    if (error || !data) {
      return NextResponse.json(
        { error: 'Share link not found or has expired' },
        { status: 404 }
      )
    }

    // A status-report token carries the full assembled snapshot.
    if (data.kind === 'status') {
      return NextResponse.json(
        { kind: 'status', status_snapshot: data.status_snapshot, expires_at: data.expires_at },
        { headers: { 'Cache-Control': 'no-store' } }
      )
    }

    return NextResponse.json(
      {
        opportunity_name: data.opportunity_name,
        opportunity_address: data.opportunity_address,
        rag_status: data.rag_status,
        score: data.score,
        gross_margin_pct: data.gross_margin_pct,
        partner_name: data.partner_name,
        expires_at: data.expires_at,
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    )
  } catch (err) {
    console.error('[share GET] unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}