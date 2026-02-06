-- Create Missing Virtual Stacks for Stack Pairings
-- This script creates virtual stacks (like S04) for existing pairings (S03+S05)

-- Step 1: Identify missing virtual stacks
WITH missing_virtual_stacks AS (
  SELECT 
    sp.yard_id,
    sp.virtual_stack_number,
    sp.id as pairing_id,
    sp.first_stack_number,
    sp.second_stack_number,
    -- Get properties from the first physical stack as template
    s1.section_id,
    s1.rows,
    s1.max_tiers,
    s1.row_tier_config,
    s1.position_x + 2.5 as virtual_position_x,  -- Position between the two stacks
    s1.position_y,
    s1.position_z,
    s1.width,
    s1.length
  FROM stack_pairings sp
  JOIN stacks s1 ON sp.first_stack_id = s1.id
  LEFT JOIN stacks vs ON (
    sp.yard_id = vs.yard_id 
    AND sp.virtual_stack_number = vs.stack_number 
    AND vs.is_virtual = true
  )
  WHERE sp.is_active = true
    AND vs.id IS NULL  -- Virtual stack doesn't exist
)
SELECT 
  '=== MISSING VIRTUAL STACKS ===' as section,
  yard_id,
  virtual_stack_number,
  CONCAT('S', LPAD(first_stack_number::text, 2, '0'), ' + S', LPAD(second_stack_number::text, 2, '0'), ' → S', LPAD(virtual_stack_number::text, 2, '0')) as pairing_description
FROM missing_virtual_stacks
ORDER BY yard_id, virtual_stack_number;

-- Step 2: Create the missing virtual stacks
DO $$
DECLARE
  v_created_count integer := 0;
  rec RECORD;
  v_new_stack_id uuid;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🏗️  CREATING MISSING VIRTUAL STACKS';
  RAISE NOTICE '==================================';
  
  -- Create each missing virtual stack
  FOR rec IN 
    WITH missing_virtual_stacks AS (
      SELECT 
        sp.yard_id,
        sp.virtual_stack_number,
        sp.id as pairing_id,
        sp.first_stack_number,
        sp.second_stack_number,
        -- Get properties from the first physical stack as template
        s1.section_id,
        s1.rows,
        s1.max_tiers,
        s1.row_tier_config,
        s1.position_x + 2.5 as virtual_position_x,  -- Position between the two stacks
        s1.position_y,
        s1.position_z,
        s1.width,
        s1.length
      FROM stack_pairings sp
      JOIN stacks s1 ON sp.first_stack_id = s1.id
      LEFT JOIN stacks vs ON (
        sp.yard_id = vs.yard_id 
        AND sp.virtual_stack_number = vs.stack_number 
        AND vs.is_virtual = true
      )
      WHERE sp.is_active = true
        AND vs.id IS NULL  -- Virtual stack doesn't exist
    )
    SELECT * FROM missing_virtual_stacks
    ORDER BY yard_id, virtual_stack_number
  LOOP
    BEGIN
      -- Insert the virtual stack
      INSERT INTO stacks (
        yard_id,
        stack_number,
        section_id,
        rows,
        max_tiers,
        row_tier_config,
        capacity,
        current_occupancy,
        position_x,
        position_y,
        position_z,
        width,
        length,
        is_virtual,
        container_size,
        is_active,
        created_at,
        updated_at
      ) VALUES (
        rec.yard_id,
        rec.virtual_stack_number,
        rec.section_id,
        rec.rows,
        rec.max_tiers,
        rec.row_tier_config,
        -- Calculate capacity based on row_tier_config or default
        CASE 
          WHEN rec.row_tier_config IS NOT NULL AND rec.row_tier_config != 'null'::jsonb THEN
            (
              SELECT SUM((config->>'maxTiers')::integer)
              FROM jsonb_array_elements(rec.row_tier_config) AS config
            )
          ELSE rec.rows * rec.max_tiers
        END,
        0, -- current_occupancy starts at 0
        rec.virtual_position_x,
        rec.position_y,
        rec.position_z,
        rec.width,
        rec.length,
        true, -- is_virtual = true
        '40ft', -- container_size for virtual stacks
        true, -- is_active
        NOW(),
        NOW()
      ) RETURNING id INTO v_new_stack_id;
      
      v_created_count := v_created_count + 1;
      
      RAISE NOTICE '✅ Created virtual stack S% (ID: %)', 
        LPAD(rec.virtual_stack_number::text, 2, '0'),
        v_new_stack_id;
        
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '❌ Failed to create virtual stack S%: %', 
        LPAD(rec.virtual_stack_number::text, 2, '0'),
        SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '📊 VIRTUAL STACK CREATION SUMMARY:';
  RAISE NOTICE 'Successfully created: % virtual stack(s)', v_created_count;
  
  IF v_created_count > 0 THEN
    RAISE NOTICE '🎉 Virtual stacks created successfully!';
    RAISE NOTICE '';
    RAISE NOTICE '📝 NEXT STEPS:';
    RAISE NOTICE '1. Virtual stacks can now be used for 40ft container assignments';
    RAISE NOTICE '2. Location IDs will be generated for virtual stacks (e.g., S04R1H1)';
    RAISE NOTICE '3. 40ft containers should be assigned to virtual stack locations';
  ELSE
    RAISE NOTICE 'ℹ️  No virtual stacks needed to be created';
  END IF;
