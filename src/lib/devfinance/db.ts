import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  DevFinanceProject,
  UnitType,
  QSReport,
  TradeItem,
  ValuationReport,
  ComparableSale,
  UnitValuation,
  FeasibilityStudy,
  AffordableGapAnalysis,
  BridgingScenario,
  DevFinancePack,
  ModuleStatus,
} from './types';

// ─── Supabase Admin Client ─────────────────────────────────────

let _db: SupabaseClient | null = null;

function db(): SupabaseClient {
  if (!_db) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('Supabase credentials not configured');
    _db = createClient(url, key);
  }
  return _db;
}

// ─── DevFinance Projects ───────────────────────────────────────

export async function createDevFinanceProject(
  opportunityId: string,
  companyId: string,
  data: {
    builderName: string;
    builderABN?: string;
    constructionProgramMonths: number;
    unitMix: UnitType[];
    financeParams?: {
      interestRate?: number;
      loanTermMonths?: number;
      ltvTarget?: number;
      salesStartMonth?: number;
      salesPeriodMonths?: number;
    };
    createdBy?: string;
  }
): Promise<DevFinanceProject> {
  // Insert project
  const { data: project, error } = await db()
    .from('devfinance_projects')
    .insert({
      opportunity_id: opportunityId,
      company_id: companyId,
      builder_name: data.builderName,
      builder_abn: data.builderABN || null,
      construction_program_months: data.constructionProgramMonths,
      interest_rate: data.financeParams?.interestRate || null,
      loan_term_months: data.financeParams?.loanTermMonths || null,
      ltv_target: data.financeParams?.ltvTarget || null,
      sales_start_month: data.financeParams?.salesStartMonth || null,
      sales_period_months: data.financeParams?.salesPeriodMonths || null,
      created_by: data.createdBy || null,
    } as any)
    .select()
    .single();

  if (error) throw new Error(`Failed to create DevFinance project: ${error.message}`);

  // Insert unit mix
  if (data.unitMix.length > 0) {
    const unitRows = data.unitMix.map((u, i) => ({
      project_id: project.id,
      code: u.code,
      name: u.name,
      count: u.count,
      floor_area_sqm: u.floorAreaSqm,
      bedrooms: u.bedrooms,
      bathrooms: u.bathrooms,
      parking: u.parking,
      sort_order: i,
    }));

    const { error: unitError } = await db()
      .from('devfinance_unit_mix')
      .insert(unitRows as any);

    if (unitError) throw new Error(`Failed to insert unit mix: ${unitError.message}`);
  }

  return await getDevFinanceProject(project.id);
}

export async function getDevFinanceProject(projectId: string): Promise<DevFinanceProject> {
  const { data: project, error } = await db()
    .from('devfinance_projects')
    .select('*')
    .eq('id', projectId)
    .single();

  if (error) throw new Error(`Project not found: ${error.message}`);

  // Get unit mix
  const { data: units } = await db()
    .from('devfinance_unit_mix')
    .select('*')
    .eq('project_id', projectId)
    .order('sort_order');

  // Get opportunity data
  const { data: opportunity } = await db()
    .from('opportunities')
    .select('*')
    .eq('id', project.opportunity_id)
    .single();

  const unitMix: UnitType[] = (units || []).map((u: any) => ({
    code: u.code,
    name: u.name,
    count: u.count,
    floorAreaSqm: Number(u.floor_area_sqm),
    bedrooms: u.bedrooms,
    bathrooms: u.bathrooms,
    parking: u.parking,
  }));

  return {
    id: project.id,
    opportunityId: project.opportunity_id,
    opportunity: mapOpportunityRow(opportunity),
    financials: calculateFinancialsFromOpp(opportunity),
    unitMix,
    constructionProgramMonths: project.construction_program_months,
    builderName: project.builder_name,
    builderABN: project.builder_abn,
    qsStatus: project.qs_status,
    valuationStatus: project.valuation_status,
    feasibilityStatus: project.feasibility_status,
    affordableStatus: project.affordable_status,
    createdAt: project.created_at,
    updatedAt: project.updated_at,
    createdBy: project.created_by,
  };
}

export async function getDevFinanceProjectByOpportunity(opportunityId: string): Promise<DevFinanceProject | null> {
  const { data: project } = await db()
    .from('devfinance_projects')
    .select('id')
    .eq('opportunity_id', opportunityId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!project) return null;
  return getDevFinanceProject(project.id);
}

