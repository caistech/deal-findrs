import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/require-auth'
import { getCompanyId } from '@/lib/auth/get-company-id'
import { buildConstraintsYield } from '@/lib/estate-buildup/build'
import type { BuildupOptions } from '@/lib/estate-buildup/types'
import { getReviewPackTemplate } from '@/lib/review-packs/registry'
import { renderReviewPack, reviewPackFilename } from '@/lib/review-packs/render'

// @react-pdf/renderer needs the Node runtime; the render is per-request.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Generate a professional review pack (engineer / QS / valuer) for an estate opportunity as a
 * branded PDF, rendered from the Constraints & Yield buildup via @caistech/report-generator. The
 * engineer pack renders now; QS/valuer are Phase-3-gated and return 409 with a reason until then.
 */
export async function GET(request: NextRequest, { params }: { params: { id: string; kind: string } }) {
  const auth = await requireAuth(request)
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: 401 })
  const { user, supabase } = auth
  const company = await getCompanyId(supabase, user)
  if (company.error) return NextResponse.json({ error: company.error }, { status: 403 })

  const template = getReviewPackTemplate(params.kind)
  if (!template) return NextResponse.json({ error: 'unknown_pack' }, { status: 404 })

  const { data: opp, error: oppErr } = await supabase
    .from('opportunities')
    .select('id, name, address, city, state, property_profile')
    .eq('id', params.id)
    .single()
  if (oppErr || !opp) return NextResponse.json({ error: 'opportunity_not_found' }, { status: 404 })
  if (!opp.property_profile) return NextResponse.json({ error: 'no_profile' }, { status: 400 })

  // Mirror the opportunity page: an approved planner referral feeds the resolved zone/yield.
  const { data: referral } = await supabase
    .from('planning_assessments')
    .select('status, resolved_zone_code, resolved_min_lot_size, resolved_lots')
    .eq('opportunity_id', opp.id)
    .maybeSingle()
  const options: BuildupOptions =
    referral?.status === 'approved'
      ? { operatorResolved: { zoneCode: referral.resolved_zone_code, minLotSize: referral.resolved_min_lot_size, lots: referral.resolved_lots } }
      : {}

  const profile = opp.property_profile as { metadata?: { lgaName?: string | null } }
  const brief = buildConstraintsYield(opp.property_profile, options)

  const ctx = {
    opportunity: {
      id: opp.id as string,
      name: (opp.name as string) ?? null,
      address: (opp.address as string) ?? null,
      city: (opp.city as string) ?? null,
      state: (opp.state as string) ?? null,
      lga: profile.metadata?.lgaName ?? null,
    },
    brief,
    preparedOn: new Date().toISOString().slice(0, 10),
  }

  const availability = template.available(ctx)
  if (!availability.ok) {
    return NextResponse.json({ error: 'pack_unavailable', reason: availability.reason }, { status: 409 })
  }

  try {
    const result = await renderReviewPack(template, ctx)
    const filename = reviewPackFilename(template.kind, ctx.opportunity.name)
    return new NextResponse(new Uint8Array(result.buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('[review-pack] render failed:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'render_failed' }, { status: 500 })
  }
}
