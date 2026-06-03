/**
 * Emit public/survey-manifest.json for the DealFindrs survey gate.
 *
 * The survey fetches this file first to know which routes carry data-* markers,
 * then greps the union of their DOM. A marker on a route NOT listed here is
 * invisible to the survey.
 *
 * Run at build time: `node scripts/emit-survey-manifest.mjs`
 */
import { writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const manifest = {
  routes: ['/', '/partners', '/reports'],
}

writeFileSync(
  join(root, 'public', 'survey-manifest.json'),
  JSON.stringify(manifest, null, 2) + '\n',
)

console.log('[emit-survey-manifest] wrote public/survey-manifest.json')
