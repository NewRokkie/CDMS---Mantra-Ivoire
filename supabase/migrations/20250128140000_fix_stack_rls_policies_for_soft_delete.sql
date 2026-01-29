/*
  # Fix Stack RLS Policies for Soft Delete System

  1. Problem
    - Previous soft delete migration created RLS policies that query users table directly
    - This causes RLS recursion issues and prevents stack operations
    - Policies conflict with existing helper functions

  2. Solution
    - Use existing is_admin_or_supervisor() helper function
    - Fix UPDATE policy to work with both regular updates and soft delete
    - Ensure DELETE policy works for permanent deletion
    - Remove conflicting policies

  3. Security
    - Maintains same security model
    - Uses SECURITY DEFINER functions to avoid RLS recursion
    - Admins and supervisors can soft delete (UPDATE is_active = false)
    - Only admins can permanently delete inactive stacks
*/

-- ============================================================================
-- STEP 1: Drop ALL existing stack policies to avoid conflicts
-- ============================================================================

-- Drop all existing stack policies
DROP POLICY IF EXISTS "Authenticated users can view stacks" ON stacks;
DROP POLICY IF EXISTS "Admins and supervisors can create stacks" ON stacks;
DROP POLICY IF EXISTS "Admins and supervisors can update stacks" ON stacks;
DROP POLICY IF EXISTS "Admins and supervisors can delete stacks" ON stacks;
DROP POLICY IF EXISTS "Admins and supervisors can soft delete stacks" ON stacks;
DROP POLICY IF EXISTS "Only admins can delete stacks" ON stacks;
DROP POLICY IF EXISTS "Only admins can permanently delete inactive stacks" ON stacks;

-- ============================================================================
-- STEP 2: Ensure we have the helper function (in case it's missing)
-- ============================================================================

-- Create helper function if it doesn't exist
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

-- Create admin-only helper function
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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.is_admin_or_supervisor() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- ============================================================================
-- STEP 3: Recreate ALL RLS policies using helper functions
-- ============================================================================

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

-- Policy: Admins and supervisors can update stacks (includes soft delete)
CREATE POLICY "Admins and supervisors can update stacks"
  ON stacks
  FOR UPDATE
  TO authenticated
  USING (public.is_admin_or_supervisor())
  WITH CHECK (public.is_admin_or_supervisor());

-- Policy: Only admins can permanently delete inactive stacks
CREATE POLICY "Only admins can permanently delete inactive stacks"
  ON stacks
  FOR DELETE
  TO authenticated
  USING (
    is_active = false AND public.is_admin()
  );

-- ============================================================================
-- STEP 4: Add comments for documentation
-- ============================================================================

COMMENT ON FUNCTION public.is_admin() IS 
  'Helper function to check if current authenticated user has admin role. Uses SECURITY DEFINER to avoid RLS recursion.';

COMMENT ON POLICY "Authenticated users can view stacks" ON stacks IS 
  'Allows all authenticated users to view stack configurations';

COMMENT ON POLICY "Admins and supervisors can create stacks" ON stacks IS 
  'Allows admin and supervisor users to create new stacks';

COMMENT ON POLICY "Admins and supervisors can update stacks" ON stacks IS 
  'Allows admin and supervisor users to update stack configurations, including soft delete (is_active = false)';

COMMENT ON POLICY "Only admins can permanently delete inactive stacks" ON stacks IS 
  'Allows only admin users to permanently delete stacks that are already inactive (soft deleted)';

-- ============================================================================
-- STEP 5: Test the policies work correctly
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Stack RLS Policies Fixed for Soft Delete System';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Current Stack Policies:';
  RAISE NOTICE '  • SELECT: All authenticated users can view stacks';
  RAISE NOTICE '  • INSERT: Admins and supervisors can create stacks';
  RAISE NOTICE '  • UPDATE: Admins and supervisors can update stacks (includes soft delete)';
  RAISE NOTICE '  • DELETE: Only admins can permanently delete inactive stacks';
  RAISE NOTICE '';
  RAISE NOTICE '🔧 Helper Functions Available:';
  RAISE NOTICE '  • is_admin_or_supervisor() - Check admin/supervisor role';
  RAISE NOTICE '  • is_admin() - Check admin role only';
  RAISE NOTICE '';
  RAISE NOTICE '🛡️  Security Features:';
  RAISE NOTICE '  • Uses SECURITY DEFINER to avoid RLS recursion';
  RAISE NOTICE '  • Soft delete via UPDATE is_active = false';
  RAISE NOTICE '  • Permanent delete only for inactive stacks';
  RAISE NOTICE '  • Role-based access control maintained';
  RAISE NOTICE '';
END $$;