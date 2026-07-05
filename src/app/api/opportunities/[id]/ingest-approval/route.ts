import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/require-auth'
import { getCompanyId } from '@/lib/auth/get-company-id'
import { pdfToText } from '@/lib/document-ingest/pdf'
import { extractApprovalFromText } from '@/lib/document-ingest/extract'
import { stageGateFromApproval, mergeStageGates, deriveLifecycleStatus, outstandingGates, assignStage } from '@/lib/document-ingest/stage-gate'
import { emptyStageGate } from '@caistech/deal-model'
import type { StageGateTicks } from '@caistech/deal-model'
import type { IngestResult } from '@/lib/document-ingest/types'

/**
 * Ingest a development document (Phase 1: a WAPC subdivision-approval letter / plan) to establish
 * the opportunity's evidence-derived current status. Extracts the approved yield + conditions,
 * ticks the stage gates the document evidences, rolls them up (assignStage + lifecycle ladder), and
 * — for an approval — RESOLVES the planner referral (planning_assessments status='approved' with the
 * approved lots + min lot size) so the Constraints & Yield buildup + the review packs go authoritative.
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(request)
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: 401 })
  const { user, supabase } = auth
  const company = await getCompanyId(supabase, user)
  if (company.error) return NextResponse.json({ error: company.error }, { status: 403 })

  // Accept the uploaded PDF as multipart form-data.
  let buffer: ArrayBuffer
  let filename: string | null = null
  let kind = 'wapc_subdivision_approval'
  try {
    const form = await request.formData()
    const file = form.get('file')
    if (!(file instanceof File)) return NextResponse.json({ error: 'no_file' }, { status: 400 })
    filename = file.name
    const k = form.get('kind')
    if (typeof k === 'string' && k) kind = k
    buffer = await file.arrayBuffer()
  } catch {
    return NextResponse.json({ error: 'invalid_upload' }, { status: 400 })
  }

  const { data: opp, error: oppErr } = await supabase
    .from('opportunities')
    .select('id, name, address, city, state, stage_gate')
    .eq('id', params.id)
    .single()
  if (oppErr || !opp) return NextResponse.json({ error: 'opportunity_not_found' }, { status: 404 })

  // Extract → structured approval.
  let text: string
  try {
    text = await pdfToText(buffer)
  } catch {
    return NextResponse.json({ error: 'pdf_parse_failed' }, { status: 422 })
  }
  if (!text.trim()) return NextResponse.json({ error: 'pdf_empty' }, { status: 422 })

  let extracted
  try {
    extracted = await extractApprovalFromText(text)
  } catch (e) {
    return NextResponse.json({ error: 'extraction_failed', detail: (e as Error).message }, { status: 502 })
  }

  // Stage gate this document evidences, merged with what prior documents already established.
  const docGate = stageGateFromApproval(extracted)
  const priorGate = (opp.stage_gate as StageGateTicks | null) ?? emptyStageGate()
  const merged = mergeStageGates([priorGate, docGate])
  const dealModelStage = assignStage(merged)
  const lifecycle = deriveLifecycleStatus(merged)
  const outstanding = outstandingGates(merged)

  // Persist the document record.
  const { error: docErr } = await supabase.from('development_documents').insert({
    company_id: company.companyId,
    opportunity_id: opp.id,
    kind,
    filename,
    extracted,
    stage_gate: docGate,
    conditions: extracted.conditions,
    created_by: user.id,
  })
  if (docErr) return NextResponse.json({ error: docErr.message }, { status: 500 })

  // Roll the derived status up onto the opportunity + carry the approved yield as the fallback.
  const oppUpdate: Record<string, unknown> = {
    stage_gate: merged,
    deal_model_stage: dealModelStage,
    lifecycle_status: lifecycle.status,
  }
  if (extracted.residentialLots != null) oppUpdate.num_lots = extracted.residentialLots
  const { error: updErr } = await supabase.from('opportunities').update(oppUpdate).eq('id', opp.id)
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })

  // Resolve the planner referral from the approval — the authoritative yield the buildup couldn't derive.
  let referralCleared = false
  if (extracted.residentialLots != null) {
    const { data: existing } = await supabase
      .from('planning_assessments')
      .select('id')
      .eq('opportunity_id', opp.id)
      .maybeSingle()
    const resolution = {
      status: 'approved' as const,
      resolved_lots: extracted.residentialLots,
      resolved_min_lot_size: extracted.minLotSizeSqm,
      resolved_zone_code: extracted.wapcRef ? `Approved plan (WAPC ${extracted.wapcRef})` : null,
    }
    if (existing) {
      const { error } = await supabase.from('planning_assessments').update(resolution).eq('id', existing.id)
      referralCleared = !error
    } else {
      const addr = [opp.address, opp.city, opp.state].filter(Boolean).join(', ')
      const { error } = await supabase.from('planning_assessments').insert({
        company_id: company.companyId,
        opportunity_id: opp.id,
        site_label: (opp.name as string) || addr || 'Estate site',
        site_context: { address: addr, source: 'wapc_approval', wapcRef: extracted.wapcRef },
        state: opp.state ?? null,
        lga: extracted.lga,
        created_by: user.id,
        ...resolution,
      })
      referralCleared = !error
    }
  }

  const result: IngestResult = {
    kind: kind as IngestResult['kind'],
    extracted,
    stageGate: merged,
    dealModelStage,
    lifecycleStatus: lifecycle.status,
    lifecycleLabel: lifecycle.label,
    outstanding,
    referralCleared,
  }
  return NextResponse.json(result)
}
