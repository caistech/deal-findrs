'use client'

import { useState, useEffect, useCallback } from 'react'
import { ClipboardList, Loader2, Droplet, Route, ShieldAlert, Landmark, Receipt, FileText } from 'lucide-react'

interface Condition {
  id: string
  number: number | null
  text: string
  authority: string | null
  category: 'servicing' | 'civil' | 'constraint' | 'tenure' | 'statutory' | 'admin'
  status: 'outstanding' | 'in_progress' | 'cleared' | 'not_applicable'
  note: string | null
}

const CATEGORY: Record<Condition['category'], { label: string; icon: typeof Droplet }> = {
  servicing: { label: 'Servicing', icon: Droplet },
  civil: { label: 'Civil / roads', icon: Route },
  constraint: { label: 'Constraints & risk', icon: ShieldAlert },
  tenure: { label: 'Tenure / easements', icon: Landmark },
  statutory: { label: 'Statutory / contributions', icon: Receipt },
  admin: { label: 'Administrative', icon: FileText },
}
const ORDER: Condition['category'][] = ['constraint', 'servicing', 'civil', 'tenure', 'statutory', 'admin']

const STATUS_STYLE: Record<Condition['status'], string> = {
  outstanding: 'bg-amber-50 text-amber-700 border-amber-200',
  in_progress: 'bg-blue-50 text-blue-700 border-blue-200',
  cleared: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  not_applicable: 'bg-gray-50 text-gray-500 border-gray-200',
}

/**
 * The conditions-of-approval register — the WAPC/LG decision-letter conditions as tracked planning
 * items with a clearing authority and a clearance status (the Form-1C checklist). Also the driver
 * for the buildup's servicing/constraint gaps. Hidden when no approval has been ingested.
 */
export function ConditionsRegisterPanel({ opportunityId }: { opportunityId: string }) {
  const [conditions, setConditions] = useState<Condition[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/opportunities/${opportunityId}/conditions`)
      const data = await res.json()
      setConditions(res.ok ? data.conditions : [])
    } finally {
      setLoading(false)
    }
  }, [opportunityId])

  useEffect(() => {
    load()
  }, [load])

  async function setStatus(id: string, status: Condition['status']) {
    setBusyId(id)
    setConditions((cs) => cs.map((c) => (c.id === id ? { ...c, status } : c))) // optimistic
    try {
      const res = await fetch(`/api/opportunities/${opportunityId}/conditions`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conditionId: id, status }),
      })
      if (!res.ok) load() // rollback via reload on failure
    } catch {
      load()
    } finally {
      setBusyId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading conditions…
      </div>
    )
  }
  if (conditions.length === 0) return null

  const cleared = conditions.filter((c) => c.status === 'cleared').length
  const grouped = ORDER.map((cat) => ({ cat, items: conditions.filter((c) => c.category === cat) })).filter((g) => g.items.length)

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="rounded-md bg-slate-100 p-2 text-slate-600">
            <ClipboardList className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">Conditions of approval</h3>
            <p className="mt-1 text-sm text-gray-600">
              The conditions extracted from the approval, each with its clearing authority — the Form-1C clearance
              checklist. Servicing and constraint conditions also drive the Constraints &amp; Yield buildup.
            </p>
          </div>
        </div>
        <div className="whitespace-nowrap text-sm font-medium text-gray-500">
          {cleared}/{conditions.length} cleared
        </div>
      </div>

      <div className="mt-4 space-y-5">
        {grouped.map(({ cat, items }) => {
          const Icon = CATEGORY[cat].icon
          return (
            <div key={cat}>
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                <Icon className="h-3.5 w-3.5" /> {CATEGORY[cat].label} ({items.length})
              </div>
              <ul className="space-y-2">
                {items.map((c) => (
                  <li key={c.id} className="rounded-md border border-gray-100 bg-gray-50/60 p-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1 text-sm text-gray-700">
                        <span className="font-medium text-gray-900">{c.number != null ? `${c.number}. ` : ''}</span>
                        {c.text}
                        {c.authority && <span className="mt-1 block text-xs text-gray-400">Clearing authority: {c.authority}</span>}
                      </div>
                      <select
                        value={c.status}
                        disabled={busyId === c.id}
                        onChange={(e) => setStatus(c.id, e.target.value as Condition['status'])}
                        className={`min-h-[36px] shrink-0 rounded-md border px-2 py-1 text-xs font-medium ${STATUS_STYLE[c.status]}`}
                      >
                        <option value="outstanding">Outstanding</option>
                        <option value="in_progress">In progress</option>
                        <option value="cleared">Cleared</option>
                        <option value="not_applicable">N/A</option>
                      </select>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
    </div>
  )
}
