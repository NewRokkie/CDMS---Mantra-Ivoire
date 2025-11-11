-- Debug script to check table structure and data
-- Run this in Supabase SQL Editor to diagnose the issue

-- 1. Check table structure for user_activities
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'user_activities'
ORDER BY ordinal_position;

-- 2. Check table structure for user_login_history
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'user_login_history'
ORDER BY ordinal_position;

-- 3. Check if data exists for the admin user
SELECT 
    'user_activities' as table_name,
    COUNT(*) as total_records,
    COUNT(DISTINCT user_id) as unique_users
FROM public.user_activities;

SELECT 
    'user_login_history' as table_name,
    COUNT(*) as total_records,
    COUNT(DISTINCT user_id) as unique_users
FROM public.user_login_history;

-- 4. Check sample data from user_activities
SELECT 
    id,
    user_id,
    action,
    entity_type,
    description,
    created_at
FROM public.user_activities
ORDER BY created_at DESC
LIMIT 5;

-- 5. Check sample data from user_login_history
SELECT 
    id,
    user_id,
    login_time,
    logout_time,
    session_duration_minutes,
    is_successful
FROM public.user_login_history
ORDER BY login_time DESC
LIMIT 5;

-- 6. Check RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename IN ('user_activities', 'user_login_history')
ORDER BY tablename, policyname;

-- 7. Test the exact query that the app is using
SELECT 
    id, 
    action, 
    description, 
    entity_type, 
    entity_id, 
    metadata, 
    ip_address, 
    created_at
FROM public.user_activities
WHERE user_id = '19cd766c-1f82-4e57-b350-e1ac0327c349'
ORDER BY created_at DESC
LIMIT 50;

-- 8. Test login history query
SELECT 
    id, 
    user_id, 
    login_time, 
    logout_time, 
    session_duration_minutes, 
    ip_address, 
    user_agent, 
    is_successful
FROM public.user_login_history
WHERE user_id = '19cd766c-1f82-4e57-b350-e1ac0327c349'
AND is_successful = true
ORDER BY login_time DESC
LIMIT 50;
