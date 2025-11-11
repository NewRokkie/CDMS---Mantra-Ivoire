-- Migration: Create login history tracking table
-- Description: Tracks user login sessions for security and monitoring
-- Created: 2025-11-10

-- Create user_login_history table
CREATE TABLE IF NOT EXISTS public.user_login_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    login_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    logout_time TIMESTAMPTZ,
    session_duration_minutes INTEGER,
    ip_address VARCHAR(45),
    user_agent TEXT,
    login_method VARCHAR(50) DEFAULT 'email',
    is_successful BOOLEAN DEFAULT true,
    failure_reason TEXT,
    location_info JSONB DEFAULT '{}'::jsonb,
    device_info JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_login_history_user_id ON public.user_login_history(user_id);
CREATE INDEX IF NOT EXISTS idx_login_history_login_time ON public.user_login_history(login_time DESC);
CREATE INDEX IF NOT EXISTS idx_login_history_user_login ON public.user_login_history(user_id, login_time DESC);
CREATE INDEX IF NOT EXISTS idx_login_history_ip_address ON public.user_login_history(ip_address);
CREATE INDEX IF NOT EXISTS idx_login_history_successful ON public.user_login_history(is_successful);

-- Add comments
COMMENT ON TABLE public.user_login_history IS 'Tracks user login sessions for security and monitoring';
COMMENT ON COLUMN public.user_login_history.user_id IS 'User who logged in';
COMMENT ON COLUMN public.user_login_history.login_time IS 'When the user logged in';
COMMENT ON COLUMN public.user_login_history.logout_time IS 'When the user logged out (NULL if still active)';
COMMENT ON COLUMN public.user_login_history.session_duration_minutes IS 'Duration of the session in minutes';
COMMENT ON COLUMN public.user_login_history.is_successful IS 'Whether the login attempt was successful';
COMMENT ON COLUMN public.user_login_history.failure_reason IS 'Reason for login failure if applicable';

-- Create function to calculate session duration on logout
CREATE OR REPLACE FUNCTION calculate_session_duration()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.logout_time IS NOT NULL AND NEW.login_time IS NOT NULL THEN
        NEW.session_duration_minutes := EXTRACT(EPOCH FROM (NEW.logout_time - NEW.login_time)) / 60;
    END IF;
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for session duration calculation
DROP TRIGGER IF EXISTS trigger_calculate_session_duration ON public.user_login_history;
CREATE TRIGGER trigger_calculate_session_duration
    BEFORE UPDATE ON public.user_login_history
    FOR EACH ROW
    WHEN (NEW.logout_time IS NOT NULL AND OLD.logout_time IS NULL)
    EXECUTE FUNCTION calculate_session_duration();

-- Enable RLS
ALTER TABLE public.user_login_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Admins can view all login history
CREATE POLICY "Admins can view all login history"
    ON public.user_login_history
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
            AND users.active = true
            AND users.is_deleted = false
        )
    );

-- Users can view their own login history
CREATE POLICY "Users can view their own login history"
    ON public.user_login_history
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- System can insert and update login records (service role)
CREATE POLICY "Service role can manage login history"
    ON public.user_login_history
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Grant permissions
GRANT SELECT ON public.user_login_history TO authenticated;
GRANT INSERT, UPDATE ON public.user_login_history TO authenticated;
GRANT ALL ON public.user_login_history TO service_role;
