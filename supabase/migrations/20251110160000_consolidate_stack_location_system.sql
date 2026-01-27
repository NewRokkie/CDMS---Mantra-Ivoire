/*
  # Consolidate Stack and Location Management System
  
  This migration consolidates the stack and location management system to properly
  handle virtual stacks for 40ft containers and ensure the Live Map displays all
  stacks correctly.
  
  ## Problem Analysis
  - Multiple overlapping tables: stacks, stack_pairings, virtual_stack_pairs, locations, stack_assignments
  - Containers stored with physical stack locations (S03, S05) instead of virtual (S04)
  - Virtual stacks calculated in frontend instead of stored in database
  - Live Map not showing virtual stacks because they don't exist in database
  
  ## Solution
  1. Use `stacks` table as the single source of truth for ALL stacks (physical + virtual)
  2. Use `stack_pairings` to define which stacks are paired for 40ft containers
  3. Use `locations` table for actual container placement tracking
  4. Update containers to use virtual stack locations when appropriate
  5. Remove redundant tables: virtual_stack_pairs, stack_assignments
  
  ## Changes
  1. Add is_virtual flag to stacks table
  2. Populate virtual stacks (S04, S08, S12, etc.) in stacks table
  3. Update stack_pairings to reference virtual stacks
  4. Migrate container locations to use virtual stacks for 40ft containers
  5. Create view for easy stack querying
*/

-- ============================================================================
-- STEP 1: Add is_virtual column to stacks table if not exists
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'stacks' AND column_name = 'is_virtual'
  ) THEN
    ALTER TABLE stacks ADD COLUMN is_virtual BOOLEAN DEFAULT false;
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Add container_size column to stacks if not exists (for validation)
-- ============================================================================

DO $$
BEGIN
  -- Check if column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'stacks' AND column_name = 'container_size'
  ) THEN
    -- Add column without constraint first
    ALTER TABLE stacks ADD COLUMN container_size TEXT DEFAULT '20ft';
  END IF;
  
  -- Drop existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'check_container_size' 
    AND table_name = 'stacks'
  ) THEN
    ALTER TABLE stacks DROP CONSTRAINT check_container_size;
  END IF;
  
  -- Add new constraint that allows both 20ft and 40ft
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'stacks_container_size_check' 
    AND table_name = 'stacks'
  ) THEN
    ALTER TABLE stacks ADD CONSTRAINT stacks_container_size_check 
      CHECK (container_size IN ('20ft', '40ft', '20ft', '40ft'));
  END IF;
END $$;

-- ============================================================================
-- STEP 3: Create virtual stacks for 40ft containers
-- ============================================================================

-- Function to create virtual stacks between paired physical stacks
CREATE OR REPLACE FUNCTION create_virtual_stacks()
RETURNS void AS $$
DECLARE
  v_yard_id TEXT;
  v_pairing RECORD;
  v_first_stack RECORD;
  v_second_stack RECORD;
  v_virtual_stack_num INTEGER;
  v_section_id TEXT;
BEGIN
  -- Get all stack pairings
  FOR v_pairing IN 
    SELECT DISTINCT yard_id, first_stack_number, second_stack_number, virtual_stack_number
    FROM stack_pairings
    WHERE is_active = true
  LOOP
    -- Get first stack details
    SELECT * INTO v_first_stack
    FROM stacks
    WHERE yard_id = v_pairing.yard_id 
      AND stack_number = v_pairing.first_stack_number
    LIMIT 1;
    
    -- Get second stack details
    SELECT * INTO v_second_stack
    FROM stacks
    WHERE yard_id = v_pairing.yard_id 
      AND stack_number = v_pairing.second_stack_number
    LIMIT 1;
    
    IF v_first_stack.id IS NOT NULL AND v_second_stack.id IS NOT NULL THEN
      v_virtual_stack_num := v_pairing.virtual_stack_number;
      v_section_id := v_first_stack.section_id;
      
      -- Check if virtual stack already exists
      IF NOT EXISTS (
        SELECT 1 FROM stacks 
        WHERE yard_id = v_pairing.yard_id 
          AND stack_number = v_virtual_stack_num
      ) THEN
        -- Create virtual stack with same configuration as physical stacks
        INSERT INTO stacks (
          yard_id,
          stack_number,
          section_id,
          section_name,
          rows,
          max_tiers,
          capacity,
          current_occupancy,
          position_x,
          position_y,
          position_z,
          width,
          length,
          is_active,
          is_virtual,
          is_odd_stack,
          container_size,
          notes,
          created_at,
          updated_at
        ) VALUES (
          v_pairing.yard_id,
          v_virtual_stack_num,
          v_section_id,
          v_first_stack.section_name,
          v_first_stack.rows,
          v_first_stack.max_tiers,
          v_first_stack.capacity, -- Same capacity as one physical stack
          0, -- Will be calculated
          (v_first_stack.position_x + v_second_stack.position_x) / 2, -- Midpoint
          (v_first_stack.position_y + v_second_stack.position_y) / 2,
          v_first_stack.position_z,
          v_first_stack.width,
          v_first_stack.length * 2, -- 40ft length
          true,
          true, -- This is a virtual stack
          false,
          '40ft',
          'Virtual stack for 40ft containers spanning S' || v_pairing.first_stack_number || ' and S' || v_pairing.second_stack_number,
          now(),
          now()
        )
        ON CONFLICT (yard_id, stack_number) DO UPDATE
        SET 
          is_virtual = true,
          container_size = '40ft',
          updated_at = now();
        
        RAISE NOTICE 'Created virtual stack S% for yard %', v_virtual_stack_num, v_pairing.yard_id;
      ELSE
        -- Update existing stack to mark as virtual
        UPDATE stacks
        SET 
          is_virtual = true,
          container_size = '40ft',
          updated_at = now()
        WHERE yard_id = v_pairing.yard_id 
          AND stack_number = v_virtual_stack_num;
        
        RAISE NOTICE 'Updated stack S% to virtual for yard %', v_virtual_stack_num, v_pairing.yard_id;
      END IF;
      
      -- Update physical stacks to mark as 40ft
      UPDATE stacks
      SET 
        container_size = '40ft',
        updated_at = now()
      WHERE yard_id = v_pairing.yard_id 
        AND stack_number IN (v_pairing.first_stack_number, v_pairing.second_stack_number);
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Virtual stacks creation completed';
END;
$$ LANGUAGE plpgsql;

