import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/require-admin'

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY

// Voice IDs
const DEFAULT_VOICE = 'pFZP5JQG7iQjIQuC4Bku' // Lily

// Agent configurations
const AGENTS = [
  {
    name: 'DealFindrs Setup Assistant',
    slug: 'setup',
    webhook: '/api/webhooks/elevenlabs/setup',
    firstMessage: "G'day! I'm here to help you set up your assessment criteria for DealFindrs. We'll configure your gross margin thresholds and the de-risk factors that matter to your business. Let's start with the basics - what minimum gross margin percentage would you consider a GREEN light deal?",
    systemPrompt: `You are a friendly setup assistant for DealFindrs, a property development assessment platform used by Australian property developers.

Your job is to help the user configure their company's assessment criteria. You need to collect:

1. GROSS MARGIN THRESHOLDS
   - What minimum GM% should trigger a GREEN light? (typical: 25-30%)
   - What minimum GM% for AMBER? (typical: 18-22%)

2. DE-RISK FACTORS (things that add bonus points, 1-10 points each):
   - Pre-sales secured, DA approved, Fixed price contract, Site owned, Experienced builder, Finance pre-approved

3. RISK FACTORS (things that deduct points):
   - Contamination risk, Flood zone, Heritage overlay, Complex titles, Market concerns

Be conversational. Use Australian property terminology. When complete, summarize and confirm.

When finished, output JSON: {"type": "setup_complete", "data": {"min_gm_green": 25, "min_gm_amber": 18, "derisk_factors": [...], "risk_factors": [...]}}`,
  },
  {
    name: 'DealFindrs Opportunity Assistant',
    slug: 'opportunity-basics',
    webhook: '/api/webhooks/elevenlabs/opportunity-basics',
    firstMessage: "G'day! Let's log a new opportunity. What would you like to call this project?",
    systemPrompt: `You help property developers log new opportunities. Collect: property name, address, suburb/city, state, postcode, property type (subdivision/townhouses/apartments), number of lots/dwellings, landowner name (optional), landowner contact (optional).

Be conversational. When complete, output JSON: {"type": "opportunity_basics", "data": {"name": "...", "address": "...", "city": "...", "state": "...", "postcode": "...", "property_type": "...", "num_lots": 12}}`,
  },
  {
    name: 'DealFindrs Property Details',
    slug: 'opportunity-property',
    webhook: '/api/webhooks/elevenlabs/opportunity-property',
    firstMessage: "Now let's get into the property details. What stage is the land at - raw land, DA lodged, DA approved, or titled lots?",
    systemPrompt: `Collect property details: land stage (raw/da_lodged/da_approved/titled), land size sqm, avg lot size, dwelling mix, storeys, zoning, council, key dates (DA approval, construction start, completion).

When complete, output JSON: {"type": "opportunity_property", "data": {"land_stage": "...", "land_size_sqm": 5000, ...}}`,
  },
  {
    name: 'DealFindrs Financial Assistant',
    slug: 'opportunity-financial',
    webhook: '/api/webhooks/elevenlabs/opportunity-financial',
    firstMessage: "Time for the numbers! What's the land purchase price you're looking at?",
    systemPrompt: `Collect financials: land price, stamp duty, legal fees, DA costs, civil works, construction cost, professional fees, marketing, finance costs, contingency, sale prices, presales count/value. Calculate totals and GM%.

When complete, output JSON: {"type": "opportunity_financial", "data": {"land_price": 2000000, "total_costs": 6900000, "total_revenue": 7800000, "gross_margin_percent": 11.5, ...}}`,
  },
  {
    name: 'DealFindrs Risk Assessment',
    slug: 'opportunity-derisk',
    webhook: '/api/webhooks/elevenlabs/opportunity-derisk',
    firstMessage: "Let's go through the de-risk checklist. Do you have any pre-sales already secured?",
    systemPrompt: `Go through de-risk factors (presales, DA approved, fixed price contract, site owned, builder appointed, finance approved) and risk factors (contamination, flood zone, heritage, complex titles, market concerns, council issues).

When complete, output JSON: {"type": "opportunity_derisk", "data": {"applied_derisk": [{"factor": "...", "details": "..."}], "applied_risks": [...]}}`,
  },
  {
    name: 'DealFindrs Assessment Advisor',
    slug: 'assessment',
    webhook: '/api/webhooks/elevenlabs/assessment',
    firstMessage: "I've reviewed the assessment. Would you like me to walk you through the results?",
    systemPrompt: `You're a property development advisor explaining assessment results. Discuss the RAG status, score breakdown, key factors, path to green recommendations, and next steps (proceed/pend/archive).

When user decides, output JSON: {"type": "assessment_discussion", "data": {"decision": "proceed|pend|archive|undecided", "questions_asked": [...], "recommendations_discussed": [...]}}`,
  },
]

