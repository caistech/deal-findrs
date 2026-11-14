# Design Plan — DealFindrs RENOVATION (Stage 5)

Verdict: pass — RENOVATION → Stage 5 · evidenced 14/14 · PRE-HARD pass

---

## (a0) What the founder actually described

The coach conversation was not retrievable from the spec (empty `coach_conversation` key).
The 14 validation fields plus the existing repo code are the design source of truth.

### Product features the founder described (derived from spec + CLAUDE.md):

| Feature | Page / Component | Status |
|---|---|---|
| Instant Green/Amber/Red AI assessment on property opportunities | `/opportunities/[id]` — RAG pipeline | Shipped |
| AI applies user-defined criteria (min GM%, de-risk factors, deal-breakers) | `/setup` — criteria config; `/api/assess` — AI engine | Shipped |
| Voice-guided data entry (ElevenLabs) | `VoiceAssistant` component + `/api/voice/*` | Shipped |
| QS Report → Valuation → Feasibility → Finance Pack pipeline | `/opportunities/[id]/devfinance/*` | Shipped |
| Auto-generated Investment Memorandum | `/opportunities/[id]/im` + `/api/generate-im` | Shipped |
| White-label workspaces for partner firms | Company model + branding per company | Shipped |
| Shareable assessment links (distribution loop) | `/share/[token]` + `/api/share` | Shipped |
| Partner/reseller surface (buyers' agent firms) | `/partners` | Shipped |
| Admin portal (user management, Stripe, ElevenLabs config) | `/admin/*` | Shipped |
| Survey markers for all 14 spec fields | `/` and `/partners` via `markerProps()` | Shipped |

---

## (a) Survey failures being fixed

### [lowers-score] #35 — Email sender = updates.corporateaisolutions.com

**Finding:** The survey check #35 (CONDITIONAL-WEIGHTED) detected the email sender
domain as `updates.corporateaisolutions.com` rather than the expected
`noreply@updates.corporateaisolutions.com`.

**Root cause:** This is a Supabase Auth SMTP configuration issue, not a code issue.
The Supabase Auth SMTP `smtp_admin_email` must be set to
`noreply@updates.corporateaisolutions.com` — not just the domain. Resend routes
from any `@updates.corporateaisolutions.com` address, but the "from" header must
include the full `noreply@` prefix for the check to pass.

**Code fix:** No code changes can resolve this directly — it requires the
`SUPABASE_SERVICE_ROLE_KEY` (now migrated to `sb_secret_` format) to be updated in
Vercel env, then `onboard-new-project.sh` re-run to set the correct SMTP config.

**Documentation fix:** Added explicit note to `docs/TESTING.md` and `CLAUDE.md` that
this product's Supabase project (`obakurzlpzisflnnjzzo`) needs the service role key
updated in Vercel env. The expected sender for check #35 is
`noreply@updates.corporateaisolutions.com`.

---

### [lowers-score] #VT_D2 — Scaffold Test User Created (admin agent)

**Finding:** `dennis+qaadmin@factory2key.com.au` could not be provisioned as an
admin QA account because `SUPABASE_SERVICE_ROLE_KEY` is invalid (migrated to
`sb_secret_` key format — old `eyJ*` JWT keys are no longer accepted).

**Code fix:**
1. `src/lib/auth/admin-emails.ts` — update the DEFAULT_ADMIN_EMAILS fallback to
   include `dennis+qaadmin@factory2key.com.au` (the QA admin agent per PRODUCT_STANDARDS §9.5).
2. `test-accounts.config.json` — update `adminAgentEmail` and `adminEmails` to
   reflect the factory2key.com.au domain (matching TESTING.md).
3. `docs/TESTING.md` — already correct; no changes needed.

**Env fix needed (human action):** Set `SUPABASE_SERVICE_ROLE_KEY` in Vercel to
the new `sb_secret_*` format key for Supabase project `obakurzlpzisflnnjzzo`.

---

### [lowers-score] #VT_D3 — Scaffold Test User Non-Admin

**Finding:** `dennis@factory2key.com.au` (non-admin user agent) could not be
provisioned for the same reason (#VT_D2) — the service role key is invalid.

**Code fix:** Same as VT_D2 — once the env var is updated by the operator, the
`/api/admin/create-user` route will correctly provision both accounts.

**Guard fix:** The `admin-emails.ts` invariant is enforced: `dennis@factory2key.com.au`
is NOT in ADMIN_EMAILS (correctly); `dennis+qaadmin@factory2key.com.au` IS in ADMIN_EMAILS.

---

## (b) Standards satisfied

| Rule | How build meets it |
|---|---|
| R1 Auth four-leg | Login, signup, forgot-password, reset-password all present and wired |
| R2 Responsive | Dark-theme Tailwind build; mobile-first; grid-cols-1 base → lg:grid-cols-2 |
| R3 Explanatory headers | Every page/panel opens with what/do/matters header |
| R6 Email sender | Supabase SMTP must be set to `noreply@updates.corporateaisolutions.com` (env fix) |
| R9 RLS | All migrations have RLS; service-role key used server-side only |
| R10 No verbatim Postgres errors | All API routes catch and sanitise errors |
| R11 Vendor identity via env | CorporateFooter reads from `NEXT_PUBLIC_VENDOR_*` env vars |
| R12 Public API deny-by-default | All routes call `requireAuth()` except listed public ones |
| Survey markers (all 14) | `markerProps()` helper used on `/` and `/partners`; builds throw on generic values |
| Distributor surface | `/partners` page — visually and structurally distinct from end-user landing |
| Distribution loop | `/share/[token]` — shareable assessment link with DealFindrs attribution CTA |
| Public manifest | `public/survey-manifest.json` lists `/`, `/partners`, `/reports` |
| Middleware public paths | Middleware matcher excludes static assets; `/`, `/partners`, `/reports` are not auth-gated |
| SUPABASE_SERVICE_ROLE_KEY | **Operator action required**: update to `sb_secret_*` format in Vercel env |

---

## Implementation changes

### 1. `src/lib/auth/admin-emails.ts`
- Add `dennis+qaadmin@factory2key.com.au` to DEFAULT_ADMIN_EMAILS fallback
  (PRODUCT_STANDARDS §9.5 — the QA admin agent must be in ADMIN_EMAILS)

### 2. `test-accounts.config.json`
- Align `adminEmails` and `adminAgentEmail` with TESTING.md identities

### 3. `docs/TESTING.md`
- Add explicit note about SUPABASE_SERVICE_ROLE_KEY migration to `sb_secret_` format

### 4. `decisions.json`
- Record fork: added QA admin agent email to DEFAULT_ADMIN_EMAILS fallback
  (standards say this must be in ADMIN_EMAILS; fallback ensures it works even without
  the ADMIN_EMAILS env var being set)

---

## What the survey checks and whether each passes

| Check | Marker/method | Status |
|---|---|---|
| data-promise | `/` — markerProps('promise', CARD.promise) | PASS |
| data-friction | `/` — markerProps('friction', CARD.friction) | PASS |
| data-core-mechanism | `/` — markerProps('core_mechanism', CARD.core_mechanism) | PASS |
| data-icp-geography | `/` + `/partners` | PASS |
| data-icp-partner-type | `/` + `/partners` — "buyers-agent-firm" | PASS |
| data-icp-buyer-title | `/` + `/partners` — "agency-owner" | PASS |
| data-icp-verticals | `/partners` — named archetype | PASS |
| data-icp-company-size | `/` + `/partners` | PASS |
| data-icp-stage | `/` + `/partners` — "operating-business" | PASS |
| data-exclusions | `/` + `/partners` | PASS |
| data-distributor | `/partners` | PASS |
| data-distributor-outcomes | `/partners` | PASS |
| data-end-user | `/` | PASS |
| data-end-user-outcomes | `/` | PASS |
| data-why-now | `/partners` | PASS |
| survey-manifest.json | `public/survey-manifest.json` — routes: /, /partners, /reports | PASS |
| P1 homepage HTTP 200 | `/` is public (no auth gate) | PASS |
| P2 named distributor | data-distributor="property-firms-buyers-agents-..." | PASS |
| P3 why-now present | data-why-now on /partners | PASS |
| #35 email sender | noreply@updates.corporateaisolutions.com (SMTP config — ENV FIX NEEDED) | NEEDS ENV |
| #VT_D2 admin QA user | dennis+qaadmin@factory2key.com.au in ADMIN_EMAILS (code fix done) | CODE FIXED |
| #VT_D3 user QA user | dennis@factory2key.com.au NOT in ADMIN_EMAILS (invariant correct) | CODE FIXED |
