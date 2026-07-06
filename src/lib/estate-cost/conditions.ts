import type { EstateCostInput } from './types'

/** Inputs to derive the cost-bearing approval conditions from the conditions register. */
export interface DeriveCostConditionsInput {
  /** The opportunity's conditions of approval (text is matched to flag cost-bearing conditions). */
  conditions: { text: string | null }[]
  wapcRef?: string | null
  /** Public open space area (m²) from the plan — sizes the POS-development condition line. */
  posSqm?: number | null
  /** Per-hectare land value — the OP2.4 education levy is 1/1500th of this per lot. */
  landValuePerHa?: number | null
}

/**
 * Map the conditions register → the cost-bearing `approvalConditions` the estate-cost pack consumes
 * (education levy, road-frontage upgrades, POS development, demolition). Single source of truth so the
 * QS review pack and the F2K deal-model pre-fill classify conditions identically.
 */
export function deriveCostConditions(
  input: DeriveCostConditionsInput,
): NonNullable<EstateCostInput['approvalConditions']> | undefined {
  const { conditions } = input
  if (!conditions.length) return undefined
  const has = (re: RegExp) => conditions.some((c) => re.test(c.text ?? ''))
  return {
    wapcRef: input.wapcRef ?? null,
    education: has(/education|school|op\s*2\.4|1\/1500/i),
    roadUpgrades: has(/upgrad\w+ .*road|road.*upgrad|full cost of upgrading|frontage/i),
    posDevelopment: has(/public open space|\bpos\b|landscap/i),
    demolition: has(/demolish|demolition/i),
    posSqm: input.posSqm ?? null,
    landValuePerHa: input.landValuePerHa ?? null,
  }
}
