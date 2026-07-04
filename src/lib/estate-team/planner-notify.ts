import { sendEmail, type SendEmailResult } from '@/lib/email/send'

/**
 * The automated refer-to-planner push (email leg). When a referral is routed/reassigned to a state
 * planner, they get a transactional notification with the site, what needs resolving, and a deep
 * link into DealFindrs. Transactional (a professional notified of work assigned to them), so it
 * carries an identification footer but no marketing unsubscribe. Non-fatal — returns the send result.
 */

export interface PlannerNotifyInput {
  plannerName: string
  plannerEmail: string
  siteLabel: string
  address: string | null
  state: string | null
  /** What the derive couldn't resolve — the finding claims. */
  openItems: string[]
  opportunityId: string
  /** Operator handling the referral — becomes Reply-To. */
  operatorEmail?: string
}

function appBase(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'https://deal-findrs.vercel.app'
}

const IDENTIFICATION = 'Corporate AI Solutions · DealFindrs (Factory2Key estate pipeline)'

export async function notifyPlanner(input: PlannerNotifyInput): Promise<SendEmailResult> {
  const link = `${appBase()}/opportunities/${input.opportunityId}`
  const where = [input.address, input.state].filter(Boolean).join(', ')
  const items = input.openItems.length ? input.openItems : ['Zoning / yield determination']

  const subject = `Planning referral — ${input.siteLabel}${input.state ? ` (${input.state})` : ''}`

  const text = [
    `Hi ${input.plannerName},`,
    ``,
    `You've been assigned a planning referral on DealFindrs${where ? ` for ${where}` : ''}.`,
    `The desktop derive couldn't resolve the following — your determination is needed:`,
    ...items.map((i) => `  • ${i}`),
    ``,
    `Review the KB-cited findings and set the resolution here:`,
    link,
    ``,
    `— ${IDENTIFICATION}`,
  ].join('\n')

  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;font-size:15px;color:#111;line-height:1.5;max-width:560px">
      <p>Hi ${escapeHtml(input.plannerName)},</p>
      <p>You've been assigned a <strong>planning referral</strong> on DealFindrs${where ? ` for <strong>${escapeHtml(where)}</strong>` : ''}.
         The desktop derive couldn't resolve the following — your determination is needed:</p>
      <ul>${items.map((i) => `<li>${escapeHtml(i)}</li>`).join('')}</ul>
      <p><a href="${link}" style="display:inline-block;background:#4f46e5;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">Review &amp; resolve the referral</a></p>
      <p style="color:#6b7280;font-size:13px;margin-top:24px;border-top:1px solid #e5e7eb;padding-top:12px">
        ${escapeHtml(IDENTIFICATION)}
      </p>
    </div>`

  return sendEmail({ to: input.plannerEmail, subject, html, text, replyTo: input.operatorEmail })
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
}
