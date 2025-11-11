/*
  # Fix container_size constraint to allow updates
  
  The previous migration added a constraint that may be too restrictive.
  This migration ensures the constraint allows both formats: '20ft'/'40ft' and '20ft'/'40ft'
*/

-- Drop the existing constraint if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'stacks_container_size_check' 
    AND table_name = 'stacks'
  ) THEN
    ALTER TABLE stacks DROP CONSTRAINT stacks_container_size_check;
  END IF;
END $$;

-- Add a more permissive constraint
ALTER TABLE stacks ADD CONSTRAINT stacks_container_size_check 
  CHECK (container_size IN ('20ft', '40ft', '20ft', '40ft') OR container_size IS NULL);

-- Update any existing values to standardize format
UPDATE stacks SET container_size = '20ft' WHERE container_size = '20ft';
UPDATE stacks SET container_size = '40ft' WHERE container_size = '40ft';

COMMENT ON CONSTRAINT stacks_container_size_check ON stacks IS 'Allows 20ft, 40ft, 20ft, 40ft, or NULL';
