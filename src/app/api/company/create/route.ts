import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/require-auth'
import { bootstrapCompany } from '@/lib/company/bootstrap'

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: 401 })
  }

  try {
    // Parse the body defensively — /setup calls this with no body to rely
    // on the user_metadata / default-name fallback inside bootstrapCompany.
    const body = await request.json().catch(() => ({} as Record<string, unknown>))
    const requestedName = typeof body.name === 'string' ? body.name : undefined
    const requestedAbn = typeof body.abn === 'string' ? body.abn : undefined

    const result = await bootstrapCompany(auth.user, {
      name: requestedName,
      abn: requestedAbn,
    })

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    return NextResponse.json({
      success: true,
      alreadyExisted: result.alreadyExisted,
      company: result.company,
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
