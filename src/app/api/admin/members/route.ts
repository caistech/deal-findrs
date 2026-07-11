import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/require-admin'

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
 * Admin Members — every membership across the platform: user email, the company they belong to,
 * their role, whether it's their primary org, and when they joined; plus pending invites. Read-only.
 */
export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (admin.error) {
    return NextResponse.json({ error: admin.error }, { status: admin.error === 'forbidden' ? 403 : 401 })
  }

  try {
    const supabase = getSupabaseAdmin()

    const [{ data: memberships, error: mErr }, { data: companies, error: cErr }, usersRes] = await Promise.all([
      supabase
        .from('company_memberships')
        .select('id, user_id, company_id, role, is_primary, joined_at')
        .order('joined_at', { ascending: false }),
      supabase.from('companies').select('id, name'),
      supabase.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    ])
    if (mErr) throw mErr
    if (cErr) throw cErr

    const companyName = new Map<string, string>()
    for (const c of (companies ?? []) as Array<{ id: string; name: string }>) companyName.set(c.id, c.name)
    const email = new Map<string, string>()
    for (const u of usersRes.data?.users ?? []) email.set(u.id, u.email ?? '(no email)')

    const members = ((memberships ?? []) as Array<Record<string, unknown>>).map((m) => ({
      id: m.id,
      email: email.get(m.user_id as string) ?? '(unknown user)',
      company: companyName.get(m.company_id as string) ?? '(unknown company)',
      role: m.role,
      isPrimary: m.is_primary,
      joinedAt: m.joined_at,
    }))

    // Pending invites (best-effort — table may be empty).
    const { data: invites } = await supabase
      .from('company_invites')
      .select('id, email, role, status, expires_at, company_id')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    const pendingInvites = ((invites ?? []) as Array<Record<string, unknown>>).map((i) => ({
      id: i.id,
      email: i.email,
      role: i.role,
      company: companyName.get(i.company_id as string) ?? '(unknown company)',
      expiresAt: i.expires_at,
    }))

    return NextResponse.json({ success: true, members, pendingInvites, total: members.length })
  } catch (error) {
    console.error('Admin members error:', error)
    return NextResponse.json({ error: 'Failed to load members' }, { status: 500 })
  }
}
