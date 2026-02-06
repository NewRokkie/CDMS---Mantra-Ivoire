/*
  # Fix Initial Admin Creation - Module Access

  1. Problem
    - user_module_access table has different column structure than expected
    - updated_by column is NOT NULL but needs to reference the user being created
    - created_at column doesn't exist in the table
    
  2. Solution
    - Make updated_by nullable for initial admin creation
    - Fix the RLS policy for module access creation
    - Handle the correct column structure
    
  3. Security
    - Only works when no admin users exist in the system
    - Automatically disabled once first admin is created
*/

-- First, ensure the has_admin_users function exists with correct syntax
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

-- Ensure the initial admin creation policy exists
DO $$
BEGIN
  -- Check if policy already exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'users' AND policyname = 'Allow initial admin creation'
  ) THEN
    EXECUTE 'CREATE POLICY "Allow initial admin creation"
      ON public.users
      FOR INSERT
      TO authenticated
      WITH CHECK (
        NOT public.has_admin_users() AND role = ''admin''
      )';
    RAISE NOTICE 'Created initial admin creation policy';
  ELSE
    RAISE NOTICE 'Initial admin creation policy already exists';
  END IF;
END $$;

-- Handle user_module_access table
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
    
    -- Drop existing policy if it exists
    BEGIN
      DROP POLICY IF EXISTS "Allow initial admin module access creation" ON public.user_module_access;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'No existing module access policy to drop';
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
    
    RAISE NOTICE 'Created policy for user_module_access table';
  ELSE
    RAISE NOTICE 'user_module_access table not found, skipping module access policy';
  END IF;
END $$;

-- Verify the setup
DO $$
DECLARE
  has_function boolean;
  has_user_policy boolean;
  has_module_policy boolean;
  has_yards_table boolean;
BEGIN
  -- Check if function exists
  SELECT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'has_admin_users'
  ) INTO has_function;
  
  -- Check if user policy exists
  SELECT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'users' AND policyname = 'Allow initial admin creation'
  ) INTO has_user_policy;
  
  -- Check if module access policy exists
  SELECT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_module_access' AND policyname = 'Allow initial admin module access creation'
  ) INTO has_module_policy;
  
  -- Check if yards table exists
  SELECT EXISTS (
    SELECT FROM information_schema.tables WHERE table_name = 'yards'
  ) INTO has_yards_table;
  
  IF has_function AND has_user_policy THEN
    RAISE NOTICE '✅ Initial admin setup migration completed successfully!';
    RAISE NOTICE '✅ Function has_admin_users() exists';
    RAISE NOTICE '✅ Policy "Allow initial admin creation" exists';
    
    IF has_module_policy THEN
      RAISE NOTICE '✅ Policy "Allow initial admin module access creation" exists';
    ELSE
      RAISE NOTICE '⚠️  Module access policy not created (table may not exist)';
    END IF;
    
    IF has_yards_table THEN
      RAISE NOTICE '✅ Yards table exists for initial yard creation';
    ELSE
      RAISE NOTICE '⚠️  Yards table not found - initial yard creation may fail';
    END IF;
    
    RAISE NOTICE '🚀 You can now use the initial admin setup in your application';
    RAISE NOTICE '📍 Initial admin will be redirected to Depot Management to create yards';
  ELSE
    RAISE WARNING '❌ Migration may have failed. Please check for errors above.';
  END IF;
END $$;