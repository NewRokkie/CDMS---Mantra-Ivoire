/*
  # Add 40ft Container Stack Validation

  1. Purpose
    - Prevent 40ft containers from being placed on odd-numbered physical stacks
    - Ensure 40ft containers can only be placed on virtual (even) stacks
    - Add database-level constraint to enforce business rules

  2. Changes
    - Add trigger function to validate 40ft container placements on containers table

  3. Business Rules
    - 40ft containers can ONLY be placed on virtual stacks (even numbers like S04, S08, S24, etc.)
    - Virtual stacks represent paired odd stacks (e.g., S04 = S03+S05, S24 = S23+S25)
    - 20ft containers can be placed on any stack
*/

-- Create function to validate 40ft container stack placement
CREATE OR REPLACE FUNCTION validate_40ft_container_stack()
RETURNS TRIGGER AS $$
DECLARE
  stack_number INTEGER;
  valid_virtual_stacks INTEGER[] := ARRAY[
    4, 8, 12, 16, 20, 24, 28,     -- Zone A
    34, 38, 42, 46, 50, 54,        -- Zone B
    62, 66, 70, 74, 78, 82,        -- Zone C
    86, 90, 94, 98                 -- Zone D
  ];
BEGIN
  -- Only validate if container size is 40ft and location is set
  IF (NEW.size = '40ft' OR NEW.size = '40ft') AND NEW.location IS NOT NULL THEN
    -- Extract stack number from location (format: S##R#H# or S##-R#-H#)
    stack_number := CAST(
      SUBSTRING(NEW.location FROM 'S0*(\d+)') AS INTEGER
    );
    
    -- Check if stack number is in the valid virtual stacks array
    IF stack_number IS NOT NULL AND NOT (stack_number = ANY(valid_virtual_stacks)) THEN
      RAISE EXCEPTION 
        '40ft containers can only be placed on virtual stacks. Stack % is not valid. Valid virtual stacks are: S04, S08, S12, S16, S20, S24, S28, S34, S38, S42, S46, S50, S54, S62, S66, S70, S74, S78, S82, S86, S90, S94, S98',
        stack_number
        USING HINT = 'Virtual stacks represent paired odd stacks (e.g., S24 = S23+S25)';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS validate_40ft_container_stack_trigger ON containers;

-- Create trigger on containers table
CREATE TRIGGER validate_40ft_container_stack_trigger
  BEFORE INSERT OR UPDATE OF location, size
  ON containers
  FOR EACH ROW
  EXECUTE FUNCTION validate_40ft_container_stack();

-- Add comment to document the validation
COMMENT ON FUNCTION validate_40ft_container_stack() IS 
  'Validates that 40ft containers are only placed on virtual (even-numbered) stacks that represent paired odd stacks. Virtual stacks like S04, S08, S24, S28 represent the pairing of adjacent odd stacks (e.g., S24 = S23+S25).';
