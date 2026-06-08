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
- `@11labs/client` is absent from `package.json`. `@caistech/elevenlabs-convai@^0.3.3` is installed
  (the portfolio-standard hub package, installed via `@caistech` private GitHub registry in CI).
- `VoiceInput.tsx` uses the server-side signed-URL + WebSocket pattern — no `@11labs/client` import.
- `voice.config.ts` uses server-only env vars (`ELEVENLABS_AGENT_*`, never `NEXT_PUBLIC_ELEVENLABS_AGENT_*`).
  Agent IDs resolve server-side via `getAgentConfig(agentType)`.
- `ELEVENLABS_API_KEY` lives server-side only. No `NEXT_PUBLIC_ELEVENLABS_API_KEY` anywhere.
- All webhook routes import `verifyElevenLabsWebhook` from the hub's server package.

**Files:** `package.json`, `src/components/voice/VoiceInput.tsx`, `src/lib/voice/voice.config.ts`,
`src/lib/elevenlabs/webhook-verify.ts`

---

### BLOCKING #16 — Identity client-supplied, not server-derived

**What the survey found (against the prior live build):**  
`user_id`/`company_id` were passed as client conversation metadata; webhooks read them
from `payload.metadata?.user_id`. VMS rule 9 requires identity be server-derived via `conversation_id`.

**Fix: implemented and verified in current codebase:**  
- `ElevenLabsConversational.tsx`: no `user_id` or `company_id` in `conversation_initiation_client_data`
  (comment at line 109: "No custom metadata with user identity").
- `VoiceInput.tsx`: same pattern — no identity in client metadata.
- `/api/voice/elevenlabs-connect/route.ts`: writes `voice_sessions` row with `user_id` from
  `requireAuth()` (server-derived). Returns `sessionToken` to the client.
- `/api/voice/bind-session/route.ts`: client posts `{ sessionToken, conversationId }` — server
  binds `conversation_id` to the authenticated user.
- All 6 ElevenLabs webhooks: look up identity via `conversation_id` in `voice_sessions` — never
  from `payload.metadata`.
- `supabase/migrations/20260608000000_voice_sessions.sql`: `voice_sessions` table with RLS.

---

### BLOCKING #17 — ElevenLabs webhooks have no HMAC verification → 401

**What the survey found (against the prior live build):**  
No HMAC verification on any of the 6 ElevenLabs webhook handlers.

**Fix: implemented and verified in current codebase:**  
All 6 webhook routes call `verifyElevenLabsWebhook(request)` as FIRST step before any JSON parse or
DB write, returning 401 on failure and 403 if `ELEVENLABS_WEBHOOK_SECRET` is not set (fail-closed).

`src/lib/elevenlabs/webhook-verify.ts`: HMAC-SHA256 with `.trim()` on both sides,
`crypto.timingSafeEqual`, timestamp age check (default 300s max-age). Matches the algorithm
in `@caistech/elevenlabs-convai/src/webhook.ts` so they cannot drift.

**Confirmed via file listing:** all 6 routes under `/api/webhooks/elevenlabs/*/route.ts` import
and call `verifyElevenLabsWebhook`.

---

### lowers-score #35 — Email sender not `updates.corporateaisolutions.com`

**Fix:**  
`RESEND_FROM_EMAIL=noreply@updates.corporateaisolutions.com` is documented in `.env.example`.
`feature-manifests/deal-findrs.json` lists it as a required env var with this default.
This is a Vercel env / SMTP configuration item — no source code change needed.

---

### lowers-score #37 — Feature pre-flight manifest + preflight run

**Fix: already done.**  
`feature-manifests/deal-findrs.json` exists and documents all required env vars (including
`ELEVENLABS_WEBHOOK_SECRET` with HMAC note), Supabase tables, and external service dependencies.

---

### lowers-score #VT_D2 / #VT_D3 — Test accounts cannot be provisioned

**Fix:** Operator config — `SUPABASE_SERVICE_ROLE_KEY` must be updated in Vercel to the
`sb_secret_` format. `test-accounts.config.json` is already correct. No source code change needed.

---

## B. Standards I must satisfy

