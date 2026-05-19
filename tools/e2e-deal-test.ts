/**
 * End-to-end deal assessment test with simulated deals.
 * Tests the full assessment pipeline: financials → criteria → scoring → RAG status.
 *
 * Usage: npx tsx tools/e2e-deal-test.ts
 */

// Use relative imports to avoid path alias issues
import { quickAssess } from '../src/lib/ai/assessment'
import { OpportunityInput, DEFAULT_CRITERIA, AssessmentResult } from '../src/lib/ai/types'

// ─── Simulated Deals ───────────────────────────────────────────────────────────

const GREEN_DEAL: OpportunityInput = {
  name: '12-Lot Subdivision — Ripley Valley, QLD',
  address: '45 Montrose Rd',
  city: 'Ripley',
  state: 'QLD',
  country: 'Australia',
  propertySize: 8500,
  propertySizeUnit: 'sqm',
  landStage: 'da_approved',
  currentZoning: 'Residential Low-Medium',
  numLots: 12,
  numDwellings: 12,
  existingStructures: 'None',
  landPurchasePrice: 1_200_000,
  infrastructureCosts: 480_000,
  constructionPerUnit: 280_000,
  avgSalePrice: 620_000,
  contingencyPercent: 5,
  timeframeMonths: 18,
  hasProofOfOwnership: true,
  hasLegalDisputes: false,
  hasPreviousLegalDisputes: false,
  hasDAApproval: true,
  hasVendorFinance: true,
  hasFixedPriceConstruction: true,
  hasExperiencedPM: true,
  hasClearTitle: true,
  isInGrowthCorridor: true,
  hasPreSales: true,
  preSalesPercent: 60,
}

const AMBER_DEAL: OpportunityInput = {
  name: '6-Lot Infill — Logan, QLD',
  address: '18 Crestwood Dr',
  city: 'Logan Reserve',
  state: 'QLD',
  country: 'Australia',
  propertySize: 3200,
  propertySizeUnit: 'sqm',
  landStage: 'da_approved',
  currentZoning: 'Residential',
  numLots: 6,
  numDwellings: 6,
  existingStructures: 'Old house — demolish',
  landPurchasePrice: 650_000,
  infrastructureCosts: 150_000,
  constructionPerUnit: 270_000,
  avgSalePrice: 540_000,
  contingencyPercent: 5,
  timeframeMonths: 14,
  hasProofOfOwnership: true,
  hasLegalDisputes: false,
  hasPreviousLegalDisputes: false,
  hasDAApproval: true,
  hasVendorFinance: false,
  hasFixedPriceConstruction: false,
  hasExperiencedPM: true,
  hasClearTitle: true,
  isInGrowthCorridor: false,
  hasPreSales: false,
}

const RED_DEAL: OpportunityInput = {
  name: 'Rezoning Gamble — Caboolture, QLD',
  address: '200 Rural Rd',
  city: 'Caboolture',
  state: 'QLD',
  country: 'Australia',
  propertySize: 20000,
  propertySizeUnit: 'sqm',
  landStage: 'needs_rezoning',
  currentZoning: 'Rural',
  numLots: 30,
  numDwellings: 30,
  existingStructures: 'Farmhouse',
  landPurchasePrice: 2_500_000,
  infrastructureCosts: 1_200_000,
  constructionPerUnit: 320_000,
  avgSalePrice: 480_000,
  contingencyPercent: 8,
  timeframeMonths: 36,
  hasProofOfOwnership: false,
  hasLegalDisputes: true,
  hasPreviousLegalDisputes: true,
  hasDAApproval: false,
  hasVendorFinance: false,
  hasFixedPriceConstruction: false,
  hasExperiencedPM: false,
  hasClearTitle: false,
  isInGrowthCorridor: false,
  hasPreSales: false,
}

// ─── Test Runner ────────────────────────────────────────────────────────────────

type TestResult = { name: string; pass: boolean; detail: string }
const results: TestResult[] = []

function assert(name: string, condition: boolean, detail: string) {
  results.push({ name, pass: condition, detail })
}

