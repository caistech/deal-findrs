// @explanatory-header-exempt — nested workflow page; entry-point header lives on the parent surface
'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, FileText, Edit, Archive, CheckCircle, AlertTriangle, TrendingUp, DollarSign, X, Loader2, Share2, Copy } from 'lucide-react'
import { VoiceAssistant } from '@/components/voice/VoiceAssistant'
import { DealJourney } from '@/components/common/DealJourney'
import { AuthLayout } from '@/components/common/AuthLayout'

// Type for opportunity matching database schema
interface Opportunity {
  id: string
  name: string
  address: string
  city: string
  state: string
  postcode: string
  property_size: number
  property_size_unit: string
  land_stage: string
  num_lots: number
  num_dwellings: number
  current_zoning: string
  proposed_zoning: string
  land_purchase_price: number
  infrastructure_costs: number
  construction_per_unit: number
  total_construction_cost: number
  contingency_percent: number
  contingency_amount: number
  total_project_cost: number
  avg_sale_price: number
  total_revenue: number
  gross_margin_dollars: number
  gross_margin_percent: number
  timeframe_months: number
  target_start_date: string
  target_completion_date: string
  rag_status: 'green' | 'amber' | 'red'
  status: string
  score: number
  gm_score: number
  derisk_score: number
  risk_deductions: number
  assessment_summary: string
  path_to_green: string[]
  assessed_at: string
  // De-risk factors
  derisk_da_approved: boolean
  derisk_vendor_finance: boolean
  derisk_fixed_price_construction: boolean
  derisk_experienced_pm: boolean
  derisk_clear_title: boolean
  derisk_growth_corridor: boolean
  derisk_construction_partner: string
  derisk_pm_name: string
  // Risk factors
  risk_previous_disputes: boolean
  risk_environmental_issues: boolean
  risk_heritage_overlay: boolean
}

