-- Add DELETE policy for containers table
-- This allows admin, supervisor, and operator roles to delete containers

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
