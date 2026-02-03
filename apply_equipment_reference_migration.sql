-- Apply Equipment Reference Migration
-- This script adds the equipment_reference field to gate_in_operations table

-- Add equipment_reference field to gate_in_operations table
ALTER TABLE gate_in_operations 
ADD COLUMN IF NOT EXISTS equipment_reference text;

-- Add comment for documentation
COMMENT ON COLUMN gate_in_operations.equipment_reference IS 'Equipment/Booking reference number for EDI transmission to help clients identify container transfers';

-- Create index for performance (optional, for searching by equipment reference)
CREATE INDEX IF NOT EXISTS idx_gate_in_operations_equipment_reference ON gate_in_operations(equipment_reference);

-- Verify the column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'gate_in_operations' 
AND column_name = 'equipment_reference';

-- Show success message
SELECT 'Equipment Reference field added successfully to gate_in_operations table' as status;