'use client'

import { useState, useRef } from 'react'
import { FileUp, Loader2, Check, AlertTriangle, FileText } from 'lucide-react'
import type { DocumentKind } from '@caistech/document-ingest'

interface IngestResult {
  kind: DocumentKind
  extracted: {
    wapcRef: string | null
    lga: string | null
    residentialLots: number | null
    minLotSizeSqm: number | null
    avgLotSizeSqm: number | null
    maxLotSizeSqm: number | null
    netDevelopableHa: number | null
    parentAreaHa: number | null
    posSqm: number | null
    easements?: { purpose: string; detail: string | null }[]
    reserves?: { purpose: string; detail: string | null }[]
    lotSizeBands?: { band: string; count: number }[]
    conditions: { category: string }[]
  }
  dealModelStage: string
  lifecycleStatus: string
  lifecycleLabel: string
  outstanding: string[]
  referralCleared: boolean
}

/** The document types the operator can ingest during onboarding. */
const DOC_KINDS: { value: DocumentKind; label: string; blurb: string }[] = [
  { value: 'wapc_subdivision_approval', label: 'WAPC decision letter', blurb: 'the approval + the conditions of approval' },
  { value: 'subdivision_plan', label: 'Subdivision plan', blurb: 'the deposited plan / plan-of-subdivision drawing — lot geometry, reserves, easements' },
  { value: 'title', label: 'Title', blurb: 'certificate of title — tenure + encumbrances' },
  { value: 'other', label: 'Other document', blurb: 'any other planning evidence' },
]

