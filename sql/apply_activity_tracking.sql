-- ============================================================================
-- ACTIVITY TRACKING MIGRATION - COMPLETE SCRIPT
-- Run this in Supabase Dashboard > SQL Editor
-- ============================================================================

-- ============================================================================
-- PART 1: Create user_activities table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_user_activities_user_id ON public.user_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_created_at ON public.user_activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activities_action ON public.user_activities(action);
CREATE INDEX IF NOT EXISTS idx_user_activities_entity ON public.user_activities(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_user_date ON public.user_activities(user_id, created_at DESC);

-- Add comments
COMMENT ON TABLE public.user_activities IS 'Tracks user activities for audit and monitoring';
COMMENT ON COLUMN public.user_activities.user_id IS 'User who performed the action';
COMMENT ON COLUMN public.user_activities.action IS 'Type of action performed (e.g., login, create, update, delete)';
COMMENT ON COLUMN public.user_activities.entity_type IS 'Type of entity affected (e.g., container, user, client)';
COMMENT ON COLUMN public.user_activities.entity_id IS 'ID of the affected entity';
COMMENT ON COLUMN public.user_activities.description IS 'Human-readable description of the activity';
COMMENT ON COLUMN public.user_activities.metadata IS 'Additional context and data about the activity';

-- Enable RLS
ALTER TABLE public.user_activities ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can view all user activities" ON public.user_activities;
DROP POLICY IF EXISTS "Users can view their own activities" ON public.user_activities;
DROP POLICY IF EXISTS "Service role can insert activities" ON public.user_activities;

-- RLS Policies
CREATE POLICY "Admins can view all user activities"
    ON public.user_activities
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

CREATE POLICY "Users can view their own activities"
    ON public.user_activities
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Service role can insert activities"
    ON public.user_activities
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Grant permissions
GRANT SELECT ON public.user_activities TO authenticated;
GRANT INSERT ON public.user_activities TO authenticated;
GRANT SELECT, INSERT ON public.user_activities TO service_role;

-- ============================================================================
-- PART 2: Create user_login_history table
-- ============================================================================

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

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can view all login history" ON public.user_login_history;
DROP POLICY IF EXISTS "Users can view their own login history" ON public.user_login_history;
DROP POLICY IF EXISTS "Service role can manage login history" ON public.user_login_history;

-- RLS Policies
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

CREATE POLICY "Users can view their own login history"
    ON public.user_login_history
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

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

-- ============================================================================
-- PART 3: Create helper functions
-- ============================================================================

-- Function to log user activity
CREATE OR REPLACE FUNCTION log_user_activity(
    p_user_id UUID,
    p_action VARCHAR(100),
    p_entity_type VARCHAR(50) DEFAULT NULL,
    p_entity_id UUID DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb,
    p_ip_address VARCHAR(45) DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_activity_id UUID;
BEGIN
    INSERT INTO public.user_activities (
        user_id,
        action,
        entity_type,
        entity_id,
        description,
        metadata,
        ip_address,
        user_agent
    ) VALUES (
        p_user_id,
        p_action,
        p_entity_type,
        p_entity_id,
        p_description,
        p_metadata,
        p_ip_address,
        p_user_agent
    )
    RETURNING id INTO v_activity_id;
    
    RETURN v_activity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record login
CREATE OR REPLACE FUNCTION record_user_login(
    p_user_id UUID,
    p_ip_address VARCHAR(45) DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_login_method VARCHAR(50) DEFAULT 'email',
    p_device_info JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
    v_login_id UUID;
BEGIN
    -- Insert login record
    INSERT INTO public.user_login_history (
        user_id,
        login_time,
        ip_address,
        user_agent,
        login_method,
        is_successful,
        device_info
    ) VALUES (
        p_user_id,
        NOW(),
        p_ip_address,
        p_user_agent,
        p_login_method,
        true,
        p_device_info
    )
    RETURNING id INTO v_login_id;
    
    -- Update user's last_login
    UPDATE public.users
    SET last_login = NOW()
    WHERE id = p_user_id;
    
    -- Log activity
    PERFORM log_user_activity(
        p_user_id,
        'login',
        'session',
        v_login_id,
        'User logged in',
        jsonb_build_object('login_method', p_login_method),
        p_ip_address,
        p_user_agent
    );
    
    RETURN v_login_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record logout
CREATE OR REPLACE FUNCTION record_user_logout(
    p_login_id UUID,
    p_user_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_id UUID;
    v_login_time TIMESTAMPTZ;
BEGIN
    -- Get user_id and login_time if not provided
    SELECT user_id, login_time INTO v_user_id, v_login_time
    FROM public.user_login_history
    WHERE id = p_login_id;
    
    IF v_user_id IS NULL THEN
        RETURN false;
    END IF;
    
    -- Update logout time
    UPDATE public.user_login_history
    SET logout_time = NOW()
    WHERE id = p_login_id
    AND logout_time IS NULL;
    
    -- Log activity
    PERFORM log_user_activity(
        v_user_id,
        'logout',
        'session',
        p_login_id,
        'User logged out',
        jsonb_build_object('session_duration_minutes', EXTRACT(EPOCH FROM (NOW() - v_login_time)) / 60),
        NULL,
        NULL
    );
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record failed login attempt
CREATE OR REPLACE FUNCTION record_failed_login(
    p_email VARCHAR(255),
    p_failure_reason TEXT,
    p_ip_address VARCHAR(45) DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_user_id UUID;
    v_login_id UUID;
BEGIN
    -- Try to find user by email
    SELECT id INTO v_user_id
    FROM public.users
    WHERE email = p_email
    LIMIT 1;
    
    -- Insert failed login record
    INSERT INTO public.user_login_history (
        user_id,
        login_time,
        ip_address,
        user_agent,
        is_successful,
        failure_reason
    ) VALUES (
        v_user_id,
        NOW(),
        p_ip_address,
        p_user_agent,
        false,
        p_failure_reason
    )
    RETURNING id INTO v_login_id;
    
    -- Log activity if user exists
    IF v_user_id IS NOT NULL THEN
        PERFORM log_user_activity(
            v_user_id,
            'login_failed',
            'session',
            v_login_id,
            'Failed login attempt: ' || p_failure_reason,
            jsonb_build_object('reason', p_failure_reason),
            p_ip_address,
            p_user_agent
        );
    END IF;
    
    RETURN v_login_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION log_user_activity TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION record_user_login TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION record_user_logout TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION record_failed_login TO authenticated, service_role;

-- Add comments
COMMENT ON FUNCTION log_user_activity IS 'Logs a user activity to the user_activities table';
COMMENT ON FUNCTION record_user_login IS 'Records a successful user login and updates last_login';
COMMENT ON FUNCTION record_user_logout IS 'Records a user logout and calculates session duration';
COMMENT ON FUNCTION record_failed_login IS 'Records a failed login attempt for security monitoring';

-- ============================================================================
-- PART 4: Seed sample data (DEVELOPMENT ONLY - Remove in production)
-- ============================================================================

DO $$
DECLARE
    v_user_id UUID;
    v_container_id UUID;
    v_client_id UUID;
BEGIN
    -- Get a sample user (first active user)
    SELECT id INTO v_user_id
    FROM public.users
    WHERE active = true AND is_deleted = false
    LIMIT 1;

    -- Only proceed if we have a user
    IF v_user_id IS NOT NULL THEN
        -- Get sample container and client IDs
        SELECT id INTO v_container_id FROM public.containers LIMIT 1;
        SELECT id INTO v_client_id FROM public.clients LIMIT 1;

        -- Insert login activities (last 7 days)
        INSERT INTO public.user_activities (user_id, action, entity_type, entity_id, description, ip_address, created_at)
        VALUES
            (v_user_id, 'login', 'session', gen_random_uuid(), 'User logged into the system', '192.168.1.100', NOW() - INTERVAL '1 hour'),
            (v_user_id, 'login', 'session', gen_random_uuid(), 'User logged into the system', '192.168.1.100', NOW() - INTERVAL '1 day'),
            (v_user_id, 'login', 'session', gen_random_uuid(), 'User logged into the system', '192.168.1.101', NOW() - INTERVAL '2 days'),
            (v_user_id, 'login', 'session', gen_random_uuid(), 'User logged into the system', '192.168.1.100', NOW() - INTERVAL '3 days'),
            (v_user_id, 'login', 'session', gen_random_uuid(), 'User logged into the system', '192.168.1.100', NOW() - INTERVAL '5 days');

        -- Insert CRUD activities if we have entities
        IF v_container_id IS NOT NULL THEN
            INSERT INTO public.user_activities (user_id, action, entity_type, entity_id, description, metadata, ip_address, created_at)
            VALUES
                (v_user_id, 'view', 'container', v_container_id, 'Viewed container details', '{"container_number": "DEMO123456"}'::jsonb, '192.168.1.100', NOW() - INTERVAL '30 minutes'),
                (v_user_id, 'update', 'container', v_container_id, 'Updated container status', '{"old_status": "pending", "new_status": "active"}'::jsonb, '192.168.1.100', NOW() - INTERVAL '2 hours'),
                (v_user_id, 'create', 'container', v_container_id, 'Created new container', '{"container_number": "DEMO123456"}'::jsonb, '192.168.1.100', NOW() - INTERVAL '1 day');
        END IF;

        IF v_client_id IS NOT NULL THEN
            INSERT INTO public.user_activities (user_id, action, entity_type, entity_id, description, metadata, ip_address, created_at)
            VALUES
                (v_user_id, 'view', 'client', v_client_id, 'Viewed client details', '{}'::jsonb, '192.168.1.100', NOW() - INTERVAL '3 hours'),
                (v_user_id, 'update', 'client', v_client_id, 'Updated client information', '{"fields_changed": ["email", "phone"]}'::jsonb, '192.168.1.100', NOW() - INTERVAL '4 days');
        END IF;

        -- Insert export/import activities
        INSERT INTO public.user_activities (user_id, action, entity_type, description, metadata, ip_address, created_at)
        VALUES
            (v_user_id, 'export', 'report', 'Exported container report', '{"format": "xlsx", "record_count": 150}'::jsonb, '192.168.1.100', NOW() - INTERVAL '6 hours'),
            (v_user_id, 'export', 'report', 'Exported client list', '{"format": "csv", "record_count": 45}'::jsonb, '192.168.1.100', NOW() - INTERVAL '2 days');

        -- Insert login history (last 7 days)
        INSERT INTO public.user_login_history (user_id, login_time, logout_time, session_duration_minutes, ip_address, user_agent, is_successful)
        VALUES
            -- Active session (no logout yet)
            (v_user_id, NOW() - INTERVAL '1 hour', NULL, NULL, '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', true),
            -- Completed sessions
            (v_user_id, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day' + INTERVAL '2 hours', 120, '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', true),
            (v_user_id, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '3 hours', 180, '192.168.1.101', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36', true),
            (v_user_id, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days' + INTERVAL '1 hour', 60, '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', true),
            (v_user_id, NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days' + INTERVAL '4 hours', 240, '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', true),
            (v_user_id, NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days' + INTERVAL '2 hours', 120, '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', true);

        RAISE NOTICE 'Sample activity data seeded successfully for user: %', v_user_id;
    ELSE
        RAISE NOTICE 'No active users found. Skipping sample data seeding.';
    END IF;
END $$;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

SELECT 'Activity tracking migration completed successfully!' AS status;
SELECT COUNT(*) AS user_activities_count FROM public.user_activities;
SELECT COUNT(*) AS login_history_count FROM public.user_login_history;
