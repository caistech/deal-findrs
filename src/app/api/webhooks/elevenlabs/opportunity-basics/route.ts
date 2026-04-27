import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

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
  metadata?: {
    user_id?: string
    company_id?: string
    opportunity_id?: string
  }
  extracted_data?: {
    type: string
    data: any
  }
  duration_seconds?: number
}

/**
 * ElevenLabs post-conversation webhook for the BASICS step.
 *
 * The form-fill flow is now driven by client tools (see VoiceInput.tsx and
 * tools/setup-elevenlabs-tools.js). The agent calls set_basics_fields in the
 * browser as it collects each field, and the user clicks "Run Assessment"
 * on /opportunities/new to actually create the opportunity.
 *
 * This webhook is now TRANSCRIPT-LOG ONLY. It does NOT create or modify
 * opportunities. Keeping it for the audit trail (voice_transcripts) and so
 * ElevenLabs has a 200 endpoint to call.
 */
export async function POST(request: NextRequest) {
  try {
    const payload: ElevenLabsWebhookPayload = await request.json()
    const supabase = getSupabaseAdmin()

    console.log('Opportunity basics webhook received:', payload.conversation_id)

    await logTranscript(
      supabase,
      payload,
      'opportunity_basics',
      payload.metadata?.company_id,
      payload.metadata?.user_id,
      payload.metadata?.opportunity_id
    )

    return NextResponse.json({ status: 'transcript_logged' })
  } catch (error) {
    console.error('Opportunity basics webhook error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function logTranscript(
  supabase: SupabaseClient,
  payload: ElevenLabsWebhookPayload,
  context: string,
  companyId?: string,
  userId?: string,
  opportunityId?: string
) {
  const { error } = await supabase.from('voice_transcripts').insert({
    company_id: companyId,
    user_id: userId,
    opportunity_id: opportunityId,
    conversation_id: payload.conversation_id,
    agent_id: payload.agent_id,
    context,
    transcript: payload.transcript,
    extracted_data: payload.extracted_data,
    duration_seconds: payload.duration_seconds,
    status: payload.status,
  })
  if (error) {
    console.error('voice_transcripts insert failed:', error.message)
  }
}
