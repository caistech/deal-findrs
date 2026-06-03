#!/usr/bin/env node
// emit-survey-manifest.mjs
// Writes public/survey-manifest.json listing every route that carries a survey marker.
// The survey fetches this file first to learn which routes to grep for data-* markers.
// Run at build time or after any route change that adds/removes markers.
//
// Usage:   node scripts/emit-survey-manifest.mjs
// Or add to package.json scripts: "emit-manifest": "node scripts/emit-survey-manifest.mjs"

import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

// Every route that carries at least one markerProps(...) spread.
// IMPORTANT: list static routes only (no dynamic segments).
// The survey greps the union of their rendered DOM.
const ROUTES_WITH_MARKERS = [
  '/',          // promise, friction, end_user, end_user_outcomes, core_mechanism,
                // icp_geography, icp_partner_type, icp_buyer_title,
                // icp_company_size, icp_stage, exclusions
  '/partners',  // distributor, distributor_outcomes, icp_verticals, why_now,
                // icp_geography, icp_buyer_title, icp_company_size, icp_stage,
                // icp_partner_type, exclusions
  '/reports',   // sample artefact — no markers but listed for completeness
]

function slugRoutes(routes) {
  const seen = new Set()
  const clean = []
  for (const r of routes) {
    const normalized = r.startsWith('/') ? r : `/${r}`
    if (!seen.has(normalized)) {
      seen.add(normalized)
      clean.push(normalized)
    }
  }
  if (!clean.includes('/')) clean.unshift('/')
  return clean
}

const manifest = { routes: slugRoutes(ROUTES_WITH_MARKERS) }
const outPath = join(root, 'public', 'survey-manifest.json')

mkdirSync(join(root, 'public'), { recursive: true })
writeFileSync(outPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8')

console.log('[emit-survey-manifest] written to', outPath)
console.log('[emit-survey-manifest] routes:', manifest.routes)
