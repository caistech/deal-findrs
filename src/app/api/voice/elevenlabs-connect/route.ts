// POST /api/voice/elevenlabs-connect
//
// Server-side signed-URL endpoint for ElevenLabs ConvAI.
//
// SECURITY CONTRACT (VMS rules 9 + 11):
//   - requireAuth() verifies the user's session BEFORE issuing a signed URL.
//   - The operator ElevenLabs API key lives in ELEVENLABS_API_KEY (server-only).
//     No NEXT_PUBLIC_ELEVENLABS_API_KEY is used. The key is never in the client bundle.
//   - Agent IDs come from ELEVENLABS_AGENT_* (server-only env vars, not NEXT_PUBLIC_*).
//   - A voice_sessions row is written server-side, binding this conversation to the
//     verified user identity. Webhooks resolve identity via this table, never from
//     client-supplied metadata (VMS rule 9: identity server-derived via conversation_id).
//
// BYOK note: this is NOT BYOK per the end-user model (R6 §6). The operator
// holds the ElevenLabs key. BYOK here means the product key, not a per-user key.
// The portfolio standard requires the key to NOT be exposed client-side — that is
// the fix for blocking check #11. True end-user BYOK (each user providing their own
// ElevenLabs key) is deferred: see decisions.json.
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '@/lib/auth/require-auth'
import { getAgentConfig, type AgentType } from '@/lib/voice/voice.config'

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY

let _admin: ReturnType<typeof createClient> | null = null
function getAdmin() {
  if (!_admin) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) throw new Error('Supabase credentials not configured')
    _admin = createClient(url, key)
  }
  return _admin
}

interface ConnectBody {
  agentType: AgentType
  /** Optional opportunity context to bind to this voice session */
  opportunityId?: string
  assessmentId?: string
}

export async function POST(request: NextRequest) {
  // ── Auth: verify the user before issuing a signed URL ────────────────────────
  const auth = await requireAuth(request)
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: 401 })
  }
  const { user } = auth

  if (!ELEVENLABS_API_KEY) {
    console.error('[elevenlabs-connect] ELEVENLABS_API_KEY is not configured')
    return NextResponse.json(
      { error: 'Voice service not configured', message: 'Contact support.' },
      { status: 503 },
    )
  }

  let body: ConnectBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { agentType, opportunityId, assessmentId } = body

  if (!agentType) {
    return NextResponse.json({ error: 'agentType is required' }, { status: 400 })
  }

  // ── Resolve agent ID server-side ─────────────────────────────────────────────
  let agentId: string
  try {
    const config = getAgentConfig(agentType)
    agentId = config.agentId
  } catch {
    return NextResponse.json({ error: `Unknown agent type: ${agentType}` }, { status: 400 })
  }

  if (!agentId) {
    return NextResponse.json(
      { error: `Agent not provisioned: ${agentType}. Set ELEVENLABS_AGENT_${agentType.toUpperCase()} in env.` },
      { status: 503 },
    )
  }

  // ── Get signed URL from ElevenLabs ───────────────────────────────────────────
  const elevenRes = await fetch(
    `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${encodeURIComponent(agentId)}`,
    {
      method: 'GET',
      headers: { 'xi-api-key': ELEVENLABS_API_KEY },
    },
  )

  if (!elevenRes.ok) {
    const errorText = await elevenRes.text()
    console.error('[elevenlabs-connect] ElevenLabs API error:', elevenRes.status, errorText)
    if (elevenRes.status === 404) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }
    if (elevenRes.status === 401) {
      return NextResponse.json({ error: 'Voice service authentication failed' }, { status: 503 })
    }
    return NextResponse.json({ error: 'Failed to connect to voice service' }, { status: 503 })
  }

  const { signed_url: signedUrl } = await elevenRes.json()

  // ── Bind voice session server-side (VMS rule 9) ───────────────────────────────
  // ElevenLabs does not return the conversation_id until the WebSocket handshake.
  // We write a preliminary session row with a placeholder conversation_id and
  // update it when the client reports the conversation_id via the onConnect callback
  // (POST /api/voice/bind-session). The voice_session is what webhooks use to
  // resolve identity — NOT anything the client passes in conversation metadata.
  const admin = getAdmin()

  // Resolve company_id for this user
  const { data: company } = await admin
    .from('company_members')
    .select('company_id')
    .eq('user_id', user.id)
    .maybeSingle()

  const companyId = (company?.company_id as string | undefined) ?? null

  // Preliminary session — conversation_id updated by /api/voice/bind-session
  const sessionToken = crypto.randomUUID() as string
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 min TTL

  const { error: sessionError } = await admin.from('voice_sessions').insert({
    user_id: user.id,
    company_id: companyId,
    opportunity_id: opportunityId ?? null,
    assessment_id: assessmentId ?? null,
    conversation_id: sessionToken,   // placeholder; updated by bind-session
    agent_type: agentType,
    expires_at: expiresAt,
  } as never)

  if (sessionError) {
    // Non-fatal: log but don't block — the user can still start the voice call;
    // identity binding will just be unavailable for this session's webhook.
    console.warn('[elevenlabs-connect] voice_sessions insert failed (non-fatal):', sessionError.message)
  }

  return NextResponse.json({
    signedUrl,
    sessionToken, // client uses this to call /api/voice/bind-session after connecting
    agentType,
  })
}
