-- Add updated_by column to yards table
ALTER TABLE yards
ADD COLUMN IF NOT EXISTS updated_by TEXT;

-- Update existing records with a default value if needed
UPDATE yards
SET updated_by = 'System'
WHERE updated_by IS NULL;
