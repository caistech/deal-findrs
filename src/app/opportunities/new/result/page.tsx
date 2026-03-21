'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, Mic, FileText, CheckCircle, AlertTriangle, TrendingUp, 
  DollarSign, RefreshCw, Download, Share2, Archive, Clock, PlayCircle,
  X, Copy, Check, Mail, Users, Loader2
} from 'lucide-react'

interface AssessmentData {
  opportunity: any
  result: {
    status: 'green' | 'amber' | 'red'
    score: number
    gmScore: number
    deRiskScore: number
    riskScore: number
    financials: {
      totalCost: number
      totalRevenue: number
      grossMargin: number
      grossMarginPercent: number
    }
    passedCriteria: Array<{ name: string; points: number }>
    failedCriteria: Array<{ name: string; severity: string }>
    attentionItems: Array<{ name: string; detail: string; severity: string }>
    summary: string
    pathToGreen: string[]
    recommendations: string[]
  }
}

type OpportunityStatus = 'assessed' | 'proceed' | 'pending' | 'archived'

export default function AssessmentResultPage() {
  const router = useRouter()
  const [data, setData] = useState<AssessmentData | null>(null)
  const [opportunityId, setOpportunityId] = useState<string | null>(null)
  const [voiceActive, setVoiceActive] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [currentStatus, setCurrentStatus] = useState<OpportunityStatus>('assessed')
  const [statusNote, setStatusNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    const stored = sessionStorage.getItem('lastAssessment')
    if (stored) {
      const parsed = JSON.parse(stored)
      setData(parsed)

      // Save opportunity to database if not already saved
      const savedId = sessionStorage.getItem('lastOpportunityId')
      if (savedId) {
        setOpportunityId(savedId)
      } else {
        saveOpportunity(parsed)
      }
    } else {
      router.push('/opportunities/new')
    }
  }, [router])

  const saveOpportunity = async (assessmentData: AssessmentData & { formData?: any; documents?: any[] }) => {
    try {
      const response = await fetch('/api/opportunities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formData: assessmentData.formData || assessmentData.opportunity,
          opportunity: assessmentData.opportunity,
          result: assessmentData.result,
        }),
      })

      if (response.ok) {
        const { opportunity } = await response.json()
        if (opportunity?.id) {
          setOpportunityId(opportunity.id)
          sessionStorage.setItem('lastOpportunityId', opportunity.id)
        }
      } else {
        console.error('Failed to save opportunity')
      }
    } catch (error) {
      console.error('Error saving opportunity:', error)
    }
  }

  const handleStatusChange = async (newStatus: OpportunityStatus) => {
    setSaving(true)
    try {
      if (opportunityId) {
        const response = await fetch(`/api/opportunities/${opportunityId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus, note: statusNote }),
        })
        if (!response.ok) throw new Error('Failed to update status')
      }

      setCurrentStatus(newStatus)
      setShowStatusModal(false)
      setStatusNote('')

      // Clean up session storage and redirect to the opportunity
      sessionStorage.removeItem('lastAssessment')
      sessionStorage.removeItem('lastOpportunityId')

      if (opportunityId) {
        router.push(`/opportunities/${opportunityId}`)
      } else {
        router.push('/opportunities')
      }
    } catch (error) {
      alert('Error updating status. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const copyShareLink = () => {
    const link = `${window.location.origin}/opportunities/${opportunityId || opportunityId || data?.opportunity?.id || 'demo'}`
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleGenerateIM = async () => {
    setGenerating(true)
    try {
      // In production, call PDF generation API
      await new Promise(resolve => setTimeout(resolve, 1500))
      alert('📄 Investment Memorandum generated! Download will start automatically.')
      // Trigger download
    } catch (error) {
      alert('Error generating document. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  const handleEmailShare = (type: 'team' | 'external') => {
    const subject = encodeURIComponent(`Deal Assessment: ${data?.opportunity?.name}`)
    const body = encodeURIComponent(
      `Hi,\n\nI'd like to share this property development assessment with you:\n\n` +
      `Property: ${data?.opportunity?.name}\n` +
      `Location: ${data?.opportunity?.address}, ${data?.opportunity?.city}\n` +
      `Assessment: ${data?.result?.status?.toUpperCase()} (Score: ${data?.result?.score}/100)\n` +
      `Gross Margin: ${data?.result?.financials?.grossMarginPercent?.toFixed(1)}%\n\n` +
      `View full assessment: ${window.location.origin}/opportunities/${data?.opportunity?.id || 'demo'}\n\n` +
      `Summary:\n${data?.result?.summary}`
    )
    window.location.href = `mailto:?subject=${subject}&body=${body}`
    setShowShareModal(false)
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  const { opportunity, result } = data

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/opportunities" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-4 h-4" /> Back to Opportunities
          </Link>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowShareModal(true)}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
            >
              <Share2 className="w-4 h-4" /> Share
            </button>
            <button 
              onClick={handleGenerateIM}
              disabled={generating}
              className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 flex items-center gap-2 disabled:opacity-50"
            >
              {generating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {generating ? 'Generating...' : 'Download Report'}
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Assessment Result Header */}
        <div className={`rounded-2xl p-8 mb-8 ${
          result.status === 'green' ? 'bg-gradient-to-r from-emerald-500 to-green-600' :
          result.status === 'amber' ? 'bg-gradient-to-r from-amber-500 to-orange-500' :
          'bg-gradient-to-r from-red-500 to-rose-600'
        }`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 bg-white/20 rounded-2xl flex items-center justify-center text-5xl">
                {result.status === 'green' ? '🟢' : result.status === 'amber' ? '🟡' : '🔴'}
              </div>
              <div className="text-white">
                <div className="flex items-center gap-3 mb-2">
                  <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-medium uppercase">
                    {result.status} Light
                  </span>
                  <span className="text-white/80">Score: {result.score}/100</span>
                  {currentStatus !== 'assessed' && (
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      currentStatus === 'proceed' ? 'bg-emerald-400 text-emerald-900' :
                      currentStatus === 'pending' ? 'bg-yellow-400 text-yellow-900' :
                      'bg-gray-400 text-gray-900'
                    }`}>
                      {currentStatus.toUpperCase()}
                    </span>
                  )}
                </div>
                <h1 className="text-3xl font-bold mb-1">{opportunity.name}</h1>
                <p className="text-white/80">
                  {opportunity.address}, {opportunity.city}, {opportunity.state} • {opportunity.numLots} lots
                </p>
              </div>
            </div>
            <button 
              onClick={() => setVoiceActive(!voiceActive)}
              className="px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 flex items-center gap-2"
            >
              <Mic className={`w-4 h-4 ${voiceActive ? 'animate-pulse' : ''}`} />
              {voiceActive ? 'Listening...' : 'Discuss'}
            </button>
          </div>
        </div>

        {/* Voice Discussion */}
        {voiceActive && (
          <div className="bg-violet-50 border border-violet-200 rounded-xl p-6 mb-8">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-violet-200 rounded-full flex items-center justify-center flex-shrink-0">
                <Mic className="w-5 h-5 text-violet-600 animate-pulse" />
              </div>
              <div>
                <p className="text-gray-800 leading-relaxed">{result.summary}</p>
                <div className="flex gap-2 mt-4">
                  <button 
                    onClick={() => setVoiceActive(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300"
                  >
                    Got it, thanks
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-6">
          {/* Left Column - Details */}
          <div className="col-span-2 space-y-6">
            {/* AI Summary */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-3">AI Assessment Summary</h3>
              <p className="text-gray-700 leading-relaxed">{result.summary}</p>
            </div>

            {/* Passed Criteria */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
                De-Risk Factors Applied ({result.passedCriteria.length})
              </h3>
              <div className="space-y-2">
                {result.passedCriteria.map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
                    <span className="text-gray-700 flex items-center gap-2">
                      <span className="text-emerald-500">✓</span> {item.name}
                    </span>
                    {item.points > 0 && (
                      <span className="text-emerald-600 font-medium">+{item.points} pts</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Attention Items */}
            {result.attentionItems.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  Requires Attention ({result.attentionItems.length})
                </h3>
                <div className="space-y-3">
                  {result.attentionItems.map((item, i) => (
                    <div key={i} className={`p-4 rounded-lg ${
                      item.severity === 'high' ? 'bg-red-50 border border-red-200' :
                      item.severity === 'medium' ? 'bg-amber-50 border border-amber-200' : 
                      'bg-gray-50 border border-gray-200'
                    }`}>
                      <p className="font-medium text-gray-900">{item.name}</p>
                      <p className="text-sm text-gray-600 mt-1">{item.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Path to Green */}
            {result.status !== 'green' && result.pathToGreen.length > 0 && (
              <div className="bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-xl p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                  Path to GREEN
                </h3>
                <div className="space-y-3">
                  {result.pathToGreen.map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className="w-6 h-6 bg-emerald-200 text-emerald-700 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                        {i + 1}
                      </span>
                      <p className="text-gray-700">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {result.recommendations.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">💡 Recommendations</h3>
                <ul className="space-y-2">
                  {result.recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2 text-gray-700">
                      <span className="text-amber-500">•</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Right Column - Scores & Actions */}
          <div className="space-y-6">
            {/* Score Breakdown */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Score Breakdown</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">GM Score (GM% × 3)</span>
                  <span className="font-bold text-gray-900">+{result.gmScore}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">De-risk Bonus</span>
                  <span className="font-bold text-emerald-600">+{result.deRiskScore}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Risk Penalties</span>
                  <span className="font-bold text-red-600">{result.riskScore}</span>
                </div>
                <div className="border-t pt-3 flex justify-between items-center">
                  <span className="font-semibold text-gray-900">Total Score</span>
                  <span className="text-2xl font-bold text-gray-900">{result.score}</span>
                </div>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-gray-500" />
                Financial Summary
              </h3>
              <div className="space-y-3">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Total Cost</p>
                  <p className="text-xl font-bold text-gray-900">
                    ${(result.financials.totalCost / 1000000).toFixed(2)}M
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Total Revenue</p>
                  <p className="text-xl font-bold text-gray-900">
                    ${(result.financials.totalRevenue / 1000000).toFixed(2)}M
                  </p>
                </div>
                <div className="p-3 bg-emerald-50 rounded-lg">
                  <p className="text-xs text-gray-500">Gross Margin</p>
                  <p className="text-xl font-bold text-emerald-600">
                    ${(result.financials.grossMargin / 1000000).toFixed(2)}M
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${
                  result.financials.grossMarginPercent >= 25 ? 'bg-emerald-50' : 'bg-amber-50'
                }`}>
                  <p className="text-xs text-gray-500">Gross Margin %</p>
                  <p className={`text-xl font-bold ${
                    result.financials.grossMarginPercent >= 25 ? 'text-emerald-600' : 'text-amber-600'
                  }`}>
                    {result.financials.grossMarginPercent.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>

            {/* Decision Actions */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">What&apos;s Next?</h3>
              <div className="space-y-2">
                <button 
                  onClick={() => handleStatusChange('proceed')}
                  disabled={saving}
                  className="w-full px-4 py-3 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-xl font-bold hover:from-emerald-600 hover:to-green-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <PlayCircle className="w-5 h-5" />
                  Proceed to Due Diligence
                </button>
                <button 
                  onClick={() => setShowStatusModal(true)}
                  disabled={saving}
                  className="w-full px-4 py-3 bg-amber-100 text-amber-800 rounded-xl font-bold hover:bg-amber-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Clock className="w-5 h-5" />
                  Pend for Review
                </button>
                <button 
                  onClick={() => handleStatusChange('archived')}
                  disabled={saving}
                  className="w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Archive className="w-5 h-5" />
                  Archive / Not Proceeding
                </button>
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500">
                <p><strong>Proceed:</strong> Move to active pipeline for due diligence</p>
                <p><strong>Pend:</strong> Park for later review or more info needed</p>
                <p><strong>Archive:</strong> Not proceeding at this time</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-2">
              <button 
                onClick={handleGenerateIM}
                disabled={generating}
                className="w-full px-4 py-3 border-2 border-emerald-500 text-emerald-700 rounded-xl font-bold hover:bg-emerald-50 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {generating ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <FileText className="w-5 h-5" />
                )}
                {generating ? 'Generating...' : 'Generate Investment Memo'}
              </button>
              <Link 
                href="/opportunities/new"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl font-medium hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" /> Assess Another Opportunity
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Share Assessment</h2>
              <button onClick={() => setShowShareModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Copy Link */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Share Link</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${typeof window !== 'undefined' ? window.location.origin : ''}/opportunities/${opportunity.id || 'demo'}`}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
                  />
                  <button
                    onClick={copyShareLink}
                    className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 flex items-center gap-2"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <p className="text-sm font-medium text-gray-700 mb-3">Share via Email</p>
                <div className="space-y-2">
                  <button
                    onClick={() => handleEmailShare('team')}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 flex items-center gap-3"
                  >
                    <Users className="w-5 h-5 text-blue-500" />
                    <div className="text-left">
                      <p className="font-medium text-gray-900">Share with Team</p>
                      <p className="text-xs text-gray-500">Team members can view & comment</p>
                    </div>
                  </button>
                  <button
                    onClick={() => handleEmailShare('external')}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 flex items-center gap-3"
                  >
                    <Mail className="w-5 h-5 text-amber-500" />
                    <div className="text-left">
                      <p className="font-medium text-gray-900">Email to External</p>
                      <p className="text-xs text-gray-500">Send summary via email</p>
                    </div>
                  </button>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <button
                  onClick={handleGenerateIM}
                  disabled={generating}
                  className="w-full px-4 py-3 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {generating ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Download className="w-5 h-5" />
                  )}
                  {generating ? 'Generating PDF...' : 'Download PDF Report'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pend Modal (with notes) */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Pend for Review</h2>
              <button onClick={() => setShowStatusModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Add a note (optional)
                </label>
                <textarea
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  placeholder="e.g., Waiting for updated construction quotes, Need to verify DA conditions..."
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <h4 className="font-medium text-amber-800 mb-2">What happens when you pend?</h4>
                <ul className="text-sm text-amber-700 space-y-1">
                  <li>• Opportunity moves to your &quot;Pending Review&quot; queue</li>
                  <li>• You&apos;ll get a reminder in 7 days</li>
                  <li>• Team members can see it needs more info</li>
                  <li>• You can re-assess anytime with new data</li>
                </ul>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowStatusModal(false)}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-xl font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleStatusChange('pending')}
                  disabled={saving}
                  className="flex-1 px-4 py-3 bg-amber-500 text-white rounded-xl font-bold hover:bg-amber-600 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Clock className="w-5 h-5" />
                  )}
                  {saving ? 'Saving...' : 'Pend Opportunity'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
