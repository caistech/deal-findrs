# Design Plan — DealFindrs

## Standards I Must Satisfy

The following hard rules from the _standards directory must be satisfied:

### PRODUCT_STANDARDS.md

- **§0 60-second per-page gate**: Explanatory header, responsive (375px-1440px), touch targets ≥44px, persistent nav behind auth, voice reachable from chrome, consequence clarity on irreversible actions, browser title not "Create Next App"
- **§1 Responsive**: Mobile-first, works ≤414px and ≥1280px, 44px touch targets, 16px base text, tables have mobile strategy, nav collapses to drawer
- **§2 Auth page pattern**: Forgot-password link, password visibility toggle, working magic-link (4 legs total)
- **§4 Authenticated-app chrome**: Persistent left navbar (or header with nav items), Settings + Sign Out at bottom, /settings page with Profile/Password/Notifications/Account sections
- **§5 UI explanatory header**: Every page has 1-3 sentences answering "what is this / what do I do / why it matters"
- **§6 Voice AI**: Voice agent surface reachable from chrome ≤3 clicks, uses @caistech/elevenlabs-convai
- **§7 Scaffold metadata**: Title not "Create Next App", proper favicon
- **§8.5 Dual-auth portal**: Landing has "Admin Login" + "User Sign Up/Login" CTAs, separate auth flows, middleware segregates

### PORTFOLIO_STANDARD.md

- **R1 Auth four legs**: Forgot-password, password toggle, magic-link, email verification
- **R2 Responsive**: 375px-1440px, mobile-first, 44px targets, 16px text
- **R3 Explanatory headers**: Every page
- **R9 RLS deny-by-default**: No USING(true) on user data tables
- **R10 No verbatim Postgres errors**: Use errorResponse() helper
- **R11 No hardcoded vendor identity**: Use NEXT_PUBLIC_VENDOR_* env vars
- **R12 Public-API deny-by-default**: All /api/* routes require auth unless allowlisted
- **R13 Route smoke test**: Top routes tested on deploy
- **R14 Sample artefact**: At least one static sample reachable without signup
- **R19 CommitmentPanel**: On main surface before outreach
- **R20 Voice agent mandatory**: On product surfaces with nuanced input

### STYLING.md

- CorporateHeader with green brand (#22c55e)
- CorporateFooter with contact links
- Inter font via next/font
- Dark/light theme support

### THIN_MVP_RUBRIC.md

- Full experience, zero scale infrastructure
- Portfolio DNA (nav chrome, Settings, voice, landing, responsive, explanatory headers, auth pattern) always in

---

## Page Structure

### Public Routes (no auth required)
| Route | Purpose | Status |
|-------|---------|--------|
| `/` | Landing page with marketing, dual CTAs | ✓ Exists |
| `/login` | User login with password + magic-link | ✓ Exists |
| `/signup` | User signup | ✓ Exists |
| `/forgot-password` | Password reset request | ✓ Exists |
| `/reset-password` | Password reset form | ✓ Exists |
| `/admin/login` | Admin login (ADMIN_EMAILS allowlist) | ✓ Exists |
| `/privacy` | Privacy policy | Needs check |
| `/terms` | Terms of service | Needs check |
| `/sample` or `/demo` | Sample artefact (R14) | ❌ MISSING |

### Authenticated User Routes
| Route | Purpose | Status |
|-------|---------|--------|
| `/dashboard` | User dashboard with opportunities | ✓ Exists |
| `/opportunities` | List all opportunities | ✓ Exists |
| `/opportunities/new` | Create new opportunity (wizard) | ✓ Exists |
| `/opportunities/[id]` | View opportunity detail | ✓ Exists |
| `/opportunities/[id]/devfinance` | DevFinance modules | ✓ Exists |
| `/analytics` | Analytics dashboard | ✓ Exists |
| `/settings` | User settings (Profile/Password/Notifications/Account) | ✓ Exists |
| `/team` | Team management | ✓ Exists |
| `/onboarding` | Onboarding flow | ✓ Exists |
| `/setup` | Setup criteria | ✓ Exists |

### Authenticated Admin Routes
| Route | Purpose | Status |
|-------|---------|--------|
| `/admin` | Admin dashboard | ✓ Exists |
| `/admin/users` | User management | ✓ Exists |
| `/admin/stripe` | Stripe configuration | ✓ Exists |
| `/admin/elevenlabs` | ElevenLabs setup | ✓ Exists |

### API Routes
All `/api/*` routes require auth via middleware (R12). Webhooks have separate validation.

---

## Audience Resolution

From `_spec.json`:
- **Distributor**: Property firms, buyers' agents, real estate agencies, development promoters seeking branded deal assessment tools
- **End User**: Property developers, investment analysts, buyers' agents, development promoters

The landing page currently targets **both** audiences correctly - it mentions "for buyers' agents & property firms" in the hero and frames it for both distributor and end-user. The dual-auth portal design (/login vs /admin/login) correctly separates the two user types.

**No incoherence detected** - the product serves one coherent audience: property professionals evaluating development deals, whether they represent a firm (distributor) or work individually (end user).

---

## Auth/Surfaces/Voice Summary

### Authentication
- **User auth flow**: `/login` → `/signup` → `/forgot-password` → `/reset-password`
- **Admin auth flow**: `/admin/login` → same forgot-password → gated by ADMIN_EMAILS
- **Middleware**: Gates `/dashboard`, `/opportunities`, `/admin/*`, etc.
- **All 4 auth legs implemented**: Password login, magic-link, forgot-password, password visibility toggle

### Voice Agent
- **Placement**: FAB button on dashboard (≤3 clicks from any page)
- **Implementation**: Custom voice dialog with quick actions
- **Note**: Should migrate to @caistech/elevenlabs-convai per R6 for consistency

### Chrome
- **Landing**: CorporateHeader with nav, CorporateFooter
- **Authenticated**: CorporateHeader with user menu + notifications + new opportunity button
- **Admin**: CorporateHeader with admin nav

---

## Gaps Identified

| Gap | Rule | Action |
|-----|------|--------|
| No sample/demo page | R14 | Create `/sample` page with static assessment example |
| No CommitmentPanel | R19 | Add to landing page main surface |

---

## Implementation Plan

1. Create `/sample` page (R14) - static Green/Amber/Red assessment example
2. Add CommitmentPanel to landing page (R19)
3. Verify /privacy and /terms exist
4. Run lint and verify build
5. Clean up _spec.json, _standards, _template, opencode.json

---

## Decisions Made

| Question | Chose | Why |
|----------|-------|-----|
| Sample page URL | `/sample` | More descriptive than `/demo` for a B2B product |
| CommitmentPanel placement | Landing page hero below CTA | Highest visibility for conversion |
