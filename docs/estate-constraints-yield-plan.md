# DealFindrs → Estate Constraints & Yield assessment (plan)

**Date:** 2026-07-04. **Driver:** re-focus DealFindrs on **20+ lot estate land / house-and-land**,
feeding the property-services derived data into the evaluation. Source of truth for what the
assessment must cover: `f2k-preliminary-assessment-checklists.md` (Checklist 1 — Engineering
Constraints & Yield Brief). Feasibility/QS/valuation (Checklists 2–3) are a **separate, later**
workstream.

## Governing principle (LOCKED 2026-07-04) — a buildup of analysis, not a data-entry form
DealFindrs **derives** every figure that can be derived (lot count/yield, land size, min-lot-size,
net developable area, constraints, overlays) from the source datasets, and shows the **buildup**
that reached each number — number → computed from → source dataset. **Free-text entry is NOT used
for derivable data.** It is reserved for genuinely non-derivable inputs, and even those are gated
(e.g. a figure is only admissible if it comes from a shared feasibility study, not anecdote). This
is what makes the output defensible / funder-quality, and is why the current free-text
"New Opportunity → Property" form is the wrong shape for an estate assessment. Lot numbers are the
canonical example (see yield policy below); the same rule applies to every derivable field.

## Phase 1 — DONE (this session, uncommitted, tsc clean)
1. **Full `PropertyProfile` now persisted.** `POST /api/opportunities/draft` and
   `POST /api/opportunities` accept `propertyProfile` and write it to the existing
   `property_profile` JSONB column; the new-opportunity flow sends `property.profile` in the draft
   save. Previously the rich derive result (terrain, overlays, zoning detail, subdivision analysis,
   metadata) was fetched then dropped.
2. **Null-zoning UX.** When `derive` returns `zoning: null` (partial LGA coverage, e.g. Underwood/
   Logan QLD), the site-intelligence panel now shows the `zoningManualLookup` link + an
   `availableZones` picker instead of a blank field.

## Phase 2 — the Estate Constraints & Yield Brief (FOR REVIEW — not yet built)

### The mapping (property-services `derive` → Checklist 1)
| Checklist 1 section | Auto-populated from derive | Gap → treatment |
|---|---|---|
| A. Tenure & title | lot #, plan #, parcel ID | easements/covenants → **needs-input** flag |
| B. Planning | zoning (code, min-lot, height, setbacks, permitted uses, subdivision-permitted) + overlays (flood, BAL, heritage, vegetation) | mostly covered |
| C. Topography & earthworks | terrain (elevation, slope %, fall, buildability) | cut/fill detail → **⛔ engineer** |
| E. Ground & environment | env/vegetation overlays + BAL | contaminated-land/ASS → **needs-input** |
| F. Concept & yield | subdivision (Torrens max-lots, lot-size-each, strata, recommendations, warnings) | staging detail |
| D. Services · G. Cost | — | services (BYDA) → needs-input; civil cost → Checklist 2 / deal-model |
| H. Hard stops | — | geotech, stormwater, stamped design → **⛔ flag, don't compute** |

### Proposed surface
A **"Constraints & Yield Brief"** panel on the opportunity (and in the assessment), rendered from
the persisted `property_profile`, laid out as Checklist 1 sections. Each row is one of:
`derived` (green, from data) · `needs-input` (amber, operator supplies) · `⛔ formal` (red, requires
the professional — never auto-satisfied). Output = the internal go/no-go brief the checklist describes.

