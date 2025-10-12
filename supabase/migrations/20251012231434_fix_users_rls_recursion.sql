/*
  # Fix Users RLS Infinite Recursion

  The users table policies were causing infinite recursion because they
  referenced the users table within the policy check itself.

  Solution: Simplify policies to avoid self-referencing queries.
*/

-- Drop all existing policies on users table
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can manage users" ON public.users;
DROP POLICY IF EXISTS "Auth users view own profile" ON public.users;
DROP POLICY IF EXISTS "Auth admins manage users" ON public.users;

-- Simple policy: Users can view their own profile
CREATE POLICY "Users view own profile"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = auth_user_id);

-- Simple policy: Users can update their own profile
CREATE POLICY "Users update own profile"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);

-- For admin operations, we'll use service role or handle in app logic
-- This avoids the recursion problem
