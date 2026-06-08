// POST /api/webhooks/elevenlabs/opportunity-basics
//
// Post-call webhook for the opportunity-basics voice agent.
// Transcript-log only — form fields are now written by client tools (set_basics_fields).
//
// SECURITY CONTRACT (VMS rules 9 + 10):
//   - HMAC verified BEFORE any processing. Unverified → 401. (rule 10)
//   - Identity resolved from voice_sessions via conversation_id, NOT from
//     client-supplied metadata. (rule 9)
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
  const verified = await verifyElevenLabsWebhook(request)
  if (!verified.ok) {
    console.error('[webhook/opportunity-basics] HMAC verification failed:', verified.error)
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

  console.log('[webhook/opportunity-basics] conversation_id:', conversationId)

  // Resolve identity server-side via conversation_id — never from client metadata
  const { data: session } = await supabase
    .from('voice_sessions')
    .select('user_id, company_id, opportunity_id')
    .eq('conversation_id', conversationId)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  const userId = session?.user_id as string | undefined
  const companyId = session?.company_id as string | undefined
  const opportunityId = session?.opportunity_id as string | undefined

  const { error } = await supabase.from('voice_transcripts').insert({
    company_id: companyId ?? null,
    user_id: userId ?? null,
    opportunity_id: opportunityId ?? null,
    conversation_id: conversationId,
    agent_id: payload.agent_id,
    context: 'opportunity_basics',
    transcript: payload.transcript,
    extracted_data: payload.extracted_data ?? null,
    duration_seconds: payload.duration_seconds ?? null,
    status: payload.status,
  })
  if (error) {
    console.error('[webhook/opportunity-basics] voice_transcripts insert failed:', error.message)
  }

  return NextResponse.json({ status: 'transcript_logged' })
}
