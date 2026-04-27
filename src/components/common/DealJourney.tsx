'use client'

import { Check, Lock, Clock } from 'lucide-react'
import Link from 'next/link'

export type DealStage = 'onboarding' | 'assessment' | 'committee' | 'devfinance' | 'decision'

export type CommitteeStatus = 'not_required' | 'pending' | 'in_review' | 'approved' | 'rejected'
export type Decision = 'pending' | 'greenlit' | 'parked' | 'rejected'
export type RagStatus = 'green' | 'amber' | 'red'

interface DealJourneyProps {
  currentStage: DealStage
  /** When set, completed/current stages link to opportunity-scoped pages. */
  opportunityId?: string
  committeeStatus?: CommitteeStatus
  decision?: Decision
  ragStatus?: RagStatus
  /** When false, render with no border / margins so the host can place it. */
  bordered?: boolean
  /**
   * If true (default until IC v1 ships), the Committee segment renders as
   * "Coming soon" regardless of currentStage progression past it. Set false
   * once IC is live so it behaves like any other stage.
   */
  committeeComingSoon?: boolean
}

const STAGE_ORDER: DealStage[] = ['onboarding', 'assessment', 'committee', 'devfinance', 'decision']

const STAGE_LABELS: Record<DealStage, string> = {
  onboarding: 'Onboarding',
  assessment: 'AI Assessment',
  committee: 'Committee',
  devfinance: 'DevFinance',
  decision: 'Decision',
}

type StageStatus = 'done' | 'current' | 'upcoming' | 'locked' | 'coming_soon'

interface StageInfo {
  status: StageStatus
  subLabel?: string
  href?: string
}

function computeStageInfos(props: DealJourneyProps): Record<DealStage, StageInfo> {
  const {
    currentStage,
    opportunityId,
    committeeStatus,
    decision,
    ragStatus,
    committeeComingSoon = true,
  } = props

  const currentIdx = STAGE_ORDER.indexOf(currentStage)

  const make = (stage: DealStage, idx: number): StageInfo => {
    const isPast = idx < currentIdx
    const isCurrent = idx === currentIdx
    const isFuture = idx > currentIdx

    let status: StageStatus = isPast ? 'done' : isCurrent ? 'current' : 'upcoming'
    let subLabel: string | undefined

    if (stage === 'committee' && committeeComingSoon) {
      status = isPast ? 'done' : 'coming_soon'
      subLabel = committeeStatus ? committeeStatus.replace(/_/g, ' ') : 'coming soon'
    } else if (stage === 'assessment') {
      if (isPast && ragStatus) subLabel = ragStatus.toUpperCase()
      else if (isCurrent) subLabel = ragStatus ? ragStatus.toUpperCase() : 'in progress'
      else subLabel = 'pending'
    } else if (stage === 'decision') {
      if (decision && decision !== 'pending') subLabel = decision.toUpperCase()
      else subLabel = isFuture ? 'locked' : 'pending'
      if (isFuture && !decision) status = 'locked'
    } else if (stage === 'devfinance') {
      if (isFuture) status = 'locked'
      subLabel = isPast ? 'done' : isCurrent ? 'in progress' : 'locked'
    } else if (stage === 'onboarding') {
      subLabel = isPast ? 'done' : isCurrent ? 'in progress' : 'pending'
    }

    let href: string | undefined
    if (opportunityId && (isPast || isCurrent) && status !== 'locked' && status !== 'coming_soon') {
      if (stage === 'devfinance') href = `/opportunities/${opportunityId}/devfinance`
      else if (stage === 'onboarding' || stage === 'assessment') href = `/opportunities/${opportunityId}`
    }

    return { status, subLabel, href }
  }

  return {
    onboarding: make('onboarding', 0),
    assessment:  make('assessment',  1),
    committee:   make('committee',   2),
    devfinance:  make('devfinance',  3),
    decision:    make('decision',    4),
  }
}

