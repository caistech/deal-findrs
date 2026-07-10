import { chat } from '../../ai/client';
import {
  FeasibilityStudy,
  DevFinanceProject,
  QSReport,
  ValuationReport,
  RiskLevel,
} from '../types';
import { runSensitivityAnalysis, generateCashFlow, calculateLTV } from '../sensitivity';
import { recallPlanningRisk } from '../planningMemoryEnrich';

// ─── Generate Feasibility Study ────────────────────────────────

export async function generateFeasibilityStudy(
  project: DevFinanceProject,
  qsReport: QSReport,
  valuationReport: ValuationReport,
  financeParams: {
    interestRate: number;     // annual, e.g. 0.085 for 8.5%
    loanTermMonths: number;
    ltvTarget: number;        // e.g. 0.65
    salesStartMonth: number;  // when settlements begin
    salesPeriodMonths: number;
    /** Demand-backed take-up fractions per month (Phase 3c-D) — overrides the even revenue spread. */
    salesProfile?: number[];
  }
): Promise<FeasibilityStudy> {
  // ─── Revenue (from Valuation module) ─────────────
  const grv = valuationReport.grossRealisableValue;
  const salesCosts = qsReport.salesCosts;
  const nrv = grv - salesCosts;

  // ─── Costs (from QS module) ──────────────────────
  const landCost = project.opportunity.landPurchasePrice;
  const constructionCost = qsReport.constructionSubtotal;
  const professionalFees = qsReport.professionalFees;
  const statutoryCosts = qsReport.statutoryCosts;
  const contingency = qsReport.contingency.riskAdjustedAmount;

  // Finance costs calculated from cash flow
  const loanAmount = Math.round(grv * financeParams.ltvTarget);

  const cashFlowResult = generateCashFlow({
    landCost,
    constructionCost,
    otherCosts: professionalFees + statutoryCosts,
    totalRevenue: grv,
    drawDown: qsReport.drawDownSchedule,
    programMonths: qsReport.constructionProgramMonths,
    salesStartMonth: financeParams.salesStartMonth,
    salesPeriodMonths: financeParams.salesPeriodMonths,
    salesProfile: financeParams.salesProfile,
    interestRate: financeParams.interestRate,
    loanAmount,
  });

  const financeCosts = cashFlowResult.totalInterest;

  const tdc = landCost + constructionCost + professionalFees +
    statutoryCosts + financeCosts + contingency + salesCosts;

  // ─── Returns ─────────────────────────────────────
  const profit = grv - tdc;
  const profitOnCost = tdc > 0 ? (profit / tdc) * 100 : 0;
  const profitOnGRV = grv > 0 ? (profit / grv) * 100 : 0;
  const profitMargin = grv > 0 ? (profit / grv) * 100 : 0;

  // ─── LTV ─────────────────────────────────────────
  const { ltv } = calculateLTV(loanAmount, grv);

  // ─── Sensitivity ─────────────────────────────────
  const sensitivityScenarios = runSensitivityAnalysis({
    baseRevenue: grv,
    baseCost: tdc,
    baseTimelineMonths: qsReport.constructionProgramMonths,
    interestRate: financeParams.interestRate,
    minimumMarginPercent: 0.15,
  });

  // ─── Risk Matrix ─────────────────────────────────
  const risks = await buildRiskMatrix(project, valuationReport, qsReport);

  return {
    id: crypto.randomUUID(),
    projectId: project.id,
    status: 'ai_generated',

    // Revenue
    grossRealisableValue: grv,
    lessSalesCosts: salesCosts,
    netRealisableValue: nrv,

    // Costs
    landCost,
    constructionCost,
    professionalFees,
    statutoryCosts,
    financeCosts,
    contingency,
    totalDevelopmentCost: tdc,

    // Returns
    developmentProfit: Math.round(profit),
    profitOnCost: Math.round(profitOnCost * 100) / 100,
    profitOnGRV: Math.round(profitOnGRV * 100) / 100,
    profitMargin: Math.round(profitMargin * 100) / 100,

    // PRSV & equity
    prsv: valuationReport.projectSiteRelatedValue,
    softEquity: valuationReport.softEquity,
    cashEquityRequired: Math.max(0, tdc - loanAmount - valuationReport.softEquity),

    // Finance
    loanToValueRatio: ltv,
    interestRate: financeParams.interestRate,
    loanTerm: financeParams.loanTermMonths,
    totalInterest: financeCosts,

    // Cash flow
    cashFlow: cashFlowResult.periods,
    peakDebt: cashFlowResult.peakDebt,
    peakDebtMonth: cashFlowResult.peakDebtMonth,

    // Sensitivity & risk
    sensitivityScenarios,
    risks,

    generatedAt: new Date().toISOString(),
    aiModelUsed: 'dealfindrs',
    version: 1,
  };
}

