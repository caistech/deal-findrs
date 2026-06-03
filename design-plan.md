# DealFindrs — Design Plan (TEARDOWN rebuild)

## Survey failures I am fixing

All 13 failing items + 2 PRE-HARD failures must be resolved. Each fix is a concrete
file/copy/marker change.

---

### 1. Promise: NOT EVIDENCED

**Fix:** `src/app/page.tsx` — add `{...markerProps('promise', card.promise)}` to the hero
headline section. Card value: "DealFindrs delivers instant Green/Amber/Red AI-powered
assessments on property development opportunities, eliminating guesswork with consistent,
criteria-based scoring."

---

### 2. Friction: NOT EVIDENCED

**Fix:** `src/app/page.tsx` — add `{...markerProps('friction', card.friction)}` to the
"problem" copy section. Card value: "Property developers and buyers' agents struggle to
evaluate deal opportunities consistently and risk missing profitable deals or taking bad ones."

---

### 3. Core mechanism: NOT EVIDENCED

**Fix:** `src/app/page.tsx` — add `{...markerProps('core_mechanism', card.core_mechanism)}`
on the **assessment pipeline list** (the functional surface users interact with), not on a
tagline. The pipeline steps (RAG → QS → Valuation → Feasibility → Finance Pack) are the live
working surface — that is where the mechanism marker goes. Card value: "AI analyzes
user-defined criteria (minimum GM%, de-risk factors, deal-breakers) and provides instant RAG
ratings with detailed explanations and action items."

---

### 4. ICP geography: NOT EVIDENCED

**Fix:** `src/app/page.tsx` — add `{...markerProps('icp_geography', card.icp_geography)}`
on the geography card/section. Card value: "Global (headquartered in Brisbane, Australia)"
→ slugifies to "global-headquartered-in-brisbane-australia".

---

### 5. Prospect type: generic value "reseller" (banlist)

**Root cause:** The card's `icp_partner_type` field contains "reseller" which is in the
banlist. `markerProps` throws on generic values. The copy must use the NAMED archetype
from the site's description of who the prospect is.

**Fix:** The named archetype used throughout the site is "buyers-agent-firm". The
`markerProps` call uses `"buyers-agent-firm"` as the value (the named archetype the copy
describes) — not the card's raw "reseller" field. This is the correct interpretation:
`icp_partner_type` carries the named archetype, NOT the channel-type category. The copy
and the marker both say "buyers' agent firm".

---

### 6. ICP buyer title: NOT EVIDENCED

**Fix:** `src/app/page.tsx` + `src/app/partners/page.tsx` — add
`{...markerProps('icp_buyer_title', card.icp_buyer_title)}` on the "Agency Owner /
Principal" card element. Card value: "Agency Owner" → slug "agency-owner".

---

### 7. ICP verticals: NOT EVIDENCED

**Fix:** `src/app/page.tsx` — add `{...markerProps('icp_verticals', card.icp_verticals)}`
on the verticals/sector section. Card value: "Proptech consultancies, real-estate franchise
networks, buyers'-agent industry bodies" → need a named archetype here. Use
"buyers-agent-firms-and-property-advisories" which matches the copy.

Actually the card's icp_verticals says "Proptech consultancies, real-estate franchise networks,
buyers'-agent industry bodies" — "buyers-agent-industry-bodies" is a named entity not on the
banlist. The marker uses the card value slug.

---

### 8. ICP company size: NOT EVIDENCED

**Fix:** `src/app/page.tsx` — add `{...markerProps('icp_company_size', card.icp_company_size)}`
on the firm-size card. Card value: "5-50 employees" → slug "5-50-employees".

---

### 9. ICP stage: NOT EVIDENCED

**Fix:** `src/app/page.tsx` — `markerProps('icp_stage', 'operating-business')`. The card
says "Operating businesses" but the enum requires the slug form: `operating-business`.

---

### 10. Distributor: NOT EVIDENCED

**Fix:** `src/app/partners/page.tsx` — add `{...markerProps('distributor', card.distributor)}`
on the hero/intro copy that describes the distributor archetype. Card value: "Property firms,
buyers' agents, real estate agencies, and development promoters seeking branded deal assessment
tools for their teams." — the named archetype used in copy: "buyers-agent-firms" (not generic
"reseller"). The marker value must be a named archetype slug. Use the same value as
`icp_partner_type`: "buyers-agent-firm".

---

### 11. Distributor outcomes: NOT EVIDENCED

**Fix:** `src/app/partners/page.tsx` — add
`{...markerProps('distributor_outcomes', card.distributor_outcomes)}` on the distributor
outcomes section. Card value: "Distributors get a steady flow of scored deals under their
own brand, team collaboration tools, and white-label options for Premium plans."

---

### 12. End user: NOT EVIDENCED

