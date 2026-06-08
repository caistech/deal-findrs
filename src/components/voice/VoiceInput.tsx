'use client'

// VoiceInput.tsx
//
// Voice-guided form fill component for opportunity creation steps.
//
// SECURITY NOTES (blocking check #11 fix):
//   - Agent IDs are resolved SERVER-SIDE via /api/voice/elevenlabs-connect.
//     No NEXT_PUBLIC_ELEVENLABS_AGENT_* env vars are read here.
//   - user_id and company_id are NOT passed in the session or any client metadata.
//     Identity is bound server-side (VMS rule 9) via /api/voice/bind-session.
//   - The @11labs/client SDK is used client-side with a signed URL from the server
//     (no ElevenLabs API key is in the client bundle).

import { useState, useEffect, useCallback, useRef } from 'react'
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
  /** Optional context IDs for server-side binding (not passed as metadata to ElevenLabs) */
  opportunityId?: string
}

type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error' | 'not_configured'

export function VoiceInput({
  step,
  onFieldExtracted,
  opportunityId,
}: VoiceInputProps) {
  const [status, setStatus] = useState<ConnectionStatus>('idle')
  const [transcript, setTranscript] = useState<Array<{ role: 'agent' | 'user'; text: string }>>([])
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const conversationRef = useRef<unknown>(null)
  const sessionTokenRef = useRef<string | null>(null)

  const agentType = STEP_TO_AGENT_TYPE[step]

  const startConversation = useCallback(async () => {
    if (!agentType) {
      setErrorMessage('Voice agent not configured for this step.')
      setStatus('not_configured')
      return
    }

    setStatus('connecting')
    setTranscript([])
    setErrorMessage(null)

    try {
      // Request microphone permission first
      await navigator.mediaDevices.getUserMedia({ audio: true })

      // Dynamically import ElevenLabs SDK (client-side only)
      // This uses the signed URL from our server — no API key in the client bundle
      const { Conversation } = await import('@11labs/client')

      // Get signed URL from our server (server resolves the agent ID server-side)
      const response = await fetch('/api/voice/elevenlabs-connect', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentType,
          // opportunityId is safe to send — server validates it against the auth'd user
          opportunityId: opportunityId ?? undefined,
        }),
      })

      const data = await response.json() as {
        signedUrl?: string
        sessionToken?: string
        error?: string
        message?: string
      }

      if (!response.ok || data.error) {
        throw new Error(data.message || data.error || 'Failed to connect')
      }

      if (!data.signedUrl) {
        throw new Error('No signed URL returned from voice service')
      }

      sessionTokenRef.current = data.sessionToken ?? null

      // Client tools handler — fans each set_*_fields tool call out to
      // onFieldExtracted per non-empty parameter.
      const applyFieldUpdates = (params: Record<string, unknown>) => {
        if (!params || typeof params !== 'object') return
        for (const [field, value] of Object.entries(params)) {
          if (value === undefined || value === null || value === '') continue
          if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
            onFieldExtracted?.(field, value)
          }
        }
      }

      const fieldUpdateHandler = async (params: Record<string, unknown>) => {
        try {
          applyFieldUpdates(params)
          return 'success'
        } catch (e) {
          console.error('clientTool field update error:', e)
          return 'error'
        }
      }

      // Start conversation with signed URL + client tools
      // No user_id or company_id in clientTools or overrides — identity is server-bound
      const conversation = await Conversation.startSession({
        signedUrl: data.signedUrl,
        clientTools: {
          set_basics_fields: fieldUpdateHandler,
          set_property_fields: fieldUpdateHandler,
          set_financial_fields: fieldUpdateHandler,
          set_derisk_fields: fieldUpdateHandler,
        },
        onConnect: (connectionData?: { conversationId?: string }) => {
          setStatus('connected')
          // Bind the real conversation_id server-side (VMS rule 9)
          const convId = connectionData?.conversationId
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
        },
        onDisconnect: () => {
          setStatus('idle')
          conversationRef.current = null
        },
        onMessage: (message: unknown) => {
          const msg = message as Record<string, unknown>
          // Handle client tool calls delivered via onMessage (SDK version resilience)
          if (msg?.type === 'client_tool_call' && msg.client_tool_call) {
            const toolCall = msg.client_tool_call as { tool_name?: string; parameters?: Record<string, unknown> }
            const { tool_name, parameters } = toolCall
            if (
              typeof tool_name === 'string' &&
              tool_name.startsWith('set_') &&
              tool_name.endsWith('_fields')
            ) {
              applyFieldUpdates(parameters || {})
              return
            }
          }
          // Plain transcript
          if (msg?.source === 'ai' && msg.message) {
            setTranscript((prev) => [...prev, { role: 'agent', text: String(msg.message) }])
          } else if (msg?.source === 'user' && msg.message) {
            setTranscript((prev) => [...prev, { role: 'user', text: String(msg.message) }])
          }
        },
        onError: (error: unknown) => {
          const err = error as { message?: string }
          console.error('Conversation error:', error)
          setErrorMessage(err?.message || 'Connection error')
          setStatus('error')
        },
      })

      conversationRef.current = conversation
    } catch (error: unknown) {
      const err = error as { name?: string; message?: string }
      console.error('Start conversation error:', error)
      setStatus('error')
      if (err?.name === 'NotAllowedError') {
        setErrorMessage('Microphone access denied. Please allow microphone access and try again.')
      } else {
        setErrorMessage(err?.message || 'Failed to start voice input')
      }
    }
  }, [agentType, opportunityId, onFieldExtracted])

  const endConversation = useCallback(async () => {
    if (conversationRef.current) {
      try {
        await (conversationRef.current as { endSession: () => Promise<void> }).endSession()
      } catch (e) {
        console.error('End session error:', e)
      }
      conversationRef.current = null
    }
    setStatus('idle')
  }, [])

  useEffect(() => {
    return () => {
      if (conversationRef.current) {
        (conversationRef.current as { endSession: () => Promise<void> }).endSession().catch(() => {})
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

  return (
    <div className="bg-gradient-to-r from-violet-50 to-purple-50 border-b border-violet-200">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={status === 'connected' ? endConversation : startConversation}
              disabled={status === 'connecting'}
              className={`
                flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all
                ${status === 'idle' ? 'bg-violet-600 text-white hover:bg-violet-700' : ''}
                ${status === 'connecting' ? 'bg-violet-400 text-white cursor-wait' : ''}
                ${status === 'connected' ? 'bg-red-500 text-white hover:bg-red-600' : ''}
                ${status === 'error' ? 'bg-red-100 text-red-700 hover:bg-red-200' : ''}
              `}
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