export async function listDevFinanceProjects(companyId: string): Promise<any[]> {
  const { data, error } = await db()
    .from('devfinance_projects')
    .select(`
      *,
      opportunities!inner(name, address, city, state, rag_status)
    `)
    .eq('company_id', companyId)
    .order('updated_at', { ascending: false });

  if (error) throw new Error(`Failed to list projects: ${error.message}`);
  return data || [];
}

// ─── QS Reports ────────────────────────────────────────────────

export async function saveQSReport(report: QSReport): Promise<QSReport> {
  // Get latest version
  const { data: latest } = await db()
    .from('qs_reports')
    .select('version')
    .eq('project_id', report.projectId)
    .order('version', { ascending: false })
    .limit(1)
    .single();

  const version = (latest?.version || 0) + 1;

  // Insert report
  const { data: row, error } = await db()
    .from('qs_reports')
    .insert({
      project_id: report.projectId,
      status: report.status,
      version,
      construction_subtotal: report.constructionSubtotal,
      professional_fees: report.professionalFees,
      statutory_costs: report.statutoryCosts,
      finance_costs: report.financeCosts,
      sales_costs: report.salesCosts,
      total_development_cost: report.totalDevelopmentCost,
      cost_per_unit: report.costPerUnit,
      cost_per_sqm: report.costPerSqm,
      base_contingency_pct: report.contingency.baseContingencyPercent,
      base_contingency_amount: report.contingency.baseContingencyAmount,
      risk_adjusted_contingency_pct: report.contingency.riskAdjustedPercent,
      risk_adjusted_contingency_amount: report.contingency.riskAdjustedAmount,
      contingency_risk_factors: report.contingency.riskFactors,
      draw_down_schedule: report.drawDownSchedule,
      construction_program_months: report.constructionProgramMonths,
      ai_model_used: report.aiModelUsed,
      qs_firm: report.qsFirm || null,
      qs_name: report.qsName || null,
      qs_registration: report.qsRegistration || null,
      signed_off_at: report.signedOffAt || null,
    } as any)
    .select()
    .single();

  if (error) throw new Error(`Failed to save QS report: ${error.message}`);

  // Insert trade items
  const tradeRows: any[] = [];
  let sortOrder = 0;
  for (const category of report.categories) {
    for (const trade of category.trades) {
      tradeRows.push({
        qs_report_id: row.id,
        category: category.category,
        trade: trade.trade,
        description: trade.description,
        quantity: trade.quantity,
        unit: trade.unit,
        rate: trade.rate,
        total: trade.total,
        source: trade.source,
        confidence: trade.confidence,
        sort_order: sortOrder++,
      });
    }
  }

  if (tradeRows.length > 0) {
    const { error: tradeError } = await db()
      .from('qs_trade_items')
      .insert(tradeRows);

    if (tradeError) throw new Error(`Failed to save trade items: ${tradeError.message}`);
  }

  // Update project status
  await db()
    .from('devfinance_projects')
    .update({ qs_status: report.status, updated_at: new Date().toISOString() } as any)
    .eq('id', report.projectId);

  return { ...report, id: row.id, version };
}

export async function getQSReport(projectId: string, version?: number): Promise<QSReport | null> {
  let query = db()
    .from('qs_reports')
    .select('*')
    .eq('project_id', projectId);

  if (version) {
    query = query.eq('version', version);
  } else {
    query = query.order('version', { ascending: false }).limit(1);
  }

  const { data: row } = await query.single();
  if (!row) return null;

  // Get trade items
  const { data: trades } = await db()
    .from('qs_trade_items')
    .select('*')
    .eq('qs_report_id', row.id)
    .order('sort_order');

  return mapQSReportRow(row, trades || []);
}

// ─── Valuation Reports ─────────────────────────────────────────

