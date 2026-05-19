-- Adversarial Feasibility Engine — Phase 1 schema.
--
-- 1. Evidence model — every flattering figure on a deal must be backed by
--    an uploaded document linked via field_evidence_links. The engine treats
--    a figure as ASSERTED (no link) or EVIDENCED (linked).
-- 2. Per-company feasibility thresholds — replaces the hard-coded
--    DEFAULT_CRITERIA constant in src/lib/ai/types.ts.
-- 3. Wipe of legacy assessments — the old soft scorer is being replaced.
--    The user authorised the wipe ("strip them all out, no legacies needed").
--
-- Idempotent. Safe to re-run.

-- ─── EVIDENCE CATEGORY ENUM ────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE evidence_category AS ENUM (
    'purchase_contract',
    'independent_valuation',
    'comparable_sales_set',
    'executed_offtake',
    'signed_construction_contract',
    'equity_proof',
    'waitlist_register',
    'da_approval',
    'title_search',
    'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── DEAL EVIDENCE ─────────────────────────────────────────────
-- One row per uploaded document attached to an opportunity.

CREATE TABLE IF NOT EXISTS deal_evidence (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id        UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  company_id            UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  category              evidence_category NOT NULL,
  storage_path          TEXT NOT NULL,                -- path in Supabase Storage 'deal-evidence' bucket
  original_filename     TEXT,
  file_size_bytes       BIGINT,
  mime_type             TEXT,

  -- Extracted by @caistech/cert-extractor on upload
  extracted_fields      JSONB NOT NULL DEFAULT '{}',
  extraction_confidence NUMERIC(3,2),                 -- 0..1
  extraction_model      TEXT,

  -- Operator verification
  verified_by_user      BOOLEAN NOT NULL DEFAULT false,
  verified_at           TIMESTAMPTZ,
  verified_by           UUID REFERENCES auth.users(id),

  -- Audit
  uploader_id           UUID REFERENCES auth.users(id),
  received_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deal_evidence_opportunity ON deal_evidence(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_deal_evidence_company ON deal_evidence(company_id);
CREATE INDEX IF NOT EXISTS idx_deal_evidence_category ON deal_evidence(category);

-- ─── FIELD EVIDENCE LINKS ──────────────────────────────────────
-- Maps a claim field on the opportunity (e.g. 'land_value', 'grv_total',
-- 'equity_cash') to one or more deal_evidence rows. This is the join that
-- makes a figure "evidenced" rather than "asserted".

CREATE TABLE IF NOT EXISTS field_evidence_links (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id        UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  claim_field           TEXT NOT NULL,                -- 'land_value' | 'grv_total' | 'equity_cash' | 'pre_sales_percent' | etc.
  evidence_id           UUID NOT NULL REFERENCES deal_evidence(id) ON DELETE CASCADE,
  evidence_value_numeric NUMERIC(14,2),               -- the figure this evidence supports, if numeric
  notes                 TEXT,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by            UUID REFERENCES auth.users(id),

  UNIQUE (opportunity_id, claim_field, evidence_id)
);

CREATE INDEX IF NOT EXISTS idx_field_links_opportunity ON field_evidence_links(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_field_links_field ON field_evidence_links(claim_field);

-- ─── FEASIBILITY CRITERIA ──────────────────────────────────────
-- Per-company thresholds for the three-test engine. One row per company.

CREATE TABLE IF NOT EXISTS feasibility_criteria (
  company_id            UUID PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,

  -- Test 1 — Skin in the game
  ltc_ceiling           NUMERIC(4,3) NOT NULL DEFAULT 0.700,   -- loan-to-cost ceiling

  -- Test 3 — Margin with forced contingency
  margin_floor          NUMERIC(4,3) NOT NULL DEFAULT 0.200,   -- gross margin floor
  contingency_baseline  NUMERIC(4,3) NOT NULL DEFAULT 0.050,   -- standard onshore
  contingency_offshore  NUMERIC(4,3) NOT NULL DEFAULT 0.075,   -- offshore supply
  contingency_complex   NUMERIC(4,3) NOT NULL DEFAULT 0.100,   -- heritage / complex / contaminated

  -- Engine versioning
  engine_version        TEXT NOT NULL DEFAULT 'v1',

  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by            UUID REFERENCES auth.users(id)
);

-- Seed defaults for every existing company that doesn't yet have a row.
INSERT INTO feasibility_criteria (company_id)
SELECT id FROM companies
ON CONFLICT (company_id) DO NOTHING;

-- ─── STORAGE BUCKET ────────────────────────────────────────────
-- Private bucket for evidence documents. RLS enforced via storage.objects policies.

INSERT INTO storage.buckets (id, name, public)
VALUES ('deal-evidence', 'deal-evidence', false)
ON CONFLICT (id) DO NOTHING;

-- ─── RLS ───────────────────────────────────────────────────────

ALTER TABLE deal_evidence            ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_evidence_links     ENABLE ROW LEVEL SECURITY;
ALTER TABLE feasibility_criteria     ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies (safe re-run)
DROP POLICY IF EXISTS "Company access to deal evidence"        ON deal_evidence;
DROP POLICY IF EXISTS "Company access to field evidence links" ON field_evidence_links;
DROP POLICY IF EXISTS "Company access to feasibility criteria" ON feasibility_criteria;

CREATE POLICY "Company access to deal evidence"
  ON deal_evidence FOR ALL
  USING (company_id = get_user_company_id());

CREATE POLICY "Company access to field evidence links"
  ON field_evidence_links FOR ALL
  USING (opportunity_id IN (
    SELECT id FROM opportunities WHERE company_id = get_user_company_id()
  ));

CREATE POLICY "Company access to feasibility criteria"
  ON feasibility_criteria FOR ALL
  USING (company_id = get_user_company_id());

-- Storage RLS — only company members can read/write objects in deal-evidence
DROP POLICY IF EXISTS "Company read deal-evidence"   ON storage.objects;
DROP POLICY IF EXISTS "Company write deal-evidence"  ON storage.objects;
DROP POLICY IF EXISTS "Company update deal-evidence" ON storage.objects;
DROP POLICY IF EXISTS "Company delete deal-evidence" ON storage.objects;

CREATE POLICY "Company read deal-evidence"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'deal-evidence'
    AND EXISTS (
      SELECT 1 FROM deal_evidence de
      WHERE de.storage_path = storage.objects.name
        AND de.company_id = get_user_company_id()
    )
  );

CREATE POLICY "Company write deal-evidence"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'deal-evidence'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Company update deal-evidence"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'deal-evidence'
    AND EXISTS (
      SELECT 1 FROM deal_evidence de
      WHERE de.storage_path = storage.objects.name
        AND de.company_id = get_user_company_id()
    )
  );

CREATE POLICY "Company delete deal-evidence"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'deal-evidence'
    AND EXISTS (
      SELECT 1 FROM deal_evidence de
      WHERE de.storage_path = storage.objects.name
        AND de.company_id = get_user_company_id()
    )
  );

-- ─── UPDATED_AT TRIGGER ───────────────────────────────────────

CREATE OR REPLACE FUNCTION feasibility_criteria_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS feasibility_criteria_set_updated_at ON feasibility_criteria;
CREATE TRIGGER feasibility_criteria_set_updated_at
  BEFORE UPDATE ON feasibility_criteria
  FOR EACH ROW EXECUTE FUNCTION feasibility_criteria_touch_updated_at();

-- ─── WIPE LEGACY ASSESSMENTS ──────────────────────────────────
-- The old soft scorer is being replaced by the adversarial engine.
-- User explicitly authorised: "strip them all out, no legacies needed".
--
-- Strips:
--   * all rows in assessments
--   * rag_status on all opportunities (the old engine wrote it)
-- Preserves:
--   * opportunities input rows (source data, will be re-assessed under new engine)
--   * devfinance_projects / qs_reports / valuation_reports / feasibility_studies
--     (downstream artefacts a user paid time to generate; not the legacy RAG)

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'assessments') THEN
    DELETE FROM assessments;
  END IF;
END $$;

UPDATE opportunities SET rag_status = NULL WHERE rag_status IS NOT NULL;
