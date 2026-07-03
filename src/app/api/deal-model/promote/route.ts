import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/require-auth'
import { getCompanyId } from '@/lib/auth/get-company-id'
import { getLatestDealModelSnapshot } from '@/lib/deal-model/db'
import { sendPromotion } from '@/lib/deal-model/promote'

/**
 * Promote a deal to F2K-Projects.
 *
 * Loads the latest deal-model snapshot for the opportunity and, IF its verdict is not STOP
 * (REJECT), signs and POSTs it to the F2K-Projects promotion receiver. The REJECT guard is the
 * send-side enforcement of the GO-gate: a STOP deal cannot be promoted. Idempotent downstream
 * (the receiver upserts on deal_id + version).
 *
 * Body: { opportunityId }
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: 401 })
  const { user, supabase } = auth

  const company = await getCompanyId(supabase, user)
  if (company.error) return NextResponse.json({ error: company.error }, { status: 403 })

  let body: { opportunityId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }
  if (!body.opportunityId) {
    return NextResponse.json({ error: 'missing_opportunityId' }, { status: 400 })
  }

  const latest = await getLatestDealModelSnapshot(supabase, body.opportunityId)
  if ('error' in latest) {
    return NextResponse.json({ error: latest.error }, { status: 500 })
  }
  const snap = latest.snapshot
  if (!snap) {
    return NextResponse.json({ error: 'no_snapshot_compute_first' }, { status: 400 })
  }
  if (snap.verdict === 'REJECT') {
    // Enforcement: a STOP deal cannot progress.
    return NextResponse.json({ error: 'cannot_promote_reject' }, { status: 409 })
  }

  // Best-effort estate-name hint to help the receiver link to a developer_onboarding row.
  const { data: opp } = await supabase
    .from('opportunities')
    .select('name')
    .eq('id', body.opportunityId)
    .maybeSingle()

  const result = await sendPromotion({
    dealId: body.opportunityId,
    snapshotVersion: snap.version,
    grade: snap.grade,
    verdict: snap.verdict,
    developerThin: snap.developer_thin,
    baseRatePerLot: snap.base_rate_per_lot,
    netUpliftPct: snap.net_uplift_pct,
    stageUsed: snap.stage_used,
    snapshot: snap.result,
    link: opp?.name ? { estateName: opp.name } : undefined,
  })

  if (!result.ok) {
    const status = result.error === 'promotion_not_configured' ? 503 : 502
    return NextResponse.json({ error: 'promotion_failed', detail: result.error }, { status })
  }

  return NextResponse.json({ ok: true, version: snap.version, verdict: snap.verdict })
}
