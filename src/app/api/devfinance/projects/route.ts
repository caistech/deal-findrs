import { NextRequest, NextResponse } from 'next/server';
import {
  createDevFinanceProject,
  listDevFinanceProjects,
  getDevFinanceProjectByOpportunity,
} from '@/lib/devfinance/db';

/**
 * DevFinance Projects — create and list projects.
 * A DevFinance project extends a DealFindrs opportunity with unit mix,
 * builder info, and finance parameters.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      opportunityId,
      companyId,
      builderName,
      builderABN,
      constructionProgramMonths,
      unitMix,
      financeParams,
      createdBy,
    } = body;

    if (!opportunityId || !companyId || !builderName || !unitMix || unitMix.length === 0) {
      return NextResponse.json(
        { error: 'Required: opportunityId, companyId, builderName, unitMix[]' },
        { status: 400 }
      );
    }

    // Check if project already exists for this opportunity
    const existing = await getDevFinanceProjectByOpportunity(opportunityId);
    if (existing) {
      return NextResponse.json({
        success: true,
        project: existing,
        message: 'Existing DevFinance project returned',
      });
    }

    const project = await createDevFinanceProject(opportunityId, companyId, {
      builderName,
      builderABN,
      constructionProgramMonths: constructionProgramMonths || 12,
      unitMix,
      financeParams,
      createdBy,
    });

    return NextResponse.json({ success: true, project }, { status: 201 });
  } catch (error) {
    console.error('Project creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create DevFinance project', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get('companyId');

  if (!companyId) {
    return NextResponse.json(
      { error: 'companyId query parameter required' },
      { status: 400 }
    );
  }

  try {
    const projects = await listDevFinanceProjects(companyId);
    return NextResponse.json({ success: true, projects });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to list projects', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
