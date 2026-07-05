# Claude Code Brief — Audit Report Generators Against Industry Standards

## Why this exists

The platform already has report-generation builds for three development-finance outputs: a **feasibility (Deal Finder)** tool, a **QS cost-pack Checkpoint**, and a **valuation Checkpoint**. Each must produce output that maps to a real industry standard, because these reports are the substance a funder relies on. This brief is an **audit**, not a build: inspect what's already generating in the repo, compare it against the canonical checklist for each report type (see the companion `f2k-report-checklists-standard-anchored.md`), and report the gaps. Do **not** silently rewrite generators — produce a gap report and Jira-ready tickets so the changes are reviewed.

## Inspect first — do not assume the stack

Before checking anything against the standard:

1. **Locate the report generators.** Find where feasibility / QS / valuation report output is assembled (route handlers, server actions, PDF/HTML builders, template files, or client components). Confirm which of the three actually exist and which are stubs.
2. **Find the data model.** Identify the estate-scoped Supabase tables backing each generator (expected shapes: `feasibility_assessments`, `qs_cost_packs`, `valuation_checkpoints`, or whatever exists). Note actual column names — don't assume.
3. **Find the calculation layer.** Locate where the financial outputs are computed (TDC, IRR, MDC, RLV, peak debt, GRV, DCF, net realisation). Confirm whether these are computed in-app, pulled from the V24 model, or absent.
4. **Check reuse.** See how the existing funder-ladder (L0–L6) and agent-portal patterns are structured, so any recommendations stay consistent with them rather than introducing a new pattern.

Two reference reports are attached to this workstream as ground truth for structure and output: the **AEC Group feasibility study** (full section structure + RLV method) and the **Feastudy subdivision model** (the complete computed-output set, including its Valuer's-Style P&L). Treat those as the target shape.

## What to verify, per generator

Use the companion checklist file as the line-by-line spec. At minimum confirm each generator produces:

**Deal Finder (Feasibility)** — TDC (incl. soft costs + contingency), Margin on Development Cost, IRR, Residual Land Value (target-margin **and** NPV), peak debt + the month it occurs, monthly cashflow / cumulative net debt, per-lot and per-m² metrics, GST on margin-scheme basis, and the six sensitivity tables (land cost, construction cost, construction period, sell-on income, sell-on period, interest rate). Confirm the report body carries site constraints, planning, yield, market/sales evidence, and a hurdle pass/fail.

**QS Checkpoint** — TDC and construction-cost verification on a **GST-exclusive** basis, cost-to-complete, drawdown S-curve, PI-insurance schedule, and the valuer-cost reconciliation field. Confirm the ⛔ certification/sign-off fields exist and are marked as external, not auto-populated.

**Valuation Checkpoint** — direct-comparison **GRV**, hypothetical-development/residual, DCF sell-down over an absorption period, "in one line" vs aggregate, and net realisation. Confirm absorption rate is an explicit input that the demand data can feed. Confirm the ⛔ API certification field exists as external.

## Cross-cutting checks (flag any failure)

1. **GST direction is correct per report.** Feasibility and valuation = GST-inclusive, margin scheme. QS = GST-exclusive. A generator that applies the wrong direction is a defect.
2. **Cost/value tie-out.** The construction cost in the feasibility, the QS TDC, and the build cost assumed in the valuation must reference one reconciled figure. If the generators compute these independently with no tie-out, flag it.
3. **Hard-stop fields are external.** Every ⛔ item (geotech, stamped stormwater/civil, QS certification, API valuation) must be a stored/flagged external input — never a value the generator fabricates.
4. **Estate-scoping.** Every generator reads/writes estate-scoped rows; no cross-estate leakage of pricing/cost data.

## Deliverable from Claude Code

For each of the three generators, produce:
- A **gap report**: present ✓ / partial / missing against the checklist, with file references.
- **Jira-ready tickets** (F2KSFLDS style, handoff-level detail) for each gap — one ticket per fix, with the affected file/table and the standard section it fails.

Stop and surface the gap report before making any code changes.
