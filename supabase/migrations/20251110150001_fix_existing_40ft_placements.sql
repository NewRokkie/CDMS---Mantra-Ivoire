/*
  # Fix Existing 40ft Container Placements

  1. Purpose
    - Identify and fix any existing 40ft containers placed on invalid stacks
    - Move them to appropriate virtual stacks or mark them for manual review

  2. Actions
    - Find all 40ft containers on odd-numbered stacks
    - Attempt to move them to corresponding virtual stacks
    - Log any containers that need manual intervention
*/

-- Create temporary table to log invalid placements
CREATE TEMP TABLE invalid_40ft_placements AS
SELECT 
  id,
  number,
  size,
  location,
  CAST(SUBSTRING(location FROM 'S0*(\d+)') AS INTEGER) as stack_number,
  client_code,
  status
FROM containers
WHERE (size = '40ft' OR size = '40ft')
  AND location IS NOT NULL
  AND CAST(SUBSTRING(location FROM 'S0*(\d+)') AS INTEGER) NOT IN (
    4, 8, 12, 16, 20, 24, 28,     -- Zone A
    34, 38, 42, 46, 50, 54,        -- Zone B
    62, 66, 70, 74, 78, 82,        -- Zone C
    86, 90, 94, 98                 -- Zone D
  );

-- Display invalid placements for review
DO $$
DECLARE
  invalid_count INTEGER;
  rec RECORD;
BEGIN
  SELECT COUNT(*) INTO invalid_count FROM invalid_40ft_placements;
  
  IF invalid_count > 0 THEN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Found % 40ft containers on invalid stacks', invalid_count;
    RAISE NOTICE '========================================';
    
    FOR rec IN SELECT * FROM invalid_40ft_placements LOOP
      RAISE NOTICE 'Container: % | Size: % | Invalid Location: % (Stack %) | Client: % | Status: %',
        rec.number, rec.size, rec.location, rec.stack_number, rec.client_code, rec.status;
    END LOOP;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'These containers need to be moved to virtual stacks';
    RAISE NOTICE 'Example: Stack 23 (odd) should use Stack 24 (virtual = S23+S25)';
    RAISE NOTICE '========================================';
  ELSE
    RAISE NOTICE 'No invalid 40ft container placements found. All 40ft containers are correctly placed on virtual stacks.';
  END IF;
END $$;

-- Function to suggest correct virtual stack for an odd stack
CREATE OR REPLACE FUNCTION get_virtual_stack_for_odd(odd_stack INTEGER)
RETURNS INTEGER AS $$
DECLARE
  virtual_stack INTEGER;
BEGIN
  -- Map odd stacks to their virtual stack numbers
  -- Virtual stack = lower odd stack + 1
  -- E.g., S03+S05 -> S04, S23+S25 -> S24
  
  CASE 
    WHEN odd_stack IN (3, 5) THEN virtual_stack := 4;
    WHEN odd_stack IN (7, 9) THEN virtual_stack := 8;
    WHEN odd_stack IN (11, 13) THEN virtual_stack := 12;
    WHEN odd_stack IN (15, 17) THEN virtual_stack := 16;
    WHEN odd_stack IN (19, 21) THEN virtual_stack := 20;
    WHEN odd_stack IN (23, 25) THEN virtual_stack := 24;
    WHEN odd_stack IN (27, 29) THEN virtual_stack := 28;
    WHEN odd_stack IN (33, 35) THEN virtual_stack := 34;
    WHEN odd_stack IN (37, 39) THEN virtual_stack := 38;
    WHEN odd_stack IN (41, 43) THEN virtual_stack := 42;
    WHEN odd_stack IN (45, 47) THEN virtual_stack := 46;
    WHEN odd_stack IN (49, 51) THEN virtual_stack := 50;
    WHEN odd_stack IN (53, 55) THEN virtual_stack := 54;
    WHEN odd_stack IN (61, 63) THEN virtual_stack := 62;
    WHEN odd_stack IN (65, 67) THEN virtual_stack := 66;
    WHEN odd_stack IN (69, 71) THEN virtual_stack := 70;
    WHEN odd_stack IN (73, 75) THEN virtual_stack := 74;
    WHEN odd_stack IN (77, 79) THEN virtual_stack := 78;
    WHEN odd_stack IN (81, 83) THEN virtual_stack := 82;
    WHEN odd_stack IN (85, 87) THEN virtual_stack := 86;
    WHEN odd_stack IN (89, 91) THEN virtual_stack := 90;
    WHEN odd_stack IN (93, 95) THEN virtual_stack := 94;
    WHEN odd_stack IN (97, 99) THEN virtual_stack := 98;
    ELSE virtual_stack := NULL;
  END CASE;
  
  RETURN virtual_stack;
