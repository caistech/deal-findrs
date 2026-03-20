import {
  TradeItem,
  TradeCategory,
  DrawDownMilestone,
  ContingencyAnalysis,
  UnitType,
  RiskLevel,
} from './types';

// ─── Australian Residential Cost Rates (Rawlinsons-aligned) ───
// These are baseline rates — AI agent will adjust for location, market, and project specifics

interface CostRate {
  trade: string;
  category: string;
  unit: string;
  rateLow: number;
  rateMedian: number;
  rateHigh: number;
  source: 'rawlinsons' | 'project_actual';
}

const BASE_COST_RATES: CostRate[] = [
  // Substructure
  { trade: 'Site Preparation', category: 'Substructure', unit: 'm²', rateLow: 15, rateMedian: 25, rateHigh: 40, source: 'rawlinsons' },
  { trade: 'Earthworks', category: 'Substructure', unit: 'm³', rateLow: 30, rateMedian: 45, rateHigh: 70, source: 'rawlinsons' },
  { trade: 'Concrete Slab', category: 'Substructure', unit: 'm²', rateLow: 85, rateMedian: 110, rateHigh: 145, source: 'rawlinsons' },
  { trade: 'Piling/Footings', category: 'Substructure', unit: 'lm', rateLow: 50, rateMedian: 80, rateHigh: 120, source: 'rawlinsons' },

  // Superstructure
  { trade: 'Structural Steel/Timber Frame', category: 'Superstructure', unit: 'm²', rateLow: 120, rateMedian: 180, rateHigh: 260, source: 'rawlinsons' },
  { trade: 'External Walls', category: 'Superstructure', unit: 'm²', rateLow: 90, rateMedian: 140, rateHigh: 200, source: 'rawlinsons' },
  { trade: 'Roof Structure', category: 'Superstructure', unit: 'm²', rateLow: 60, rateMedian: 95, rateHigh: 140, source: 'rawlinsons' },
  { trade: 'Roof Covering', category: 'Superstructure', unit: 'm²', rateLow: 40, rateMedian: 65, rateHigh: 100, source: 'rawlinsons' },
  { trade: 'Windows & External Doors', category: 'Superstructure', unit: 'item', rateLow: 600, rateMedian: 950, rateHigh: 1400, source: 'rawlinsons' },

  // Finishes
  { trade: 'Internal Walls & Linings', category: 'Finishes', unit: 'm²', rateLow: 45, rateMedian: 70, rateHigh: 100, source: 'rawlinsons' },
  { trade: 'Floor Finishes', category: 'Finishes', unit: 'm²', rateLow: 35, rateMedian: 60, rateHigh: 95, source: 'rawlinsons' },
  { trade: 'Ceiling Finishes', category: 'Finishes', unit: 'm²', rateLow: 25, rateMedian: 40, rateHigh: 60, source: 'rawlinsons' },
  { trade: 'Painting', category: 'Finishes', unit: 'm²', rateLow: 12, rateMedian: 18, rateHigh: 28, source: 'rawlinsons' },

  // Fittings
  { trade: 'Kitchen', category: 'Fittings', unit: 'item', rateLow: 8000, rateMedian: 14000, rateHigh: 25000, source: 'rawlinsons' },
  { trade: 'Bathroom', category: 'Fittings', unit: 'item', rateLow: 6000, rateMedian: 10000, rateHigh: 18000, source: 'rawlinsons' },
  { trade: 'Laundry', category: 'Fittings', unit: 'item', rateLow: 2500, rateMedian: 4500, rateHigh: 7000, source: 'rawlinsons' },
  { trade: 'Wardrobes & Joinery', category: 'Fittings', unit: 'item', rateLow: 3000, rateMedian: 5500, rateHigh: 9000, source: 'rawlinsons' },

  // Services
  { trade: 'Electrical', category: 'Services', unit: 'm²', rateLow: 55, rateMedian: 85, rateHigh: 120, source: 'rawlinsons' },
  { trade: 'Plumbing & Drainage', category: 'Services', unit: 'm²', rateLow: 50, rateMedian: 80, rateHigh: 115, source: 'rawlinsons' },
  { trade: 'HVAC', category: 'Services', unit: 'm²', rateLow: 30, rateMedian: 55, rateHigh: 85, source: 'rawlinsons' },
  { trade: 'Fire Services', category: 'Services', unit: 'm²', rateLow: 10, rateMedian: 20, rateHigh: 35, source: 'rawlinsons' },

  // External Works
  { trade: 'Landscaping', category: 'External Works', unit: 'm²', rateLow: 25, rateMedian: 50, rateHigh: 85, source: 'rawlinsons' },
  { trade: 'Driveways & Paths', category: 'External Works', unit: 'm²', rateLow: 40, rateMedian: 70, rateHigh: 110, source: 'rawlinsons' },
  { trade: 'Fencing', category: 'External Works', unit: 'lm', rateLow: 80, rateMedian: 140, rateHigh: 220, source: 'rawlinsons' },
  { trade: 'Stormwater', category: 'External Works', unit: 'item', rateLow: 3000, rateMedian: 5500, rateHigh: 9000, source: 'rawlinsons' },
  { trade: 'Deck/Outdoor', category: 'External Works', unit: 'm²', rateLow: 180, rateMedian: 280, rateHigh: 400, source: 'rawlinsons' },

  // Preliminaries
  { trade: 'Preliminaries & Margin', category: 'Preliminaries', unit: '%', rateLow: 12, rateMedian: 15, rateHigh: 20, source: 'rawlinsons' },
];

