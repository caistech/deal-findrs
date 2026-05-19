import type { SupabaseClient, User } from '@supabase/supabase-js'

export type CompanyIdResult =
  | { companyId: string; error?: never }
  | { error: 'no_profile' | 'no_company' | 'db_error'; companyId?: never }

/**
 * Resolves the authenticated user's company_id via the profiles table.
 * Pair with requireAuth() — pass the user-scoped supabase client so RLS applies.
 */
export async function getCompanyId(
  supabase: SupabaseClient,
  user: User
): Promise<CompanyIdResult> {
  const { data, error } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (error) return { error: 'db_error' }
  if (!data) return { error: 'no_profile' }
  if (!data.company_id) return { error: 'no_company' }

  return { companyId: data.company_id }
}
