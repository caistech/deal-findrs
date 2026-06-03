-- Migration: share_tokens
-- Purpose: Distribution loop — allows users to share a public summary of an
--          assessed opportunity (RAG result + key financials) via a short link.
--          The shared page carries DealFindrs attribution, turning every Finance
--          Pack shared with a lender/broker into an acquisition surface.
-- Idempotent: safe to re-run (CREATE TABLE IF NOT EXISTS, CREATE POLICY IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS share_tokens (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token          TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  opportunity_id UUID NOT NULL,         -- references opportunities.id (no FK constraint — avoids cascade deps)
  company_id     UUID NOT NULL,         -- owner company for RLS
  created_by     UUID NOT NULL,         -- auth.uid() of the user who created the share
  -- Snapshot of key fields at share-time (denormalised for public read without joins)
  opportunity_name   TEXT,
  opportunity_address TEXT,
  rag_status         TEXT,              -- 'green' | 'amber' | 'red'
  score              NUMERIC,
  gross_margin_pct   NUMERIC,
  partner_name       TEXT,             -- white-label partner firm name (for attribution)
  -- Lifecycle
  expires_at         TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked            BOOLEAN NOT NULL DEFAULT false
);

-- Index for token lookups (public GET by token)
CREATE INDEX IF NOT EXISTS share_tokens_token_idx ON share_tokens (token);

-- Index for opportunity lookups (so we can list shares per opportunity)
CREATE INDEX IF NOT EXISTS share_tokens_opportunity_idx ON share_tokens (opportunity_id);

-- RLS
ALTER TABLE share_tokens ENABLE ROW LEVEL SECURITY;

-- Public can read non-expired, non-revoked tokens (for the share page)
DROP POLICY IF EXISTS "share_tokens_public_read" ON share_tokens;
CREATE POLICY "share_tokens_public_read"
  ON share_tokens
  FOR SELECT
  USING (
    revoked = false
    AND expires_at > now()
  );

-- Authenticated users can insert tokens for their own company
DROP POLICY IF EXISTS "share_tokens_owner_insert" ON share_tokens;
CREATE POLICY "share_tokens_owner_insert"
  ON share_tokens
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Authenticated users can update (revoke) their own tokens
DROP POLICY IF EXISTS "share_tokens_owner_update" ON share_tokens;
CREATE POLICY "share_tokens_owner_update"
  ON share_tokens
  FOR UPDATE
  USING (auth.uid() = created_by);

-- Authenticated users can delete their own tokens
DROP POLICY IF EXISTS "share_tokens_owner_delete" ON share_tokens;
CREATE POLICY "share_tokens_owner_delete"
  ON share_tokens
  FOR DELETE
  USING (auth.uid() = created_by);
