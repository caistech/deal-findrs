-- ============================================================
-- DevFinance Schema for DealFindrs
-- Extends the existing opportunities table with development
-- finance modules: QS, Valuation, Feasibility, Affordable Gap
-- ============================================================

-- ─── ENUMS ─────────────────────────────────────────────────────

CREATE TYPE module_status AS ENUM (
  'draft',
  'ai_generated',
  'under_review',
  'signed_off',
  'exported'
);

CREATE TYPE risk_level AS ENUM (
  'low',
  'medium',
  'high',
  'critical'
);

CREATE TYPE bridging_mechanism AS ENUM (
  'capital_grant',
  'direct_acquisition',
  'concessional_finance',
  'below_market_land',
  'shared_equity',
  'rent_to_buy',
  'community_land_trust'
);

CREATE TYPE cost_source AS ENUM (
  'rawlinsons',
  'project_actual',
  'ai_estimated',
  'manual'
);

CREATE TYPE comp_source AS ENUM (
  'corelogic',
  'domain',
  'rpdata',
  'valuer_general',
  'ai_generated',
  'manual'
);

-- ─── DEVFINANCE PROJECTS ───────────────────────────────────────
-- Links an opportunity to its DevFinance modules.
-- One opportunity → one devfinance project → multiple report versions.

