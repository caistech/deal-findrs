/**
 * GET /api/company/settings-read
 *
 * Returns the company_settings row for the authenticated user's company.
 * Used by /setup to hydrate the form with saved criteria.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { requireAuth } from '@/lib/auth/require-auth'
import { getCompanyId } from '@/lib/auth/get-company-id'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

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

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: 401 })

  const company = await getCompanyId(auth.supabase, auth.user)
  if (company.error) return NextResponse.json({ settings: null })

  const admin = getAdmin()
  const { data: settings } = await admin
    .from('company_settings')
    .select('min_gm_green, min_gm_amber, critical_criteria, derisk_factors')
    .eq('company_id', company.companyId)
    .single()

  return NextResponse.json({ settings: settings || null })
}
