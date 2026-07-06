'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, Calculator, Save, CheckCircle2, Send, BadgeCheck, Banknote } from 'lucide-react'
import { AuthLayout } from '@/components/common/AuthLayout'
import {
  computeDeal,
  toDealModelInputs,
  runCashflow,
  toCashflowInputs,
  deriveWorksToTitle,
  INDICATIVE_CASHFLOW_STAGING,
  assignStage,
  emptyStageGate,
  type DealModelDealInput,
  type StageGateTicks,
  type DealModelResult,
  type CashflowResult,
} from '@/lib/deal-model'
import { buildConstraintsYield } from '@/lib/estate-buildup/build'
import { buildEstateCostPack } from '@/lib/estate-cost/build'
import { deriveCostConditions } from '@/lib/estate-cost/conditions'
import type { PropertyProfile } from '@/lib/property-services'

/** Where the pre-filled lot count came from — the derived estate buildup is authoritative over num_lots. */
type YieldTrace = {
  source: 'derived' | 'planner-resolved' | 'un-derivable' | 'opportunity'
  authoritativeLots: number | null
  derivedLots: number | null
}

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
  const [yieldTrace, setYieldTrace] = useState<YieldTrace | null>(null)

  // Funder-cashflow inputs. Staging (build stages / stage months) is INDICATIVE — the
  // workbook's own 5×9 placeholders — replaced field-for-field when Porter/QS staging lands.
  const [cashflow, setCashflow] = useState({
    totalContributions: 0,
    contributorPayoutPct: INDICATIVE_CASHFLOW_STAGING.contributorPayoutPct as number,
    buildStages: INDICATIVE_CASHFLOW_STAGING.buildStages as number,
    stageDurationMonths: INDICATIVE_CASHFLOW_STAGING.stageDurationMonths as number,
    // TRUE = build stages / duration are the indicative placeholders (pre Porter/QS).
    stagingIsPlaceholder: true,
  })

  const set = useCallback(<K extends keyof FormState>(key: K, val: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: val }))
    setSaved(null)
  }, [])

  const setCf = useCallback(<K extends keyof typeof cashflow>(key: K, val: (typeof cashflow)[K]) => {
    setCashflow((prev) => ({ ...prev, [key]: val }))
  }, [])

  // Pre-fill what we can from the opportunity record. Lot count is bridged from the estate buildup's
  // DERIVED authoritative yield (Phase 3a) — that is our analysis, and it governs over the free-text
  // num_lots. Falls back to num_lots only when there's no property profile to derive from.
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/opportunities/${opportunityId}`)
        if (!res.ok) return
        const { opportunity: o } = await res.json()

        // Derive the authoritative yield from the estate buildup when a profile exists, honouring an
        // approved planner referral (mirrors the opportunity page).
        let derivedYield: YieldTrace | null = null
        if (o?.property_profile) {
          let operatorResolved: { zoneCode?: string | null; minLotSize?: number | null; lots?: number | null } | undefined
          try {
            const refRes = await fetch(`/api/opportunities/${opportunityId}/planner-referral`)
            if (refRes.ok) {
              const { assessment } = await refRes.json()
              if (assessment?.status === 'approved') {
                operatorResolved = { zoneCode: assessment.resolved_zone_code, minLotSize: assessment.resolved_min_lot_size, lots: assessment.resolved_lots }
              }
            }
          } catch {
            // referral is optional context; fall back to the plain derived yield
          }
          const planTenure = (o as { plan_tenure?: { easements: { purpose: string; detail: string | null }[]; reserves: { purpose: string; detail: string | null }[] } | null }).plan_tenure ?? undefined
          const brief = buildConstraintsYield(o.property_profile as PropertyProfile, { operatorResolved, planTenure })
          const y = brief.yield
          derivedYield = {
            source: brief.requiresPlannerReferral
              ? 'un-derivable'
              : y.basis === 'operator-resolved'
                ? 'planner-resolved'
                : 'derived',
            authoritativeLots: y.authoritativeLots,
            derivedLots: y.derivedLots,
          }
        }

        // Lot count: derived-authoritative wins; else the opportunity's num_lots.
        const lots = derivedYield?.authoritativeLots ?? o?.num_lots ?? 0
        setYieldTrace(derivedYield ?? { source: 'opportunity', authoritativeLots: o?.num_lots ?? null, derivedLots: null })
        setForm((prev) => ({
          ...prev,
          lots,
          // The F2K marketPricePerLot is a LOT price — use the developed-lot price, not the
          // house-and-land avg_sale_price (the homes uplift is added separately via modular margin).
          marketPricePerLot: o?.developed_lot_price || o?.avg_sale_price || 0,
          landPerLot: lots ? Math.round((o?.land_purchase_price || 0) / lots) : 0,
          infraPerLot: lots ? Math.round((o?.infrastructure_costs || 0) / lots) : 0,
          // Pre-tick the stage gates the ingested approval already evidenced (subdivision approved,
          // conditions-clearance underway, …) — the operator shouldn't re-tick what we've ingested.
          // These set the entry-stage split, so leaving them blank understates the stage.
          stageGate: (o?.stage_gate as StageGateTicks | null) ?? prev.stageGate,
        }))

        // Pull the statutory (education levy + headworks) + soft cost per lot from the SAME estate-cost
        // engine the QS pack uses, driven by the conditions register — so these fields aren't left at 0
        // when the approval mandates them (e.g. WAPC OP2.4 education contribution, condition #20).
        try {
          if (lots > 0 && o?.state) {
            const condRes = await fetch(`/api/opportunities/${opportunityId}/conditions`)
            if (condRes.ok) {
              const { conditions } = await condRes.json()
              const sizeHa = o?.property_size_unit === 'ha' ? Number(o.property_size) : Number(o?.property_size || 0) / 10_000
              const landValuePerHa = o?.land_purchase_price && sizeHa ? Number(o.land_purchase_price) / sizeHa : null
              const costConditions = deriveCostConditions({
                conditions: (conditions ?? []).map((c: { text: string | null }) => ({ text: c.text })),
                landValuePerHa,
              })
              const pack = buildEstateCostPack({
                lots,
                state: o.state as string,
                landPerLot: Math.round((o?.land_purchase_price || 0) / lots),
                ...(costConditions ? { approvalConditions: costConditions } : {}),
              })
              setForm((prev) => ({ ...prev, educationPerLot: pack.statutoryPerLot, softCostsPerLot: pack.softPerLot }))
            }
          }
        } catch {
          // cost pre-fill is best-effort — the operator can enter these by hand
        }

        // Pre-fill the funder-cashflow staging from the estate record. Falls back to the
        // indicative placeholders (5×9) when the columns are null (pre Porter/QS).
        setCashflow((prev) => ({
          totalContributions: o?.total_contributions ?? prev.totalContributions,
          contributorPayoutPct: o?.contributor_payout_pct ?? prev.contributorPayoutPct,
          buildStages: o?.build_stages ?? prev.buildStages,
          stageDurationMonths: o?.stage_duration_months ?? prev.stageDurationMonths,
          // Default TRUE (placeholder) unless the estate has explicitly been marked firm.
          stagingIsPlaceholder: o?.cashflow_staging_placeholder ?? true,
        }))
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

  // Indicative works-to-title, derived from the deal model's per-lot cost lines so the two
  // models cannot drift on the works figure (fit assessment §5).
  const derivedWorks = useMemo(
    () => (preview && form.lots > 0 ? deriveWorksToTitle(preview, form.lots) : 0),
    [preview, form.lots],
  )

  // Live funder cashflow — pure engine, computed locally like the deal verdict.
  const cashflowResult: CashflowResult | null = useMemo(() => {
    if (!preview || form.lots <= 0 || cashflow.totalContributions <= 0 || derivedWorks <= 0) return null
    try {
      return runCashflow(
        toCashflowInputs({
          deal: preview,
          lots: form.lots,
          salePricePerLot: form.marketPricePerLot,
          totalContributions: cashflow.totalContributions,
          contributorPayoutPct: cashflow.contributorPayoutPct,
          buildStages: cashflow.buildStages,
          stageDurationMonths: cashflow.stageDurationMonths,
        }),
      )
    } catch {
      return null
    }
  }, [preview, form.lots, form.marketPricePerLot, cashflow, derivedWorks])

  const handleCompute = useCallback(async (grade: 'indicative' | 'bankable' = 'indicative') => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/deal-model/compute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: { ...form, opportunityId },
          grade,
          overrideReason: overrideReason || null,
          // Only send the funder cashflow once the contribution pool is entered; the server
          // recomputes it (single source of truth) and persists it onto the snapshot.
          cashflow: cashflow.totalContributions > 0 ? cashflow : null,
        }),
      })
      const body = await res.json()
      if (!res.ok) {
        if (body.error === 'bankable_requires_certifications') {
          throw new Error(`Bankable snapshot needs certified packs: ${(body.missing || []).join(' + ')}. Certify them in the Review Packs panel first.`)
        }
        throw new Error(body.error || 'Compute failed')
      }
      setSaved({ version: body.version, grade: body.grade })
      setPromoted(false)
      setPromoteError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Compute failed')
    } finally {
      setSaving(false)
    }
  }, [form, opportunityId, overrideReason, cashflow])

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
                {yieldTrace && yieldTrace.source !== 'opportunity' && (
                  <div className={`mb-4 text-xs rounded-lg p-2.5 border ${
                    yieldTrace.source === 'un-derivable'
                      ? 'bg-amber-50 border-amber-200 text-amber-800'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  }`}>
                    {yieldTrace.source === 'un-derivable' ? (
                      <>Estate yield is <strong>un-derivable</strong> from the datasets (zoning unresolved) — resolve the{' '}
                        <Link href={`/opportunities/${opportunityId}`} className="underline font-medium">planner referral</Link> so the lot count is analysis-backed. Enter a working figure meanwhile.</>
                    ) : (
                      <>Estate lots pre-filled from the <strong>derived buildup</strong>
                        {yieldTrace.source === 'planner-resolved' ? ' (planner-resolved)' : ' (our analysis, authoritative over the developer’s number)'}:{' '}
                        <strong>{yieldTrace.authoritativeLots} lots</strong>. Editable, but this is the figure the evaluation is built on.</>
                    )}
                  </div>
                )}
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

              {/* Funder cashflow inputs */}
              <section className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6">
                <h2 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
                  <Banknote className="w-5 h-5 text-gray-500" /> Funder cashflow
                </h2>
                <p className="text-sm text-gray-500 mb-4">
                  The staged funding view — how much the funder underwrites, and when they get out.
                  Works to title is derived from the cost lines above; staging is indicative until Porter/QS lands.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <NumberField
                    label="Total contributions (founders + F2K, cash + kind)"
                    value={cashflow.totalContributions}
                    onChange={(n) => setCf('totalContributions', n)}
                    step={50000}
                    suffix="$"
                  />
                  <label className="block">
                    <span className="block text-sm font-medium text-gray-700 mb-1">
                      Contributor pay-out first tranche — {Math.round(cashflow.contributorPayoutPct * 100)}%
                    </span>
                    <input type="range" min={0} max={1} step={0.05} value={cashflow.contributorPayoutPct}
                      onChange={(e) => setCf('contributorPayoutPct', parseFloat(e.target.value))}
                      className="w-full accent-emerald-500" />
                  </label>
                </div>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <NumberField label="Build stages" value={cashflow.buildStages} onChange={(n) => setCf('buildStages', Math.max(1, Math.round(n)))} />
                  <NumberField label="Stage duration" value={cashflow.stageDurationMonths} onChange={(n) => setCf('stageDurationMonths', Math.max(1, Math.round(n)))} suffix="mo" />
                  <label className="block">
                    <span className="block text-sm font-medium text-gray-700 mb-1">Works to title (derived)</span>
                    <div className="w-full px-4 py-2 text-base border border-gray-200 bg-gray-50 rounded-lg text-gray-700">
                      {derivedWorks > 0 ? money(derivedWorks) : '—'}
                    </div>
                  </label>
                </div>
                <div className={`mt-3 text-xs rounded-lg p-2.5 border ${
                  cashflow.stagingIsPlaceholder
                    ? 'bg-amber-50 border-amber-200 text-amber-800'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                }`}>
                  {cashflow.stagingIsPlaceholder ? (
                    <p>
                      <strong>Indicative staging.</strong> Build stages ({cashflow.buildStages}) and stage duration
                      ({cashflow.stageDurationMonths} mo) are placeholders — replace them with the Porter / QS staging
                      plan when it arrives, then tick “firm” below. Selling cost and interest rate use the deal-model
                      defaults (agent 3.5%, flat 12%).
                    </p>
                  ) : (
                    <p><strong>Staging firmed up</strong> from the Porter / QS plan.</p>
                  )}
                  <label className="mt-2 flex items-center gap-2 cursor-pointer font-medium">
                    <input
                      type="checkbox"
                      checked={!cashflow.stagingIsPlaceholder}
                      onChange={(e) => setCf('stagingIsPlaceholder', !e.target.checked)}
                      className="w-4 h-4 accent-emerald-500"
                    />
                    Staging is firm (from Porter / QS) — not a placeholder
                  </label>
                </div>
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
                      onClick={() => handleCompute('indicative')}
                      disabled={saving || form.lots <= 0}
                      className="mt-5 w-full px-4 py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl font-bold hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      {saving ? 'Saving snapshot…' : 'Compute & save indicative (v1)'}
                    </button>

                    <button
                      onClick={() => handleCompute('bankable')}
                      disabled={saving || form.lots <= 0}
                      className="mt-2 w-full px-4 py-3 border border-emerald-300 bg-white text-emerald-700 rounded-xl font-bold hover:bg-emerald-50 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                      title="Requires the QS + valuer review packs certified"
                    >
                      <BadgeCheck className="w-4 h-4" /> Save as bankable (v2)
                    </button>
                    <p className="mt-1 text-xs text-gray-500">Bankable requires the QS + valuer review packs certified (Review Packs panel on the opportunity).</p>

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

          {/* ── Funder exposure ── */}
          <section className="mt-6 bg-white rounded-xl border border-gray-200 p-5 sm:p-6">
            <h2 className="font-semibold text-gray-900 mb-1 flex items-center gap-2 flex-wrap">
              <Banknote className="w-5 h-5 text-gray-500" /> Funder exposure
              {cashflowResult && cashflow.stagingIsPlaceholder && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
                  Indicative staging
                </span>
              )}
            </h2>
            <p className="text-sm text-gray-500 mb-4 max-w-3xl">
              What the funder underwrites across the staged build. Drawdowns fund the works; each stage’s
              settlements repay the funder first, and surplus clears the retained contributor debt then uplift.
              The pay-out timing (75/25) does not double-count contributions — the deal-model base recovers them once.
            </p>

            {cashflowResult ? (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                  <Stat label="Peak funder exposure" value={money(cashflowResult.peakFunderExposure)} accent="text-indigo-600" />
                  <Stat label="Total funder interest" value={money(cashflowResult.totalFunderInterest)} />
                  <Stat label="Self-funding crossover" value={cashflowResult.selfFundingCrossover} />
                  <Stat label="Funder balance at final stage" value={money(cashflowResult.funderBalanceAtFinalStage)} />
                  <Stat label="Retained contributor debt" value={money(cashflowResult.retainedContributorDebtToClear)} />
                  <Stat label="Total surplus released" value={money(cashflowResult.totalSurplusReleased)} />
                  <Stat label="Net uplift (after retained debt)" value={money(cashflowResult.netUpliftAfterRetainedDebt)} accent="text-emerald-600" />
                  <Stat label="Pay-out at start (75%)" value={money(cashflowResult.derived.payoutAtStart)} />
                </div>

                <div className="overflow-x-auto border border-gray-100 rounded-lg">
                  <table className="w-full text-sm min-w-[640px]">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                        <th className="text-left font-semibold px-3 py-2">Stage</th>
                        <th className="text-right font-semibold px-3 py-2">Opening</th>
                        <th className="text-right font-semibold px-3 py-2">Draw + works</th>
                        <th className="text-right font-semibold px-3 py-2">Interest</th>
                        <th className="text-right font-semibold px-3 py-2">Settlements</th>
                        <th className="text-right font-semibold px-3 py-2">Closing</th>
                        <th className="text-right font-semibold px-3 py-2">Surplus</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cashflowResult.stages.map((s) => (
                        <tr key={s.label} className="border-t border-gray-100">
                          <td className="px-3 py-2 font-medium text-gray-900">{s.label}</td>
                          <td className="px-3 py-2 text-right text-gray-600">{money(s.openingBalance)}</td>
                          <td className="px-3 py-2 text-right text-gray-600">{money(s.payoutDrawdown + s.worksDrawdown)}</td>
                          <td className="px-3 py-2 text-right text-gray-600">{money(s.interestAccrued)}</td>
                          <td className="px-3 py-2 text-right text-gray-600">{money(s.netSalesRevenue)}</td>
                          <td className="px-3 py-2 text-right font-medium text-gray-900">{money(s.closingBalance)}</td>
                          <td className="px-3 py-2 text-right text-emerald-700">{s.surplus > 0 ? money(s.surplus) : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-xs text-gray-400">
                  Interest is stage-simple capitalised (accrues on the drawn balance for the full stage) — conservative
                  for a funder underwrite. Peak exposure is the maximum gross drawn balance before a stage’s settlements.
                </p>
              </>
            ) : (
              <p className="text-sm text-gray-500">
                Enter the total contribution pool above (and the estate cost lines) to see funder exposure.
              </p>
            )}
          </section>
        </main>
      </div>
    </AuthLayout>
  )
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`text-lg font-bold mt-0.5 ${accent ?? 'text-gray-900'}`}>{value}</div>
    </div>
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
