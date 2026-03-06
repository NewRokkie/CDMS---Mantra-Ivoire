-- ============================================
-- Migration: Fix EDI Trigger for Gate Out
-- Date: 2026-03-06
-- Description: Fix auto_create_edi_transmission_on_gate_completion to not check assigned_location for gate_out_operations
-- ============================================

CREATE OR REPLACE FUNCTION public.auto_create_edi_transmission_on_gate_completion() 
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_client_id uuid;
  v_client_code text;
  v_client_name text;
  v_edi_log_id uuid;
  v_operation_type text;
  v_should_process boolean := false;
BEGIN
  -- Determine operation type based on table
  IF TG_TABLE_NAME = 'gate_in_operations' THEN
    v_operation_type := 'GATE_IN';
    -- For Gate In: only process when status changes to 'completed' and container is assigned
    v_should_process := (NEW.status = 'completed' AND NEW.assigned_location IS NOT NULL AND 
                        (OLD.status IS NULL OR OLD.status != 'completed'));
  ELSIF TG_TABLE_NAME = 'gate_out_operations' THEN
    v_operation_type := 'GATE_OUT';
    -- For Gate Out: only process when status changes to 'completed'
    -- Note: gate_out_operations doesn't have assigned_location field
    v_should_process := (NEW.status = 'completed' AND 
                        (OLD.status IS NULL OR OLD.status != 'completed'));
  ELSE
    RETURN NEW; -- Unknown table, skip EDI processing
  END IF;

  -- Only process if conditions are met
  IF v_should_process THEN
    -- Get client information
    SELECT id, code, name INTO v_client_id, v_client_code, v_client_name
    FROM clients 
    WHERE code = NEW.client_code;

    -- Check if client has EDI enabled (only if EDI functions exist)
    IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'get_edi_config_for_client') THEN
      IF EXISTS (
        SELECT 1 FROM get_edi_config_for_client(v_client_code, v_client_name)
        WHERE edi_enabled = true
      ) THEN
        -- Create EDI transmission log (only if function exists)
        IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'log_edi_transmission') THEN
          -- For Gate In, use container_number; for Gate Out, we'll handle it differently
          IF TG_TABLE_NAME = 'gate_in_operations' THEN
            SELECT log_edi_transmission(
              NEW.container_number,
              v_operation_type,
              NEW.container_id,
              NEW.id,
              v_client_id
            ) INTO v_edi_log_id;
          ELSIF TG_TABLE_NAME = 'gate_out_operations' THEN
            -- For Gate Out, we don't have a single container_number in the operation
            -- EDI transmission will be handled by the application code
            -- Just mark that EDI should be processed
            NULL; -- No log creation here for Gate Out
          END IF;

          -- Update the operation with EDI log reference (only for Gate In)
          IF v_edi_log_id IS NOT NULL THEN
            NEW.edi_log_id := v_edi_log_id;
            NEW.edi_transmitted := false; -- Will be updated to true when transmission succeeds
          END IF;
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Add comment
COMMENT ON FUNCTION public.auto_create_edi_transmission_on_gate_completion() IS 
'Trigger function to automatically create EDI transmission logs when gate operations are completed. Handles both gate_in_operations (with assigned_location check) and gate_out_operations (without assigned_location check).';
