import { SensitivityScenario, CashFlowPeriod, DrawDownMilestone } from './types';

// ─── Sensitivity Analysis ──────────────────────────────────────

interface SensitivityInput {
  baseRevenue: number;
  baseCost: number;
  baseTimelineMonths: number;
  interestRate: number;         // annual rate as decimal e.g. 0.08
  minimumMarginPercent: number; // e.g. 0.15 for 15%
}

const DEFAULT_SCENARIOS: { name: string; revenue: number; cost: number; timeline: number }[] = [
  { name: 'Base Case', revenue: 1.0, cost: 1.0, timeline: 0 },
  { name: 'Revenue -5%', revenue: 0.95, cost: 1.0, timeline: 0 },
  { name: 'Revenue -10%', revenue: 0.90, cost: 1.0, timeline: 0 },
  { name: 'Revenue -15%', revenue: 0.85, cost: 1.0, timeline: 0 },
  { name: 'Cost +10%', revenue: 1.0, cost: 1.10, timeline: 0 },
  { name: 'Cost +15%', revenue: 1.0, cost: 1.15, timeline: 0 },
  { name: 'Cost +20%', revenue: 1.0, cost: 1.20, timeline: 0 },
  { name: 'Delay +3 months', revenue: 1.0, cost: 1.0, timeline: 3 },
  { name: 'Delay +6 months', revenue: 1.0, cost: 1.0, timeline: 6 },
  { name: 'Revenue -10% + Cost +10%', revenue: 0.90, cost: 1.10, timeline: 0 },
  { name: 'Revenue -10% + Cost +10% + 3mo delay', revenue: 0.90, cost: 1.10, timeline: 3 },
  { name: 'Worst Case (Rev -15%, Cost +20%, +6mo)', revenue: 0.85, cost: 1.20, timeline: 6 },
];

export function runSensitivityAnalysis(
  input: SensitivityInput,
  customScenarios?: typeof DEFAULT_SCENARIOS
): SensitivityScenario[] {
  const scenarios = customScenarios || DEFAULT_SCENARIOS;

  return scenarios.map(scenario => {
    const totalRevenue = Math.round(input.baseRevenue * scenario.revenue);
    const totalMonths = input.baseTimelineMonths + scenario.timeline;

    // Additional interest from timeline extension
    const additionalInterestCost = scenario.timeline > 0
      ? Math.round(input.baseCost * 0.65 * input.interestRate * (scenario.timeline / 12))
      : 0;

    const totalCost = Math.round(input.baseCost * scenario.cost) + additionalInterestCost;
    const profit = totalRevenue - totalCost;
    const profitMargin = totalRevenue > 0 ? profit / totalRevenue : 0;

    return {
      name: scenario.name,
      revenueAdjustment: scenario.revenue,
      costAdjustment: scenario.cost,
      timelineAdjustment: scenario.timeline,
      totalRevenue,
      totalCost,
      profit,
      profitMargin: Math.round(profitMargin * 10000) / 100, // as percentage
      isViable: profitMargin >= input.minimumMarginPercent,
    };
  });
}

// ─── Cash Flow Modelling ───────────────────────────────────────

interface CashFlowInput {
  landCost: number;
  constructionCost: number;
  otherCosts: number;        // professional fees, statutory, etc.
  totalRevenue: number;
  drawDown: DrawDownMilestone[];
  programMonths: number;
  salesStartMonth: number;   // when presales/settlements begin (relative to construction start)
  salesPeriodMonths: number; // over how many months revenue is received
  interestRate: number;      // annual
  loanAmount: number;
}

export function generateCashFlow(input: CashFlowInput): {
  periods: CashFlowPeriod[];
  peakDebt: number;
  peakDebtMonth: number;
  totalInterest: number;
} {
  const totalMonths = Math.max(input.programMonths, input.salesStartMonth + input.salesPeriodMonths) + 1;
  const monthlyRate = input.interestRate / 12;

  const periods: CashFlowPeriod[] = [];
  let cumulativeCash = 0;
  let debtBalance = 0;
  let totalInterest = 0;
  let peakDebt = 0;
  let peakDebtMonth = 0;

  // Land cost at month 0
  const landMonth = 0;

  // Spread other costs evenly across construction
  const monthlyOtherCost = input.otherCosts / input.programMonths;

  // Revenue spread across sales period
  const monthlyRevenue = input.salesPeriodMonths > 0
    ? input.totalRevenue / input.salesPeriodMonths
    : 0;

  for (let month = 0; month <= totalMonths; month++) {
    let costs = 0;
    let revenue = 0;
    let drawDown = 0;

    // Land cost at month 0
    if (month === landMonth) {
      costs += input.landCost;
    }

    // Construction draw-downs
    const milestone = input.drawDown.find(d => d.targetMonth === month);
    if (milestone) {
      costs += milestone.amount;
      drawDown = milestone.amount;
    }

    // Other costs during construction
    if (month > 0 && month <= input.programMonths) {
      costs += monthlyOtherCost;
    }

    // Revenue during sales period
    if (month >= input.salesStartMonth &&
        month < input.salesStartMonth + input.salesPeriodMonths) {
      revenue = monthlyRevenue;
    }

    // Interest on debt balance
    const interestCost = Math.round(debtBalance * monthlyRate);
    totalInterest += interestCost;
    costs += interestCost;

    // Net position
    const netCashFlow = revenue - costs;
    cumulativeCash += netCashFlow;

    // Update debt balance (simplified — costs increase debt, revenue reduces it)
    debtBalance = Math.max(0, debtBalance + costs - revenue);

    if (debtBalance > peakDebt) {
      peakDebt = debtBalance;
      peakDebtMonth = month;
    }

    periods.push({
      month,
      costs: Math.round(costs),
      revenue: Math.round(revenue),
      netCashFlow: Math.round(netCashFlow),
      cumulativeCashFlow: Math.round(cumulativeCash),
      drawDown: Math.round(drawDown),
      debtBalance: Math.round(debtBalance),
      interestCost: Math.round(interestCost),
    });
  }

  return {
    periods,
    peakDebt: Math.round(peakDebt),
    peakDebtMonth,
    totalInterest: Math.round(totalInterest),
  };
}

// ─── LTV Calculation ───────────────────────────────────────────

export function calculateLTV(
  loanAmount: number,
  grv: number
): { ltv: number; isAcceptable: boolean } {
  const ltv = grv > 0 ? Math.round((loanAmount / grv) * 10000) / 100 : 0;
  return {
    ltv,
    isAcceptable: ltv <= 65, // standard construction lending max LTV
  };
}