CREATE TABLE devfinance_projects (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id  UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Builder info
  builder_name    TEXT NOT NULL,
  builder_abn     TEXT,

  -- Construction program
  construction_program_months INTEGER NOT NULL DEFAULT 12,

  -- Module statuses (denormalised for fast dashboard queries)
  qs_status           module_status NOT NULL DEFAULT 'draft',
  valuation_status    module_status NOT NULL DEFAULT 'draft',
  feasibility_status  module_status NOT NULL DEFAULT 'draft',
  affordable_status   module_status NOT NULL DEFAULT 'draft',

  -- Finance parameters (shared across modules)
  interest_rate       NUMERIC(5,4),       -- e.g. 0.0850
  loan_term_months    INTEGER,
  ltv_target          NUMERIC(4,3),       -- e.g. 0.650
  sales_start_month   INTEGER,
  sales_period_months INTEGER,

  -- Metadata
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by      UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_devfinance_projects_opportunity ON devfinance_projects(opportunity_id);
CREATE INDEX idx_devfinance_projects_company ON devfinance_projects(company_id);

-- ─── UNIT MIX ──────────────────────────────────────────────────
-- Shared across all modules. One row per unit type per project.

CREATE TABLE devfinance_unit_mix (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES devfinance_projects(id) ON DELETE CASCADE,

  code            TEXT NOT NULL,         -- e.g. "1A", "2B"
  name            TEXT NOT NULL,         -- e.g. "Type 1A - 3 Bed"
  count           INTEGER NOT NULL,
  floor_area_sqm  NUMERIC(8,2) NOT NULL,
  bedrooms        INTEGER NOT NULL DEFAULT 3,
  bathrooms       INTEGER NOT NULL DEFAULT 2,
  parking         INTEGER NOT NULL DEFAULT 1,

  sort_order      INTEGER NOT NULL DEFAULT 0,

  UNIQUE(project_id, code)
);

CREATE INDEX idx_unit_mix_project ON devfinance_unit_mix(project_id);

-- ─── QS REPORTS ────────────────────────────────────────────────

CREATE TABLE qs_reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES devfinance_projects(id) ON DELETE CASCADE,
  status          module_status NOT NULL DEFAULT 'ai_generated',
  version         INTEGER NOT NULL DEFAULT 1,

  -- Construction cost summary
  construction_subtotal   NUMERIC(14,2) NOT NULL,
  professional_fees       NUMERIC(14,2) NOT NULL DEFAULT 0,
  statutory_costs         NUMERIC(14,2) NOT NULL DEFAULT 0,
  finance_costs           NUMERIC(14,2) NOT NULL DEFAULT 0,
  sales_costs             NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_development_cost  NUMERIC(14,2) NOT NULL,
  cost_per_unit           NUMERIC(14,2) NOT NULL,
  cost_per_sqm            NUMERIC(10,2) NOT NULL,

  -- Contingency
  base_contingency_pct        NUMERIC(5,2) NOT NULL DEFAULT 5.00,
  base_contingency_amount     NUMERIC(14,2) NOT NULL,
  risk_adjusted_contingency_pct    NUMERIC(5,2) NOT NULL,
  risk_adjusted_contingency_amount NUMERIC(14,2) NOT NULL,
  contingency_risk_factors    JSONB NOT NULL DEFAULT '[]',

  -- Draw-down schedule (JSONB array of milestones)
  draw_down_schedule      JSONB NOT NULL DEFAULT '[]',
  construction_program_months INTEGER NOT NULL,

  -- AI review commentary
  ai_commentary           TEXT,
  ai_model_used           TEXT,

  -- Sign-off
  qs_firm                 TEXT,
  qs_name                 TEXT,
  qs_registration         TEXT,
  signed_off_at           TIMESTAMPTZ,
  sign_off_notes          TEXT,

  -- Metadata
  generated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_qs_reports_project ON qs_reports(project_id);
CREATE INDEX idx_qs_reports_status ON qs_reports(status);

-- ─── QS TRADE ITEMS ────────────────────────────────────────────
-- Normalised trade-by-trade breakdown for each QS report.

CREATE TABLE qs_trade_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  qs_report_id    UUID NOT NULL REFERENCES qs_reports(id) ON DELETE CASCADE,

  category        TEXT NOT NULL,         -- e.g. "Substructure", "Superstructure"
  trade           TEXT NOT NULL,         -- e.g. "Concrete Slab", "Electrical"
  description     TEXT,
  quantity        NUMERIC(12,2) NOT NULL,
  unit            TEXT NOT NULL,         -- e.g. "m²", "m³", "item", "lm"
  rate            NUMERIC(10,2) NOT NULL,
  total           NUMERIC(14,2) NOT NULL,
  source          cost_source NOT NULL DEFAULT 'rawlinsons',
  confidence      NUMERIC(3,2) NOT NULL DEFAULT 0.75,

  -- QS/manual adjustments
  adjusted_rate   NUMERIC(10,2),        -- null = no adjustment
  adjusted_total  NUMERIC(14,2),
  adjustment_note TEXT,

  sort_order      INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_qs_trades_report ON qs_trade_items(qs_report_id);
CREATE INDEX idx_qs_trades_category ON qs_trade_items(category);

-- ─── VALUATION REPORTS ─────────────────────────────────────────

CREATE TABLE valuation_reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES devfinance_projects(id) ON DELETE CASCADE,
  status          module_status NOT NULL DEFAULT 'ai_generated',
  version         INTEGER NOT NULL DEFAULT 1,

  -- GRV
  gross_realisable_value  NUMERIC(14,2) NOT NULL,

  -- PRSV
  tdc_excluding_land      NUMERIC(14,2) NOT NULL,   -- sourced from QS
  target_profit_margin    NUMERIC(4,3) NOT NULL DEFAULT 0.200,
  project_site_related_value NUMERIC(14,2) NOT NULL,

  -- Soft equity
  land_purchase_price     NUMERIC(14,2) NOT NULL,
  soft_equity             NUMERIC(14,2) NOT NULL DEFAULT 0,

  -- Market analysis
  market_commentary       TEXT,
  absorption_rate_months  INTEGER,
  market_risk_level       risk_level NOT NULL DEFAULT 'medium',

  -- AI metadata
  ai_model_used           TEXT,

  -- Sign-off
  valuer_firm             TEXT,
  valuer_name             TEXT,
  valuer_registration     TEXT,         -- API registration number
  signed_off_at           TIMESTAMPTZ,
  sign_off_notes          TEXT,

  -- Metadata
  generated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_valuation_reports_project ON valuation_reports(project_id);
CREATE INDEX idx_valuation_reports_status ON valuation_reports(status);

-- ─── COMPARABLE SALES ──────────────────────────────────────────

CREATE TABLE valuation_comparables (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  valuation_id      UUID NOT NULL REFERENCES valuation_reports(id) ON DELETE CASCADE,

  address           TEXT NOT NULL,
  suburb            TEXT NOT NULL,
  sale_price        NUMERIC(14,2) NOT NULL,
  sale_date         DATE NOT NULL,
  land_area_sqm     NUMERIC(10,2),
  floor_area_sqm    NUMERIC(10,2) NOT NULL,
  bedrooms          INTEGER NOT NULL,
  bathrooms         INTEGER NOT NULL DEFAULT 1,
  parking           INTEGER NOT NULL DEFAULT 1,
  distance_km       NUMERIC(6,2) NOT NULL,
  price_per_sqm     NUMERIC(10,2) NOT NULL,

  -- Adjustments
  adjusted_price    NUMERIC(14,2) NOT NULL,
  adjustment_notes  TEXT,

  -- Source & quality
  source            comp_source NOT NULL DEFAULT 'ai_generated',
  relevance_score   NUMERIC(3,2) NOT NULL DEFAULT 0.50,
  is_verified       BOOLEAN NOT NULL DEFAULT false,  -- valuer has verified this comp

  sort_order        INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_comparables_valuation ON valuation_comparables(valuation_id);
CREATE INDEX idx_comparables_suburb ON valuation_comparables(suburb);

-- ─── UNIT VALUATIONS ───────────────────────────────────────────
-- Per-unit-type valuation linked to comparables.

CREATE TABLE valuation_unit_values (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  valuation_id        UUID NOT NULL REFERENCES valuation_reports(id) ON DELETE CASCADE,
  unit_type_code      TEXT NOT NULL,       -- matches devfinance_unit_mix.code

  count               INTEGER NOT NULL,
  market_value_per_unit NUMERIC(14,2) NOT NULL,
  total_value         NUMERIC(14,2) NOT NULL,
  confidence_level    NUMERIC(3,2) NOT NULL DEFAULT 0.50,
  valuation_basis     TEXT NOT NULL DEFAULT 'Direct comparison',

  -- Valuer adjustments
  adjusted_value_per_unit NUMERIC(14,2),
  adjustment_note     TEXT,

  UNIQUE(valuation_id, unit_type_code)
);

CREATE INDEX idx_unit_values_valuation ON valuation_unit_values(valuation_id);

-- Junction: which comps support which unit valuations
CREATE TABLE valuation_comp_links (
  unit_value_id   UUID NOT NULL REFERENCES valuation_unit_values(id) ON DELETE CASCADE,
  comparable_id   UUID NOT NULL REFERENCES valuation_comparables(id) ON DELETE CASCADE,
  PRIMARY KEY (unit_value_id, comparable_id)
);

-- ─── FEASIBILITY STUDIES ───────────────────────────────────────

CREATE TABLE feasibility_studies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES devfinance_projects(id) ON DELETE CASCADE,
  qs_report_id    UUID REFERENCES qs_reports(id),             -- which QS version this uses
  valuation_id    UUID REFERENCES valuation_reports(id),      -- which valuation version
  status          module_status NOT NULL DEFAULT 'ai_generated',
  version         INTEGER NOT NULL DEFAULT 1,

  -- Revenue
  gross_realisable_value  NUMERIC(14,2) NOT NULL,
  less_sales_costs        NUMERIC(14,2) NOT NULL DEFAULT 0,
  net_realisable_value    NUMERIC(14,2) NOT NULL,

  -- Costs
  land_cost               NUMERIC(14,2) NOT NULL,
  construction_cost       NUMERIC(14,2) NOT NULL,
  professional_fees       NUMERIC(14,2) NOT NULL DEFAULT 0,
  statutory_costs         NUMERIC(14,2) NOT NULL DEFAULT 0,
  finance_costs           NUMERIC(14,2) NOT NULL DEFAULT 0,
  contingency             NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_development_cost  NUMERIC(14,2) NOT NULL,

  -- Returns
  development_profit      NUMERIC(14,2) NOT NULL,
  profit_on_cost          NUMERIC(6,2) NOT NULL,       -- %
  profit_on_grv           NUMERIC(6,2) NOT NULL,       -- %
  profit_margin           NUMERIC(6,2) NOT NULL,       -- %

  -- PRSV & equity
  prsv                    NUMERIC(14,2) NOT NULL DEFAULT 0,
  soft_equity             NUMERIC(14,2) NOT NULL DEFAULT 0,
  cash_equity_required    NUMERIC(14,2) NOT NULL DEFAULT 0,

  -- Finance
  loan_to_value_ratio     NUMERIC(5,2) NOT NULL,       -- %
  interest_rate           NUMERIC(5,4) NOT NULL,
  loan_term_months        INTEGER NOT NULL,
  total_interest          NUMERIC(14,2) NOT NULL DEFAULT 0,

  -- Cash flow (JSONB array of CashFlowPeriod)
  cash_flow               JSONB NOT NULL DEFAULT '[]',
  peak_debt               NUMERIC(14,2) NOT NULL DEFAULT 0,
  peak_debt_month         INTEGER NOT NULL DEFAULT 0,

  -- Sensitivity (JSONB array of SensitivityScenario)
  sensitivity_scenarios   JSONB NOT NULL DEFAULT '[]',

  -- Risk matrix (JSONB array)
  risks                   JSONB NOT NULL DEFAULT '[]',

  -- AI metadata
  ai_model_used           TEXT,

  -- Metadata
  generated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_feasibility_project ON feasibility_studies(project_id);
CREATE INDEX idx_feasibility_status ON feasibility_studies(status);

-- ─── AFFORDABLE GAP ANALYSES ───────────────────────────────────

CREATE TABLE affordable_gap_analyses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES devfinance_projects(id) ON DELETE CASCADE,
  qs_report_id    UUID REFERENCES qs_reports(id),
  valuation_id    UUID REFERENCES valuation_reports(id),
  status          module_status NOT NULL DEFAULT 'ai_generated',
  version         INTEGER NOT NULL DEFAULT 1,

  -- Affordable component
  total_units             INTEGER NOT NULL,
  affordable_units        INTEGER NOT NULL,
  affordable_percent      NUMERIC(5,2) NOT NULL,

  -- The gap
  market_price_per_unit   NUMERIC(14,2) NOT NULL,
  chp_max_price           NUMERIC(14,2) NOT NULL,
  chp_discount_percent    NUMERIC(5,2) NOT NULL,
  gap_per_unit            NUMERIC(14,2) NOT NULL,
  total_gap               NUMERIC(14,2) NOT NULL,

  -- Recommended mechanism
  recommended_scenario    bridging_mechanism,

  -- Blended feasibility
  blended_grv             NUMERIC(14,2) NOT NULL,
  blended_profit          NUMERIC(14,2) NOT NULL,
  blended_margin          NUMERIC(6,2) NOT NULL,
  is_blended_viable       BOOLEAN NOT NULL DEFAULT false,

  -- Full market comparison
  full_market_grv         NUMERIC(14,2) NOT NULL,
  full_market_profit      NUMERIC(14,2) NOT NULL,
  full_market_margin      NUMERIC(6,2) NOT NULL,

  -- Policy commentary
  policy_commentary       TEXT,

  -- AI metadata
  ai_model_used           TEXT,

  -- Metadata
  generated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_affordable_project ON affordable_gap_analyses(project_id);

-- ─── BRIDGING SCENARIOS ────────────────────────────────────────
-- Normalised so they can be individually edited / compared.

CREATE TABLE affordable_bridging_scenarios (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id         UUID NOT NULL REFERENCES affordable_gap_analyses(id) ON DELETE CASCADE,

  mechanism           bridging_mechanism NOT NULL,
  label               TEXT NOT NULL,
  description         TEXT NOT NULL,
  subsidy_per_unit    NUMERIC(14,2) NOT NULL,
  total_subsidy       NUMERIC(14,2) NOT NULL,
  effective_chp_price NUMERIC(14,2) NOT NULL,
  developer_margin_impact NUMERIC(6,4) NOT NULL DEFAULT 0,
  is_viable           BOOLEAN NOT NULL DEFAULT false,
  assumptions         JSONB NOT NULL DEFAULT '[]',

  sort_order          INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_bridging_analysis ON affordable_bridging_scenarios(analysis_id);

-- ─── FINANCE PACKS ─────────────────────────────────────────────
-- The combined output — links to the specific version of each module.

CREATE TABLE finance_packs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES devfinance_projects(id) ON DELETE CASCADE,

  -- Module versions used
  qs_report_id    UUID NOT NULL REFERENCES qs_reports(id),
  valuation_id    UUID NOT NULL REFERENCES valuation_reports(id),
  feasibility_id  UUID NOT NULL REFERENCES feasibility_studies(id),
  affordable_id   UUID REFERENCES affordable_gap_analyses(id),   -- optional

  -- Executive summary
  executive_summary TEXT NOT NULL,

  -- Key metrics (denormalised for fast display)
  grv             NUMERIC(14,2) NOT NULL,
  tdc             NUMERIC(14,2) NOT NULL,
  profit          NUMERIC(14,2) NOT NULL,
  margin          NUMERIC(6,2) NOT NULL,
  prsv            NUMERIC(14,2) NOT NULL,
  soft_equity     NUMERIC(14,2) NOT NULL,
  ltv             NUMERIC(5,2) NOT NULL,
  peak_debt       NUMERIC(14,2) NOT NULL,

  -- Export
  exported_at     TIMESTAMPTZ,
  export_format   TEXT,                -- 'pdf' or 'docx'
  export_url      TEXT,                -- Supabase storage URL

  -- Version tracking
  version         INTEGER NOT NULL DEFAULT 1,

  -- Metadata
  generated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_finance_packs_project ON finance_packs(project_id);

-- ─── PROFESSIONAL SIGN-OFFS ───────────────────────────────────
-- Audit trail for QS and valuer sign-offs across any module.

CREATE TABLE professional_signoffs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Polymorphic reference
  module_type     TEXT NOT NULL CHECK (module_type IN ('qs', 'valuation')),
  module_id       UUID NOT NULL,         -- qs_reports.id or valuation_reports.id

  -- Professional details
  firm_name       TEXT NOT NULL,
  professional_name TEXT NOT NULL,
  registration_number TEXT NOT NULL,     -- AIQS number or API registration
  pi_insurer      TEXT,                  -- professional indemnity insurer
  pi_policy_number TEXT,
  pi_expiry       DATE,

  -- Sign-off
  signed_off_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes           TEXT,
  signature_url   TEXT,                  -- uploaded signature image

  -- Metadata
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_signoffs_module ON professional_signoffs(module_type, module_id);

-- ─── AI USAGE LOG ──────────────────────────────────────────────
-- Track AI costs per module generation (mirrors MMC Build pattern).

CREATE TABLE devfinance_ai_usage (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES devfinance_projects(id) ON DELETE CASCADE,
  company_id      UUID NOT NULL REFERENCES companies(id),

  module          TEXT NOT NULL CHECK (module IN ('qs', 'valuation', 'feasibility', 'affordable', 'pack')),
  ai_model        TEXT NOT NULL,
  prompt_tokens   INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens    INTEGER NOT NULL DEFAULT 0,
  cost_usd        NUMERIC(8,4) NOT NULL DEFAULT 0,

  metadata        JSONB,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_usage_project ON devfinance_ai_usage(project_id);
CREATE INDEX idx_ai_usage_company ON devfinance_ai_usage(company_id);
CREATE INDEX idx_ai_usage_module ON devfinance_ai_usage(module);

-- ─── ACTIVITY LOG ──────────────────────────────────────────────
-- Extends existing activity_log pattern for DevFinance events.

-- (Uses existing activity_log table — just new action types)
-- Actions: devfinance_project_created, qs_generated, qs_signed_off,
--          valuation_generated, valuation_signed_off, feasibility_generated,
--          affordable_generated, pack_generated, pack_exported

-- ─── ROW LEVEL SECURITY ────────────────────────────────────────

ALTER TABLE devfinance_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE devfinance_unit_mix ENABLE ROW LEVEL SECURITY;
ALTER TABLE qs_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE qs_trade_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE valuation_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE valuation_comparables ENABLE ROW LEVEL SECURITY;
ALTER TABLE valuation_unit_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE valuation_comp_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE feasibility_studies ENABLE ROW LEVEL SECURITY;
ALTER TABLE affordable_gap_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE affordable_bridging_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE professional_signoffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE devfinance_ai_usage ENABLE ROW LEVEL SECURITY;

-- Company-scoped access (same pattern as existing DealFindrs RLS)
-- Users can only see DevFinance data for their company's projects.

CREATE POLICY "Company members can view their devfinance projects"
  ON devfinance_projects FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Company members can insert devfinance projects"
  ON devfinance_projects FOR INSERT
  WITH CHECK (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Company members can update their devfinance projects"
  ON devfinance_projects FOR UPDATE
  USING (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));

-- Cascade policies via project_id for child tables
-- Using a helper function to check project ownership

CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS UUID AS $$
  SELECT company_id FROM profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE POLICY "Company access to unit mix"
  ON devfinance_unit_mix FOR ALL
  USING (project_id IN (
    SELECT id FROM devfinance_projects WHERE company_id = get_user_company_id()
  ));

CREATE POLICY "Company access to QS reports"
  ON qs_reports FOR ALL
  USING (project_id IN (
    SELECT id FROM devfinance_projects WHERE company_id = get_user_company_id()
  ));

CREATE POLICY "Company access to QS trade items"
  ON qs_trade_items FOR ALL
  USING (qs_report_id IN (
    SELECT id FROM qs_reports WHERE project_id IN (
      SELECT id FROM devfinance_projects WHERE company_id = get_user_company_id()
    )
  ));

CREATE POLICY "Company access to valuation reports"
  ON valuation_reports FOR ALL
  USING (project_id IN (
    SELECT id FROM devfinance_projects WHERE company_id = get_user_company_id()
  ));

CREATE POLICY "Company access to comparables"
  ON valuation_comparables FOR ALL
  USING (valuation_id IN (
    SELECT id FROM valuation_reports WHERE project_id IN (
      SELECT id FROM devfinance_projects WHERE company_id = get_user_company_id()
    )
  ));

CREATE POLICY "Company access to unit values"
  ON valuation_unit_values FOR ALL
  USING (valuation_id IN (
    SELECT id FROM valuation_reports WHERE project_id IN (
      SELECT id FROM devfinance_projects WHERE company_id = get_user_company_id()
    )
  ));

CREATE POLICY "Company access to comp links"
  ON valuation_comp_links FOR ALL
  USING (unit_value_id IN (
    SELECT id FROM valuation_unit_values WHERE valuation_id IN (
      SELECT id FROM valuation_reports WHERE project_id IN (
        SELECT id FROM devfinance_projects WHERE company_id = get_user_company_id()
      )
    )
  ));

CREATE POLICY "Company access to feasibility studies"
  ON feasibility_studies FOR ALL
  USING (project_id IN (
    SELECT id FROM devfinance_projects WHERE company_id = get_user_company_id()
  ));

CREATE POLICY "Company access to affordable analyses"
  ON affordable_gap_analyses FOR ALL
  USING (project_id IN (
    SELECT id FROM devfinance_projects WHERE company_id = get_user_company_id()
  ));

CREATE POLICY "Company access to bridging scenarios"
  ON affordable_bridging_scenarios FOR ALL
  USING (analysis_id IN (
    SELECT id FROM affordable_gap_analyses WHERE project_id IN (
      SELECT id FROM devfinance_projects WHERE company_id = get_user_company_id()
    )
  ));

CREATE POLICY "Company access to finance packs"
  ON finance_packs FOR ALL
  USING (project_id IN (
    SELECT id FROM devfinance_projects WHERE company_id = get_user_company_id()
  ));

CREATE POLICY "Company access to signoffs"
  ON professional_signoffs FOR ALL
  USING (
    (module_type = 'qs' AND module_id IN (
      SELECT id FROM qs_reports WHERE project_id IN (
        SELECT id FROM devfinance_projects WHERE company_id = get_user_company_id()
      )
    ))
    OR
    (module_type = 'valuation' AND module_id IN (
      SELECT id FROM valuation_reports WHERE project_id IN (
        SELECT id FROM devfinance_projects WHERE company_id = get_user_company_id()
      )
    ))
  );

CREATE POLICY "Company access to AI usage"
  ON devfinance_ai_usage FOR ALL
  USING (company_id = get_user_company_id());

-- ─── UPDATED_AT TRIGGER ───────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON devfinance_projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON qs_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON valuation_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON feasibility_studies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON affordable_gap_analyses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── MODULE STATUS SYNC TRIGGER ───────────────────────────────
-- When a child report status changes, update the parent project's
-- module status column so the dashboard stays in sync.

CREATE OR REPLACE FUNCTION sync_module_status()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_TABLE_NAME = 'qs_reports' THEN
    UPDATE devfinance_projects SET qs_status = NEW.status, updated_at = now()
    WHERE id = NEW.project_id;
  ELSIF TG_TABLE_NAME = 'valuation_reports' THEN
    UPDATE devfinance_projects SET valuation_status = NEW.status, updated_at = now()
    WHERE id = NEW.project_id;
  ELSIF TG_TABLE_NAME = 'feasibility_studies' THEN
    UPDATE devfinance_projects SET feasibility_status = NEW.status, updated_at = now()
    WHERE id = NEW.project_id;
  ELSIF TG_TABLE_NAME = 'affordable_gap_analyses' THEN
    UPDATE devfinance_projects SET affordable_status = NEW.status, updated_at = now()
    WHERE id = NEW.project_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_qs_status AFTER INSERT OR UPDATE OF status ON qs_reports
  FOR EACH ROW EXECUTE FUNCTION sync_module_status();

CREATE TRIGGER sync_valuation_status AFTER INSERT OR UPDATE OF status ON valuation_reports
  FOR EACH ROW EXECUTE FUNCTION sync_module_status();

CREATE TRIGGER sync_feasibility_status AFTER INSERT OR UPDATE OF status ON feasibility_studies
  FOR EACH ROW EXECUTE FUNCTION sync_module_status();

CREATE TRIGGER sync_affordable_status AFTER INSERT OR UPDATE OF status ON affordable_gap_analyses
  FOR EACH ROW EXECUTE FUNCTION sync_module_status();
