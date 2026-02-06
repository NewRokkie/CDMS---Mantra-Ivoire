/*
  # Fix seed default stacks to include buffer zone fields

  1. Problem
    - The seed_default_stacks migration doesn't include buffer zone fields
    - This can cause "cannot extract elements from a scalar" errors
    - The migration was created before buffer zone fields were added

  2. Solution
    - Update any existing stacks that might be missing buffer zone fields
    - Ensure all future stack insertions include proper defaults
*/

-- Ensure all existing stacks have proper buffer zone field defaults
UPDATE stacks 
SET 
  is_buffer_zone = COALESCE(is_buffer_zone, false),
  buffer_zone_type = buffer_zone_type,
  damage_types_supported = COALESCE(damage_types_supported, '[]'::jsonb)
WHERE 
  is_buffer_zone IS NULL 
  OR damage_types_supported IS NULL;

-- Create a safer version of the seed function that includes buffer zone fields
CREATE OR REPLACE FUNCTION seed_default_stacks_with_buffer_fields()
RETURNS void AS $$
DECLARE
  stack_count INTEGER;
  i INTEGER;
  section_name TEXT;
  pos_x NUMERIC;
  pos_y NUMERIC;
BEGIN
  -- Check if stacks already exist
  SELECT COUNT(*) INTO stack_count FROM stacks WHERE yard_id = '2554a779-a14b-45ed-a1e1-684e2fd9b614';
  
  IF stack_count = 0 THEN
    -- Create 50 default stacks
    FOR i IN 1..50 LOOP
      -- Determine section based on stack number
      IF i <= 30 THEN
        section_name := 'Zone A';
      ELSIF i <= 40 THEN
        section_name := 'Zone A';
      ELSE
        section_name := 'Zone B';
      END IF;
      
      -- Calculate position (simple grid layout)
      -- 5 stacks per row, 12m apart (length) + 1m gap = 13m
      -- 2.5m wide + 0.5m gap = 3m between columns
      pos_x := ((i - 1) % 5) * 13;
      pos_y := floor((i - 1) / 5) * 3;
      
      -- Insert stack with all required fields including buffer zone fields
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
        container_size,
        is_active,
        is_odd_stack,
        created_by,
        -- Buffer zone fields with proper defaults
        is_buffer_zone,
        buffer_zone_type,
        damage_types_supported
      ) VALUES (
        '',
        i,
        section_name || '-' || i::text,
        section_name,
        6,
        4,
        24, -- 6 rows x 4 tiers
        0,
        pos_x,
        pos_y,
        0,
        2.5,
        12,
        '20ft',
        true,
        (i % 2 = 1), -- Odd numbered stacks for pairing logic
        'System',
        -- Buffer zone defaults
        false, -- Regular stacks are not buffer zones
        null,  -- No buffer zone type
        '[]'::jsonb -- Empty damage types array
      );
    END LOOP;
    
    RAISE NOTICE 'Successfully created 50 default stacks for  with buffer zone fields';
  ELSE
    RAISE NOTICE 'Stacks already exist for , skipping seed';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Add a comment for documentation
COMMENT ON FUNCTION seed_default_stacks_with_buffer_fields() IS 'Seeds default stacks with proper buffer zone field handling to avoid scalar extraction errors';