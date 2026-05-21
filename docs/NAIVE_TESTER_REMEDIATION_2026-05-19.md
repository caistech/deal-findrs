# Naive Tester Remediation Plan — DealFindrs

**Date:** 2026-05-19
**Tester report:** `C:\Users\denni\naive-tester-reports\2026-05-19-1711\deal-findrs.md`
**Persona:** Priya Naidoo, Sydney property development promoter, 18 yrs experience
**Reviewer goal:** "Decide if this saves me 3 days of manual DD per site"
**Repo:** `C:\Users\denni\PycharmProjects\DealFindrs`
**Deploy:** `https://deal-findrs.vercel.app`
**Risk tier:** REVENUE (per `CLAUDE.md`)

> Status: PLAN ONLY — no code changes made. Each item below carries a confirmed file path + line range from a repo audit, a proposed fix, and an effort/severity tag so they can be picked up and shipped in order. Where the report already says "needs reproduction", that uncertainty is preserved here.

---

## How to read this doc

Every finding has the same shape:

| Field | Meaning |
|---|---|
| **Symptom** | What Priya actually saw / wrote in the report |
| **Severity** | P0 (credibility-killer / blocks signup), P1 (visible UX bug, fix this sprint), P2 (polish / strategic) |
| **Repo evidence** | Exact file + line range where the bug lives, validated against the source on disk |
| **Root cause** | Why it's broken (not "what looks broken") |
| **Proposed fix** | The smallest correct change. Surgical edits per `CLAUDE.md` rules |
| **Effort** | XS (<30min), S (~1hr), M (~half-day), L (>half-day) |
| **Cross-cuts** | Other portfolio rules this satisfies (auth pattern, ABN-first, etc.) |

The sequenced remediation order is at the bottom (Section: "Sequenced Remediation Order").

---

## Finding 1 — Hero card uses US/Caribbean placeholder data on an AU-targeted product

**Severity:** P0 (credibility-killer — Priya called this out twice and used it as the basis for her "bet" that DealFindrs is overpriced)

**Symptom (verbatim):** *"I see 'Branscomb Rd Development · Unfunded — equity gap · Trinidad Roberts · 12.4%' on the hero. Branscomb Rd is in California. Trinidad Roberts is a US name… From a credibility standpoint, a screen full of US/Caribbean addresses on an AU promoter tool is a hard hit."*

**Repo evidence:** `src/app/page.tsx` lines 74–90.

```tsx
<div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
  <div className="w-4 h-4 rounded-full bg-emerald-500" />
  <span className="text-sm font-medium text-gray-800">Brisbane ADU Portfolio</span>
  <span className="ml-auto text-emerald-600 font-bold">28.5%</span>
</div>
<div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
  <div className="w-4 h-4 rounded-full bg-red-500" />
  <span className="text-sm font-medium text-gray-800">Branscomb Rd Development</span>
  <span className="ml-auto text-red-600 font-bold text-xs sm:text-sm">Unfunded — equity gap</span>
</div>
<div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
  <div className="w-4 h-4 rounded-full bg-red-500" />
  <span className="text-sm font-medium text-gray-800">Trinidad Roberts</span>
  <span className="ml-auto text-red-600 font-bold">12.4%</span>
</div>
```

**Root cause:** Hand-coded placeholder data left in the production hero. "Brisbane ADU Portfolio" is the only AU-credible card; the other two read as imported demo copy. There is no CMS / data feed driving this — it's just hard-coded JSX.

**Proposed fix (surgical edit, single file):**

1. Replace the three card entries in `src/app/page.tsx` lines 74–90 with three AU-credible examples that match Priya's wedge (NSW/QLD/VIC residential subdivisions):
   - GREEN: `North Lakes Stage 7 · 24-lot subdivision · 28.5%` (QLD growth corridor)
   - AMBER: `Schofields Battleaxe Split · 1→3 lots · 19.2% · DA risk` (NSW infill)
   - RED: `Box Hill 14-lot Stage A · 11.4% · sewer trunk required` (Hunter / Western Sydney)
2. Add a tiny `<span className="text-[10px] text-gray-500">Illustrative — anonymised real-deal patterns</span>` under the card stack so the demo doesn't read as live customer data (regulatory / vendor-confidentiality safety).
3. Also fix one related slip on **line 114**: `'DealFindrs submit opportunities, Promoters review and approve.'` — "DealFindrs submit opportunities" doesn't parse. Should read `'Analysts submit opportunities, Promoters review and approve.'`

**Effort:** XS

