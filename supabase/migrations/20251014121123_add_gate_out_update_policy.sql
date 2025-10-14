/*
  # Add UPDATE policy for gate_out_operations

  1. Changes
    - Add UPDATE policy to allow operators to update gate out operations
    - This is needed for processing containers during gate out operations
    - Only active authenticated operators, supervisors, and admins can update

  2. Security
    - Requires authentication
    - User must be active
    - User must have operator, supervisor, or admin role
    - Consistent with existing INSERT policy
*/

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Auth operators update gate out" ON gate_out_operations;

-- Add UPDATE policy for gate_out_operations
CREATE POLICY "Auth operators update gate out"
  ON gate_out_operations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM users
      WHERE users.auth_user_id = auth.uid()
      AND users.active = true
      AND users.role IN ('admin', 'supervisor', 'operator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM users
      WHERE users.auth_user_id = auth.uid()
      AND users.active = true
      AND users.role IN ('admin', 'supervisor', 'operator')
    )
  );
