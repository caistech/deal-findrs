'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Mic, Loader2, PhoneOff, AlertCircle, Settings } from 'lucide-react'
import Link from 'next/link'

// Agent IDs from environment - check if they're actually set
const AGENT_IDS: Record<string, string> = {
  basics: process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_BASICS || '',
  property: process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_PROPERTY || '',
  financial: process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_FINANCIAL || '',
  derisk: process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_DERISK || '',
}

interface VoiceInputProps {
  step: 'basics' | 'property' | 'financial' | 'derisk'
  contextData?: Record<string, any>
  onFieldExtracted?: (field: string, value: string | number | boolean) => void
  onConversationComplete?: (data: any) => void
  metadata?: {
    user_id?: string
    company_id?: string
    opportunity_id?: string
  }
}

type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error' | 'not_configured'

export function VoiceInput({
  step,
  contextData,
  onFieldExtracted,
  onConversationComplete,
  metadata = {},
}: VoiceInputProps) {
  const [status, setStatus] = useState<ConnectionStatus>('idle')
  const [transcript, setTranscript] = useState<Array<{ role: 'agent' | 'user'; text: string }>>([])
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const conversationRef = useRef<any>(null)

  const agentId = AGENT_IDS[step]

  // Check if agent is configured on mount
  useEffect(() => {
    // Check if ANY agent is configured (means setup was done)
    const anyAgentConfigured = Object.values(AGENT_IDS).some(id => id && id.length > 0)
    if (!anyAgentConfigured) {
      setStatus('not_configured')
    }
  }, [])

  const startConversation = useCallback(async () => {
    if (!agentId) {
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
      const { Conversation } = await import('@11labs/client')

      // Get signed URL from our server
      const response = await fetch('/api/voice/elevenlabs-connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId }),
      })

      const data = await response.json()

      if (!response.ok || data.error) {
        throw new Error(data.message || 'Failed to connect')
      }

      // Client tools handler — fans each set_*_fields tool call out to
      // onFieldExtracted per non-empty parameter. The agent calls these
      // tools as it collects info; the form on screen updates in real time.
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
      const conversation = await Conversation.startSession({
        signedUrl: data.signedUrl,
        clientTools: {
          set_basics_fields:    fieldUpdateHandler,
          set_property_fields:  fieldUpdateHandler,
          set_financial_fields: fieldUpdateHandler,
          set_derisk_fields:    fieldUpdateHandler,
        },
        onConnect: () => {
          setStatus('connected')
        },
        onDisconnect: () => {
          setStatus('idle')
          conversationRef.current = null
        },
        onMessage: (message: any) => {
          // Defensive: some SDK message shapes deliver tool calls via
          // onMessage rather than via clientTools handlers. Catch those
          // too, so we're resilient to SDK version differences.
          if (message?.type === 'client_tool_call' && message.client_tool_call) {
            const { tool_name, parameters } = message.client_tool_call
            if (typeof tool_name === 'string' && tool_name.startsWith('set_') && tool_name.endsWith('_fields')) {
              applyFieldUpdates(parameters || {})
              return
            }
          }
          // Plain transcript
          if (message?.source === 'ai' && message.message) {
            setTranscript(prev => [...prev, { role: 'agent', text: message.message }])
          } else if (message?.source === 'user' && message.message) {
            setTranscript(prev => [...prev, { role: 'user', text: message.message }])
          }
        },
        onError: (error: any) => {
          console.error('Conversation error:', error)
          setErrorMessage(error.message || 'Connection error')
          setStatus('error')
        },
      })

      conversationRef.current = conversation

    } catch (error: any) {
      console.error('Start conversation error:', error)
      setStatus('error')
      
      if (error.name === 'NotAllowedError') {
        setErrorMessage('Microphone access denied. Please allow microphone access and try again.')
      } else {
        setErrorMessage(error.message || 'Failed to start voice input')
      }
    }
  }, [agentId])

  const endConversation = useCallback(async () => {
    if (conversationRef.current) {
      try {
        await conversationRef.current.endSession()
      } catch (e) {
        console.error('End session error:', e)
      }
      conversationRef.current = null
    }
    setStatus('idle')
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (conversationRef.current) {
        conversationRef.current.endSession().catch(() => {})
      }
    }
  }, [])

  // Not configured - show setup message
  if (status === 'not_configured') {
    return (
      <div className="bg-amber-50 border-b border-amber-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600" />
            <div>
              <p className="text-amber-800 font-medium">Voice Assistant Not Configured</p>
              <p className="text-amber-600 text-sm">
                Set up ElevenLabs agents to enable voice input
              </p>
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
            {/* Main control button */}
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

            {/* Status indicator */}
            {status === 'connected' && (
              <div className="flex items-center gap-2 text-violet-600">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-violet-500"></span>
                </span>
                <span className="text-sm font-medium">Listening... speak naturally</span>
              </div>
            )}
          </div>

          <p className="text-violet-600 text-sm">
            🎤 AI assistant will help fill in the form
          </p>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {errorMessage}
          </div>
        )}

        {/* Live transcript */}
        {transcript.length > 0 && (
          <div className="mt-4 max-h-40 overflow-y-auto space-y-2">
            {transcript.slice(-4).map((msg, i) => (
              <div
                key={i}
                className={`text-sm p-2 rounded-lg ${
                  msg.role === 'agent'
                    ? 'bg-violet-100 text-violet-900'
                    : 'bg-white text-gray-900'
                }`}
              >
                <span className="font-medium text-xs">
                  {msg.role === 'agent' ? '🤖 Assistant: ' : '👤 You: '}
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
