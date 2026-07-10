// @explanatory-header-exempt — nested workflow page; entry-point header lives on the parent surface
'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Plus,
  Trash2,
  Loader2,
  Building2,
  Calculator,
  Home,
  Landmark,
} from 'lucide-react'
import { DealJourney } from '@/components/common/DealJourney'

// --- Types ---

interface Opportunity {
  id: string
  name: string
  address: string
  city: string
  state: string
  postcode: string
  num_dwellings: number
  total_project_cost: number
}

interface UnitType {
  code: string
  name: string
  count: number
  floorArea: number
  bedrooms: number
  bathrooms: number
  parking: number
}

interface FinanceParams {
  interestRate: number
  loanTermMonths: number
  ltvTarget: number
  salesStartMonth: number
  salesPeriodMonths: number
}

interface AffordableHousing {
  enabled: boolean
  affordableUnits: number
  chpMaxPrice: number
  marketRentWeekly: number
}

// --- Helpers ---

const emptyUnitType = (): UnitType => ({
  code: '',
  name: '',
  count: 1,
  floorArea: 0,
  bedrooms: 1,
  bathrooms: 1,
  parking: 1,
})

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

// --- Component ---

export default function DevFinanceSetupPage() {
  const router = useRouter()
  const params = useParams()
  const opportunityId = params.id as string

  // Page state
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null)

  // Form state — Builder Info
  const [builderName, setBuilderName] = useState('')
  const [builderABN, setBuilderABN] = useState('')

  // Construction Program
  const [constructionMonths, setConstructionMonths] = useState(18)

  // Unit Mix
  const [unitTypes, setUnitTypes] = useState<UnitType[]>([emptyUnitType()])

  // Finance Parameters
  const [financeParams, setFinanceParams] = useState<FinanceParams>({
    interestRate: 6.5,
    loanTermMonths: 36,
    ltvTarget: 65,
    salesStartMonth: 12,
    salesPeriodMonths: 6,
  })

  // Affordable Housing
  const [affordable, setAffordable] = useState<AffordableHousing>({
    enabled: false,
    affordableUnits: 0,
    chpMaxPrice: 0,
    marketRentWeekly: 0,
  })

  // --- Fetch opportunity ---
  useEffect(() => {
    async function fetchOpportunity() {
      try {
        const response = await fetch(`/api/opportunities/${opportunityId}`)
        if (!response.ok) throw new Error('Failed to fetch opportunity')
        const { opportunity: data } = await response.json()
        setOpportunity(data)
      } catch (err) {
        console.error('Fetch error:', err)
        setError(err instanceof Error ? err.message : 'Failed to load opportunity')
      } finally {
        setLoading(false)
      }
    }
    if (opportunityId) fetchOpportunity()
  }, [opportunityId])

  // --- Unit Mix handlers ---
  const addUnitType = () => {
    setUnitTypes((prev) => [...prev, emptyUnitType()])
  }

  const removeUnitType = (index: number) => {
    setUnitTypes((prev) => prev.filter((_, i) => i !== index))
  }

  const updateUnitType = (index: number, field: keyof UnitType, value: string | number) => {
    setUnitTypes((prev) =>
      prev.map((unit, i) => (i === index ? { ...unit, [field]: value } : unit))
    )
  }

  // --- Total unit count ---
  const totalUnits = unitTypes.reduce((sum, u) => sum + (u.count || 0), 0)

  // --- Submit ---
  const handleGenerate = async () => {
    setGenerating(true)
    setError(null)

    try {
      // 1. Create the DevFinance project
      const projectRes = await fetch('/api/devfinance/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Field names MUST match the /api/devfinance/projects contract
          // (constructionProgramMonths / unitMix) — a mismatch here silently
          // dropped both and 400'd the whole flow. companyId is resolved
          // server-side from the session, so it is not sent from the client.
          opportunityId,
          builderName,
          builderABN,
          constructionProgramMonths: constructionMonths,
          // Map the form's UnitType (floorArea) to the domain UnitType
          // (floorAreaSqm) the QS/feasibility engine reads — otherwise floor
          // area stores null and construction cost computes as zero.
          unitMix: unitTypes.map((u) => ({
            code: u.code,
            name: u.name,
            count: u.count,
            floorAreaSqm: u.floorArea,
            bedrooms: u.bedrooms,
            bathrooms: u.bathrooms,
            parking: u.parking,
          })),
          financeParams,
          affordableHousing: affordable.enabled ? affordable : null,
        }),
      })

      if (!projectRes.ok) {
        const errData = await projectRes.json()
        throw new Error(errData.error || 'Failed to create DevFinance project')
      }

      const { projectId } = await projectRes.json()

      // 2. Kick off pack generation
      const packRes = await fetch('/api/devfinance/pack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      })

      if (!packRes.ok) {
        const errData = await packRes.json()
        throw new Error(errData.error || 'Failed to generate finance pack')
      }

      // 3. Redirect to pack view
      router.push(`/opportunities/${opportunityId}/devfinance/pack?projectId=${projectId}`)
    } catch (err) {
      console.error('Generation error:', err)
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setGenerating(false)
    }
  }

  // --- Loading state ---
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-600">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading opportunity...</span>
        </div>
      </div>
    )
  }

  // --- Error state (no opportunity) ---
  if (!opportunity) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Opportunity not found'}</p>
          <Link href="/opportunities" className="text-amber-600 hover:underline">
            &larr; Back to Opportunities
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link
            href={`/opportunities/${opportunityId}`}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Opportunity
          </Link>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-6 sm:py-8">
        <DealJourney
          currentStage="devfinance"
          opportunityId={opportunity.id}
        />

        {/* Page Header */}
        <div className="mt-6 bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl p-8 mb-8 text-white">
          <div className="flex items-center gap-4 mb-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Landmark className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">DevFinance Setup</h1>
              <p className="text-white/80">{opportunity.name}</p>
            </div>
          </div>
          <p className="text-white/70 text-sm">
            Configure unit mix, builder information, and finance parameters to generate your
            development finance pack.
          </p>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-8">
          {/* ============ BUILDER INFO ============ */}
          <section className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-500" />
              Builder Information
            </h2>
            <p className="text-sm text-gray-500 mb-5">
              Details of the appointed (or proposed) builder for this project.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Builder Name
                </label>
                <input
                  type="text"
                  value={builderName}
                  onChange={(e) => setBuilderName(e.target.value)}
                  placeholder="e.g. Global Buildtech Australia"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Builder ABN
                </label>
                <input
                  type="text"
                  value={builderABN}
                  onChange={(e) => setBuilderABN(e.target.value)}
                  placeholder="e.g. 99 691 530 426"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>
            </div>
          </section>

          {/* ============ CONSTRUCTION PROGRAM ============ */}
          <section className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-indigo-500" />
              Construction Program
            </h2>
            <p className="text-sm text-gray-500 mb-5">
              Estimated construction duration from site commencement to practical completion.
            </p>

            <div className="w-48">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Duration (months)
              </label>
              <input
                type="number"
                min={1}
                max={120}
                value={constructionMonths}
                onChange={(e) => setConstructionMonths(parseInt(e.target.value) || 0)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
          </section>

          {/* ============ UNIT MIX ============ */}
          <section className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Home className="w-5 h-5 text-indigo-500" />
                Unit Mix
              </h2>
              <span className="text-sm text-gray-500">
                {totalUnits} unit{totalUnits !== 1 ? 's' : ''} total
              </span>
            </div>
            <p className="text-sm text-gray-500 mb-5">
              Define each unit type in the development. Add rows for different configurations.
            </p>

            {/* Table header */}
            <div className="hidden md:grid grid-cols-[80px_1fr_70px_90px_70px_70px_70px_40px] gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">
              <span>Code</span>
              <span>Name</span>
              <span>Count</span>
              <span>Area (sqm)</span>
              <span>Beds</span>
              <span>Baths</span>
              <span>Parking</span>
              <span />
            </div>

            <div className="space-y-2">
              {unitTypes.map((unit, index) => (
                <div
                  key={index}
                  className="grid grid-cols-1 md:grid-cols-[80px_1fr_70px_90px_70px_70px_70px_40px] gap-2 items-center bg-gray-50 rounded-lg p-2"
                >
                  <input
                    type="text"
                    value={unit.code}
                    onChange={(e) => updateUnitType(index, 'code', e.target.value)}
                    placeholder="A1"
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                  <input
                    type="text"
                    value={unit.name}
                    onChange={(e) => updateUnitType(index, 'name', e.target.value)}
                    placeholder="2-Bed Apartment"
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                  <input
                    type="number"
                    min={0}
                    value={unit.count}
                    onChange={(e) => updateUnitType(index, 'count', parseInt(e.target.value) || 0)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                  <input
                    type="number"
                    min={0}
                    step={0.1}
                    value={unit.floorArea}
                    onChange={(e) =>
                      updateUnitType(index, 'floorArea', parseFloat(e.target.value) || 0)
                    }
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                  <input
                    type="number"
                    min={0}
                    value={unit.bedrooms}
                    onChange={(e) =>
                      updateUnitType(index, 'bedrooms', parseInt(e.target.value) || 0)
                    }
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                  <input
                    type="number"
                    min={0}
                    value={unit.bathrooms}
                    onChange={(e) =>
                      updateUnitType(index, 'bathrooms', parseInt(e.target.value) || 0)
                    }
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                  <input
                    type="number"
                    min={0}
                    value={unit.parking}
                    onChange={(e) =>
                      updateUnitType(index, 'parking', parseInt(e.target.value) || 0)
                    }
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => removeUnitType(index)}
                    disabled={unitTypes.length <= 1}
                    className="p-2 text-gray-400 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title="Remove row"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addUnitType}
              className="mt-3 flex items-center gap-2 px-4 py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-indigo-400 hover:text-indigo-600 transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Unit Type
            </button>
          </section>

          {/* ============ FINANCE PARAMETERS ============ */}
          <section className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-indigo-500" />
              Finance Parameters
            </h2>
            <p className="text-sm text-gray-500 mb-5">
              Key assumptions for development finance modelling.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Interest Rate (%)
                </label>
                <input
                  type="number"
                  min={0}
                  max={30}
                  step={0.1}
                  value={financeParams.interestRate}
                  onChange={(e) =>
                    setFinanceParams((p) => ({
                      ...p,
                      interestRate: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Loan Term (months)
                </label>
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={financeParams.loanTermMonths}
                  onChange={(e) =>
                    setFinanceParams((p) => ({
                      ...p,
                      loanTermMonths: parseInt(e.target.value) || 0,
                    }))
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  LTV Target (%)
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={financeParams.ltvTarget}
                  onChange={(e) =>
                    setFinanceParams((p) => ({
                      ...p,
                      ltvTarget: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sales Start (month)
                </label>
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={financeParams.salesStartMonth}
                  onChange={(e) =>
                    setFinanceParams((p) => ({
                      ...p,
                      salesStartMonth: parseInt(e.target.value) || 0,
                    }))
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sales Period (months)
                </label>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={financeParams.salesPeriodMonths}
                  onChange={(e) =>
                    setFinanceParams((p) => ({
                      ...p,
                      salesPeriodMonths: parseInt(e.target.value) || 0,
                    }))
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>
            </div>
          </section>

          {/* ============ AFFORDABLE HOUSING ============ */}
          <section className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Home className="w-5 h-5 text-indigo-500" />
                Affordable Housing
              </h2>
              <button
                type="button"
                onClick={() =>
                  setAffordable((prev) => ({ ...prev, enabled: !prev.enabled }))
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  affordable.enabled ? 'bg-indigo-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    affordable.enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-5">
              Optional. Include if the project has an affordable housing component (e.g. CHP
              partnership).
            </p>

            {affordable.enabled && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Affordable Units
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={affordable.affordableUnits}
                    onChange={(e) =>
                      setAffordable((p) => ({
                        ...p,
                        affordableUnits: parseInt(e.target.value) || 0,
                      }))
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    CHP Max Price ($)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={affordable.chpMaxPrice}
                    onChange={(e) =>
                      setAffordable((p) => ({
                        ...p,
                        chpMaxPrice: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                  {affordable.chpMaxPrice > 0 && (
                    <p className="text-xs text-gray-400 mt-1">
                      {formatCurrency(affordable.chpMaxPrice)}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Market Rent ($/week)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={10}
                    value={affordable.marketRentWeekly}
                    onChange={(e) =>
                      setAffordable((p) => ({
                        ...p,
                        marketRentWeekly: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}
          </section>

          {/* ============ GENERATE BUTTON ============ */}
          <div className="flex items-center justify-end gap-4 pt-2 pb-12">
            <Link
              href={`/opportunities/${opportunityId}`}
              className="px-6 py-3 text-gray-600 hover:text-gray-800 font-medium"
            >
              Cancel
            </Link>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating}
              className="px-8 py-3 bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900 rounded-xl font-bold hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {generating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating Finance Pack...
                </>
              ) : (
                <>
                  <Landmark className="w-5 h-5" />
                  Generate Finance Pack
                </>
              )}
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
