# Design Plan — DealFindrs (TEARDOWN Rebuild)

## Survey Verdict Analysis

**VERDICT:** TEARDOWN — evidenced 4/14 fields (28.5%)
**Reason:** PRE-HARD P2 and P3 failed

### Failure Analysis
- **P2 (Distributor archetype):** No named distributor archetype; hero says "buyers' agents" but body says "for developers" — conflicting/no coherent distributor
- **P3 (Distributor model):** No distributor model; product is self-service for developers, not sold through intermediary

### Root Cause
The landing page mixes TWO contradictory audiences:
- Line 52: "For buyers' agents & property firms" (distributor message)
- Line 109: "Built by developers, for developers" (end-user message)
- All CTAs lead to self-service signup ("Start 14-Day Free Trial")

This is the incoherence the survey flagged.

---

## Phase 1: Design Decision

### Chosen Audience: DISTRIBUTOR (not both)

Per the spec:
- **Distributor:** Property firms, buyers' agents, real estate agencies, and development promoters seeking branded deal assessment tools for their teams.
- **Distributor outcomes:** Distributors get a steady flow of scored deals under their own brand, team collaboration tools, and white-label options for Premium plans.

**Rationale:** The survey explicitly failed because there's no distributor model. The fix is to pick ONE audience and be consistent. The spec has a clear distributor intent with white-label outcomes.

### What This Means
1. **All copy speaks to property firms/buyers' agents** — the intermediaries who assess deals for their clients or teams
2. **CTAs lead to "Request Demo" or "Contact Sales"** — not self-service signup (distributors want to understand pricing/white-label before committing)
3. **Value proposition is BRANDED** — "under YOUR brand", "white-label options", "team collaboration"
4. **Product surfaces designed for distributor workflow** — they invite their clients/team members to submit deals

---

## Phase 2: Page Structure

### Public Surfaces (no auth required)

