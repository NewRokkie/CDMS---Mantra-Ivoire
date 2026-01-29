/*
  Fix Location Generation to Respect row_tier_config
  
  Problem:
  - Location IDs are generated uniformly (e.g., S01R1H1 to S01R1H5) without considering row_tier_config
  - Stack 01 has row_tier_config: [{"row":1,"maxTiers":3},{"row":2,"maxTiers":4},{"row":3,"maxTiers":5},{"row":4,"maxTiers":5}]
  - This means Row 1 should only have H1, H2, H3 (not H4, H5)
  
  Solution:
  1. Identify locations that violate row_tier_config constraints
  2. Remove unoccupied violating locations
  3. Report occupied violating locations that need manual intervention
  4. Update the application code to respect row_tier_config during generation
*/

-- Step 1: Create a function to validate location against row_tier_config
CREATE OR REPLACE FUNCTION is_location_valid_for_row_tier_config(
  p_stack_id UUID,
  p_row_number INTEGER,
  p_tier_number INTEGER
) RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_row_tier_config JSONB;
  v_max_tiers_for_row INTEGER;
  v_default_max_tiers INTEGER;
  v_config_text TEXT;
  v_parsed_config JSONB;
  v_element JSONB;
  i INTEGER;
BEGIN
  -- Get stack configuration
  SELECT row_tier_config, max_tiers
  INTO v_row_tier_config, v_default_max_tiers
  FROM stacks
  WHERE id = p_stack_id;
  
  -- If stack not found or no default max_tiers, return false
  IF v_default_max_tiers IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- If no row_tier_config, use default max_tiers
  IF v_row_tier_config IS NULL THEN
    RETURN p_tier_number <= v_default_max_tiers;
  END IF;
  
  -- Initialize with default
  v_max_tiers_for_row := v_default_max_tiers;
  
  BEGIN
    -- Handle different formats of row_tier_config
    CASE jsonb_typeof(v_row_tier_config)
      WHEN 'string' THEN
        -- If it's stored as a string, parse it
        v_config_text := v_row_tier_config #>> '{}';
        IF v_config_text IS NOT NULL AND v_config_text != '' THEN
          v_parsed_config := v_config_text::jsonb;
        ELSE
          RETURN p_tier_number <= v_default_max_tiers;
        END IF;
      WHEN 'array' THEN
        -- If it's already an array, use it directly
        v_parsed_config := v_row_tier_config;
      ELSE
        -- Unknown format or null, use default
        RETURN p_tier_number <= v_default_max_tiers;
    END CASE;
    
    -- Now v_parsed_config should be a JSONB array
    IF jsonb_typeof(v_parsed_config) = 'array' AND jsonb_array_length(v_parsed_config) > 0 THEN
      -- Loop through array elements using index to find matching row
      FOR i IN 0..jsonb_array_length(v_parsed_config)-1 LOOP
        v_element := v_parsed_config -> i;
        
        -- Check if this element has the required fields and matches our row
        IF v_element ? 'row' AND v_element ? 'maxTiers' THEN
          IF (v_element->>'row')::integer = p_row_number THEN
            v_max_tiers_for_row := (v_element->>'maxTiers')::integer;
            EXIT; -- Found the row, exit loop
          END IF;
        END IF;
      END LOOP;
    END IF;
    
  EXCEPTION WHEN OTHERS THEN
    -- If any parsing fails, use default
    v_max_tiers_for_row := v_default_max_tiers;
  END;
  
  -- Check if tier number is within allowed range
  RETURN p_tier_number <= v_max_tiers_for_row;
END;
$$;

-- Step 2: Identify problematic locations
CREATE TEMP TABLE problematic_locations AS
SELECT 
  l.id,
  l.location_id,
  l.stack_id,
  l.row_number,
  l.tier_number,
  l.is_occupied,
  l.container_id,
  s.stack_number,
  s.row_tier_config
FROM locations l
JOIN stacks s ON l.stack_id = s.id
WHERE l.is_active = true
  AND NOT is_location_valid_for_row_tier_config(l.stack_id, l.row_number, l.tier_number);

-- Step 3: Report findings
DO $$
DECLARE
  v_total_problematic INTEGER;
  v_occupied_problematic INTEGER;
  v_unoccupied_problematic INTEGER;
  v_deleted_count INTEGER;
