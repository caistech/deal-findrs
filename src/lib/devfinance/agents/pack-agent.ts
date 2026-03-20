import { chat } from '../../ai/client';
import {
  DevFinancePack,
  DevFinanceProject,
  QSReport,
  ValuationReport,
  FeasibilityStudy,
  AffordableGapAnalysis,
} from '../types';

// ─── Generate Combined Finance Pack ────────────────────────────

export async function generateFinancePack(
  project: DevFinanceProject,
  qsReport: QSReport,
  valuationReport: ValuationReport,
  feasibilityStudy: FeasibilityStudy,
  affordableGapAnalysis?: AffordableGapAnalysis
): Promise<DevFinancePack> {
  // Generate executive summary from all modules
  const executiveSummary = await generateExecutiveSummary(
    project,
    qsReport,
    valuationReport,
    feasibilityStudy,
    affordableGapAnalysis
  );

  return {
    id: crypto.randomUUID(),
    projectId: project.id,
    project,
    qsReport,
    valuationReport,
    feasibilityStudy,
    affordableGapAnalysis,
    executiveSummary,
    keyMetrics: {
      grv: valuationReport.grossRealisableValue,
      tdc: feasibilityStudy.totalDevelopmentCost,
      profit: feasibilityStudy.developmentProfit,
      margin: feasibilityStudy.profitMargin,
      prsv: valuationReport.projectSiteRelatedValue,
      softEquity: valuationReport.softEquity,
      ltv: feasibilityStudy.loanToValueRatio,
      peakDebt: feasibilityStudy.peakDebt,
    },
    generatedAt: new Date().toISOString(),
    version: 1,
  };
}

// ─── Executive Summary Generator ───────────────────────────────

async function generateExecutiveSummary(
  project: DevFinanceProject,
  qs: QSReport,
  val: ValuationReport,
  feas: FeasibilityStudy,
  afford?: AffordableGapAnalysis
): Promise<string> {
  const totalUnits = project.unitMix.reduce((s, u) => s + u.count, 0);

  const prompt = `You are a development finance analyst writing an executive summary for a construction loan submission pack. This summary sits at the front of the document and must give the lender a clear, concise overview.

## Project
- Name: ${project.opportunity.name}
- Address: ${project.opportunity.address}, ${project.opportunity.city}, ${project.opportunity.state}
- Developer: (as per submission)
- Builder: ${project.builderName}
- Product: ${totalUnits} dwellings — ${project.unitMix.map(u => `${u.count}× ${u.code} (${u.bedrooms}bed, ${u.floorAreaSqm}m²)`).join(', ')}
- Construction program: ${qs.constructionProgramMonths} months

## Key Metrics
- GRV: $${val.grossRealisableValue.toLocaleString()}
- TDC: $${feas.totalDevelopmentCost.toLocaleString()}
- Development Profit: $${feas.developmentProfit.toLocaleString()} (${feas.profitMargin.toFixed(1)}% on GRV)
- Profit on Cost: ${feas.profitOnCost.toFixed(1)}%
- PRSV: $${val.projectSiteRelatedValue.toLocaleString()}
- Soft Equity: $${val.softEquity.toLocaleString()}
- LTV: ${feas.loanToValueRatio.toFixed(1)}%
- Peak Debt: $${feas.peakDebt.toLocaleString()} (month ${feas.peakDebtMonth})
- Construction Cost/m²: $${qs.costPerSqm.toLocaleString()}
- Market Risk: ${val.marketRiskLevel}

## Sensitivity
- Base case viable: ${feas.sensitivityScenarios[0]?.isViable ? 'Yes' : 'No'}
- Worst case viable: ${feas.sensitivityScenarios[feas.sensitivityScenarios.length - 1]?.isViable ? 'Yes' : 'No'}
- Scenarios tested: ${feas.sensitivityScenarios.length}

${afford ? `## Affordable Housing Component
- ${afford.affordableUnits} of ${afford.totalUnits} dwellings (${afford.affordablePercent}%)
- Gap per unit: $${afford.gapPerUnit.toLocaleString()}
- Total gap: $${afford.totalGap.toLocaleString()}
- Recommended mechanism: ${afford.recommendedScenario || 'Under review'}` : ''}

## Task
Write a 6-8 sentence executive summary for the lender submission pack. Cover:
1. Project overview (what, where, who)
2. Financial viability (profit margin, returns)
3. Cost confidence (QS-verified, contingency approach)
4. Market support (GRV basis, absorption)
5. Risk position (key risks and mitigations)
6. Lending proposition (LTV, equity position, soft equity)
${afford ? '7. Affordable housing component (brief mention)' : ''}

Professional, factual tone. No marketing language. Reference specific numbers.
Respond with plain text only.`;

  try {
    const response = await chat(
      [{ role: 'user', content: prompt }],
      { temperature: 0.2, maxTokens: 2048, metadata: { task: 'executive_summary', project: project.opportunity.name } }
    );
    return response.trim();
  } catch {
    return `${project.opportunity.name} is a ${totalUnits}-dwelling residential development at ${project.opportunity.address}, ${project.opportunity.city}. The project has a Gross Realisable Value of $${val.grossRealisableValue.toLocaleString()} against Total Development Costs of $${feas.totalDevelopmentCost.toLocaleString()}, delivering a development profit of $${feas.developmentProfit.toLocaleString()} (${feas.profitMargin.toFixed(1)}% margin on GRV). Construction costs have been independently estimated at $${qs.costPerSqm.toLocaleString()}/m² with a risk-adjusted contingency of ${qs.contingency.riskAdjustedPercent.toFixed(1)}%. The project generates soft equity of $${val.softEquity.toLocaleString()} and requires a peak debt facility of $${feas.peakDebt.toLocaleString()} at an LTV of ${feas.loanToValueRatio.toFixed(1)}%.`;
  }
}
