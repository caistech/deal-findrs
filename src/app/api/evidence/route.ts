import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/require-auth'
import { getCompanyId } from '@/lib/auth/get-company-id'

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: 401 })
  const { user, supabase } = auth

  const company = await getCompanyId(supabase, user)
  if (company.error) return NextResponse.json({ error: company.error }, { status: 403 })

  const opportunityId = request.nextUrl.searchParams.get('opportunity_id')
  if (!opportunityId) return NextResponse.json({ error: 'opportunity_id_required' }, { status: 400 })

  // RLS scopes to user's company automatically
  const { data: evidence, error: evidenceErr } = await supabase
    .from('deal_evidence')
    .select('id, category, storage_path, original_filename, file_size_bytes, mime_type, extracted_fields, extraction_confidence, verified_by_user, received_at')
    .eq('opportunity_id', opportunityId)
    .order('received_at', { ascending: false })

  if (evidenceErr) return NextResponse.json({ error: 'db_error', detail: evidenceErr.message }, { status: 500 })

  const { data: links, error: linksErr } = await supabase
    .from('field_evidence_links')
    .select('id, claim_field, evidence_id, evidence_value_numeric, notes')
    .eq('opportunity_id', opportunityId)

  if (linksErr) return NextResponse.json({ error: 'db_error', detail: linksErr.message }, { status: 500 })

  return NextResponse.json({ evidence: evidence ?? [], links: links ?? [] })
}
