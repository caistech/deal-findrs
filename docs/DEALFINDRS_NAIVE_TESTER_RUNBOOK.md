# DealFindrs — Naive-Tester Runbook (resolving the 45 unknowns)

**Goal:** turn the cockpit's 45 `(currently unknown)` checks into real `pass`/`fail`/`na`
verdicts in `readiness_results`, so deal-findrs's canonical score reflects evidence instead of
absence. Today it sits at an honest **0% / locked** because only 5 of 45 checks have verdicts
(P1/P2/P3 survey + 7/8 metadata).

**Facts this runbook assumes (verified earlier):**
- Repo: `C:\Users\denni\PycharmProjects\DealFindrs`  (folder is `DealFindrs`; slug is `deal-findrs`)
- Live URL: `https://deal-findrs.vercel.app/`
- product_slug in all DB rows: `deal-findrs`
- Shared Supabase project ref: `tfgtfhwvrswjvkyeyvsp`
- gate-check writer: `~/PycharmProjects/cais-shared-services/scripts/gate-check.mjs`
- The naive-tester skill writes NUMERIC codes (2, 22–25, 26–34, 41, …) — NOT VT_*.

**Who resolves which of the 45** (important — the naive-tester is NOT the only tool):
- **naive-tester skill** (Claude Code) → the human-observable + auth-walkthrough codes:
  2, 22, 23, 24, 25, 26, 27, 29, 31, 32, 33, 34, 41, and the A/B/C/D admin/user/auth/scaffold
  observations it can see from the UI.
- **run-test** (cockpit "Metadata" button) → codes 7, 8 (already done).
- **check-38** (`scripts/check-38-supabase.mjs`) → the Supabase HARD gate (RLS/migrations/no client key).
- **check-39** (`scripts/check-39-secrets.mjs`) → "No secrets in committed files" HARD gate.
- **vercel-env checker** (code 40) → "Vercel env vars sensitive, prod+preview only" HARD gate.
- **voice-auditor** → code 10 (voice agent) — or `na` if DealFindrs has no voice surface.

So a single naive-tester run will NOT clear all 8 HARD gates — three of them (Supabase, secrets,
Vercel env) are backend checks the persona explicitly cannot verify by clicking. Plan to run the
checkers too (Part 5).

---

## PART 1 — Provision a QA account (DO + VERIFY)

The naive-tester needs a **real, email-confirmed account** to walk the surfaces behind login
(the A-group admin portal, B-group user portal, C-group auth). Without it the run reports on the
public signup page only and the authed codes stay `unknown`.

The rubric already names the expected test identities (codes 40–41): a provisioned test user
`dennis@factory2key.com.au` and a **non-admin** test user blocked from `/admin`. So you likely
want TWO accounts to cover both A (admin) and B (non-admin user) groups:

1. **An admin/owner account** (to walk `/admin`, settings, sign-out-everywhere, delete-account).
2. **A non-admin account** (to verify B2 "User Blocked from /admin → 401/403").

### 1a. Create the accounts in Supabase (DO)
Supabase dashboard → project `tfgtfhwvrswjvkyeyvsp` → **Authentication → Users → Add user**:
- Email: e.g. `qa-owner@dealfindrs.test` (or a real inbox you control if email confirmation /
  magic-link / reset must actually be exercised — see the caveat below).
- Password: a strong one; store it in your password manager, NOT in the repo.
- **Tick "Auto Confirm User"** so it's email-confirmed immediately.
- Repeat for `qa-user@dealfindrs.test` (the non-admin).

**VERIFY — admin gating:** how does DealFindrs decide who is admin? Earlier rubric text referenced
an `ADMIN_EMAILS` env var (code 39 "Scaffold Admin Emails — both admins in ADMIN_EMAILS"). Check:
```powershell
Select-String -Path C:\Users\denni\PycharmProjects\DealFindrs\.env.local -Pattern "ADMIN_EMAILS"
```
- If admin is by `ADMIN_EMAILS`: add `qa-owner@dealfindrs.test` to it (locally AND in Vercel env
  for the prod deployment), redeploy, so that account actually reaches `/admin`.
- If admin is a `profiles.role` column or similar: set the QA owner's role to admin via SQL.

**VERIFY — real-inbox caveat:** codes C1/C3/C4 (signup email confirmation, forgot-password reset
email, magic-link) require the tester to RECEIVE an email. A `.test` address can't receive mail.
If you want those auth-email codes to pass (not just `na`), use a real inbox you can open during
the run (a Gmail alias like `you+dealfindrs-qa@gmail.com` works). Otherwise the tester will mark
the email-delivery steps `na`/`fail` honestly.

