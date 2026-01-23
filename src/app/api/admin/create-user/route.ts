import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Admin client with service role key - server-side only
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { email, password, firstName, lastName, companyId } = await request.json()

    // TODO: Add your own auth check here to ensure only admins can call this
    // e.g., verify the requesting user is an admin

    // Create user with auto-confirm (no invite email)
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,  // Skip email verification
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
      }
    })

    if (userError) {
      return NextResponse.json({ error: userError.message }, { status: 400 })
    }

    // Optionally update the profile with company_id
    if (companyId && userData.user) {
      await supabaseAdmin
        .from('profiles')
        .update({ company_id: companyId })
        .eq('id', userData.user.id)
    }

    return NextResponse.json({
      success: true,
      user: userData.user
    })

  } catch (error) {
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
  }
}