**Cross-cuts:**
- Reinforces the global Auth Pattern / Brand Pattern across the portfolio: don't ship a marketing page with foreign-market data on an AU product.
- Aligns with `feedback_auto_include_abn_mapbox.md` indirectly — the AU-property-platform identity must read consistent end-to-end.

---

## Finding 2 — `/features` link in top nav → 404 on the deployed site

**Severity:** P1 (broken nav on the second nav item, hits in first 30s of any visit; reputational)

**Symptom (verbatim):** *"Clicked Features. 404. The page could not be found… If a deal-vetting tool can't keep its own nav working, what's it going to do with my $1.2M offer file?"*

**Repo evidence:**
- `src/app/page.tsx` lines 17–20: the landing page passes `navItems={[{ href: '#features', label: 'Features' }, { href: '#pricing', label: 'Pricing' }]}` to `CorporateHeader`.
- `src/components/corporate/CorporateHeader.tsx` line 5: renders each nav item with `<Link href={item.href}>`.
- `src/app/` has no `features/` directory and no `app/features/page.tsx` route. `/features` therefore 404s under App Router.

**Root cause:** Two plausible mechanisms, both fixable:

1. **Pre-render / hover preview confusion.** Next.js' `<Link>` with `href="#features"` resolves to the *current path*, so on `/` it should render as `/#features` and scroll. But Priya reported hitting `404` after clicking. The most likely cause: the user previously navigated to `/pricing` or `/login`, then clicked the persistent header's "Features" link, which with `href="#features"` is treated as relative to the new page (`/login#features` → no `#features` anchor on that page → if hover-prefetch is enabled Next.js may treat `/login#features` as a static-route miss). Even on the home page, some Vercel deployments rewrite hash-only `Link` to absolute paths during static export when the consumer is `<Link>` rather than `<a>`. Reliable behaviour: use a real anchor for in-page jumps.
2. **No `/features` route exists**, so any direct visit to `/features` (e.g. bookmarks, search engine indexing of the link, hover-prefetch in dev) returns the App Router's default 404.

**Proposed fix (surgical, 2 files):**

1. In `src/app/page.tsx` lines 17–20, change the Features and Pricing nav items so in-page jumps use real anchor `<a>` tags, not `<Link>`. Easiest path: pass them with explicit page paths plus hash, e.g. `{ href: '/#features', label: 'Features' }` and `{ href: '/#pricing', label: 'Pricing' }`. Combined with item 2 below, this resolves both cases.
2. In `src/components/corporate/CorporateHeader.tsx` line 5, detect hash-only / `#`-containing `href` values and render them via a plain `<a>` rather than the injected `Link` component:
   ```tsx
   const isHashLink = item.href.startsWith('#') || item.href.includes('/#')
   const Anchor = isHashLink ? 'a' : Link
   ```
   This is a shared-component change — verify the other 4 portfolio consumers of `@caistech/corporate-components` (or its inlined sibling) before shipping. If `CorporateHeader.tsx` is a private copy in DealFindrs, the change stays local; if it's vendored from `@caistech/corporate-components` (it shouldn't be — it's at `src/components/corporate/`), update the hub package per the **@caistech shared-services first rule**.
3. As a belt-and-braces safety: add a thin `src/app/features/page.tsx` that simply redirects to `/#features`. Cost is ~5 lines; covers users who bookmark `/features` directly.

**Effort:** S

**Cross-cuts:**
- Same fix applies to `Pricing` (currently `#pricing`) — preemptively kill the same bug class.
- Verification per the Responsive Design Rule: test on mobile and laptop after fix (mobile nav uses the same `Link` element on line 5 of `CorporateHeader.tsx`).

---

## Finding 3 — Signup submit appears to silently fail

**Severity:** P0 (highest-bounce failure mode in B2B SaaS; Priya explicitly named this as such)

**Symptom (verbatim):** *"I filled all visible fields, clicked Create Account & Continue. No error toast, no redirect, no 'check your email' message… The browser environment I'm in was flaky and may have lost the password input mid-fill, so I'm not 100% sure this is a real bug, but the lack of any user-facing error response if a field is invalid is the bug regardless."*

**Repo evidence:** `src/app/signup/page.tsx` lines 30–124, plus the redirect chain into `/auth/callback`.

The form handler at line 30 (`handleSubmit`) does the following sequence:
1. Lines 35–46 — local validation (password match, password length, terms checkbox). Errors are set via `setError(...)` and surface in the red banner at line 147. **This path is correct.**
2. Lines 50–72 — `supabase.auth.signUp()` with `emailRedirectTo: ${window.location.origin}/auth/callback?next=/setup`.
3. Lines 74–78 — surfaces a `signUpError` if Supabase returns one. **Correct.**
4. Lines 83–89 — if `!signUpData.session` (i.e. email confirmation required by the Supabase project), it sets an info banner asking the user to check email and stops. **Correct.**
5. Lines 99–116 — fetches `/api/company/create` and surfaces an info-level recovery message + a "Continue to setup" CTA if it fails. **Correct.**
6. Lines 118–119 — pushes to `/setup` on success.

