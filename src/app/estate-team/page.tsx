'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Loader2, X, Pencil, Trash2 } from 'lucide-react'
import { AuthLayout } from '@/components/common/AuthLayout'
import { OCCUPATION_LABELS } from '@/lib/estate-team/types'

const AU_STATES = ['WA', 'SA', 'TAS', 'QLD', 'NSW', 'VIC', 'NT', 'ACT']
const TYPOLOGY_LABELS: Record<string, string> = {
  house_and_land: 'House & Land',
  townhouse: 'Townhouse',
  multi_storey: 'Multi-storey',
  apartments: 'Apartments',
  mixed_use: 'Mixed-use',
}
const OCCUPATIONS = Object.entries(OCCUPATION_LABELS).filter(([k]) => k !== 'client' && k !== 'f2k')

interface Member {
  id: string
  name: string
  firm: string | null
  occupation: string
  states: string[]
  typologies: string[] | null
  email: string | null
  phone: string | null
  active: boolean
  notes: string | null
}

const EMPTY = {
  name: '', firm: '', occupation: 'planner', states: [] as string[],
  typologies: [] as string[], email: '', phone: '', notes: '',
}

export default function EstateTeamPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [editing, setEditing] = useState<Member | null>(null)
  const [showForm, setShowForm] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/estate-team')
      if (res.ok) setMembers((await res.json()).members || [])
      else setMsg({ type: 'err', text: 'Failed to load' })
    } catch {
      setMsg({ type: 'err', text: 'Network error' })
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => { load() }, [load])

  async function toggleActive(m: Member) {
    const res = await fetch(`/api/estate-team/${m.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !m.active }),
    })
    if (res.ok) load()
    else setMsg({ type: 'err', text: 'Update failed' })
  }

  async function remove(m: Member) {
    if (!confirm(`Remove ${m.name} from the estate team directory?`)) return
    const res = await fetch(`/api/estate-team/${m.id}`, { method: 'DELETE' })
    if (res.ok) { setMsg({ type: 'ok', text: `${m.name} removed` }); load() }
    else setMsg({ type: 'err', text: 'Delete failed' })
  }

  return (
    <AuthLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-900">Estate Team Directory</h1>
        <p className="text-gray-600 mt-1 mb-6 max-w-3xl text-sm">
          The professionals available for estate kickoffs, by state. When a project&apos;s Constraints
          &amp; Yield Brief flags a required occupation, the system nominates the matching member from
          this directory for the kickoff — and flags any state with no member as a gap to fill.
        </p>

        {msg && (
          <div className={`mb-4 p-3 rounded text-sm ${msg.type === 'ok' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {msg.text}
          </div>
        )}

        <div className="flex justify-end mb-3">
          <button
            onClick={() => { setEditing(null); setShowForm(true) }}
            className="text-sm px-4 py-2 rounded-lg bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900 font-bold hover:shadow-lg flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add member
          </button>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-gray-500 py-12 justify-center"><Loader2 className="w-5 h-5 animate-spin" /> Loading…</div>
        ) : members.length === 0 ? (
          <div className="text-gray-400 text-sm border border-dashed rounded-lg p-8 text-center">
            No team members yet. Add your first — planners, engineers, surveyors, valuers, modular suppliers — per state.
          </div>
        ) : (
          <div className="overflow-x-auto border border-gray-200 rounded-lg bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Name</th>
                  <th className="text-left px-4 py-3 font-semibold">Occupation</th>
                  <th className="text-left px-4 py-3 font-semibold">States</th>
                  <th className="text-left px-4 py-3 font-semibold">Contact</th>
                  <th className="text-left px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id} className={`border-b border-gray-100 ${m.active ? '' : 'opacity-50'}`}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{m.name}</div>
                      {m.firm && <div className="text-xs text-gray-500">{m.firm}</div>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {OCCUPATION_LABELS[m.occupation as keyof typeof OCCUPATION_LABELS] ?? m.occupation}
                      {m.occupation === 'modular_supplier' && m.typologies && m.typologies.length > 0 && (
                        <div className="text-xs text-gray-400">{m.typologies.map((t) => TYPOLOGY_LABELS[t] ?? t).join(', ')}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {m.states.map((s) => <span key={s} className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-xs">{s}</span>)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {m.email && <div>{m.email}</div>}
                      {m.phone && <div>{m.phone}</div>}
                      {!m.email && !m.phone && '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => { setEditing(m); setShowForm(true) }} className="p-1.5 rounded border border-gray-300 hover:bg-gray-50" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => toggleActive(m)} className="text-xs px-2 py-1 rounded border border-gray-300 hover:bg-gray-50">{m.active ? 'Deactivate' : 'Activate'}</button>
                        <button onClick={() => remove(m)} className="p-1.5 rounded border border-red-300 text-red-600 hover:bg-red-50" title="Remove"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {showForm && (
          <MemberForm
            member={editing}
            onClose={() => setShowForm(false)}
            onSaved={(text) => { setShowForm(false); setMsg({ type: 'ok', text }); load() }}
            onError={(text) => setMsg({ type: 'err', text })}
          />
        )}
      </div>
    </AuthLayout>
  )
}

function MemberForm({ member, onClose, onSaved, onError }: {
  member: Member | null
  onClose: () => void
  onSaved: (text: string) => void
  onError: (text: string) => void
}) {
  const [form, setForm] = useState(member ? {
    name: member.name, firm: member.firm ?? '', occupation: member.occupation,
    states: member.states ?? [], typologies: member.typologies ?? [],
    email: member.email ?? '', phone: member.phone ?? '', notes: member.notes ?? '',
  } : EMPTY)
  const [busy, setBusy] = useState(false)

  const toggle = (arr: string[], v: string) => arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return onError('Name is required')
    setBusy(true)
    try {
      const res = await fetch(member ? `/api/estate-team/${member.id}` : '/api/estate-team', {
        method: member ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (res.ok) onSaved(member ? `${form.name} updated` : `${form.name} added`)
      else onError(data.error || 'Save failed')
    } catch {
      onError('Network error')
    } finally {
      setBusy(false)
    }
  }

  const input = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-[44px] focus:ring-2 focus:ring-emerald-500'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 overflow-y-auto">
      <form onSubmit={submit} className="bg-white rounded-xl w-full max-w-lg p-5 my-8 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">{member ? 'Edit member' : 'Add member'}</h3>
          <button type="button" onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded"><X className="w-5 h-5 text-gray-500" /></button>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="block"><span className="text-xs font-semibold text-gray-600">Name *</span>
              <input className={input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
            <label className="block"><span className="text-xs font-semibold text-gray-600">Firm</span>
              <input className={input} value={form.firm} onChange={(e) => setForm({ ...form, firm: e.target.value })} /></label>
          </div>
          <label className="block"><span className="text-xs font-semibold text-gray-600">Occupation</span>
            <select className={input} value={form.occupation} onChange={(e) => setForm({ ...form, occupation: e.target.value })}>
              {OCCUPATIONS.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
            </select>
          </label>
          <div>
            <span className="text-xs font-semibold text-gray-600">States covered</span>
            <div className="flex flex-wrap gap-2 mt-1">
              {AU_STATES.map((s) => (
                <button key={s} type="button" onClick={() => setForm({ ...form, states: toggle(form.states, s) })}
                  className={`px-2.5 py-1 rounded text-xs font-medium border min-h-[36px] ${form.states.includes(s) ? 'bg-emerald-500 text-white border-emerald-500' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>{s}</button>
              ))}
            </div>
          </div>
          {form.occupation === 'modular_supplier' && (
            <div>
              <span className="text-xs font-semibold text-gray-600">Typologies served</span>
              <div className="flex flex-wrap gap-2 mt-1">
                {Object.entries(TYPOLOGY_LABELS).map(([k, label]) => (
                  <button key={k} type="button" onClick={() => setForm({ ...form, typologies: toggle(form.typologies, k) })}
                    className={`px-2.5 py-1 rounded text-xs font-medium border min-h-[36px] ${form.typologies.includes(k) ? 'bg-violet-500 text-white border-violet-500' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>{label}</button>
                ))}
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <label className="block"><span className="text-xs font-semibold text-gray-600">Email</span>
              <input className={input} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
            <label className="block"><span className="text-xs font-semibold text-gray-600">Phone</span>
              <input className={input} type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
          </div>
          <label className="block"><span className="text-xs font-semibold text-gray-600">Notes</span>
            <textarea className={input} rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button type="button" onClick={onClose} className="text-sm px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 font-medium">Cancel</button>
          <button type="submit" disabled={busy} className="text-sm px-5 py-2 rounded-lg bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900 font-bold disabled:opacity-50">
            {busy ? 'Saving…' : member ? 'Save' : 'Add'}
          </button>
        </div>
      </form>
    </div>
  )
}
