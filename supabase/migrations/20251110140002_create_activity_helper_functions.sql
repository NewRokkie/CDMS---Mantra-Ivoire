-- Migration: Create helper functions for activity tracking
-- Description: Utility functions to simplify activity and login tracking
-- Created: 2025-11-10

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
