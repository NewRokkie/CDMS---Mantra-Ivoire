/*
  # Fix client RLS policies to ensure financial fields can be updated

  1. Problem
    - RLS policies might be too restrictive and blocking updates to financial fields
    - Need to ensure authenticated users can update client financial information

  2. Solution
    - Review and update RLS policies for clients table
    - Ensure proper permissions for authenticated users
    - Allow updates to all client fields for authorized users
*/

-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Users can view all clients" ON clients;
DROP POLICY IF EXISTS "Admins can manage clients" ON clients;
DROP POLICY IF EXISTS "Auth users view clients" ON clients;
DROP POLICY IF EXISTS "Auth admins manage clients" ON clients;
DROP POLICY IF EXISTS "Authenticated users can view clients" ON clients;
DROP POLICY IF EXISTS "Admin users can manage clients" ON clients;

-- Create comprehensive RLS policies for clients table
-- Policy for viewing clients (all authenticated users can view)
CREATE POLICY "authenticated_users_can_view_clients"
  ON clients
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy for inserting clients (admin and supervisor roles)
CREATE POLICY "authorized_users_can_insert_clients"
  ON clients
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (
        auth.users.raw_user_meta_data->>'role' = 'admin' OR
        auth.users.raw_user_meta_data->>'role' = 'supervisor'
      )
    )
  );

-- Policy for updating clients (admin and supervisor roles)
CREATE POLICY "authorized_users_can_update_clients"
  ON clients
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (
        auth.users.raw_user_meta_data->>'role' = 'admin' OR
        auth.users.raw_user_meta_data->>'role' = 'supervisor'
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (
        auth.users.raw_user_meta_data->>'role' = 'admin' OR
        auth.users.raw_user_meta_data->>'role' = 'supervisor'
      )
    )
  );

-- Policy for deleting clients (admin role only)
CREATE POLICY "admin_users_can_delete_clients"
  ON clients
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Add comments for documentation
COMMENT ON POLICY "authenticated_users_can_view_clients" ON clients IS 'All authenticated users can view client information';
COMMENT ON POLICY "authorized_users_can_insert_clients" ON clients IS 'Admin and supervisor users can create new clients';
COMMENT ON POLICY "authorized_users_can_update_clients" ON clients IS 'Admin and supervisor users can update client information including financial fields';
COMMENT ON POLICY "admin_users_can_delete_clients" ON clients IS 'Only admin users can delete clients';