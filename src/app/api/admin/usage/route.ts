import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/require-admin'

let _admin: ReturnType<typeof createClient> | null = null
function getSupabaseAdmin() {
  if (!_admin) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) throw new Error('Supabase credentials not configured')
    _admin = createClient(url, key)
  }
  return _admin
}

interface UsageRow {
  company_id: string | null
  module: string | null
  total_tokens: number | null
  cost_usd: number | null
}

/**
 * Admin Usage — per-company AI usage attribution from devfinance_ai_usage: total tokens,
 * total cost (USD), call count, and a per-module breakdown. Read-only aggregation.
 */
export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (admin.error) {
    return NextResponse.json({ error: admin.error }, { status: admin.error === 'forbidden' ? 403 : 401 })
  }

  try {
    const supabase = getSupabaseAdmin()

    const { data: usage, error: uErr } = await supabase
      .from('devfinance_ai_usage')
      .select('company_id, module, total_tokens, cost_usd')
    if (uErr) throw uErr

    const { data: companies, error: cErr } = await supabase.from('companies').select('id, name')
    if (cErr) throw cErr
    const names = new Map<string, string>()
    for (const c of (companies ?? []) as Array<{ id: string; name: string }>) names.set(c.id, c.name)

    const byCompany = new Map<
      string,
      { companyId: string; companyName: string; calls: number; tokens: number; costUsd: number; modules: Record<string, number> }
    >()

    let totalTokens = 0
    let totalCost = 0
    for (const r of (usage ?? []) as UsageRow[]) {
      const key = r.company_id ?? 'unattributed'
      const tokens = Number(r.total_tokens ?? 0)
      const cost = Number(r.cost_usd ?? 0)
      totalTokens += tokens
      totalCost += cost
      if (!byCompany.has(key)) {
        byCompany.set(key, {
          companyId: key,
          companyName: r.company_id ? names.get(r.company_id) ?? '(unknown company)' : '(unattributed)',
          calls: 0,
          tokens: 0,
          costUsd: 0,
          modules: {},
        })
      }
      const agg = byCompany.get(key)!
      agg.calls += 1
      agg.tokens += tokens
      agg.costUsd += cost
      const mod = r.module ?? 'other'
      agg.modules[mod] = (agg.modules[mod] ?? 0) + 1
    }

    const rows = Array.from(byCompany.values()).sort((a, b) => b.tokens - a.tokens)

    return NextResponse.json({
      success: true,
      rows,
      totals: { calls: (usage ?? []).length, tokens: totalTokens, costUsd: totalCost },
    })
  } catch (error) {
    console.error('Admin usage error:', error)
    return NextResponse.json({ error: 'Failed to load usage' }, { status: 500 })
  }
}
