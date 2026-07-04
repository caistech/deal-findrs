import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/require-auth'
import { getCompanyId } from '@/lib/auth/get-company-id'
import { buildConstraintsYield } from '@/lib/estate-buildup/build'
import type { BuildupOptions } from '@/lib/estate-buildup/types'
import { buildEstateCostPack } from '@/lib/estate-cost/build'
import type { EstateCostPack } from '@/lib/estate-cost/types'
import { buildValuationPack } from '@/lib/estate-valuation/build'
import { fetchAvmCrossCheck } from '@/lib/estate-valuation/avm'
import type { EstateValuationPack } from '@/lib/estate-valuation/types'
import { getReviewPackTemplate } from '@/lib/review-packs/registry'
import { renderReviewPack, reviewPackFilename } from '@/lib/review-packs/render'

/** Normalise a stored pre-sales figure to a 0..1 fraction (columns store either 30 or 0.30). */
function toFraction(v: number | null | undefined): number {
  const n = Number(v) || 0
  return n > 1 ? n / 100 : n
}

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
    .select('id, name, address, city, state, num_lots, land_purchase_price, avg_sale_price, derisk_pre_sales_percent, property_profile')
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

  // Lot-level QS cost buildup (Checklist 2) — built on the DERIVED authoritative yield (num_lots is
  // the fallback only). Present unlocks the QS pack; land-subdivision only for now (H&L layers when
  // the deal-model carries a capture rate). Kept as land-subdivision — no H&L capture from the record yet.
  const lots = brief.yield.authoritativeLots ?? (opp.num_lots as number | null) ?? 0
  let costPack: EstateCostPack | undefined
  if (lots > 0 && opp.state) {
    const landPrice = opp.land_purchase_price as number | null
    costPack = buildEstateCostPack({
      lots,
      state: opp.state as string,
      landPerLot: landPrice && lots ? Math.round(landPrice / lots) : undefined,
    })
  }

  // GRV & absorption (Checklist 3) — GRV/lot from the operator's indicative sale price; absorption
  // from the claimed pre-sales (evidence gated in the feasibility engine); AVM cross-check fetched
  // server-side (key-optional, degrades). Present with a GRV unlocks the valuer pack.
  const grvPerLot = Number(opp.avg_sale_price) || 0
  let valuationPack: EstateValuationPack | undefined
  if (lots > 0 && grvPerLot > 0) {
    valuationPack = buildValuationPack({
      lots,
      grvPerLot,
      preSalesPercent: toFraction(opp.derisk_pre_sales_percent as number | null),
    })
    // Only pay for the AVM call when actually rendering the valuer pack.
    if (params.kind === 'valuer') {
      const landPrice = opp.land_purchase_price as number | null
      valuationPack.avm = await fetchAvmCrossCheck({
        address: (opp.address as string) ?? '',
        state: (opp.state as string) ?? null,
        referenceValue: landPrice ?? null,
      })
    }
  }

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
    costPack,
    valuationPack,
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
