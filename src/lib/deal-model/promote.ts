import { createHmac } from 'node:crypto'

/**
 * Send side of the cross-repo promotion (DealFindrs -> F2K-Projects).
 *
 * Signs the raw JSON body with the shared secret and POSTs it to the F2K-Projects promotion
 * receiver. HMAC scheme matches F2K-Projects `src/lib/deal-model/promotion-auth.ts` exactly
 * (sha256 hex, `sha256=` prefix, `x-deal-model-signature` header).
 */
export interface PromotionPayload {
  dealId: string
  snapshotVersion: number
  grade: string
  verdict: 'GO' | 'ADJUST' | 'REJECT'
  developerThin: boolean
  baseRatePerLot: number | null
  netUpliftPct: number | null
  stageUsed: string | null
  snapshot: unknown
  link?: { email?: string; estateName?: string }
}

export function signPromotion(rawBody: string, secret: string): string {
  return 'sha256=' + createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex')
}

export async function sendPromotion(
  payload: PromotionPayload
): Promise<{ ok: true; status: number } | { ok: false; error: string; status?: number }> {
  const secret = process.env.DEAL_MODEL_PROMOTION_SECRET
  const url = process.env.F2K_PROJECTS_PROMOTION_URL
  if (!secret || !url) {
    return { ok: false, error: 'promotion_not_configured' }
  }

  const raw = JSON.stringify(payload)
  const signature = signPromotion(raw, secret)

  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-deal-model-signature': signature },
      body: raw,
    })
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'network_error' }
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    return { ok: false, error: `receiver_${res.status}: ${detail.slice(0, 200)}`, status: res.status }
  }
  return { ok: true, status: res.status }
}
