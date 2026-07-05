# Structural Diff — Our Generators vs the Reference Reports (line-item level)

**Companion to** `report-generator-gap-audit.md`. Where the gap audit scored our generators against the *checklist*, this diffs them against the **actual line-item structure** of the two ground-truth PDFs:
- **AEC Group feasibility** (`Attachment F …`) — an RLV / affordable-housing *tipping-point* study (Estate Master engine).
- **Feastudy subdivision model** (`Subdivision Devt Demo Reports/Graphs`) — a 46-lot subdivision, the closest analogue to our estate product; its **Valuer's-Style P&L** is the gold-standard target.

**Read-only. No generator code changed.**

---

## 0. Two references, one important divergence to resolve first

| | AEC feasibility | Feastudy subdivision |
|---|---|---|
| Product | Apartment RLV / AH tipping-point | **Lot subdivision (our shape)** |
| Solves for | **Land value** (land is an *output*) | Profit + residual land |
| GST | **Standard GST** (explicitly *not* margin scheme — Assumption III) | **Margin Scheme** (every report "Inclusive of GST − Margin Scheme") |
| RLV | **Both** target-margin AND NPV, side by side | Residualised inside the Valuer's P&L (standalone RLV page toggled off) |
| Sensitivity | Scenario matrix on AH% (one variable) + qualitative risk table | **Six single-variable tables** (land/constr cost/constr period/sell income/sell period/interest), each cell = **Margin$ + MDC% + IRR%** |
| Hurdles | **20% margin AND 17.5% IRR** (both must pass) | MDC + IRR reported, no fixed hurdle |

**Resolution for the build:** the Feastudy is our structural template (subdivision, per-allotment). **GST must be a scheme toggle** — *margin scheme* is the correct default for englobo/subdivision (land bought without an ITC), *standard GST* the alternative. The gap-audit P0 "add margin scheme" is refined here to **"add a GST engine with standard/margin toggle, defaulting to margin scheme for subdivision."**

---

## 1. Valuer's-Style P&L — the biggest structural gap

Reference line order (Feastudy p.3) → what our `estate-valuation` + `valuer.ts` emit today:

| Reference line item (verbatim) | Our output | Gap |
|---|---|---|
| **Income:** Total Gross Realisation | `totalGrv` (`estate-valuation/build.ts:130`) | ✅ |
| Lending Interest (earned on positive balances) | — | 🔴 |
| Other (income) | — | 🔴 |
| Less: **GST Collected in Income** | — | 🔴 (no GST) |
| **Less selling costs:** Selling Fees | — | 🔴 |
| Conveyancing Fees (Sale) | — | 🔴 |
| Less: **GST Input Tax Credits** | — | 🔴 |
| **Gross Profit (Ex GST)** | — | 🔴 |
| **Profit & Risk Factor (Ex GST)** — % with `(IRR%)` | — | 🔴 (no profit-on-realisation, no IRR) |
| **Contribution to Development Costs** | — | 🔴 |
| **Less costs excl. land:** Stamp Duty · Finance Est. Fee · Line Fee · Conveyancing (Purchase) · Consultants · Construction (Unescalated + Escalation) · Rates & Taxes · Other · Contingency | contingency + civil/soft per-lot only (`estate-cost/build.ts`) — **not in the valuer pack**, no stamp duty / finance fees / escalation | 🔴 mostly |
| Less: GST Input Tax Credits | — | 🔴 |
| Borrowing Interest | — | 🔴 (no finance line in valuer path) |
| **Land Purchase Price (residual)** | — | 🔴 (no residualisation in the valuer pack) |
| **Per-unit footer:** Site Area · Land $/m² · **TDC/m²** · **Sales income/m²** · No. Allotments · **TDC/allotment** · **Sales/allotment** | per-lot cost only; **no $/m² TDC or sales, no residual land $/m²** | 🟡 partial |

**Verdict:** our valuer pack is a **certified-input GRV + absorption + AVM cross-check**. The reference is a **full residual-valuation P&L** that nets GST, deducts selling + all non-land dev costs + finance + profit&risk, and residualises land — with a per-m²/per-allotment metric footer. This is the single largest structural shortfall; it maps to gap-audit tickets **F2KSFLDS-A1 (GST), B3 (valuation approaches), A2/A3 (cost tie-out feeding the P&L)** and needs the **profit-on-realisation** metric + **land residualisation** added.

---

## 2. Feasibility results table — vocabulary diff

Reference (AEC Table 7.7 + Feastudy Categorised P&L footer) → our deal-model/devfinance:

| Reference line | Our output | Gap |
|---|---|---|
| Gross Sales Revenue / Development Sales | GRV ✅ (`revenue.ts:55`, deal-model) | ✅ |
| Less Selling Costs | devfinance has sales cost; **estate path: no explicit selling-cost line in the headline** | 🟡 |
| **GST paid on revenue / GST reclaimed on cost** | — | 🔴 |
| Land Acquisition · Construction (+contingency) · Professional Fees · Statutory Fees · Site Works · Finance Charges · Interest Expense → **Total Costs** | estate-cost per-lot subtotals + deal-model base ✅ (land-dev scope) | 🟡 (no finance/interest in estate headline) |
| **Gross Development Profit** | deal-model profit ✅ | ✅ |
| **Development Margin (Profit ÷ TDC)** = MDC | `profitOnCost` ✅ (`feasibility-agent.ts:63`) | ✅ |
| **Profit & Risk Factor (Profit ÷ Realisation)** | — | 🔴 (only profit-on-cost exists) |
| **Residual Land Value (Target Margin)** | PRSV ✅ (`revenue.ts:29-51`) | ✅ |
| **Residual Land Value (NPV)** | — | 🔴 |
| **Project IRR** | — | 🔴 (advertised, not computed) |
| **Peak Level of Debt + month** | devfinance ✅ (`sensitivity.ts:153-174`); **estate = per-stage exposure, no month** | 🟡 |
| Per-allotment + **per-m²** (TDC/m², sales/m²) | per-lot ✅; **per-m² TDC/sales 🔴** | 🟡 |

