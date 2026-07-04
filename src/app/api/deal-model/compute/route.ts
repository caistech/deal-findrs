import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/require-auth'
import { getCompanyId } from '@/lib/auth/get-company-id'
import { runDealModel } from '@/lib/deal-model'
import { saveDealModelSnapshot, type DealModelGrade } from '@/lib/deal-model/db'
import type { DealModelDealInput } from '@/lib/deal-model/types'
import { missingForBankable } from '@/lib/review-packs/certification'
import type { ReviewPackKind } from '@/lib/review-packs/types'

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

  const saved = await saveDealModelSnapshot(supabase, {
    opportunityId: body.input.opportunityId,
    companyId: company.companyId,
    createdBy: user.id,
    grade,
    input: body.input,
    result,
    ragStatus: body.ragStatus ?? null,
    overrideReason: body.overrideReason ?? null,
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
