-- PSBUniverse SSO System - Database Migrations
-- Tables for session management and module authorization

-- ── Sessions Table ────────────────────────────────────────────────────────
-- Stores active and historical session records
CREATE TABLE IF NOT EXISTS public.psb_sessions (
  id BIGSERIAL PRIMARY KEY,
  auth_user_id UUID NOT NULL,
  user_id INTEGER NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  invalidated_at TIMESTAMP WITH TIME ZONE,
  user_agent TEXT,
  ip_address TEXT,

  -- Foreign keys
  CONSTRAINT fk_auth_user_id FOREIGN KEY (auth_user_id)
    REFERENCES auth.users (id) ON DELETE CASCADE,
  CONSTRAINT fk_user_id FOREIGN KEY (user_id)
    REFERENCES psb_s_user (user_id) ON DELETE CASCADE
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_psb_sessions_auth_user_id ON public.psb_sessions (auth_user_id);
CREATE INDEX IF NOT EXISTS idx_psb_sessions_user_id ON public.psb_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_psb_sessions_expires_at ON public.psb_sessions (expires_at);
CREATE INDEX IF NOT EXISTS idx_psb_sessions_is_active ON public.psb_sessions (is_active);

-- Enable RLS
ALTER TABLE public.psb_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view only their own sessions
CREATE POLICY "Users can view their own sessions"
  ON public.psb_sessions
  FOR SELECT
  USING (auth.uid() = auth_user_id);

-- Policy: Sessions can only be inserted by authenticated users
CREATE POLICY "Authenticated users can create sessions"
  ON public.psb_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = auth_user_id);

-- ── Session Tokens Table ────────────────────────────────────────────────
-- Audit trail for token invalidations (logout events)
CREATE TABLE IF NOT EXISTS public.psb_session_tokens (
  id BIGSERIAL PRIMARY KEY,
  auth_user_id UUID NOT NULL,
  user_id INTEGER NOT NULL,
  token_hash TEXT NOT NULL,
  invalidated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  invalidation_reason TEXT,

  -- Foreign keys
  CONSTRAINT fk_auth_user_id FOREIGN KEY (auth_user_id)
    REFERENCES auth.users (id) ON DELETE CASCADE,
  CONSTRAINT fk_user_id FOREIGN KEY (user_id)
    REFERENCES psb_s_user (user_id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_psb_session_tokens_auth_user_id ON public.psb_session_tokens (auth_user_id);
CREATE INDEX IF NOT EXISTS idx_psb_session_tokens_user_id ON public.psb_session_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_psb_session_tokens_invalidated_at ON public.psb_session_tokens (invalidated_at);

-- Enable RLS
ALTER TABLE public.psb_session_tokens ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can view token audit trail
CREATE POLICY "Admins can view all token invalidations"
  ON public.psb_session_tokens
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM psb_m_userapproleaccess m
      JOIN psb_s_user u ON m.user_id = u.user_id
      JOIN psb_s_role r ON m.role_id = r.role_id
      WHERE u.auth_user_id = auth.uid()
      AND r.role_name IN ('admin', 'super_admin')
    )
  );

-- ── Session Cleanup Function ────────────────────────────────────────────
-- Automatically clean up expired sessions
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM public.psb_sessions
  WHERE expires_at < NOW();
  
  DELETE FROM public.psb_session_tokens
  WHERE invalidated_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Function to invalidate user sessions ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.invalidate_user_sessions_func()
RETURNS trigger AS $$
BEGIN
  UPDATE public.psb_sessions
  SET is_active = FALSE, invalidated_at = NOW()
  WHERE user_id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Trigger to update session validity ────────────────────────────────────
-- Mark sessions as inactive when user is deactivated
CREATE OR REPLACE TRIGGER invalidate_user_sessions
AFTER UPDATE ON public.psb_s_user
FOR EACH ROW
WHEN (NEW.is_active = FALSE AND OLD.is_active = TRUE)
EXECUTE FUNCTION public.invalidate_user_sessions_func();

-- ── View for active sessions (convenience) ────────────────────────────────
CREATE OR REPLACE VIEW public.psb_active_sessions AS
SELECT
  s.id,
  s.auth_user_id,
  s.user_id,
  u.email,
  u.first_name,
  u.last_name,
  s.created_at,
  s.expires_at,
  EXTRACT(EPOCH FROM (s.expires_at - NOW())) as seconds_until_expiry
FROM public.psb_sessions s
JOIN auth.users au ON s.auth_user_id = au.id
JOIN psb_s_user u ON s.user_id = u.user_id
WHERE s.is_active = TRUE
  AND s.expires_at > NOW();

-- Grant permissions
GRANT SELECT ON public.psb_active_sessions TO authenticated;

-- Comments
COMMENT ON TABLE public.psb_sessions IS 'SSO session records for PSBUniverse - stores active and historical sessions';
COMMENT ON TABLE public.psb_session_tokens IS 'Audit trail for invalidated tokens (logout events)';
COMMENT ON FUNCTION public.cleanup_expired_sessions() IS 'Removes expired sessions and old token audit records - run periodically';
