/*
  Automatic Virtual Stack Management - Fixed Version
  
  This migration creates triggers and functions to automatically manage virtual stacks
  based on the container_size configuration of physical stacks.
  
  Logic:
  1. When TWO adjacent odd stacks (e.g., S03, S05) are set to 40ft -> Create virtual stack S04
  2. When either stack is changed back to 20ft -> Deactivate virtual stack S04
  3. Virtual stacks appear/disappear automatically in Yard Live Map
  4. Existing logic remains unchanged
*/

-- ============================================================================
-- FUNCTION: Check and manage virtual stack for a pairing
-- ============================================================================

CREATE OR REPLACE FUNCTION manage_virtual_stack_for_pairing(
  p_yard_id TEXT,
  p_first_stack_number INTEGER,
  p_second_stack_number INTEGER
) RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_first_stack_id UUID;
  v_second_stack_id UUID;
  v_first_stack_40ft BOOLEAN := FALSE;
  v_second_stack_40ft BOOLEAN := FALSE;
  v_virtual_stack_number INTEGER;
  v_virtual_stack_id UUID;
  v_virtual_stack_pair_id UUID;
  v_pairing_id UUID;
  v_both_40ft BOOLEAN;
  v_first_stack RECORD;
BEGIN
  -- Calculate virtual stack number (first_stack + 1)
  v_virtual_stack_number := p_first_stack_number + 1;
  
  -- Get stack information with all needed fields
  SELECT id, (container_size = '40ft' AND is_active = true)
  INTO v_first_stack_id, v_first_stack_40ft
  FROM stacks 
  WHERE yard_id = p_yard_id AND stack_number = p_first_stack_number;
  
  -- Get first stack details separately
  SELECT section_id, rows, max_tiers, row_tier_config, capacity,
         position_x, position_y, position_z, width, length
  INTO v_first_stack
  FROM stacks 
  WHERE yard_id = p_yard_id AND stack_number = p_first_stack_number;
  
  SELECT id, (container_size = '40ft' AND is_active = true)
  INTO v_second_stack_id, v_second_stack_40ft
  FROM stacks 
  WHERE yard_id = p_yard_id AND stack_number = p_second_stack_number;
  
  -- Check if both stacks exist and are configured for 40ft
  v_both_40ft := (v_first_stack_id IS NOT NULL AND v_second_stack_id IS NOT NULL 
                  AND v_first_stack_40ft AND v_second_stack_40ft);
  
  -- Get existing virtual stack and pairing
  SELECT id INTO v_virtual_stack_id
  FROM stacks 
  WHERE yard_id = p_yard_id 
    AND stack_number = v_virtual_stack_number 
    AND is_virtual = true;
  
  SELECT id INTO v_virtual_stack_pair_id
  FROM virtual_stack_pairs
  WHERE yard_id = p_yard_id
    AND stack1_id = v_first_stack_id
    AND stack2_id = v_second_stack_id
    AND is_active = true;
  
  -- Get stack_pairings entry
  SELECT id INTO v_pairing_id
  FROM stack_pairings
  WHERE yard_id = p_yard_id
    AND first_stack_number = p_first_stack_number
    AND second_stack_number = p_second_stack_number;
  
  IF v_both_40ft THEN
    -- Both stacks are 40ft -> Create/activate virtual stack
    
    -- 1. Ensure stack_pairings entry exists
    IF v_pairing_id IS NULL THEN
      INSERT INTO stack_pairings (
        yard_id, first_stack_number, second_stack_number, virtual_stack_number,
        first_stack_id, second_stack_id, is_active
      ) VALUES (
        p_yard_id, p_first_stack_number, p_second_stack_number, v_virtual_stack_number,
        v_first_stack_id, v_second_stack_id, true
      );
      
      RAISE NOTICE '✅ Created stack_pairings entry: S% + S% → S%', 
        LPAD(p_first_stack_number::text, 2, '0'),
        LPAD(p_second_stack_number::text, 2, '0'),
        LPAD(v_virtual_stack_number::text, 2, '0');
    END IF;
    
    -- 2. Create virtual stack if it doesn't exist
    IF v_virtual_stack_id IS NULL THEN
      INSERT INTO stacks (
        yard_id, stack_number, section_id, rows, max_tiers, row_tier_config,
        capacity, current_occupancy, position_x, position_y, position_z,
        width, length, is_virtual, container_size, is_active
      ) VALUES (
        p_yard_id,
        v_virtual_stack_number,
        v_first_stack.section_id,
        v_first_stack.rows,
        v_first_stack.max_tiers,
        v_first_stack.row_tier_config,
        -- Calculate capacity based on row_tier_config
        CASE 
          WHEN v_first_stack.row_tier_config IS NOT NULL AND v_first_stack.row_tier_config != 'null'::jsonb THEN
            (SELECT SUM((config->>'maxTiers')::integer)
             FROM jsonb_array_elements(v_first_stack.row_tier_config) AS config)
          ELSE v_first_stack.rows * v_first_stack.max_tiers
        END,
        0, -- current_occupancy
        COALESCE(v_first_stack.position_x, 0) + 2.5, -- Position between the two stacks
        COALESCE(v_first_stack.position_y, 0),
        COALESCE(v_first_stack.position_z, 0),
        COALESCE(v_first_stack.width, 2.5),
        COALESCE(v_first_stack.length, 12),
        true, -- is_virtual
        '40ft', -- container_size
        true -- is_active
      ) RETURNING id INTO v_virtual_stack_id;
      
      RAISE NOTICE '✅ Created virtual stack S%', LPAD(v_virtual_stack_number::text, 2, '0');
    ELSE
      -- Reactivate existing virtual stack
      UPDATE stacks 
      SET is_active = true, container_size = '40ft', updated_at = NOW()
      WHERE id = v_virtual_stack_id;
      
      RAISE NOTICE '✅ Reactivated virtual stack S%', LPAD(v_virtual_stack_number::text, 2, '0');
    END IF;
    
    -- 3. Create/activate virtual_stack_pairs entry
    IF v_virtual_stack_pair_id IS NULL THEN
      INSERT INTO virtual_stack_pairs (
        yard_id, stack1_id, stack2_id, virtual_stack_number, is_active
      ) VALUES (
        p_yard_id, v_first_stack_id, v_second_stack_id, v_virtual_stack_number, true
      ) RETURNING id INTO v_virtual_stack_pair_id;
      
      RAISE NOTICE '✅ Created virtual_stack_pairs entry';
    ELSE
      -- Reactivate existing pair
      UPDATE virtual_stack_pairs 
      SET is_active = true, updated_at = NOW()
      WHERE id = v_virtual_stack_pair_id;
      
      RAISE NOTICE '✅ Reactivated virtual_stack_pairs entry';
    END IF;
    
    -- 4. Note: Location generation will be handled by the application layer
    RAISE NOTICE '📍 Virtual stack S% ready - locations will be generated by application', 
      LPAD(v_virtual_stack_number::text, 2, '0');
    
  ELSE
    -- At least one stack is not 40ft -> Deactivate virtual stack
    
    -- 1. Deactivate virtual stack
    IF v_virtual_stack_id IS NOT NULL THEN
      UPDATE stacks 
      SET is_active = false, updated_at = NOW()
      WHERE id = v_virtual_stack_id;
      
      RAISE NOTICE '❌ Deactivated virtual stack S%', LPAD(v_virtual_stack_number::text, 2, '0');
    END IF;
    
    -- 2. Deactivate virtual_stack_pairs entry
    IF v_virtual_stack_pair_id IS NOT NULL THEN
      UPDATE virtual_stack_pairs 
      SET is_active = false, updated_at = NOW()
      WHERE id = v_virtual_stack_pair_id;
      
      RAISE NOTICE '❌ Deactivated virtual_stack_pairs entry';
    END IF;
    
    -- 3. Deactivate locations for virtual stack
    UPDATE locations 
    SET is_active = false, updated_at = NOW()
    WHERE stack_id = v_virtual_stack_id AND is_virtual = true;
    
  END IF;
