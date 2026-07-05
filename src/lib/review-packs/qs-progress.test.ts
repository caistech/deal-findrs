import { describe, it, expect } from 'vitest'
import { qsProgressPack } from './qs-progress'
import { buildEstateCostPack } from '@/lib/estate-cost/build'
import type { ReviewPackContext } from './types'

const costPack = buildEstateCostPack({ lots: 30, state: 'NSW', city: 'Sydney', landPerLot: 100_000 })
const ctx: ReviewPackContext = {
  opportunity: { id: '1', name: 'Test Estate', address: '1 Test St', city: 'Sydney', state: 'NSW', lga: 'City of Test' },
  brief: {} as unknown as ReviewPackContext['brief'], // qs-progress does not read the brief
  costPack,
  preparedOn: '2026-07-05',
}

describe('qsProgressPack', () => {
  it('is available with a cost pack, not without', () => {
    expect(qsProgressPack.available(ctx).ok).toBe(true)
    expect(qsProgressPack.available({ ...ctx, costPack: undefined }).ok).toBe(false)
  })

  it('renders the progress-claim structure + programme + EXTERNAL certification', () => {
    const md = qsProgressPack.buildMarkdown(ctx)
    expect(md).toContain('Progress claim')
    expect(md).toContain('Programme vs actual')
    expect(md).toContain('Cost to complete')
    expect(md).toContain('Variations register')
    expect(md).toContain('Bank guarantee')
    expect(md).toContain('Funds-to-complete test ⛔')
    expect(md).toContain('Certification ⛔')
    // the actuals are blank fields for the QS, not fabricated
    expect(md).toContain('$________')
  })
})
