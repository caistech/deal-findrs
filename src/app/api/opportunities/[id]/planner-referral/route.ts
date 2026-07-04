import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { requireAuth } from '@/lib/auth/require-auth'
import { getCompanyId } from '@/lib/auth/get-company-id'
import { buildConstraintsYield } from '@/lib/estate-buildup/build'
import { retrievePlanning } from '@/lib/planning-kb/retrieve'
import { routePlanner, plannerLabel } from '@/lib/estate-team/route-planner'
import { notifyPlanner } from '@/lib/estate-team/planner-notify'
import type { TeamMember } from '@/lib/estate-team/types'

/** Active planners on a state's panel — the referral's routing candidates (id/name/firm/email). */
async function loadStatePlanners(supabase: SupabaseClient, state: string | null | undefined): Promise<TeamMember[]> {
  const { data } = await supabase.from('estate_team_members').select('*').eq('active', true).eq('occupation', 'planner')
  return routePlanner((data ?? []) as TeamMember[], state).candidates
}

/** Fetch the planner referral (assessment + findings) for an opportunity. */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(request)
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: 401 })
  const { user, supabase } = auth
  const company = await getCompanyId(supabase, user)
  if (company.error) return NextResponse.json({ error: company.error }, { status: 403 })

  const { data: assessment } = await supabase
    .from('planning_assessments')
    .select('*')
    .eq('opportunity_id', params.id)
    .maybeSingle()
  if (!assessment) return NextResponse.json({ assessment: null, findings: [], plannerCandidates: [] })

  const { data: findings } = await supabase
    .from('planning_findings')
    .select('*')
    .eq('assessment_id', assessment.id)
    .order('sort_order')
  const plannerCandidates = await loadStatePlanners(supabase, assessment.state)
  return NextResponse.json({ assessment, findings: findings ?? [], plannerCandidates })
}

/**
 * Create the planner referral for an opportunity whose buildup requires one (unresolved zone/yield).
 * Drafts KB-cited candidate findings via the shared planning-retrieve endpoint; where the state isn't
 * covered (no hits), the finding is flagged needs_human. Idempotent — returns the existing referral.
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(request)
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: 401 })
  const { user, supabase } = auth
  const company = await getCompanyId(supabase, user)
  if (company.error) return NextResponse.json({ error: company.error }, { status: 403 })

  const { data: opp, error: oppErr } = await supabase
    .from('opportunities')
    .select('id, name, address, city, state, property_profile')
    .eq('id', params.id)
    .single()
  if (oppErr || !opp) return NextResponse.json({ error: 'opportunity_not_found' }, { status: 404 })
  if (!opp.property_profile) return NextResponse.json({ error: 'no_profile' }, { status: 400 })

  const brief = buildConstraintsYield(opp.property_profile, {})
  if (!brief.requiresPlannerReferral) {
    return NextResponse.json({ error: 'no_referral_needed' }, { status: 400 })
  }

  // Idempotent — one referral per opportunity.
  const { data: existing } = await supabase
    .from('planning_assessments')
    .select('id')
    .eq('opportunity_id', opp.id)
    .maybeSingle()
  if (existing) {
    const { data: findings } = await supabase.from('planning_findings').select('*').eq('assessment_id', existing.id).order('sort_order')
    const { data: assessment } = await supabase.from('planning_assessments').select('*').eq('id', existing.id).single()
    const plannerCandidates = await loadStatePlanners(supabase, assessment?.state)
    return NextResponse.json({ assessment, findings: findings ?? [], plannerCandidates })
  }

  const profile = opp.property_profile as { metadata?: { lgaName?: string | null }; summary?: string }
  const lga = profile.metadata?.lgaName ?? null
  const addr = [opp.address, opp.city, opp.state].filter(Boolean).join(', ')
  const siteLabel = (opp.name as string) || addr || 'Estate site'

  // Route the referral to the state's planner panel (the planner slice of the team directory).
  const { data: dir } = await supabase.from('estate_team_members').select('*').eq('active', true).eq('occupation', 'planner')
  const route = routePlanner((dir ?? []) as TeamMember[], opp.state)

  const { data: assessment, error: aErr } = await supabase
    .from('planning_assessments')
    .insert({
      company_id: company.companyId,
      opportunity_id: opp.id,
      site_label: siteLabel,
      site_context: { address: addr, lga, summary: profile.summary ?? null },
      state: opp.state ?? null,
      lga,
      status: 'in_review',
      assigned_planner_id: route.assigned?.id ?? null,
      assigned_planner_name: route.assigned ? plannerLabel(route.assigned) : null,
      planner_gap: route.gap,
      created_by: user.id,
    })
    .select()
    .single()
  if (aErr) return NextResponse.json({ error: aErr.message }, { status: 500 })

  // Draft findings from the planner-referral gaps.
  const referralGaps = brief.gaps.filter((g) => g.provenance === 'planner-referral')
  const findingRows: Record<string, unknown>[] = []
  let sort = 0
  for (const gap of referralGaps) {
    let citations: unknown[] = []
    let needsHuman = true
    let rationale = 'No KB coverage for this state — planner determination required.'
    if (gap.dimension === 'zoning_use') {
      const hits = await retrievePlanning({ question: `Zoning and minimum lot size for ${addr}`, state: opp.state, lga })
      if (hits.length > 0) {
        citations = hits.map((h) => ({ title: h.title, source_url: h.source_url, version_date: h.version_date }))
        needsHuman = false
        rationale = 'KB context attached — planner to confirm the zone + minimum lot size.'
      }
    } else if (gap.dimension === 'density_yield') {
      rationale = 'Yield depends on the resolved zone + minimum lot size — set after zoning is confirmed.'
    }
    findingRows.push({
      assessment_id: assessment.id,
      dimension: gap.dimension,
      sort_order: sort++,
      claim: gap.label,
      ai_rationale: rationale,
      citations,
      confidence: needsHuman ? 'low' : 'medium',
      needs_human: needsHuman,
      status: 'ai_draft',
    })
  }
  if (findingRows.length) {
    const { data: inserted } = await supabase.from('planning_findings').insert(findingRows).select()
    for (const f of inserted ?? []) {
      await supabase.from('planning_finding_events').insert({
        finding_id: f.id, assessment_id: assessment.id, action: 'generate', to_status: 'ai_draft', ai_value: f.claim, actor: user.id,
      })
    }
  }

  // Email leg of the refer-to-planner push — notify the routed planner (non-fatal; observability only).
  let notifiedAt: string | null = null
  if (route.assigned?.email) {
    const send = await notifyPlanner({
      plannerName: route.assigned.name,
      plannerEmail: route.assigned.email,
      siteLabel,
      address: addr || null,
      state: opp.state ?? null,
      openItems: referralGaps.map((g) => g.label),
      opportunityId: opp.id,
      operatorEmail: user.email,
    })
    if (send.ok) {
      notifiedAt = new Date().toISOString()
      const { error: nErr } = await supabase.from('planning_assessments').update({ planner_notified_at: notifiedAt }).eq('id', assessment.id)
      if (nErr) console.error('[planner-referral] notified_at update failed:', nErr.message)
    } else {
      console.error('[planner-referral] planner email failed:', send.error)
    }
  }

  const { data: findings } = await supabase.from('planning_findings').select('*').eq('assessment_id', assessment.id).order('sort_order')
  return NextResponse.json({ assessment: { ...assessment, planner_notified_at: notifiedAt }, findings: findings ?? [], plannerCandidates: route.candidates })
}
