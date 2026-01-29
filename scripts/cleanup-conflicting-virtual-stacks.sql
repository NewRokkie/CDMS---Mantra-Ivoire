-- Cleanup Conflicting Virtual Stacks
-- This script resolves conflicts between the old and new virtual stack management systems

-- ============================================================================
-- STEP 1: Identify conflicting virtual stacks
-- ============================================================================

SELECT 
  '=== CONFLICTING VIRTUAL STACKS ===' as section,
  s1.stack_number as virtual_stack,
  s1.is_virtual,
  s1.is_active as virtual_active,
  s1.container_size,
  COUNT(s2.id) as duplicate_count
FROM stacks s1
LEFT JOIN stacks s2 ON (
  s1.yard_id = s2.yard_id 
  AND s1.stack_number = s2.stack_number 
  AND s1.id != s2.id
)
WHERE s1.is_virtual = true
GROUP BY s1.id, s1.stack_number, s1.is_virtual, s1.is_active, s1.container_size
HAVING COUNT(s2.id) > 0
ORDER BY s1.stack_number;

-- ============================================================================
-- STEP 2: Show current virtual stack status
-- ============================================================================

SELECT 
  '=== CURRENT VIRTUAL STACK STATUS ===' as section,
  yard_id,
  stack_number,
  is_virtual,
  is_active,
  container_size,
  created_at,
  id
FROM stacks 
WHERE is_virtual = true
ORDER BY yard_id, stack_number, created_at;

-- ============================================================================
-- STEP 3: Clean up duplicate virtual stacks (keep the newest)
-- ============================================================================

DO $$
DECLARE
  rec RECORD;
  v_kept_count INTEGER := 0;
  v_removed_count INTEGER := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🧹 CLEANING UP DUPLICATE VIRTUAL STACKS';
  RAISE NOTICE '====================================';
  
  -- For each virtual stack number that has duplicates
  FOR rec IN 
    SELECT 
      yard_id,
      stack_number,
      COUNT(*) as duplicate_count,
      MAX(created_at) as latest_created_at
    FROM stacks 
    WHERE is_virtual = true
    GROUP BY yard_id, stack_number
    HAVING COUNT(*) > 1
  LOOP
    RAISE NOTICE 'Processing virtual stack S% with % duplicates', 
      LPAD(rec.stack_number::text, 2, '0'), rec.duplicate_count;
    
    -- Keep the newest virtual stack, deactivate the others
    UPDATE stacks 
    SET is_active = false, updated_at = NOW()
    WHERE yard_id = rec.yard_id
      AND stack_number = rec.stack_number
      AND is_virtual = true
      AND created_at < rec.latest_created_at;
    
    GET DIAGNOSTICS v_removed_count = ROW_COUNT;
    v_kept_count := v_kept_count + 1;
    
    RAISE NOTICE '  ✅ Kept 1 virtual stack, deactivated % duplicates', v_removed_count;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '📊 CLEANUP SUMMARY:';
  RAISE NOTICE 'Virtual stacks kept active: %', v_kept_count;
  RAISE NOTICE 'Duplicate virtual stacks deactivated: %', v_removed_count;
END;
$$;

-- ============================================================================
-- STEP 4: Clean up orphaned virtual_stack_pairs
-- ============================================================================

DO $$
DECLARE
  v_orphaned_pairs INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🧹 CLEANING UP ORPHANED VIRTUAL PAIRS';
  RAISE NOTICE '===================================';
  
  -- Deactivate virtual_stack_pairs that reference non-existent or inactive virtual stacks
  UPDATE virtual_stack_pairs 
  SET is_active = false, updated_at = NOW()
  WHERE is_active = true
    AND NOT EXISTS (
      SELECT 1 FROM stacks s
      WHERE s.yard_id = virtual_stack_pairs.yard_id
        AND s.stack_number = virtual_stack_pairs.virtual_stack_number
        AND s.is_virtual = true
        AND s.is_active = true
    );
  
  GET DIAGNOSTICS v_orphaned_pairs = ROW_COUNT;
  
  RAISE NOTICE '✅ Deactivated % orphaned virtual_stack_pairs', v_orphaned_pairs;
END;
$$;

-- ============================================================================
-- STEP 5: Clean up orphaned locations
-- ============================================================================

