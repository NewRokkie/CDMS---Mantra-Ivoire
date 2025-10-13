/*
  # Seed default stack configuration

  1. Purpose
    - Migrate current frontend stack configuration to database
    - Create default stacks for depot-tantarelli yard
    - Set up typical container terminal stack layout

  2. Default Configuration
    - Total: 50 stacks (Stack 01 to Stack 50)
    - Sections: Main Section (01-30), Zone A (31-40), Zone B (41-50)
    - All stacks start as 20feet capacity
    - Standard configuration: 6 rows x 4 tiers = 24 capacity per stack
    - Positions calculated based on standard 12m length, 2.5m width
*/

-- Only insert if no stacks exist yet
DO $$
DECLARE
  stack_count INTEGER;
  i INTEGER;
  section_name TEXT;
  pos_x NUMERIC;
  pos_y NUMERIC;
BEGIN
  -- Check if stacks already exist
  SELECT COUNT(*) INTO stack_count FROM stacks WHERE yard_id = 'depot-tantarelli';
  
  IF stack_count = 0 THEN
    -- Create 50 default stacks
    FOR i IN 1..50 LOOP
      -- Determine section based on stack number
      IF i <= 30 THEN
        section_name := 'Main Section';
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
      
      -- Insert stack
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
        created_by
      ) VALUES (
        'depot-tantarelli',
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
        '20feet',
        true,
        (i % 2 = 1), -- Odd numbered stacks for pairing logic
        'System'
      );
    END LOOP;
    
    RAISE NOTICE 'Successfully created 50 default stacks for depot-tantarelli';
  ELSE
    RAISE NOTICE 'Stacks already exist for depot-tantarelli, skipping seed';
  END IF;
END $$;