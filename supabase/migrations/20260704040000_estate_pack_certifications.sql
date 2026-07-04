-- Estate professional-pack certifications (Phase 3d).
--
-- Records that a professional has reviewed + certified an estate review pack (engineer / QS / valuer).
-- These certifications are the gate for promoting a deal-model snapshot from v1 (indicative) to v2
-- (bankable): "v2 = bankable (QS + registered valuation)". One current certification per (opportunity,
-- kind) — a re-certify upserts. Company-scoped RLS (get_user_company_id(), like migration 003). Idempotent.

CREATE TABLE IF NOT EXISTS estate_pack_certifications (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id    UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  company_id        UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  kind              TEXT NOT NULL CHECK (kind IN ('engineer','qs','valuer')),
  certified_by_name TEXT NOT NULL,             -- the professional who certified (+ firm)
  note              TEXT,
  certified_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by        UUID REFERENCES auth.users(id),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (opportunity_id, kind)
);
CREATE INDEX IF NOT EXISTS idx_estate_pack_cert_opportunity ON estate_pack_certifications(opportunity_id);

ALTER TABLE estate_pack_certifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Company access to estate pack certifications" ON estate_pack_certifications;
CREATE POLICY "Company access to estate pack certifications"
  ON estate_pack_certifications FOR ALL
  USING (company_id = get_user_company_id());
