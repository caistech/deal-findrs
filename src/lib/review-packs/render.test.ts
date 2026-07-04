import { describe, it, expect } from 'vitest'
import type { ConstraintsYieldBrief } from '@/lib/estate-buildup/types'
import type { ReviewPackContext } from './types'
import { engineerPack } from './engineer'
import { qsPack } from './qs'
import { renderReviewPack, reviewPackFilename } from './render'
import { getReviewPackTemplate } from './registry'
import { buildEstateCostPack } from '@/lib/estate-cost/build'

const brief: ConstraintsYieldBrief = {
  yield: { authoritativeLots: 28, derivedLots: 28, studyLots: null, developerClaimedLots: null, reconciliationNeeded: false, unbackedClaimConflict: false, basis: 'derived' },
  lines: [
    { key: 'parcel', label: 'Parcel', value: 'Lot 5 / DP99', provenance: 'derived', dataset: 'lot data' },
    { key: 'zoning', label: 'Zoning', value: 'R30', provenance: 'derived', dataset: 'planning' },
    { key: 'yield', label: 'Yield (lots)', value: 28, provenance: 'derived', dataset: 'subdivision analysis' },
  ],
  gaps: [{ dimension: 'services', label: 'Servicing', provenance: 'needs-input', detail: 'BYDA.' }],
  requiresPlannerReferral: false,
}

const ctx: ReviewPackContext = {
  opportunity: { id: 'o1', name: 'Test Estate', address: '1 Test St', city: 'Perth', state: 'WA', lga: 'Stirling' },
  brief,
  preparedOn: '2026-07-04',
}

describe('renderReviewPack (integration — real report-generator/react-pdf)', () => {
  it('renders the engineer pack to a valid PDF buffer', async () => {
    const result = await renderReviewPack(engineerPack, ctx)
    expect(result.buffer.length).toBeGreaterThan(1000)
    // PDF magic bytes
    expect(result.buffer.subarray(0, 5).toString('latin1')).toBe('%PDF-')
    expect(result.pageCount).toBeGreaterThanOrEqual(1)
  }, 30_000)

  it('renders the QS pack to a valid PDF when a cost pack is present', async () => {
    const withCost = { ...ctx, costPack: buildEstateCostPack({ lots: 30, state: 'WA', city: 'Perth', landPerLot: 140000 }) }
    const result = await renderReviewPack(qsPack, withCost)
    expect(result.buffer.subarray(0, 5).toString('latin1')).toBe('%PDF-')
    expect(result.pageCount).toBeGreaterThanOrEqual(1)
  }, 30_000)

  it('renders the valuer pack to a valid PDF when a valuation pack is present', async () => {
    const { buildValuationPack } = await import('@/lib/estate-valuation/build')
    const withVal = { ...ctx, valuationPack: buildValuationPack({ lots: 30, grvPerLot: 420000, preSalesPercent: 0.3, benchmarkRatePerMonth: 3 }) }
    const result = await renderReviewPack(getReviewPackTemplate('valuer')!, withVal)
    expect(result.buffer.subarray(0, 5).toString('latin1')).toBe('%PDF-')
    expect(result.pageCount).toBeGreaterThanOrEqual(1)
  }, 30_000)

  it('refuses to render a pack whose data source is absent', async () => {
    await expect(renderReviewPack(getReviewPackTemplate('valuer')!, ctx)).rejects.toThrow(/GRV per lot/i)
  })
})

describe('reviewPackFilename', () => {
  it('slugifies the opportunity name', () => {
    expect(reviewPackFilename('engineer', 'Riverbend Estate!')).toBe('riverbend-estate-engineer-review-pack.pdf')
    expect(reviewPackFilename('qs', null)).toBe('estate-qs-review-pack.pdf')
  })
})