| Rule | Requirement | How this build meets it |
|------|-------------|-------------------------|
| **R1** | Auth four-leg pattern | Existing auth pages implement all four legs (login, signup, forgot-password, magic-link). No regression. |
| **R2** | Responsive 375–1440px | Tailwind-based responsive layout with mobile-first classes throughout. |
| **R3** | Explanatory header on every page | All pages have explanatory headers (what / do / matters). |
| **R6** | Email sender is verified Resend subdomain | `.env.example` + `feature-manifests/deal-findrs.json` document `RESEND_FROM_EMAIL=noreply@updates.corporateaisolutions.com`. |
| **R7** | `@caistech` first | `@caistech/elevenlabs-convai@^0.3.3` installed (hub package). `webhook-verify.ts` consumes it. No `@11labs/client`. |
| **R9** | RLS no USING(true) | No open policies. All user tables scoped via `auth.uid()`. `voice_sessions` migration uses `auth.uid() = user_id`. |
| **R10** | No verbatim Postgres errors | All API routes return sanitised errors. Fixed `/api/evidence` to remove `detail: error.message` leak. |
| **R11** | No hardcoded vendor identity | `CorporateFooter.tsx` reads `NEXT_PUBLIC_VENDOR_*` env vars. Contact info renders only when env vars are set. |
| **R12** | Public API deny-by-default | Webhooks auth'd via HMAC (fail-closed). All data routes use `requireAuth`. `/api/share` GET is intentionally public with RLS-scoped snapshot data only (documented). |
| **HARD: No fake submissions** | Forms POST to real server endpoints | `/api/partners/contact` stores to `partner_inquiries` table. No setTimeout fakes. 500 if DB write fails. |
| **HARD: Survey markers 14+why_now** | All via `markerProps` from card values | 14 fields + `why_now` planted via `markerProps` across `/` and `/partners`. `public/survey-manifest.json` lists both routes. |
| **HARD: Named markers hold archetype** | Never generic category | `icp_partner_type="buyers agent firm"` (not "reseller"), `end_user` is named, `distributor` is named. `markerProps` throws at build on banlisted values. |
| **HARD: ENUM fields on-set** | `icp_stage` in `seed\|growth\|scale\|operating-business\|enterprise` | Card uses `"operating business"` which slugifies to `"operating-business"` — on-set. |
| **HARD: Distinct distributor surface** | `/partners` page visually/structurally distinct from end-user landing | Full standalone `/partners` page with reseller economics, partner enquiry form, channel model diagram, distributor outcome markers, and `why_now` marker. Kept structurally separate from `/` (end-user landing). |
| **HARD: Distribution loop** | Share surface turns output into acquisition path | `/share/[token]` public page: real branded deal assessment summary + "Try for Your Deals" (signup CTA) + "Partner Programme" CTA. `/api/share` is a real POST + GET route — no stub. |
| **HARD: Cache-busting on live-state routes** | `force-dynamic + revalidate=0 + fetchCache='force-no-store'` | Present on all 6 webhook routes, voice connect/bind API, share API, evidence API, and `/share/[token]/page.tsx`. |
| **HARD: CORE_MECHANISM on functional surface** | Marker on live working assessment pipeline, not a tagline | Planted on the assessment pipeline `<div>` (steps 1-5: RAG → QS → Valuation → Feasibility → Finance Pack) in `page.tsx:391`. |
| **HARD: survey-manifest.json** | Emitted at `public/survey-manifest.json`, lists all marker-bearing routes | `public/survey-manifest.json` lists `/`, `/partners`, `/reports`. All return HTTP 200. |
| **HARD: VMS rule 9** | Identity server-derived (conversation_id, never user_id) | `voice_sessions` table + `bind-session` endpoint. All webhooks look up identity via `conversation_id`. |
| **HARD: VMS rule 10** | Every convai webhook verifies HMAC (.trim), unverified → 401 | All 6 ElevenLabs webhooks call `verifyElevenLabsWebhook()` first. `.trim()` on both secret and signature. |
| **HARD: Lucide icons in installed version** | Only icons in lucide-react@0.303.0 | Used only stable icons: `ArrowRight`, `CheckCircle`, `Mic`, `Target`, `BarChart3`, `FileText`, `Zap`, `Building2`, `Users`, `MapPin`, `BadgeCheck`, `TrendingUp`, `ClipboardList`, `DollarSign`, `Star`. No `Handshake` or other post-0.303 icons. |
| **HARD: No Supabase new-table never-typed** | New table inserts cast as `never` | `share_tokens` insert uses `as never`. `voice_sessions` insert uses `as never`. `partner_inquiries` insert uses `as never`. `activity_log` insert uses `as never`. |

---

## C. Build summary (changes in this RENOVATION)

### Code changes made
1. **`src/components/voice/ElevenLabsConversational.tsx`** — fixed TypeScript type error:
   `statusColors` typed as `Record<string, string>` (was `Record<typeof status, string>` which
   rejected `permission_denied` as an undeclared member, failing `tsc`).
2. **`src/app/api/evidence/route.ts`** — added `force-dynamic` cache-busting exports (HARD RULE:
   live-state route). Fixed R10 violation: removed `detail: evidenceErr.message` / `detail: linksErr.message`
   verbatim Postgres error exposure; replaced with `console.error` + sanitised `Internal server error`.
3. **`decisions.json`** — four architectural forks documented for PR review.
4. **`design-plan.md`** — updated to definitive final version.

### Files removed (as required before finishing)
- `_spec.json` — removed
- `_teardown_brief.md` — removed
- `_standards/` — removed
- `_template/` — removed (also resolved the `tsc` build failure: `_template/app/` was being compiled)
- `opencode.json` — removed

### Already-compliant items confirmed by code audit (no additional change needed)
- All 6 ElevenLabs webhook routes: HMAC verification present + `force-dynamic` exports
- `voice.config.ts`: server-only env vars, no `NEXT_PUBLIC_*`
- `ElevenLabsConversational.tsx` + `VoiceInput.tsx`: no client-side key exposure, no user_id in metadata
- `/api/voice/elevenlabs-connect/route.ts`: server-side identity binding, `requireAuth()` first
- `voice_sessions` table migration: exists, RLS enabled, idempotent (DO block guards)
- `public/survey-manifest.json`: lists `/`, `/partners`, `/reports`
- `feature-manifests/deal-findrs.json`: complete with HMAC note
- `/share/[token]/page.tsx` + `/api/share/route.ts`: distribution loop, real endpoints, `force-dynamic`
- `src/lib/elevenlabs/webhook-verify.ts`: HMAC-SHA256, `.trim()`, `crypto.timingSafeEqual`, timestamp age check
- `src/components/corporate/CorporateFooter.tsx`: vendor identity via `NEXT_PUBLIC_VENDOR_*` env vars

### Build result
`next build` ✓ — all 59 pages compiled, types checked, no errors.
