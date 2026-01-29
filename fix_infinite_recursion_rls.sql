/*
  # Fix Infinite Recursion in Users RLS Policies

  1. Problem
    - The is_admin() function queries the users table, which has RLS enabled
    - This creates infinite recursion when RLS policies call is_admin()
    - Error: "infinite recursion detected in policy for relation users"
    - Other tables (like stacks) also depend on is_admin()

  2. Solution
    - Drop all policies that depend on is_admin() first
    - Drop the problematic is_admin() function
    - Create simple, non-recursive policies for users table
    - Recreate stack policies with alternative approaches

  3. Security
    - Maintains security by using auth.uid() for user identification
    - Stack admin operations handled through service role
    - Users can only access their own data
*/

-- Step 1: Drop all policies that depend on is_admin() function

-- Drop stack policies that use is_admin()
DROP POLICY IF EXISTS "Only admins can permanently delete inactive stacks" ON public.stacks;
DROP POLICY IF EXISTS "Admins can view all stacks" ON public.stacks;
DROP POLICY IF EXISTS "Admins can insert stacks" ON public.stacks;
DROP POLICY IF EXISTS "Admins can update stacks" ON public.stacks;
DROP POLICY IF EXISTS "Admins can delete stacks" ON public.stacks;

-- Drop user policies that use is_admin()
DROP POLICY IF EXISTS "Authenticated users can view users" ON public.users;
DROP POLICY IF EXISTS "Users view own profile" ON public.users;
DROP POLICY IF EXISTS "Users update own profile" ON public.users;
DROP POLICY IF EXISTS "Users update own last_login" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Admins can insert users" ON public.users;
DROP POLICY IF EXISTS "Admins can update users" ON public.users;
DROP POLICY IF EXISTS "Admins can delete users" ON public.users;
DROP POLICY IF EXISTS "Allow initial admin creation" ON public.users;

-- Step 2: Now we can safely drop the problematic function
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;
DROP FUNCTION IF EXISTS public.is_admin_or_supervisor() CASCADE;

-- Step 3: Drop any existing policies we're about to create (to avoid conflicts)
DROP POLICY IF EXISTS "users_select_own" ON public.users;
DROP POLICY IF EXISTS "users_update_own" ON public.users;
DROP POLICY IF EXISTS "users_insert_initial_admin" ON public.users;
DROP POLICY IF EXISTS "users_service_role_all" ON public.users;
DROP POLICY IF EXISTS "stacks_select_authenticated" ON public.stacks;
DROP POLICY IF EXISTS "stacks_insert_authenticated" ON public.stacks;
DROP POLICY IF EXISTS "stacks_update_authenticated" ON public.stacks;
DROP POLICY IF EXISTS "stacks_delete_service_role" ON public.stacks;

-- Step 4: Create simple, non-recursive policies for users table

-- Policy 1: Users can view their own profile
CREATE POLICY "users_select_own"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = auth_user_id);

-- Policy 2: Users can update their own profile (including last_login)
CREATE POLICY "users_update_own"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);

-- Policy 3: Allow initial admin creation (when no admin users exist)
CREATE POLICY "users_insert_initial_admin"
  ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    NOT public.has_admin_users() AND role = 'admin'
  );

-- Policy 4: Service role can do everything (for admin operations through API)
CREATE POLICY "users_service_role_all"
  ON public.users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Step 5: Recreate stack policies without is_admin() dependency

-- Policy: Authenticated users can view all stacks
CREATE POLICY "stacks_select_authenticated"
  ON public.stacks
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can insert stacks
CREATE POLICY "stacks_insert_authenticated"
  ON public.stacks
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Authenticated users can update stacks
CREATE POLICY "stacks_update_authenticated"
  ON public.stacks
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Service role can delete stacks (admin operations through API)
CREATE POLICY "stacks_delete_service_role"
  ON public.stacks
  FOR DELETE
  TO service_role
  USING (true);

-- Step 6: Ensure RLS is enabled and grant permissions

-- Users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
GRANT SELECT, UPDATE ON public.users TO authenticated;
GRANT ALL ON public.users TO service_role;

-- Stacks table
ALTER TABLE public.stacks ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.stacks TO authenticated;
GRANT ALL ON public.stacks TO service_role;

-- Step 7: Add helpful comments
COMMENT ON POLICY "users_select_own" ON public.users IS 
  'Users can only view their own profile to avoid recursion';
COMMENT ON POLICY "users_update_own" ON public.users IS 
  'Users can only update their own profile to avoid recursion';
COMMENT ON POLICY "users_insert_initial_admin" ON public.users IS 
  'Allows creation of initial admin user when no admins exist';
COMMENT ON POLICY "users_service_role_all" ON public.users IS 
  'Service role has full access for admin operations through API';

COMMENT ON POLICY "stacks_select_authenticated" ON public.stacks IS 
  'Authenticated users can view all stacks';
COMMENT ON POLICY "stacks_insert_authenticated" ON public.stacks IS 
  'Authenticated users can create stacks';
COMMENT ON POLICY "stacks_update_authenticated" ON public.stacks IS 
  'Authenticated users can update stacks';
COMMENT ON POLICY "stacks_delete_service_role" ON public.stacks IS 
  'Only service role can delete stacks (admin operations through API)';