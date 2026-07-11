// @explanatory-header-exempt — nested workflow page; entry-point header lives on the parent surface
'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { VoiceAssistant } from '@/components/voice/VoiceAssistant'
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Loader2,
  Landmark,
  FileDown,
  RefreshCw,
  DollarSign,
  TrendingUp,
  BarChart3,
  Shield,
  Home,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from 'lucide-react'
import type {
  DevFinancePack,
  ModuleStatus,
  RiskLevel,
  TradeCategory,
  DrawDownMilestone,
  UnitValuation,
  SensitivityScenario,
  BridgingScenario,
  AffordableGapAnalysis,
} from '@/lib/devfinance/types'

// ─── Currency Formatting ─────────────────────────────────────

function formatCurrency(value: number): string {
  const abs = Math.abs(value)
  if (abs >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`
  }
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

function formatPercentRaw(value: number): string {
  return `${value.toFixed(1)}%`
}

// ─── Status Badges ───────────────────────────────────────────

const statusColors: Record<ModuleStatus, string> = {
  draft: 'bg-gray-100 text-gray-600',
  ai_generated: 'bg-blue-100 text-blue-700',
  under_review: 'bg-amber-100 text-amber-700',
  signed_off: 'bg-green-100 text-green-700',
  exported: 'bg-indigo-100 text-indigo-700',
}

const statusLabels: Record<ModuleStatus, string> = {
  draft: 'Draft',
  ai_generated: 'AI Generated',
  under_review: 'Under Review',
  signed_off: 'Signed Off',
  exported: 'Exported',
}

function StatusBadge({ status }: { status: ModuleStatus }) {
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[status]}`}>
      {statusLabels[status]}
    </span>
  )
}

// ─── Risk Level Badges ───────────────────────────────────────

const riskColors: Record<RiskLevel, string> = {
  low: 'bg-green-100 text-green-700',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
}

