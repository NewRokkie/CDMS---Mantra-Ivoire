/*
  # Add Full/Empty Status Fields

  ## Changes
  1. Add full_empty column to containers table
  2. Add full_empty column to gate_in_operations table
  3. Create indexes for better query performance
  4. Update existing records with default values based on status

  ## Notes
  - full_empty can be 'FULL' or 'EMPTY'
  - This field tracks the actual container load status
  - Different from the operational status (in_depot, out_depot, etc.)
*/

-- Add full_empty column to containers table
ALTER TABLE containers 
ADD COLUMN IF NOT EXISTS full_empty text CHECK (full_empty IN ('FULL', 'EMPTY'));

-- Add full_empty column to gate_in_operations table
ALTER TABLE gate_in_operations 
ADD COLUMN IF NOT EXISTS full_empty text CHECK (full_empty IN ('FULL', 'EMPTY'));

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_containers_full_empty ON containers(full_empty);
CREATE INDEX IF NOT EXISTS idx_gate_in_operations_full_empty ON gate_in_operations(full_empty);

-- Update existing containers with default FULL status for in_depot containers
UPDATE containers 
SET full_empty = 'FULL' 
WHERE full_empty IS NULL AND status = 'in_depot';

-- Update existing containers with default EMPTY status for out_depot containers
UPDATE containers 
SET full_empty = 'EMPTY' 
WHERE full_empty IS NULL AND status = 'out_depot';

-- Update remaining containers with FULL as default
UPDATE containers 
SET full_empty = 'FULL' 
WHERE full_empty IS NULL;

-- Update existing gate_in_operations with default FULL status
UPDATE gate_in_operations 
SET full_empty = 'FULL' 
WHERE full_empty IS NULL;

-- Add comments to columns
COMMENT ON COLUMN containers.full_empty IS 'Container load status: FULL or EMPTY';
COMMENT ON COLUMN gate_in_operations.full_empty IS 'Container load status at gate in: FULL or EMPTY';
