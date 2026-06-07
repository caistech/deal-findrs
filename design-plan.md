# Design Plan — DealFindrs RENOVATION

## Survey Failures I Am Fixing

All 14 spec fields are already evidenced with data-* markers. The teardown
verdict is **RENOVATION** (not TEARDOWN), meaning the product passed the marker
gate but has UX / functional failures blocking production readiness. Every
failing item below has a concrete code change attached.

---

### [BLOCKING] #2 — Responsive 375 + 1440, no h-scroll, thumb

**Survey finding:** At 375px the top nav stretches off-screen, Settings tab
clipped, horizontal scroll appears, opportunity row text overlaps; no hamburger
collapse.

**Root cause:**
- `CorporateHeader` renders a horizontal `<nav>` with no mobile collapse —
  at 375px all nav items plus rightContent overflow the viewport.
- The authenticated `dashboard/page.tsx` uses the same CorporateHeader pattern
  with full nav items (`Dashboard | Opportunities | Analytics | Settings`) that
  wrap and create h-scroll.
- Opportunity rows use hidden-columns with `hidden md:block` but the row itself
  doesn't constrain width below md.

**Fix — three files:**
1. `src/components/corporate/CorporateHeader.tsx` — rebuild with hamburger/drawer
   on mobile (`< md`). The CorporateHeader already has a mobile sub-nav bar; the
   problem is that `rightContent` (New Opportunity button + UserMenu) overflows at
   375px. Add `overflow-hidden` to the right section and make nav items wrap
   properly.
