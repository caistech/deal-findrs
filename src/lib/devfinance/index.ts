// ─── Types ─────────────────────────────────────────────────────
export * from './types';

// ─── Shared Engines ────────────────────────────────────────────
export {
  getRegionalFactor,
  lookupCostRate,
  getAllCostRates,
  estimateTradeItem,
  calculateConstructionCost,
  generateDrawDown,
  analyseContingency,
} from './costs';

export {
  calculatePSRV,
  calculateGRV,
  estimateUnitValueFromComps,
  buildUnitValuations,
  assessMarketRisk,
} from './revenue';

export {
  runSensitivityAnalysis,
  generateCashFlow,
  calculateLTV,
} from './sensitivity';

export {
  estimateCHPMaxPrice,
  calculateAffordableGap,
  modelBridgingScenarios,
  calculateBlendedFeasibility,
} from './affordable';

// ─── Agents ────────────────────────────────────────────────────
export { generateQSReport } from './agents/qs-agent';
export { generateValuationReport } from './agents/valuation-agent';
export { generateFeasibilityStudy } from './agents/feasibility-agent';
export { generateAffordableAnalysis } from './agents/affordable-agent';
export { generateFinancePack } from './agents/pack-agent';

// ─── Database Persistence ──────────────────────────────────────
export {
  createDevFinanceProject,
  getDevFinanceProject,
  getDevFinanceProjectByOpportunity,
  listDevFinanceProjects,
  saveQSReport,
  getQSReport,
  saveValuationReport,
  getValuationReport,
  saveFeasibilityStudy,
  getFeasibilityStudy,
  saveAffordableAnalysis,
  getAffordableAnalysis,
  saveFinancePack,
  getFinancePack,
  saveSignOff,
  logAIUsage,
} from './db';
