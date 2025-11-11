/*
  # Fix Admin User Management - No Recursion

  1. Problem
    - Admins cannot manage other users due to missing RLS policies
    - Cannot use self-referencing queries (causes infinite recursion)
    
  2. Solution
    - Create a helper function that caches the current user's role
    - Use the function in policies to avoid recursion
    - Add proper admin policies for SELECT, INSERT, UPDATE, DELETE operations
    
  3. Security
    - Only users with 'admin' role can manage other users
    - Uses cached role check to avoid recursion
*/

-- Drop existing admin management policies if they exist
DROP POLICY IF EXISTS "Admins can insert users" ON public.users;
DROP POLICY IF EXISTS "Admins can update users" ON public.users;
DROP POLICY IF EXISTS "Admins can delete users" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Admin users can manage users" ON public.users;
DROP POLICY IF EXISTS "Auth admins manage users" ON public.users;

-- Drop the function if it exists
DROP FUNCTION IF EXISTS public.is_admin();

-- Create a helper function to check if current user is admin
-- This function uses SECURITY DEFINER to bypass RLS and avoid recursion
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

-- Add comment to the function
COMMENT ON FUNCTION public.is_admin() IS 
  'Helper function to check if current authenticated user has admin role. Uses SECURITY DEFINER to avoid RLS recursion.';

-- Policy: Admins can view all users (in addition to users viewing their own profile)
CREATE POLICY "Admins can view all users"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Policy: Admins can insert new users
CREATE POLICY "Admins can insert users"
  ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- Policy: Admins can update any user
CREATE POLICY "Admins can update users"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (
    -- Allow users to update their own profile OR be an admin
    auth.uid() = auth_user_id OR public.is_admin()
  )
  WITH CHECK (
    -- Same check for the updated data
    auth.uid() = auth_user_id OR public.is_admin()
  );

-- Policy: Admins can soft delete users (update deleted_at)
CREATE POLICY "Admins can delete users"
  ON public.users
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- Add comments explaining the policy structure
COMMENT ON POLICY "Admins can view all users" ON public.users IS 
  'Allows admin users to view all user records in the system';
COMMENT ON POLICY "Admins can insert users" ON public.users IS 
  'Allows admin users to create new user records';
COMMENT ON POLICY "Admins can update users" ON public.users IS 
  'Allows users to update their own profile, and admins to update any user';
COMMENT ON POLICY "Admins can delete users" ON public.users IS 
  'Allows admin users to delete (soft delete) user records';
