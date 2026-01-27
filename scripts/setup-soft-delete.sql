-- ============================================
-- QUICK SETUP: Soft Delete for Containers
-- ============================================
-- Run this single script to implement soft delete
-- ============================================

-- This is the same as the migration file but in a single executable script
-- Copy and paste this entire file into Supabase SQL Editor and click Run

-- Add soft delete columns
ALTER TABLE public.containers 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.users(id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_containers_is_deleted 
ON public.containers(is_deleted) 
WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_containers_deleted_at 
ON public.containers(deleted_at) 
WHERE deleted_at IS NOT NULL;

-- Update RLS policies
DROP POLICY IF EXISTS "Users can view containers" ON public.containers;
DROP POLICY IF EXISTS "Users can insert containers" ON public.containers;
DROP POLICY IF EXISTS "Users can update containers" ON public.containers;
DROP POLICY IF EXISTS "Authenticated users can delete containers" ON public.containers;

CREATE POLICY "Users can view containers"
  ON public.containers FOR SELECT TO authenticated
  USING (is_deleted = false AND EXISTS (
    SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.active = true
  ));

CREATE POLICY "Users can insert containers"
  ON public.containers FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.users WHERE users.id = auth.uid() 
    AND users.active = true AND users.role IN ('admin', 'supervisor', 'operator')
  ));

CREATE POLICY "Users can update containers"
  ON public.containers FOR UPDATE TO authenticated
  USING (is_deleted = false AND EXISTS (
    SELECT 1 FROM public.users WHERE users.id = auth.uid() 
    AND users.active = true AND users.role IN ('admin', 'supervisor', 'operator')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.users WHERE users.id = auth.uid() 
    AND users.active = true AND users.role IN ('admin', 'supervisor', 'operator')
  ));

-- Create constraint checking function
CREATE OR REPLACE FUNCTION check_container_deletion_constraints(container_uuid UUID)
RETURNS TABLE (
  can_delete BOOLEAN,
  blocking_reason TEXT,
  gate_in_count INTEGER,
  gate_out_count INTEGER,
  location_assigned BOOLEAN,
  current_status TEXT
) AS $$
DECLARE
  v_gate_in_count INTEGER;
  v_gate_out_count INTEGER;
  v_location TEXT;
  v_status TEXT;
  v_can_delete BOOLEAN := true;
  v_reason TEXT := '';
BEGIN
  SELECT c.location, c.status INTO v_location, v_status
  FROM containers c WHERE c.id = container_uuid;

  SELECT COUNT(*) INTO v_gate_in_count FROM gate_in_operations WHERE container_id = container_uuid;
  SELECT COUNT(*) INTO v_gate_out_count FROM gate_out_operations 
  WHERE processed_container_ids @> to_jsonb(ARRAY[container_uuid::text]);

  IF v_status IN ('in_depot', 'gate_in') THEN
    v_can_delete := false;
    v_reason := 'Container is currently in depot. Please gate it out first.';
  END IF;

  IF v_location IS NOT NULL AND v_location != '' THEN
    IF v_can_delete THEN
      v_can_delete := false;
      v_reason := 'Container has an assigned location (' || v_location || '). Please remove location assignment first.';
    END IF;
  END IF;

  RETURN QUERY SELECT v_can_delete, v_reason, v_gate_in_count, v_gate_out_count,
    (v_location IS NOT NULL AND v_location != ''), v_status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create soft delete function
CREATE OR REPLACE FUNCTION soft_delete_container(container_uuid UUID, user_uuid UUID)
RETURNS TABLE (success BOOLEAN, message TEXT, blocking_reason TEXT) AS $$
DECLARE
  v_can_delete BOOLEAN;
  v_blocking_reason TEXT;
  v_container_number TEXT;
BEGIN
  SELECT number INTO v_container_number FROM containers 
  WHERE id = container_uuid AND is_deleted = false;

  IF v_container_number IS NULL THEN
    RETURN QUERY SELECT false, 'Container not found or already deleted', NULL::TEXT;
    RETURN;
  END IF;

  SELECT can_delete, blocking_reason INTO v_can_delete, v_blocking_reason
  FROM check_container_deletion_constraints(container_uuid);

  IF NOT v_can_delete THEN
    RETURN QUERY SELECT false, 'Cannot delete container', v_blocking_reason;
    RETURN;
  END IF;

  UPDATE containers SET 
    is_deleted = true, deleted_at = NOW(), deleted_by = user_uuid,
    updated_at = NOW(), updated_by = user_uuid
  WHERE id = container_uuid;

  RETURN QUERY SELECT true, 'Container ' || v_container_number || ' deleted successfully', NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create restore function
CREATE OR REPLACE FUNCTION restore_container(container_uuid UUID, user_uuid UUID)
RETURNS TABLE (success BOOLEAN, message TEXT) AS $$
DECLARE
  v_container_number TEXT;
BEGIN
  SELECT number INTO v_container_number FROM containers 
  WHERE id = container_uuid AND is_deleted = true;

  IF v_container_number IS NULL THEN
    RETURN QUERY SELECT false, 'Container not found or not deleted';
    RETURN;
  END IF;

  UPDATE containers SET 
    is_deleted = false, deleted_at = NULL, deleted_by = NULL,
    updated_at = NOW(), updated_by = user_uuid
  WHERE id = container_uuid;

  RETURN QUERY SELECT true, 'Container ' || v_container_number || ' restored successfully';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION check_container_deletion_constraints(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION soft_delete_container(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION restore_container(UUID, UUID) TO authenticated;

-- Verification query
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=========================================';
  RAISE NOTICE '✅ SOFT DELETE IMPLEMENTATION COMPLETE!';
  RAISE NOTICE '=========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'What was done:';
  RAISE NOTICE '• Added is_deleted, deleted_at, deleted_by columns';
  RAISE NOTICE '• Created indexes for performance';
  RAISE NOTICE '• Updated RLS policies to hide deleted containers';
  RAISE NOTICE '• Created constraint checking function';
  RAISE NOTICE '• Created soft delete function';
  RAISE NOTICE '• Created restore function';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Refresh your application';
  RAISE NOTICE '2. Try deleting a container';
  RAISE NOTICE '3. System will check constraints and show clear messages';
  RAISE NOTICE '';
  RAISE NOTICE 'Read SOFT_DELETE_IMPLEMENTATION.md for full documentation';
  RAISE NOTICE '=========================================';
END $$;
