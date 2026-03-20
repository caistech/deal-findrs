import { chat } from '../../ai/client';
import {
  AffordableGapAnalysis,
  DevFinanceProject,
  QSReport,
  ValuationReport,
} from '../types';
import {
  estimateCHPMaxPrice,
  calculateAffordableGap,
  modelBridgingScenarios,
  calculateBlendedFeasibility,
} from '../affordable';

// ─── Generate Affordable Gap Analysis ──────────────────────────

export async function generateAffordableAnalysis(
  project: DevFinanceProject,
  qsReport: QSReport,
  valuationReport: ValuationReport,
  affordableConfig: {
    affordableUnits: number;
    chpMaxPrice?: number;       // if known (e.g. from CHP feedback)
    marketRentWeekly?: number;  // if known, to calculate CHP max
    minimumMarginPercent: number;
  }
): Promise<AffordableGapAnalysis> {
  const totalUnits = project.unitMix.reduce((s, u) => s + u.count, 0);
  const marketUnits = totalUnits - affordableConfig.affordableUnits;
  const marketPricePerUnit = Math.round(valuationReport.grossRealisableValue / totalUnits);
  const tdcPerUnit = Math.round(qsReport.totalDevelopmentCost / totalUnits);

  // Step 1: Determine CHP max price
  let chpMaxPrice: number;
  if (affordableConfig.chpMaxPrice) {
    chpMaxPrice = affordableConfig.chpMaxPrice;
  } else if (affordableConfig.marketRentWeekly) {
    chpMaxPrice = estimateCHPMaxPrice(affordableConfig.marketRentWeekly);
  } else {
    // Default: assume 70% of market value (typical CHP ceiling)
    chpMaxPrice = Math.round(marketPricePerUnit * 0.70);
  }

  // Step 2: Calculate the gap
  const gap = calculateAffordableGap(
    marketPricePerUnit,
    chpMaxPrice,
    affordableConfig.affordableUnits
  );

  // Step 3: Model bridging scenarios
  const scenarios = modelBridgingScenarios({
    marketPricePerUnit,
    chpMaxPrice,
    gapPerUnit: gap.gapPerUnit,
    affordableUnits: affordableConfig.affordableUnits,
    totalUnits,
    tdcPerUnit,
    minimumMarginPercent: affordableConfig.minimumMarginPercent,
  });

  // Step 4: Blended feasibility comparison
  const blended = calculateBlendedFeasibility(
    marketUnits,
    marketPricePerUnit,
    affordableConfig.affordableUnits,
    chpMaxPrice,
    tdcPerUnit
  );

  // Step 5: AI policy commentary
  const policyCommentary = await generatePolicyCommentary(
    project,
    gap,
    scenarios,
    blended
  );

  // Step 6: Recommend best scenario
  const viableScenarios = scenarios.filter(s => s.isViable);
  const recommended = viableScenarios.length > 0
    ? viableScenarios.reduce((best, s) =>
        s.totalSubsidy < best.totalSubsidy ? s : best
      ).mechanism
    : undefined;

  return {
    id: crypto.randomUUID(),
    projectId: project.id,
    status: 'ai_generated',

    totalUnits,
    affordableUnits: affordableConfig.affordableUnits,
    affordablePercent: Math.round((affordableConfig.affordableUnits / totalUnits) * 10000) / 100,

    marketPricePerUnit,
    chpMaxPrice,
    chpDiscountPercent: gap.discountPercent,
    gapPerUnit: gap.gapPerUnit,
    totalGap: gap.totalGap,

    scenarios,
    recommendedScenario: recommended,

    blendedGRV: blended.blendedGRV,
    blendedProfit: blended.blendedProfit,
    blendedMargin: blended.blendedMargin,
    isBlendedViable: blended.blendedMargin >= affordableConfig.minimumMarginPercent * 100,

    fullMarketGRV: blended.fullMarketGRV,
    fullMarketProfit: blended.fullMarketProfit,
    fullMarketMargin: blended.fullMarketMargin,

    policyCommentary,

    generatedAt: new Date().toISOString(),
    aiModelUsed: 'dealfindrs',
    version: 1,
  };
}

// ─── AI Policy Commentary ──────────────────────────────────────

async function generatePolicyCommentary(
  project: DevFinanceProject,
  gap: { gapPerUnit: number; totalGap: number; discountPercent: number },
  scenarios: { mechanism: string; label: string; isViable: boolean; totalSubsidy: number }[],
  blended: { blendedMargin: number; fullMarketMargin: number }
): Promise<string> {
  const viableCount = scenarios.filter(s => s.isViable).length;

  const prompt = `You are a housing policy analyst writing a commentary on the affordable housing gap for a private residential development in Australia.

## Project
- Location: ${project.opportunity.address}, ${project.opportunity.city}, ${project.opportunity.state}
- Total dwellings: ${project.unitMix.reduce((s, u) => s + u.count, 0)}
- Proposed affordable: ${gap.totalGap > 0 ? 'Yes' : 'N/A'}

## The Gap
- Market price per dwelling: $${(gap.gapPerUnit + gap.totalGap / (gap.totalGap / gap.gapPerUnit || 1)).toLocaleString()} (approx)
- CHP discount required: ${gap.discountPercent.toFixed(1)}%
- Gap per dwelling: $${gap.gapPerUnit.toLocaleString()}
- Total gap: $${gap.totalGap.toLocaleString()}

## Bridging Scenarios Modelled
${scenarios.map(s => `- ${s.label}: ${s.isViable ? 'VIABLE' : 'Not viable'} — subsidy $${s.totalSubsidy.toLocaleString()}`).join('\n')}

## Feasibility Impact
- Full market margin: ${blended.fullMarketMargin.toFixed(1)}%
- Blended margin (with affordable at CHP price): ${blended.blendedMargin.toFixed(1)}%

## Task
Write a 4-5 sentence policy commentary suitable for inclusion in a government submission or lender pack. Cover:
1. The structural nature of the gap (not project-specific failure)
2. Which mechanisms are most practical for this jurisdiction
3. The consequence of no intervention (affordable homes not delivered)
4. The multiplier effect (model validated here can scale)

Write in third person, professional policy tone. Plain text only.`;

  try {
    const response = await chat(
      [{ role: 'user', content: prompt }],
      { temperature: 0.3, metadata: { task: 'affordable_policy', project: project.opportunity.name } }
    );
    return response.trim();
  } catch {
    return `The affordable housing component requires a bridging mechanism of $${gap.totalGap.toLocaleString()} to close the gap between commercial pricing and CHP acquisition capacity. ${viableCount} of ${scenarios.length} modelled mechanisms are viable. Without government intervention, the development will proceed at full market pricing and the affordable housing dividend will not be realised.`;
  }
}
