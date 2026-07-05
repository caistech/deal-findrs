import { createPropertyServices, type PriceComparison } from '@caistech/property-services-sdk'
import type { AvmCrossCheck } from './types'
import { gateAvmConfidence } from './build'

/** A persisted AVM snapshot — the full Domain PriceComparison plus when it was fetched. Stored in
 *  `opportunities.avm_snapshot` so the valuer pack can reuse a recent estimate instead of re-calling
 *  the Domain comparables API (a paid call) on every render. */
export interface AvmSnapshot {
  comparison: PriceComparison
  /** ISO timestamp of when the comparison was fetched from property-services. */
  fetchedAt: string
}

const AVM_SNAPSHOT_MAX_AGE_DAYS = 30

/** True when a persisted snapshot is present and younger than `maxAgeDays` (default 30) — so the
 *  caller can shape it into a cross-check without re-calling the Domain comparables API. */
export function isAvmSnapshotFresh(
  snap: AvmSnapshot | null | undefined,
  maxAgeDays = AVM_SNAPSHOT_MAX_AGE_DAYS,
): snap is AvmSnapshot {
  if (!snap?.fetchedAt || !snap.comparison) return false
  const ts = Date.parse(snap.fetchedAt)
  if (Number.isNaN(ts)) return false
  return Date.now() - ts < maxAgeDays * 24 * 60 * 60 * 1000
}

/**
 * Shape a Domain PriceComparison into the confidence-gated AVM cross-check.
 *
 * Pure. The AVM estimates the subject SITE's current value (≈ land), so `referenceValue` (the
 * site/land acquisition total) is the like-for-like quantity for the divergence signal — NOT the
 * finished-lot GRV. Divergence is recomputed here (never stored) so it stays correct even when the
 * reference/land price changes between renders. Missing/estimate-less comparisons degrade to
 * "indicative — valuer to set" rather than faking.
 */
export function shapeAvmCrossCheck(
  comparison: PriceComparison | null,
  referenceValue?: number | null,
  fallbackReason?: string,
): AvmCrossCheck {
  const degraded = (reason: string): AvmCrossCheck => ({
    mid: null, lower: null, upper: null, confidence: null, estimateDate: null,
    gate: 'indicative', divergencePct: null, comparables: [], stats: null, unavailableReason: reason,
  })

  const est = comparison?.estimate
  if (!est || est.mid == null) {
    return degraded(fallbackReason ?? comparison?.unavailableReason ?? 'no estimate available')
  }

  const divergencePct =
    referenceValue != null && referenceValue > 0 && est.mid > 0
      ? (referenceValue - est.mid) / est.mid
      : null

  // Carry the sold comparables + aggregate stats the comparison holds — the evidence behind the
  // estimate, so the valuer pack can show the comps, not just the point number. `stats` come from
  // the SDK when present; else a count-only fallback when there are bare comparables.
  const comparables = comparison?.comparables ?? []
  const stats = comparison?.stats
    ? {
        median: comparison.stats.median,
        medianPricePerSqm: comparison.stats.medianPricePerSqm,
        count: comparison.stats.count,
      }
    : comparables.length
      ? { median: null, medianPricePerSqm: null, count: comparables.length }
      : null

  return {
    mid: est.mid,
    lower: est.lower,
    upper: est.upper,
    confidence: est.confidence,
    estimateDate: est.estimateDate,
    gate: gateAvmConfidence(est.confidence),
    divergencePct,
    comparables,
    stats,
  }
}

/**
 * Fetch the raw Domain PriceComparison for the subject site (the persistable payload). Key-optional
 * and never throws: any missing config / error / timeout returns `{ comparison: null, unavailableReason }`
 * so the caller can degrade the pack rather than faking. Returns the FULL comparison (estimate +
 * comparables[] + stats) so it can be snapshotted and reused within the freshness window.
 */
export async function fetchAvmComparison(params: {
  address: string
  suburb?: string | null
  state?: string | null
  postcode?: string | null
}): Promise<{ comparison: PriceComparison | null; unavailableReason?: string }> {
  const supabaseUrl = process.env.PROPERTY_SERVICES_URL ?? process.env.NEXT_PUBLIC_PROPERTY_SERVICES_URL ?? ''
  const apiKey = process.env.PROPERTY_SERVICES_API_KEY ?? process.env.NEXT_PUBLIC_PROPERTY_SERVICES_API_KEY ?? ''

  if (!supabaseUrl || !apiKey) return { comparison: null, unavailableReason: 'property-services not configured' }
  if (!params.address) return { comparison: null, unavailableReason: 'no address to estimate' }

  try {
    const client = createPropertyServices({ supabaseUrl, apiKey })
    const res = await client.comparables({
      address: params.address,
      suburb: params.suburb ?? undefined,
      state: params.state ?? undefined,
      postcode: params.postcode ?? undefined,
    })
    if (!res?.success || !res.data) {
      return { comparison: null, unavailableReason: res?.error || 'no estimate available' }
    }
    return { comparison: res.data }
  } catch (err) {
    return { comparison: null, unavailableReason: err instanceof Error ? err.message : 'avm fetch failed' }
  }
}

/**
 * Fetch the independent Domain AVM for the subject site and shape it into a confidence-gated
 * cross-check. Key-optional and never throws (see {@link fetchAvmComparison} + {@link shapeAvmCrossCheck}).
 * Kept for callers that want a one-shot fetch-and-shape without snapshot persistence; the review-pack
 * route uses the snapshot-aware path (fetch comparison → persist → shape) directly.
 */
export async function fetchAvmCrossCheck(params: {
  address: string
  suburb?: string | null
  state?: string | null
  postcode?: string | null
  /** Site/land acquisition value to compare against the AVM mid (signed divergence). */
  referenceValue?: number | null
}): Promise<AvmCrossCheck> {
  const { comparison, unavailableReason } = await fetchAvmComparison(params)
  return shapeAvmCrossCheck(comparison, params.referenceValue, unavailableReason)
}
