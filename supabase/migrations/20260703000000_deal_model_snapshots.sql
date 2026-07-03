-- F2K Deal Model — immutable snapshot store  (DRAFT — NOT YET APPLIED)
--
-- ⚠️ This migration is drafted for review and is NOT to be pushed to the live
--    DB (zzajvnhsesqrrepflrrx is REVENUE-tier) until Dennis signs off the two
--    open decisions in docs/deal-model-integration-findings.md:
--      1. verdict governance (does V5 govern the promotion gate?)
--      2. whether the RAG credibility overlay column is populated at write time.
--    The schema below is compatible with all three governance options.
--
-- Stores the output of @caistech/deal-model (the F2K partnership economics) as an
-- IMMUTABLE, VERSIONED snapshot tied to an opportunity. This is the "snapshot and
-- lock at each promotion" store: v1 = indicative (from the external study), v2 =
-- bankable (QS + registered valuation). A newer version never mutates an older one.
--
-- Immutability is enforced at the RLS layer: SELECT + INSERT only, no UPDATE/DELETE.
-- Idempotent. Safe to re-run.

-- ─── VERDICT / GRADE ENUMS ─────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE deal_model_verdict AS ENUM ('GO', 'ADJUST', 'REJECT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE deal_model_grade AS ENUM ('indicative', 'bankable');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── SNAPSHOTS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS deal_model_snapshots (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id     UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  company_id         UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Monotonic per opportunity: v1 indicative -> v2 bankable -> ...
  version            INT NOT NULL,
  grade              deal_model_grade NOT NULL DEFAULT 'indicative',
  engine_version     TEXT NOT NULL,              -- @caistech/deal-model package version

  -- The full ingested input and computed result (verbatim, for reproducibility)
  inputs             JSONB NOT NULL,             -- DealModelDealInput
  result             JSONB NOT NULL,             -- DealModelResult

  -- Denormalised headline outputs (for cheap querying / display without parsing result)
  verdict            deal_model_verdict NOT NULL,
  developer_thin     BOOLEAN NOT NULL DEFAULT false,
  reason             TEXT,
  stage_used         TEXT NOT NULL,
  base_rate_per_lot  NUMERIC(14,2) NOT NULL,
  net_uplift_pct     NUMERIC(6,5) NOT NULL,

  -- Credibility overlay from the existing adversarial feasibility engine, IF the
  -- governance decision keeps it alongside the V5 verdict. Nullable by design.
  rag_status         TEXT,                       -- 'green' | 'amber' | 'red' | NULL

  -- Manual overrides must be visibly distinct from gate-earned verdicts (audit-first).
  has_manual_override BOOLEAN NOT NULL DEFAULT false,
  override_reason    TEXT,

  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by         UUID REFERENCES auth.users(id),

  UNIQUE (opportunity_id, version)
);

CREATE INDEX IF NOT EXISTS idx_deal_model_snapshots_opportunity
  ON deal_model_snapshots(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_deal_model_snapshots_company
  ON deal_model_snapshots(company_id);

-- ─── RLS — company-scoped, IMMUTABLE (select + insert only) ────
ALTER TABLE deal_model_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Company read deal model snapshots"   ON deal_model_snapshots;
DROP POLICY IF EXISTS "Company insert deal model snapshots" ON deal_model_snapshots;

CREATE POLICY "Company read deal model snapshots"
  ON deal_model_snapshots FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "Company insert deal model snapshots"
  ON deal_model_snapshots FOR INSERT
  WITH CHECK (company_id = get_user_company_id());

-- NO update/delete policy on purpose: a locked snapshot cannot be mutated. A
-- correction is a NEW version, preserving the original (tamper-evident economics).