// ─── Regional Adjustment Factors ───────────────────────────────

interface RegionalFactor {
  state: string;
  city: string;
  factor: number;  // multiplier vs Sydney baseline
}

const REGIONAL_FACTORS: RegionalFactor[] = [
  { state: 'NSW', city: 'Sydney', factor: 1.00 },
  { state: 'NSW', city: 'Regional', factor: 0.92 },
  { state: 'VIC', city: 'Melbourne', factor: 0.97 },
  { state: 'VIC', city: 'Regional', factor: 0.90 },
  { state: 'QLD', city: 'Brisbane', factor: 0.93 },
  { state: 'QLD', city: 'Gold Coast', factor: 0.95 },
  { state: 'QLD', city: 'Regional', factor: 0.88 },
  { state: 'WA', city: 'Perth', factor: 0.95 },
  { state: 'SA', city: 'Adelaide', factor: 0.90 },
  { state: 'TAS', city: 'Hobart', factor: 0.88 },
  { state: 'TAS', city: 'Regional', factor: 0.85 },
  { state: 'ACT', city: 'Canberra', factor: 0.96 },
  { state: 'NT', city: 'Darwin', factor: 1.15 },
];

// ─── Cost Engine Functions ─────────────────────────────────────

export function getRegionalFactor(state: string, city: string): number {
  // Try exact match first
  const exact = REGIONAL_FACTORS.find(
    r => r.state.toLowerCase() === state.toLowerCase() &&
         r.city.toLowerCase() === city.toLowerCase()
  );
  if (exact) return exact.factor;

  // Fall back to regional rate for that state
  const regional = REGIONAL_FACTORS.find(
    r => r.state.toLowerCase() === state.toLowerCase() &&
         r.city === 'Regional'
  );
  if (regional) return regional.factor;

  // Default to Sydney baseline
  return 1.0;
}

export function lookupCostRate(trade: string): CostRate | undefined {
  return BASE_COST_RATES.find(
    r => r.trade.toLowerCase() === trade.toLowerCase()
  );
}

export function getAllCostRates(): CostRate[] {
  return [...BASE_COST_RATES];
}

export function estimateTradeItem(
  trade: string,
  quantity: number,
  state: string,
  city: string,
  quality: 'low' | 'medium' | 'high' = 'medium'
): TradeItem | null {
  const rate = lookupCostRate(trade);
  if (!rate) return null;

  const regionalFactor = getRegionalFactor(state, city);
  const baseRate = quality === 'low' ? rate.rateLow
    : quality === 'high' ? rate.rateHigh
    : rate.rateMedian;

  const adjustedRate = Math.round(baseRate * regionalFactor * 100) / 100;
  const total = Math.round(adjustedRate * quantity * 100) / 100;

  return {
    trade: rate.trade,
    description: `${rate.trade} — ${quality} quality, ${state} regional adjustment`,
    quantity,
    unit: rate.unit,
    rate: adjustedRate,
    total,
    source: rate.source,
    confidence: quality === 'medium' ? 0.75 : 0.6,
  };
}