function printDealReport(label: string, deal: OpportunityInput, result: Omit<AssessmentResult, 'summary' | 'pathToGreen' | 'recommendations'>) {
  console.log(`\n${'═'.repeat(70)}`)
  console.log(`  ${label}`)
  console.log(`${'═'.repeat(70)}`)
  console.log(`  Deal:         ${deal.name}`)
  console.log(`  Location:     ${deal.address}, ${deal.city} ${deal.state}`)
  console.log(`  Units:        ${deal.numDwellings} dwellings across ${deal.propertySize} ${deal.propertySizeUnit}`)
  console.log(`  Land Stage:   ${deal.landStage}`)
  console.log(`${'─'.repeat(70)}`)
  console.log(`  FINANCIALS`)
  console.log(`    Total Cost:     $${result.financials.totalCost.toLocaleString()}`)
  console.log(`    Total Revenue:  $${result.financials.totalRevenue.toLocaleString()}`)
  console.log(`    Gross Margin:   $${result.financials.grossMargin.toLocaleString()} (${result.financials.grossMarginPercent.toFixed(1)}%)`)
  console.log(`    Cost/Unit:      $${result.financials.costPerUnit.toLocaleString()}`)
  console.log(`    Revenue/Unit:   $${result.financials.revenuePerUnit.toLocaleString()}`)
  console.log(`    Profit/Unit:    $${result.financials.profitPerUnit.toLocaleString()}`)
  console.log(`${'─'.repeat(70)}`)
  console.log(`  SCORING`)
  console.log(`    GM Score:       ${result.gmScore} / 75`)
  console.log(`    De-Risk Score:  +${result.deRiskScore}`)
  console.log(`    Risk Score:     ${result.riskScore}`)
  console.log(`    Total Score:    ${result.score} / 100`)
  console.log(`${'─'.repeat(70)}`)

  const statusColor = result.status === 'green' ? '\x1b[32m' : result.status === 'amber' ? '\x1b[33m' : '\x1b[31m'
  console.log(`  RAG STATUS:   ${statusColor}${result.status.toUpperCase()}\x1b[0m`)

  if (result.passedCriteria.length > 0) {
    console.log(`\n  PASSED (${result.passedCriteria.length}):`)
    result.passedCriteria.forEach(c => console.log(`    ✓ ${c.name}${c.points ? ` (+${c.points})` : ''}${c.detail ? ` — ${c.detail}` : ''}`))
  }
  if (result.failedCriteria.length > 0) {
    console.log(`\n  FAILED (${result.failedCriteria.length}):`)
    result.failedCriteria.forEach(c => console.log(`    ✗ ${c.name} [${c.severity}]${c.detail ? ` — ${c.detail}` : ''}`))
  }
  if (result.attentionItems.length > 0) {
    console.log(`\n  ATTENTION (${result.attentionItems.length}):`)
    result.attentionItems.forEach(c => console.log(`    ⚠ ${c.name} [${c.severity}]${c.detail ? ` — ${c.detail}` : ''}`))
  }
}

// ─── Run Tests ──────────────────────────────────────────────────────────────────

console.log('\n🏗️  DealFindrs — End-to-End Assessment Test')
console.log('   Simulating 3 property development deals\n')

// --- Deal 1: GREEN ---
const greenResult = quickAssess(GREEN_DEAL, DEFAULT_CRITERIA)
printDealReport('DEAL 1 — Expected: GREEN', GREEN_DEAL, greenResult)

assert('Green deal: RAG status is green', greenResult.status === 'green', `Got: ${greenResult.status}`)
assert('Green deal: score >= 80', greenResult.score >= 80, `Got: ${greenResult.score}`)
assert('Green deal: GM% >= 25', greenResult.financials.grossMarginPercent >= 25, `Got: ${greenResult.financials.grossMarginPercent.toFixed(1)}%`)
assert('Green deal: no failed criteria', greenResult.failedCriteria.length === 0, `Failed: ${greenResult.failedCriteria.map(c => c.name).join(', ') || 'none'}`)
assert('Green deal: de-risk score includes DA, vendor, FPC, PM, title, corridor, pre-sales', greenResult.deRiskScore === 60, `Got: ${greenResult.deRiskScore}`)

