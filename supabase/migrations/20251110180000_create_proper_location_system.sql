/*
  # Proper Location System with Individual Location IDs
  
  This migration creates a comprehensive location system where:
  - Each Row×Height position has a unique location ID (e.g., S01R1H1, S01R2H3)
  - Each location can hold only ONE container
  - Availability is tracked with boolean flags
  - 40ft virtual locations require both physical positions to be available
  
  ## Changes
  1. Update locations table structure
  2. Generate all location IDs for existing stacks
  3. Create functions to check availability
  4. Create triggers to maintain consistency
*/

-- ============================================================================
-- STEP 1: Update locations table structure
-- ============================================================================

-- Add columns if they don't exist
DO $$
BEGIN
  -- Add available column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'locations' AND column_name = 'available'
  ) THEN
    ALTER TABLE locations ADD COLUMN available BOOLEAN DEFAULT true;
  END IF;
  
  -- Add container_number column for quick reference
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'locations' AND column_name = 'container_number'
  ) THEN
    ALTER TABLE locations ADD COLUMN container_number TEXT;
  END IF;
END $$;

-- Update existing locations to set availability based on occupancy
UPDATE locations 
SET available = NOT is_occupied,
    container_number = (
      SELECT number FROM containers 
      WHERE containers.id = locations.container_id 
      LIMIT 1
    )
WHERE is_occupied = true;

