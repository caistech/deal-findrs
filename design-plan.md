# Design Plan — DealFindrs Teardown Rebuild (v3)

## Survey failures I am fixing

Each failing item from `_teardown_brief.md` with the CONCRETE change (file + copy) that makes it
evidenced. Every item has a fix. None are dismissed.

---

### ROOT CAUSE (all 13 failing fields)

The existing site has copy that describes all 14 spec fields but ZERO `data-*` DOM markers from the
`markerProps` / `surveyMarkers` helper. The survey gate is now deterministic: it greps the live DOM
for `data-*` attributes, not copy text. Every `data-*` attribute was either absent, or used a
generic/banlist value (`data-icp-partner-type="reseller"` → banlist) which also fails.

**Fix strategy:** Install `src/lib/surveyMarkers.ts` (from `_template/lib/`). Use `markerProps(field, cardValue)` on every section that renders that field's copy. All 14 scored fields + `why_now` get a marker. Values come from `_spec.json` fields verbatim so copy and marker stay in sync.

---

### Failure 1 — Promise: NOT EVIDENCED

**Spec value:** `"DealFindrs delivers instant Green/Amber/Red AI-powered assessments on property development opportunities, eliminating guesswork with consistent, criteria-based scoring."`

**Fix — `src/app/page.tsx`:**
- Hero section `<div>` gets `{...markerProps('promise', card.promise)}`
- `data-promise` slug: `dealfindrs-delivers-instant-green-amber-red-ai-powered-assessments-on-property-development-opportunities-eliminating-guesswork-with-consistent-criteria-based-scoring`

---

### Failure 2 — Friction: NOT EVIDENCED

**Spec value:** `"Property developers and buyers' agents struggle to evaluate deal opportunities consistently and risk missing profitable deals or taking bad ones."`

**Fix — `src/app/page.tsx`:**
- Pain/problem section gets `{...markerProps('friction', card.friction)}`

---

### Failure 3 — Core mechanism: NOT EVIDENCED

**Spec value:** `"AI analyzes user-defined criteria (minimum GM%, de-risk factors, deal-breakers) and provides instant RAG ratings with detailed explanations and action items."`

**Fix — `src/app/page.tsx`:**
- The assessment pipeline section (the `<ol>` showing RAG → QS → Valuation → Feasibility → Finance Pack) gets `{...markerProps('core_mechanism', card.core_mechanism)}`
- Rule: `data-core-mechanism` must be on the FUNCTIONAL component section, not a tagline.

---

### Failure 4 — ICP geography: NOT EVIDENCED

**Spec value:** `"Global (headquartered in Brisbane, Australia)"`

**Fix — `src/app/page.tsx` AND `src/app/partners/page.tsx`:**
- The ICP geography card gets `{...markerProps('icp_geography', card.icp_geography)}`

---

### Failure 5 — Prospect type: GENERIC VALUE (`data-icp-partner-type="reseller"`)

**Problem:** "reseller" is on the banlist. `markerProps` throws at build on this value.

**Spec value:** `icp_partner_type = "buyers agent firm"`

**Fix:** Replace the raw `data-icp-partner-type="reseller"` attribute with
`{...markerProps('icp_partner_type', card.icp_partner_type)}`
which emits `data-icp-partner-type="buyers-agent-firm"` — a NAMED archetype not on the banlist.

---

### Failure 6 — ICP buyer title: NOT EVIDENCED

**Spec value:** `"Agency Owner"`

**Fix — `src/app/page.tsx` AND `src/app/partners/page.tsx`:**
- The buyer-title card/section gets `{...markerProps('icp_buyer_title', card.icp_buyer_title)}`
- Emits `data-icp-buyer-title="agency-owner"`

---

### Failure 7 — ICP verticals: NOT EVIDENCED

**Spec value:** `"Proptech consultancies, real-estate franchise networks, buyers'-agent industry bodies"`

**Fix — `src/app/partners/page.tsx`:**
- The verticals section gets `{...markerProps('icp_verticals', card.icp_verticals)}`

---

### Failure 8 — ICP company size: NOT EVIDENCED

**Spec value:** `"5-50 employees"`

**Fix — `src/app/page.tsx` AND `src/app/partners/page.tsx`:**
- The firm-size card gets `{...markerProps('icp_company_size', card.icp_company_size)}`

