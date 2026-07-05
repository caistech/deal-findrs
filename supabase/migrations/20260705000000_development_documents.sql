-- Development document ingestion — the onboarding capability that establishes a deal's ACCURATE
-- state at the moment of ingestion by extracting evidence from whatever documentation the operator
-- uploads (WAPC decision letter, subdivision plan, title, geotech, QS cost plan, valuation, …).
-- Each document is classified + extracted, ticks the @caistech/deal-model StageGateTicks it
-- evidences, and its structured data resolves the Constraints & Yield buildup gaps. The rolled-up
-- gate → assignStage() (coarse deal-model stage) AND a finer lifecycle status (greenfield →
-- subdivision-approved → titled) become the opportunity's evidence-derived current status.
--
-- Phase 1 target: a WAPC subdivision-approval letter + plan → residential lots + min-lot resolve
-- the planner referral (planning_assessments status='approved'), and the approval gates flip.

-- ─── DOCUMENTS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS development_documents (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id     UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  kind           TEXT NOT NULL,                          -- 'wapc_subdivision_approval' | 'subdivision_plan' | 'title' | 'geotech' | 'qs_cost_plan' | 'valuation' | 'other'
  filename       TEXT,
  extracted      JSONB NOT NULL DEFAULT '{}'::jsonb,     -- structured fields pulled from the document
  stage_gate     JSONB NOT NULL DEFAULT '{}'::jsonb,     -- the StageGateTicks this document evidences
  conditions     JSONB NOT NULL DEFAULT '[]'::jsonb,     -- [{number,text,authority,category}] for approvals
  created_by     UUID REFERENCES auth.users(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_development_documents_company ON development_documents(company_id);
CREATE INDEX IF NOT EXISTS idx_development_documents_opportunity ON development_documents(opportunity_id);

-- ─── OPPORTUNITY: evidence-derived current status ───────────────
ALTER TABLE opportunities
  ADD COLUMN IF NOT EXISTS stage_gate       JSONB,   -- rolled-up StageGateTicks across all documents
  ADD COLUMN IF NOT EXISTS deal_model_stage TEXT,    -- assignStage() → 'Conception' | 'Part-developed' | 'De-risked'
  ADD COLUMN IF NOT EXISTS lifecycle_status TEXT;    -- finer ladder → 'greenfield' … 'subdivision_approved' … 'titled'

-- ─── RLS (company-scoped, mirrors planning_assessments / migration 003) ──
ALTER TABLE development_documents ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY development_documents_select ON development_documents
    FOR SELECT USING (company_id = get_user_company_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY development_documents_insert ON development_documents
    FOR INSERT WITH CHECK (company_id = get_user_company_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY development_documents_delete ON development_documents
    FOR DELETE USING (company_id = get_user_company_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
