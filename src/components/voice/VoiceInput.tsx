'use client'

// VoiceInput.tsx
//
// Voice-guided form fill component for opportunity creation steps.
//
// SECURITY CONTRACT (blocking check #11 + VMS rules 9 + 11):
//   - No @11labs/client import. Connection uses a signed URL fetched server-side.
//   - Agent IDs resolved via server route (/api/voice/elevenlabs-connect).
//     No NEXT_PUBLIC_ELEVENLABS_AGENT_* or NEXT_PUBLIC_ELEVENLABS_API_KEY here.
//   - user_id and company_id are NOT passed as session metadata (VMS rule 9).
//     Identity is bound server-side via /api/voice/bind-session using sessionToken.
//   - Uses the same signed-URL + WebSocket pattern as ElevenLabsConversational.tsx,
//     which is the @caistech/elevenlabs-convai hub pattern.

import { useState, useCallback, useRef, useEffect } from 'react'
import { Mic, Loader2, PhoneOff, AlertCircle, Settings } from 'lucide-react'
import Link from 'next/link'

// Map VoiceInput step names to voice.config.ts agent types
const STEP_TO_AGENT_TYPE: Record<string, string> = {
  basics: 'opportunity_basics',
  property: 'opportunity_property',
  financial: 'opportunity_financial',
  derisk: 'opportunity_derisk',
}

interface VoiceInputProps {
  step: 'basics' | 'property' | 'financial' | 'derisk'
  contextData?: Record<string, unknown>
  onFieldExtracted?: (field: string, value: string | number | boolean) => void
  onConversationComplete?: (data: unknown) => void
  /** Optional context ID for server-side binding (not passed as metadata to ElevenLabs) */
  opportunityId?: string
}

type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error' | 'not_configured' | 'permission_denied'

