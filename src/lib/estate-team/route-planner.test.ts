import { describe, it, expect } from 'vitest'
import type { TeamMember } from './types'
import { matchStatePlanners, routePlanner, plannerLabel } from './route-planner'

function member(overrides: Partial<TeamMember> = {}): TeamMember {
  return {
    id: crypto.randomUUID(),
    name: 'Jane Planner',
    occupation: 'planner',
    states: ['WA'],
    active: true,
    ...overrides,
  }
}

describe('matchStatePlanners', () => {
  it('matches active planners covering the state (case-insensitive)', () => {
    const dir = [member({ name: 'A', states: ['wa'] }), member({ name: 'B', states: ['SA'] })]
    const hits = matchStatePlanners(dir, 'WA')
    expect(hits.map((m) => m.name)).toEqual(['A'])
  })

  it('excludes non-planner occupations even if they cover the state', () => {
    const dir = [member({ occupation: 'civil_engineer', states: ['WA'] }), member({ name: 'P', states: ['WA'] })]
    expect(matchStatePlanners(dir, 'WA').map((m) => m.name)).toEqual(['P'])
  })

  it('excludes inactive planners', () => {
    const dir = [member({ name: 'Inactive', active: false }), member({ name: 'Active' })]
    expect(matchStatePlanners(dir, 'WA').map((m) => m.name)).toEqual(['Active'])
  })

  it('matches a multi-state planner', () => {
    const dir = [member({ name: 'Multi', states: ['WA', 'SA', 'NT'] })]
    expect(matchStatePlanners(dir, 'SA').map((m) => m.name)).toEqual(['Multi'])
  })

  it('returns [] for a null/empty state', () => {
    const dir = [member()]
    expect(matchStatePlanners(dir, null)).toEqual([])
    expect(matchStatePlanners(dir, '')).toEqual([])
  })
})

describe('routePlanner', () => {
  it('assigns the first matching planner and lists all candidates', () => {
    const dir = [member({ name: 'First' }), member({ name: 'Second' })]
    const route = routePlanner(dir, 'WA')
    expect(route.assigned?.name).toBe('First')
    expect(route.candidates.map((m) => m.name)).toEqual(['First', 'Second'])
    expect(route.gap).toBe(false)
  })

  it('flags a gap when no planner covers the state', () => {
    const dir = [member({ states: ['SA'] })]
    const route = routePlanner(dir, 'WA')
    expect(route.assigned).toBeNull()
    expect(route.candidates).toEqual([])
    expect(route.gap).toBe(true)
  })
})

describe('plannerLabel', () => {
  it('appends the firm when present', () => {
    expect(plannerLabel({ name: 'Jane', firm: 'Acme Planning' })).toBe('Jane (Acme Planning)')
    expect(plannerLabel({ name: 'Jane', firm: null })).toBe('Jane')
  })
})
