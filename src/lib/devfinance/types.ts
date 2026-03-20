import { OpportunityInput, FinancialSummary } from '../ai/types';

// ─── Shared Enums ──────────────────────────────────────────────

export type ModuleStatus = 'draft' | 'ai_generated' | 'under_review' | 'signed_off' | 'exported';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type BridgingMechanism =
  | 'capital_grant'
  | 'direct_acquisition'
  | 'concessional_finance'
  | 'below_market_land'
  | 'shared_equity'
  | 'rent_to_buy'
  | 'community_land_trust';

// ─── Unit Mix (shared across all modules) ──────────────────────

export interface UnitType {
  code: string;           // e.g. "1A", "2B"
  name: string;           // e.g. "Type 1A - 3 Bed"
  count: number;
  floorAreaSqm: number;
  bedrooms: number;
  bathrooms: number;
  parking: number;
}

// ─── Project Record (extends OpportunityInput) ─────────────────

export interface DevFinanceProject {
  id: string;
  opportunityId: string;        // FK to DealFindrs opportunity

  // Inherited from opportunity assessment
  opportunity: OpportunityInput;
  financials: FinancialSummary;

  // Extended for DevFinance
  unitMix: UnitType[];
  constructionProgramMonths: number;
  builderName: string;
  builderABN?: string;

  // Module statuses
  qsStatus: ModuleStatus;
  valuationStatus: ModuleStatus;
  feasibilityStatus: ModuleStatus;
  affordableStatus: ModuleStatus;

  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

// ─── QS Report Types ───────────────────────────────────────────

export interface TradeItem {
  trade: string;             // e.g. "Preliminaries", "Earthworks", "Concrete"
  description: string;
  quantity: number;
  unit: string;              // e.g. "m²", "m³", "item", "lm"
  rate: number;              // $/unit
  total: number;
  source: 'rawlinsons' | 'project_actual' | 'ai_estimated' | 'manual';
  confidence: number;        // 0-1
}

export interface TradeCategory {
  category: string;          // e.g. "Substructure", "Superstructure", "Finishes"
  trades: TradeItem[];
  subtotal: number;
}

export interface DrawDownMilestone {
  phase: string;             // e.g. "Slab", "Frame", "Lock-up", "Fixing", "Completion"
  percentComplete: number;
  cumulativePercent: number;
  amount: number;
  cumulativeAmount: number;
  targetMonth: number;       // month number in construction program
}

export interface ContingencyAnalysis {
  baseContingencyPercent: number;
  baseContingencyAmount: number;
  riskAdjustedPercent: number;
  riskAdjustedAmount: number;
  riskFactors: {
    factor: string;
    impact: RiskLevel;
    additionalPercent: number;
  }[];
}

export interface QSReport {
  id: string;
  projectId: string;
  status: ModuleStatus;

  // Cost breakdown
  categories: TradeCategory[];
  constructionSubtotal: number;

  // Non-construction costs
  professionalFees: number;
  statutoryCosts: number;
  financeCosts: number;
  salesCosts: number;

  // Totals
  totalDevelopmentCost: number;
  costPerUnit: number;
  costPerSqm: number;

  // Contingency
  contingency: ContingencyAnalysis;

  // Draw-down
  drawDownSchedule: DrawDownMilestone[];
  constructionProgramMonths: number;

  // Sign-off
  qsFirm?: string;
  qsName?: string;
  qsRegistration?: string;
  signedOffAt?: string;

  // Metadata
  generatedAt: string;
  aiModelUsed: string;
  version: number;
}

// ─── Valuation Report Types ────────────────────────────────────

export interface ComparableSale {
  address: string;
  suburb: string;
  salePrice: number;
  saleDate: string;
  landAreaSqm: number;
  floorAreaSqm: number;
  bedrooms: number;
  bathrooms: number;
  parking: number;
  distanceKm: number;
  pricePerSqm: number;
  adjustedPrice: number;     // after time/location/condition adjustments
  adjustmentNotes: string;
  source: string;            // e.g. "CoreLogic", "Domain", "manual"
  relevanceScore: number;    // 0-1
}

export interface UnitValuation {
  unitType: string;          // matches UnitType.code
  count: number;
  marketValuePerUnit: number;
  totalValue: number;
  comparables: ComparableSale[];
  confidenceLevel: number;   // 0-1
  valuationBasis: string;    // e.g. "Direct comparison", "Summation"
}

export interface ValuationReport {
  id: string;
  projectId: string;
  status: ModuleStatus;

  // GRV
  unitValuations: UnitValuation[];
  grossRealisableValue: number;   // sum of all unit values

  // PRSV
  totalDevelopmentCost: number;   // sourced from QS module
  targetProfitMargin: number;     // typically 20%
  projectSiteRelatedValue: number;

  // Soft equity
  landPurchasePrice: number;      // from opportunity
  softEquity: number;             // PRSV - purchase price (if positive)

