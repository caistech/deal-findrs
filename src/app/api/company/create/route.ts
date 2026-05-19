import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { requireAuth } from '@/lib/auth/require-auth'

// Service-role client for the bootstrap writes (company row, settings,
// membership, activity log). The user has no company_id yet, so RLS on
// the companies table would block their own insert — service role is the
// legitimate path. Identity comes from the verified JWT, not from headers.
let _supabaseAdmin: SupabaseClient | null = null

function getSupabaseAdmin(): SupabaseClient {
  if (!_supabaseAdmin) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) {
      throw new Error('Supabase credentials not configured')
    }
    _supabaseAdmin = createClient(url, key)
  }
  return _supabaseAdmin
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: 401 })
  }
  const userId = auth.user.id

  try {
    // Parse the body defensively — /setup calls this with no body to rely
    // on the user_metadata fallback below.
    const body = await request.json().catch(() => ({} as Record<string, unknown>))
    const requestedName = typeof body.name === 'string' ? body.name : undefined
    const requestedAbn = typeof body.abn === 'string' ? body.abn : undefined

    const supabaseAdmin = getSupabaseAdmin()

    // Idempotency: if the user already has a company_id on their profile,
    // return that company instead of creating a duplicate. The signup page
    // and /setup both call this route; without this check, a user finishing
    // /setup after a successful signup-time create would orphan their
    // original company and replace their membership.
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('company_id')
      .eq('id', userId)
      .single()

    if (existingProfile?.company_id) {
      const { data: existingCompany } = await supabaseAdmin
        .from('companies')
        .select('id, name, slug')
        .eq('id', existingProfile.company_id)
        .single()

      if (existingCompany) {
        return NextResponse.json({
          success: true,
          alreadyExisted: true,
          company: existingCompany,
        })
      }
    }

    // No existing company — derive a name from the request body OR fall
    // back to user_metadata.company_name (captured at signup). This lets
    // /setup call us with no body and still get a useful create.
    const metaName =
      typeof auth.user.user_metadata?.company_name === 'string'
        ? auth.user.user_metadata.company_name
        : undefined
    const name = requestedName || metaName
    const abn = requestedAbn

    if (!name) {
      return NextResponse.json(
        { error: 'Company name is required (none in request body, none in user_metadata).' },
        { status: 400 }
      )
    }

    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') +
      '-' +
      Math.random().toString(36).substring(2, 10)

    const { data: company, error: companyError } = await supabaseAdmin
      .from('companies')
      .insert({
        name,
        slug,
        abn: abn || null,
      })
      .select()
      .single()

    if (companyError) {
      console.error('Company creation error:', companyError)
      return NextResponse.json(
        { error: 'Failed to create company' },
        { status: 500 }
      )
    }

    // Default scoring config for new companies
    const { error: settingsError } = await supabaseAdmin
      .from('company_settings')
      .insert({
        company_id: company.id,
        min_gm_green: 25,
        min_gm_amber: 18,
        derisk_factors: [
          { key: 'da_approved', label: 'DA Approved', points: 15, enabled: true },
          { key: 'vendor_finance', label: 'Vendor Finance Available', points: 10, enabled: true },
          { key: 'fixed_price_construction', label: 'Fixed-Price Construction', points: 10, enabled: true },
          { key: 'pre_sales_secured', label: 'Pre-Sales 50%+ Secured', points: 10, enabled: true },
          { key: 'experienced_pm', label: 'Experienced PM Available', points: 5, enabled: true },
          { key: 'clear_title', label: 'Clear Title', points: 5, enabled: true },
          { key: 'growth_corridor', label: 'Growth Corridor Location', points: 5, enabled: true },
        ],
        risk_factors: [
          { key: 'previous_disputes', label: 'Previous Legal Disputes', points: -5, enabled: true },
          { key: 'needs_rezoning', label: 'Requires Rezoning', points: -10, enabled: true },
          { key: 'no_pre_sales', label: 'No Pre-Sales Strategy', points: -5, enabled: true },
          { key: 'environmental_issues', label: 'Environmental Concerns', points: -10, enabled: true },
          { key: 'heritage_overlay', label: 'Heritage Overlay', points: -5, enabled: true },
        ],
      })

    if (settingsError) {
      // Non-fatal: company exists, settings can be re-derived from /setup.
      // Surfacing the failure here would orphan an otherwise-good company.
      console.error('Settings creation error:', settingsError)
    }

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        company_id: company.id,
        role: 'admin',
      })
      .eq('id', userId)

    if (profileError) {
      console.error('Profile update error:', profileError)
    }

    const { error: membershipError } = await supabaseAdmin
      .from('company_memberships')
      .insert({
        user_id: userId,
        company_id: company.id,
        role: 'owner',
        is_primary: true,
        can_invite_users: true,
        can_manage_settings: true,
        can_delete_opportunities: true,
      })

    if (membershipError) {
      console.error('Membership creation error:', membershipError)
    }

    await supabaseAdmin
      .from('activity_log')
      .insert({
        company_id: company.id,
        user_id: userId,
        action: 'created',
        entity_type: 'company',
        entity_id: company.id,
        details: { company_name: name },
      })

    return NextResponse.json({
      success: true,
      company: {
        id: company.id,
        name: company.name,
        slug: company.slug,
      },
    })
  } catch (error) {
    console.error('Error creating company:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'POST to create a company',
    required: ['name'],
    optional: ['abn'],
  })
}
