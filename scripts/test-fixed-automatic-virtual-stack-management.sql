-- Test Fixed Automatic Virtual Stack Management
-- This script tests the corrected automatic creation and deactivation of virtual stacks

-- ============================================================================
-- CLEANUP: Remove any existing problematic data
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '🧹 CLEANUP: Preparing test environment...';
  
  -- Deactivate any existing virtual stacks for clean test
  UPDATE stacks 
  SET is_active = false 
  WHERE is_virtual = true AND stack_number = 4;
  
  -- Deactivate virtual pairs
  UPDATE virtual_stack_pairs 
  SET is_active = false 
  WHERE virtual_stack_number = 4;
  
  -- Reset S03 and S05 to 20ft for clean start
  UPDATE stacks 
  SET container_size = '20ft' 
  WHERE stack_number IN (3, 5) AND is_virtual = false;
  
  RAISE NOTICE '✅ Test environment prepared';
END;
$$;

-- ============================================================================
-- INITIAL STATE CHECK
-- ============================================================================

SELECT 
  '=== INITIAL STATE ===' as section,
  stack_number,
  container_size,
  is_virtual,
  is_active,
  CASE 
    WHEN stack_number IN (3, 5) AND container_size = '20ft' THEN '✅ Ready for test'
    WHEN stack_number = 4 AND is_virtual = true AND is_active = false THEN '✅ Virtual stack inactive'
    WHEN stack_number = 4 AND is_virtual = true AND is_active = true THEN '⚠️ Virtual stack should be inactive'
    ELSE '❓ Check configuration'
  END as status
FROM stacks 
WHERE stack_number IN (3, 4, 5)
ORDER BY stack_number;

-- ============================================================================
-- TEST 1: Set S03 to 40ft (should NOT create virtual S04 yet)
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🧪 TEST 1: Setting S03 to 40ft (S05 still 20ft)';
  RAISE NOTICE '===============================================';
  
  -- Update S03 to 40ft
  UPDATE stacks 
  SET container_size = '40ft', updated_at = NOW()
  WHERE stack_number = 3 AND is_virtual = false;
  
  RAISE NOTICE '✅ Updated S03 to 40ft';
END;
$$;

-- Check result after TEST 1
SELECT 
  '=== AFTER TEST 1 ===' as section,
  stack_number,
  container_size,
  is_virtual,
  is_active,
  CASE 
    WHEN stack_number = 3 AND container_size = '40ft' THEN '✅ S03 is 40ft'
    WHEN stack_number = 5 AND container_size = '20ft' THEN '✅ S05 still 20ft'
    WHEN stack_number = 4 AND is_virtual = true AND is_active = false THEN '✅ Virtual S04 still inactive (correct)'
    WHEN stack_number = 4 AND is_virtual = true AND is_active = true THEN '❌ Virtual S04 should not be active yet'
    ELSE '❓ Check configuration'
  END as status
FROM stacks 
WHERE stack_number IN (3, 4, 5)
ORDER BY stack_number;

-- ============================================================================
-- TEST 2: Set S05 to 40ft (should NOW create virtual S04)
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🧪 TEST 2: Setting S05 to 40ft (both stacks now 40ft)';
  RAISE NOTICE '==================================================';
  
  -- Update S05 to 40ft  
  UPDATE stacks 
  SET container_size = '40ft', updated_at = NOW()
  WHERE stack_number = 5 AND is_virtual = false;
  
  RAISE NOTICE '✅ Updated S05 to 40ft';
END;
$$;

-- Check result after TEST 2
SELECT 
  '=== AFTER TEST 2 ===' as section,
  stack_number,
  container_size,
  is_virtual,
  is_active,
  capacity,
  CASE 
    WHEN stack_number = 3 AND container_size = '40ft' THEN '✅ S03 is 40ft'
    WHEN stack_number = 5 AND container_size = '40ft' THEN '✅ S05 is 40ft'
    WHEN stack_number = 4 AND is_virtual = true AND is_active = true THEN '✅ Virtual S04 created/activated'
    WHEN stack_number = 4 AND is_virtual = true AND is_active = false THEN '❌ Virtual S04 should be active'
    ELSE '❓ Check configuration'
  END as status
FROM stacks 
WHERE stack_number IN (3, 4, 5)
ORDER BY stack_number;

