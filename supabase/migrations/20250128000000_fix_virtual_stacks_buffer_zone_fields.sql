/*
  # Fix virtual stacks creation to include buffer zone fields

  1. Problem
    - The create_virtual_stacks() function doesn't include the new buffer zone fields
    - This causes "cannot extract elements from a scalar" errors when creating stacks
    - The function was created before buffer zone fields were added

  2. Solution
    - Update the create_virtual_stacks() function to include buffer zone fields
    - Ensure all INSERT statements include the required JSONB fields
    - Set appropriate default values for virtual stacks
*/

-- Drop and recreate the function with buffer zone fields
DROP FUNCTION IF EXISTS create_virtual_stacks();

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
          updated_at,
          -- Add buffer zone fields with appropriate defaults
          is_buffer_zone,
          buffer_zone_type,
          damage_types_supported
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
          now(),
          -- Buffer zone defaults for virtual stacks
          false, -- Virtual stacks are not buffer zones
          null,  -- No buffer zone type
          '[]'::jsonb -- Empty damage types array
        )
        ON CONFLICT (yard_id, stack_number) DO UPDATE
        SET 
          is_virtual = true,
          container_size = '40ft',
          updated_at = now(),
          -- Ensure buffer zone fields are set
          is_buffer_zone = COALESCE(EXCLUDED.is_buffer_zone, false),
          buffer_zone_type = EXCLUDED.buffer_zone_type,
          damage_types_supported = COALESCE(EXCLUDED.damage_types_supported, '[]'::jsonb);
        
        RAISE NOTICE 'Created virtual stack S% for yard %', v_virtual_stack_num, v_pairing.yard_id;
      ELSE
        -- Update existing stack to mark as virtual
        UPDATE stacks
        SET 
          is_virtual = true,
          container_size = '40ft',
          updated_at = now(),
          -- Ensure buffer zone fields are properly set for existing virtual stacks
          is_buffer_zone = COALESCE(is_buffer_zone, false),
          buffer_zone_type = buffer_zone_type,
          damage_types_supported = COALESCE(damage_types_supported, '[]'::jsonb)
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

-- Also ensure all existing stacks have proper buffer zone field defaults
UPDATE stacks 
SET 
  is_buffer_zone = COALESCE(is_buffer_zone, false),
  buffer_zone_type = buffer_zone_type,
  damage_types_supported = COALESCE(damage_types_supported, '[]'::jsonb)
WHERE 
  is_buffer_zone IS NULL 
  OR damage_types_supported IS NULL;

-- Add a comment for documentation
COMMENT ON FUNCTION create_virtual_stacks() IS 'Creates virtual stacks for 40ft container pairings with proper buffer zone field handling';