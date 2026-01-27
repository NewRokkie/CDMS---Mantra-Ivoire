/*
  # Add container size support to stacks table

  1. Changes
    - Add container_size column to stacks table
    - Values: '20ft' or '40ft'
    - Default to '20ft'
    - Add check constraint to ensure valid values

  2. Purpose
    - Enable tracking of which stacks are configured for 20ft or 40ft containers
    - Support the Switch Action UI feature for changing stack capacity
    - Enable paired stacks logic for 40ft containers
*/

-- Add container_size column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'stacks' AND column_name = 'container_size'
  ) THEN
    ALTER TABLE stacks 
      ADD COLUMN container_size TEXT DEFAULT '20ft' NOT NULL;
    
    -- Add check constraint for valid values
    ALTER TABLE stacks 
      ADD CONSTRAINT check_container_size 
      CHECK (container_size IN ('20ft', '40ft'));
  END IF;
END $$;