END;
$$;

-- ============================================================================
-- FUNCTION: Handle stack updates
-- ============================================================================

CREATE OR REPLACE FUNCTION handle_stack_container_size_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_stack_number INTEGER;
  v_yard_id TEXT;
  v_first_stack INTEGER;
  v_second_stack INTEGER;
BEGIN
  -- Get stack info
  v_stack_number := COALESCE(NEW.stack_number, OLD.stack_number);
  v_yard_id := COALESCE(NEW.yard_id, OLD.yard_id);
  
  -- Only process odd-numbered stacks (potential first stacks in pairings)
  IF v_stack_number % 2 = 1 THEN
    -- This is a first stack (odd), check pairing with next odd stack
    v_first_stack := v_stack_number;
    v_second_stack := v_stack_number + 2;
    
    PERFORM manage_virtual_stack_for_pairing(v_yard_id, v_first_stack, v_second_stack);
  END IF;
  
  -- Also check if this stack is a second stack in a pairing
  IF v_stack_number % 2 = 1 AND v_stack_number > 2 THEN
    -- This could be a second stack, check pairing with previous odd stack
    v_first_stack := v_stack_number - 2;
    v_second_stack := v_stack_number;
    
    PERFORM manage_virtual_stack_for_pairing(v_yard_id, v_first_stack, v_second_stack);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ============================================================================
-- CREATE TRIGGERS
-- ============================================================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_manage_virtual_stacks ON stacks;

