import type { SupabaseClient } from '@supabase/supabase-js'
import type { DealModelResult, CashflowInputs, CashflowResult } from '@caistech/deal-model'
import type { DealModelDealInput } from './types'

/** Version of the shared engine that produced a snapshot (pinned per package release). */
export const DEAL_MODEL_ENGINE_VERSION = '0.3.0'

export type DealModelGrade = 'indicative' | 'bankable'

/** The funder-cashflow view persisted alongside a deal snapshot (optional). */
export interface SnapshotCashflow {
  inputs: CashflowInputs
  result: CashflowResult
  /**
   * TRUE if the staging (build stages / stage duration) was the indicative 5×9 placeholder
   * at compute time — the tripwire so a placeholder funder view is never mistaken for firm.
   */
  stagingIsPlaceholder: boolean
}

export interface SaveSnapshotArgs {
  opportunityId: string
  companyId: string
  createdBy: string
  grade: DealModelGrade
  input: DealModelDealInput
  result: DealModelResult
  /** Credibility overlay from the adversarial feasibility engine, if available. */
  ragStatus?: 'green' | 'amber' | 'red' | null
  /** Required when the input carries a stage or share override (audit-distinct). */
  overrideReason?: string | null
  /** The funder-cashflow view, when the contribution pool has been entered. */
  cashflow?: SnapshotCashflow | null
}

/**
 * Persist an IMMUTABLE, versioned deal-model snapshot.
 *
 * Uses the caller's user-scoped Supabase client so RLS (company_id = get_user_company_id())
 * is the enforcement layer — never the service-role client. Version is monotonic per
 * opportunity. A correction is a NEW version; existing snapshots are never mutated (the
 * table has no UPDATE/DELETE policy).
 *
 * Requires the `deal_model_snapshots` migration to be applied.
 */
export async function saveDealModelSnapshot(
  supabase: SupabaseClient,
  args: SaveSnapshotArgs
): Promise<{ id: string; version: number } | { error: string }> {
  const hasOverride =
    args.input.stageOverride != null || args.input.f2kShareOverride != null

  if (hasOverride && !args.overrideReason) {
    return { error: 'override_reason_required' }
  }

  // Next monotonic version for this opportunity (RLS scopes the read to the company).
  const { data: latest, error: readErr } = await supabase
    .from('deal_model_snapshots')
    .select('version')
    .eq('opportunity_id', args.opportunityId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (readErr) return { error: `version_lookup_failed: ${readErr.message}` }
  const nextVersion = (latest?.version ?? 0) + 1

  const { hurdle, stageUsed, baseRate, market } = args.result

  const { data, error } = await supabase
    .from('deal_model_snapshots')
    .insert({
      opportunity_id: args.opportunityId,
      company_id: args.companyId,
      version: nextVersion,
      grade: args.grade,
      engine_version: DEAL_MODEL_ENGINE_VERSION,
      inputs: args.input,
      result: args.result,
      verdict: hurdle.verdict,
      developer_thin: hurdle.developerThin,
      reason: hurdle.reason,
      stage_used: stageUsed,
      base_rate_per_lot: baseRate.baseRatePerLot,
      net_uplift_pct: market.netUpliftPctOfBase,
      rag_status: args.ragStatus ?? null,
      has_manual_override: hasOverride,
      override_reason: args.overrideReason ?? null,
      // Funder-cashflow view (nullable — only when the contribution pool was entered).
      cashflow: args.cashflow?.result ?? null,
      cashflow_inputs: args.cashflow?.inputs ?? null,
      peak_funder_exposure: args.cashflow?.result.peakFunderExposure ?? null,
      cashflow_staging_placeholder: args.cashflow?.stagingIsPlaceholder ?? null,
      created_by: args.createdBy,
    })
    .select('id, version')
    .single()

  if (error) return { error: `snapshot_insert_failed: ${error.message}` }
  return { id: data.id, version: data.version }
}

/** Latest snapshot for an opportunity (RLS-scoped to the caller's company). */
export async function getLatestDealModelSnapshot(
  supabase: SupabaseClient,
  opportunityId: string
) {
  const { data, error } = await supabase
    .from('deal_model_snapshots')
    .select('*')
    .eq('opportunity_id', opportunityId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) return { error: error.message }
  return { snapshot: data }
}
