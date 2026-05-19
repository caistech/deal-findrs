import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { requireAuth } from '@/lib/auth/require-auth'
import { getCompanyId } from '@/lib/auth/get-company-id'
import {
  EVIDENCE_CATEGORIES,
  resolveClaimField,
  type EvidenceCategory,
  type ClaimField,
} from '@/lib/feasibility/evidence/categories'

const BUCKET = 'deal-evidence'
const MAX_BYTES = 50 * 1024 * 1024 // 50 MB

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

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: 401 })
  const { user, supabase } = auth

  const company = await getCompanyId(supabase, user)
  if (company.error) return NextResponse.json({ error: company.error }, { status: 403 })

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ error: 'invalid_multipart' }, { status: 400 })
  }

  const file = form.get('file')
  const opportunityId = form.get('opportunity_id')
  const category = form.get('category')
  const evidenceValue = form.get('evidence_value_numeric')
  const pickedField = form.get('claim_field')

  if (!(file instanceof File))            return NextResponse.json({ error: 'file_required' }, { status: 400 })
  if (typeof opportunityId !== 'string')  return NextResponse.json({ error: 'opportunity_id_required' }, { status: 400 })
  if (typeof category !== 'string' || !EVIDENCE_CATEGORIES.includes(category as EvidenceCategory)) {
    return NextResponse.json({ error: 'invalid_category', allowed: EVIDENCE_CATEGORIES }, { status: 400 })
  }
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'file_too_large', maxBytes: MAX_BYTES }, { status: 413 })
  if (file.size === 0)        return NextResponse.json({ error: 'empty_file' }, { status: 400 })

  // Verify the opportunity belongs to the user's company (RLS would also catch this,
  // but the explicit check gives a clearer error than a permission denied at storage time).
  const { data: opp, error: oppErr } = await supabase
    .from('opportunities')
    .select('id, company_id')
    .eq('id', opportunityId)
    .single()
  if (oppErr || !opp)                           return NextResponse.json({ error: 'opportunity_not_found' }, { status: 404 })
  if (opp.company_id !== company.companyId)     return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  // Storage path: company/opportunity/timestamp_filename — keeps everything per-tenant.
  const safeName = file.name.replace(/[^a-zA-Z0-9_.\-]/g, '_').slice(0, 120)
  const storagePath = `${company.companyId}/${opportunityId}/${Date.now()}_${safeName}`

  const admin = getSupabaseAdmin()
  const fileBuffer = Buffer.from(await file.arrayBuffer())

  const { error: upErr } = await admin.storage
    .from(BUCKET)
    .upload(storagePath, fileBuffer, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    })

  if (upErr) {
    console.error('[evidence/upload] storage error:', upErr.message)
    return NextResponse.json({ error: 'upload_failed', detail: upErr.message }, { status: 500 })
  }

  // Insert deal_evidence row
  const { data: evidenceRow, error: insErr } = await admin
    .from('deal_evidence')
    .insert({
      opportunity_id: opportunityId,
      company_id: company.companyId,
      category,
      storage_path: storagePath,
      original_filename: file.name,
      file_size_bytes: file.size,
      mime_type: file.type || null,
      extracted_fields: {},
      extraction_confidence: null,
      extraction_model: null,
      uploader_id: user.id,
    } as never)
    .select()
    .single()

  if (insErr || !evidenceRow) {
    // Roll back the storage upload on DB failure so we don't orphan files.
    await admin.storage.from(BUCKET).remove([storagePath])
    console.error('[evidence/upload] db insert error:', insErr?.message)
    return NextResponse.json({ error: 'db_insert_failed', detail: insErr?.message }, { status: 500 })
  }

  // Auto-link to claim field when the category unambiguously backs one.
  const claimField = resolveClaimField(
    category as EvidenceCategory,
    typeof pickedField === 'string' ? (pickedField as ClaimField) : undefined
  )

  if (claimField) {
    const numericValue = evidenceValue && typeof evidenceValue === 'string'
      ? Number(evidenceValue)
      : null

    const { error: linkErr } = await admin
      .from('field_evidence_links')
      .insert({
        opportunity_id: opportunityId,
        claim_field: claimField,
        evidence_id: (evidenceRow as { id: string }).id,
        evidence_value_numeric: Number.isFinite(numericValue) ? numericValue : null,
        created_by: user.id,
      } as never)

    if (linkErr) {
      console.error('[evidence/upload] link insert error:', linkErr.message)
      // Don't unwind — the evidence is uploaded; the user can re-link manually.
    }
  }

  return NextResponse.json({
    success: true,
    evidence: {
      id: (evidenceRow as { id: string }).id,
      category,
      claim_field: claimField,
      storage_path: storagePath,
      original_filename: file.name,
      file_size_bytes: file.size,
    },
  })
}

export async function GET() {
  return NextResponse.json({
    message: 'POST multipart/form-data with: file, opportunity_id, category, [claim_field], [evidence_value_numeric]',
    categories: EVIDENCE_CATEGORIES,
  })
}
