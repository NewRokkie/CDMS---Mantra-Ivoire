/*
  # Simple Stack RLS Fix - Alternative Approach

  This is a simpler fix that only addresses the immediate RLS issue
  without recreating all policies. Use this if the main fix has conflicts.

  1. Problem
    - Stack deletion fails due to RLS policy conflicts
    - Policies query users table directly causing recursion

  2. Solution
    - Ensure helper functions exist
    - Only fix the problematic DELETE policy
    - Keep existing working policies intact
*/

-- ============================================================================
-- STEP 1: Ensure helper functions exist
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
-- STEP 2: Fix only the problematic policies
-- ============================================================================

-- Drop problematic policies from soft delete migration
DROP POLICY IF EXISTS "Admins and supervisors can soft delete stacks" ON stacks;
DROP POLICY IF EXISTS "Only admins can permanently delete inactive stacks" ON stacks;

-- Recreate DELETE policy with proper helper function
CREATE POLICY "Only admins can permanently delete inactive stacks"
  ON stacks
  FOR DELETE
  TO authenticated
  USING (
    is_active = false AND public.is_admin()
  );

-- ============================================================================
-- STEP 3: Ensure UPDATE policy uses helper function (if it exists)
-- ============================================================================

-- Check if UPDATE policy exists and uses direct user query
DO $$
BEGIN
  -- If the problematic UPDATE policy exists, replace it
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'stacks' 
    AND policyname = 'Admins and supervisors can update stacks'
    AND qual LIKE '%EXISTS%SELECT%users%'
  ) THEN
    -- Drop and recreate with helper function
    DROP POLICY "Admins and supervisors can update stacks" ON stacks;
    
    CREATE POLICY "Admins and supervisors can update stacks"
      ON stacks
      FOR UPDATE
      TO authenticated
      USING (public.is_admin_or_supervisor())
      WITH CHECK (public.is_admin_or_supervisor());
      
    RAISE NOTICE 'Fixed UPDATE policy to use helper function';
  ELSE
    RAISE NOTICE 'UPDATE policy already uses helper function or does not exist';
  END IF;
END $$;

-- ============================================================================
-- STEP 4: Add comments
-- ============================================================================

COMMENT ON FUNCTION public.is_admin() IS 
  'Helper function to check if current authenticated user has admin role. Uses SECURITY DEFINER to avoid RLS recursion.';

COMMENT ON FUNCTION public.is_admin_or_supervisor() IS 
  'Helper function to check if current authenticated user has admin or supervisor role. Uses SECURITY DEFINER to avoid RLS recursion.';

COMMENT ON POLICY "Only admins can permanently delete inactive stacks" ON stacks IS 
  'Allows only admin users to permanently delete stacks that are already inactive (soft deleted)';

-- ============================================================================
-- STEP 5: Success message
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Simple Stack RLS Fix Applied Successfully!';
  RAISE NOTICE '===========================================';
  RAISE NOTICE '';
  RAISE NOTICE '🔧 What was fixed:';
  RAISE NOTICE '  • Helper functions created/updated';
  RAISE NOTICE '  • DELETE policy fixed to use helper function';
  RAISE NOTICE '  • UPDATE policy checked and fixed if needed';
  RAISE NOTICE '  • RLS recursion issues resolved';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Stack deletion should now work properly!';
  RAISE NOTICE '';
END $$;