/*
  # Fix Location Pattern Matching and Row Configuration Validation
  
  Issues:
  1. Trigger uses wrong location pattern (S24-R6-H4) but containers use (S24R6H4)
  2. When row config changes, existing containers in removed rows cause issues
  
  Solutions:
  1. Fix regex pattern to match both formats: S24R6H4 and S24-R6-H4
  2. Add validation to prevent row reduction when containers exist in those rows
  3. Add function to check if row reduction is safe
*/

-- ============================================================================
-- Fix the trigger to match both location formats
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
    -- Update the stack itself - match both S24R6H4 and S24-R6-H4 formats
    UPDATE stacks
    SET 
      current_occupancy = (
        SELECT COUNT(*)
        FROM containers
        WHERE yard_id = stacks.yard_id
          AND (
            location ~ ('^S' || LPAD(stacks.stack_number::TEXT, 2, '0') || 'R\d+H\d+$')
            OR location ~ ('^S' || LPAD(stacks.stack_number::TEXT, 2, '0') || '-R\d+-H\d+$')
          )
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
      -- Count containers from ALL three stack locations (both formats)
      DECLARE
        v_total_count INTEGER;
      BEGIN
        SELECT COUNT(*) INTO v_total_count
        FROM containers
        WHERE yard_id = v_yard_id
          AND (
            location ~ ('^S' || LPAD(v_pairing.first_stack_number::TEXT, 2, '0') || 'R\d+H\d+$')
            OR location ~ ('^S' || LPAD(v_pairing.first_stack_number::TEXT, 2, '0') || '-R\d+-H\d+$')
            OR location ~ ('^S' || LPAD(v_pairing.second_stack_number::TEXT, 2, '0') || 'R\d+H\d+$')
            OR location ~ ('^S' || LPAD(v_pairing.second_stack_number::TEXT, 2, '0') || '-R\d+-H\d+$')
            OR location ~ ('^S' || LPAD(v_pairing.virtual_stack_number::TEXT, 2, '0') || 'R\d+H\d+$')
            OR location ~ ('^S' || LPAD(v_pairing.virtual_stack_number::TEXT, 2, '0') || '-R\d+-H\d+$')
          )
          AND status IN ('in_depot', 'gate_in');
        
        -- Update all three stacks with the same count
        UPDATE stacks
        SET 
          current_occupancy = v_total_count,
          updated_at = now()
        WHERE yard_id = v_yard_id
          AND stack_number IN (
            v_pairing.first_stack_number,
            v_pairing.second_stack_number,
            v_pairing.virtual_stack_number
          );
      END;
    END IF;
  END IF;
  
  -- Update new stack occupancy (and its paired stacks if applicable)
  IF v_new_stack_num IS NOT NULL AND v_new_stack_num != v_old_stack_num THEN
    -- Update the stack itself - match both formats
    UPDATE stacks
    SET 
      current_occupancy = (
        SELECT COUNT(*)
        FROM containers
        WHERE yard_id = stacks.yard_id
          AND (
            location ~ ('^S' || LPAD(stacks.stack_number::TEXT, 2, '0') || 'R\d+H\d+$')
            OR location ~ ('^S' || LPAD(stacks.stack_number::TEXT, 2, '0') || '-R\d+-H\d+$')
          )
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
      -- Count containers from ALL three stack locations (both formats)
      DECLARE
        v_total_count INTEGER;
      BEGIN
        SELECT COUNT(*) INTO v_total_count
        FROM containers
        WHERE yard_id = v_yard_id
          AND (
            location ~ ('^S' || LPAD(v_pairing.first_stack_number::TEXT, 2, '0') || 'R\d+H\d+$')
            OR location ~ ('^S' || LPAD(v_pairing.first_stack_number::TEXT, 2, '0') || '-R\d+-H\d+$')
            OR location ~ ('^S' || LPAD(v_pairing.second_stack_number::TEXT, 2, '0') || 'R\d+H\d+$')
            OR location ~ ('^S' || LPAD(v_pairing.second_stack_number::TEXT, 2, '0') || '-R\d+-H\d+$')
            OR location ~ ('^S' || LPAD(v_pairing.virtual_stack_number::TEXT, 2, '0') || 'R\d+H\d+$')
            OR location ~ ('^S' || LPAD(v_pairing.virtual_stack_number::TEXT, 2, '0') || '-R\d+-H\d+$')
          )
          AND status IN ('in_depot', 'gate_in');
        
        -- Update all three stacks with the same count
        UPDATE stacks
        SET 
          current_occupancy = v_total_count,
          updated_at = now()
        WHERE yard_id = v_yard_id
          AND stack_number IN (
            v_pairing.first_stack_number,
            v_pairing.second_stack_number,
            v_pairing.virtual_stack_number
          );
      END;
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Function to check if row reduction is safe
-- ============================================================================

CREATE OR REPLACE FUNCTION check_row_reduction_safety(
  p_stack_id UUID,
  p_new_row_count INTEGER
)
RETURNS TABLE(is_safe BOOLEAN, affected_containers INTEGER, max_row_in_use INTEGER) AS $$
DECLARE
  v_stack RECORD;
  v_affected_count INTEGER;
  v_max_row INTEGER;
BEGIN
  -- Get stack details
  SELECT * INTO v_stack FROM stacks WHERE id = p_stack_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0, 0;
    RETURN;
  END IF;
  
  -- Find containers in rows that would be removed
  SELECT COUNT(*), MAX(
    CASE 
      WHEN location ~ 'R(\d+)' THEN substring(location from 'R(\d+)')::INTEGER
      ELSE 0
    END
  )
  INTO v_affected_count, v_max_row
  FROM containers
  WHERE yard_id = v_stack.yard_id
    AND (
      location ~ ('^S' || LPAD(v_stack.stack_number::TEXT, 2, '0') || 'R\d+H\d+$')
      OR location ~ ('^S' || LPAD(v_stack.stack_number::TEXT, 2, '0') || '-R\d+-H\d+$')
    )
    AND status IN ('in_depot', 'gate_in')
    AND (
      CASE 
        WHEN location ~ 'R(\d+)' THEN substring(location from 'R(\d+)')::INTEGER
        ELSE 0
      END
    ) > p_new_row_count;
  
  RETURN QUERY SELECT 
    v_affected_count = 0,
    COALESCE(v_affected_count, 0),
    COALESCE(v_max_row, 0);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Manually fix current occupancy for all stacks
-- ============================================================================

DO $$
DECLARE
  v_pairing RECORD;
  v_total_count INTEGER;
  v_stack RECORD;
BEGIN
  RAISE NOTICE 'Fixing occupancy for all stacks...';
  
  -- Fix paired stacks first
  FOR v_pairing IN 
    SELECT * FROM stack_pairings WHERE is_active = true
  LOOP
    -- Count containers from ALL three stack locations (both formats)
    SELECT COUNT(*) INTO v_total_count
    FROM containers
    WHERE yard_id = v_pairing.yard_id
      AND (
        location ~ ('^S' || LPAD(v_pairing.first_stack_number::TEXT, 2, '0') || 'R\d+H\d+$')
        OR location ~ ('^S' || LPAD(v_pairing.first_stack_number::TEXT, 2, '0') || '-R\d+-H\d+$')
        OR location ~ ('^S' || LPAD(v_pairing.second_stack_number::TEXT, 2, '0') || 'R\d+H\d+$')
        OR location ~ ('^S' || LPAD(v_pairing.second_stack_number::TEXT, 2, '0') || '-R\d+-H\d+$')
        OR location ~ ('^S' || LPAD(v_pairing.virtual_stack_number::TEXT, 2, '0') || 'R\d+H\d+$')
        OR location ~ ('^S' || LPAD(v_pairing.virtual_stack_number::TEXT, 2, '0') || '-R\d+-H\d+$')
      )
      AND status IN ('in_depot', 'gate_in');
    
    -- Update all three stacks
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
    
    RAISE NOTICE 'Synced S%, S%, S%: % containers', 
      v_pairing.first_stack_number, v_pairing.second_stack_number, 
      v_pairing.virtual_stack_number, v_total_count;
  END LOOP;
  
  -- Fix non-paired stacks
  FOR v_stack IN 
    SELECT id, yard_id, stack_number 
    FROM stacks 
    WHERE id NOT IN (
      SELECT UNNEST(ARRAY[
        (SELECT id FROM stacks s WHERE s.yard_id = sp.yard_id AND s.stack_number = sp.first_stack_number),
        (SELECT id FROM stacks s WHERE s.yard_id = sp.yard_id AND s.stack_number = sp.second_stack_number),
        (SELECT id FROM stacks s WHERE s.yard_id = sp.yard_id AND s.stack_number = sp.virtual_stack_number)
      ])
      FROM stack_pairings sp
      WHERE sp.is_active = true
    )
  LOOP
    UPDATE stacks
    SET 
      current_occupancy = (
        SELECT COUNT(*)
        FROM containers
        WHERE yard_id = v_stack.yard_id
          AND (
            location ~ ('^S' || LPAD(v_stack.stack_number::TEXT, 2, '0') || 'R\d+H\d+$')
            OR location ~ ('^S' || LPAD(v_stack.stack_number::TEXT, 2, '0') || '-R\d+-H\d+$')
          )
          AND status IN ('in_depot', 'gate_in')
      ),
      updated_at = now()
    WHERE id = v_stack.id;
  END LOOP;
  
  RAISE NOTICE 'Occupancy fix completed';
END $$;

-- ============================================================================
-- Add validation function for row configuration changes
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_row_config_change(
  p_stack_id UUID,
  p_new_rows INTEGER
)
RETURNS TABLE(
  can_change BOOLEAN,
  reason TEXT,
  affected_containers INTEGER,
  max_row_in_use INTEGER
) AS $$
DECLARE
  v_stack RECORD;
  v_affected INTEGER;
  v_max_row INTEGER;
BEGIN
  -- Get stack details
  SELECT * INTO v_stack FROM stacks WHERE id = p_stack_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Stack not found'::TEXT, 0, 0;
    RETURN;
  END IF;
  
  -- If increasing rows, always safe
  IF p_new_rows >= v_stack.rows THEN
    RETURN QUERY SELECT true, 'Increasing rows is always safe'::TEXT, 0, v_stack.rows;
    RETURN;
  END IF;
  
  -- Check for containers in rows that would be removed
  SELECT 
    COUNT(*),
    MAX(
      CASE 
        WHEN location ~ 'R(\d+)' THEN substring(location from 'R(\d+)')::INTEGER
        ELSE 0
      END
    )
  INTO v_affected, v_max_row
  FROM containers
  WHERE yard_id = v_stack.yard_id
    AND (
      location ~ ('^S' || LPAD(v_stack.stack_number::TEXT, 2, '0') || 'R\d+H\d+$')
      OR location ~ ('^S' || LPAD(v_stack.stack_number::TEXT, 2, '0') || '-R\d+-H\d+$')
    )
    AND status IN ('in_depot', 'gate_in')
    AND (
      CASE 
        WHEN location ~ 'R(\d+)' THEN substring(location from 'R(\d+)')::INTEGER
        ELSE 0
      END
    ) > p_new_rows;
  
  IF v_affected > 0 THEN
    RETURN QUERY SELECT 
      false, 
      format('Cannot reduce rows: %s containers exist in rows %s-%s', v_affected, p_new_rows + 1, v_max_row)::TEXT,
      v_affected,
      COALESCE(v_max_row, 0);
  ELSE
    RETURN QUERY SELECT true, 'Safe to reduce rows'::TEXT, 0, COALESCE(v_max_row, 0);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Add helpful comments
-- ============================================================================

COMMENT ON FUNCTION check_row_reduction_safety(UUID, INTEGER) IS 
  'Validates if reducing stack rows is safe by checking for containers in rows that would be removed';

COMMENT ON FUNCTION validate_row_config_change(UUID, INTEGER) IS 
  'Comprehensive validation for row configuration changes with detailed feedback';

-- ============================================================================
-- Summary
-- ============================================================================

DO $$
DECLARE
  v_total_containers INTEGER;
  v_total_stacks INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total_containers FROM containers WHERE status IN ('in_depot', 'gate_in');
  SELECT COUNT(*) INTO v_total_stacks FROM stacks WHERE is_active = true;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Location Pattern and Row Validation Fixed';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total active stacks: %', v_total_stacks;
  RAISE NOTICE 'Total containers in depot: %', v_total_containers;
  RAISE NOTICE 'Trigger now matches both S24R6H4 and S24-R6-H4 formats';
  RAISE NOTICE 'Row reduction validation function added';
  RAISE NOTICE '========================================';
END $$;
