/**
 * Minimal, dependency-free email send via the Resend REST API.
 *
 * DealFindrs has no email dependency; rather than add one, this posts directly to Resend. Sender is
 * the verified Resend subdomain (RESEND_FROM_EMAIL → noreply@updates.corporateaisolutions.com — the
 * bare apex is NOT verified). Never throws: returns { ok, error } so callers treat a send failure as
 * a non-fatal side effect (per the webhook/side-effect error-handling convention).
 */

const RESEND_ENDPOINT = 'https://api.resend.com/emails'
const DEFAULT_FROM = 'noreply@updates.corporateaisolutions.com'

export interface SendEmailInput {
  to: string | string[]
  subject: string
  html: string
  text: string
  /** Reply-To (e.g. the operator handling the referral). */
  replyTo?: string
}

export interface SendEmailResult {
  ok: boolean
  id?: string
  error?: string
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return { ok: false, error: 'resend_not_configured' }
  const from = process.env.RESEND_FROM_EMAIL || DEFAULT_FROM

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: `DealFindrs <${from}>`,
        to: Array.isArray(input.to) ? input.to : [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
        ...(input.replyTo ? { reply_to: input.replyTo } : {}),
      }),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      return { ok: false, error: `resend_${res.status}: ${body.slice(0, 200)}` }
    }
    const data = (await res.json().catch(() => ({}))) as { id?: string }
    return { ok: true, id: data.id }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'send_failed' }
  }
}
