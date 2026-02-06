-- Diagnose and Fix Stack Pairings Issue
-- This script will check why stack_pairings is empty and create the missing pairings

-- Step 1: Current status check
SELECT 
  '=== CURRENT STATUS ===' as section,
  'Stack Pairings Count' as metric,
  COUNT(*) as value
FROM stack_pairings;

SELECT 
  '=== CURRENT STATUS ===' as section,
  'Active Stacks Count' as metric,
  COUNT(*) as value
FROM stacks 
WHERE is_active = true;

-- Step 2: Check specific stacks S03 and S05
SELECT 
  '=== STACK S03 & S05 ANALYSIS ===' as section,
  stack_number,
  id,
  yard_id,
  container_size,
  is_active,
  CASE 
    WHEN container_size = '40ft' AND is_active = true THEN '✅ Ready for pairing'
    WHEN container_size != '40ft' THEN '❌ Not 40ft'
    WHEN is_active = false THEN '❌ Inactive'
    ELSE '❓ Unknown issue'
  END as pairing_status
FROM stacks 
WHERE stack_number IN (3, 5)
ORDER BY stack_number;

-- Step 3: Check all 40ft stacks that could be paired
WITH ft40_stacks AS (
  SELECT 
    yard_id,
    stack_number,
    id,
    is_active
  FROM stacks 
  WHERE container_size = '40ft' 
    AND is_active = true
  ORDER BY yard_id, stack_number
)
SELECT 
  '=== ALL 40FT STACKS ===' as section,
  yard_id,
  STRING_AGG(stack_number::text, ',' ORDER BY stack_number) as ft40_stack_numbers,
  COUNT(*) as ft40_stack_count
FROM ft40_stacks
GROUP BY yard_id;

-- Step 4: Identify potential pairings based on existing 40ft stacks
WITH potential_pairings AS (
  SELECT 
    s1.yard_id,
    s1.stack_number as first_stack,
    s2.stack_number as second_stack,
    s1.stack_number + 1 as virtual_stack,
    s1.id as first_stack_id,
    s2.id as second_stack_id,
    CONCAT('S', LPAD(s1.stack_number::text, 2, '0'), ' + S', LPAD(s2.stack_number::text, 2, '0'), ' → S', LPAD((s1.stack_number + 1)::text, 2, '0')) as pairing_description
  FROM stacks s1
  JOIN stacks s2 ON s1.yard_id = s2.yard_id
  WHERE s1.stack_number % 2 = 1  -- First stack is odd
    AND s2.stack_number = s1.stack_number + 2  -- Second stack is first + 2
    AND s1.container_size = '40ft'
    AND s2.container_size = '40ft'
    AND s1.is_active = true
    AND s2.is_active = true
)
SELECT 
  '=== POTENTIAL PAIRINGS ===' as section,
  yard_id,
  first_stack,
  second_stack,
  virtual_stack,
  pairing_description,
  '✅ Can be paired' as status
FROM potential_pairings
ORDER BY yard_id, first_stack;

-- Step 5: Check if pairings already exist for these combinations
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
  WHERE s1.stack_number % 2 = 1
    AND s2.stack_number = s1.stack_number + 2
    AND s1.container_size = '40ft'
    AND s2.container_size = '40ft'
    AND s1.is_active = true
    AND s2.is_active = true
)
SELECT 
  '=== PAIRING EXISTENCE CHECK ===' as section,
  pp.yard_id,
  pp.first_stack,
  pp.second_stack,
  pp.virtual_stack,
  CASE 
    WHEN sp.id IS NOT NULL THEN '✅ Pairing exists'
    ELSE '❌ Pairing missing'
  END as pairing_status,
  sp.is_active as pairing_active
FROM potential_pairings pp
LEFT JOIN stack_pairings sp ON (
  pp.yard_id = sp.yard_id 
  AND pp.first_stack = sp.first_stack_number 
  AND pp.second_stack = sp.second_stack_number
)
ORDER BY pp.yard_id, pp.first_stack;

