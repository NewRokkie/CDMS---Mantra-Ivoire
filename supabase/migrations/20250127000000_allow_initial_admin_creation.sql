/*
  # Allow Initial Admin Creation

  1. Problem
    - Initial admin setup fails because RLS policies require admin role to insert users
    - But no admin exists yet during initial setup (chicken and egg problem)
    
  2. Solution
    - Add a special policy that allows user creation when no admin users exist
    - This policy only works when the users table has zero admin users
    - Once an admin exists, normal admin policies take over
    
  3. Security
    - Only works when no admin users exist in the system
    - Automatically disabled once first admin is created
    - Still requires authentication (signed up user)
*/

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
  END IF;
END $$;