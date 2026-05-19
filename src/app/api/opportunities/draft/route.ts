import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { requireAuth } from '@/lib/auth/require-auth'
import { getCompanyId } from '@/lib/auth/get-company-id'

let _admin: SupabaseClient | null = null
function getSupabaseAdmin(): SupabaseClient {
  if (!_admin) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) throw new Error('Supabase credentials not configured')
    _admin = createClient(url, key)
  }
  return _admin
}

/**
 * Create or update a draft opportunity.
 *
 * Body: { id?: string, formData: <partial form fields>, siteIntel?, coords? }
 *
 * If `id` is supplied, the draft is updated in place. Otherwise a new
 * draft row is created with status='draft', rag_status=null.
 *
 * The intake flow calls this when the user enters the "documents" step
 * so that evidence uploads have a real opportunity_id to attach to.
 * Assessment runs separately via POST /api/assess once evidence is in.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: 401 })
  const { user, supabase } = auth

  const company = await getCompanyId(supabase, user)
  if (company.error) return NextResponse.json({ error: company.error }, { status: 403 })

  const body = await request.json().catch(() => ({}))
  const { id, formData = {}, siteIntel, coords } = body as {
    id?: string
    formData?: Record<string, unknown>
    siteIntel?: Record<string, unknown>
    coords?: { lat: number; lng: number }
  }

  const numDwellings = Number(formData.numDwellings) || Number(formData.numLots) || 0
  const landCost = Number(formData.landPurchasePrice) || 0
  const infraCost = Number(formData.infrastructureCosts) || 0
  const buildPerUnit = Number(formData.constructionPerUnit) || 0
  const contingencyPct = Number(formData.contingencyPercent) || 5
  const totalConstruction = buildPerUnit * numDwellings
  const subtotal = landCost + infraCost + totalConstruction
  const contingencyAmount = subtotal * (contingencyPct / 100)
  const totalProjectCost = subtotal + contingencyAmount
  const avgSalePrice = Number(formData.avgSalePrice) || 0
  const totalRevenue = avgSalePrice * numDwellings

  const writeData: Record<string, unknown> = {
    company_id: company.companyId,
    status: 'draft',
    rag_status: null,

    name: (formData.name as string) || `${formData.address || 'Untitled'}${formData.city ? ', ' + formData.city : ''}`,
    address: formData.address || null,
    city: formData.city || null,
    state: formData.state || null,
    postcode: formData.postcode || null,

    property_size: Number(formData.propertySize) || null,
    property_size_unit: formData.propertySizeUnit || 'sqm',
    land_stage: formData.landStage || null,
    current_zoning: formData.currentZoning || null,
    num_lots: Number(formData.numLots) || null,
    num_dwellings: numDwellings || null,
    existing_structures: formData.existingStructures || null,
    site_features: formData.siteFeatures || null,
    site_constraints: formData.siteConstraints || null,

    landowner_name: formData.landownerName || null,
    landowner_phone: formData.landownerPhone || null,
    landowner_email: formData.landownerEmail || null,
    landowner_company: formData.landownerCompany || null,

    source: formData.source || null,
    source_contact: formData.sourceContact || null,

    derisk_da_approved: formData.deriskDaApproved || false,
    derisk_vendor_finance: formData.deriskVendorFinance || false,
    derisk_fixed_price_construction: formData.deriskFixedPriceConstruction || false,
    derisk_construction_partner: formData.deriskConstructionPartner || null,
    derisk_pre_sales_percent: Number(formData.deriskPreSalesPercent) || null,
    derisk_experienced_pm: formData.deriskExperiencedPm || false,
    derisk_pm_name: formData.deriskPmName || null,
    derisk_clear_title: formData.deriskClearTitle || false,
    derisk_growth_corridor: formData.deriskGrowthCorridor || false,

    risk_previous_disputes: formData.riskPreviousDisputes || false,
    risk_environmental_issues: formData.riskEnvironmentalIssues || false,
    risk_heritage_overlay: formData.riskHeritageOverlay || false,

    land_purchase_price: landCost || null,
    infrastructure_costs: infraCost || null,
    construction_per_unit: buildPerUnit || null,
    total_construction_cost: totalConstruction || null,
    contingency_percent: contingencyPct,
    contingency_amount: contingencyAmount || null,
    total_project_cost: totalProjectCost || null,
    avg_sale_price: avgSalePrice || null,
    total_revenue: totalRevenue || null,

    timeframe_months: Number(formData.timeframeMonths) || null,
    target_start_date: formData.targetStartDate || null,
    development_type: formData.developmentType || null,
    development_goals: formData.developmentGoals || null,
    brief_description: formData.briefDescription || null,

    ...(coords ? { latitude: coords.lat, longitude: coords.lng } : {}),
    ...(siteIntel ? {
      climate_zone: siteIntel.climate_zone || null,
      wind_region: siteIntel.wind_region || null,
      bal_rating: siteIntel.bal_rating || null,
      council_name: siteIntel.council_name || null,
      council_code: siteIntel.council_code || null,
    } : {}),
  }

  const admin = getSupabaseAdmin()

  if (id) {
    // Update existing draft
    const { data: existing } = await admin
      .from('opportunities')
      .select('id, company_id, status')
      .eq('id', id)
      .single()

    if (!existing || existing.company_id !== company.companyId) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }
    // Keep status as 'draft' unless it has already progressed past draft
    if (existing.status === 'draft') {
      writeData.updated_at = new Date().toISOString()
      const { data: updated, error: updErr } = await admin
        .from('opportunities')
        .update(writeData as never)
        .eq('id', id)
        .select()
        .single()
      if (updErr) return NextResponse.json({ error: 'update_failed', detail: updErr.message }, { status: 500 })
      return NextResponse.json({ success: true, opportunity: updated, mode: 'updated' })
    }
    return NextResponse.json({ success: true, opportunity: existing, mode: 'unchanged' })
  }

  // Insert new draft
  const { data: created, error: insErr } = await admin
    .from('opportunities')
    .insert(writeData as never)
    .select()
    .single()

  if (insErr) return NextResponse.json({ error: 'insert_failed', detail: insErr.message }, { status: 500 })

  return NextResponse.json({ success: true, opportunity: created, mode: 'created' })
}