-- Create trigger for stack updates
CREATE TRIGGER trigger_manage_virtual_stacks
  AFTER INSERT OR UPDATE OF container_size, is_active
  ON stacks
  FOR EACH ROW
  EXECUTE FUNCTION handle_stack_container_size_change();

-- ============================================================================
-- INITIAL SYNC: Process existing stacks
-- ============================================================================

DO $$
DECLARE
  rec RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🔄 INITIAL SYNC: Processing existing stacks...';
  RAISE NOTICE '===============================================';
  
  -- Process all potential pairings based on existing stacks
  FOR rec IN 
    SELECT DISTINCT 
      s1.yard_id,
      s1.stack_number as first_stack,
      s1.stack_number + 2 as second_stack
    FROM stacks s1
    JOIN stacks s2 ON (
      s1.yard_id = s2.yard_id 
      AND s2.stack_number = s1.stack_number + 2
    )
    WHERE s1.stack_number % 2 = 1  -- Odd numbers only
      AND s1.is_active = true
      AND s2.is_active = true
    ORDER BY s1.yard_id, s1.stack_number
  LOOP
    RAISE NOTICE 'Processing potential pairing: S% + S%', 
      LPAD(rec.first_stack::text, 2, '0'),
      LPAD(rec.second_stack::text, 2, '0');
      
    PERFORM manage_virtual_stack_for_pairing(
      rec.yard_id, 
      rec.first_stack, 
      rec.second_stack
    );
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Initial sync completed';
END;
$$;

-- ============================================================================
-- VERIFICATION AND SUMMARY
-- ============================================================================

-- Show created virtual stacks
SELECT 
  '=== VIRTUAL STACKS CREATED ===' as section,
  yard_id,
  stack_number,
  container_size,
  is_virtual,
  is_active,
  capacity
FROM stacks 
WHERE is_virtual = true AND is_active = true
ORDER BY yard_id, stack_number;

-- Show active virtual pairs
SELECT 
  '=== ACTIVE VIRTUAL PAIRS ===' as section,
  vsp.yard_id,
  CONCAT('S', LPAD(s1.stack_number::text, 2, '0')) as first_stack,
  CONCAT('S', LPAD(s2.stack_number::text, 2, '0')) as second_stack,
  CONCAT('S', LPAD(vsp.virtual_stack_number::text, 2, '0')) as virtual_stack,
  vsp.is_active
FROM virtual_stack_pairs vsp
JOIN stacks s1 ON vsp.stack1_id = s1.id
JOIN stacks s2 ON vsp.stack2_id = s2.id
WHERE vsp.is_active = true
ORDER BY vsp.yard_id, vsp.virtual_stack_number;

-- Final summary
DO $$
DECLARE
  v_virtual_stacks INTEGER;
  v_virtual_pairs INTEGER;
  v_stack_pairings INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_virtual_stacks 
  FROM stacks WHERE is_virtual = true AND is_active = true;
  
  SELECT COUNT(*) INTO v_virtual_pairs 
  FROM virtual_stack_pairs WHERE is_active = true;
  
  SELECT COUNT(*) INTO v_stack_pairings 
  FROM stack_pairings WHERE is_active = true;
  
  RAISE NOTICE '';
  RAISE NOTICE '🎯 AUTOMATIC VIRTUAL STACK MANAGEMENT SUMMARY:';
  RAISE NOTICE '==============================================';
  RAISE NOTICE '✅ Triggers created for automatic management';
  RAISE NOTICE '✅ Active virtual stacks: %', v_virtual_stacks;
  RAISE NOTICE '✅ Active virtual pairs: %', v_virtual_pairs;
  RAISE NOTICE '✅ Stack pairings configured: %', v_stack_pairings;
  RAISE NOTICE '';
  RAISE NOTICE '🚀 SYSTEM READY:';
  RAISE NOTICE '- Change any two adjacent odd stacks to 40ft → Virtual stack appears';
  RAISE NOTICE '- Change either stack back to 20ft → Virtual stack disappears';
  RAISE NOTICE '- Virtual stacks will show/hide automatically in Yard Live Map';
  RAISE NOTICE '- Location generation handled by application layer';
  RAISE NOTICE '- Existing logic remains unchanged';
END;
$$;

-- ============================================================================
-- COMMENTS AND DOCUMENTATION
-- ============================================================================

COMMENT ON FUNCTION manage_virtual_stack_for_pairing(TEXT, INTEGER, INTEGER) IS 
'Automatically creates or deactivates virtual stacks based on the container_size of paired physical stacks';

COMMENT ON FUNCTION handle_stack_container_size_change() IS 
'Trigger function that responds to stack container_size changes and manages virtual stacks automatically';

COMMENT ON TRIGGER trigger_manage_virtual_stacks ON stacks IS 
'Automatically manages virtual stacks when physical stack container_size changes';