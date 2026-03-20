import { NextRequest, NextResponse } from 'next/server';
import { generateAffordableAnalysis } from '@/lib/devfinance';
import { DevFinanceProject } from '@/lib/devfinance/types';
import {
  saveAffordableAnalysis,
  getAffordableAnalysis,
  getQSReport,
  getValuationReport,
  getDevFinanceProject,
} from '@/lib/devfinance/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { project, projectId, qsReport, valuationReport, affordableConfig } = body as {
      project?: DevFinanceProject;
      projectId?: string;
      qsReport?: any;
      valuationReport?: any;
      affordableConfig: {
        affordableUnits: number;
        chpMaxPrice?: number;
        marketRentWeekly?: number;
        minimumMarginPercent: number;
      };
    };

    if (!affordableConfig || !affordableConfig.affordableUnits) {
      return NextResponse.json(
        { error: 'affordableConfig with affordableUnits is required' },
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

    // Resolve QS and Valuation
    const resolvedQS = qsReport || await getQSReport(resolvedProject.id);
    const resolvedVal = valuationReport || await getValuationReport(resolvedProject.id);

    if (!resolvedQS || !resolvedVal) {
      return NextResponse.json(
        { error: 'QS report and Valuation report required — run those modules first' },
        { status: 400 }
      );
    }

    // Generate
    const analysis = await generateAffordableAnalysis(
      resolvedProject,
      resolvedQS,
      resolvedVal,
      affordableConfig
    );

    // Persist
    const saved = await saveAffordableAnalysis(analysis, resolvedQS.id, resolvedVal.id);

    return NextResponse.json({ success: true, analysis: saved });
  } catch (error) {
    console.error('Affordable analysis error:', error);
    return NextResponse.json(
      { error: 'Affordable gap analysis failed', message: error instanceof Error ? error.message : 'Unknown error' },
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
      module: 'DevFinance Affordable Gap Calculator',
      description: 'Models the gap between commercial pricing and CHP affordability, simulates bridging mechanisms',
      usage: 'POST with { projectId, affordableConfig } | GET with ?projectId=xxx',
    });
  }

  try {
    const analysis = await getAffordableAnalysis(projectId, version ? Number(version) : undefined);
    if (!analysis) {
      return NextResponse.json({ error: 'No affordable analysis found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, analysis });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to load affordable analysis', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