// Edit Modal Component
function EditOpportunityModal({
  opportunity,
  onClose,
  onSave,
  saving,
}: {
  opportunity: Opportunity
  onClose: () => void
  onSave: (data: any) => void
  saving: boolean
}) {
  const [formData, setFormData] = useState({
    name: opportunity.name || '',
    address: opportunity.address || '',
    city: opportunity.city || '',
    state: opportunity.state || '',
    postcode: opportunity.postcode || '',
    propertySize: opportunity.property_size || 0,
    propertySizeUnit: opportunity.property_size_unit || 'sqm',
    landStage: opportunity.land_stage || '',
    numLots: opportunity.num_lots || 0,
    numDwellings: opportunity.num_dwellings || 0,
    landPurchasePrice: opportunity.land_purchase_price || 0,
    totalProjectCost: opportunity.total_project_cost || 0,
    totalRevenue: opportunity.total_revenue || 0,
    avgSalePrice: opportunity.avg_sale_price || 0,
    timeframeMonths: opportunity.timeframe_months || 0,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-2xl my-8">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Edit Opportunity</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Basic Details */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Property Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Property Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>
              
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Postcode</label>
                  <input
                    type="text"
                    value={formData.postcode}
                    onChange={(e) => setFormData(prev => ({ ...prev, postcode: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Land Stage
                </label>
                <select
                  value={formData.landStage}
                  onChange={(e) => setFormData(prev => ({ ...prev, landStage: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                >
                  <option value="">Select stage...</option>
                  <option value="Raw Land">Raw Land</option>
                  <option value="DA Lodged">DA Lodged</option>
                  <option value="DA Approved">DA Approved</option>
                  <option value="Construction Ready">Construction Ready</option>
                  <option value="Under Construction">Under Construction</option>
                </select>
              </div>

              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Property Size</label>
                  <input
                    type="number"
                    value={formData.propertySize}
                    onChange={(e) => setFormData(prev => ({ ...prev, propertySize: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
                <div className="w-24">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                  <select
                    value={formData.propertySizeUnit}
                    onChange={(e) => setFormData(prev => ({ ...prev, propertySizeUnit: e.target.value }))}
                    className="w-full px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  >
                    <option value="sqm">sqm</option>
                    <option value="ha">ha</option>
                    <option value="acres">acres</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Lots & Dwellings */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Development Details</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Number of Lots
                </label>
                <input
                  type="number"
                  value={formData.numLots}
                  onChange={(e) => setFormData(prev => ({ ...prev, numLots: parseInt(e.target.value) || 0 }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Number of Dwellings
                </label>
                <input
                  type="number"
                  value={formData.numDwellings}
                  onChange={(e) => setFormData(prev => ({ ...prev, numDwellings: parseInt(e.target.value) || 0 }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Timeframe (months)
                </label>
                <input
                  type="number"
                  value={formData.timeframeMonths}
                  onChange={(e) => setFormData(prev => ({ ...prev, timeframeMonths: parseInt(e.target.value) || 0 }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Financial Details */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Financial Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Land Purchase Price ($)
                </label>
                <input
                  type="number"
                  value={formData.landPurchasePrice}
                  onChange={(e) => setFormData(prev => ({ ...prev, landPurchasePrice: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total Project Cost ($)
                </label>
                <input
                  type="number"
                  value={formData.totalProjectCost}
                  onChange={(e) => setFormData(prev => ({ ...prev, totalProjectCost: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Avg Sale Price per Unit ($)
                </label>
                <input
                  type="number"
                  value={formData.avgSalePrice}
                  onChange={(e) => setFormData(prev => ({ ...prev, avgSalePrice: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total Revenue ($)
                </label>
                <input
                  type="number"
                  value={formData.totalRevenue}
                  onChange={(e) => setFormData(prev => ({ ...prev, totalRevenue: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Calculated margin preview */}
            {formData.totalRevenue > 0 && formData.totalProjectCost > 0 && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Calculated Gross Margin:</span>
                  <span className="font-medium">
                    ${((formData.totalRevenue - formData.totalProjectCost) / 1000000).toFixed(2)}M 
                    ({((formData.totalRevenue - formData.totalProjectCost) / formData.totalRevenue * 100).toFixed(1)}%)
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900 rounded-lg font-bold hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save & Re-assess'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function OpportunityDetailPage() {
  const router = useRouter()
  const params = useParams()
  const opportunityId = params.id as string
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showVoice, setShowVoice] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [archiving, setArchiving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Distribution loop: share state
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [sharing, setSharing] = useState(false)
  const [shareCopied, setShareCopied] = useState(false)

  // Opportunity state with proper defaults
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null)

  // Fetch opportunity data on mount
  useEffect(() => {
    async function fetchOpportunity() {
      try {
        const response = await fetch(`/api/opportunities/${opportunityId}`)
        if (!response.ok) {
          throw new Error('Failed to fetch opportunity')
        }
        const { opportunity: data } = await response.json()
        setOpportunity(data)
      } catch (err) {
        console.error('Fetch error:', err)
        setError(err instanceof Error ? err.message : 'Failed to load opportunity')
      } finally {
        setLoading(false)
      }
    }

    if (opportunityId) {
      fetchOpportunity()
    }
  }, [opportunityId])

  // Build display values
  const displayLocation = opportunity 
    ? [opportunity.city, opportunity.state].filter(Boolean).join(', ')
    : ''
  
  const displayLandSize = opportunity
    ? `${opportunity.property_size?.toLocaleString() || 0} ${opportunity.property_size_unit || 'sqm'}`
    : ''

  const displayTimeframe = opportunity?.timeframe_months
    ? `${opportunity.timeframe_months} months`
    : ''

  // Build criteria from database fields
  const passedCriteria = opportunity ? [
    { label: 'Proof of Ownership Verified', points: 0, passed: opportunity.derisk_clear_title },
    { label: 'No Legal Disputes', points: 0, passed: !opportunity.risk_previous_disputes },
    { label: 'DA Approved', points: 15, passed: opportunity.derisk_da_approved },
    { label: 'Vendor Finance Available', points: 10, passed: opportunity.derisk_vendor_finance },
    { label: 'Fixed-Price Construction', points: 10, passed: opportunity.derisk_fixed_price_construction },
    { label: 'Experienced PM Available', points: 5, passed: opportunity.derisk_experienced_pm },
    { label: 'Clear Title', points: 5, passed: opportunity.derisk_clear_title },
    { label: 'Growth Corridor Location', points: 5, passed: opportunity.derisk_growth_corridor },
  ].filter(c => c.passed) : []

  const attentionItems = opportunity ? [
    ...(opportunity.gross_margin_percent < 25 ? [{
      label: 'Gross Margin below 25% threshold',
      severity: 'amber',
      detail: `Current: ${opportunity.gross_margin_percent?.toFixed(1)}% | Required: 25%`
    }] : []),
    ...(opportunity.risk_previous_disputes ? [{
      label: 'Previous legal dispute on record',
      severity: 'amber',
      detail: 'Points deducted from score'
    }] : []),
    ...(opportunity.risk_environmental_issues ? [{
      label: 'Environmental issues identified',
      severity: 'red',
      detail: 'Requires investigation'
    }] : []),
    ...(opportunity.risk_heritage_overlay ? [{
      label: 'Heritage overlay applies',
      severity: 'amber',
      detail: 'May affect development options'
    }] : []),
  ] : []

  const pathToGreen = opportunity?.path_to_green || []

  // Handle Edit
  const handleEdit = useCallback(() => {
    setShowEditModal(true)
  }, [])

  // Handle Save from edit modal
  const handleSaveEdit = useCallback(async (updatedData: any) => {
    setSaving(true)
    try {
      const response = await fetch(`/api/opportunities/${opportunityId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update opportunity')
      }

      const { opportunity: updated } = await response.json()
      setOpportunity(updated)
      setShowEditModal(false)

    } catch (error) {
      console.error('Save error:', error)
      alert(error instanceof Error ? error.message : 'Failed to save changes')
    } finally {
      setSaving(false)
    }
  }, [opportunityId])

  // Handle Share — creates a share token and shows the link (distribution loop)
  const handleShare = useCallback(async () => {
    if (shareUrl) {
      // Already created — just copy again
      navigator.clipboard.writeText(shareUrl).catch(() => {})
      setShareCopied(true)
      setTimeout(() => setShareCopied(false), 2000)
      return
    }
    setSharing(true)
    try {
      const res = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opportunity_id: opportunityId }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { error?: string }).error ?? 'Failed to create share link')
      }
      const { url } = await res.json()
      setShareUrl(url)
      navigator.clipboard.writeText(url).catch(() => {})
      setShareCopied(true)
      setTimeout(() => setShareCopied(false), 2000)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create share link')
    } finally {
      setSharing(false)
    }
  }, [opportunityId, shareUrl])

  // Handle Archive
  const handleArchive = useCallback(async () => {
    if (!confirm('Are you sure you want to archive this opportunity?')) return
    
    setArchiving(true)
    
    try {
      const response = await fetch(`/api/opportunities/${opportunityId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'archived',
          note: 'Archived by user',
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to archive opportunity')
      }

      router.push('/opportunities')
    } catch (error) {
      console.error('Archive error:', error)
      alert(error instanceof Error ? error.message : 'Failed to archive')
      setArchiving(false)
    }
  }, [router, opportunityId])

  // Handle Generate IM
  const handleGenerateIM = useCallback(() => {
    router.push(`/opportunities/${opportunityId}/im`)
  }, [router, opportunityId])

  // Loading state
  if (loading) {
    return (
      <AuthLayout>
        <div className="flex items-center justify-center py-24">
          <div className="flex items-center gap-3 text-gray-600">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span>Loading opportunity...</span>
          </div>
        </div>
      </AuthLayout>
    )
  }

  // Error state
  if (error || !opportunity) {
    return (
      <AuthLayout>
        <div className="flex items-center justify-center py-24">
          <div className="text-center">
            <p className="text-red-600 mb-4 text-base">{error || 'Opportunity not found'}</p>
            <Link href="/opportunities" className="text-[#22c55e] hover:underline">
              ← Back to Opportunities
            </Link>
          </div>
        </div>
      </AuthLayout>
    )
  }

  const ragStatus = opportunity.rag_status || 'amber'

  return (
    <AuthLayout>
    <div className="bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <nav className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/opportunities" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-4 h-4" /> Back to Opportunities
          </Link>
          <div className="flex items-center gap-2">
            {/* Distribution loop: share button */}
            <button
              onClick={handleShare}
              disabled={sharing}
              className="px-4 py-2 border border-emerald-300 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 flex items-center gap-2 disabled:opacity-50 transition-colors"
              title="Share a public summary of this assessment"
            >
              {sharing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : shareCopied ? (
                <Copy className="w-4 h-4 text-emerald-600" />
              ) : (
                <Share2 className="w-4 h-4" />
              )}
              {shareCopied ? 'Link copied!' : 'Share'}
            </button>
            <button 
              onClick={handleArchive}
              disabled={archiving}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50"
            >
              {archiving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Archive className="w-4 h-4" />
              )}
              Archive
            </button>
            <button 
              onClick={handleEdit}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
            >
              <Edit className="w-4 h-4" /> Edit
            </button>
            <button 
              onClick={handleGenerateIM}
              className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 flex items-center gap-2"
            >
              <FileText className="w-4 h-4" /> Generate IM
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-6 sm:py-8">
        <DealJourney
          currentStage="assessment"
          opportunityId={opportunity.id}
          ragStatus={ragStatus as 'green' | 'amber' | 'red'}
        />

        {/* Assessment Result Header */}
        <div className={`mt-6 rounded-2xl p-8 mb-8 ${
          ragStatus === 'green' ? 'bg-gradient-to-r from-emerald-500 to-green-600' :
          ragStatus === 'amber' ? 'bg-gradient-to-r from-amber-500 to-orange-500' :
          'bg-gradient-to-r from-red-500 to-rose-600'
        }`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 bg-white/20 rounded-2xl flex items-center justify-center text-5xl">
                {ragStatus === 'green' ? '🟢' : ragStatus === 'amber' ? '🟡' : '🔴'}
              </div>
              <div className="text-white">
                <div className="flex items-center gap-3 mb-2">
                  <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-medium uppercase">
                    {ragStatus} Light
                  </span>
                  <span className="text-white/80">Score: {opportunity.score?.toFixed(0) || 0}/100</span>
                </div>
                <h1 className="text-3xl font-bold mb-1">{opportunity.name}</h1>
                <p className="text-white/80">
                  {displayLocation} • {opportunity.num_lots || 0} lots • {displayLandSize}
                </p>
              </div>
            </div>
            <button 
              onClick={() => setShowVoice(!showVoice)}
              className="px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 flex items-center gap-2"
            >
              🎙️ {showVoice ? 'Hide Assistant' : 'Discuss Assessment'}
            </button>
          </div>
        </div>

        {/* Voice Assistant */}
        {showVoice && (
          <div className="mb-8">
            <VoiceAssistant
              context="assessment"
              contextData={{
                opportunity,
                passedCriteria,
                attentionItems,
                pathToGreen,
              }}
              customInitialPrompt={`This opportunity scored ${ragStatus.toUpperCase()} with ${opportunity.score?.toFixed(0) || 0} points. The gross margin is ${opportunity.gross_margin_percent?.toFixed(1) || 0}%, which is ${(opportunity.gross_margin_percent || 0) >= 25 ? 'meeting' : 'below'} your 25% green threshold. Would you like me to explain the score breakdown or discuss the path to green?`}
              onClose={() => setShowVoice(false)}
            />
          </div>
        )}

        <div className="grid grid-cols-3 gap-6">
          {/* Left Column - Criteria */}
          <div className="col-span-2 space-y-6">
            {/* Passed Criteria */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
                Passed Criteria
              </h3>
              <div className="space-y-2">
                {passedCriteria.length > 0 ? passedCriteria.map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
                    <span className="text-gray-700 flex items-center gap-2">
                      <span className="text-emerald-500">✓</span> {item.label}
                    </span>
                    {item.points > 0 && (
                      <span className="text-emerald-600 font-medium">+{item.points} pts</span>
                    )}
                  </div>
                )) : (
                  <p className="text-gray-500 text-sm">No criteria passed yet</p>
                )}
              </div>
            </div>

            {/* Attention Items */}
            {attentionItems.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  Requires Attention
                </h3>
                <div className="space-y-3">
                  {attentionItems.map((item, i) => (
                    <div key={i} className={`p-4 rounded-lg ${
                      item.severity === 'red' ? 'bg-red-50 border border-red-200' :
                      item.severity === 'amber' ? 'bg-amber-50 border border-amber-200' : 
                      'bg-gray-50 border border-gray-200'
                    }`}>
                      <p className="font-medium text-gray-900">{item.label}</p>
                      <p className="text-sm text-gray-600 mt-1">{item.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Path to Green */}
            {pathToGreen.length > 0 && (
              <div className="bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-xl p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                  Path to GREEN
                </h3>
                <div className="space-y-3">
                  {pathToGreen.map((item, i) => (
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

            {/* Assessment Summary */}
            {opportunity.assessment_summary && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Assessment Summary</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{opportunity.assessment_summary}</p>
              </div>
            )}
          </div>

          {/* Right Column - Financial Summary */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-gray-500" />
                Financial Summary
              </h3>
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Total Project Cost</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${((opportunity.total_project_cost || 0) / 1000000).toFixed(1)}M
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${((opportunity.total_revenue || 0) / 1000000).toFixed(1)}M
                  </p>
                </div>
                <div className="p-4 bg-emerald-50 rounded-lg">
                  <p className="text-sm text-gray-500">Gross Margin</p>
                  <p className="text-2xl font-bold text-emerald-600">
                    ${((opportunity.gross_margin_dollars || 0) / 1000000).toFixed(1)}M
                  </p>
                </div>
                <div className={`p-4 rounded-lg ${(opportunity.gross_margin_percent || 0) >= 25 ? 'bg-emerald-50' : 'bg-amber-50'}`}>
                  <p className="text-sm text-gray-500">Gross Margin %</p>
                  <p className={`text-2xl font-bold ${(opportunity.gross_margin_percent || 0) >= 25 ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {(opportunity.gross_margin_percent || 0).toFixed(1)}%
                  </p>
                  {(opportunity.gross_margin_percent || 0) < 25 && (
                    <p className="text-xs text-amber-600 mt-1">Below 25% threshold</p>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Project Details</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Land Stage</span>
                  <span className="font-medium text-gray-900">{opportunity.land_stage || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Lots</span>
                  <span className="font-medium text-gray-900">{opportunity.num_lots || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Dwellings</span>
                  <span className="font-medium text-gray-900">{opportunity.num_dwellings || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Land Size</span>
                  <span className="font-medium text-gray-900">{displayLandSize}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Timeframe</span>
                  <span className="font-medium text-gray-900">{displayTimeframe || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Assessed</span>
                  <span className="font-medium text-gray-900">
                    {opportunity.assessed_at 
                      ? new Date(opportunity.assessed_at).toLocaleDateString()
                      : '-'
                    }
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <button 
                onClick={handleEdit}
                className="w-full px-4 py-3 bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900 rounded-xl font-bold hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <Edit className="w-4 h-4" />
                Edit & Re-assess
              </button>
              <button
                onClick={handleGenerateIM}
                className="w-full px-4 py-3 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-all flex items-center justify-center gap-2"
              >
                <FileText className="w-4 h-4" />
                Generate Investment Memo
              </button>
              <Link
                href={`/opportunities/${opportunityId}/devfinance`}
                className="w-full px-4 py-3 bg-gradient-to-r from-indigo-500 to-violet-600 text-white rounded-xl font-bold hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <DollarSign className="w-4 h-4" />
                Dev Finance Pack
              </Link>
              {/* Distribution loop: share assessment */}
              <button
                onClick={handleShare}
                disabled={sharing}
                className="w-full px-4 py-3 border border-emerald-400/50 bg-emerald-50 text-emerald-700 rounded-xl font-bold hover:bg-emerald-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                title="Share a branded summary with lenders, brokers, or partners"
              >
                {sharing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : shareCopied ? (
                  <Copy className="w-4 h-4" />
                ) : (
                  <Share2 className="w-4 h-4" />
                )}
                {shareCopied ? 'Link copied to clipboard' : 'Share Assessment'}
              </button>
              {shareUrl && (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-1">Share link (active 30 days):</p>
                  <p className="text-xs text-emerald-600 font-mono break-all">{shareUrl}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Edit Modal */}
      {showEditModal && (
        <EditOpportunityModal
          opportunity={opportunity}
          onClose={() => setShowEditModal(false)}
          onSave={handleSaveEdit}
          saving={saving}
        />
      )}
    </div>
    </AuthLayout>
  )
}
