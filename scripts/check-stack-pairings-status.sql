-- Check Stack Pairings Status
-- This script analyzes why stack_pairings table might be empty

-- Step 1: Check current stack_pairings table
SELECT 
  'Current Stack Pairings' as info,
  COUNT(*) as total_pairings,
  COUNT(CASE WHEN is_active THEN 1 END) as active_pairings
FROM stack_pairings;

-- Step 2: Show existing stacks that could be paired
SELECT 
  'Available Stacks for Pairing' as info,
  yard_id,
  COUNT(*) as total_stacks,
  STRING_AGG(stack_number::text, ',' ORDER BY stack_number) as stack_numbers
FROM stacks 
WHERE is_active = true
GROUP BY yard_id;

-- Step 3: Check for odd-numbered stacks (required for pairing)
WITH odd_stacks AS (
  SELECT 
    yard_id,
    stack_number,
    id as stack_id
  FROM stacks 
  WHERE stack_number % 2 = 1  -- Odd numbers
    AND is_active = true
  ORDER BY yard_id, stack_number
)
SELECT 
  'Odd Stacks Available for Pairing' as analysis,
  yard_id,
  COUNT(*) as odd_stack_count,
  STRING_AGG(stack_number::text, ',' ORDER BY stack_number) as odd_stack_numbers
FROM odd_stacks
GROUP BY yard_id;

-- Step 4: Check potential pairings that could be created
WITH potential_pairings AS (
  SELECT 
    s1.yard_id,
    s1.stack_number as first_stack,
    s2.stack_number as second_stack,
    s1.stack_number + 1 as virtual_stack,
    s1.id as first_stack_id,
    s2.id as second_stack_id
  FROM stacks s1
  JOIN stacks s2 ON s1.yard_id = s2.yard_id
  WHERE s1.stack_number % 2 = 1  -- First stack is odd
    AND s2.stack_number = s1.stack_number + 2  -- Second stack is first + 2
    AND s1.is_active = true
    AND s2.is_active = true
)
SELECT 
  'Potential Pairings' as analysis,
  yard_id,
  first_stack,
  second_stack,
  virtual_stack,
  CONCAT('S', LPAD(first_stack::text, 2, '0'), ' + S', LPAD(second_stack::text, 2, '0'), ' → S', LPAD(virtual_stack::text, 2, '0')) as pairing_description
FROM potential_pairings
ORDER BY yard_id, first_stack;

-- Step 5: Check why specific pairings from the migration might have failed
DO $$
DECLARE
  v_yard_id text;
  v_stack_count integer;
  missing_stacks text[];
  expected_stacks integer[] := ARRAY[3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29];
  stack_num integer;
BEGIN
  -- Get the first yard
  SELECT DISTINCT yard_id INTO v_yard_id FROM stacks LIMIT 1;
  
  IF v_yard_id IS NULL THEN
    RAISE NOTICE 'No yards found in stacks table';
    RETURN;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '🔍 Analyzing Stack Pairing Requirements for Yard: %', v_yard_id;
  RAISE NOTICE '================================================';
  
  -- Check each expected stack
  FOREACH stack_num IN ARRAY expected_stacks
  LOOP
    SELECT COUNT(*) INTO v_stack_count
    FROM stacks 
    WHERE yard_id = v_yard_id 
      AND stack_number = stack_num 
      AND is_active = true;
    
    IF v_stack_count = 0 THEN
      missing_stacks := array_append(missing_stacks, 'S' || LPAD(stack_num::text, 2, '0'));
    END IF;
  END LOOP;
  
  IF array_length(missing_stacks, 1) > 0 THEN
    RAISE NOTICE '❌ Missing Stacks: %', array_to_string(missing_stacks, ', ');
    RAISE NOTICE '   These stacks are required for the standard pairing configuration';
  ELSE
    RAISE NOTICE '✅ All expected stacks are present';
  END IF;
  
  -- Show what pairings should exist
  RAISE NOTICE '';
  RAISE NOTICE '📋 Expected Pairings:';
  RAISE NOTICE 'S03 + S05 → S04 (virtual)';
  RAISE NOTICE 'S07 + S09 → S08 (virtual)';
  RAISE NOTICE 'S11 + S13 → S12 (virtual)';
  RAISE NOTICE 'S15 + S17 → S16 (virtual)';
  RAISE NOTICE 'S19 + S21 → S20 (virtual)';
  RAISE NOTICE 'S23 + S25 → S24 (virtual)';
  RAISE NOTICE 'S27 + S29 → S28 (virtual)';
END;
$$;

-- Step 6: Show current stack distribution
SELECT 
  'Current Stack Distribution' as info,
  yard_id,
  MIN(stack_number) as min_stack,
  MAX(stack_number) as max_stack,
  COUNT(*) as total_stacks,
  COUNT(CASE WHEN stack_number % 2 = 1 THEN 1 END) as odd_stacks,
  COUNT(CASE WHEN stack_number % 2 = 0 THEN 1 END) as even_stacks
FROM stacks 
WHERE is_active = true
GROUP BY yard_id;

-- Step 7: Recommendation
DO $$
DECLARE
  v_pairing_count integer;
  v_stack_count integer;
BEGIN
  SELECT COUNT(*) INTO v_pairing_count FROM stack_pairings WHERE is_active = true;
  SELECT COUNT(*) INTO v_stack_count FROM stacks WHERE is_active = true;
  
  RAISE NOTICE '';
  RAISE NOTICE '💡 RECOMMENDATIONS:';
  RAISE NOTICE '==================';
  
  IF v_pairing_count = 0 AND v_stack_count > 0 THEN
    RAISE NOTICE '1. You have % stacks but no pairings', v_stack_count;
    RAISE NOTICE '2. If you need 40ft container support, create the missing odd stacks';
    RAISE NOTICE '3. Run the pairing creation migration after adding missing stacks';
    RAISE NOTICE '4. If you only use 20ft containers, empty stack_pairings is normal';
  ELSIF v_pairing_count > 0 THEN
    RAISE NOTICE '✅ You have % active pairings - this is correct', v_pairing_count;
  ELSE
    RAISE NOTICE '⚠️  No stacks found - this might indicate a data issue';
  END IF;
END;
$$;