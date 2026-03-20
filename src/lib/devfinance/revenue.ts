import {
  ComparableSale,
  UnitValuation,
  UnitType,
  RiskLevel,
} from './types';

// ─── PRSV & Soft Equity Calculations ──────────────────────────

export interface PSRVResult {
  grossRealisableValue: number;
  totalDevelopmentCost: number;
  targetProfitMargin: number;
  targetProfit: number;
  projectSiteRelatedValue: number;
  landPurchasePrice: number;
  softEquity: number;
  softEquityPercent: number;
}

/**
 * Calculate PRSV (Project Site Related Value)
 *
 * PRSV = GRV - TDC - Target Profit
 * Where Target Profit = GRV × target margin
 *
 * Soft Equity = PRSV - Land Purchase Price (if positive)
 */
export function calculatePSRV(
  grv: number,
  tdcExcludingLand: number,
  landPurchasePrice: number,
  targetProfitMargin: number = 0.20
): PSRVResult {
  const targetProfit = grv * targetProfitMargin;
  const prsv = grv - tdcExcludingLand - targetProfit;
  const softEquity = Math.max(0, prsv - landPurchasePrice);

  return {
    grossRealisableValue: grv,
    totalDevelopmentCost: tdcExcludingLand + landPurchasePrice,
    targetProfitMargin,
    targetProfit: Math.round(targetProfit),
    projectSiteRelatedValue: Math.round(prsv),
    landPurchasePrice,
    softEquity: Math.round(softEquity),
    softEquityPercent: prsv > 0
      ? Math.round((softEquity / prsv) * 10000) / 100
      : 0,
  };
}

// ─── GRV Calculation ───────────────────────────────────────────

export function calculateGRV(unitValuations: UnitValuation[]): number {
  return unitValuations.reduce((sum, uv) => sum + uv.totalValue, 0);
}

/**
 * Estimate unit value from comparable sales.
 * Weighted average by relevance score.
 */
export function estimateUnitValueFromComps(
  comps: ComparableSale[],
  targetFloorArea: number
): { estimatedValue: number; confidenceLevel: number } {
  if (comps.length === 0) {
    return { estimatedValue: 0, confidenceLevel: 0 };
  }

  const totalRelevance = comps.reduce((sum, c) => sum + c.relevanceScore, 0);

  if (totalRelevance === 0) {
    // Equal weight fallback
    const avgPricePerSqm = comps.reduce((sum, c) => sum + c.pricePerSqm, 0) / comps.length;
    return {
      estimatedValue: Math.round(avgPricePerSqm * targetFloorArea),
      confidenceLevel: 0.3,
    };
  }

  // Weighted average price per sqm
  const weightedPricePerSqm = comps.reduce(
    (sum, c) => sum + (c.adjustedPrice / c.floorAreaSqm) * (c.relevanceScore / totalRelevance),
    0
  );

  // Confidence based on: number of comps, average relevance, spread
  const avgRelevance = totalRelevance / comps.length;
  const countFactor = Math.min(comps.length / 5, 1); // 5+ comps = full confidence on count
  const confidenceLevel = Math.round(avgRelevance * countFactor * 100) / 100;

  return {
    estimatedValue: Math.round(weightedPricePerSqm * targetFloorArea),
    confidenceLevel: Math.min(confidenceLevel, 0.95),
  };
}

/**
 * Build unit valuations from unit mix and comparable sales.
 */
export function buildUnitValuations(
  unitMix: UnitType[],
  comps: ComparableSale[]
): UnitValuation[] {
  return unitMix.map(unit => {
    // Filter comps relevant to this unit type (similar bedrooms and floor area)
    const relevantComps = comps
      .map(c => ({
        ...c,
        relevanceScore: calculateCompRelevance(c, unit),
      }))
      .filter(c => c.relevanceScore > 0.1)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 8); // top 8 comps

    const { estimatedValue, confidenceLevel } = estimateUnitValueFromComps(
      relevantComps,
      unit.floorAreaSqm
    );

    return {
      unitType: unit.code,
      count: unit.count,
      marketValuePerUnit: estimatedValue,
      totalValue: estimatedValue * unit.count,
      comparables: relevantComps,
      confidenceLevel,
      valuationBasis: 'Direct comparison',
    };
  });
}

/**
 * Score how relevant a comparable sale is to a target unit type.
 * Returns 0-1 relevance score.
 */
function calculateCompRelevance(comp: ComparableSale, target: UnitType): number {
  let score = 1.0;

  // Bedroom match — exact match = full, ±1 = 0.7, ±2+ = 0.3
  const bedDiff = Math.abs(comp.bedrooms - target.bedrooms);
  if (bedDiff === 0) score *= 1.0;
  else if (bedDiff === 1) score *= 0.7;
  else score *= 0.3;

  // Floor area — within 10% = full, within 20% = 0.7, beyond = 0.4
  const areaDiff = Math.abs(comp.floorAreaSqm - target.floorAreaSqm) / target.floorAreaSqm;
  if (areaDiff <= 0.10) score *= 1.0;
  else if (areaDiff <= 0.20) score *= 0.7;
  else score *= 0.4;

  // Distance — closer is more relevant
  if (comp.distanceKm <= 1) score *= 1.0;
  else if (comp.distanceKm <= 3) score *= 0.85;
  else if (comp.distanceKm <= 5) score *= 0.7;
  else if (comp.distanceKm <= 10) score *= 0.5;
  else score *= 0.3;

  // Sale recency — within 3 months = full, 6 = 0.85, 12 = 0.7, older = 0.5
  const saleDate = new Date(comp.saleDate);
  const monthsAgo = (Date.now() - saleDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
  if (monthsAgo <= 3) score *= 1.0;
  else if (monthsAgo <= 6) score *= 0.85;
  else if (monthsAgo <= 12) score *= 0.7;
  else score *= 0.5;

  return Math.round(score * 100) / 100;
}

// ─── Market Risk Assessment ────────────────────────────────────

export function assessMarketRisk(
  unitValuations: UnitValuation[],
  absorptionRateMonths: number
): { riskLevel: RiskLevel; commentary: string } {
  // Average confidence across all unit types
  const avgConfidence = unitValuations.reduce(
    (sum, uv) => sum + uv.confidenceLevel, 0
  ) / unitValuations.length;

  // Low comp confidence = higher risk
  let riskScore = 0;
  if (avgConfidence < 0.4) riskScore += 3;
  else if (avgConfidence < 0.6) riskScore += 2;
  else if (avgConfidence < 0.75) riskScore += 1;

  // Long absorption = higher risk
  if (absorptionRateMonths > 24) riskScore += 3;
  else if (absorptionRateMonths > 18) riskScore += 2;
  else if (absorptionRateMonths > 12) riskScore += 1;

  const riskLevel: RiskLevel =
    riskScore >= 4 ? 'critical' :
    riskScore >= 3 ? 'high' :
    riskScore >= 2 ? 'medium' : 'low';

  const commentary = riskLevel === 'low'
    ? `Market risk is low. Strong comparable evidence (${(avgConfidence * 100).toFixed(0)}% confidence) and reasonable absorption rate of ${absorptionRateMonths} months.`
    : riskLevel === 'medium'
    ? `Market risk is moderate. Comparable evidence confidence at ${(avgConfidence * 100).toFixed(0)}% with ${absorptionRateMonths}-month absorption. Additional market validation recommended.`
    : `Market risk is elevated. Limited comparable evidence (${(avgConfidence * 100).toFixed(0)}% confidence) and/or extended absorption period of ${absorptionRateMonths} months. Lenders may require additional presales or price adjustments.`;

  return { riskLevel, commentary };
}
