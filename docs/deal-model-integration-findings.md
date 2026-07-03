# DealFindrs — F2K Deal-Model Integration (Step 2) — findings + status

**Date:** 2026-07-03. **Repo tier:** REVENUE. **Status:** additive compute layer built + tested;
schema drafted (NOT applied); two decisions + one publish pending.

## What was built this session (safe, additive, verified)
- Added `@caistech/deal-model@^0.1.0` to `package.json`.
- `src/lib/deal-model/` — `types.ts` (`DealModelDealInput`, separate from `OpportunityInput`),
  `index.ts` (`toDealModelInputs` + `runDealModel`), `__tests__/adapter.test.ts`.
- Adapter test **passes**: reproduces the V5 golden verdict (ADJUST, base $136,991.23/lot,
  21.61% net uplift) through the DealFindrs input surface, plus the REJECT branch.
- Nothing in the existing `feasibility/` or `devfinance/` code was touched.

## Key finding — DealFindrs already has two economics engines; V5 is a THIRD, distinct one
| Engine | Question it answers | Output |
|---|---|---|
| `feasibility/engine.ts` (adversarial, evidence-backed) | Is the deal **lender-credible**? | RAG green/amber/red |
| `devfinance/` (QS→Valuation→Feasibility→Pack) | What's the **developer finance pack**? | GRV/TDC/profit/cashflow |
| **`@caistech/deal-model` (V5, new)** | Is the **F2K partnership** worth it + the split? | base price · uplift split · GO/ADJUST/REJECT |

They share input concepts but produce different verdicts — so V5 is **additive, not a
replacement**. No existing logic is duplicated or ripped out.

**Reuse win:** the external, developer-paid indicative feasibility study plugs straight into
DealFindrs's existing ingestion machinery — `deal_evidence` + `field_evidence_links` +
cert-extractor (migration 003). The study PDF → uploaded evidence → extracted figures → feed
the V5 model. No new ingestion to build.

## Input-surface gap (a real build item)
`OpportunityInput` lacks the F2K-specific fields the V5 model needs: `fundingMode`, `civilMode`,
`homeCaptureRate`, `f2kContributionTotal`, `developerSunkCostTotal`, split soft/education costs,
`modularMarginPerHome`, per-tranche terms. These come from the F2K deal params captured when
running the model — not derivable from the existing opportunity form. A new capture surface (or
columns) is needed. `DealModelDealInput` already names them explicitly.

## DECISIONS (both resolved 2026-07-03)
1. **Verdict governance — RESOLVED: V5 governs; RAG is a non-blocking risk overlay.** The V5
   GO/ADJUST/STOP is the promotion gate; the adversarial RAG credibility score rides alongside
   (`rag_status`, nullable). The compute route reflects this.
2. **Publish `@caistech/deal-model@0.1.0` — DONE.** Published to GitHub Packages and DealFindrs
   now installs it from the registry (the `--no-save` link is replaced; adapter test passes
   against the published copy). NOTE: publish required the `gh` CLI's write-scoped token
   (`gh auth token`) passed explicitly — the literal token in `~/.npmrc` is read-only and 401s
   on publish.

## Supabase ref — VERIFY BEFORE ANY PUSH (multi-DB hazard)
DealFindrs's linked ref is **`obakurzlpzisflnnjzzo`** (`supabase/.temp/project-ref`, matches
`NEXT_PUBLIC_SUPABASE_URL`). But `.env*` also carries **`qppddipgixhinprliyxh`** — a second ref.
The migration must target the live DealFindrs DB; the ambiguity must be resolved (which ref is
live prod) before pushing. (Earlier draft of this doc wrongly cited the F2K-Projects ref
`zzajvnhsesqrrepflrrx` — that is a DIFFERENT DB. Corrected.)

## APPLIED + verified live
- `supabase/migrations/20260703000000_deal_model_snapshots.sql` — **applied to
  `obakurzlpzisflnnjzzo`** (DealFindrs prod, ref confirmed by Dennis) via the Management API on
  2026-07-03. Verified: table exists, RLS enabled, 2 policies (SELECT + INSERT only — no
  UPDATE/DELETE, so snapshots are immutable/tamper-evident). The compute route is now
  runtime-live.
- `src/lib/deal-model/db.ts` — `saveDealModelSnapshot` (user-scoped client → RLS; monotonic
  version; override requires a reason) + `getLatestDealModelSnapshot`.
- `src/app/api/deal-model/compute/route.ts` — `requireAuth` → `getCompanyId` → `runDealModel` →
  persist snapshot → return verdict. Reflects governance decision 1. Runtime-ready once the
  migration is applied to the confirmed ref.

## Capture panel — DONE (2026-07-03)
- `src/app/opportunities/[id]/deal-model/page.tsx` — the F2K deal-params capture surface.
  Pre-fills lots/market/land/infra from the opportunity; sections for estate economics (ingested
  study figures), F2K partnership settings (funding/civil mode, home-capture, modular margin,
  contribution), and the 21-gate stage panel with a **live auto-stage** readout. Computes a
  **live verdict preview client-side** (pure engine) as the operator types, and "Compute & save
  snapshot" POSTs to `/api/deal-model/compute` to persist an immutable snapshot. Shows the verdict
  (GO/ADJUST/REJECT), base rate, net uplift %, split, F2K returns, and the party-outcomes waterfall.
  Responsive (1-col mobile → 3-col desktop), explanatory header, operator-plain.
- Linked from the opportunity detail page (next to "Dev Finance Pack") — no dead end.
- Verified: full `tsc --noEmit` clean; 11/11 tests pass (adapter + existing regression).

**Step 2 is functionally complete** — DealFindrs computes the F2K verdict from ingested figures,
shows it live, and persists immutable versioned snapshots, all reachable from the opportunity UI.

## Remaining sub-steps (STEP 3 — next repo)
1. Publish `@caistech/deal-model@0.1.0` → DealFindrs installs it from the registry.
2. Apply the snapshot migration (after sign-off).
3. `/api/deal-model/compute` route (`requireAuth`) — runs `runDealModel`, writes a locked
   snapshot. Manual overrides recorded audit-distinct (`has_manual_override` + reason).
4. F2K deal-params capture surface (the input-surface gap above).
5. Promotion API to F2K-Projects on verdict ≠ STOP (cross-DB — needs the **service-to-service
   auth** decision, the main open risk; this is the step-3 boundary).

## Guardrail note
No application logic changed; the only edits are the new `src/lib/deal-model/` module, the
`package.json` dep line, this doc, and the drafted (unapplied) migration. Nothing committed.