-- Execute the function to create virtual stacks
SELECT create_virtual_stacks();

-- ============================================================================
-- STEP 4: Update container locations to use virtual stacks for 40ft containers
-- ============================================================================

-- Function to migrate 40ft container locations to virtual stacks
CREATE OR REPLACE FUNCTION migrate_40ft_container_locations()
RETURNS void AS $$
DECLARE
  v_container RECORD;
  v_stack_num INTEGER;
  v_row INTEGER;
  v_tier INTEGER;
  v_pairing RECORD;
  v_virtual_stack_num INTEGER;
  v_new_location TEXT;
BEGIN
  -- Find all 40ft containers
  FOR v_container IN 
    SELECT id, number, location, size, yard_id
    FROM containers
    WHERE size = '40ft' 
      AND location IS NOT NULL
      AND location ~ '^S\d+-R\d+-H\d+$'
  LOOP
    -- Parse location (e.g., S03-R1-H1)
    v_stack_num := substring(v_container.location from 'S(\d+)')::INTEGER;
    v_row := substring(v_container.location from 'R(\d+)')::INTEGER;
    v_tier := substring(v_container.location from 'H(\d+)')::INTEGER;
    
    -- Find if this stack is part of a pairing
    SELECT * INTO v_pairing
    FROM stack_pairings
    WHERE yard_id = v_container.yard_id
      AND (first_stack_number = v_stack_num OR second_stack_number = v_stack_num)
      AND is_active = true
    LIMIT 1;
    
    IF v_pairing.virtual_stack_number IS NOT NULL THEN
      -- Use virtual stack number
      v_virtual_stack_num := v_pairing.virtual_stack_number;
      v_new_location := 'S' || LPAD(v_virtual_stack_num::TEXT, 2, '0') || '-R' || v_row || '-H' || v_tier;
      
      -- Update container location
      UPDATE containers
      SET 
        location = v_new_location,
        updated_at = now()
      WHERE id = v_container.id;
      
      RAISE NOTICE 'Migrated container % from % to %', v_container.number, v_container.location, v_new_location;
    END IF;
  END LOOP;
  
  RAISE NOTICE '40ft container location migration completed';
END;
$$ LANGUAGE plpgsql;

-- Execute the migration
SELECT migrate_40ft_container_locations();

-- ============================================================================
-- STEP 5: Create function to update stack occupancy
-- ============================================================================

CREATE OR REPLACE FUNCTION update_stack_occupancy()
RETURNS void AS $$
DECLARE
  v_stack RECORD;
  v_occupancy INTEGER;
BEGIN
  FOR v_stack IN SELECT id, yard_id, stack_number FROM stacks LOOP
    -- Count containers in this stack
    SELECT COUNT(*) INTO v_occupancy
    FROM containers
    WHERE yard_id = v_stack.yard_id
      AND location ~ ('^S' || LPAD(v_stack.stack_number::TEXT, 2, '0') || '-R\d+-H\d+$')
      AND status IN ('in_depot', 'gate_in');
    
    -- Update stack occupancy
    UPDATE stacks
    SET 
      current_occupancy = v_occupancy,
      updated_at = now()
    WHERE id = v_stack.id;
  END LOOP;
  
  RAISE NOTICE 'Stack occupancy update completed';
END;
$$ LANGUAGE plpgsql;

-- Execute occupancy update
SELECT update_stack_occupancy();

-- ============================================================================
-- STEP 6: Create view for easy stack querying with pairing info
-- ============================================================================