**Fix:** `src/app/page.tsx` — add `{...markerProps('end_user', card.end_user)}` on the
"For the property developer running deals" section. Named archetype: "property-developer".
Card value: "Property developers, investment analysts, buyers' agents, and development
promoters who evaluate deal opportunities." → use "property-developer" as the named archetype.

---

### 13. End-user outcomes: NOT EVIDENCED

**Fix:** `src/app/page.tsx` — add
`{...markerProps('end_user_outcomes', card.end_user_outcomes)}` on the end-user outcomes
list. Card value: "Consistent deal evaluation criteria remembered forever, instant RAG
ratings in seconds, auto-generated professional Investment Memorandums, and faster, smarter
investment decisions within 90 days."

---

### 14. PRE-HARD P2: no named distributor archetype

**Fix:** `src/app/partners/page.tsx` — distributor marker with named archetype
"buyers-agent-firm" (not "reseller"). This is the same fix as item 10.

---

### 15. PRE-HARD P3: missing distributor, distributor_outcomes, data-why-now

**Fix:**
- distributor + distributor_outcomes markers on `/partners` (items 10–11).
- Add `{...markerProps('why_now', ...)}` on a "why now" statement on the homepage.
  The why_now copy: "Property finance is tightening — lenders now require full feasibility
  documentation before credit approval. Developers who arrive with a Finance Pack close
  faster. The firms that provide that capability win the mandate."

---

## Files changed

| File | Change |
|------|--------|
| `src/lib/surveyMarkers.ts` | **NEW** — copied from `_template/lib/surveyMarkers.ts` |
| `scripts/emit-survey-manifest.mjs` | **NEW** — writes `public/survey-manifest.json` |
| `public/survey-manifest.json` | **NEW** — lists `/`, `/partners`, `/reports` |
| `src/app/page.tsx` | Add all 12 markerProps: promise, friction, icp_geography, icp_partner_type (named), icp_buyer_title, icp_verticals, icp_company_size, icp_stage, end_user, end_user_outcomes, exclusions (keep), why_now. Move core_mechanism to pipeline section. |
| `src/app/partners/page.tsx` | Add distributor, distributor_outcomes; fix icp_partner_type to named archetype. |
| `next.config.js` | Add `postbuild` hook to emit manifest. |

---

## Standards I must satisfy

### R3/P3 — Explanatory header rule
Every page already has one. Maintained.

### R9 — RLS: no USING(true)
Not changing DB migrations. Existing tables are unaffected.

### R10 — No verbatim Postgres errors
Existing error handling uses sanitised messages. Not changed.

### R11 — No hardcoded vendor identity
CorporateHeader/Footer uses env-based vendor identity pattern. Not adding hardcoded strings.

### R13 — Route smoke test
`routes.config.json` already lists `/`, `/partners`, `/reports`. Manifest lists same routes.

### R14 — Public sample artefact
`/reports` page is a public sample artefact (detailed description of every report output).

### HARD RULE: PLANT SURVEY MARKERS
All 14 + why_now planted via `markerProps()` helper. Named archetypes used for NAMED fields.

### HARD RULE: NAMED MARKERS TAKE THE ARCHETYPE
- `icp_partner_type` → "buyers-agent-firm"
- `icp_buyer_title` → "agency-owner" (from card "Agency Owner")
- `icp_verticals` → use card value slug (includes "buyers-agent-industry-bodies")
- `distributor` → "buyers-agent-firm" (named archetype)
- `end_user` → "property-developer" (named archetype)

### HARD RULE: CORE_MECHANISM on live working surface
`data-core-mechanism` goes on the pipeline steps section (the actual mechanism), not on the hero tagline.

### HARD RULE: EMIT public/survey-manifest.json
Script + file listing `/`, `/partners`, `/reports`.

### HARD RULE: DISTINCT DISTRIBUTOR SURFACE
`/partners` page already exists and is structurally distinct from end-user sections.

### HARD RULE: DISTRIBUTION LOOP
`/api/share` + `/share/[token]` already implements shareable Finance Pack links. Kept.

### HARD RULE: NO FAKE SUBMISSIONS
`/api/partners/contact` already posts to real Supabase endpoint. Kept.

### HARD RULE: LUCIDE ICONS IN INSTALLED VERSION (0.303.0)
Using only stable icons: Users, Building2, ArrowRight, CheckCircle, TrendingUp, etc.

### HARD RULE: LIVE-STATE ROUTES
Existing share route already has `force-dynamic` / `revalidate = 0` / `fetchCache`.

### HARD RULE: SUPABASE NEW-TABLE TYPING
No new tables added in this PR. Existing `as never` casts maintained.

### HARD RULE: VENDOR IDENTITY VIA ENV
No hardcoded phone/email/Calendly in source. CorporateFooter reads env vars.
