import {
  BridgingMechanism,
  BridgingScenario,
  AffordableGapAnalysis,
  UnitType,
} from './types';

// ─── CHP Pricing Models ───────────────────────────────────────

/**
 * Estimate what a CHP can pay based on rental yield model.
 *
 * CHP revenue = rent (capped at 75% market or 30% tenant income)
 * + Commonwealth Rent Assistance
 *
 * CHP max acquisition = capitalised net rental income at required yield
 */
export function estimateCHPMaxPrice(
  marketRentWeekly: number,
  managementCostPercent: number = 0.25,  // 25% of rent for management/maintenance
  targetYield: number = 0.05,             // 5% gross yield required
): number {
  // CHP rent is typically 75% of market rent
  const chpRentWeekly = marketRentWeekly * 0.75;
  const annualRent = chpRentWeekly * 52;
  const netRent = annualRent * (1 - managementCostPercent);

  // Capitalise at target yield
  return Math.round(netRent / targetYield);
}

// ─── Gap Calculation ───────────────────────────────────────────

export function calculateAffordableGap(
  marketPricePerUnit: number,
  chpMaxPrice: number,
  affordableUnits: number
): { gapPerUnit: number; totalGap: number; discountPercent: number } {
  const gapPerUnit = Math.max(0, marketPricePerUnit - chpMaxPrice);
  return {
    gapPerUnit,
    totalGap: gapPerUnit * affordableUnits,
    discountPercent: marketPricePerUnit > 0
      ? Math.round((gapPerUnit / marketPricePerUnit) * 10000) / 100
      : 0,
  };
}

// ─── Bridging Mechanism Models ─────────────────────────────────

interface BridgingModelInput {
  marketPricePerUnit: number;
  chpMaxPrice: number;
  gapPerUnit: number;
  affordableUnits: number;
  totalUnits: number;
  tdcPerUnit: number;
  minimumMarginPercent: number;  // developer's minimum acceptable margin
}

function modelCapitalGrant(input: BridgingModelInput): BridgingScenario {
  // Government pays the full gap as a capital grant to the CHP
  const subsidyPerUnit = input.gapPerUnit;
  const totalSubsidy = subsidyPerUnit * input.affordableUnits;

  return {
    mechanism: 'capital_grant',
    label: 'Capital Grant to CHP',
    description: 'Government provides a capital grant directly to the CHP, covering the gap between market price and CHP acquisition price. Developer receives full market price.',
    subsidyPerUnit,
    totalSubsidy,
    effectiveCHPPrice: input.chpMaxPrice + subsidyPerUnit,
    developerMarginImpact: 0, // no impact — developer gets full price
    isViable: true,
    assumptions: [
      'Government funds the full gap via HAFF, state housing fund, or equivalent',
      'CHP receives grant and combines with own capital to acquire at market price',
      'Developer pricing and margin unchanged',
    ],
  };
}

function modelDirectAcquisition(input: BridgingModelInput): BridgingScenario {
  // Government buys the units at market price, leases to CHP
  const subsidyPerUnit = input.gapPerUnit;
  const totalSubsidy = subsidyPerUnit * input.affordableUnits;

  return {
    mechanism: 'direct_acquisition',
    label: 'Homes Tasmania Direct Acquisition',
    description: 'Government acquires the affordable dwellings at market price (or near-market) and manages them directly or leases to CHPs. Developer sells at agreed price.',
    subsidyPerUnit,
    totalSubsidy,
    effectiveCHPPrice: input.marketPricePerUnit, // government pays market
    developerMarginImpact: 0,
    isViable: true,
    assumptions: [
      'Homes Tasmania or Building Tasmania acquires at fair commercial value',
      'Units are managed by government housing authority or on-leased to CHPs',
      'Potential for small negotiated discount (5-10%) off market — modelled at full market here',
    ],
  };
}

function modelConcessionalFinance(input: BridgingModelInput): BridgingScenario {
  // NHFIC or similar provides low-interest finance to CHP
  // This increases CHP purchasing power by ~15-20%
  const additionalCapacity = input.chpMaxPrice * 0.18; // ~18% more buying power
  const subsidyPerUnit = Math.min(additionalCapacity, input.gapPerUnit);
  const remainingGap = input.gapPerUnit - subsidyPerUnit;

  return {
    mechanism: 'concessional_finance',
    label: 'NHFIC Concessional Finance',
    description: 'CHP accesses concessional finance (e.g., NHFIC) at below-market rates, increasing purchasing power. May not fully close the gap alone.',
    subsidyPerUnit,
    totalSubsidy: subsidyPerUnit * input.affordableUnits,
    effectiveCHPPrice: input.chpMaxPrice + subsidyPerUnit,
    developerMarginImpact: remainingGap > 0 ? -(remainingGap / input.marketPricePerUnit) : 0,
    isViable: remainingGap <= 0,
    assumptions: [
      'CHP successfully accesses NHFIC or equivalent concessional facility',
      'Concessional rate ~2-3% below commercial, increasing borrowing capacity ~18%',
      remainingGap > 0
        ? `Gap partially closed — $${remainingGap.toLocaleString()} per unit remains`
        : 'Gap fully closed by increased CHP borrowing capacity',
    ],
  };
}