export async function saveValuationReport(report: ValuationReport): Promise<ValuationReport> {
  const { data: latest } = await db()
    .from('valuation_reports')
    .select('version')
    .eq('project_id', report.projectId)
    .order('version', { ascending: false })
    .limit(1)
    .single();

  const version = (latest?.version || 0) + 1;

  const { data: row, error } = await db()
    .from('valuation_reports')
    .insert({
      project_id: report.projectId,
      status: report.status,
      version,
      gross_realisable_value: report.grossRealisableValue,
      tdc_excluding_land: report.totalDevelopmentCost - report.landPurchasePrice,
      target_profit_margin: report.targetProfitMargin,
      project_site_related_value: report.projectSiteRelatedValue,
      land_purchase_price: report.landPurchasePrice,
      soft_equity: report.softEquity,
      market_commentary: report.marketCommentary,
      absorption_rate_months: report.absorptionRateMonths,
      market_risk_level: report.marketRiskLevel,
      ai_model_used: report.aiModelUsed,
      valuer_firm: report.valuerFirm || null,
      valuer_name: report.valuerName || null,
      valuer_registration: report.valuerRegistration || null,
      signed_off_at: report.signedOffAt || null,
    } as any)
    .select()
    .single();

  if (error) throw new Error(`Failed to save valuation report: ${error.message}`);

  // Insert comparables and unit valuations
  for (const uv of report.unitValuations) {
    // Insert unit valuation
    const { data: uvRow, error: uvError } = await db()
      .from('valuation_unit_values')
      .insert({
        valuation_id: row.id,
        unit_type_code: uv.unitType,
        count: uv.count,
        market_value_per_unit: uv.marketValuePerUnit,
        total_value: uv.totalValue,
        confidence_level: uv.confidenceLevel,
        valuation_basis: uv.valuationBasis,
      } as any)
      .select()
      .single();

    if (uvError) throw new Error(`Failed to save unit valuation: ${uvError.message}`);

    // Insert comparables for this unit type
    for (const comp of uv.comparables) {
      const { data: compRow, error: compError } = await db()
        .from('valuation_comparables')
        .insert({
          valuation_id: row.id,
          address: comp.address,
          suburb: comp.suburb,
          sale_price: comp.salePrice,
          sale_date: comp.saleDate,
          land_area_sqm: comp.landAreaSqm,
          floor_area_sqm: comp.floorAreaSqm,
          bedrooms: comp.bedrooms,
          bathrooms: comp.bathrooms,
          parking: comp.parking,
          distance_km: comp.distanceKm,
          price_per_sqm: comp.pricePerSqm,
          adjusted_price: comp.adjustedPrice,
          adjustment_notes: comp.adjustmentNotes,
          source: comp.source === 'AI_generated' ? 'ai_generated' : comp.source.toLowerCase(),
          relevance_score: comp.relevanceScore,
        } as any)
        .select()
        .single();

      if (compError) throw new Error(`Failed to save comparable: ${compError.message}`);

      // Link comp to unit valuation
      if (compRow && uvRow) {
        await db()
          .from('valuation_comp_links')
          .insert({
            unit_value_id: uvRow.id,
            comparable_id: compRow.id,
          } as any);
      }
    }
  }

  return { ...report, id: row.id, version };
}

export async function getValuationReport(projectId: string, version?: number): Promise<ValuationReport | null> {
  let query = db()
    .from('valuation_reports')
    .select('*')
    .eq('project_id', projectId);

  if (version) {
    query = query.eq('version', version);
  } else {
    query = query.order('version', { ascending: false }).limit(1);
  }

  const { data: row } = await query.single();
  if (!row) return null;

  // Get unit valuations with their comps
  const { data: unitValues } = await db()
    .from('valuation_unit_values')
    .select('*')
    .eq('valuation_id', row.id);

  const unitValuations: UnitValuation[] = [];

  for (const uv of (unitValues || [])) {
    // Get linked comp IDs
    const { data: links } = await db()
      .from('valuation_comp_links')
      .select('comparable_id')
      .eq('unit_value_id', uv.id);

    const compIds = (links || []).map((l: any) => l.comparable_id);

    let comps: ComparableSale[] = [];
    if (compIds.length > 0) {
      const { data: compRows } = await db()
        .from('valuation_comparables')
        .select('*')
        .in('id', compIds);

      comps = (compRows || []).map(mapComparableRow);
    }

    unitValuations.push({
      unitType: uv.unit_type_code,
      count: uv.count,
      marketValuePerUnit: Number(uv.market_value_per_unit),
      totalValue: Number(uv.total_value),
      comparables: comps,
      confidenceLevel: Number(uv.confidence_level),
      valuationBasis: uv.valuation_basis,
    });
  }

  return mapValuationReportRow(row, unitValuations);
}

// ─── Feasibility Studies ───────────────────────────────────────

