/*
  # Add EDI Fields to Gate Operations Tables

  ## Overview
  This migration adds EDI-related fields to the gate_in_operations and gate_out_operations tables
  to track EDI transmission status directly on the operations.

  ## Changes

  ### gate_in_operations table
  - Add `edi_transmitted` (boolean) - Whether EDI was transmitted for this operation
  - Add `edi_transmission_date` (timestamptz) - When EDI was transmitted
  - Add `edi_log_id` (uuid) - Reference to edi_transmission_logs table
  - Add `edi_error_message` (text) - Error message if EDI transmission failed

  ### gate_out_operations table
  - Add same EDI fields as gate_in_operations

  ## Indexes
  - Add indexes for EDI-related queries

  ## Notes
  - Fields are nullable to maintain compatibility with existing operations
  - Default values ensure backward compatibility
*/

-- Add EDI fields to gate_in_operations table
ALTER TABLE gate_in_operations 
ADD COLUMN IF NOT EXISTS edi_transmitted boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS edi_transmission_date timestamptz,
ADD COLUMN IF NOT EXISTS edi_log_id uuid REFERENCES edi_transmission_logs(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS edi_error_message text;

-- Add EDI fields to gate_out_operations table (if it exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'gate_out_operations') THEN
    ALTER TABLE gate_out_operations 
    ADD COLUMN IF NOT EXISTS edi_transmitted boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS edi_transmission_date timestamptz,
    ADD COLUMN IF NOT EXISTS edi_log_id uuid REFERENCES edi_transmission_logs(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS edi_error_message text;
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_gate_in_operations_edi_transmitted ON gate_in_operations(edi_transmitted);
CREATE INDEX IF NOT EXISTS idx_gate_in_operations_edi_transmission_date ON gate_in_operations(edi_transmission_date);
CREATE INDEX IF NOT EXISTS idx_gate_in_operations_edi_log_id ON gate_in_operations(edi_log_id);

-- Create indexes for gate_out_operations if it exists
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'gate_out_operations') THEN
    CREATE INDEX IF NOT EXISTS idx_gate_out_operations_edi_transmitted ON gate_out_operations(edi_transmitted);
    CREATE INDEX IF NOT EXISTS idx_gate_out_operations_edi_transmission_date ON gate_out_operations(edi_transmission_date);
    CREATE INDEX IF NOT EXISTS idx_gate_out_operations_edi_log_id ON gate_out_operations(edi_log_id);
  END IF;
END $$;

-- Create helper function to automatically create EDI transmission log when gate operation is completed
CREATE OR REPLACE FUNCTION auto_create_edi_transmission_on_gate_completion()
RETURNS TRIGGER AS $
DECLARE
  v_client_id uuid;
  v_client_code text;
  v_client_name text;
  v_edi_log_id uuid;
  v_operation_type text;
BEGIN
  -- Only process when status changes to 'completed' and container is assigned
  IF NEW.status = 'completed' AND NEW.assigned_location IS NOT NULL AND 
     (OLD.status IS NULL OR OLD.status != 'completed') THEN
    
    -- Determine operation type based on table
    IF TG_TABLE_NAME = 'gate_in_operations' THEN
      v_operation_type := 'GATE_IN';
    ELSIF TG_TABLE_NAME = 'gate_out_operations' THEN
      v_operation_type := 'GATE_OUT';
    ELSE
      RETURN NEW; -- Unknown table, skip EDI processing
    END IF;

    -- Get client information
    SELECT id, code, name INTO v_client_id, v_client_code, v_client_name
    FROM clients 
    WHERE code = NEW.client_code;

    -- Check if client has EDI enabled
    IF EXISTS (
      SELECT 1 FROM get_edi_config_for_client(v_client_code, v_client_name)
      WHERE edi_enabled = true
    ) THEN
      -- Create EDI transmission log
      SELECT log_edi_transmission(
        NEW.container_number,
        v_operation_type,
        NEW.container_id,
        NEW.id,
        v_client_id
      ) INTO v_edi_log_id;

      -- Update the operation with EDI log reference
      NEW.edi_log_id := v_edi_log_id;
      NEW.edi_transmitted := false; -- Will be updated to true when transmission succeeds
    END IF;
  END IF;

  RETURN NEW;
END;
$ LANGUAGE plpgsql;

-- Create triggers for automatic EDI log creation
CREATE TRIGGER trigger_auto_create_edi_transmission_gate_in
  BEFORE UPDATE ON gate_in_operations
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_edi_transmission_on_gate_completion();

-- Create trigger for gate_out_operations if it exists
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'gate_out_operations') THEN
    CREATE TRIGGER trigger_auto_create_edi_transmission_gate_out
      BEFORE UPDATE ON gate_out_operations
      FOR EACH ROW
      EXECUTE FUNCTION auto_create_edi_transmission_on_gate_completion();
  END IF;
END $$;

-- Create view for gate operations with EDI status
CREATE OR REPLACE VIEW gate_operations_with_edi AS
SELECT 
  'GATE_IN' as operation_type,
  id,
  container_number,
  client_code,
  client_name,
  status,
  assigned_location,
  completed_at,
  edi_transmitted,
  edi_transmission_date,
  edi_log_id,
  edi_error_message,
  created_at,
  updated_at
FROM gate_in_operations
UNION ALL
SELECT 
  'GATE_OUT' as operation_type,
  id,
  container_number,
  client_code,
  client_name,
  status,
  assigned_location,
  completed_at,
  edi_transmitted,
  edi_transmission_date,
  edi_log_id,
  edi_error_message,
  created_at,
  updated_at
FROM gate_out_operations
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'gate_out_operations');

-- Grant permissions
GRANT SELECT ON gate_operations_with_edi TO authenticated;

-- Update existing completed operations to have edi_transmitted = false if not set
UPDATE gate_in_operations 
SET edi_transmitted = false 
WHERE status = 'completed' AND edi_transmitted IS NULL;

-- Update gate_out_operations if it exists
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'gate_out_operations') THEN
    UPDATE gate_out_operations 
    SET edi_transmitted = false 
    WHERE status = 'completed' AND edi_transmitted IS NULL;
  END IF;
END $$;