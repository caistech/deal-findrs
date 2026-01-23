import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Admin client with service role key - server-side only
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { email, password, firstName, lastName, role, companyId } = await request.json()

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

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
          .update(updateData)
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