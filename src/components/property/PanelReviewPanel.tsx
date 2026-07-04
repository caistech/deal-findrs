'use client'

import { useState, useEffect, useCallback } from 'react'
import { ClipboardCheck, Loader2, CheckCircle2, CircleDashed, AlertTriangle } from 'lucide-react'
import type { PlannerReviewItem } from '@/lib/property-services'
import { FIELD_KEYS, PANEL_REVIEW_FIELDS, type PanelReviewFieldKey } from '@/lib/panel-review/fields'

/**
 * Panel Review — the site factors no data feed can resolve (title, contamination,
 * servicing, native title, on-site survey). A panel professional completes each and
 * it is written back to the shared property record, so the next report for this site
 * shows it done. Reads/writes via /api/opportunities/[id]/panel-review.
 */
export function PanelReviewPanel({
  opportunityId,
  address,
}: {
  opportunityId: string
  address: string | null
}) {
  const [items, setItems] = useState<PlannerReviewItem[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [openField, setOpenField] = useState<PanelReviewFieldKey | null>(null)
  const [summary, setSummary] = useState('')
  const [source, setSource] = useState('')
  const [contributor, setContributor] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const r = await fetch(`/api/opportunities/${opportunityId}/panel-review`)
      const d = await r.json().catch(() => ({}))
      if (!r.ok) {
        setError(d.error === 'no_address' ? 'Add a site address to load the panel review.' : (d.error || 'Could not load panel review.'))
        setItems([])
        return
      }
      setItems((d.items as PlannerReviewItem[]) ?? [])
    } catch {
      setError('Could not load panel review.')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [opportunityId])

  useEffect(() => { load() }, [load])

  function openForm(key: PanelReviewFieldKey) {
    setOpenField(key)
    setSummary('')
    setSource('')
    setContributor('')
  }

  async function submit(key: PanelReviewFieldKey) {
    if (!summary.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      const r = await fetch(`/api/opportunities/${opportunityId}/panel-review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          field: key,
          summary: summary.trim(),
          source: source.trim() || undefined,
          contributor: contributor.trim() || undefined,
        }),
      })
      if (!r.ok) {
        const d = await r.json().catch(() => ({}))
        setError(d.error || 'Write-back failed.')
        return
      }
      setOpenField(null)
      await load()
    } finally {
      setSubmitting(false)
    }
  }

  const byKey = new Map<string, PlannerReviewItem>()
  for (const it of items ?? []) byKey.set(it.key, it)

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-1">
        <ClipboardCheck className="w-5 h-5 text-slate-500" />
        <h3 className="font-semibold text-gray-900">Panel Review</h3>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        The site factors no data feed can resolve — a panel professional completes each and it is
        written back to the shared property record, so the next report for this site shows it done.
      </p>

      {error && (
        <div className="mb-3 flex items-center gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading site dossier…
        </div>
      ) : (
        <div className="space-y-2">
          {FIELD_KEYS.map((key) => {
            const meta = PANEL_REVIEW_FIELDS[key]
            const item = byKey.get(key)
            const completed = item?.status === 'completed' ? item.completed : undefined
            const isOpen = openField === key
            return (
              <div key={key} className="border border-gray-100 rounded-lg p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex items-start gap-2 min-w-0">
                    {completed ? (
                      <CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-500 flex-shrink-0" />
                    ) : (
                      <CircleDashed className="w-4 h-4 mt-0.5 text-gray-300 flex-shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-gray-900">{meta.field}</div>
                      <div className="text-xs text-gray-500">{meta.discipline}</div>
                    </div>
                  </div>
                  <span
                    className={`flex-shrink-0 text-[0.65rem] font-medium px-2 py-0.5 rounded-full border ${
                      completed
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                        : 'border-gray-200 bg-gray-50 text-gray-500'
                    }`}
                  >
                    {completed ? 'Completed' : 'For panel review'}
                  </span>
                </div>

                {completed ? (
                  <div className="mt-2 pl-6 text-sm text-gray-700">
                    <p>{completed.summary}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {[completed.contributor, completed.source, completed.date].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                ) : (
                  <div className="mt-2 pl-6">
                    <p className="text-xs text-gray-500">{meta.note}</p>
                    {!isOpen ? (
                      <button
                        onClick={() => openForm(key)}
                        className="mt-2 px-3 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
                      >
                        Mark complete
                      </button>
                    ) : (
                      <div className="mt-3 space-y-2">
                        <textarea
                          value={summary}
                          onChange={(e) => setSummary(e.target.value)}
                          placeholder={`Finding summary — e.g. ${meta.note}`}
                          rows={3}
                          className="w-full text-base rounded-lg border border-gray-300 p-2 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                        />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            value={source}
                            onChange={(e) => setSource(e.target.value)}
                            placeholder="Source / evidence (optional)"
                            className="w-full text-base rounded-lg border border-gray-300 p-2 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                          />
                          <input
                            value={contributor}
                            onChange={(e) => setContributor(e.target.value)}
                            placeholder="Completed by (optional)"
                            className="w-full text-base rounded-lg border border-gray-300 p-2 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                          />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => submit(key)}
                            disabled={submitting || !summary.trim()}
                            className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-indigo-300 bg-indigo-50 text-indigo-700 font-medium hover:bg-indigo-100 disabled:opacity-60"
                          >
                            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Save write-back
                          </button>
                          <button
                            onClick={() => setOpenField(null)}
                            disabled={submitting}
                            className="px-3 py-2 text-sm rounded-lg border border-gray-300 text-gray-600 font-medium hover:bg-gray-50 disabled:opacity-60"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
      {address && <p className="mt-3 text-[0.65rem] text-gray-400">Site: {address}</p>}
    </div>
  )
}