### 1b. Sanity-check the login works (DO)
Before automating, log in by hand at `https://deal-findrs.vercel.app/login` with the QA owner
creds. If the form rejects them, fix that first — the agent can only do what you can do.

---

## PART 2 — Write `docs/TESTING.md` (DO)

This is the file the naive-tester's ORCHESTRATOR reads to learn how to authenticate. (The persona
subagent still never reads product docs — TESTING.md is the documented exception, consumed by the
orchestrator, which then hands the method to the agent.)

Do NOT hardcode the password in this file if the repo is or may become public. Reference it as a
runtime input / env var. For a private single-operator repo you may inline it for speed, but
prefer the env pattern.

Create `C:\Users\denni\PycharmProjects\DealFindrs\docs\TESTING.md`:

```markdown
# DealFindrs — Automated-Tester Auth (naive-tester / QA)

Live URL: https://deal-findrs.vercel.app
Login page: https://deal-findrs.vercel.app/login

## QA accounts
- OWNER (admin): qa-owner@dealfindrs.test  — password supplied at runtime (env QA_OWNER_PASSWORD)
- USER (non-admin): qa-user@dealfindrs.test — password supplied at runtime (env QA_USER_PASSWORD)
Both are email-confirmed (auto-confirmed in Supabase). The owner is in ADMIN_EMAILS so /admin loads.

## Mode A — test the auth PATH (default)
Type the QA creds into the real /login form. This validates the auth UX (C-group codes) AND
lands a session. Always TYPE the creds — never DOM-inject (React controlled inputs ignore
injected values). Use the OWNER account for /admin + admin settings; use the USER account to
verify a non-admin is blocked from /admin (B2).

## Mode B — get PAST auth fast (deep surface testing)
Run scripts/qa-session.mjs (see below) to do a password grant and print the session cookie to
inject, skipping the form. Real session, real account, NO bypass. Use when the login form is
flaky and you want to reach authed surfaces quickly.

## Notes
- Auth provider: Supabase Auth (email/password + magic-link).
- A test auth-bypass route/flag must NEVER be built (critical vuln).
- After login, save/reload browser auth state so the /browse daemon cold-restart doesn't drop it.
```

**VERIFY** the lines that depend on DealFindrs reality before committing: the login path
(`/login`?), the auth provider, and the admin mechanism. Correct them to match the actual app.

---

## PART 3 — Add `scripts/qa-session.mjs` (RECOMMENDED — copy, don't reconstruct)

Mode B needs this helper. **Copy the canonical one** rather than hand-writing it (the cookie
format must match what `@supabase/ssr` expects, and the source of truth lives in shared-services):

```powershell
# 1. Confirm the canonical copy exists
Get-ChildItem C:\Users\denni\PycharmProjects\cais-shared-services\scripts\qa-session.mjs -ErrorAction SilentlyContinue

# 2. If it exists, copy it into DealFindrs
New-Item -ItemType Directory -Force -Path C:\Users\denni\PycharmProjects\DealFindrs\scripts | Out-Null
Copy-Item C:\Users\denni\PycharmProjects\cais-shared-services\scripts\qa-session.mjs `
          C:\Users\denni\PycharmProjects\DealFindrs\scripts\qa-session.mjs
```

If it does NOT exist in shared-services, skip Mode B for now and use Mode A only (typing the
login form). Mode A is the default anyway and also tests the auth path, which is what you want for
the C-group codes. Do not let me reconstruct qa-session.mjs from memory — the cookie name/format
is exactly the kind of detail that silently breaks ("login failed") if it's even slightly off.

---

## PART 4 — Run the naive-tester in Claude Code (DO)

**Run it in Claude Code, NOT opencode.** opencode looped with 0-toolcalls and wrote nothing last
time because it lacks the real `/browse` daemon + nested `Agent` support the skill requires.

1. Open Claude Code with the working directory at the **cais-shared-services** repo (that's where
   the `naive-tester` skill, `PRODUCT_STANDARDS.md`, and `gate-check.mjs` live):
   ```
   cd C:\Users\denni\PycharmProjects\cais-shared-services
   ```
2. Make the QA passwords available to the session as env vars (so they're not typed in chat):
   ```powershell
   $env:QA_OWNER_PASSWORD = "<owner password>"
   $env:QA_USER_PASSWORD  = "<user password>"
   ```
3. Invoke the skill. Give it the goal + the owner persona (Anneke fits a B2B property tool); the
   skill's `auto` mode also adds Returning Rachel for the auth-recovery path:
   ```
   /naive-tester https://deal-findrs.vercel.app/ "log in as the QA owner (creds per docs/TESTING.md), run a full deal assessment end-to-end, then visit settings, toggle notifications, and sign out; also try the forgot-password and magic-link flows" auto
   ```
4. When the orchestrator asks how to authenticate, point it at `docs/TESTING.md` and confirm it
   should use Mode A with the OWNER account (and the USER account for the "blocked from /admin"
   check). Watch it actually drive the browser — you should see `/browse` toolcalls and
   screenshots being saved, NOT a 0-toolcall loop. If it loops again, stop: `/browse` isn't wired
   in this Claude Code install, and that's the thing to fix before anything else.

**What it produces:** a report under `./naive-tester-reports/{timestamp}/`, a Standards Check
block, and — because a `product_slug` is known — it writes verdicts via:
```bash
node ~/PycharmProjects/cais-shared-services/scripts/gate-check.mjs \
  record-readiness deal-findrs --source naive-tester --file /tmp/readiness.json
