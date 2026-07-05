import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/require-auth'
import { getCompanyId } from '@/lib/auth/get-company-id'
import { buildConstraintsYield } from '@/lib/estate-buildup/build'
import type { BuildupOptions } from '@/lib/estate-buildup/types'
import { buildEstateCostPack } from '@/lib/estate-cost/build'
import type { EstateCostPack } from '@/lib/estate-cost/types'
import { buildValuationPack, buildValuerPnl, buildValuerDcf } from '@/lib/estate-valuation/build'
import { buildSensitivity } from '@/lib/estate-sensitivity/build'
import type { EstateSensitivity } from '@/lib/estate-sensitivity/types'
import { fetchAvmComparison, shapeAvmCrossCheck, isAvmSnapshotFresh, type AvmSnapshot } from '@/lib/estate-valuation/avm'
import type { EstateValuationPack } from '@/lib/estate-valuation/types'
import { getReviewPackTemplate } from '@/lib/review-packs/registry'
import { renderReviewPack, reviewPackFilename } from '@/lib/review-packs/render'
import { createPropertyServices, type PropertyProfile, type PriceComparison, type Contribution } from '@/lib/property-services'

/** Normalise a stored pre-sales figure to a 0..1 fraction (columns store either 30 or 0.30). */
function toFraction(v: number | null | undefined): number {
  const n = Number(v) || 0
  return n > 1 ? n / 100 : n
}

type PanelField = 'title' | 'contamination' | 'servicing' | 'native_title' | 'survey_geotech'
const PANEL_FIELDS: PanelField[] = ['title', 'contamination', 'servicing', 'native_title', 'survey_geotech']

/**
 * Pull the panel-review write-backs for a site from the SHARED property-services store via the
 * lightweight contributions() read (a single indexed table read — NO derive/assess/AVM legs), keyed
 * field → latest summary. Fail-open + time-bounded (5s): any missing config / error / timeout returns
 * {} so pack generation is never blocked.
 */
