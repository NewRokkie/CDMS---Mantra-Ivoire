-- ============================================================================
-- Reset Gate In Data Script
-- ============================================================================
-- Purpose: Delete all Gate In related data to start fresh
-- WARNING: This will permanently delete data. Use with caution!
-- ============================================================================

BEGIN;

-- Display warning
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  WARNING: This script will delete all Gate In data!';
  RAISE NOTICE '⚠️  This includes:';
  RAISE NOTICE '    - All gate_in_operations records';
  RAISE NOTICE '    - All containers';
  RAISE NOTICE '    - All location occupancy data';
  RAISE NOTICE '    - All booking references';
  RAISE NOTICE '';
  RAISE NOTICE '🔄 Starting data deletion...';
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- Step 1: Release all occupied locations
-- ============================================================================
DO $$
DECLARE
  v_location_count INTEGER;
BEGIN
  -- Count occupied locations before clearing
  SELECT COUNT(*) INTO v_location_count
  FROM locations
  WHERE is_occupied = true;
  
  RAISE NOTICE '📍 Releasing % occupied locations...', v_location_count;
  
  -- Clear all location occupancy
  UPDATE locations
  SET 
    is_occupied = false,
    container_id = NULL,
    updated_at = NOW()
  WHERE is_occupied = true;
  
  RAISE NOTICE '   ✓ All locations released';
END $$;

-- ============================================================================
-- Step 2: Delete all containers
-- ============================================================================
DO $$
DECLARE
  v_container_count INTEGER;
BEGIN
  -- Count containers before deletion
  SELECT COUNT(*) INTO v_container_count
  FROM containers;
  
  RAISE NOTICE '📦 Deleting % containers...', v_container_count;
  
  -- Hard delete all containers
  DELETE FROM containers;
  
  RAISE NOTICE '   ✓ All containers deleted';
END $$;

-- ============================================================================
-- Step 3: Delete all gate_in_operations
-- ============================================================================
DO $$
DECLARE
  v_operation_count INTEGER;
BEGIN
  -- Count operations before deletion
  SELECT COUNT(*) INTO v_operation_count
  FROM gate_in_operations;
  
  RAISE NOTICE '🚪 Deleting % gate in operations...', v_operation_count;
  
  -- Delete all gate in operations
  DELETE FROM gate_in_operations;
  
  RAISE NOTICE '   ✓ All gate in operations deleted';
END $$;

-- ============================================================================
-- Step 4: Delete all booking references
-- ============================================================================
DO $$
DECLARE
  v_booking_count INTEGER;
BEGIN
  -- Count bookings before deletion
  SELECT COUNT(*) INTO v_booking_count
  FROM booking_references;
  
  RAISE NOTICE '📋 Deleting % booking references...', v_booking_count;
  
  -- Delete all booking references
  DELETE FROM booking_references;
  
  RAISE NOTICE '   ✓ All booking references deleted';
END $$;

-- ============================================================================
-- Step 5: Reset stack occupancy
-- ============================================================================
DO $$
DECLARE
  v_stack_count INTEGER;
BEGIN
  -- Count stacks with occupancy
  SELECT COUNT(*) INTO v_stack_count
  FROM stacks
  WHERE current_occupancy > 0;
  
  RAISE NOTICE '📚 Resetting occupancy for % stacks...', v_stack_count;
  
  -- Reset all stack occupancy to 0
  UPDATE stacks
  SET 
    current_occupancy = 0,
    updated_at = NOW()
  WHERE current_occupancy > 0;
  
  RAISE NOTICE '   ✓ All stack occupancy reset to 0';
END $$;

-- ============================================================================
-- Step 6: Display summary
-- ============================================================================
DO $$
DECLARE
  v_remaining_containers INTEGER;
  v_remaining_operations INTEGER;
  v_remaining_bookings INTEGER;
  v_occupied_locations INTEGER;
  v_stack_occupancy INTEGER;
BEGIN
  -- Count remaining data
  SELECT COUNT(*) INTO v_remaining_containers FROM containers;
  SELECT COUNT(*) INTO v_remaining_operations FROM gate_in_operations;
  SELECT COUNT(*) INTO v_remaining_bookings FROM booking_references;
  SELECT COUNT(*) INTO v_occupied_locations FROM locations WHERE is_occupied = true;
  SELECT SUM(current_occupancy) INTO v_stack_occupancy FROM stacks;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Gate In Data Reset Complete!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Final Status:';
  RAISE NOTICE '   - Containers: %', v_remaining_containers;
  RAISE NOTICE '   - Gate In Operations: %', v_remaining_operations;
  RAISE NOTICE '   - Booking References: %', v_remaining_bookings;
  RAISE NOTICE '   - Occupied Locations: %', v_occupied_locations;
  RAISE NOTICE '   - Total Stack Occupancy: %', COALESCE(v_stack_occupancy, 0);
  RAISE NOTICE '';
  RAISE NOTICE '✨ System is ready for fresh Gate In operations!';
  RAISE NOTICE '';
END $$;

-- Commit the transaction
COMMIT;

-- ============================================================================
-- Verification Queries (optional - uncomment to run)
-- ============================================================================

-- Verify containers are deleted
-- SELECT COUNT(*) as total_containers FROM containers;

-- Verify gate_in_operations are deleted
-- SELECT COUNT(*) as gate_in_operations FROM gate_in_operations;

-- Verify locations are released
-- SELECT COUNT(*) as occupied_locations FROM locations WHERE is_occupied = true;

-- Verify stack occupancy is reset
-- SELECT stack_number, current_occupancy FROM stacks WHERE current_occupancy > 0;

-- Show all locations status
-- SELECT 
--   COUNT(*) as total_locations,
--   SUM(CASE WHEN is_occupied THEN 1 ELSE 0 END) as occupied,
--   SUM(CASE WHEN NOT is_occupied THEN 1 ELSE 0 END) as available
-- FROM locations
-- WHERE is_active = true;
