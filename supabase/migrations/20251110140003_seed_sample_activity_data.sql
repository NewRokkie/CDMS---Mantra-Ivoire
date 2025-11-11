-- Migration: Seed sample activity and login data for testing
-- Description: Adds sample data to demonstrate activity tracking features
-- Created: 2025-11-10
-- Note: This is for development/testing only. Remove in production.

-- Insert sample user activities for existing users
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
            (v_user_id, NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days' + INTERVAL '2 hours', 120, '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', true),
            -- Failed login attempt
            (v_user_id, NOW() - INTERVAL '4 days', NULL, NULL, '192.168.1.105', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', false);

        RAISE NOTICE 'Sample activity data seeded successfully for user: %', v_user_id;
    ELSE
        RAISE NOTICE 'No active users found. Skipping sample data seeding.';
    END IF;
END $$;

-- Add comment
COMMENT ON TABLE public.user_activities IS 'Sample data added for testing. Remove in production.';
COMMENT ON TABLE public.user_login_history IS 'Sample data added for testing. Remove in production.';
