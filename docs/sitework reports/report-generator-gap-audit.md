# Report-Generator Gap Audit — Feasibility / QS / Valuation vs Industry Standard

**Type:** Audit deliverable (per `claude-code-report-audit-brief.md`). **No generator code was changed.**
**Anchored to:** `f2k-report-checklists-standard-anchored.md` (AEC feasibility · AIQS CFR · NSW VG englobo).
**Date:** 2026-07-05. **Scope:** `src/lib/{estate-buildup,estate-cost,estate-valuation,devfinance,review-packs}` + `@caistech/deal-model`.

---

## 0. Executive verdict

The estate review-pack pipeline is an **honest, well-provenanced "review/certify, don't rebuild" desktop buildup** — constraints + yield + per-lot cost + GRV/absorption + the F2K uplift-split verdict — with external certification correctly gated and a degrade-don't-fake AVM. **As a bank-grade feasibility/QS/valuation it is thin**: the conventional funder outputs the standard demands are largely absent from the *estate* generators.

**Five findings gate "bankable":**

1. **GST / margin scheme is entirely absent** portfolio-wide (0 hits in estate-cost, estate-valuation, deal-model). AU feasibility + valuation must run GST-inclusive margin-scheme; QS must run GST-exclusive. Neither direction exists. **Critical.**
2. **No cost/value tie-out.** The checklist's explicit "valuer-cost reconciliation field" does not exist — `costPack` and `valuationPack` are unlinked (`review-packs/types.ts:28-33`). Worse, **two independent construction-cost engines** (`devfinance/costs.ts` dwelling-m² vs `estate-cost/build.ts` lot-based) can produce different figures for the same site with no cross-check. **Critical.**
3. **IRR and NPV-based RLV are not computed anywhere** — yet the landing/reports pages advertise "IRR, ROC, peak debt" (`app/page.tsx:403`, `app/reports/page.tsx:62-64`). Target-margin residual (PRSV) exists; IRR/NPV do not. **High.**
4. **Two parallel financial layers.** Monthly S-curve cashflow, peak-debt-month, and comps analysed to $/m² exist **only in the older `devfinance` unit path** — NOT in the estate review-pack generators that render the PDFs. A canonical-path decision is needed. **High (architectural).**
5. **Valuation implements 1 of 5 approaches.** Only a certified-input GRV + absorption; residual/hypothetical, DCF-as-presented, "in one line", and **net realisation** are missing. And computed `siteRisk` is not even rendered in `valuer.ts`. **High.**

**What's already right (preserve):** estate path is internally tied out via the deal-model's single `deriveWorksToTitle()` source (`deal-model/index.ts:34-37`); external certifications are blank sign-off lines recorded from external input and gate the bankable snapshot (`certification.ts:17-29`); the AVM degrades-don't-fake (`avm.ts:23-28`); every figure carries inline provenance (`review-packs/format.ts`).

---

## 1. Deal Finder (Feasibility) — gap table

| Checklist item | Status | Evidence | 
|---|---|---|
| Exec summary | 🟡 | `devfinance/agents/pack-agent.ts:55-119` — **no tipping-point statement** |
| Limitations/assumptions block | 🟡 | disclaimer `review-packs/render.ts:16-19`; no consolidated financial-assumptions block |
| Site particulars (flood/ARI/PMF, contamination, heritage, slope) | 🟡 | slope/BAL/overlays/contamination ✓ `estate-buildup/build.ts:122-224`; **flood = boolean only (no ARI/PMF); heritage generic overlay** |
| Planning (zoning/overlays/FSR/height/lot/contributions) | 🟡 | zoning/min-lot/overlays/contributions ✓; **FSR/height absent** (lot-subdivision path) |
| Yield & design (GFA, net saleable, lot mix, staging) | 🟡 | net-developable + staging ✓; **GFA/net-saleable/lot-mix only in devfinance unit path** |
| Market analysis (rents, growth, supply, buyer) | 🔴 | absorption + AVM + risk commentary only; **rents/growth/supply/buyer absent** |
| Sales evidence (comps → $/unit AND $/m²) | 🟡 | devfinance ✓ `revenue.ts:63-97`; **estate path = single AVM, no comps table** |
| Feasibility assessment (RLV/scenarios/take-up/benchmark/hurdle/sensitivity/risk) | 🟡 | mostly ✓; only NPV-RLV missing |
| References / data-source list | 🟡 | inline provenance ✓; no consolidated bibliography |
| ∑ Gross realisation | ✅ | `revenue.ts:55-57`; `estate-valuation/types.ts:63` |
| ∑ TDC (incl soft + contingency) | ✅ | `feasibility-agent.ts:58-59`; deal-model `model.ts:133-145` |
| ∑ Margin on Dev Cost (MDC) | ✅ | `feasibility-agent.ts:63` (`profitOnCost`) |
| ∑ IRR | 🔴 | **not computed anywhere** (advertised but absent) |
| ∑ RLV — target-margin AND NPV | 🟡 | target-margin (PRSV) ✓ `revenue.ts:29-51`; **NPV-basis missing** |
| ∑ Peak debt + month | 🟡 | devfinance ✓ `sensitivity.ts:153-174`; **estate cashflow = per-stage, no month** `deal-model/cashflow.ts:105` |
| ∑ Monthly cashflow + cumulative net debt | 🟡 | devfinance ✓; **estate `runCashflow` per-stage, not monthly** |
| ∑ Per-lot AND per-m² metrics | 🟡 | per-lot ✓; **only construction $/m²; no TDC/m² or sales/m²** |
| ∑ GST margin-scheme | 🔴 | **absent** |
| ∑ Six single-variable sensitivity tables (MDC + IRR) | 🔴 | `sensitivity.ts:13-59` runs **12 combined scenarios on margin-of-revenue, no IRR, not six axes** |
| ∑ Hurdle pass/fail (IRR + margin) | 🟡 | margin hurdle ✓; **IRR hurdle absent** |
| ⛔ geotech / stormwater / civil (external, flagged) | 🟡 | earthworks/retaining ⛔ formal ✓ `engineer.ts:43-47`; **not named "certified geotech"/"stamped stormwater" lines** |

