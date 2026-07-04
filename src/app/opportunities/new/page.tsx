// @explanatory-header-exempt — nested workflow page; entry-point header lives on the parent surface
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Check, AlertCircle, Loader2, Zap, TrendingUp, AlertTriangle, Building2, Layers } from 'lucide-react'
import { VoiceInput } from '@/components/voice/VoiceInput'
import { DocumentUpload } from '@/components/voice/DocumentUpload'
import AddressAutocomplete from '@/components/common/AddressAutocomplete'
import { DealJourney } from '@/components/common/DealJourney'
import { AuthLayout } from '@/components/common/AuthLayout'
import { usePropertyOnboarding, PropertyAssessment } from '@/lib/property-services'
import { ConstraintsYieldBrief } from '@/components/property/ConstraintsYieldBrief'
import type { PropertyProfile } from '@/lib/property-services'
import type { GeocodedAddress, SiteIntelResult } from '@/lib/mapbox'

type Step = 'basics' | 'property' | 'financial' | 'documents' | 'review'

// Map form steps to ElevenLabs agent steps
const VOICE_STEPS: Record<Step, 'basics' | 'property' | 'financial' | 'derisk' | null> = {
  basics: 'basics',
  property: 'property',
  financial: 'financial',
  documents: null, // No voice for documents step
  review: null,    // No voice for review step
}