function RiskBadge({ level }: { level: RiskLevel }) {
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${riskColors[level]}`}>
      {level}
    </span>
  )
}

// ─── Collapsible Section ─────────────────────────────────────

function CollapsibleSection({
  title,
  icon,
  badge,
  defaultOpen = false,
  children,
}: {
  title: string
  icon: React.ReactNode
  badge?: React.ReactNode
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {icon}
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          {badge}
        </div>
        {open ? (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronRight className="w-5 h-5 text-gray-400" />
        )}
      </button>
      {open && <div className="px-6 pb-6 border-t border-gray-100">{children}</div>}
    </div>
  )
}

// ─── Main Page Component ─────────────────────────────────────

export default function DevFinancePackPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const opportunityId = params.id as string
  const projectId = searchParams.get('projectId')

  const [pack, setPack] = useState<DevFinancePack | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchPack() {
      if (!projectId) {
        setError('No project ID provided. Please go back to the setup page and generate a finance pack.')
        setLoading(false)
        return
      }

      try {
        const response = await fetch(`/api/devfinance/pack?projectId=${projectId}`)
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}))
          throw new Error(errData.error || `Failed to load finance pack (${response.status})`)
        }
        const data = await response.json()
        setPack(data.pack || data)
      } catch (err) {
        console.error('Pack fetch error:', err)
        setError(err instanceof Error ? err.message : 'Failed to load finance pack')
      } finally {
        setLoading(false)
      }
    }

    fetchPack()
  }, [projectId])

  // ─── Loading ─────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-gray-600">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          <span>Loading finance pack...</span>
        </div>
      </div>
    )
  }

  // ─── Error / No projectId ────────────────────────────────

  if (error || !pack) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error || 'Finance pack not found'}</p>
          <Link
            href={`/opportunities/${opportunityId}/devfinance`}
            className="text-amber-600 hover:underline font-medium"
          >
            &larr; Back to DevFinance Setup
          </Link>
        </div>
      </div>
    )
  }

  const { qsReport, valuationReport, feasibilityStudy, affordableGapAnalysis, keyMetrics } = pack

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link
            href={`/opportunities/${opportunityId}/devfinance`}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Setup
          </Link>
          <div className="text-sm text-gray-500">
            Generated {new Date(pack.generatedAt).toLocaleDateString('en-AU')} &middot; v{pack.version}
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* ═══════ Executive Summary ═══════ */}
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl p-8 text-white">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Landmark className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Development Finance Pack</h1>
              <p className="text-white/80">{pack.project.opportunity?.name || 'Project'}</p>
            </div>
          </div>
          <p className="text-white/90 leading-relaxed whitespace-pre-wrap">{pack.executiveSummary}</p>
        </div>

        {/* In-context voice clarifier (§6) — discuss the pack's numbers, verdict and risks */}
        <VoiceAssistant
          context="devfinance_pack"
          title="🎙️ Discuss this Finance Pack"
          subtitle="Tap to ask why the margin, construction cost, LTV or planning risk land where they do"
          contextData={{
            executiveSummary: pack.executiveSummary,
            keyMetrics,
            qs: {
              constructionSubtotal: qsReport?.constructionSubtotal,
              totalDevelopmentCost: qsReport?.totalDevelopmentCost,
              contingency: qsReport?.contingency,
            },
            feasibility: {
              profitOnCost: feasibilityStudy?.profitOnCost,
              risks: feasibilityStudy?.risks,
              sensitivityScenarios: feasibilityStudy?.sensitivityScenarios,
            },
          }}
        />

        {/* ═══════ Key Metrics Grid ═══════ */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard label="Gross Realisable Value" value={formatCurrency(keyMetrics.grv)} />
          <MetricCard label="Total Development Cost" value={formatCurrency(keyMetrics.tdc)} />
          <MetricCard label="Development Profit" value={formatCurrency(keyMetrics.profit)} highlight />
          <MetricCard label="Profit Margin" value={formatPercentRaw(keyMetrics.margin)} highlight />
          <MetricCard label="PRSV" value={formatCurrency(keyMetrics.prsv)} />
          <MetricCard label="Soft Equity" value={formatCurrency(keyMetrics.softEquity)} />
          <MetricCard label="LTV" value={formatPercentRaw(keyMetrics.ltv)} />
          <MetricCard label="Peak Debt" value={formatCurrency(keyMetrics.peakDebt)} />
        </div>

        {/* ═══════ QS Report ═══════ */}
        <CollapsibleSection
          title="QS Report"
          icon={<DollarSign className="w-5 h-5 text-indigo-500" />}
          badge={<StatusBadge status={qsReport.status} />}
          defaultOpen
        >
          <div className="space-y-6 pt-4">
            {/* Trade Categories Table */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Trade Categories</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                      <th className="pb-2 pr-4">Category</th>
                      <th className="pb-2 pr-4">Trade</th>
                      <th className="pb-2 pr-4 text-right">Qty</th>
                      <th className="pb-2 pr-4">Unit</th>
                      <th className="pb-2 pr-4 text-right">Rate</th>
                      <th className="pb-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {qsReport.categories.map((cat: TradeCategory, ci: number) => (
                      <>
                        {cat.trades.map((trade, ti) => (
                          <tr
                            key={`${ci}-${ti}`}
                            className={ti % 2 === 0 ? 'bg-gray-50' : 'bg-white'}
                          >
                            {ti === 0 && (
                              <td
                                className="py-2 pr-4 font-medium text-gray-900 align-top"
                                rowSpan={cat.trades.length}
                              >
                                {cat.category}
                              </td>
                            )}
                            <td className="py-2 pr-4 text-gray-700">{trade.trade}</td>
                            <td className="py-2 pr-4 text-right text-gray-700">
                              {trade.quantity.toLocaleString()}
                            </td>
                            <td className="py-2 pr-4 text-gray-500">{trade.unit}</td>
                            <td className="py-2 pr-4 text-right text-gray-700">
                              ${trade.rate.toLocaleString()}
                            </td>
                            <td className="py-2 text-right font-medium text-gray-900">
                              {formatCurrency(trade.total)}
                            </td>
                          </tr>
                        ))}
                        <tr key={`sub-${ci}`} className="border-t border-gray-200">
                          <td colSpan={5} className="py-2 pr-4 text-right text-sm font-medium text-gray-600">
                            {cat.category} Subtotal
                          </td>
                          <td className="py-2 text-right font-semibold text-gray-900">
                            {formatCurrency(cat.subtotal)}
                          </td>
                        </tr>
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Cost Subtotals */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <CostRow label="Construction Subtotal" value={qsReport.constructionSubtotal} />
              <CostRow label="Professional Fees" value={qsReport.professionalFees} />
              <CostRow label="Statutory Costs" value={qsReport.statutoryCosts} />
              <CostRow label="Finance Costs" value={qsReport.financeCosts} />
              <CostRow label="Sales Costs" value={qsReport.salesCosts} />
              <div className="border-t border-gray-300 pt-2 mt-2">
                <CostRow
                  label="Total Development Cost"
                  value={qsReport.totalDevelopmentCost}
                  highlight
                />
              </div>
            </div>

            {/* Contingency Analysis */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Contingency Analysis</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <p className="text-xs text-gray-500 mb-1">Base Contingency</p>
                  <p className="text-lg font-bold text-gray-900">
                    {formatPercentRaw(qsReport.contingency.baseContingencyPercent)}
                  </p>
                  <p className="text-sm text-gray-600">
                    {formatCurrency(qsReport.contingency.baseContingencyAmount)}
                  </p>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-xs text-gray-500 mb-1">Risk-Adjusted</p>
                  <p className="text-lg font-bold text-amber-700">
                    {formatPercentRaw(qsReport.contingency.riskAdjustedPercent)}
                  </p>
                  <p className="text-sm text-amber-600">
                    {formatCurrency(qsReport.contingency.riskAdjustedAmount)}
                  </p>
                </div>
              </div>
              {qsReport.contingency.riskFactors.length > 0 && (
                <div className="mt-3 space-y-1">
                  {qsReport.contingency.riskFactors.map((rf, i) => (
                    <div key={i} className="flex items-center justify-between text-sm px-2 py-1">
                      <span className="text-gray-700">{rf.factor}</span>
                      <div className="flex items-center gap-2">
                        <RiskBadge level={rf.impact} />
                        <span className="text-gray-500">+{rf.additionalPercent}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Draw-down Schedule */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Draw-down Schedule</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                      <th className="pb-2 pr-4">Phase</th>
                      <th className="pb-2 pr-4 text-right">%</th>
                      <th className="pb-2 pr-4 text-right">Amount</th>
                      <th className="pb-2 pr-4 text-right">Cumulative</th>
                      <th className="pb-2 text-right">Month</th>
                    </tr>
                  </thead>
                  <tbody>
                    {qsReport.drawDownSchedule.map((dd: DrawDownMilestone, i: number) => (
                      <tr key={i} className={i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                        <td className="py-2 pr-4 font-medium text-gray-900">{dd.phase}</td>
                        <td className="py-2 pr-4 text-right text-gray-700">
                          {formatPercentRaw(dd.percentComplete)}
                        </td>
                        <td className="py-2 pr-4 text-right text-gray-700">
                          {formatCurrency(dd.amount)}
                        </td>
                        <td className="py-2 pr-4 text-right font-medium text-gray-900">
                          {formatCurrency(dd.cumulativeAmount)}
                        </td>
                        <td className="py-2 text-right text-gray-500">{dd.targetMonth}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* QS Sign-off info */}
            {qsReport.qsFirm && (
              <div className="text-sm text-gray-500">
                QS: {qsReport.qsName} ({qsReport.qsFirm})
                {qsReport.qsRegistration && ` | Reg: ${qsReport.qsRegistration}`}
              </div>
            )}
          </div>
        </CollapsibleSection>

        {/* ═══════ Valuation Report ═══════ */}
        <CollapsibleSection
          title="Valuation Report"
          icon={<TrendingUp className="w-5 h-5 text-indigo-500" />}
          badge={<StatusBadge status={valuationReport.status} />}
        >
          <div className="space-y-6 pt-4">
            {/* Unit Valuations */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Unit Valuations</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                      <th className="pb-2 pr-4">Type</th>
                      <th className="pb-2 pr-4 text-right">Count</th>
                      <th className="pb-2 pr-4 text-right">Value/Unit</th>
                      <th className="pb-2 pr-4 text-right">Total Value</th>
                      <th className="pb-2 text-center">Confidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {valuationReport.unitValuations.map((uv: UnitValuation, i: number) => (
                      <tr key={i} className={i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                        <td className="py-2 pr-4 font-medium text-gray-900">{uv.unitType}</td>
                        <td className="py-2 pr-4 text-right text-gray-700">{uv.count}</td>
                        <td className="py-2 pr-4 text-right text-gray-700">
                          {formatCurrency(uv.marketValuePerUnit)}
                        </td>
                        <td className="py-2 pr-4 text-right font-medium text-gray-900">
                          {formatCurrency(uv.totalValue)}
                        </td>
                        <td className="py-2 text-center">
                          <ConfidenceBar value={uv.confidenceLevel} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-300">
                      <td className="py-2 pr-4 font-bold text-gray-900" colSpan={3}>
                        Gross Realisable Value (GRV)
                      </td>
                      <td className="py-2 pr-4 text-right font-bold text-gray-900">
                        {formatCurrency(valuationReport.grossRealisableValue)}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* PRSV & Soft Equity */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                <p className="text-xs text-gray-500 mb-1">PRSV</p>
                <p className="text-xl font-bold text-indigo-700">
                  {formatCurrency(valuationReport.projectSiteRelatedValue)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  GRV - TDC - Target Profit ({formatPercentRaw(valuationReport.targetProfitMargin * 100)})
                </p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-xs text-gray-500 mb-1">Soft Equity</p>
                <p className="text-xl font-bold text-green-700">
                  {formatCurrency(valuationReport.softEquity)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  PRSV - Land Purchase ({formatCurrency(valuationReport.landPurchasePrice)})
                </p>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <p className="text-xs text-gray-500 mb-1">Market Risk</p>
                <div className="mt-1">
                  <RiskBadge level={valuationReport.marketRiskLevel} />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Absorption: {valuationReport.absorptionRateMonths} months
                </p>
              </div>
            </div>

            {/* Market Commentary */}
            {valuationReport.marketCommentary && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Market Commentary</h3>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {valuationReport.marketCommentary}
                </p>
              </div>
            )}

            {/* Valuer sign-off */}
            {valuationReport.valuerFirm && (
              <div className="text-sm text-gray-500">
                Valuer: {valuationReport.valuerName} ({valuationReport.valuerFirm})
                {valuationReport.valuerRegistration && ` | API: ${valuationReport.valuerRegistration}`}
              </div>
            )}
          </div>
        </CollapsibleSection>

        {/* ═══════ Feasibility Study ═══════ */}
        <CollapsibleSection
          title="Feasibility Study"
          icon={<BarChart3 className="w-5 h-5 text-indigo-500" />}
          badge={<StatusBadge status={feasibilityStudy.status} />}
        >
          <div className="space-y-6 pt-4">
            {/* Revenue vs Cost Waterfall */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Revenue vs Cost Breakdown</h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <WaterfallRow
                  label="Gross Realisable Value"
                  value={feasibilityStudy.grossRealisableValue}
                  type="revenue"
                />
                <WaterfallRow
                  label="Less Sales Costs"
                  value={-feasibilityStudy.lessSalesCosts}
                  type="cost"
                />
                <div className="border-t border-gray-300 pt-2">
                  <WaterfallRow
                    label="Net Realisable Value"
                    value={feasibilityStudy.netRealisableValue}
                    type="subtotal"
                  />
                </div>
                <div className="pt-2" />
                <WaterfallRow label="Land Cost" value={-feasibilityStudy.landCost} type="cost" />
                <WaterfallRow
                  label="Construction Cost"
                  value={-feasibilityStudy.constructionCost}
                  type="cost"
                />
                <WaterfallRow
                  label="Professional Fees"
                  value={-feasibilityStudy.professionalFees}
                  type="cost"
                />
                <WaterfallRow
                  label="Statutory Costs"
                  value={-feasibilityStudy.statutoryCosts}
                  type="cost"
                />
                <WaterfallRow
                  label="Finance Costs"
                  value={-feasibilityStudy.financeCosts}
                  type="cost"
                />
                <WaterfallRow
                  label="Contingency"
                  value={-feasibilityStudy.contingency}
                  type="cost"
                />
                <div className="border-t border-gray-300 pt-2">
                  <WaterfallRow
                    label="Total Development Cost"
                    value={-feasibilityStudy.totalDevelopmentCost}
                    type="subtotal"
                  />
                </div>
                <div className="border-t-2 border-gray-400 pt-2">
                  <WaterfallRow
                    label="Development Profit"
                    value={feasibilityStudy.developmentProfit}
                    type="profit"
                  />
                </div>
              </div>
            </div>

            {/* Returns */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Returns</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <p className="text-xs text-gray-500 mb-1">Development Profit</p>
                  <p className="text-lg font-bold text-gray-900">
                    {formatCurrency(feasibilityStudy.developmentProfit)}
                  </p>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <p className="text-xs text-gray-500 mb-1">Profit on Cost</p>
                  <p className="text-lg font-bold text-gray-900">
                    {formatPercentRaw(feasibilityStudy.profitOnCost)}
                  </p>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <p className="text-xs text-gray-500 mb-1">Profit on GRV</p>
                  <p className="text-lg font-bold text-gray-900">
                    {formatPercentRaw(feasibilityStudy.profitOnGRV)}
                  </p>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <p className="text-xs text-gray-500 mb-1">Profit Margin</p>
                  <p className="text-lg font-bold text-gray-900">
                    {formatPercentRaw(feasibilityStudy.profitMargin)}
                  </p>
                </div>
              </div>
            </div>

            {/* Finance Structure */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Finance Structure</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <p className="text-xs text-gray-500 mb-1">LTV</p>
                  <p className="text-lg font-bold text-gray-900">
                    {formatPercentRaw(feasibilityStudy.loanToValueRatio)}
                  </p>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <p className="text-xs text-gray-500 mb-1">Interest Rate</p>
                  <p className="text-lg font-bold text-gray-900">
                    {formatPercentRaw(feasibilityStudy.interestRate)}
                  </p>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <p className="text-xs text-gray-500 mb-1">Loan Term</p>
                  <p className="text-lg font-bold text-gray-900">
                    {feasibilityStudy.loanTerm} months
                  </p>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <p className="text-xs text-gray-500 mb-1">Total Interest</p>
                  <p className="text-lg font-bold text-gray-900">
                    {formatCurrency(feasibilityStudy.totalInterest)}
                  </p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-xs text-gray-500 mb-1">Peak Debt</p>
                  <p className="text-lg font-bold text-amber-700">
                    {formatCurrency(feasibilityStudy.peakDebt)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Month {feasibilityStudy.peakDebtMonth}
                  </p>
                </div>
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                  <p className="text-xs text-gray-500 mb-1">Cash Equity Required</p>
                  <p className="text-lg font-bold text-indigo-700">
                    {formatCurrency(feasibilityStudy.cashEquityRequired)}
                  </p>
                </div>
              </div>
            </div>

            {/* Sensitivity Table */}
            {feasibilityStudy.sensitivityScenarios.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Sensitivity Analysis</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                        <th className="pb-2 pr-4">Scenario</th>
                        <th className="pb-2 pr-4 text-right">Revenue</th>
                        <th className="pb-2 pr-4 text-right">Cost</th>
                        <th className="pb-2 pr-4 text-right">Profit</th>
                        <th className="pb-2 pr-4 text-right">Margin</th>
                        <th className="pb-2 text-center">Viable?</th>
                      </tr>
                    </thead>
                    <tbody>
                      {feasibilityStudy.sensitivityScenarios.map(
                        (sc: SensitivityScenario, i: number) => (
                          <tr
                            key={i}
                            className={
                              sc.isViable
                                ? 'bg-green-50'
                                : 'bg-red-50'
                            }
                          >
                            <td className="py-2 pr-4 font-medium text-gray-900">{sc.name}</td>
                            <td className="py-2 pr-4 text-right text-gray-700">
                              {formatCurrency(sc.totalRevenue)}
                            </td>
                            <td className="py-2 pr-4 text-right text-gray-700">
                              {formatCurrency(sc.totalCost)}
                            </td>
                            <td className="py-2 pr-4 text-right font-medium text-gray-900">
                              {formatCurrency(sc.profit)}
                            </td>
                            <td className="py-2 pr-4 text-right text-gray-700">
                              {formatPercentRaw(sc.profitMargin)}
                            </td>
                            <td className="py-2 text-center">
                              {sc.isViable ? (
                                <CheckCircle className="w-5 h-5 text-green-600 mx-auto" />
                              ) : (
                                <XCircle className="w-5 h-5 text-red-500 mx-auto" />
                              )}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Risk Matrix */}
            {feasibilityStudy.risks.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Risk Matrix</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                        <th className="pb-2 pr-4">Category</th>
                        <th className="pb-2 pr-4">Risk</th>
                        <th className="pb-2 pr-4 text-center">Likelihood</th>
                        <th className="pb-2 pr-4 text-center">Impact</th>
                        <th className="pb-2">Mitigation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {feasibilityStudy.risks.map((risk, i) => (
                        <tr key={i} className={i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                          <td className="py-2 pr-4 font-medium text-gray-900">{risk.category}</td>
                          <td className="py-2 pr-4 text-gray-700">{risk.risk}</td>
                          <td className="py-2 pr-4 text-center">
                            <RiskBadge level={risk.likelihood} />
                          </td>
                          <td className="py-2 pr-4 text-center">
                            <RiskBadge level={risk.impact} />
                          </td>
                          <td className="py-2 text-gray-600 text-xs">{risk.mitigation}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </CollapsibleSection>

        {/* ═══════ Affordable Gap Analysis ═══════ */}
        {affordableGapAnalysis && (
          <CollapsibleSection
            title="Affordable Gap Analysis"
            icon={<Home className="w-5 h-5 text-indigo-500" />}
            badge={<StatusBadge status={affordableGapAnalysis.status} />}
          >
            <AffordableSection data={affordableGapAnalysis} />
          </CollapsibleSection>
        )}

        {/* ═══════ Actions Bar ═══════ */}
        <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 p-6">
          <Link
            href={`/opportunities/${opportunityId}/devfinance`}
            className="px-6 py-3 text-gray-600 hover:text-gray-800 font-medium"
          >
            &larr; Back to Setup
          </Link>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push(`/opportunities/${opportunityId}/devfinance`)}
              className="px-6 py-3 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Regenerate
            </button>
            <button
              type="button"
              disabled
              className="px-6 py-3 bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900 rounded-xl font-bold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              title="PDF export coming soon"
            >
              <FileDown className="w-4 h-4" />
              Export as PDF
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}

// ─── Sub-components ──────────────────────────────────────────

function MetricCard({
  label,
  value,
  highlight,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        highlight
          ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200'
          : 'bg-white border-gray-200'
      }`}
    >
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-xl font-bold ${highlight ? 'text-amber-700' : 'text-gray-900'}`}>
        {value}
      </p>
    </div>
  )
}

function CostRow({
  label,
  value,
  highlight,
}: {
  label: string
  value: number
  highlight?: boolean
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={highlight ? 'font-bold text-gray-900' : 'text-gray-700 text-sm'}>
        {label}
      </span>
      <span className={highlight ? 'font-bold text-gray-900' : 'text-sm text-gray-900'}>
        {formatCurrency(value)}
      </span>
    </div>
  )
}

function WaterfallRow({
  label,
  value,
  type,
}: {
  label: string
  value: number
  type: 'revenue' | 'cost' | 'subtotal' | 'profit'
}) {
  const colorMap = {
    revenue: 'text-green-700',
    cost: 'text-red-600',
    subtotal: 'text-gray-900 font-semibold',
    profit: 'text-green-700 font-bold text-lg',
  }

  return (
    <div className="flex items-center justify-between">
      <span className={type === 'profit' ? 'font-bold text-gray-900' : 'text-sm text-gray-700'}>
        {label}
      </span>
      <span className={`text-sm ${colorMap[type]}`}>{formatCurrency(value)}</span>
    </div>
  )
}

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100)
  const color =
    pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-amber-500' : 'bg-red-500'

  return (
    <div className="flex items-center gap-2 justify-center">
      <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-500">{pct}%</span>
    </div>
  )
}

function AffordableSection({ data }: { data: AffordableGapAnalysis }) {
  return (
    <div className="space-y-6 pt-4">
      {/* Gap Summary */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Gap Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">Market Price</p>
            <p className="text-sm font-bold text-gray-900">
              {formatCurrency(data.marketPricePerUnit)}
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">CHP Max</p>
            <p className="text-sm font-bold text-gray-900">
              {formatCurrency(data.chpMaxPrice)}
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">Discount</p>
            <p className="text-sm font-bold text-gray-900">
              {formatPercentRaw(data.chpDiscountPercent)}
            </p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">Gap/Unit</p>
            <p className="text-sm font-bold text-red-700">
              {formatCurrency(data.gapPerUnit)}
            </p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">Total Gap</p>
            <p className="text-sm font-bold text-red-700">
              {formatCurrency(data.totalGap)}
            </p>
          </div>
        </div>
      </div>

      {/* Bridging Scenarios */}
      {data.scenarios.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Bridging Scenarios</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                  <th className="pb-2 pr-4">Mechanism</th>
                  <th className="pb-2 pr-4 text-right">Subsidy/Unit</th>
                  <th className="pb-2 pr-4 text-right">Total</th>
                  <th className="pb-2 pr-4 text-right">CHP Price</th>
                  <th className="pb-2 text-center">Viable?</th>
                </tr>
              </thead>
              <tbody>
                {data.scenarios.map((sc: BridgingScenario, i: number) => (
                  <tr
                    key={i}
                    className={
                      sc.isViable ? 'bg-green-50' : 'bg-red-50'
                    }
                  >
                    <td className="py-2 pr-4 font-medium text-gray-900">{sc.label}</td>
                    <td className="py-2 pr-4 text-right text-gray-700">
                      {formatCurrency(sc.subsidyPerUnit)}
                    </td>
                    <td className="py-2 pr-4 text-right text-gray-700">
                      {formatCurrency(sc.totalSubsidy)}
                    </td>
                    <td className="py-2 pr-4 text-right text-gray-700">
                      {formatCurrency(sc.effectiveCHPPrice)}
                    </td>
                    <td className="py-2 text-center">
                      {sc.isViable ? (
                        <CheckCircle className="w-5 h-5 text-green-600 mx-auto" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500 mx-auto" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.recommendedScenario && (
            <p className="text-sm text-indigo-600 mt-2 font-medium">
              Recommended: {data.recommendedScenario}
            </p>
          )}
        </div>
      )}

      {/* Blended vs Full Market */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          Blended vs Full Market Comparison
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div
            className={`border rounded-lg p-4 ${
              data.isBlendedViable
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
            }`}
          >
            <p className="text-xs text-gray-500 mb-2">
              Blended ({data.affordableUnits} of {data.totalUnits} affordable)
            </p>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">GRV</span>
                <span className="font-medium">{formatCurrency(data.blendedGRV)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Profit</span>
                <span className="font-medium">{formatCurrency(data.blendedProfit)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Margin</span>
                <span className="font-medium">{formatPercentRaw(data.blendedMargin)}</span>
              </div>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-500 mb-2">Full Market (no affordable)</p>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">GRV</span>
                <span className="font-medium">{formatCurrency(data.fullMarketGRV)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Profit</span>
                <span className="font-medium">{formatCurrency(data.fullMarketProfit)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Margin</span>
                <span className="font-medium">{formatPercentRaw(data.fullMarketMargin)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Policy Commentary */}
      {data.policyCommentary && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Policy Commentary</h3>
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
            {data.policyCommentary}
          </p>
        </div>
      )}
    </div>
  )
}
