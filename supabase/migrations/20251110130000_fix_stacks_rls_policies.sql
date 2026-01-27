/*
  # Fix Stacks RLS Policies - Avoid Recursion

  1. Problem
    - Stack INSERT/UPDATE operations fail with "Cannot coerce the result to a single JSON object"
    - RLS policies query the users table which can cause recursion issues
    - Error returns 0 rows, blocking legitimate operations
    
  2. Solution
    - Create helper functions to check user roles without recursion
    - Update all stack policies to use these helper functions
    - Reuse the existing is_admin() function where possible
    
  3. Security
    - Maintains same security model (admins and supervisors can manage stacks)
    - Uses SECURITY DEFINER functions to bypass RLS and avoid recursion
*/

-- Drop existing stack policies
DROP POLICY IF EXISTS "Authenticated users can view stacks" ON stacks;
DROP POLICY IF EXISTS "Admins and supervisors can create stacks" ON stacks;
DROP POLICY IF EXISTS "Admins and supervisors can update stacks" ON stacks;
DROP POLICY IF EXISTS "Admins and supervisors can delete stacks" ON stacks;
DROP POLICY IF EXISTS "Only admins can delete stacks" ON stacks;

-- Create a helper function to check if current user is admin or supervisor
-- This function uses SECURITY DEFINER to bypass RLS and avoid recursion
CREATE OR REPLACE FUNCTION public.is_admin_or_supervisor()
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
  
  -- Return true if user is admin or supervisor
  RETURN user_role IN ('admin', 'supervisor');
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin_or_supervisor() TO authenticated;

-- Add comment to the function
COMMENT ON FUNCTION public.is_admin_or_supervisor() IS 
  'Helper function to check if current authenticated user has admin or supervisor role. Uses SECURITY DEFINER to avoid RLS recursion.';

-- Policy: Authenticated users can view all stacks
CREATE POLICY "Authenticated users can view stacks"
  ON stacks
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Admins and supervisors can insert stacks
CREATE POLICY "Admins and supervisors can create stacks"
  ON stacks
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_or_supervisor());

-- Policy: Admins and supervisors can update stacks
CREATE POLICY "Admins and supervisors can update stacks"
  ON stacks
  FOR UPDATE
  TO authenticated
  USING (public.is_admin_or_supervisor())
  WITH CHECK (public.is_admin_or_supervisor());

-- Policy: Admins and supervisors can delete stacks
CREATE POLICY "Admins and supervisors can delete stacks"
  ON stacks
  FOR DELETE
  TO authenticated
  USING (public.is_admin_or_supervisor());

-- Add comments explaining the policy structure
COMMENT ON POLICY "Authenticated users can view stacks" ON stacks IS 
  'Allows all authenticated users to view stack configurations';
COMMENT ON POLICY "Admins and supervisors can create stacks" ON stacks IS 
  'Allows admin and supervisor users to create new stacks';
COMMENT ON POLICY "Admins and supervisors can update stacks" ON stacks IS 
  'Allows admin and supervisor users to update stack configurations';
COMMENT ON POLICY "Admins and supervisors can delete stacks" ON stacks IS 
  'Allows admin and supervisor users to delete stacks';