### How derived data feeds the go/no-go (proposed rules)
- **Overlays → risk factors.** Heritage → heritage risk; environment/vegetation → environmental
  risk; flood/BAL-in-overlay → new flood/bushfire flags. (Extends today's heritage/env mapping.)
- **Terrain buildability/slope → flags + a civil-cost signal.** e.g. slope > ~15% or
  buildability "difficult" → an earthworks/retaining attention item (cost feeds Checklist 2 later).
- **Yield is DERIVED, not developer-supplied (LOCKED 2026-07-04).** DealFindrs computes the lot
  count / yield from the property-services datasets (subdivision analysis: zoning min-lot-size × net
  developable area). That derived number is what the evaluation runs on. The developer's stated lot
  count is NOT a trusted analytical input. Decision tree:
  - **Developer has a feasibility study** → capture its yield → compare to derived → if they disagree,
    **REVIEW for discrepancies** (reconcile; their study may reflect concept plans/constraints the
    desktop derive missed, or our data may catch optimism in theirs).
  - **Anecdotal number only** → ignore it, use derived. If the developer insists on their anecdotal
    number over our analysis and won't move → **PASS on the project** (no-go).
  - **No number** → use derived.
  - **Derived yield unavailable** (zoning null / no LGA coverage) → the field goes to the **planner
    referral** (below), not a dead-end. Null-zoning is ON THE CRITICAL PATH, not cosmetic. The
    Phase-1 manual-lookup + availableZones picker is a fast-path the planner (or operator) can use
    within that resolution; the automated referral is the primary mechanism.

  Build consequences: (a) "Number of Lots" becomes a **derived, our-analysis** field — not a free
  input that drives the evaluation; (b) add a **"feasibility study available?"** gate — only then is
  a developer/study yield admissible (to reconcile); anecdotal numbers are captured as a note only;
  (c) the assessment always runs on derived (or the reconciled study figure).
- **Hard stops present? → verdict is "conditional".** Missing ⛔ items (geotech, stormwater,
  stamped design, signed feasibility) cap the verdict at CONDITIONAL/AMBER — a GO is only clean once
  the formal professional inputs exist. Matches the checklist's "you build the number, they certify."
- **20+ estate gate.** If num_lots < 20, surface that this is below the estate threshold F2K
  targets (informational, not a hard block — house-and-land on fewer lots may still qualify).

### Open decisions for you
1. Yield-conflict handling — default above is **flag + use derived**; alternatives were hard-cap or
   developer-claim-wins.
2. Whether the Constraints & Yield Brief **replaces** the current RAG assessment framing for estates,
   or sits **alongside** it (my lean: alongside — RAG stays the financial-credibility lens; the Brief
   is the planning/engineering lens; both feed the go/no-go).
3. Which gaps become mandatory `needs-input` before a GO vs. purely advisory.

## Unresolvable data → automated PLANNER REFERRAL (LOCKED 2026-07-04)
When the automated derive can't resolve a field (e.g. QLD null-zoning → no min-lot → no yield),
DealFindrs fires an **automated refer-to-planner push** rather than blocking or faking. A
**state-scoped planner panel** (a human planning expert per state) resolves it; the resolved value
flows back into the buildup **with its trace** (*source: planner referral #X, resolved by <planner>*).

**Reuse, don't fork.** This is the same capability as **F2K-Checkpoint's Planning Review** feature
(human-in-the-loop planner board: AI drafts KB-grounded findings, planner approves/edits/rejects/
annotates) drawing on the **property-services WA Planning shared KB** (`planning-retrieve` edge fn).
DealFindrs should reuse this, not fork it. **Investigation done 2026-07-04 — findings + reuse design below.**

### Investigation findings (Checkpoint Planning Review + property-services KB)
- **Checkpoint's planner review** is three tables: `planning_assessments` (site referral: tenant/
  project, `site_label`, `site_context` JSONB, status draft→in_review→approved), `planning_findings`
  (AI-drafted, KB-**cited** findings by `dimension` = zoning_use | density_yield | approval_pathway |
  constraints; `needs_human` flag = "not covered by KB / needs local judgment"; planner's `current_text`
  + `reviewer_note`), and `planning_finding_events` (the **ai_value → human_value correction pairs** =
  captured methodology). UI: `PlanningReviewBoard.tsx` + `ZoneEditor.tsx` (**planner-set-zone already
  exists**). Drafting via a Mastra `planning-advisor` agent.
- **The KB is already a shared service** in property-services: the `planning-retrieve` edge fn
  (`POST {question, filter_class/level/status, state, lga} → {hits[]}`, x-api-key auth — the SAME key
  DealFindrs uses for `/derive`). Checkpoint's `planningKnowledgeBase.ts` is a thin client with a "do
  NOT cross" boundary. **It is state-aware and logs an uncovered state as a Planner gap.** Coverage =
  **WA only** (631 chunks); **QLD not ingested** → Underwood-type sites get no KB grounding until a QLD
  planning KB is built in property-services.

### Reuse design (recommended)
1. **Knowledge layer → CONSUME the shared `planning-retrieve` edge fn (no fork).** DealFindrs calls it
   with the x-api-key it already has, passing `state`/`lga`. WA → grounded; QLD → no hits + gap signal.
2. **Planner-review workflow → ADOPT the `planning_assessments/findings/events` shape + flag
   `@caistech/planning-review` EXTRACTION.** DealFindrs creates a referral (`needs_human` from derive:
   null-zoning, unresolvable yield) with `site_context` = derive result + address + state; findings
   drafted from derive + KB; planner reviews (approve/edit/reject/annotate, correction pairs captured);
   approved zone/yield flows back into the buildup **with trace**. 2nd consumer of Checkpoint's feature
   → the fork-check "2nd occurrence = extract" trigger. Near-term: adopt the schema on DealFindrs' own
   DB + consume the shared KB; extract to `@caistech/planning-review` to consolidate later.
3. **NEW (not in Checkpoint): state planner-panel routing + team directory.** Checkpoint's review is
   tenant/project-scoped with no per-state planner routing. DealFindrs adds the state team directory and
   routes each referral to that state's planner panel — the layer on top of the reused finding-review.
4. **Coverage dependency:** the planning KB is WA-only. QLD (and other states) need their planning
   instruments ingested into property-services (mirrors the WA 631-chunk ingest) before referrals get KB
   citations; until then QLD referrals are **human-planner-only** (judgment without KB grounding).

**Reuse strategy — DECIDED (a), LOCKED 2026-07-04.** Adopt the `planning_assessments/findings/events`
schema in DealFindrs now and refine the planner referral + review there; consume the shared
`planning-retrieve` KB directly. Maturation path: **DealFindrs-local now → possibly link cross-repo to
Checkpoint's board once proven → extract to `@caistech/planning-review` once refined** (two live
consumers justify the extraction). Do NOT deep-fork Checkpoint's UI/agent; adopt the schema + the shared
KB, keep the correction-pair capture, and design the referral record so a later `@caistech` extraction is
a lift-out, not a rewrite.