function modelBelowMarketLand(input: BridgingModelInput): BridgingScenario {
  // Government contributes land at below market value
  // This reduces TDC, creating headroom
  const landDiscountPerUnit = input.gapPerUnit; // assumes land discount can cover gap
  const totalSubsidy = landDiscountPerUnit * input.affordableUnits;

  return {
    mechanism: 'below_market_land',
    label: 'Below-Market Government Land',
    description: 'Government contributes land at below-market value (or free), reducing TDC and enabling affordable pricing without margin erosion.',
    subsidyPerUnit: landDiscountPerUnit,
    totalSubsidy,
    effectiveCHPPrice: input.chpMaxPrice, // CHP pays their max, developer absorbs less
    developerMarginImpact: 0,
    isViable: true,
    assumptions: [
      'Government-owned land is contributed at discounted or nil value',
      'Land discount offsets the affordable pricing gap',
      'Only applicable where government land is available in suitable locations',
    ],
  };
}

function modelSharedEquity(input: BridgingModelInput): BridgingScenario {
  // Government retains equity share, CHP/tenant buys remainder
  const governmentEquityPercent = 0.30; // 30% government equity
  const subsidyPerUnit = Math.round(input.marketPricePerUnit * governmentEquityPercent);
  const tenantPortion = input.marketPricePerUnit - subsidyPerUnit;

  return {
    mechanism: 'shared_equity',
    label: 'Shared Equity Model',
    description: 'Government retains a 30% equity share in each dwelling. CHP or tenant acquires the remaining 70%, making the purchase affordable. Developer receives full market price.',
    subsidyPerUnit,
    totalSubsidy: subsidyPerUnit * input.affordableUnits,
    effectiveCHPPrice: tenantPortion,
    developerMarginImpact: 0, // developer sells at market
    isViable: tenantPortion <= input.chpMaxPrice * 1.1, // viable if tenant portion near CHP max
    assumptions: [
      'Government retains 30% equity, recoverable on future sale',
      `Tenant/CHP portion: $${tenantPortion.toLocaleString()} vs CHP max: $${input.chpMaxPrice.toLocaleString()}`,
      'Developer receives full market price (government + CHP/tenant combined)',
      'Equity share is registered on title',
    ],
  };
}

function modelRentToBuy(input: BridgingModelInput): BridgingScenario {
  // Tenant rents initially, with option to purchase over time
  // Developer receives market price upfront from funding entity
  const subsidyPerUnit = input.gapPerUnit * 0.5; // partial subsidy + deferred purchase
  const totalSubsidy = subsidyPerUnit * input.affordableUnits;

  return {
    mechanism: 'rent_to_buy',
    label: 'Rent-to-Buy Pathway',
    description: 'Dwellings are initially rented at affordable rates with a purchase option. Requires a funding entity (government or impact investor) to acquire upfront and manage the rent-to-buy program.',
    subsidyPerUnit,
    totalSubsidy,
    effectiveCHPPrice: input.marketPricePerUnit - subsidyPerUnit,
    developerMarginImpact: -(subsidyPerUnit / input.marketPricePerUnit),
    isViable: (input.marketPricePerUnit - subsidyPerUnit) >= input.tdcPerUnit * 1.05,
    assumptions: [
      'Funding entity acquires at near-market with partial government subsidy',
      'Tenant accumulates equity through rent credits over 10-15 years',
      'Developer may need to accept small discount to market price',
      'Requires ongoing program management',
    ],
  };
}

// ─── Run All Bridging Scenarios ────────────────────────────────

export function modelBridgingScenarios(input: BridgingModelInput): BridgingScenario[] {
  return [
    modelCapitalGrant(input),
    modelDirectAcquisition(input),
    modelConcessionalFinance(input),
    modelBelowMarketLand(input),
    modelSharedEquity(input),
    modelRentToBuy(input),
  ];
}

// ─── Blended Feasibility ───────────────────────────────────────

export function calculateBlendedFeasibility(
  marketUnits: number,
  marketPricePerUnit: number,
  affordableUnits: number,
  affordablePricePerUnit: number,  // CHP price or subsidised price
  tdcPerUnit: number
): {
  blendedGRV: number;
  blendedProfit: number;
  blendedMargin: number;
  fullMarketGRV: number;
  fullMarketProfit: number;
  fullMarketMargin: number;
} {
  const totalUnits = marketUnits + affordableUnits;
  const totalTDC = tdcPerUnit * totalUnits;

  // Blended (market + affordable)
  const blendedGRV = (marketUnits * marketPricePerUnit) + (affordableUnits * affordablePricePerUnit);
  const blendedProfit = blendedGRV - totalTDC;
  const blendedMargin = blendedGRV > 0 ? (blendedProfit / blendedGRV) * 100 : 0;

  // Full market comparison
  const fullMarketGRV = totalUnits * marketPricePerUnit;
  const fullMarketProfit = fullMarketGRV - totalTDC;
  const fullMarketMargin = fullMarketGRV > 0 ? (fullMarketProfit / fullMarketGRV) * 100 : 0;

  return {
    blendedGRV: Math.round(blendedGRV),
    blendedProfit: Math.round(blendedProfit),
    blendedMargin: Math.round(blendedMargin * 100) / 100,
    fullMarketGRV: Math.round(fullMarketGRV),
    fullMarketProfit: Math.round(fullMarketProfit),
    fullMarketMargin: Math.round(fullMarketMargin * 100) / 100,
  };
}