export async function saveFeasibilityStudy(
  study: FeasibilityStudy,
  qsReportId: string,
  valuationId: string
): Promise<FeasibilityStudy> {
  const { data: latest } = await db()
    .from('feasibility_studies')
    .select('version')
    .eq('project_id', study.projectId)
    .order('version', { ascending: false })
    .limit(1)
    .single();

  const version = (latest?.version || 0) + 1;

  const { data: row, error } = await db()
    .from('feasibility_studies')
    .insert({
      project_id: study.projectId,
      qs_report_id: qsReportId,
      valuation_id: valuationId,
      status: study.status,
      version,
      gross_realisable_value: study.grossRealisableValue,
      less_sales_costs: study.lessSalesCosts,
      net_realisable_value: study.netRealisableValue,
      land_cost: study.landCost,
      construction_cost: study.constructionCost,
      professional_fees: study.professionalFees,
      statutory_costs: study.statutoryCosts,
      finance_costs: study.financeCosts,
      contingency: study.contingency,
      total_development_cost: study.totalDevelopmentCost,
      development_profit: study.developmentProfit,
      profit_on_cost: study.profitOnCost,
      profit_on_grv: study.profitOnGRV,
      profit_margin: study.profitMargin,
      prsv: study.prsv,
      soft_equity: study.softEquity,
      cash_equity_required: study.cashEquityRequired,
      loan_to_value_ratio: study.loanToValueRatio,
      interest_rate: study.interestRate,
      loan_term_months: study.loanTerm,
      total_interest: study.totalInterest,
      cash_flow: study.cashFlow,
      peak_debt: study.peakDebt,
      peak_debt_month: study.peakDebtMonth,
      sensitivity_scenarios: study.sensitivityScenarios,
      risks: study.risks,
      ai_model_used: study.aiModelUsed,
    } as any)
    .select()
    .single();

  if (error) throw new Error(`Failed to save feasibility study: ${error.message}`);

  return { ...study, id: row.id, version };
}

export async function getFeasibilityStudy(projectId: string, version?: number): Promise<FeasibilityStudy | null> {
  let query = db()
    .from('feasibility_studies')
    .select('*')
    .eq('project_id', projectId);

  if (version) {
    query = query.eq('version', version);
  } else {
    query = query.order('version', { ascending: false }).limit(1);
  }

  const { data: row } = await query.single();
  if (!row) return null;

  return mapFeasibilityRow(row);
}

// ─── Affordable Gap Analysis ───────────────────────────────────

export async function saveAffordableAnalysis(
  analysis: AffordableGapAnalysis,
  qsReportId: string,
  valuationId: string
): Promise<AffordableGapAnalysis> {
  const { data: latest } = await db()
    .from('affordable_gap_analyses')
    .select('version')
    .eq('project_id', analysis.projectId)
    .order('version', { ascending: false })
    .limit(1)
    .single();

  const version = (latest?.version || 0) + 1;

  const { data: row, error } = await db()
    .from('affordable_gap_analyses')
    .insert({
      project_id: analysis.projectId,
      qs_report_id: qsReportId,
      valuation_id: valuationId,
      status: analysis.status,
      version,
      total_units: analysis.totalUnits,
      affordable_units: analysis.affordableUnits,
      affordable_percent: analysis.affordablePercent,
      market_price_per_unit: analysis.marketPricePerUnit,
      chp_max_price: analysis.chpMaxPrice,
      chp_discount_percent: analysis.chpDiscountPercent,
      gap_per_unit: analysis.gapPerUnit,
      total_gap: analysis.totalGap,
      recommended_scenario: analysis.recommendedScenario || null,
      blended_grv: analysis.blendedGRV,
      blended_profit: analysis.blendedProfit,
      blended_margin: analysis.blendedMargin,
      is_blended_viable: analysis.isBlendedViable,
      full_market_grv: analysis.fullMarketGRV,
      full_market_profit: analysis.fullMarketProfit,
      full_market_margin: analysis.fullMarketMargin,
      policy_commentary: analysis.policyCommentary,
      ai_model_used: analysis.aiModelUsed,
    } as any)
    .select()
    .single();

  if (error) throw new Error(`Failed to save affordable analysis: ${error.message}`);

  // Insert bridging scenarios
  if (analysis.scenarios.length > 0) {
    const scenarioRows = analysis.scenarios.map((s, i) => ({
      analysis_id: row.id,
      mechanism: s.mechanism,
      label: s.label,
      description: s.description,
      subsidy_per_unit: s.subsidyPerUnit,
      total_subsidy: s.totalSubsidy,
      effective_chp_price: s.effectiveCHPPrice,
      developer_margin_impact: s.developerMarginImpact,
      is_viable: s.isViable,
      assumptions: s.assumptions,
      sort_order: i,
    }));

    const { error: scenError } = await db()
      .from('affordable_bridging_scenarios')
      .insert(scenarioRows as any);

    if (scenError) throw new Error(`Failed to save bridging scenarios: ${scenError.message}`);
  }

  return { ...analysis, id: row.id, version };
}