/**
 * Onboarding capability: upload a development document to establish the deal's evidence-derived
 * current status. Pick the document type — a WAPC decision letter (approval + conditions), the
 * deposited subdivision plan (lot geometry + reserves + easements), a title, or other. The extracted
 * yield + min-lot resolve the planner referral; the stage gates each document evidences roll up to a
 * lifecycle status. `onIngested` lets the parent re-render with the resolution applied.
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
  onIngested: (resolution: {
    lots: number | null
    minLotSize: number | null
    zoneCode: string | null
    /** Estate site area in m² — parent-parcel area preferred, else net developable. */
    siteAreaSqm: number | null
    /** Reserves + easements read off an ingested plan (partially resolves the tenure gap). */
    planTenure: { easements: { purpose: string; detail: string | null }[]; reserves: { purpose: string; detail: string | null }[] } | null
  }) => void
}) {
  const [busy, setBusy] = useState(false)
  const [kind, setKind] = useState<DocumentKind>('wapc_subdivision_approval')
  const [result, setResult] = useState<IngestResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const selected = DOC_KINDS.find((k) => k.value === kind) ?? DOC_KINDS[0]

  async function upload(file: File) {
    setBusy(true)
    setError(null)
    try {
      const body = new FormData()
      body.append('file', file)
      body.append('kind', kind)
      const res = await fetch(`/api/opportunities/${opportunityId}/ingest-approval`, { method: 'POST', body })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error === 'extraction_failed' ? 'Could not read the document — try a clearer PDF.' : (data.error || 'Ingest failed'))
        return
      }
      const d = data as IngestResult
      setResult(d)
      const areaHa = d.extracted.parentAreaHa ?? d.extracted.netDevelopableHa
      const easeList = d.extracted.easements ?? []
      const reserveList = d.extracted.reserves ?? []
      onIngested({
        lots: d.extracted.residentialLots ?? null,
        minLotSize: d.extracted.minLotSizeSqm ?? null,
        zoneCode: d.extracted.wapcRef
          ? `Approved plan (WAPC ${d.extracted.wapcRef})`
          : d.referralCleared
            ? 'Approved subdivision'
            : null,
        siteAreaSqm: areaHa != null ? Math.round(areaHa * 10_000) : null,
        planTenure: easeList.length || reserveList.length ? { easements: easeList, reserves: reserveList } : null,
      })
    } catch {
      setError('Upload failed — check your connection and retry.')
    } finally {
      setBusy(false)
    }
  }

  const ex = result?.extracted
  const reserves = ex?.reserves ?? []
  const easements = ex?.easements ?? []
  const bands = ex?.lotSizeBands ?? []

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="rounded-md bg-indigo-50 p-2 text-indigo-600">
          <FileText className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-gray-900">Establish current status from documents</h3>
          <p className="mt-1 text-sm text-gray-600">
            Upload whatever you have — the WAPC decision letter, the deposited subdivision plan, or a title.
            We extract the evidence (approved yield, conditions, lot geometry, reserves &amp; easements), resolve
            the planner referral, and derive where this deal actually sits in the lifecycle — not a typed-in number.
            Upload more than one; each document adds to the picture.
          </p>

          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
            <label className="flex-1">
              <span className="block text-xs font-medium text-gray-600">Document type</span>
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value as DocumentKind)}
                disabled={busy}
                className="mt-1 w-full min-h-[44px] rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
              >
                {DOC_KINDS.map((k) => (
                  <option key={k.value} value={k.value}>{k.label}</option>
                ))}
              </select>
            </label>
            <div>
              <input
                ref={fileRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) upload(f)
                  e.target.value = ''
                }}
              />
              <button
                type="button"
                disabled={busy}
                onClick={() => fileRef.current?.click()}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
                {busy ? 'Reading document…' : `Upload ${selected.label.toLowerCase()}`}
              </button>
            </div>
          </div>
          {selected.blurb && <p className="mt-1 text-xs text-gray-500">{selected.label}: {selected.blurb}.</p>}

          {error && (
            <div className="mt-3 flex items-start gap-2 rounded-md bg-red-50 p-3 text-sm text-red-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {result && ex && (
            <div className="mt-4 space-y-3 rounded-md border border-emerald-200 bg-emerald-50/60 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-emerald-800">
                <Check className="h-4 w-4" />
                {result.referralCleared ? `${selected.label} ingested — planner referral resolved` : `${selected.label} ingested`}
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-gray-700 sm:grid-cols-3">
                <Stat label="Current status" value={result.lifecycleLabel} />
                <Stat label="Deal-model stage" value={result.dealModelStage} />
                <Stat label="Residential lots" value={ex.residentialLots?.toString() ?? '—'} />
                <Stat label="Min lot size" value={ex.minLotSizeSqm ? `${ex.minLotSizeSqm} m²` : '—'} />
                <Stat label="Avg lot size" value={ex.avgLotSizeSqm ? `${ex.avgLotSizeSqm} m²` : '—'} />
                {ex.maxLotSizeSqm != null && <Stat label="Max lot size" value={`${ex.maxLotSizeSqm} m²`} />}
                <Stat label="Conditions" value={ex.conditions.length.toString()} />
                {ex.posSqm != null && <Stat label="Public open space" value={`${ex.posSqm} m²`} />}
                {reserves.length > 0 && <Stat label="Reserves" value={reserves.length.toString()} />}
                {easements.length > 0 && <Stat label="Easements" value={easements.length.toString()} />}
                {ex.wapcRef && <Stat label="WAPC ref" value={ex.wapcRef} />}
                {ex.lga && <Stat label="LGA" value={ex.lga} />}
                {ex.netDevelopableHa != null && <Stat label="Net area" value={`${ex.netDevelopableHa} ha`} />}
              </div>

              {reserves.length > 0 && (
                <div className="border-t border-emerald-200 pt-2 text-xs text-gray-600">
                  <span className="font-medium text-gray-700">Reserves:</span>{' '}
                  {reserves.map((r) => (r.detail ? `${r.purpose} (${r.detail})` : r.purpose)).join(' · ')}
                </div>
              )}
              {easements.length > 0 && (
                <div className="text-xs text-gray-600">
                  <span className="font-medium text-gray-700">Easements:</span>{' '}
                  {easements.map((e) => (e.detail ? `${e.purpose} (${e.detail})` : e.purpose)).join(' · ')}
                </div>
              )}
              {bands.length > 0 && (
                <div className="text-xs text-gray-600">
                  <span className="font-medium text-gray-700">Lot mix:</span>{' '}
                  {bands.map((b) => `${b.band}: ${b.count}`).join(' · ')}
                </div>
              )}
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
