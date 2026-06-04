/**
 * DealFindrs — Next.js Middleware
 *
 * Two responsibilities:
 *   1. Refresh the Supabase session on every request (mandatory for the
 *      @supabase/ssr cookie-based session model — without this, server
 *      components and route handlers can't read the user).
 *   2. Apply the platform-trust gate (rate limit, permission, audit) to
 *      `/api/*` routes. Fails open if trust env vars are not set.
 *   3. Redirect unauthenticated users away from auth-gated UI paths,
 *      and redirect authenticated users away from /login and /signup.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { trustGate, trustLog, type TrustContext, type TrustOperation } from '@/lib/platform-trust'
import { isAdminEmail } from '@/lib/auth/admin-emails'

// ── Auth-gated UI prefixes ──────────────────────────────────────
// Any URL starting with one of these requires an active Supabase session.
// If no session is present, the user is redirected to /login.
// NOTE: /admin is intentionally NOT here — admin routes are governed by the
// dedicated admin gate (isAdminPath, below), which both enforces the
// ADMIN_EMAILS allowlist AND keeps /admin/login publicly reachable. Listing
// /admin here would (incorrectly) bounce the logged-out admin login page to
// the user /login.
const AUTH_GATED_PREFIXES = [
  '/dashboard',
  '/opportunities',
  '/settings',
  '/team',
  '/analytics',
  '/setup',
  '/onboarding',
]

function isAuthGated(pathname: string): boolean {
  return AUTH_GATED_PREFIXES.some(p => pathname === p || pathname.startsWith(p + '/'))
}

// ── Admin-only UI gate ──────────────────────────────────────────
// Everything under /admin requires an ADMIN_EMAILS-allowlisted session, EXCEPT
// /admin/login itself (the unauthenticated entry point). Without this, any
// logged-in non-admin user could load /admin and reach the user-creation,
// ElevenLabs and Stripe config screens — privilege escalation (VT_B2).
function isAdminPath(pathname: string): boolean {
  if (pathname === '/admin/login' || pathname.startsWith('/admin/login/')) return false
  return pathname === '/admin' || pathname.startsWith('/admin/')
}

// ── Platform-trust scope rules (unchanged) ──────────────────────
interface ScopeRule {
  pattern: string
  scope: string
  operation: TrustOperation
  getIsRead?: boolean
}

const SCOPE_RULES: ScopeRule[] = [
  { pattern: '/api/opportunities', scope: 'opportunities', operation: 'write', getIsRead: true },
  { pattern: '/api/devfinance',    scope: 'devfinance',    operation: 'write' },
  { pattern: '/api/voice',         scope: 'voice',         operation: 'write' },
  { pattern: '/api/webhooks',      scope: 'webhooks',      operation: 'write' },
  { pattern: '/api/company',       scope: 'company',       operation: 'write' },
  { pattern: '/api/admin',         scope: 'admin',         operation: 'write' },
  { pattern: '/api/stripe',        scope: 'billing',       operation: 'write' },
  { pattern: '/api/assess',        scope: 'assessment',    operation: 'write' },
  { pattern: '/api/generate-im',   scope: 'assessment',    operation: 'write' },
  { pattern: '/api/onboarding',    scope: 'onboarding',    operation: 'write' },
  { pattern: '/api/site-intel',    scope: 'onboarding',    operation: 'write' },
  { pattern: '/api/abn-lookup',    scope: 'opportunities', operation: 'read' },
]

function matchRule(pathname: string): ScopeRule | null {
  return SCOPE_RULES.find((r) => pathname.startsWith(r.pattern)) || null
}

// ── Middleware ──────────────────────────────────────────────────
export async function middleware(request: NextRequest) {
  const pathname = new URL(request.url).pathname

  // Build a response we can mutate cookies on. The @supabase/ssr session
  // refresh writes new auth cookies via `response.cookies.set` — we have
  // to keep this `response` reference live and pass through the same one.
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  // ── Supabase session refresh (every request) ────────────────
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          request.cookies.set({ name, value, ...(options as any) })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value, ...(options as any) })
        },
        remove(name: string, options: Record<string, unknown>) {
          request.cookies.set({ name, value: '', ...(options as any) })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value: '', ...(options as any) })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // ── Admin UI routes: require an allowlisted admin session ───
  // Checked BEFORE the generic auth gate so unauthenticated admins land on the
  // admin login (not the user login), and authenticated non-admins are bounced
  // to their dashboard rather than seeing the control panel.
  if (isAdminPath(pathname)) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/admin/login'
      url.searchParams.set('next', pathname)
      return NextResponse.redirect(url)
    }
    if (!isAdminEmail(user.email)) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      url.searchParams.set('error', 'admin_only')
      return NextResponse.redirect(url)
    }
  }

  // ── Auth-gated UI routes: redirect to /login if no user ─────
  if (isAuthGated(pathname) && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  // Logged-in users on /login or /signup → /dashboard
  if (user && (pathname === '/login' || pathname === '/signup')) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // ── Platform-trust gate (only for /api/* with a matching rule) ──
  if (pathname.startsWith('/api/')) {
    const rule = matchRule(pathname)
    if (rule) {
      const operation: TrustOperation =
        rule.getIsRead && request.method === 'GET' ? 'read' : rule.operation

      const agentId = request.headers.get('x-agent-id') || 'anonymous'

      const ctx: TrustContext = {
        agent_id: agentId,
        tool_name: pathname,
        operation_type: operation,
        scope: rule.scope,
      }

      const result = await trustGate(ctx)

      if (!result.allowed) {
        if (result.retry_after !== undefined) {
          return NextResponse.json(
            { error: 'Rate limit exceeded', retry_after: result.retry_after },
            { status: 429, headers: { 'Retry-After': String(result.retry_after) } }
          )
        }
        return NextResponse.json(
          { error: `Permission denied: ${rule.scope}/${operation}`, reason: result.denial_reason },
          { status: 403 }
        )
      }

      if (result.requires_approval) {
        return NextResponse.json(
          {
            error: 'Approval required',
            audit_id: result.audit_id,
            approve_at: 'platform-trust.vercel.app/dashboard/approvals',
          },
          { status: 202 }
        )
      }

      // Fire-and-forget audit log for successful pass-through
      trustLog(ctx, undefined, 0).catch(() => {})
    }
  }

  return response
}

export const config = {
  matcher: [
    // Match every path EXCEPT static assets, _next internals, and image files.
    // We need to run on UI routes (for session refresh + auth gate) and API
    // routes (for platform-trust + session refresh).
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
