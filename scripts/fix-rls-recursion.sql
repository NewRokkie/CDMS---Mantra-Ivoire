/*
  Fix RLS Infinite Recursion Issue
  
  This SQL fixes the infinite recursion error in the users table by:
  1. Fixing the audit trigger that was querying users table from within users trigger
  2. Simplifying RLS policies to avoid self-referencing queries
  
  Execute this in your Supabase SQL Editor to fix the issue.
*/

-- Step 1: Fix the audit trigger to avoid recursion
CREATE OR REPLACE FUNCTION update_users_audit_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Set updated_by to the current auth user ID if available, otherwise use 'System'
  -- This avoids the infinite recursion by not querying the users table
  NEW.updated_by = COALESCE(
    auth.uid()::text,
    'System'
  );
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Drop ALL existing policies on users table to start clean
DROP POLICY IF EXISTS "Users view own profile" ON public.users;
DROP POLICY IF EXISTS "Users update own profile" ON public.users;
DROP POLICY IF EXISTS "Authenticated users can view users" ON public.users;
DROP POLICY IF EXISTS "Auth users view own profile" ON public.users;
DROP POLICY IF EXISTS "Auth admins manage users" ON public.users;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can manage users" ON public.users;

-- Step 3: Create simple, non-recursive policies

-- Simple policy: Users can view their own profile by auth_user_id
CREATE POLICY "users_select_own"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = auth_user_id);

-- Simple policy: Users can update their own profile
CREATE POLICY "users_update_own"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);

-- Policy for service role to manage all users (for admin operations)
CREATE POLICY "users_service_role_all"
  ON public.users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);