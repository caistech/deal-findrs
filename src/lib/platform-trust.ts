/**
 * Platform Trust — Self-contained trust client for DealFindrs
 *
 * Provides: trustGate (rate limit + permission), trustLog (audit), trustMeter (usage metering)
 * Env vars: PLATFORM_TRUST_SUPABASE_URL, PLATFORM_TRUST_SERVICE_KEY, PLATFORM_TRUST_PROJECT_ID
 *
 * Fail-open: if trust layer is not configured or any check errors, requests pass through.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// ── Config ──────────────────────────────────────────────────────
const TRUST_URL = () => process.env.PLATFORM_TRUST_SUPABASE_URL || ''
const TRUST_KEY = () => process.env.PLATFORM_TRUST_SERVICE_KEY || ''
const PROJECT_ID = () =>
  process.env.PLATFORM_TRUST_PROJECT_ID || '00b89fa6-7b7a-4c55-b339-9beb9bdba4ae'

let _client: SupabaseClient | null = null

function getClient(): SupabaseClient | null {
  if (!TRUST_URL() || !TRUST_KEY()) return null
  if (!_client) _client = createClient(TRUST_URL(), TRUST_KEY())
  return _client
}

function hashData(data: unknown): string | null {
  if (data === undefined || data === null) return null
  const json = typeof data === 'string' ? data : JSON.stringify(data)
  // Use Web Crypto for edge runtime compatibility
  const encoder = new TextEncoder()
  const bytes = encoder.encode(json)
  let hash = 0
  for (let i = 0; i < bytes.length; i++) {
    hash = ((hash << 5) - hash + bytes[i]) | 0
  }
  return `hash:${(hash >>> 0).toString(16).padStart(8, '0')}`
}

const WINDOW_SECONDS: Record<string, number> = { minute: 60, hour: 3600, day: 86400 }

// ── Rate Limit ──────────────────────────────────────────────────
async function checkRateLimit(
  client: SupabaseClient,
  agentId: string
): Promise<{ allowed: boolean; retry_after?: number }> {
  const { data: limits } = await client
    .from('rate_limits')
    .select('*')
    .eq('project_id', PROJECT_ID())
    .in('agent_id', [agentId, '*'])
    .order('window_type')

  if (!limits?.length) return { allowed: true }
  const now = new Date()

  for (const limit of limits) {
    const windowEnd = new Date(
      new Date(limit.window_start).getTime() + WINDOW_SECONDS[limit.window_type] * 1000
    )

    if (now >= windowEnd) {
      await client
        .from('rate_limits')
        .update({
          current_count: 1,
          window_start: now.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq('id', limit.id)
      continue
    }

    if (limit.current_count >= limit.max_requests) {
      return {
        allowed: false,
        retry_after: Math.ceil((windowEnd.getTime() - now.getTime()) / 1000),
      }
    }

    await client
      .from('rate_limits')
      .update({
        current_count: limit.current_count + 1,
        updated_at: now.toISOString(),
      })
      .eq('id', limit.id)
      .eq('current_count', limit.current_count) // optimistic lock
  }
  return { allowed: true }
}

// ── Permission ──────────────────────────────────────────────────
async function checkPermission(
  client: SupabaseClient,
  agentId: string,
  scope: string,
  operation: string
): Promise<{ allowed: boolean; requires_approval: boolean }> {
  const { data: policy } = await client
    .from('permission_policies')
    .select('*')
    .eq('project_id', PROJECT_ID())
    .in('agent_id', [agentId, '*'])
    .eq('scope', scope)
    .eq('operation', operation)
    .limit(1)
    .single()

  if (!policy) return { allowed: false, requires_approval: false }
  return { allowed: true, requires_approval: policy.requires_approval }
}

// ── Audit Log ───────────────────────────────────────────────────
async function logAudit(
  client: SupabaseClient,
  agentId: string,
  toolName: string,
  operationType: string,
  status: string,
  input?: unknown,
  output?: unknown,
  durationMs?: number
): Promise<string | null> {
  const { data } = await client
    .from('audit_log')
    .insert({
      project_id: PROJECT_ID(),
      agent_id: agentId,
      tool_name: toolName,
      operation_type: operationType,
      input_hash: hashData(input),
      output_hash: hashData(output),
      status,
      duration_ms: durationMs || null,
      requires_human_approval: status === 'pending_approval',
    } as never)
    .select('id')
    .single()
  return data?.id || null
}

// ── Public API ──────────────────────────────────────────────────

export type TrustOperation = 'read' | 'write' | 'delete'

export interface TrustGateResult {
  allowed: boolean
  reason?: 'rate_limited' | 'permission_denied' | 'pending_approval'
  retry_after?: number
  audit_id?: string | null
}

/**
 * trustGate — rate limit + permission + approval check.
 * Returns { allowed: true } if trust layer is not configured (fail open).
 */
export async function trustGate(
  scope: string,
  operation: TrustOperation,
  agentId: string = 'anonymous'
): Promise<TrustGateResult> {
  try {
    const client = getClient()
    if (!client) return { allowed: true }

    // 1. Rate limit
    const rateResult = await checkRateLimit(client, agentId)
    if (!rateResult.allowed) {
      await logAudit(client, agentId, scope, operation, 'rate_limited').catch(() => {})
      return { allowed: false, reason: 'rate_limited', retry_after: rateResult.retry_after }
    }

    // 2. Permission
    const permResult = await checkPermission(client, agentId, scope, operation)
    if (!permResult.allowed) {
      await logAudit(client, agentId, scope, operation, 'permission_denied').catch(() => {})
      return { allowed: false, reason: 'permission_denied' }
    }

    // 3. Approval gate
    if (permResult.requires_approval) {
      const auditId = await logAudit(client, agentId, scope, operation, 'pending_approval')
      return { allowed: false, reason: 'pending_approval', audit_id: auditId }
    }

    return { allowed: true }
  } catch (err) {
    // Fail open — log and allow
    console.error('[platform-trust] trustGate error, failing open:', err)
    return { allowed: true }
  }
}

/**
 * trustLog — write an audit event after an operation completes.
 */
export async function trustLog(
  scope: string,
  operation: TrustOperation,
  status: 'completed' | 'failed',
  options?: {
    agentId?: string
    input?: unknown
    output?: unknown
    durationMs?: number
  }
): Promise<string | null> {
  try {
    const client = getClient()
    if (!client) return null

    return await logAudit(
      client,
      options?.agentId || 'anonymous',
      scope,
      operation,
      status,
      options?.input,
      options?.output,
      options?.durationMs
    )
  } catch (err) {
    console.error('[platform-trust] trustLog error:', err)
    return null
  }
}

/**
 * trustMeter — record token/cost usage for an AI call.
 */
export async function trustMeter(
  model: string,
  inputTokens: number,
  outputTokens: number,
  options?: { agentId?: string; sessionId?: string }
): Promise<void> {
  try {
    const client = getClient()
    if (!client) return

    await client
      .from('metering_events')
      .insert({
        project_id: PROJECT_ID(),
        session_id: options?.sessionId || null,
        agent_id: options?.agentId || 'anonymous',
        model,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        cost_usd: 0, // pricing calculated server-side by platform-trust
      } as never)
  } catch (err) {
    console.error('[platform-trust] trustMeter error:', err)
  }
}
