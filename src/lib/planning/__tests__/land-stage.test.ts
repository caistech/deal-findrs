import { describe, it, expect } from 'vitest'
import { landStageOptions, landStageLabel, landApprovalBadgeLabel } from '../land-stage'

describe('state-aware land-stage labels', () => {
  it('uses WAPC subdivision terms for WA', () => {
    const opts = landStageOptions('WA')
    expect(opts.find((o) => o.value === 'da_approved')?.label).toBe('WAPC Subdivision Approved ✓')
    expect(landStageLabel('WA', 'da_approved')).toBe('WAPC Subdivision Approved')
    expect(landApprovalBadgeLabel('WA')).toBe('WAPC Subdivision Approved')
  })

  it('uses Planning Permit for VIC/TAS', () => {
    expect(landApprovalBadgeLabel('VIC')).toBe('Planning Permit Approved')
    expect(landStageLabel('tas', 'da_lodged')).toBe('Planning Permit Lodged')
  })

  it('falls back to generic DA for unmapped states + null', () => {
    expect(landApprovalBadgeLabel('NSW')).toBe('DA Approved')
    expect(landApprovalBadgeLabel(null)).toBe('DA Approved')
    expect(landStageLabel('QLD', 'da_approved')).toBe('DA Approved')
  })

  it('keeps neutral stages state-independent + handles empties', () => {
    expect(landStageLabel('WA', 'raw_land')).toBe('Raw Land')
    expect(landStageLabel('NSW', 'construction_ready')).toBe('Construction Ready')
    expect(landStageLabel('WA', null)).toBe('Unknown stage')
    expect(landStageOptions('WA')).toHaveLength(5)
  })
})
