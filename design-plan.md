# DealFindrs — Design Plan (RENOVATION build)

**Verdict:** pass — RENOVATION → Stage 5 · evidenced 14/14 · PRE-HARD pass  
**Date:** 2026-06-08  

---

## A. Survey failures I am fixing

All 14 fields were already evidenced (14/14). PRE-HARD P1–P3 all pass. P4 is
informational only.  
The three BLOCKING failures and three lowers-score items are the work order.

### BLOCKING #11 — Voice package wrong + operator key client-side exposed

**What the survey found:**  
`package.json` has `@11labs/client` (not `@caistech/elevenlabs-convai`).
Agent IDs are hand-set via `NEXT_PUBLIC_ELEVENLABS_AGENT_*` (not via
`voice.config.ts`). The operator ElevenLabs API key is exposed client-side in
`ElevenLabsConversational.tsx:79` via `NEXT_PUBLIC_ELEVENLABS_API_KEY`. That is
neither BYOK nor secret-safe.

**Fix:**  
- Remove the `@11labs/client` dependency and the hand-rolled WebSocket voice
  component (`ElevenLabsConversational.tsx`).  
- Replace with `@caistech/elevenlabs-convai` (server) + `VoiceWidget` from its
  `/react` sub-path (client), which is the portfolio-standard hub.  
- BYOK: ElevenLabs key lives in `ELEVENLABS_API_KEY` (server-only env var).
  The `/api/voice/elevenlabs-connect` route already calls the API server-side
  and returns a signed URL — keep that route, remove the client-side key call.  
- Agent IDs scaffold into `voice.config.ts` via the VMS wizard pattern. For
  this product (no hub wizard access at build time), declare them in
  `src/lib/voice/voice.config.ts` as named exports read by the server route —
  never as `NEXT_PUBLIC_*` vars.  
- The VoiceWidget degrade-don't-fake: shows a text fallback if no mic (spec §6).

**Files changed:**  
`package.json`, `src/components/voice/ElevenLabsConversational.tsx` (replaced),
`src/lib/voice/voice.config.ts` (new), `src/app/api/voice/elevenlabs-connect/route.ts`
(reads from voice.config instead of env key), `src/app/dashboard/page.tsx` (or
wherever VoiceWidget is mounted in chrome).

---

### BLOCKING #16 — Identity client-supplied, not server-derived

**What the survey found:**  
`ConversationMetadata` passes `user_id`/`company_id` as client conversation
metadata, readable in webhooks as `payload.metadata?.user_id`. VMS rule 9
requires server-side session-derived binding: tools should send `conversation_id`,
never `user_id`. Tenant-ID spoofing risk.

**Fix:**  
- Remove `user_id` and `company_id` from the `ConversationMetadata` interface
  and from all callers.  
- The server-side `/api/voice/elevenlabs-connect` route already receives the
  auth'd user (via `requireAuth`). It generates a short-lived `session_token`
  (signed HMAC of `user_id + conversation_id + timestamp`, stored in a new
  `voice_sessions` table with a 30-min TTL), and returns that token alongside
  the signed URL. The client passes only `session_token` (not `user_id`) in the
  `conversation_initiation_client_data`.  
- The ElevenLabs webhooks (`POST /api/webhooks/elevenlabs/*`) resolve the real
  `user_id`/`company_id` by looking up `session_token` in `voice_sessions`
  (server-side, not from the webhook payload metadata). Any webhook without a
  valid/unexpired `session_token` returns 401.  
- `conversation_id` is what ElevenLabs passes in the webhook — that is the
  server-derived identity binding.

**Files changed:**  
`src/components/voice/ElevenLabsConversational.tsx`, `src/app/api/voice/elevenlabs-connect/route.ts`,
all 6 webhook routes under `src/app/api/webhooks/elevenlabs/*/route.ts`,
new migration `supabase/migrations/YYYYMMDD_voice_sessions.sql`.

---

### BLOCKING #17 — ElevenLabs webhooks have no HMAC verification → 401

**What the survey found:**  
None of the 6 ElevenLabs webhook handlers (`/api/webhooks/elevenlabs/{setup,
opportunity-basics, opportunity-property, opportunity-financial,
opportunity-derisk, assessment}`) verify the ElevenLabs HMAC signature.
Only Stripe has a webhook secret. Anyone with the URL can forge transcripts.
VMS rule 10: unverified → 401.

**Fix:**  
Each webhook handler (before any DB write or JSON parse side-effects):
1. Read `x-elevenlabs-signature` header.
2. Read raw request body as bytes.
3. Compute `HMAC-SHA256(ELEVENLABS_WEBHOOK_SECRET, rawBody)`.
4. `.trim()` both signatures before comparison.
5. Use `crypto.timingSafeEqual` — reject with 401 if mismatch.
6. If `ELEVENLABS_WEBHOOK_SECRET` env is not set, log an error and return 403
   (fail-closed, never open).

This applies to all 6 webhook routes. The HMAC secret is captured once at
webhook creation in ElevenLabs and stored in `ELEVENLABS_WEBHOOK_SECRET`
(server-only, never `NEXT_PUBLIC_*`).

