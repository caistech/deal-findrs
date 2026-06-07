/**
 * POST /api/company/settings
 *
 * Upserts the company_settings row for the authenticated user's company.
 * Uses the service-role client so the write succeeds even if the user's
 * RLS policy on company_settings doesn't allow the UPDATE (the user is
 * the company owner, so they should be able to write, but bootstrap timing
 * means the row may not exist yet → must use upsert not update).
 *
 * This is called from /setup — replaces the direct supabase.update() call
 * that was silently failing when the company_settings row didn't exist yet.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { requireAuth } from '@/lib/auth/require-auth'
import { getCompanyId } from '@/lib/auth/get-company-id'

export const dynamic = 'force-dynamic'

let _admin: SupabaseClient | null = null
function getAdmin(): SupabaseClient {
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

  const company = await getCompanyId(auth.supabase, auth.user)
  if (company.error) return NextResponse.json({ error: company.error }, { status: 403 })

  const body = await request.json().catch(() => ({}))
  const { min_gm_green, min_gm_amber, critical_criteria, derisk_factors } = body as {
    min_gm_green?: number
    min_gm_amber?: number
    critical_criteria?: unknown[]
    derisk_factors?: unknown[]
  }

  if (min_gm_green === undefined && min_gm_amber === undefined &&
      critical_criteria === undefined && derisk_factors === undefined) {
    return NextResponse.json({ error: 'No settings fields provided' }, { status: 400 })
  }

  const writeData: Record<string, unknown> = {
    company_id: company.companyId,
  }
  if (min_gm_green !== undefined) writeData.min_gm_green = min_gm_green
  if (min_gm_amber !== undefined) writeData.min_gm_amber = min_gm_amber
  if (critical_criteria !== undefined) writeData.critical_criteria = critical_criteria
  if (derisk_factors !== undefined) writeData.derisk_factors = derisk_factors

  const admin = getAdmin()
  const { error: upsertError } = await admin
    .from('company_settings')
    .upsert(writeData as never, { onConflict: 'company_id' })

  if (upsertError) {
    console.error('[api/company/settings] upsert failed:', upsertError.message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
