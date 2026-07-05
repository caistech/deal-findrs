-- Conditions register (Phase 2) — the conditions of approval extracted from a WAPC/LG decision
-- letter become TRACKED planning items (the F2K-Checkpoint planning-board pattern), each with a
-- clearing authority and a clearance status. This is "the conditions inserted into the planning
-- functions": they drive the Constraints & Yield buildup (servicing conditions resolve the servicing
-- gap; geotech/water-management/contamination conditions raise constraint flags) and give the
-- operator a Form-1C clearance checklist. Populated on document ingest from development_documents.

CREATE TABLE IF NOT EXISTS development_conditions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id     UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  document_id    UUID REFERENCES development_documents(id) ON DELETE CASCADE,
  number         INT,                                   -- the condition number in the letter
  text           TEXT NOT NULL,
  authority      TEXT,                                  -- clearing authority (e.g. "City of Greater Geraldton")
  category       TEXT NOT NULL DEFAULT 'admin'
                   CHECK (category IN ('servicing','civil','constraint','tenure','statutory','admin')),
  status         TEXT NOT NULL DEFAULT 'outstanding'
                   CHECK (status IN ('outstanding','in_progress','cleared','not_applicable')),
  note           TEXT,
  cleared_at     TIMESTAMPTZ,
  created_by     UUID REFERENCES auth.users(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_development_conditions_company ON development_conditions(company_id);
CREATE INDEX IF NOT EXISTS idx_development_conditions_opportunity ON development_conditions(opportunity_id);

ALTER TABLE development_conditions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY development_conditions_select ON development_conditions
    FOR SELECT USING (company_id = get_user_company_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY development_conditions_insert ON development_conditions
    FOR INSERT WITH CHECK (company_id = get_user_company_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY development_conditions_update ON development_conditions
    FOR UPDATE USING (company_id = get_user_company_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY development_conditions_delete ON development_conditions
    FOR DELETE USING (company_id = get_user_company_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
