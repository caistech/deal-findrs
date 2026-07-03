'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, Calculator, Save, CheckCircle2, Send } from 'lucide-react'
import { AuthLayout } from '@/components/common/AuthLayout'
import {
  computeDeal,
  toDealModelInputs,
  assignStage,
  emptyStageGate,
  type DealModelDealInput,
  type StageGateTicks,
  type DealModelResult,
} from '@/lib/deal-model'

// ─── Stage-gate field metadata (the 21 evidence gates) ─────────
const GATE_GROUPS: { group: string; fields: { key: keyof StageGateTicks; label: string }[] }[] = [
  {
    group: 'Planning & Approvals',
    fields: [
      { key: 'landOwnedOrUnderOption', label: 'Land owned or under option' },
      { key: 'developmentConcept', label: 'Development concept / indicative yield' },
      { key: 'structurePlanPrepared', label: 'Structure plan prepared' },
      { key: 'structurePlanApproved', label: 'Structure plan approved' },
      { key: 'subdivisionApplicationLodged', label: 'Subdivision (DA) application lodged' },
      { key: 'conditionalApproval', label: 'Conditional / in-principle approval' },
      { key: 'subdivisionApprovalGranted', label: 'Subdivision approval granted' },
      { key: 'conditionsClearanceUnderway', label: 'Conditions clearance underway' },
      { key: 'conditionsSubstantiallyCleared', label: 'Conditions substantially cleared (≥~70%)' },
      { key: 'depositedPlanLodged', label: 'Deposited plan lodged' },
      { key: 'titlesIssuedOrImminent', label: 'Titles issued or imminent' },
    ],
  },
  {
    group: 'Engineering & Servicing',
    fields: [
      { key: 'servicingStrategyPrepared', label: 'Servicing strategy prepared' },
      { key: 'civilFeasibility', label: 'Civil feasibility + indicative cost' },
      { key: 'geotech', label: 'Geotech / soil classification' },
      { key: 'detailedCivilDesign', label: 'Detailed civil design' },
      { key: 'headworksAgreements', label: 'Headworks agreements' },
      { key: 'qsBankableCostPlan', label: 'QS bankable cost plan' },
    ],
  },
  {
    group: 'Commercial & Financial',
    fields: [
      { key: 'realCapitalSunk', label: 'Real capital sunk (material)' },
      { key: 'registeredValuation', label: 'Registered valuation' },
      { key: 'fundingArranged', label: 'Funding arranged / term sheet' },
      { key: 'marketSignalling', label: 'Market signalling / presales' },
    ],
  },
]

type FormState = Omit<DealModelDealInput, 'opportunityId'>

const BLANK_FORM: FormState = {
  lots: 0,
  marketPricePerLot: 0,
  landPerLot: 0,
  infraPerLot: 0,
  softCostsPerLot: 0,
  educationPerLot: 0,
  developerSunkCostTotal: 0,
  externalQuotes: [0.08, 0.09, 0.12],
  fundingMode: 'Internal',
  civilMode: 'Contractor',
  homeCaptureRate: 1,
  f2kContributionTotal: 0,
  modularMarginPerHome: 30000,
  stageGate: emptyStageGate(),
}