export function VoiceInput({
  step,
  onFieldExtracted,
  opportunityId,
}: VoiceInputProps) {
  const [status, setStatus] = useState<ConnectionStatus>('idle')
  const [transcript, setTranscript] = useState<Array<{ role: 'agent' | 'user'; text: string }>>([])
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const sessionTokenRef = useRef<string | null>(null)

  const agentType = STEP_TO_AGENT_TYPE[step]

  const applyFieldUpdates = useCallback((params: Record<string, unknown>) => {
    if (!params || typeof params !== 'object') return
    for (const [field, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === '') continue
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        onFieldExtracted?.(field, value)
      }
    }
  }, [onFieldExtracted])

  const startConversation = useCallback(async () => {
    if (!agentType) {
      setErrorMessage('Voice agent not configured for this step.')
      setStatus('not_configured')
      return
    }

    setStatus('connecting')
    setTranscript([])
    setErrorMessage(null)

    // ── Step 1: Request microphone permission ──────────────────────────────────
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach((t) => t.stop())
    } catch {
      setStatus('permission_denied')
      setErrorMessage('Microphone access is required for voice input.')
      return
    }

    // ── Step 2: Get signed URL from server (key never leaves the server) ───────
    let signedUrl: string
    let sessionToken: string | null = null

    try {
      const res = await fetch('/api/voice/elevenlabs-connect', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentType,
          // opportunityId is safe to send — server validates it against the auth'd user
          opportunityId: opportunityId ?? undefined,
          // NO user_id or company_id here — identity is server-derived (VMS rule 9)
        }),
      })

      const data = await res.json() as {
        signedUrl?: string
        sessionToken?: string
        error?: string
        message?: string
      }

      if (!res.ok || data.error) {
        throw new Error(data.message || data.error || 'Failed to connect to voice service')
      }

      if (!data.signedUrl) {
        throw new Error('No signed URL returned from voice service')
      }

      signedUrl = data.signedUrl
      sessionToken = data.sessionToken ?? null
      sessionTokenRef.current = sessionToken
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to reach voice service'
      setStatus('error')
      setErrorMessage(msg)
      return
    }

    // ── Step 3: Connect via WebSocket ──────────────────────────────────────────
    const ws = new WebSocket(signedUrl)
    wsRef.current = ws

    ws.onopen = () => {
      setStatus('connected')
      // Send initiation data — NO user_id or company_id (VMS rule 9).
      // Identity is bound server-side via the voice_sessions table.
      ws.send(JSON.stringify({
        type: 'conversation_initiation_client_data',
        // No custom metadata with user identity
      }))
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string) as Record<string, unknown>

        switch (data.type) {
          case 'conversation_id':
          case 'conversation_initiation_metadata': {
            // Bind conversation_id server-side (VMS rule 9)
            const convId = (data.conversation_id || (data.data as Record<string, unknown> | undefined)?.conversation_id) as string | undefined
            if (convId && sessionTokenRef.current) {
              fetch('/api/voice/bind-session', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  sessionToken: sessionTokenRef.current,
                  conversationId: convId,
                }),
              }).catch((e) => console.warn('[voice-input] bind-session failed (non-fatal):', e))
            }
            break
          }
          case 'client_tool_call': {
            // Agent invokes a client tool to fill form fields
            const toolCall = data.client_tool_call as {
              tool_name?: string
              parameters?: Record<string, unknown>
            } | undefined
            if (
              toolCall?.tool_name &&
              typeof toolCall.tool_name === 'string' &&
              toolCall.tool_name.startsWith('set_') &&
              toolCall.tool_name.endsWith('_fields')
            ) {
              applyFieldUpdates(toolCall.parameters || {})
            }
            break
          }
          case 'agent_response': {
            const agentEvent = data.agent_response_event as { agent_response?: string } | undefined
            const agentText = agentEvent?.agent_response ?? (data.text as string | undefined)
            if (agentText) {
              setTranscript((prev) => [...prev, { role: 'agent', text: String(agentText) }])
            }
            break
          }
          case 'user_transcript': {
            const userEvent = data.user_transcription_event as { user_transcript?: string } | undefined
            const userText = userEvent?.user_transcript ?? (data.text as string | undefined)
            if (userText) {
              setTranscript((prev) => [...prev, { role: 'user', text: String(userText) }])
            }
            break
          }
          case 'conversation_ended':
            setStatus('idle')
            wsRef.current = null
            break
          case 'error':
            setStatus('error')
            setErrorMessage(String(data.message || 'Voice connection error'))
            break
        }
      } catch (parseError) {
        console.error('[voice-input] message parse error:', parseError)
      }
    }

    ws.onerror = () => {
      setStatus('error')
      setErrorMessage('Connection error. Please check your internet and try again.')
    }

    ws.onclose = (event) => {
      if (status === 'connected') setStatus('idle')
      if (event.code !== 1000 && event.code !== 1001) {
        console.warn('[voice-input] WebSocket closed unexpectedly:', event.code, event.reason)
      }
      wsRef.current = null
    }
  }, [agentType, opportunityId, applyFieldUpdates, status])

  const endConversation = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close(1000, 'User ended conversation')
      wsRef.current = null
    }
    setStatus('idle')
  }, [])

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [])

  // Not configured — graceful degradation
  if (status === 'not_configured') {
    return (
      <div className="bg-amber-50 border-b border-amber-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600" />
            <div>
              <p className="text-amber-800 font-medium">Voice Assistant Not Configured</p>
              <p className="text-amber-600 text-sm">Set up ElevenLabs agents to enable voice input</p>
            </div>
          </div>
          <Link
            href="/admin/elevenlabs"
            className="flex items-center gap-2 px-3 py-2 bg-amber-100 text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-200"
          >
            <Settings className="w-4 h-4" />
            Setup
          </Link>
        </div>
      </div>
    )
  }

  if (status === 'permission_denied') {
    return (
      <div className="bg-red-50 border-b border-red-200 px-6 py-4">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <div>
            <p className="text-red-800 font-medium">Microphone Access Required</p>
            <p className="text-red-600 text-sm">
              Please allow microphone access in your browser settings and try again.
            </p>
            <button
              onClick={() => { setStatus('idle'); setErrorMessage(null) }}
              className="mt-2 px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-r from-violet-50 to-purple-50 border-b border-violet-200">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={status === 'connected' ? endConversation : startConversation}
              disabled={status === 'connecting'}
              className={[
                'flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all',
                status === 'idle' ? 'bg-violet-600 text-white hover:bg-violet-700' : '',
                status === 'connecting' ? 'bg-violet-400 text-white cursor-wait' : '',
                status === 'connected' ? 'bg-red-500 text-white hover:bg-red-600' : '',
                status === 'error' ? 'bg-red-100 text-red-700 hover:bg-red-200' : '',
              ].filter(Boolean).join(' ')}
            >
              {status === 'idle' && (
                <>
                  <Mic className="w-5 h-5" />
                  Start Voice Input
                </>
              )}
              {status === 'connecting' && (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Connecting...
                </>
              )}
              {status === 'connected' && (
                <>
                  <PhoneOff className="w-5 h-5" />
                  End Voice Input
                </>
              )}
              {status === 'error' && (
                <>
                  <Mic className="w-5 h-5" />
                  Try Again
                </>
              )}
            </button>

            {status === 'connected' && (
              <div className="flex items-center gap-2 text-violet-600">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-violet-500" />
                </span>
                <span className="text-sm font-medium">Listening... speak naturally</span>
              </div>
            )}
          </div>

          <p className="text-violet-600 text-sm">AI assistant will help fill in the form</p>
        </div>

        {errorMessage && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {errorMessage}
          </div>
        )}

        {transcript.length > 0 && (
          <div className="mt-4 max-h-40 overflow-y-auto space-y-2">
            {transcript.slice(-4).map((msg, i) => (
              <div
                key={i}
                className={`text-sm p-2 rounded-lg ${
                  msg.role === 'agent' ? 'bg-violet-100 text-violet-900' : 'bg-white text-gray-900'
                }`}
              >
                <span className="font-medium text-xs">
                  {msg.role === 'agent' ? 'Assistant: ' : 'You: '}
                </span>
                {msg.text}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