END;
$$;

-- Step 3: Verify the created virtual stacks
SELECT 
  '=== CREATED VIRTUAL STACKS ===' as section,
  s.yard_id,
  s.stack_number,
  s.container_size,
  s.is_virtual,
  s.capacity,
  s.is_active,
  CONCAT('S', LPAD(s.stack_number::text, 2, '0'), ' (Virtual)') as stack_description
FROM stacks s
WHERE s.is_virtual = true
  AND s.created_at >= NOW() - INTERVAL '1 hour'  -- Recently created
ORDER BY s.yard_id, s.stack_number;

-- Step 4: Show complete pairing configuration
SELECT 
  '=== COMPLETE PAIRING CONFIGURATION ===' as section,
  sp.yard_id,
  CONCAT('S', LPAD(sp.first_stack_number::text, 2, '0')) as first_stack,
  CONCAT('S', LPAD(sp.second_stack_number::text, 2, '0')) as second_stack,
  CONCAT('S', LPAD(sp.virtual_stack_number::text, 2, '0')) as virtual_stack,
  CASE 
    WHEN vs.id IS NOT NULL THEN '✅ Virtual stack exists'
    ELSE '❌ Virtual stack missing'
  END as virtual_stack_status,
  sp.is_active as pairing_active
FROM stack_pairings sp
LEFT JOIN stacks vs ON (
  sp.yard_id = vs.yard_id 
  AND sp.virtual_stack_number = vs.stack_number 
  AND vs.is_virtual = true
)
WHERE sp.is_active = true
ORDER BY sp.yard_id, sp.first_stack_number;

-- Step 5: Final configuration summary
DO $$
DECLARE
  v_total_pairings integer;
  v_complete_pairings integer;
  v_virtual_stacks integer;
BEGIN
  SELECT COUNT(*) INTO v_total_pairings 
  FROM stack_pairings 
  WHERE is_active = true;
  
  SELECT COUNT(*) INTO v_complete_pairings
  FROM stack_pairings sp
  JOIN stacks vs ON (
    sp.yard_id = vs.yard_id 
    AND sp.virtual_stack_number = vs.stack_number 
    AND vs.is_virtual = true
  )
  WHERE sp.is_active = true;
  
  SELECT COUNT(*) INTO v_virtual_stacks
  FROM stacks 
  WHERE is_virtual = true AND is_active = true;
  
  RAISE NOTICE '';
  RAISE NOTICE '🎯 FINAL CONFIGURATION STATUS:';
  RAISE NOTICE '=============================';
  RAISE NOTICE 'Total active pairings: %', v_total_pairings;
  RAISE NOTICE 'Complete pairings (with virtual stacks): %', v_complete_pairings;
  RAISE NOTICE 'Total virtual stacks: %', v_virtual_stacks;
  
  IF v_complete_pairings = v_total_pairings AND v_total_pairings > 0 THEN
    RAISE NOTICE '✅ Perfect! All pairings have their virtual stacks';
    RAISE NOTICE '🚀 Your 40ft container system is ready to use';
  ELSIF v_total_pairings = 0 THEN
    RAISE NOTICE '⚠️  No pairings found - run the pairing creation script first';
  ELSE
    RAISE NOTICE '⚠️  % pairing(s) still missing virtual stacks', v_total_pairings - v_complete_pairings;
  END IF;
END;
$$;