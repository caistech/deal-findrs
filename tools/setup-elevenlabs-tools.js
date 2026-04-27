#!/usr/bin/env node

/**
 * ElevenLabs Conversational AI — Tools & Prompt Update
 *
 * Patches the existing DealFindrs voice agents to add CLIENT TOOLS
 * so the browser SDK can route tool calls back into the form, and
 * updates each agent's system prompt to instruct it to call those
 * tools as it collects each piece of info.
 *
 * Reads .env.local directly (zero deps). Expects:
 *   ELEVENLABS_API_KEY=...
 *   NEXT_PUBLIC_ELEVENLABS_AGENT_BASICS=agent_...
 *   NEXT_PUBLIC_ELEVENLABS_AGENT_PROPERTY=agent_...
 *   NEXT_PUBLIC_ELEVENLABS_AGENT_FINANCIAL=agent_...
 *   NEXT_PUBLIC_ELEVENLABS_AGENT_DERISK=agent_...
 *
 * Usage:
 *   node tools/setup-elevenlabs-tools.js
 *
 * Or via npm script:
 *   npm run setup:elevenlabs:tools
 *
 * The script PATCHes existing agents. It does NOT create new ones —
 * use tools/setup-elevenlabs.js for first-time creation.
 */

const fs = require('fs')
const path = require('path')

// ── Tiny .env parser (zero deps) ─────────────────────────────────
function loadDotenv(filePath) {
  if (!fs.existsSync(filePath)) return {}
  const raw = fs.readFileSync(filePath, 'utf8')
  const out = {}
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i)
    if (!m) continue
    let value = m[2]
    // strip wrapping quotes
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    out[m[1]] = value
  }
  return out
}

const env = {
  ...loadDotenv(path.join(process.cwd(), '.env.local')),
  ...process.env, // process.env wins so user can override at CLI
}

const KEY = env.ELEVENLABS_API_KEY
if (!KEY) {
  console.error('ERROR: ELEVENLABS_API_KEY not found in .env.local or environment.')
  process.exit(1)
}

const AGENT_IDS = {
  basics:    env.NEXT_PUBLIC_ELEVENLABS_AGENT_BASICS,
  property:  env.NEXT_PUBLIC_ELEVENLABS_AGENT_PROPERTY,
  financial: env.NEXT_PUBLIC_ELEVENLABS_AGENT_FINANCIAL,
  derisk:    env.NEXT_PUBLIC_ELEVENLABS_AGENT_DERISK,
}

// ── Tool definitions per step ────────────────────────────────────
// Each tool is a CLIENT tool: ElevenLabs routes the call to the
// browser SDK rather than to a server webhook. The browser then
// calls onFieldExtracted(field, value) for each non-empty param.
//
// Note: each parameter matches a key on the form's `formData` state
// in src/app/opportunities/new/page.tsx. Keep field names in sync.

const SHARED_TOOL_DESCRIPTION =
  'Set one or more form fields with information you have collected from ' +
  'the user. Call this AS SOON AS you have a value for each field — do ' +
  'not wait until the end of the conversation, do not ask the user "shall ' +
  'I save that?", just call this tool immediately. You can call it many ' +
  'times during the conversation; each call updates whatever fields you ' +
  'pass. Only include fields you actually have values for. The form is ' +
  'shown to the user in real time, so they will see the fields filling in.'

