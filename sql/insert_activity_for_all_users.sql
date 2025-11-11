-- Insert activity and login data for ALL active users
-- Run this in Supabase SQL Editor

DO $$
DECLARE
    v_user RECORD;
    v_container_id UUID;
    v_client_id UUID;
    v_activity_count INTEGER := 0;
    v_login_count INTEGER := 0;
BEGIN
    -- Get some real entity IDs for realistic activities
    SELECT id INTO v_container_id FROM public.containers LIMIT 1;
    SELECT id INTO v_client_id FROM public.clients LIMIT 1;

    -- Loop through all active users
    FOR v_user IN 
        SELECT id, name, email 
        FROM public.users 
        WHERE active = true AND is_deleted = false
    LOOP
        RAISE NOTICE 'Processing user: % (% - %)', v_user.id, v_user.name, v_user.email;

        -- Insert login activities (last 7 days)
        INSERT INTO public.user_activities (user_id, action, entity_type, entity_id, description, ip_address, created_at)
        VALUES
            (v_user.id, 'login', 'session', gen_random_uuid(), 'User logged into the system', '192.168.1.100', NOW() - INTERVAL '30 minutes'),
            (v_user.id, 'login', 'session', gen_random_uuid(), 'User logged into the system', '192.168.1.100', NOW() - INTERVAL '1 day'),
            (v_user.id, 'login', 'session', gen_random_uuid(), 'User logged into the system', '192.168.1.101', NOW() - INTERVAL '2 days'),
            (v_user.id, 'login', 'session', gen_random_uuid(), 'User logged into the system', '192.168.1.100', NOW() - INTERVAL '3 days'),
            (v_user.id, 'login', 'session', gen_random_uuid(), 'User logged into the system', '192.168.1.100', NOW() - INTERVAL '5 days');

        v_activity_count := v_activity_count + 5;

        -- Insert various user activities
        IF v_container_id IS NOT NULL THEN
            INSERT INTO public.user_activities (user_id, action, entity_type, entity_id, description, metadata, ip_address, created_at)
            VALUES
                (v_user.id, 'view', 'container', v_container_id, 'Viewed container details', '{"container_number": "DEMO123456"}'::jsonb, '192.168.1.100', NOW() - INTERVAL '15 minutes'),
                (v_user.id, 'update', 'container', v_container_id, 'Updated container status', '{"old_status": "pending", "new_status": "active"}'::jsonb, '192.168.1.100', NOW() - INTERVAL '1 hour'),
                (v_user.id, 'view', 'container', v_container_id, 'Viewed container list', '{}'::jsonb, '192.168.1.100', NOW() - INTERVAL '1 day');
            
            v_activity_count := v_activity_count + 3;
        END IF;

        IF v_client_id IS NOT NULL THEN
            INSERT INTO public.user_activities (user_id, action, entity_type, entity_id, description, metadata, ip_address, created_at)
            VALUES
                (v_user.id, 'view', 'client', v_client_id, 'Viewed client details', '{}'::jsonb, '192.168.1.100', NOW() - INTERVAL '2 hours'),
                (v_user.id, 'update', 'client', v_client_id, 'Updated client information', '{"fields_changed": ["email"]}'::jsonb, '192.168.1.100', NOW() - INTERVAL '3 days');
            
            v_activity_count := v_activity_count + 2;
        END IF;

        -- Insert export activities
        INSERT INTO public.user_activities (user_id, action, entity_type, description, metadata, ip_address, created_at)
        VALUES
            (v_user.id, 'export', 'report', 'Exported container report', '{"format": "xlsx", "record_count": 150}'::jsonb, '192.168.1.100', NOW() - INTERVAL '3 hours'),
            (v_user.id, 'export', 'report', 'Exported client list', '{"format": "csv", "record_count": 45}'::jsonb, '192.168.1.100', NOW() - INTERVAL '2 days');

        v_activity_count := v_activity_count + 2;

        -- Insert login history (last 7 days)
        INSERT INTO public.user_login_history (user_id, login_time, logout_time, session_duration_minutes, ip_address, user_agent, is_successful)
        VALUES
            -- Active session (no logout yet)
            (v_user.id, NOW() - INTERVAL '30 minutes', NULL, NULL, '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', true),
            -- Completed sessions
            (v_user.id, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day' + INTERVAL '2 hours', 120, '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', true),
            (v_user.id, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '3 hours', 180, '192.168.1.101', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', true),
            (v_user.id, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days' + INTERVAL '1 hour 30 minutes', 90, '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', true),
            (v_user.id, NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days' + INTERVAL '4 hours', 240, '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', true);

        v_login_count := v_login_count + 5;

        RAISE NOTICE 'Completed user: %', v_user.name;
    END LOOP;

    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Data insertion completed!';
    RAISE NOTICE 'Total activities inserted: %', v_activity_count;
    RAISE NOTICE 'Total login sessions inserted: %', v_login_count;
    RAISE NOTICE '===========================================';
END $$;

-- Verify the data for all users
SELECT 
    u.name as user_name,
    u.email,
    COUNT(DISTINCT ua.id) as activity_count,
    COUNT(DISTINCT ulh.id) as login_count,
    MAX(ua.created_at) as last_activity,
    MAX(ulh.login_time) as last_login
FROM public.users u
LEFT JOIN public.user_activities ua ON ua.user_id = u.id
LEFT JOIN public.user_login_history ulh ON ulh.user_id = u.id
WHERE u.active = true AND u.is_deleted = false
GROUP BY u.id, u.name, u.email
ORDER BY u.name;
