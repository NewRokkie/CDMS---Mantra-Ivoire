-- Test script for the is_location_valid_for_row_tier_config function
-- This will help us verify the function works correctly

-- First, let's check what data we have
SELECT 
  'Current Stack Data' as info,
  id,
  stack_number,
  row_tier_config,
  jsonb_typeof(row_tier_config) as config_type,
  max_tiers
FROM stacks 
WHERE stack_number = 1;

-- Create the function (simplified version for testing)
CREATE OR REPLACE FUNCTION test_location_validation(
  p_stack_number INTEGER,
  p_row_number INTEGER,
  p_tier_number INTEGER
) RETURNS TABLE(
  is_valid BOOLEAN,
  max_tiers_for_row INTEGER,
  config_used TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_stack_id UUID;
  v_row_tier_config JSONB;
  v_max_tiers_for_row INTEGER;
  v_default_max_tiers INTEGER;
  v_config_text TEXT;
  v_parsed_config JSONB;
  v_element JSONB;
  v_config_used TEXT := 'default';
BEGIN
  -- Get stack data
  SELECT id, row_tier_config, max_tiers
  INTO v_stack_id, v_row_tier_config, v_default_max_tiers
  FROM stacks
  WHERE stack_number = p_stack_number;
  
  -- Initialize with default
  v_max_tiers_for_row := v_default_max_tiers;
  
  -- If no row_tier_config, use default max_tiers
  IF v_row_tier_config IS NULL OR v_row_tier_config = 'null'::jsonb OR v_row_tier_config = '[]'::jsonb THEN
    v_config_used := 'default (no config)';
  ELSE
    BEGIN
      -- Handle different formats of row_tier_config
      IF jsonb_typeof(v_row_tier_config) = 'string' THEN
        -- If it's stored as a string, parse it
        v_config_text := v_row_tier_config #>> '{}';
        v_parsed_config := v_config_text::jsonb;
        v_config_used := 'parsed from string';
      ELSIF jsonb_typeof(v_row_tier_config) = 'array' THEN
        -- If it's already an array, use it directly
        v_parsed_config := v_row_tier_config;
        v_config_used := 'direct array';
      ELSE
        -- Unknown format, use default
        v_config_used := 'default (unknown format)';
      END IF;
      
      -- Now v_parsed_config should be a JSONB array
      IF jsonb_typeof(v_parsed_config) = 'array' THEN
        -- Loop through array elements to find matching row
        FOR i IN 0..jsonb_array_length(v_parsed_config)-1 LOOP
          v_element := v_parsed_config -> i;
          
          -- Check if this element matches our row
          IF (v_element->>'row')::integer = p_row_number THEN
            v_max_tiers_for_row := (v_element->>'maxTiers')::integer;
            v_config_used := 'row-specific config';
            EXIT; -- Found the row, exit loop
          END IF;
        END LOOP;
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      -- If any parsing fails, use default
      v_max_tiers_for_row := v_default_max_tiers;
      v_config_used := 'default (parsing error)';
    END;
  END IF;
  
  -- Return results
  RETURN QUERY SELECT 
    p_tier_number <= v_max_tiers_for_row,
    v_max_tiers_for_row,
    v_config_used;
END;
$$;

-- Test the function with Stack 01 data
SELECT 
  'Stack 01 Validation Tests' as test_name,
  row_number,
  tier_number,
  is_valid,
  max_tiers_for_row,
  config_used,
  CASE 
    WHEN row_number = 1 AND tier_number <= 3 THEN 'Should be valid'
    WHEN row_number = 1 AND tier_number > 3 THEN 'Should be invalid'
    WHEN row_number = 2 AND tier_number <= 4 THEN 'Should be valid'
    WHEN row_number = 2 AND tier_number > 4 THEN 'Should be invalid'
    WHEN row_number IN (3,4) AND tier_number <= 5 THEN 'Should be valid'
    ELSE 'Edge case'
  END as expected_result
FROM (
  SELECT 
    row_number,
    tier_number,
    (test_location_validation(1, row_number, tier_number)).*
  FROM (
    VALUES 
      (1, 1), (1, 2), (1, 3), (1, 4), (1, 5),  -- Row 1: should be valid up to 3
      (2, 1), (2, 2), (2, 3), (2, 4), (2, 5),  -- Row 2: should be valid up to 4
      (3, 1), (3, 2), (3, 3), (3, 4), (3, 5),  -- Row 3: should be valid up to 5
      (4, 1), (4, 2), (4, 3), (4, 4), (4, 5)   -- Row 4: should be valid up to 5
  ) AS test_cases(row_number, tier_number)
) results
ORDER BY row_number, tier_number;

-- Show summary of validation results
WITH validation_results AS (
  SELECT 
    row_number,
    tier_number,
    (test_location_validation(1, row_number, tier_number)).is_valid
  FROM (
    VALUES 
      (1, 1), (1, 2), (1, 3), (1, 4), (1, 5),
      (2, 1), (2, 2), (2, 3), (2, 4), (2, 5),
      (3, 1), (3, 2), (3, 3), (3, 4), (3, 5),
      (4, 1), (4, 2), (4, 3), (4, 4), (4, 5)
  ) AS test_cases(row_number, tier_number)
)
SELECT 
  'Validation Summary' as summary,
  row_number,
  COUNT(*) as total_tiers_tested,
  SUM(CASE WHEN is_valid THEN 1 ELSE 0 END) as valid_tiers,
  SUM(CASE WHEN NOT is_valid THEN 1 ELSE 0 END) as invalid_tiers,
  STRING_AGG(
    CASE WHEN is_valid THEN tier_number::text ELSE NULL END, 
    ',' ORDER BY tier_number
  ) as valid_tier_numbers,
  STRING_AGG(
    CASE WHEN NOT is_valid THEN tier_number::text ELSE NULL END, 
    ',' ORDER BY tier_number
  ) as invalid_tier_numbers
FROM validation_results
GROUP BY row_number
ORDER BY row_number;

-- Clean up test function
DROP FUNCTION test_location_validation(INTEGER, INTEGER, INTEGER);