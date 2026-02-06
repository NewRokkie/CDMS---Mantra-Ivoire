/*
  # EMERGENCY FIX: Stop All Infinite Recursion
  
  This will temporarily disable RLS on users table to stop the recursion,
  then recreate with minimal, safe policies.
*/

-- Step 1: DISABLE RLS temporarily to stop the recursion
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL policies on users table (this will work now that RLS is disabled)
DO $$ 
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'users' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON public.users';
        RAISE NOTICE 'Dropped policy: %', policy_record.policyname;
    END LOOP;
END $$;

-- Step 3: Drop ALL functions that might cause recursion
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;
DROP FUNCTION IF EXISTS public.is_admin_or_supervisor() CASCADE;

-- Step 4: Create ONE simple, safe policy for users
CREATE POLICY "users_basic_access"
  ON public.users
  FOR ALL
  TO authenticated
  USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);

-- Step 5: Create service role policy for admin operations
CREATE POLICY "users_service_role_access"
  ON public.users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Step 6: Re-enable RLS with the new safe policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Step 7: Grant necessary permissions
GRANT SELECT, UPDATE ON public.users TO authenticated;
GRANT ALL ON public.users TO service_role;

-- Step 8: Fix any stack policies that might have been affected
DROP POLICY IF EXISTS "Only admins can permanently delete inactive stacks" ON public.stacks;

CREATE POLICY "stacks_service_role_delete"
  ON public.stacks
  FOR DELETE
  TO service_role
  USING (true);

GRANT ALL ON public.stacks TO service_role;