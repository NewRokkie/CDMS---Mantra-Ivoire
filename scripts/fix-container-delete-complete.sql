-- ============================================
-- COMPLETE FIX: Container Deletion Issue
-- ============================================
-- This script fixes TWO issues preventing container deletion:
-- 1. Missing RLS DELETE policy on containers table
-- 2. Foreign key constraint from gate_in_operations without CASCADE
--
-- HOW TO APPLY:
-- 1. Go to your Supabase Dashboard
-- 2. Navigate to SQL Editor
-- 3. Copy and paste this entire file
-- 4. Click "Run" to execute
-- ============================================

-- ============================================
-- PART 1: Fix Foreign Key Constraint
-- ============================================
-- The gate_in_operations table has a foreign key to containers
-- without ON DELETE CASCADE, which prevents deletion

-- Drop the existing foreign key constraint
ALTER TABLE public.gate_in_operations 
DROP CONSTRAINT IF EXISTS gate_in_operations_container_id_fkey;

-- Recreate the foreign key with ON DELETE SET NULL
-- This allows containers to be deleted, and sets container_id to NULL in gate_in_operations
-- We use SET NULL instead of CASCADE to preserve the operation history
ALTER TABLE public.gate_in_operations 
ADD CONSTRAINT gate_in_operations_container_id_fkey 
FOREIGN KEY (container_id) 
REFERENCES public.containers(id) 
ON DELETE SET NULL;

-- ============================================
-- PART 2: Fix RLS DELETE Policy
-- ============================================
-- Add DELETE policy for containers table

-- Drop existing delete policy if it exists
DROP POLICY IF EXISTS "Authenticated users can delete containers" ON public.containers;

-- Create DELETE policy for containers
-- Allows admin, supervisor, and operator roles to delete containers
CREATE POLICY "Authenticated users can delete containers"
  ON public.containers
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.active = true
      AND users.role IN ('admin', 'supervisor', 'operator')
    )
  );

-- ============================================
-- PART 3: Fix locations table reference (if exists)
-- ============================================
-- The locations table may also reference containers

DO $$
BEGIN
  -- Check if locations table exists and has container_id column
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'locations' 
    AND column_name = 'container_id'
  ) THEN
    -- Drop existing constraint if it exists
    ALTER TABLE public.locations 
    DROP CONSTRAINT IF EXISTS locations_container_id_fkey;
    
    -- Recreate with ON DELETE SET NULL
    ALTER TABLE public.locations 
    ADD CONSTRAINT locations_container_id_fkey 
    FOREIGN KEY (container_id) 
    REFERENCES public.containers(id) 
    ON DELETE SET NULL;
    
    RAISE NOTICE 'Fixed locations table foreign key constraint';
  END IF;
END $$;

-- ============================================
-- VERIFICATION
-- ============================================

-- Verify the RLS policy was created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'containers' 
AND policyname = 'Authenticated users can delete containers';

-- Verify the foreign key constraints
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND ccu.table_name = 'containers'
  AND tc.table_schema = 'public';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Container deletion fix applied successfully!';
  RAISE NOTICE 'You can now delete containers from the Container Module.';
END $$;