  // Market analysis
  marketCommentary: string;
  absorptionRateMonths: number;
  marketRiskLevel: RiskLevel;

  // Sign-off
  valuerFirm?: string;
  valuerName?: string;
  valuerRegistration?: string;   // API registration number
  signedOffAt?: string;

  // Metadata
  generatedAt: string;
  aiModelUsed: string;
  version: number;
}

// ─── Feasibility Study Types ───────────────────────────────────

export interface SensitivityScenario {
  name: string;              // e.g. "Base Case", "Revenue -10%", "Cost +15%"
  revenueAdjustment: number; // multiplier e.g. 0.9 for -10%
  costAdjustment: number;    // multiplier e.g. 1.15 for +15%
  timelineAdjustment: number;// additional months
  totalRevenue: number;
  totalCost: number;
  profit: number;
  profitMargin: number;
  isViable: boolean;         // meets minimum margin threshold
}

export interface CashFlowPeriod {
  month: number;
  costs: number;
  revenue: number;
  netCashFlow: number;
  cumulativeCashFlow: number;
  drawDown: number;          // from QS draw-down schedule
  debtBalance: number;
  interestCost: number;
}

export interface FeasibilityStudy {
  id: string;
  projectId: string;
  status: ModuleStatus;

  // Revenue (sourced from Valuation module)
  grossRealisableValue: number;
  lessSalesCosts: number;
  netRealisableValue: number;

  // Costs (sourced from QS module)
  landCost: number;
  constructionCost: number;
  professionalFees: number;
  statutoryCosts: number;
  financeCosts: number;
  contingency: number;
  totalDevelopmentCost: number;

  // Returns
  developmentProfit: number;
  profitOnCost: number;       // profit / TDC
  profitOnGRV: number;        // profit / GRV
  profitMargin: number;       // profit / revenue

  // PRSV & equity (sourced from Valuation module)
  prsv: number;
  softEquity: number;
  cashEquityRequired: number;

  // Finance structure
  loanToValueRatio: number;
  interestRate: number;
  loanTerm: number;
  totalInterest: number;

  // Cash flow
  cashFlow: CashFlowPeriod[];
  peakDebt: number;
  peakDebtMonth: number;

  // Sensitivity
  sensitivityScenarios: SensitivityScenario[];

  // Risk matrix
  risks: {
    category: string;        // Market, Construction, Finance, Timeline
    risk: string;
    likelihood: RiskLevel;
    impact: RiskLevel;
    mitigation: string;
  }[];

  // Metadata
  generatedAt: string;
  aiModelUsed: string;
  version: number;
}

// ─── Affordable Gap Analysis Types ─────────────────────────────

export interface BridgingScenario {
  mechanism: BridgingMechanism;
  label: string;
  description: string;
  subsidyPerUnit: number;
  totalSubsidy: number;
  effectiveCHPPrice: number;
  developerMarginImpact: number;  // remaining margin after mechanism
  isViable: boolean;               // still meets minimum margin
  assumptions: string[];
}

export interface AffordableGapAnalysis {
  id: string;
  projectId: string;
  status: ModuleStatus;

  // Affordable component
  totalUnits: number;
  affordableUnits: number;
  affordablePercent: number;

  // The gap
  marketPricePerUnit: number;     // from Valuation
  chpMaxPrice: number;            // what CHPs can pay
  chpDiscountPercent: number;     // e.g. 30%
  gapPerUnit: number;             // market - CHP price
  totalGap: number;               // gap × affordable units

  // Bridging scenarios
  scenarios: BridgingScenario[];
  recommendedScenario?: string;   // mechanism name

  // Blended feasibility
  blendedGRV: number;            // market units at market + affordable at CHP price
  blendedProfit: number;
  blendedMargin: number;
  isBlendedViable: boolean;

  // Without affordable (comparison)
  fullMarketGRV: number;
  fullMarketProfit: number;
  fullMarketMargin: number;

  // Policy commentary
  policyCommentary: string;

  // Metadata
  generatedAt: string;
  aiModelUsed: string;
  version: number;
}

// ─── Combined Finance Pack ─────────────────────────────────────

export interface DevFinancePack {
  id: string;
  projectId: string;
  project: DevFinanceProject;

  // Module outputs
  qsReport: QSReport;
  valuationReport: ValuationReport;
  feasibilityStudy: FeasibilityStudy;
  affordableGapAnalysis?: AffordableGapAnalysis;  // optional - only if affordable component

  // Executive summary (AI-generated from all modules)
  executiveSummary: string;
  keyMetrics: {
    grv: number;
    tdc: number;
    profit: number;
    margin: number;
    prsv: number;
    softEquity: number;
    ltv: number;
    peakDebt: number;
  };

  // Export
  exportedAt?: string;
  exportFormat?: 'pdf' | 'docx';
  exportUrl?: string;

  generatedAt: string;
  version: number;
}
