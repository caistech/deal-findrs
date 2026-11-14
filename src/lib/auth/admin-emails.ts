/**
 * Canonical ADMIN_EMAILS allowlist resolution.
 *
 * The list of operator/admin email addresses authorised to reach the `/admin`
 * portal and the admin API routes behind it. Sourced from the ADMIN_EMAILS env
 * var (comma-separated); falls back to the two operator accounts so a misconfig
 * never leaves the portal wide open OR fully locked out.
 *
 * Used by:
 *   - src/middleware.ts            (gates /admin/:path* UI routes)
 *   - src/lib/auth/require-admin.ts (gates /api/admin/* route handlers — defence in depth)
 *   - src/app/admin/login/page.tsx (client-side UX reject before bouncing)
 *
 * Keep this the single source of truth — do not re-parse ADMIN_EMAILS elsewhere.
 */
// The three static admin identities (PRODUCT_STANDARDS §9.5):
//   - Two human-operator admins (used BY HAND only, NEVER handed to an agent)
//   - One QA admin-agent (drives VT_A1–VT_A4 checks only; never VT_A5/A6)
// The user-agent (dennis@factory2key.com.au) is intentionally NOT here —
// it must NOT be in ADMIN_EMAILS (VT_B2 invariant: non-admin cannot reach /admin).
const DEFAULT_ADMIN_EMAILS =
  'dennis@corporateaisolutions.com,mcmdennis@gmail.com,dennis+qaadmin@factory2key.com.au'

export function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || DEFAULT_ADMIN_EMAILS)
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return getAdminEmails().includes(email.toLowerCase())
}
