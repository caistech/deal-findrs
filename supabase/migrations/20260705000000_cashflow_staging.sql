-- F2K Staged Cashflow — estate staging inputs + snapshot funder-exposure store
--
-- Companion to 20260703000000_deal_model_snapshots.sql. Persists the inputs and result of
-- @caistech/deal-model@0.3.0 `runCashflow()` (the funder-exposure view) alongside the deal
-- verdict, and stores the per-estate staging plan on the opportunity.
--
-- ⚠️ PLACEHOLDER STAGING — build_stages (5) and stage_duration_months (9) DEFAULT to the
-- workbook's indicative values. They are NOT firm until the Porter / QS staging plan lands.
-- `cashflow_staging_placeholder` DEFAULTs TRUE and is the tripwire so an indicative funder
-- view is never mistaken for a firmed-up one — query it to find every estate still on
-- placeholder staging:
--     SELECT id, name FROM opportunities WHERE cashflow_staging_placeholder;
-- Flip it FALSE only when the operator enters the real Porter/QS staging.
--
-- Idempotent. Safe to re-run. Additive columns only (backward-compatible).

-- ─── Estate staging inputs (on the opportunity) ────────────────
-- Staging is estate-level data (comes from Porter/QS), so it lives on the opportunity and
-- pre-fills the funder-cashflow panel. Contributions has NO fake default (it comes from the
-- Contribution Disclosure Schedule, not a safe placeholder) — nullable, operator-entered.
ALTER TABLE opportunities
  ADD COLUMN IF NOT EXISTS build_stages                  INT             DEFAULT 5,
  ADD COLUMN IF NOT EXISTS stage_duration_months         INT             DEFAULT 9,
  ADD COLUMN IF NOT EXISTS total_contributions           NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS contributor_payout_pct        NUMERIC(4,3)    DEFAULT 0.75,
  -- The tripwire: TRUE = staging is the indicative 5×9 placeholder, replace on Porter/QS.
  ADD COLUMN IF NOT EXISTS cashflow_staging_placeholder  BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN opportunities.build_stages IS
  'Funder-cashflow build stages (N). DEFAULT 5 is an INDICATIVE placeholder — replace with the Porter/QS staging plan (see cashflow_staging_placeholder).';
COMMENT ON COLUMN opportunities.stage_duration_months IS
  'Funder-cashflow stage duration (months). DEFAULT 9 is an INDICATIVE placeholder — replace with the Porter/QS staging plan.';
COMMENT ON COLUMN opportunities.cashflow_staging_placeholder IS
  'TRUE while build_stages/stage_duration_months are the indicative placeholders. Flip FALSE once the real Porter/QS staging is entered. Query WHERE cashflow_staging_placeholder to find estates still on placeholders.';

-- ─── Funder-exposure on the immutable snapshot ─────────────────
-- The cashflow RESULT rides on the deal snapshot (immutable, versioned) so a locked deal
-- carries its funder view. Nullable: an older snapshot (or one saved before the contribution
-- pool was entered) has no cashflow. The placeholder flag is recorded AT COMPUTE TIME so the
-- snapshot is self-describing about whether its funder view used indicative staging.
ALTER TABLE deal_model_snapshots
  ADD COLUMN IF NOT EXISTS cashflow                      JSONB,          -- CashflowResult
  ADD COLUMN IF NOT EXISTS cashflow_inputs               JSONB,          -- CashflowInputs (verbatim, reproducible)
  ADD COLUMN IF NOT EXISTS peak_funder_exposure          NUMERIC(14,2),  -- denormalised headline
  ADD COLUMN IF NOT EXISTS cashflow_staging_placeholder  BOOLEAN;        -- staging was indicative at compute time

COMMENT ON COLUMN deal_model_snapshots.cashflow_staging_placeholder IS
  'TRUE if this snapshot''s funder view used indicative placeholder staging (5×9). A firmed-up Porter/QS re-compute produces a NEW version with this FALSE.';
