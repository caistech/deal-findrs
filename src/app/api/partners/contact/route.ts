import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Public partner-enquiry endpoint — no auth required (pre-signup channel enquiry).
// PUBLIC_ROUTES justification: this endpoint accepts inbound form submissions from
// prospective channel partners (buyers' agent firms, property advisories). It carries
// no user data in the response. The service-role key is used server-side only.
//
// Stores to `partner_inquiries` table. If the insert fails we return a 500 — we do
// NOT fake success with a timer or a "received" message when data was dropped.

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

const VALID_CLIENT_RANGES = ['1-5', '6-15', '16-50', '50+'] as const

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const email = typeof body.email === 'string' ? body.email.trim() : ''
  const firm = typeof body.firm === 'string' ? body.firm.trim() : ''
  const clients = typeof body.clients === 'string' ? body.clients.trim() : ''
  const message = typeof body.message === 'string' ? body.message.trim() : ''

  if (!name || !email || !firm || !clients) {
    return NextResponse.json(
      { error: 'name, email, firm, and clients are required' },
      { status: 400 }
    )
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
  }

  if (!(VALID_CLIENT_RANGES as readonly string[]).includes(clients)) {
    return NextResponse.json({ error: 'Invalid client range value' }, { status: 400 })
  }

  try {
    const admin = getAdmin()
    const { error } = await admin.from('partner_inquiries').insert({
      name,
      email,
      firm,
      client_range: clients,
      message: message || null,
      source: 'partners_page',
    } as never)

    if (error) {
      console.error('[partners/contact] insert failed:', error.message)
      return NextResponse.json(
        { error: 'Failed to submit enquiry. Please try again.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[partners/contact] unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
