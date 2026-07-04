# Project Status — DealFindrs

> Auto-maintained by Claude Code. Read at session start, updated before session end.
> Last updated: 2026-07-04T00:00:00Z

## Current State
<!-- One of: ACTIVE_DEVELOPMENT | MAINTENANCE | BLOCKED | PAUSED | SHIPPED -->
**Status**: ACTIVE_DEVELOPMENT

## What Was Just Done
<!-- Updated at end of each session. Most recent first. -->
- **Estate Constraints & Yield re-focus (Phases 1–2c).** Re-focused DealFindrs on 20+ lot estate land / house-and-land, deriving the assessment from property-services data. Source of truth: `docs/estate-constraints-yield-plan.md`.
  - **Phase 1** — Full `PropertyProfile` now persisted to `property_profile` JSONB (draft + create routes); null-zoning UX (manual-lookup link + `availableZones` picker) when derive returns `zoning: null` (QLD partial-coverage).
  - **Phase 2a** — Estate Constraints & Yield buildup engine (`src/lib/estate-buildup/`), Brief UI on the new-opportunity + opportunity pages, **derived yield is authoritative** (developer/anecdotal number is not a trusted input), feasibility-study yield gate for reconciliation.
  - **Phase 2b** — Estate Team Directory (CRUD + admin page + nav), state/occupation-scoped; kickoff team auto-assembly engine + gap detection; kickoff UI + light meeting log.
  - **Phase 2c** — Planner referral, adopted from F2K-Checkpoint's Planning Review shape (`planning_assessments` / `planning_findings` / `planning_finding_events`, migration `20260704010000`). KB-cited draft findings via the shared property-services `planning-retrieve` edge fn; planner review UI (approve/edit/reject/annotate, correction pairs captured); structured resolution (zone / min-lot / lots) flows back into the buildup with trace. Latest commit `ab9df3a` on `main`.
- (earlier, 2026-05-19) Adversarial Feasibility Engine — replaces the legacy soft RAG scorer. Three-test gate, lender-persona LLM reviewer with deterministic fallback, RAG mapping, real evidence upload. Branscombe V6 regression test is the merge gate.

