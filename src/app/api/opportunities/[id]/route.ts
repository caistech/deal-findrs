import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

let _supabaseAdmin: SupabaseClient | null = null

function getSupabaseAdmin(): SupabaseClient {
  if (!_supabaseAdmin) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) throw new Error('Supabase credentials not configured')
    _supabaseAdmin = createClient(url, key)
  }
  return _supabaseAdmin
}

// PUT - Full opportunity update (for Edit modal)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseAdmin()
    const body = await request.json()
    const opportunityId = params.id

    // Build update object with only provided fields
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    }

    // Map frontend field names to actual database column names
    const fieldMapping: Record<string, string> = {
      // Basic info
      name: 'name',
      address: 'address',
      city: 'city',
      state: 'state',
      postcode: 'postcode',

      // Property details
      propertySize: 'property_size',
      propertySizeUnit: 'property_size_unit',
      landStage: 'land_stage',
      numLots: 'num_lots',
      numDwellings: 'num_dwellings',
      currentZoning: 'current_zoning',
      proposedZoning: 'proposed_zoning',
      dwellingTypes: 'dwelling_types',
      existingStructures: 'existing_structures',
      siteFeatures: 'site_features',
      siteConstraints: 'site_constraints',

      // Landowner info
      landownerName: 'landowner_name',
      landownerPhone: 'landowner_phone',
      landownerEmail: 'landowner_email',
      landownerCompany: 'landowner_company',
      landownerNotes: 'landowner_notes',

      // Source info
      source: 'source',
      sourceContact: 'source_contact',
      sourceNotes: 'source_notes',

      // De-risk factors
      deriskDaApproved: 'derisk_da_approved',
      deriskVendorFinance: 'derisk_vendor_finance',
      deriskVendorFinanceTerms: 'derisk_vendor_finance_terms',
      deriskFixedPriceConstruction: 'derisk_fixed_price_construction',
      deriskConstructionPartner: 'derisk_construction_partner',
      deriskPreSalesPercent: 'derisk_pre_sales_percent',
      deriskPreSalesCount: 'derisk_pre_sales_count',
      deriskExperiencedPm: 'derisk_experienced_pm',
      deriskPmName: 'derisk_pm_name',
      deriskClearTitle: 'derisk_clear_title',
      deriskGrowthCorridor: 'derisk_growth_corridor',

      // Risk factors
      riskPreviousDisputes: 'risk_previous_disputes',
      riskDisputeDetails: 'risk_dispute_details',
      riskEnvironmentalIssues: 'risk_environmental_issues',
      riskEnvironmentalDetails: 'risk_environmental_details',
      riskHeritageOverlay: 'risk_heritage_overlay',
      riskHeritageDetails: 'risk_heritage_details',
      riskOther: 'risk_other',

      // Financial
      landPurchasePrice: 'land_purchase_price',
      infrastructureCosts: 'infrastructure_costs',
      constructionPerUnit: 'construction_per_unit',
      totalConstructionCost: 'total_construction_cost',
      contingencyPercent: 'contingency_percent',
      contingencyAmount: 'contingency_amount',
      totalProjectCost: 'total_project_cost',
      avgSalePrice: 'avg_sale_price',
      developedLotPrice: 'developed_lot_price',
      totalRevenue: 'total_revenue',

      // Timeframe
      timeframeMonths: 'timeframe_months',
      targetStartDate: 'target_start_date',
      targetCompletionDate: 'target_completion_date',
      timeSensitiveFactors: 'time_sensitive_factors',

      // Development info
      developmentType: 'development_type',
      developmentGoals: 'development_goals',
      designPreferences: 'design_preferences',
      briefDescription: 'brief_description',

      // Notes
      notes: 'notes',
      tags: 'tags',
    }

    // Only include fields that were actually provided
    for (const [frontendKey, dbKey] of Object.entries(fieldMapping)) {
      if (body[frontendKey] !== undefined) {
        updateData[dbKey] = body[frontendKey]
      }
    }

    // Calculate gross margin if cost and revenue are provided
    if (body.totalProjectCost !== undefined || body.totalRevenue !== undefined) {
      // Get current values if not all provided
      if (body.totalProjectCost === undefined || body.totalRevenue === undefined) {
        const { data: current } = await supabase
          .from('opportunities')
          .select('total_project_cost, total_revenue')
          .eq('id', opportunityId)
          .single()

        if (current) {
          const cost = body.totalProjectCost ?? current.total_project_cost ?? 0
          const revenue = body.totalRevenue ?? current.total_revenue ?? 0
          const grossMargin = revenue - cost
          const grossMarginPercent = revenue > 0
            ? ((grossMargin / revenue) * 100)
            : 0
          updateData.gross_margin_dollars = grossMargin
          updateData.gross_margin_percent = grossMarginPercent
        }
      } else {
        const grossMargin = body.totalRevenue - body.totalProjectCost
        const grossMarginPercent = body.totalRevenue > 0
          ? ((grossMargin / body.totalRevenue) * 100)
          : 0
        updateData.gross_margin_dollars = grossMargin
        updateData.gross_margin_percent = grossMarginPercent
      }
    }

    // Update opportunity
    const { data: opportunity, error: updateError } = await supabase
      .from('opportunities')
      .update(updateData)
      .eq('id', opportunityId)
      .select()
      .single()

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json({ error: 'Failed to update opportunity' }, { status: 500 })
    }

    // Log activity if userId provided
    if (body.userId) {
      try {
        await supabase.from('activity_log').insert({
          company_id: opportunity.company_id,
          user_id: body.userId,
          action: 'opportunity_updated',
          entity_type: 'opportunity',
          entity_id: opportunityId,
          details: {
            updated_fields: Object.keys(updateData).filter(k => k !== 'updated_at'),
          },
        })
      } catch (err) {
        console.warn('Activity log error:', err)
      }
    }

    return NextResponse.json({
      success: true,
      opportunity,
    })
  } catch (error) {
    console.error('Error updating opportunity:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - Status change only (existing functionality)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseAdmin()
    const { status, note, userId } = await request.json()
    const opportunityId = params.id

    // Validate status
    const validStatuses = ['draft', 'submitted', 'assessing', 'assessed', 'proceed', 'pending', 'approved', 'rejected', 'archived']
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    // Get current opportunity for previous status
    const { data: currentOpp } = await supabase
      .from('opportunities')
      .select('status, company_id')
      .eq('id', opportunityId)
      .single()

    // Update opportunity status
    const { data: opportunity, error: updateError } = await supabase
      .from('opportunities')
      .update({
        status,
        notes: note ? `${status.toUpperCase()}: ${note}` : undefined,
        updated_at: new Date().toISOString(),
      })
      .eq('id', opportunityId)
      .select()
      .single()

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json({ error: 'Failed to update status' }, { status: 500 })
    }

    // Log activity
    if (userId && opportunity.company_id) {
      try {
        await supabase.from('activity_log').insert({
          company_id: opportunity.company_id,
          user_id: userId,
          action: 'status_changed',
          entity_type: 'opportunity',
          entity_id: opportunityId,
          details: {
            new_status: status,
            note,
            previous_status: currentOpp?.status
          },
        })
      } catch (err) {
        console.warn('Activity log error:', err)
      }
    }

    return NextResponse.json({
      success: true,
      opportunity: {
        id: opportunity.id,
        status: opportunity.status,
        name: opportunity.name,
      },
    })
  } catch (error) {
    console.error('Error updating opportunity:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseAdmin()
    const opportunityId = params.id

    const { data: opportunity, error } = await supabase
      .from('opportunities')
      .select(`
        *,
        assessments (*),
        documents (*)
      `)
      .eq('id', opportunityId)
      .single()

    if (error) {
      console.error('Supabase error fetching opportunity:', error.message, error.code, error.details)
      return NextResponse.json({ error: 'Opportunity not found', details: error.message }, { status: 404 })
    }

    if (!opportunity) {
      console.error('No opportunity found for id:', opportunityId)
      return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 })
    }

    return NextResponse.json({ opportunity })
  } catch (error) {
    console.error('Error fetching opportunity:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}