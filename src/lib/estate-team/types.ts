/**
 * Estate kickoff team — occupations, directory, and auto-assembly.
 *
 * "The derive generates the invite list": the Constraints & Yield Brief's gaps + the deal context
 * determine which professional occupations the kickoff needs; the state team directory is matched to
 * those, and any required occupation with no state-panel member is flagged as a gap (tells F2K where
 * to build out that state's panel). See docs/estate-constraints-yield-plan.md.
 */

export type Occupation =
  | 'client'
  | 'f2k'
  | 'planner'
  | 'selling_agent'
  | 'modular_supplier'
  | 'civil_engineer'
  | 'surveyor'
  | 'quantity_surveyor'
  | 'valuer'
  | 'funder_broker'
  | 'property_lawyer'
  | 'bushfire_consultant'
  | 'environmental_consultant'
  | 'geotech_engineer'
  | 'traffic_engineer'
  | 'heritage_consultant'
  | 'servicing_authority'
  | 'accountant'
  | 'civil_contractor'

export type OccupationTier = 'core' | 'drive' | 'triggered'

/** Building typology — drives which modular supplier is matched. */
export type Typology = 'house_and_land' | 'townhouse' | 'multi_storey' | 'apartments' | 'mixed_use'

export const OCCUPATION_LABELS: Record<Occupation, string> = {
  client: 'Client (developer/landowner)',
  f2k: 'Factory2Key',
  planner: 'Town planner',
  selling_agent: 'Selling agent',
  modular_supplier: 'Modular supplier',
  civil_engineer: 'Civil engineer',
  surveyor: 'Surveyor',
  quantity_surveyor: 'Quantity surveyor',
  valuer: 'Valuer',
  funder_broker: 'Funder / broker',
  property_lawyer: 'Property lawyer',
  bushfire_consultant: 'Bushfire consultant',
  environmental_consultant: 'Environmental consultant',
  geotech_engineer: 'Geotechnical engineer',
  traffic_engineer: 'Traffic engineer',
  heritage_consultant: 'Heritage consultant',
  servicing_authority: 'Servicing authority',
  accountant: 'Accountant / tax',
  civil_contractor: 'Civil contractor',
}

/** A required seat at the kickoff, with why it's there. */
export interface RequiredOccupation {
  occupation: Occupation
  tier: OccupationTier
  reason: string
}

/** A directory member (from the state team directory). */
export interface TeamMember {
  id: string
  name: string
  firm?: string | null
  occupation: Occupation
  /** States this member covers (e.g. ['WA'] or ['WA','SA']). */
  states: string[]
  /** For modular suppliers: which typologies they serve. */
  typologies?: Typology[] | null
  email?: string | null
  phone?: string | null
  active?: boolean
}

export interface KickoffNomination {
  occupation: Occupation
  tier: OccupationTier
  reason: string
  members: TeamMember[]
}

export interface KickoffGap {
  occupation: Occupation
  tier: OccupationTier
  reason: string
  detail: string
}

export interface AssembledKickoff {
  nominations: KickoffNomination[]
  /** Required occupations with no member on this state's panel. */
  gaps: KickoffGap[]
}

/** Context beyond the brief that shapes the required team. */
export interface KickoffContext {
  state: string
  civilMode?: 'Contractor' | 'Civil-JV'
  typology?: Typology | null
}
