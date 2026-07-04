'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { UserCog, Loader2, Check, X, Pencil, ExternalLink, Send, AlertTriangle } from 'lucide-react'

interface Citation { title: string; source_url: string; version_date: string | null }
interface Finding {
  id: string; dimension: string; claim: string; ai_rationale: string; current_text: string | null
  citations: Citation[]; confidence: string; needs_human: boolean; status: string; reviewer_note: string | null
}
interface PlannerCandidate { id: string; name: string; firm: string | null; email: string | null }
interface Assessment {
  id: string; status: string; state: string | null; lga: string | null
  resolved_zone_code: string | null; resolved_min_lot_size: number | null; resolved_lots: number | null
  assigned_planner_id: string | null; assigned_planner_name: string | null; planner_gap: boolean
}

const STATUS_BADGE: Record<string, string> = {
  ai_draft: 'bg-gray-100 text-gray-600', approved: 'bg-emerald-100 text-emerald-700',
  edited: 'bg-blue-100 text-blue-700', rejected: 'bg-red-100 text-red-700',
}

/**
 * The planner review board for an opportunity's referral: create it, review the KB-cited findings
 * (approve/edit/reject), and set the structured resolution (zone / min-lot / lots) that flows back
 * into the buildup. `onResolved` lets the parent re-render with the resolution applied.
 */
