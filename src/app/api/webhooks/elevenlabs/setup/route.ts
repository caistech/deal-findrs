// POST /api/webhooks/elevenlabs/setup
//
// Post-call webhook for the company-setup voice agent.
//
// SECURITY CONTRACT (VMS rules 9 + 10):
//   - HMAC verified BEFORE any processing. Unverified → 401. (rule 10)
//   - Identity is server-derived via conversation_id lookup in voice_sessions,
//     NOT from client-supplied metadata.user_id/company_id. (rule 9)
//   - If no valid voice_session exists for this conversation_id, we log the
//     transcript (for audit) but do NOT write settings (no spoofing path).
//
// Cache directives: this route writes live state — force-dynamic so Next.js
// does not serve a stale response from its server-side fetch cache.
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { verifyElevenLabsWebhook } from '@/lib/elevenlabs/webhook-verify'

let _supabaseAdmin: SupabaseClient | null = null

function getSupabaseAdmin(): SupabaseClient {
  if (!_supabaseAdmin) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) throw new Error('Supabase credentials not configured')
    _supabaseAdmin = createClient(url, key)
  }
  return _supabaseAdmin
}

interface ElevenLabsWebhookPayload {
  conversation_id: string
  agent_id: string
  status: 'completed' | 'failed' | 'in_progress'
  transcript: Array<{
    role: 'agent' | 'user'
    message: string
    timestamp: string
  }>
  extracted_data?: {
    type: string
    data: Record<string, unknown>
  }
  duration_seconds?: number
}

export async function POST(request: NextRequest) {
  // ── STEP 1: HMAC verification — MUST happen before any body parse or DB write ──
  const verified = await verifyElevenLabsWebhook(request)
  if (!verified.ok) {
    console.error('[webhook/setup] HMAC verification failed:', verified.error)
    return NextResponse.json({ error: verified.error }, { status: verified.status })
  }

  let payload: ElevenLabsWebhookPayload
  try {
    payload = JSON.parse(verified.body)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()
  const conversationId = payload.conversation_id

  console.log('[webhook/setup] received conversation_id:', conversationId)

  // ── STEP 2: Server-derived identity via conversation_id ────────────────────────
  // Identity is NEVER read from payload.metadata (client-controlled). Instead we
  // look up the voice_session that was bound server-side when the signed URL was issued.
  const { data: session } = await supabase
    .from('voice_sessions')
    .select('user_id, company_id')
    .eq('conversation_id', conversationId)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  const userId = session?.user_id as string | undefined
  const companyId = session?.company_id as string | undefined

  // ── STEP 3: Always log the transcript for the audit trail ──────────────────────
  await logTranscript(supabase, payload, 'setup', companyId, userId)

  // ── STEP 4: Apply business logic only when we have a verified session ──────────
  const extractedData = payload.extracted_data || extractDataFromTranscript(payload.transcript)

  if (!extractedData || extractedData.type !== 'setup_complete') {
    return NextResponse.json({ status: 'transcript_logged' })
  }

  if (!companyId) {
    // No valid session bound — transcript is logged but we won't write settings
    // (prevents spoofing via a forged but HMAC-valid payload with a guessed conversation_id)
    console.warn('[webhook/setup] no valid voice_session for conversation_id:', conversationId)
    return NextResponse.json({ status: 'transcript_logged_no_session' })
  }

  const { data: settingsData } = extractedData

  // Update company_settings with the extracted configuration
  const { error: settingsError } = await supabase
    .from('company_settings')
    .update({
      min_gm_green: settingsData.min_gm_green,
      min_gm_amber: settingsData.min_gm_amber,
      derisk_factors: settingsData.derisk_factors,
      risk_factors: settingsData.risk_factors,
      updated_at: new Date().toISOString(),
    })
    .eq('company_id', companyId)

  if (settingsError) {
    console.error('[webhook/setup] settings update failed:', settingsError.message)
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }

  // Log activity (non-fatal if it fails)
  const { error: activityError } = await supabase.from('activity_log').insert({
    company_id: companyId,
    user_id: userId,
    action: 'settings_configured',
    entity_type: 'company_settings',
    entity_id: companyId,
    details: {
      source: 'voice_assistant',
      conversation_id: conversationId,
      min_gm_green: settingsData.min_gm_green,
      min_gm_amber: settingsData.min_gm_amber,
      derisk_count: Array.isArray(settingsData.derisk_factors) ? (settingsData.derisk_factors as unknown[]).length : 0,
      risk_count: Array.isArray(settingsData.risk_factors) ? (settingsData.risk_factors as unknown[]).length : 0,
    },
  } as never)
  if (activityError) {
    // Non-fatal: settings were saved; the activity log insert failing should not roll back
    console.warn('[webhook/setup] activity_log insert failed (non-fatal):', activityError.message)
  }

  return NextResponse.json({
    status: 'success',
    message: 'Company settings updated successfully',
  })
}

async function logTranscript(
  supabase: SupabaseClient,
  payload: ElevenLabsWebhookPayload,
  context: string,
  companyId?: string,
  userId?: string,
) {
  const { error } = await supabase.from('voice_transcripts').insert({
    company_id: companyId ?? null,
    user_id: userId ?? null,
    conversation_id: payload.conversation_id,
    agent_id: payload.agent_id,
    context,
    transcript: payload.transcript,
    extracted_data: payload.extracted_data ?? null,
    duration_seconds: payload.duration_seconds ?? null,
    status: payload.status,
  })
  if (error) {
    console.error('[webhook/setup] voice_transcripts insert failed:', error.message)
  }
}

function extractDataFromTranscript(
  transcript: ElevenLabsWebhookPayload['transcript'],
): { type: string; data: Record<string, unknown> } | null {
  const agentMessages = transcript
    .filter((t) => t.role === 'agent')
    .slice(-5)
    .map((t) => t.message)
    .join(' ')

  const jsonMatch = agentMessages.match(/\{[\s\S]*"type"[\s\S]*\}/)
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0])
    } catch {
      return null
    }
  }
  return null
}
