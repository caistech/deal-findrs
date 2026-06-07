'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, ArrowRight, ArrowLeft, CheckCircle, AlertTriangle, TrendingUp } from 'lucide-react'
import { VoiceAssistant } from '@/components/voice/VoiceAssistant'
import { AuthLayout } from '@/components/common/AuthLayout'

// Slug a human label into the stable key the engine reads from
// company_settings jsonb arrays. Mirrors the key shape used by the
// defaults in /api/company/create (e.g. "DA Approved" → "da_approved").
function toKey(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
}

type CriticalCriterion = { id: number; label: string; enabled: boolean }
type DeRiskFactor = { id: number; label: string; points: number; enabled: boolean }

export default function SetupPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [criteria, setCriteria] = useState<{
    minGmGreen: number
    minGmAmber: number
    criticalCriteria: CriticalCriterion[]
    deRiskFactors: DeRiskFactor[]
  }>({
    minGmGreen: 25,
    minGmAmber: 18,
    criticalCriteria: [
      { id: 1, label: 'Proof of Ownership Required', enabled: true },
      { id: 2, label: 'No Active Legal Disputes', enabled: true },
      { id: 3, label: 'No Environmental Contamination', enabled: true },
      { id: 4, label: 'Zoning Compatible with Intended Use', enabled: true },
      { id: 5, label: 'Clear Financing Path Identified', enabled: false },
    ],
    deRiskFactors: [
      { id: 1, label: 'DA Approved', points: 15, enabled: true },
      { id: 2, label: 'Vendor Finance Available', points: 10, enabled: true },
      { id: 3, label: 'Fixed-Price Construction', points: 10, enabled: true },
      { id: 4, label: 'Pre-Sales Secured', points: 5, enabled: true },
      { id: 5, label: 'Experienced PM Available', points: 5, enabled: true },
      { id: 6, label: 'Clear Title', points: 5, enabled: true },
    ],
  })

  // Hydrate from saved settings if the user already has a company. Avoids
  // the "edit my settings → re-save → defaults overwrite my prior choices"
  // bug. Fetch via the API so we don't need a client-side Supabase import.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/company/settings-read')
        if (!res.ok || cancelled) return
        const { settings } = await res.json()
        if (!settings || cancelled) return
        setCriteria(prev => ({
          minGmGreen: settings.min_gm_green != null ? Number(settings.min_gm_green) : prev.minGmGreen,
          minGmAmber: settings.min_gm_amber != null ? Number(settings.min_gm_amber) : prev.minGmAmber,
          criticalCriteria: Array.isArray(settings.critical_criteria) && settings.critical_criteria.length
            ? settings.critical_criteria.map((c: { label: string; enabled: boolean }, i: number) => ({
                id: i + 1, label: c.label, enabled: Boolean(c.enabled),
              }))
            : prev.criticalCriteria,
          deRiskFactors: Array.isArray(settings.derisk_factors) && settings.derisk_factors.length
            ? settings.derisk_factors.map((f: { label: string; points: number; enabled: boolean }, i: number) => ({
                id: i + 1, label: f.label, points: Number(f.points) || 0, enabled: Boolean(f.enabled),
              }))
            : prev.deRiskFactors,
        }))
      } catch { /* non-fatal: use defaults */ }
    })()
    return () => { cancelled = true }
  }, [])

  const handleSubmit = async () => {
    setLoading(true)
    setError(null)

    // Step 1: ensure the caller has a company. /api/company/create is
    // idempotent — returns the existing row if one is already linked,
    // otherwise creates one using user_metadata.company_name captured at
    // signup. Canonical create-or-resolve point for the email-confirm
    // path (signup → email → /auth/callback → /setup → here).
    let companyId: string | null = null
    try {
      const res = await fetch('/api/company/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(
          `Couldn't finish creating your company: ${body?.error || `HTTP ${res.status}`}. ` +
          `Try again, or contact support if this keeps happening.`
        )
        setLoading(false)
        return
      }
      companyId = body?.company?.id ?? null
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error creating company')
      setLoading(false)
      return
    }

    if (!companyId) {
      setError('Company was created but we lost track of its ID — refresh and try saving again.')
      setLoading(false)
      return
    }

    // Step 2: persist via the server-side settings route which uses upsert
    // (fixes the "stuck spinning" bug where a direct .update() failed silently
    // when the company_settings row didn't exist yet or RLS blocked the write).
    const settingsRes = await fetch('/api/company/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        min_gm_green: criteria.minGmGreen,
        min_gm_amber: criteria.minGmAmber,
        critical_criteria: criteria.criticalCriteria.map(c => ({
          key: toKey(c.label),
          label: c.label,
          enabled: c.enabled,
        })),
        derisk_factors: criteria.deRiskFactors.map(f => ({
          key: toKey(f.label),
          label: f.label,
          points: f.points,
          enabled: f.enabled,
        })),
      }),
    })

    if (!settingsRes.ok) {
      const body = await settingsRes.json().catch(() => ({}))
      setError(`Couldn't save criteria: ${body?.error || `HTTP ${settingsRes.status}`}`)
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  const toggleCritical = (id: number) => {
    setCriteria(prev => ({
      ...prev,
      criticalCriteria: prev.criticalCriteria.map(c => 
        c.id === id ? { ...c, enabled: !c.enabled } : c
      )
    }))
  }

  const toggleDeRisk = (id: number) => {
    setCriteria(prev => ({
      ...prev,
      deRiskFactors: prev.deRiskFactors.map(f => 
        f.id === id ? { ...f, enabled: !f.enabled } : f
      )
    }))
  }

  const updateDeRiskPoints = (id: number, points: number) => {
    setCriteria(prev => ({
      ...prev,
      deRiskFactors: prev.deRiskFactors.map(f => 
        f.id === id ? { ...f, points } : f
      )
    }))
  }

  return (
    <AuthLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Explanatory header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Criteria Setup</h1>
          <p className="text-gray-600 mt-1 text-base">
            Define what makes a deal &quot;green light ready&quot; for your company. These criteria are used for every AI assessment you run.
          </p>
        </div>
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Voice Assistant Banner */}
          <VoiceAssistant
            context="setup"
            contextData={criteria}
            onFieldExtracted={(field, value) => {
              // Auto-fill criteria fields from voice
              if (field === 'minGmGreen') {
                setCriteria(prev => ({ ...prev, minGmGreen: Number(value) }))
              } else if (field === 'minGmAmber') {
                setCriteria(prev => ({ ...prev, minGmAmber: Number(value) }))
              }
            }}
          />

          <div className="p-8 space-y-8">
            {/* Financial Thresholds */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </span>
                Financial Thresholds
              </h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Minimum Gross Margin % for GREEN *
                  </label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="number" 
                      value={criteria.minGmGreen}
                      onChange={(e) => setCriteria(prev => ({ ...prev, minGmGreen: parseInt(e.target.value) || 0 }))}
                      className="w-24 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-center text-lg font-bold"
                    />
                    <span className="text-gray-600">%</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Below this = AMBER at best</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Minimum Gross Margin % for AMBER
                  </label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="number" 
                      value={criteria.minGmAmber}
                      onChange={(e) => setCriteria(prev => ({ ...prev, minGmAmber: parseInt(e.target.value) || 0 }))}
                      className="w-24 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-center text-lg font-bold"
                    />
                    <span className="text-gray-600">%</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Below this = RED</p>
                </div>
              </div>
            </div>

            {/* Critical Criteria (Deal Breakers) */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 bg-red-100 text-red-600 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4" />
                </span>
                Critical Criteria (Instant RED if failed)
              </h3>
              <div className="space-y-3">
                {criteria.criticalCriteria.map((item) => (
                  <label 
                    key={item.id} 
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 cursor-pointer transition-colors"
                  >
                    <input 
                      type="checkbox" 
                      checked={item.enabled}
                      onChange={() => toggleCritical(item.id)}
                      className="w-5 h-5 text-red-500 rounded border-gray-300 focus:ring-red-500" 
                    />
                    <span className="text-gray-700">{item.label}</span>
                  </label>
                ))}
                <button className="text-amber-600 text-sm font-medium hover:underline flex items-center gap-1">
                  <Plus className="w-4 h-4" /> Add Custom Critical Criterion
                </button>
              </div>
            </div>

            {/* De-Risk Factors */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-4 h-4" />
                </span>
                De-Risk Factors (Bonus Points)
              </h3>
              <div className="space-y-3">
                {criteria.deRiskFactors.map((item) => (
                  <div 
                    key={item.id} 
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                  >
                    <label className="flex items-center gap-3 cursor-pointer flex-1">
                      <input 
                        type="checkbox" 
                        checked={item.enabled}
                        onChange={() => toggleDeRisk(item.id)}
                        className="w-5 h-5 text-emerald-500 rounded border-gray-300 focus:ring-emerald-500" 
                      />
                      <span className="text-gray-700">{item.label}</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="number" 
                        value={item.points}
                        onChange={(e) => updateDeRiskPoints(item.id, parseInt(e.target.value) || 0)}
                        className="w-16 px-2 py-1 border border-gray-300 rounded-lg text-center text-sm"
                      />
                      <span className="text-gray-500 text-sm">pts</span>
                    </div>
                  </div>
                ))}
                <button className="text-amber-600 text-sm font-medium hover:underline flex items-center gap-1">
                  <Plus className="w-4 h-4" /> Add Custom De-Risk Factor
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-8 py-6 bg-gray-50 border-t border-gray-100">
            {error && (
              <div className="mb-4 flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <Link
                href="/signup"
                className="text-gray-600 hover:text-gray-900 flex items-center gap-1 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </Link>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="px-8 py-3 bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900 rounded-xl font-bold hover:shadow-lg hover:shadow-amber-500/25 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    Save Criteria &amp; Continue <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </AuthLayout>
  )
}
