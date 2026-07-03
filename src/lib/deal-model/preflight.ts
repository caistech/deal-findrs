/**
 * Startup preflight for the deal-model promotion (send side).
 *
 * Runs once at server boot (via instrumentation.ts) so a missing env surfaces in the logs
 * immediately, not only when someone clicks "Promote to F2K-Projects" and gets a no-op.
 * Warns only when something is missing — silent when correctly configured.
 */
export function preflightDealModelPromotion(): void {
  const missing: string[] = []
  if (!process.env.DEAL_MODEL_PROMOTION_SECRET) missing.push('DEAL_MODEL_PROMOTION_SECRET')
  if (!process.env.F2K_PROJECTS_PROMOTION_URL) missing.push('F2K_PROJECTS_PROMOTION_URL')

  if (missing.length > 0) {
    console.warn(
      `[deal-model] WARNING: promotion is NOT configured — missing env: ${missing.join(', ')}. ` +
        `The "Promote to F2K-Projects" action will no-op (promotion_not_configured) until these are set ` +
        `(mark the secret sensitive; prod+preview). See docs/deal-model-integration-findings.md.`
    )
  }
}
