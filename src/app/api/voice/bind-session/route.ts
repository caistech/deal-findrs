// POST /api/voice/bind-session
//
// Called by the client immediately after the ElevenLabs WebSocket connects
// (in the VoiceWidget onConnect callback). Updates the voice_sessions row
// with the real conversation_id that ElevenLabs assigned.
//
// This completes the server-side identity binding (VMS rule 9):
//   1. /api/voice/elevenlabs-connect issues a signed URL + a preliminary session_token
//   2. Client connects via WebSocket; ElevenLabs returns conversation_id
//   3. Client POSTs here with { sessionToken, conversationId }
//   4. We update voice_sessions.conversation_id = conversationId WHERE
//      conversation_id = sessionToken (the placeholder) AND user = auth'd user
//   5. Webhooks now look up identity via conversation_id — fully server-derived
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '@/lib/auth/require-auth'

let _admin: any | null = null
function getAdmin() {
  if (!_admin) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) throw new Error('Supabase credentials not configured')
    _admin = createClient(url, key)
  }
  return _admin
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: 401 })
  }
  const { user } = auth

  let body: { sessionToken: string; conversationId: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { sessionToken, conversationId } = body

  if (!sessionToken || !conversationId) {
    return NextResponse.json(
      { error: 'sessionToken and conversationId are required' },
      { status: 400 },
    )
  }

  const admin = getAdmin()

  // Update the preliminary session placeholder with the real conversation_id.
  // The user_id = auth'd user ensures a user cannot bind another user's session.
  const { error } = await admin
    .from('voice_sessions')
    .update({ conversation_id: conversationId })
    .eq('conversation_id', sessionToken)
    .eq('user_id', user.id)

  if (error) {
    console.error('[bind-session] update failed:', error.message)
    // Non-fatal: don't block the voice call; just log that binding failed
    return NextResponse.json({ bound: false, error: 'Session binding failed' }, { status: 500 })
  }

  return NextResponse.json({ bound: true })
}