async function createAgent(agent: typeof AGENTS[0], appUrl: string) {
  const response = await fetch('https://api.elevenlabs.io/v1/convai/agents/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': ELEVENLABS_API_KEY!,
    },
    body: JSON.stringify({
      name: agent.name,
      conversation_config: {
        agent: {
          prompt: { prompt: agent.systemPrompt },
          first_message: agent.firstMessage,
          language: 'en',
        },
        tts: { voice_id: DEFAULT_VOICE },
      },
      platform_settings: {
        webhook: {
          url: `${appUrl}${agent.webhook}`,
          events: ['conversation.completed', 'conversation.failed'],
        },
      },
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to create ${agent.name}: ${error}`)
  }

  const data = await response.json()
  return data.agent_id
}

async function listAgents() {
  const response = await fetch('https://api.elevenlabs.io/v1/convai/agents', {
    headers: { 'xi-api-key': ELEVENLABS_API_KEY! },
  })
  if (!response.ok) return []
  const data = await response.json()
  return data.agents || []
}

async function deleteAgent(agentId: string) {
  await fetch(`https://api.elevenlabs.io/v1/convai/agents/${agentId}`, {
    method: 'DELETE',
    headers: { 'xi-api-key': ELEVENLABS_API_KEY! },
  })
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (admin.error) {
    return NextResponse.json(
      { error: admin.error },
      { status: admin.error === 'forbidden' ? 403 : 401 }
    )
  }
  if (!ELEVENLABS_API_KEY) {
    return NextResponse.json({ error: 'ELEVENLABS_API_KEY not configured' }, { status: 500 })
  }

  try {
    const { action, appUrl } = await request.json()
    
    if (!appUrl) {
      return NextResponse.json({ error: 'appUrl required' }, { status: 400 })
    }

    // List existing agents
    if (action === 'list') {
      const agents = await listAgents()
      const dealFindrsAgents = agents.filter((a: any) => a.name.startsWith('DealFindrs'))
      return NextResponse.json({ agents: dealFindrsAgents })
    }

    // Delete existing DealFindrs agents
    if (action === 'clean') {
      const agents = await listAgents()
      const dealFindrsAgents = agents.filter((a: any) => a.name.startsWith('DealFindrs'))
      for (const agent of dealFindrsAgents) {
        await deleteAgent(agent.agent_id)
      }
      return NextResponse.json({ deleted: dealFindrsAgents.length })
    }

    // Create all agents
    if (action === 'create') {
      const results: Record<string, string> = {}
      const errors: string[] = []

      for (const agent of AGENTS) {
        try {
          const agentId = await createAgent(agent, appUrl)
          results[agent.slug] = agentId
        } catch (error) {
          errors.push(`${agent.name}: ${error}`)
        }
      }

      return NextResponse.json({
        success: true,
        agents: results,
        errors: errors.length > 0 ? errors : undefined,
        env: {
          NEXT_PUBLIC_ELEVENLABS_AGENT_SETUP: results['setup'] || '',
          NEXT_PUBLIC_ELEVENLABS_AGENT_BASICS: results['opportunity-basics'] || '',
          NEXT_PUBLIC_ELEVENLABS_AGENT_PROPERTY: results['opportunity-property'] || '',
          NEXT_PUBLIC_ELEVENLABS_AGENT_FINANCIAL: results['opportunity-financial'] || '',
          NEXT_PUBLIC_ELEVENLABS_AGENT_DERISK: results['opportunity-derisk'] || '',
          NEXT_PUBLIC_ELEVENLABS_AGENT_ASSESSMENT: results['assessment'] || '',
        },
      })
    }

    return NextResponse.json({ error: 'Invalid action. Use: list, clean, or create' }, { status: 400 })
  } catch (error) {
    console.error('ElevenLabs setup error:', error)
    return NextResponse.json({ error: 'Setup failed' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (admin.error) {
    return NextResponse.json(
      { error: admin.error },
      { status: admin.error === 'forbidden' ? 403 : 401 }
    )
  }
  if (!ELEVENLABS_API_KEY) {
    return NextResponse.json({ configured: false })
  }

  const agents = await listAgents()
  const dealFindrsAgents = agents.filter((a: any) => a.name.startsWith('DealFindrs'))
  
  return NextResponse.json({
    configured: true,
    agentCount: dealFindrsAgents.length,
    agents: dealFindrsAgents.map((a: any) => ({ id: a.agent_id, name: a.name })),
  })
}
