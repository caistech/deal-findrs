# DealFindrs — Design Plan (RENOVATION build)

**Verdict:** pass — RENOVATION → Stage 5 · evidenced 14/14 · PRE-HARD pass  
**Date:** 2026-06-08  

---

## A. Survey failures I am fixing

All 14 fields are evidenced (14/14). PRE-HARD P1–P3 all pass. P4 is informational only.  
The three BLOCKING failures and three lowers-score items are the work order.

### BLOCKING #11 — Voice package wrong + operator key client-side exposed

**What the survey found (against the prior live build):**  
`package.json` had `@11labs/client` (not `@caistech/elevenlabs-convai`).
Agent IDs were hand-set via `NEXT_PUBLIC_ELEVENLABS_AGENT_*` (not via `voice.config.ts`).
The operator ElevenLabs API key was exposed client-side via `NEXT_PUBLIC_ELEVENLABS_API_KEY`.

**Fix implemented in this build:**  
- Removed `@11labs/client` dependency from `package.json`.
- Added `@caistech/elevenlabs-convai` to `package.json` (the portfolio-standard hub package,
  installed via `@caistech` private GitHub registry in CI).
- `VoiceInput.tsx` rewritten — no longer imports `@11labs/client`. Uses the same
  server-side signed-URL + WebSocket pattern as `ElevenLabsConversational.tsx`, which
  was already compliant with the hub approach (signed URL from server, no client-side key).
- `voice.config.ts` already uses server-only env vars (`ELEVENLABS_AGENT_*`, never
  `NEXT_PUBLIC_ELEVENLABS_AGENT_*`). No change needed.
- `ELEVENLABS_API_KEY` already lives server-side only. No `NEXT_PUBLIC_ELEVENLABS_API_KEY`
  anywhere in the codebase. Confirmed by grep.

**Files changed:** `package.json`, `src/components/voice/VoiceInput.tsx`

---

### BLOCKING #16 — Identity client-supplied, not server-derived

**What the survey found (against the prior live build):**  
`user_id`/`company_id` were passed as client conversation metadata; webhooks read them
from `payload.metadata?.user_id`. VMS rule 9 requires identity be server-derived via
`conversation_id`.

**Fix: already in current codebase (verified):**  
- `ElevenLabsConversational.tsx`: no `user_id` or `company_id` in
  `conversation_initiation_client_data` (verified: lines 109–116).
- `VoiceInput.tsx` (after rewrite): no identity in `clientTools` or session overrides.
- `/api/voice/elevenlabs-connect/route.ts` (verified): creates a `voice_sessions` row with
  `user_id` bound server-side from `requireAuth()`. Returns `sessionToken` to the client.
- `/api/voice/bind-session/route.ts`: client posts `{ sessionToken, conversationId }` —
  server updates the `voice_sessions` row, binding `conversation_id` to the auth'd user.
- All 6 ElevenLabs webhooks (`/api/webhooks/elevenlabs/*/route.ts`): look up identity via
  `conversation_id` in `voice_sessions` table — never from `payload.metadata`.
- `voice_sessions` table exists (see `supabase/migrations/`).

**No additional code change needed** — already implemented. Survey was against prior build.

---

### BLOCKING #17 — ElevenLabs webhooks have no HMAC verification → 401

**What the survey found (against the prior live build):**  
No HMAC verification on any of the 6 ElevenLabs webhook handlers.

**Fix: already in current codebase (verified):**  
All 6 webhook routes already call `verifyElevenLabsWebhook(request)` as the FIRST step
before any JSON parse or DB write, returning 401 on failure and 403 if
`ELEVENLABS_WEBHOOK_SECRET` is not set (fail-closed).

- `src/lib/elevenlabs/webhook-verify.ts`: HMAC-SHA256 with `.trim()` on both sides,
  `crypto.timingSafeEqual`, timestamp age check (default 300s max-age).
- Confirmed via grep: all 6 routes import and call `verifyElevenLabsWebhook`.

**No additional code change needed** — already implemented. Survey was against prior build.

---

### lowers-score #35 — Email sender not `updates.corporateaisolutions.com`

