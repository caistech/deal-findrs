import { describe, it, expect } from 'vitest'
import type { ConstraintsYieldBrief } from '@/lib/estate-buildup/types'
import type { ReviewPackContext } from './types'
import { engineerPack } from './engineer'
import { getReviewPackTemplate, listReviewPacks } from './registry'

function ctx(overrides: Partial<ConstraintsYieldBrief> = {}): ReviewPackContext {
  const brief: ConstraintsYieldBrief = {
    yield: {
      authoritativeLots: 32, derivedLots: 32, studyLots: null, developerClaimedLots: 40,
      reconciliationNeeded: false, unbackedClaimConflict: true, basis: 'derived',
      note: 'Developer anecdotal yield exceeds derived with no feasibility study.',
    },
    lines: [
      { key: 'parcel', label: 'Parcel', value: 'Lot 12 / DP345', provenance: 'derived', dataset: 'property-services lot data' },
      { key: 'zoning', label: 'Zoning', value: 'R25 — Residential', provenance: 'derived', dataset: 'planning dataset' },
      { key: 'minLotSize', label: 'Minimum lot size', value: 300, unit: 'sqm', provenance: 'derived', dataset: 'zoning controls' },
      { key: 'slope', label: 'Slope', value: 18, unit: '%', provenance: 'derived', dataset: 'terrain (LiDAR/DEM)', severity: 'attention', working: 'Buildability: difficult' },
      { key: 'yield', label: 'Yield (lots)', value: 32, provenance: 'derived', dataset: 'subdivision analysis', working: 'net developable ÷ 300 sqm' },
    ],
    gaps: [
      { dimension: 'constraints', label: 'Earthworks / retaining (slope > 15%)', provenance: 'formal-required', detail: 'Civil-engineer hard-stop.' },
      { dimension: 'services', label: 'Servicing (sewer/water/power/stormwater)', provenance: 'needs-input', detail: 'BYDA enquiry.' },
    ],
    requiresPlannerReferral: false,
    ...overrides,
  }
  return {
    opportunity: { id: 'opp1', name: 'Riverbend Estate', address: '10 Mill Rd', city: 'Underwood', state: 'QLD', lga: 'Logan' },
    brief,
    preparedOn: '2026-07-04',
  }
}

describe('engineerPack', () => {
  it('is always available', () => {
    expect(engineerPack.available(ctx()).ok).toBe(true)
  })

  it('renders site header, yield summary, sectioned buildup, gaps and certification', () => {
    const md = engineerPack.buildMarkdown(ctx())
    expect(md).toContain('Engineering Constraints & Yield — Review Pack')
    expect(md).toContain('Riverbend Estate — 10 Mill Rd, Underwood')
    expect(md).toContain('QLD / Logan')
    // yield summary with basis + the unbacked-claim flag
    expect(md).toContain('**Authoritative yield:** 32 lots')
    expect(md).toContain('Unbacked claim')
    // sectioned buildup
    expect(md).toContain('### A. Tenure & title')
    expect(md).toContain('### B. Planning & controls')
    expect(md).toContain('### C. Topography & earthworks')
    // a line carries provenance + source + working
    expect(md).toContain('**⚠ Slope:** 18 % — _derived_ · source: terrain (LiDAR/DEM) · working: Buildability: difficult')
    // gaps split by type
    expect(md).toContain('## Items requiring your determination (⛔ formal)')
    expect(md).toContain('Earthworks / retaining (slope > 15%)')
    expect(md).toContain('## Operator inputs still needed')
    expect(md).toContain('## Certification')
    expect(md).toContain('The derived yield of 32 lots is reasonable')
  })

  it('omits empty sections and a referral block when there is none', () => {
    const md = engineerPack.buildMarkdown(ctx())
    expect(md).not.toContain('### E. Environment & overlays')
    expect(md).not.toContain('Referred to the state planner panel')
  })
})

describe('registry', () => {
  it('resolves known kinds and rejects unknown', () => {
    expect(getReviewPackTemplate('engineer')?.kind).toBe('engineer')
    expect(getReviewPackTemplate('qs')?.kind).toBe('qs')
    expect(getReviewPackTemplate('nope')).toBeNull()
  })

  it('gates QS behind the cost buildup and valuer behind Phase-3 data', () => {
    const c = ctx() // no costPack
    expect(getReviewPackTemplate('qs')!.available(c).ok).toBe(false)
    expect(getReviewPackTemplate('qs')!.available(c).reason).toMatch(/cost buildup/i)
    expect(getReviewPackTemplate('valuer')!.available(c).ok).toBe(false)
    expect(getReviewPackTemplate('valuer')!.available(c).reason).toMatch(/Phase 3/)
  })

  it('lists all three packs in hand-off order', () => {
    expect(listReviewPacks().map((p) => p.kind)).toEqual(['engineer', 'qs', 'valuer'])
  })
})
