-- Fix RLS infinite recursion on company_memberships.
--
-- The "Users can view company members" (SELECT) and "Admins can manage memberships" (ALL) policies
-- self-referenced company_memberships in their USING subquery:
--     company_id IN (SELECT company_id FROM company_memberships WHERE user_id = auth.uid())
-- Evaluating a company_memberships policy therefore required reading company_memberships, which
-- re-applied the same policy → "infinite recursion detected in policy for relation
-- company_memberships". Any RLS-scoped read that transitively touches memberships (notably the
-- opportunities SELECT policy, which subqueries company_memberships) ERRORED, and the ingest-approval
-- route surfaced that error to the operator as `opportunity_not_found`.
--
-- Fix: move the membership lookup into SECURITY DEFINER helper functions. SECURITY DEFINER runs as the
-- function owner and BYPASSES RLS, so reading company_memberships inside them does not re-trigger the
-- policies — the self-reference (and the recursion) is gone. The "Users can view own memberships"
-- policy (user_id = auth.uid()) was already non-recursive and is left untouched.
--
-- Idempotent: CREATE OR REPLACE FUNCTION + DROP POLICY IF EXISTS + CREATE POLICY.

-- The set of company_ids the current user belongs to (RLS-free).
CREATE OR REPLACE FUNCTION public.user_company_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.company_memberships WHERE user_id = auth.uid()
$$;

-- The subset where the user is owner/admin (RLS-free).
CREATE OR REPLACE FUNCTION public.user_admin_company_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.company_memberships
  WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
$$;

GRANT EXECUTE ON FUNCTION public.user_company_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_admin_company_ids() TO authenticated;

-- Rewrite the two recursive policies to use the helpers (no self-reference).
DROP POLICY IF EXISTS "Users can view company members" ON public.company_memberships;
CREATE POLICY "Users can view company members" ON public.company_memberships
  FOR SELECT USING (company_id IN (SELECT public.user_company_ids()));

DROP POLICY IF EXISTS "Admins can manage memberships" ON public.company_memberships;
CREATE POLICY "Admins can manage memberships" ON public.company_memberships
  FOR ALL
  USING (company_id IN (SELECT public.user_admin_company_ids()))
  WITH CHECK (company_id IN (SELECT public.user_admin_company_ids()));
