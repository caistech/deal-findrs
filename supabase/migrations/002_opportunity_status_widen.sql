-- Widen opportunities.status CHECK constraint
--
-- The result page (src/app/opportunities/new/result/page.tsx) lets a user
-- mark a deal as 'proceed' or 'pending' after AI assessment. The API
-- route (src/app/api/opportunities/[id]/route.ts:204) accepts these
-- values, but the original CHECK constraint on opportunities.status only
-- allowed: draft / submitted / assessing / assessed / approved /
-- rejected / archived. Result: every "Mark as Proceed" or "Mark as
-- Pending" click 500'd at the DB layer with a class-23 (integrity)
-- violation.
--
-- Fix: drop and recreate the constraint with the wider allowed set,
-- matching what the application code actually sends.
--
-- Idempotent. Safe to re-run.

ALTER TABLE opportunities
  DROP CONSTRAINT IF EXISTS opportunities_status_check;

ALTER TABLE opportunities
  ADD CONSTRAINT opportunities_status_check
  CHECK (status IN (
    'draft',
    'submitted',
    'assessing',
    'assessed',
    'proceed',
    'pending',
    'approved',
    'rejected',
    'archived'
  ));
