import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/require-auth'
import { getCompanyId } from '@/lib/auth/get-company-id'
import { notifyPlanner } from '@/lib/estate-team/planner-notify'

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

  // Reassign the referral to a different state-panel planner (routing override).
  let reassignedTo: { name: string; email: string | null } | null = null
  if ('assignedPlannerId' in body) {
    if (body.assignedPlannerId) {
      const { data: planner } = await supabase
        .from('estate_team_members')
        .select('id, name, firm, email, occupation')
        .eq('id', String(body.assignedPlannerId))
        .maybeSingle()
      if (!planner || planner.occupation !== 'planner') {
        return NextResponse.json({ error: 'invalid_planner' }, { status: 400 })
      }
      update.assigned_planner_id = planner.id
      update.assigned_planner_name = planner.firm ? `${planner.name} (${planner.firm})` : planner.name
      update.planner_gap = false
      reassignedTo = { name: planner.name, email: planner.email ?? null }
    } else {
      update.assigned_planner_id = null
      update.assigned_planner_name = null
    }
  }

  const { data, error } = await supabase
    .from('planning_assessments')
    .update(update)
    .eq('id', params.id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Email leg — notify the newly assigned planner (non-fatal).
  if (reassignedTo?.email) {
    const { data: findings } = await supabase
      .from('planning_findings')
      .select('claim')
      .eq('assessment_id', params.id)
      .order('sort_order')
    const ctx = (data.site_context ?? {}) as { address?: string | null }
    const send = await notifyPlanner({
      plannerName: reassignedTo.name,
      plannerEmail: reassignedTo.email,
      siteLabel: data.site_label,
      address: ctx.address ?? null,
      state: data.state ?? null,
      openItems: (findings ?? []).map((f) => f.claim as string),
      opportunityId: data.opportunity_id,
      operatorEmail: user.email,
    })
    if (send.ok) {
      const notifiedAt = new Date().toISOString()
      await supabase.from('planning_assessments').update({ planner_notified_at: notifiedAt }).eq('id', params.id)
      data.planner_notified_at = notifiedAt
    } else {
      console.error('[planning-assessment] planner email failed:', send.error)
    }
  }

  return NextResponse.json({ assessment: data })
}
