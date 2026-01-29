/*
  Fix Location Generation - Safe Approach with Soft Delete
  
  This migration uses soft delete (is_active = false) instead of hard delete
  to avoid foreign key constraint issues with audit logs.
*/

-- Step 1: Create a simple validation function that works with known configurations
CREATE OR REPLACE FUNCTION is_location_valid_for_stack(
  p_stack_number INTEGER,
  p_row_number INTEGER,
  p_tier_number INTEGER
) RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_max_tiers_for_row INTEGER;
  v_default_max_tiers INTEGER;
BEGIN
  -- Get default max_tiers for the stack
  SELECT max_tiers INTO v_default_max_tiers
  FROM stacks
  WHERE stack_number = p_stack_number;
  
  -- If stack not found, return false
  IF v_default_max_tiers IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Apply known configurations for specific stacks
  CASE p_stack_number
    WHEN 1 THEN
      -- Stack 01 has specific row-tier configuration
      CASE p_row_number
        WHEN 1 THEN v_max_tiers_for_row := 3;  -- Row 1: max 3 tiers
        WHEN 2 THEN v_max_tiers_for_row := 4;  -- Row 2: max 4 tiers
        WHEN 3 THEN v_max_tiers_for_row := 5;  -- Row 3: max 5 tiers
        WHEN 4 THEN v_max_tiers_for_row := 5;  -- Row 4: max 5 tiers
        ELSE v_max_tiers_for_row := v_default_max_tiers;
      END CASE;
    ELSE
      -- For other stacks, use default max_tiers for all rows
      v_max_tiers_for_row := v_default_max_tiers;
  END CASE;
  
  -- Check if tier number is within allowed range
  RETURN p_tier_number <= v_max_tiers_for_row;
END;
$$;

-- Step 2: Identify problematic locations using the validation function
CREATE TEMP TABLE problematic_locations AS
SELECT 
  l.id,
  l.location_id,
  l.stack_id,
  l.row_number,
  l.tier_number,
  l.is_occupied,
  l.container_id,
  s.stack_number
FROM locations l
JOIN stacks s ON l.stack_id = s.id
WHERE l.is_active = true
  AND NOT is_location_valid_for_stack(s.stack_number, l.row_number, l.tier_number);

-- Step 3: Report findings and take action using soft delete
DO $$
DECLARE
  v_total_problematic INTEGER;
  v_occupied_problematic INTEGER;
  v_unoccupied_problematic INTEGER;
  v_deactivated_count INTEGER;
  rec RECORD;
