import { NextRequest, NextResponse } from 'next/server';
import { generateFeasibilityStudy } from '@/lib/devfinance';
import { DevFinanceProject } from '@/lib/devfinance/types';
import {
  saveFeasibilityStudy,
  getFeasibilityStudy,
  getQSReport,
  getValuationReport,
  getDevFinanceProject,
} from '@/lib/devfinance/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { project, projectId, qsReport, valuationReport, financeParams } = body as {
      project?: DevFinanceProject;
      projectId?: string;
      qsReport?: any;
      valuationReport?: any;
      financeParams: {
        interestRate: number;
        loanTermMonths: number;
        ltvTarget: number;
        salesStartMonth: number;
        salesPeriodMonths: number;
      };
    };

    if (!financeParams) {
      return NextResponse.json(
        { error: 'financeParams is required' },
        { status: 400 }
      );
    }

    // Resolve project
    let resolvedProject: DevFinanceProject;
    if (projectId) {
      resolvedProject = await getDevFinanceProject(projectId);
    } else if (project) {
      resolvedProject = project;
    } else {
      return NextResponse.json(
        { error: 'Provide either projectId or project object' },
        { status: 400 }
      );
    }

    // Resolve QS and Valuation — from explicit params or latest DB versions
    const resolvedQS = qsReport || await getQSReport(resolvedProject.id);
    const resolvedVal = valuationReport || await getValuationReport(resolvedProject.id);

    if (!resolvedQS || !resolvedVal) {
      return NextResponse.json(
        { error: 'QS report and Valuation report required — run those modules first or provide them inline' },
        { status: 400 }
      );
    }

    // Generate
    const study = await generateFeasibilityStudy(
      resolvedProject,
      resolvedQS,
      resolvedVal,
      financeParams
    );

    // Persist
    const saved = await saveFeasibilityStudy(study, resolvedQS.id, resolvedVal.id);

    return NextResponse.json({ success: true, study: saved });
  } catch (error) {
    console.error('Feasibility generation error:', error);
    return NextResponse.json(
      { error: 'Feasibility study generation failed', message: error instanceof Error ? error.message : 'Unknown error' },
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
      module: 'DevFinance Feasibility Engine',
      description: 'Full feasibility study with cash flow, sensitivity analysis, and risk matrix',
      usage: 'POST with { projectId, financeParams } | GET with ?projectId=xxx',
    });
  }

  try {
    const study = await getFeasibilityStudy(projectId, version ? Number(version) : undefined);
    if (!study) {
      return NextResponse.json({ error: 'No feasibility study found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, study });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to load feasibility study', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