async function loadResolvedPanel(
  address: string,
  state: string | null,
  lat?: number,
  lng?: number,
): Promise<Partial<Record<PanelField, string>>> {
  const supabaseUrl = process.env.PROPERTY_SERVICES_URL ?? process.env.NEXT_PUBLIC_PROPERTY_SERVICES_URL ?? ''
  const apiKey = process.env.PROPERTY_SERVICES_API_KEY ?? process.env.NEXT_PUBLIC_PROPERTY_SERVICES_API_KEY
  if (!supabaseUrl || !apiKey || !address.trim()) return {}
  try {
    const client = createPropertyServices({ supabaseUrl, apiKey, product: 'dealfindrs' })
    const res = (await Promise.race([
      client.contributions({ address, lat, lng, state: state ?? undefined }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5_000)),
    ])) as Awaited<ReturnType<typeof client.contributions>>
    if (!res?.success) return {}
    const out: Partial<Record<PanelField, string>> = {}
    // contribute() supersedes prior entries, so there is at most one active row per field.
    for (const c of (res.contributions ?? []) as Contribution[]) {
      if ((PANEL_FIELDS as string[]).includes(c.field) && c.summary && !out[c.field as PanelField]) {
        out[c.field as PanelField] = c.summary
      }
    }
    return out
  } catch {
    return {}
  }
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
    .select('id, name, address, city, state, num_lots, land_purchase_price, avg_sale_price, derisk_pre_sales_percent, property_profile, avm_snapshot')
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
  const profileFull = opp.property_profile as PropertyProfile

  // Panel-review write-backs (title/contamination/servicing) pulled from the shared property store —
  // they clear the buildup's tenure/servicing gaps and drive the valuer's site-risk. Fail-open.
  const resolvedPanel = await loadResolvedPanel(
    (opp.address as string) ?? '',
    (opp.state as string) ?? null,
    typeof profileFull.address?.lat === 'number' ? profileFull.address.lat : undefined,
    typeof profileFull.address?.lng === 'number' ? profileFull.address.lng : undefined,
  )

  // Conditions of approval (from an ingested WAPC/LG decision letter) drive the servicing +
  // constraint gaps: a servicing condition resolves the servicing gap as "conditioned per approval";
  // geotech / water-management conditions raise formal-required constraints; a UXO/contamination
  // condition surfaces contamination (which also drives the valuer's site-risk).
  const { data: conds } = await supabase
    .from('development_conditions')
    .select('category, text')
    .eq('opportunity_id', opp.id)
  const condList = conds ?? []
  const hasCond = (re: RegExp) => condList.some((c) => re.test((c.text as string) ?? ''))
  const { data: latestDoc } = await supabase
    .from('development_documents')
    .select('extracted')
    .eq('opportunity_id', opp.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  const approvalConditions = condList.length
    ? {
        wapcRef: (latestDoc?.extracted as { wapcRef?: string | null } | null)?.wapcRef ?? null,
        servicing: condList.some((c) => c.category === 'servicing'),
        geotech: hasCond(/geotech/i),
        waterManagement: hasCond(/water management/i),
        contamination: hasCond(/\bUXO\b|contaminat|unexploded|ordnance/i)
          ? 'Site has a history of military activity — residual UXO possible (per approval advice)'
          : null,
      }
    : undefined

  const options: BuildupOptions = {
    ...(referral?.status === 'approved'
      ? { operatorResolved: { zoneCode: referral.resolved_zone_code, minLotSize: referral.resolved_min_lot_size, lots: referral.resolved_lots } }
      : {}),
    ...(Object.keys(resolvedPanel).length ? { resolvedPanel } : {}),
    ...(approvalConditions ? { approvalConditions } : {}),
  }

  const profile = opp.property_profile as { metadata?: { lgaName?: string | null } }
  const brief = buildConstraintsYield(opp.property_profile, options)

  // Lot-level QS cost buildup (Checklist 2) — built on the DERIVED authoritative yield (num_lots is
  // the fallback only). Present unlocks the QS pack; land-subdivision only for now (H&L layers when
  // the deal-model carries a capture rate). Kept as land-subdivision — no H&L capture from the record yet.
  const lots = brief.yield.authoritativeLots ?? (opp.num_lots as number | null) ?? 0
  let costPack: EstateCostPack | undefined
  if (lots > 0 && opp.state) {
    const landPrice = opp.land_purchase_price as number | null
    // Cost-bearing conditions of approval → mandated QS lines (education levy, road upgrades, POS
    // development, demolition), sharpened by the plan's parent area (per-ha land value) + POS area.
    const ex = (latestDoc?.extracted ?? {}) as { wapcRef?: string | null; parentAreaHa?: number | null; posSqm?: number | null }
    const costConditions = condList.length
      ? {
          wapcRef: ex.wapcRef ?? null,
          education: hasCond(/education|school|op\s*2\.4|1\/1500/i),
          roadUpgrades: hasCond(/upgrad\w+ .*road|road.*upgrad|full cost of upgrading|frontage/i),
          posDevelopment: hasCond(/public open space|\bpos\b|landscap/i),
          demolition: hasCond(/demolish|demolition/i),
          posSqm: ex.posSqm ?? null,
          landValuePerHa: landPrice && ex.parentAreaHa ? landPrice / ex.parentAreaHa : null,
        }
      : undefined
    costPack = buildEstateCostPack({
      lots,
      state: opp.state as string,
      landPerLot: landPrice && lots ? Math.round(landPrice / lots) : undefined,
      // Slope scales earthworks/roadworks + adds a retaining line (steep ≠ flat cost).
      terrain: profileFull.terrain
        ? { slopePercent: profileFull.terrain.slopePercent, buildability: profileFull.terrain.buildability }
        : undefined,
      ...(costConditions ? { approvalConditions: costConditions } : {}),
    })
  }

  // GRV & absorption (Checklist 3) — GRV/lot from the operator's indicative sale price; absorption
  // from the claimed pre-sales (evidence gated in the feasibility engine); AVM cross-check fetched
  // server-side (key-optional, degrades). Present with a GRV unlocks the valuer pack.
  const grvPerLot = Number(opp.avg_sale_price) || 0
  let valuationPack: EstateValuationPack | undefined
  let sensitivity: EstateSensitivity | undefined
  if (lots > 0 && grvPerLot > 0) {
    valuationPack = buildValuationPack({
      lots,
      grvPerLot,
      preSalesPercent: toFraction(opp.derisk_pre_sales_percent as number | null),
      // Overlays (report-required) + a panel contamination write-back drive site-risk → absorption.
      siteRisk: {
        overlays: (profileFull.overlays ?? []).filter((o) => o.requiresReport).map((o) => o.name),
        contaminated: Boolean(resolvedPanel.contamination),
      },
    })
    // Only pay for the AVM call when actually rendering the valuer pack.
    if (params.kind === 'valuer') {
      const landPrice = opp.land_purchase_price as number | null
      // Reuse a persisted AVM snapshot (<30 days) to avoid re-calling the paid Domain comparables API
      // on every render; otherwise fetch the full PriceComparison, persist it, then shape. Divergence
      // is recomputed from the current land price on shape, so the cross-check behavior is unchanged.
      const snapshot = opp.avm_snapshot as AvmSnapshot | null
      let comparison: PriceComparison | null
      let unavailableReason: string | undefined
      if (isAvmSnapshotFresh(snapshot)) {
        comparison = snapshot.comparison
      } else {
        const fetched = await fetchAvmComparison({
          address: (opp.address as string) ?? '',
          state: (opp.state as string) ?? null,
        })
        comparison = fetched.comparison
        unavailableReason = fetched.unavailableReason
        if (comparison) {
          const snap: AvmSnapshot = { comparison, fetchedAt: new Date().toISOString() }
          const { error: snapErr } = await supabase
            .from('opportunities')
            .update({ avm_snapshot: snap } as never)
            .eq('id', opp.id)
          if (snapErr) console.error('[review-pack] avm snapshot persist failed:', snapErr.message)
        }
      }
      valuationPack.avm = shapeAvmCrossCheck(comparison, landPrice ?? null, unavailableReason)
      // Residual-land P&L (B6) — deducts the QS pack's development cost (the cost/value tie-out, A2)
      // + profit & risk from the GST-netted realisation to derive what the site is worth.
      if (costPack) {
        const devCostExclLand = costPack.totalLandDevCost - costPack.landPerLot * costPack.lots
        valuationPack.pnl = buildValuerPnl({
          grossRealisation: valuationPack.totalGrv,
          developmentCostExclLand: devCostExclLand,
          landAcquisitionCost: landPrice ?? 0,
          lots,
          siteAreaSqm: profileFull.lot?.lotSize ?? null,
        })
        // DCF (B1) — project IRR + NPV + NPV-basis RLV over the absorption sell-down.
        valuationPack.dcf = buildValuerDcf({
          grvPerLot,
          lots,
          developmentCostExclLand: devCostExclLand,
          landAcquisitionCost: landPrice ?? 0,
          absorptionMonths: valuationPack.absorption.totalMonths,
        })
        // Sensitivity (B2) — six single-variable tables (Margin / MDC / IRR each).
        sensitivity = buildSensitivity({
          lots,
          salePricePerLot: grvPerLot,
          worksTotal: devCostExclLand,
          landCost: landPrice ?? 0,
          constructionMonths: 12,
          sellMonths: valuationPack.absorption.totalMonths,
          interestRate: 0.12,
        })
      }
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
    sensitivity,
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
