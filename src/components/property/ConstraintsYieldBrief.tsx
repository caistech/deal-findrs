'use client'

import { useMemo } from 'react'
import { Layers, AlertTriangle, ShieldAlert, UserCog, Info } from 'lucide-react'
import type { PropertyProfile } from '@/lib/property-services'
import { buildConstraintsYield } from '@/lib/estate-buildup/build'
import type { BuildupOptions, Provenance } from '@/lib/estate-buildup/types'

// Full static class strings — Tailwind JIT can't see interpolated names.
const PROVENANCE: Record<Provenance, { label: string; cls: string }> = {
  derived: { label: 'derived', cls: 'bg-emerald-100 text-emerald-700' },
  'operator-resolved': { label: 'operator', cls: 'bg-blue-100 text-blue-700' },
  'feasibility-study': { label: 'study', cls: 'bg-violet-100 text-violet-700' },
  'needs-input': { label: 'needs input', cls: 'bg-amber-100 text-amber-800' },
  'formal-required': { label: 'formal ⛔', cls: 'bg-red-100 text-red-700' },
  'planner-referral': { label: 'planner referral', cls: 'bg-indigo-100 text-indigo-700' },
  note: { label: 'note', cls: 'bg-gray-100 text-gray-600' },
}

function Badge({ p }: { p: Provenance }) {
  const s = PROVENANCE[p]
  return <span className={`inline-block px-1.5 py-0.5 rounded text-[0.65rem] font-medium ${s.cls}`}>{s.label}</span>
}

/**
 * Renders the Estate Constraints & Yield Brief for a derived property profile — the buildup, its
 * gaps, and the yield resolution (derived is authoritative; study reconciles; anecdote is context).
 * A buildup of analysis, not a data-entry form.
 */
export function ConstraintsYieldBrief({
  profile,
  options,
}: {
  profile: PropertyProfile
  options?: BuildupOptions
}) {
  const brief = useMemo(() => buildConstraintsYield(profile, options), [profile, options])
  const y = brief.yield

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-1">
        <Layers className="w-5 h-5 text-gray-500" />
        <h3 className="font-semibold text-gray-900">Constraints &amp; Yield Brief</h3>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Derived from the property datasets — every figure carries its source. Yield is our analysis,
        not a typed-in number; a developer figure is only used from a shared feasibility study.
      </p>

      {/* Yield resolution */}
      <div
        className={`rounded-lg p-4 mb-4 border ${
          y.basis === 'un-derivable'
            ? 'bg-indigo-50 border-indigo-200'
            : y.reconciliationNeeded || y.unbackedClaimConflict
              ? 'bg-amber-50 border-amber-200'
              : 'bg-emerald-50 border-emerald-200'
        }`}
      >
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-gray-900">
            {y.authoritativeLots ?? '—'}
          </span>
          <span className="text-sm text-gray-600">derived lots</span>
        </div>
        {y.basis === 'un-derivable' && (
          <p className="text-sm text-indigo-700 mt-1 flex items-center gap-1">
            <UserCog className="w-4 h-4" /> Yield can&apos;t be derived — planner referral required.
          </p>
        )}
        {y.note && y.basis !== 'un-derivable' && (
          <p className="text-sm text-amber-800 mt-1">{y.note}</p>
        )}
        {(y.studyLots != null || y.developerClaimedLots != null) && (
          <div className="text-xs text-gray-500 mt-2 flex gap-4">
            {y.studyLots != null && <span>Study: {y.studyLots}</span>}
            {y.developerClaimedLots != null && <span>Developer claim: {y.developerClaimedLots} (not used)</span>}
          </div>
        )}
      </div>

      {/* Buildup lines */}
      <div className="space-y-1.5 mb-4">
        {brief.lines.map((line) => (
          <div key={line.key} className="flex items-start justify-between gap-3 text-sm border-b border-gray-50 pb-1.5">
            <div className="min-w-0">
              <span className="text-gray-700">{line.label}</span>
              {line.working && <div className="text-xs text-gray-400">{line.working}</div>}
              {line.dataset && <div className="text-[0.65rem] text-gray-400">source: {line.dataset}</div>}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className={`font-medium ${line.severity === 'blocker' ? 'text-red-600' : line.severity === 'attention' ? 'text-amber-700' : 'text-gray-900'}`}>
                {line.value ?? '—'}{line.unit ? ` ${line.unit}` : ''}
              </span>
              <Badge p={line.provenance} />
            </div>
          </div>
        ))}
      </div>

      {/* Gaps */}
      {brief.gaps.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Gaps &amp; referrals</h4>
          <div className="space-y-2">
            {brief.gaps.map((gap, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                {gap.provenance === 'formal-required' ? (
                  <ShieldAlert className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                ) : gap.provenance === 'planner-referral' ? (
                  <UserCog className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                )}
                <div>
                  <span className="text-gray-800 font-medium">{gap.label}</span> <Badge p={gap.provenance} />
                  <p className="text-xs text-gray-500">{gap.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {brief.requiresPlannerReferral && (
        <div className="mt-4 flex items-center gap-2 text-sm text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg p-3">
          <Info className="w-4 h-4" />
          This site needs a planner referral before the yield can be finalised.
        </div>
      )}
    </div>
  )
}