export async function getAffordableAnalysis(projectId: string, version?: number): Promise<AffordableGapAnalysis | null> {
  let query = db()
    .from('affordable_gap_analyses')
    .select('*')
    .eq('project_id', projectId);

  if (version) {
    query = query.eq('version', version);
  } else {
    query = query.order('version', { ascending: false }).limit(1);
  }

  const { data: row } = await query.single();
  if (!row) return null;

  // Get bridging scenarios
  const { data: scenarios } = await db()
    .from('affordable_bridging_scenarios')
    .select('*')
    .eq('analysis_id', row.id)
    .order('sort_order');

  return mapAffordableRow(row, scenarios || []);
}

// ─── Finance Packs ─────────────────────────────────────────────

export async function saveFinancePack(
  pack: DevFinancePack,
  qsReportId: string,
  valuationId: string,
  feasibilityId: string,
  affordableId?: string
): Promise<DevFinancePack> {
  const { data: latest } = await db()
    .from('finance_packs')
    .select('version')
    .eq('project_id', pack.projectId)
    .order('version', { ascending: false })
    .limit(1)
    .single();

  const version = (latest?.version || 0) + 1;

  const { data: row, error } = await db()
    .from('finance_packs')
    .insert({
      project_id: pack.projectId,
      qs_report_id: qsReportId,
      valuation_id: valuationId,
      feasibility_id: feasibilityId,
      affordable_id: affordableId || null,
      executive_summary: pack.executiveSummary,
      grv: pack.keyMetrics.grv,
      tdc: pack.keyMetrics.tdc,
      profit: pack.keyMetrics.profit,
      margin: pack.keyMetrics.margin,
      prsv: pack.keyMetrics.prsv,
      soft_equity: pack.keyMetrics.softEquity,
      ltv: pack.keyMetrics.ltv,
      peak_debt: pack.keyMetrics.peakDebt,
      version,
    } as any)
    .select()
    .single();

  if (error) throw new Error(`Failed to save finance pack: ${error.message}`);

  return { ...pack, id: row.id, version };
}

export async function getFinancePack(projectId: string, version?: number): Promise<DevFinancePack | null> {
  let query = db()
    .from('finance_packs')
    .select('*')
    .eq('project_id', projectId);

  if (version) {
    query = query.eq('version', version);
  } else {
    query = query.order('version', { ascending: false }).limit(1);
  }

  const { data: row } = await query.single();
  if (!row) return null;

  // Load all linked modules
  const project = await getDevFinanceProject(row.project_id);
  const qsReport = await getQSReportById(row.qs_report_id);
  const valuationReport = await getValuationReportById(row.valuation_id);
  const feasibilityStudy = await getFeasibilityById(row.feasibility_id);
  let affordableAnalysis;
  if (row.affordable_id) {
    affordableAnalysis = await getAffordableById(row.affordable_id);
  }

  if (!qsReport || !valuationReport || !feasibilityStudy) {
    throw new Error('Finance pack references missing module data');
  }

  return {
    id: row.id,
    projectId: row.project_id,
    project,
    qsReport,
    valuationReport,
    feasibilityStudy,
    affordableGapAnalysis: affordableAnalysis || undefined,
    executiveSummary: row.executive_summary,
    keyMetrics: {
      grv: Number(row.grv),
      tdc: Number(row.tdc),
      profit: Number(row.profit),
      margin: Number(row.margin),
      prsv: Number(row.prsv),
      softEquity: Number(row.soft_equity),
      ltv: Number(row.ltv),
      peakDebt: Number(row.peak_debt),
    },
    exportedAt: row.exported_at,
    exportFormat: row.export_format,
    exportUrl: row.export_url,
    generatedAt: row.generated_at,
    version: row.version,
  };
}

// ─── Professional Sign-offs ────────────────────────────────────

export async function saveSignOff(data: {
  moduleType: 'qs' | 'valuation';
  moduleId: string;
  firmName: string;
  professionalName: string;
  registrationNumber: string;
  piInsurer?: string;
  piPolicyNumber?: string;
  piExpiry?: string;
  notes?: string;
  signatureUrl?: string;
}): Promise<void> {
  const { error } = await db()
    .from('professional_signoffs')
    .insert({
      module_type: data.moduleType,
      module_id: data.moduleId,
      firm_name: data.firmName,
      professional_name: data.professionalName,
      registration_number: data.registrationNumber,
      pi_insurer: data.piInsurer || null,
      pi_policy_number: data.piPolicyNumber || null,
      pi_expiry: data.piExpiry || null,
      notes: data.notes || null,
      signature_url: data.signatureUrl || null,
    } as any);

  if (error) throw new Error(`Failed to save sign-off: ${error.message}`);

  // Update the module status to signed_off
  const table = data.moduleType === 'qs' ? 'qs_reports' : 'valuation_reports';
  const signOffField = data.moduleType === 'qs' ? 'qs_firm' : 'valuer_firm';
  const nameField = data.moduleType === 'qs' ? 'qs_name' : 'valuer_name';
  const regField = data.moduleType === 'qs' ? 'qs_registration' : 'valuer_registration';

  await db()
    .from(table)
    .update({
      status: 'signed_off',
      [signOffField]: data.firmName,
      [nameField]: data.professionalName,
      [regField]: data.registrationNumber,
      signed_off_at: new Date().toISOString(),
      sign_off_notes: data.notes || null,
    } as any)
    .eq('id', data.moduleId);
}

