import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/require-auth'
import { getCompanyId } from '@/lib/auth/get-company-id'

/**
 * Set the planner's structured resolution on an assessment (resolved zone / min-lot / lots) and/or
 * its status. When status='approved' with a resolution, the values flow back into the Constraints &
 * Yield buildup (the detail page passes them as operatorResolved). RLS scopes to the company.
 */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(request)
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: 401 })
  const { user, supabase } = auth
  const company = await getCompanyId(supabase, user)
  if (company.error) return NextResponse.json({ error: company.error }, { status: 403 })

  const body = await request.json().catch(() => ({}))
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if ('resolvedZoneCode' in body) update.resolved_zone_code = body.resolvedZoneCode ? String(body.resolvedZoneCode).trim() : null
  if ('resolvedMinLotSize' in body) update.resolved_min_lot_size = Number(body.resolvedMinLotSize) || null
  if ('resolvedLots' in body) update.resolved_lots = Number.isFinite(Number(body.resolvedLots)) ? Math.round(Number(body.resolvedLots)) : null
  if (body.status === 'draft' || body.status === 'in_review' || body.status === 'approved') {
    update.status = body.status
  }

  const { data, error } = await supabase
    .from('planning_assessments')
    .update(update)
    .eq('id', params.id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ assessment: data })
}