const STATUS_STYLES: Record<StageStatus, {
  circle: string
  label: string
  sublabel: string
  connector: string
}> = {
  done: {
    circle:    'bg-emerald-500 text-white',
    label:     'text-gray-900 font-medium',
    sublabel:  'text-emerald-600',
    connector: 'bg-emerald-500',
  },
  current: {
    circle:    'bg-amber-500 text-white ring-4 ring-amber-100',
    label:     'text-gray-900 font-bold',
    sublabel:  'text-amber-600',
    connector: 'bg-gray-200',
  },
  upcoming: {
    circle:    'bg-gray-200 text-gray-500',
    label:     'text-gray-500 font-medium',
    sublabel:  'text-gray-400',
    connector: 'bg-gray-200',
  },
  locked: {
    circle:    'bg-gray-100 text-gray-400',
    label:     'text-gray-400 font-medium',
    sublabel:  'text-gray-400',
    connector: 'bg-gray-200',
  },
  coming_soon: {
    circle:    'bg-violet-100 text-violet-500',
    label:     'text-violet-700 font-medium',
    sublabel:  'text-violet-500',
    connector: 'bg-gray-200',
  },
}

function StageCircle({ status, idx }: { status: StageStatus; idx: number }) {
  const styles = STATUS_STYLES[status]
  const cls = `w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all flex-shrink-0 ${styles.circle}`
  if (status === 'done') return <div className={cls}><Check className="w-4 h-4" /></div>
  if (status === 'locked') return <div className={cls}><Lock className="w-3.5 h-3.5" /></div>
  if (status === 'coming_soon') return <div className={cls}><Clock className="w-3.5 h-3.5" /></div>
  return <div className={cls}>{idx + 1}</div>
}

export function DealJourney(props: DealJourneyProps) {
  const { bordered = true } = props
  const infos = computeStageInfos(props)
  const wrapperCls = bordered
    ? 'w-full bg-white rounded-2xl border border-gray-200 px-4 py-4 sm:px-6 sm:py-5'
    : 'w-full'

  return (
    <div className={wrapperCls}>
      {/* Desktop / tablet: horizontal */}
      <div className="hidden md:flex items-start justify-between gap-1">
        {STAGE_ORDER.map((stage, idx) => {
          const info = infos[stage]
          const styles = STATUS_STYLES[info.status]
          const label = STAGE_LABELS[stage]
          const tooltip =
            info.status === 'locked'
              ? 'Locked until previous stage completes'
              : info.status === 'coming_soon'
                ? 'This stage is coming soon — Investment Committee v1'
                : undefined

          const inner = (
            <div className="flex flex-col items-center text-center min-w-0 px-1" title={tooltip}>
              <StageCircle status={info.status} idx={idx} />
              <span className={`mt-2 text-xs lg:text-sm whitespace-nowrap ${styles.label}`}>
                {label}
              </span>
              {info.subLabel && (
                <span className={`mt-0.5 text-[11px] lg:text-xs whitespace-nowrap ${styles.sublabel}`}>
                  {info.subLabel}
                </span>
              )}
            </div>
          )

          return (
            <div key={stage} className="flex items-start flex-1 min-w-0">
              <div className="flex-1 flex flex-col items-center min-w-0">
                {info.href ? (
                  <Link href={info.href} className="w-full hover:opacity-80 transition-opacity">
                    {inner}
                  </Link>
                ) : (
                  inner
                )}
              </div>
              {idx < STAGE_ORDER.length - 1 && (
                <div className={`flex-1 h-0.5 mt-[18px] ${styles.connector}`} />
              )}
            </div>
          )
        })}
      </div>

      {/* Mobile: vertical */}
      <div className="md:hidden">
        {STAGE_ORDER.map((stage, idx) => {
          const info = infos[stage]
          const styles = STATUS_STYLES[info.status]
          const label = STAGE_LABELS[stage]
          const tooltip =
            info.status === 'locked'
              ? 'Locked until previous stage completes'
              : info.status === 'coming_soon'
                ? 'Coming soon — Investment Committee v1'
                : undefined

          const row = (
            <div className="flex items-center gap-3" title={tooltip}>
              <StageCircle status={info.status} idx={idx} />
              <div className="flex-1 min-w-0">
                <div className={`text-sm ${styles.label}`}>{label}</div>
                {info.subLabel && (
                  <div className={`text-xs ${styles.sublabel}`}>{info.subLabel}</div>
                )}
              </div>
            </div>
          )

          return (
            <div key={stage}>
              {info.href ? (
                <Link href={info.href} className="block hover:opacity-80 transition-opacity">
                  {row}
                </Link>
              ) : (
                row
              )}
              {idx < STAGE_ORDER.length - 1 && (
                <div className={`ml-[18px] my-1 w-0.5 h-4 ${styles.connector}`} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
