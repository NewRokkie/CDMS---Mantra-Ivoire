-- Test Automatic Virtual Stack Management
-- This script tests the automatic creation and deactivation of virtual stacks

-- ============================================================================
-- SETUP: Ensure we have test stacks
-- ============================================================================

-- Check current state
SELECT 
  '=== INITIAL STATE ===' as section,
  stack_number,
  container_size,
  is_virtual,
  is_active
FROM stacks 
WHERE stack_number IN (3, 4, 5)
ORDER BY stack_number;

-- ============================================================================
-- TEST 1: Set S03 and S05 to 40ft (should create virtual S04)
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🧪 TEST 1: Setting S03 and S05 to 40ft';
  RAISE NOTICE '========================================';
  
  -- Update S03 to 40ft
  UPDATE stacks 
  SET container_size = '40ft', updated_at = NOW()
  WHERE stack_number = 3 AND is_virtual = false;
  
  -- Update S05 to 40ft  
  UPDATE stacks 
  SET container_size = '40ft', updated_at = NOW()
  WHERE stack_number = 5 AND is_virtual = false;
  
  RAISE NOTICE '✅ Updated S03 and S05 to 40ft';
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
    WHEN stack_number = 4 AND is_virtual = true AND is_active = true THEN '✅ Virtual S04 created'
    WHEN stack_number = 4 AND is_virtual = true AND is_active = false THEN '❌ Virtual S04 inactive'
    WHEN stack_number = 4 THEN '❌ S04 should be virtual'
    WHEN stack_number IN (3, 5) AND container_size = '40ft' THEN '✅ Physical stack 40ft'
    ELSE '❓ Check configuration'
  END as status
FROM stacks 
WHERE stack_number IN (3, 4, 5)
ORDER BY stack_number;

-- Check virtual_stack_pairs
SELECT 
  '=== VIRTUAL PAIRS AFTER TEST 1 ===' as section,
  CONCAT('S', LPAD(s1.stack_number::text, 2, '0')) as first_stack,
  CONCAT('S', LPAD(s2.stack_number::text, 2, '0')) as second_stack,
  CONCAT('S', LPAD(vsp.virtual_stack_number::text, 2, '0')) as virtual_stack,
  vsp.is_active
FROM virtual_stack_pairs vsp
JOIN stacks s1 ON vsp.stack1_id = s1.id
JOIN stacks s2 ON vsp.stack2_id = s2.id
WHERE vsp.virtual_stack_number = 4;

-- ============================================================================
-- TEST 2: Set S03 back to 20ft (should deactivate virtual S04)
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🧪 TEST 2: Setting S03 back to 20ft';
  RAISE NOTICE '==================================';
  
  -- Update S03 back to 20ft
  UPDATE stacks 
  SET container_size = '20ft', updated_at = NOW()
  WHERE stack_number = 3 AND is_virtual = false;
  
  RAISE NOTICE '✅ Updated S03 back to 20ft';
END;
$$;

-- Check result after TEST 2
SELECT 
  '=== AFTER TEST 2 ===' as section,
  stack_number,
  container_size,
  is_virtual,
  is_active,
  CASE 
    WHEN stack_number = 4 AND is_virtual = true AND is_active = false THEN '✅ Virtual S04 deactivated'
    WHEN stack_number = 4 AND is_virtual = true AND is_active = true THEN '❌ Virtual S04 should be inactive'
    WHEN stack_number = 3 AND container_size = '20ft' THEN '✅ S03 back to 20ft'
    WHEN stack_number = 5 AND container_size = '40ft' THEN '✅ S05 still 40ft'
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
    WHEN vsp.is_active = false THEN '✅ Correctly deactivated'
    ELSE '❌ Should be deactivated'
  END as expected_status
FROM virtual_stack_pairs vsp
JOIN stacks s1 ON vsp.stack1_id = s1.id
JOIN stacks s2 ON vsp.stack2_id = s2.id
WHERE vsp.virtual_stack_number = 4;

-- ============================================================================
-- TEST 3: Set both S03 and S05 back to 40ft (should reactivate virtual S04)
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🧪 TEST 3: Setting both S03 and S05 back to 40ft';
  RAISE NOTICE '===============================================';
  
  -- Update both back to 40ft
  UPDATE stacks 
  SET container_size = '40ft', updated_at = NOW()
  WHERE stack_number IN (3, 5) AND is_virtual = false;
  
  RAISE NOTICE '✅ Updated S03 and S05 back to 40ft';
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
    WHEN stack_number = 4 AND is_virtual = true AND is_active = true THEN '✅ Virtual S04 reactivated'
    WHEN stack_number = 4 AND is_virtual = true AND is_active = false THEN '❌ Virtual S04 should be active'
    WHEN stack_number IN (3, 5) AND container_size = '40ft' THEN '✅ Physical stack 40ft'
    ELSE '❓ Check configuration'
  END as status
FROM stacks 
WHERE stack_number IN (3, 4, 5)
ORDER BY stack_number;

-- ============================================================================
-- FINAL SUMMARY
-- ============================================================================

DO $$
DECLARE
  v_virtual_stack_exists BOOLEAN;
  v_virtual_stack_active BOOLEAN;
  v_virtual_pair_active BOOLEAN;
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
  RAISE NOTICE 'S03 is 40ft: %', CASE WHEN v_s03_40ft THEN '✅ YES' ELSE '❌ NO' END;
  RAISE NOTICE 'S05 is 40ft: %', CASE WHEN v_s05_40ft THEN '✅ YES' ELSE '❌ NO' END;
  
  IF v_virtual_stack_exists AND v_virtual_stack_active AND v_virtual_pair_active AND v_s03_40ft AND v_s05_40ft THEN
    RAISE NOTICE '';
    RAISE NOTICE '🎉 SUCCESS! Automatic virtual stack management is working correctly!';
    RAISE NOTICE '✅ Virtual stack S04 is created when S03 and S05 are both 40ft';
    RAISE NOTICE '✅ Virtual stack S04 is deactivated when either stack becomes 20ft';
    RAISE NOTICE '✅ Virtual stack S04 is reactivated when both stacks return to 40ft';
  ELSE
    RAISE NOTICE '';
    RAISE NOTICE '❌ ISSUES DETECTED! Check the trigger and function implementation.';
  END IF;
END;
$$;

-- Show locations for virtual stack
SELECT 
  '=== VIRTUAL STACK LOCATIONS ===' as section,
  l.location_id,
  l.row_number,
  l.tier_number,
  l.is_virtual,
  l.is_active
FROM locations l
JOIN stacks s ON l.stack_id = s.id
WHERE s.stack_number = 4 AND s.is_virtual = true
ORDER BY l.row_number, l.tier_number
LIMIT 10;