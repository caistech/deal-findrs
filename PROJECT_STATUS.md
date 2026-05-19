# Project Status — DealFindrs

> Auto-maintained by Claude Code. Read at session start, updated before session end.
> Last updated: 2026-05-19T00:00:00Z

## Current State
<!-- One of: ACTIVE_DEVELOPMENT | MAINTENANCE | BLOCKED | PAUSED | SHIPPED -->
**Status**: ACTIVE_DEVELOPMENT

## What Was Just Done
<!-- Updated at end of each session. Most recent first. -->
- Built the Adversarial Feasibility Engine — replaces the legacy soft RAG scorer. Three-test gate (T1 LTC ≤ 0.70 cash equity, T2 evidenced sale value, T3 margin ≥ 20% after forced 5/7.5/10% contingency), lender-persona LLM reviewer with deterministic fallback, RAG mapping, real evidence upload to Supabase Storage. Migrations 003+004 applied to live DB; legacy assessments wiped per user authorisation. Branscombe V6 regression test (9 cases, all pass) is the merge gate.
- Brief session — user wanted to re-run a test from a prior session but no test files found in project (may have been lost or in another repo)

## What's Next
<!-- Prioritised list of pending work. Updated each session. -->
- [ ] Live-dogfood the new engine end-to-end via /opportunities/new (draft → evidence → assess → result)
- [ ] Add criteria-setup UI so per-company thresholds can be tuned (replaces `// TODO: Save criteria to Supabase`)
- [ ] Phase 2: wire @caistech/cert-extractor for auto-extracting purchase price / valuation amount from uploaded PDFs
- [ ] Phase 2: wire @caistech/coordination-sdk for the Open Obligations panel (currently derived inline from failing tests)
- [ ] Phase 2: wire @caistech/nudge-core for chasing promoters on missing evidence

## Blockers
<!-- Anything preventing progress. Include who/what is needed to unblock. -->
- (none)

## Key Decisions Made
<!-- Important architectural or product decisions, with rationale. -->
- Engine thresholds locked: T1 LTC ≤ 0.70, T3 margin ≥ 20%, T3 forced contingency 5%/7.5%/10% by build complexity. Confirmed by user 2026-05-19.
- All legacy `assessments` rows wiped and `opportunities.rag_status` nulled on migration 003 — no `engine_version='legacy_v1'` discriminator needed. Confirmed by user 2026-05-19.
- Reviewer LLM (DataWizz) is mandatory in the pipeline but the engine has a deterministic fallback that never returns FUNDABLE when any test fails — this makes Branscombe V6 testable without DATAWIZZ creds.

## Active Branches
<!-- Git branches with in-progress work. -->
- `main` — production

## Environment Notes
<!-- Deployment URLs, env vars needed, external service dependencies. -->
- Vercel: (URL)
- Supabase: (project ID)

## Session Log
<!-- One line per Claude Code session. Auto-appended. -->
| Date | Duration | Summary |
|------|----------|---------|
| 2026-03-30 | ~5 min | Searched for test files from prior session — none found in project |
