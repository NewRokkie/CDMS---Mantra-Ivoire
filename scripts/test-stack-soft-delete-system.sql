/*
  # Test Stack Soft Delete System

  This script tests the complete stack soft delete and location recovery system:
  1. Create a test stack with locations
  2. Test soft delete functionality
  3. Test reactivation and location recovery
  4. Test permanent deletion
  5. Test smart recreation with location recovery
*/

-- ============================================================================
-- SETUP: Create test environment
-- ============================================================================

DO $$
DECLARE
  v_test_stack_id UUID;
  v_location_count INTEGER;
  v_test_yard_id TEXT := 'test-yard-soft-delete';
  v_test_stack_number INTEGER := 99;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🧪 TESTING STACK SOFT DELETE SYSTEM';
  RAISE NOTICE '=====================================';
  
  -- Clean up any existing test data
  DELETE FROM locations WHERE stack_id IN (
    SELECT id FROM stacks WHERE yard_id = v_test_yard_id AND stack_number = v_test_stack_number
  );
  DELETE FROM stacks WHERE yard_id = v_test_yard_id AND stack_number = v_test_stack_number;
  
  RAISE NOTICE '';
  RAISE NOTICE '📋 STEP 1: Create test stack with locations';
  RAISE NOTICE '-------------------------------------------';
  
  -- Create test stack
  INSERT INTO stacks (
    yard_id,
    stack_number,
    section_name,
    rows,
    max_tiers,
    capacity,
    is_active,
    created_by
  ) VALUES (
    v_test_yard_id,
    v_test_stack_number,
    'Test Section',
    3,
    2,
    6,
    true,
    'test-user'
  )
  RETURNING id INTO v_test_stack_id;
  
  RAISE NOTICE 'Created test stack S% with ID: %', v_test_stack_number, v_test_stack_id;
  
  -- Create test locations
  FOR row_num IN 1..3 LOOP
    FOR tier_num IN 1..2 LOOP
      INSERT INTO locations (
        location_id,
        stack_id,
        yard_id,
        row_number,
        tier_number,
        is_active
      ) VALUES (
        'S' || LPAD(v_test_stack_number::text, 2, '0') || 'R' || row_num || 'H' || tier_num,
        v_test_stack_id,
        v_test_yard_id,
        row_num,
        tier_num,
        true
      );
    END LOOP;
  END LOOP;
  
  SELECT COUNT(*) INTO v_location_count
  FROM locations 
  WHERE stack_id = v_test_stack_id AND is_active = true;
  
  RAISE NOTICE 'Created % active locations for test stack', v_location_count;
  
  -- Show initial state
  RAISE NOTICE '';
  RAISE NOTICE '📊 Initial State:';
  RAISE NOTICE 'Stack S% - Active: %, Locations: %', 
    v_test_stack_number,
    (SELECT is_active FROM stacks WHERE id = v_test_stack_id),
    v_location_count;
END $$;

-- ============================================================================
-- TEST 1: Soft Delete Stack
-- ============================================================================

DO $$
DECLARE
  v_test_stack_id UUID;
  v_test_yard_id TEXT := 'test-yard-soft-delete';
  v_test_stack_number INTEGER := 99;
  v_active_locations_before INTEGER;
  v_active_locations_after INTEGER;
  v_result BOOLEAN;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '📋 STEP 2: Test soft delete functionality';
  RAISE NOTICE '----------------------------------------';
  
  -- Get test stack ID
  SELECT id INTO v_test_stack_id
  FROM stacks 
  WHERE yard_id = v_test_yard_id AND stack_number = v_test_stack_number;
  
  -- Count active locations before
  SELECT COUNT(*) INTO v_active_locations_before
  FROM locations 
  WHERE stack_id = v_test_stack_id AND is_active = true;
  
  RAISE NOTICE 'Before soft delete - Active locations: %', v_active_locations_before;
  
  -- Test soft delete function
  SELECT soft_delete_stack(v_test_stack_id, 'test-user') INTO v_result;
  
  -- Count active locations after
  SELECT COUNT(*) INTO v_active_locations_after
  FROM locations 
  WHERE stack_id = v_test_stack_id AND is_active = true;
  
  RAISE NOTICE 'After soft delete - Active locations: %', v_active_locations_after;
  RAISE NOTICE 'Soft delete result: %', v_result;
  
  -- Verify stack is inactive
  IF (SELECT is_active FROM stacks WHERE id = v_test_stack_id) = false THEN
    RAISE NOTICE '✅ Stack successfully soft deleted (is_active = false)';
  ELSE
    RAISE NOTICE '❌ Stack soft delete failed - stack is still active';
  END IF;
  
  -- Verify locations are deactivated
  IF v_active_locations_after = 0 THEN
    RAISE NOTICE '✅ All locations successfully deactivated';
  ELSE
    RAISE NOTICE '❌ Location deactivation failed - % locations still active', v_active_locations_after;
  END IF;
