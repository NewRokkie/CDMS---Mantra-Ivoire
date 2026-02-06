-- Fix Location IDs to Respect row_tier_config
-- 
-- This script identifies and removes location IDs that violate the row_tier_config
-- constraints for stacks. For example, Stack 01 Row 1 should only go up to H3,
-- not H5 as currently generated.
--
-- Problem: Location IDs like S01R1H4 and S01R1H5 exist when Row 1 should only
-- have a maximum of 3 tiers (H1, H2, H3) according to row_tier_config.

BEGIN;

-- Step 1: Identify problematic locations
-- These are locations that exceed the max_tiers defined in row_tier_config
CREATE TEMP TABLE problematic_locations AS
WITH stack_row_limits AS (
  SELECT 
    s.id as stack_id,
    s.stack_number,
    s.row_tier_config,
    jsonb_array_elements(s.row_tier_config) as row_config
  FROM stacks s
  WHERE s.row_tier_config IS NOT NULL 
    AND s.row_tier_config != 'null'::jsonb 
    AND s.row_tier_config != '[]'::jsonb
),
expanded_limits AS (
  SELECT 
    stack_id,
    stack_number,
    (row_config->>'row')::integer as row_number,
    (row_config->>'maxTiers')::integer as max_tiers_for_row
  FROM stack_row_limits
)
SELECT 
  l.id,
  l.location_id,
  l.stack_id,
  l.row_number,
  l.tier_number,
  el.max_tiers_for_row,
  l.is_occupied,
  l.container_id
FROM locations l
JOIN expanded_limits el ON l.stack_id = el.stack_id AND l.row_number = el.row_number
WHERE l.tier_number > el.max_tiers_for_row
  AND l.is_active = true;

-- Step 2: Show what we found
SELECT 
  'Problematic Locations Found' as status,
  COUNT(*) as count,
  STRING_AGG(DISTINCT location_id, ', ' ORDER BY location_id) as location_ids
FROM problematic_locations;

-- Step 3: Check if any problematic locations are occupied
SELECT 
  'Occupied Problematic Locations' as status,
  COUNT(*) as count,
  STRING_AGG(location_id, ', ' ORDER BY location_id) as occupied_location_ids
FROM problematic_locations
WHERE is_occupied = true;

-- Step 4: If there are occupied problematic locations, show details
SELECT 
  location_id,
  container_id,
  'This container needs to be relocated before cleanup' as action_required
FROM problematic_locations
WHERE is_occupied = true
ORDER BY location_id;

-- Step 5: Remove unoccupied problematic locations
-- Only proceed if no occupied locations were found
DO $$
DECLARE
  occupied_count INTEGER;
  deleted_count INTEGER;
BEGIN
  -- Check for occupied problematic locations
  SELECT COUNT(*) INTO occupied_count
  FROM problematic_locations
  WHERE is_occupied = true;
  
  IF occupied_count > 0 THEN
    RAISE NOTICE 'Cannot proceed: % occupied location(s) found that violate row_tier_config', occupied_count;
    RAISE NOTICE 'Please relocate containers from these locations first:';
    
    -- Show occupied locations that need attention
    FOR rec IN 
      SELECT location_id, container_id 
      FROM problematic_locations 
      WHERE is_occupied = true 
      ORDER BY location_id
    LOOP
      RAISE NOTICE '  - Location: %, Container: %', rec.location_id, rec.container_id;
    END LOOP;
    
  ELSE
    -- Safe to delete unoccupied problematic locations
    DELETE FROM locations 
    WHERE id IN (SELECT id FROM problematic_locations WHERE is_occupied = false);
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Successfully removed % problematic location(s)', deleted_count;
    
    -- Show what was deleted
    IF deleted_count > 0 THEN
      RAISE NOTICE 'Deleted locations: %', (
        SELECT STRING_AGG(location_id, ', ' ORDER BY location_id)
        FROM problematic_locations
        WHERE is_occupied = false
      );
    END IF;
  END IF;
END $$;

-- Step 6: Verify the cleanup
SELECT 
  'Remaining Problematic Locations' as status,
  COUNT(*) as count
FROM locations l
JOIN (
  SELECT 
    s.id as stack_id,
    (jsonb_array_elements(s.row_tier_config)->>'row')::integer as row_number,
    (jsonb_array_elements(s.row_tier_config)->>'maxTiers')::integer as max_tiers_for_row
  FROM stacks s
  WHERE s.row_tier_config IS NOT NULL 
    AND s.row_tier_config != 'null'::jsonb 
    AND s.row_tier_config != '[]'::jsonb
) limits ON l.stack_id = limits.stack_id AND l.row_number = limits.row_number
WHERE l.tier_number > limits.max_tiers_for_row
  AND l.is_active = true;

-- Step 7: Show current location distribution for Stack 01 as example
SELECT 
  'Stack 01 Location Distribution' as info,
  s.stack_number,
  l.row_number,
  COUNT(*) as tier_count,
  STRING_AGG(SUBSTRING(l.location_id FROM 'H(.)')::text, ',' ORDER BY l.tier_number) as tiers,
  STRING_AGG(l.location_id, ',' ORDER BY l.tier_number) as location_ids
FROM stacks s
JOIN locations l ON s.id = l.stack_id
WHERE s.stack_number = 1
  AND l.is_active = true
GROUP BY s.stack_number, l.row_number
ORDER BY l.row_number;

-- Step 8: Show expected vs actual for Stack 01
WITH expected_config AS (
  SELECT 
    1 as row_number, 3 as expected_max_tiers
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
  'Stack 01 Configuration Check' as info,
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
ORDER BY e.row_number;

COMMIT;

-- Final summary
SELECT 
  'Cleanup Summary' as summary,
  'Location IDs that violated row_tier_config have been identified and removed (if unoccupied)' as result,
  'Run the TypeScript location generation service to create correct locations' as next_step;