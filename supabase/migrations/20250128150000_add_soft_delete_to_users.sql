-- Add soft delete columns to users table
-- This migration adds the missing is_deleted, deleted_at, and deleted_by columns
-- that are referenced in the code but missing from the schema

-- Add soft delete columns to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.users(id);

-- Create index for better query performance on soft delete queries
CREATE INDEX IF NOT EXISTS idx_users_is_deleted 
ON public.users(is_deleted) 
WHERE is_deleted = false;

-- Create composite index for efficient active user lookups
CREATE INDEX IF NOT EXISTS idx_users_active_lookup 
ON public.users(is_deleted, active, email) 
WHERE is_deleted = false AND active = true;

-- Update existing users to have is_deleted = false (they are all active)
UPDATE public.users 
SET is_deleted = false 
WHERE is_deleted IS NULL;

-- Add comment
COMMENT ON COLUMN users.is_deleted IS 'Soft delete flag - true if user is deleted';
COMMENT ON COLUMN users.deleted_at IS 'Timestamp when user was soft deleted';
COMMENT ON COLUMN users.deleted_by IS 'User who soft deleted this user';

-- Update RLS policies to account for soft delete
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own data" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Users can update their own data" ON public.users;
DROP POLICY IF EXISTS "Admins can manage all users" ON public.users;
DROP POLICY IF EXISTS "Allow initial admin creation" ON public.users;

-- Recreate policies with soft delete support
CREATE POLICY "Users can view their own data"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (
    is_deleted = false
    AND (
      auth_user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.users
        WHERE auth_user_id = auth.uid()
          AND role = 'admin'
          AND active = true
          AND is_deleted = false
      )
    )
  );

CREATE POLICY "Users can update their own data"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (
    is_deleted = false
    AND (
      auth_user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.users
        WHERE auth_user_id = auth.uid()
          AND role = 'admin'
          AND active = true
          AND is_deleted = false
      )
    )
  );

CREATE POLICY "Admins can manage all users"
  ON public.users
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_user_id = auth.uid()
        AND role = 'admin'
        AND active = true
        AND is_deleted = false
    )
  );

-- Create policy for initial admin creation (when no admins exist)
CREATE POLICY "Allow initial admin creation"
  ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    NOT EXISTS (
      SELECT 1 FROM public.users
      WHERE role = 'admin'
        AND active = true
        AND (is_deleted = false OR is_deleted IS NULL)
    )
    AND role = 'admin'
  );