**Files changed:**  
All 6 `src/app/api/webhooks/elevenlabs/*/route.ts`.

---

### lowers-score #35 — Email sender not `updates.corporateaisolutions.com`

**What the survey found:**  
`#35 Email sender = updates.corporateaisolutions.com` is listed as a
lowers-score item. This means the env var or SMTP config may not be correctly
set. 

**Fix:**  
Verify `RESEND_FROM_EMAIL=noreply@updates.corporateaisolutions.com` is set in
`.env.example`. The Supabase SMTP is already configured per standard (R6). No
code change needed — this is an env/deploy-config check.

---

### lowers-score #37 — Feature pre-flight manifest + preflight run

**What the survey found:**  
No `feature-manifests/<slug>.json` exists and `feature-preflight.mjs` has not
been run.

**Fix:**  
Create `feature-manifests/deal-findrs.json` documenting required env vars,
Supabase tables, and external service dependencies for this product's voice and
billing features.

---

### lowers-score #VT_D2 / #VT_D3 — Test accounts cannot be provisioned

**What the survey found:**  
SUPABASE_SERVICE_ROLE_KEY is invalid/disabled (project migrated to `sb_secret_`
keys). QA accounts could not be provisioned.

**Fix:**  
This is an operator config issue (env var must be updated in Vercel). Code fix:
ensure `test-accounts.config.json` references the correct emails and the
`SUPABASE_SERVICE_ROLE_KEY` format check in scripts is correct. No source-code
change needed beyond ensuring the env-example clearly calls for the `sb_secret_`
key format.

---

## B. Standards I must satisfy

| Rule | Requirement | How this build meets it |
|------|-------------|-------------------------|
| **R1** | Auth four-leg pattern | Existing auth pages already implement all four legs (signup/login/forgot/magic-link). No regression. |
| **R2** | Responsive 375–1440px | Existing Tailwind-based responsive layout retained. No regression. |
| **R3** | Explanatory header on every page | All pages already have explanatory headers. No regression. |
| **R6** | Email sender is verified Resend subdomain | Verified in `.env.example`. No code change. |
| **R7** | @caistech first | Replacing `@11labs/client` custom impl with `@caistech/elevenlabs-convai` hub package. |
| **R9** | RLS no USING(true) | No new tables with open policies. `voice_sessions` has scoped policy. |
| **R10** | No verbatim Postgres errors in API responses | All webhook routes return sanitised errors. |
| **R11** | No hardcoded vendor identity | All vendor identity flows via `NEXT_PUBLIC_VENDOR_*` env vars. |
| **R12** | Public API deny-by-default | Webhooks are authenticated via HMAC (fix #17). All data routes use `requireAuth`. |
| **HARD: BYOK** | Voice agent runs on user's ElevenLabs key, not operator's | Fix #11 removes `NEXT_PUBLIC_ELEVENLABS_API_KEY`. Server-side key only. |
| **HARD: VMS rule 9** | Identity server-derived (conversation_id, never user_id) | Fix #16 replaces client metadata with server-derived session_token. |
| **HARD: VMS rule 10** | Every convai webhook verifies HMAC (.trim), unverified → 401 | Fix #17 adds HMAC verification to all 6 webhooks. |
| **HARD: No fake submissions** | Forms POST to real server endpoint | Already compliant (`/api/partners/contact` is real). |
| **HARD: Survey markers 14+why_now** | All planted via `markerProps` from card values | Already in place on `/` and `/partners`. Manifest lists both. |
| **HARD: Distinct distributor surface** | `/partners` page exists, visually and structurally distinct | `/partners` page fully implemented with separate copy, form, and economics section. |
| **HARD: Distribution loop** | Share/referral surface that turns output into acquisition | `/share/[token]` route exists. Verify it's functional and linked from output. |
| **HARD: Cache-busting on live-state routes** | `force-dynamic` + `revalidate=0` + `force-no-store` | Added to all webhook and voice API routes that read live DB state. |
| **HARD: CORE_MECHANISM on functional surface** | Marker on live assessment pipeline | Already planted on the assessment pipeline section in `page.tsx`. |

---

## C. Build summary (what changes)

1. **`package.json`** — remove `@11labs/client`, add `@caistech/elevenlabs-convai`
2. **`src/lib/voice/voice.config.ts`** — new: agent ID config (not `NEXT_PUBLIC_*`)
3. **`src/components/voice/ElevenLabsConversational.tsx`** — replaced with hub VoiceWidget wrapper
4. **`src/app/api/voice/elevenlabs-connect/route.ts`** — add `requireAuth`, generate `session_token`, return it with signed URL
5. **`supabase/migrations/YYYYMMDD_voice_sessions.sql`** — new table: `voice_sessions(id, user_id, company_id, conversation_id, session_token, expires_at)`
6. **All 6 `src/app/api/webhooks/elevenlabs/*/route.ts`** — add HMAC verification before any processing
7. **`feature-manifests/deal-findrs.json`** — new pre-flight manifest
8. **`.env.example`** — add `ELEVENLABS_WEBHOOK_SECRET`, remove `NEXT_PUBLIC_ELEVENLABS_API_KEY`, add `ELEVENLABS_API_KEY` (server-only)