**Fix:**  
Verified `RESEND_FROM_EMAIL=noreply@updates.corporateaisolutions.com` in `.env.example`.
No code change needed — this is a Vercel env/SMTP configuration item.

---

### lowers-score #37 — Feature pre-flight manifest + preflight run

**Fix: already done.**  
`feature-manifests/deal-findrs.json` exists and documents all required env vars,
Supabase tables, and external service dependencies with HMAC notes.

---

### lowers-score #VT_D2 / #VT_D3 — Test accounts cannot be provisioned

**Fix:** Operator config — `SUPABASE_SERVICE_ROLE_KEY` must be updated in Vercel to the
`sb_secret_` format. `test-accounts.config.json` is already correct. No source code change.

---

## B. Standards I must satisfy

| Rule | Requirement | How this build meets it |
|------|-------------|-------------------------|
| **R1** | Auth four-leg pattern | Existing auth pages implement all four legs. No regression. |
| **R2** | Responsive 375–1440px | Tailwind-based responsive layout retained throughout. |
| **R3** | Explanatory header on every page | All pages have explanatory headers. No regression. |
| **R6** | Email sender is verified Resend subdomain | `.env.example` documents `RESEND_FROM_EMAIL`. |
| **R7** | `@caistech` first | Replacing `@11labs/client` with `@caistech/elevenlabs-convai` hub package. |
| **R9** | RLS no USING(true) | No new tables with open policies. `voice_sessions` has user-scoped policy. |
| **R10** | No verbatim Postgres errors | All API routes return sanitised errors. |
| **R11** | No hardcoded vendor identity | Vendor identity flows via `NEXT_PUBLIC_VENDOR_*` env vars. |
| **R12** | Public API deny-by-default | Webhooks auth'd via HMAC. All data routes use `requireAuth`. |
| **HARD: BYOK** | Operator key server-only | `ELEVENLABS_API_KEY` server-only, no `NEXT_PUBLIC_` exposure. |
| **HARD: VMS rule 9** | Identity server-derived (conversation_id) | Session binding via `voice_sessions` table + `bind-session` endpoint. |
| **HARD: VMS rule 10** | Every webhook verifies HMAC (.trim), unverified → 401 | All 6 ElevenLabs webhooks call `verifyElevenLabsWebhook()`. |
| **HARD: No fake submissions** | Forms POST to real server endpoints | `/api/partners/contact` is a real route. No setTimeout fakes. |
| **HARD: Survey markers 14+why_now** | All via `markerProps` from card values | Planted on `/` and `/partners`. `public/survey-manifest.json` lists both. |
| **HARD: Distinct distributor surface** | `/partners` page visually/structurally distinct | Full standalone `/partners` page with own copy, form, and channel economics. |
| **HARD: Distribution loop** | Share surface turns output into acquisition | `/share/[token]` page with "Try for Your Deals" CTA. `/api/share` is a real route. |
| **HARD: Cache-busting on live-state routes** | `force-dynamic` + `revalidate=0` + `force-no-store` | Present on all 6 webhook routes, voice API, and share API routes. |
| **HARD: CORE_MECHANISM on functional surface** | Marker on live assessment pipeline | Planted on the assessment pipeline section in `page.tsx`. |

---

## C. Build summary (changes in this RENOVATION)

1. **`package.json`** — removed `@11labs/client`, added `@caistech/elevenlabs-convai`
2. **`src/components/voice/VoiceInput.tsx`** — rewritten to use signed-URL WebSocket
   (same pattern as `ElevenLabsConversational.tsx`) — no `@11labs/client` import
3. **`decisions.json`** — forks documented (see file)

### Already-compliant items confirmed by code audit (no change needed)
- All 6 ElevenLabs webhook routes: HMAC verification present
- `voice.config.ts`: server-only env vars, no `NEXT_PUBLIC_*`
- `ElevenLabsConversational.tsx`: no client-side key exposure, no user_id in metadata
- `/api/voice/elevenlabs-connect/route.ts`: server-side identity binding
- `voice_sessions` table: exists in migrations
- `public/survey-manifest.json`: lists `/`, `/partners`, `/reports`
- `feature-manifests/deal-findrs.json`: complete
- `/share/[token]/page.tsx` + `/api/share/route.ts`: distribution loop, real endpoints
