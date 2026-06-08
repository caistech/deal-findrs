// POST /api/webhooks/elevenlabs/assessment
//
// Post-call webhook for the assessment-discussion voice agent.
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
  // ── STEP 1: HMAC verification ─────────────────────────────────────────────────
  const verified = await verifyElevenLabsWebhook(request)
  if (!verified.ok) {
    console.error('[webhook/assessment] HMAC verification failed:', verified.error)
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

  console.log('[webhook/assessment] conversation_id:', conversationId)

  // ── STEP 2: Server-derived identity ──────────────────────────────────────────
  const { data: session } = await supabase
    .from('voice_sessions')
    .select('user_id, company_id, opportunity_id, assessment_id')
    .eq('conversation_id', conversationId)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  const userId = session?.user_id as string | undefined
  const companyId = session?.company_id as string | undefined
  const opportunityId = session?.opportunity_id as string | undefined
  const assessmentId = session?.assessment_id as string | undefined

  // ── STEP 3: Always log transcript ────────────────────────────────────────────
  const { error: transcriptError } = await supabase.from('voice_transcripts').insert({
    company_id: companyId ?? null,
    user_id: userId ?? null,
    opportunity_id: opportunityId ?? null,
    conversation_id: conversationId,
    agent_id: payload.agent_id,
    context: 'assessment_discussion',
    transcript: payload.transcript,
    extracted_data: payload.extracted_data ?? null,
    duration_seconds: payload.duration_seconds ?? null,
    status: payload.status,
  })
  if (transcriptError) {
    console.error('[webhook/assessment] voice_transcripts insert failed:', transcriptError.message)
  }

  const extractedData = payload.extracted_data
  if (!extractedData || extractedData.type !== 'assessment_discussion') {
    return NextResponse.json({ status: 'transcript_logged' })
  }

  // ── STEP 4: Apply business logic only with a verified session ─────────────────
  if (!companyId || !userId) {
    console.warn('[webhook/assessment] no valid voice_session for conversation_id:', conversationId)
    return NextResponse.json({ status: 'transcript_logged_no_session' })
  }

  const { data: discussionData } = extractedData

  // If user made a decision, update the opportunity status
  if (discussionData.decision && discussionData.decision !== 'undecided' && opportunityId) {
    const statusMap: Record<string, string> = {
      proceed: 'proceed',
      pend: 'pending',
      archive: 'archived',
    }
    const newStatus = statusMap[discussionData.decision as string]
    if (newStatus) {
      const { error: oppError } = await supabase
        .from('opportunities')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', opportunityId)
      if (oppError) {
        console.error('[webhook/assessment] opportunity update failed:', oppError.message)
      }
    }
  }

  // Log activity (non-fatal)
  const { error: activityError } = await supabase.from('activity_log').insert({
    company_id: companyId,
    user_id: userId,
    action: 'discussed',
    entity_type: 'assessment',
    entity_id: assessmentId || opportunityId,
    details: {
      source: 'voice_assistant',
      conversation_id: conversationId,
      duration_seconds: payload.duration_seconds,
      questions_asked: discussionData.questions_asked,
      recommendations_discussed: discussionData.recommendations_discussed,
      decision: discussionData.decision,
    },
  } as never)
  if (activityError) {
    console.warn('[webhook/assessment] activity_log insert failed (non-fatal):', activityError.message)
  }

  // Update assessment with voice discussion flag (non-fatal)
  if (assessmentId) {
    const { error: assessError } = await supabase
      .from('assessments')
      .update({
        voice_discussed: true,
        voice_discussion_summary: summarizeTranscript(payload.transcript),
        updated_at: new Date().toISOString(),
      })
      .eq('id', assessmentId)
    if (assessError) {
      console.warn('[webhook/assessment] assessments update failed (non-fatal):', assessError.message)
    }
  }

  return NextResponse.json({
    status: 'success',
    message: 'Assessment discussion logged',
    decision: discussionData.decision,
  })
}

function summarizeTranscript(
  transcript: ElevenLabsWebhookPayload['transcript'],
): string {
  return transcript
    .filter((t) => t.role === 'user')
    .slice(-10)
    .map((t) => t.message)
    .join(' | ')
}
