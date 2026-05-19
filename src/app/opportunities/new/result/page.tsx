// @explanatory-header-exempt — nested workflow page; entry-point header lives on the parent surface
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, CheckCircle, XCircle, AlertTriangle, Clock, Archive,
  PlayCircle, Loader2, X, ChevronDown, ChevronUp,
} from 'lucide-react'
import { DealJourney } from '@/components/common/DealJourney'

type RAGStatus = 'green' | 'amber' | 'red'
type Verdict = 'NOT_FUNDABLE' | 'FUNDABLE_IF' | 'FUNDABLE'

interface TestResult {
  id: 'T1' | 'T2' | 'T3'
  passed: boolean
  computed: Record<string, number>
  reason: string
  evidencePathToPass: Array<{
    kind: string
    acceptableCategories?: string[]
    requiredAmount?: number
    description: string
  }> | null
}

interface AssessmentResult {
  rag: RAGStatus
  rationale: string
  engineVersion: string
  threeTest: {
    results: [TestResult, TestResult, TestResult]
    ltvDerived: number
    passingCount: number
  }
  substitutions: Array<{ field: string; from: number; to: number; reason: string }>
  reviewer: {
    independentVerdict: Verdict
    conditions: string[]
    rederivedMetrics: { ltc: number; ltv: number; margin: number; peakDebt: number | null; repaymentCoverage: number | null }
    promoterStated: { ltc: number | null; ltv: number | null; margin: number | null }
    rejectedInputs: Array<{ field: string; assertedValue: number; reason: string; evidenceRequired: string[] }>
    killQuestion: string
  }
  reviewerFallback: boolean
  adjusted: {
    landValue: number
    grvTotal: number
    equityCash: number
    constructionCost: number
    contingencyPct: number
    contingencyAmount: number
    totalDevelopmentCost: number
    preSalesPercent: number
    proposedLoanAmount: number
    numDwellings: number
  }
  ltvDerived: number
  evidenceDocumentCount: number
}

interface StoredAssessment {
  opportunityId: string
  formData: Record<string, unknown>
  engineInputs: Record<string, unknown>
  result: AssessmentResult
}

type OpportunityStatus = 'assessed' | 'proceed' | 'pending' | 'archived'

const T_LABEL: Record<TestResult['id'], string> = {
  T1: 'Skin in the Game',
  T2: 'Provable Sale Value',
  T3: 'Margin with Forced Contingency',
}

function pct(x: number): string  { return `${(x * 100).toFixed(1)}%` }
function money(x: number | null): string {
  if (x === null || !Number.isFinite(x)) return '—'
  return `$${Math.round(x).toLocaleString('en-AU')}`
}
function ragClass(rag: RAGStatus): string {
  return rag === 'green' ? 'from-emerald-500 to-green-600'
       : rag === 'amber' ? 'from-amber-500 to-orange-500'
       : 'from-red-500 to-rose-600'
}

