import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import { requireAuth } from '@/lib/auth/require-auth'

// Service-role client is needed for the cross-table writes here
// (company_invites + activity_log). Identity comes from the verified
// JWT via requireAuth() — never from headers.
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

function generateInviteCode(): string {
  return crypto.randomBytes(16).toString('hex')
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: 401 })
  }
  const userId = auth.user.id

  try {
    const { email, role = 'deal_finder', companyId } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    const validRoles = ['admin', 'promoter', 'deal_finder', 'viewer']
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      )
    }

    const supabaseAdmin = getSupabaseAdmin()

    // Resolve target company: trust the caller's profile, not a client-supplied
    // companyId. We accept companyId as a hint but verify it matches the
    // caller's profile to prevent cross-tenant invite injection.
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('company_id')
      .eq('id', userId)
      .single()

    const targetCompanyId = profile?.company_id

    if (!targetCompanyId) {
      return NextResponse.json(
        { error: 'No company found for this user' },
        { status: 400 }
      )
    }
    if (companyId && companyId !== targetCompanyId) {
      return NextResponse.json(
        { error: 'companyId does not match your profile' },
        { status: 403 }
      )
    }

    // Permission gate
    const { data: membership } = await supabaseAdmin
      .from('company_memberships')
      .select('can_invite_users, role')
      .eq('user_id', userId)
      .eq('company_id', targetCompanyId)
      .single()

    if (!membership?.can_invite_users && membership?.role !== 'owner' && membership?.role !== 'admin') {
      return NextResponse.json(
        { error: 'You do not have permission to invite users' },
        { status: 403 }
      )
    }

    // Reject if already a member
    const { data: existingUser } = await supabaseAdmin
      .from('profiles')
      .select('id, email')
      .eq('company_id', targetCompanyId)
      .eq('email', email)
      .single()

    if (existingUser) {
      return NextResponse.json(
        { error: 'This user is already a member of your organisation' },
        { status: 400 }
      )
    }

    // Supersede any existing pending invites for the same email so the
    // newly-issued code is the only one accepted
    await supabaseAdmin
      .from('company_invites')
      .update({ status: 'revoked' })
      .eq('company_id', targetCompanyId)
      .eq('email', email)
      .eq('status', 'pending')

    const inviteCode = generateInviteCode()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    const { data: invite, error: inviteError } = await supabaseAdmin
      .from('company_invites')
      .insert({
        company_id: targetCompanyId,
        email,
        role,
        invite_code: inviteCode,
        invited_by: userId,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single()

    if (inviteError) {
      console.error('Error creating invite:', inviteError)
      return NextResponse.json(
        { error: 'Failed to create invite' },
        { status: 500 }
      )
    }

    const { data: company } = await supabaseAdmin
      .from('companies')
      .select('name')
      .eq('id', targetCompanyId)
      .single()

    await supabaseAdmin
      .from('activity_log')
      .insert({
        company_id: targetCompanyId,
        user_id: userId,
        action: 'invited',
        entity_type: 'invite',
        entity_id: invite.id,
        details: { email, role },
      })

    // Email delivery happens in a follow-up commit. For now return the
    // invite URL so the caller can hand it over manually.
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/onboarding?code=${inviteCode}`

    return NextResponse.json({
      success: true,
      invite: {
        id: invite.id,
        email,
        role,
        inviteCode,
        inviteUrl,
        expiresAt: expiresAt.toISOString(),
        companyName: company?.name,
      },
    })
  } catch (error) {
    console.error('Error creating invite:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET: List pending invites for the caller's company
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: 401 })
  }
  const userId = auth.user.id

  try {
    const supabaseAdmin = getSupabaseAdmin()

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('company_id')
      .eq('id', userId)
      .single()

    if (!profile?.company_id) {
      return NextResponse.json({ invites: [] })
    }

    const { data: invites, error } = await supabaseAdmin
      .from('company_invites')
      .select(`
        id,
        email,
        role,
        status,
        invite_code,
        created_at,
        expires_at,
        invited_by,
        inviter:profiles!invited_by(first_name, last_name)
      `)
      .eq('company_id', profile.company_id)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching invites:', error)
      return NextResponse.json({ invites: [] })
    }

    return NextResponse.json({ invites })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE: Revoke an invite (callers must own the company that issued it)
export async function DELETE(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: 401 })
  }
  const userId = auth.user.id

  try {
    const { searchParams } = new URL(request.url)
    const inviteId = searchParams.get('id')

    if (!inviteId) {
      return NextResponse.json(
        { error: 'Invite ID required' },
        { status: 400 }
      )
    }

    const supabaseAdmin = getSupabaseAdmin()

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('company_id')
      .eq('id', userId)
      .single()

    if (!profile?.company_id) {
      return NextResponse.json(
        { error: 'No company found for this user' },
        { status: 400 }
      )
    }

    // .eq('company_id', profile.company_id) is the cross-tenant guard:
    // even with a valid inviteId, the row must belong to the caller's company
    // or the update affects zero rows.
    const { error } = await supabaseAdmin
      .from('company_invites')
      .update({ status: 'revoked' })
      .eq('id', inviteId)
      .eq('company_id', profile.company_id)

    if (error) {
      return NextResponse.json(
        { error: 'Failed to revoke invite' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
