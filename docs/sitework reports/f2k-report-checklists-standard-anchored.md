# F2K Report Generators — Standard-Anchored Checklists

Each checklist below is the **spec the platform's report generator must satisfy**, mapped to the section structure and computed outputs of a real reference report:

- **Deal Finder (Feasibility)** → anchored to the AEC Group feasibility study structure + the Feastudy subdivision model output set.
- **QS Checkpoint** → anchored to the AIQS Construction Financing Report (Initial + Progress).
- **Valuation Checkpoint** → anchored to the NSW Valuer General englobo method + the Feastudy "Valuer's-Style" P&L.

**Legend:** `[ ]` generator must produce · **⛔** = external professional input, not computed by F2K (field must exist and be flagged as external) · **∑** = computed output.

---

## Checklist 1 — Deal Finder (Feasibility)

### Report sections the generator must assemble
- [ ] Executive summary — background, purpose, key findings, tipping-point statement
- [ ] Limitations & assumptions block (desktop nature, sensitivity to cost/yield, no QS costing yet, title not searched, etc.)
- [ ] Site particulars — location, description, dimensions/area, constraints (flood/ARI/PMF, contamination, heritage, slope)
- [ ] Planning — zoning, overlays, controls (FSR/height/lot size), developer contributions
- [ ] Yield & design — GFA, net saleable area / net developable area, lot mix, staging
- [ ] Market analysis — commentary, rents, price/growth trend, supply pipeline, buyer profile
- [ ] Sales evidence — comparable lot/dwelling sales (analysed to $/unit **and** $/m²), development-site sales, adopted price points
- [ ] Feasibility assessment — assumptions, RLV/residual approach, scenarios tested, take-up rates, development costs (with benchmark comparison table), hurdle rates, modelling results, sensitivity, risk-factor table
- [ ] References / data-source list

### Computed outputs the generator must return (per the Feastudy model set)
- [ ] ∑ Gross realisation / total sales revenue
- [ ] ∑ Total Development Cost (TDC), incl. soft costs and contingency
- [ ] ∑ Margin on Development Cost (MDC / development margin)
- [ ] ∑ Internal Rate of Return (IRR)
- [ ] ∑ Residual Land Value — both target-margin basis and NPV basis
- [ ] ∑ Peak debt level **and the month it occurs**
- [ ] ∑ Monthly cashflow + cumulative net debt (S-curve)
- [ ] ∑ Per-lot and per-m² metrics: TDC/lot, sales income/lot, TDC/m², sales/m²
- [ ] ∑ GST on margin-scheme basis — GST collected in income, input tax credits
- [ ] ∑ Sensitivity tables: land cost, construction cost, construction period, sell-on income, sell-on period, borrowing interest rate (each showing MDC + IRR)
- [ ] ∑ Hurdle pass/fail against target IRR and target development margin

### External inputs (must exist as fields, flagged, not computed)
- [ ] ⛔ Certified geotechnical / slope-stability finding
- [ ] ⛔ Stamped stormwater / flood-storage cost
- [ ] ⛔ Stamped civil / earthworks / retaining cost

### Data sources the generator should reference
Pricefinder · CoreLogic RP Data · Cordell / Rawlinsons (construction benchmarks) · the LIST/Landgate (title, LiDAR) · council contributions schedule.

---

## Checklist 2 — QS Checkpoint (Cost Pack)

### Initial Report sections
- [ ] Executive summary — project overview + flagged risks/outstanding items
- [ ] Report identification & reliance (financier named, reliance limits)
- [ ] Assumptions & exclusions · limitations
- [ ] Site & project description
- [ ] Plans & specifications — completeness + design & land-surveyor certifications
- [ ] Local authorities & approvals
- [ ] ∑ Total Development Cost incl. soft costs
- [ ] ∑ Construction cost verification — trade-level, benchmarked, **GST-exclusive** (not $/m² shortcuts)
- [ ] Contingency · building contract, superintendent & insurances · tri-partite agreements
- [ ] Developer capability · builder capability
- [ ] Programme · ∑ cashflow / drawdown S-curve
- [ ] Consultants + PI insurance schedule (scaled: $1m cover ≤$5m build, $3m to $10m, $5m above)
- [ ] Geotechnical report · environmental report · adjacent properties
- [ ] Pre-sales & agreements for lease
- [ ] Valuer's report cross-check — **construction cost used by valuer must reconcile to QS budget**
- [ ] Risk management · ⛔ director sign-off (Certified QS)

