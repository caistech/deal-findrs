import { describe, it, expect } from 'vitest'
import type { ConstraintsYieldBrief } from '@/lib/estate-buildup/types'
import type { AvmCrossCheck } from '@/lib/estate-valuation/types'
import type { ReviewPackContext } from './types'
import { buildValuationPack } from '@/lib/estate-valuation/build'
import { valuerPack } from './valuer'
import { getReviewPackTemplate } from './registry'

const brief: ConstraintsYieldBrief = {
  yield: { authoritativeLots: 30, derivedLots: 30, studyLots: null, developerClaimedLots: null, reconciliationNeeded: false, unbackedClaimConflict: false, basis: 'derived' },
  lines: [], gaps: [], requiresPlannerReferral: false,
}

function ctx(opts: { grv?: number; preSales?: number; avm?: AvmCrossCheck | null } = {}): ReviewPackContext {
  const grv = opts.grv ?? 420000
  const pack = grv > 0 ? buildValuationPack({ lots: 30, grvPerLot: grv, preSalesPercent: opts.preSales ?? 0, benchmarkRatePerMonth: 3 }) : undefined
  if (pack && 'avm' in opts) pack.avm = opts.avm ?? null
  return {
    opportunity: { id: 'o1', name: 'Riverbend Estate', address: '10 Mill Rd', city: 'Perth', state: 'WA', lga: 'Stirling' },
    brief,
    valuationPack: pack,
    preparedOn: '2026-07-04',
  }
}

describe('valuerPack', () => {
  it('is unavailable without a GRV, available with one', () => {
    expect(valuerPack.available(ctx({ grv: 0 })).ok).toBe(false)
    expect(valuerPack.available(ctx({ grv: 0 })).reason).toMatch(/GRV per lot/i)
    expect(valuerPack.available(ctx()).ok).toBe(true)
  })

  it('renders GRV, a benchmark-only absorption profile, and certification', () => {
    const md = valuerPack.buildMarkdown(ctx({ preSales: 0 }))
    expect(md).toContain('GRV & Absorption — Review Pack')
    expect(md).toContain('GRV per lot')
    expect(md).toContain('No pre-sales evidence — benchmark absorption only')
    expect(md).toContain('Monthly take-up')
    expect(md).toContain('## Certification')
  })

  it('shows the two-phase profile when pre-sales are present', () => {
    const md = valuerPack.buildMarkdown(ctx({ preSales: 0.5 }))
    expect(md).toContain('pre-sold lots')
  })

  it('asserts the AVM when confident and degrades when unavailable', () => {
    const withAvm = valuerPack.buildMarkdown(
      ctx({ avm: { mid: 3000000, lower: 2800000, upper: 3200000, confidence: 'confident', estimateDate: '2026-06', gate: 'assert', divergencePct: 0.1, comparables: [], stats: null } }),
    )
    expect(withAvm).toContain('AVM mid')
    expect(withAvm).toContain('asserted')

    const noAvm = valuerPack.buildMarkdown(
      ctx({ avm: { mid: null, lower: null, upper: null, confidence: null, estimateDate: null, gate: 'indicative', divergencePct: null, comparables: [], stats: null, unavailableReason: 'property-services not configured' } }),
    )
    expect(noAvm).toContain('Unavailable')
    expect(noAvm).toContain('property-services not configured')
  })

  it('is wired into the registry as the valuer kind', () => {
    expect(getReviewPackTemplate('valuer')).toBe(valuerPack)
  })
})
