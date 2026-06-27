# DealFindrs

> A property-development opportunity-assessment app for promoters and development-finance teams: capture a deal, run an adversarial feasibility engine over it, and get a Green/Amber/Red verdict with the reasoning, evidence trail, and an exportable finance pack.
> Part of the Corporate AI Solutions portfolio · consumes Operator Core: `@caistech/property-services-sdk`, `@caistech/elevenlabs-convai`, `@caistech/platform-trust-middleware`, `@caistech/corporate-components`, `@caistech/sayfix-embed` (and `@caistech/portfolio-gate` in dev).

**Status:** Building   ·   **License:** Source-available — public for inspection; not currently open-licensed for reuse.   ·   **Live deployment:** https://deal-findrs.vercel.app

## What this is (and isn't)

- **Real and runnable today:**
  - **Auth** — Supabase email/password, magic-link, forgot/reset-password, and an `/auth/callback` flow (login, signup, admin login).
  - **Opportunities** — create / draft / list / detail of property deals (`/opportunities`, `/api/opportunities`).
  - **Adversarial feasibility engine** — a deterministic three-test gate (loan-to-cost, evidenced sale value, margin-after-forced-contingency) producing a RAG verdict, with an LLM lender-persona reviewer layered on top and a deterministic fallback when no LLM is configured (`src/lib/feasibility/`, `/api/assess`). Covered by the Branscombe-V6 regression suite (`src/lib/feasibility/__tests__/`).
  - **DevFinance pipeline** — QS → Valuation → Feasibility → Affordable-gap → Finance Pack, generated in dependency order (`/api/devfinance/*`, `src/lib/devfinance/`).
  - **Evidence** — file upload to Supabase Storage tied to an opportunity (`/api/evidence`).
  - **Voice capture** — ElevenLabs Conversational AI agents for guided data entry, with HMAC-verified webhooks (`/api/voice`, `/api/webhooks/elevenlabs/*`).
  - **Billing** — Stripe checkout, customer portal, and signature-verified webhooks (`/api/stripe/*`).
  - **Teams & admin** — company create / invite / join, an admin area for users, Stripe and ElevenLabs setup.
  - **IM / sharing** — investment-memorandum generation and token-based share links (`/api/generate-im`, `/api/share`).
- **Stubbed / in progress:**
  - **Analytics** (`/analytics`) — KPI tiles render but the charts are placeholders ("More Analytics Coming Soon").
  - **Criteria setup UI** (`/setup`) — per-company feasibility thresholds are not yet editable from the UI (the engine reads defaults / the `feasibility_criteria` table directly).
  - **Phase-2 substrate wiring** — auto-extracting purchase price / valuation from uploaded PDFs (`@caistech/cert-extractor`), the open-obligations panel (`@caistech/coordination-sdk`), and evidence-chasing nudges (`@caistech/nudge-core`) are planned, not yet wired.
- **Not in this repo (by design):** the property-intelligence substrate — **property-services / `@caistech/property-services-sdk`** — is **private**. This repo consumes it through a thin re-export shim (`src/lib/property-services/index.ts`); the address-to-property derivation/assessment logic lives in that private package, not here. The other `@caistech/*` dependencies are likewise published to a private GitHub Packages registry.

## Run it yourself

1. `git clone https://github.com/caistech/deal-findrs.git && cd deal-findrs`
2. `cp .env.example .env.local` and fill in, at minimum, the Supabase keys needed to boot:
   - `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from your Supabase project's API settings.
   - `SUPABASE_SERVICE_ROLE_KEY` — Supabase project API settings (server-only; never expose client-side).
   - For full functionality you'll also need: `NEXT_PUBLIC_PROPERTY_SERVICES_URL` + `NEXT_PUBLIC_PROPERTY_SERVICES_ANON_KEY` (the private property-services backend), `DATAWIZZ_API_KEY` + `DATAWIZZ_BASE_URL` (the LLM reviewer), `ELEVENLABS_API_KEY` + `ELEVENLABS_WEBHOOK_SECRET` (voice), `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` (billing), and `NEXT_PUBLIC_MAPBOX_TOKEN` (address autocomplete). The `.env.example` documents each one — **all values are blank placeholders; no real secrets are committed.**
3. `npm install`
4. `npm run dev` → the marketing landing page at http://localhost:3000, plus the auth flow and (once Supabase is configured) the dashboard and opportunity capture/assessment flows.

> Note: installing dependencies requires access to the private `@caistech/*` GitHub Packages registry — `.npmrc` reads a `NODE_AUTH_TOKEN`, so a cold clone without that token cannot complete `npm install`. And full functionality needs the private property-services backend: without it, auth and the static pages work, but address-driven property derivation and the parts of opportunity capture that depend on it will not.

## Architecture (what it calls)

- **Next.js 14 (App Router)** front end + API routes; Tailwind CSS; deployed on Vercel.
- **Supabase** for Postgres (RLS, company-scoped policies), Auth, and Storage.
- **Feasibility engine** is local TypeScript (`src/lib/feasibility/`); the **LLM reviewer** calls a DataWizz/OpenAI-compatible endpoint via the OpenAI SDK.
- **Voice** via `@caistech/elevenlabs-convai` (BYOK ElevenLabs key, server-only); **billing** via Stripe; **rate-limit/audit** via `@caistech/platform-trust-middleware` on `/api/*`.
- **Property intelligence** is delegated to the private `@caistech/property-services-sdk` (consumed through `src/lib/property-services`).

## Verify it's real

- Live deployment: https://deal-findrs.vercel.app
- Source you're reading: this repo.

## License

Source-available — public for inspection; not currently open-licensed for reuse.
