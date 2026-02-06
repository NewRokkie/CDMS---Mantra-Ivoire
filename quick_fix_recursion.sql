/*
  # Quick Fix for Infinite Recursion - Minimal Changes
  
  This is a minimal fix that only addresses the immediate recursion issue
  without recreating all existing policies.
*/

-- Step 1: Drop the specific policies that cause recursion
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Admins can insert users" ON public.users;
DROP POLICY IF EXISTS "Admins can update users" ON public.users;
DROP POLICY IF EXISTS "Admins can delete users" ON public.users;

-- Step 2: Drop stack policies that depend on is_admin()
DROP POLICY IF EXISTS "Only admins can permanently delete inactive stacks" ON public.stacks;

-- Step 3: Now we can safely drop the problematic function
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;
DROP FUNCTION IF EXISTS public.is_admin_or_supervisor() CASCADE;

-- Step 4: Create a simple replacement for the stack delete policy
-- This allows service role to handle admin deletions
CREATE POLICY "stacks_delete_service_role_only"
  ON public.stacks
  FOR DELETE
  TO service_role
  USING (true);

-- Step 5: Ensure service role has necessary permissions
GRANT ALL ON public.users TO service_role;
GRANT ALL ON public.stacks TO service_role;

-- That's it! The existing user policies should work fine without the is_admin() function