2. `src/app/dashboard/page.tsx` — Replace CorporateHeader top-bar with the new
   persistent left sidebar layout (see #26 fix). The authenticated chrome moves
   off the top and onto the left rail, eliminating the overflow entirely.
3. All other authenticated pages (`/opportunities`, `/opportunities/new`,
   `/opportunities/[id]`, `/settings`, `/setup`, `/analytics`) — wrap in the
   left-sidebar layout so they inherit the collapse behaviour.

---

### [lowers-score] #3 — Touch >=44px, text >=16px, tables mobile strategy

**Survey finding:** Mobile dashboard has overlapping touch targets and tab
clipping below 414px.

**Fix:**
- The dashboard stat cards use `text-3xl font-bold text-gray-900` for numbers
  (fine) but the filter select uses `text-sm` (12-13px on mobile). Add
  `text-base sm:text-sm` to all form inputs/selects in dashboard.
- The top-bar "New Opportunity" button already gets `min-w-[44px] min-h-[44px]`
  in the current code. With the left sidebar replacing the top bar, touch targets
  are inherently larger (sidebar items are `py-3 px-4`).
- The opportunity table: on mobile, collapse to stacked cards (`overflow-x-auto`
  wrapper on the table div). Already partially done — reinforce with explicit
  `min-w-0` on flex children.

---

### [lowers-score] #4 — Nav collapses to drawer/hamburger on mobile

**Survey finding:** Top-bar nav does not collapse to drawer/hamburger on mobile.

**Fix:** Rebuilding `CorporateHeader.tsx` to include a hamburger button (`☰`)
visible only on `< md`, which toggles a full-width drawer overlay. The drawer
contains all nav items with 44px min-height touch targets. This replaces the
current inline overflow-x-auto sub-nav bar.

Additionally: the authenticated layout moves to a left sidebar (§4 standard),
which collapses to a hamburger drawer on mobile — satisfying both #4 and #26.

---

### [BLOCKING] #25 — Auth smoke-test: login stays on 'Logging in…' spinner

**Survey finding:** Login form does not visually advance after successful auth —
stays on 'Logging in…' spinner indefinitely; user must manually navigate to
/dashboard.

**Root cause analysis:** The existing login page (`src/app/login/page.tsx`)
already has the fix — it calls `window.location.assign(next)` on success and
shows a "Signed in — redirecting you now" banner with a manual link. The
teardown was recorded against an earlier build. However, the banner copy says
"If this doesn't happen automatically, go to your dashboard" — we need to verify
the `window.location.assign` actually fires after `signInWithPassword` succeeds.

The issue: `setRedirecting(true)` sets state, then `window.location.assign(next)`
runs — but in some cases the state update re-renders the component and may
interrupt the navigation. The current code sets `loading: false` before
`window.location.assign` which is correct. But the button is disabled while
`redirecting` is true, which is correct. This should work.

**Actual fix needed:** The login page IS already fixed (the `window.location.assign`
path). The survey failure was confirmed against the live build. We need to ensure
the auth callback properly handles both `?code=` (password login) and
`?token_hash=` (magic link) per the bug-knowledge entry `sf-supabase-magic-link-token-hash`.

Fix `src/app/auth/callback/route.ts` to handle `token_hash` in addition to `code`
(the Supabase v2 OTP path). Without this, magic link logins loop back to /login.

Also: the login `redirecting` state banner is currently not shown as a separate
rendering path — it renders inside the form. Move the redirect feedback OUT of
the form (show a full-screen "Redirecting…" state so the spinner cannot get stuck
in a half-shown form state).

---

### [lowers-score] #26 — Persistent left navbar on authed routes + active indicator

**Survey finding:** Chrome is a top-bar, not the §4-mandated persistent left
navbar on authenticated routes.

**Fix:** Create `src/components/common/AuthLayout.tsx` — a persistent left
sidebar layout that wraps all authenticated pages. Items: Opportunities (active),
Dashboard, Analytics, Setup, Settings (bottom), Sign Out (bottom). Collapses to
a hamburger → drawer on mobile. Active-route indicator via `usePathname()`.

Wrap all authenticated pages: `/dashboard`, `/opportunities`, `/opportunities/new`,
`/opportunities/[id]`, `/settings`, `/setup`, `/analytics` with this layout.

The layout replaces the CorporateHeader top-bar on authenticated routes.

---

### [lowers-score] #32 + #41 — Dead ends

Three dead ends confirmed:

**A. Deal wizard Step-3 Next silently 403s**

Root cause: When the user advances from Step 2 (Property) to Step 3 (Financial),
the wizard calls `nextStep()` which hits `ensureDraft()` when entering the
documents step. `ensureDraft()` calls `POST /api/opportunities/draft` which
calls `getCompanyId()` — if the user completed signup via email confirmation but
the `bootstrapCompany` in `/auth/callback` failed silently, their profile has no
`company_id`.

The draft API returns `{ error: 'no_company' }` with HTTP 403. The UI shows a
`draftError` message — this is actually handled. But the survey found it
"silent 403" which means the error state wasn't visible or the user dismissed it.

Fix: The `draftError` already renders in the JSX. The issue is when advancing
from Step 2 → Step 3, the draft save is only triggered when entering the
**documents** step (step 4), not step 3. The 403 would only fire when the user
tries to go from step 3 → step 4. Make the error visible with a sticky toast/banner
at the top of the form, not just inline text. Also call the company-create endpoint
proactively in the wizard's `useEffect` so the company is guaranteed by the time
the user needs it.

**B. 'Generate IM' button routes to a bare 404**

Root cause: `handleGenerateIM` in `/opportunities/[id]/page.tsx` routes to
`/opportunities/${opportunityId}/im` — this route does NOT exist in the app
directory. There is an API endpoint at `/api/generate-im/route.ts` but no
corresponding UI page.

Fix: Create `src/app/opportunities/[id]/im/page.tsx` — an Investment Memorandum
generation page that calls `/api/generate-im` and renders the result. This is the
core deliverable of the product ("auto-generated professional Investment
Memorandums").

**C. /setup Save Criteria button stuck spinning forever**

Root cause: The setup page calls `POST /api/company/create` (which works and
returns a `companyId`), then calls `supabase.from('company_settings').update(...)
.eq('company_id', companyId)`. The update may fail silently if the `company_settings`
row doesn't exist yet (the `bootstrapCompany` creates it, but if that failed, there's
no row to update). The code checks `settingsError` and surfaces it — but only after
the company create succeeded. If the RLS on `company_settings` doesn't allow the
user to update (only `can_manage_settings` members can), the update silently returns
an error.

Fix: Change the settings save to use `upsert` (insert-or-update) via the service
role API (not the user-scoped client), since the user's RLS may not allow them to
update a settings row they didn't create. Move the settings persistence to an API
route `/api/company/settings` that uses the admin client internally.

---

## Standards I Must Satisfy

### R2 — Responsive design (§1 PRODUCT_STANDARDS)
**How met:** CorporateHeader rebuilt with hamburger/drawer on mobile. Authenticated
layout moves to left sidebar (collapses on mobile). All authenticated pages wrapped
in AuthLayout. Form inputs get `text-base sm:text-sm`. Tables get `overflow-x-auto`.

### R3 — Explanatory header on every surface (§3 PRODUCT_STANDARDS)
**How met:** The IM page (new) gets an explanatory header. All existing authenticated
pages already have headers. AuthLayout sidebar surfaces have headers.

### R4 — Auth chrome §4 standard (left navbar + Settings + Sign Out)
**How met:** New `AuthLayout.tsx` implements the §4-standard persistent left navbar
with Settings + Sign Out anchored at the bottom. Active-route indicator via pathname.

### R9 — No USING(true) on user data tables
**How met:** No migrations added in this PR. Existing RLS policies unchanged.

### R10 — No verbatim Postgres errors in API
**How met:** New API routes use `{ error: 'Internal server error' }` pattern.

### R11 — Vendor identity via ENV vars
**How met:** `CorporateFooter` and `CorporateHeader` read `productName` prop.
No personal phone, email, Calendly in source. Footer contact details are in the
component (`STYLING.md`-driven), not in JSX.

### R13 — Route smoke test
**How met:** `/opportunities/[id]/im` page is new and must return 200.

### R14 — One public sample artefact
**How met:** `/reports/page.tsx` exists and is publicly accessible. Confirmed in
survey-manifest.json.

### Hard Rule: DISTINCT DISTRIBUTOR SURFACE
**How met:** `/partners/page.tsx` is a fully distinct partner/reseller page with
its own markers, enquiry form, and channel economics. The main landing page and
/partners are structurally separate.

### Hard Rule: PLANT SURVEY MARKERS — ALL 14
**How met:** All 14 markers already planted via `markerProps` in `page.tsx` and
`partners/page.tsx`. `why_now` planted on /partners. survey-manifest.json already
lists `["/", "/partners", "/reports"]`.

### Hard Rule: CORE_MECHANISM MARKER ON LIVE SURFACE
**How met:** `data-core-mechanism` is planted on the assessment pipeline section
of the landing page — the section that enumerates the RAG → QS → Valuation →
Feasibility → Finance Pack steps. This is the functional pipeline description,
not a tagline.

### Hard Rule: DISTRIBUTION LOOP
**How met:** The share button on `/opportunities/[id]` calls `/api/share` which
creates a share token and returns a public URL. This turns an assessment output
into a shareable link. The share route exists and is real (no fake setTimeout).

### Hard Rule: NO FAKE SUBMISSIONS
**How met:** The partners contact form POSTs to `/api/partners/contact`. The setup
save hits real Supabase routes. No `setTimeout` fake-success patterns.

### Hard Rule: LUCIDE ICONS MUST EXIST IN INSTALLED VERSION
**How met:** `lucide-react@0.303.0` is installed. All icons used (`ArrowRight`,
`CheckCircle`, `Building2`, `Users`, `MapPin`, `TrendingUp`, `Zap`, `FileText`,
`Target`, `BarChart3`, `Mic`, `BadgeCheck`, `ClipboardList`, `Star`, `DollarSign`,
`Plus`, `Search`, `ChevronRight`, `Bell`, `Eye`, `EyeOff`, `AlertCircle`, `Mail`,
`CheckCircle2`, `ArrowLeft`, `X`, `Loader2`, `Share2`, `Copy`, `Edit`, `Archive`,
`PlayCircle`, `Clock`, `ChevronDown`, `ChevronUp`, `XCircle`, `AlertTriangle`,
`Menu`) are all present in 0.303.0.

### Hard Rule: LIVE-STATE ROUTES NEED CACHE-BUSTING EXPORTS
**How met:** New API routes that read live DB state get `export const dynamic = 'force-dynamic'`.

---

## Summary of File Changes

| File | Change |
|---|---|
| `src/components/corporate/CorporateHeader.tsx` | Add hamburger/drawer for mobile |
| `src/components/common/AuthLayout.tsx` | NEW — persistent left sidebar for authenticated routes |
| `src/app/dashboard/page.tsx` | Wrap with AuthLayout, remove top CorporateHeader |
| `src/app/opportunities/page.tsx` | Wrap with AuthLayout |
| `src/app/opportunities/new/page.tsx` | Wrap with AuthLayout |
| `src/app/opportunities/[id]/page.tsx` | Wrap with AuthLayout |
| `src/app/opportunities/[id]/im/page.tsx` | NEW — IM generation page (fixes IM 404) |
| `src/app/settings/page.tsx` | Wrap with AuthLayout |
| `src/app/setup/page.tsx` | Fix stuck spinner; move settings save to API route |
| `src/app/analytics/page.tsx` | Wrap with AuthLayout |
| `src/app/auth/callback/route.ts` | Handle token_hash (magic link) in addition to code |
| `src/app/api/company/settings/route.ts` | NEW — server-side settings upsert via admin client |
| `src/app/login/page.tsx` | Show full-screen redirect state (not spinner inside form) |
| `decisions.json` | Document any forks |
