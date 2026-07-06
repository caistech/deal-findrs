'use client'

import { useState, useRef } from 'react'
import { FileUp, Loader2, Check, AlertTriangle, FileText } from 'lucide-react'

interface IngestResult {
  extracted: {
    wapcRef: string | null
    lga: string | null
    residentialLots: number | null
    minLotSizeSqm: number | null
    avgLotSizeSqm: number | null
    netDevelopableHa: number | null
    conditions: { category: string }[]
  }
  dealModelStage: string
  lifecycleStatus: string
  lifecycleLabel: string
  outstanding: string[]
  referralCleared: boolean
}

/**
 * Onboarding capability: upload a development document (Phase 1 — a WAPC subdivision-approval letter
 * / plan) to establish the deal's evidence-derived current status. The approved yield + min-lot
 * resolve the planner referral, and the stage gates the document evidences roll up to a lifecycle
 * status. `onIngested` lets the parent re-render with the resolution applied.
 */
export function ApprovalIngestPanel({
  opportunityId,
  onIngested,
}: {
  opportunityId: string
  /**
   * Called after a successful ingest with the approval's resolved yield inputs, so the parent can
   * feed them into the Constraints & Yield buildup as `operatorResolved` (clears the planner referral).
   */
  onIngested: (resolution: { lots: number | null; minLotSize: number | null; zoneCode: string | null }) => void
}) {
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<IngestResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function upload(file: File) {
    setBusy(true)
    setError(null)
    try {
      const body = new FormData()
      body.append('file', file)
      body.append('kind', 'wapc_subdivision_approval')
      const res = await fetch(`/api/opportunities/${opportunityId}/ingest-approval`, { method: 'POST', body })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error === 'extraction_failed' ? 'Could not read the approval — try a clearer PDF.' : (data.error || 'Ingest failed'))
        return
      }
      const d = data as IngestResult
      setResult(d)
      onIngested({
        lots: d.extracted.residentialLots ?? null,
        minLotSize: d.extracted.minLotSizeSqm ?? null,
        zoneCode: d.extracted.wapcRef
          ? `Approved plan (WAPC ${d.extracted.wapcRef})`
          : d.referralCleared
            ? 'Approved subdivision'
            : null,
      })
    } catch {
      setError('Upload failed — check your connection and retry.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="rounded-md bg-indigo-50 p-2 text-indigo-600">
          <FileText className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-gray-900">Establish current status from documents</h3>
          <p className="mt-1 text-sm text-gray-600">
            Upload the subdivision approval (WAPC decision letter / plan). We extract the approved yield and
            conditions, resolve the planner referral, and derive where this deal actually sits in the development
            lifecycle — from the evidence, not a typed-in number.
          </p>

          <div className="mt-3">
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) upload(f)
              }}
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
              {busy ? 'Reading document…' : 'Upload planning approval'}
            </button>
          </div>

          {error && (
            <div className="mt-3 flex items-start gap-2 rounded-md bg-red-50 p-3 text-sm text-red-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {result && (
            <div className="mt-4 space-y-3 rounded-md border border-emerald-200 bg-emerald-50/60 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-emerald-800">
                <Check className="h-4 w-4" />
                {result.referralCleared ? 'Approval ingested — planner referral resolved' : 'Approval ingested'}
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-gray-700 sm:grid-cols-3">
                <Stat label="Current status" value={result.lifecycleLabel} />
                <Stat label="Deal-model stage" value={result.dealModelStage} />
                <Stat label="Approved lots" value={result.extracted.residentialLots?.toString() ?? '—'} />
                <Stat label="Min lot size" value={result.extracted.minLotSizeSqm ? `${result.extracted.minLotSizeSqm} m²` : '—'} />
                <Stat label="Avg lot size" value={result.extracted.avgLotSizeSqm ? `${result.extracted.avgLotSizeSqm} m²` : '—'} />
                <Stat label="Conditions" value={result.extracted.conditions.length.toString()} />
                {result.extracted.wapcRef && <Stat label="WAPC ref" value={result.extracted.wapcRef} />}
                {result.extracted.lga && <Stat label="LGA" value={result.extracted.lga} />}
                {result.extracted.netDevelopableHa != null && <Stat label="Net area" value={`${result.extracted.netDevelopableHa} ha`} />}
              </div>
              {result.outstanding.length > 0 && (
                <div className="border-t border-emerald-200 pt-2 text-xs text-gray-600">
                  <span className="font-medium text-gray-700">Still to de-risk:</span> {result.outstanding.join(' · ')}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-gray-400">{label}</div>
      <div className="font-medium text-gray-900">{value}</div>
    </div>
  )
}
