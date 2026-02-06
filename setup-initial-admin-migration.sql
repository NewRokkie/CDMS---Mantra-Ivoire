-- ============================================================================
-- INITIAL ADMIN SETUP MIGRATION
-- ============================================================================
-- This migration allows the creation of the first admin user when no admin 
-- users exist in the system. Run this in your Supabase SQL Editor.
-- ============================================================================

-- Create a helper function to check if any admin users exist
CREATE OR REPLACE FUNCTION public.has_admin_users()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  admin_count integer;
BEGIN
  -- Count active admin users (bypass RLS with SECURITY DEFINER)
  SELECT COUNT(*) INTO admin_count
  FROM public.users
  WHERE role = 'admin'
    AND active = true
    AND (is_deleted = false OR is_deleted IS NULL);
  
  -- Return true if any admin users exist
  RETURN admin_count > 0;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.has_admin_users() TO authenticated;

-- Add comment to the function
COMMENT ON FUNCTION public.has_admin_users() IS 
  'Helper function to check if any admin users exist in the system. Used for initial admin creation policy.';

-- Policy: Allow initial admin creation when no admins exist
CREATE POLICY "Allow initial admin creation"
  ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Only allow if no admin users exist AND the new user is being created as admin
    NOT public.has_admin_users() AND role = 'admin'
  );

-- Add comment explaining the policy
COMMENT ON POLICY "Allow initial admin creation" ON public.users IS 
  'Allows creation of the first admin user when no admin users exist in the system. Automatically disabled once an admin exists.';

-- Also need to allow initial admin to create their module access record
-- Check if user_module_access table exists first
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_module_access') THEN
    -- Make updated_by nullable for initial admin creation
    BEGIN
      ALTER TABLE public.user_module_access ALTER COLUMN updated_by DROP NOT NULL;
      RAISE NOTICE 'Made updated_by column nullable for initial admin creation';
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Could not make updated_by nullable (may already be nullable): %', SQLERRM;
    END;
    
    -- Create policy for initial admin module access creation
    EXECUTE 'CREATE POLICY "Allow initial admin module access creation"
      ON public.user_module_access
      FOR INSERT
      TO authenticated
      WITH CHECK (
        -- Allow if no admin users exist AND the user being created is admin
        NOT public.has_admin_users() AND user_id IN (
          SELECT id FROM public.users WHERE role = ''admin'' AND auth_user_id = auth.uid()
        )
      )';
    
    -- Add comment
    EXECUTE 'COMMENT ON POLICY "Allow initial admin module access creation" ON public.user_module_access IS 
      ''Allows creation of module access for the first admin user during initial setup.''';
      
    RAISE NOTICE 'Created policy for user_module_access table';
  ELSE
    RAISE NOTICE 'user_module_access table not found, skipping module access policy';
  END IF;
END $$;

-- Verify the setup
DO $$
DECLARE
  has_function boolean;
  has_policy boolean;
BEGIN
  -- Check if function exists
  SELECT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'has_admin_users'
  ) INTO has_function;
  
  -- Check if policy exists
  SELECT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'users' AND policyname = 'Allow initial admin creation'
  ) INTO has_policy;
  
  IF has_function AND has_policy THEN
    RAISE NOTICE '✅ Initial admin setup migration completed successfully!';
    RAISE NOTICE '✅ Function has_admin_users() created';
    RAISE NOTICE '✅ Policy "Allow initial admin creation" created';
    RAISE NOTICE '🚀 You can now use the initial admin setup in your application';
  ELSE
    RAISE WARNING '❌ Migration may have failed. Please check for errors above.';
  END IF;
END $$;