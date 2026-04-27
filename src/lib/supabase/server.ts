import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Server-side Supabase client for App Router server components and route handlers.
 * Reads the user's session cookie and binds queries to that user, so RLS policies
 * are the enforcement layer (not manual `.eq('user_id', ...)`).
 *
 * Use this in:
 *   - Server components that need to read user data
 *   - API route handlers that should run as the authenticated user
 *
 * Use src/lib/supabase/client.ts (createBrowserClient) in 'use client' components.
 * Use the service-role admin client only when you genuinely need to bypass RLS
 * (e.g. webhook handlers, magic-link external portal).
 */
export function createClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch {
            // Server Components cannot set cookies; this is fine when middleware
            // is refreshing the session on every request.
          }
        },
        remove(name: string, options: Record<string, unknown>) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch {
            // Same as set.
          }
        },
      },
    }
  )
}
