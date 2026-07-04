import { describe, it, expect } from 'vitest'
import type { ConstraintsYieldBrief } from '@/lib/estate-buildup/types'
import type { ReviewPackContext } from './types'
import { buildEstateCostPack } from '@/lib/estate-cost/build'
import { qsPack } from './qs'
import { getReviewPackTemplate } from './registry'

const brief: ConstraintsYieldBrief = {
  yield: { authoritativeLots: 30, derivedLots: 30, studyLots: null, developerClaimedLots: null, reconciliationNeeded: false, unbackedClaimConflict: false, basis: 'derived' },
  lines: [], gaps: [], requiresPlannerReferral: false,
}

function ctx(withCost: boolean): ReviewPackContext {
  return {
    opportunity: { id: 'o1', name: 'Riverbend Estate', address: '10 Mill Rd', city: 'Perth', state: 'WA', lga: 'Stirling' },
    brief,
    costPack: withCost ? buildEstateCostPack({ lots: 30, state: 'WA', city: 'Perth', landPerLot: 140000 }) : undefined,
    preparedOn: '2026-07-04',
  }
}

describe('qsPack', () => {
  it('is unavailable without a cost pack, available with one', () => {
    expect(qsPack.available(ctx(false)).ok).toBe(false)
    expect(qsPack.available(ctx(false)).reason).toMatch(/cost buildup/i)
    expect(qsPack.available(ctx(true)).ok).toBe(true)
  })

  it('renders the buildup grouped by category with per-lot summary + certification', () => {
    const md = qsPack.buildMarkdown(ctx(true))
    expect(md).toContain('QS Cost Buildup — Review Pack')
    expect(md).toContain('Riverbend Estate — 10 Mill Rd, Perth')
    expect(md).toContain('Land-development cost per lot')
    expect(md).toContain('### Civil / Infrastructure')
    expect(md).toContain('Roadworks, kerbing & footpaths')
    expect(md).toContain('### Contingency')
    expect(md).toContain('## Certification')
    // land line reflects the operator-supplied price
    expect(md).toContain('Land acquisition per lot')
  })

  it('is wired into the registry as the qs kind', () => {
    expect(getReviewPackTemplate('qs')).toBe(qsPack)
  })
})
