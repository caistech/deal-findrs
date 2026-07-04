import { describe, it, expect } from 'vitest'
import { buildEstateCostPack } from './build'

describe('buildEstateCostPack', () => {
  it('builds a land-subdivision buildup with per-lot subtotals feeding the deal-model', () => {
    const pack = buildEstateCostPack({ lots: 30, state: 'WA', city: 'Perth' })
    expect(pack.lots).toBe(30)
    expect(pack.regionFactor).toBeCloseTo(0.95, 2) // WA/Perth factor
    // civil is the sum of the 6 civil lines
    const civilLines = pack.lines.filter((l) => l.category === 'Civil / Infrastructure')
    expect(civilLines).toHaveLength(6)
    expect(pack.civilPerLot).toBe(civilLines.reduce((s, l) => s + l.perLot, 0))
    // per-lot total is the sum of land + civil + soft + statutory + contingency
    expect(pack.landDevCostPerLot).toBe(
      pack.landPerLot + pack.civilPerLot + pack.softPerLot + pack.statutoryPerLot + pack.contingencyPerLot,
    )
    expect(pack.totalLandDevCost).toBe(pack.landDevCostPerLot * 30)
    // no H&L line by default
    expect(pack.homeConstructionPerHome).toBeNull()
    expect(pack.lines.some((l) => l.category === 'House & Land')).toBe(false)
  })

  it('uses the operator land price when supplied (source=operator)', () => {
    const pack = buildEstateCostPack({ lots: 20, state: 'WA', landPerLot: 150000 })
    const land = pack.lines.find((l) => l.key === 'land')!
    expect(land.perLot).toBe(150000)
    expect(land.source).toBe('operator')
  })

  it('applies the region factor to benchmark civil rates', () => {
    const perth = buildEstateCostPack({ lots: 10, state: 'WA', city: 'Perth' })
    const nsw = buildEstateCostPack({ lots: 10, state: 'NSW', city: 'Sydney' })
    // Sydney baseline = 1.00, Perth = 0.95 → Perth civil is lower
    expect(perth.civilPerLot).toBeLessThan(nsw.civilPerLot)
  })

  it('layers an H&L home-construction line when capture > 0, via the devfinance engine', () => {
    const pack = buildEstateCostPack({
      lots: 40, state: 'WA', city: 'Perth',
      homeCaptureRate: 0.4,
      homeSpec: { floorAreaSqm: 140, bedrooms: 3, bathrooms: 2 },
    })
    expect(pack.homeCaptureRate).toBe(0.4)
    expect(pack.homeConstructionPerHome).toBeGreaterThan(0)
    const hl = pack.lines.find((l) => l.category === 'House & Land')!
    expect(hl.source).toBe('devfinance-engine')
    // H&L is NOT folded into the land-development per-lot total
    expect(pack.landDevCostPerLot).toBe(
      pack.landPerLot + pack.civilPerLot + pack.softPerLot + pack.statutoryPerLot + pack.contingencyPerLot,
    )
  })

  it('honours operator overrides by line key', () => {
    const pack = buildEstateCostPack({ lots: 10, state: 'WA', overrides: { earthworks: 5000 } })
    expect(pack.lines.find((l) => l.key === 'earthworks')!.perLot).toBe(5000)
  })

  it('scales slope-sensitive civil lines + adds retaining on a steep site', () => {
    const flat = buildEstateCostPack({ lots: 20, state: 'NSW', city: 'Sydney', terrain: { slopePercent: 3 } })
    const steep = buildEstateCostPack({ lots: 20, state: 'NSW', city: 'Sydney', terrain: { slopePercent: 22 } })
    // earthworks + roadworks scale up (factor 2.2 for >15%)
    const ew = (p: typeof flat) => p.lines.find((l) => l.key === 'earthworks')!.perLot
    const rw = (p: typeof flat) => p.lines.find((l) => l.key === 'roadworks')!.perLot
    expect(ew(steep)).toBeGreaterThan(ew(flat))
    expect(rw(steep)).toBeGreaterThan(rw(flat))
    // a retaining line appears on the steep site only
    expect(flat.lines.some((l) => l.key === 'retaining')).toBe(false)
    expect(steep.lines.some((l) => l.key === 'retaining')).toBe(true)
    // civil total (incl. retaining) is materially higher on the steep site
    expect(steep.civilPerLot).toBeGreaterThan(flat.civilPerLot)
    // slope-insensitive lines (e.g. water/sewer) are unchanged
    const ws = (p: typeof flat) => p.lines.find((l) => l.key === 'water_sewer')!.perLot
    expect(ws(steep)).toBe(ws(flat))
  })

  it('does not scale a slope-sensitive line when the operator overrides it', () => {
    const pack = buildEstateCostPack({
      lots: 10, state: 'NSW', city: 'Sydney',
      terrain: { slopePercent: 22 }, overrides: { earthworks: 5000 },
    })
    expect(pack.lines.find((l) => l.key === 'earthworks')!.perLot).toBe(5000)
  })
})
