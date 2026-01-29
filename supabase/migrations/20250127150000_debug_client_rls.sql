/*
  # Debug client RLS issues

  1. Purpose
    - Temporarily simplify RLS policies to debug the "Cannot coerce to single JSON object" error
    - Create more permissive policies for testing

  2. Approach
    - Create simple, permissive policies
    - Add debugging information
    - Ensure basic operations work
*/

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "authenticated_users_can_view_clients" ON clients;
DROP POLICY IF EXISTS "authorized_users_can_insert_clients" ON clients;
DROP POLICY IF EXISTS "authorized_users_can_update_clients" ON clients;
DROP POLICY IF EXISTS "admin_users_can_delete_clients" ON clients;

-- Create very simple, permissive policies for debugging
CREATE POLICY "debug_select_clients"
  ON clients
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "debug_insert_clients"
  ON clients
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "debug_update_clients"
  ON clients
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "debug_delete_clients"
  ON clients
  FOR DELETE
  TO authenticated
  USING (true);

-- Add a comment to track this is for debugging
COMMENT ON TABLE clients IS 'DEBUG: Using permissive RLS policies for troubleshooting';

-- Test query to verify the table structure
DO $$
DECLARE
  rec RECORD;
BEGIN
  RAISE NOTICE 'Clients table columns:';
  FOR rec IN 
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns 
    WHERE table_name = 'clients' 
    ORDER BY ordinal_position
  LOOP
    RAISE NOTICE '  %: % (nullable: %, default: %)', 
      rec.column_name, rec.data_type, rec.is_nullable, rec.column_default;
  END LOOP;
END $$;