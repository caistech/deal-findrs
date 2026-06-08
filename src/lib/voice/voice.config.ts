// voice.config.ts — DealFindrs voice agent configuration
//
// Agent IDs are scaffolded here via the VMS wizard pattern (buildVoiceConfig /
// renderVoiceConfigModule from @caistech/elevenlabs-convai) so they are version-
// controlled alongside the product and NOT exposed as NEXT_PUBLIC_* env vars
// (which would bake them into the client bundle and expose the operator key path).
//
// To provision new agents: run `npx @caistech/elevenlabs-convai wizard` from the
// repo root. The wizard writes the agent IDs back to this file.
//
// BYOK note: the ElevenLabs API key lives in ELEVENLABS_API_KEY (server-only).
// No NEXT_PUBLIC_ELEVENLABS_API_KEY should ever appear in this codebase.

export interface AgentConfig {
  agentId: string
  placement: 'floating' | 'sidebar' | 'header' | 'inline'
  mode: 'greeting' | 'clarifier' | 'discovery' | 'interview'
}

// Agent IDs are read from env vars (server-side only) so they can be rotated
// via Vercel env without a redeploy. The env vars are NOT NEXT_PUBLIC_ —
// they never reach the client bundle.
export const VOICE_AGENTS: Record<string, AgentConfig> = {
  setup: {
    agentId: process.env.ELEVENLABS_AGENT_SETUP ?? '',
    placement: 'floating',
    mode: 'clarifier',
  },
  opportunity_basics: {
    agentId: process.env.ELEVENLABS_AGENT_BASICS ?? '',
    placement: 'inline',
    mode: 'interview',
  },
  opportunity_property: {
    agentId: process.env.ELEVENLABS_AGENT_PROPERTY ?? '',
    placement: 'inline',
    mode: 'interview',
  },
  opportunity_financial: {
    agentId: process.env.ELEVENLABS_AGENT_FINANCIAL ?? '',
    placement: 'inline',
    mode: 'interview',
  },
  opportunity_derisk: {
    agentId: process.env.ELEVENLABS_AGENT_DERISK ?? '',
    placement: 'inline',
    mode: 'interview',
  },
  assessment: {
    agentId: process.env.ELEVENLABS_AGENT_ASSESSMENT ?? '',
    placement: 'floating',
    mode: 'discovery',
  },
}

export type AgentType = keyof typeof VOICE_AGENTS

export function getAgentConfig(agentType: AgentType): AgentConfig {
  const config = VOICE_AGENTS[agentType]
  if (!config) {
    throw new Error(`[voice.config] Unknown agent type: ${agentType}`)
  }
  return config
}