-- Step 6: Create missing pairings
DO $$
DECLARE
  v_yard_id text;
  v_first_stack_id uuid;
  v_second_stack_id uuid;
  v_pairing_count integer := 0;
  v_created_count integer := 0;
  rec RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🔧 CREATING MISSING STACK PAIRINGS';
  RAISE NOTICE '==================================';
  
  -- Find all potential pairings that don't exist yet
  FOR rec IN 
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
      WHERE s1.stack_number % 2 = 1
        AND s2.stack_number = s1.stack_number + 2
        AND s1.container_size = '40ft'
        AND s2.container_size = '40ft'
        AND s1.is_active = true
        AND s2.is_active = true
    )
    SELECT 
      pp.yard_id,
      pp.first_stack,
      pp.second_stack,
      pp.virtual_stack,
      pp.first_stack_id,
      pp.second_stack_id
    FROM potential_pairings pp
    LEFT JOIN stack_pairings sp ON (
      pp.yard_id = sp.yard_id 
      AND pp.first_stack = sp.first_stack_number 
      AND pp.second_stack = sp.second_stack_number
    )
    WHERE sp.id IS NULL  -- Only missing pairings
    ORDER BY pp.yard_id, pp.first_stack
  LOOP
    v_pairing_count := v_pairing_count + 1;
    
    BEGIN
      -- Insert the pairing
      INSERT INTO stack_pairings (
        yard_id, 
        first_stack_number, 
        second_stack_number, 
        virtual_stack_number, 
        first_stack_id, 
        second_stack_id,
        is_active
      ) VALUES (
        rec.yard_id,
        rec.first_stack,
        rec.second_stack,
        rec.virtual_stack,
        rec.first_stack_id,
        rec.second_stack_id,
        true
      );
      
      v_created_count := v_created_count + 1;
      
      RAISE NOTICE '✅ Created pairing: S% + S% → S% (virtual)', 
        LPAD(rec.first_stack::text, 2, '0'),
        LPAD(rec.second_stack::text, 2, '0'),
        LPAD(rec.virtual_stack::text, 2, '0');
        
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '❌ Failed to create pairing S% + S%: %', 
        LPAD(rec.first_stack::text, 2, '0'),
        LPAD(rec.second_stack::text, 2, '0'),
        SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '📊 SUMMARY:';
  RAISE NOTICE 'Potential pairings found: %', v_pairing_count;
  RAISE NOTICE 'Successfully created: %', v_created_count;
  
  IF v_created_count = 0 AND v_pairing_count = 0 THEN
    RAISE NOTICE '⚠️  No pairings needed to be created';
    RAISE NOTICE 'This could mean:';
    RAISE NOTICE '- Pairings already exist';
    RAISE NOTICE '- No valid 40ft stack pairs found';
    RAISE NOTICE '- Stacks are not properly configured';
  ELSIF v_created_count > 0 THEN
    RAISE NOTICE '🎉 Successfully created % new pairing(s)!', v_created_count;
  END IF;
END;
$$;

-- Step 7: Verify the results
SELECT 
  '=== FINAL VERIFICATION ===' as section,
  'Total Stack Pairings' as metric,
  COUNT(*) as value
FROM stack_pairings;

SELECT 
  '=== FINAL VERIFICATION ===' as section,
  'Active Stack Pairings' as metric,
  COUNT(*) as value
FROM stack_pairings 
WHERE is_active = true;

-- Step 8: Show all created pairings
SELECT 
  '=== CREATED PAIRINGS ===' as section,
  yard_id,
  CONCAT('S', LPAD(first_stack_number::text, 2, '0'), ' + S', LPAD(second_stack_number::text, 2, '0'), ' → S', LPAD(virtual_stack_number::text, 2, '0')) as pairing_description,
  is_active,
  created_at
FROM stack_pairings
ORDER BY yard_id, first_stack_number;

-- Step 9: Check if virtual stacks need to be created
WITH missing_virtual_stacks AS (
  SELECT 
    sp.yard_id,
    sp.virtual_stack_number,
    sp.id as pairing_id
  FROM stack_pairings sp
  LEFT JOIN stacks s ON (
    sp.yard_id = s.yard_id 
    AND sp.virtual_stack_number = s.stack_number 
    AND s.is_virtual = true
  )
  WHERE sp.is_active = true
    AND s.id IS NULL  -- Virtual stack doesn't exist
)
SELECT 
  '=== MISSING VIRTUAL STACKS ===' as section,
  yard_id,
  virtual_stack_number,
  CONCAT('Virtual stack S', LPAD(virtual_stack_number::text, 2, '0'), ' needs to be created') as action_needed
FROM missing_virtual_stacks
ORDER BY yard_id, virtual_stack_number;

-- Final recommendations
DO $$
DECLARE
  v_pairings integer;
  v_missing_virtual integer;
BEGIN
  SELECT COUNT(*) INTO v_pairings FROM stack_pairings WHERE is_active = true;
  
  SELECT COUNT(*) INTO v_missing_virtual
  FROM stack_pairings sp
  LEFT JOIN stacks s ON (
    sp.yard_id = s.yard_id 
    AND sp.virtual_stack_number = s.stack_number 
    AND s.is_virtual = true
  )
  WHERE sp.is_active = true AND s.id IS NULL;
  
  RAISE NOTICE '';
  RAISE NOTICE '💡 NEXT STEPS:';
  RAISE NOTICE '=============';
  
  IF v_pairings > 0 THEN
    RAISE NOTICE '✅ You now have % active stack pairing(s)', v_pairings;
    
    IF v_missing_virtual > 0 THEN
      RAISE NOTICE '⚠️  % virtual stack(s) need to be created in the stacks table', v_missing_virtual;
      RAISE NOTICE '   These virtual stacks represent the 40ft container positions';
      RAISE NOTICE '   Run a migration to create virtual stacks for the pairings';
    ELSE
      RAISE NOTICE '✅ All virtual stacks exist - configuration is complete';
    END IF;
  ELSE
    RAISE NOTICE '❌ No pairings were created - check your stack configuration';
  END IF;
END;
$$;