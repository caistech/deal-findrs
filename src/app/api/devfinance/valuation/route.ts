import { NextRequest, NextResponse } from 'next/server';
import { generateValuationReport } from '@/lib/devfinance';
import { DevFinanceProject, ComparableSale } from '@/lib/devfinance/types';
import { saveValuationReport, getValuationReport, getQSReport, getDevFinanceProject } from '@/lib/devfinance/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { project, projectId, tdcExcludingLand, comparables } = body as {
      project?: DevFinanceProject;
      projectId?: string;
      tdcExcludingLand?: number;
      comparables?: ComparableSale[];
    };

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

    // Resolve TDC — from explicit param, or from latest QS report
    let resolvedTDC = tdcExcludingLand;
    if (!resolvedTDC) {
      const latestQS = await getQSReport(resolvedProject.id);
      if (latestQS) {
        resolvedTDC = latestQS.totalDevelopmentCost - resolvedProject.opportunity.landPurchasePrice;
      } else {
        return NextResponse.json(
          { error: 'No TDC available — run QS report first or provide tdcExcludingLand' },
          { status: 400 }
        );
      }
    }

    // Generate
    const report = await generateValuationReport(resolvedProject, resolvedTDC, comparables);

    // Persist
    const saved = await saveValuationReport(report);

    return NextResponse.json({ success: true, report: saved });
  } catch (error) {
    console.error('Valuation generation error:', error);
    return NextResponse.json(
      { error: 'Valuation report generation failed', message: error instanceof Error ? error.message : 'Unknown error' },
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
      module: 'DevFinance Valuation Engine',
      description: 'AI-generated construction valuation with comparable sales, GRV, PRSV, and soft equity',
      usage: 'POST with { projectId } or { project, tdcExcludingLand } | GET with ?projectId=xxx',
    });
  }

  try {
    const report = await getValuationReport(projectId, version ? Number(version) : undefined);
    if (!report) {
      return NextResponse.json({ error: 'No valuation report found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, report });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to load valuation report', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
