import { NextRequest, NextResponse } from 'next/server';
import { generateQSReport } from '@/lib/devfinance';
import { DevFinanceProject } from '@/lib/devfinance/types';
import { saveQSReport, getQSReport, getDevFinanceProject } from '@/lib/devfinance/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { project, projectId } = body as {
      project?: DevFinanceProject;
      projectId?: string;
    };

    // Load from DB if projectId provided, otherwise use inline project
    let resolvedProject: DevFinanceProject;
    if (projectId) {
      resolvedProject = await getDevFinanceProject(projectId);
    } else if (project && project.unitMix && project.unitMix.length > 0) {
      resolvedProject = project;
    } else {
      return NextResponse.json(
        { error: 'Provide either projectId (DB) or project object with unitMix' },
        { status: 400 }
      );
    }

    // Generate
    const qsReport = await generateQSReport(resolvedProject);

    // Persist
    const saved = await saveQSReport(qsReport);

    return NextResponse.json({ success: true, report: saved });
  } catch (error) {
    console.error('QS generation error:', error);
    return NextResponse.json(
      { error: 'QS report generation failed', message: error instanceof Error ? error.message : 'Unknown error' },
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
      module: 'DevFinance QS Engine',
      description: 'AI-generated Quantity Surveyor report with trade breakdown, contingency analysis, and draw-down schedule',
      usage: 'POST with { projectId } or { project } | GET with ?projectId=xxx&version=1',
    });
  }

  try {
    const report = await getQSReport(projectId, version ? Number(version) : undefined);
    if (!report) {
      return NextResponse.json({ error: 'No QS report found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, report });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to load QS report', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
