import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/require-auth'
import { isAdminEmail } from '@/lib/auth/admin-emails'
import type { User, SupabaseClient } from '@supabase/supabase-js'

export type RequireAdminSuccess = {
  user: User
  supabase: SupabaseClient
  error?: never
}

export type RequireAdminFailure = {
  error: 'unauthenticated' | 'session_invalid' | 'forbidden'
  user?: never
  supabase?: never
}

/**
 * Verifies the request carries a valid session AND the session's email is on the
 * ADMIN_EMAILS allowlist. This is the route-level half of the defence-in-depth
 * admin gate — the middleware blocks the `/admin/*` UI, but the API routes behind
 * those screens (create-user, setup-elevenlabs, setup-stripe) are reachable
 * directly, so they MUST verify admin status themselves.
 *
 *   const admin = await requireAdmin(request)
 *   if (admin.error) {
 *     const status = admin.error === 'forbidden' ? 403 : 401
 *     return NextResponse.json({ error: admin.error }, { status })
 *   }
 */
export async function requireAdmin(
  request: NextRequest
): Promise<RequireAdminSuccess | RequireAdminFailure> {
  const auth = await requireAuth(request)
  if (auth.error) return { error: auth.error }

  if (!isAdminEmail(auth.user.email)) {
    return { error: 'forbidden' }
  }

  return { user: auth.user, supabase: auth.supabase }
}
