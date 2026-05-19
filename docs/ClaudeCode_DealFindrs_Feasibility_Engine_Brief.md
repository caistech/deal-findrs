# Claude Code — Task Brief

## DealFindrs Adversarial Feasibility Engine

**Prepared for:** Claude Code
**Project:** DealFindrs (deal-findrs.vercel.app) — Corporate AI Solutions / F2K
**Status:** PLANNING ONLY — produce a plan for approval. Do not write code.

---

## Context

DealFindrs currently gives property-development deals a Green/Amber/Red score. The scoring is too soft — it will rate an optimistic deal green because it trusts the promoter's inputs at face value.

We need to add a **feasibility engine** that pushes back on the inputs *before* a deal is scored — the way a hard-nosed lender's credit committee would. This is to become our genuine pre-commitment feasibility tool: it must be able to catch a bad deal **before** we spend time and money chasing finance for it.

---

## What this task is

**Do NOT write code.** This task is to produce an **implementation plan for approval**. Work through the four steps below and stop at the end with a written plan. The go-ahead will be given before any implementation begins.

### Step 1 — Inspect the current repo

Before anything else, examine the existing DealFindrs codebase. Do not assume — read the actual code. Report on:

- Framework and project structure.
- How a "deal" and its inputs are currently modelled (the data model).
- How the RAG (Green/Amber/Red) verdict is currently produced, and where.
- Whether there is an existing LLM integration, and how it is called.
- How assessment criteria are currently stored and applied.

### Step 2 — Define the extra functionality required

Based on the rationalised spec below, define precisely what must be built **on top of** the current setup:

- The criteria engine (the three tests).
- The adversarial LLM reviewer.
- The evidence-tracking model (evidence upload as a hard field).
- How the engine's output feeds the existing RAG verdict.

Be specific about new modules, data-model changes, and the API / LLM call structure.

### Step 3 — Search our other repos for reusable code

Before proposing anything be built from scratch, search across our other repositories for existing code that can be reused or adapted:

- Finance / feasibility calculation logic.
- LLM-call wrappers.
- Evidence / document-upload handling.
- Data models for projects or deals.

**If you do not have access to our other repos, do not assume none exist.** List which repositories you need access to and ask for it to be granted. Likely candidates: the DealFindrs app itself, the F2K tokenisation platform, and the `f2k-projects` waitlist site — there may be shared assessment or finance-calc logic across them.

Report what is genuinely reusable and what must be built new.

### Step 4 — Produce the plan for approval

Deliver a written implementation plan covering:

- What is reused vs. built new.
- The build sequence.
- The data-model changes.
- How the three-test engine and the reviewer LLM integrate with the existing scoring.
- The regression test (see spec below).

**Stop there.** The plan will be reviewed and approved before any code is written.

---

## Rationalised Spec — The DealFindrs Adversarial Feasibility Engine

*This is one feature in two layers. The criteria engine defines the three tests a deal must pass. The adversarial reviewer is the LLM persona that judges each test the way a lender would — by demanding evidence and refusing unbacked figures. They operate as a single pipeline:*

> **promoter inputs → reviewer interrogates and re-derives → three-test engine gates → RAG verdict**

### The principle

A deal is financed when it passes three tests, and only when it passes all three. DealFindrs is a **gate, not a flattering scorer.** It must be built to disappoint an optimistic user. A clean approval should be rare.

### The three tests (the criteria engine)

**Test 1 — Skin in the game.**
Enough real cash equity — paid in, or contractually committed, and evidenced. Land-value gaps, in-kind contributions, deferred payments the promoter makes to themselves, and anticipated cost savings do **not** count as equity. The engine computes loan-to-cost on cash-only equity. If it exceeds ~80%, Test 1 fails.

**Test 2 — Provable sale value.**
Land value = the **lower** of evidenced purchase price and a current independent "as-is" valuation. Revenue / GRV must be backed by attached evidence — executed contracts, dated comparable sales, a signed offtake, an independent valuation, or (for demand) real waitlist registration data. Asserted figures with no backing document are stripped and replaced with the conservative defensible figure. **Evidence upload is a hard field, not optional.**

**Test 3 — Margin with contingency.**
A market-standard construction contingency (default 5%, higher for complex or offshore-supply builds) is force-loaded into the cost base **regardless of what the user entered**. Margin is recomputed on evidenced figures. If it does not clear the threshold, Test 3 fails.

### The adversarial reviewer (the LLM layer)

An LLM persona, system-prompted as a senior development-finance credit reviewer whose interests are **opposed** to the promoter's.

For every figure that flatters the deal — land value, GRV, sale price, margin, equity, cost saving — the reviewer must:

1. Name the specific document that would be required to defend that figure to a credit committee.
2. State whether the deal actually provides that document, or merely asserts the figure.
3. If the document is not provided, **reject the figure** and re-derive the affected metrics without it.

The reviewer is barred from softening findings, from accepting "to be confirmed / subject to valuation / indicative" as proof, and from being moved by confident phrasing, urgency, or a strong narrative. None of those service debt.

**Reviewer output:**
- An independent verdict — `NOT FUNDABLE AS PRESENTED` / `FUNDABLE ONLY IF [conditions]` / `FUNDABLE`.
- Re-derived metrics (LVR, LTC, margin, peak debt, repayment coverage) shown against the promoter's figures.
- A list of rejected inputs, each with the evidence document needed to change the verdict.
- The single question that kills the deal if the promoter cannot answer it with a document.

### RAG verdict mapping

| Verdict | Condition |
|---|---|
| **GREEN** | Passes all three tests on evidenced inputs. |
| **AMBER** | Passes two tests; the third has a *specific, evidenced, time-bound* path to passing — a real action (a document or a dollar arriving), never a re-labelling. |
| **RED** | Fails any test with no evidenced path; or a figure fails the evidence standard and the deal cannot stand on conservative substitutes. |

A deal moves RED → AMBER only when a missing **document or dollar** arrives — never when the submission is rewritten.

### Output rule: 60% LVR is computed last, never an input

When a deal genuinely passes all three tests, loan-to-value lands near 60%, and at that level a deal finds funding without difficulty. The engine derives LVR **itself**, last, from evidenced inputs after all three tests are applied. A user must never be able to set, or back-solve to, an LVR. A favourable LVR is a *result* of passing the tests — never a target.

### Mandatory regression test — non-negotiable build gate

The engine must be validated against a known-bad real deal — the **"Branscombe V6"** case. Feed it these promoter-presented inputs:

- Land value $3.6M (evidenced purchase price only $1.41M — contracts of $610k + $800k).
- GRV $25.15M; senior facility $16.2M.
- Claimed "Net Project Equity" $2.1M (only ~$500k is real cash).
- Claimed LVR 63%; claimed margin 22.2%.

A correctly built engine must return **RED**, having independently:

1. Stripped the unbacked $3.6M land value down to the evidenced $1.41M.
2. Counted only ~$500k of real cash equity.
3. Recomputed loan-to-cost in the mid-90s and margin near 6%.
4. Produced a real LVR near 88%.

**If the engine returns GREEN or AMBER on the Branscombe V6 case, it is not finished.** This regression test must pass on every build and every release. A deal-assessment tool that cannot reject our own worst deal has no value.

> Note: the current live DealFindrs demo screen shows "Branscomb Rd Development 22.2%" with a green light — this is exactly the deal that must come back RED. The demo and the engine currently contradict each other; this build resolves that.

---

*Prepared 19 May 2026 · Corporate AI Solutions / Factory2Key · Internal.*
