-- Debug script to understand the format of row_tier_config in the database
-- This will help us understand why the function is failing

-- Check the actual format of row_tier_config data
SELECT 
  id,
  stack_number,
  row_tier_config,
  jsonb_typeof(row_tier_config) as config_type,
  CASE 
    WHEN row_tier_config IS NULL THEN 'NULL'
    WHEN row_tier_config = 'null'::jsonb THEN 'JSON NULL'
    WHEN row_tier_config = '[]'::jsonb THEN 'EMPTY ARRAY'
    WHEN jsonb_typeof(row_tier_config) = 'string' THEN 'STRING: ' || (row_tier_config #>> '{}')
    WHEN jsonb_typeof(row_tier_config) = 'array' THEN 'ARRAY with ' || jsonb_array_length(row_tier_config) || ' elements'
    ELSE 'OTHER: ' || row_tier_config::text
  END as config_analysis
FROM stacks 
WHERE stack_number = 1
  OR row_tier_config IS NOT NULL;

-- Try to understand the structure better
SELECT 
  stack_number,
  row_tier_config,
  -- Try different ways to access the data
  CASE 
    WHEN jsonb_typeof(row_tier_config) = 'array' THEN 
      (SELECT jsonb_agg(elem) FROM jsonb_array_elements(row_tier_config) elem)
    WHEN jsonb_typeof(row_tier_config) = 'string' THEN 
      'String content: ' || (row_tier_config #>> '{}')
    ELSE 'Not array or string'
  END as parsed_config
FROM stacks 
WHERE row_tier_config IS NOT NULL 
  AND row_tier_config != 'null'::jsonb;

-- Test parsing string to JSONB if needed
DO $$
DECLARE
  test_config JSONB;
  test_string TEXT;
BEGIN
  -- Get a sample row_tier_config
  SELECT row_tier_config INTO test_config 
  FROM stacks 
  WHERE stack_number = 1 
  LIMIT 1;
  
  RAISE NOTICE 'Original config: %', test_config;
  RAISE NOTICE 'Config type: %', jsonb_typeof(test_config);
  
  IF jsonb_typeof(test_config) = 'string' THEN
    test_string := test_config #>> '{}';
    RAISE NOTICE 'String content: %', test_string;
    
    BEGIN
      test_config := test_string::jsonb;
      RAISE NOTICE 'Parsed as JSONB: %', test_config;
      RAISE NOTICE 'Parsed type: %', jsonb_typeof(test_config);
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Failed to parse string as JSONB: %', SQLERRM;
    END;
  END IF;
END;
$$;