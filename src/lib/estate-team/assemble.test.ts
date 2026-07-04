import { describe, it, expect } from 'vitest'
import type { ConstraintsYieldBrief } from '@/lib/estate-buildup/types'
import { requiredOccupations, assembleKickoffTeam } from './assemble'
import type { TeamMember, KickoffContext } from './types'

function brief(overrides: Partial<ConstraintsYieldBrief> = {}): ConstraintsYieldBrief {
  return {
    yield: {
      authoritativeLots: 30, derivedLots: 30, reconciliationNeeded: false,
      unbackedClaimConflict: false, basis: 'derived',
    },
    lines: [],
    gaps: [],
    requiresPlannerReferral: false,
    ...overrides,
  }
}

const WA: KickoffContext = { state: 'WA', typology: 'townhouse' }

describe('requiredOccupations', () => {
  it('always includes core + drive-the-numbers', () => {
    const req = requiredOccupations(brief(), WA)
    const occs = req.map((r) => r.occupation)
    for (const o of ['client', 'f2k', 'planner', 'selling_agent', 'modular_supplier']) {
      expect(occs).toContain(o)
    }
    for (const o of ['civil_engineer', 'surveyor', 'quantity_surveyor', 'valuer', 'funder_broker', 'property_lawyer']) {
      expect(occs).toContain(o)
    }
  })

  it('triggers specialists from formal-required gaps + services', () => {
    const req = requiredOccupations(
      brief({
        gaps: [
          { dimension: 'constraints', label: 'Bushfire — specialist report required', provenance: 'formal-required', detail: '' },
          { dimension: 'constraints', label: 'Earthworks / retaining (slope > 15%)', provenance: 'formal-required', detail: '' },
          { dimension: 'services', label: 'Servicing (sewer/water/power)', provenance: 'needs-input', detail: '' },
        ],
      }),
      WA,
    )
    const occs = req.map((r) => r.occupation)
    expect(occs).toContain('bushfire_consultant')
    expect(occs).toContain('geotech_engineer')
    expect(occs).toContain('servicing_authority')
  })

  it('adds the civil contractor as a party in Civil-JV mode', () => {
    const req = requiredOccupations(brief(), { state: 'WA', civilMode: 'Civil-JV' })
    expect(req.map((r) => r.occupation)).toContain('civil_contractor')
  })

  it('triggers bushfire from a BAL-overlay line even without a formal gap', () => {
    const req = requiredOccupations(
      brief({ lines: [{ key: 'bal', label: 'Bushfire (BAL)', value: 'BAL-29', provenance: 'derived', severity: 'attention' }] }),
      WA,
    )
    expect(req.map((r) => r.occupation)).toContain('bushfire_consultant')
  })
})

describe('assembleKickoffTeam', () => {
  const directory: TeamMember[] = [
    { id: '1', name: 'WA Planner', occupation: 'planner', states: ['WA'] },
    { id: '2', name: 'WA Civil', occupation: 'civil_engineer', states: ['WA'] },
    { id: '3', name: 'Unison (townhouse)', occupation: 'modular_supplier', states: ['WA'], typologies: ['townhouse'] },
    { id: '4', name: 'SA Valuer', occupation: 'valuer', states: ['SA'] },
  ]

  it('nominates matching members and flags missing occupations as gaps', () => {
    const req = requiredOccupations(brief(), WA)
    const { nominations, gaps } = assembleKickoffTeam(req, directory, WA)

    const planner = nominations.find((n) => n.occupation === 'planner')
    expect(planner?.members.map((m) => m.name)).toContain('WA Planner')

    // valuer covers SA only → a WA gap
    expect(gaps.some((g) => g.occupation === 'valuer')).toBe(true)
    // client + f2k are principals, never gaps
    expect(gaps.some((g) => g.occupation === 'client' || g.occupation === 'f2k')).toBe(false)
  })

  it('matches a modular supplier by typology', () => {
    const req = requiredOccupations(brief(), WA) // townhouse
    const { nominations, gaps } = assembleKickoffTeam(req, directory, WA)
    expect(nominations.find((n) => n.occupation === 'modular_supplier')?.members.length).toBe(1)
    expect(gaps.some((g) => g.occupation === 'modular_supplier')).toBe(false)
  })

  it('flags a supplier gap when no supplier serves the typology', () => {
    const req = requiredOccupations(brief(), { state: 'WA', typology: 'multi_storey' })
    const { gaps } = assembleKickoffTeam(req, directory, { state: 'WA', typology: 'multi_storey' })
    expect(gaps.some((g) => g.occupation === 'modular_supplier')).toBe(true)
  })
})
