'use client'

// ElevenLabsConversational.tsx
//
// SECURITY NOTES (blocking check #11 fix):
//   - No NEXT_PUBLIC_ELEVENLABS_API_KEY usage. The operator key lives server-side
//     in ELEVENLABS_API_KEY and is NEVER sent to the client.
//   - Signed URL is fetched from /api/voice/elevenlabs-connect (auth'd route).
//   - Agent IDs are server-side only (ELEVENLABS_AGENT_* env vars, not NEXT_PUBLIC_*).
//   - user_id and company_id are NOT passed as conversation metadata (VMS rule 9 fix).
//     Identity binding happens server-side via /api/voice/bind-session.
//
// BYOK: The operator's ElevenLabs key is used server-side. This is the correct
// pattern for a SaaS product (the key is the operator's, not per-user). True
// per-user BYOK (each user provides their own key) is a deferred feature
// (see decisions.json).

import { useState, useEffect, useCallback, useRef } from 'react'
import { Mic, MicOff, Loader2, PhoneOff, Volume2, AlertCircle } from 'lucide-react'
import type { AgentType } from '@/lib/voice/voice.config'

export type { AgentType }

interface ElevenLabsConversationalProps {
  agentType: AgentType
  /** Optional opportunity/assessment context (bound server-side, not sent as client metadata) */
  opportunityId?: string
  assessmentId?: string
  onConversationEnd?: (result: unknown) => void
  onError?: (error: Error) => void
  className?: string
}

