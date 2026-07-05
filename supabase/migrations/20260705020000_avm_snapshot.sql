-- AVM snapshot cache (Constraints-&-Yield / valuer pack)
-- Persist the full Domain PriceComparison (estimate + comparables[] + stats) plus a fetchedAt
-- timestamp so the valuer review pack can REUSE a recent AVM (< 30 days) instead of re-calling the
-- paid property-services comparables() API on every render. Previously only estimate.mid/lower/upper
-- were kept (transiently, in the rendered pack) and comparables[]/stats were discarded, forcing a
-- fresh Domain call each time the pack was generated.
--
-- Stored on opportunities as JSONB: { comparison: PriceComparison, fetchedAt: <ISO8601> }.
-- Divergence-vs-land is intentionally NOT stored — it is recomputed on shape from the current land
-- price, so a stored snapshot stays correct when the land price changes.
--
-- RLS: a column addition inherits the opportunities table's existing company-scoped RLS policies
-- (same pattern as 001_property_profile.sql) — no new policy required. Idempotent (IF NOT EXISTS).

ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS avm_snapshot JSONB;

COMMENT ON COLUMN opportunities.avm_snapshot IS
  'Cached Domain AVM: { comparison: PriceComparison, fetchedAt: ISO8601 }. Reused by the valuer review pack within a 30-day freshness window to avoid repeat paid comparables() calls.';
