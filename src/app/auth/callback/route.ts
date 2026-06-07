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
import { bootstrapCompany } from '@/lib/company/bootstrap'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  // Supabase v2 magic links use token_hash instead of code (bug-knowledge: sf-supabase-magic-link-token-hash)
  const tokenHash = url.searchParams.get('token_hash')
  const type = url.searchParams.get('type') as 'signup' | 'recovery' | 'email' | 'magiclink' | null
  const next = url.searchParams.get('next') || '/dashboard'

  // Sanity-check `next` is a same-origin path. Refuse anything that looks
  // like an open-redirect attempt (absolute URL, protocol-relative URL).
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard'

  if (!code && !tokenHash) {
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

  let exchangeData: { user: import('@supabase/supabase-js').User | null } | null = null
  let error: { message: string } | null = null

  if (tokenHash && type) {
    // Handle Supabase v2 magic link / OTP path
    const { data, error: otpError } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
    if (otpError) {
      error = otpError
    } else {
      exchangeData = data
    }
  } else if (code) {
    const { data, error: codeError } = await supabase.auth.exchangeCodeForSession(code)
    if (codeError) {
      error = codeError
    } else {
      exchangeData = data
    }
  }

  if (error) {
    console.error('[auth/callback] exchange failed:', error.message)
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error.message)}`, request.url)
    )
  }

  // §8: guarantee a personal company the moment the account is usable. This is
  // the reliable bootstrap point for the email-confirmation signup path —
  // without it, a confirmed user who heads straight to the deal wizard hits a
  // silent 403 on POST /api/opportunities/draft (no company_id linked).
  // Idempotent: a no-op for magic-link/password-reset of an existing user.
  const sessionUser = (exchangeData as { user?: import('@supabase/supabase-js').User } | null)?.user
  if (sessionUser) {
    try {
      await bootstrapCompany(sessionUser)
    } catch (bootstrapErr) {
      // Non-fatal: /setup and /api/company/create retry this idempotently.
      console.error(
        '[auth/callback] company bootstrap failed (non-fatal):',
        bootstrapErr instanceof Error ? bootstrapErr.message : bootstrapErr
      )
    }
  }

  return NextResponse.redirect(new URL(safeNext, request.url))
}
