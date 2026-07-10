/**
 * Planning-memory enrichment for DealFindrs viability — the READ side of the shared
 * @caistech/planning-memory experiential leg (DATA_STANDARD's 3rd store).
 *
 * DealFindrs CONSUMES (recalls) distilled, jurisdiction-general planning CONCLUSIONS that other
 * products (F2K-Checkpoint's planning review) accumulated in the SHARED state scope
 * (`caistech-planning-<state>`). It uses them to enrich the feasibility study's planning-risk
 * narrative with real prior experience for the jurisdiction — e.g. a more specific "Planning or
 * approval delays" mitigation than the generic default.
 *
 * DealFindrs is viability/read — it has no human-approval loop, so it does NOT write memories
 * (Checkpoint's distil-on-approval owns the write). If DealFindrs later gains a resolved-conclusion
 * step, it can import rememberPlanningConclusion + a distil step the same way Checkpoint does.
 *
 * Guardrails (inherited from the package / DATA_STANDARD):
 *  - Recalled conclusions are SUPPORTING context, NEVER a citation (D1/D2). Present them as "prior
 *    resolved analysis — re-verify", not as authoritative planning advice.
 *  - Fail-soft: no MNEMO_API_KEY => returns []. The feasibility flow is unchanged when Mnemo is off.
 *
 * ACTIVATION (next session): set MNEMO_API_KEY on the DealFindrs Vercel project (sensitive,
 * production+preview) — the SAME Mnemo key the portfolio uses. See PLANNING_MEMORY_HANDOFF.md.
 */
import { recallPlanningConclusions, planningMemoryEnabled } from "@caistech/planning-memory";

export { planningMemoryEnabled };

/**
 * Recall prior planning conclusions for a jurisdiction to enrich viability. Pass the site's
 * state/territory (e.g. "SA") and, optionally, the development type to focus the query.
 * Returns [] when Mnemo is unconfigured or nothing is on the shelf yet (fail-soft).
 */
export async function recallPlanningRisk(
  state: string | null | undefined,
  developmentType?: string | null,
  limit = 3,
): Promise<string[]> {
  if (!planningMemoryEnabled() || !state?.trim()) return [];
  const query =
    `${developmentType?.trim() || "residential development"} planning assessment pathway ` +
    `approval risk overlays constraints minimum site area zone provisions`;
  return recallPlanningConclusions(state, query, limit);
}
