import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/require-admin'

// Admin client with service role key — server-side only.
// Lazy-init so the module does NOT call createClient at import/build time.
// An eager module-scope createClient throws "supabaseUrl is required" during
// `next build` page-data collection when env isn't present (e.g. the portfolio
// gate, which builds without runtime secrets). Create the client on first use.
let _supabaseAdmin: ReturnType<typeof createClient> | null = null
function getSupabaseAdmin() {
  if (!_supabaseAdmin) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) throw new Error('Supabase credentials not configured')
    _supabaseAdmin = createClient(url, key)
  }
  return _supabaseAdmin
}

export async function POST(request: NextRequest) {
  // Defence in depth: the middleware gates the /admin UI, but this route is
  // reachable directly — verify the caller is an allowlisted admin before any
  // privileged operation (creating users with assigned roles).
  const admin = await requireAdmin(request)
  if (admin.error) {
    return NextResponse.json(
      { error: admin.error },
      { status: admin.error === 'forbidden' ? 403 : 401 }
    )
  }

  try {
    const { email, password, firstName, lastName, role, companyId } = await request.json()

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    const supabaseAdmin = getSupabaseAdmin()

    // Create user with auto-confirm (no invite email needed)
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName || '',
        last_name: lastName || '',
      }
    })

    if (userError) {
      return NextResponse.json({ error: userError.message }, { status: 400 })
    }

    // Update the profile with additional fields
    if (userData.user) {
      const updateData: Record<string, unknown> = {}
      if (companyId) updateData.company_id = companyId
      if (role) updateData.role = role

      if (Object.keys(updateData).length > 0) {
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .update(updateData as never)
          .eq('id', userData.user.id)

        if (profileError) {
          console.error('Profile update error:', profileError)
        }
      }
    }

    return NextResponse.json({
      success: true,
      user: {
        id: userData.user?.id,
        email: userData.user?.email,
      },
      message: 'User created successfully. They can now log in with the provided credentials.'
    })

  } catch (error) {
    console.error('Create user error:', error)
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    )
  }
}