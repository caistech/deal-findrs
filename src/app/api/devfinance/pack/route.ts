import { NextRequest, NextResponse } from 'next/server';
import {
  generateQSReport,
  generateValuationReport,
  generateFeasibilityStudy,
  generateAffordableAnalysis,
  generateFinancePack,
} from '@/lib/devfinance';
import {
  getDevFinanceProject,
  saveQSReport,
  saveValuationReport,
  saveFeasibilityStudy,
  saveAffordableAnalysis,
  saveFinancePack,
  getFinancePack,
} from '@/lib/devfinance/db';

/**
 * Full Finance Pack — runs all four modules in sequence, persists each,
 * and produces a combined DevFinancePack with executive summary.
 *
 * This is the primary plugin endpoint for external platforms
 * (MMC Build, F2K Checkpoint, F2K Housing Fund, broker portals).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      projectId,
      financeParams,
      affordableConfig,
      comparables,
    } = body as {
      projectId: string;
      financeParams: {
        interestRate: number;
        loanTermMonths: number;
        ltvTarget: number;
        salesStartMonth: number;
        salesPeriodMonths: number;
      };
      affordableConfig?: {
        affordableUnits: number;
        chpMaxPrice?: number;
        marketRentWeekly?: number;
        minimumMarginPercent: number;
      };
      comparables?: any[];
    };

    if (!projectId || !financeParams) {
      return NextResponse.json(
        { error: 'Missing required inputs: projectId and financeParams' },
        { status: 400 }
      );
    }

    // Load project from DB
    const project = await getDevFinanceProject(projectId);

    // Step 1: QS Report → persist
    const qsReport = await generateQSReport(project);
    const savedQS = await saveQSReport(qsReport);

    // Step 2: Valuation Report → persist
    const tdcExcludingLand = savedQS.totalDevelopmentCost - project.opportunity.landPurchasePrice;
    const valuationReport = await generateValuationReport(project, tdcExcludingLand, comparables);
    const savedVal = await saveValuationReport(valuationReport);

    // Step 3: Feasibility Study → persist
    const feasibilityStudy = await generateFeasibilityStudy(
      project,
      savedQS,
      savedVal,
      financeParams
    );
    const savedFeas = await saveFeasibilityStudy(feasibilityStudy, savedQS.id, savedVal.id);

    // Step 4: Affordable Gap Analysis (optional) → persist
    let savedAfford;
    if (affordableConfig && affordableConfig.affordableUnits > 0) {
      const affordableAnalysis = await generateAffordableAnalysis(
        project,
        savedQS,
        savedVal,
        affordableConfig
      );
      savedAfford = await saveAffordableAnalysis(affordableAnalysis, savedQS.id, savedVal.id);
    }

    // Step 5: Combine into Finance Pack → persist
    const pack = await generateFinancePack(
      project,
      savedQS,
      savedVal,
      savedFeas,
      savedAfford
    );
    const savedPack = await saveFinancePack(
      pack,
      savedQS.id,
      savedVal.id,
      savedFeas.id,
      savedAfford?.id
    );

    return NextResponse.json({ success: true, pack: savedPack });
  } catch (error) {
    console.error('Finance pack generation error:', error);
    return NextResponse.json(
      { error: 'Finance pack generation failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');
  const version = searchParams.get('version');

  if (!projectId) {
    return NextResponse.json({
      module: 'DevFinance Pack Generator',
      description: 'Runs all four modules (QS → Valuation → Feasibility → Affordable) and produces a combined Development Finance Pack',
      version: '1.0.0',
      usage: 'POST with { projectId, financeParams, affordableConfig? } | GET with ?projectId=xxx',
      pluginUsage: {
        'MMC Build': 'POST /api/devfinance/pack',
        'F2K Checkpoint': 'POST /api/devfinance/pack',
        'F2K Housing Fund': 'POST /api/devfinance/pack',
        'Broker Portal': 'POST /api/devfinance/pack',
      },
    });
  }

  try {
    const pack = await getFinancePack(projectId, version ? Number(version) : undefined);
    if (!pack) {
      return NextResponse.json({ error: 'No finance pack found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, pack });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to load finance pack', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
