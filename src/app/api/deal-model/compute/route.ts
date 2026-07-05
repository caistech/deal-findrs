import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/require-auth'
import { getCompanyId } from '@/lib/auth/get-company-id'
import { runDealModel, runCashflow, toCashflowInputs } from '@/lib/deal-model'
import { saveDealModelSnapshot, type DealModelGrade, type SnapshotCashflow } from '@/lib/deal-model/db'
import type { DealModelDealInput } from '@/lib/deal-model/types'
import { missingForBankable } from '@/lib/review-packs/certification'
import type { ReviewPackKind } from '@/lib/review-packs/types'

/** Operator-supplied funder-cashflow inputs (the deal result supplies lots/price/works). */
interface CashflowRequest {
  totalContributions: number
  contributorPayoutPct: number
  buildStages: number
  stageDurationMonths: number
  /** TRUE while staging is the indicative 5×9 placeholder (pre Porter/QS). */
  stagingIsPlaceholder: boolean
}

/**
 * Compute the F2K deal model for an ingested deal and persist an immutable snapshot.
 *
 * Governance (signed off 2026-07-03): the deal-model GO/ADJUST/REJECT verdict governs
 * the promotion gate; the adversarial RAG rides alongside as a credibility overlay
 * (passed through as `ragStatus`, non-blocking). Engine: @caistech/deal-model V7
 * (contributions recovered in the base; agent 3.5% + flat-12% defaults).
 *
 * Body: { input: DealModelDealInput, grade: 'indicative'|'bankable',
 *         ragStatus?, overrideReason? }
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: 401 })
  }
  const { user, supabase } = auth

  const company = await getCompanyId(supabase, user)
  if (company.error) {
    return NextResponse.json({ error: company.error }, { status: 403 })
  }

  let body: {
    input?: DealModelDealInput
    grade?: DealModelGrade
    ragStatus?: 'green' | 'amber' | 'red' | null
    overrideReason?: string | null
    cashflow?: CashflowRequest | null
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  if (!body.input || !body.input.opportunityId) {
    return NextResponse.json({ error: 'missing_input' }, { status: 400 })
  }
  const grade: DealModelGrade = body.grade === 'bankable' ? 'bankable' : 'indicative'

  // Bankable (v2) is gated on the certified financial packs (QS + registered valuation). An
  // indicative (v1) snapshot has no such gate.
  if (grade === 'bankable') {
    const { data: certs } = await supabase
      .from('estate_pack_certifications')
      .select('kind')
      .eq('opportunity_id', body.input.opportunityId)
    const certified = (certs ?? []).map((c) => c.kind as ReviewPackKind)
    const missing = missingForBankable(certified)
    if (missing.length > 0) {
      return NextResponse.json(
        { error: 'bankable_requires_certifications', missing },
        { status: 409 },
      )
    }
  }

  // Pure compute — the engine is the single source of truth for the verdict.
  const { verdict, result } = runDealModel(body.input)

  // Funder cashflow — computed SERVER-SIDE from the deal result (never trusting a
  // client-supplied number), only when the contribution pool has been entered. Works to
  // title is derived from the deal's per-lot cost lines so the two models can't drift.
  let cashflow: SnapshotCashflow | null = null
  const cf = body.cashflow
  if (cf && cf.totalContributions > 0 && body.input.lots > 0) {
    const inputs = toCashflowInputs({
      deal: result,
      lots: body.input.lots,
      salePricePerLot: body.input.marketPricePerLot,
      totalContributions: cf.totalContributions,
      contributorPayoutPct: cf.contributorPayoutPct,
      buildStages: cf.buildStages,
      stageDurationMonths: cf.stageDurationMonths,
    })
    cashflow = {
      inputs,
      result: runCashflow(inputs),
      stagingIsPlaceholder: cf.stagingIsPlaceholder,
    }

    // Round-trip the staging onto the estate so the panel pre-fills next time and the
    // placeholder tripwire is queryable portfolio-wide. Secondary to the snapshot: log and
    // continue on failure — the immutable snapshot is the authoritative record.
    const { error: stagingErr } = await supabase
      .from('opportunities')
      .update({
        build_stages: cf.buildStages,
        stage_duration_months: cf.stageDurationMonths,
        total_contributions: cf.totalContributions,
        contributor_payout_pct: cf.contributorPayoutPct,
        cashflow_staging_placeholder: cf.stagingIsPlaceholder,
      })
      .eq('id', body.input.opportunityId)
    if (stagingErr) {
      console.error('[deal-model/compute] estate staging update failed (non-fatal):', stagingErr.message)
    }
  }

  const saved = await saveDealModelSnapshot(supabase, {
    opportunityId: body.input.opportunityId,
    companyId: company.companyId,
    createdBy: user.id,
    grade,
    input: body.input,
    result,
    ragStatus: body.ragStatus ?? null,
    overrideReason: body.overrideReason ?? null,
    cashflow,
  })

  if ('error' in saved) {
    const status = saved.error === 'override_reason_required' ? 400 : 500
    return NextResponse.json({ error: saved.error }, { status })
  }

  return NextResponse.json({
    snapshotId: saved.id,
    version: saved.version,
    grade,
    verdict,
  })
}