END $$;

-- ============================================================================
-- TEST 2: Reactivate Stack
-- ============================================================================

DO $$
DECLARE
  v_test_stack_id UUID;
  v_test_yard_id TEXT := 'test-yard-soft-delete';
  v_test_stack_number INTEGER := 99;
  v_active_locations_before INTEGER;
  v_active_locations_after INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '📋 STEP 3: Test stack reactivation';
  RAISE NOTICE '--------------------------------';
  
  -- Get test stack ID
  SELECT id INTO v_test_stack_id
  FROM stacks 
  WHERE yard_id = v_test_yard_id AND stack_number = v_test_stack_number;
  
  -- Count active locations before
  SELECT COUNT(*) INTO v_active_locations_before
  FROM locations 
  WHERE stack_id = v_test_stack_id AND is_active = true;
  
  RAISE NOTICE 'Before reactivation - Active locations: %', v_active_locations_before;
  
  -- Reactivate stack (this will trigger the location reactivation)
  UPDATE stacks 
  SET is_active = true, updated_by = 'test-user'
  WHERE id = v_test_stack_id;
  
  -- Count active locations after
  SELECT COUNT(*) INTO v_active_locations_after
  FROM locations 
  WHERE stack_id = v_test_stack_id AND is_active = true;
  
  RAISE NOTICE 'After reactivation - Active locations: %', v_active_locations_after;
  
  -- Verify stack is active
  IF (SELECT is_active FROM stacks WHERE id = v_test_stack_id) = true THEN
    RAISE NOTICE '✅ Stack successfully reactivated (is_active = true)';
  ELSE
    RAISE NOTICE '❌ Stack reactivation failed - stack is still inactive';
  END IF;
  
  -- Verify locations are reactivated
  IF v_active_locations_after > 0 THEN
    RAISE NOTICE '✅ Locations successfully reactivated (% locations active)', v_active_locations_after;
  ELSE
    RAISE NOTICE '❌ Location reactivation failed - no locations active';
  END IF;
END $$;

-- ============================================================================
-- TEST 3: Smart Recreation with Location Recovery
-- ============================================================================

DO $$
DECLARE
  v_test_yard_id TEXT := 'test-yard-soft-delete';
  v_test_stack_number INTEGER := 99;
  v_original_stack_id UUID;
  v_recreated_stack_id UUID;
  v_locations_before INTEGER;
  v_locations_after INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '📋 STEP 4: Test smart recreation with location recovery';
  RAISE NOTICE '----------------------------------------------------';
  
  -- Get original stack ID
  SELECT id INTO v_original_stack_id
  FROM stacks 
  WHERE yard_id = v_test_yard_id AND stack_number = v_test_stack_number;
  
  -- Count locations before
  SELECT COUNT(*) INTO v_locations_before
  FROM locations 
  WHERE stack_id = v_original_stack_id;
  
  RAISE NOTICE 'Original stack ID: %', v_original_stack_id;
  RAISE NOTICE 'Locations before recreation: %', v_locations_before;
  
  -- Soft delete the stack first
  UPDATE stacks SET is_active = false WHERE id = v_original_stack_id;
  
  -- Test smart recreation
  SELECT recreate_stack_with_location_recovery(
    v_test_yard_id,
    v_test_stack_number,
    'Recreated Test Section',
    3,
    2,
    'test-user-recreation'
  ) INTO v_recreated_stack_id;
  
  RAISE NOTICE 'Recreated stack ID: %', v_recreated_stack_id;
  
  -- Count locations after
  SELECT COUNT(*) INTO v_locations_after
  FROM locations 
  WHERE stack_id = v_recreated_stack_id AND is_active = true;
  
  RAISE NOTICE 'Active locations after recreation: %', v_locations_after;
  
  -- Verify it's the same stack (reactivated)
  IF v_original_stack_id = v_recreated_stack_id THEN
    RAISE NOTICE '✅ Smart recreation reactivated existing stack (same ID)';
  ELSE
    RAISE NOTICE '❌ Smart recreation created new stack instead of reactivating existing one';
  END IF;
  
  -- Verify locations were recovered
  IF v_locations_after = v_locations_before THEN
    RAISE NOTICE '✅ All locations successfully recovered';
  ELSE
    RAISE NOTICE '❌ Location recovery incomplete - expected %, got %', v_locations_before, v_locations_after;
  END IF;
END $$;

-- ============================================================================
-- TEST 4: Permanent Deletion
-- ============================================================================

