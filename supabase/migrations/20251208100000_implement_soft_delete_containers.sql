-- ============================================
-- Implement Soft Delete for Containers
-- ============================================
-- This migration adds soft delete functionality to containers
-- instead of hard deletion, which is safer for audit trails
-- and prevents data loss from foreign key constraints
-- ============================================

-- Add soft delete columns to containers table
ALTER TABLE public.containers 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.users(id);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_containers_is_deleted 
ON public.containers(is_deleted) 
WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_containers_deleted_at 
ON public.containers(deleted_at) 
WHERE deleted_at IS NOT NULL;

-- Update existing RLS policies to exclude soft-deleted containers
-- Drop old policies
DROP POLICY IF EXISTS "Users can view containers" ON public.containers;
DROP POLICY IF EXISTS "Users can insert containers" ON public.containers;
DROP POLICY IF EXISTS "Users can update containers" ON public.containers;
DROP POLICY IF EXISTS "Authenticated users can delete containers" ON public.containers;

-- Recreate SELECT policy (exclude soft-deleted)
CREATE POLICY "Users can view containers"
  ON public.containers
  FOR SELECT
  TO authenticated
  USING (
    is_deleted = false
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.active = true
    )
  );

-- Recreate INSERT policy
CREATE POLICY "Users can insert containers"
  ON public.containers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.active = true
      AND users.role IN ('admin', 'supervisor', 'operator')
    )
  );

-- Recreate UPDATE policy (can only update non-deleted containers)
CREATE POLICY "Users can update containers"
  ON public.containers
  FOR UPDATE
  TO authenticated
  USING (
    is_deleted = false
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.active = true
      AND users.role IN ('admin', 'supervisor', 'operator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.active = true
      AND users.role IN ('admin', 'supervisor', 'operator')
    )
  );

-- Create soft DELETE policy (actually updates is_deleted flag)
CREATE POLICY "Users can soft delete containers"
  ON public.containers
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.active = true
      AND users.role IN ('admin', 'supervisor', 'operator')
    )
  );

-- Create function to check container deletion constraints
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
  -- Get container details
  SELECT c.location, c.status 
  INTO v_location, v_status
  FROM containers c
  WHERE c.id = container_uuid;

  -- Count gate-in operations
  SELECT COUNT(*) INTO v_gate_in_count
  FROM gate_in_operations
  WHERE container_id = container_uuid;

  -- Count gate-out references (in processed_container_ids JSONB array)
  SELECT COUNT(*) INTO v_gate_out_count
  FROM gate_out_operations
  WHERE processed_container_ids @> to_jsonb(ARRAY[container_uuid::text]);

  -- Check if container is currently in depot
  IF v_status IN ('in_depot', 'gate_in') THEN
    v_can_delete := false;
    v_reason := 'Container is currently in depot. Please gate it out first.';
  END IF;

  -- Check if container has a location assigned
  IF v_location IS NOT NULL AND v_location != '' THEN
    IF v_can_delete THEN
      v_can_delete := false;
      v_reason := 'Container has an assigned location (' || v_location || '). Please remove location assignment first.';
    END IF;
  END IF;

  -- Return results
  RETURN QUERY SELECT 
    v_can_delete,
    v_reason,
    v_gate_in_count,
    v_gate_out_count,
    (v_location IS NOT NULL AND v_location != ''),
    v_status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to perform soft delete
CREATE OR REPLACE FUNCTION soft_delete_container(
  container_uuid UUID,
  user_uuid UUID
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  blocking_reason TEXT
) AS $$
DECLARE
  v_can_delete BOOLEAN;
  v_blocking_reason TEXT;
  v_container_number TEXT;
BEGIN
  -- Check if container exists and is not already deleted
  SELECT number INTO v_container_number
  FROM containers
  WHERE id = container_uuid AND is_deleted = false;

  IF v_container_number IS NULL THEN
    RETURN QUERY SELECT false, 'Container not found or already deleted', NULL::TEXT;
    RETURN;
  END IF;

  -- Check deletion constraints
  SELECT can_delete, blocking_reason
  INTO v_can_delete, v_blocking_reason
  FROM check_container_deletion_constraints(container_uuid);

  IF NOT v_can_delete THEN
    RETURN QUERY SELECT false, 'Cannot delete container', v_blocking_reason;
    RETURN;
  END IF;

  -- Perform soft delete
  UPDATE containers
  SET 
    is_deleted = true,
    deleted_at = NOW(),
    deleted_by = user_uuid,
    updated_at = NOW(),
    updated_by = user_uuid
  WHERE id = container_uuid;

  RETURN QUERY SELECT true, 'Container ' || v_container_number || ' deleted successfully', NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to restore soft-deleted container
CREATE OR REPLACE FUNCTION restore_container(
  container_uuid UUID,
  user_uuid UUID
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT
) AS $$
DECLARE
  v_container_number TEXT;
BEGIN
  -- Check if container exists and is deleted
  SELECT number INTO v_container_number
  FROM containers
  WHERE id = container_uuid AND is_deleted = true;

  IF v_container_number IS NULL THEN
    RETURN QUERY SELECT false, 'Container not found or not deleted';
    RETURN;
  END IF;

  -- Restore container
  UPDATE containers
  SET 
    is_deleted = false,
    deleted_at = NULL,
    deleted_by = NULL,
    updated_at = NOW(),
    updated_by = user_uuid
  WHERE id = container_uuid;

  RETURN QUERY SELECT true, 'Container ' || v_container_number || ' restored successfully';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION check_container_deletion_constraints(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION soft_delete_container(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION restore_container(UUID, UUID) TO authenticated;

-- Add comment
COMMENT ON COLUMN containers.is_deleted IS 'Soft delete flag - true if container is deleted';
COMMENT ON COLUMN containers.deleted_at IS 'Timestamp when container was soft deleted';
COMMENT ON COLUMN containers.deleted_by IS 'User who soft deleted the container';
COMMENT ON FUNCTION check_container_deletion_constraints(UUID) IS 'Checks if a container can be deleted and returns blocking reasons';
COMMENT ON FUNCTION soft_delete_container(UUID, UUID) IS 'Performs soft delete on a container with validation';
COMMENT ON FUNCTION restore_container(UUID, UUID) IS 'Restores a soft-deleted container';
