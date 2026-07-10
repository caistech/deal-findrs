# Planning Memory — DealFindrs deployment handoff

**Status: installed + scaffolded, NOT yet activated or wired into the feasibility narrative.**
This note tells the next DealFindrs session exactly how to finish deploying it.

## What's already done (2026-07-10)

- **`@caistech/planning-memory@^0.1.0`** added to `package.json` (installed). The published,
  shared package — the experiential (Mnemo) leg of the planning-retrieval hybrid. It recalls
  DISTILLED, jurisdiction-general planning CONCLUSIONS from a SHARED, state-keyed Mnemo scope
  (`caistech-planning-<state>`) that F2K-Checkpoint already writes to (on planner approval).
- **`src/lib/devfinance/planningMemoryEnrich.ts`** — a ready-to-call, fail-soft helper:
  `recallPlanningRisk(state, developmentType?)` → `string[]` of prior conclusions. Not yet called
  anywhere (deliberate — wiring needs the site's `state`, which this session didn't want to guess).

## What the next session must do (3 steps)

### 1. Activate the key (required — it's dormant until this is done)
Set **`MNEMO_API_KEY`** on the DealFindrs Vercel project as a **sensitive** var, **production +
preview only** (PRODUCT_STANDARDS Vercel rule). Use the SAME portfolio Mnemo key (it's in
`SayFix/.env.local` and `~/.mnemo-token`). Until this is set, `recallPlanningRisk` returns `[]` and
nothing changes — safe, just inactive. Also add it to DealFindrs' local `.env.local` to test.

### 2. Wire the recall into the feasibility flow
The natural point is the **"Planning or approval delays"** risk in
`src/lib/devfinance/agents/feasibility-agent.ts` `buildRiskMatrix()` (currently a generic
mitigation string), and/or any LLM-generated feasibility narrative. Pass the site's **state** (find
it on the `DevFinanceProject` / opportunity — likely a location/address field; derive the state if
only an address is present) and the development type into `recallPlanningRisk(state, devType)`, then
fold the returned conclusions into the mitigation / narrative as **"prior resolved analysis for
<state> (re-verify)"** — NEVER as authoritative advice (DATA_STANDARD D1/D2: this is supporting
context, not a citation; the authoritative planning source stays property-services + the RAG Code).

### 3. Verify
`caistech-planning-sa` already has SA conclusions (Checkpoint seeded it). With the key set, a quick
check:
```ts
import { recallPlanningRisk } from "@/lib/devfinance/planningMemoryEnrich";
console.log(await recallPlanningRisk("SA", "subdivision")); // expect >=1 SA conclusion
```

## Guardrails (do not violate)
- DealFindrs **only recalls** (read). The **write** (distil-on-approval) belongs to a human-approval
  loop — Checkpoint owns it. Only add a DealFindrs write if DealFindrs gains a "resolved conclusion"
  step, and then it MUST distil to a generic, PII-free rule first (I4/S4), exactly like Checkpoint's
  `rememberApprovedFinding`.
- Recalled memory is **supporting context, never a citation** (D1/D2).
- The package is the single source — do NOT fork its logic into DealFindrs (the `@caistech`-first /
  no-orphaned-consumers rule). Import from `@caistech/planning-memory`.

## Reference
- Package source + full rules: `cais-shared-services/packages/planning-memory/` +
  `SHARED_SERVICES.md` entry.
- Consumer reference implementation (recall + distil-on-approval): F2K-Checkpoint
  `src/lib/services/planningAssessment.ts` (`generateOne` recall + `rememberApprovedFinding` write).
