#!/usr/bin/env node

/**
 * Apply a Supabase migration via the Management API.
 *
 * Usage:
 *   SUPABASE_ACCESS_TOKEN=sbp_xxx node tools/apply-migration.js <migration-file>
 *
 * PowerShell:
 *   $env:SUPABASE_ACCESS_TOKEN = "sbp_xxx"
 *   node tools/apply-migration.js supabase/migrations/002_opportunity_status_widen.sql
 *
 * Project ref is read from .env.local NEXT_PUBLIC_SUPABASE_URL.
 * Get an access token at: https://supabase.com/dashboard/account/tokens
 */

const fs = require('fs')
const path = require('path')

const token = process.env.SUPABASE_ACCESS_TOKEN
if (!token) {
  console.error('ERROR: SUPABASE_ACCESS_TOKEN not set in environment.')
  console.error('Get one at https://supabase.com/dashboard/account/tokens')
  process.exit(1)
}

const migrationPath = process.argv[2]
if (!migrationPath) {
  console.error('ERROR: missing migration file argument.')
  console.error('Usage: node tools/apply-migration.js <path-to-sql-file>')
  process.exit(1)
}

const absMigration = path.resolve(process.cwd(), migrationPath)
if (!fs.existsSync(absMigration)) {
  console.error(`ERROR: file not found: ${absMigration}`)
  process.exit(1)
}

// Read project ref from .env.local
function loadDotenv(filePath) {
  if (!fs.existsSync(filePath)) return {}
  const raw = fs.readFileSync(filePath, 'utf8')
  const out = {}
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i)
    if (!m) continue
    let v = m[2]
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
    out[m[1]] = v
  }
  return out
}

const env = loadDotenv(path.join(process.cwd(), '.env.local'))
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
if (!supabaseUrl) {
  console.error('ERROR: NEXT_PUBLIC_SUPABASE_URL not found in .env.local')
  process.exit(1)
}

const projectRef = supabaseUrl.match(/https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1]
if (!projectRef) {
  console.error(`ERROR: could not extract project ref from ${supabaseUrl}`)
  process.exit(1)
}

const sql = fs.readFileSync(absMigration, 'utf8')

console.log(`Project ref:   ${projectRef}`)
console.log(`Migration:     ${migrationPath}`)
console.log(`SQL bytes:     ${sql.length}`)
console.log('-'.repeat(60))

async function main() {
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  })

  const text = await res.text()
  if (!res.ok) {
    console.error(`FAILED (${res.status}): ${text}`)
    process.exit(1)
  }

  console.log(`OK (${res.status})`)
  console.log(text)
}

main().catch(err => {
  console.error('FATAL:', err)
  process.exit(1)
})
