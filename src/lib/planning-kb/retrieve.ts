/**
 * Shared WA-Planning KB — DealFindrs's thin client over property-services `planning-retrieve`.
 *
 * The KB (tables, embeddings, ingest) lives entirely in property-services; this is just the call in
 * front of it — one HTTP request that embeds server-side and runs the match. Same boundary + endpoint
 * as F2K-Checkpoint's planningKnowledgeBase.ts (reuse, not fork). State-aware: an uncovered state
 * (e.g. QLD) returns no hits, which the referral treats as `needs_human`. Degrades honestly — any
 * error or missing config returns [] (never fabricates coverage).
 */
export interface PlanningChunkHit {
  content: string
  title: string
  source_url: string
  version_date: string | null
  attribution?: string
  similarity?: number
}

function endpoint(): { url: string; apiKey: string } | null {
  const base = process.env.PROPERTY_SERVICES_URL ?? process.env.NEXT_PUBLIC_PROPERTY_SERVICES_URL ?? ''
  const apiKey = process.env.PROPERTY_SERVICES_API_KEY ?? process.env.NEXT_PUBLIC_PROPERTY_SERVICES_API_KEY ?? ''
  if (!base || !apiKey) return null
  return { url: `${base.replace(/\/$/, '')}/functions/v1/planning-retrieve`, apiKey }
}

export async function retrievePlanning(query: {
  question: string
  state?: string | null
  lga?: string | null
  matchCount?: number
}): Promise<PlanningChunkHit[]> {
  const ep = endpoint()
  if (!ep) return [] // KB not configured → degrade (referral will be needs_human)
  try {
    const res = await fetch(ep.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': ep.apiKey },
      body: JSON.stringify({
        question: query.question,
        filter_status: 'active',
        match_count: query.matchCount ?? 6,
        state: query.state ?? null,
        lga: query.lga ?? null,
      }),
    })
    if (!res.ok) return []
    const json = (await res.json()) as { success?: boolean; hits?: PlanningChunkHit[] }
    return json?.hits ?? []
  } catch {
    return []
  }
}
