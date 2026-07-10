import { NextRequest, NextResponse } from 'next/server';
import {
  createDevFinanceProject,
  listDevFinanceProjects,
  getDevFinanceProjectByOpportunity,
} from '@/lib/devfinance/db';
import { requireAuth } from '@/lib/auth/require-auth';
import { getCompanyId } from '@/lib/auth/get-company-id';

/**
 * DevFinance Projects — create and list projects.
 * A DevFinance project extends a DealFindrs opportunity with unit mix,
 * builder info, and finance parameters.
 */
export async function POST(request: NextRequest) {
  try {
    // Auth + company resolution (AUTHENTICATION CONTRACT). companyId is derived
    // SERVER-SIDE from the signed-in user's profile — never trusted from the client
    // (the browser has no company id to send, and a client-supplied one is spoofable).
    const auth = await requireAuth(request);
    if (auth.error) {
      return NextResponse.json(
        { error: 'Please sign in to generate a finance pack.' },
        { status: 401 }
      );
    }
    const { user, supabase } = auth;

    const company = await getCompanyId(supabase, user);
    if (company.error) {
      const message =
        company.error === 'no_company'
          ? 'Your account isn’t linked to a company yet. Add your company details in Settings → Company before generating a finance pack.'
          : 'Could not resolve your company profile. Please try again, or contact support if it persists.';
      return NextResponse.json({ error: message }, { status: 400 });
    }
    const companyId = company.companyId;

    const body = await request.json();
    const {
      opportunityId,
      builderName,
      builderABN,
      constructionProgramMonths,
      unitMix,
      financeParams,
    } = body;

    if (!opportunityId || !builderName || !unitMix || unitMix.length === 0) {
      return NextResponse.json(
        { error: 'Required: opportunityId, builderName, and at least one unit type.' },
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
      createdBy: user.id,
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
