/**
 * Next.js instrumentation — `register()` runs once at server boot (and on each serverless
 * cold start). Used to surface deal-model promotion misconfiguration in the logs at startup.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { preflightDealModelPromotion } = await import('./lib/deal-model/preflight')
    preflightDealModelPromotion()
  }
}
