import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/require-admin'

// Admin data, read per-request with a caller-scoped auth check — never a build-time artifact.
// Without this Next tries to PRERENDER the route, which runs getSupabaseAdmin() at build time with
// no env and fails the build ("Your project's URL and Key are required to create a Supabase
// client"). Same class as the ABN-lookup route note in SHARED_SERVICES.md.
export const dynamic = 'force-dynamic'


// Lazy service-role client (see create-user/route.ts for why it's not module-scope).
let _admin: ReturnType<typeof createClient> | null = null
function getSupabaseAdmin() {
  if (!_admin) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) throw new Error('Supabase credentials not configured')
    _admin = createClient(url, key)
  }
  return _admin
}

/**
 * Admin Tenancy — the operator's view of every organisation (company) on the platform:
 * name, ABN, subscription tier/status, and how many members it has. Read-only.
 */
export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (admin.error) {
    return NextResponse.json({ error: admin.error }, { status: admin.error === 'forbidden' ? 403 : 401 })
  }

  try {
    const supabase = getSupabaseAdmin()

    const { data: companies, error: cErr } = await supabase
      .from('companies')
      .select('id, name, slug, abn, subscription_tier, subscription_status, trial_ends_at, created_at')
      .order('created_at', { ascending: false })
    if (cErr) throw cErr

    // Member counts per company (tally in JS — modest row counts).
    const { data: memberships, error: mErr } = await supabase
      .from('company_memberships')
      .select('company_id')
    if (mErr) throw mErr

    const counts = new Map<string, number>()
    for (const m of (memberships ?? []) as Array<{ company_id: string }>) {
      counts.set(m.company_id, (counts.get(m.company_id) ?? 0) + 1)
    }

    const tenancy = ((companies ?? []) as Array<Record<string, unknown>>).map((c) => ({
      ...c,
      memberCount: counts.get(c.id as string) ?? 0,
    }))

    return NextResponse.json({ success: true, tenancy, total: tenancy.length })
  } catch (error) {
    console.error('Admin tenancy error:', error)
    return NextResponse.json({ error: 'Failed to load tenancy' }, { status: 500 })
  }
}
