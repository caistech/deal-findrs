'use client'

import { useEffect, useState } from 'react'
import { Loader2, BarChart3 } from 'lucide-react'

interface UsageRow {
  companyId: string
  companyName: string
  calls: number
  tokens: number
  costUsd: number
  modules: Record<string, number>
}

export default function AdminUsagePage() {
  const [rows, setRows] = useState<UsageRow[]>([])
  const [totals, setTotals] = useState<{ calls: number; tokens: number; costUsd: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/usage')
      .then(async (r) => {
        const d = await r.json()
        if (!r.ok) throw new Error(d.error || 'Failed to load usage')
        setRows(d.rows || [])
        setTotals(d.totals || null)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const fmt = (n: number) => n.toLocaleString('en-AU')
  const fmtCost = (n: number) => `$${n.toFixed(2)}`

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-violet-600" /> Usage
          </h1>
          <p className="text-gray-600 mt-1">
            AI usage attributed per organisation — total calls, tokens and cost across the DevFinance
            modules. Use this to see which tenants drive cost and to reconcile metered billing.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center gap-3 text-gray-600 p-8"><Loader2 className="w-5 h-5 animate-spin" /> Loading usage…</div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">{error}</div>
        ) : (
          <>
            {totals && (
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <p className="text-xs text-gray-500">Total Calls</p>
                  <p className="text-xl font-bold text-gray-900">{fmt(totals.calls)}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <p className="text-xs text-gray-500">Total Tokens</p>
                  <p className="text-xl font-bold text-gray-900">{fmt(totals.tokens)}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <p className="text-xs text-gray-500">Total Cost</p>
                  <p className="text-xl font-bold text-gray-900">{fmtCost(totals.costUsd)}</p>
                </div>
              </div>
            )}

            {rows.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-500">No AI usage recorded yet.</div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
                <table className="w-full text-sm min-w-[640px]">
                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                    <tr>
                      <th className="text-left font-medium px-4 py-3">Organisation</th>
                      <th className="text-right font-medium px-4 py-3">Calls</th>
                      <th className="text-right font-medium px-4 py-3">Tokens</th>
                      <th className="text-right font-medium px-4 py-3">Cost (USD)</th>
                      <th className="text-left font-medium px-4 py-3">Modules</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {rows.map((r) => (
                      <tr key={r.companyId} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{r.companyName}</td>
                        <td className="px-4 py-3 text-right text-gray-600">{fmt(r.calls)}</td>
                        <td className="px-4 py-3 text-right text-gray-600">{fmt(r.tokens)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900">{fmtCost(r.costUsd)}</td>
                        <td className="px-4 py-3 text-gray-500">
                          {Object.entries(r.modules).map(([m, n]) => `${m} (${n})`).join(', ') || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
