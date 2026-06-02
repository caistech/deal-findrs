import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Public contact submission endpoint — no auth required (visitor enquiry).
// Stores the submission in the `contact_inquiries` table using the service-role
// key. If the table does not yet exist, the error is logged server-side and the
// request still returns 200 so the user is not left stranded — but we do NOT
// fake success: if the insert genuinely fails we return a 500.
//
// Justification for public access: this endpoint carries no user data in the
// response and is listed in the public-route allowlist. The service-role key is
// used server-side only (never returned to the client).

let _client: ReturnType<typeof createClient> | null = null
function getAdmin() {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) throw new Error('Supabase credentials not configured')
    _client = createClient(url, key)
  }
  return _client
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const email = typeof body.email === 'string' ? body.email.trim() : ''
  const message = typeof body.message === 'string' ? body.message.trim() : ''

  if (!name || !email || !message) {
    return NextResponse.json(
      { error: 'name, email, and message are required' },
      { status: 400 }
    )
  }

  // Basic email shape check — not a full RFC 5322 parse, just catches typos
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
  }

  try {
    const admin = getAdmin()
    const { error } = await admin.from('contact_inquiries').insert({
      name,
      email,
      message,
      source: 'landing_page',
    } as never)

    if (error) {
      console.error('[contact] insert failed:', error.message)
      return NextResponse.json({ error: 'Failed to submit enquiry. Please try again.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[contact] unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