### Progress Report sections (monthly)
- [ ] Progress claims & drawdown requests · progress payment certificate
- [ ] ∑ Cost to complete · contract-sum adjustments (variations) · unfixed materials · contingency
- [ ] Site observations (photos) · programme · cashflow
- [ ] Bank guarantee schedule · insurances table · licences & registrations
- [ ] Conformity of works · design compliance · authorities
- [ ] Statutory declaration · ⛔ checklist / certification

### External inputs (flagged, not computed by F2K)
- [ ] ⛔ Independent certification of TDC
- [ ] ⛔ Independent certification of each progress drawdown + funds-to-complete test

---

## Checklist 3 — Valuation Checkpoint

### Report sections
- [ ] Instruction, basis of value & reliance (lender named, purpose = first-mortgage security, valuation date, inspection date)
- [ ] Executive summary — **as-is value**, **on-completion Gross Realisation**, **net realisation**, key/special assumptions
- [ ] Bases & definitions — market value, standards, **GST / margin-scheme treatment**
- [ ] Property identification — title, folio, proprietor, easements/encumbrances, area
- [ ] Location & locality · site description
- [ ] Town planning — zoning, overlays, approval status
- [ ] The proposed development — lot yield/mix, staging, plans referenced
- [ ] Highest & best use (englobo test: undeveloped, largely un-serviced, zoned for subdivision into 5+ lots)
- [ ] Market & sales evidence — comparable lot sales analysed to **$/lot, $/m², $/ha or $/dwelling-site**; competing supply; **absorption / rate-of-sale**
- [ ] ∑ Valuation-date adjustment of sales (sales/resales, median movement, tracked comparables)

### Valuation approaches the generator must support
- [ ] ∑ **Direct comparison** → per-lot values → **Gross Realisation Value (GRV)** (primary method)
- [ ] ∑ **Hypothetical development method** → total projected sale of all lots less development cost (incl. holding costs + developer's margin, interest on 100% funding) — per NSW VG guidance
- [ ] ∑ **DCF sell-down** over the absorption period
- [ ] ∑ "In one line" (bulk) value vs aggregate retail realisation
- [ ] ∑ **Net realisation** — GRV less selling costs, GST (margin scheme), remaining development costs, profit & risk

### Then
- [ ] ∑ Sensitivity analysis · risks & qualifications · assumptions/limitations (reliance, validity)
- [ ] ⛔ Valuer certification (CPV/API, PI, "liability limited by a scheme") · appendices

### External inputs (flagged, not computed by F2K)
- [ ] ⛔ Independent API-standard valuation & concluded figure
- [ ] ⛔ Highest & best use certification

---

## How the three map together

| Gate | Reference standard | Key computed outputs | Hard stop |
|---|---|---|---|
| Deal Finder (Feasibility) | AEC study + Feastudy model | TDC, MDC, IRR, RLV, peak debt, sensitivity | geotech, stormwater, stamped civil |
| QS Checkpoint | AIQS CFR (Initial + Progress) | TDC (GST-ex), cost-to-complete, S-curve | independent certification + drawdowns |
| Valuation Checkpoint | NSW VG englobo + Valuer's P&L | GRV, hypothetical/residual, DCF, net realisation | independent API valuation |

**Two reconciliation rules the generators must enforce:**
1. **GST direction:** Feasibility and valuation run **GST-inclusive with margin scheme**; the QS runs **GST-exclusive**. A report that mixes these will be flagged by a bank.
2. **Cost/value tie-out:** the construction cost in the feasibility, the QS's TDC, and the build cost the valuer assumes must reconcile to the same figure. Surface any mismatch, don't bury it.