// ─── AI Usage Logging ──────────────────────────────────────────

export async function logAIUsage(data: {
  projectId: string;
  companyId: string;
  module: 'qs' | 'valuation' | 'feasibility' | 'affordable' | 'pack';
  aiModel: string;
  promptTokens: number;
  completionTokens: number;
  costUsd: number;
  metadata?: Record<string, any>;
}): Promise<void> {
  await db()
    .from('devfinance_ai_usage')
    .insert({
      project_id: data.projectId,
      company_id: data.companyId,
      module: data.module,
      ai_model: data.aiModel,
      prompt_tokens: data.promptTokens,
      completion_tokens: data.completionTokens,
      total_tokens: data.promptTokens + data.completionTokens,
      cost_usd: data.costUsd,
      metadata: data.metadata || null,
    } as any);
}

// ─── By-ID Loaders (for finance pack assembly) ─────────────────

async function getQSReportById(id: string): Promise<QSReport | null> {
  const { data: row } = await db()
    .from('qs_reports')
    .select('*')
    .eq('id', id)
    .single();

  if (!row) return null;

  const { data: trades } = await db()
    .from('qs_trade_items')
    .select('*')
    .eq('qs_report_id', id)
    .order('sort_order');

  return mapQSReportRow(row, trades || []);
}

async function getValuationReportById(id: string): Promise<ValuationReport | null> {
  const { data: row } = await db()
    .from('valuation_reports')
    .select('*')
    .eq('id', id)
    .single();

  if (!row) return null;

  const { data: unitValues } = await db()
    .from('valuation_unit_values')
    .select('*')
    .eq('valuation_id', id);

  const unitValuations: UnitValuation[] = [];
  for (const uv of (unitValues || [])) {
    const { data: links } = await db()
      .from('valuation_comp_links')
      .select('comparable_id')
      .eq('unit_value_id', uv.id);

    const compIds = (links || []).map((l: any) => l.comparable_id);
    let comps: ComparableSale[] = [];
    if (compIds.length > 0) {
      const { data: compRows } = await db()
        .from('valuation_comparables')
        .select('*')
        .in('id', compIds);
      comps = (compRows || []).map(mapComparableRow);
    }

    unitValuations.push({
      unitType: uv.unit_type_code,
      count: uv.count,
      marketValuePerUnit: Number(uv.market_value_per_unit),
      totalValue: Number(uv.total_value),
      comparables: comps,
      confidenceLevel: Number(uv.confidence_level),
      valuationBasis: uv.valuation_basis,
    });
  }

  return mapValuationReportRow(row, unitValuations);
}

async function getFeasibilityById(id: string): Promise<FeasibilityStudy | null> {
  const { data: row } = await db()
    .from('feasibility_studies')
    .select('*')
    .eq('id', id)
    .single();

  return row ? mapFeasibilityRow(row) : null;
}

async function getAffordableById(id: string): Promise<AffordableGapAnalysis | null> {
  const { data: row } = await db()
    .from('affordable_gap_analyses')
    .select('*')
    .eq('id', id)
    .single();

  if (!row) return null;

  const { data: scenarios } = await db()
    .from('affordable_bridging_scenarios')
    .select('*')
    .eq('analysis_id', id)
    .order('sort_order');

  return mapAffordableRow(row, scenarios || []);
}

// ─── Row Mappers ───────────────────────────────────────────────

