/*
  # Add Equipment Reference Field to Gate Operations

  ## Overview
  This migration adds the `equipment_reference` field to the gate_in_operations table
  to store booking/equipment reference numbers for EDI transmission.

  ## Changes

  ### gate_in_operations table
  - Add `equipment_reference` (text) - Free text field for booking/equipment reference
  - This field will be transmitted via EDI CODECO to help clients identify container transfers

  ## Notes
  - Field is nullable to maintain compatibility with existing operations
  - Will be included in EDI CODECO messages in RFF (Reference) segment
*/

-- Add equipment_reference field to gate_in_operations table
ALTER TABLE gate_in_operations 
ADD COLUMN IF NOT EXISTS equipment_reference text;

-- Add comment for documentation
COMMENT ON COLUMN gate_in_operations.equipment_reference IS 'Equipment reference number for EDI transmission to help clients identify container transfers';

-- Create index for performance (optional, for searching by equipment reference)
CREATE INDEX IF NOT EXISTS idx_gate_in_operations_equipment_reference ON gate_in_operations(equipment_reference);