## Project kickoff + professional review packs (LOCKED 2026-07-04)
Every estate runs **(a) derive what we can → (b) a project kickoff** with the humans who validate/
resolve what we couldn't derive and commit to the project.

**The derive GENERATES the invite list.** Each flagged constraint/gap implies a professional, so the
Constraints & Yield buildup outputs a **"recommended kickoff attendees"** list alongside the go/no-go.
- **Core (always):** client, F2K, town planner, selling agent(s), modular supplier (Unison; F2K's
  panel e.g. i-Homes — F2K owns the list).
- **Drive the numbers (should attend):** civil engineer, surveyor, QS, valuer, funder/broker,
  property lawyer/conveyancer.
- **Triggered (only if the derive flags it):** bushfire (BAL overlay), environmental (waterway/veg/
  contamination), geotech (slope), traffic, heritage, servicing authority (headworks), council
  pre-lodgement, accountant (GST/structuring). Civil-JV mode → the civil contractor is a *party*.

**The buildup IS each professional's review pack.** The internally-generated feasibility (per domain
slice) is handed to the professional so they **review/certify/refine, not rebuild** — the checklist's
core value (compresses cost + turnaround). Engineer → constraints/yield/terrain/services + ⛔ items;
QS → cost buildup + benchmarks; valuer → GRV/absorption + comparable-evidence + platform demand.
Reviewable-by-a-professional is the forcing function that keeps the buildup honest (every number
carries its working + source). Export via the existing `@caistech/report-generator` / IM path — a
new template per professional, not new plumbing. Certified outputs → the **bankable** stage
(Checklist 2/3 = deal-model snapshot v2). The kickoff is where indicative starts becoming bankable.

