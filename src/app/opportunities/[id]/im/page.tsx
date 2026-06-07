'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, FileText, Download, Loader2, Share2, Copy, AlertCircle } from 'lucide-react'
import { AuthLayout } from '@/components/common/AuthLayout'

export const dynamic = 'force-dynamic'

interface Opportunity {
  id: string
  name: string
  address: string
  city: string
  state: string
  num_lots: number | null
  num_dwellings: number | null
  land_stage: string | null
  landowner_name: string | null
  total_project_cost: number | null
  total_revenue: number | null
  gross_margin_dollars: number | null
  gross_margin_percent: number | null
  rag_status: 'green' | 'amber' | 'red' | null
  score: number | null
  gm_score: number | null
  derisk_score: number | null
  risk_deductions: number | null
  assessment_summary: string | null
  path_to_green: string[] | null
  derisk_da_approved: boolean
  derisk_vendor_finance: boolean
  derisk_fixed_price_construction: boolean
  derisk_experienced_pm: boolean
  derisk_clear_title: boolean
  derisk_growth_corridor: boolean
  risk_previous_disputes: boolean
  risk_environmental_issues: boolean
  risk_heritage_overlay: boolean
}

export default function InvestmentMemoPage() {
  const params = useParams()
  const opportunityId = params.id as string

  const [opportunity, setOpportunity] = useState<Opportunity | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [imHtml, setImHtml] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [shareCopied, setShareCopied] = useState(false)
  const [sharing, setSharing] = useState(false)

  useEffect(() => {
    async function fetchOpportunity() {
      try {
        const res = await fetch(`/api/opportunities/${opportunityId}`)
        if (!res.ok) throw new Error('Failed to fetch opportunity')
        const { opportunity: data } = await res.json()
        setOpportunity(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load opportunity')
      } finally {
        setLoading(false)
      }
    }
    if (opportunityId) fetchOpportunity()
  }, [opportunityId])

  const generateIM = useCallback(async () => {
    if (!opportunity) return
    setGenerating(true)
    setError(null)

    const passedCriteria: Array<{ name: string; points: number }> = [
      ...(opportunity.derisk_da_approved ? [{ name: 'DA Approved', points: 15 }] : []),
      ...(opportunity.derisk_vendor_finance ? [{ name: 'Vendor Finance Available', points: 10 }] : []),
      ...(opportunity.derisk_fixed_price_construction ? [{ name: 'Fixed-Price Construction', points: 10 }] : []),
      ...(opportunity.derisk_experienced_pm ? [{ name: 'Experienced Project Manager', points: 5 }] : []),
      ...(opportunity.derisk_clear_title ? [{ name: 'Clear Title', points: 5 }] : []),
      ...(opportunity.derisk_growth_corridor ? [{ name: 'Growth Corridor Location', points: 5 }] : []),
    ]

    const attentionItems: Array<{ name: string; detail: string; severity: string }> = [
      ...((opportunity.gross_margin_percent ?? 0) < 25
        ? [{
            name: 'Gross Margin below 25% threshold',
            detail: `Current: ${(opportunity.gross_margin_percent ?? 0).toFixed(1)}% — required: 25%`,
            severity: 'medium',
          }]
        : []),
      ...(opportunity.risk_previous_disputes
        ? [{ name: 'Previous legal dispute on record', detail: 'Points deducted from score', severity: 'high' }]
        : []),
      ...(opportunity.risk_environmental_issues
        ? [{ name: 'Environmental issues identified', detail: 'Requires investigation before proceeding', severity: 'high' }]
        : []),
      ...(opportunity.risk_heritage_overlay
        ? [{ name: 'Heritage overlay applies', detail: 'May affect development options', severity: 'medium' }]
        : []),
    ]

    try {
      const res = await fetch('/api/generate-im', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opportunity: {
            name: opportunity.name,
            address: opportunity.address,
            city: opportunity.city,
            state: opportunity.state,
            numLots: opportunity.num_lots || 0,
            numDwellings: opportunity.num_dwellings || 0,
            landStage: opportunity.land_stage || 'tbc',
            landownerName: opportunity.landowner_name || undefined,
          },
          result: {
            status: opportunity.rag_status || 'amber',
            score: opportunity.score || 0,
            gmScore: opportunity.gm_score || 0,
            deRiskScore: opportunity.derisk_score || 0,
            riskScore: opportunity.risk_deductions || 0,
            financials: {
              totalCost: opportunity.total_project_cost || 0,
              totalRevenue: opportunity.total_revenue || 0,
              grossMargin: opportunity.gross_margin_dollars || 0,
              grossMarginPercent: opportunity.gross_margin_percent || 0,
            },
            passedCriteria,
            attentionItems,
            summary: opportunity.assessment_summary || 'Assessment summary not available.',
            pathToGreen: opportunity.path_to_green || [],
            recommendations: [],
          },
        }),
      })

      if (!res.ok) throw new Error('Failed to generate Investment Memorandum')
      const html = await res.text()
      setImHtml(html)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }, [opportunity])

  const handleDownload = useCallback(() => {
    if (!imHtml || !opportunity) return
    const blob = new Blob([imHtml], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${opportunity.name.replace(/[^a-z0-9]/gi, '-')}-IM.html`
    a.click()
    URL.revokeObjectURL(url)
  }, [imHtml, opportunity])

  const handleShare = useCallback(async () => {
    if (shareUrl) {
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
      setError(err instanceof Error ? err.message : 'Failed to create share link')
    } finally {
      setSharing(false)
    }
  }, [opportunityId, shareUrl])

  if (loading) {
    return (
      <AuthLayout>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-[#22c55e]" />
        </div>
      </AuthLayout>
    )
  }

  if (error && !opportunity) {
    return (
      <AuthLayout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <p className="text-base">{error}</p>
          </div>
          <Link href="/opportunities" className="mt-4 inline-flex items-center gap-2 text-[#22c55e] hover:underline">
            <ArrowLeft className="w-4 h-4" /> Back to Opportunities
          </Link>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Back nav */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            href={`/opportunities/${opportunityId}`}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to assessment
          </Link>
        </div>

        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Investment Memorandum</h1>
          <p className="text-gray-600 mt-1 text-base">
            Generate a professional Investment Memorandum for{' '}
            <strong className="text-gray-800">{opportunity?.name}</strong>. Download as HTML or share a link with
            lenders, brokers, or partners.
          </p>
        </div>

        {error && (
          <div className="mb-6 flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <span className="text-base">{error}</span>
          </div>
        )}

        {!imHtml ? (
          /* Generate state */
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
            <div className="w-16 h-16 bg-[#22c55e]/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-[#22c55e]" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              {opportunity?.rag_status === 'green' ? '🟢' : opportunity?.rag_status === 'amber' ? '🟡' : '🔴'}{' '}
              {opportunity?.name}
            </h2>
            <p className="text-gray-600 mb-6 max-w-lg mx-auto text-base">
              This will generate a lender-ready Investment Memorandum summarising the assessment result,
              financials, passed de-risk factors, and the path to a Green rating.
            </p>
            <button
              onClick={generateIM}
              disabled={generating}
              className="px-8 py-4 bg-[#22c55e] text-white rounded-xl font-bold text-lg hover:bg-[#4ade80] hover:shadow-xl hover:shadow-[#22c55e]/25 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-3 mx-auto min-h-[52px]"
            >
              {generating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <FileText className="w-5 h-5" />
                  Generate Investment Memorandum
                </>
              )}
            </button>
          </div>
        ) : (
          /* IM ready */
          <>
            <div className="bg-[#22c55e]/10 border border-[#22c55e]/30 rounded-xl p-4 mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex items-center gap-2 text-[#22c55e] font-semibold flex-1">
                <FileText className="w-5 h-5 flex-shrink-0" />
                Investment Memorandum ready
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 px-4 py-2 bg-[#22c55e] text-white rounded-lg font-medium hover:bg-[#4ade80] transition-colors min-h-[44px]"
                >
                  <Download className="w-4 h-4" />
                  Download HTML
                </button>
                <button
                  onClick={handleShare}
                  disabled={sharing}
                  className="flex items-center gap-2 px-4 py-2 border border-[#22c55e]/40 bg-white text-[#22c55e] rounded-lg font-medium hover:bg-[#22c55e]/5 transition-colors min-h-[44px] disabled:opacity-50"
                >
                  {sharing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : shareCopied ? (
                    <Copy className="w-4 h-4" />
                  ) : (
                    <Share2 className="w-4 h-4" />
                  )}
                  {shareCopied ? 'Link copied!' : 'Share assessment link'}
                </button>
              </div>
            </div>

            {shareUrl && (
              <div className="mb-6 bg-gray-50 border border-gray-200 rounded-xl p-4">
                <p className="text-sm text-gray-500 mb-1">Share link (active 30 days):</p>
                <p className="text-sm text-[#22c55e] font-mono break-all">{shareUrl}</p>
              </div>
            )}

            {/* IM Preview */}
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <span className="text-sm text-gray-500 ml-2">Investment Memorandum Preview</span>
              </div>
              <iframe
                srcDoc={imHtml}
                className="w-full min-h-[600px] border-0"
                title="Investment Memorandum"
                sandbox="allow-same-origin"
              />
            </div>
          </>
        )}
      </div>
    </AuthLayout>
  )
}