## 2. QS Checkpoint — gap table

| Checklist item | Status | Evidence |
|---|---|---|
| Exec summary w/ flagged risks | 🟡 | `qs.ts:59` cost totals only; slope band computed but **not surfaced as risk** |
| Report identification & reliance (financier named) | 🟡 | `qs.ts:47-57` site only; **no financier/reliance** |
| Assumptions & exclusions | 🟡 | implicit in per-line `basis`; **no explicit exclusions** |
| Plans & specs + certifications | 🔴 | not found |
| Local authorities / approvals | 🔴 | headworks line only; no DA/approvals section |
| ∑ TDC incl soft | ✅ (land-dev scope) | `estate-cost/build.ts:189,205` |
| ∑ Construction verification trade-level, benchmarked, **GST-EXCLUSIVE** | 🟡 | civil/soft = per-lot lump benchmarks (**not trade-level**; trade engine only for optional H&L); **GST basis never stated** |
| Contingency / insurances | 🟡 | contingency ✓ `build.ts:156-166`; **insurances absent** |
| Developer & builder capability | 🔴 | not found |
| Programme + ∑ drawdown S-curve | 🔴 | `generateDrawDown` exists `costs.ts:245-266` **but not wired to the estate QS pack** |
| Consultants + PI-insurance schedule (scaled) | 🔴 | not found |
| Geotech / environmental | 🟡 | terrain drives cost; **no geotech/env section** |
| **Valuer-cost reconciliation field** | 🔴 | **MISSING** — `costPack`/`valuationPack` unlinked `review-packs/types.ts:28-33` |
| ⛔ Director/QS certification (external) | ✅ | `qs.ts:67-84`; `certification.ts:10-15` |
| Progress-report set (drawdowns, cost-to-complete, variations, guarantees, ⛔ cert) | 🔴 | **entire set absent** |

## 3. Valuation Checkpoint — gap table

| Checklist item | Status | Evidence |
|---|---|---|
| Instruction/basis/reliance (lender, val + inspection dates) | 🟡 | `valuer.ts:65-75` prepared date only; **no lender/basis/dates** |
| Exec summary (as-is, on-completion GRV, **net realisation**, special assumptions) | 🟡 | GRV + as-is(AVM) ✓; **net realisation + special assumptions absent** |
| Bases & definitions incl **GST/margin-scheme** | 🔴 | not found |
| Property identification (title/folio/easements/area) | 🟡 | address/LGA only |
| Town planning | 🔴 | `siteRisk` computed `build.ts:34-67` **but never rendered in `valuer.ts`** |
| Proposed development (yield/mix/staging) | 🟡 | lot count only |
| Highest-&-best-use englobo test | 🔴 | not found |
| Market & sales evidence (→ $/lot,$/m²,$/ha + supply + absorption) | 🟡 | absorption ✓; **evidence = single AVM, no comps, no competing supply** |
| ∑ Valuation-date adjustment of sales | 🔴 | not in estate pack |
| ∑ Direct comparison → per-lot → GRV (primary) | 🟡 | GRV is **certified input, not derived by comparison** `valuer.ts:18` |
| ∑ Hypothetical development / residual | 🔴 | not in estate valuer pack |
| ∑ DCF sell-down | 🟡 | absorption vector feeds a cashflow; **no DCF presented as an approach** |
| ∑ "In one line" bulk vs aggregate | 🔴 | not found |
| ∑ **Net realisation** | 🔴 | not found |
| ∑ Sensitivity | 🔴 | feasibility-only, not wired to valuer |
| Risks / qualifications | 🔴 | computed, **not rendered** |
| ⛔ Valuer API cert (external) | ✅ | `valuer.ts:82-94`; `certification.ts` |
| ⛔ Highest-&-best-use cert | 🔴 | not found |

