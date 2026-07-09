// PUBLIC (no-auth) status report. An operator shares this link with a funder / partner / co-owner.
// It renders the point-in-time status snapshot stored on the share token — verdict + two-exit
// economics + lifecycle + conditions-clearance progress + open gaps. No login, no PII beyond what
// the sharer chose to expose (the assembled snapshot).

import Link from 'next/link'
import { CheckCircle, AlertTriangle, XCircle, CircleDashed, Clock } from 'lucide-react'
import { CorporateFooter } from '@/components/corporate/CorporateFooter'
import type { StatusSnapshot } from '@/lib/status-report/assemble'

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function fetchStatus(token: string): Promise<StatusSnapshot | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://deal-findrs.vercel.app'
    const res = await fetch(`${baseUrl}/api/share?token=${encodeURIComponent(token)}`, { cache: 'no-store' })
    if (!res.ok) return null
    const data = await res.json()
    if (data.kind !== 'status' || !data.status_snapshot) return null
    return data.status_snapshot as StatusSnapshot
  } catch {
    return null
  }
}

const money = (n: number) => `$${(n / 1e6).toFixed(n >= 1e6 ? 1 : 2)}M`
const titleCase = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

const RAG = {
  green: { cls: 'bg-emerald-100 text-emerald-700 border-emerald-200', Icon: CheckCircle, label: 'GREEN' },
  amber: { cls: 'bg-amber-100 text-amber-700 border-amber-200', Icon: AlertTriangle, label: 'AMBER' },
  red: { cls: 'bg-red-100 text-red-700 border-red-200', Icon: XCircle, label: 'RED' },
}

export default async function StatusReportPage({ params }: { params: { token: string } }) {
  const s = await fetchStatus(params.token)

  if (!s) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <CircleDashed className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900">Status report not found</h1>
          <p className="text-gray-500 mt-1">This link may have expired or been revoked.</p>
          <Link href="/" className="inline-block mt-4 text-emerald-600 hover:underline">Go to DealFindrs</Link>
        </div>
      </div>
    )
  }

  const rag = s.ragStatus ? RAG[s.ragStatus] : null
  const gmPct = s.economics.landOnly?.gmPct ?? s.economics.grossMarginPct

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-900">DealFindrs</span>
            <span className="text-gray-400 text-sm">· Status Report</span>
          </div>
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> as at {new Date(s.generatedAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900">{s.name ?? 'Property Development'}</h1>
          <p className="text-gray-500 mt-1">
            {[s.address, s.lots ? `${s.lots} lots` : null, s.landSizeSqm ? `${s.landSizeSqm.toLocaleString()} ${s.landSizeUnit ?? 'sqm'}` : null]
              .filter(Boolean)
              .join(' · ')}
          </p>

          {/* Verdict + current status */}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            {rag && (
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-sm font-semibold ${rag.cls}`}>
                <rag.Icon className="w-4 h-4" /> {rag.label}
              </span>
            )}
            {s.lifecycleStatus && (
              <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-sm">{titleCase(s.lifecycleStatus)}</span>
            )}
            {s.dealModelStage && (
              <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-sm">Stage: {s.dealModelStage}</span>
            )}
          </div>

          {/* Two-exit economics */}
          {(s.economics.landOnly || gmPct != null) && (
            <div className="mt-6">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Exit economics</h2>
              {s.economics.landOnly && s.economics.houseLand ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-xl bg-gray-50">
                    <p className="text-xs text-gray-500">Land-only <span className="text-gray-400">(verdict)</span></p>
                    <p className="text-2xl font-bold text-gray-900">{s.economics.landOnly.gmPct.toFixed(1)}%</p>
                    <p className="text-xs text-gray-500">{money(s.economics.landOnly.revenue)} rev · {money(s.economics.landOnly.profit)} profit</p>
                  </div>
                  <div className="p-4 rounded-xl bg-indigo-50/50">
                    <p className="text-xs text-gray-500">House-and-land <span className="text-gray-400">(upside)</span></p>
                    <p className="text-2xl font-bold text-gray-900">{s.economics.houseLand.gmPct.toFixed(1)}%</p>
                    <p className="text-xs text-gray-500">{money(s.economics.houseLand.revenue)} rev · {money(s.economics.houseLand.profit)} profit</p>
                  </div>
                </div>
              ) : gmPct != null ? (
                <div className="p-4 rounded-xl bg-gray-50 inline-block">
                  <p className="text-2xl font-bold text-gray-900">{gmPct.toFixed(1)}%</p>
                  <p className="text-xs text-gray-500">gross margin</p>
                </div>
              ) : null}
            </div>
          )}

          {/* Conditions clearance */}
          {s.conditions.total > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Conditions clearance</h2>
                <span className="text-sm font-medium text-gray-700">{s.conditions.cleared}/{s.conditions.total} cleared</span>
              </div>
              <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                <div className="h-full bg-emerald-500" style={{ width: `${(s.conditions.cleared / s.conditions.total) * 100}%` }} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {s.conditions.byCategory.map((c) => (
                  <span key={c.category} className="text-xs px-2 py-1 rounded-md bg-gray-50 border border-gray-100 text-gray-600">
                    {titleCase(c.category)}: {c.cleared}/{c.total}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Open gaps & next steps */}
          {s.gaps.length > 0 && (
            <div className="mt-6">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Still to de-risk</h2>
              <ul className="space-y-2">
                {s.gaps.map((g, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <CircleDashed className="w-4 h-4 mt-0.5 text-gray-300 flex-shrink-0" />
                    <div>
                      <span className="text-gray-800 font-medium">{g.label}</span>
                      <span className="ml-2 text-[0.65rem] uppercase tracking-wide text-gray-400">{g.provenance.replace(/-/g, ' ')}</span>
                      <p className="text-xs text-gray-500">{g.detail}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="mt-8 pt-4 border-t border-gray-100 text-xs text-gray-400">
            Shared by {s.partnerName ?? 'a DealFindrs partner'} · Indicative status, subject to formal professional review.
          </p>
        </div>

        <div className="mt-6 text-center">
          <Link href="/" className="text-sm text-emerald-600 hover:underline">Powered by DealFindrs →</Link>
        </div>
      </div>
      <CorporateFooter />
    </div>
  )
}