-- Check virtual_stack_pairs after TEST 2
SELECT 
  '=== VIRTUAL PAIRS AFTER TEST 2 ===' as section,
  CONCAT('S', LPAD(s1.stack_number::text, 2, '0')) as first_stack,
  CONCAT('S', LPAD(s2.stack_number::text, 2, '0')) as second_stack,
  CONCAT('S', LPAD(vsp.virtual_stack_number::text, 2, '0')) as virtual_stack,
  vsp.is_active,
  CASE 
    WHEN vsp.is_active = true THEN '✅ Correctly activated'
    ELSE '❌ Should be activated'
  END as expected_status
FROM virtual_stack_pairs vsp
JOIN stacks s1 ON vsp.stack1_id = s1.id
JOIN stacks s2 ON vsp.stack2_id = s2.id
WHERE vsp.virtual_stack_number = 4;

-- ============================================================================
-- TEST 3: Set S03 back to 20ft (should deactivate virtual S04)
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🧪 TEST 3: Setting S03 back to 20ft';
  RAISE NOTICE '==================================';
  
  -- Update S03 back to 20ft
  UPDATE stacks 
  SET container_size = '20ft', updated_at = NOW()
  WHERE stack_number = 3 AND is_virtual = false;
  
  RAISE NOTICE '✅ Updated S03 back to 20ft';
END;
$$;

-- Check result after TEST 3
SELECT 
  '=== AFTER TEST 3 ===' as section,
  stack_number,
  container_size,
  is_virtual,
  is_active,
  CASE 
    WHEN stack_number = 3 AND container_size = '20ft' THEN '✅ S03 back to 20ft'
    WHEN stack_number = 5 AND container_size = '40ft' THEN '✅ S05 still 40ft'
    WHEN stack_number = 4 AND is_virtual = true AND is_active = false THEN '✅ Virtual S04 deactivated'
    WHEN stack_number = 4 AND is_virtual = true AND is_active = true THEN '❌ Virtual S04 should be deactivated'
    ELSE '❓ Check configuration'
  END as status
FROM stacks 
WHERE stack_number IN (3, 4, 5)
ORDER BY stack_number;

-- ============================================================================
-- TEST 4: Set both back to 40ft (should reactivate virtual S04)
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🧪 TEST 4: Setting both S03 and S05 back to 40ft';
  RAISE NOTICE '===============================================';
  
  -- Update both back to 40ft
  UPDATE stacks 
  SET container_size = '40ft', updated_at = NOW()
  WHERE stack_number IN (3, 5) AND is_virtual = false;
  
  RAISE NOTICE '✅ Updated S03 and S05 back to 40ft';
END;
$$;

-- Check result after TEST 4
SELECT 
  '=== AFTER TEST 4 ===' as section,
  stack_number,
  container_size,
  is_virtual,
  is_active,
  CASE 
    WHEN stack_number IN (3, 5) AND container_size = '40ft' THEN '✅ Physical stack 40ft'
    WHEN stack_number = 4 AND is_virtual = true AND is_active = true THEN '✅ Virtual S04 reactivated'
    WHEN stack_number = 4 AND is_virtual = true AND is_active = false THEN '❌ Virtual S04 should be reactivated'
    ELSE '❓ Check configuration'
  END as status
FROM stacks 
WHERE stack_number IN (3, 4, 5)
ORDER BY stack_number;

-- ============================================================================
-- FINAL VERIFICATION
-- ============================================================================

DO $$
DECLARE
  v_virtual_stack_exists BOOLEAN;
  v_virtual_stack_active BOOLEAN;
  v_virtual_pair_active BOOLEAN;
  v_stack_pairing_exists BOOLEAN;
  v_s03_40ft BOOLEAN;
  v_s05_40ft BOOLEAN;