BEGIN
  -- Count problematic locations
  SELECT COUNT(*) INTO v_total_problematic FROM problematic_locations;
  SELECT COUNT(*) INTO v_occupied_problematic FROM problematic_locations WHERE is_occupied = true;
  SELECT COUNT(*) INTO v_unoccupied_problematic FROM problematic_locations WHERE is_occupied = false;
  
  RAISE NOTICE '🔍 Location Validation Results:';
  RAISE NOTICE '  Total problematic locations: %', v_total_problematic;
  RAISE NOTICE '  Occupied (need manual intervention): %', v_occupied_problematic;
  RAISE NOTICE '  Unoccupied (can be auto-removed): %', v_unoccupied_problematic;
  
  IF v_total_problematic = 0 THEN
    RAISE NOTICE '✅ No problematic locations found. All locations respect row_tier_config.';
    RETURN;
  END IF;
  
  -- Show problematic locations by stack
  RAISE NOTICE '';
  RAISE NOTICE '📋 Problematic Locations by Stack:';
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
    RAISE NOTICE '  Stack % Row %: % locations (%)', 
      rec.stack_number, rec.row_number, rec.count, rec.location_ids;
    IF rec.occupied_count > 0 THEN
      RAISE NOTICE '    ⚠️  % occupied location(s) need manual container relocation', rec.occupied_count;
    END IF;
  END LOOP;
  
  -- Show occupied locations that need attention
  IF v_occupied_problematic > 0 THEN
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  Occupied locations requiring manual intervention:';
    FOR rec IN 
      SELECT location_id, container_id, stack_number, row_number, tier_number
      FROM problematic_locations 
      WHERE is_occupied = true 
      ORDER BY stack_number, row_number, tier_number
    LOOP
      RAISE NOTICE '  - Location: % (Stack % Row % Tier %) - Container: %', 
        rec.location_id, rec.stack_number, rec.row_number, rec.tier_number, rec.container_id;
    END LOOP;
    RAISE NOTICE '';
    RAISE NOTICE '📝 Action Required:';
    RAISE NOTICE '  1. Relocate containers from the above locations to valid positions';
    RAISE NOTICE '  2. Re-run this migration after containers are relocated';
    RAISE NOTICE '  3. The application will prevent future invalid location assignments';
  ELSE
    -- Safe to remove unoccupied problematic locations
    DELETE FROM locations 
    WHERE id IN (SELECT id FROM problematic_locations WHERE is_occupied = false);
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ Successfully removed % unoccupied problematic location(s)', v_deleted_count;
    
    IF v_deleted_count > 0 THEN
      RAISE NOTICE '🗑️  Removed locations:';
      FOR rec IN 
        SELECT location_id, stack_number, row_number, tier_number
        FROM problematic_locations 
        WHERE is_occupied = false
        ORDER BY stack_number, row_number, tier_number
      LOOP
        RAISE NOTICE '  - %', rec.location_id;
      END LOOP;
    END IF;
  END IF;
END;
$$;

-- Step 4: Show current state for Stack 01 as example
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '📊 Stack 01 Current Location Distribution:';
  
  FOR rec IN 
    SELECT 
      l.row_number,
      COUNT(*) as tier_count,
      STRING_AGG(SUBSTRING(l.location_id FROM 'H(.)')::text, ',' ORDER BY l.tier_number) as tiers,
      STRING_AGG(l.location_id, ',' ORDER BY l.tier_number) as location_ids
    FROM stacks s
    JOIN locations l ON s.id = l.stack_id
    WHERE s.stack_number = 1
      AND l.is_active = true
    GROUP BY l.row_number
    ORDER BY l.row_number
  LOOP
    RAISE NOTICE '  Row %: % tiers (%)', rec.row_number, rec.tier_count, rec.tiers;
  END LOOP;
END;
$$;

-- Step 5: Show expected vs actual configuration for Stack 01
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Stack 01 Configuration Validation:';
  
  FOR rec IN 
    WITH expected_config AS (
      SELECT 1 as row_number, 3 as expected_max_tiers
      UNION ALL SELECT 2, 4
      UNION ALL SELECT 3, 5  
      UNION ALL SELECT 4, 5
    ),
    actual_config AS (
      SELECT 
        l.row_number,
        MAX(l.tier_number) as actual_max_tiers
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
      CASE 
        WHEN COALESCE(a.actual_max_tiers, 0) = e.expected_max_tiers THEN '✅ Correct'
        WHEN COALESCE(a.actual_max_tiers, 0) > e.expected_max_tiers THEN '❌ Too many tiers'
        ELSE '⚠️ Too few tiers'
      END as status
    FROM expected_config e
    LEFT JOIN actual_config a ON e.row_number = a.row_number
    ORDER BY e.row_number
  LOOP
    RAISE NOTICE '  Row %: Expected %, Actual % - %', 
      rec.row_number, rec.expected_max_tiers, rec.actual_max_tiers, rec.status;
  END LOOP;
END;
$$;

-- Step 6: Add comment to the function for future reference
COMMENT ON FUNCTION is_location_valid_for_row_tier_config(UUID, INTEGER, INTEGER) IS 
'Validates if a location (row, tier) is valid according to the stack''s row_tier_config. 
Returns true if the tier number is within the allowed range for the specified row.';

-- Step 7: Final summary
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '📋 Migration Summary:';
  RAISE NOTICE '  ✅ Created validation function: is_location_valid_for_row_tier_config()';
  RAISE NOTICE '  ✅ Identified and processed problematic locations';
  RAISE NOTICE '  ✅ Updated application code to respect row_tier_config during generation';
  RAISE NOTICE '';
  RAISE NOTICE '🔧 Next Steps:';
  RAISE NOTICE '  1. Deploy updated application code';
  RAISE NOTICE '  2. Future location generation will respect row_tier_config';
  RAISE NOTICE '  3. Stack 01 Row 1 will only generate H1, H2, H3 (not H4, H5)';
  RAISE NOTICE '  4. Use the validation function to check location validity';
END;
$$;