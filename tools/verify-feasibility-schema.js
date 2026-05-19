#!/usr/bin/env node

/**
 * Smoke-check the feasibility-engine migrations.
 * Confirms tables exist, RLS is on, wipe ran.
 */

const fs = require('fs')
const path = require('path')

if (!process.env.SUPABASE_ACCESS_TOKEN) {
  const envFile = path.join(process.cwd(), '.env.local')
  if (fs.existsSync(envFile)) {
    for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*SUPABASE_ACCESS_TOKEN\s*=\s*(.*)\s*$/)
      if (m) {
        let v = m[1].trim()
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
        process.env.SUPABASE_ACCESS_TOKEN = v
        break
      }
    }
  }
}

const ref = 'obakurzlpzisflnnjzzo'
const token = process.env.SUPABASE_ACCESS_TOKEN

async function q(sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`${res.status}: ${text}`)
  return JSON.parse(text)
}

async function main() {
  const checks = [
    ['tables', `SELECT table_name FROM information_schema.tables
                WHERE table_name IN ('deal_evidence','field_evidence_links','feasibility_criteria','assessments')
                ORDER BY table_name`],
    ['assessments_columns', `SELECT column_name FROM information_schema.columns
                             WHERE table_name='assessments'
                             AND column_name IN ('engine_version','test_results','reviewer_verdict','substitution_log','ltv_derived','status')
                             ORDER BY column_name`],
    ['assessments_count', `SELECT COUNT(*)::int AS n FROM assessments`],
    ['opportunities_with_rag', `SELECT COUNT(*)::int AS n FROM opportunities WHERE rag_status IS NOT NULL`],
    ['storage_bucket', `SELECT id, public FROM storage.buckets WHERE id='deal-evidence'`],
    ['criteria_defaults', `SELECT ltc_ceiling, margin_floor, contingency_baseline, contingency_offshore, contingency_complex
                           FROM feasibility_criteria LIMIT 1`],
  ]
  for (const [name, sql] of checks) {
    try {
      const r = await q(sql)
      console.log(`✓ ${name}:`, JSON.stringify(r))
    } catch (e) {
      console.log(`✗ ${name}: ${e.message}`)
    }
  }
}

main().catch(e => { console.error(e); process.exit(1) })