function mapOpportunityRow(row: any) {
  if (!row) return {} as any;
  return {
    name: row.name,
    address: row.address,
    city: row.city,
    state: row.state,
    country: row.country || 'Australia',
    propertySize: Number(row.property_size),
    propertySizeUnit: row.property_size_unit || 'sqm',
    landStage: row.land_stage,
    currentZoning: row.current_zoning,
    numLots: row.num_lots,
    numDwellings: row.num_dwellings,
    existingStructures: row.existing_structures,
    landPurchasePrice: Number(row.land_purchase_price),
    infrastructureCosts: Number(row.infrastructure_costs),
    constructionPerUnit: Number(row.construction_per_unit),
    avgSalePrice: Number(row.avg_sale_price),
    contingencyPercent: Number(row.contingency_percent),
    timeframeMonths: row.timeframe_months,
    hasProofOfOwnership: row.derisk_clear_title || false,
    hasLegalDisputes: false,
    hasPreviousLegalDisputes: row.risk_previous_disputes || false,
    hasDAApproval: row.derisk_da_approved || false,
    hasVendorFinance: row.derisk_vendor_finance || false,
    hasFixedPriceConstruction: row.derisk_fixed_price_construction || false,
    hasExperiencedPM: row.derisk_experienced_pm || false,
    hasClearTitle: row.derisk_clear_title || false,
    isInGrowthCorridor: row.derisk_growth_corridor || false,
    hasPreSales: (row.derisk_pre_sales_percent || 0) > 0,
    preSalesPercent: row.derisk_pre_sales_percent,
  };
}

function calculateFinancialsFromOpp(row: any) {
  if (!row) return { totalCost: 0, totalRevenue: 0, grossMargin: 0, grossMarginPercent: 0, costPerUnit: 0, revenuePerUnit: 0, profitPerUnit: 0 };
  return {
    totalCost: Number(row.total_project_cost) || 0,
    totalRevenue: Number(row.total_revenue) || 0,
    grossMargin: Number(row.gross_margin_dollars) || 0,
    grossMarginPercent: Number(row.gross_margin_percent) || 0,
    costPerUnit: (Number(row.total_project_cost) || 0) / (row.num_dwellings || 1),
    revenuePerUnit: Number(row.avg_sale_price) || 0,
    profitPerUnit: (Number(row.gross_margin_dollars) || 0) / (row.num_dwellings || 1),
  };
}

function mapQSReportRow(row: any, trades: any[]): QSReport {
  // Group trades by category
  const categoryMap = new Map<string, TradeItem[]>();
  for (const t of trades) {
    const items = categoryMap.get(t.category) || [];
    items.push({
      trade: t.trade,
      description: t.description,
      quantity: Number(t.quantity),
      unit: t.unit,
      rate: Number(t.adjusted_rate || t.rate),
      total: Number(t.adjusted_total || t.total),
      source: t.source,
      confidence: Number(t.confidence),
    });
    categoryMap.set(t.category, items);
  }

  const categories: any[] = [];
  categoryMap.forEach((catTrades, category) => {
    categories.push({
      category,
      trades: catTrades,
      subtotal: catTrades.reduce((s: number, t: TradeItem) => s + t.total, 0),
    });
  });

  return {
    id: row.id,
    projectId: row.project_id,
    status: row.status,
    categories,
    constructionSubtotal: Number(row.construction_subtotal),
    professionalFees: Number(row.professional_fees),
    statutoryCosts: Number(row.statutory_costs),
    financeCosts: Number(row.finance_costs),
    salesCosts: Number(row.sales_costs),
    totalDevelopmentCost: Number(row.total_development_cost),
    costPerUnit: Number(row.cost_per_unit),
    costPerSqm: Number(row.cost_per_sqm),
    contingency: {
      baseContingencyPercent: Number(row.base_contingency_pct),
      baseContingencyAmount: Number(row.base_contingency_amount),
      riskAdjustedPercent: Number(row.risk_adjusted_contingency_pct),
      riskAdjustedAmount: Number(row.risk_adjusted_contingency_amount),
      riskFactors: row.contingency_risk_factors || [],
    },
    drawDownSchedule: row.draw_down_schedule || [],
    constructionProgramMonths: row.construction_program_months,
    qsFirm: row.qs_firm,
    qsName: row.qs_name,
    qsRegistration: row.qs_registration,
    signedOffAt: row.signed_off_at,
    generatedAt: row.generated_at,
    aiModelUsed: row.ai_model_used,
    version: row.version,
  };
}

function mapComparableRow(row: any): ComparableSale {
  return {
    address: row.address,
    suburb: row.suburb,
    salePrice: Number(row.sale_price),
    saleDate: row.sale_date,
    landAreaSqm: Number(row.land_area_sqm),
    floorAreaSqm: Number(row.floor_area_sqm),
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    parking: row.parking,
    distanceKm: Number(row.distance_km),
    pricePerSqm: Number(row.price_per_sqm),
    adjustedPrice: Number(row.adjusted_price),
    adjustmentNotes: row.adjustment_notes,
    source: row.source,
    relevanceScore: Number(row.relevance_score),
  };
}

