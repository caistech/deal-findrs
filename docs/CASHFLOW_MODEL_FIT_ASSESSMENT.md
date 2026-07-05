# Fit Assessment — Staged Cashflow Model (F2K) vs the DealFindrs codebase

> Review-and-propose pass for `ClaudeCode_Brief_Model_Fit_Review.md`. Covers the
> **staged cashflow model** (`Seafields_Cashflow_Model_V1.xlsx`) considered alongside the
> **deal-economics model** it partners (`Seafields_Estate_Deal_Model_V7.xlsx`).
> Prepared 2026-07-05. **No application code was changed in the analysis for this document;**
> the implementation that follows it is the sanctioned Step 2.

---

## 0. Headline

The deal-economics half of the brief is **already in code** — `@caistech/deal-model@0.2.0`
(`computeDeal`, `DEFAULT_CONSTANTS`, stage gate), consumed by DealFindrs through the thin
adapter at `src/lib/deal-model/`, persisted as immutable snapshots, and V7-conformance-tested
against the exact Seafields workbook (base $137,817, REJECT at $155K). So the brief's proposed
`deal-calc` package with `computeBase / computeUpliftSplit / evaluateHurdle` is **not a greenfield
build — three of its four functions exist.**

The **only missing piece is `runCashflow()`.** Recommendation: **add it to the existing
`@caistech/deal-model` package (0.2.0 → 0.3.0)** rather than stand up a new one, and consume it in
DealFindrs through the identical adapter pattern already in place for the deal verdict. Reasons in §3.

---

## 1. Repo map (where financial logic lives)

| Repo | Purpose | Stack | Where the logic lives |
|---|---|---|---|
| **DealFindrs** | Property-development opportunity assessment SaaS; owns the deal verdict + dev-finance packs | Next.js 14 (App Router), Supabase, Vercel | `src/lib/deal-model/` (adapter over the shared engine), `src/lib/feasibility/` (adversarial RAG), `src/lib/devfinance/` (QS→valuation→feasibility→finance pack), `src/lib/estate-cost/` + `src/lib/estate-buildup/` (per-lot cost build-up), `src/lib/review-packs/` (QS/valuation certification) |
| **`@caistech/deal-model`** (in `cais-shared-services/packages/`) | The canonical, pure Generic Estate Deal Model V7 | TypeScript, ESM, vitest | `src/model.ts` (`computeDeal`), `src/stage-gate.ts`, `src/types.ts`; golden conformance in `test/golden.test.ts` (V5 **and** V7 samples) |
| **F2K-Checkpoint / F2K-Projects** | Downstream consumers that **read** the locked deal snapshot (never recompute) | Next.js / Supabase | read-side only; not in scope for the calc |

**Single-source-of-truth contract (already established, 2026-07-03):** DealFindrs computes with
the engine and **owns** the GO/ADJUST/REJECT verdict; the adversarial RAG rides alongside as a
non-blocking credibility overlay; downstream repos read the snapshot. The cashflow layer must
slot into this same contract.

---

## 2. Existing financial logic — what's present, partial, absent

Searched for `base rate`, `uplift`, `hurdle`, `stage`, `cashflow`, `drawdown`, `repayment`,
`peak debt`, `waterfall`, `contribution`, `IRR`.

| Concept | Status | Location |
|---|---|---|
| Base rate (finance-inclusive, PM-loaded) | **Present** | `@caistech/deal-model` `computeDeal` → `baseRate.baseRatePerLot` |
| Uplift split by entry stage | **Present** | same → `split.*` (Conception 60/40, Part-dev 50/50, De-risked 40/60) |
| Hurdle GO/ADJUST/REJECT | **Present** | same → `hurdle` (reject <20%, GO ≥35%, dev-thin floor) |
| Stage gate (evidence ticks + override) | **Present** | `@caistech/deal-model` `stage-gate.ts` |
| Per-lot cost build-up (civil/soft/education) | **Present** | `src/lib/estate-cost/`, `src/lib/estate-buildup/` + the deal-model components |
| Adversarial feasibility / RAG | **Present (different question)** | `src/lib/feasibility/` — lender credibility, not cashflow |
| **Staged cashflow / funder drawdown** | **ABSENT** | — nothing computes drawdowns, peak exposure, funder interest, or self-funding crossover |
| **Peak funder exposure / funder payoff stage** | **ABSENT** | — |
| IRR / waterfall | **ABSENT** | not required by either model as written |

**Conclusion:** the cashflow layer is a genuine gap, not a duplication. Nothing in the codebase
currently answers *"how much money, when, and when does the funder get out?"*