---

### Failure 9 — ICP stage: NOT EVIDENCED

**Spec value:** `"operating business"` → enum-valid slug: `"operating-business"`

**Fix — `src/app/page.tsx` AND `src/app/partners/page.tsx`:**
- The stage card gets `{...markerProps('icp_stage', card.icp_stage)}`
- Note: icp_stage ENUM is `seed | growth | scale | operating-business | enterprise`.
  "operating business" → slugify → "operating-business" ✓

---

### Failure 10 — Distributor: NOT EVIDENCED

**Spec value:** `"Property firms, buyers' agents, real estate agencies, and development promoters seeking branded deal assessment tools for their teams."`

**Fix — `src/app/partners/page.tsx`:**
- The distributor description section gets `{...markerProps('distributor', card.distributor)}`

---

### Failure 11 — Distributor outcomes: NOT EVIDENCED

**Spec value:** `"Distributors get a steady flow of scored deals under their own brand, team collaboration tools, and white-label options for Premium plans."`

**Fix — `src/app/partners/page.tsx`:**
- The distributor outcomes section gets `{...markerProps('distributor_outcomes', card.distributor_outcomes)}`

---

### Failure 12 — End user: NOT EVIDENCED

**Spec value:** `"Property developers, investment analysts, buyers' agents, and development promoters who evaluate deal opportunities."`

**Fix — `src/app/page.tsx`:**
- The end-user section (for-the-property-developer) gets `{...markerProps('end_user', card.end_user)}`

---

### Failure 13 — End-user outcomes: NOT EVIDENCED

**Spec value:** `"Consistent deal evaluation criteria remembered forever, instant RAG ratings in seconds, auto-generated professional Investment Memorandums, and faster, smarter investment decisions within 90 days."`

**Fix — `src/app/page.tsx`:**
- The end-user outcomes list gets `{...markerProps('end_user_outcomes', card.end_user_outcomes)}`

---

### PRE-HARD P2 — no named distributor archetype

Already covered by fixing `icp_partner_type` to "buyers-agent-firm" and adding the `distributor` marker with a named archetype value.

---

### PRE-HARD P3 — missing distributor, distributor_outcomes, data-why-now

- `distributor` marker: added to `partners/page.tsx`
- `distributor_outcomes` marker: added to `partners/page.tsx`
- `data-why-now`: new `why_now` section on `partners/page.tsx` using `markerProps('why_now', card.why_now)` with the statement "Property developers have never had consistent AI-powered deal assessment; buyers' agents spending hours on manual Finance Packs can now produce lender-ready packs in 10 minutes — this is the moment before the category hardens."

---

### DISTRIBUTION LOOP — REQUIRED

**Current state:** No shareable output surface producing acquisition path.

**Fix:**
- `src/app/share/[token]/page.tsx` — public (no-auth) shareable deal summary page with "Powered by DealFindrs — try it on your deals" CTA
- `src/app/api/share/route.ts` — POST to create share token; GET to retrieve
- `supabase/migrations/008_share_tokens.sql` — `share_tokens` table
- Share button wired on the opportunities page

---

### survey-manifest.json

**Fix:** Script in `next.config.js` `generateBuildId` phase or a dedicated `scripts/emit-survey-manifest.mjs` that calls `surveyManifest(["/", "/partners", "/reports"])` and writes `public/survey-manifest.json`. Routes listed: `/`, `/partners`, `/reports`, `/share/[token]` → only static routes can be listed, so `/`, `/partners`, `/reports`.

---

## Standards I must satisfy

