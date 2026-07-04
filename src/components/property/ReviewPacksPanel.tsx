'use client'

import { useState, useEffect, useCallback } from 'react'
import { FileText, Download, Loader2, Lock, CheckCircle2, BadgeCheck } from 'lucide-react'
import type { ConstraintsYieldBrief } from '@/lib/estate-buildup/types'
import type { ReviewPackContext, ReviewPackKind } from '@/lib/review-packs/types'
import { listReviewPacks } from '@/lib/review-packs/registry'
import { BANKABLE_REQUIRED, isBankableReady } from '@/lib/review-packs/certification'
import { buildEstateCostPack } from '@/lib/estate-cost/build'
import { buildValuationPack } from '@/lib/estate-valuation/build'

/**
 * Professional review packs — "the buildup IS each professional's review pack". Lists the packs and
 * downloads the available ones (branded PDF from the route). Engineer renders off the Constraints &
 * Yield buildup; QS off the lot-level cost buildup; valuer off GRV & absorption (the AVM cross-check
 * is added server-side at render). A pack shows locked with a reason until its data source exists.
 */
export function ReviewPacksPanel({
  opportunityId,
  opportunity,
  brief,
}: {
  opportunityId: string
  opportunity: {
    name: string | null; address: string | null; city: string | null; state: string | null; lga: string | null
    avgSalePrice?: number | null; preSalesPercent?: number | null
  }
  brief: ConstraintsYieldBrief
}) {
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [certs, setCerts] = useState<Record<string, { certifiedByName: string; certifiedAt: string }>>({})

  const loadCerts = useCallback(async () => {
    try {
      const r = await fetch(`/api/opportunities/${opportunityId}/pack-certification`)
      if (r.ok) {
        const d = await r.json()
        const map: Record<string, { certifiedByName: string; certifiedAt: string }> = {}
        for (const c of d.certifications || []) map[c.kind] = { certifiedByName: c.certified_by_name, certifiedAt: c.certified_at }
        setCerts(map)
      }
    } catch {
      // certifications are non-blocking context
    }
  }, [opportunityId])
  useEffect(() => { loadCerts() }, [loadCerts])

  async function certify(kind: string) {
    const certifiedByName = window.prompt('Certified by (professional name + firm):')?.trim()
    if (!certifiedByName) return
    setBusy(`cert:${kind}`)
    setError(null)
    try {
      const r = await fetch(`/api/opportunities/${opportunityId}/pack-certification`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, certifiedByName }),
      })
      if (r.ok) await loadCerts()
      else setError('Could not record the certification.')
    } finally { setBusy(null) }
  }

  // Mirror the route so each pack's availability is computed client-side (PDFs render server-side).
  const lots = brief.yield.authoritativeLots ?? 0
  const costPack = lots > 0 && opportunity.state ? buildEstateCostPack({ lots, state: opportunity.state }) : undefined
  const grvPerLot = opportunity.avgSalePrice ?? 0
  const preSales = (opportunity.preSalesPercent ?? 0) > 1 ? (opportunity.preSalesPercent ?? 0) / 100 : opportunity.preSalesPercent ?? 0
  const valuationPack = lots > 0 && grvPerLot > 0 ? buildValuationPack({ lots, grvPerLot, preSalesPercent: preSales }) : undefined
  const { avgSalePrice: _avg, preSalesPercent: _ps, ...oppMeta } = opportunity
  const ctx: ReviewPackContext = { opportunity: { id: opportunityId, ...oppMeta }, brief, costPack, valuationPack, preparedOn: '' }

  async function download(kind: string) {
    setBusy(kind)
    setError(null)
    try {
      const r = await fetch(`/api/opportunities/${opportunityId}/review-pack/${kind}`)
      if (!r.ok) {
        const d = await r.json().catch(() => ({}))
        setError(d.reason || d.error || 'Could not generate the pack.')
        return
      }
      const blob = await r.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${(opportunity.name || 'estate').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${kind}-review-pack.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      setError('Download failed. Try again.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-1">
        <FileText className="w-5 h-5 text-slate-500" />
        <h3 className="font-semibold text-gray-900">Professional Review Packs</h3>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        The buildup, exported per professional so they review and certify rather than rebuild. Every
        figure carries its working and source; hard-stop items are flagged for their determination.
      </p>

      {error && <div className="mb-3 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2">{error}</div>}

      <div className="space-y-2">
        {listReviewPacks().map((pack) => {
          const avail = pack.available(ctx)
          const cert = certs[pack.kind]
          return (
            <div key={pack.kind} className="flex items-center gap-3 border border-gray-100 rounded-lg p-3">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-gray-900">{pack.professionLabel}</div>
                <div className="text-xs text-gray-500">{avail.ok ? pack.title : avail.reason}</div>
                {cert && (
                  <div className="text-[0.65rem] text-emerald-700 flex items-center gap-0.5 mt-0.5">
                    <BadgeCheck className="w-3 h-3" /> Certified by {cert.certifiedByName} · {new Date(cert.certifiedAt).toLocaleDateString()}
                  </div>
                )}
              </div>
              {avail.ok ? (
                <div className="flex-shrink-0 flex items-center gap-1.5">
                  <button
                    onClick={() => download(pack.kind)}
                    disabled={busy !== null}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-indigo-300 bg-indigo-50 text-indigo-700 font-medium hover:bg-indigo-100 disabled:opacity-60"
                  >
                    {busy === pack.kind ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} PDF
                  </button>
                  <button
                    onClick={() => certify(pack.kind)}
                    disabled={busy !== null}
                    className={`flex items-center gap-1 px-2.5 py-2 text-sm rounded-lg border font-medium disabled:opacity-60 ${
                      cert ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {busy === `cert:${pack.kind}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} {cert ? 'Re-certify' : 'Certify'}
                  </button>
                </div>
              ) : (
                <span className="flex-shrink-0 flex items-center gap-1 text-xs text-gray-400"><Lock className="w-3.5 h-3.5" /> Locked</span>
              )}
            </div>
          )
        })}
      </div>

      {/* Bankable readiness — the QS + valuer certifications gate the deal-model v1→v2 promotion. */}
      {(() => {
        const certified = Object.keys(certs) as ReviewPackKind[]
        const ready = isBankableReady(certified)
        const missing = BANKABLE_REQUIRED.filter((k) => !certified.includes(k))
        return (
          <div className={`mt-4 text-xs rounded-lg p-2.5 border ${ready ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
            {ready ? (
              <span className="flex items-center gap-1.5"><BadgeCheck className="w-4 h-4" /> QS + valuer certified — the F2K deal model can be saved as a <strong>bankable</strong> snapshot (v2).</span>
            ) : (
              <>Bankable (v2) deal-model snapshot needs certified: <strong>{missing.join(' + ')}</strong>. Indicative (v1) is available now.</>
            )}
          </div>
        )
      })()}
    </div>
  )
}
