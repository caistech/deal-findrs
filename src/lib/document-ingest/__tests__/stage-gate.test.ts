import { describe, it, expect } from 'vitest'
import { stageGateFromApproval, mergeStageGates, deriveLifecycleStatus, outstandingGates, assignStage } from '../stage-gate'
import { emptyStageGate } from '@caistech/deal-model'
import type { ExtractedApproval } from '../types'

/** Seafields (WAPC 202888) as it comes off the decision letter + modified plan. */
const seafields: ExtractedApproval = {
  wapcRef: '202888',
  approvalDate: '2026-05-04',
  validUntil: '2030-05-04',
  lga: 'City of Greater Geraldton',
  parentParcels: 'Lots 81, 82, 9001 & 9005 Pepper Gate Waggrakine',
  planReferences: 'Plan 5709, Plan 60113, Plan 403491',
  titleReferences: '149/139A, 2706/734, 1896/424, 2875/490',
  residentialLots: 145,
  minLotSizeSqm: 445,
  avgLotSizeSqm: 610,
  maxLotSizeSqm: 1522,
  netDevelopableHa: 8.8356,
  parentAreaHa: 12.7724,
  posSqm: 8909,
  conditions: [
    { number: 13, text: 'Underground power to each lot', authority: 'Western Power', category: 'servicing' },
    { number: 15, text: 'Water supply to each lot', authority: 'Water Corporation', category: 'servicing' },
    { number: 7, text: 'Pre-works geotechnical report', authority: 'City of Greater Geraldton', category: 'constraint' },
    { number: 20, text: 'Education contribution 1/1500th per lot', authority: 'Department of Education', category: 'statutory' },
  ],
}

describe('stageGateFromApproval', () => {
  const gate = stageGateFromApproval(seafields)

  it('ticks the approval ladder up to subdivision approved', () => {
    expect(gate.subdivisionApplicationLodged).toBe(true)
    expect(gate.conditionalApproval).toBe(true)
    expect(gate.subdivisionApprovalGranted).toBe(true)
    expect(gate.structurePlanApproved).toBe(true)
  })

  it('ticks servicing strategy from the conditioned power/water/sewer', () => {
    expect(gate.servicingStrategyPrepared).toBe(true)
  })

  it('does NOT tick conditions-cleared, civil, geotech, titles, or funding (no evidence)', () => {
    expect(gate.conditionsSubstantiallyCleared).toBe(false)
    expect(gate.civilFeasibility).toBe(false)
    expect(gate.geotech).toBe(false)
    expect(gate.titlesIssuedOrImminent).toBe(false)
    expect(gate.fundingArranged).toBe(false)
  })
})

describe('derived status', () => {
  const gate = stageGateFromApproval(seafields)

  it('lifecycle status = subdivision approved (finer than the deal-model stage)', () => {
    expect(deriveLifecycleStatus(gate).status).toBe('subdivision_approved')
  })

  it('deal-model stage stays Conception — approval alone is not de-risked (conditions/civil pending)', () => {
    // De-risked needs conditionsSubstantiallyCleared && civilFeasibility|detailedCivilDesign — neither present.
    expect(assignStage(gate)).toBe('Conception')
  })

  it('lists the de-risking gates still outstanding', () => {
    const out = outstandingGates(gate)
    expect(out).toContain('Geotechnical report')
    expect(out).toContain('Registered valuation')
    expect(out).toContain('Funding arranged')
  })
})

describe('mergeStageGates', () => {
  it('a later civil-feasibility + cleared-conditions document promotes the deal to De-risked', () => {
    const approval = stageGateFromApproval(seafields)
    const later = emptyStageGate()
    later.conditionsSubstantiallyCleared = true
    later.civilFeasibility = true
    const merged = mergeStageGates([approval, later])
    expect(assignStage(merged)).toBe('De-risked')
    expect(merged.subdivisionApprovalGranted).toBe(true) // preserved from the approval
  })
})