END;
$$ LANGUAGE plpgsql;

-- Attempt to auto-fix invalid placements by moving to virtual stacks
-- COMMENTED OUT FOR SAFETY - Uncomment after review
/*
DO $$
DECLARE
  rec RECORD;
  new_location TEXT;
  virtual_stack INTEGER;
  row_num TEXT;
  height_num TEXT;
BEGIN
  FOR rec IN SELECT * FROM invalid_40ft_placements LOOP
    -- Get the virtual stack number
    virtual_stack := get_virtual_stack_for_odd(rec.stack_number);
    
    IF virtual_stack IS NOT NULL THEN
      -- Extract row and height from current location
      row_num := SUBSTRING(rec.location FROM 'R(\d+)');
      height_num := SUBSTRING(rec.location FROM 'H(\d+)');
      
      -- Build new location with virtual stack
      new_location := 'S' || LPAD(virtual_stack::TEXT, 2, '0') || 'R' || row_num || 'H' || height_num;
      
      -- Update container location
      UPDATE containers
      SET 
        location = new_location,
        updated_at = NOW(),
        updated_by = 'System - 40ft Stack Validation Fix'
      WHERE id = rec.id;
      
      RAISE NOTICE 'Fixed: Container % moved from % to %', rec.number, rec.location, new_location;
    ELSE
      RAISE WARNING 'Cannot auto-fix: Container % at stack % - no valid virtual stack mapping', rec.number, rec.stack_number;
    END IF;
  END LOOP;
END $$;
*/

-- Create a view to easily monitor 40ft container placements
CREATE OR REPLACE VIEW v_40ft_container_validation AS
SELECT 
  c.id,
  c.number as container_number,
  c.size,
  c.location,
  CAST(SUBSTRING(c.location FROM 'S0*(\d+)') AS INTEGER) as stack_number,
  CASE 
    WHEN CAST(SUBSTRING(c.location FROM 'S0*(\d+)') AS INTEGER) IN (
      4, 8, 12, 16, 20, 24, 28, 34, 38, 42, 46, 50, 54,
      62, 66, 70, 74, 78, 82, 86, 90, 94, 98
    ) THEN 'VALID - Virtual Stack'
    WHEN CAST(SUBSTRING(c.location FROM 'S0*(\d+)') AS INTEGER) % 2 = 1 THEN 'INVALID - Odd Physical Stack'
    ELSE 'INVALID - Not a recognized virtual stack'
  END as validation_status,
  c.client_code,
  c.status,
  c.created_at,
  c.updated_at
FROM containers c
WHERE (c.size = '40ft' OR c.size = '40ft')
  AND c.location IS NOT NULL
ORDER BY validation_status DESC, c.created_at DESC;

-- Grant access to the view
GRANT SELECT ON v_40ft_container_validation TO authenticated;

COMMENT ON VIEW v_40ft_container_validation IS 
  'Monitoring view for 40ft container placements. Shows validation status for each 40ft container location.';

-- Final summary
DO $$
DECLARE
  total_40ft INTEGER;
  valid_40ft INTEGER;
  invalid_40ft INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_40ft 
  FROM containers 
  WHERE (size = '40ft' OR size = '40ft') AND location IS NOT NULL;
  
  SELECT COUNT(*) INTO valid_40ft 
  FROM v_40ft_container_validation 
  WHERE validation_status = 'VALID - Virtual Stack';
  
  SELECT COUNT(*) INTO invalid_40ft 
  FROM v_40ft_container_validation 
  WHERE validation_status LIKE 'INVALID%';
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'VALIDATION SUMMARY';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total 40ft containers with locations: %', total_40ft;
  RAISE NOTICE 'Valid placements (on virtual stacks): %', valid_40ft;
  RAISE NOTICE 'Invalid placements (need fixing): %', invalid_40ft;
  RAISE NOTICE '========================================';
  
  IF invalid_40ft > 0 THEN
    RAISE NOTICE 'ACTION REQUIRED: Review invalid placements using:';
    RAISE NOTICE 'SELECT * FROM v_40ft_container_validation WHERE validation_status LIKE ''INVALID%%'';';
  END IF;
END $$;
