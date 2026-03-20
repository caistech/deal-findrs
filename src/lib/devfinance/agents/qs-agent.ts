import { chat } from '../../ai/client';
import {
  QSReport,
  DevFinanceProject,
  TradeCategory,
  RiskLevel,
} from '../types';
import {
  calculateConstructionCost,
  generateDrawDown,
  analyseContingency,
} from '../costs';

// ─── QS Agent Tools ────────────────────────────────────────────

const QS_TOOLS = {
  extract_quantities: {
    name: 'extract_quantities',
    description: 'Extract quantities from unit mix and floor areas for cost estimation',
  },
  lookup_cost_rate: {
    name: 'lookup_cost_rate',
    description: 'Look up Rawlinsons-aligned cost rates for a specific trade, adjusted for region',
  },
  calculate_trade_costs: {
    name: 'calculate_trade_costs',
    description: 'Calculate all trade costs for the full unit mix with regional adjustments',
  },
  generate_draw_down: {
    name: 'generate_draw_down',
    description: 'Generate a draw-down schedule aligned to the construction program',
  },
  analyse_contingency: {
    name: 'analyse_contingency',
    description: 'Analyse contingency requirements based on project risk factors',
  },
  validate_costs: {
    name: 'validate_costs',
    description: 'Cross-check total costs against $/m² benchmarks for project type and location',
  },
};

// ─── Generate QS Report ────────────────────────────────────────

export async function generateQSReport(project: DevFinanceProject): Promise<QSReport> {
  const { opportunity, unitMix } = project;

  // Step 1: Calculate construction costs from unit mix
  const { categories, constructionSubtotal } = calculateConstructionCost(
    unitMix,
    opportunity.state,
    opportunity.city,
    'medium'
  );

  // Step 2: Risk-based contingency analysis
  const riskFactors: { factor: string; impact: RiskLevel }[] = [];

  if (opportunity.landStage === 'needs_rezoning') {
    riskFactors.push({ factor: 'Rezoning required', impact: 'high' });
  }
  if (!opportunity.hasFixedPriceConstruction) {
    riskFactors.push({ factor: 'No fixed-price construction contract', impact: 'medium' });
  }
  if (!opportunity.hasExperiencedPM) {
    riskFactors.push({ factor: 'No experienced project manager', impact: 'medium' });
  }
  if (opportunity.timeframeMonths > 18) {
    riskFactors.push({ factor: 'Extended construction program (>18 months)', impact: 'low' });
  }

  const contingency = analyseContingency(constructionSubtotal, riskFactors);

  // Step 3: Non-construction costs (estimated as % of construction)
  const professionalFees = Math.round(constructionSubtotal * 0.06);   // 6%
  const statutoryCosts = Math.round(constructionSubtotal * 0.03);     // 3%
  const financeCosts = Math.round(constructionSubtotal * 0.08);       // 8% (interest + fees)
  const salesCosts = Math.round(opportunity.avgSalePrice * (unitMix.reduce((s, u) => s + u.count, 0)) * 0.03); // 3% of GRV

  const totalDevelopmentCost = constructionSubtotal +
    contingency.riskAdjustedAmount +
    professionalFees +
    statutoryCosts +
    financeCosts +
    salesCosts +
    opportunity.landPurchasePrice;

  const totalUnits = unitMix.reduce((sum, u) => sum + u.count, 0);
  const totalFloorArea = unitMix.reduce((sum, u) => sum + (u.floorAreaSqm * u.count), 0);

  // Step 4: Draw-down schedule
  const drawDownSchedule = generateDrawDown(
    constructionSubtotal,
    project.constructionProgramMonths
  );

  // Step 5: AI review and commentary
  const aiReview = await reviewCostsWithAI(project, categories, constructionSubtotal, totalDevelopmentCost);

  // Apply any AI adjustments to categories if flagged
  const finalCategories = aiReview.adjustedCategories || categories;
  const finalConstructionSubtotal = aiReview.adjustedSubtotal || constructionSubtotal;

  return {
    id: crypto.randomUUID(),
    projectId: project.id,
    status: 'ai_generated',
    categories: finalCategories,
    constructionSubtotal: finalConstructionSubtotal,
    professionalFees,
    statutoryCosts,
    financeCosts,
    salesCosts,
    totalDevelopmentCost,
    costPerUnit: Math.round(totalDevelopmentCost / totalUnits),
    costPerSqm: Math.round(totalDevelopmentCost / totalFloorArea),
    contingency,
    drawDownSchedule,
    constructionProgramMonths: project.constructionProgramMonths,
    generatedAt: new Date().toISOString(),
    aiModelUsed: 'dealfindrs',
    version: 1,
  };
}

// ─── AI Review of Cost Estimate ────────────────────────────────

async function reviewCostsWithAI(
  project: DevFinanceProject,
  categories: TradeCategory[],
  constructionSubtotal: number,
  totalDevelopmentCost: number
): Promise<{
  adjustedCategories?: TradeCategory[];
  adjustedSubtotal?: number;
  commentary: string;
}> {
  const totalUnits = project.unitMix.reduce((s, u) => s + u.count, 0);
  const totalFloorArea = project.unitMix.reduce((s, u) => s + (u.floorAreaSqm * u.count), 0);

  const prompt = `You are a senior quantity surveyor reviewing an AI-generated cost estimate for an Australian residential development. Review the following estimate and identify any anomalies.

## Project
- Location: ${project.opportunity.address}, ${project.opportunity.city}, ${project.opportunity.state}
- Units: ${totalUnits} dwellings
- Total floor area: ${totalFloorArea} m²
- Unit mix: ${project.unitMix.map(u => `${u.code}: ${u.count}× ${u.floorAreaSqm}m² ${u.bedrooms}bed/${u.bathrooms}bath`).join(', ')}
- Construction program: ${project.constructionProgramMonths} months
- Builder: ${project.builderName}

## Cost Summary
- Construction subtotal: $${constructionSubtotal.toLocaleString()}
- Construction $/m²: $${Math.round(constructionSubtotal / totalFloorArea).toLocaleString()}
- TDC: $${totalDevelopmentCost.toLocaleString()}
- TDC per unit: $${Math.round(totalDevelopmentCost / totalUnits).toLocaleString()}

## Trade Breakdown
${categories.map(c => `### ${c.category}: $${c.subtotal.toLocaleString()}
${c.trades.map(t => `- ${t.trade}: ${t.quantity} ${t.unit} × $${t.rate} = $${t.total.toLocaleString()}`).join('\n')}`).join('\n\n')}

## Your Review
Respond in JSON with:
1. "anomalies": Array of trades where the rate or total seems incorrect, with suggested corrections
2. "commentary": A 2-3 sentence QS commentary on the overall estimate
3. "benchmarkCheck": Whether the $/m² is within expected range for this location and type

Respond ONLY with valid JSON.`;

  try {
    const response = await chat(
      [{ role: 'user', content: prompt }],
      { temperature: 0.2, metadata: { task: 'qs_review', project: project.opportunity.name } }
    );

    const cleaned = response.replace(/```json\n?|\n?```/g, '').trim();
    const review = JSON.parse(cleaned);

    return { commentary: review.commentary || '' };
  } catch {
    return { commentary: 'AI review unavailable — manual QS review required.' };
  }
}
