import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { requireAuth } from '@/lib/auth/require-auth'
import { getCompanyId } from '@/lib/auth/get-company-id'

const BUCKET = 'deal-evidence'

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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(request)
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: 401 })
  const { user, supabase } = auth

  const company = await getCompanyId(supabase, user)
  if (company.error) return NextResponse.json({ error: company.error }, { status: 403 })

  // RLS scopes to user's company
  const { data: evidence, error: lookupErr } = await supabase
    .from('deal_evidence')
    .select('id, storage_path, company_id')
    .eq('id', params.id)
    .single()

  if (lookupErr || !evidence) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  if (evidence.company_id !== company.companyId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  // Remove storage object first; if it fails the DB row stays so we can retry.
  const admin = getSupabaseAdmin()
  const { error: storageErr } = await admin.storage.from(BUCKET).remove([evidence.storage_path])
  if (storageErr) {
    console.error('[evidence/delete] storage remove error:', storageErr.message)
    return NextResponse.json({ error: 'storage_delete_failed', detail: storageErr.message }, { status: 500 })
  }

  // ON DELETE CASCADE on field_evidence_links removes link rows automatically.
  const { error: delErr } = await admin.from('deal_evidence').delete().eq('id', params.id)
  if (delErr) return NextResponse.json({ error: 'db_delete_failed', detail: delErr.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