DO $$
DECLARE
  v_orphaned_locations INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🧹 CLEANING UP ORPHANED VIRTUAL LOCATIONS';
  RAISE NOTICE '========================================';
  
  -- Deactivate locations that reference inactive virtual stacks
  UPDATE locations 
  SET is_active = false, updated_at = NOW()
  WHERE is_virtual = true
    AND is_active = true
    AND stack_id IN (
      SELECT id FROM stacks 
      WHERE is_virtual = true AND is_active = false
    );
  
  GET DIAGNOSTICS v_orphaned_locations = ROW_COUNT;
  
  RAISE NOTICE '✅ Deactivated % orphaned virtual locations', v_orphaned_locations;
END;
$$;

-- ============================================================================
-- STEP 6: Verify cleanup results
-- ============================================================================

SELECT 
  '=== CLEANUP VERIFICATION ===' as section,
  'Active Virtual Stacks' as metric,
  COUNT(*) as count
FROM stacks 
WHERE is_virtual = true AND is_active = true;

SELECT 
  '=== CLEANUP VERIFICATION ===' as section,
  'Active Virtual Pairs' as metric,
  COUNT(*) as count
FROM virtual_stack_pairs 
WHERE is_active = true;

SELECT 
  '=== CLEANUP VERIFICATION ===' as section,
  'Active Virtual Locations' as metric,
  COUNT(*) as count
FROM locations 
WHERE is_virtual = true AND is_active = true;

-- ============================================================================
-- STEP 7: Show remaining virtual stacks
-- ============================================================================

SELECT 
  '=== REMAINING VIRTUAL STACKS ===' as section,
  yard_id,
  stack_number,
  is_virtual,
  is_active,
  container_size,
  capacity,
  created_at
FROM stacks 
WHERE is_virtual = true AND is_active = true
ORDER BY yard_id, stack_number;

-- ============================================================================
-- STEP 8: Final recommendations
-- ============================================================================

DO $$
DECLARE
  v_active_virtual_stacks INTEGER;
  v_active_virtual_pairs INTEGER;
  v_physical_40ft_pairs INTEGER;
BEGIN
  -- Count active components
  SELECT COUNT(*) INTO v_active_virtual_stacks 
  FROM stacks WHERE is_virtual = true AND is_active = true;
  
  SELECT COUNT(*) INTO v_active_virtual_pairs 
  FROM virtual_stack_pairs WHERE is_active = true;
  
  -- Count physical 40ft stack pairs
  SELECT COUNT(*) INTO v_physical_40ft_pairs
  FROM (
    SELECT s1.yard_id, s1.stack_number
    FROM stacks s1
    JOIN stacks s2 ON (
      s1.yard_id = s2.yard_id 
      AND s2.stack_number = s1.stack_number + 2
    )
    WHERE s1.stack_number % 2 = 1
      AND s1.container_size = '40ft' AND s1.is_active = true
      AND s2.container_size = '40ft' AND s2.is_active = true
      AND s1.is_virtual = false AND s2.is_virtual = false
  ) pairs;
  
  RAISE NOTICE '';
  RAISE NOTICE '🎯 FINAL STATUS:';
  RAISE NOTICE '===============';
  RAISE NOTICE 'Active virtual stacks: %', v_active_virtual_stacks;
  RAISE NOTICE 'Active virtual pairs: %', v_active_virtual_pairs;
  RAISE NOTICE 'Physical 40ft pairs: %', v_physical_40ft_pairs;
  
  IF v_active_virtual_stacks = v_physical_40ft_pairs THEN
    RAISE NOTICE '✅ Perfect! Virtual stacks match physical 40ft pairs';
  ELSIF v_active_virtual_stacks < v_physical_40ft_pairs THEN
    RAISE NOTICE '⚠️  Missing % virtual stack(s) - triggers should create them', 
      v_physical_40ft_pairs - v_active_virtual_stacks;
  ELSE
    RAISE NOTICE '⚠️  Extra % virtual stack(s) - may need manual cleanup', 
      v_active_virtual_stacks - v_physical_40ft_pairs;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '📝 NEXT STEPS:';
  RAISE NOTICE '1. Test the automatic virtual stack management';
  RAISE NOTICE '2. Change stack container_size via the UI';
  RAISE NOTICE '3. Verify virtual stacks appear/disappear automatically';
  RAISE NOTICE '4. Check that no duplicate virtual stacks are created';
END;
$$;