---

## 3. Sensitivity — exact target shape now known

The Feastudy gives the precise template our `sensitivity.ts` should match:

- **Six tables**, one variable each: **Land Cost · Construction Cost · Construction Period · Sell-On Income · Sell-On Period · Borrowing Interest Rate**.
- Each table: 11 rows (base case centred), steps ±10% (costs/income), ±months (periods), ±2.5%/0.5% (rate).
- Each row's output columns: **Sale Value · Dev. Cost · Margin ($) · MDC (%) · IRR (%)**.
- Graphed: each sensitivity plotted as **two series — MDC and IRR**.

Ours today: `sensitivity.ts:13-59` runs **12 *combined* scenarios**, output = `profitMargin` (on revenue) + `isViable`; **no single-variable isolation, no IRR, no land/interest axes.** → **F2KSFLDS-B2** now has an exact spec: build the six tables with [Sale Value, Dev Cost, Margin$, MDC%, IRR%] columns.

---

## 4. Cashflow — monthly + NPV + peak-debt-month

Feastudy Categorised Cashflow (monthly, 5 periods/page) rows: Land Purchasing · Consultants · Construction · Council Rates · Water & Sewer · Land Tax · Selling & Conv. · Other · Contingency · **GST Debits** · COSTS B4 INT · Sell-On Income · Other Income · **GST Tax Credits** · INCOME B4 INT · **Net Outlay** · Cum. Debt B4 Int · Interest · Cum. Interest · **Cum. Net Debt** · NET FLOW · **NPV Factors · NPV Net Flow** · absorption (Remaining Sales Units) · escalation rows.

- **Peak debt** = max of *Cum. Net Debt* (with its month). **NPV factors are a built-in row** → discounting → IRR/NPV fall out naturally.
- Ours: estate `runCashflow` is **per-build-stage, not monthly**, **no GST rows, no NPV factors, no month index on peak**. → confirms **F2KSFLDS-B1 (IRR/NPV via DCF over the monthly cashflow) + B4 (monthly S-curve + peak-debt month)**. The monthly machinery already exists in devfinance `sensitivity.ts:80-176` — porting it into the estate path (the **F2KSFLDS-D1 canonical-path decision**) unlocks B1+B4 together.

---

## 5. GST reconciliation — the reference gives us the exact lines

Feastudy **GST Summary Report** = a three-column **With GST · GST · Pre-GST** reconciliation of every income + cost line, plus in-P&L lines: **GST Collected in Income**, **GST Input Tax Credits**, **GST Debits in Inc.** AEC uses the standard-rule dual line: **GST paid on all Revenue** / **GST reclaimed**.

Ours: **zero GST anywhere.** → **F2KSFLDS-A1** refined: implement a GST module emitting *GST Collected in Income*, *GST Input Tax Credits*, and a *With-GST / GST / Pre-GST* summary, with a **standard vs margin-scheme toggle** (margin scheme default for subdivision; `GST on margin = (sale − acquisition)/11`).

---

## 6. Net-new tickets surfaced by the structural diff

(Extend the `report-generator-gap-audit.md` set.)

- **F2KSFLDS-B6 · Land residualisation in the valuer P&L.** Add the Feastudy residual spine to `estate-valuation`: Gross Profit (Ex GST) → Profit & Risk Factor → Contribution to Dev Costs → less non-land costs → **residual Land Purchase Price**. Renders the valuer pack as a real residual valuation, not a certified-GRV stub.
- **F2KSFLDS-B7 · Profit & Risk Factor (profit-on-realisation) metric.** We compute profit-on-cost (MDC) only; add profit ÷ realisation, shown with IRR in parentheses per the reference.
- **F2KSFLDS-C8 · Per-m² output metrics.** Add TDC/m² and sales-income/m² (+ residual land $/m²) to the cost + valuer pack footers (reference emits both per-allotment AND per-m²).
- **F2KSFLDS-C9 · Escalation modelling.** Reference splits Construction into Unescalated + Escalation and escalates rent/land/sell-on. Ours has none — add a simple time-escalation on construction + sale prices for multi-year estates.
- **F2KSFLDS-C10 · Finance line items.** Add Finance Establishment Fee, Line Fee, Borrowing Interest, Lending Interest to the estate cashflow/P&L (currently only a benchmark contingency + the deal-model's finance-inclusive base).
- **F2KSFLDS-A1 (refined) · GST scheme toggle**, **B2 (refined) · six single-variable MDC+IRR tables**, **B4 (refined) · monthly cashflow w/ NPV-factor row + peak-debt month** — exact target shapes now specified above.

---

## 7. Bottom line of the structural diff

Our estate pipeline produces the **inputs and constraints** a feasibility/valuation rests on (yield, per-lot cost, GRV, absorption, provenance, external-cert gating) — genuinely strong and honest. But against the reference **output** structure it is missing the **entire financial back-half**: the GST-netted P&L, land residualisation, profit-on-realisation, IRR/NPV, the six-table sensitivity, and the monthly NPV cashflow. The Feastudy Valuer's-Style P&L (§1) is the single most useful target to build toward — it contains, in one report, most of what the checklist's ∑ items enumerate.

*Audit/diff only — no generator code changed.*