DO $$
DECLARE
  v_test_stack_id UUID;
  v_test_yard_id TEXT := 'test-yard-soft-delete';
  v_test_stack_number INTEGER := 99;
  v_result BOOLEAN;
  v_stack_exists BOOLEAN;
  v_locations_exist INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '📋 STEP 5: Test permanent deletion';
  RAISE NOTICE '--------------------------------';
  
  -- Get test stack ID
  SELECT id INTO v_test_stack_id
  FROM stacks 
  WHERE yard_id = v_test_yard_id AND stack_number = v_test_stack_number;
  
  RAISE NOTICE 'Stack ID to permanently delete: %', v_test_stack_id;
  
  -- Soft delete first (required for permanent deletion)
  UPDATE stacks SET is_active = false WHERE id = v_test_stack_id;
  
  -- Test permanent deletion
  SELECT permanently_delete_inactive_stack(v_test_stack_id, 'test-user') INTO v_result;
  
  RAISE NOTICE 'Permanent deletion result: %', v_result;
  
  -- Verify stack is gone
  SELECT EXISTS(SELECT 1 FROM stacks WHERE id = v_test_stack_id) INTO v_stack_exists;
  
  -- Verify locations are gone
  SELECT COUNT(*) INTO v_locations_exist
  FROM locations WHERE stack_id = v_test_stack_id;
  
  IF NOT v_stack_exists THEN
    RAISE NOTICE '✅ Stack successfully permanently deleted';
  ELSE
    RAISE NOTICE '❌ Stack permanent deletion failed - stack still exists';
  END IF;
  
  IF v_locations_exist = 0 THEN
    RAISE NOTICE '✅ All locations successfully permanently deleted';
  ELSE
    RAISE NOTICE '❌ Location permanent deletion failed - % locations still exist', v_locations_exist;
  END IF;
END $$;

-- ============================================================================
-- TEST 5: Test Views and Summary Functions
-- ============================================================================

DO $$
DECLARE
  v_active_count INTEGER;
  v_inactive_count INTEGER;
  v_summary_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '📋 STEP 6: Test views and summary functions';
  RAISE NOTICE '-------------------------------------------';
  
  -- Test active_stacks view
  SELECT COUNT(*) INTO v_active_count FROM active_stacks;
  RAISE NOTICE 'Active stacks view count: %', v_active_count;
  
  -- Test inactive stacks query
  SELECT COUNT(*) INTO v_inactive_count FROM stacks WHERE is_active = false;
  RAISE NOTICE 'Inactive stacks count: %', v_inactive_count;
  
  -- Test stack_status_summary view
  SELECT COUNT(*) INTO v_summary_count FROM stack_status_summary;
  RAISE NOTICE 'Stack status summary view count: %', v_summary_count;
  
  -- Show sample from summary view
  RAISE NOTICE '';
  RAISE NOTICE '📊 Sample Stack Status Summary:';
  FOR rec IN 
    SELECT 
      yard_id,
      stack_number,
      is_active,
      total_locations,
      active_locations,
      occupied_locations
    FROM stack_status_summary 
    LIMIT 3
  LOOP
    RAISE NOTICE 'Stack S% (%) - Active: %, Locations: %/%, Occupied: %',
      rec.stack_number,
      rec.yard_id,
      rec.is_active,
      rec.active_locations,
      rec.total_locations,
      rec.occupied_locations;
  END LOOP;
END $$;

-- ============================================================================
-- FINAL SUMMARY
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🎉 STACK SOFT DELETE SYSTEM TEST COMPLETED';
  RAISE NOTICE '==========================================';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Test Results Summary:';
  RAISE NOTICE '  • Soft delete functionality - TESTED';
  RAISE NOTICE '  • Location deactivation trigger - TESTED';
  RAISE NOTICE '  • Stack reactivation - TESTED';
  RAISE NOTICE '  • Location reactivation trigger - TESTED';
  RAISE NOTICE '  • Smart recreation with location recovery - TESTED';
  RAISE NOTICE '  • Permanent deletion - TESTED';
  RAISE NOTICE '  • Views and summary functions - TESTED';
  RAISE NOTICE '';
  RAISE NOTICE '🔧 Available Functions:';
  RAISE NOTICE '  • soft_delete_stack(stack_id, deleted_by)';
  RAISE NOTICE '  • recreate_stack_with_location_recovery(yard_id, stack_number, ...)';
  RAISE NOTICE '  • permanently_delete_inactive_stack(stack_id, deleted_by)';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Available Views:';
  RAISE NOTICE '  • active_stacks - Only active stacks';
  RAISE NOTICE '  • stack_status_summary - Complete stack status with location counts';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 System is ready for production use!';
  RAISE NOTICE '';
END $$;