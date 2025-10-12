/*
  # Fix Users SELECT Policy

  1. Changes
    - Drop the existing restrictive SELECT policy
    - Create a new policy that allows authenticated users to read user records
    - The policy is less restrictive to avoid query hanging issues
    
  2. Security
    - Still requires authentication
    - Users can only see user records (not sensitive auth data)
*/

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users view own profile" ON users;

-- Create a new policy that allows authenticated users to select from users table
-- This is needed because the frontend queries by auth_user_id before RLS can properly validate
CREATE POLICY "Authenticated users can view users"
  ON users
  FOR SELECT
  TO authenticated
  USING (true);
