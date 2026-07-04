import { describe, it, expect } from 'vitest'
import type { PropertyProfile } from '@/lib/property-services'
import { buildConstraintsYield } from './build'

/** A resolved WA-style profile (zoning + subdivision analysis present). */
function resolvedProfile(overrides: Partial<PropertyProfile> = {}): PropertyProfile {
  return {
    address: {
      full: '1 Test St, Suburb WA 6000', streetNumber: '1', streetName: 'Test St',
      suburb: 'Suburb', state: 'WA', postcode: '6000', lat: -32, lng: 115,
    },
    lot: { lotSize: 12540, lotNumber: '12', planNumber: 'DP123', parcelId: 'P1' },
    zoning: {
      code: 'R25', name: 'Residential R25', description: null, minimumLotSize: 350,
      maximumHeight: 9, maximumHeightStoreys: 2,
      setbacks: { front: 6, side: 1.5, rear: 6, notes: null },
      permittedUses: ['dwelling', 'grouped dwelling'], subdivisionPermitted: true, modularProvisions: null,
    },
    environment: {
      windRegion: 'A', windSpeed: 41, climateZone: '5', climateZoneNumber: 5,
      climateDescription: 'Warm temperate', bal: 'BAL-12.5', balInOverlay: false,
    },
    terrain: { elevationM: 30, slopePercent: 6, fallMeters: 2, buildability: 'good', source: 'DEM' },
    overlays: [],
    subdivision: {
      torrens: { feasible: true, maxLots: 30, minLotSize: 350, lotSizeEach: 380 },
      strata: { feasible: false, minLotSize: null, notes: '' },
      recommendations: [], warnings: [],
    },
    summary: 'ok',
    metadata: {
      sourceApis: ['landgate'], lgaCode: 'X', lgaName: 'City of Test', lgaCoverage: 'full',
      cached: false, derivedAt: '2026-07-04', expiresAt: '2026-08-04',
    },
    ...overrides,
  }
}

describe('estate constraints & yield buildup', () => {
  it('uses DERIVED yield as authoritative when zoning + subdivision resolve', () => {
    const brief = buildConstraintsYield(resolvedProfile())
    expect(brief.yield.basis).toBe('derived')
    expect(brief.yield.authoritativeLots).toBe(30)
    expect(brief.requiresPlannerReferral).toBe(false)
    const yieldLine = brief.lines.find((l) => l.key === 'yield')
    expect(yieldLine?.provenance).toBe('derived')
    expect(yieldLine?.working).toMatch(/min lot size/i)
  })

  it('does NOT treat a developer anecdotal number as authoritative', () => {
    // developer claims 45, derived is 30 → derived wins, and it flags an unbacked conflict
    const brief = buildConstraintsYield(resolvedProfile(), { developerClaimedLots: 45 })
    expect(brief.yield.authoritativeLots).toBe(30)
    expect(brief.yield.unbackedClaimConflict).toBe(true)
    expect(brief.yield.note).toMatch(/pass unless/i)
  })

  it('flags a feasibility-study yield that differs materially → review', () => {
    const brief = buildConstraintsYield(resolvedProfile(), { feasibilityStudyLots: 40 })
    expect(brief.yield.authoritativeLots).toBe(30) // derived stays authoritative pending review
    expect(brief.yield.reconciliationNeeded).toBe(true)
    expect(brief.yield.note).toMatch(/review discrepancies/i)
  })

  it('does not flag a study number within tolerance', () => {
    const brief = buildConstraintsYield(resolvedProfile(), { feasibilityStudyLots: 32 })
    expect(brief.yield.reconciliationNeeded).toBe(false)
  })

  it('requires a PLANNER REFERRAL when zoning is unresolved (QLD-style)', () => {
    const brief = buildConstraintsYield(
      resolvedProfile({
        zoning: null,
        subdivision: null,
        metadata: {
          sourceApis: [], lgaCode: null, lgaName: 'Logan City', lgaCoverage: 'partial',
          cached: false, derivedAt: '2026-07-04', expiresAt: '2026-08-04',
          zoningManualLookup: { source: 'Logan Planning Scheme', url: 'https://x', instructions: 'look up' },
        },
      }),
    )
    expect(brief.requiresPlannerReferral).toBe(true)
    expect(brief.yield.basis).toBe('un-derivable')
    expect(brief.yield.authoritativeLots).toBeNull()
    expect(brief.gaps.some((g) => g.dimension === 'zoning_use' && g.provenance === 'planner-referral')).toBe(true)
    expect(brief.gaps.some((g) => g.dimension === 'density_yield' && g.provenance === 'planner-referral')).toBe(true)
  })

  it('clears the referral when a planner resolves the zone + yield', () => {
    const nullZoned = resolvedProfile({ zoning: null, subdivision: null })
    const brief = buildConstraintsYield(nullZoned, {
      operatorResolved: { zoneCode: 'Emerging Community', minLotSize: 400, lots: 24 },
    })
    expect(brief.requiresPlannerReferral).toBe(false)
    expect(brief.yield.basis).toBe('operator-resolved')
    expect(brief.yield.authoritativeLots).toBe(24)
    expect(brief.gaps.some((g) => g.dimension === 'zoning_use')).toBe(false)
    const zoningLine = brief.lines.find((l) => l.key === 'zoning')
    expect(zoningLine?.provenance).toBe('operator-resolved')
  })

  it('raises a formal-required gap for an overlay needing a specialist report', () => {
    const brief = buildConstraintsYield(
      resolvedProfile({
        overlays: [{ type: 'flood', name: 'Flood Overlay', requirements: ['flood study'], requiresReport: true }],
      }),
    )
    expect(brief.gaps.some((g) => g.provenance === 'formal-required' && /Flood/.test(g.label))).toBe(true)
  })

  it('flags steep slope as an earthworks hard-stop', () => {
    const brief = buildConstraintsYield(
      resolvedProfile({ terrain: { elevationM: 40, slopePercent: 22, fallMeters: 8, buildability: 'difficult', source: 'DEM' } }),
    )
    expect(brief.gaps.some((g) => g.provenance === 'formal-required' && /Earthworks/.test(g.label))).toBe(true)
  })
})
