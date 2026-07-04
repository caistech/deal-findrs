-- Planner-referral routing (estate Phase 2c follow-on).
--
-- The referral now routes to the state's planner-panel member from the Estate Team Directory
-- (estate_team_members, occupation='planner', states @> {referral.state}). "The per-state planner
-- panel is the planner slice of this directory — planners are members like any other, and
-- additionally the recipients of the automated referrals." See docs/estate-constraints-yield-plan.md.
--
-- assigned_planner_id  — the routed directory planner (SET NULL if that member is deleted).
-- assigned_planner_name — label snapshot at assignment (survives a later member rename/delete, same
--                         pattern as estate_kickoff_attendees.name).
-- planner_gap          — true when NO planner covers the referral's state (tells F2K to build out
--                         that state's panel; the referral is human-only until then).
-- Idempotent.

ALTER TABLE planning_assessments
  ADD COLUMN IF NOT EXISTS assigned_planner_id   UUID REFERENCES estate_team_members(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_planner_name TEXT,
  ADD COLUMN IF NOT EXISTS planner_gap           BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_planning_assessments_planner ON planning_assessments(assigned_planner_id);
