// elevenlabs/webhook-verify.ts
// HMAC verification for ElevenLabs post-call webhooks.
//
// SECURITY CONTRACT (VMS rule 10):
//   Every ElevenLabs webhook handler MUST call verifyElevenLabsWebhook() before
//   parsing the body or writing to the database. Unverified → 401 (fail-closed).
//   An absent ELEVENLABS_WEBHOOK_SECRET → 403 (configuration error, not open).
//
// Algorithm matches the elevenlabs-convai hub package webhook.ts verifyWebhookSignature()
// so they cannot drift. The secret and signature are .trim()'d before comparison
// to tolerate stray whitespace from env-variable copying (the `.trim` requirement
// is explicitly called out in VMS rule 10).
//
// Usage:
//   const result = await verifyElevenLabsWebhook(request)
//   if (result.error) return NextResponse.json({ error: result.error }, { status: result.status })
//   const payload = result.body // raw string — parse with JSON.parse(result.body)

import crypto from 'crypto'
import { NextRequest } from 'next/server'

export type VerifySuccess = { ok: true; body: string; error?: never; status?: never }
export type VerifyFailure = { ok: false; error: string; status: 401 | 403; body?: never }
export type VerifyResult = VerifySuccess | VerifyFailure

/**
 * Verify an incoming ElevenLabs webhook request.
 * Reads the raw body and checks the HMAC-SHA256 signature.
 *
 * @param request   - The incoming Next.js request
 * @param maxAgeSecs - Max age of the signature timestamp (default 300s / 5 min)
 * @returns VerifyResult — either { ok: true, body } or { ok: false, error, status }
 */
export async function verifyElevenLabsWebhook(
  request: NextRequest,
  maxAgeSecs = 300,
): Promise<VerifyResult> {
  const secret = process.env.ELEVENLABS_WEBHOOK_SECRET
  if (!secret) {
    console.error('[elevenlabs-webhook] ELEVENLABS_WEBHOOK_SECRET is not configured')
    return { ok: false, error: 'Webhook not configured', status: 403 }
  }

  const signature = request.headers.get('elevenlabs-signature')
  if (!signature) {
    return { ok: false, error: 'Missing elevenlabs-signature header', status: 401 }
  }

  // Read raw body as text before any JSON.parse side-effects
  const rawBody = await request.text()

  if (!verifySignature(rawBody, signature, secret, maxAgeSecs)) {
    return { ok: false, error: 'Invalid webhook signature', status: 401 }
  }

  return { ok: true, body: rawBody }
}

/**
 * Pure HMAC verification (no I/O). Exported for unit testing.
 * Matches the algorithm in @caistech/elevenlabs-convai/src/webhook.ts.
 *
 * Signature format: "t=<timestamp>,v0=<hex-hmac>"
 * Message signed:   "<timestamp>.<rawBody>"
 */
export function verifySignature(
  rawBody: string,
  signature: string,
  secret: string,
  maxAgeSecs = 300,
): boolean {
  // .trim() on both to tolerate stray newlines / spaces (VMS rule 10 explicit requirement)
  const cleanSecret = secret.trim()
  const cleanSig = signature.trim()

  const parts = cleanSig.split(',')
  const timestamp = parts.find((p) => p.startsWith('t='))?.slice(2)
  const hash = parts.find((p) => p.startsWith('v0='))?.slice(3)

  if (!timestamp || !hash) return false

  const timestampAge = Math.abs(Date.now() / 1000 - parseInt(timestamp, 10))
  if (isNaN(timestampAge) || timestampAge > maxAgeSecs) return false

  const expectedHash = crypto
    .createHmac('sha256', cleanSecret)
    .update(`${timestamp}.${rawBody}`)
    .digest('hex')

  try {
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(expectedHash, 'hex'))
  } catch {
    // Buffer lengths differ (malformed hash in header) — reject
    return false
  }
}