export function PlannerReferralPanel({ opportunityId, onResolved }: { opportunityId: string; onResolved: () => void }) {
  const [assessment, setAssessment] = useState<Assessment | null>(null)
  const [findings, setFindings] = useState<Finding[]>([])
  const [candidates, setCandidates] = useState<PlannerCandidate[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [res, setRes] = useState({ zone: '', minLot: '', lots: '' })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch(`/api/opportunities/${opportunityId}/planner-referral`)
      if (r.ok) {
        const d = await r.json()
        setAssessment(d.assessment)
        setFindings(d.findings || [])
        setCandidates(d.plannerCandidates || [])
        if (d.assessment) setRes({
          zone: d.assessment.resolved_zone_code || '',
          minLot: d.assessment.resolved_min_lot_size?.toString() || '',
          lots: d.assessment.resolved_lots?.toString() || '',
        })
      }
    } finally {
      setLoading(false)
    }
  }, [opportunityId])
  useEffect(() => { load() }, [load])

  async function create() {
    setBusy(true)
    try {
      const r = await fetch(`/api/opportunities/${opportunityId}/planner-referral`, { method: 'POST' })
      if (r.ok) { const d = await r.json(); setAssessment(d.assessment); setFindings(d.findings || []); setCandidates(d.plannerCandidates || []) }
    } finally { setBusy(false) }
  }

  async function reassign(plannerId: string) {
    if (!assessment) return
    setBusy(true)
    try {
      const r = await fetch(`/api/planning-assessment/${assessment.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedPlannerId: plannerId || null }),
      })
      if (r.ok) await load()
    } finally { setBusy(false) }
  }

  async function act(f: Finding, action: 'approve' | 'reject' | 'edit' | 'note', payload?: { text?: string; note?: string }) {
    await fetch(`/api/planning-finding/${f.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...payload }),
    })
    setEditId(null)
    load()
  }

  async function approveResolution() {
    if (!assessment) return
    setBusy(true)
    try {
      const r = await fetch(`/api/planning-assessment/${assessment.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resolvedZoneCode: res.zone || null,
          resolvedMinLotSize: res.minLot ? Number(res.minLot) : null,
          resolvedLots: res.lots ? Number(res.lots) : null,
          status: 'approved',
        }),
      })
      if (r.ok) { await load(); onResolved() }
    } finally { setBusy(false) }
  }

  if (loading) {
    return <div className="bg-white rounded-xl border border-gray-200 p-6 flex items-center gap-2 text-gray-500"><Loader2 className="w-4 h-4 animate-spin" /> Loading referral…</div>
  }

  return (
    <div className="bg-white rounded-xl border border-indigo-200 p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-1">
        <UserCog className="w-5 h-5 text-indigo-500" />
        <h3 className="font-semibold text-gray-900">Planner Referral</h3>
        {assessment && <span className={`ml-auto px-2 py-0.5 rounded text-xs font-medium ${assessment.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'}`}>{assessment.status}</span>}
      </div>
      <p className="text-sm text-gray-500 mb-4">
        The datasets couldn&apos;t resolve the zone/yield for this site. A planner reviews the KB-cited
        findings and sets the resolution, which flows back into the Constraints &amp; Yield Brief.
      </p>

      {!assessment ? (
        <button onClick={create} disabled={busy} className="w-full px-4 py-3 border border-indigo-300 bg-indigo-50 text-indigo-700 rounded-xl font-bold hover:bg-indigo-100 disabled:opacity-60 flex items-center justify-center gap-2">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCog className="w-4 h-4" />} Create planner referral
        </button>
      ) : (
        <div className="space-y-4">
          {/* Routing — the referral is pushed to the state's planner panel */}
          <div className={`rounded-lg border p-3 ${assessment.planner_gap ? 'border-amber-200 bg-amber-50' : 'border-emerald-100 bg-emerald-50/60'}`}>
            {assessment.planner_gap ? (
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-amber-800">
                  No planner on the <span className="font-semibold">{assessment.state || 'this state'}</span> panel — this referral
                  can&apos;t be routed. <Link href="/estate-team" className="underline font-medium">Add a planner to the directory</Link> to route it.
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                <Send className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span className="text-xs text-gray-600">Routed to the {assessment.state} planner panel:</span>
                <span className="text-xs font-semibold text-gray-900">{assessment.assigned_planner_name}</span>
                {candidates.length > 1 && (
                  <select
                    value={assessment.assigned_planner_id ?? ''}
                    onChange={(e) => reassign(e.target.value)}
                    disabled={busy}
                    className="ml-auto text-xs border border-gray-300 rounded px-1.5 py-1 bg-white disabled:opacity-60"
                    aria-label="Reassign planner"
                  >
                    {candidates.map((c) => (
                      <option key={c.id} value={c.id}>{c.firm ? `${c.name} (${c.firm})` : c.name}</option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>

          {/* Findings */}
          <div className="space-y-3">
            {findings.map((f) => (
              <div key={f.id} className="border border-gray-100 rounded-lg p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900">{f.current_text || f.claim}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{f.ai_rationale}</div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {f.needs_human && <span className="px-1.5 py-0.5 rounded text-[0.6rem] bg-amber-100 text-amber-800">needs human</span>}
                    <span className={`px-1.5 py-0.5 rounded text-[0.6rem] font-medium ${STATUS_BADGE[f.status]}`}>{f.status}</span>
                  </div>
                </div>
                {f.citations.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    {f.citations.map((c, i) => (
                      <a key={i} href={c.source_url} target="_blank" rel="noopener noreferrer" className="text-[0.65rem] text-indigo-600 hover:underline flex items-center gap-0.5">
                        <ExternalLink className="w-3 h-3" /> {c.title}
                      </a>
                    ))}
                  </div>
                )}
                {f.reviewer_note && <div className="mt-1 text-xs text-gray-600 italic">Note: {f.reviewer_note}</div>}
                {editId === f.id ? (
                  <div className="mt-2 flex gap-2">
                    <input value={editText} onChange={(e) => setEditText(e.target.value)} className="flex-1 text-sm border border-gray-300 rounded px-2 py-1" placeholder="Edited conclusion" />
                    <button onClick={() => act(f, 'edit', { text: editText })} className="px-2 py-1 rounded bg-blue-600 text-white text-xs">Save</button>
                    <button onClick={() => setEditId(null)} className="px-2 py-1 rounded border border-gray-300 text-xs">Cancel</button>
                  </div>
                ) : (
                  <div className="mt-2 flex gap-1.5">
                    <button onClick={() => act(f, 'approve')} className="text-xs px-2 py-1 rounded border border-emerald-300 text-emerald-700 hover:bg-emerald-50 flex items-center gap-1"><Check className="w-3 h-3" /> Approve</button>
                    <button onClick={() => { setEditId(f.id); setEditText(f.current_text || f.claim) }} className="text-xs px-2 py-1 rounded border border-gray-300 hover:bg-gray-50 flex items-center gap-1"><Pencil className="w-3 h-3" /> Edit</button>
                    <button onClick={() => act(f, 'reject')} className="text-xs px-2 py-1 rounded border border-red-300 text-red-700 hover:bg-red-50 flex items-center gap-1"><X className="w-3 h-3" /> Reject</button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Resolution */}
          <div className="border-t border-gray-100 pt-4">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Resolution (flows back to the buildup)</h4>
            <div className="grid grid-cols-3 gap-2 mb-2">
              <label className="block"><span className="text-xs text-gray-500">Zone code</span>
                <input value={res.zone} onChange={(e) => setRes({ ...res, zone: e.target.value })} className="w-full text-sm border border-gray-300 rounded px-2 py-1.5" placeholder="e.g. R25" /></label>
              <label className="block"><span className="text-xs text-gray-500">Min lot (sqm)</span>
                <input type="number" value={res.minLot} onChange={(e) => setRes({ ...res, minLot: e.target.value })} className="w-full text-sm border border-gray-300 rounded px-2 py-1.5" /></label>
              <label className="block"><span className="text-xs text-gray-500">Yield (lots)</span>
                <input type="number" value={res.lots} onChange={(e) => setRes({ ...res, lots: e.target.value })} className="w-full text-sm border border-gray-300 rounded px-2 py-1.5" /></label>
            </div>
            <button onClick={approveResolution} disabled={busy} className="w-full px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-lg font-bold disabled:opacity-60 flex items-center justify-center gap-2">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {assessment.status === 'approved' ? 'Update resolution' : 'Approve & resolve'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
