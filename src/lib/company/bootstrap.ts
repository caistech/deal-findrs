import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { User } from '@supabase/supabase-js'

/**
 * Canonical "ensure this user has a personal company" bootstrap.
 *
 * §8 (TEAM ADMIN) requires signup to auto-create a personal company so the
 * very first authenticated action (running a deal assessment) is not blocked by
 * a missing `company_id`. Previously the company was only created when the user
 * reached /setup and clicked Save — an email-confirmed user who went straight to
 * the deal wizard hit `POST /api/opportunities/draft → 403 (no_company)` and the
 * trial died silently.
 *
 * This function is idempotent: if the user already has a company on their
 * profile it returns that, otherwise it creates the company + default scoring
 * settings + an owner membership + an activity-log entry. Service-role is the
 * legitimate path here — a brand-new user has no company_id yet, so RLS on
 * `companies` would block their own insert. Identity always comes from the
 * verified `user`, never from request headers.
 *
 * Called from:
 *   - POST /api/company/create   (explicit create from signup / setup)
 *   - GET  /auth/callback        (guarantees a company the moment email is confirmed)
 */
export type BootstrapCompanyResult =
  | { ok: true; company: { id: string; name: string; slug: string }; alreadyExisted: boolean }
  | { ok: false; error: string; status: number }

let _admin: SupabaseClient | null = null
function getAdmin(): SupabaseClient {
  if (!_admin) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) throw new Error('Supabase credentials not configured')
    _admin = createClient(url, key)
  }
  return _admin
}

/** Derive a sensible default company name when none was supplied at signup. */
function deriveDefaultName(user: User): string {
  const meta = user.user_metadata || {}
  const first = typeof meta.first_name === 'string' ? meta.first_name.trim() : ''
  const last = typeof meta.last_name === 'string' ? meta.last_name.trim() : ''
  const full = `${first} ${last}`.trim()
  if (full) return `${full}'s Workspace`
  if (user.email) return `${user.email.split('@')[0]}'s Workspace`
  return 'My Workspace'
}

export async function bootstrapCompany(
  user: User,
  opts: { name?: string; abn?: string } = {}
): Promise<BootstrapCompanyResult> {
  const admin = getAdmin()
  const userId = user.id

  // Idempotency: a user finishing /setup after a successful signup-time create
  // must NOT orphan their original company. Return the existing one.
  const { data: existingProfile } = await admin
    .from('profiles')
    .select('company_id')
    .eq('id', userId)
    .single()

  if (existingProfile?.company_id) {
    const { data: existingCompany } = await admin
      .from('companies')
      .select('id, name, slug')
      .eq('id', existingProfile.company_id)
      .single()

    if (existingCompany) {
      return {
        ok: true,
        alreadyExisted: true,
        company: existingCompany as { id: string; name: string; slug: string },
      }
    }
  }

  // No existing company — derive a name from the request, then user_metadata
  // (captured at signup), then a sensible default. We never 400 on a missing
  // name: a nameless dead-end is exactly the §8 failure this function exists to
  // prevent.
  const metaName =
    typeof user.user_metadata?.company_name === 'string'
      ? user.user_metadata.company_name.trim()
      : ''
  const name = (opts.name && opts.name.trim()) || metaName || deriveDefaultName(user)

  const slug =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') +
    '-' +
    Math.random().toString(36).substring(2, 10)

  const { data: company, error: companyError } = await admin
    .from('companies')
    .insert({ name, slug, abn: opts.abn || null })
    .select()
    .single()

  if (companyError || !company) {
    console.error('[bootstrapCompany] company creation error:', companyError?.message)
    return { ok: false, error: 'Failed to create company', status: 500 }
  }

  // Default scoring config for new companies.
  const { error: settingsError } = await admin.from('company_settings').insert({
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
    console.error('[bootstrapCompany] settings creation error:', settingsError.message)
  }

  const { error: profileError } = await admin
    .from('profiles')
    .update({ company_id: company.id, role: 'admin' })
    .eq('id', userId)

  if (profileError) {
    console.error('[bootstrapCompany] profile update error:', profileError.message)
  }

  const { error: membershipError } = await admin.from('company_memberships').insert({
    user_id: userId,
    company_id: company.id,
    role: 'owner',
    is_primary: true,
    can_invite_users: true,
    can_manage_settings: true,
    can_delete_opportunities: true,
  })

  if (membershipError) {
    console.error('[bootstrapCompany] membership creation error:', membershipError.message)
  }

  await admin.from('activity_log').insert({
    company_id: company.id,
    user_id: userId,
    action: 'created',
    entity_type: 'company',
    entity_id: company.id,
    details: { company_name: name },
  })

  return {
    ok: true,
    alreadyExisted: false,
    company: { id: company.id, name: company.name, slug: company.slug },
  }
}