// --- Deal 2: AMBER ---
const amberResult = quickAssess(AMBER_DEAL, DEFAULT_CRITERIA)
printDealReport('DEAL 2 — Expected: AMBER', AMBER_DEAL, amberResult)

assert('Amber deal: RAG status is amber', amberResult.status === 'amber', `Got: ${amberResult.status}`)
assert('Amber deal: GM% between 18-25', amberResult.financials.grossMarginPercent >= 18 && amberResult.financials.grossMarginPercent < 25, `Got: ${amberResult.financials.grossMarginPercent.toFixed(1)}%`)
assert('Amber deal: no critical failures', !amberResult.failedCriteria.some(f => f.severity === 'critical'), `Critical: ${amberResult.failedCriteria.filter(f => f.severity === 'critical').map(c => c.name).join(', ') || 'none'}`)

// --- Deal 3: RED ---
const redResult = quickAssess(RED_DEAL, DEFAULT_CRITERIA)
printDealReport('DEAL 3 — Expected: RED', RED_DEAL, redResult)

assert('Red deal: RAG status is red', redResult.status === 'red', `Got: ${redResult.status}`)
assert('Red deal: has critical failures', redResult.failedCriteria.some(f => f.severity === 'critical'), `Critical: ${redResult.failedCriteria.filter(f => f.severity === 'critical').map(c => c.name).join(', ') || 'none'}`)
assert('Red deal: risk score is negative', redResult.riskScore < 0, `Got: ${redResult.riskScore}`)

// --- Financial Integrity Checks ---
console.log(`\n${'═'.repeat(70)}`)
console.log('  FINANCIAL INTEGRITY CHECKS')
console.log(`${'═'.repeat(70)}`)

for (const [label, deal, result] of [
  ['Green', GREEN_DEAL, greenResult],
  ['Amber', AMBER_DEAL, amberResult],
  ['Red', RED_DEAL, redResult],
] as const) {
  const units = deal.numDwellings
  const expectedConstruction = deal.constructionPerUnit * units
  const expectedSubtotal = deal.landPurchasePrice + deal.infrastructureCosts + expectedConstruction
  const expectedContingency = expectedSubtotal * (deal.contingencyPercent / 100)
  const expectedTotalCost = expectedSubtotal + expectedContingency
  const expectedRevenue = deal.avgSalePrice * units

  assert(`${label}: total cost calc correct`, Math.abs(result.financials.totalCost - expectedTotalCost) < 1, `Expected ${expectedTotalCost}, got ${result.financials.totalCost}`)
  assert(`${label}: total revenue calc correct`, Math.abs(result.financials.totalRevenue - expectedRevenue) < 1, `Expected ${expectedRevenue}, got ${result.financials.totalRevenue}`)
  assert(`${label}: revenue > 0`, result.financials.totalRevenue > 0, `Got: ${result.financials.totalRevenue}`)
  assert(`${label}: score in 0-100 range`, result.score >= 0 && result.score <= 100, `Got: ${result.score}`)
}

// ─── Summary ────────────────────────────────────────────────────────────────────

console.log(`\n${'═'.repeat(70)}`)
console.log('  TEST RESULTS')
console.log(`${'═'.repeat(70)}`)

const passed = results.filter(r => r.pass)
const failed = results.filter(r => !r.pass)

results.forEach(r => {
  const icon = r.pass ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'
  console.log(`  ${icon} ${r.name}${r.pass ? '' : ` — ${r.detail}`}`)
})

console.log(`\n  ${passed.length}/${results.length} passed${failed.length > 0 ? `, ${failed.length} failed` : ''}`)

if (failed.length > 0) {
  console.log('\n  FAILED TESTS:')
  failed.forEach(r => console.log(`    ✗ ${r.name}: ${r.detail}`))
  process.exit(1)
} else {
  console.log('\n  All tests passed!')
  process.exit(0)
}
