/**
 * DealFindrs — Next.js Middleware
 *
 * Applies platform-trust gate (rate limit, permission, audit) to all /api/* routes.
 * Fails open: if trust env vars are not set, all requests pass through.
 */
import { NextRequest, NextResponse } from 'next/server'
import { trustGate, trustLog, type TrustOperation } from '@/lib/platform-trust'

// ── Scope rules ─────────────────────────────────────────────────
interface ScopeRule {
  pattern: string
  scope: string
  /** Default operation. GET overrides to 'read' for routes that support it. */
  operation: TrustOperation
  /** If true, GET requests use 'read' instead of the default operation */
  getIsRead?: boolean
}

const SCOPE_RULES: ScopeRule[] = [
  // Order matters: more specific patterns first
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

// ── Middleware ───────────────────────────────────────────────────
export async function middleware(request: NextRequest) {
  const pathname = new URL(request.url).pathname

  // Only apply to /api/* routes
  if (!pathname.startsWith('/api/')) return NextResponse.next()

  const rule = matchRule(pathname)
  if (!rule) return NextResponse.next()

  // Determine operation: GET -> read for routes that support it
  const operation: TrustOperation =
    rule.getIsRead && request.method === 'GET' ? 'read' : rule.operation

  const agentId = request.headers.get('x-agent-id') || 'anonymous'

  const result = await trustGate(rule.scope, operation, agentId)

  if (!result.allowed) {
    if (result.reason === 'rate_limited') {
      return NextResponse.json(
        { error: 'Rate limit exceeded', retry_after: result.retry_after },
        { status: 429, headers: { 'Retry-After': String(result.retry_after || 60) } }
      )
    }

    if (result.reason === 'permission_denied') {
      return NextResponse.json(
        { error: `Permission denied: ${rule.scope}/${operation}` },
        { status: 403 }
      )
    }

    if (result.reason === 'pending_approval') {
      return NextResponse.json(
        {
          error: 'Approval required',
          audit_id: result.audit_id,
          approve_at: 'platform-trust.vercel.app/dashboard/approvals',
        },
        { status: 202 }
      )
    }
  }

  // Fire-and-forget audit log for successful pass-through
  trustLog(rule.scope, operation, 'completed', { agentId }).catch(() => {})

  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*',
}