---

## 3. Recommended home: extend `@caistech/deal-model`, not a new package

**Verdict: add `runCashflow()` + cashflow types to `@caistech/deal-model` (bump to 0.3.0).**

Rationale:

1. **Same domain, shared inputs.** The cashflow model consumes contributions, works-to-title,
   lots, stages, sale price, agent %, and interest rate — the same variables the deal model
   already types. Splitting them into two packages forks the constants (agent %, 12% rate) and
   re-opens the double-count risk the brief flags as its top guardrail.
2. **The brief wants them to partner.** "Considered alongside the deal-economics model it partners."
   One package = one place to enforce *"contributions are recovered once in the base; the 75/25 is
   a timing layer only."*
3. **The consumption pattern already exists.** DealFindrs' `src/lib/deal-model/index.ts` is a thin,
   explicit adapter (`toDealModelInputs` → `runDealModel`). A `runCashflow` adapter is a 20-line
   mirror of it. No new architecture.
4. **Purity is preserved.** `runCashflow` is pure (no I/O), like `computeDeal`. The route layer
   persists it as a snapshot exactly as the deal verdict is persisted today.

**Layering:** pure calc in the package → thin adapter in `src/lib/deal-model/` → API route persists
a snapshot → UI reads it. Identical to the deal-model flow. The calc never touches Supabase.

---

## 4. Proposed module shape

Mirrors the workbook cell-for-cell (the brief: *"Excel is the spec"*), but **estate-agnostic over
N stages** — the Excel sheet is hard-wired to a 6-column S1–S6 grid and only holds at exactly 5
build stages (see §6, issue 1). The code loops N stages, which the frozen grid can't.

```ts
// @caistech/deal-model — new: src/cashflow.ts
export function runCashflow(inputs: CashflowInputs): CashflowResult
```

`CashflowInputs` — the 9 yellow workbook inputs (interest rate + selling-cost % default to the
deal model's `DEFAULT_CONSTANTS`, so the two models can't drift on the shared knobs):

| Field | Workbook | Note |
|---|---|---|
| `totalContributions` | C5 | founders + F2K, cash + kind — **broader than the deal model's `f2kContributionTotal`** (see §5) |
| `contributorPayoutPct` | C6 | 0.75 — the timing knob |
| `totalWorksToTitle` | C7 | should reconcile to Σ deal-model per-lot cost lines × lots (§5) |
| `saleableLots` | C8 | = deal model `lots` |
| `buildStages` | C9 | N — the parameter the Excel grid can't vary |
| `salePricePerLot` | C10 | = deal model `marketPricePerLot` |
| `sellingCostPct?` | C11 | default `DEFAULT_CONSTANTS.agentCommissionPct` (0.035) |
| `interestRate?` | C12 | default 0.12 (flat, matches `DEFAULT_EXTERNAL_QUOTES`) |
| `stageDurationMonths` | C13 | 9 |

`CashflowResult` — the derived block, a per-stage array (opening/payout/works/interest/revenue/
closing/surplus/gross-exposure), and the KEY OUTPUTS (peak exposure, total interest, funder balance
at final stage, retained debt, total surplus, **net uplift after retained debt** — the split the
sheet only labels, see §6 issue 2 — and the self-funding crossover as both a label and a stage index).

**DealFindrs plug-in:**
- `src/lib/deal-model/index.ts` — add `toCashflowInputs()` + `runCashflow` re-export (thin adapter).
- `src/lib/deal-model/types.ts` — add a `CashflowDealInput` face if the estate's stored fields need
  remapping (staging fields are new — see §5).
- Route — either extend `POST /api/deal-model/compute` to also emit a cashflow block, or add
  `POST /api/deal-model/cashflow`. Persist alongside the deal snapshot.

---

## 5. Input → data-source mapping (and gaps)

