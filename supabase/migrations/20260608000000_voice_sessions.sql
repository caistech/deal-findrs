-- voice_sessions: server-side session binding for ElevenLabs conversations.
--
-- WHY THIS EXISTS:
-- VMS rule 9 requires identity be server-derived at conversation connect time.
-- When the /api/voice/elevenlabs-connect route issues a signed URL to the client,
-- it simultaneously writes a voice_session row binding that signed URL's
-- conversation_id to the auth'd user's identity. Webhooks then look up the
-- real user_id/company_id via conversation_id — never from client-supplied metadata.
--
-- This eliminates the tenant-ID spoofing risk: a client cannot forge its identity
-- by including a different user_id in the conversation initiation payload.

CREATE TABLE IF NOT EXISTS voice_sessions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL,
  company_id      uuid,
  opportunity_id  uuid,
  assessment_id   uuid,
  conversation_id text NOT NULL,          -- ElevenLabs conversation_id bound server-side
  agent_type      text NOT NULL,          -- e.g. 'setup', 'opportunity_basics', etc.
  expires_at      timestamptz NOT NULL,   -- typically now() + 30 minutes
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Index for the webhook lookup: conversation_id + expiry check
CREATE INDEX IF NOT EXISTS voice_sessions_conversation_id_idx
  ON voice_sessions (conversation_id);

-- TTL index: allows efficient purge of expired rows
CREATE INDEX IF NOT EXISTS voice_sessions_expires_at_idx
  ON voice_sessions (expires_at);

-- RLS: users can only see their own sessions; service-role bypasses for webhook lookups
ALTER TABLE voice_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "voice_sessions_own_read" ON voice_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "voice_sessions_own_insert" ON voice_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Purge expired sessions (run via a scheduled job or on-demand)
-- Service-role callers can DELETE; RLS does not restrict service-role.