| Rule ID | Rule statement | How this build meets it |
|---------|---------------|------------------------|
| **HARD: FIX SURVEY FAILURES** | All 13 failing fields + 2 PRE-HARD checks must pass | All 14 data-* markers planted via markerProps from card values. icp_partner_type uses named archetype "buyers-agent-firm". |
| **HARD: NO FAKE SUBMISSIONS** | Forms POST to real endpoints; no setTimeout fake-success | Partner form → `/api/partners/contact` (real DB). Share → `/api/share` (real DB). No setTimeout. |
| **HARD: VENDOR IDENTITY VIA ENV** | No hardcoded email/phone/company in source | All vendor strings read from env or not present. No new hardcoded vendor identity. |
| **HARD: SUPABASE NEW-TABLE TYPING** | New table inserts cast as `never` | `share_tokens` and `partner_inquiries` inserts use `.insert({...} as never)`. |
| **HARD: DISTINCT DISTRIBUTOR SURFACE** | `/partners` page structurally distinct from end-user sections | `/partners` is a separate page selling channel economics to buyers' agent firm owners. |
| **HARD: PLANT SURVEY MARKERS — ALL 14** | `markerProps` for all 14 fields + `why_now` | Implemented in `page.tsx` (promise/friction/end_user/end_user_outcomes/core_mechanism/icp_geography/icp_company_size/icp_stage/exclusions/icp_partner_type/icp_buyer_title) + `partners/page.tsx` (distributor/distributor_outcomes/icp_verticals/why_now). |
| **HARD: NAMED MARKERS** | Named fields carry archetype not category | `icp_partner_type="buyers-agent-firm"` (from spec), `icp_buyer_title="agency-owner"`, `distributor` and `end_user` carry full spec text slugs. |
| **HARD: CORE_MECHANISM on live surface** | data-core-mechanism on functional pipeline section | Planted on the assessment pipeline `<ol>` section (RAG→QS→Valuation→Feasibility→Finance Pack). |
| **HARD: EMIT survey-manifest.json** | `public/survey-manifest.json` listing routes with markers | Script `scripts/emit-survey-manifest.mjs` writes `{"routes": ["/", "/partners", "/reports"]}` to `public/`. Run at build time. |
| **HARD: LUCIDE ICONS** | Only icons from version 0.303.0 | Using only long-stable icons: ArrowRight, CheckCircle, Users, Building2, TrendingUp, Share2, Copy, FileText, etc. |
| **HARD: DISTRIBUTION LOOP** | Real share/referral surface | `src/app/share/[token]/page.tsx` — shareable deal summary. Real DB-backed tokens. Attribution CTA for new signups. |
| **HARD: LIVE-STATE ROUTES** | Cache-busting on live DB routes | `/api/share/route.ts` has `export const dynamic = 'force-dynamic'; export const revalidate = 0; export const fetchCache = 'force-no-store'`. |
| **R3 / §5 Explanatory header** | Every page answers what/do/matters | Share page has explanatory header. All existing pages already have them. |
| **R9 RLS** | New tables have RLS | `share_tokens` migration: RLS enabled, public SELECT on non-expired tokens, auth INSERT/DELETE by owner. |
| **R10 No verbatim Postgres errors** | Sanitise errors | All API routes log real error, return generic message. |
| **R11 No hardcoded vendor identity** | NEXT_PUBLIC_VENDOR_* | No new vendor strings hardcoded in source. |
| **R12 Public-API deny-by-default** | Share GET is intentionally public with justification | `/api/share?token=` has PUBLIC_ROUTES justification comment. |
| **R14 Sample artefact** | At least one sample before signup | `/reports` page is the sample; linked from landing. |

---

## File change summary

| File | Change type | Summary |
|------|-------------|---------|
| `src/lib/surveyMarkers.ts` | New | Copy from `_template/lib/surveyMarkers.ts` — the only way markers get planted. |
| `src/app/page.tsx` | Edit | Add markerProps for 11 fields: promise, friction, core_mechanism, icp_geography, icp_partner_type (named), icp_buyer_title, icp_company_size, icp_stage, exclusions, end_user, end_user_outcomes. Remove raw data-* attributes. |
| `src/app/partners/page.tsx` | Edit | Add markerProps for distributor, distributor_outcomes, icp_verticals, why_now. Remove generic data-icp-partner-type="reseller". |
| `src/app/share/[token]/page.tsx` | Edit/New | Public shareable deal summary. Distribution loop. Real token lookup. |
| `src/app/api/share/route.ts` | New | POST create share token; GET retrieve summary. Cache-busting exports. |
| `supabase/migrations/008_share_tokens.sql` | New | share_tokens table: idempotent, RLS, public SELECT on active tokens. |
| `scripts/emit-survey-manifest.mjs` | New | Writes public/survey-manifest.json listing /, /partners, /reports. |
| `public/survey-manifest.json` | New | Generated: `{"routes": ["/", "/partners", "/reports"]}` |
| `decisions.json` | New | Forks logged during build. |
| `design-plan.md` | Edit | This file (v3). |