**The kickoff team is a SYSTEM ARTIFACT (LOCKED 2026-07-04).** DealFindrs auto-builds the kickoff
team as part of the project buildup and flags where the panel has gaps.

**State Team Directory (new feature).** A "Team" function in DealFindrs, scoped by state:
- Add members by **occupation** (planner, civil engineer, surveyor, QS, valuer, bushfire,
  environmental, geotech, traffic, heritage, property lawyer, funder/broker, modular supplier,
  civil contractor, selling agent…), the **state(s)** they cover, contact.
- **Modular suppliers carry typology tags** (townhouse / multi-storey / house-and-land / apartments).
- Precedent: F2K-Projects `/admin/advisors` directory pattern — generalise it to all occupations,
  state-scoped, with auto-nomination.

**Auto-assembly + gap detection.** The buildup determines required occupations = core + drive-the-
numbers + triggered-by-flagged-constraints + **typology-matched supplier** (Unison is the reference
point; supplier = match(typology, state)). The system nominates matching directory members scoped to
the project's state, and **flags any required occupation with no state-panel member as a gap** (tells
F2K where to build out each state's panel).

**The per-state planner panel is the planner slice of this directory** — planners are members like
any other, and additionally the recipients of the automated referrals for unresolvable data. One
directory + one nomination engine; planner is the special case that also gets referral pushes.

**Kickoff record depth (LOCKED 2026-07-04): light meeting log = YES.** Beyond the auto-assembled team
+ gap flags + review packs, the kickoff artifact records a light meeting log — attendees, their
acceptance/decline, and actions/owners — so the kickoff is a tracked record, not just a recommendation.

## Phase 3 — Checklist 2 (feasibility/QS cost) + Checklist 3 (GRV & absorption) — GROUNDED PLAN (2026-07-04)

### Ground truth (from a three-agent code survey)
Three systems share only an opportunity id: **estate-buildup** (lot-based, physical, derived yield;
knows no money) → **review-packs** (engineer live; QS/valuer gated `available:false`, context has NO
cost/GRV field); **devfinance** (mature but **per-dwelling** — QS cost buildup, GRV/valuation with
comparables, feasibility; absorption is only a scalar `absorptionRateMonths` heuristic
`max(6, ceil(units/3))`); **deal-model V5** (**lot-based** verdict GO/ADJUST/REJECT + uplift split +
locked snapshot + promotion to F2K-Projects; inputs from a manual form pre-filled off stale
`num_lots`/`avg_sale_price`, NOT the estate yield). Platform-demand `waitlist_register` data lives in
`src/lib/feasibility/` (adversarial engine), unconnected to absorption. Real Domain comparables
backend shipped 2026-05-27 but DealFindrs valuation wiring is still pending (uses AI-synthetic comps).
**Net: Phase 3 is WIRE + evidence-harden, not rebuild.**

### Decisions LOCKED 2026-07-04
- **Finance home = the lot-based deal-model (Q1 → A).** Deal-model is the authoritative economics +
  verdict + promotion surface. Reuse devfinance's cost-rate / GRV comp-weighting / absorption logic as
  computation libraries via a **thin lot-level adapter**; the review packs pull from that. Do NOT bend
  the per-dwelling devfinance model onto per-lot land economics, and do NOT run two disagreeing verdict
  surfaces.
- **House-and-land is a LAYERABLE per-lot construction component (not now, but never precluded).**
  Target is 100% H&L; expect 30–50% capture. The deal-model already carries `homeCaptureRate`
  (the capture %) + `modularMarginPerHome`, so H&L economics are already modelled at the verdict level.
  The lot-level QS adapter must carry an **optional per-lot home-construction line** (reuse devfinance's
  per-dwelling cost engine for the captured lots) that we switch on when H&L is in scope. Per-lot land
  subdivision is the base; H&L layers on top.
