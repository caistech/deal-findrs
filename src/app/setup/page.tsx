'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, ArrowRight, ArrowLeft, CheckCircle, AlertTriangle, TrendingUp } from 'lucide-react'
import { VoiceAssistant } from '@/components/voice/VoiceAssistant'

export default function SetupPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [criteria, setCriteria] = useState({
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

  const handleSubmit = async () => {
    setLoading(true)
    setError(null)

    // Ensure the caller has a company. /api/company/create is idempotent —
    // it returns the existing company if one is already linked, otherwise
    // it creates one using user_metadata.company_name captured at signup.
    // This is the canonical company-creation point for the email-confirm
    // path (signup → email → /auth/callback → /setup → here).
    try {
      const res = await fetch('/api/company/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(
          `Couldn't finish creating your company: ${body?.error || `HTTP ${res.status}`}. ` +
          `Try again, or contact support if this keeps happening.`
        )
        setLoading(false)
        return
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error creating company')
      setLoading(false)
      return
    }

    // Criteria persistence is a known gap: the chosen thresholds and
    // factor toggles below are NOT yet written to company_settings. The
    // defaults inserted by /api/company/create are what the engine sees.
    // Tracked as a follow-up in src/app/setup/page.tsx — do not silently
    // pretend a save succeeded.
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold">DF</span>
            </div>
            <span className="text-xl font-bold text-gray-900">DealFindrs</span>
          </Link>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="w-8 h-8 bg-amber-500 text-white rounded-full flex items-center justify-center font-bold">1</span>
            <span className="font-medium text-amber-600">Setup Criteria</span>
            <span className="mx-2">→</span>
            <span className="w-8 h-8 bg-gray-300 text-white rounded-full flex items-center justify-center font-bold">2</span>
            <span className="text-gray-400">Add Opportunities</span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Set Your Deal Criteria</h1>
          <p className="text-gray-600">Define what makes a deal &quot;green light ready&quot; for your company</p>
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
    </div>
  )
}