function money(n: number): string {
  return n.toLocaleString('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 })
}

function NumberField({
  label, value, onChange, step = 1, suffix,
}: { label: string; value: number; onChange: (n: number) => void; step?: number; suffix?: string }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-gray-700 mb-1">{label}</span>
      <div className="relative">
        <input
          type="number"
          step={step}
          value={Number.isFinite(value) ? value : 0}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="w-full px-4 py-2 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        />
        {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">{suffix}</span>}
      </div>
    </label>
  )
}

export default function DealModelPage() {
  const params = useParams()
  const opportunityId = params.id as string

  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<FormState>(BLANK_FORM)
  const [overrideReason, setOverrideReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState<{ version: number; grade: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [promoting, setPromoting] = useState(false)
  const [promoted, setPromoted] = useState(false)
  const [promoteError, setPromoteError] = useState<string | null>(null)

  const set = useCallback(<K extends keyof FormState>(key: K, val: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: val }))
    setSaved(null)
  }, [])

  // Pre-fill what we can from the opportunity record.
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/opportunities/${opportunityId}`)
        if (res.ok) {
          const { opportunity: o } = await res.json()
          const lots = o?.num_lots || 0
          setForm((prev) => ({
            ...prev,
            lots,
            marketPricePerLot: o?.avg_sale_price || 0,
            landPerLot: lots ? Math.round((o?.land_purchase_price || 0) / lots) : 0,
            infraPerLot: lots ? Math.round((o?.infrastructure_costs || 0) / lots) : 0,
          }))
        }
      } catch {
        // pre-fill is best-effort; the operator can enter everything by hand
      } finally {
        setLoading(false)
      }
    }
    if (opportunityId) load()
  }, [opportunityId])

  // Live preview — the engine is pure, so we compute locally as the operator types.
  const preview: DealModelResult | null = useMemo(() => {
    try {
      return computeDeal(toDealModelInputs({ ...form, opportunityId }))
    } catch {
      return null
    }
  }, [form, opportunityId])

  const autoStage = useMemo(() => assignStage(form.stageGate), [form.stageGate])

  const handleCompute = useCallback(async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/deal-model/compute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: { ...form, opportunityId },
          grade: 'indicative',
          overrideReason: overrideReason || null,
        }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || 'Compute failed')
      setSaved({ version: body.version, grade: body.grade })
      setPromoted(false)
      setPromoteError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Compute failed')
    } finally {
      setSaving(false)
    }
  }, [form, opportunityId, overrideReason])

  const handlePromote = useCallback(async () => {
    setPromoting(true)
    setPromoteError(null)
    try {
      const res = await fetch('/api/deal-model/promote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opportunityId }),
      })
      const body = await res.json()
      if (!res.ok) {
        throw new Error(
          body.error === 'cannot_promote_reject'
            ? 'A STOP (REJECT) deal cannot be promoted.'
            : body.error === 'promotion_failed'
              ? `Promotion failed: ${body.detail || 'receiver error'}`
              : body.error || 'Promotion failed'
        )
      }
      setPromoted(true)
    } catch (err) {
      setPromoteError(err instanceof Error ? err.message : 'Promotion failed')
    } finally {
      setPromoting(false)
    }
  }, [opportunityId])

  if (loading) {
    return (
      <AuthLayout>
        <div className="flex items-center justify-center py-24 text-gray-600">
          <Loader2 className="w-6 h-6 animate-spin mr-3" /> Loading deal…
        </div>
      </AuthLayout>
    )
  }

  const verdict = preview?.hurdle.verdict
  // Full static class names — Tailwind JIT cannot see interpolated class strings.
  const VERDICT_STYLES = {
    GO: { box: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-600' },
    ADJUST: { box: 'bg-amber-50 border-amber-200', text: 'text-amber-600' },
    REJECT: { box: 'bg-red-50 border-red-200', text: 'text-red-600' },
  } as const
  const vc = verdict ? VERDICT_STYLES[verdict] : VERDICT_STYLES.ADJUST

  return (
    <AuthLayout>
      <div className="bg-gradient-to-br from-slate-50 to-blue-50 min-h-screen">
        <nav className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
          <div className="max-w-6xl mx-auto">
            <Link href={`/opportunities/${opportunityId}`} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 w-fit">
              <ArrowLeft className="w-4 h-4" /> Back to Opportunity
            </Link>
          </div>
        </nav>

        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          {/* Explanatory header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">F2K Deal Model</h1>
            <p className="text-gray-600 mt-1 max-w-3xl">
              Enter the ingested indicative feasibility figures and the F2K partnership settings to compute the
              finance-inclusive base price, the entry-stage uplift split, and the GO / ADJUST / REJECT verdict.
              The verdict governs whether this estate can promote to a live estate page. Computing saves an
              immutable, versioned snapshot.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* ── Inputs ── */}
            <div className="lg:col-span-2 space-y-6">
              {/* Estate economics */}
              <section className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6">
                <h2 className="font-semibold text-gray-900 mb-1">Estate economics (from the indicative study)</h2>
                <p className="text-sm text-gray-500 mb-4">Per-lot figures unless marked total.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <NumberField label="Estate lots" value={form.lots} onChange={(n) => set('lots', n)} />
                  <NumberField label="Market price / lot" value={form.marketPricePerLot} onChange={(n) => set('marketPricePerLot', n)} step={1000} suffix="$" />
                  <NumberField label="Land / lot" value={form.landPerLot} onChange={(n) => set('landPerLot', n)} step={1000} suffix="$" />
                  <NumberField label="Infrastructure / civil per lot" value={form.infraPerLot} onChange={(n) => set('infraPerLot', n)} step={1000} suffix="$" />
                  <NumberField label="Soft costs / lot" value={form.softCostsPerLot} onChange={(n) => set('softCostsPerLot', n)} step={500} suffix="$" />
                  <NumberField label="Education / other / lot" value={form.educationPerLot} onChange={(n) => set('educationPerLot', n)} step={500} suffix="$" />
                  <NumberField label="Developer sunk cost (total)" value={form.developerSunkCostTotal} onChange={(n) => set('developerSunkCostTotal', n)} step={10000} suffix="$" />
                </div>
                <div className="mt-4">
                  <span className="block text-sm font-medium text-gray-700 mb-1">Dev-finance quotes (external average)</span>
                  <div className="grid grid-cols-3 gap-3">
                    {form.externalQuotes.map((q, i) => (
                      <input
                        key={i}
                        type="number"
                        step={0.005}
                        value={q}
                        onChange={(e) => {
                          const next = [...form.externalQuotes]
                          next[i] = parseFloat(e.target.value) || 0
                          set('externalQuotes', next)
                        }}
                        className="w-full px-3 py-2 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                        aria-label={`External quote ${i + 1}`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Enter as decimals, e.g. 0.08 = 8%.</p>
                </div>
              </section>

              {/* F2K partnership settings */}
              <section className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6">
                <h2 className="font-semibold text-gray-900 mb-4">F2K partnership settings</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="block">
                    <span className="block text-sm font-medium text-gray-700 mb-1">Funding mode</span>
                    <select value={form.fundingMode} onChange={(e) => set('fundingMode', e.target.value as FormState['fundingMode'])}
                      className="w-full px-4 py-2 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500">
                      <option value="Internal">Internal</option>
                      <option value="External">External</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="block text-sm font-medium text-gray-700 mb-1">Civil delivery mode</span>
                    <select value={form.civilMode} onChange={(e) => set('civilMode', e.target.value as FormState['civilMode'])}
                      className="w-full px-4 py-2 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500">
                      <option value="Contractor">Contractor</option>
                      <option value="Civil-JV">Civil-JV</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="block text-sm font-medium text-gray-700 mb-1">
                      Home-capture rate — {Math.round(form.homeCaptureRate * 100)}%
                    </span>
                    <input type="range" min={0} max={1} step={0.05} value={form.homeCaptureRate}
                      onChange={(e) => set('homeCaptureRate', parseFloat(e.target.value))}
                      className="w-full accent-emerald-500" />
                  </label>
                  <NumberField label="Modular margin / home" value={form.modularMarginPerHome} onChange={(n) => set('modularMarginPerHome', n)} step={1000} suffix="$" />
                  <NumberField label="F2K contribution (total)" value={form.f2kContributionTotal} onChange={(n) => set('f2kContributionTotal', n)} step={10000} suffix="$" />
                </div>
              </section>

              {/* Stage gate */}
              <section className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6">
                <div className="flex items-center justify-between mb-1">
                  <h2 className="font-semibold text-gray-900">Stage gate</h2>
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-slate-100 text-slate-700">
                    Auto stage: {autoStage}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mb-4">Tick each gate the site has passed. These set the entry-stage split.</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {GATE_GROUPS.map((g) => (
                    <div key={g.group}>
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">{g.group}</h3>
                      <div className="space-y-2">
                        {g.fields.map((f) => (
                          <label key={f.key} className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
                            <input type="checkbox" checked={form.stageGate[f.key]}
                              onChange={(e) => set('stageGate', { ...form.stageGate, [f.key]: e.target.checked })}
                              className="mt-0.5 w-4 h-4 accent-emerald-500" />
                            <span>{f.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <label className="block mt-4">
                  <span className="block text-sm font-medium text-gray-700 mb-1">
                    Override reason <span className="text-gray-400 font-normal">(required only if you override the auto stage or split)</span>
                  </span>
                  <input
                    type="text"
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    placeholder="e.g. board-approved early F2K entry despite thin gate evidence"
                    className="w-full px-4 py-2 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </label>
              </section>
            </div>

            {/* ── Live verdict ── */}
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6 lg:sticky lg:top-6">
                <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-gray-500" /> Live verdict
                </h2>

                {preview ? (
                  <>
                    <div className={`rounded-xl p-4 mb-4 border ${vc.box}`}>
                      <div className={`text-3xl font-bold ${vc.text}`}>{verdict}</div>
                      <div className="text-sm text-gray-600 mt-1">{preview.hurdle.reason}</div>
                    </div>
                    <dl className="space-y-2 text-sm">
                      <Row k="Stage used" v={preview.stageUsed} />
                      <Row k="Base rate / lot" v={money(preview.baseRate.baseRatePerLot)} />
                      <Row k="Net uplift (% of base)" v={`${(preview.market.netUpliftPctOfBase * 100).toFixed(1)}%`} />
                      <Row k="Uplift split (F2K / dev)" v={`${Math.round(preview.split.f2kShare * 100)}% / ${Math.round(preview.split.developerShare * 100)}%`} />
                      <Row k="F2K land-only return" v={money(preview.f2kIncome.landOnlyReturn)} />
                      <Row k="F2K land + homes" v={money(preview.f2kIncome.landPlusHomesReturn)} />
                    </dl>

                    <div className="mt-4 border-t border-gray-100 pt-4">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Party outcomes</h3>
                      <div className="space-y-1 text-sm">
                        {preview.partyOutcomes.map((p) => (
                          <div key={p.party} className="flex justify-between gap-2">
                            <span className="text-gray-600">{p.party}</span>
                            <span className="font-medium text-gray-900">{money(p.total)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={handleCompute}
                      disabled={saving || form.lots <= 0}
                      className="mt-5 w-full px-4 py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl font-bold hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      {saving ? 'Saving snapshot…' : 'Compute & save snapshot'}
                    </button>

                    {saved && (
                      <div className="mt-3 flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                        <CheckCircle2 className="w-4 h-4" />
                        Snapshot v{saved.version} saved ({saved.grade}).
                      </div>
                    )}

                    {/* Promotion — only a non-STOP saved snapshot can be promoted to F2K-Projects. */}
                    {saved && verdict !== 'REJECT' && (
                      <button
                        onClick={handlePromote}
                        disabled={promoting || promoted}
                        className="mt-2 w-full px-4 py-3 border border-indigo-300 bg-indigo-50 text-indigo-700 rounded-xl font-bold hover:bg-indigo-100 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                      >
                        {promoting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        {promoted ? 'Promoted to F2K-Projects' : promoting ? 'Promoting…' : 'Promote to F2K-Projects'}
                      </button>
                    )}
                    {saved && verdict === 'REJECT' && (
                      <p className="mt-2 text-xs text-gray-500">A STOP verdict cannot be promoted.</p>
                    )}
                    {promoteError && (
                      <div className="mt-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{promoteError}</div>
                    )}
                    {error && (
                      <div className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-gray-500">Enter estate figures to see the verdict.</p>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </AuthLayout>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-gray-500">{k}</dt>
      <dd className="font-medium text-gray-900">{v}</dd>
    </div>
  )
}
