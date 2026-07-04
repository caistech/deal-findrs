-- Estate kickoff — state team directory + auto-assembled kickoff with a light meeting log.
--
-- The Constraints & Yield buildup determines which occupations a kickoff needs; the state team
-- directory (estate_team_members) is matched to those (assembleKickoffTeam), and an estate_kickoffs
-- row snapshots the assembly + carries the light meeting log (attendees + acceptance + actions).
--
-- Company-scoped, RLS via get_user_company_id() (same pattern as migration 003). Occupation/state/
-- typology are TEXT (validated app-side against the estate-team TS types) to avoid enum churn.
-- Idempotent.

-- ─── STATE TEAM DIRECTORY ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS estate_team_members (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  firm         TEXT,
  occupation   TEXT NOT NULL,                    -- planner | civil_engineer | modular_supplier | ...
  states       TEXT[] NOT NULL DEFAULT '{}',     -- e.g. {WA} or {WA,SA}
  typologies   TEXT[],                           -- modular suppliers: {townhouse,multi_storey,...}
  email        TEXT,
  phone        TEXT,
  active       BOOLEAN NOT NULL DEFAULT true,
  notes        TEXT,
  created_by   UUID REFERENCES auth.users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_estate_team_company ON estate_team_members(company_id);
CREATE INDEX IF NOT EXISTS idx_estate_team_occupation ON estate_team_members(occupation);

-- ─── KICKOFF (per opportunity) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS estate_kickoffs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  company_id     UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  state          TEXT,
  typology       TEXT,
  civil_mode     TEXT,
  -- Snapshot of the auto-assembly at build time: { nominations[], gaps[] }.
  assembled      JSONB NOT NULL DEFAULT '{}'::jsonb,
  status         TEXT NOT NULL DEFAULT 'draft'
                   CHECK (status IN ('draft','scheduled','held')),
  scheduled_at   TIMESTAMPTZ,
  notes          TEXT,
  created_by     UUID REFERENCES auth.users(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (opportunity_id)
);
CREATE INDEX IF NOT EXISTS idx_estate_kickoffs_company ON estate_kickoffs(company_id);

-- ─── ATTENDEES (light meeting log — who + acceptance) ──────────
CREATE TABLE IF NOT EXISTS estate_kickoff_attendees (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kickoff_id   UUID NOT NULL REFERENCES estate_kickoffs(id) ON DELETE CASCADE,
  occupation   TEXT NOT NULL,
  -- Directory member if nominated from the panel; NULL for principals (client/f2k) or externals.
  member_id    UUID REFERENCES estate_team_members(id) ON DELETE SET NULL,
  name         TEXT,
  acceptance   TEXT NOT NULL DEFAULT 'invited'
                 CHECK (acceptance IN ('invited','accepted','declined','tentative')),
  responded_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_kickoff_attendees_kickoff ON estate_kickoff_attendees(kickoff_id);

-- ─── ACTIONS (light meeting log — actions + owners) ────────────
CREATE TABLE IF NOT EXISTS estate_kickoff_actions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kickoff_id   UUID NOT NULL REFERENCES estate_kickoffs(id) ON DELETE CASCADE,
  description  TEXT NOT NULL,
  owner        TEXT,                              -- occupation or free name
  status       TEXT NOT NULL DEFAULT 'open'
                 CHECK (status IN ('open','done')),
  due_date     DATE,
  created_by   UUID REFERENCES auth.users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_kickoff_actions_kickoff ON estate_kickoff_actions(kickoff_id);

-- ─── RLS (company-scoped) ──────────────────────────────────────
ALTER TABLE estate_team_members        ENABLE ROW LEVEL SECURITY;
ALTER TABLE estate_kickoffs            ENABLE ROW LEVEL SECURITY;
ALTER TABLE estate_kickoff_attendees   ENABLE ROW LEVEL SECURITY;
ALTER TABLE estate_kickoff_actions     ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Company access to estate team"      ON estate_team_members;
DROP POLICY IF EXISTS "Company access to estate kickoffs"  ON estate_kickoffs;
DROP POLICY IF EXISTS "Company access to kickoff attendees" ON estate_kickoff_attendees;
DROP POLICY IF EXISTS "Company access to kickoff actions"  ON estate_kickoff_actions;

CREATE POLICY "Company access to estate team"
  ON estate_team_members FOR ALL
  USING (company_id = get_user_company_id());

CREATE POLICY "Company access to estate kickoffs"
  ON estate_kickoffs FOR ALL
  USING (company_id = get_user_company_id());

CREATE POLICY "Company access to kickoff attendees"
  ON estate_kickoff_attendees FOR ALL
  USING (kickoff_id IN (SELECT id FROM estate_kickoffs WHERE company_id = get_user_company_id()));

CREATE POLICY "Company access to kickoff actions"
  ON estate_kickoff_actions FOR ALL
  USING (kickoff_id IN (SELECT id FROM estate_kickoffs WHERE company_id = get_user_company_id()));
