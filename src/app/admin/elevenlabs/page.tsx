// @explanatory-header-exempt — nested workflow page; entry-point header lives on the parent surface
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, Check, AlertCircle, Trash2, Plus, RefreshCw, Copy } from 'lucide-react'

interface Agent {
  id: string
  name: string
}

export default function AdminElevenLabsPage() {
  const [status, setStatus] = useState<'loading' | 'idle' | 'creating' | 'cleaning'>('loading')
  const [agents, setAgents] = useState<Agent[]>([])
  const [configured, setConfigured] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const appUrl = typeof window !== 'undefined' ? window.location.origin : ''

  const checkStatus = async () => {
    setStatus('loading')
    try {
      const res = await fetch('/api/admin/setup-elevenlabs')
      const data = await res.json()
      setConfigured(data.configured)
      setAgents(data.agents || [])
    } catch (err) {
      setError('Failed to check status')
    }
    setStatus('idle')
  }

  useEffect(() => {
    checkStatus()
  }, [])

  const createAgents = async () => {
    setStatus('creating')
    setError(null)
    setResult(null)
    
    try {
      const res = await fetch('/api/admin/setup-elevenlabs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', appUrl }),
      })
      
      const data = await res.json()
      
      if (data.success) {
        setResult(data)
        await checkStatus()
      } else {
        setError(data.error || 'Failed to create agents')
      }
    } catch (err) {
      setError('Failed to create agents')
    }
    
    setStatus('idle')
  }

  const cleanAgents = async () => {
    if (!confirm('Delete all DealFindrs agents from ElevenLabs?')) return
    
    setStatus('cleaning')
    setError(null)
    
    try {
      const res = await fetch('/api/admin/setup-elevenlabs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clean', appUrl }),
      })
      
      const data = await res.json()
      await checkStatus()
    } catch (err) {
      setError('Failed to delete agents')
    }
    
    setStatus('idle')
  }

  const copyEnv = () => {
    if (!result?.env) return
    
    const envText = Object.entries(result.env)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n')
    
    navigator.clipboard.writeText(envText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-6">
        <Link href="/settings" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Settings
        </Link>

        <div className="bg-white rounded-2xl border border-gray-200 p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">ElevenLabs Voice Agents Setup</h1>
          <p className="text-gray-600 mb-6">
            Automatically create and configure all 6 DealFindrs voice agents in your ElevenLabs account.
          </p>

          {/* Status */}
          <div className={`p-4 rounded-xl mb-6 ${configured ? 'bg-emerald-50 border border-emerald-200' : 'bg-amber-50 border border-amber-200'}`}>
            <div className="flex items-center gap-3">
              {configured ? (
                <>
                  <Check className="w-5 h-5 text-emerald-600" />
                  <span className="text-emerald-800 font-medium">ElevenLabs API configured</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                  <span className="text-amber-800 font-medium">ELEVENLABS_API_KEY not set</span>
                </>
              )}
            </div>
            {!configured && (
              <p className="text-sm text-amber-700 mt-2">
                Add ELEVENLABS_API_KEY to your environment variables first.
              </p>
            )}
          </div>

          {/* Current Agents */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-900">Current Agents ({agents.length}/6)</h2>
              <button onClick={checkStatus} disabled={status !== 'idle'} className="text-gray-500 hover:text-gray-700">
                <RefreshCw className={`w-4 h-4 ${status === 'loading' ? 'animate-spin' : ''}`} />
              </button>
            </div>
            
            {agents.length > 0 ? (
              <div className="space-y-2">
                {agents.map((agent) => (
                  <div key={agent.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{agent.name}</p>
                      <p className="text-xs text-gray-500 font-mono">{agent.id}</p>
                    </div>
                    <Check className="w-4 h-4 text-emerald-500" />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No agents created yet.</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={createAgents}
              disabled={!configured || status !== 'idle'}
              className="flex-1 px-4 py-3 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {status === 'creating' ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating Agents...
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5" />
                  Create All Agents
                </>
              )}
            </button>
            
            {agents.length > 0 && (
              <button
                onClick={cleanAgents}
                disabled={status !== 'idle'}
                className="px-4 py-3 bg-red-100 text-red-700 rounded-xl font-medium hover:bg-red-200 disabled:opacity-50 flex items-center gap-2"
              >
                {status === 'cleaning' ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Trash2 className="w-5 h-5" />
                )}
                Delete All
              </button>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
              {error}
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="mt-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-emerald-800">✅ Agents Created!</h3>
                <button
                  onClick={copyEnv}
                  className="flex items-center gap-2 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-200"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied!' : 'Copy Env'}
                </button>
              </div>
              
              <p className="text-sm text-emerald-700 mb-3">
                Add these to your .env.local and Vercel environment:
              </p>
              
              <pre className="bg-emerald-100 p-3 rounded-lg text-xs font-mono overflow-x-auto">
                {Object.entries(result.env).map(([key, value]) => (
                  <div key={key}>{key}={value as string}</div>
                ))}
              </pre>

              {result.errors?.length > 0 && (
                <div className="mt-3 text-sm text-amber-700">
                  <p className="font-medium">Some errors occurred:</p>
                  <ul className="list-disc list-inside">
                    {result.errors.map((err: string, i: number) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Info */}
          <div className="mt-6 p-4 bg-gray-50 rounded-xl text-sm text-gray-600">
            <h3 className="font-semibold text-gray-900 mb-2">What this does:</h3>
            <ul className="space-y-1">
              <li>• Creates 6 ElevenLabs Conversational AI agents</li>
              <li>• Configures system prompts for each conversation phase</li>
              <li>• Sets webhook URLs to your app: <code className="bg-gray-200 px-1 rounded">{appUrl}</code></li>
              <li>• Returns agent IDs for your environment variables</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