```
You do NOT run gate-check yourself; the skill does it as its final step. Verdicts bind to the live
prod deployment automatically (so unlike your survey rows, these will be deployment-bound, not
"Unbound — provisional").

**Set expectations honestly:** the first run will produce a mix of `pass`, `fail`, and `na` — not
45 greens. Backend codes (Supabase/secrets/Vercel) won't be touched (that's Part 5). Email-
delivery codes are `na` unless you used a real inbox. A `fail` is a real finding, not a runbook
error — it's the gate doing its job.

---

## PART 5 — Resolve the backend HARD gates (DO)

Three of the 8 HARD blockers are backend checks the naive-tester can't see. Run the checkers you
already built and shipped to cais-shared-services:

```powershell
cd C:\Users\denni\PycharmProjects\cais-shared-services

# Code 38 — Supabase RLS / idempotent migrations / no client service-key
node scripts/check-38-supabase.mjs deal-findrs   # confirm the exact arg form by reading the file's top comment

# Code 39 — no secrets in committed files
node scripts/check-39-secrets.mjs deal-findrs
```
**VERIFY** each checker's exact CLI signature and how it records (does it call gate-check itself,
or write a JSON you then feed to gate-check?). Read the top-of-file usage comment before running —
you wrote these, so the contract is in the source.

- **Code 40 (Vercel env):** the `vercel-env.ts` checker lives in the cockpit; trigger it however
  it's wired (a route or a script) against deal-findrs's Vercel project
  `prj_B0pKJM1fTAD5FtbZudh4kUEhaqQM`.
- **Code 7/8 (metadata):** already passing. Re-run the cockpit "Metadata" button if the build
  changed.

---

## PART 6 — Recalculate and read the honest score (DO)

After the runs, verdicts are in `readiness_results`. Confirm what landed:
```sql
select check_code, status, source, deployment_id is not null as bound, scored_at
from readiness_results
where product_slug = 'deal-findrs'
order by scored_at desc;
```
You should see the numeric naive codes (source `naive-tester`), 38/39/40 (their sources), and
7/8 (auto). Then reload the cockpit detail page — the canonical scorer recomputes on read
(scanPortfolio → scoreCard), so the 45 unknowns shrink, the HARD-gate list contracts, and the
weighted score climbs by exactly the points the passed checks are worth.

**The GO/KILL moment:** once all applicable HARD checks pass AND the weighted score reaches the GO
band, `can_run_outreach_now` flips true and the button unlocks — earned, not faked. If it lands at
REDESIGN/NO-GO, that's a real signal about deal-findrs's readiness, not a bug.

---

## Notes / gotchas

- **`na` vs `unknown`:** checks that don't apply to deal-findrs (e.g. code 10 voice if there's no
  voice surface; auth codes if a surface genuinely doesn't exist) should be recorded `na` so they
  drop out of the denominator. The naive-tester records `na` for surfaces it confirms are absent.
  Until something records them, they stay `unknown` and depress the score — so part of "resolving
  the 45" is correctly marking the genuine N/As.
- **Run in Claude Code, never opencode** for the naive-tester (no `/browse` there).
- **Don't hardcode creds in committed files.** TESTING.md documents the method; passwords come
  from env / your password manager / runtime input.
- **Parked, not needed for this:** retire the `recalculate-score` route + dead
  `weighted_score_percent` column (cosmetic); the Step-5/6 tile→code contract for unwired tiles;
  deployment-scoped verdicts (the naive-tester path already binds deployment_id).
