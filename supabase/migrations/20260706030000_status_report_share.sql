-- Shareable status report — extends the share_tokens mechanism.
--
-- The existing share token is a thin public assessment teaser (RAG + GM%). A STATUS REPORT is a
-- distinct, richer artifact: verdict + land/house economics + lifecycle + conditions-clearance
-- progress + open gaps + next steps — the operational "where is this deal" snapshot, shareable to a
-- funder / partner / co-owner without a login. We store the assembled snapshot as JSONB on the token
-- (a point-in-time report, immutable once shared) and flag the token kind so the public route renders
-- the right view.
--
-- Idempotent, additive.

ALTER TABLE share_tokens
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'assessment',
  ADD COLUMN IF NOT EXISTS status_snapshot JSONB;

COMMENT ON COLUMN share_tokens.kind IS 'assessment (the teaser) | status (the full status report)';
COMMENT ON COLUMN share_tokens.status_snapshot IS 'Point-in-time status-report snapshot (verdict, economics, lifecycle, conditions progress, gaps, next steps) rendered by /status/[token]. Present when kind=status.';
