'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, Users, ArrowRight, Check, Loader2, Search } from 'lucide-react'
import { validateAbn, formatAbn, type AbnLookupResult } from '@/lib/abn'

interface AbnNameResult {
  abn: string
  name: string
  nameType: string
  state: string
  postcode: string
  score: number
  isCurrent: boolean
}

type OnboardingStep = 'choice' | 'create-company' | 'join-company'

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<OnboardingStep>('choice')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Create company form
  const [companyName, setCompanyName] = useState('')
  const [companyAbn, setCompanyAbn] = useState('')

  // ABN lookup
  const [abnLoading, setAbnLoading] = useState(false)
  const [abnResult, setAbnResult] = useState<AbnLookupResult | null>(null)
  const [abnError, setAbnError] = useState('')
  const abnTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Name search
  const [nameResults, setNameResults] = useState<AbnNameResult[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Join company form
  const [inviteCode, setInviteCode] = useState('')

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const raw = companyAbn.replace(/\s/g, '')
    const isDigits = /^\d+$/.test(raw)

    // --- ABN direct lookup (11 digits) ---
    if (isDigits && raw.length === 11) {
      setNameResults([])
      setShowDropdown(false)

      const validationError = validateAbn(raw)
      if (validationError) {
        setAbnError(validationError)
        setAbnResult(null)
        return
      }

      if (abnTimeoutRef.current) clearTimeout(abnTimeoutRef.current)
      abnTimeoutRef.current = setTimeout(async () => {
        setAbnLoading(true)
        setAbnError('')
        setAbnResult(null)
        try {
          const res = await fetch(`/api/abn-lookup?abn=${raw}`)
          const data = await res.json()
          if (!res.ok) {
            setAbnError(data.error || 'ABN lookup failed')
          } else {
            setAbnResult(data as AbnLookupResult)
            setCompanyAbn(formatAbn(raw))
          }
        } catch {
          setAbnError('Failed to look up ABN')
        } finally {
          setAbnLoading(false)
        }
      }, 400)

      return () => { if (abnTimeoutRef.current) clearTimeout(abnTimeoutRef.current) }
    }

    // --- Name search (2+ non-digit chars) ---
    if (!isDigits && raw.length === 0 && companyAbn.trim().length >= 2) {
      // companyAbn has letters — search by name
    }
    const trimmed = companyAbn.trim()
    if (!isDigits && trimmed.length >= 2) {
      setAbnResult(null)
      setAbnError('')

      if (abnTimeoutRef.current) clearTimeout(abnTimeoutRef.current)
      abnTimeoutRef.current = setTimeout(async () => {
        setAbnLoading(true)
        try {
          const res = await fetch(`/api/abn-lookup?name=${encodeURIComponent(trimmed)}`)
          const data = await res.json()
          if (data.results) {
            setNameResults(data.results)
            setShowDropdown(data.results.length > 0)
          } else {
            setNameResults([])
            setShowDropdown(false)
          }
        } catch {
          setNameResults([])
        } finally {
          setAbnLoading(false)
        }
      }, 400)

      return () => { if (abnTimeoutRef.current) clearTimeout(abnTimeoutRef.current) }
    }

    // Clear everything if input is too short or partial digits
    setAbnResult(null)
    setAbnError('')
    setNameResults([])
    setShowDropdown(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyAbn])

  const handleSelectNameResult = async (result: AbnNameResult) => {
    setShowDropdown(false)
    setNameResults([])
    setCompanyAbn(formatAbn(result.abn))
    if (!companyName) {
      setCompanyName(result.name)
    }

    // Fetch full details
    setAbnLoading(true)
    setAbnError('')
    try {
      const res = await fetch(`/api/abn-lookup?abn=${result.abn}`)
      const data = await res.json()
      if (!res.ok) {
        setAbnError(data.error || 'ABN lookup failed')
      } else {
        setAbnResult(data as AbnLookupResult)
      }
    } catch {
      setAbnError('Failed to look up ABN')
    } finally {
      setAbnLoading(false)
    }
  }

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    try {
      const response = await fetch('/api/company/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: companyName,
          abn: companyAbn,
        }),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create company')
      }
      
      // Redirect to setup or dashboard
      router.push('/setup')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleJoinCompany = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    try {
      const response = await fetch('/api/company/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode }),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Invalid or expired invite code')
      }
      
      // Redirect to dashboard
      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            🏗️ Welcome to DealFindrs
          </h1>
          <p className="text-gray-400">Let&apos;s get you set up</p>
        </div>

        {/* Step: Choice */}
        {step === 'choice' && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Create Company Option */}
            <button
              onClick={() => setStep('create-company')}
              className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8 text-left hover:bg-white/20 transition-all group"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center mb-6">
                <Building2 className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Create Organisation</h2>
              <p className="text-gray-400 mb-4">
                Start a new company account and invite your team members.
              </p>
              <div className="flex items-center text-amber-400 font-medium">
                Get started <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>

            {/* Join Company Option */}
            <button
              onClick={() => setStep('join-company')}
              className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8 text-left hover:bg-white/20 transition-all group"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center mb-6">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Join Organisation</h2>
              <p className="text-gray-400 mb-4">
                Have an invite code? Join your team&apos;s existing account.
              </p>
              <div className="flex items-center text-emerald-400 font-medium">
                Enter code <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          </div>
        )}

        {/* Step: Create Company */}
        {step === 'create-company' && (
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8">
            <button
              onClick={() => setStep('choice')}
              className="text-gray-400 hover:text-white mb-6 flex items-center gap-2"
            >
              ← Back
            </button>
            
            <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center mb-6">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            
            <h2 className="text-2xl font-bold text-white mb-2">Create Your Organisation</h2>
            <p className="text-gray-400 mb-6">You&apos;ll be the admin and can invite team members later.</p>

            {error && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 mb-6 text-red-200">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateCompany} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Organisation Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Factory2Key, Smith Developments"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  ABN or Company Name <span className="text-gray-500">(optional — type a name to search)</span>
                </label>
                <div className="relative" ref={dropdownRef}>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="text"
                      placeholder="e.g. 12 345 678 901 or &quot;Smith Builders&quot;"
                      value={companyAbn}
                      onChange={(e) => setCompanyAbn(e.target.value)}
                      onFocus={() => { if (nameResults.length > 0) setShowDropdown(true) }}
                      className="w-full pl-10 pr-10 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    {abnLoading && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
                      </div>
                    )}
                  </div>

                  {/* Name search dropdown */}
                  {showDropdown && nameResults.length > 0 && (
                    <div className="absolute z-50 mt-1 w-full bg-slate-800 border border-white/20 rounded-xl shadow-2xl max-h-72 overflow-y-auto">
                      {nameResults.map((r, i) => (
                        <button
                          key={`${r.abn}-${i}`}
                          type="button"
                          onClick={() => handleSelectNameResult(r)}
                          className="w-full text-left px-4 py-3 hover:bg-white/10 transition-colors border-b border-white/5 last:border-0"
                        >
                          <p className="text-white text-sm font-medium truncate">{r.name}</p>
                          <p className="text-gray-400 text-xs mt-0.5">
                            ABN {r.abn}
                            {r.state && ` · ${r.state} ${r.postcode}`}
                            {r.nameType && ` · ${r.nameType}`}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {abnResult && (
                  <div className="mt-2 bg-emerald-500/20 border border-emerald-500/50 rounded-xl p-3">
                    <p className="text-emerald-200 text-sm font-medium">{abnResult.entityName}</p>
                    <p className="text-emerald-300/70 text-xs mt-0.5">
                      {abnResult.entityType} &middot; Status: {abnResult.abnStatus}
                      {abnResult.state && ` \u00b7 ${abnResult.state} ${abnResult.postcode}`}
                    </p>
                  </div>
                )}
                {abnError && (
                  <p className="mt-2 text-sm text-red-400">{abnError}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || !companyName}
                className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-xl hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    Create Organisation
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-white/10">
              <h3 className="text-white font-medium mb-3">What you&apos;ll get:</h3>
              <ul className="space-y-2 text-gray-400">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  Admin access to manage your team
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  Custom assessment criteria
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  Invite unlimited team members
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  Company-wide opportunity tracking
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* Step: Join Company */}
        {step === 'join-company' && (
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8">
            <button
              onClick={() => setStep('choice')}
              className="text-gray-400 hover:text-white mb-6 flex items-center gap-2"
            >
              ← Back
            </button>
            
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center mb-6">
              <Users className="w-8 h-8 text-white" />
            </div>
            
            <h2 className="text-2xl font-bold text-white mb-2">Join Your Team</h2>
            <p className="text-gray-400 mb-6">Enter the invite code you received from your admin.</p>

            {error && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 mb-6 text-red-200">
                {error}
              </div>
            )}

            <form onSubmit={handleJoinCompany} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Invite Code *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter your invite code"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-center text-lg tracking-wider"
                />
                <p className="text-sm text-gray-500 mt-2">
                  Check your email for the invite from your team admin
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || !inviteCode}
                className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold rounded-xl hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Joining...
                  </>
                ) : (
                  <>
                    Join Organisation
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-white/10 text-center">
              <p className="text-gray-400 text-sm">
                Don&apos;t have an invite code?{' '}
                <button 
                  onClick={() => setStep('create-company')}
                  className="text-amber-400 hover:underline"
                >
                  Create your own organisation
                </button>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}