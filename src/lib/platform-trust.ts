/**
 * Platform Trust integration — re-export shim.
 *
 * The actual trustGate / trustLog / trustMeter implementation now lives in
 * @caistech/platform-trust-middleware. This file exists so existing call sites
 * like `import { trustGate } from '@/lib/platform-trust'` keep working.
 *
 * Env vars expected at runtime (unchanged):
 *   PLATFORM_TRUST_SUPABASE_URL
 *   PLATFORM_TRUST_SERVICE_KEY
 *   PLATFORM_TRUST_PROJECT_ID
 *
 * See @caistech/platform-trust-middleware v0.2.0 for source.
 */

export { trustGate, trustLog, trustMeter } from '@caistech/platform-trust-middleware';
export type { TrustContext, TrustGateResult } from '@caistech/platform-trust-middleware';
