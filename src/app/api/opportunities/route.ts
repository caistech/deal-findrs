import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase credentials not configured')
  return createClient(url, key)
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const body = await request.json()
    // siteIntel + coords accepted for backward-compat but no longer persisted as denormalized
    // columns — the canonical property dataset is propertyProfile (property-services derive).
    const { formData, opportunity, result, propertyProfile } = body

    // Calculate financials
    const numDwellings = parseInt(formData.numDwellings) || parseInt(formData.numLots) || 0
    const landCost = parseFloat(formData.landPurchasePrice) || 0
    const infraCost = parseFloat(formData.infrastructureCosts) || 0
    const buildPerUnit = parseFloat(formData.constructionPerUnit) || 0
    const contingencyPct = parseFloat(formData.contingencyPercent) || 5
    const totalConstruction = buildPerUnit * numDwellings
    const subtotal = landCost + infraCost + totalConstruction
    const contingencyAmount = subtotal * (contingencyPct / 100)
    const totalProjectCost = subtotal + contingencyAmount
    const avgSalePrice = parseFloat(formData.avgSalePrice) || 0
    const totalRevenue = avgSalePrice * numDwellings
    const grossMarginDollars = totalRevenue - totalProjectCost
    const grossMarginPercent = totalRevenue > 0 ? (grossMarginDollars / totalRevenue) * 100 : 0

    const insertData: Record<string, any> = {
      name: formData.name || `${formData.address}, ${formData.city}`,
      address: formData.address || null,
      city: formData.city || null,
      state: formData.state || null,
      postcode: formData.postcode || null,
      status: 'assessed',
      rag_status: result?.status || null,

      // Property
      property_size: parseFloat(formData.propertySize) || null,
      property_size_unit: formData.propertySizeUnit || 'sqm',
      land_stage: formData.landStage || null,
      current_zoning: formData.currentZoning || null,
      num_lots: parseInt(formData.numLots) || null,
      num_dwellings: numDwellings || null,
      existing_structures: formData.existingStructures || null,
      site_features: formData.siteFeatures || null,
      site_constraints: formData.siteConstraints || null,

      // Landowner
      landowner_name: formData.landownerName || null,
      landowner_phone: formData.landownerPhone || null,
      landowner_email: formData.landownerEmail || null,
      landowner_company: formData.landownerCompany || null,

      // Source
      source: formData.source || null,
      source_contact: formData.sourceContact || null,

      // De-risk factors
      derisk_da_approved: formData.deriskDaApproved || false,
      derisk_vendor_finance: formData.deriskVendorFinance || false,
      derisk_fixed_price_construction: formData.deriskFixedPriceConstruction || false,
      derisk_construction_partner: formData.deriskConstructionPartner || null,
      derisk_pre_sales_percent: parseFloat(formData.deriskPreSalesPercent) || null,
      derisk_experienced_pm: formData.deriskExperiencedPm || false,
      derisk_pm_name: formData.deriskPmName || null,
      derisk_clear_title: formData.deriskClearTitle || false,
      derisk_growth_corridor: formData.deriskGrowthCorridor || false,

      // Risk factors
      risk_previous_disputes: formData.riskPreviousDisputes || false,
      risk_environmental_issues: formData.riskEnvironmentalIssues || false,
      risk_heritage_overlay: formData.riskHeritageOverlay || false,

      // Financial
      land_purchase_price: landCost || null,
      infrastructure_costs: infraCost || null,
      construction_per_unit: buildPerUnit || null,
      total_construction_cost: totalConstruction || null,
      contingency_percent: contingencyPct,
      contingency_amount: contingencyAmount || null,
      total_project_cost: totalProjectCost || null,
      avg_sale_price: avgSalePrice || null,
      developed_lot_price: parseFloat(formData.developedLotPrice) || null,
      total_revenue: totalRevenue || null,
      gross_margin_dollars: grossMarginDollars || null,
      gross_margin_percent: Math.round(grossMarginPercent * 10) / 10,

      // Timeline
      timeframe_months: parseInt(formData.timeframeMonths) || null,
      target_start_date: formData.targetStartDate || null,

      // Development
      development_type: formData.developmentType || null,
      development_goals: formData.developmentGoals || null,
      brief_description: formData.briefDescription || null,

      // Full property-services derive result — the single canonical property dataset
      // (coords, lot, zoning detail, council/LGA, environment (climate/wind/BAL), terrain,
      // overlays, subdivision analysis, metadata). Supersedes the legacy denormalized columns
      // (latitude/longitude/climate_zone/wind_region/bal_rating/council_name/council_code),
      // which do not exist on this table and 500'd the insert. Read from property_profile.
      ...(propertyProfile ? { property_profile: propertyProfile } : {}),
    }

    const { data: opp, error: insertError } = await supabase
      .from('opportunities')
      .insert(insertData as never)
      .select()
      .single()

    if (insertError) {
      console.error('Insert error:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    // Save assessment result if provided
    if (result && opp) {
      try {
        await supabase.from('assessments').insert({
          opportunity_id: opp.id,
          status: result.status,
          score: result.score,
          gm_score: result.gmScore,
          derisk_score: result.deRiskScore,
          risk_score: result.riskScore,
          total_cost: result.financials?.totalCost,
          total_revenue: result.financials?.totalRevenue,
          gross_margin: result.financials?.grossMargin,
          gross_margin_percent: result.financials?.grossMarginPercent,
          summary: result.summary,
          passed_criteria: result.passedCriteria,
          failed_criteria: result.failedCriteria,
          attention_items: result.attentionItems,
          path_to_green: result.pathToGreen,
          recommendations: result.recommendations,
        } as never)
      } catch (err) {
        console.warn('Assessment save error (non-critical):', err)
      }
    }

    return NextResponse.json({ success: true, opportunity: opp })
  } catch (error) {
    console.error('Error creating opportunity:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const supabase = getSupabaseAdmin()

    const { data, error } = await supabase
      .from('opportunities')
      .select('id, name, address, city, state, status, rag_status, num_lots, num_dwellings, land_stage, total_project_cost, total_revenue, gross_margin_percent, created_at')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching opportunities:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ opportunities: data })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
