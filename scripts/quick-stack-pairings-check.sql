-- Quick Stack Pairings Verification Script
-- Execute this to check the current status of your stack pairings

-- ============================================================================
-- SECTION 1: BASIC VERIFICATION
-- ============================================================================

SELECT '=== BASIC STACK VERIFICATION ===' as section;

-- Check stacks 3, 4, 5
SELECT 
  stack_number,
  container_size,
  is_active,
  is_virtual,
  CASE 
    WHEN stack_number IN (3, 5) AND container_size = '40ft' AND is_active = true THEN '✅ Ready for pairing'
    WHEN stack_number = 4 AND is_virtual = true AND container_size = '40ft' THEN '✅ Virtual stack exists'
    WHEN stack_number IN (3, 5) AND container_size != '40ft' THEN '❌ Not 40ft'
    WHEN stack_number IN (3, 5) AND is_active = false THEN '❌ Inactive'
    WHEN stack_number = 4 AND is_virtual = false THEN '⚠️ Should be virtual'
    ELSE '❓ Check configuration'
  END as status
FROM stacks 
WHERE stack_number IN (3, 4, 5) 
ORDER BY stack_number;

-- ============================================================================
-- SECTION 2: STACK PAIRINGS CHECK
-- ============================================================================

SELECT '=== STACK PAIRINGS CHECK ===' as section;

-- Check current pairings
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN '❌ NO PAIRINGS FOUND'
    ELSE '✅ PAIRINGS EXIST: ' || COUNT(*)::text
  END as pairing_status
FROM stack_pairings;

-- Show existing pairings
SELECT 
  first_stack_number,
  second_stack_number,
  virtual_stack_number,
  is_active,
  CONCAT('S', LPAD(first_stack_number::text, 2, '0'), ' + S', LPAD(second_stack_number::text, 2, '0'), ' → S', LPAD(virtual_stack_number::text, 2, '0')) as pairing_description
FROM stack_pairings
ORDER BY first_stack_number;

-- ============================================================================
-- SECTION 3: SPECIFIC S03+S05 CHECK
-- ============================================================================

SELECT '=== S03 + S05 PAIRING CHECK ===' as section;

-- Check if S03+S05 pairing exists
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM stack_pairings 
      WHERE first_stack_number = 3 AND second_stack_number = 5 AND virtual_stack_number = 4
    ) THEN '✅ S03+S05→S04 pairing EXISTS'
    ELSE '❌ S03+S05→S04 pairing MISSING'
  END as s03_s05_pairing_status;

-- ============================================================================
-- SECTION 4: DIAGNOSTIC SUMMARY
-- ============================================================================

SELECT '=== DIAGNOSTIC SUMMARY ===' as section;

WITH diagnostic AS (
  SELECT 
    (SELECT COUNT(*) FROM stacks WHERE stack_number = 3 AND container_size = '40ft' AND is_active = true) as s03_ready,
    (SELECT COUNT(*) FROM stacks WHERE stack_number = 5 AND container_size = '40ft' AND is_active = true) as s05_ready,
    (SELECT COUNT(*) FROM stacks WHERE stack_number = 4 AND is_virtual = true AND is_active = true) as s04_virtual_exists,
    (SELECT COUNT(*) FROM stack_pairings WHERE first_stack_number = 3 AND second_stack_number = 5) as pairing_exists
)
SELECT 
  CASE 
    WHEN s03_ready = 1 THEN '✅ S03 is ready (40ft, active)'
    ELSE '❌ S03 is not ready'
  END as s03_status,
  CASE 
    WHEN s05_ready = 1 THEN '✅ S05 is ready (40ft, active)'
    ELSE '❌ S05 is not ready'
  END as s05_status,
  CASE 
    WHEN s04_virtual_exists = 1 THEN '✅ S04 virtual stack exists'
    ELSE '❌ S04 virtual stack missing'
  END as s04_status,
  CASE 
    WHEN pairing_exists = 1 THEN '✅ S03+S05 pairing exists'
    ELSE '❌ S03+S05 pairing missing'
  END as pairing_status
FROM diagnostic;

-- ============================================================================
-- SECTION 5: RECOMMENDED ACTIONS
-- ============================================================================

SELECT '=== RECOMMENDED ACTIONS ===' as section;

DO $$
DECLARE
  s03_ready boolean;
  s05_ready boolean;
  s04_exists boolean;
  pairing_exists boolean;
