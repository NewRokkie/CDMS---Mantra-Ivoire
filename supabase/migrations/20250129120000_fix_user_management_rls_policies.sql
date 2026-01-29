/*
  # Fix User Management RLS Policies
  
  1. Problem
    - Admin users cannot see all users in User Management module
    - Only their own user appears in the list
    - Conflicting RLS policies preventing proper admin access
    
  2. Solution
    - Drop all existing conflicting policies
    - Create clean, non-conflicting policies
    - Ensure admin users can view/manage all users
    - Ensure regular users can only view their own profile
    
  3. Security
    - Admins can view, create, update, and delete all users
    - Regular users can only view and update their own profile
    - Uses is_admin() function to avoid recursion
*/

-- Drop ALL existing user policies to start clean
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users view own profile" ON public.users;
DROP POLICY IF EXISTS "Auth users view own profile" ON public.users;
DROP POLICY IF EXISTS "Authenticated users can view users" ON public.users;
DROP POLICY IF EXISTS "Users update own last_login" ON public.users;
DROP POLICY IF EXISTS "Users update own profile" ON public.users;
DROP POLICY IF EXISTS "Admin users can manage users" ON public.users;
DROP POLICY IF EXISTS "Auth admins manage users" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Admins can insert users" ON public.users;
DROP POLICY IF EXISTS "Admins can update users" ON public.users;
DROP POLICY IF EXISTS "Admins can delete users" ON public.users;

-- Ensure the is_admin function exists and is properly configured
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  user_role text;
BEGIN
  -- Get the role directly without RLS interference
  SELECT role INTO user_role
  FROM public.users
  WHERE auth_user_id = auth.uid()
    AND active = true
    AND (deleted_at IS NULL OR is_deleted = false)
  LIMIT 1;
  
  -- Return true if user is admin
  RETURN user_role = 'admin';
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Create new clean policies

-- 1. SELECT Policy: Users can view their own profile OR admins can view all users
CREATE POLICY "users_select_policy"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (
    -- User can see their own profile
    auth.uid() = auth_user_id 
    OR 
    -- OR user is admin (can see all users)
    public.is_admin()
  );

-- 2. INSERT Policy: Only admins can create new users
CREATE POLICY "users_insert_policy"
  ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- 3. UPDATE Policy: Users can update their own profile OR admins can update any user
CREATE POLICY "users_update_policy"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (
    -- User can update their own profile
    auth.uid() = auth_user_id 
    OR 
    -- OR user is admin (can update any user)
    public.is_admin()
  )
  WITH CHECK (
    -- Same check for the updated data
    auth.uid() = auth_user_id 
    OR 
    public.is_admin()
  );

-- 4. DELETE Policy: Only admins can delete users
CREATE POLICY "users_delete_policy"
  ON public.users
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- Add helpful comments
COMMENT ON POLICY "users_select_policy" ON public.users IS 
  'Users can view their own profile, admins can view all users';
COMMENT ON POLICY "users_insert_policy" ON public.users IS 
  'Only admin users can create new user records';
COMMENT ON POLICY "users_update_policy" ON public.users IS 
  'Users can update their own profile, admins can update any user';
COMMENT ON POLICY "users_delete_policy" ON public.users IS 
  'Only admin users can delete user records';

-- Verify RLS is enabled
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Add a comment to the function
COMMENT ON FUNCTION public.is_admin() IS 
  'Helper function to check if current authenticated user has admin role. Uses SECURITY DEFINER to avoid RLS recursion.';