export default function NewOpportunityPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<Step>('basics')
  const [loading, setLoading] = useState(false)
  const [documents, setDocuments] = useState<any[]>([])
  const [siteIntel, setSiteIntel] = useState<SiteIntelResult | null>(null)
  const [derivingIntel, setDerivingIntel] = useState(false)
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [draftId, setDraftId] = useState<string | null>(null)
  const [savingDraft, setSavingDraft] = useState(false)
  const [draftError, setDraftError] = useState<string | null>(null)
  // Derived-yield authority: the lot count comes from our analysis, not a typed input.
  const [derivedLots, setDerivedLots] = useState<number | null>(null)
  const [profileDerived, setProfileDerived] = useState(false)
  // Developer-provided yield figures: only a feasibility study is admissible (reconciled);
  // an anecdotal figure is captured for reference only.
  const [hasFeasibilityStudy, setHasFeasibilityStudy] = useState(false)
  const [feasibilityStudyLots, setFeasibilityStudyLots] = useState('')
  const [developerStatedLots, setDeveloperStatedLots] = useState('')

  // Property Services — shared property intelligence
  const property = usePropertyOnboarding({
    supabaseUrl: process.env.NEXT_PUBLIC_PROPERTY_SERVICES_URL!,
    apiKey: process.env.NEXT_PUBLIC_PROPERTY_SERVICES_API_KEY!,
    product: 'dealfindrs',
  })

  const [formData, setFormData] = useState({
    // ===== BASICS =====
    name: '',
    address: '',
    city: '',
    state: '',
    postcode: '',
    country: 'Australia',
    landownerName: '',
    landownerPhone: '',
    landownerEmail: '',
    landownerCompany: '',
    source: '',
    sourceContact: '',
    
    // ===== PROPERTY =====
    propertySize: '',
    propertySizeUnit: 'sqm',
    landStage: '',
    currentZoning: '',
    numLots: '',
    numDwellings: '',
    existingStructures: '',
    siteFeatures: '',
    siteConstraints: '',
    
    // ===== DE-RISK FACTORS =====
    deriskDaApproved: false,
    deriskVendorFinance: false,
    deriskVendorFinanceTerms: '',
    deriskFixedPriceConstruction: false,
    deriskConstructionPartner: '',
    deriskPreSalesPercent: '',
    deriskPreSalesCount: '',
    deriskExperiencedPm: false,
    deriskPmName: '',
    deriskClearTitle: false,
    deriskGrowthCorridor: false,
    
    // ===== RISK FACTORS =====
    riskPreviousDisputes: false,
    riskDisputeDetails: '',
    riskEnvironmentalIssues: false,
    riskEnvironmentalDetails: '',
    riskHeritageOverlay: false,
    riskHeritageDetails: '',
    
    // ===== FINANCIAL =====
    landPurchasePrice: '',
    infrastructureCosts: '',
    constructionPerUnit: '',
    avgSalePrice: '',
    contingencyPercent: '5',
    timeframeMonths: '',
    targetStartDate: '',

    // ===== ENGINE-SPECIFIC (lender lens) =====
    // The promoter's claimed "Net Project Equity" (may include land uplift, in-kind, etc.)
    // and the cash component the engine will accept (only with equity_proof evidence).
    claimedTotalEquity: '',
    claimedEquityCash: '',
    proposedLoanAmount: '',
    isOffshoreSupply: false,
    evidencedPurchasePrice: '',  // when the promoter knows it separately from "claimed land value"
    
    // ===== VISION =====
    developmentGoals: '',
    developmentType: '',
    briefDescription: '',
  })

  const steps: { key: Step; label: string; icon: string }[] = [
    { key: 'basics', label: 'Basics', icon: '📍' },
    { key: 'property', label: 'Property', icon: '🏗️' },
    { key: 'financial', label: 'Financial', icon: '💰' },
    { key: 'documents', label: 'Documents', icon: '📄' },
    { key: 'review', label: 'Review', icon: '✓' },
  ]

  const currentStepIndex = steps.findIndex(s => s.key === currentStep)
  const voiceStep = VOICE_STEPS[currentStep]

  // Update a single field
  const updateField = (field: string, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  // Handle voice-extracted fields - auto-fill form
  const handleFieldExtracted = (field: string, value: string | number | boolean) => {
    console.log(`Voice extracted: ${field} = ${value}`)
    updateField(field, value)
    
    // Auto-generate opportunity name if we have address + city
    if ((field === 'address' || field === 'city') && !formData.name) {
      const addr = field === 'address' ? String(value) : formData.address
      const city = field === 'city' ? String(value) : formData.city
      if (addr && city) {
        updateField('name', `${addr}, ${city}`)
      }
    }
  }

  // Auto-populate form fields from property profile
  const applyPropertyProfile = (profile: PropertyProfile) => {
    // Derived yield is authoritative (policy: lot numbers are our analysis, not typed in).
    const maxLots = profile.subdivision?.torrens?.maxLots ?? null
    setProfileDerived(true)
    setDerivedLots(maxLots)
    setFormData(prev => {
      const updates: Record<string, string | boolean> = {}
      // Lot size
      if (profile.lot?.lotSize && !prev.propertySize) {
        updates.propertySize = String(profile.lot.lotSize)
        updates.propertySizeUnit = 'sqm'
      }
      // Zoning
      if (profile.zoning?.code && !prev.currentZoning) {
        updates.currentZoning = profile.zoning.code
      }
      // Subdivision lots — DERIVED yield is authoritative; overwrites any prior value.
      if (maxLots != null) {
        updates.numLots = String(maxLots)
        updates.numDwellings = String(maxLots)
      }
      // Heritage overlay as risk factor
      const hasHeritage = profile.overlays.some(o => o.type.toLowerCase().includes('heritage'))
      if (hasHeritage) {
        updates.riskHeritageOverlay = true
      }
      // Environmental overlays
      const hasEnvOverlay = profile.overlays.some(o =>
        o.type.toLowerCase().includes('environment') || o.type.toLowerCase().includes('vegetation')
      )
      if (hasEnvOverlay && !prev.riskEnvironmentalIssues) {
        updates.riskEnvironmentalIssues = true
      }
      return { ...prev, ...updates }
    })
  }

  // Handle Mapbox address selection — auto-fill fields + derive site intel + property profile
  const handleAddressSelect = (address: GeocodedAddress) => {
    setFormData(prev => ({
      ...prev,
      address: `${address.street_number} ${address.street_name}`.trim(),
      city: address.suburb,
      state: address.state_short,
      postcode: address.postcode,
      country: address.country,
      name: prev.name || `${address.street_number} ${address.street_name}, ${address.suburb}`.trim(),
    }))
    setCoords({ lat: address.lat, lng: address.lng })

    // Reset property profile when address changes
    property.reset()
    setProfileDerived(false)
    setDerivedLots(null)

    // Derive everything from the canonical property-services `derive` API.
    // It now resolves zoning, council/LGA, wind, climate and BAL nationally,
    // so it is the single source for both the property profile and the
    // persisted site-intel block. The old local /api/site-intel route (a fork
    // of 5 per-product edge functions on dealfindrs' own Supabase) was retired
    // in the property-services consumer migration.
    setDerivingIntel(true)
    property.derive({
      address: address.formatted_address,
      lat: address.lat,
      lng: address.lng,
      suburb: address.suburb,
      state: address.state_short,
      postcode: address.postcode,
    })
      .then(profile => {
        if (!profile) return
        applyPropertyProfile(profile)

        const intel: SiteIntelResult = {
          climate_zone: profile.environment.climateZoneNumber,
          climate_description: profile.environment.climateDescription,
          wind_region: profile.environment.windRegion,
          wind_speed: profile.environment.windSpeed,
          bal_rating: profile.environment.bal,
          bal_in_overlay: profile.environment.balInOverlay,
          council_name: profile.metadata.lgaName,
          council_code: profile.metadata.lgaCode,
          zoning: profile.zoning?.code ?? null,
          zone_name: profile.zoning?.name ?? null,
        }
        setSiteIntel(intel)
        // Auto-fill zoning if derived
        if (intel.zoning) {
          setFormData(prev => ({ ...prev, currentZoning: intel.zoning || prev.currentZoning }))
        }
      })
      .catch(err => console.error('Site intel derivation error:', err))
      .finally(() => setDerivingIntel(false))
  }

  const ensureDraft = async (): Promise<string | null> => {
    if (draftId) return draftId
    setSavingDraft(true)
    setDraftError(null)
    try {
      const res = await fetch('/api/opportunities/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formData, siteIntel, coords, propertyProfile: property.profile }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        const code = data?.error
        // The most common cause is the account having no company linked yet
        // (RLS / membership check → 403). Translate the raw codes into an
        // actionable message instead of failing silently.
        if (res.status === 403 || code === 'no_company' || code === 'no_profile') {
          setDraftError(
            "Your account isn't linked to a company yet, so this deal can't be saved. " +
            'Finish account setup, then try again.'
          )
        } else {
          setDraftError(
            typeof code === 'string' && code
              ? `Could not save draft: ${code}`
              : 'Could not save draft. Please try again.'
          )
        }
        return null
      }
      const data = await res.json()
      const id = data?.opportunity?.id
      if (id) setDraftId(id)
      return id ?? null
    } catch (err) {
      setDraftError('Could not save draft')
      return null
    } finally {
      setSavingDraft(false)
    }
  }

  const nextStep = async () => {
    const nextIndex = currentStepIndex + 1
    if (nextIndex >= steps.length) return
    const nextKey = steps[nextIndex].key
    // Entering the documents step requires a saved opportunity ID so that
    // evidence uploads have something real to attach to.
    if (nextKey === 'documents') {
      const id = await ensureDraft()
      if (!id) return // surface error; don't advance
    }
    setCurrentStep(nextKey)
    window.scrollTo(0, 0)
  }

  const prevStep = () => {
    const prevIndex = currentStepIndex - 1
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex].key)
      window.scrollTo(0, 0)
    }
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      // The opportunity row was already saved as a draft when the user
      // advanced to the documents step. Make sure the latest financial
      // fields are persisted before assessment runs.
      const id = await ensureDraft()
      if (!id) throw new Error('Could not save deal as draft')

      // Engine-specific inputs (not in the opportunities schema yet)
      const engineInputs = {
        claimedTotalEquity: parseFloat(formData.claimedTotalEquity) || 0,
        claimedEquityCash:  parseFloat(formData.claimedEquityCash) || 0,
        proposedLoanAmount: parseFloat(formData.proposedLoanAmount) || 0,
        isOffshoreSupply:   Boolean(formData.isOffshoreSupply),
        isComplex:          Boolean(formData.riskHeritageOverlay) || Boolean(formData.riskEnvironmentalIssues),
        evidencedPurchasePrice: formData.evidencedPurchasePrice
          ? parseFloat(formData.evidencedPurchasePrice)
          : undefined,
      }

      const response = await fetch('/api/assess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opportunity_id: id, engineInputs }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data?.error || 'Assessment failed')
      }

      const data = await response.json()

      // Persist the saved opportunity id so the result page PATCHes instead of creating a duplicate.
      sessionStorage.setItem('lastOpportunityId', id)
      sessionStorage.setItem('lastAssessment', JSON.stringify({
        opportunityId: id,
        formData,
        siteIntel,
        coords,
        engineInputs,
        result: data,    // full engine response (rag, threeTest, substitutions, reviewer, adjusted, ltvDerived)
      }))

      router.push('/opportunities/new/result')
    } catch (error) {
      console.error('Assessment error:', error)
      alert(error instanceof Error ? error.message : 'Assessment failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Calculate live financials for review
  const calculateFinancials = () => {
    const lots = parseInt(formData.numDwellings) || parseInt(formData.numLots) || 0
    const landCost = parseFloat(formData.landPurchasePrice) || 0
    const infraCost = parseFloat(formData.infrastructureCosts) || 0
    const buildPerUnit = parseFloat(formData.constructionPerUnit) || 0
    const salePrice = parseFloat(formData.avgSalePrice) || 0
    const contingency = parseFloat(formData.contingencyPercent) || 5

    const totalConstruction = buildPerUnit * lots
    const baseCost = landCost + infraCost + totalConstruction
    const contingencyAmount = baseCost * (contingency / 100)
    const totalCost = baseCost + contingencyAmount
    const totalRevenue = salePrice * lots
    const grossMargin = totalRevenue - totalCost
    const gmPercent = totalRevenue > 0 ? (grossMargin / totalRevenue) * 100 : 0

    return { lots, totalCost, totalRevenue, grossMargin, gmPercent }
  }

  const financials = calculateFinancials()

  return (
    <AuthLayout>
    <div className="bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <nav className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/opportunities" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          
          {/* Step indicators */}
          <div className="flex items-center gap-2">
            {steps.map((step, i) => (
              <div key={step.key} className="flex items-center">
                <button
                  onClick={() => i <= currentStepIndex && setCurrentStep(step.key)}
                  disabled={i > currentStepIndex}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                    i < currentStepIndex 
                      ? 'bg-emerald-500 text-white cursor-pointer' 
                      : i === currentStepIndex 
                        ? 'bg-amber-500 text-white' 
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                  title={step.label}
                >
                  {i < currentStepIndex ? <Check className="w-4 h-4" /> : step.icon}
                </button>
                {i < steps.length - 1 && (
                  <div className={`w-6 h-0.5 mx-1 ${i < currentStepIndex ? 'bg-emerald-500' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>
          
          <span className="text-sm text-gray-500">
            {currentStepIndex + 1}/{steps.length}
          </span>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-6 sm:py-8">
        <DealJourney currentStage="onboarding" />

        <div className="text-center mt-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">New Opportunity</h1>
          <p className="text-gray-600">Step {currentStepIndex + 1}: {steps[currentStepIndex].label}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Voice Input - show for data entry steps */}
          {voiceStep && (
            <VoiceInput
              step={voiceStep}
              contextData={formData}
              onFieldExtracted={handleFieldExtracted}
            />
          )}

          <div className="p-8">
            {/* ===== STEP: BASICS ===== */}
            {currentStep === 'basics' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Opportunity Name
                      <span className="text-gray-400 font-normal ml-2">(auto-generated from address)</span>
                    </label>
                    <input 
                      type="text"
                      placeholder="e.g., 122 Branscomb Rd, Claremont"
                      value={formData.name}
                      onChange={(e) => updateField('name', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Street Address *</label>
                    <AddressAutocomplete
                      value={formData.address}
                      placeholder="Start typing an address..."
                      onSelect={handleAddressSelect}
                      onChange={(val) => updateField('address', val)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">City/Suburb *</label>
                    <input
                      type="text"
                      placeholder="Claremont"
                      value={formData.city}
                      onChange={(e) => updateField('city', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">State *</label>
                    <input
                      type="text"
                      placeholder="TAS"
                      value={formData.state}
                      onChange={(e) => updateField('state', e.target.value)}
                      readOnly={!!formData.state && !!coords}
                      className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 ${formData.state && coords ? 'bg-gray-50 text-gray-600' : ''}`}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Postcode</label>
                    <input
                      type="text"
                      placeholder="7011"
                      value={formData.postcode}
                      onChange={(e) => updateField('postcode', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                {/* Site Intelligence — auto-derived from address */}
                {(derivingIntel || siteIntel) && (
                  <div className={`rounded-xl border p-4 ${derivingIntel ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
                    <div className="flex items-center gap-2 mb-3">
                      <Zap className={`w-4 h-4 ${derivingIntel ? 'text-amber-500 animate-pulse' : 'text-emerald-600'}`} />
                      <span className="text-sm font-semibold text-gray-900">
                        {derivingIntel ? 'Deriving site intelligence...' : 'Site Intelligence (auto-derived)'}
                      </span>
                    </div>
                    {siteIntel && (
                      <div className="grid grid-cols-3 gap-3">
                        {siteIntel.climate_zone && (
                          <div className="bg-white rounded-lg px-3 py-2 border border-gray-100">
                            <p className="text-xs text-gray-500">Climate Zone</p>
                            <p className="font-semibold text-gray-900">Zone {siteIntel.climate_zone}</p>
                            {siteIntel.climate_description && <p className="text-xs text-gray-500">{siteIntel.climate_description}</p>}
                          </div>
                        )}
                        {siteIntel.wind_region && (
                          <div className="bg-white rounded-lg px-3 py-2 border border-gray-100">
                            <p className="text-xs text-gray-500">Wind Region</p>
                            <p className="font-semibold text-gray-900">{siteIntel.wind_region}</p>
                            {siteIntel.wind_speed && <p className="text-xs text-gray-500">{siteIntel.wind_speed} m/s</p>}
                          </div>
                        )}
                        {siteIntel.bal_rating && (
                          <div className={`bg-white rounded-lg px-3 py-2 border ${siteIntel.bal_in_overlay ? 'border-red-200' : 'border-gray-100'}`}>
                            <p className="text-xs text-gray-500">BAL Rating</p>
                            <p className={`font-semibold ${siteIntel.bal_in_overlay ? 'text-red-600' : 'text-gray-900'}`}>{siteIntel.bal_rating}</p>
                            {siteIntel.bal_in_overlay && <p className="text-xs text-red-500">Bushfire overlay</p>}
                          </div>
                        )}
                        {siteIntel.council_name && (
                          <div className="bg-white rounded-lg px-3 py-2 border border-gray-100">
                            <p className="text-xs text-gray-500">Council / LGA</p>
                            <p className="font-semibold text-gray-900">{siteIntel.council_name}</p>
                          </div>
                        )}
                        {siteIntel.zoning && (
                          <div className="bg-white rounded-lg px-3 py-2 border border-gray-100">
                            <p className="text-xs text-gray-500">Zoning</p>
                            <p className="font-semibold text-gray-900">{siteIntel.zoning}</p>
                            {siteIntel.zone_name && <p className="text-xs text-gray-500">{siteIntel.zone_name}</p>}
                          </div>
                        )}
                        {!siteIntel.climate_zone && !siteIntel.wind_region && !siteIntel.bal_rating && !siteIntel.council_name && !siteIntel.zoning && (
                          <p className="col-span-3 text-sm text-gray-500">No site intelligence available for this location yet.</p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Property Analysis — from property-services */}
                {(property.loading || property.profile) && (
                  <div className={`rounded-xl border p-4 ${property.loading ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200'}`}>
                    <div className="flex items-center gap-2 mb-3">
                      <Building2 className={`w-4 h-4 ${property.loading ? 'text-amber-500 animate-pulse' : 'text-blue-600'}`} />
                      <span className="text-sm font-semibold text-gray-900">
                        {property.loading ? 'Analysing property...' : 'Property Analysis'}
                      </span>
                      {property.profile?.metadata?.lgaName && (
                        <span className="text-xs text-gray-500 ml-auto">{property.profile.metadata.lgaName}</span>
                      )}
                    </div>
                    {property.error && (
                      <p className="text-sm text-red-600 mb-2">{property.error}</p>
                    )}
                    {property.profile && (
                      <div className="space-y-4">
                        {/* Subdivision Analysis — prominent for investment platform */}
                        {property.profile.subdivision && (
                          <div className="bg-white rounded-lg p-4 border border-blue-100">
                            <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-3">
                              <Layers className="w-4 h-4 text-amber-500" />
                              Subdivision Potential
                            </h4>
                            <div className="grid grid-cols-2 gap-3">
                              {/* Torrens subdivision */}
                              <div className={`rounded-lg px-3 py-2 border ${property.profile.subdivision.torrens.feasible ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-200'}`}>
                                <div className="flex items-center gap-2 mb-1">
                                  <TrendingUp className={`w-3.5 h-3.5 ${property.profile.subdivision.torrens.feasible ? 'text-emerald-600' : 'text-gray-400'}`} />
                                  <p className="text-xs font-semibold text-gray-700">Torrens Subdivision</p>
                                </div>
                                {property.profile.subdivision.torrens.feasible ? (
                                  <>
                                    <p className="text-lg font-bold text-emerald-700">
                                      Up to {property.profile.subdivision.torrens.maxLots} lots
                                    </p>
                                    {property.profile.subdivision.torrens.lotSizeEach && (
                                      <p className="text-xs text-gray-500">{property.profile.subdivision.torrens.lotSizeEach} sqm each</p>
                                    )}
                                    {property.profile.subdivision.torrens.minLotSize && (
                                      <p className="text-xs text-gray-500">Min lot: {property.profile.subdivision.torrens.minLotSize} sqm</p>
                                    )}
                                  </>
                                ) : (
                                  <p className="text-sm text-gray-500">Not feasible</p>
                                )}
                              </div>
                              {/* Strata subdivision */}
                              <div className={`rounded-lg px-3 py-2 border ${property.profile.subdivision.strata.feasible ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-200'}`}>
                                <div className="flex items-center gap-2 mb-1">
                                  <Building2 className={`w-3.5 h-3.5 ${property.profile.subdivision.strata.feasible ? 'text-emerald-600' : 'text-gray-400'}`} />
                                  <p className="text-xs font-semibold text-gray-700">Strata Title</p>
                                </div>
                                {property.profile.subdivision.strata.feasible ? (
                                  <>
                                    <p className="text-lg font-bold text-emerald-700">Feasible</p>
                                    {property.profile.subdivision.strata.minLotSize && (
                                      <p className="text-xs text-gray-500">Min lot: {property.profile.subdivision.strata.minLotSize} sqm</p>
                                    )}
                                    {property.profile.subdivision.strata.notes && (
                                      <p className="text-xs text-gray-500">{property.profile.subdivision.strata.notes}</p>
                                    )}
                                  </>
                                ) : (
                                  <p className="text-sm text-gray-500">Not feasible</p>
                                )}
                              </div>
                            </div>
                            {/* Recommendations & warnings */}
                            {property.profile.subdivision.recommendations.length > 0 && (
                              <div className="mt-2">
                                {property.profile.subdivision.recommendations.map((rec, i) => (
                                  <p key={i} className="text-xs text-emerald-700 flex items-start gap-1 mt-1">
                                    <Check className="w-3 h-3 mt-0.5 flex-shrink-0" /> {rec}
                                  </p>
                                ))}
                              </div>
                            )}
                            {property.profile.subdivision.warnings.length > 0 && (
                              <div className="mt-2">
                                {property.profile.subdivision.warnings.map((warn, i) => (
                                  <p key={i} className="text-xs text-amber-700 flex items-start gap-1 mt-1">
                                    <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" /> {warn}
                                  </p>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Lot, Zoning, Overlays grid */}
                        <div className="grid grid-cols-3 gap-3">
                          {/* Lot size */}
                          {property.profile.lot?.lotSize && (
                            <div className="bg-white rounded-lg px-3 py-2 border border-gray-100">
                              <p className="text-xs text-gray-500">Lot Size</p>
                              <p className="font-semibold text-gray-900">{property.profile.lot.lotSize.toLocaleString()} sqm</p>
                              {property.profile.lot.lotNumber && (
                                <p className="text-xs text-gray-500">Lot {property.profile.lot.lotNumber}</p>
                              )}
                            </div>
                          )}
                          {/* Zoning */}
                          {property.profile.zoning && (
                            <div className="bg-white rounded-lg px-3 py-2 border border-gray-100">
                              <p className="text-xs text-gray-500">Zoning</p>
                              <p className="font-semibold text-gray-900">{property.profile.zoning.code}</p>
                              <p className="text-xs text-gray-500">{property.profile.zoning.name}</p>
                              {property.profile.zoning.subdivisionPermitted && (
                                <p className="text-xs text-emerald-600 font-medium mt-0.5">Subdivision permitted</p>
                              )}
                            </div>
                          )}
                          {/* Zoning not auto-resolved (e.g. partial LGA coverage) — manual lookup + zone picker */}
                          {!property.profile.zoning && (
                            <div className="bg-white rounded-lg px-3 py-2 border border-amber-200">
                              <p className="text-xs text-gray-500">Zoning</p>
                              <p className="text-sm font-medium text-amber-700">Not auto-resolved here</p>
                              {property.profile.metadata?.zoningManualLookup && (
                                <a
                                  href={property.profile.metadata.zoningManualLookup.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-emerald-700 underline mt-0.5 inline-block"
                                  title={property.profile.metadata.zoningManualLookup.instructions}
                                >
                                  Look it up on {property.profile.metadata.zoningManualLookup.source}
                                </a>
                              )}
                              {property.profile.metadata?.availableZones && property.profile.metadata.availableZones.length > 0 && (
                                <select
                                  value={formData.currentZoning || ''}
                                  onChange={(e) => setFormData(prev => ({ ...prev, currentZoning: e.target.value }))}
                                  className="mt-1 w-full text-xs border border-gray-300 rounded px-2 py-1 min-h-[36px] focus:ring-2 focus:ring-emerald-500"
                                >
                                  <option value="">Select zone…</option>
                                  {property.profile.metadata.availableZones.map((z) => (
                                    <option key={z.code} value={z.code}>{z.code} — {z.name}</option>
                                  ))}
                                </select>
                              )}
                            </div>
                          )}
                          {/* Environment */}
                          {(property.profile.environment.climateZone || property.profile.environment.bal) && (
                            <div className="bg-white rounded-lg px-3 py-2 border border-gray-100">
                              <p className="text-xs text-gray-500">Environment</p>
                              {property.profile.environment.climateZone && (
                                <p className="font-semibold text-gray-900">Climate {property.profile.environment.climateZone}</p>
                              )}
                              {property.profile.environment.bal && (
                                <p className={`text-xs font-medium ${property.profile.environment.balInOverlay ? 'text-red-600' : 'text-gray-600'}`}>
                                  BAL: {property.profile.environment.bal}
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Overlays */}
                        {property.profile.overlays.length > 0 && (
                          <div className="bg-white rounded-lg px-3 py-2 border border-gray-100">
                            <p className="text-xs text-gray-500 mb-1">Planning Overlays ({property.profile.overlays.length})</p>
                            <div className="flex flex-wrap gap-1.5">
                              {property.profile.overlays.map((overlay, i) => (
                                <span
                                  key={i}
                                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                    overlay.requiresReport
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-gray-100 text-gray-700'
                                  }`}
                                >
                                  {overlay.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Use case assessment */}
                {property.profile && (
                  <div className="mt-4">
                    <PropertyAssessment
                      profile={property.profile}
                      onAssess={property.assess}
                      assessing={property.stage === "assessing"}
                      assessment={property.assessment}
                      product="dealfindrs"
                    />
                  </div>
                )}

                {/* Estate Constraints & Yield Brief — the derived buildup (yield is our analysis, not typed in) */}
                {property.profile && (
                  <div className="mt-4">
                    <ConstraintsYieldBrief
                      profile={property.profile}
                      options={{
                        feasibilityStudyLots: hasFeasibilityStudy ? (Number(feasibilityStudyLots) || null) : null,
                        developerClaimedLots: Number(developerStatedLots) || null,
                      }}
                    />
                  </div>
                )}

                <hr className="my-6" />
                <h3 className="font-semibold text-gray-900">Landowner Details</h3>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Landowner Name</label>
                    <input 
                      type="text"
                      placeholder="John Smith"
                      value={formData.landownerName}
                      onChange={(e) => updateField('landownerName', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                    <input 
                      type="tel"
                      placeholder="0412 345 678"
                      value={formData.landownerPhone}
                      onChange={(e) => updateField('landownerPhone', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input 
                      type="email"
                      placeholder="john@example.com"
                      value={formData.landownerEmail}
                      onChange={(e) => updateField('landownerEmail', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Source</label>
                    <input 
                      type="text"
                      placeholder="realestate.com.au, referral, direct..."
                      value={formData.source}
                      onChange={(e) => updateField('source', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ===== STEP: PROPERTY ===== */}
            {currentStep === 'property' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Land Size *</label>
                    <div className="flex gap-2">
                      <input 
                        type="number"
                        placeholder="20000"
                        value={formData.propertySize}
                        onChange={(e) => updateField('propertySize', e.target.value)}
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      <select
                        value={formData.propertySizeUnit}
                        onChange={(e) => updateField('propertySizeUnit', e.target.value)}
                        className="px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                      >
                        <option value="sqm">sqm</option>
                        <option value="hectares">hectares</option>
                        <option value="acres">acres</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Land Stage *</label>
                    <select
                      value={formData.landStage}
                      onChange={(e) => {
                        updateField('landStage', e.target.value)
                        if (e.target.value === 'da_approved') {
                          updateField('deriskDaApproved', true)
                        }
                      }}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="">Select stage</option>
                      <option value="da_approved">DA Approved ✓</option>
                      <option value="da_lodged">DA Lodged (Pending)</option>
                      <option value="needs_rezoning">Needs Rezoning</option>
                      <option value="raw_land">Raw Land</option>
                      <option value="construction_ready">Construction Ready</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Current Zoning</label>
                    <input 
                      type="text"
                      placeholder="R1, R2, B4..."
                      value={formData.currentZoning}
                      onChange={(e) => updateField('currentZoning', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Existing Structures</label>
                    <input 
                      type="text"
                      placeholder="None, farmhouse, shed..."
                      value={formData.existingStructures}
                      onChange={(e) => updateField('existingStructures', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Number of Lots <span className="text-xs font-normal text-gray-500">(derived — our analysis)</span>
                    </label>
                    {profileDerived && derivedLots != null ? (
                      <div className="w-full px-4 py-3 border border-emerald-200 bg-emerald-50 rounded-xl flex items-center justify-between">
                        <span className="font-semibold text-gray-900">{derivedLots}</span>
                        <span className="text-xs text-emerald-700">derived from subdivision analysis</span>
                      </div>
                    ) : profileDerived ? (
                      <div className="w-full px-4 py-3 border border-indigo-200 bg-indigo-50 rounded-xl text-sm text-indigo-700">
                        Pending planner referral — zoning must be resolved to derive the yield.
                      </div>
                    ) : (
                      <div className="w-full px-4 py-3 border border-gray-200 bg-gray-50 rounded-xl text-sm text-gray-400">
                        Select an address to derive the yield.
                      </div>
                    )}
                    <p className="mt-1 text-xs text-gray-500">
                      Yield is derived from the datasets. A shared feasibility study is required to override it.
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Number of Dwellings</label>
                    <input 
                      type="number"
                      placeholder="37"
                      value={formData.numDwellings}
                      onChange={(e) => updateField('numDwellings', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                {/* Developer-provided yield — only a feasibility study is admissible */}
                {profileDerived && (
                  <div className="mt-4 bg-white rounded-xl border border-gray-200 p-4">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hasFeasibilityStudy}
                        onChange={(e) => setHasFeasibilityStudy(e.target.checked)}
                        className="w-4 h-4 accent-emerald-500"
                      />
                      Developer has a shared feasibility study
                    </label>
                    {hasFeasibilityStudy && (
                      <div className="mt-2">
                        <label className="block text-xs text-gray-500 mb-1">
                          Study lot yield <span className="text-violet-600">(admissible — reconciled against our analysis)</span>
                        </label>
                        <input
                          type="number"
                          value={feasibilityStudyLots}
                          onChange={(e) => setFeasibilityStudyLots(e.target.value)}
                          placeholder="e.g. 32"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    )}
                    <div className="mt-3">
                      <label className="block text-xs text-gray-500 mb-1">
                        Developer&apos;s stated yield <span className="text-gray-400">(anecdotal — reference only, not used)</span>
                      </label>
                      <input
                        type="number"
                        value={developerStatedLots}
                        onChange={(e) => setDeveloperStatedLots(e.target.value)}
                        placeholder="optional"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      Our derived yield governs. A feasibility study is reconciled for discrepancies; an unbacked
                      anecdotal figure above our analysis is a pass unless the developer accepts it.
                    </p>
                  </div>
                )}

                <hr className="my-6" />
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  🛡️ De-Risk Factors
                  <span className="text-xs font-normal text-gray-500">(these add points to your score)</span>
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <label className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-all ${formData.deriskVendorFinance ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <input
                      type="checkbox"
                      checked={formData.deriskVendorFinance}
                      onChange={(e) => updateField('deriskVendorFinance', e.target.checked)}
                      className="w-5 h-5 text-emerald-600 rounded"
                    />
                    <div>
                      <span className="font-medium text-gray-900">Vendor Finance Available</span>
                      <span className="text-emerald-600 text-sm ml-2">+10 pts</span>
                    </div>
                  </label>

                  <label className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-all ${formData.deriskFixedPriceConstruction ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <input
                      type="checkbox"
                      checked={formData.deriskFixedPriceConstruction}
                      onChange={(e) => updateField('deriskFixedPriceConstruction', e.target.checked)}
                      className="w-5 h-5 text-emerald-600 rounded"
                    />
                    <div>
                      <span className="font-medium text-gray-900">Fixed-Price Construction</span>
                      <span className="text-emerald-600 text-sm ml-2">+10 pts</span>
                    </div>
                  </label>

                  <label className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-all ${formData.deriskExperiencedPm ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <input
                      type="checkbox"
                      checked={formData.deriskExperiencedPm}
                      onChange={(e) => updateField('deriskExperiencedPm', e.target.checked)}
                      className="w-5 h-5 text-emerald-600 rounded"
                    />
                    <div>
                      <span className="font-medium text-gray-900">Experienced PM</span>
                      <span className="text-emerald-600 text-sm ml-2">+5 pts</span>
                    </div>
                  </label>

                  <label className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-all ${formData.deriskClearTitle ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <input
                      type="checkbox"
                      checked={formData.deriskClearTitle}
                      onChange={(e) => updateField('deriskClearTitle', e.target.checked)}
                      className="w-5 h-5 text-emerald-600 rounded"
                    />
                    <div>
                      <span className="font-medium text-gray-900">Clear Title</span>
                      <span className="text-emerald-600 text-sm ml-2">+5 pts</span>
                    </div>
                  </label>

                  <label className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-all ${formData.deriskGrowthCorridor ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <input
                      type="checkbox"
                      checked={formData.deriskGrowthCorridor}
                      onChange={(e) => updateField('deriskGrowthCorridor', e.target.checked)}
                      className="w-5 h-5 text-emerald-600 rounded"
                    />
                    <div>
                      <span className="font-medium text-gray-900">Growth Corridor</span>
                      <span className="text-emerald-600 text-sm ml-2">+5 pts</span>
                    </div>
                  </label>
                </div>

                {formData.deriskFixedPriceConstruction && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Construction Partner</label>
                    <input 
                      type="text"
                      placeholder="Factory2Key, Metricon..."
                      value={formData.deriskConstructionPartner}
                      onChange={(e) => updateField('deriskConstructionPartner', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                )}

                <hr className="my-6" />
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  ⚠️ Risk Factors
                  <span className="text-xs font-normal text-gray-500">(these deduct points)</span>
                </h3>

                <div className="space-y-4">
                  <label className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-all ${formData.riskPreviousDisputes ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <input
                      type="checkbox"
                      checked={formData.riskPreviousDisputes}
                      onChange={(e) => updateField('riskPreviousDisputes', e.target.checked)}
                      className="w-5 h-5 text-red-600 rounded"
                    />
                    <div>
                      <span className="font-medium text-gray-900">Previous Legal Disputes</span>
                      <span className="text-red-600 text-sm ml-2">-5 pts</span>
                    </div>
                  </label>

                  <label className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-all ${formData.riskEnvironmentalIssues ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <input
                      type="checkbox"
                      checked={formData.riskEnvironmentalIssues}
                      onChange={(e) => updateField('riskEnvironmentalIssues', e.target.checked)}
                      className="w-5 h-5 text-red-600 rounded"
                    />
                    <div>
                      <span className="font-medium text-gray-900">Environmental Concerns</span>
                      <span className="text-red-600 text-sm ml-2">-10 pts</span>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* ===== STEP: FINANCIAL ===== */}
            {currentStep === 'financial' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Land Purchase Price *</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                      <input 
                        type="number"
                        placeholder="2,500,000"
                        value={formData.landPurchasePrice}
                        onChange={(e) => updateField('landPurchasePrice', e.target.value)}
                        className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Infrastructure Costs</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                      <input 
                        type="number"
                        placeholder="2,000,000"
                        value={formData.infrastructureCosts}
                        onChange={(e) => updateField('infrastructureCosts', e.target.value)}
                        className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Construction Cost Per Unit *</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                      <input 
                        type="number"
                        placeholder="330,000"
                        value={formData.constructionPerUnit}
                        onChange={(e) => updateField('constructionPerUnit', e.target.value)}
                        className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Average Sale Price *</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                      <input 
                        type="number"
                        placeholder="600,000"
                        value={formData.avgSalePrice}
                        onChange={(e) => updateField('avgSalePrice', e.target.value)}
                        className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Contingency %</label>
                    <div className="relative">
                      <input 
                        type="number"
                        value={formData.contingencyPercent}
                        onChange={(e) => updateField('contingencyPercent', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 pr-8"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Timeframe (months)</label>
                    <input 
                      type="number"
                      placeholder="18"
                      value={formData.timeframeMonths}
                      onChange={(e) => updateField('timeframeMonths', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Target Start</label>
                    <input 
                      type="date"
                      value={formData.targetStartDate}
                      onChange={(e) => updateField('targetStartDate', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <hr className="my-6" />
                <h3 className="font-semibold text-gray-900">Pre-Sales</h3>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Pre-Sales Secured (%)</label>
                    <div className="relative">
                      <input 
                        type="number"
                        placeholder="0"
                        value={formData.deriskPreSalesPercent}
                        onChange={(e) => updateField('deriskPreSalesPercent', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 pr-8"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                    </div>
                    {parseFloat(formData.deriskPreSalesPercent) >= 50 && (
                      <p className="text-emerald-600 text-sm mt-1">✓ +10 de-risk points for 50%+ pre-sales</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Pre-Sales Count</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={formData.deriskPreSalesCount}
                      onChange={(e) => updateField('deriskPreSalesCount', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                {/* Lender-lens inputs (engine-specific) */}
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                  <h4 className="font-semibold text-slate-900">Lender-lens inputs</h4>
                  <p className="mt-1 text-sm text-slate-600">
                    The figures a credit committee uses to test the deal. The engine substitutes conservative values for anything not backed by an evidence document at the next step.
                  </p>

                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">Total Net Project Equity (claimed)</label>
                      <div className="relative">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                        <input
                          type="number"
                          placeholder="0"
                          value={formData.claimedTotalEquity}
                          onChange={(e) => updateField('claimedTotalEquity', e.target.value)}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 pl-7 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                        />
                      </div>
                      <p className="mt-1 text-xs text-slate-500">Includes land uplift, in-kind, deferred. Will be stripped to cash by the engine.</p>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">Of which is paid-in / committed cash</label>
                      <div className="relative">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                        <input
                          type="number"
                          placeholder="0"
                          value={formData.claimedEquityCash}
                          onChange={(e) => updateField('claimedEquityCash', e.target.value)}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 pl-7 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                        />
                      </div>
                      <p className="mt-1 text-xs text-slate-500">Counted only if equity_proof is uploaded.</p>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">Proposed senior loan amount</label>
                      <div className="relative">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                        <input
                          type="number"
                          placeholder="0"
                          value={formData.proposedLoanAmount}
                          onChange={(e) => updateField('proposedLoanAmount', e.target.value)}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 pl-7 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                        />
                      </div>
                      <p className="mt-1 text-xs text-slate-500">LVR is derived last from this and evidenced GRV — never an input target.</p>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">Evidenced purchase price (optional)</label>
                      <div className="relative">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                        <input
                          type="number"
                          placeholder="(if different from claimed land value)"
                          value={formData.evidencedPurchasePrice}
                          onChange={(e) => updateField('evidencedPurchasePrice', e.target.value)}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 pl-7 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                        />
                      </div>
                      <p className="mt-1 text-xs text-slate-500">If you have an executed contract for less than your asserted land value, enter the contract amount here.</p>
                    </div>
                  </div>

                  <label className="mt-4 flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={formData.isOffshoreSupply}
                      onChange={(e) => updateField('isOffshoreSupply', e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-slate-300"
                    />
                    <div>
                      <p className="text-sm font-medium text-slate-700">Offshore-supplied build (modular / imported materials)</p>
                      <p className="text-xs text-slate-500">Forces a 7.5% contingency floor instead of 5%.</p>
                    </div>
                  </label>
                </div>

                {/* Live Financial Preview */}
                {financials.lots > 0 && financials.totalCost > 0 && (
                  <div className={`p-6 rounded-xl border-2 ${
                    financials.gmPercent >= 25 ? 'bg-emerald-50 border-emerald-200' :
                    financials.gmPercent >= 18 ? 'bg-amber-50 border-amber-200' :
                    'bg-red-50 border-red-200'
                  }`}>
                    <h4 className="font-semibold text-gray-900 mb-4">Live Financial Preview</h4>
                    <div className="grid grid-cols-4 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold text-gray-900">
                          ${(financials.totalCost / 1000000).toFixed(1)}M
                        </p>
                        <p className="text-sm text-gray-600">Total Cost</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-900">
                          ${(financials.totalRevenue / 1000000).toFixed(1)}M
                        </p>
                        <p className="text-sm text-gray-600">Total Revenue</p>
                      </div>
                      <div>
                        <p className={`text-2xl font-bold ${financials.grossMargin > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          ${(financials.grossMargin / 1000000).toFixed(2)}M
                        </p>
                        <p className="text-sm text-gray-600">Gross Profit</p>
                      </div>
                      <div>
                        <p className={`text-2xl font-bold ${
                          financials.gmPercent >= 25 ? 'text-emerald-600' :
                          financials.gmPercent >= 18 ? 'text-amber-600' :
                          'text-red-600'
                        }`}>
                          {financials.gmPercent.toFixed(1)}%
                        </p>
                        <p className="text-sm text-gray-600">Gross Margin</p>
                      </div>
                    </div>
                    <p className="text-center text-sm mt-4 text-gray-600">
                      {financials.gmPercent >= 25 
                        ? '✅ On track for GREEN light'
                        : financials.gmPercent >= 18
                          ? '🟡 Currently AMBER - needs 25% for GREEN'
                          : '🔴 Currently RED - needs significant improvement'
                      }
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ===== STEP: DOCUMENTS ===== */}
            {currentStep === 'documents' && draftId && (
              <DocumentUpload
                opportunityId={draftId}
                onEvidenceChange={setDocuments}
              />
            )}
            {currentStep === 'documents' && !draftId && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
                <p className="font-medium text-amber-900">Saving deal as a draft…</p>
                <p className="mt-1 text-sm text-amber-700">
                  Evidence uploads need a saved opportunity to attach to. {draftError ? `Error: ${draftError}.` : 'This usually takes a moment.'}
                </p>
              </div>
            )}

            {/* ===== STEP: REVIEW ===== */}
            {currentStep === 'review' && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-lg font-bold ${
                    financials.gmPercent >= 25 ? 'bg-emerald-100 text-emerald-800' :
                    financials.gmPercent >= 18 ? 'bg-amber-100 text-amber-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {financials.gmPercent >= 25 ? '🟢' : financials.gmPercent >= 18 ? '🟡' : '🔴'}
                    Estimated: {financials.gmPercent.toFixed(1)}% GM
                  </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h4 className="font-semibold text-gray-900 mb-2">📍 Location</h4>
                    <p className="text-gray-700">{formData.address || 'Not set'}</p>
                    <p className="text-gray-600">{formData.city}, {formData.state}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h4 className="font-semibold text-gray-900 mb-2">🏗️ Property</h4>
                    <p className="text-gray-700">{formData.numLots || 0} lots</p>
                    <p className="text-gray-600">{formData.propertySize} {formData.propertySizeUnit}</p>
                    <p className="text-gray-600 capitalize">{formData.landStage?.replace('_', ' ') || 'Unknown stage'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h4 className="font-semibold text-gray-900 mb-2">📄 Documents</h4>
                    <p className="text-gray-700">{documents.length} uploaded</p>
                    {documents.length === 0 && (
                      <p className="text-amber-600 text-sm">Consider adding documents for better assessment</p>
                    )}
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <h4 className="font-semibold text-gray-900 mb-4">💰 Financial Summary</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Land Purchase:</span>
                      <span className="font-medium">${(parseFloat(formData.landPurchasePrice) || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Infrastructure:</span>
                      <span className="font-medium">${(parseFloat(formData.infrastructureCosts) || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Construction ({formData.numDwellings || formData.numLots} × ${(parseFloat(formData.constructionPerUnit) || 0).toLocaleString()}):</span>
                      <span className="font-medium">${((parseFloat(formData.constructionPerUnit) || 0) * (parseInt(formData.numDwellings) || parseInt(formData.numLots) || 0)).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-bold text-gray-900 pt-2 border-t">
                      <span>Total Cost:</span>
                      <span>${financials.totalCost.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Revenue ({formData.numDwellings || formData.numLots} × ${(parseFloat(formData.avgSalePrice) || 0).toLocaleString()}):</span>
                      <span className="font-medium">${financials.totalRevenue.toLocaleString()}</span>
                    </div>
                    <div className={`flex justify-between font-bold pt-2 border-t ${financials.grossMargin > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      <span>Gross Profit:</span>
                      <span>${financials.grossMargin.toLocaleString()} ({financials.gmPercent.toFixed(1)}%)</span>
                    </div>
                  </div>
                </div>

                {/* De-risk Factors Summary */}
                <div className="bg-emerald-50 rounded-xl p-6">
                  <h4 className="font-semibold text-gray-900 mb-3">🛡️ De-Risk Factors Applied</h4>
                  <div className="flex flex-wrap gap-2">
                    {(formData.deriskDaApproved || formData.landStage === 'da_approved') && (
                      <span className="px-3 py-1 bg-emerald-200 text-emerald-800 rounded-full text-sm">DA Approved +15</span>
                    )}
                    {formData.deriskVendorFinance && (
                      <span className="px-3 py-1 bg-emerald-200 text-emerald-800 rounded-full text-sm">Vendor Finance +10</span>
                    )}
                    {formData.deriskFixedPriceConstruction && (
                      <span className="px-3 py-1 bg-emerald-200 text-emerald-800 rounded-full text-sm">Fixed-Price Build +10</span>
                    )}
                    {parseFloat(formData.deriskPreSalesPercent) >= 50 && (
                      <span className="px-3 py-1 bg-emerald-200 text-emerald-800 rounded-full text-sm">50%+ Pre-Sales +10</span>
                    )}
                    {formData.deriskExperiencedPm && (
                      <span className="px-3 py-1 bg-emerald-200 text-emerald-800 rounded-full text-sm">Experienced PM +5</span>
                    )}
                    {formData.deriskClearTitle && (
                      <span className="px-3 py-1 bg-emerald-200 text-emerald-800 rounded-full text-sm">Clear Title +5</span>
                    )}
                    {formData.deriskGrowthCorridor && (
                      <span className="px-3 py-1 bg-emerald-200 text-emerald-800 rounded-full text-sm">Growth Corridor +5</span>
                    )}
                  </div>
                </div>

                {/* Risk Warnings */}
                {(formData.riskPreviousDisputes || formData.riskEnvironmentalIssues || formData.landStage === 'needs_rezoning') && (
                  <div className="bg-red-50 rounded-xl p-6">
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-red-600" />
                      Risk Factors
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {formData.riskPreviousDisputes && (
                        <span className="px-3 py-1 bg-red-200 text-red-800 rounded-full text-sm">Previous Disputes -5</span>
                      )}
                      {formData.landStage === 'needs_rezoning' && (
                        <span className="px-3 py-1 bg-red-200 text-red-800 rounded-full text-sm">Needs Rezoning -10</span>
                      )}
                      {formData.riskEnvironmentalIssues && (
                        <span className="px-3 py-1 bg-red-200 text-red-800 rounded-full text-sm">Environmental Issues -10</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Draft-save error (e.g. account not linked to a company → 403).
              Rendered here so it's visible on whatever step the save was
              attempted from — previously a Step-3 → documents save failure was
              silent because the only error UI lived on the unreached documents step. */}
          {draftError && (
            <div className="mx-8 mt-4 flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              <div className="flex items-start gap-2 flex-1">
                <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <span>{draftError}</span>
              </div>
              <Link
                href="/setup"
                className="self-start sm:self-auto whitespace-nowrap px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
              >
                Finish setup →
              </Link>
            </div>
          )}

          {/* Navigation */}
          <div className="px-8 py-6 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
            <button
              onClick={prevStep}
              disabled={currentStepIndex === 0}
              className="flex items-center gap-2 px-6 py-3 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>

            {currentStep === 'review' ? (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-xl hover:from-amber-600 hover:to-orange-600 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Assessing...
                  </>
                ) : (
                  <>
                    Run Assessment
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={nextStep}
                disabled={savingDraft}
                className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-xl hover:from-amber-600 hover:to-orange-600 disabled:opacity-50"
              >
                {savingDraft ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
    </AuthLayout>
  )
}