'use client'

import { useState } from 'react'
import { FileText, Download, Loader2, Lock } from 'lucide-react'
import type { ConstraintsYieldBrief } from '@/lib/estate-buildup/types'
import type { ReviewPackContext } from '@/lib/review-packs/types'
import { listReviewPacks } from '@/lib/review-packs/registry'
import { buildEstateCostPack } from '@/lib/estate-cost/build'

/**
 * Professional review packs — "the buildup IS each professional's review pack". Lists the packs and
 * downloads the available ones (branded PDF from the route). The engineer pack renders off the
 * Constraints & Yield buildup now; QS/valuer are gated until their Phase-3 data exists.
 */
export function ReviewPacksPanel({
  opportunityId,
  opportunity,
  brief,
}: {
  opportunityId: string
  opportunity: { name: string | null; address: string | null; city: string | null; state: string | null; lga: string | null }
  brief: ConstraintsYieldBrief
}) {
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Mirror the route: build the lot-level cost pack from the derived yield + state so the QS pack
  // shows as available (land-subdivision only client-side; the PDF is rendered server-side).
  const lots = brief.yield.authoritativeLots ?? 0
  const costPack = lots > 0 && opportunity.state ? buildEstateCostPack({ lots, state: opportunity.state }) : undefined
  const ctx: ReviewPackContext = { opportunity: { id: opportunityId, ...opportunity }, brief, costPack, preparedOn: '' }

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
          return (
            <div key={pack.kind} className="flex items-center gap-3 border border-gray-100 rounded-lg p-3">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-gray-900">{pack.professionLabel}</div>
                <div className="text-xs text-gray-500">{avail.ok ? pack.title : avail.reason}</div>
              </div>
              {avail.ok ? (
                <button
                  onClick={() => download(pack.kind)}
                  disabled={busy !== null}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-indigo-300 bg-indigo-50 text-indigo-700 font-medium hover:bg-indigo-100 disabled:opacity-60"
                >
                  {busy === pack.kind ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} PDF
                </button>
              ) : (
                <span className="flex-shrink-0 flex items-center gap-1 text-xs text-gray-400"><Lock className="w-3.5 h-3.5" /> Phase 3</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
