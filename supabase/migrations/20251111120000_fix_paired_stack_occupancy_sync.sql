/*
  # Fix Paired Stack Occupancy Synchronization
  
  Problem: When a 40ft container is assigned to a virtual stack (e.g., S24),
  only one physical stack (S23) gets its occupancy updated, while the paired
  stack (S25) remains at 0. All three stacks (S23, S24, S25) should show the
  same occupancy.
  
  Solution: Update the trigger to sync occupancy across all paired stacks.
*/

-- ============================================================================
-- Drop existing trigger and recreate with proper pairing logic
-- ============================================================================

DROP TRIGGER IF EXISTS containers_update_stack_occupancy ON containers;

-- ============================================================================
-- Updated trigger function with paired stack synchronization
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_update_stack_occupancy()
RETURNS TRIGGER AS $$
DECLARE
  v_old_stack_num INTEGER;
  v_new_stack_num INTEGER;
  v_yard_id TEXT;
  v_pairing RECORD;
BEGIN
  -- Extract stack numbers from locations
  IF TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN
    IF OLD.location IS NOT NULL AND OLD.location ~ '^S\d+' THEN
      v_old_stack_num := substring(OLD.location from 'S(\d+)')::INTEGER;
      v_yard_id := OLD.yard_id;
    END IF;
  END IF;
  
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF NEW.location IS NOT NULL AND NEW.location ~ '^S\d+' THEN
      v_new_stack_num := substring(NEW.location from 'S(\d+)')::INTEGER;
      v_yard_id := NEW.yard_id;
    END IF;
  END IF;
  
  -- Update old stack occupancy (and its paired stacks if applicable)
  IF v_old_stack_num IS NOT NULL THEN
    -- Update the stack itself
    UPDATE stacks
    SET 
      current_occupancy = (
        SELECT COUNT(*)
        FROM containers
        WHERE yard_id = stacks.yard_id
          AND location ~ ('^S' || LPAD(stacks.stack_number::TEXT, 2, '0') || '-R\d+-H\d+$')
          AND status IN ('in_depot', 'gate_in')
      ),
      updated_at = now()
    WHERE stack_number = v_old_stack_num
      AND yard_id = v_yard_id;
    
    -- Check if this stack is part of a pairing
    SELECT * INTO v_pairing
    FROM stack_pairings
    WHERE yard_id = v_yard_id
      AND (first_stack_number = v_old_stack_num 
           OR second_stack_number = v_old_stack_num 
           OR virtual_stack_number = v_old_stack_num)
      AND is_active = true
    LIMIT 1;
    
    IF FOUND THEN
      -- Update all stacks in the pairing (first, second, and virtual)
      UPDATE stacks
      SET 
        current_occupancy = (
          SELECT COUNT(*)
          FROM containers
          WHERE yard_id = v_yard_id
            AND (
              location ~ ('^S' || LPAD(v_pairing.first_stack_number::TEXT, 2, '0') || '-R\d+-H\d+$')
              OR location ~ ('^S' || LPAD(v_pairing.second_stack_number::TEXT, 2, '0') || '-R\d+-H\d+$')
              OR location ~ ('^S' || LPAD(v_pairing.virtual_stack_number::TEXT, 2, '0') || '-R\d+-H\d+$')
            )
            AND status IN ('in_depot', 'gate_in')
        ),
        updated_at = now()
      WHERE yard_id = v_yard_id
        AND stack_number IN (
          v_pairing.first_stack_number,
          v_pairing.second_stack_number,
          v_pairing.virtual_stack_number
        );
    END IF;
  END IF;
  
  -- Update new stack occupancy (and its paired stacks if applicable)
  IF v_new_stack_num IS NOT NULL AND v_new_stack_num != v_old_stack_num THEN
    -- Update the stack itself
    UPDATE stacks
    SET 
      current_occupancy = (
        SELECT COUNT(*)
        FROM containers
        WHERE yard_id = stacks.yard_id
          AND location ~ ('^S' || LPAD(stacks.stack_number::TEXT, 2, '0') || '-R\d+-H\d+$')
          AND status IN ('in_depot', 'gate_in')
      ),
      updated_at = now()
    WHERE stack_number = v_new_stack_num
      AND yard_id = v_yard_id;
    
    -- Check if this stack is part of a pairing
    SELECT * INTO v_pairing
    FROM stack_pairings
    WHERE yard_id = v_yard_id
      AND (first_stack_number = v_new_stack_num 
           OR second_stack_number = v_new_stack_num 
           OR virtual_stack_number = v_new_stack_num)
      AND is_active = true
    LIMIT 1;
    
    IF FOUND THEN
      -- Update all stacks in the pairing (first, second, and virtual)
      UPDATE stacks
      SET 
        current_occupancy = (
          SELECT COUNT(*)
          FROM containers
          WHERE yard_id = v_yard_id
            AND (
              location ~ ('^S' || LPAD(v_pairing.first_stack_number::TEXT, 2, '0') || '-R\d+-H\d+$')
              OR location ~ ('^S' || LPAD(v_pairing.second_stack_number::TEXT, 2, '0') || '-R\d+-H\d+$')
              OR location ~ ('^S' || LPAD(v_pairing.virtual_stack_number::TEXT, 2, '0') || '-R\d+-H\d+$')
            )
            AND status IN ('in_depot', 'gate_in')
        ),
        updated_at = now()
      WHERE yard_id = v_yard_id
        AND stack_number IN (
          v_pairing.first_stack_number,
          v_pairing.second_stack_number,
          v_pairing.virtual_stack_number
        );
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
CREATE TRIGGER containers_update_stack_occupancy
  AFTER INSERT OR UPDATE OR DELETE ON containers
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_stack_occupancy();

-- ============================================================================
-- Fix existing occupancy data
-- ============================================================================

DO $$
DECLARE
  v_pairing RECORD;
  v_total_count INTEGER;
BEGIN
  -- For each active pairing, sync the occupancy across all three stacks
  FOR v_pairing IN 
    SELECT * FROM stack_pairings WHERE is_active = true
  LOOP
    -- Count all containers in any of the three stack locations
    SELECT COUNT(*) INTO v_total_count
    FROM containers
    WHERE yard_id = v_pairing.yard_id
      AND (
        location ~ ('^S' || LPAD(v_pairing.first_stack_number::TEXT, 2, '0') || '-R\d+-H\d+$')
        OR location ~ ('^S' || LPAD(v_pairing.second_stack_number::TEXT, 2, '0') || '-R\d+-H\d+$')
        OR location ~ ('^S' || LPAD(v_pairing.virtual_stack_number::TEXT, 2, '0') || '-R\d+-H\d+$')
      )
      AND status IN ('in_depot', 'gate_in');
    
    -- Update all three stacks with the same count
    UPDATE stacks
    SET 
      current_occupancy = v_total_count,
      updated_at = now()
    WHERE yard_id = v_pairing.yard_id
      AND stack_number IN (
        v_pairing.first_stack_number,
        v_pairing.second_stack_number,
        v_pairing.virtual_stack_number
      );
    
    RAISE NOTICE 'Synced occupancy for stacks S%, S%, S%: % containers',
      v_pairing.first_stack_number,
      v_pairing.second_stack_number,
      v_pairing.virtual_stack_number,
      v_total_count;
  END LOOP;
END $$;

-- ============================================================================
-- Summary
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Paired Stack Occupancy Sync Fixed';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'All paired stacks (S23, S24, S25) now show the same occupancy';
  RAISE NOTICE 'Trigger updated to maintain sync automatically';
  RAISE NOTICE '========================================';
END $$;
