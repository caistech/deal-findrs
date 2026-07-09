import type { PropertyProfile } from '@/lib/property-services'
import { buildConstraintsYield } from '@/lib/estate-buildup/build'
import type { BuildupOptions } from '@/lib/estate-buildup/types'

/** The point-in-time status-report snapshot stored on a share token + rendered by /status/[token]. */
export interface StatusSnapshot {
  name: string | null
  address: string | null
  lots: number | null
  landSizeSqm: number | null
  landSizeUnit: string | null
  ragStatus: 'green' | 'amber' | 'red' | null
  lifecycleStatus: string | null
  dealModelStage: string | null
  economics: {
    /** Which exit the verdict is on. */
    grossMarginPct: number | null
    landOnly: { gmPct: number; revenue: number; profit: number } | null
    houseLand: { gmPct: number; revenue: number; profit: number } | null
  }
  conditions: {
    total: number
    cleared: number
    byCategory: { category: string; total: number; cleared: number }[]
  }
  gaps: { dimension: string; label: string; provenance: string; detail: string }[]
  partnerName: string | null
  generatedAt: string
}

type OppInput = {
  name?: string | null
  address?: string | null
  num_lots?: number | null
  property_size?: number | null
  property_size_unit?: string | null
  rag_status?: string | null
  lifecycle_status?: string | null
  deal_model_stage?: string | null
  gross_margin_percent?: number | null
  developed_lot_price?: number | null
  avg_sale_price?: number | null
  land_purchase_price?: number | null
  infrastructure_costs?: number | null
  construction_per_unit?: number | null
  contingency_percent?: number | null
  property_profile?: PropertyProfile | null
  plan_tenure?: BuildupOptions['planTenure'] | null
}

type ConditionInput = { category: string | null; status: string | null }

const CLEARED = new Set(['cleared', 'not_applicable'])

/** Assemble the status snapshot from the opportunity + its conditions + any planner-resolved yield. */
export function assembleStatusSnapshot(input: {
  opp: OppInput
  conditions: ConditionInput[]
  operatorResolved?: BuildupOptions['operatorResolved']
  partnerName: string | null
  generatedAt: string
}): StatusSnapshot {
  const { opp, conditions, operatorResolved, partnerName, generatedAt } = input
  const lots = opp.num_lots ?? 0

  // Two-exit economics (land-only = the verdict basis; house-and-land = the upside).
  const lotPrice = opp.developed_lot_price ?? 0
  const hlPrice = opp.avg_sale_price ?? 0
  const cont = (opp.contingency_percent ?? 5) / 100
  const landBase = (opp.land_purchase_price ?? 0) + (opp.infrastructure_costs ?? 0)
  const gm = (rev: number, cost: number) => (rev > 0 ? ((rev - cost) / rev) * 100 : 0)
  const twoExit = lots > 0 && lotPrice > 0 && hlPrice > 0
  const landOnly = twoExit
    ? (() => {
        const cost = landBase * (1 + cont)
        const revenue = lotPrice * lots
        return { gmPct: gm(revenue, cost), revenue, profit: revenue - cost }
      })()
    : null
  const houseLand = twoExit
    ? (() => {
        const cost = (landBase + (opp.construction_per_unit ?? 0) * lots) * (1 + cont)
        const revenue = hlPrice * lots
        return { gmPct: gm(revenue, cost), revenue, profit: revenue - cost }
      })()
    : null

  // Conditions-clearance progress, overall + by category.
  const byCat = new Map<string, { total: number; cleared: number }>()
  let clearedTotal = 0
  for (const c of conditions) {
    const cat = c.category ?? 'other'
    const isCleared = CLEARED.has((c.status ?? '').toLowerCase())
    if (isCleared) clearedTotal++
    const e = byCat.get(cat) ?? { total: 0, cleared: 0 }
    e.total++
    if (isCleared) e.cleared++
    byCat.set(cat, e)
  }

  // Open gaps + referrals from the derived buildup (honours the resolved yield + ingested plan tenure).
  let gaps: StatusSnapshot['gaps'] = []
  if (opp.property_profile) {
    const brief = buildConstraintsYield(opp.property_profile, {
      ...(operatorResolved ? { operatorResolved } : {}),
      ...(opp.plan_tenure ? { planTenure: opp.plan_tenure } : {}),
    })
    gaps = brief.gaps.map((g) => ({ dimension: g.dimension, label: g.label, provenance: g.provenance, detail: g.detail }))
  }

  return {
    name: opp.name ?? null,
    address: opp.address ?? null,
    lots: lots || null,
    landSizeSqm: opp.property_size ?? null,
    landSizeUnit: opp.property_size_unit ?? null,
    ragStatus: (opp.rag_status as StatusSnapshot['ragStatus']) ?? null,
    lifecycleStatus: opp.lifecycle_status ?? null,
    dealModelStage: opp.deal_model_stage ?? null,
    economics: { grossMarginPct: opp.gross_margin_percent ?? null, landOnly, houseLand },
    conditions: {
      total: conditions.length,
      cleared: clearedTotal,
      byCategory: Array.from(byCat.entries()).map(([category, v]) => ({ category, total: v.total, cleared: v.cleared })),
    },
    gaps,
    partnerName,
    generatedAt,
  }
}
