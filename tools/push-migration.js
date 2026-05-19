#!/usr/bin/env node

/**
 * Apply a Supabase migration, loading SUPABASE_ACCESS_TOKEN from .env.local
 * if it's not already set in the shell environment.
 *
 * Wraps tools/apply-migration.js so you don't have to export the token by hand
 * each session.
 *
 * Usage:
 *   node tools/push-migration.js supabase/migrations/003_feasibility_engine.sql
 */

const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')

const migrationPath = process.argv[2]
if (!migrationPath) {
  console.error('ERROR: missing migration file argument.')
  console.error('Usage: node tools/push-migration.js <path-to-sql-file>')
  process.exit(1)
}

if (!process.env.SUPABASE_ACCESS_TOKEN) {
  const envFile = path.join(process.cwd(), '.env.local')
  if (fs.existsSync(envFile)) {
    for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*SUPABASE_ACCESS_TOKEN\s*=\s*(.*)\s*$/)
      if (m) {
        let v = m[1].trim()
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
          v = v.slice(1, -1)
        }
        process.env.SUPABASE_ACCESS_TOKEN = v
        break
      }
    }
  }
}

if (!process.env.SUPABASE_ACCESS_TOKEN) {
  console.error('ERROR: SUPABASE_ACCESS_TOKEN not set in environment or .env.local.')
  console.error('Get one at https://supabase.com/dashboard/account/tokens and add to .env.local.')
  process.exit(1)
}

const r = spawnSync('node', ['tools/apply-migration.js', migrationPath], {
  stdio: 'inherit',
  env: process.env,
})
process.exit(r.status ?? 1)