export function ElevenLabsConversational({
  agentType,
  opportunityId,
  assessmentId,
  onConversationEnd,
  onError,
  className = '',
}: ElevenLabsConversationalProps) {
  const [status, setStatus] = useState<
    'idle' | 'connecting' | 'connected' | 'error' | 'permission_denied'
  >('idle')
  const [isMuted, setIsMuted] = useState(false)
  const [transcript, setTranscript] = useState<Array<{ role: string; text: string }>>([])
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  // sessionToken + conversationId used for server-side identity binding
  const sessionTokenRef = useRef<string | null>(null)

  const startConversation = useCallback(async () => {
    setStatus('connecting')
    setTranscript([])
    setErrorMessage(null)

    // ── Step 1: Request microphone permission ──────────────────────────────────
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach((t) => t.stop())
    } catch {
      setStatus('permission_denied')
      setErrorMessage('Microphone access is required for voice conversations.')
      return
    }

    // ── Step 2: Get signed URL from server (key never leaves the server) ───────
    let signedUrl: string
    let sessionToken: string
    try {
      const res = await fetch('/api/voice/elevenlabs-connect', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentType,
          opportunityId: opportunityId ?? undefined,
          assessmentId: assessmentId ?? undefined,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        const msg = (err as { error?: string }).error ?? 'Failed to connect to voice service'
        setStatus('error')
        setErrorMessage(msg)
        onError?.(new Error(msg))
        return
      }

      const data = await res.json()
      signedUrl = data.signedUrl
      sessionToken = data.sessionToken
      sessionTokenRef.current = sessionToken
    } catch (err) {
      const msg = 'Failed to reach voice service. Please try again.'
      setStatus('error')
      setErrorMessage(msg)
      onError?.(new Error(msg))
      return
    }

    // ── Step 3: Connect via WebSocket ──────────────────────────────────────────
    const ws = new WebSocket(signedUrl)
    wsRef.current = ws

    ws.onopen = () => {
      setStatus('connected')
      // Send initiation data — NOTE: NO user_id or company_id here (VMS rule 9).
      // Identity is bound server-side via the voice_sessions table.
      ws.send(
        JSON.stringify({
          type: 'conversation_initiation_client_data',
          // No custom metadata with user identity — server derives it via conversation_id
        }),
      )
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string)

        switch (data.type) {
          case 'conversation_id':
          case 'conversation_initiation_metadata': {
            // ElevenLabs sends the conversation_id on connect — bind it server-side
            const convId: string | undefined =
              data.conversation_id ||
              data.data?.conversation_id
            if (convId && sessionTokenRef.current) {
              fetch('/api/voice/bind-session', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  sessionToken: sessionTokenRef.current,
                  conversationId: convId,
                }),
              }).catch((e) =>
                console.warn('[voice] bind-session failed (non-fatal):', e),
              )
            }
            break
          }
          case 'agent_response':
            setTranscript((prev) => [...prev, { role: 'agent', text: data.text }])
            break
          case 'user_transcript':
            if (data.text) {
              setTranscript((prev) => [...prev, { role: 'user', text: data.text }])
            }
            break
          case 'conversation_ended':
            setStatus('idle')
            onConversationEnd?.(data)
            break
          case 'error':
            setStatus('error')
            setErrorMessage(data.message || 'An error occurred')
            onError?.(new Error(data.message))
            break
        }
      } catch (parseError) {
        console.error('[voice] message parse error:', parseError)
      }
    }

    ws.onerror = () => {
      setStatus('error')
      setErrorMessage('Connection error. Please check your internet and try again.')
      onError?.(new Error('WebSocket error'))
    }

    ws.onclose = (event) => {
      if (status === 'connected') setStatus('idle')
      if (event.code !== 1000 && event.code !== 1001) {
        console.warn('[voice] WebSocket closed unexpectedly:', event.code, event.reason)
      }
    }
  }, [agentType, opportunityId, assessmentId, onConversationEnd, onError, status])

  const endConversation = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    setStatus('idle')
  }, [])

  const toggleMute = useCallback(() => setIsMuted((prev) => !prev), [])

  useEffect(() => {
    return () => {
      if (wsRef.current) wsRef.current.close()
    }
  }, [])

  if (status === 'permission_denied') {
    return (
      <div className={className}>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-800 font-medium">Microphone Access Required</p>
              <p className="text-red-600 text-sm mt-1">
                {errorMessage || 'Please allow microphone access to use the voice assistant.'}
              </p>
              <div className="mt-3 space-y-1 text-sm text-red-700">
                <p>
                  <strong>Mobile:</strong> Settings → Site Settings → Microphone → Allow
                </p>
                <p>
                  <strong>Desktop:</strong> Click the lock icon in the address bar
                </p>
              </div>
              <button
                onClick={() => { setStatus('idle'); setErrorMessage(null) }}
                className="mt-3 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const statusColors: Record<string, string> = {
    idle: 'bg-gray-100 text-gray-600 hover:bg-gray-200',
    connecting: 'bg-amber-100 text-amber-700',
    connected: 'bg-emerald-500 text-white',
    error: 'bg-red-100 text-red-700 hover:bg-red-200',
    permission_denied: 'bg-red-100 text-red-700',
  }

  return (
    <div className={className}>
      <div className="flex items-center gap-3">
        <button
          onClick={status === 'connected' ? endConversation : startConversation}
          disabled={status === 'connecting'}
          className={`
            flex items-center gap-2 px-4 py-3 rounded-xl font-medium transition-all
            ${statusColors[status]}
            ${status === 'connecting' ? 'cursor-wait' : 'cursor-pointer'}
          `}
        >
          {status === 'idle' && (
            <>
              <Mic className="w-5 h-5" />
              <span>Start Voice Assistant</span>
            </>
          )}
          {status === 'connecting' && (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Connecting...</span>
            </>
          )}
          {status === 'connected' && (
            <>
              <PhoneOff className="w-5 h-5" />
              <span>End Conversation</span>
            </>
          )}
          {status === 'error' && (
            <>
              <Mic className="w-5 h-5" />
              <span>Retry Connection</span>
            </>
          )}
        </button>

        {status === 'connected' && (
          <button
            onClick={toggleMute}
            className={`p-3 rounded-xl transition-all ${
              isMuted ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
        )}
      </div>

      {status === 'connected' && (
        <div className="mt-4 flex items-center gap-2 text-sm text-emerald-600">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
          </span>
          <span>Listening... speak now</span>
        </div>
      )}

      {transcript.length > 0 && (
        <div className="mt-4 max-h-60 overflow-y-auto space-y-2 text-sm">
          {transcript.slice(-6).map((msg, i) => (
            <div
              key={i}
              className={`p-2 rounded-lg ${
                msg.role === 'agent' ? 'bg-violet-50 text-violet-900' : 'bg-gray-50 text-gray-900'
              }`}
            >
              <span className="font-medium text-xs uppercase">
                {msg.role === 'agent' ? 'Assistant' : 'You'}:
              </span>
              <p className="mt-1">{msg.text}</p>
            </div>
          ))}
        </div>
      )}

      {status === 'error' && errorMessage && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-600">{errorMessage}</p>
        </div>
      )}
    </div>
  )
}
