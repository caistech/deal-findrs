import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '@/lib/auth/require-auth'

// HARD RULE: live-state route — must reflect DB changes immediately.
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

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
  const { user } = auth

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

  try {
    const admin = getAdmin()

    // Fetch the opportunity to snapshot its key fields.
    // Use the user's own client (via auth supabase) so RLS scopes the read.
    const { supabase } = auth
    const { data: opp, error: oppErr } = await supabase
      .from('opportunities')
      .select(
        'id, name, address, rag_status, score, gross_margin_percent, company_id'
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

    // Fetch partner/firm name for attribution on the share page.
    const { data: company } = await supabase
      .from('companies')
      .select('name')
      .eq('id', opp.company_id)
      .single()

    const partnerName = company?.name ?? null

    // Insert the share token (new table — cast payload as never per HARD RULE).
    const { data: tokenRow, error: insertErr } = await admin
      .from('share_tokens')
      .insert({
        opportunity_id: opp.id,
        company_id: opp.company_id,
        created_by: user.id,
        opportunity_name: opp.name ?? null,
        opportunity_address: ((opp as Record<string, unknown>).address as string | null) ?? null,
        rag_status: opp.rag_status ?? null,
        score: opp.score ?? null,
        gross_margin_pct: opp.gross_margin_percent ?? null,
        partner_name: partnerName,
      } as never)
      .select('token')
      .single()

    if (insertErr || !tokenRow) {
      console.error('[share POST] insert failed:', insertErr?.message)
      return NextResponse.json(
        { error: 'Failed to create share link. Please try again.' },
        { status: 500 }
      )
    }

    const token = (tokenRow as { token: string }).token
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ??
      `https://${request.headers.get('host') ?? 'deal-findrs.vercel.app'}`
    const url = `${baseUrl}/share/${token}`

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
        'token, opportunity_name, opportunity_address, rag_status, score, gross_margin_pct, partner_name, expires_at, revoked'
      )
      .eq('token', token)
      .eq('revoked', false)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: 'Share link not found or has expired' },
        { status: 404 }
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