const tools = {
  basics: [{
    type: 'client',
    name: 'set_basics_fields',
    description: SHARED_TOOL_DESCRIPTION,
    parameters: {
      type: 'object',
      properties: {
        name:            { type: 'string', description: 'Opportunity name (auto-generated from address if blank, e.g. "GROH Seafields" or "122 Branscomb Rd, Claremont")' },
        address:         { type: 'string', description: 'Street address — number + street name only, no city. e.g. "122 Branscomb Rd"' },
        city:            { type: 'string', description: 'Suburb or city, e.g. "Claremont", "Waggrakine"' },
        state:           { type: 'string', description: 'Australian state code: NSW, VIC, QLD, WA, SA, TAS, NT, ACT' },
        postcode:        { type: 'string', description: '4-digit postcode' },
        country:         { type: 'string', description: 'Country, default "Australia"' },
        landownerName:   { type: 'string', description: 'Landowner full name' },
        landownerPhone:  { type: 'string', description: 'Landowner phone number' },
        landownerEmail:  { type: 'string', description: 'Landowner email' },
        landownerCompany:{ type: 'string', description: 'Landowner company (if any)' },
        source:          { type: 'string', description: 'How they found this opportunity, e.g. "realestate.com.au", "direct", "referral"' },
        sourceContact:   { type: 'string', description: 'Source contact name (if applicable)' },
      },
    },
  }],

  property: [{
    type: 'client',
    name: 'set_property_fields',
    description: SHARED_TOOL_DESCRIPTION,
    parameters: {
      type: 'object',
      properties: {
        propertySize:        { type: 'string', description: 'Land size as a number only, e.g. "20000"' },
        propertySizeUnit:    { type: 'string', enum: ['sqm', 'hectares', 'acres'] },
        landStage:           { type: 'string', enum: ['da_approved', 'da_lodged', 'needs_rezoning', 'raw_land', 'construction_ready'] },
        currentZoning:       { type: 'string', description: 'Zoning code, e.g. "R1", "R2", "B4"' },
        numLots:             { type: 'string', description: 'Number of lots as a string number, e.g. "12"' },
        numDwellings:        { type: 'string', description: 'Number of dwellings as a string number' },
        existingStructures:  { type: 'string', description: 'e.g. "None", "farmhouse", "shed"' },
        deriskDaApproved:               { type: 'boolean' },
        deriskVendorFinance:            { type: 'boolean' },
        deriskFixedPriceConstruction:   { type: 'boolean' },
        deriskConstructionPartner:      { type: 'string', description: 'Builder name, e.g. "Factory2Key"' },
        deriskExperiencedPm:            { type: 'boolean' },
        deriskPmName:                   { type: 'string' },
        deriskClearTitle:               { type: 'boolean' },
        deriskGrowthCorridor:           { type: 'boolean' },
        riskPreviousDisputes:    { type: 'boolean' },
        riskDisputeDetails:      { type: 'string' },
        riskEnvironmentalIssues: { type: 'boolean' },
        riskEnvironmentalDetails:{ type: 'string' },
        riskHeritageOverlay:     { type: 'boolean' },
        riskHeritageDetails:     { type: 'string' },
      },
    },
  }],

  financial: [{
    type: 'client',
    name: 'set_financial_fields',
    description: SHARED_TOOL_DESCRIPTION,
    parameters: {
      type: 'object',
      properties: {
        landPurchasePrice:    { type: 'string', description: 'Land purchase price in AUD as a number string, e.g. "2500000"' },
        infrastructureCosts:  { type: 'string', description: 'Infrastructure costs in AUD' },
        constructionPerUnit:  { type: 'string', description: 'Construction cost per unit in AUD' },
        avgSalePrice:         { type: 'string', description: 'Average sale price per unit in AUD' },
        contingencyPercent:   { type: 'string', description: 'Contingency as percentage, e.g. "5"' },
        timeframeMonths:      { type: 'string', description: 'Project timeframe in months, e.g. "18"' },
        targetStartDate:      { type: 'string', description: 'ISO date YYYY-MM-DD' },
        deriskPreSalesPercent:{ type: 'string', description: 'Pre-sales percentage, e.g. "30"' },
        deriskPreSalesCount:  { type: 'string', description: 'Number of pre-sales' },
      },
    },
  }],

  derisk: [{
    type: 'client',
    name: 'set_derisk_fields',
    description: SHARED_TOOL_DESCRIPTION,
    parameters: {
      type: 'object',
      properties: {
        deriskDaApproved:               { type: 'boolean' },
        deriskVendorFinance:            { type: 'boolean' },
        deriskVendorFinanceTerms:       { type: 'string' },
        deriskFixedPriceConstruction:   { type: 'boolean' },
        deriskConstructionPartner:      { type: 'string' },
        deriskExperiencedPm:            { type: 'boolean' },
        deriskPmName:                   { type: 'string' },
        deriskClearTitle:               { type: 'boolean' },
        deriskGrowthCorridor:           { type: 'boolean' },
        riskPreviousDisputes:    { type: 'boolean' },
        riskDisputeDetails:      { type: 'string' },
        riskEnvironmentalIssues: { type: 'boolean' },
        riskEnvironmentalDetails:{ type: 'string' },
        riskHeritageOverlay:     { type: 'boolean' },
        riskHeritageDetails:     { type: 'string' },
      },
    },
  }],
}