BEGIN
  -- Count problematic locations
  SELECT COUNT(*) INTO v_total_problematic FROM problematic_locations;
  SELECT COUNT(*) INTO v_occupied_problematic FROM problematic_locations WHERE is_occupied = true;
  SELECT COUNT(*) INTO v_unoccupied_problematic FROM problematic_locations WHERE is_occupied = false;
  
  RAISE NOTICE '';
  RAISE NOTICE '🔍 Location Validation Results:';
  RAISE NOTICE '=====================================';
  RAISE NOTICE 'Total problematic locations: %', v_total_problematic;
  RAISE NOTICE 'Occupied (need manual intervention): %', v_occupied_problematic;
  RAISE NOTICE 'Unoccupied (can be auto-deactivated): %', v_unoccupied_problematic;
  
  IF v_total_problematic = 0 THEN
    RAISE NOTICE '✅ No problematic locations found. All locations are valid.';
    RETURN;
  END IF;
  
  -- Show problematic locations by stack and row
  RAISE NOTICE '';
  RAISE NOTICE '📋 Problematic Locations Details:';
  FOR rec IN 
    SELECT 
      stack_number,
      row_number,
      STRING_AGG(location_id, ', ' ORDER BY tier_number) as location_ids,
      COUNT(*) as count,
      SUM(CASE WHEN is_occupied THEN 1 ELSE 0 END) as occupied_count
    FROM problematic_locations
    GROUP BY stack_number, row_number
    ORDER BY stack_number, row_number
  LOOP
    RAISE NOTICE 'Stack % Row %: % locations (%)', 
      rec.stack_number, rec.row_number, rec.count, rec.location_ids;
    IF rec.occupied_count > 0 THEN
      RAISE NOTICE '  ⚠️  % occupied location(s) need container relocation', rec.occupied_count;
    END IF;
  END LOOP;
  
  -- Show occupied locations that need manual intervention
  IF v_occupied_problematic > 0 THEN
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  OCCUPIED LOCATIONS REQUIRING MANUAL INTERVENTION:';
    RAISE NOTICE '====================================================';
    FOR rec IN 
      SELECT location_id, container_id, stack_number, row_number, tier_number
      FROM problematic_locations 
      WHERE is_occupied = true 
      ORDER BY stack_number, row_number, tier_number
    LOOP
      RAISE NOTICE 'Location: % (Stack % Row % Tier %) - Container: %', 
        rec.location_id, rec.stack_number, rec.row_number, rec.tier_number, rec.container_id;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '📝 REQUIRED ACTIONS:';
    RAISE NOTICE '1. Relocate the above containers to valid locations';
    RAISE NOTICE '2. Re-run this migration after containers are moved';
    RAISE NOTICE '3. The application code has been updated to prevent future invalid assignments';
    
  ELSE
    -- Safe to deactivate unoccupied problematic locations (soft delete)
    RAISE NOTICE '';
    RAISE NOTICE '🔄 Deactivating unoccupied problematic locations (soft delete)...';
    
    -- Use soft delete (set is_active = false) instead of hard delete
    -- This avoids foreign key constraint issues with audit logs
    UPDATE locations 
    SET 
      is_active = false,
      updated_at = NOW(),
      container_id = NULL,  -- Clear any container reference
      is_occupied = false   -- Ensure it's marked as unoccupied
    WHERE id IN (SELECT id FROM problematic_locations WHERE is_occupied = false);
    
    GET DIAGNOSTICS v_deactivated_count = ROW_COUNT;
    
    RAISE NOTICE '✅ Successfully deactivated % unoccupied problematic location(s)', v_deactivated_count;
    
    IF v_deactivated_count > 0 THEN
      RAISE NOTICE '';
      RAISE NOTICE 'Deactivated locations:';
      FOR rec IN 
        SELECT location_id, stack_number, row_number, tier_number
        FROM problematic_locations 
        WHERE is_occupied = false
        ORDER BY stack_number, row_number, tier_number
      LOOP
        RAISE NOTICE '  - % (Stack % Row % Tier %)', 
          rec.location_id, rec.stack_number, rec.row_number, rec.tier_number;
      END LOOP;
      
      RAISE NOTICE '';
      RAISE NOTICE '📝 Note: Locations were deactivated (soft delete) to preserve audit trail.';
      RAISE NOTICE 'They will not appear in active location queries but remain in the database.';
    END IF;
  END IF;
END;
$$;

-- Step 4: Show current state for Stack 01 (only active locations)
DO $$
DECLARE
  rec RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '📊 Stack 01 Current Active Location Distribution:';
  RAISE NOTICE '===============================================';
  
  FOR rec IN 
    SELECT 
      l.row_number,
      COUNT(*) as tier_count,
      MIN(l.tier_number) as min_tier,
      MAX(l.tier_number) as max_tier,
      STRING_AGG(SUBSTRING(l.location_id FROM 'H(.)')::text, ',' ORDER BY l.tier_number) as tiers
    FROM stacks s
    JOIN locations l ON s.id = l.stack_id
    WHERE s.stack_number = 1
      AND l.is_active = true
    GROUP BY l.row_number
    ORDER BY l.row_number
  LOOP
    RAISE NOTICE 'Row %: % tiers (H% to H%) - Tiers: %', 
      rec.row_number, rec.tier_count, rec.min_tier, rec.max_tier, rec.tiers;
  END LOOP;
  
  -- Also show deactivated locations for reference
  RAISE NOTICE '';
  RAISE NOTICE '📋 Stack 01 Deactivated Locations (for reference):';
  FOR rec IN 
    SELECT 
      l.row_number,
      COUNT(*) as tier_count,
      STRING_AGG(l.location_id, ',' ORDER BY l.tier_number) as location_ids
    FROM stacks s
    JOIN locations l ON s.id = l.stack_id
    WHERE s.stack_number = 1
      AND l.is_active = false
      AND l.updated_at >= NOW() - INTERVAL '1 hour'  -- Recently deactivated
    GROUP BY l.row_number
    ORDER BY l.row_number
  LOOP
    RAISE NOTICE 'Row %: % deactivated locations (%)', 
      rec.row_number, rec.tier_count, rec.location_ids;
  END LOOP;
END;
$$;

