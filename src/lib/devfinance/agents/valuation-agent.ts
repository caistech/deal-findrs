import { chat } from '../../ai/client';
import {
  ValuationReport,
  DevFinanceProject,
  ComparableSale,
  RiskLevel,
} from '../types';
import { calculatePSRV, buildUnitValuations, calculateGRV, assessMarketRisk } from '../revenue';

// ─── Generate Valuation Report ─────────────────────────────────

export async function generateValuationReport(
  project: DevFinanceProject,
  tdcExcludingLand: number,
  comparables?: ComparableSale[]
): Promise<ValuationReport> {
  const { opportunity, unitMix } = project;

  // Step 1: Get comparable sales (AI-assisted if none provided)
  const comps = comparables || await generateSyntheticComps(project);

  // Step 2: Build unit valuations from comps
  const unitValuations = buildUnitValuations(unitMix, comps);

  // Step 3: Calculate GRV
  const grv = calculateGRV(unitValuations);

  // Step 4: Calculate PRSV and soft equity
  const psrvResult = calculatePSRV(
    grv,
    tdcExcludingLand,
    opportunity.landPurchasePrice,
    0.20 // standard 20% target profit margin
  );

  // Step 5: Market risk assessment
  const totalUnits = unitMix.reduce((s, u) => s + u.count, 0);
  const estimatedAbsorption = Math.max(6, Math.ceil(totalUnits / 3)); // rough: 3 sales/month
  const { riskLevel, commentary } = assessMarketRisk(unitValuations, estimatedAbsorption);

  // Step 6: AI market commentary
  const aiCommentary = await generateMarketCommentary(project, unitValuations, grv, psrvResult);

  return {
    id: crypto.randomUUID(),
    projectId: project.id,
    status: 'ai_generated',
    unitValuations,
    grossRealisableValue: grv,
    totalDevelopmentCost: psrvResult.totalDevelopmentCost,
    targetProfitMargin: 0.20,
    projectSiteRelatedValue: psrvResult.projectSiteRelatedValue,
    landPurchasePrice: opportunity.landPurchasePrice,
    softEquity: psrvResult.softEquity,
    marketCommentary: aiCommentary || commentary,
    absorptionRateMonths: estimatedAbsorption,
    marketRiskLevel: riskLevel,
    generatedAt: new Date().toISOString(),
    aiModelUsed: 'dealfindrs',
    version: 1,
  };
}

// ─── Synthetic Comparable Sales (when no real data available) ──

async function generateSyntheticComps(
  project: DevFinanceProject
): Promise<ComparableSale[]> {
  const { opportunity, unitMix } = project;

  const prompt = `You are a property valuer generating realistic comparable sales data for an Australian residential development valuation.

## Subject Property
- Address: ${opportunity.address}, ${opportunity.city}, ${opportunity.state}
- Product: ${unitMix.map(u => `${u.count}× ${u.bedrooms}bed/${u.bathrooms}bath, ${u.floorAreaSqm}m²`).join('; ')}
- Developer's expected sale price: $${opportunity.avgSalePrice.toLocaleString()} per unit

## Task
Generate 8-12 realistic comparable sales from the surrounding area (within 10km).
Each comparable should reflect actual market conditions for this location.
Mix recent sales (within 6 months) with older ones (up to 12 months).

Respond with a JSON array where each item has:
- "address": string (realistic street address in the area)
- "suburb": string
- "salePrice": number
- "saleDate": string (ISO date, within last 12 months)
- "landAreaSqm": number
- "floorAreaSqm": number
- "bedrooms": number
- "bathrooms": number
- "parking": number
- "distanceKm": number (from subject property)
- "pricePerSqm": number (salePrice / floorAreaSqm)
- "adjustedPrice": number (adjusted for time and condition)
- "adjustmentNotes": string
- "source": "AI_generated"
- "relevanceScore": number (0-1)

IMPORTANT: These are AI-generated estimates for draft purposes. The registered valuer must replace these with verified sales data before sign-off.

Respond ONLY with valid JSON array.`;

  try {
    const response = await chat(
      [{ role: 'user', content: prompt }],
      { temperature: 0.4, maxTokens: 4096, metadata: { task: 'valuation_comps', project: opportunity.name } }
    );

    const cleaned = response.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(cleaned) as ComparableSale[];
  } catch {
    // Return minimal placeholder comps based on developer's expected pricing
    return generatePlaceholderComps(project);
  }
}

function generatePlaceholderComps(project: DevFinanceProject): ComparableSale[] {
  const { opportunity } = project;
  const basePrice = opportunity.avgSalePrice;
  const avgFloorArea = project.unitMix.reduce((s, u) => s + u.floorAreaSqm, 0) / project.unitMix.length;

  // Generate 6 placeholder comps with variance around developer's expected price
  const variances = [-0.08, -0.04, -0.02, 0.02, 0.05, 0.08];

  return variances.map((v, i) => {
    const price = Math.round(basePrice * (1 + v));
    const area = Math.round(avgFloorArea * (0.9 + Math.random() * 0.2));

    return {
      address: `${10 + i * 2} Comparable Street`,
      suburb: opportunity.city,
      salePrice: price,
      saleDate: new Date(Date.now() - (i + 1) * 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      landAreaSqm: 300 + Math.round(Math.random() * 200),
      floorAreaSqm: area,
      bedrooms: 3,
      bathrooms: 2,
      parking: 1,
      distanceKm: 1 + i * 1.5,
      pricePerSqm: Math.round(price / area),
      adjustedPrice: price,
      adjustmentNotes: 'AI-generated placeholder — requires verification by registered valuer',
      source: 'AI_generated',
      relevanceScore: Math.max(0.3, 0.9 - i * 0.1),
    };
  });
}

// ─── AI Market Commentary ──────────────────────────────────────

async function generateMarketCommentary(
  project: DevFinanceProject,
  unitValuations: { unitType: string; marketValuePerUnit: number; confidenceLevel: number }[],
  grv: number,
  psrvResult: { projectSiteRelatedValue: number; softEquity: number; targetProfit: number }
): Promise<string> {
  const prompt = `You are a registered property valuer writing a market commentary for a construction loan valuation report.

## Project
- Location: ${project.opportunity.address}, ${project.opportunity.city}, ${project.opportunity.state}
- Product: ${project.unitMix.map(u => `${u.count}× ${u.code} (${u.bedrooms}bed, ${u.floorAreaSqm}m²)`).join(', ')}

## Valuation Summary
- GRV: $${grv.toLocaleString()}
- PRSV: $${psrvResult.projectSiteRelatedValue.toLocaleString()}
- Soft Equity: $${psrvResult.softEquity.toLocaleString()}
- Target Profit (20%): $${psrvResult.targetProfit.toLocaleString()}

## Unit Valuations
${unitValuations.map(uv => `- ${uv.unitType}: $${uv.marketValuePerUnit.toLocaleString()} (confidence: ${(uv.confidenceLevel * 100).toFixed(0)}%)`).join('\n')}

Write a 3-4 sentence market commentary suitable for a lender valuation report. Be factual, reference the local market, note any risks, and comment on the GRV achievability. Write in third person, professional tone.

Respond with plain text only, no JSON.`;

  try {
    const response = await chat(
      [{ role: 'user', content: prompt }],
      { temperature: 0.3, metadata: { task: 'valuation_commentary', project: project.opportunity.name } }
    );
    return response.trim();
  } catch {
    return 'Market commentary unavailable — registered valuer to provide independent assessment.';
  }
}
