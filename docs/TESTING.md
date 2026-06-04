# DealFindrs — Automated-Tester Auth (naive-tester / validation / qa)

Live URL:      https://deal-findrs.vercel.app
Supabase proj: tfgtfhwvrswjvkyeyvsp
Vercel proj:   prj_B0pKJM1fTAD5FtbZudh4kUEhaqQM
Auth:          Supabase Auth (email/password + magic-link)        # VERIFY against the app
Admin gating:  ADMIN_EMAILS allowlist, checked at /auth callback  # VERIFY (§8.5)

## Routes (VERIFY each against the live app)
- User auth:   /login        → product UI
- Admin auth:  /admin/login   → /admin control panel
- Reset:       /password-reset  and  /admin/password-reset
- Auth callback: /auth/callback  (allowlist localhost + this preview)

## Identities (PRODUCT_STANDARDS.md §9.5)
| Role            | Email                              | In ADMIN_EMAILS? | Password env       | Drives                       |
|-----------------|------------------------------------|------------------|--------------------|------------------------------|
| ADMIN agent     | dennis+qaadmin@factory2key.com.au  | YES              | QA_OWNER_PASSWORD  | VT_A1–VT_A4                   |
| USER agent      | dennis@factory2key.com.au          | NO               | QA_USER_PASSWORD   | VT_B1–VT_B5 (incl. VT_B2)    |

Operator admins (BY HAND only — NEVER handed to the agent):
  dennis@corporateaisolutions.com, mcmdennis@gmail.com

## INVARIANT
  ADMIN agent ∈ ADMIN_EMAILS ; dennis@factory2key.com.au ∉ ADMIN_EMAILS.
  Confirm: Select-String -Path .\.env.local -Pattern "ADMIN_EMAILS"

## DESTRUCTIVE-ACTION DENYLIST — the agent MUST NOT invoke these
VT_A5 (Sign Out Everywhere) and VT_A6 (Delete Account) are OPERATOR-VERIFIED, not agent-run.
The agent must NEVER click any control labelled (case-insensitive, incl. near-variants):
  "Delete account" / "Delete my account" / "Close account" / "Remove account"
  "Sign out everywhere" / "Sign out of all sessions" / "Sign out all devices" / "Revoke all sessions"
If a goal prompt says "test everything", these two are the explicit exception.
Dennis walks them by hand and records VT_A5/VT_A6 (source: operator) — not left unknown.

Agent admin scope: VT_A1–VT_A4 ONLY (Portal Access, Settings Profile, Settings Password,
Settings Notifications). Agent user scope: VT_B1–VT_B5.

## Mode A — test the auth PATH (default)
TYPE creds into the real form (never DOM-inject — React controlled inputs ignore injected values).
- ADMIN agent → /admin/login → VT_A1–A4.
- USER agent  → /login → VT_B1, confirm /admin/* refused (VT_B2), VT_B3–B5.

## Mode B — get PAST auth fast
Use the shared minter — DO NOT fork/reconstruct (cookie format is version-matched to the repo's
@supabase/ssr: base64- for >=0.5, URL-encoded JSON for <0.5; mismatch = silent "login failed").
  Copy-Item ..\cais-shared-services\scripts\qa-session.mjs .\scripts\qa-session.mjs
  node scripts\qa-session.mjs --email <identity> --supabase-url <URL> --service-role-key <KEY>
  # magic-link-only surfaces: add --magic-link

## Email-delivery (VT_C1 signup-confirm, VT_C3 reset, VT_C4 magic-link)
Read links from a dedicated API-readable QA mailbox, NEVER the operator's personal inbox. The
plus-alias delivers to Dennis's real factory2key mailbox. Sender =
noreply@updates.corporateaisolutions.com (only Resend-verified subdomain).

## Hard rules
- NO route/flag may skip auth — a test bypass is a critical vulnerability.
- Preview behind Vercel deployment protection needs a Protection-Bypass-for-Automation token.
- After login, save/reload browser auth state so a /browse daemon cold-restart doesn't drop it.