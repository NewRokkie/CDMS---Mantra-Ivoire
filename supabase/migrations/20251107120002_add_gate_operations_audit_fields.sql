/*
  # Add Audit Fields to Gate Operations

  ## Changes
  1. Add updated_at timestamp to gate_in_operations
  2. Add updated_by field to gate_in_operations
  3. Add updated_at timestamp to gate_out_operations
  4. Add updated_by field to gate_out_operations
  5. Create triggers to automatically update timestamps

  ## Notes
  - These fields help track when operations were last modified
  - updated_by stores the user who made the last modification
*/

-- Add audit fields to gate_in_operations
ALTER TABLE gate_in_operations 
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS updated_by text;

-- Add audit fields to gate_out_operations
ALTER TABLE gate_out_operations 
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS updated_by text;

-- Create function to update timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for gate_in_operations
DROP TRIGGER IF EXISTS update_gate_in_operations_updated_at ON gate_in_operations;
CREATE TRIGGER update_gate_in_operations_updated_at
  BEFORE UPDATE ON gate_in_operations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create trigger for gate_out_operations
DROP TRIGGER IF EXISTS update_gate_out_operations_updated_at ON gate_out_operations;
CREATE TRIGGER update_gate_out_operations_updated_at
  BEFORE UPDATE ON gate_out_operations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON COLUMN gate_in_operations.updated_at IS 'Timestamp of last update to this gate in operation';
COMMENT ON COLUMN gate_in_operations.updated_by IS 'User who last updated this gate in operation';
COMMENT ON COLUMN gate_out_operations.updated_at IS 'Timestamp of last update to this gate out operation';
COMMENT ON COLUMN gate_out_operations.updated_by IS 'User who last updated this gate out operation';