CREATE OR REPLACE VIEW v_stacks_with_pairings AS
SELECT 
  s.id,
  s.yard_id,
  s.stack_number,
  s.section_id,
  s.section_name,
  s.rows,
  s.max_tiers,
  s.capacity,
  s.current_occupancy,
  s.position_x,
  s.position_y,
  s.position_z,
  s.width,
  s.length,
  s.is_active,
  s.is_virtual,
  s.is_odd_stack,
  s.is_special_stack,
  s.container_size,
  s.assigned_client_code,
  s.notes,
  s.created_at,
  s.updated_at,
  -- Pairing information
  CASE 
    WHEN s.is_virtual THEN (
      SELECT json_build_object(
        'first_stack', sp.first_stack_number,
        'second_stack', sp.second_stack_number,
        'pairing_id', sp.id
      )
      FROM stack_pairings sp
      WHERE sp.yard_id = s.yard_id 
        AND sp.virtual_stack_number = s.stack_number
        AND sp.is_active = true
      LIMIT 1
    )
    WHEN NOT s.is_virtual AND s.container_size = '40ft' THEN (
      SELECT json_build_object(
        'virtual_stack', sp.virtual_stack_number,
        'paired_with', CASE 
          WHEN sp.first_stack_number = s.stack_number THEN sp.second_stack_number
          ELSE sp.first_stack_number
        END,
        'pairing_id', sp.id
      )
      FROM stack_pairings sp
      WHERE sp.yard_id = s.yard_id 
        AND (sp.first_stack_number = s.stack_number OR sp.second_stack_number = s.stack_number)
        AND sp.is_active = true
      LIMIT 1
    )
    ELSE NULL
  END as pairing_info
FROM stacks s;

-- Add comment
COMMENT ON VIEW v_stacks_with_pairings IS 'View combining stacks with their pairing information for easy querying';

-- ============================================================================
-- STEP 7: Create trigger to auto-update stack occupancy on container changes
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_update_stack_occupancy()
RETURNS TRIGGER AS $$
DECLARE
  v_old_stack_num INTEGER;
  v_new_stack_num INTEGER;
BEGIN
  -- Extract stack numbers from locations
  IF TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN
    IF OLD.location IS NOT NULL AND OLD.location ~ '^S\d+' THEN
      v_old_stack_num := substring(OLD.location from 'S(\d+)')::INTEGER;
    END IF;
  END IF;
  
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF NEW.location IS NOT NULL AND NEW.location ~ '^S\d+' THEN
      v_new_stack_num := substring(NEW.location from 'S(\d+)')::INTEGER;
    END IF;
  END IF;
  
  -- Update old stack occupancy
  IF v_old_stack_num IS NOT NULL THEN
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
      AND yard_id = COALESCE(OLD.yard_id, NEW.yard_id);
  END IF;
  
  -- Update new stack occupancy
  IF v_new_stack_num IS NOT NULL AND v_new_stack_num != v_old_stack_num THEN
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
      AND yard_id = COALESCE(NEW.yard_id, OLD.yard_id);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS containers_update_stack_occupancy ON containers;

-- Create trigger
CREATE TRIGGER containers_update_stack_occupancy
  AFTER INSERT OR UPDATE OR DELETE ON containers
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_stack_occupancy();

-- ============================================================================
-- STEP 8: Create indexes for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_stacks_is_virtual ON stacks(is_virtual) WHERE is_virtual = true;
CREATE INDEX IF NOT EXISTS idx_stacks_container_size ON stacks(container_size);
CREATE INDEX IF NOT EXISTS idx_stacks_yard_section ON stacks(yard_id, section_id);
CREATE INDEX IF NOT EXISTS idx_containers_location_pattern ON containers(location) WHERE location ~ '^S\d+-R\d+-H\d+$';

-- ============================================================================
-- STEP 9: Add helpful comments
-- ============================================================================

COMMENT ON COLUMN stacks.is_virtual IS 'True if this is a virtual stack representing a 40ft container position between two physical stacks';
COMMENT ON COLUMN stacks.container_size IS 'Container size this stack is configured for (20ft or 40ft)';
COMMENT ON TABLE stack_pairings IS 'Defines which physical stacks are paired to create virtual stacks for 40ft containers';

-- ============================================================================
-- FINAL: Summary
-- ============================================================================

DO $$
DECLARE
  v_total_stacks INTEGER;
  v_virtual_stacks INTEGER;
  v_40ft_stacks INTEGER;
  v_pairings INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total_stacks FROM stacks;
  SELECT COUNT(*) INTO v_virtual_stacks FROM stacks WHERE is_virtual = true;
  SELECT COUNT(*) INTO v_40ft_stacks FROM stacks WHERE container_size = '40ft' AND is_virtual = false;
  SELECT COUNT(*) INTO v_pairings FROM stack_pairings WHERE is_active = true;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Stack Location System Consolidation Complete';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total stacks: %', v_total_stacks;
  RAISE NOTICE 'Virtual stacks (40ft): %', v_virtual_stacks;
  RAISE NOTICE 'Physical 40ft stacks: %', v_40ft_stacks;
  RAISE NOTICE 'Active pairings: %', v_pairings;
  RAISE NOTICE '========================================';
END $$;
