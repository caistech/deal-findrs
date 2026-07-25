/**
 * ABN / entity-name lookup.
 *
 * Now the CANONICAL shared handler. This route used to hand-roll the ABR
 * JSONP stripping and URL construction locally — one of three copies across
 * the portfolio, which triggered the extraction into
 * @caistech/corporate-components 0.5.3 (@caistech-first / no forks).
 *
 * Behaviour change vs the old local route: with no ABR_GUID configured it now
 * returns 200 { configured: false } instead of 500. A missing GUID is an
 * operator config gap, not the applicant's fault, and must not break the
 * onboarding form mid-flow. Callers check `configured`/`entityName` before
 * treating a 200 as a resolved business.
 */
export { GET } from '@caistech/corporate-components/abn-lookup';

// Route-segment config cannot travel through a re-export, and some Next
// versions prerender this handler as static — which would freeze a single
// response and break every lookup. Pin it dynamic per consumer.
export const dynamic = 'force-dynamic';
