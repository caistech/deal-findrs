import { NextResponse } from 'next/server'

// Public health check endpoint — listed in PUBLIC_ROUTES as it carries no user data.
// Used by CI smoke tests and monitoring.
export async function GET() {
  return NextResponse.json({ status: 'ok', product: 'deal-findrs' })
}
