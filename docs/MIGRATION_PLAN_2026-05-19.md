# Migration Plan — deal-findrs

- **Repo:** `C:\Users\denni\PycharmProjects\DealFindrs`
- **Generated:** 2026-05-19T16:14:37.997Z
- **Compliance before plan:** 73% (8/11 rules)

## How to use this plan

1. Read each step below.
2. For PATCH steps, the migrator can apply them via `portfolio-migrator apply --plan <this-file>.json --yes`.
3. For NOTE steps, follow the embedded instructions by hand.
4. After applying, re-run `portfolio-migrator status` to verify compliance moved.
5. Commit + open a PR. The migrator never pushes — that's yours.

## Steps (6)

### 1. Update package.json — add @caistech/portfolio-gate ^0.2.0 (devDependencies) + add / upgrade @caistech/corporate-components to ^0.2.0 (dependencies)

- **Kind:** patch
- **Rule:** R13
- **Migration id:** `install-portfolio-gate`

Single package.json rewrite. add @caistech/portfolio-gate ^0.2.0 (devDependencies). add / upgrade @caistech/corporate-components to ^0.2.0 (dependencies).

Portfolio-gate (R13) brings the CI smoke tests, errorResponse helper, and static audits. Corporate-components (R1) ships <AuthForm/> in 0.2.0 — required for the R1 swap migration.

**Files written:**
- `package.json`

**Follow-up command:** `npm install`

### 2. Scaffold routes.config.json

- **Kind:** patch
- **Rule:** R13
- **Migration id:** `scaffold-routes-config`

Default top-level route list (homepage, /pricing, /about, /contact, /login, /signup, /forgot-password, /privacy, /terms, /api/health). Edit to match your product's actual routes before running the smoke test.

**Files written:**
- `routes.config.json` (only if missing)

### 3. Scaffold auth.config.json

- **Kind:** patch
- **Rule:** R1
- **Migration id:** `scaffold-auth-config`

Per-product auth path map used by portfolio-gate-smoke-auth. The four legs are wired against the conventional paths (/login, /signup, /forgot-password, /api/auth/*) — edit if your product diverges.

**Files written:**
- `auth.config.json` (only if missing)

### 4. Scaffold .github/workflows/gate.yml

- **Kind:** patch
- **Rule:** R13
- **Migration id:** `scaffold-gate-workflow`

GitHub Action template — runs typecheck + lint + build + route + auth smoke tests on PR + push to main. Requires GITHUB_PACKAGES_TOKEN secret and PORTFOLIO_GATE_PREVIEW_URL repo variable.

**Files written:**
- `.github/workflows/gate.yml` (only if missing)

### 5. Scrub vendor identity references

- **Kind:** note
- **Rule:** R11
- **Migration id:** `vendor-identity-scrub`

Replace literal references to operator handle / mobile / Calendly / email with process.env.NEXT_PUBLIC_VENDOR_* references. Marked NOTE because the exact substitution depends on the call site — string template vs JSX text vs prop value all need slightly different syntax. Review each before applying.

**Note body:**

4 occurrences of vendor identity strings were detected. Replace each with a process.env reference and add the placeholder to .env.example.

| File | Find | Replace with |
|---|---|---|
| `src/components/corporate/CorporateFooter.tsx` | `mcmdennis` | `${process.env.NEXT_PUBLIC_VENDOR_HANDLE ?? ''}` |
| `src/components/corporate/CorporateFooter.tsx` | `+61402612471` | `${process.env.NEXT_PUBLIC_VENDOR_PHONE ?? ''}` |
| `src/components/corporate/CorporateFooter.tsx` | `calendly.com/mcmdennis` | `${process.env.NEXT_PUBLIC_VENDOR_CALENDLY ?? ''}` |
| `src/components/corporate/CorporateFooter.tsx` | `dennis@corporateaisolutions` | `${process.env.NEXT_PUBLIC_VENDOR_EMAIL ?? ''}` |

These are NOT auto-applied because the exact substitution depends on the call site:
- Inside a string template: `\${process.env.NEXT_PUBLIC_VENDOR_EMAIL ?? ''}`
- Inside JSX text: `{process.env.NEXT_PUBLIC_VENDOR_EMAIL}`
- Inside a prop value: `vendorEmail={process.env.NEXT_PUBLIC_VENDOR_EMAIL}`

Apply by hand, verify with `npx portfolio-gate-audit-vendor-leak`, then commit.

### 6. Update .env.example — add NEXT_PUBLIC_VENDOR_* placeholders (R11) + RESEND_FROM_EMAIL (R6)

- **Kind:** patch
- **Rule:** R6
- **Migration id:** `add-resend-from-email-example`

Single .env.example rewrite. NEXT_PUBLIC_VENDOR_* placeholders (R11). RESEND_FROM_EMAIL (R6).

**Files written:**
- `.env.example`