-- ============================================================================
-- STEP 2: Function to generate all location IDs for a stack
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_locations_for_stack(
  p_stack_id UUID,
  p_yard_id TEXT,
  p_stack_number INTEGER,
  p_rows INTEGER,
  p_max_tiers INTEGER,
  p_is_virtual BOOLEAN DEFAULT false,
  p_virtual_stack_pair_id UUID DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  v_row INTEGER;
  v_tier INTEGER;
  v_location_id TEXT;
  v_count INTEGER := 0;
BEGIN
  -- Generate location for each row and tier combination
  FOR v_row IN 1..p_rows LOOP
    FOR v_tier IN 1..p_max_tiers LOOP
      -- Format: S01R1H1, S04R2H3, etc.
      v_location_id := 'S' || LPAD(p_stack_number::TEXT, 2, '0') || 
                       'R' || v_row || 
                       'H' || v_tier;
      
      -- Insert location if it doesn't exist
      INSERT INTO locations (
        location_id,
        stack_id,
        yard_id,
        row_number,
        tier_number,
        is_virtual,
        virtual_stack_pair_id,
        is_occupied,
        available,
        is_active,
        created_at,
        updated_at
      ) VALUES (
        v_location_id,
        p_stack_id,
        p_yard_id,
        v_row,
        v_tier,
        p_is_virtual,
        p_virtual_stack_pair_id,
        false,
        true,
        true,
        now(),
        now()
      )
      ON CONFLICT (location_id) DO UPDATE
      SET 
        stack_id = EXCLUDED.stack_id,
        is_virtual = EXCLUDED.is_virtual,
        virtual_stack_pair_id = EXCLUDED.virtual_stack_pair_id,
        updated_at = now();
      
      v_count := v_count + 1;
    END LOOP;
  END LOOP;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 3: Generate locations for all existing stacks
-- ============================================================================

DO $$
DECLARE
  v_stack RECORD;
  v_count INTEGER;
  v_total INTEGER := 0;
  v_pair_id UUID;
BEGIN
  FOR v_stack IN 
    SELECT id, yard_id, stack_number, rows, max_tiers, is_virtual
    FROM stacks
    WHERE is_active = true
  LOOP
    v_pair_id := NULL;
    
    -- Get virtual_stack_pair_id if this is a virtual stack
    IF v_stack.is_virtual THEN
      SELECT id INTO v_pair_id
      FROM virtual_stack_pairs
      WHERE yard_id = v_stack.yard_id
        AND virtual_stack_number = v_stack.stack_number
      LIMIT 1;
      
      -- If no pair found in virtual_stack_pairs, try stack_pairings
      IF v_pair_id IS NULL THEN
        -- For virtual stacks, we need to create a virtual_stack_pairs entry
        -- Get the pairing from stack_pairings
        DECLARE
          v_pairing RECORD;
          v_stack1_id UUID;
          v_stack2_id UUID;
        BEGIN
          SELECT * INTO v_pairing
          FROM stack_pairings
          WHERE yard_id = v_stack.yard_id
            AND virtual_stack_number = v_stack.stack_number
            AND is_active = true
          LIMIT 1;
          
          IF FOUND THEN
            -- Get stack IDs
            SELECT id INTO v_stack1_id
            FROM stacks
            WHERE yard_id = v_stack.yard_id
              AND stack_number = v_pairing.first_stack_number
            LIMIT 1;
            
            SELECT id INTO v_stack2_id
            FROM stacks
            WHERE yard_id = v_stack.yard_id
              AND stack_number = v_pairing.second_stack_number
            LIMIT 1;
            
            -- Create virtual_stack_pairs entry if both stacks exist
            IF v_stack1_id IS NOT NULL AND v_stack2_id IS NOT NULL THEN
              INSERT INTO virtual_stack_pairs (
                yard_id,
                stack1_id,
                stack2_id,
                virtual_stack_number,
                is_active,
                created_at,
                updated_at
              ) VALUES (
                v_stack.yard_id,
                v_stack1_id,
                v_stack2_id,
                v_stack.stack_number,
                true,
                now(),
                now()
              )
              ON CONFLICT (yard_id, virtual_stack_number) DO UPDATE
              SET 
                stack1_id = EXCLUDED.stack1_id,
                stack2_id = EXCLUDED.stack2_id,
                updated_at = now()
              RETURNING id INTO v_pair_id;
              
              RAISE NOTICE 'Created virtual_stack_pairs entry for S%', v_stack.stack_number;
            END IF;
          END IF;
        END;
      END IF;
    END IF;
    
    v_count := generate_locations_for_stack(
      v_stack.id,
      v_stack.yard_id,
      v_stack.stack_number,
      v_stack.rows,
      v_stack.max_tiers,
      v_stack.is_virtual,
      v_pair_id
    );
    
    v_total := v_total + v_count;
    
    RAISE NOTICE 'Generated % locations for stack S% (virtual: %, pair_id: %)', 
      v_count, v_stack.stack_number, v_stack.is_virtual, v_pair_id;
  END LOOP;
  
  RAISE NOTICE 'Total locations generated: %', v_total;
END $$;

-- ============================================================================
-- STEP 4: Function to check if a location is available (40ft logic)
-- ============================================================================

CREATE OR REPLACE FUNCTION is_location_available(p_location_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_location RECORD;
  v_is_virtual BOOLEAN;
  v_pair RECORD;
  v_row INTEGER;
  v_tier INTEGER;
  v_physical1_available BOOLEAN;
  v_physical2_available BOOLEAN;
BEGIN
  -- Get location details
  SELECT * INTO v_location
  FROM locations
  WHERE location_id = p_location_id
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- If location is not active, it's not available
  IF NOT v_location.is_active THEN
    RETURN false;
  END IF;
  
  -- If location is occupied, it's not available
  IF v_location.is_occupied THEN
    RETURN false;
  END IF;
  
  -- If this is a virtual location (40ft), check physical locations
  IF v_location.is_virtual AND v_location.virtual_stack_pair_id IS NOT NULL THEN
    -- Get the pairing information
    SELECT * INTO v_pair
    FROM virtual_stack_pairs
    WHERE id = v_location.virtual_stack_pair_id;
    
    IF FOUND THEN
      v_row := v_location.row_number;
      v_tier := v_location.tier_number;
      
      -- Check if both physical locations are available
      -- Physical location 1 (e.g., S03R1H1)
      SELECT available INTO v_physical1_available
      FROM locations
      WHERE yard_id = v_location.yard_id
        AND stack_id = v_pair.stack1_id
        AND row_number = v_row
        AND tier_number = v_tier
      LIMIT 1;
      
      -- Physical location 2 (e.g., S05R1H1)
      SELECT available INTO v_physical2_available
      FROM locations
      WHERE yard_id = v_location.yard_id
        AND stack_id = v_pair.stack2_id
        AND row_number = v_row
        AND tier_number = v_tier
      LIMIT 1;
      
      -- Virtual location is available only if BOTH physical locations are available
      RETURN COALESCE(v_physical1_available, false) AND COALESCE(v_physical2_available, false);
    END IF;
  END IF;
  
  -- For regular (20ft) locations, just check the available flag
  RETURN v_location.available;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 5: Function to assign container to location
-- ============================================================================

CREATE OR REPLACE FUNCTION assign_container_to_location(
  p_location_id TEXT,
  p_container_id UUID,
  p_container_number TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_location RECORD;
  v_pair RECORD;
  v_row INTEGER;
  v_tier INTEGER;
BEGIN
  -- Check if location is available
  IF NOT is_location_available(p_location_id) THEN
    RAISE EXCEPTION 'Location % is not available', p_location_id;
  END IF;
  
  -- Get location details
  SELECT * INTO v_location
  FROM locations
  WHERE location_id = p_location_id
  LIMIT 1;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Location % not found', p_location_id;
  END IF;
  
  -- Update the virtual location
  UPDATE locations
  SET 
    is_occupied = true,
    available = false,
    container_id = p_container_id,
    container_number = p_container_number,
    updated_at = now()
  WHERE location_id = p_location_id;
  
  -- If this is a virtual location (40ft), also mark physical locations as occupied
  IF v_location.is_virtual AND v_location.virtual_stack_pair_id IS NOT NULL THEN
    SELECT * INTO v_pair
    FROM virtual_stack_pairs
    WHERE id = v_location.virtual_stack_pair_id;
    
    IF FOUND THEN
      v_row := v_location.row_number;
      v_tier := v_location.tier_number;
      
      -- Mark physical location 1 as occupied
      UPDATE locations
      SET 
        is_occupied = true,
        available = false,
        container_id = p_container_id,
        container_number = p_container_number,
        updated_at = now()
      WHERE yard_id = v_location.yard_id
        AND stack_id = v_pair.stack1_id
        AND row_number = v_row
        AND tier_number = v_tier;
      
      -- Mark physical location 2 as occupied
      UPDATE locations
      SET 
        is_occupied = true,
        available = false,
        container_id = p_container_id,
        container_number = p_container_number,
        updated_at = now()
      WHERE yard_id = v_location.yard_id
        AND stack_id = v_pair.stack2_id
        AND row_number = v_row
        AND tier_number = v_tier;
    END IF;
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 6: Function to release location
-- ============================================================================

CREATE OR REPLACE FUNCTION release_location(p_location_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_location RECORD;
  v_pair RECORD;
  v_row INTEGER;
  v_tier INTEGER;
BEGIN
  -- Get location details
  SELECT * INTO v_location
  FROM locations
  WHERE location_id = p_location_id
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Update the virtual location
  UPDATE locations
  SET 
    is_occupied = false,
    available = true,
    container_id = NULL,
    container_number = NULL,
    updated_at = now()
  WHERE location_id = p_location_id;
  
  -- If this is a virtual location (40ft), also release physical locations
  IF v_location.is_virtual AND v_location.virtual_stack_pair_id IS NOT NULL THEN
    SELECT * INTO v_pair
    FROM virtual_stack_pairs
    WHERE id = v_location.virtual_stack_pair_id;
    
    IF FOUND THEN
      v_row := v_location.row_number;
      v_tier := v_location.tier_number;
      
      -- Release physical location 1
      UPDATE locations
      SET 
        is_occupied = false,
        available = true,
        container_id = NULL,
        container_number = NULL,
        updated_at = now()
      WHERE yard_id = v_location.yard_id
        AND stack_id = v_pair.stack1_id
        AND row_number = v_row
        AND tier_number = v_tier;
      
      -- Release physical location 2
      UPDATE locations
      SET 
        is_occupied = false,
        available = true,
        container_id = NULL,
        container_number = NULL,
        updated_at = now()
      WHERE yard_id = v_location.yard_id
        AND stack_id = v_pair.stack2_id
        AND row_number = v_row
        AND tier_number = v_tier;
    END IF;
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 7: Sync existing container locations
-- ============================================================================

DO $$
DECLARE
  v_container RECORD;
  v_location_id TEXT;
BEGIN
  FOR v_container IN 
    SELECT id, number, location
    FROM containers
    WHERE location IS NOT NULL
      AND location ~ '^S\d+R\d+H\d+$'
      AND status IN ('in_depot', 'gate_in')
  LOOP
    v_location_id := v_container.location;
    
    -- Try to assign container to location
    BEGIN
      PERFORM assign_container_to_location(
        v_location_id,
        v_container.id,
        v_container.number
      );
      RAISE NOTICE 'Assigned container % to location %', v_container.number, v_location_id;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Could not assign container % to location %: %', 
          v_container.number, v_location_id, SQLERRM;
    END;
  END LOOP;
END $$;

-- ============================================================================
-- STEP 8: Create indexes for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_locations_available ON locations(available) WHERE available = true;
CREATE INDEX IF NOT EXISTS idx_locations_container_number ON locations(container_number) WHERE container_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_locations_stack_row_tier ON locations(stack_id, row_number, tier_number);

-- ============================================================================
-- STEP 9: Add comments
-- ============================================================================

COMMENT ON COLUMN locations.available IS 'True if location is free and can accept a container';
COMMENT ON COLUMN locations.container_number IS 'Container number currently occupying this location (for quick reference)';
COMMENT ON FUNCTION is_location_available(TEXT) IS 'Checks if a location is available, considering 40ft virtual stack logic';
COMMENT ON FUNCTION assign_container_to_location(TEXT, UUID, TEXT) IS 'Assigns a container to a location, handling 40ft virtual stack logic';
COMMENT ON FUNCTION release_location(TEXT) IS 'Releases a location, handling 40ft virtual stack logic';

-- ============================================================================
-- FINAL: Summary
-- ============================================================================

DO $$
DECLARE
  v_total_locations INTEGER;
  v_available_locations INTEGER;
  v_occupied_locations INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total_locations FROM locations WHERE is_active = true;
  SELECT COUNT(*) INTO v_available_locations FROM locations WHERE available = true AND is_active = true;
  SELECT COUNT(*) INTO v_occupied_locations FROM locations WHERE is_occupied = true AND is_active = true;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Location System Setup Complete';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total locations: %', v_total_locations;
  RAISE NOTICE 'Available locations: %', v_available_locations;
  RAISE NOTICE 'Occupied locations: %', v_occupied_locations;
  RAISE NOTICE '========================================';
END $$;