---

## 4. Jira-ready tickets (F2KSFLDS style — one per fix, prioritised)

> Ordered by funder-impact. Each names the standard section it fails + the affected file/table.

### P0 — bank will reject without these
- **F2KSFLDS-A1 · GST margin-scheme engine (all three).** Add GST handling: feasibility + valuation run **GST-inclusive, margin scheme** (`GST payable = (sale − acquisition)/11`, ITCs on construction/soft); QS runs **GST-exclusive** and states it. New shared util (`src/lib/gst/`), consumed by `estate-cost` (assert ex-GST basis), `estate-valuation` (net realisation), and the deal-model verdict. *Fails: Feas checklist ∑9; QS "GST-exclusive"; Val "bases & definitions"; both reconciliation rules.*
- **F2KSFLDS-A2 · Valuer-cost reconciliation field.** Add a tie-out on `ReviewPackContext` (`review-packs/types.ts:28-33`) that asserts the QS `landDevCostPerLot`/works figure == the build cost the valuer assumes, and renders the delta in both packs (flag if >x%). *Fails: QS "valuer-cost cross-check"; cross-cutting rule 2.*
- **F2KSFLDS-A3 · Reconcile the two construction-cost engines.** `devfinance/costs.ts` (dwelling-m²) vs `estate-cost/build.ts` (lot-based) can diverge with no cross-check. Decide the canonical engine or add a reconciliation adapter. *Fails: cost tie-out.*

### P1 — core computed outputs the standard names
- **F2KSFLDS-B1 · IRR + NPV.** Add a DCF over the monthly/stage cashflow → IRR and NPV-basis RLV; wire into the deal-model verdict + feasibility hurdle. Removes the advertised-but-absent IRR (`app/page.tsx:403`). *Fails: Feas ∑4, ∑5 (NPV), ∑11.*
- **F2KSFLDS-B2 · Six single-variable sensitivity tables (MDC + IRR).** Replace/augment the 12 combined scenarios (`sensitivity.ts:13-59`) with the six standard axes (land cost, construction cost, construction period, sell-on income, sell-on period, interest rate), each reporting MDC + IRR. *Fails: Feas ∑10.*
- **F2KSFLDS-B3 · Valuation approaches 2–5.** Add hypothetical-development/residual, DCF sell-down (as a presented approach), "in one line" vs aggregate, and **net realisation** to `estate-valuation` + `valuer.ts`. *Fails: Val approaches 2–5.*
- **F2KSFLDS-B4 · Estate monthly cashflow + peak-debt month.** `runCashflow` is per-stage (`deal-model/cashflow.ts`); add a monthly S-curve + peak-debt month to the estate path (or promote the devfinance one). *Fails: Feas ∑6, ∑7.*
- **F2KSFLDS-B5 · QS programme + drawdown S-curve.** Wire the existing `generateDrawDown` (`costs.ts:245-266`) into the estate QS pack; add a construction programme. *Fails: QS "programme + S-curve".*

### P2 — report-body completeness + quick wins
- **F2KSFLDS-C1 · Render computed site-risk in the valuer pack** (quick win — `build.ts:34-67` already computes it; `valuer.ts:77-95` just doesn't print it). *Fails: Val town planning / risks.*
- **F2KSFLDS-C2 · Report identification block** (lender named + reliance + valuation/inspection dates) across QS + valuer headers. *Fails: QS "reliance"; Val "instruction/basis".*
- **F2KSFLDS-C3 · Named external ⛔ lines** — first-class "Certified geotech/slope-stability", "Stamped stormwater/flood cost", "Stamped civil" fields (not inferred from the slope/servicing gaps). *Fails: Feas external inputs.*
- **F2KSFLDS-C4 · PI-insurance schedule (scaled $1m/$3m/$5m) + insurances + plans/specs + capability** sections in the QS pack. *Fails: QS sections.*
- **F2KSFLDS-C5 · Highest-&-best-use englobo test + comps table + competing-supply** in the valuer pack. *Fails: Val H&BU + evidence.*
- **F2KSFLDS-C6 · Consolidated assumptions block + references/bibliography + tipping-point exec statement** (feasibility). *Fails: Feas sections a,b,i.*
- **F2KSFLDS-C7 · QS Progress-Report generator** (drawdown claims, cost-to-complete, variations, bank-guarantee schedule, ⛔ independent drawdown certification). *Fails: QS progress set.*

### P1 — architectural decision (blocks several above)
- **F2KSFLDS-D1 · Canonical financial path.** Decide whether the **estate** path or the **devfinance** unit path is the report generator of record, then port the missing outputs (monthly cashflow, comps→$/m², IRR) into it and retire the divergence. Several tickets above depend on this. *Fails: cross-cutting; two-engine drift.*

---

*Audit only — no generator code changed, per the brief. Recommend triaging P0 before any lender pilot.*