The handler *does* set state on every reachable error. So why did Priya see "no toast, no redirect"? Three plausible root causes, each separately fixable:

**(a) Supabase rate limit / email-service silent reject.** If the Supabase project's built-in email service is throttling magic-link / confirmation emails (per the global `feedback_no_plaintext_secrets.md` and the AUTH SMOKE-TEST rule), `supabase.auth.signUp()` may **return successfully without throwing** but never send the email. The handler then enters the `!signUpData.session` branch (line 83), sets the info banner *with `setInfo`*, and stops. **But:** the form sits at the top of the page (line 130 → `min-h-screen flex items-center`), and the info banner renders inside the form at line 153. If Priya was scrolled below the form, she would not see the banner. **Verification:** check the deployed Supabase project's SMTP configuration (custom Resend via `noreply@updates.corporateaisolutions.com` per the Email Infrastructure rule, NOT the built-in Supabase email service).

**(b) `/api/company/create` returns a non-2xx for a reason that gets swallowed before the info-banner renders.** Lines 105–116 *do* set an info banner on a non-`ok` response, but if the JSON parse on line 106 fails for an HTML error page, the error message field collapses to `undefined`, and the banner reads `Account created, but we couldn't set up your company yet: HTTP 500.` — which is a banner-visible message, just an ugly one. **Verification:** open browser devtools → Network tab → POST `/api/company/create` and inspect the response. The most likely 500-source is `requireAuth()` not finding a session cookie in Edge runtime if `@supabase/ssr` hasn't finished writing the cookie when the fetch fires immediately after `signUp()`.

**(c) The async `await supabase.auth.signUp()` is interrupted by an unhandled exception in a polyfill or by `setLoading` racing with React 18 concurrent rendering.** Lines 120–123 do have a `catch (err)` that calls `setError(...)`. If this branch fires after Priya already gave up and navigated away, she wouldn't see it. **This is unlikely to be the dominant cause but should be defended against.**

**Proposed fix (surgical, single file plus an infra check):**

1. **Auto-scroll to the message banner on state change.** Add a `useRef` to the form's top, and in a `useEffect([error, info])` call `ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })`. ~6 lines. Eliminates root-cause (a) by guaranteeing visibility.
2. **Make every reachable branch surface SOMETHING.** Audit lines 30–124: every code path either calls `setError`, `setInfo`, or routes. Add a guard at the very top of the `try { ... }` block: `setLoading(true); setError(null); setInfo(null);` — already done at lines 32–33 + 48 — and add a final `finally { setLoading(false) }` at line 123 so the spinner doesn't strand if an unexpected throw happens before line 117. Currently the `setLoading(false)` is only in the error paths.
3. **Log the silent-success-with-no-session case to the console for debugging.** Line 83's `if (!signUpData.session)` branch should also `console.warn('[signup] No session returned — email confirmation required. Check SMTP config.')` so dev-tools shows the actual reason. This is observability, not user-facing.
4. **Infra: verify the Supabase project's SMTP custom-config.** Per the global AUTH SMOKE-TEST rule, run `https://supabase.com/dashboard/project/<ref>/auth/templates` and confirm the sender is `noreply@updates.corporateaisolutions.com`. If it's still on the Supabase built-in email service, that is almost certainly the dominant root cause and overrides items 1–3 in priority.
5. **Smoke-test all four auth paths after the fix** (signup, login, forgot-password, magic-link) per the AUTH SMOKE-TEST contract.

**Effort:** S for the code (items 1–3); XS for the infra verification (item 4); S for the auth smoke test (item 5).

**Cross-cuts:**
- The AUTH SMOKE-TEST rule mandates this anyway on every memory save in active repos. DealFindrs is on the REVENUE-tier list.
- Email Infrastructure rule: from-address must be `noreply@updates.corporateaisolutions.com`. Verify before assuming code is broken.

---

## Finding 4 — Terms of Service and Privacy Policy links are `href="#"` (dead)

**Severity:** P0 for legal-defensibility (Priya correctly flagged this as unenforceable consent); P1 for UX

**Symptom (verbatim):** *"Terms of Service and Privacy Policy links point to `href='#'` — confirmed by reading the form HTML. They don't load anything. I have to tick a box agreeing to documents I cannot read."*

**Repo evidence:** `src/app/signup/page.tsx` line 326:

