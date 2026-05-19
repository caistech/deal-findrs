-- Adversarial Feasibility Engine — assessments table.
--
-- The legacy code in src/app/api/opportunities/route.ts inserts into an
-- `assessments` table inside a try/catch that swallows the error as
-- "non-critical" — meaning the table may exist with a partial shape, or
-- not at all. This migration converges the table to the engine shape
-- regardless of starting state.
--
-- After migration 003 wiped legacy rows and nulled rag_status, this
-- migration brings the table into the shape the engine writes:
--   * legacy columns (kept so the existing insert in /api/opportunities
--     doesn't 500 between commit 2 and the orchestrator rewire in commit 9)
--   * engine columns (test_results, reviewer_verdict, substitution_log,
--     ltv_derived, engine_version)
--
-- Strategy: CREATE TABLE IF NOT EXISTS with the bare-minimum identity, then
-- ADD COLUMN IF NOT EXISTS for every other column. This makes the migration
-- idempotent on both "table doesn't exist" and "table exists with old shape".

CREATE TABLE IF NOT EXISTS assessments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id  UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Legacy soft-scorer columns (kept until commit 9 rewires the orchestrator)
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS status                TEXT;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS score                 INTEGER;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS gm_score              INTEGER;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS derisk_score          INTEGER;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS risk_score            INTEGER;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS total_cost            NUMERIC(14,2);
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS total_revenue         NUMERIC(14,2);
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS gross_margin          NUMERIC(14,2);
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS gross_margin_percent  NUMERIC(6,2);
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS summary               TEXT;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS passed_criteria       JSONB;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS failed_criteria       JSONB;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS attention_items       JSONB;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS path_to_green         JSONB;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS recommendations       JSONB;

-- Engine columns (filled by the adversarial feasibility engine)
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS engine_version        TEXT;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS test_results          JSONB;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS reviewer_verdict      JSONB;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS substitution_log      JSONB;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS ltv_derived           NUMERIC(5,4);

-- Shape reminders (not enforced — JSONB):
--   test_results:      [{ id: 'T1'|'T2'|'T3', passed: bool, computed: {...}, reason: str, evidencePathToPass: [...] | null }]
--   reviewer_verdict:  { independentVerdict: 'NOT_FUNDABLE'|'FUNDABLE_IF'|'FUNDABLE',
--                        conditions: str[], rederivedMetrics: {...}, promoterStated: {...},
--                        rejectedInputs: [{...}], killQuestion: str }
--   substitution_log:  [{ field: str, from: number, to: number, reason: str }]
--   ltv_derived:       computed last from evidenced inputs (loan / grv); never an input

CREATE INDEX IF NOT EXISTS idx_assessments_opportunity     ON assessments(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_assessments_engine_version  ON assessments(engine_version);
CREATE INDEX IF NOT EXISTS idx_assessments_status          ON assessments(status);

-- RLS — same company-scoping pattern as devfinance tables
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Company access to assessments" ON assessments;
CREATE POLICY "Company access to assessments"
  ON assessments FOR ALL
  USING (opportunity_id IN (
    SELECT id FROM opportunities WHERE company_id = get_user_company_id()
  ));