function mapValuationReportRow(row: any, unitValuations: UnitValuation[]): ValuationReport {
  return {
    id: row.id,
    projectId: row.project_id,
    status: row.status,
    unitValuations,
    grossRealisableValue: Number(row.gross_realisable_value),
    totalDevelopmentCost: Number(row.tdc_excluding_land) + Number(row.land_purchase_price),
    targetProfitMargin: Number(row.target_profit_margin),
    projectSiteRelatedValue: Number(row.project_site_related_value),
    landPurchasePrice: Number(row.land_purchase_price),
    softEquity: Number(row.soft_equity),
    marketCommentary: row.market_commentary,
    absorptionRateMonths: row.absorption_rate_months,
    marketRiskLevel: row.market_risk_level,
    valuerFirm: row.valuer_firm,
    valuerName: row.valuer_name,
    valuerRegistration: row.valuer_registration,
    signedOffAt: row.signed_off_at,
    generatedAt: row.generated_at,
    aiModelUsed: row.ai_model_used,
    version: row.version,
  };
}

function mapFeasibilityRow(row: any): FeasibilityStudy {
  return {
    id: row.id,
    projectId: row.project_id,
    status: row.status,
    grossRealisableValue: Number(row.gross_realisable_value),
    lessSalesCosts: Number(row.less_sales_costs),
    netRealisableValue: Number(row.net_realisable_value),
    landCost: Number(row.land_cost),
    constructionCost: Number(row.construction_cost),
    professionalFees: Number(row.professional_fees),
    statutoryCosts: Number(row.statutory_costs),
    financeCosts: Number(row.finance_costs),
    contingency: Number(row.contingency),
    totalDevelopmentCost: Number(row.total_development_cost),
    developmentProfit: Number(row.development_profit),
    profitOnCost: Number(row.profit_on_cost),
    profitOnGRV: Number(row.profit_on_grv),
    profitMargin: Number(row.profit_margin),
    prsv: Number(row.prsv),
    softEquity: Number(row.soft_equity),
    cashEquityRequired: Number(row.cash_equity_required),
    loanToValueRatio: Number(row.loan_to_value_ratio),
    interestRate: Number(row.interest_rate),
    loanTerm: row.loan_term_months,
    totalInterest: Number(row.total_interest),
    cashFlow: row.cash_flow || [],
    peakDebt: Number(row.peak_debt),
    peakDebtMonth: row.peak_debt_month,
    sensitivityScenarios: row.sensitivity_scenarios || [],
    risks: row.risks || [],
    generatedAt: row.generated_at,
    aiModelUsed: row.ai_model_used,
    version: row.version,
  };
}

function mapAffordableRow(row: any, scenarioRows: any[]): AffordableGapAnalysis {
  const scenarios: BridgingScenario[] = scenarioRows.map(s => ({
    mechanism: s.mechanism,
    label: s.label,
    description: s.description,
    subsidyPerUnit: Number(s.subsidy_per_unit),
    totalSubsidy: Number(s.total_subsidy),
    effectiveCHPPrice: Number(s.effective_chp_price),
    developerMarginImpact: Number(s.developer_margin_impact),
    isViable: s.is_viable,
    assumptions: s.assumptions || [],
  }));

  return {
    id: row.id,
    projectId: row.project_id,
    status: row.status,
    totalUnits: row.total_units,
    affordableUnits: row.affordable_units,
    affordablePercent: Number(row.affordable_percent),
    marketPricePerUnit: Number(row.market_price_per_unit),
    chpMaxPrice: Number(row.chp_max_price),
    chpDiscountPercent: Number(row.chp_discount_percent),
    gapPerUnit: Number(row.gap_per_unit),
    totalGap: Number(row.total_gap),
    scenarios,
    recommendedScenario: row.recommended_scenario,
    blendedGRV: Number(row.blended_grv),
    blendedProfit: Number(row.blended_profit),
    blendedMargin: Number(row.blended_margin),
    isBlendedViable: row.is_blended_viable,
    fullMarketGRV: Number(row.full_market_grv),
    fullMarketProfit: Number(row.full_market_profit),
    fullMarketMargin: Number(row.full_market_margin),
    policyCommentary: row.policy_commentary,
    generatedAt: row.generated_at,
    aiModelUsed: row.ai_model_used,
    version: row.version,
  };
}
