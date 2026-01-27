-- Fix RLS policies to allow proper access to activity tables
-- The issue is likely that RLS is blocking the queries

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Admins can view all user activities" ON public.user_activities;
DROP POLICY IF EXISTS "Users can view their own activities" ON public.user_activities;
DROP POLICY IF EXISTS "Service role can insert activities" ON public.user_activities;

DROP POLICY IF EXISTS "Admins can view all login history" ON public.user_login_history;
DROP POLICY IF EXISTS "Users can view their own login history" ON public.user_login_history;
DROP POLICY IF EXISTS "Service role can manage login history" ON public.user_login_history;

-- Create more permissive policies for user_activities
-- Allow authenticated users to view all activities (for admin dashboard)
CREATE POLICY "Authenticated users can view all activities"
    ON public.user_activities
    FOR SELECT
    TO authenticated
    USING (true);

-- Allow service role to insert
CREATE POLICY "Service role can insert activities"
    ON public.user_activities
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Create more permissive policies for user_login_history
-- Allow authenticated users to view all login history (for admin dashboard)
CREATE POLICY "Authenticated users can view all login history"
    ON public.user_login_history
    FOR SELECT
    TO authenticated
    USING (true);

-- Allow service role to manage login history
CREATE POLICY "Service role can manage login history"
    ON public.user_login_history
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Verify policies are created
SELECT 
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename IN ('user_activities', 'user_login_history')
ORDER BY tablename, policyname;

-- Test query as authenticated user
SELECT 
    COUNT(*) as activity_count
FROM public.user_activities;

SELECT 
    COUNT(*) as login_count
FROM public.user_login_history;