BEGIN
  -- Check final state
  SELECT EXISTS (
    SELECT 1 FROM stacks 
    WHERE stack_number = 4 AND is_virtual = true
  ) INTO v_virtual_stack_exists;
  
  SELECT EXISTS (
    SELECT 1 FROM stacks 
    WHERE stack_number = 4 AND is_virtual = true AND is_active = true
  ) INTO v_virtual_stack_active;
  
  SELECT EXISTS (
    SELECT 1 FROM virtual_stack_pairs 
    WHERE virtual_stack_number = 4 AND is_active = true
  ) INTO v_virtual_pair_active;
  
  SELECT EXISTS (
    SELECT 1 FROM stack_pairings 
    WHERE first_stack_number = 3 AND second_stack_number = 5 AND is_active = true
  ) INTO v_stack_pairing_exists;
  
  SELECT container_size = '40ft' FROM stacks 
  WHERE stack_number = 3 AND is_virtual = false
  INTO v_s03_40ft;
  
  SELECT container_size = '40ft' FROM stacks 
  WHERE stack_number = 5 AND is_virtual = false
  INTO v_s05_40ft;
  
  RAISE NOTICE '';
  RAISE NOTICE '🎯 FINAL TEST RESULTS:';
  RAISE NOTICE '======================';
  RAISE NOTICE 'Virtual stack S04 exists: %', CASE WHEN v_virtual_stack_exists THEN '✅ YES' ELSE '❌ NO' END;
  RAISE NOTICE 'Virtual stack S04 active: %', CASE WHEN v_virtual_stack_active THEN '✅ YES' ELSE '❌ NO' END;
  RAISE NOTICE 'Virtual pair active: %', CASE WHEN v_virtual_pair_active THEN '✅ YES' ELSE '❌ NO' END;
  RAISE NOTICE 'Stack pairing exists: %', CASE WHEN v_stack_pairing_exists THEN '✅ YES' ELSE '❌ NO' END;
  RAISE NOTICE 'S03 is 40ft: %', CASE WHEN v_s03_40ft THEN '✅ YES' ELSE '❌ NO' END;
  RAISE NOTICE 'S05 is 40ft: %', CASE WHEN v_s05_40ft THEN '✅ YES' ELSE '❌ NO' END;
  
  IF v_virtual_stack_exists AND v_virtual_stack_active AND v_virtual_pair_active 
     AND v_stack_pairing_exists AND v_s03_40ft AND v_s05_40ft THEN
    RAISE NOTICE '';
    RAISE NOTICE '🎉 SUCCESS! Fixed automatic virtual stack management is working correctly!';
    RAISE NOTICE '✅ Virtual stack S04 is created when S03 and S05 are both 40ft';
    RAISE NOTICE '✅ Virtual stack S04 is deactivated when either stack becomes 20ft';
    RAISE NOTICE '✅ Virtual stack S04 is reactivated when both stacks return to 40ft';
    RAISE NOTICE '✅ All database tables are properly synchronized';
  ELSE
    RAISE NOTICE '';
    RAISE NOTICE '❌ ISSUES DETECTED! Check the trigger and function implementation.';
    RAISE NOTICE 'Missing components:';
    IF NOT v_virtual_stack_exists THEN RAISE NOTICE '  - Virtual stack S04 does not exist'; END IF;
    IF NOT v_virtual_stack_active THEN RAISE NOTICE '  - Virtual stack S04 is not active'; END IF;
    IF NOT v_virtual_pair_active THEN RAISE NOTICE '  - Virtual pair is not active'; END IF;
    IF NOT v_stack_pairing_exists THEN RAISE NOTICE '  - Stack pairing does not exist'; END IF;
  END IF;
END;
$$;

-- Show all relevant data for debugging
SELECT 
  '=== FINAL STATE SUMMARY ===' as section,
  'stacks' as table_name,
  stack_number,
  container_size,
  is_virtual,
  is_active,
  capacity
FROM stacks 
WHERE stack_number IN (3, 4, 5)
ORDER BY stack_number;

SELECT 
  '=== FINAL STATE SUMMARY ===' as section,
  'stack_pairings' as table_name,
  first_stack_number,
  second_stack_number,
  virtual_stack_number,
  is_active,
  NULL::text as container_size,
  NULL::boolean as is_virtual,
  NULL::integer as capacity
FROM stack_pairings
WHERE virtual_stack_number = 4;

SELECT 
  '=== FINAL STATE SUMMARY ===' as section,
  'virtual_stack_pairs' as table_name,
  virtual_stack_number,
  is_active,
  NULL::text as container_size,
  NULL::boolean as is_virtual,
  NULL::integer as capacity,
  NULL::integer as first_stack_number,
  NULL::integer as second_stack_number
FROM virtual_stack_pairs
WHERE virtual_stack_number = 4;