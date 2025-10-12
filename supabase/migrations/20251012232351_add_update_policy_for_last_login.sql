/*
  # Add UPDATE policy for users table

  This migration adds a policy to allow users to update their own last_login timestamp.

  1. Policy Changes
    - Add policy for users to update their own last_login field
    - This is needed for automatic last login tracking
*/

-- Policy: Users can update their own last_login
CREATE POLICY "Users update own last_login"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);
