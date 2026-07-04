import { createPropertyServices } from '@caistech/property-services-sdk'
import type { AvmCrossCheck } from './types'
import { gateAvmConfidence } from './build'

/**
 * Fetch the independent Domain AVM for the subject site and shape it into a confidence-gated
 * cross-check. Key-optional and never throws: any missing config / notAvailable / error yields an
 * `unavailableReason` so the valuer pack degrades to "indicative — valuer to set" rather than faking.
 *
 * The AVM estimates the subject SITE's current value (≈ land), so `referenceValue` (the site/land
 * acquisition total) is the like-for-like quantity for the divergence signal — NOT the finished-lot GRV.
 */
export async function fetchAvmCrossCheck(params: {
  address: string
  suburb?: string | null
  state?: string | null
  postcode?: string | null
  /** Site/land acquisition value to compare against the AVM mid (signed divergence). */
  referenceValue?: number | null
}): Promise<AvmCrossCheck> {
  const supabaseUrl = process.env.PROPERTY_SERVICES_URL ?? process.env.NEXT_PUBLIC_PROPERTY_SERVICES_URL ?? ''
  const apiKey = process.env.PROPERTY_SERVICES_API_KEY ?? process.env.NEXT_PUBLIC_PROPERTY_SERVICES_API_KEY ?? ''
  const degraded = (reason: string): AvmCrossCheck => ({
    mid: null, lower: null, upper: null, confidence: null, estimateDate: null,
    gate: 'indicative', divergencePct: null, unavailableReason: reason,
  })

  if (!supabaseUrl || !apiKey) return degraded('property-services not configured')
  if (!params.address) return degraded('no address to estimate')

  try {
    const client = createPropertyServices({ supabaseUrl, apiKey })
    const res = await client.comparables({
      address: params.address,
      suburb: params.suburb ?? undefined,
      state: params.state ?? undefined,
      postcode: params.postcode ?? undefined,
    })
    const est = res?.data?.estimate
    if (!res?.success || !est || est.mid == null) {
      return degraded(res?.error || 'no estimate available')
    }

    const divergencePct =
      params.referenceValue != null && params.referenceValue > 0 && est.mid > 0
        ? (params.referenceValue - est.mid) / est.mid
        : null

    return {
      mid: est.mid,
      lower: est.lower,
      upper: est.upper,
      confidence: est.confidence,
      estimateDate: est.estimateDate,
      gate: gateAvmConfidence(est.confidence),
      divergencePct,
    }
  } catch (err) {
    return degraded(err instanceof Error ? err.message : 'avm fetch failed')
  }
}
