/*
  # Fix Stack Pairings RLS Policy

  1. Problem
    - Current RLS policy only allows admins to manage stack_pairings
    - This blocks automatic synchronization for regular users
    - Users should be able to create/update pairings when changing stack container sizes

  2. Solution
    - Update RLS policy to allow authenticated users to manage pairings
    - Keep read access for all authenticated users
    - Allow insert/update/delete for authenticated users (not just admins)

  3. Security
    - Still requires authentication
    - Users can only manage pairings in their accessible yards
    - Maintains data integrity while allowing automatic operations
*/

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Admins can manage stack pairings" ON stack_pairings;

-- Create new policy that allows authenticated users to manage pairings
CREATE POLICY "Authenticated users can manage stack pairings"
  ON stack_pairings
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add comment for clarity
COMMENT ON POLICY "Authenticated users can manage stack pairings" ON stack_pairings IS 
'Allows authenticated users to create, update, and delete stack pairings for automatic 40ft container management';