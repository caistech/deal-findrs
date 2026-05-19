import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { requireAuth } from '@/lib/auth/require-auth'
import { getCompanyId } from '@/lib/auth/get-company-id'
import { runFeasibilityEngine, ENGINE_VERSION } from '@/lib/feasibility/engine'
import type { RawInputs, FeasibilityThresholds } from '@/lib/feasibility/substitute'
import { DEFAULT_THRESHOLDS } from '@/lib/feasibility/substitute'

let _admin: SupabaseClient | null = null
function getSupabaseAdmin(): SupabaseClient {
  if (!_admin) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) throw new Error('Supabase credentials not configured')
    _admin = createClient(url, key)
  }
  return _admin
}

/**
 * POST /api/assess
 *
 * Runs the adversarial feasibility engine against a saved opportunity.
 *
 * Body:
 *   opportunity_id: string (required)
 *   engineInputs: {
 *     claimedTotalEquity: number
 *     claimedEquityCash: number
 *     proposedLoanAmount: number
 *     isOffshoreSupply?: boolean
 *     isComplex?: boolean
 *     evidencedPurchasePrice?: number  // when known to the caller
 *   }
 *
 * The remaining engine inputs are derived from the saved opportunity row.
 * Per-company feasibility thresholds come from the feasibility_criteria table.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: 401 })
  const { user, supabase } = auth

  const company = await getCompanyId(supabase, user)
  if (company.error) return NextResponse.json({ error: company.error }, { status: 403 })

  const body = await request.json().catch(() => ({} as Record<string, unknown>))
  const opportunityId = body.opportunity_id as string | undefined
  const ei = (body.engineInputs ?? {}) as {
    claimedTotalEquity?: number
    claimedEquityCash?: number
    proposedLoanAmount?: number
    isOffshoreSupply?: boolean
    isComplex?: boolean
    evidencedPurchasePrice?: number
  }

  if (!opportunityId) return NextResponse.json({ error: 'opportunity_id_required' }, { status: 400 })

  // Load the opportunity (RLS-scoped via user client)
  const { data: opp, error: oppErr } = await supabase
    .from('opportunities')
    .select('*')
    .eq('id', opportunityId)
    .single()
  if (oppErr || !opp)                       return NextResponse.json({ error: 'opportunity_not_found' }, { status: 404 })
  if (opp.company_id !== company.companyId) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  // Load per-company thresholds (fall back to defaults if no row)
  const { data: criteriaRow } = await supabase
    .from('feasibility_criteria')
    .select('ltc_ceiling, margin_floor, contingency_baseline, contingency_offshore, contingency_complex')
    .eq('company_id', company.companyId)
    .single()

  const thresholds: FeasibilityThresholds = criteriaRow ? {
    ltcCeiling:          Number(criteriaRow.ltc_ceiling)          || DEFAULT_THRESHOLDS.ltcCeiling,
    marginFloor:         Number(criteriaRow.margin_floor)         || DEFAULT_THRESHOLDS.marginFloor,
    contingencyBaseline: Number(criteriaRow.contingency_baseline) || DEFAULT_THRESHOLDS.contingencyBaseline,
    contingencyOffshore: Number(criteriaRow.contingency_offshore) || DEFAULT_THRESHOLDS.contingencyOffshore,
    contingencyComplex:  Number(criteriaRow.contingency_complex)  || DEFAULT_THRESHOLDS.contingencyComplex,
  } : DEFAULT_THRESHOLDS

  // Assemble RawInputs
  const claimedLandValue = Number(opp.land_purchase_price) || 0
  const numDwellings = Number(opp.num_dwellings) || Number(opp.num_lots) || 0
  const claimedGRVTotal = (Number(opp.avg_sale_price) || 0) * numDwellings
  const claimedPreSalesPercent = Number(opp.derisk_pre_sales_percent) || 0
  const promoterContingencyPct = (Number(opp.contingency_percent) || 0) / 100  // table stores as percent, engine uses decimal

  const isComplex = Boolean(opp.risk_heritage_overlay) || Boolean(opp.risk_environmental_issues) || Boolean(ei.isComplex)
  const isOffshoreSupply = Boolean(ei.isOffshoreSupply)

  // Engine-specific inputs that aren't in the schema yet — supplied per-request.
  const claimedTotalEquity = Number(ei.claimedTotalEquity) || 0
  const claimedEquityCash  = Number(ei.claimedEquityCash)  || 0
  const proposedLoanAmount = Number(ei.proposedLoanAmount) || 0

  const raw: RawInputs = {
    opportunityId,
    claimedLandValue,
    evidencedPurchasePrice: typeof ei.evidencedPurchasePrice === 'number' ? ei.evidencedPurchasePrice : undefined,
    claimedTotalEquity,
    claimedEquityCash,
    claimedGRVTotal,
    numDwellings,
    constructionPerUnit: Number(opp.construction_per_unit) || 0,
    infrastructureCosts: Number(opp.infrastructure_costs) || 0,
    promoterContingencyPct,
    proposedLoanAmount,
    isOffshoreSupply,
    isComplex,
    claimedPreSalesPercent,
  }

  // Run engine (uses user-scoped supabase for evidence so RLS applies)
  let engineResult
  try {
    engineResult = await runFeasibilityEngine({ raw, evidenceClient: supabase, thresholds })
  } catch (err) {
    console.error('[/api/assess] engine error:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'engine_failed', detail: err instanceof Error ? err.message : 'unknown' }, { status: 500 })
  }

  // Persist into assessments + update opportunity status & rag_status.
  // Service-role admin used here because we've already auth'd the user and
  // verified company ownership above.
  const admin = getSupabaseAdmin()

  const { data: assessmentRow, error: insErr } = await admin
    .from('assessments')
    .insert({
      opportunity_id: opportunityId,
      status: engineResult.rag,
      engine_version: engineResult.engineVersion,
      test_results: engineResult.threeTest.results,
      reviewer_verdict: engineResult.reviewer,
      substitution_log: engineResult.substitutions,
      ltv_derived: engineResult.ltvDerived,
      // Legacy summary fields — synthesised from engine output for backward UI compatibility.
      summary: engineResult.rationale,
      total_cost: engineResult.adjusted.totalDevelopmentCost,
      total_revenue: engineResult.adjusted.grvTotal,
      gross_margin: engineResult.adjusted.grvTotal - engineResult.adjusted.totalDevelopmentCost,
      gross_margin_percent: engineResult.adjusted.grvTotal > 0
        ? ((engineResult.adjusted.grvTotal - engineResult.adjusted.totalDevelopmentCost) / engineResult.adjusted.grvTotal) * 100
        : null,
    } as never)
    .select()
    .single()

  if (insErr) {
    console.error('[/api/assess] assessment insert failed:', insErr.message)
    return NextResponse.json({ error: 'persist_failed', detail: insErr.message }, { status: 500 })
  }

  // Update the opportunity's denormalised RAG + status
  const { error: oppUpdErr } = await admin
    .from('opportunities')
    .update({
      rag_status: engineResult.rag,
      status: 'assessed',
      gross_margin_dollars: engineResult.adjusted.grvTotal - engineResult.adjusted.totalDevelopmentCost,
      gross_margin_percent: engineResult.adjusted.grvTotal > 0
        ? Math.round(((engineResult.adjusted.grvTotal - engineResult.adjusted.totalDevelopmentCost) / engineResult.adjusted.grvTotal) * 1000) / 10
        : null,
      total_project_cost: engineResult.adjusted.totalDevelopmentCost,
      total_revenue: engineResult.adjusted.grvTotal,
      updated_at: new Date().toISOString(),
    } as never)
    .eq('id', opportunityId)

  if (oppUpdErr) {
    console.error('[/api/assess] opportunity status update failed:', oppUpdErr.message)
    // Non-fatal — assessment is saved
  }

  return NextResponse.json({
    success: true,
    assessmentId: (assessmentRow as { id: string } | null)?.id,
    rag: engineResult.rag,
    rationale: engineResult.rationale,
    engineVersion: engineResult.engineVersion,
    threeTest: engineResult.threeTest,
    substitutions: engineResult.substitutions,
    reviewer: engineResult.reviewer,
    reviewerFallback: engineResult.reviewerFallback,
    adjusted: engineResult.adjusted,
    ltvDerived: engineResult.ltvDerived,
    evidenceDocumentCount: engineResult.evidenceDocumentCount,
    evidenceCategoriesPresent: engineResult.evidenceCategoriesPresent,
  })
}

export async function GET() {
  return NextResponse.json({
    message: 'POST /api/assess to run the adversarial feasibility engine on a saved opportunity.',
    engineVersion: ENGINE_VERSION,
    body: {
      opportunity_id: 'string (required)',
      engineInputs: {
        claimedTotalEquity: 'number',
        claimedEquityCash: 'number',
        proposedLoanAmount: 'number',
        isOffshoreSupply: 'boolean (optional)',
        isComplex: 'boolean (optional)',
        evidencedPurchasePrice: 'number (optional, when known to caller)',
      },
    },
  })
}