BEGIN
  -- Check conditions
  SELECT EXISTS (
    SELECT 1 FROM stacks 
    WHERE stack_number = 3 AND container_size = '40ft' AND is_active = true
  ) INTO s03_ready;
  
  SELECT EXISTS (
    SELECT 1 FROM stacks 
    WHERE stack_number = 5 AND container_size = '40ft' AND is_active = true
  ) INTO s05_ready;
  
  SELECT EXISTS (
    SELECT 1 FROM stacks 
    WHERE stack_number = 4 AND is_virtual = true AND is_active = true
  ) INTO s04_exists;
  
  SELECT EXISTS (
    SELECT 1 FROM stack_pairings 
    WHERE first_stack_number = 3 AND second_stack_number = 5
  ) INTO pairing_exists;
  
  RAISE NOTICE '';
  RAISE NOTICE '🎯 RECOMMENDED ACTIONS:';
  RAISE NOTICE '======================';
  
  IF s03_ready AND s05_ready AND pairing_exists AND s04_exists THEN
    RAISE NOTICE '🎉 PERFECT! Everything is configured correctly.';
    RAISE NOTICE '✅ S03 and S05 are ready for 40ft containers';
    RAISE NOTICE '✅ S03+S05→S04 pairing exists';
    RAISE NOTICE '✅ S04 virtual stack exists';
    RAISE NOTICE '🚀 You can now assign 40ft containers to virtual stack S04';
    
  ELSIF s03_ready AND s05_ready AND NOT pairing_exists THEN
    RAISE NOTICE '🔧 ACTION NEEDED: Create the missing pairing';
    RAISE NOTICE '✅ S03 and S05 are ready';
    RAISE NOTICE '❌ But S03+S05→S04 pairing is missing';
    RAISE NOTICE '📝 Run: \i scripts/diagnose-and-fix-stack-pairings.sql';
    
  ELSIF s03_ready AND s05_ready AND pairing_exists AND NOT s04_exists THEN
    RAISE NOTICE '🔧 ACTION NEEDED: Create the virtual stack';
    RAISE NOTICE '✅ S03 and S05 are ready';
    RAISE NOTICE '✅ S03+S05→S04 pairing exists';
    RAISE NOTICE '❌ But S04 virtual stack is missing';
    RAISE NOTICE '📝 Run: \i scripts/create-missing-virtual-stacks.sql';
    
  ELSIF NOT s03_ready OR NOT s05_ready THEN
    RAISE NOTICE '⚠️  CONFIGURATION ISSUE: Check your stacks';
    RAISE NOTICE 'S03 ready: %', CASE WHEN s03_ready THEN 'YES' ELSE 'NO' END;
    RAISE NOTICE 'S05 ready: %', CASE WHEN s05_ready THEN 'YES' ELSE 'NO' END;
    RAISE NOTICE '📝 Ensure both S03 and S05 are:';
    RAISE NOTICE '   - Active (is_active = true)';
    RAISE NOTICE '   - Configured for 40ft (container_size = ''40ft'')';
    
  ELSE
    RAISE NOTICE '🔧 MULTIPLE ACTIONS NEEDED:';
    IF NOT pairing_exists THEN
      RAISE NOTICE '1. Create pairing: \i scripts/diagnose-and-fix-stack-pairings.sql';
    END IF;
    IF NOT s04_exists THEN
      RAISE NOTICE '2. Create virtual stack: \i scripts/create-missing-virtual-stacks.sql';
    END IF;
  END IF;
END;
$$;

-- ============================================================================
-- SECTION 6: QUICK FIX COMMANDS
-- ============================================================================

SELECT '=== QUICK FIX COMMANDS ===' as section;

-- Show the exact commands to run based on current state
WITH current_state AS (
  SELECT 
    EXISTS (SELECT 1 FROM stacks WHERE stack_number = 3 AND container_size = '40ft' AND is_active = true) as s03_ready,
    EXISTS (SELECT 1 FROM stacks WHERE stack_number = 5 AND container_size = '40ft' AND is_active = true) as s05_ready,
    EXISTS (SELECT 1 FROM stacks WHERE stack_number = 4 AND is_virtual = true AND is_active = true) as s04_exists,
    EXISTS (SELECT 1 FROM stack_pairings WHERE first_stack_number = 3 AND second_stack_number = 5) as pairing_exists
)
SELECT 
  CASE 
    WHEN s03_ready AND s05_ready AND NOT pairing_exists THEN 
      'Run this command: \i scripts/diagnose-and-fix-stack-pairings.sql'
    WHEN s03_ready AND s05_ready AND pairing_exists AND NOT s04_exists THEN 
      'Run this command: \i scripts/create-missing-virtual-stacks.sql'
    WHEN s03_ready AND s05_ready AND NOT pairing_exists AND NOT s04_exists THEN 
      'Run both commands: 1) \i scripts/diagnose-and-fix-stack-pairings.sql  2) \i scripts/create-missing-virtual-stacks.sql'
    WHEN s03_ready AND s05_ready AND pairing_exists AND s04_exists THEN 
      '🎉 No action needed - everything is configured correctly!'
    ELSE 
      '⚠️ Check your S03 and S05 stack configuration first'
  END as recommended_command
FROM current_state;