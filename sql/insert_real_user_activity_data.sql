-- Insert real activity and login data for the current admin user
-- Run this in Supabase SQL Editor

-- First, let's check if the user exists and get their info
DO $$
DECLARE
    v_admin_user_id UUID := '19cd766c-1f82-4e57-b350-e1ac0327c349';
    v_user_exists BOOLEAN;
    v_container_id UUID;
    v_client_id UUID;
    v_yard_id UUID;
BEGIN
    -- Check if user exists
    SELECT EXISTS(SELECT 1 FROM public.users WHERE id = v_admin_user_id) INTO v_user_exists;
    
    IF NOT v_user_exists THEN
        RAISE NOTICE 'User % does not exist. Please update the UUID in this script.', v_admin_user_id;
        RETURN;
    END IF;

    -- Get some real entity IDs for realistic activities
    SELECT id INTO v_container_id FROM public.containers LIMIT 1;
    SELECT id INTO v_client_id FROM public.clients LIMIT 1;
    SELECT id INTO v_yard_id FROM public.yards LIMIT 1;

    -- Clear any existing sample data for this user
    DELETE FROM public.user_activities WHERE user_id = v_admin_user_id;
    DELETE FROM public.user_login_history WHERE user_id = v_admin_user_id;

    RAISE NOTICE 'Inserting activity data for user %', v_admin_user_id;

    -- Insert login activities (last 7 days)
    INSERT INTO public.user_activities (user_id, action, entity_type, entity_id, description, ip_address, created_at)
    VALUES
        (v_admin_user_id, 'login', 'session', gen_random_uuid(), 'User logged into the system', '192.168.1.100', NOW() - INTERVAL '30 minutes'),
        (v_admin_user_id, 'login', 'session', gen_random_uuid(), 'User logged into the system', '192.168.1.100', NOW() - INTERVAL '1 day'),
        (v_admin_user_id, 'login', 'session', gen_random_uuid(), 'User logged into the system', '192.168.1.101', NOW() - INTERVAL '2 days'),
        (v_admin_user_id, 'login', 'session', gen_random_uuid(), 'User logged into the system', '192.168.1.100', NOW() - INTERVAL '3 days'),
        (v_admin_user_id, 'login', 'session', gen_random_uuid(), 'User logged into the system', '192.168.1.100', NOW() - INTERVAL '5 days'),
        (v_admin_user_id, 'login', 'session', gen_random_uuid(), 'User logged into the system', '192.168.1.100', NOW() - INTERVAL '7 days');

    -- Insert various user activities
    IF v_container_id IS NOT NULL THEN
        INSERT INTO public.user_activities (user_id, action, entity_type, entity_id, description, metadata, ip_address, created_at)
        VALUES
            (v_admin_user_id, 'view', 'container', v_container_id, 'Viewed container details', '{"container_number": "DEMO123456"}'::jsonb, '192.168.1.100', NOW() - INTERVAL '15 minutes'),
            (v_admin_user_id, 'update', 'container', v_container_id, 'Updated container status', '{"old_status": "pending", "new_status": "active"}'::jsonb, '192.168.1.100', NOW() - INTERVAL '1 hour'),
            (v_admin_user_id, 'create', 'container', v_container_id, 'Created new container', '{"container_number": "DEMO123456"}'::jsonb, '192.168.1.100', NOW() - INTERVAL '6 hours'),
            (v_admin_user_id, 'view', 'container', v_container_id, 'Viewed container list', '{}'::jsonb, '192.168.1.100', NOW() - INTERVAL '1 day');
    END IF;

    IF v_client_id IS NOT NULL THEN
        INSERT INTO public.user_activities (user_id, action, entity_type, entity_id, description, metadata, ip_address, created_at)
        VALUES
            (v_admin_user_id, 'view', 'client', v_client_id, 'Viewed client details', '{}'::jsonb, '192.168.1.100', NOW() - INTERVAL '2 hours'),
            (v_admin_user_id, 'update', 'client', v_client_id, 'Updated client information', '{"fields_changed": ["email", "phone"]}'::jsonb, '192.168.1.100', NOW() - INTERVAL '3 days'),
            (v_admin_user_id, 'create', 'client', v_client_id, 'Created new client', '{"client_name": "Test Client"}'::jsonb, '192.168.1.100', NOW() - INTERVAL '5 days');
    END IF;

    -- Insert user management activities
    INSERT INTO public.user_activities (user_id, action, entity_type, entity_id, description, metadata, ip_address, created_at)
    VALUES
        (v_admin_user_id, 'view', 'user', v_admin_user_id, 'Viewed user details', '{}'::jsonb, '192.168.1.100', NOW() - INTERVAL '10 minutes'),
        (v_admin_user_id, 'update', 'user', v_admin_user_id, 'Updated user permissions', '{"module": "containers", "enabled": true}'::jsonb, '192.168.1.100', NOW() - INTERVAL '4 days');

    -- Insert export activities
    INSERT INTO public.user_activities (user_id, action, entity_type, description, metadata, ip_address, created_at)
    VALUES
        (v_admin_user_id, 'export', 'report', 'Exported container report', '{"format": "xlsx", "record_count": 150}'::jsonb, '192.168.1.100', NOW() - INTERVAL '3 hours'),
        (v_admin_user_id, 'export', 'report', 'Exported client list', '{"format": "csv", "record_count": 45}'::jsonb, '192.168.1.100', NOW() - INTERVAL '2 days'),
        (v_admin_user_id, 'export', 'report', 'Exported gate operations report', '{"format": "pdf", "record_count": 89}'::jsonb, '192.168.1.100', NOW() - INTERVAL '6 days');

    -- Insert login history (last 7 days)
    INSERT INTO public.user_login_history (user_id, login_time, logout_time, session_duration_minutes, ip_address, user_agent, is_successful)
    VALUES
        -- Active session (no logout yet)
        (v_admin_user_id, NOW() - INTERVAL '30 minutes', NULL, NULL, '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', true),
        -- Completed sessions
        (v_admin_user_id, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day' + INTERVAL '2 hours', 120, '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', true),
        (v_admin_user_id, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '3 hours', 180, '192.168.1.101', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', true),
        (v_admin_user_id, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days' + INTERVAL '1 hour 30 minutes', 90, '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', true),
        (v_admin_user_id, NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days' + INTERVAL '4 hours', 240, '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', true),
        (v_admin_user_id, NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days' + INTERVAL '2 hours 15 minutes', 135, '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', true),
        (v_admin_user_id, NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days' + INTERVAL '5 hours', 300, '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', true),
        (v_admin_user_id, NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days' + INTERVAL '1 hour 45 minutes', 105, '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', true);

    -- Insert a failed login attempt for security monitoring
    INSERT INTO public.user_login_history (user_id, login_time, logout_time, session_duration_minutes, ip_address, user_agent, is_successful, failure_reason)
    VALUES
        (v_admin_user_id, NOW() - INTERVAL '4 days' - INTERVAL '30 minutes', NULL, NULL, '192.168.1.105', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', false, 'Invalid password');

    RAISE NOTICE 'Successfully inserted activity data for user %', v_admin_user_id;
    RAISE NOTICE 'Activities inserted: %', (SELECT COUNT(*) FROM public.user_activities WHERE user_id = v_admin_user_id);
    RAISE NOTICE 'Login sessions inserted: %', (SELECT COUNT(*) FROM public.user_login_history WHERE user_id = v_admin_user_id);
END $$;

-- Verify the data
SELECT 
    'user_activities' as table_name,
    COUNT(*) as record_count,
    MIN(created_at) as oldest_activity,
    MAX(created_at) as newest_activity
FROM public.user_activities 
WHERE user_id = '19cd766c-1f82-4e57-b350-e1ac0327c349'
UNION ALL
SELECT 
    'user_login_history' as table_name,
    COUNT(*) as record_count,
    MIN(login_time) as oldest_activity,
    MAX(login_time) as newest_activity
FROM public.user_login_history 
WHERE user_id = '19cd766c-1f82-4e57-b350-e1ac0327c349';