## What's Next
<!-- Prioritised list of pending work. Updated each session. Detail: docs/estate-constraints-yield-plan.md -->
- [x] **2c routing follow-on — in-app assignment DONE.** Planner referrals now route to the state's directory planner (`route-planner.ts`; `planning_assessments.assigned_planner_id`/`assigned_planner_name`/`planner_gap`, migration `20260704020000` applied live). Referral POST routes on creation; PATCH reassigns; UI shows the routed planner + reassign select, or an amber gap banner → `/estate-team`. 8 routing tests green.
- [x] **2c routing — email push DONE.** The refer-to-planner push is now both in-app assignment AND email. Dependency-free Resend send (`src/lib/email/send.ts`), planner notification composer (`planner-notify.ts`), fired on referral creation + on reassign (both non-fatal, logged). `planner_notified_at` (migration `20260704030000`, applied live) records the send; UI shows "emailed {date}" / "no email on file". Sender defaults to `noreply@updates.corporateaisolutions.com`. **Note: `RESEND_API_KEY` must be present in Vercel production env for prod sends (it's in `.env.local`).**
- [x] **2d professional review packs — engineer pack DONE, QS/valuer Phase-3-gated.** Per-professional template registry (`src/lib/review-packs/`) rendering the Constraints & Yield buildup to a branded PDF via `@caistech/report-generator`. The **engineer pack** renders fully now (site header → yield summary → sectioned buildup with working+source → ⛔/needs-input/referral gaps → certification block); verified end-to-end (real react-pdf → valid `%PDF` buffer). QS (cost) + valuer (GRV/absorption) are registered but `available:false` until Phase 3 — no fake numbers. Download route `GET /api/opportunities/[id]/review-pack/[kind]` (Node runtime, 409 on gated packs); `ReviewPacksPanel` on the opportunity page. `next build` clean. **⚠ NOT DEPLOYABLE until the token blocker below is cleared** (lockfile lacks `report-generator`).
- [ ] **Phase 3 (separate/later).** Feasibility / QS cost pack (Checklist 2) + GRV & absorption model (Checklist 3) into the devfinance modules + the V5 deal-model + platform demand data as absorption evidence.

## Blockers
<!-- Anything preventing progress. Include who/what is needed to unblock. -->
- ~~GitHub Packages token expired → blocked 2d deploy.~~ **RESOLVED 2026-07-04.** Installed via the `gh` CLI token (`gh auth token`; account `dennissolver`, `write:packages`) — no new PAT needed. Lockfile now resolves `@caistech/report-generator` (commit `b23055d`), so `npm ci`/Vercel build works. **Local-env note:** `NODE_AUTH_TOKEN` in the shell held a non-GitHub value (`OBm2…`, 36 chars) and `~/.npmrc`'s `ghp_` token was expired — future local `@caistech` installs need `NODE_AUTH_TOKEN=$(gh auth token)` (or update `~/.npmrc`) until those are fixed. **Vercel watch:** first 2d deploy relies on Vercel's own `@caistech` token reading `report-generator` (same org as the other packages that already deploy — should be covered).
- **`@caistech/report-generator@0.1.0` ships a malformed ESM build** (`"type":"module"` + extensionless relative imports, e.g. `from "./render"`). Handled in DealFindrs via `transpilePackages` (Next) + `server.deps.inline` (vitest). Proper fix belongs at source (emit `.js` extensions) — same class as the sayfix-embed ≤0.2.0 issue. Worth a version bump in `cais-shared-services`.
- **Planning KB coverage is WA-only** (631 chunks in property-services `planning-retrieve`). QLD (and other states) are not ingested, so QLD referrals get no KB citations and are human-planner-only until each state's planning instruments are ingested into property-services. Not a blocker for 2c routing itself (routing works regardless of KB coverage), but bounds referral quality.

## Key Decisions Made
<!-- Important architectural or product decisions, with rationale. -->
- **Yield is DERIVED, not developer-supplied (LOCKED 2026-07-04).** DealFindrs computes lot count/yield from property-services datasets; the developer's stated number is not a trusted analytical input. Feasibility-study yield is admissible only to reconcile; anecdotal numbers are captured as a note. If a developer insists on their anecdotal number over the analysis → PASS on the project.
- **Buildup, not a data-entry form (LOCKED 2026-07-04).** Every derivable figure is derived and shows its buildup (number → computed from → source dataset). Free-text is reserved for genuinely non-derivable inputs, gated (e.g. only from a shared feasibility study).
- **Planner referral reuses F2K-Checkpoint's Planning Review shape (DECIDED (a), LOCKED 2026-07-04).** Adopt `planning_assessments/findings/events` on DealFindrs' own DB now + consume the shared `planning-retrieve` KB directly; design the referral record so a later `@caistech/planning-review` extraction is a lift-out, not a rewrite. Do NOT deep-fork Checkpoint's UI/agent.
- **The kickoff team is a system artifact (LOCKED 2026-07-04).** DealFindrs auto-builds the kickoff team from the buildup (core + drive-the-numbers + triggered-by-flagged-constraints + typology-matched supplier) and flags occupations with no state-panel member as gaps. Light meeting log (attendees, accept/decline, actions/owners) recorded.
- (earlier) Engine thresholds locked: T1 LTC ≤ 0.70, T3 margin ≥ 20%, forced contingency 5%/7.5%/10% by complexity. Legacy `assessments` wiped on migration 003.

## Active Branches
<!-- Git branches with in-progress work. -->
- `main` — production; all estate Phase 1–2c work committed (latest `ab9df3a`).

## Environment Notes
<!-- Deployment URLs, env vars needed, external service dependencies. -->
- Vercel: (URL)
- Supabase: DealFindrs project (see memory `supabase_project_refs`)
- Shared property-services `planning-retrieve` + `/derive` edge fns — same `x-api-key`.

## Session Log
<!-- One line per Claude Code session. Auto-appended. -->
| Date | Duration | Summary |
|------|----------|---------|
| 2026-03-30 | ~5 min | Searched for test files from prior session — none found in project |
| 2026-07-04 | — | Estate Phases 1–2c landed (profile persist, Constraints & Yield buildup, Team Directory + kickoff, planner referral + review). Next: 2c routing follow-on. |
