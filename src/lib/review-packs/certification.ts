import type { ReviewPackKind } from './types'

/**
 * Estate pack certification — the gate from an indicative (v1) deal-model snapshot to a bankable (v2)
 * one. "v2 = bankable (QS + registered valuation)", so the QS and valuer packs must be certified by
 * their professionals before a bankable snapshot may be saved. The engineer pack is tracked too
 * (constraints certification) but isn't part of the financial bankability gate.
 */

export interface PackCertification {
  kind: ReviewPackKind
  certifiedByName: string
  note?: string | null
  certifiedAt: string
}

/** The certifications that must be present for a BANKABLE (v2) deal-model snapshot. */
export const BANKABLE_REQUIRED: ReviewPackKind[] = ['qs', 'valuer']

/** Which required certifications are still missing given the current set. */
export function missingForBankable(certified: ReviewPackKind[]): ReviewPackKind[] {
  const have = new Set(certified)
  return BANKABLE_REQUIRED.filter((k) => !have.has(k))
}

/** True when every bankable-required pack is certified. */
export function isBankableReady(certified: ReviewPackKind[]): boolean {
  return missingForBankable(certified).length === 0
}
