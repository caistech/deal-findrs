-- Planner referral — adopted from F2K-Checkpoint's Planning Review (planning_assessments/findings/
-- events), the human-in-the-loop planner board. Shape kept close to Checkpoint's so a later
-- @caistech/planning-review extraction is a lift-out, not a rewrite. DealFindrs specifics:
-- company-scoped RLS (get_user_company_id(), like migration 003), a link to the opportunity, and a
-- STRUCTURED RESOLUTION (resolved zone / min-lot / lots) that flows back into the Constraints & Yield
-- buildup when the planner approves. Findings are KB-cited via the shared property-services
-- planning-retrieve endpoint. Idempotent.

DO $$ BEGIN
  CREATE TYPE planning_finding_dimension AS ENUM ('zoning_use','density_yield','approval_pathway','constraints');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── ASSESSMENTS (the referral) ────────────────────────────────
CREATE TABLE IF NOT EXISTS planning_assessments (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id     UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  opportunity_id UUID REFERENCES opportunities(id) ON DELETE CASCADE,
  site_label     TEXT NOT NULL,
  site_context   JSONB NOT NULL DEFAULT '{}'::jsonb,   -- derive result + address at referral time
  state          TEXT,
  lga            TEXT,
  status         TEXT NOT NULL DEFAULT 'in_review'
                   CHECK (status IN ('draft','in_review','approved')),
  -- Planner's structured resolution — flows back into the buildup when approved.
  resolved_zone_code   TEXT,
  resolved_min_lot_size NUMERIC,
  resolved_lots        INT,
  created_by     UUID REFERENCES auth.users(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_planning_assessments_company ON planning_assessments(company_id);
CREATE INDEX IF NOT EXISTS idx_planning_assessments_opportunity ON planning_assessments(opportunity_id);

-- ─── FINDINGS (AI-drafted, planner-reviewed) ───────────────────
CREATE TABLE IF NOT EXISTS planning_findings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES planning_assessments(id) ON DELETE CASCADE,
  dimension     planning_finding_dimension NOT NULL,
  sort_order    INT NOT NULL DEFAULT 0,
  claim         TEXT NOT NULL,
  ai_rationale  TEXT NOT NULL DEFAULT '',
  citations     JSONB NOT NULL DEFAULT '[]'::jsonb,   -- [{title,source_url,version_date,...}]
  confidence    TEXT NOT NULL DEFAULT 'medium' CHECK (confidence IN ('low','medium','high')),
  needs_human   BOOLEAN NOT NULL DEFAULT false,        -- AI flagged: not covered by KB / needs local judgment
  status        TEXT NOT NULL DEFAULT 'ai_draft' CHECK (status IN ('ai_draft','approved','edited','rejected')),
  current_text  TEXT,                                  -- planner's edited conclusion; NULL = use claim
  reviewer_note TEXT,
  reviewed_by   UUID REFERENCES auth.users(id),
  reviewed_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_planning_findings_assessment ON planning_findings(assessment_id);

-- ─── FINDING EVENTS (correction pairs — captured methodology) ──
CREATE TABLE IF NOT EXISTS planning_finding_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  finding_id    UUID NOT NULL REFERENCES planning_findings(id) ON DELETE CASCADE,
  assessment_id UUID NOT NULL REFERENCES planning_assessments(id) ON DELETE CASCADE,
  action        TEXT NOT NULL,                         -- generate | approve | edit | reject | note
  from_status   TEXT,
  to_status     TEXT,
  ai_value      TEXT,                                  -- correction pair LHS
  human_value   TEXT,                                  -- correction pair RHS
  rationale     TEXT,
  actor         UUID REFERENCES auth.users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_planning_finding_events_finding ON planning_finding_events(finding_id);

-- ─── RLS (company-scoped) ──────────────────────────────────────
ALTER TABLE planning_assessments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE planning_findings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE planning_finding_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Company access to planning assessments" ON planning_assessments;
DROP POLICY IF EXISTS "Company access to planning findings"    ON planning_findings;
DROP POLICY IF EXISTS "Company access to planning events"      ON planning_finding_events;

CREATE POLICY "Company access to planning assessments"
  ON planning_assessments FOR ALL
  USING (company_id = get_user_company_id());

CREATE POLICY "Company access to planning findings"
  ON planning_findings FOR ALL
  USING (assessment_id IN (SELECT id FROM planning_assessments WHERE company_id = get_user_company_id()));

CREATE POLICY "Company access to planning events"
  ON planning_finding_events FOR ALL
  USING (assessment_id IN (SELECT id FROM planning_assessments WHERE company_id = get_user_company_id()));
