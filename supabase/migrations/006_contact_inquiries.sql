-- Contact enquiries submitted from the public landing page.
-- No user_id — submissions come from unauthenticated visitors.
-- RLS: service-role inserts via /api/contact; admins can read via the service role.

CREATE TABLE IF NOT EXISTS public.contact_inquiries (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  email      text NOT NULL,
  message    text NOT NULL,
  source     text NOT NULL DEFAULT 'landing_page',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_inquiries ENABLE ROW LEVEL SECURITY;

-- No SELECT policy for authenticated users — only service-role reads this table.
-- Insert is handled server-side via service-role key; no RLS INSERT policy needed
-- because the service-role bypasses RLS by definition.
