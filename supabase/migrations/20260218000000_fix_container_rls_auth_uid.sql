/*
  # Fix Container RLS Policies - Auth UID Bug

  ## Problem
  Migration `20251208100000_implement_soft_delete_containers.sql` created RLS policies
  for the `containers` table using `WHERE users.id = auth.uid()`.

  This is INCORRECT because:
  - `users.id` is the application-level UUID (internal primary key)
  - `auth.uid()` returns the Supabase Auth UUID (stored in `users.auth_user_id`)
  - These two values are NEVER the same

  ## Result
  Every INSERT/UPDATE/SELECT on `containers` was silently denied or failed with
  PostgreSQL error code 42501 (row-level security policy violation), which was
  incorrectly classified as UNKNOWN_ERROR and retried 3 times before failing.

  ## Fix
  Replace `WHERE users.id = auth.uid()` with `WHERE users.auth_user_id = auth.uid()`
  in all container RLS policies.
*/

-- Drop all incorrect container RLS policies
DROP POLICY IF EXISTS "Users can view containers" ON public.containers;
DROP POLICY IF EXISTS "Users can insert containers" ON public.containers;
DROP POLICY IF EXISTS "Users can update containers" ON public.containers;
DROP POLICY IF EXISTS "Users can soft delete containers" ON public.containers;
DROP POLICY IF EXISTS "Authenticated users can delete containers" ON public.containers;

-- ============================================================
-- Recreate SELECT policy with correct auth_user_id check
-- ============================================================
CREATE POLICY "Users can view containers"
  ON public.containers
  FOR SELECT
  TO authenticated
  USING (
    is_deleted = false
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE users.auth_user_id = auth.uid()
      AND users.active = true
    )
  );

-- ============================================================
-- Recreate INSERT policy with correct auth_user_id check
-- ============================================================
CREATE POLICY "Users can insert containers"
  ON public.containers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.auth_user_id = auth.uid()
      AND users.active = true
      AND users.role IN ('admin', 'supervisor', 'operator')
    )
  );

-- ============================================================
-- Recreate UPDATE policy with correct auth_user_id check
-- ============================================================
CREATE POLICY "Users can update containers"
  ON public.containers
  FOR UPDATE
  TO authenticated
  USING (
    is_deleted = false
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE users.auth_user_id = auth.uid()
      AND users.active = true
      AND users.role IN ('admin', 'supervisor', 'operator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.auth_user_id = auth.uid()
      AND users.active = true
      AND users.role IN ('admin', 'supervisor', 'operator')
    )
  );

-- ============================================================
-- Recreate soft DELETE policy with correct auth_user_id check
-- ============================================================
CREATE POLICY "Users can soft delete containers"
  ON public.containers
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.auth_user_id = auth.uid()
      AND users.active = true
      AND users.role IN ('admin', 'supervisor', 'operator')
    )
  );

-- Verify fix was applied (diagnostic query - can be run manually)
-- SELECT policyname, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename = 'containers'
-- ORDER BY cmd, policyname;
