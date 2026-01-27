-- ============================================
-- FIX: Add DELETE policy for containers table
-- ============================================
-- Issue: Container deletion is not working because there's no RLS policy
-- allowing DELETE operations on the containers table.
-- 
-- This migration adds a DELETE policy that allows admin, supervisor, 
-- and operator roles to delete containers.
--
-- HOW TO APPLY:
-- 1. Go to your Supabase Dashboard
-- 2. Navigate to SQL Editor
-- 3. Copy and paste this entire file
-- 4. Click "Run" to execute
-- ============================================

-- Drop existing delete policy if it exists
DROP POLICY IF EXISTS "Authenticated users can delete containers" ON public.containers;

-- Create DELETE policy for containers
-- Only admin role can delete containers
CREATE POLICY "Authenticated users can delete containers"
  ON public.containers
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.active = true
      AND users.role = 'admin'
    )
  );

-- Verify the policy was created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'containers' 
AND policyname = 'Authenticated users can delete containers';
