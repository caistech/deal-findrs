import { NextRequest, NextResponse } from 'next/server';
import { saveSignOff } from '@/lib/devfinance/db';

/**
 * Professional Sign-off endpoint.
 * Called when a registered QS or valuer reviews and certifies a report.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      moduleType,
      moduleId,
      firmName,
      professionalName,
      registrationNumber,
      piInsurer,
      piPolicyNumber,
      piExpiry,
      notes,
      signatureUrl,
    } = body;

    if (!moduleType || !moduleId || !firmName || !professionalName || !registrationNumber) {
      return NextResponse.json(
        { error: 'Required: moduleType (qs|valuation), moduleId, firmName, professionalName, registrationNumber' },
        { status: 400 }
      );
    }

    if (moduleType !== 'qs' && moduleType !== 'valuation') {
      return NextResponse.json(
        { error: 'moduleType must be "qs" or "valuation"' },
        { status: 400 }
      );
    }

    await saveSignOff({
      moduleType,
      moduleId,
      firmName,
      professionalName,
      registrationNumber,
      piInsurer,
      piPolicyNumber,
      piExpiry,
      notes,
      signatureUrl,
    });

    return NextResponse.json({
      success: true,
      message: `${moduleType === 'qs' ? 'QS' : 'Valuation'} report signed off by ${professionalName} (${firmName})`,
    });
  } catch (error) {
    console.error('Sign-off error:', error);
    return NextResponse.json(
      { error: 'Sign-off failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
