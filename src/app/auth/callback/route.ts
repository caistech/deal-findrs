/**
 * /auth/callback — Supabase email-link handler.
 *
 * All Supabase email links (signup confirmation, magic link, password reset)
 * land here with a `code` query param. We exchange that for a real session
 * (writing the auth cookies via @supabase/ssr), then redirect to either the
 * caller-provided `next` path or /dashboard.
 *
 * Recovery flow:    /auth/callback?code=…&next=/reset-password
 * Signup confirm:   /auth/callback?code=…       (no next — defaults to /dashboard)
 * Magic link:       /auth/callback?code=…&next=/dashboard
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const next = url.searchParams.get('next') || '/dashboard'

  // Sanity-check `next` is a same-origin path. Refuse anything that looks
  // like an open-redirect attempt (absolute URL, protocol-relative URL).
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard'

  if (!code) {
    return NextResponse.redirect(
      new URL('/login?error=missing_code', request.url)
    )
  }

  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: Record<string, unknown>) {
          cookieStore.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('[auth/callback] exchange failed:', error.message)
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error.message)}`, request.url)
    )
  }

  return NextResponse.redirect(new URL(safeNext, request.url))
}
