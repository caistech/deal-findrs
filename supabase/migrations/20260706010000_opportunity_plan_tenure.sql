-- Denormalised plan tenure on the opportunity.
--
-- When a registered subdivision plan is ingested, its reserves (POS / road reserve / drainage) and
-- easements are rolled onto the opportunity so every buildup consumer that reads the opportunity
-- (detail page, deal-model page, review packs) can feed them into the Constraints & Yield buildup as
-- `planTenure` — partially resolving the "easements / covenants / road reserves" tenure gap from the
-- evidence, without each consumer having to re-query development_documents.
--
-- Shape: { easements: [{purpose, detail}], reserves: [{purpose, detail}] }. Nullable (no plan yet).
-- Idempotent, additive.

ALTER TABLE opportunities
  ADD COLUMN IF NOT EXISTS plan_tenure JSONB;

COMMENT ON COLUMN opportunities.plan_tenure IS
  'Reserves + easements read off an ingested registered subdivision plan: { easements:[{purpose,detail}], reserves:[{purpose,detail}] }. Feeds the buildup planTenure (partial tenure resolution).';