// ── System prompts ──────────────────────────────────────────────
// Designed for an Australian property-developer audience. Each
// prompt MUST instruct the agent to call its set_*_fields tool as
// it collects info, not to wait until the end.

const prompts = {
  basics: `You are a friendly assistant helping Australian property developers log a new development opportunity in DealFindrs.

You are Step 1 of 5: BASICS. Your job is to collect the basic information about the opportunity.

Collect, in roughly this order:
1. Property/opportunity name (or auto-derive from address)
2. Street address
3. Suburb/city
4. State (NSW, VIC, QLD, WA, SA, TAS, NT, ACT)
5. Postcode
6. Number of lots or dwellings planned
7. Landowner details (name, phone, email — optional)
8. How they found this opportunity (source)

CRITICAL TOOL USE INSTRUCTIONS:
- The form is on the user's screen. As soon as you collect a value, call the set_basics_fields tool with that value. Do NOT wait until the end.
- You can call set_basics_fields many times during the conversation. Each call updates the fields you pass; fields you omit are unchanged.
- After calling the tool, the user will see the field fill in on their screen. Acknowledge briefly ("got it") and move to the next field.
- Don't ask "shall I save that?" — just save it via the tool, immediately.

Style: friendly, conversational, Australian. Use property terminology where appropriate. If they're not sure about an optional field, just skip it.

When you've covered the main fields and the user signals they're done, summarise what you captured and tell them they can move to the next step on their screen. Don't keep pestering them after they've said they're done — say goodbye politely.`,

  property: `You are a friendly assistant helping Australian property developers log a new development opportunity in DealFindrs.

You are Step 2 of 5: PROPERTY. Your job is to collect property details, de-risk factors, and risk factors.

Collect, in roughly this order:
1. Land size (number + unit: sqm, hectares, or acres)
2. Land stage: da_approved, da_lodged, needs_rezoning, raw_land, or construction_ready
3. Current zoning (e.g. R1, R2, B4)
4. Existing structures on the land (or "none")
5. Number of lots and dwellings
6. De-risk factors (boolean each): vendor finance, fixed-price construction (+ partner name), experienced PM, clear title, growth corridor location
7. Risk factors (boolean each): previous legal disputes, environmental issues, heritage overlay (+ details for any that apply)

CRITICAL TOOL USE INSTRUCTIONS:
- The form is on the user's screen. As soon as you collect a value, call the set_property_fields tool with that value. Do NOT wait until the end.
- You can call set_property_fields many times. Each call updates only the fields you pass.
- For boolean fields (de-risk and risk), pass true or false explicitly when the user confirms or denies.
- Don't ask permission to save — just call the tool.

Style: friendly, conversational, Australian. Use property terminology. If they're unsure about a de-risk or risk factor, skip it (don't pass it as false unless they explicitly say no).

When you've covered the main fields, summarise and tell them they can move to the next step.`,

  financial: `You are a friendly assistant helping Australian property developers log a new development opportunity in DealFindrs.

You are Step 3 of 5: FINANCIAL. Your job is to collect deal financials.

Collect:
1. Land purchase price (AUD)
2. Infrastructure costs (AUD)
3. Construction cost per unit (AUD)
4. Average sale price per unit (AUD)
5. Contingency percentage (typical 5-10)
6. Project timeframe in months (typical 12-24)
7. Target start date
8. Pre-sales secured (percentage and count)

CRITICAL TOOL USE INSTRUCTIONS:
- The form is on the user's screen. As soon as you collect a value, call the set_financial_fields tool with that value as a string. Do NOT wait until the end.
- For currency, use the raw number as a string (e.g. "2500000" not "$2.5M"). The form does the formatting.
- For percentages, pass the number only (e.g. "5" for 5%).
- Don't ask permission to save — just call the tool.

Style: helpful, numerate, Australian. If they're unsure about a number, offer typical ranges. Be conversational, not formal.

If they give per-unit numbers, that's fine — the form does the multiplication. After the main fields, give a quick GM% read of where this looks like it's landing (you can mention green >25%, amber 18-25%, red <18%) and offer to move on.`,

  derisk: `You are a friendly assistant helping Australian property developers log a new development opportunity in DealFindrs.

Your job is to walk the user through the de-risk checklist (factors that add points to the deal score) and risk factors (factors that deduct points).

DE-RISK FACTORS (booleans, plus optional detail strings):
- DA approved
- Vendor finance available (with terms detail)
- Fixed-price construction (with partner name)
- Experienced PM (with PM name)
- Clear title
- Growth corridor location

RISK FACTORS (booleans, plus optional detail strings):
- Previous legal disputes (with details)
- Environmental concerns (with details)
- Heritage overlay (with details)

CRITICAL TOOL USE INSTRUCTIONS:
- The form is on the user's screen. As soon as you confirm a value, call the set_derisk_fields tool with that value. Do NOT wait until the end.
- For each factor: ask, get a yes/no, set the boolean immediately, then ask for the detail string if applicable.
- Don't ask permission to save — just call the tool.

Style: methodical but warm. Don't drone through the list robotically — ask follow-up questions where natural. Australian property terminology.

When done, summarise what de-risk and risk factors are flagged and tell them they can move to the next step.`,
}

