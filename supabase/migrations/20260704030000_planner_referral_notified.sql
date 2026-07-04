-- Planner-referral email push (estate Phase 2c) — observability column.
--
-- When a referral is routed/reassigned to a state planner with an email on file, DealFindrs sends a
-- transactional notification (the email leg of the automated refer-to-planner push). This records
-- when that push last fired, so the UI can show "notified" and a re-send is a deliberate act.
-- Idempotent.

ALTER TABLE planning_assessments
  ADD COLUMN IF NOT EXISTS planner_notified_at TIMESTAMPTZ;