// ─── Risk Matrix Builder ───────────────────────────────────────

/**
 * Distil the opportunity into a short development-type phrase used to focus the planning-memory
 * recall query (e.g. "land subdivision", "residential redevelopment"). Kept generic + PII-free —
 * it only shapes the semantic search, it is not stored.
 */
function deriveDevelopmentType(opp: DevFinanceProject['opportunity']): string {
  if (opp.landStage === 'needs_rezoning') return 'rezoning and residential development';
  if (opp.landStage === 'redevelopment') return 'residential redevelopment';
  if ((opp.numLots ?? 0) > 1 && (opp.numDwellings ?? 0) <= (opp.numLots ?? 0)) {
    return 'land subdivision';
  }
  if ((opp.numDwellings ?? 0) > 1) return 'multi-dwelling residential development';
  return 'residential development';
}

async function buildRiskMatrix(
  project: DevFinanceProject,
  valuation: ValuationReport,
  qs: QSReport
): Promise<FeasibilityStudy['risks']> {
  const risks: FeasibilityStudy['risks'] = [];

  // Market risks
  risks.push({
    category: 'Market',
    risk: 'Revenue below GRV projections',
    likelihood: valuation.marketRiskLevel,
    impact: 'high' as RiskLevel,
    mitigation: 'Presales targets, conservative pricing, sensitivity tested at -10% and -15%',
  });

  risks.push({
    category: 'Market',
    risk: 'Extended absorption period',
    likelihood: valuation.absorptionRateMonths > 12 ? 'medium' : 'low',
    impact: 'medium' as RiskLevel,
    mitigation: 'Sales and marketing strategy, staged release, rental fallback',
  });

  // Construction risks
  risks.push({
    category: 'Construction',
    risk: 'Cost overruns exceeding contingency',
    likelihood: project.opportunity.hasFixedPriceConstruction ? 'low' : 'medium',
    impact: 'high' as RiskLevel,
    mitigation: project.opportunity.hasFixedPriceConstruction
      ? 'Fixed-price construction contract in place'
      : 'QS cost monitoring, progress claims against milestones, contingency allowance',
  });

  risks.push({
    category: 'Construction',
    risk: 'Builder insolvency or default',
    likelihood: 'low' as RiskLevel,
    impact: 'critical' as RiskLevel,
    mitigation: 'Builder financial due diligence, progress payment structure, performance guarantees',
  });

  risks.push({
    category: 'Construction',
    risk: 'Timeline delays',
    likelihood: qs.constructionProgramMonths > 15 ? 'medium' : 'low',
    impact: 'medium' as RiskLevel,
    mitigation: 'Experienced PM, milestone-based program, sensitivity tested at +3 and +6 months',
  });

  // Finance risks
  risks.push({
    category: 'Finance',
    risk: 'Interest rate increases during construction',
    likelihood: 'medium' as RiskLevel,
    impact: 'low' as RiskLevel,
    mitigation: 'Interest rate buffer in feasibility, short construction program limits exposure',
  });

  risks.push({
    category: 'Finance',
    risk: 'Funding shortfall during construction',
    likelihood: 'low' as RiskLevel,
    impact: 'critical' as RiskLevel,
    mitigation: 'QS cost-to-complete monitoring, draw-down schedule, contingency reserves',
  });

  // Timeline risks — enriched with distilled prior planning conclusions for the site's
  // jurisdiction (the shared @caistech/planning-memory experiential leg). Fail-soft: returns []
  // when Mnemo is off or the state shelf is empty, leaving the generic mitigation unchanged.
  // Recalled conclusions are SUPPORTING context, never a citation (DATA_STANDARD D1/D2) — the
  // authoritative planning source stays property-services + the RAG Code.
  const planningConclusions = await recallPlanningRisk(
    project.opportunity.state,
    deriveDevelopmentType(project.opportunity),
  );

  let planningMitigation = project.opportunity.hasDAApproval
    ? 'DA approved — no further planning risk'
    : 'Allow for planning process timeline, engage planning consultant early';

  if (planningConclusions.length > 0) {
    const state = project.opportunity.state.trim();
    planningMitigation +=
      `. Prior resolved analysis for ${state} (supporting context — re-verify, not authoritative): ` +
      planningConclusions.join(' | ');
  }

  risks.push({
    category: 'Timeline',
    risk: 'Planning or approval delays',
    likelihood: project.opportunity.hasDAApproval ? 'low' : 'high',
    impact: 'medium' as RiskLevel,
    mitigation: planningMitigation,
  });

  return risks;
}
