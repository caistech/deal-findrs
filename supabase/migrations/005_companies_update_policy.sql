-- 005_companies_update_policy.sql
-- Allow company admins to UPDATE their own company row.
--
-- Until now `companies` had only a SELECT policy ("Users can view own
-- company"). UPDATEs from the settings page silently failed (no rows
-- affected, no error). This policy gates UPDATE on:
--   1. The row being updated is the caller's own company
--      (companies.id = profiles.company_id WHERE profiles.id = auth.uid())
--   2. The caller's profile role is 'admin'
--
-- Idempotent via DROP IF EXISTS — safe to re-apply.

DROP POLICY IF EXISTS "Admins can update own company" ON public.companies;

CREATE POLICY "Admins can update own company"
  ON public.companies
  FOR UPDATE
  USING (
    id IN (
      SELECT company_id FROM public.profiles
      WHERE id = auth.uid()
        AND role = 'admin'
        AND company_id IS NOT NULL
    )
  )
  WITH CHECK (
    id IN (
      SELECT company_id FROM public.profiles
      WHERE id = auth.uid()
        AND role = 'admin'
        AND company_id IS NOT NULL
    )
  );
