/*
  # Add audit fields to clients table

  1. Changes
    - Add created_by column (TEXT for user who created the client)
    - Add updated_by column (TEXT for user who last updated the client)

  2. Rationale
    - These fields are required for proper audit tracking
    - They match the pattern used in other tables
    - Default values ensure existing records remain valid
*/

-- Add audit fields to clients table
DO $$
BEGIN
  -- Add created_by if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'clients' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE clients ADD COLUMN created_by TEXT DEFAULT 'System';
  END IF;

  -- Add updated_by if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'clients' AND column_name = 'updated_by'
  ) THEN
    ALTER TABLE clients ADD COLUMN updated_by TEXT DEFAULT 'System';
  END IF;
END $$;

-- Update existing records with default values if needed
UPDATE clients
SET created_by = 'System'
WHERE created_by IS NULL;

UPDATE clients
SET updated_by = 'System'
WHERE updated_by IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN clients.created_by IS 'User who created this client record';
COMMENT ON COLUMN clients.updated_by IS 'User who last updated this client record';