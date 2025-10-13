/*
  # Fix Stacks Delete Policy

  1. Changes
    - Update DELETE policy to allow both admins AND supervisors
    - Previously only admins could delete stacks
    - Now supervisors can also delete stacks (matching UPDATE/INSERT policies)

  2. Security
    - Still requires authentication
    - Still checks user role from users table
    - Consistent with other stack management policies
*/

-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Only admins can delete stacks" ON stacks;

-- Create new policy that allows both admins and supervisors
CREATE POLICY "Admins and supervisors can delete stacks"
  ON stacks
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'supervisor')
    )
  );