```tsx
I agree to the <a href="#" className="text-amber-600 hover:underline">Terms of Service</a> and <a href="#" className="text-amber-600 hover:underline">Privacy Policy</a>
```

No `src/app/terms/page.tsx`, no `src/app/privacy/page.tsx`, no `src/app/legal/` directory. The links are placeholders.

**Proposed fix (3 files):**

1. **Create `src/app/terms/page.tsx`** as a server component that renders a basic Terms of Service appropriate for a REVENUE-tier SaaS handling property-deal data. Until counsel-reviewed copy exists, use a clear interim ToS with a banner: *"Terms current as of 2026-05-19. Updated terms will be issued before any plan upgrade — current trial users are bound by this version."* This is materially better than a `#` link and is what the project actually has authority to commit to.
2. **Create `src/app/privacy/page.tsx`** with a privacy policy that names:
   - The controller (Corporate AI Solutions)
   - Data processors (Supabase Sydney, OpenAI, Stripe, ElevenLabs, Resend) — these are all confirmed from `CLAUDE.md` and `package.json`
   - Data classes collected (account info, company info, opportunity records, payment data)
   - Australian Privacy Principles compliance statement (the product is AU-targeted; this is non-optional)
   - Contact email for privacy requests
3. **Update `src/app/signup/page.tsx` line 326** to use `<Link>` (already imported on line 4) with real hrefs:
   ```tsx
   I agree to the <Link href="/terms" className="text-amber-600 hover:underline">Terms of Service</Link> and <Link href="/privacy" className="text-amber-600 hover:underline">Privacy Policy</Link>
   ```
4. **Also add /terms and /privacy to `src/components/corporate/CorporateFooter.tsx`** so they're discoverable from every page, not just signup. (Read `CorporateFooter.tsx` first to confirm shape — file already exists.)

**Effort:** M (the writing is the work, not the wiring). Two pages of ~300-500 words each plus the link wiring.

**Cross-cuts:**
- Triggers the AUTH PAGE PATTERN rule check — confirm Forgot Password + Magic Link + visibility toggle on every auth-related page (login already passes; signup needs Finding 5 fix).
- Triggers the UI EXPLANATORY HEADER RULE — both pages must open with what/why/who paragraphs.
- Responsive Design Rule: the rendered ToS/Privacy must be readable on 375px-wide viewport.

---

## Finding 5 — Confirm Password field has no visibility toggle

**Severity:** P1 (mandated by the global AUTH PAGE PATTERN rule — visibility toggle is required on EVERY password input, no exceptions)

**Symptom (verbatim):** *"Password visibility toggle is on the Password field but NOT the Confirm Password field. Asymmetric. If I can see what I typed in box 1, I should be able to see what I typed in box 2."*

**Repo evidence:** `src/app/signup/page.tsx` lines 303–314 (Confirm Password input). Compare with lines 281–300 (Password input, has toggle).

```tsx
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password *</label>
  <input
    type={showPassword ? 'text' : 'password'}
    ...
  />
</div>
```

Note: the Confirm field *already binds to `showPassword`* (line 305), so the visibility state IS shared — there's just no button to flip it from within the confirm-field's container. Easy fix.

**Proposed fix (one file, surgical):**

Mirror lines 281–300 onto lines 303–314: wrap the input in a `<div className="relative">`, add the same `<button type="button" onClick={() => setShowPassword(!showPassword)}>` with the `Eye`/`EyeOff` icon. Both buttons toggle the same `showPassword` state, so clicking either reveals/hides both — which is the correct behaviour (a user wants symmetric reveal).

Alternative consideration: some users want to reveal *only* the confirm field independently. Don't over-engineer — the report explicitly said "the eye-toggle is how you do that without having to retype", so a shared toggle solves the stated problem.

Also add `tabIndex={-1}` and `aria-label="Toggle password visibility"` to both toggle buttons (the existing toggle at line 293 is missing these per the AUTH PAGE PATTERN rule).

**Effort:** XS

**Cross-cuts:**
- AUTH PAGE PATTERN rule (NON-NEGOTIABLE) — this fix is mandatory not optional.
- Apply the same audit to `src/app/login/page.tsx` and `src/app/reset-password/page.tsx` while in the area — verify those pages also have the toggle on every password input. Per the auth pattern rule, this is bug-class triage, not scope creep.

---

## Finding 6 — No ABN lookup on signup (free-text company name in 2026)

