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
const DEFAULT_ADMIN_EMAILS = 'dennis@corporateaisolutions.com,mcmdennis@gmail.com'

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