| Page | Purpose | Voice Agent |
|------|---------|-------------|
| `/` (landing) | Sell the distributor value proposition | N/A (marketing) |
| `/privacy` | Legal | N/A |
| `/terms` | Legal | N/A |
| `/login` | User sign-in (distributor's team members) | N/A |
| `/signup` | User sign-up (distributor's team members) | N/A |
| `/admin/login` | Admin sign-in (the distributor account owner) | N/A |
| `/forgot-password` | Password reset | N/A |
| `/reset-password` | Password reset completion | N/A |

### Authenticated Surfaces (require auth)

| Page | Purpose | Voice Agent |
|------|---------|-------------|
| `/dashboard` | Overview of opportunities | ✅ In chrome |
| `/opportunities` | List of all deals | ✅ In chrome |
| `/opportunities/new` | Add new opportunity | ✅ Required |
| `/opportunities/[id]` | View single opportunity | ✅ In chrome |
| `/opportunities/[id]/devfinance` | DevFinance reports | ✅ In chrome |
| `/reports` | Generated reports list | ✅ In chrome |
| `/setup` | Assessment criteria setup | ✅ Required |
| `/analytics` | Analytics dashboard | ✅ In chrome |
| `/settings` | User settings | ✅ In chrome |
| `/team` | Team member management | ✅ In chrome |
| `/admin` | Admin dashboard | ✅ In chrome |
| `/admin/users` | User management | ✅ In chrome |
| `/admin/stripe` | Billing management | ✅ In chrome |

### Auth Chrome Requirements
- Persistent left navbar on ALL authenticated routes
- Settings + Sign Out anchored at bottom
- Voice agent reachable from chrome in ≤3 clicks

---

## Phase 3: Copy Overhaul (to pass PRE-HARD P2/P3)

### Landing Page Changes

| Element | Current (FAIL) | New (PASS) |
|---------|---------------|------------|
| Hero subhead | "For buyers' agents & property firms" + "Built by developers, for developers" | "Give your clients instant, professional deal assessments under YOUR brand" |
| Value prop | "The AI-powered platform that gives property development promoters..." | "Your clients get consistent, AI-powered deal assessments. You control the criteria. They see YOUR brand." |
| Features header | "Built by developers, for developers" | "Built for firms that deliver results" |
| Feature copy | "Built by developers, for developers" | "Your team submits, your brand delivers" |
| Primary CTA | "Start 14-Day Free Trial" | "Request a Demo" |
| Secondary CTA | (none) | "See White-Label Options" |
| Pricing focus | Self-service tiers | "Contact for custom white-label pricing" |
| Closing CTA | "Join property developers" | "Join firms using DealFindrs" |

### ICP Evidence Required (to reach 12/14)

The survey needs these fields evidenced:
- [x] promise — already evidenced
- [x] friction — already evidenced
- [x] core_mechanism — already evidenced
- [ ] icp_geography — ADD: "Headquartered in Brisbane, Australia, serving property professionals globally"
- [x] icp_partner_type — ADD: "reseller" to copy
- [ ] icp_buyer_title — ADD: "Agency Owner" or "Managing Director" as target
- [x] icp_verticals — already evidenced: "property development"
- [ ] icp_company_size — ADD: "5-50 employee firms"
- [ ] icp_stage — ADD: "established operating businesses"
- [ ] exclusions — ADD: "Not for proptech companies"
- [x] distributor — hero now speaks to distributors consistently
- [ ] distributor_outcomes — ADD: "branded reports, white-label, team collaboration"
- [ ] end_user — clarify: end users are the distributor's clients who receive assessments
- [ ] end_user_outcomes — ADD: "professional Investment Memorandums under your firm name"

---

## Phase 4: Auth Flow (Dual-Portal per §8.5)

### Landing Page (`/`)
- Two CTAs: "Admin Login" and "Start as User"
- Public — no auth gate

### User Flow
- `/login` → standard Supabase Auth
- `/signup` → creates user account under a company
- Post-login → `/dashboard`

### Admin Flow
- `/admin/login` → Supabase Auth, gated by `ADMIN_EMAILS` allowlist
- Post-login → `/admin` (control panel)
- Admin can access user routes (they ARE users too)

### Middleware
- `/api/*` requires auth (deny-by-default)
- `/admin/*` requires BOTH auth AND admin allowlist
- Cross-access: users cannot reach `/admin/*`

---

## Phase 5: Voice Agent Placement

Per §6 VOICE AI STANDARD:
- Voice agent surface reachable from main chrome (header/sidebar/FAB)
- ≤3 clicks from any page
- Use `@caistech/elevenlabs-convai` React `VoiceWidget`
- BYOK — runs on user's ElevenLabs key
- In-context clarifier on nuanced inputs (opportunity entry, criteria setup)

---

## Phase 6: Portfolio Standards Compliance

### Must Have (RULE: non-negotiable)
- R1: Auth four-leg pattern (login, signup, forgot-password, magic-link)
- R2: Responsive 375px → 1440px
- R3: Explanatory header on every page
- R6: Email sender: `noreply@updates.corporateaisolutions.com`
- R9: RLS on every table
- R10: No verbatim Postgres errors in API responses
- R11: No hardcoded vendor identity
- R12: `/privacy` and `/terms` pages
- R13: Route smoke test on deploy

### Voice Agent (R20)
- Mandatory on product surfaces with multi-step input
- Reachability: ≤3 clicks from any page

### Commitment Panel (R19)
- Add to main product surface before validation outreach

---

## Implementation Order

1. **Rewrite landing page copy** — fix P2/P3 coherency
2. **Add ICP evidence fields** — reach 12/14 threshold
3. **Add CommitmentPanel** — R19
4. **Verify auth flows** — R1, dual-portal
5. **Add voice to chrome** — R20
6. **Add explanatory headers** — R3
7. **Verify responsive** — R2
8. **Check other standards** — R6, R9, R10, R11, R12, R13

---

## Acceptance Criteria

- [ ] Landing page passes PRE-HARD P2 (named distributor archetype, no contradictions)
- [ ] Landing page passes PRE-HARD P3 (distributor model evidenced)
- [ ] Site reaches ≥12/14 evidenced fields
- [ ] Auth four-leg pattern works (login, signup, forgot-password, magic-link)
- [ ] Dual-portal works (user flow + admin flow)
- [ ] Voice agent reachable from all authenticated surfaces
- [ ] Responsive works at 375px and 1440px
- [ ] Explanatory header on every page
- [ ] No hardcoded vendor identity in copy
