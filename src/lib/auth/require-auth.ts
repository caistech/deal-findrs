import { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { User, SupabaseClient } from '@supabase/supabase-js'

export type RequireAuthSuccess = {
  user: User
  supabase: SupabaseClient
  error?: never
}

export type RequireAuthFailure = {
  error: 'unauthenticated' | 'session_invalid'
  user?: never
  supabase?: never
}

/**
 * Verifies the request carries a valid Supabase session and returns a user-bound
 * Supabase client. Use this at the top of every authenticated API route handler.
 *
 *   const auth = await requireAuth(request)
 *   if (auth.error) return NextResponse.json({ error: auth.error }, { status: 401 })
 *   const { user, supabase } = auth
 *   // queries via `supabase` are scoped to the user via RLS
 *
 * The returned `supabase` client uses the user's JWT, so RLS policies become the
 * enforcement layer rather than manual `.eq('company_id', ...)` filters.
 */
export async function requireAuth(
  request: NextRequest
): Promise<RequireAuthSuccess | RequireAuthFailure> {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set() {
          // route handlers should set cookies via NextResponse if they need to;
          // for read-only auth verification this is a no-op.
        },
        remove() {},
      },
    }
  )

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error) {
    return { error: 'session_invalid' }
  }
  if (!user) {
    return { error: 'unauthenticated' }
  }

  return { user, supabase }
}