// ── API ─────────────────────────────────────────────────────────
async function getAgent(id) {
  const res = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${id}`, {
    headers: { 'xi-api-key': KEY },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`GET ${id} failed (${res.status}): ${text}`)
  }
  return res.json()
}

async function patchAgent(id, body) {
  const res = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${id}`, {
    method: 'PATCH',
    headers: {
      'xi-api-key': KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`PATCH ${id} failed (${res.status}): ${text}`)
  }
  return res.json()
}

async function updateOne(slug, agentId) {
  if (!agentId) {
    console.log(`SKIP ${slug}: no agent ID in env (NEXT_PUBLIC_ELEVENLABS_AGENT_${slug.toUpperCase()})`)
    return { slug, status: 'skipped', reason: 'missing agent id' }
  }

  console.log(`\n[${slug}] agent ${agentId}`)
  console.log(`  fetching current config...`)
  const current = await getAgent(agentId)

  const body = {
    conversation_config: {
      ...(current.conversation_config || {}),
      agent: {
        ...((current.conversation_config && current.conversation_config.agent) || {}),
        prompt: {
          ...((current.conversation_config && current.conversation_config.agent && current.conversation_config.agent.prompt) || {}),
          prompt: prompts[slug],
          tools: tools[slug],
        },
        language: 'en',
      },
    },
  }

  console.log(`  patching prompt + ${tools[slug].length} client tool(s)...`)
  await patchAgent(agentId, body)
  console.log(`  OK`)
  return { slug, status: 'updated' }
}

async function main() {
  console.log('='.repeat(60))
  console.log('  ElevenLabs Agent Tools & Prompt Update')
  console.log('='.repeat(60))
  console.log(`API key:       ${KEY.slice(0, 8)}...${KEY.slice(-4)}`)
  console.log('Agents to update:')
  for (const [slug, id] of Object.entries(AGENT_IDS)) {
    console.log(`  ${slug.padEnd(10)} ${id || '(missing)'}`)
  }
  console.log('-'.repeat(60))

  const results = []
  for (const [slug, id] of Object.entries(AGENT_IDS)) {
    try {
      results.push(await updateOne(slug, id))
    } catch (err) {
      console.error(`[${slug}] ERROR: ${err.message}`)
      results.push({ slug, status: 'error', error: err.message })
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('Summary:')
  for (const r of results) {
    console.log(`  ${r.slug.padEnd(10)} ${r.status}${r.error ? ' — ' + r.error : ''}${r.reason ? ' — ' + r.reason : ''}`)
  }
  console.log('='.repeat(60))

  const failed = results.filter(r => r.status === 'error').length
  if (failed > 0) {
    console.log(`\n${failed} agent(s) failed. Check the error message and ElevenLabs dashboard.`)
    process.exit(1)
  }
  console.log('\nDone. Now redeploy the app so the updated VoiceInput.tsx ships.')
}

main().catch(err => {
  console.error('FATAL:', err)
  process.exit(1)
})