**Severity:** P1 (mandatory under the global `feedback_auto_include_abn_mapbox.md` rule + Priya's #1 fixable opportunity)

**Symptom (verbatim):** *"No ABN field. I'm signing up as a Pty Ltd. Every legitimate Australian construction/development platform asks for ABN, validates it, and pulls the registered company name + GST status from the ABR. Asking me to type 'Naidoo Developments Pty Ltd' as free text in 2026 is the same UX as a contact form."*

**Repo evidence:**
- `src/app/signup/page.tsx` lines 212–220 — the Company Name field is a plain `<input type="text">` with no ABN linkage.
- `src/lib/abn.ts` — already has `validateAbn()` checksum validator + `formatAbn()` + `AbnLookupResult` type.
- `src/app/api/abn-lookup/route.ts` — already has a working `GET ?name=` (returns up to 8 matches) and `GET ?abn=` (returns full entity details from the ABR) endpoint.
- `src/app/onboarding/page.tsx` already uses ABN lookup (per `Grep` for `AbnLookup`).
- `src/app/api/company/create/route.ts` lines 35, 74, 95 — already accepts an optional `abn` in the request body and stores it on the `companies` table.

**The infra is fully in place. The signup page just doesn't use it.**

**Proposed fix (one file primarily):**

1. **Lift or build a shared `AbnLookupField` component** at `src/components/common/AbnLookupField.tsx` based on whatever the `onboarding` page uses (read `src/app/onboarding/page.tsx` first to see the existing pattern — do not reinvent). The component should:
   - Accept `value`, `onChange(abn, entityName, businessNames, gstStatus)`.
   - Debounce-call `/api/abn-lookup?name=...` as the user types (200ms).
   - Show up to 8 matches in a dropdown with entity name + state + ABN.
   - On selection, immediately call `/api/abn-lookup?abn=...` to get full details and emit them upward.
   - Use `validateAbn()` from `src/lib/abn.ts` as the local validator.
2. **In `src/app/signup/page.tsx`:** replace the Company Name input (lines 211–221) with the new `AbnLookupField` placed AT THE TOP of the form (Priya's exact suggestion — "as the FIRST input on signup"). Auto-populate `companyName` and `companyAddress` from the lookup result; leave them editable in case the user wants to override.
3. **Update `formData` shape** to include `abn` (line 16–28) and pass `abn` in the `/api/company/create` POST body on line 102 — the API already accepts it.
4. **Optional but recommended:** if `country !== 'Australia'`, hide the ABN lookup and show the free-text company-name input. This handles non-AU signups gracefully without forcing the ABN pattern globally.

**Effort:** M (component build + signup wiring + onboarding consistency check). If `onboarding/page.tsx` already has an extractable pattern, drop to S.

**Cross-cuts:**
- `feedback_auto_include_abn_mapbox.md` (NON-NEGOTIABLE) — any company/ABN field gets ABN lookup. No plain text inputs for these.
- @caistech-first rule: check if `@caistech/abn-lookup` or `@caistech/business-registry` (listed in `MEMORY.md`) already exports a React component before building one locally. If so, install and consume — do not rebuild.

---

## Finding 7 — Company Address is plain text (no Mapbox/Geoscape autocomplete)

**Severity:** P1 (same rule as Finding 6 — Mapbox autocomplete on every address field is mandatory)

**Symptom (verbatim):** *"Company address is a plain text input. No autocomplete, no Mapbox dropdown, no Geoscape verification… For a property platform this is jarring — I'd expect every address field on the site to be a typeahead validated against Geoscape G-NAF."*

**Repo evidence:**
- `src/app/signup/page.tsx` lines 223–232 — Company Address is `<input type="text">`.
- `src/components/common/AddressAutocomplete.tsx` already exists (per `Grep`).
- `src/lib/mapbox/geocode.ts` + `src/lib/mapbox/types.ts` already exist.
- `src/app/opportunities/new/page.tsx` already uses `AddressAutocomplete` (per `Grep`).

**Proposed fix (one file primarily):**

1. **Read `src/components/common/AddressAutocomplete.tsx`** to understand its API (props, emitted events).
2. **In `src/app/signup/page.tsx`:** replace lines 223–232 with the `AddressAutocomplete` component, wired to set `formData.companyAddress` and `formData.city` (and ideally `formData.country` if Mapbox returns it — defer that decision to whoever does the implementation).
3. **The `City` field on lines 234–245** becomes either redundant (auto-set from address) or stays as an override. Recommend keeping it editable but auto-populated.

**Effort:** S (component already exists; just wire it).

**Cross-cuts:**
- `feedback_auto_include_abn_mapbox.md` (NON-NEGOTIABLE).
- @caistech-first rule: `@caistech/corporate-components` reportedly exports an `address autocomplete` per MEMORY.md — verify the local `AddressAutocomplete.tsx` isn't a duplicate that should be replaced with the shared package.

---

## Finding 8 — Country dropdown leads with Trinidad/Guyana over India/Singapore/UAE for an AU product

**Severity:** P2 (signal of dev origin leaking into AU product; not a bug, but a credibility detail)

**Symptom (verbatim):** *"Trinidad and Guyana are in the top-tier list… for a product positioning as 'Australian property development promoters', Trinidad above India, Singapore, South Africa, UAE is an odd choice — those four are far more common locales for offshore Australian property buyers."*

**Repo evidence:** `src/app/signup/page.tsx` lines 253–262.

**Proposed fix (one file, surgical):**

Replace the hard-coded `<option>` list with the more credible AU-property-investor-locale ordering:

```tsx
<option>Australia</option>
<option>New Zealand</option>
<option>Singapore</option>
<option>United Kingdom</option>
<option>United States</option>
<option>Canada</option>
<option>India</option>
<option>UAE</option>
<option>South Africa</option>
<option>Other</option>
```

Drop Trinidad and Guyana from the top-tier dropdown. If genuinely needed for a Caribbean-market expansion later, surface them via an "Other → enter country" follow-up text input. Right now selecting "Other" does nothing (per the report).

**Also fix:** when `Other` is selected, show a follow-up `<input>` for the user to type their country. Currently this branch is dead.

**Effort:** XS

**Cross-cuts:**
- Reinforces the AU-targeting consistency narrative from Finding 1.

---

## Finding 9 — "RAG" used ambiguously in marketing copy (Red/Amber/Green vs Retrieval-Augmented Generation)

**Severity:** P2 (jargon-collision Priya called out; reads as marketing built without an AI-aware editor)

**Symptom (verbatim):** *"'Instant RAG Assessment' — using 'RAG' as a customer-facing acronym is a tell… RAG to me is 'Red Amber Green', which IS what they mean here from context, but the same acronym means 'Retrieval-Augmented Generation' in AI marketing, and the website uses BOTH meanings without distinguishing. Pick one."*

**Repo evidence:** `src/app/page.tsx` line 111: `'Instant RAG Assessment'`. Line 138: `'Instant RAG rating with action items'`. Tagline is "AI-Powered Deal Assessment" (line 42) — the same audience sees both meanings on the same page.

**Proposed fix (one file, surgical):**

Replace customer-facing instances of "RAG" with the spelled-out term:
- Line 111: `'Instant Green/Amber/Red Rating'`
- Line 138: `'Instant Green/Amber/Red rating with action items'`

Keep "RAG" only in internal docs / CLAUDE.md / API names where the audience is engineering.

**Effort:** XS

**Cross-cuts:**
- Reinforces audience-fit: the audience is property promoters, not ML engineers.

---

## Finding 10 — No SSO (Google / Microsoft OAuth) on login

**Severity:** P2 (omission for B2B SaaS; not a bug, a strategic UX gap)

**Symptom (verbatim):** *"No SSO / Google / Microsoft option — for a B2B SaaS targeting professional users, this is an omission. I have a dozen logins. One less password is one more reason to log in tomorrow."*

**Repo evidence:** Login page exists at `src/app/login/page.tsx` (per `ls`). Has email/password + magic-link per the report. No Supabase OAuth provider wiring.

**Proposed fix:**

1. Configure Google OAuth in the Supabase project's Auth → Providers panel (per the Supabase Dashboard References URL pattern).
2. Add a `signInWithOAuth({ provider: 'google' })` button to `src/app/login/page.tsx` and `src/app/signup/page.tsx`. Same for Microsoft if time permits — start with Google for the first cut (Priya's exact recommendation: "Even if just Google for the first cut").
3. Ensure the OAuth callback URL (`https://deal-findrs.vercel.app/auth/callback`) is in the Supabase Auth allowlist.

**Effort:** S (Google only) / M (Google + Microsoft).

**Cross-cuts:**
- AUTH SMOKE-TEST rule — re-run the four auth paths plus the new OAuth path after wiring.
- @caistech-first rule: check whether any `@caistech` package wraps Supabase OAuth (it shouldn't — Supabase's SDK is already minimal).

---

## Strategic Opportunities (out-of-scope for the bug-fix sprint, but worth capturing)

These are Priya's "Opportunity:" callouts and her closing strategic recommendations. They are not bugs — they are product-direction signals. Don't conflate them with the P0/P1 fixes above, but don't lose them either.

| # | Opportunity | Source | Priority for product roadmap |
|---|---|---|---|
| S1 | Replace hero card with one specific killer outcome: "Caught a 12m sewer easement on Lot 14, saved $40k abandoned DD" | Report line 26 | High (homepage hero conversion lever) |
| S2 | "See a sample assessment" / "See a sample IM" link on home page — static PDF demo | Report line 38 | High (the single biggest signup-bounce mitigant; "Right now the entire homepage is 'trust us' with no artifact") |
| S3 | Spell out the actual data sources on the pricing page (NSW Planning Portal · QLD Globe · VICMAP · Council DCPs · or "none, AI assessment only") | Report line 61 | Critical for credibility (separates $29/mo product from $99/mo product in Priya's mental model) |
| S4 | Embed a live read-only sample assessment of a famous AU site (Sydney Olympic Park, Westmead, Crown Sydney) on the homepage | Report line 100 | High — Priya: "THAT is what makes a promoter sign up" |
| S5 | Integrate NSW Planning Portal lodgement status into the assessment output | Report line 131 | Strategic (deep moat) |
| S6 | Council DA approval-rate scorecards | Report line 132 | Strategic |
| S7 | Sewer/water capacity overlay (Sydney Water + QU) | Report line 133 | Strategic (Priya's #1 stated value driver) |
| S8 | Biodiversity Values Map auto-lookup (NSW + VIC equivalents) | Report line 134 | Strategic |
| S9 | Deal abandonment register (anonymised reds, defensible moat after 6 mo) | Report line 135 | Strategic (long-term moat) |
| S10 | Bulk address import (CoreLogic CSV → overnight ranked assessments) | Report line 136 | Strategic (promoter workflow fit) |
| S11 | IM template chooser (single-asset / portfolio / co-investment / dev-fund) before generation | Report line 137 | Strategic (output quality) |
| S12 | Mobile-responsive walkthrough verification (Responsive Design Rule already applies) | Report line 138 | Mandatory per global rules — fold into Finding 2 verification step |

These should be triaged into the product backlog by Dennis/the project owner, not auto-implemented. Do not file these as bugs against the current sprint.

---

## Sequenced Remediation Order

Plan for one focused fix-up sprint. The order minimises rework and maximises signal-to-effort.

**Phase A — Same-day fixes (XS effort, P0 visibility):**
1. **Finding 1** — Replace US/Caribbean placeholder hero data with AU credibility cards + fix line 114 copy. (XS)
2. **Finding 9** — Spell out "RAG" → "Green/Amber/Red" in customer-facing copy. (XS)
3. **Finding 8** — Re-order country dropdown; wire "Other" follow-up. (XS)
4. **Finding 5** — Add visibility toggle to Confirm Password field; add `aria-label` and `tabIndex={-1}` to both toggles. (XS)

**Phase B — Half-day fixes (S effort, P0/P1 functional):**
5. **Finding 2** — Fix `/features` 404: shared-header hash-link handling + add fallback `/features` redirect page. Verify Pricing nav too. (S)
6. **Finding 3** — Signup silent-fail observability fixes (scroll-to-banner, console.warn on no-session branch, `finally { setLoading(false) }`); plus the AUTH SMOKE-TEST infra sweep (SMTP config verification on the deployed Supabase project). (S)
7. **Finding 7** — Wire `AddressAutocomplete` into the signup Company Address field. (S)

**Phase C — Half-day to day fixes (M effort, P1):**
8. **Finding 6** — ABN lookup on signup (build `AbnLookupField` if not extractable from `onboarding/page.tsx`; check `@caistech/business-registry` first per the shared-services rule). (M)
9. **Finding 4** — Create `/terms` and `/privacy` pages (interim copy clearly versioned); wire from signup page and `CorporateFooter`. (M)

**Phase D — Strategic (queued, not in this sprint):**
10. **Finding 10** — Google OAuth on login/signup. (S)
11. **Strategic Opportunities S1–S12** — triaged into product backlog by Dennis.

---

## Verification checklist (before claiming this remediation done)

Per the global CLAUDE.md rules:

- [ ] Each fix uses surgical edits per the Read:Edit ≥ 3:1 rule — read the file, related callers, and tests before editing.
- [ ] No "simplest fix" / "Phase 2" / "future work" language in commits.
- [ ] All four AUTH SMOKE-TEST paths green on the deployed site (signup, login, forgot-password, magic-link).
- [ ] Every UI surface touched has an explanatory header (UI EXPLANATORY HEADER RULE — applies to new `/terms` and `/privacy` pages).
- [ ] Every UI surface touched works at 375px wide AND 1440px wide (RESPONSIVE DESIGN RULE).
- [ ] Visibility toggle present on every password input across `login`, `signup`, `reset-password`, and any other auth surface in the app.
- [ ] T&C / Privacy links resolve to real pages, not `#`.
- [ ] No US/Caribbean placeholder data anywhere on AU-public-facing surfaces (grep for `Branscomb`, `Trinidad`, `Roberts`).
- [ ] ABN lookup populates Company Name + GST status on signup, and the value lands on the `companies.abn` column via `/api/company/create`.
- [ ] Mapbox autocomplete populates Company Address on signup.
- [ ] Supabase SMTP is custom-configured to `noreply@updates.corporateaisolutions.com` (Email Infrastructure rule).
- [ ] After all fixes, do a single end-to-end run-through as Priya: land on `/`, click Features (expect anchor scroll), click Pricing (expect anchor scroll), click Start Free Trial, fill signup form including ABN + address autocomplete, submit, follow confirmation email, land in `/setup`. If any step is silent or surprising, that step is not done.

---

## Files this plan would touch (read-before-edit checklist)

| File | Purpose | Findings touching it |
|---|---|---|
| `src/app/page.tsx` | Hero placeholder data + nav `href` fix + RAG copy | 1, 2, 9 |
| `src/components/corporate/CorporateHeader.tsx` | Hash-link rendering | 2 |
| `src/app/features/page.tsx` (NEW) | `/features` fallback redirect | 2 |
| `src/app/signup/page.tsx` | Silent-fail observability + ABN field + address autocomplete + visibility toggle + ToS link + country dropdown | 3, 4, 5, 6, 7, 8 |
| `src/components/common/AbnLookupField.tsx` (NEW or refactor of `onboarding` pattern) | Shared ABN lookup | 6 |
| `src/components/common/AddressAutocomplete.tsx` (EXISTING — read only) | Pattern reference | 7 |
| `src/app/onboarding/page.tsx` (READ ONLY for pattern extraction) | ABN-field pattern source | 6 |
| `src/app/terms/page.tsx` (NEW) | Terms of Service | 4 |
| `src/app/privacy/page.tsx` (NEW) | Privacy Policy | 4 |
| `src/components/corporate/CorporateFooter.tsx` (READ then EDIT) | Footer ToS/Privacy links | 4 |
| `src/app/login/page.tsx` | OAuth buttons + visibility-toggle audit | 5, 10 |
| `src/app/reset-password/page.tsx` | Visibility-toggle audit | 5 |
| `src/app/api/company/create/route.ts` (EXISTING — already accepts `abn`) | Verify abn passes through | 6 |
| `src/app/api/abn-lookup/route.ts` (EXISTING) | Verify endpoint healthy under load | 6 |
| Supabase Auth dashboard (INFRA, no file) | SMTP custom config + OAuth providers | 3, 10 |

Total: 8 files edited, 3 files newly created, 2 read-only references, 1 infra config touch.

---

## What this plan deliberately does NOT do

1. **Does not auto-fix anything.** No code has been touched. Each item is sized and located so the implementing session (human or Claude) can pick up Phase A and ship in an hour without re-reading the report.
2. **Does not commit to ToS / Privacy content** — the legal copy needs Dennis's sign-off or counsel review. The plan covers the wiring + interim placeholder content with a clear version banner.
3. **Does not address the strategic opportunities (S1–S12)** as bugs. Those are product-roadmap inputs, not sprint items.
4. **Does not modify global packages.** If `CorporateHeader.tsx` is a vendored copy of `@caistech/corporate-components`, the hash-link fix needs to go to the hub (per the @caistech-first rule), not the local copy. Confirm provenance before editing.
5. **Does not make assumptions about why signup silently failed in Priya's test environment.** Three plausible root causes are listed; the fix covers all three plus observability so the next failure surfaces itself.

---

End of plan.
---

## 2026-05-20 Re-sweep addendum (cheap-probe)

**Date:** 2026-05-20  
**Method:** automated HTTP probe (curl-equivalent) of root + 3 key routes (see `cais-shared-services/probe-roster-2026-05-20.json`)  
**Full portfolio brief:** `cais-shared-services/PORTFOLIO_NAIVE_RESWEEP_2026-05-20.md`

**Re-test result:** 🟡 AMBER

- Root: HTTP `200`
- Title: `DealFindrs | AI-Powered Project Assessment` (yes)
- Key routes resolving: **2/3**
- Broken: `/reports` (404)

**BYOK-ready determination:** **NO — persona findings + plumbing gaps still standing**

**What this re-test can and cannot say:**

- ✅ It confirms the URL plumbing reachable from a 2026-05-20 curl.
- ❌ It cannot verify the persona-level findings in this doc — copy quality, trust signals, CTAs that return 200 but go nowhere, RLS holes behind 200 auth pages.
- The persona findings above remain authoritative until each is individually re-tested.

<!-- /resweep-2026-05-20 -->