export function calculateConstructionCost(
  unitMix: UnitType[],
  state: string,
  city: string,
  quality: 'low' | 'medium' | 'high' = 'medium'
): { categories: TradeCategory[]; constructionSubtotal: number } {
  const totalFloorArea = unitMix.reduce((sum, u) => sum + (u.floorAreaSqm * u.count), 0);
  const totalUnits = unitMix.reduce((sum, u) => sum + u.count, 0);
  const totalBathrooms = unitMix.reduce((sum, u) => sum + (u.bathrooms * u.count), 0);
  const totalBedrooms = unitMix.reduce((sum, u) => sum + (u.bedrooms * u.count), 0);

  const categoryMap = new Map<string, TradeItem[]>();

  for (const rate of BASE_COST_RATES) {
    // Determine quantity based on unit type
    let quantity: number;
    if (rate.unit === 'm²') {
      quantity = totalFloorArea;
    } else if (rate.unit === 'm³') {
      quantity = totalFloorArea * 0.3; // average depth estimate
    } else if (rate.unit === 'lm') {
      quantity = totalFloorArea * 0.15; // perimeter estimate
    } else if (rate.unit === 'item') {
      // Item-based: per unit or per room
      if (rate.trade === 'Kitchen') quantity = totalUnits;
      else if (rate.trade === 'Bathroom') quantity = totalBathrooms;
      else if (rate.trade === 'Laundry') quantity = totalUnits;
      else if (rate.trade === 'Wardrobes & Joinery') quantity = totalBedrooms;
      else if (rate.trade === 'Stormwater') quantity = totalUnits;
      else if (rate.trade.includes('Window')) quantity = totalUnits * 8; // avg 8 per dwelling
      else quantity = totalUnits;
    } else if (rate.unit === '%') {
      // Preliminaries — skip for now, calculate as percentage at the end
      continue;
    } else {
      quantity = totalFloorArea;
    }

    const item = estimateTradeItem(rate.trade, quantity, state, city, quality);
    if (!item) continue;

    const existing = categoryMap.get(rate.category) || [];
    existing.push(item);
    categoryMap.set(rate.category, existing);
  }

  // Build categories
  const categories: TradeCategory[] = [];
  let constructionSubtotal = 0;

  categoryMap.forEach((trades, category) => {
    const subtotal = trades.reduce((sum: number, t: TradeItem) => sum + t.total, 0);
    constructionSubtotal += subtotal;
    categories.push({ category, trades, subtotal });
  });

  // Add preliminaries as percentage
  const prelimRate = BASE_COST_RATES.find(r => r.trade === 'Preliminaries & Margin');
  if (prelimRate) {
    const pct = quality === 'low' ? prelimRate.rateLow
      : quality === 'high' ? prelimRate.rateHigh
      : prelimRate.rateMedian;
    const prelimAmount = Math.round(constructionSubtotal * (pct / 100));

    categories.push({
      category: 'Preliminaries',
      trades: [{
        trade: 'Preliminaries & Builder Margin',
        description: `${pct}% of construction subtotal`,
        quantity: 1,
        unit: 'item',
        rate: prelimAmount,
        total: prelimAmount,
        source: 'rawlinsons',
        confidence: 0.7,
      }],
      subtotal: prelimAmount,
    });
    constructionSubtotal += prelimAmount;
  }

  return { categories, constructionSubtotal };
}

// ─── Draw-Down Schedule ────────────────────────────────────────

const DEFAULT_DRAW_DOWN_PROFILE: { phase: string; percent: number }[] = [
  { phase: 'Slab / Foundation', percent: 15 },
  { phase: 'Frame', percent: 20 },
  { phase: 'Lock-up', percent: 20 },
  { phase: 'Fixing', percent: 25 },
  { phase: 'Completion', percent: 20 },
];

export function generateDrawDown(
  totalConstructionCost: number,
  programMonths: number,
  profile = DEFAULT_DRAW_DOWN_PROFILE
): DrawDownMilestone[] {
  const monthsPerPhase = programMonths / profile.length;
  let cumulative = 0;

  return profile.map((p, i) => {
    const amount = Math.round(totalConstructionCost * (p.percent / 100));
    cumulative += amount;

    return {
      phase: p.phase,
      percentComplete: p.percent,
      cumulativePercent: profile.slice(0, i + 1).reduce((s, x) => s + x.percent, 0),
      amount,
      cumulativeAmount: cumulative,
      targetMonth: Math.round((i + 1) * monthsPerPhase),
    };
  });
}

// ─── Contingency Analysis ──────────────────────────────────────

export function analyseContingency(
  constructionCost: number,
  riskFactors: { factor: string; impact: RiskLevel }[]
): ContingencyAnalysis {
  const basePercent = 5; // standard base contingency

  const impactMap: Record<RiskLevel, number> = {
    low: 0.5,
    medium: 1.5,
    high: 3.0,
    critical: 5.0,
  };

  const riskItems = riskFactors.map(r => ({
    ...r,
    additionalPercent: impactMap[r.impact],
  }));

  const additionalPercent = riskItems.reduce((sum, r) => sum + r.additionalPercent, 0);
  const riskAdjustedPercent = basePercent + additionalPercent;

  return {
    baseContingencyPercent: basePercent,
    baseContingencyAmount: Math.round(constructionCost * (basePercent / 100)),
    riskAdjustedPercent,
    riskAdjustedAmount: Math.round(constructionCost * (riskAdjustedPercent / 100)),
    riskFactors: riskItems,
  };
}
