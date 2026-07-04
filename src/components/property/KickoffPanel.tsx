'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Users, AlertTriangle, Check, Trash2, Plus, Loader2 } from 'lucide-react'
import type { PropertyProfile } from '@/lib/property-services'
import { buildConstraintsYield } from '@/lib/estate-buildup/build'
import { requiredOccupations, assembleKickoffTeam } from '@/lib/estate-team/assemble'
import { OCCUPATION_LABELS, type TeamMember, type Occupation } from '@/lib/estate-team/types'

const TIER_BADGE: Record<string, string> = {
  core: 'bg-slate-100 text-slate-700',
  drive: 'bg-blue-100 text-blue-700',
  triggered: 'bg-amber-100 text-amber-800',
}
const ACCEPTANCE_COLOR: Record<string, string> = {
  invited: 'text-gray-500', accepted: 'text-emerald-600', declined: 'text-red-600', tentative: 'text-amber-600',
}

interface Attendee { id: string; occupation: string; name: string | null; acceptance: string }
interface Action { id: string; description: string; owner: string | null; status: string; due_date: string | null }
interface Kickoff { id: string; status: string }

export function KickoffPanel({ opportunityId, profile, state }: { opportunityId: string; profile: PropertyProfile; state: string | null }) {
  const [directory, setDirectory] = useState<TeamMember[]>([])
  const [kickoff, setKickoff] = useState<Kickoff | null>(null)
  const [attendees, setAttendees] = useState<Attendee[]>([])
  const [actions, setActions] = useState<Action[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newAction, setNewAction] = useState({ description: '', owner: '' })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [dirRes, koRes] = await Promise.all([
        fetch('/api/estate-team'),
        fetch(`/api/opportunities/${opportunityId}/kickoff`),
      ])
      if (dirRes.ok) setDirectory((await dirRes.json()).members || [])
      if (koRes.ok) {
        const d = await koRes.json()
        setKickoff(d.kickoff); setAttendees(d.attendees || []); setActions(d.actions || [])
      }
    } finally {
      setLoading(false)
    }
  }, [opportunityId])
  useEffect(() => { load() }, [load])

  // Live assembly from the derived brief + the directory (client-safe pure engine).
  const assembled = useMemo(() => {
    const brief = buildConstraintsYield(profile, {})
    const context = { state: state || 'WA' }
    const req = requiredOccupations(brief, context)
    return assembleKickoffTeam(req, directory, context)
  }, [profile, directory, state])

  async function createMeetingLog() {
    setCreating(true)
    try {
      const res = await fetch(`/api/opportunities/${opportunityId}/kickoff`, { method: 'POST' })
      if (res.ok) { const d = await res.json(); setKickoff(d.kickoff); setAttendees(d.attendees || []); setActions(d.actions || []) }
    } finally {
      setCreating(false)
    }
  }

  async function setAcceptance(a: Attendee, acceptance: string) {
    setAttendees((prev) => prev.map((x) => x.id === a.id ? { ...x, acceptance } : x))
    await fetch(`/api/estate-kickoff/attendee/${a.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ acceptance }),
    })
  }

  async function addAction() {
    if (!newAction.description.trim()) return
    const res = await fetch('/api/estate-kickoff/action', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kickoffId: kickoff!.id, description: newAction.description, owner: newAction.owner || null }),
    })
    if (res.ok) {
      const created = (await res.json()).action
      setActions((prev) => [...prev, created])
      setNewAction({ description: '', owner: '' })
    }
  }

  async function toggleAction(a: Action) {
    const status = a.status === 'done' ? 'open' : 'done'
    setActions((prev) => prev.map((x) => x.id === a.id ? { ...x, status } : x))
    await fetch(`/api/estate-kickoff/action/${a.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
  }

  async function deleteAction(a: Action) {
    setActions((prev) => prev.filter((x) => x.id !== a.id))
    await fetch(`/api/estate-kickoff/action/${a.id}`, { method: 'DELETE' })
  }

  if (loading) {
    return <div className="bg-white rounded-xl border border-gray-200 p-6 flex items-center gap-2 text-gray-500"><Loader2 className="w-4 h-4 animate-spin" /> Loading kickoff…</div>
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-1">
        <Users className="w-5 h-5 text-gray-500" />
        <h3 className="font-semibold text-gray-900">Kickoff Team</h3>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Auto-assembled from the Constraints &amp; Yield Brief + your state team directory. Gaps show
        where the {state || 'this state'} panel has no member for a required role.
      </p>

      {/* Nominations */}
      <div className="space-y-1.5 mb-4">
        {assembled.nominations.map((n) => {
          const isGap = n.members.length === 0 && n.occupation !== 'client' && n.occupation !== 'f2k'
          return (
            <div key={n.occupation} className="flex items-start justify-between gap-3 text-sm border-b border-gray-50 pb-1.5">
              <div className="min-w-0">
                <span className="text-gray-800">{OCCUPATION_LABELS[n.occupation as Occupation]}</span>
                <span className={`ml-2 px-1.5 py-0.5 rounded text-[0.6rem] font-medium ${TIER_BADGE[n.tier]}`}>{n.tier}</span>
                <div className="text-xs text-gray-400">{n.reason}</div>
              </div>
              <div className="text-right flex-shrink-0">
                {n.occupation === 'client' || n.occupation === 'f2k' ? (
                  <span className="text-xs text-gray-500">principal</span>
                ) : isGap ? (
                  <span className="text-xs text-amber-700 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> no panel member</span>
                ) : (
                  <span className="text-sm text-gray-900">{n.members.map((m) => m.name).join(', ')}</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {assembled.gaps.length > 0 && (
        <div className="mb-4 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
          <strong>{assembled.gaps.length} panel gap{assembled.gaps.length > 1 ? 's' : ''}:</strong>{' '}
          {assembled.gaps.map((g) => OCCUPATION_LABELS[g.occupation as Occupation]).join(', ')} — add to the{' '}
          <a href="/estate-team" className="underline">{state || 'state'} team directory</a>.
        </div>
      )}

      {/* Meeting log */}
      {!kickoff ? (
        <button onClick={createMeetingLog} disabled={creating} className="w-full px-4 py-3 border border-emerald-300 bg-emerald-50 text-emerald-700 rounded-xl font-bold hover:bg-emerald-100 disabled:opacity-60 flex items-center justify-center gap-2">
          {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          {creating ? 'Creating…' : 'Create kickoff meeting log'}
        </button>
      ) : (
        <div className="border-t border-gray-100 pt-4 space-y-4">
          {/* Attendees */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Attendees</h4>
            <div className="space-y-1.5">
              {attendees.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-gray-700">{a.name || OCCUPATION_LABELS[a.occupation as Occupation] || a.occupation}</span>
                  <select value={a.acceptance} onChange={(e) => setAcceptance(a, e.target.value)} className={`text-xs border border-gray-200 rounded px-2 py-1 ${ACCEPTANCE_COLOR[a.acceptance]}`}>
                    <option value="invited">Invited</option>
                    <option value="accepted">Accepted</option>
                    <option value="tentative">Tentative</option>
                    <option value="declined">Declined</option>
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Actions</h4>
            <div className="space-y-1.5 mb-2">
              {actions.map((a) => (
                <div key={a.id} className="flex items-center gap-2 text-sm">
                  <button onClick={() => toggleAction(a)} className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${a.status === 'done' ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300'}`}>
                    {a.status === 'done' && <Check className="w-3 h-3 text-white" />}
                  </button>
                  <span className={`flex-1 ${a.status === 'done' ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                    {a.description}{a.owner && <span className="text-xs text-gray-400"> — {a.owner}</span>}
                  </span>
                  <button onClick={() => deleteAction(a)} className="text-gray-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={newAction.description} onChange={(e) => setNewAction({ ...newAction, description: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && addAction()} placeholder="Add an action…" className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-1.5" />
              <input value={newAction.owner} onChange={(e) => setNewAction({ ...newAction, owner: e.target.value })} placeholder="owner" className="w-24 text-sm border border-gray-300 rounded-lg px-2 py-1.5" />
              <button onClick={addAction} className="px-3 py-1.5 rounded-lg bg-gray-900 text-white text-sm">Add</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