- **Scope of THIS push = 3a + 3b (Q2 → A).** Ship the yield→finance bridge and the QS review pack off a
  lot-level cost buildup first (concrete, certifiable, de-risks the heavy absorption model). GRV + the
  demand-backed absorption model + the valuer pack come next (3c).
- **Evidence bar (non-negotiable, from the review-pack purpose):** a pack must be certifiable by the
  professional — so 3c uses REAL Domain comps (not AI-synthetic) and a demand-backed absorption curve
  (not the scalar guess). The whole point is review/certify, not rebuild.

### Sub-phases
- **3a — Bridge (THIS push).** Wire the estate buildup's derived **`authoritativeLots`** into the
  deal-model input pre-fill (replace stale `num_lots`), with a trace note + an un-derivable→planner
  referral flag. Emit the declared-but-unused `cost` gap from the buildup (→ points at the QS pack).
- **3b — QS cost pack / Checklist 2 (THIS push).** A **lot-level cost buildup** (land + civil/infra +
  soft + contingency per lot; optional H&L home-construction line per captured lot) reusing devfinance's
  cost engine via the lot adapter → surface into `ReviewPackContext` → flip the **QS review pack**
  `available()` → feeds the deal-model cost components (`infraPerLot`/`softCostsPerLot`/etc.).
- **3c — GRV & absorption / Checklist 3 (DONE core, 2026-07-04; D + live-AVM are follow-ons).** GRV/lot from real Domain comps + a demand-backed
  absorption curve from `waitlist_register` platform-demand → flip the **valuer review pack** → feeds
  deal-model `marketPricePerLot`. Replaces AI-synthetic comps + the scalar absorption.
  - **Comps (Decision 1 = A+C, LOCKED):** auto-derive a weighted GRV/lot from real Domain comps (reuse
    devfinance `calculateCompRelevance`; apply time/size adjustments, all shown), AND **confidence-gate**
    — sparse/stale/dissimilar comps (< N comps, > X months, > Y km) **degrade to "indicative — valuer to
    set"** rather than assert a false-precise number (degrade-don't-fake). Valuer certifies/overrides.
  - **Absorption (Decision 2 = A→D, LOCKED):** two-phase curve — waitlist (× conversion %) pre-sold burst
    → benchmark monthly tail; emit a **monthly take-up vector** and, if scope allows, **feed it into the
    cash-flow** (`sensitivity.ts`, replacing the flat even spread) so absorption actually moves the
    feasibility margin. No waitlist data → degrade to the benchmark tail only.
  - **Dependency flags + data reality (verified 2026-07-04):** Domain is the **estimate-only (AVM)
    tier** — `client.comparables()` returns a price ESTIMATE (`{lower,mid,upper,confidence,date}`) with
    an **empty comps array**; there is NO sold-comps table to weight. So Decision 1 is realised as:
    GRV/lot = operator/study figure (certified by the valuer), **cross-checked** against the Domain AVM
    of the subject SITE (≈ current land value, a corroborating signal — not conflated with finished-lot
    GRV), confidence-gated natively by Domain's raw `priceConfidence` enum (confident/recentlySold →
    assert; historic/notAvailable/no-key → degrade to "indicative"). Built **key-optional** — degrades
    with no `DOMAIN_API_KEY` (set on property-services Edge Function secrets, NOT Vercel). `waitlist_register`
    is an evidence CATEGORY that gates a claimed `preSalesPercent` (not raw counts) — absorption uses that
    evidence-gated pre-sales fraction; no evidence → benchmark tail only. The 2026-05-27 `PriceEstimateCard`
    display work was never committed (absent from the repo) — comps wiring starts fresh here.
- **3d — Bankable snapshot (NEXT push).** Certified pack outputs (back from the kickoff professionals)
  promote deal-model v1 (indicative) → v2 (bankable); apply the unapplied `deal_model_snapshots`
  migration (`20260703000000`). Closes the loop to the kickoff + F2K-Projects promotion.