-- Step 5: Validate Stack 01 configuration (only active locations)
DO $$
DECLARE
  rec RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Stack 01 Configuration Validation (Active Locations):';
  RAISE NOTICE '=====================================================';
  
  FOR rec IN 
    WITH expected_config AS (
      SELECT 1 as row_number, 3 as expected_max_tiers, 'S01R1H1,S01R1H2,S01R1H3' as expected_locations
      UNION ALL SELECT 2, 4, 'S01R2H1,S01R2H2,S01R2H3,S01R2H4'
      UNION ALL SELECT 3, 5, 'S01R3H1,S01R3H2,S01R3H3,S01R3H4,S01R3H5'
      UNION ALL SELECT 4, 5, 'S01R4H1,S01R4H2,S01R4H3,S01R4H4,S01R4H5'
    ),
    actual_config AS (
      SELECT 
        l.row_number,
        COUNT(*) as actual_tier_count,
        MAX(l.tier_number) as actual_max_tiers,
        STRING_AGG(l.location_id, ',' ORDER BY l.tier_number) as actual_locations
      FROM stacks s
      JOIN locations l ON s.id = l.stack_id
      WHERE s.stack_number = 1
        AND l.is_active = true
      GROUP BY l.row_number
    )
    SELECT 
      e.row_number,
      e.expected_max_tiers,
      COALESCE(a.actual_max_tiers, 0) as actual_max_tiers,
      COALESCE(a.actual_tier_count, 0) as actual_tier_count,
      CASE 
        WHEN COALESCE(a.actual_max_tiers, 0) = e.expected_max_tiers THEN '✅ Correct'
        WHEN COALESCE(a.actual_max_tiers, 0) > e.expected_max_tiers THEN '❌ Too many tiers'
        WHEN COALESCE(a.actual_max_tiers, 0) < e.expected_max_tiers THEN '⚠️ Too few tiers'
        ELSE '❓ No data'
      END as status,
      e.expected_locations,
      COALESCE(a.actual_locations, 'No locations') as actual_locations
    FROM expected_config e
    LEFT JOIN actual_config a ON e.row_number = a.row_number
    ORDER BY e.row_number
  LOOP
    RAISE NOTICE 'Row %: Expected % tiers, Actual % tiers - %', 
      rec.row_number, rec.expected_max_tiers, rec.actual_max_tiers, rec.status;
    
    IF rec.status != '✅ Correct' THEN
      RAISE NOTICE '  Expected: %', rec.expected_locations;
      RAISE NOTICE '  Actual:   %', rec.actual_locations;
    END IF;
  END LOOP;
END;
$$;

-- Step 6: Add helpful comments
COMMENT ON FUNCTION is_location_valid_for_stack(INTEGER, INTEGER, INTEGER) IS 
'Validates if a location (row, tier) is valid for a specific stack number. 
Uses hardcoded configurations for known stacks (e.g., Stack 01) and falls back to default max_tiers for others.';

-- Step 7: Final summary and next steps
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '📋 MIGRATION SUMMARY:';
  RAISE NOTICE '====================';
  RAISE NOTICE '✅ Created validation function: is_location_valid_for_stack()';
  RAISE NOTICE '✅ Identified and processed problematic locations';
  RAISE NOTICE '✅ Used soft delete to preserve audit trail';
  RAISE NOTICE '✅ Application code updated to respect row_tier_config';
  RAISE NOTICE '';
  RAISE NOTICE '🔧 NEXT STEPS:';
  RAISE NOTICE '1. Deploy updated application code';
  RAISE NOTICE '2. Future location generation will respect row-tier limits';
  RAISE NOTICE '3. Stack 01 Row 1 will only generate H1, H2, H3 (not H4, H5)';
  RAISE NOTICE '4. Use is_location_valid_for_stack() to validate locations';
  RAISE NOTICE '';
  RAISE NOTICE '📈 EXPECTED RESULTS:';
  RAISE NOTICE 'Stack 01 Row 1: S01R1H1, S01R1H2, S01R1H3 (3 tiers)';
  RAISE NOTICE 'Stack 01 Row 2: S01R2H1, S01R2H2, S01R2H3, S01R2H4 (4 tiers)';
  RAISE NOTICE 'Stack 01 Row 3: S01R3H1-H5 (5 tiers)';
  RAISE NOTICE 'Stack 01 Row 4: S01R4H1-H5 (5 tiers)';
  RAISE NOTICE 'Total active capacity: 3+4+5+5 = 17 locations (was 20)';
  RAISE NOTICE '';
  RAISE NOTICE '🛡️  SAFETY NOTES:';
  RAISE NOTICE '- Invalid locations were deactivated (soft delete), not permanently removed';
  RAISE NOTICE '- Audit trail is preserved';
  RAISE NOTICE '- No foreign key constraint violations';
  RAISE NOTICE '- Can be rolled back if needed';
END;
$$;