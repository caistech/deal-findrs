-- Migration 007: partner_inquiries table
-- Channel-partner (reseller) enquiry submissions from /partners page.
-- Idempotent: uses IF NOT EXISTS guards throughout.

CREATE TABLE IF NOT EXISTS partner_inquiries (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  email       text NOT NULL,
  firm        text NOT NULL,
  client_range text NOT NULL
    CHECK (client_range IN ('1-5', '6-15', '16-50', '50+')),
  message     text,
  source      text NOT NULL DEFAULT 'partners_page',
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- RLS: enable row-level security — public writes only (insert), admin reads via
-- service-role key (bypasses RLS server-side). No end-user SELECT needed.
ALTER TABLE partner_inquiries ENABLE ROW LEVEL SECURITY;

-- Drop existing policies idempotently before recreating
DROP POLICY IF EXISTS "partner_inquiries_insert_anon" ON partner_inquiries;
DROP POLICY IF EXISTS "partner_inquiries_select_admin" ON partner_inquiries;

-- Anyone can INSERT (pre-auth contact form)
CREATE POLICY "partner_inquiries_insert_anon"
  ON partner_inquiries
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- No SELECT for non-service-role — reads happen via service-role key server-side only
-- (intentionally no SELECT policy for anon/authenticated — data is internal/admin)
