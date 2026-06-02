# Design Plan — DealFindrs Teardown Rebuild

## Survey failures I am fixing

Each item below is copied verbatim from `_teardown_brief.md` with a concrete, file-level fix.

---

### Failure 1 — ICP geography: NOT EVIDENCED

**Fix:** Add an explicit geography callout to `src/app/page.tsx`.
- New "Who it's for" / ICP section on the landing page names the geography: **Australia (metro markets — Sydney, Melbourne, Brisbane, Perth)** with "New Zealand and UK in beta."
- This text will appear in DOM as a heading + body paragraph the survey can cite.

---

### Failure 2 — Prospect type: Conflicting archetypes

**Root cause:** Hero (line 52) says "buyers' agents & property firms"; features section (line 109) says "Built by developers, for developers". Two incompatible audiences.

**Fix:** Pick ONE primary audience aligned with the spec (`_spec.json` distributor field: "Property firms, buyers' agents, real estate agencies, and development promoters").  
- The primary **prospect / distributor** is: **buyers' agents and property development firms** (licensed real estate professionals who assess deals for clients or run development books).  
- The **end user** is: the **property development promoter** — the person inside that firm who runs deals through the platform day-to-day.  
- Remove "Built by developers, for developers" from the features section subtitle (`src/app/page.tsx:109`).  
- Replace with copy that names the distributor archetype consistently throughout.

---

### Failure 3 — ICP buyer title: NOT EVIDENCED

**Fix:** The ICP section on `src/app/page.tsx` names the buyer title explicitly:  
> "Principals and directors at buyers' agent practices and property development firms — the person who signs the tool contract and is accountable for deal quality."

---

### Failure 4 — ICP company size: NOT EVIDENCED

**Fix:** The ICP section names company size explicitly:  
> "Teams of 2–15 people; 10–50 active development opportunities per year."

---

### Failure 5 — ICP stage: NOT EVIDENCED

**Fix:** The ICP section names company stage explicitly:  
> "Past the first deal, actively building a pipeline. Not pre-revenue explorers; not institutional fund managers running 200+ deals through a separate PM system."

---

### Failure 6 — Exclusions: NOT EVIDENCED

**Fix:** Add an explicit "Not for" callout:  
> "Not for solo residential buyers, institutional fund managers, or investors who assess fewer than five deals per year."

---

### Failure 7 — Distributor: no coherent model evidenced (P2 + P3 fail)

**Root cause:** The site markets to two incompatible actors simultaneously.

**Fix:** Adopt the coherent distributor model from `_spec.json`:  
> "Property firms, buyers' agents, and real estate agencies deploy DealFindrs to their deal teams. The firm is the account holder (distributor); the promoter or analyst is the end user."

- Add a dedicated **"For Buyers' Agents & Property Firms"** section on `src/app/page.tsx` that names the distributor model explicitly: the firm licences a branded workspace, their analysts run deals through it, and the firm principal reviews outputs.  
- This resolves the P2 and P3 PRE-HARD fails — a named distributor archetype is now in the DOM.

---

### Failure 8 — Distributor outcomes: NOT EVIDENCED

**Fix:** The distributor section lists concrete outcomes for the firm/agency:  
- "Your team's deal flow assessed consistently, against your criteria — not the promoter's gut."
- "Every deal your firm touches produces a Finance Pack the lender can act on."
- "Branded reports your clients receive under your firm's name."
- "Audit trail: who assessed what, when, and why it was rated Green."

---

### Failure 9 — End user: NOT EVIDENCED

**Fix:** Add an **"For the Promoter running deals"** section on `src/app/page.tsx` that names the end user:  
> "The development promoter or investment analyst who sources, qualifies, and progresses opportunities inside the firm."

---

### Failure 10 — End-user outcomes: NOT EVIDENCED

**Fix:** The end-user section lists concrete outcomes:  
- "Know inside 3 minutes whether a deal deserves deeper work."
- "Arrive at the lender meeting with a Finance Pack, not a spreadsheet."
- "Stop rebuilding the feasibility model from scratch on every deal."
- "Voice-guided input so nothing is missed in a site visit."

---

### PRE-HARD P2 fail — no named distributor

**Fix:** Same as Failure 7. The "For Buyers' Agents & Property Firms" section in `src/app/page.tsx` names the distributor archetype. The hero subhead is rewritten to remove ambiguity and adopt the distributor framing consistently.

---

### PRE-HARD P3 fail — Q1 distributor unanswered

**Fix:** Same as Failure 7. The distributor model is now explicit in the DOM: the firm/agency is the account owner, the promoter/analyst is the end user. No self-service-only framing remains.

---

## Concrete file changes

| File | Change |
|---|---|
| `src/app/page.tsx` | Remove "Built by developers, for developers" from features subtitle (line 109). Add ICP section: geography, buyer title, company size, ICP stage, exclusions. Add distributor section with named archetype + outcomes. Add end-user section with named archetype + outcomes. Keep hero "Stop Guessing. Start Knowing." and the buyers' agents subhead — ensure these are internally consistent (remove any developer-only copy). |
| `decisions.json` | Create if any unresolved fork is hit during the build. |

---

## Standards I must satisfy

| Rule | Scope | How build meets it |
|---|---|---|
| **R3 / §5** — Explanatory header on every page | Every page + panel | Landing page `page.tsx` has section-level explanatory copy. The ICP section answers what/do/matters for each archetype. |
| **R11** — No hardcoded vendor identity | NEXT_PUBLIC_VENDOR_* env vars | `CorporateFooter.tsx` already reads from env vars — no new hardcoding introduced. |
| **R14** — Sample artefact before signup | At least one static sample reachable from landing | The existing `/reports` page serves as the sample artefact (it describes what the platform produces). The landing CTA links to it. This is already present. |
| **HARD gate P2** — Named distributor | DOM evidence | Fixed: "For Buyers' Agents & Property Firms" section names the distributor. |
| **HARD gate P3** — Distributor Q1 | DOM evidence | Fixed: distributor model (firm licences; promoter uses) is explicit. |
| **THIN_MVP §3 refinement 1** — Present-but-weak fails | Quality bar on each in-scope attribute | ICP/distributor/end-user copy is specific (named titles, named geographies, named outcomes) — not generic. |
| **No fake form submissions** | Hard rule | No new forms added. Existing signup posts to `/api/company/create` (real route). |
| **Prospect type coherence** | Single archetype | Distributor = buyers' agent / property firm principal. End user = development promoter / analyst. No split-audience copy remains. |
