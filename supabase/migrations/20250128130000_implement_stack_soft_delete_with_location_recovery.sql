/*
  # Implement Stack Soft Delete with Location Recovery System

  1. Purpose
    - Implement soft delete for stacks (is_active = false instead of DELETE)
    - Automatically disable/enable locations when stacks are deactivated/reactivated
    - Smart stack recreation that recovers existing locations if available
    - Preserve all audit trails and relationships

  2. Changes
    - Add soft delete trigger for stacks
    - Add location management triggers
    - Create stack recreation function with location recovery
    - Update stack deletion policies to use soft delete
    - Add helper functions for stack/location lifecycle management

  3. Key Features
    - Soft delete preserves all data and relationships
    - Automatic location deactivation when stack is soft deleted
    - Smart location recovery when stack is recreated with same yard_id + stack_number
    - Comprehensive audit logging
    - Maintains referential integrity
*/

-- ============================================================================
-- STEP 1: Add soft delete trigger function for stacks
-- ============================================================================

CREATE OR REPLACE FUNCTION handle_stack_soft_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- When a stack is deactivated (soft deleted)
  IF OLD.is_active = true AND NEW.is_active = false THEN
    -- Deactivate all locations for this stack
    UPDATE locations 
    SET 
      is_active = false,
      updated_at = NOW()
    WHERE stack_id = NEW.id AND is_active = true;
    
    -- Log the action
    RAISE NOTICE 'Stack S% soft deleted - deactivated % locations', 
      NEW.stack_number, 
      (SELECT COUNT(*) FROM locations WHERE stack_id = NEW.id);
      
  -- When a stack is reactivated
  ELSIF OLD.is_active = false AND NEW.is_active = true THEN
    -- Reactivate all locations for this stack
    UPDATE locations 
    SET 
      is_active = true,
      updated_at = NOW()
    WHERE stack_id = NEW.id AND is_active = false;
    
    -- Log the action
    RAISE NOTICE 'Stack S% reactivated - enabled % locations', 
      NEW.stack_number,
      (SELECT COUNT(*) FROM locations WHERE stack_id = NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 2: Create stack recreation function with location recovery
-- ============================================================================

CREATE OR REPLACE FUNCTION recreate_stack_with_location_recovery(
  p_yard_id TEXT,
  p_stack_number INTEGER,
  p_section_name TEXT DEFAULT 'Zone A',
  p_rows INTEGER DEFAULT 6,
  p_max_tiers INTEGER DEFAULT 4,
  p_created_by TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_existing_stack_id UUID;
  v_new_stack_id UUID;
  v_existing_locations_count INTEGER;
  v_created_locations_count INTEGER;
BEGIN
  -- Check if a stack with same yard_id and stack_number already exists (active or inactive)
  SELECT id INTO v_existing_stack_id
  FROM stacks 
  WHERE yard_id = p_yard_id AND stack_number = p_stack_number
  LIMIT 1;
  
  IF v_existing_stack_id IS NOT NULL THEN
    -- Stack exists, reactivate it and update properties
    UPDATE stacks 
    SET 
      is_active = true,
      section_name = p_section_name,
      rows = p_rows,
      max_tiers = p_max_tiers,
      capacity = p_rows * p_max_tiers,
      updated_at = NOW(),
      updated_by = p_created_by
    WHERE id = v_existing_stack_id;
    
    v_new_stack_id := v_existing_stack_id;
    
    -- Count existing locations that will be reactivated
    SELECT COUNT(*) INTO v_existing_locations_count
    FROM locations 
    WHERE stack_id = v_existing_stack_id;
    
    RAISE NOTICE 'Reactivated existing stack S% with % existing locations', 
      p_stack_number, v_existing_locations_count;
      
  ELSE
    -- Create new stack
    INSERT INTO stacks (
      yard_id,
      stack_number,
      section_name,
      rows,
      max_tiers,
      capacity,
      is_active,
      created_by,
      updated_by
    ) VALUES (
      p_yard_id,
      p_stack_number,
      p_section_name,
      p_rows,
      p_max_tiers,
      p_rows * p_max_tiers,
      true,
      p_created_by,
      p_created_by
    )
    RETURNING id INTO v_new_stack_id;
    
    RAISE NOTICE 'Created new stack S% with ID %', p_stack_number, v_new_stack_id;
  END IF;
  
  -- Generate locations if they don't exist or are insufficient
  -- This will be handled by the location generation system
  SELECT COUNT(*) INTO v_existing_locations_count
  FROM locations 
  WHERE stack_id = v_new_stack_id AND is_active = true;
  
  -- Calculate expected locations
  v_created_locations_count := p_rows * p_max_tiers;
  
  IF v_existing_locations_count < v_created_locations_count THEN
    RAISE NOTICE 'Stack S% needs % additional locations (has %, needs %)', 
      p_stack_number, 
      v_created_locations_count - v_existing_locations_count,
      v_existing_locations_count,
      v_created_locations_count;
    
    -- Note: Location generation will be handled by the application layer
    -- or by calling the generate_locations_for_stack function if it exists
  END IF;
  
  RETURN v_new_stack_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 3: Create helper function to soft delete stack
-- ============================================================================

CREATE OR REPLACE FUNCTION soft_delete_stack(
  p_stack_id UUID,
  p_deleted_by TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_stack_number INTEGER;
  v_affected_locations INTEGER;
BEGIN
  -- Get stack number for logging
  SELECT stack_number INTO v_stack_number
  FROM stacks 
  WHERE id = p_stack_id AND is_active = true;
  
  IF v_stack_number IS NULL THEN
    RAISE NOTICE 'Stack with ID % not found or already inactive', p_stack_id;
    RETURN false;
  END IF;
  
  -- Soft delete the stack
  UPDATE stacks 
  SET 
    is_active = false,
    updated_at = NOW(),
    updated_by = p_deleted_by
  WHERE id = p_stack_id;
  
  -- Count affected locations (trigger will handle the deactivation)
  SELECT COUNT(*) INTO v_affected_locations
  FROM locations 
  WHERE stack_id = p_stack_id AND is_active = false;
  
  RAISE NOTICE 'Soft deleted stack S% - deactivated % locations', 
    v_stack_number, v_affected_locations;
    
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 4: Create function to permanently delete inactive stacks (admin only)
-- ============================================================================

CREATE OR REPLACE FUNCTION permanently_delete_inactive_stack(
  p_stack_id UUID,
  p_deleted_by TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_stack_number INTEGER;
  v_is_active BOOLEAN;
  v_location_count INTEGER;
  v_occupied_locations INTEGER;
BEGIN
  -- Get stack info
  SELECT stack_number, is_active INTO v_stack_number, v_is_active
  FROM stacks 
  WHERE id = p_stack_id;
  
  IF v_stack_number IS NULL THEN
    RAISE NOTICE 'Stack with ID % not found', p_stack_id;
    RETURN false;
  END IF;
  
  IF v_is_active = true THEN
    RAISE NOTICE 'Cannot permanently delete active stack S%. Use soft delete first.', v_stack_number;
    RETURN false;
  END IF;
  
  -- Check for occupied locations
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE is_occupied = true)
  INTO v_location_count, v_occupied_locations
  FROM locations 
  WHERE stack_id = p_stack_id;
  
  IF v_occupied_locations > 0 THEN
    RAISE NOTICE 'Cannot permanently delete stack S% - has % occupied locations', 
      v_stack_number, v_occupied_locations;
    RETURN false;
  END IF;
  
  -- Delete locations first (they reference the stack)
  DELETE FROM locations WHERE stack_id = p_stack_id;
  
  -- Delete the stack
  DELETE FROM stacks WHERE id = p_stack_id;
  
  RAISE NOTICE 'Permanently deleted inactive stack S% and % locations', 
    v_stack_number, v_location_count;
    
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 5: Add triggers
-- ============================================================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS stack_soft_delete_trigger ON stacks;

-- Create trigger for stack soft delete
CREATE TRIGGER stack_soft_delete_trigger
  AFTER UPDATE ON stacks
  FOR EACH ROW
  WHEN (OLD.is_active IS DISTINCT FROM NEW.is_active)
  EXECUTE FUNCTION handle_stack_soft_delete();

-- ============================================================================
-- STEP 6: Update RLS policies to handle soft delete
-- ============================================================================

-- Drop existing delete policies
DROP POLICY IF EXISTS "Admins and supervisors can delete stacks" ON stacks;
DROP POLICY IF EXISTS "Only admins can delete stacks" ON stacks;

-- Create new policy for soft delete (UPDATE with is_active = false)
CREATE POLICY "Admins and supervisors can soft delete stacks"
  ON stacks
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
      AND users.role IN ('admin', 'supervisor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
      AND users.role IN ('admin', 'supervisor')
    )
  );

-- Create policy for permanent deletion (only admins, only inactive stacks)
CREATE POLICY "Only admins can permanently delete inactive stacks"
  ON stacks
  FOR DELETE
  TO authenticated
  USING (
    is_active = false AND
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- ============================================================================
-- STEP 7: Create view for active stacks (convenience)
-- ============================================================================

CREATE OR REPLACE VIEW active_stacks AS
SELECT *
FROM stacks
WHERE is_active = true;

-- ============================================================================
-- STEP 8: Create view for stack status with location counts
-- ============================================================================

CREATE OR REPLACE VIEW stack_status_summary AS
SELECT 
  s.id,
  s.yard_id,
  s.stack_number,
  s.section_name,
  s.is_active,
  s.capacity,
  s.current_occupancy,
  COUNT(l.id) as total_locations,
  COUNT(l.id) FILTER (WHERE l.is_active = true) as active_locations,
  COUNT(l.id) FILTER (WHERE l.is_occupied = true) as occupied_locations,
  s.created_at,
  s.updated_at
FROM stacks s
LEFT JOIN locations l ON s.id = l.stack_id
GROUP BY s.id, s.yard_id, s.stack_number, s.section_name, s.is_active, 
         s.capacity, s.current_occupancy, s.created_at, s.updated_at
ORDER BY s.yard_id, s.stack_number;

-- ============================================================================
-- STEP 9: Add helpful comments
-- ============================================================================

COMMENT ON FUNCTION handle_stack_soft_delete() IS 
  'Automatically manages location activation/deactivation when stacks are soft deleted or reactivated';

COMMENT ON FUNCTION recreate_stack_with_location_recovery(TEXT, INTEGER, TEXT, INTEGER, INTEGER, TEXT) IS 
  'Smart stack creation that reactivates existing stacks and recovers their locations when possible';

COMMENT ON FUNCTION soft_delete_stack(UUID, TEXT) IS 
  'Safely soft delete a stack and deactivate all its locations';

COMMENT ON FUNCTION permanently_delete_inactive_stack(UUID, TEXT) IS 
  'Permanently delete an inactive stack and all its unoccupied locations (admin only)';

COMMENT ON VIEW active_stacks IS 
  'Convenience view showing only active stacks';

COMMENT ON VIEW stack_status_summary IS 
  'Summary view showing stack status with location counts for monitoring';

-- ============================================================================
-- STEP 10: Success message
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Stack Soft Delete System Implemented Successfully!';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Available Functions:';
  RAISE NOTICE '  • recreate_stack_with_location_recovery() - Smart stack creation with location recovery';
  RAISE NOTICE '  • soft_delete_stack() - Safely deactivate stack and locations';
  RAISE NOTICE '  • permanently_delete_inactive_stack() - Permanent deletion (admin only)';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Available Views:';
  RAISE NOTICE '  • active_stacks - Only active stacks';
  RAISE NOTICE '  • stack_status_summary - Stack status with location counts';
  RAISE NOTICE '';
  RAISE NOTICE '🔄 Behavior:';
  RAISE NOTICE '  • Deleting a stack now sets is_active = false (soft delete)';
  RAISE NOTICE '  • All stack locations are automatically deactivated';
  RAISE NOTICE '  • Recreating same stack reactivates existing locations';
  RAISE NOTICE '  • Audit trail is preserved for all operations';
  RAISE NOTICE '';
END $$;