| Model input | Platform source | Status |
|---|---|---|
| Sale price / lot (C10) | opportunity `marketPricePerLot` | ✅ exists |
| Saleable lots (C8) | opportunity `lots` | ✅ exists |
| Selling cost % (C11) | deal-model `DEFAULT_CONSTANTS.agentCommissionPct` | ✅ reuse — do not re-declare |
| Interest rate (C12) | deal-model flat-12% quote | ✅ reuse |
| **Total contributions (C5)** | `Seafields_Contribution_Disclosure_Schedule.xlsx` | ⚠️ **reconcile.** Cashflow C5 = **$3.5M (founders + F2K)**; the deal model's `f2kContributionTotal` = **$320K (F2K's slice only)**. These are different figures with the same name. Single-source the contribution schedule and derive both, or the "recovered once" contract is unauditable. |
| **Works to title (C7)** | QS / `estate-cost` + `estate-buildup` | ⚠️ **reconcile.** Cashflow wants one $14M total; the deal model holds per-lot lines (infra 80k + soft 6k + education 4k + civil-eng-fee). Derive `works = Σ per-lot lines × lots` so QS numbers can't diverge between the two models. (At Seafields these already tie to ≈$14M.) |
| **Build stages (C9)** | Porter / QS staging plan | ❌ **not stored anywhere** — genuine gap |
| **Stage duration months (C13)** | Porter / QS staging plan | ❌ **not stored anywhere** — genuine gap |
| Contributor pay-out % (C6) | F2K partnership policy | ❌ not stored; a policy constant (default 0.75) |

**The two hard gaps** (`buildStages`, `stageDurationMonths`) are exactly what the workbook note
says *"firm up on Porter + QS."* Until an estate carries a staging plan, these are operator inputs
with sane defaults (5 stages × 9 months). They belong on the estate record next to the QS pack.

---

## 6. Issues found in the model itself (must become explicit in code)

Traced every formula; the sheet's cached outputs reproduce the brief's fixtures (peak
**$9,497,442**, interest **$3,415,250**, crossover **by S2**, funder repaid by the S6 tail).
Five things the Excel does implicitly that code must make explicit:

1. **Not actually estate-agnostic.** `Build stages` (C9) reads as an input, but rows 24–31 are a
   fixed 6-column grid. Change C9 and the grid silently misaligns (works still spread over S1–S5,
   settlements over S2–S6). The template only holds at N=5. **This is the strongest argument for
   code** — `runCashflow` loops N build stages + a tail settlement stage.
2. **The retained 25% ($875K) is displayed but never waterfalled.** The funder draws only the 75%
   ($2.625M); the 25% is cleared from settlement surplus later. But C38 "total surplus released"
   ($1.648M) is **gross** — the split *retained-debt-first → uplift* is only the row-31 label, not a
   computed line. Code must emit `netUpliftAfterRetainedDebt = totalSurplus − retainedDebt`
   (≈ $773K) as a real output.
3. **Interest is a conservative simplification.** Accrues on `(opening + payout + works) × 12% ×
   9/12` for the whole stage, ignoring mid-stage settlements → overstates interest → safe for a
   funder underwrite. It does correctly capitalise (opening carries prior interest). Label it
   "stage-simple capitalised interest"; mid-stage repayment timing is a future knob.
4. **Divisibility is assumed.** 145/5 = 29 and 14M/5 divide cleanly. Real estates won't. The engine
   stays faithful to Excel (raw division) for golden conformance; document that integer-lot /
   remainder handling (last stage takes the balance) is a deliberate later knob.
5. **Peak = max intra-stage gross before that stage's settlement.** Sensible, but state it — it's
   the headline the funder underwrites.

**Double-count check — clean.** Funder draws 75% now + 25% cleared from surplus = 100% of
contributions recovered once, and the deal model recovers contributions in the base separately.
No collision **provided the contributions figure is single-sourced** (§5, first ⚠️).

---

## 7. Sequenced implementation plan

1. **Package (`@caistech/deal-model` 0.3.0)** — add `src/cashflow.ts` (`runCashflow` + types),
   export from `index.ts`, seed `test/cashflow-golden.test.ts` from the extracted fixtures
   (peak 9,497,442.5; interest 3,415,250.29; surplus 1,648,124.71; each stage's closing balance;
   crossover "by S2"). Bump version. **← done in Step 2 below.**
2. **Publish + reinstall** — build, publish to GitHub Packages, bump the DealFindrs dep 0.2.0 →
   0.3.0, `npm install`. (Registry publish is the activation step — see the republish-hazard memory.)
3. **DealFindrs adapter** — `toCashflowInputs()` + re-export in `src/lib/deal-model/`, deriving
   `totalWorks` and `totalContributions` from the estate's stored cost lines + contribution schedule
   (reconciled per §5), with staging as operator inputs (defaults 5 × 9).
4. **Persist + surface** — add a cashflow block to the compute route (or a sibling route) and a
   funder-exposure panel on the deal-model page (peak, interest, crossover, per-stage table).
5. **Store staging** — add `build_stages` + `stage_duration_months` to the estate record so Porter/QS
   numbers drop into named fields (§5 gaps closed).

Steps 3–5 are a **later** task per the brief. Step 1 follows immediately below.