export default function AssessmentResultPage() {
  const router = useRouter()
  const [data, setData] = useState<StoredAssessment | null>(null)
  const [currentStatus, setCurrentStatus] = useState<OpportunityStatus>('assessed')
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [statusNote, setStatusNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [expandedSubs, setExpandedSubs] = useState(false)

  useEffect(() => {
    const stored = sessionStorage.getItem('lastAssessment')
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as StoredAssessment
        if (parsed.result && parsed.result.threeTest) {
          setData(parsed)
          return
        }
      } catch { /* fall through to redirect */ }
    }
    router.push('/opportunities/new')
  }, [router])

  const handleStatusChange = async (newStatus: OpportunityStatus) => {
    setSaving(true)
    try {
      if (data?.opportunityId) {
        const res = await fetch(`/api/opportunities/${data.opportunityId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus, note: statusNote }),
        })
        if (!res.ok) throw new Error('Failed to update status')
      }
      setCurrentStatus(newStatus)
      setShowStatusModal(false)
      setStatusNote('')
      sessionStorage.removeItem('lastAssessment')
      sessionStorage.removeItem('lastOpportunityId')
      router.push(data?.opportunityId ? `/opportunities/${data.opportunityId}` : '/opportunities')
    } catch {
      alert('Error updating status. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    )
  }

  const { result } = data
  const [t1, t2, t3] = result.threeTest.results

  // Open obligations — every rejected input + every failing test's path
  const openObligations: Array<{ source: string; description: string }> = []
  for (const t of result.threeTest.results) {
    if (!t.passed && t.evidencePathToPass) {
      for (const step of t.evidencePathToPass) {
        openObligations.push({ source: `${t.id} — ${T_LABEL[t.id]}`, description: step.description })
      }
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header nav */}
      <nav className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/opportunities" className="flex items-center gap-2 text-slate-600 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" /> Back to Opportunities
          </Link>
          <span className="text-xs text-slate-500">Engine {result.engineVersion}</span>
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <DealJourney
          currentStage="assessment"
          opportunityId={data.opportunityId}
          ragStatus={result.rag}
        />

        {/* Top RAG banner */}
        <div className={`mt-6 rounded-2xl bg-gradient-to-r p-6 sm:p-8 ${ragClass(result.rag)}`}>
          <div className="flex flex-col gap-2 text-white sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-wide text-white/80">Lender-test verdict</p>
              <h1 className="mt-1 text-3xl font-bold sm:text-4xl">{result.rag.toUpperCase()}</h1>
              <p className="mt-1 text-white/90">{result.rationale}</p>
            </div>
            <div className="rounded-xl bg-white/15 px-4 py-3 backdrop-blur">
              <p className="text-xs uppercase tracking-wide text-white/80">Derived LVR</p>
              <p className="text-2xl font-bold">{pct(result.ltvDerived)}</p>
              <p className="text-xs text-white/70">Computed from result, never set as a target.</p>
            </div>
          </div>
          {result.reviewerFallback && (
            <p className="mt-3 rounded-lg bg-white/10 px-3 py-2 text-xs text-white/90">
              Reviewer LLM was unavailable; verdict shown is the deterministic engine fallback.
            </p>
          )}
        </div>

        {/* Explanatory header (global UI rule) */}
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-slate-900">Final RAG verdict from the three-test engine</h2>
          <p className="mt-1 text-sm text-slate-600">
            The verdict above is derived from your evidenced inputs — not from your claims. Below: the
            three lender tests in detail, the reviewer's independent breakdown, and the documents still
            needed to upgrade the verdict.
          </p>
        </div>

        {/* Three-Test panel */}
        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-slate-900">How your deal scored against the three lender tests</h2>
          <p className="mt-1 text-sm text-slate-600">
            Each test passes or fails on the figures the engine accepted, not the figures you entered. A deal must
            pass all three to be GREEN.
          </p>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
            {result.threeTest.results.map(t => (
              <div key={t.id} className={`rounded-xl border-2 p-4 ${t.passed ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}>
                <div className="flex items-center gap-2">
                  {t.passed
                    ? <CheckCircle className="h-5 w-5 text-emerald-600" />
                    : <XCircle className="h-5 w-5 text-red-600" />
                  }
                  <span className={`text-xs font-semibold uppercase tracking-wide ${t.passed ? 'text-emerald-700' : 'text-red-700'}`}>
                    {t.id} · {t.passed ? 'PASS' : 'FAIL'}
                  </span>
                </div>
                <h3 className="mt-2 font-semibold text-slate-900">{T_LABEL[t.id]}</h3>
                <p className="mt-2 text-sm text-slate-700">{t.reason}</p>
                {/* Per-test computed numbers */}
                <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-slate-600">
                  {Object.entries(t.computed).slice(0, 4).map(([k, v]) => (
                    <div key={k} className="contents">
                      <dt className="truncate">{k}</dt>
                      <dd className="text-right font-medium text-slate-900">
                        {/^(ltc|ltv|margin|marginFloor|ltcCeiling|contingencyPct)$/i.test(k)
                          ? pct(v)
                          : v >= 1000 ? money(v) : v.toString()}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        </section>

        {/* Reviewer Verdict panel */}
        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-slate-900">The independent verdict from a credit reviewer with opposed interests</h2>
          <p className="mt-1 text-sm text-slate-600">
            Lists every figure the reviewer rejected and the document that would change that. The kill question is
            the single thing this deal needs a document for; if you can't answer it, it does not fund.
          </p>

          <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
            {/* Verdict + kill question */}
            <div className="lg:col-span-2 space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Independent verdict</p>
                <p className="mt-1 text-xl font-bold text-slate-900">{result.reviewer.independentVerdict.replace('_', ' ')}</p>
                {result.reviewer.conditions.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Conditions</p>
                    <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-700">
                      {result.reviewer.conditions.map((c, i) => <li key={i}>{c}</li>)}
                    </ul>
                  </div>
                )}
              </div>
              <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">Kill question</p>
                <p className="mt-1 text-sm font-medium text-amber-900">{result.reviewer.killQuestion}</p>
              </div>
            </div>

            {/* Metrics table */}
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Engine-derived metrics</p>
              <dl className="mt-2 space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-slate-600">LTC</dt><dd className="font-medium text-slate-900">{pct(result.reviewer.rederivedMetrics.ltc)}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-600">LVR</dt><dd className="font-medium text-slate-900">{pct(result.reviewer.rederivedMetrics.ltv)}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-600">Margin</dt><dd className="font-medium text-slate-900">{pct(result.reviewer.rederivedMetrics.margin)}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-600">Substituted TDC</dt><dd className="font-medium text-slate-900">{money(result.adjusted.totalDevelopmentCost)}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-600">Substituted GRV</dt><dd className="font-medium text-slate-900">{money(result.adjusted.grvTotal)}</dd></div>
              </dl>
            </div>
          </div>
        </section>

        {/* Substitutions / Rejected Inputs */}
        {result.substitutions.length > 0 && (
          <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
            <button
              onClick={() => setExpandedSubs(!expandedSubs)}
              className="flex w-full items-center justify-between"
            >
              <div className="text-left">
                <h2 className="text-lg font-semibold text-slate-900">What the engine substituted</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Each flattering figure without backing evidence was swapped for the conservative defensible value. The reviewer scored on the substituted numbers, not your claims.
                </p>
              </div>
              {expandedSubs ? <ChevronUp className="h-5 w-5 text-slate-500" /> : <ChevronDown className="h-5 w-5 text-slate-500" />}
            </button>
            {expandedSubs && (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                      <th className="py-2">Field</th>
                      <th className="py-2">Claimed</th>
                      <th className="py-2">Substituted</th>
                      <th className="py-2">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.substitutions.map((s, i) => (
                      <tr key={i} className="border-b border-slate-100 last:border-0">
                        <td className="py-2 font-medium text-slate-900">{s.field}</td>
                        <td className="py-2 text-slate-700">{money(s.from)}</td>
                        <td className="py-2 text-red-600 font-medium">{money(s.to)}</td>
                        <td className="py-2 text-slate-600">{s.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* Open Obligations panel */}
        {openObligations.length > 0 && (
          <section className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-amber-900">Documents the engine needs to upgrade this deal's verdict</h2>
            <p className="mt-1 text-sm text-amber-800">
              Upload what's listed and reassess to move the deal from RED toward AMBER or GREEN. Anything still
              open is what's blocking funding readiness.
            </p>
            <ul className="mt-4 space-y-3">
              {openObligations.map((o, i) => (
                <li key={i} className="flex items-start gap-3 rounded-lg border border-amber-200 bg-white p-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">{o.source}</p>
                    <p className="mt-1 text-sm text-slate-700">{o.description}</p>
                  </div>
                </li>
              ))}
            </ul>
            <Link
              href={`/opportunities/${data.opportunityId}`}
              className="mt-4 inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100"
            >
              Open deal to upload documents
            </Link>
          </section>
        )}

        {/* Next-action buttons */}
        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-slate-900">What's next?</h2>
          <p className="mt-1 text-sm text-slate-600">
            Move this deal to the active pipeline, park it for review, or archive it.
            {currentStatus !== 'assessed' && (
              <span className="ml-2 inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                Status: {currentStatus.toUpperCase()}
              </span>
            )}
          </p>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <button
              onClick={() => handleStatusChange('proceed')}
              disabled={saving}
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 px-4 py-3 font-bold text-white hover:from-emerald-600 hover:to-green-600 disabled:opacity-50"
            >
              <PlayCircle className="h-5 w-5" /> Proceed to Due Diligence
            </button>
            <button
              onClick={() => setShowStatusModal(true)}
              disabled={saving}
              className="flex items-center justify-center gap-2 rounded-xl bg-amber-100 px-4 py-3 font-bold text-amber-800 hover:bg-amber-200 disabled:opacity-50"
            >
              <Clock className="h-5 w-5" /> Pend for Review
            </button>
            <button
              onClick={() => handleStatusChange('archived')}
              disabled={saving}
              className="flex items-center justify-center gap-2 rounded-xl bg-slate-100 px-4 py-3 font-medium text-slate-700 hover:bg-slate-200 disabled:opacity-50"
            >
              <Archive className="h-5 w-5" /> Archive
            </button>
          </div>
        </section>
      </main>

      {/* Pend modal */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Pend for Review</h2>
              <button onClick={() => setShowStatusModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="h-6 w-6" />
              </button>
            </div>
            <textarea
              value={statusNote}
              onChange={(e) => setStatusNote(e.target.value)}
              placeholder="What's missing? e.g. waiting for executed valuation report; equity proof in transit."
              rows={4}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => setShowStatusModal(false)}
                className="flex-1 rounded-xl border border-slate-300 px-4 py-3 font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleStatusChange('pending')}
                disabled={saving}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-3 font-bold text-white hover:bg-amber-600 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Clock className="h-5 w-5" />}
                {saving ? 'Saving…' : 'Pend Opportunity'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
