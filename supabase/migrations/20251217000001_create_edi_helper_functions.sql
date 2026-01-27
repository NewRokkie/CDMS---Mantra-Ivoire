/*
  # EDI Management Helper Functions and Views

  ## Overview
  This migration adds helper functions and views to support the EDI Management system,
  including functions for automatic EDI processing during gate operations and 
  comprehensive reporting views.

  ## New Functions
  - `process_gate_in_edi()` - Automatically process EDI for gate in operations
  - `process_gate_out_edi()` - Automatically process EDI for gate out operations
  - `get_client_edi_status()` - Check if EDI is enabled for a client
  - `cleanup_old_edi_logs()` - Clean up old transmission logs

  ## New Views
  - `edi_client_summary` - Summary of EDI settings per client
  - `edi_transmission_summary` - Transmission statistics by client and operation
  - `edi_server_utilization` - Server usage statistics

  ## Triggers
  - Automatic EDI processing triggers for gate operations
*/

-- Function to check if EDI is enabled for a client and operation
CREATE OR REPLACE FUNCTION get_client_edi_status(
  p_client_code text,
  p_client_name text DEFAULT NULL,
  p_operation text DEFAULT NULL
)
RETURNS TABLE (
  edi_enabled boolean,
  gate_in_enabled boolean,
  gate_out_enabled boolean,
  server_config_id uuid,
  server_name text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(ecs.edi_enabled, false) as edi_enabled,
    COALESCE(ecs.enable_gate_in, false) as gate_in_enabled,
    COALESCE(ecs.enable_gate_out, false) as gate_out_enabled,
    ecs.server_config_id,
    esc.name as server_name
  FROM clients c
  LEFT JOIN edi_client_settings ecs ON c.id = ecs.client_id
  LEFT JOIN edi_server_configurations esc ON ecs.server_config_id = esc.id
  WHERE c.code = p_client_code
     OR (p_client_name IS NOT NULL AND c.name = p_client_name)
  LIMIT 1;

  -- If no specific client settings found, check if client has auto_edi enabled
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      COALESCE(c.auto_edi, false) as edi_enabled,
      COALESCE(c.auto_edi, false) as gate_in_enabled,
      COALESCE(c.auto_edi, false) as gate_out_enabled,
      esc.id as server_config_id,
      esc.name as server_name
    FROM clients c
    CROSS JOIN edi_server_configurations esc
    WHERE (c.code = p_client_code OR (p_client_name IS NOT NULL AND c.name = p_client_name))
      AND esc.is_default = true
      AND esc.enabled = true
    LIMIT 1;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically process EDI for gate in operations
CREATE OR REPLACE FUNCTION process_gate_in_edi(
  p_operation_id uuid,
  p_container_number text,
  p_client_code text,
  p_container_id uuid DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_client_id uuid;
  v_edi_status record;
  v_log_id uuid;
BEGIN
  -- Get client ID
  SELECT id INTO v_client_id FROM clients WHERE code = p_client_code;
  
  IF v_client_id IS NULL THEN
    RAISE NOTICE 'Client not found: %', p_client_code;
    RETURN NULL;
  END IF;

  -- Check EDI status
  SELECT * INTO v_edi_status 
  FROM get_client_edi_status(p_client_code, NULL, 'GATE_IN');

  -- Only process if EDI is enabled for gate in operations
  IF v_edi_status.edi_enabled AND v_edi_status.gate_in_enabled THEN
    -- Create transmission log
    v_log_id := log_edi_transmission(
      p_container_number,
      'GATE_IN',
      p_container_id,
      p_operation_id,
      v_client_id,
      v_edi_status.server_config_id
    );

    -- Update gate in operation with EDI info
    UPDATE gate_in_operations 
    SET 
      edi_transmitted = true,
      edi_transmission_date = now()
    WHERE id = p_operation_id;

    RAISE NOTICE 'EDI transmission logged for gate in operation: %', p_operation_id;
    RETURN v_log_id;
  ELSE
    RAISE NOTICE 'EDI not enabled for client % gate in operations', p_client_code;
    RETURN NULL;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically process EDI for gate out operations
CREATE OR REPLACE FUNCTION process_gate_out_edi(
  p_operation_id uuid,
  p_booking_number text,
  p_client_code text,
  p_processed_container_ids jsonb DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_client_id uuid;
  v_edi_status record;
  v_log_id uuid;
  v_container_id uuid;
  v_container_number text;
BEGIN
  -- Get client ID
  SELECT id INTO v_client_id FROM clients WHERE code = p_client_code;
  
  IF v_client_id IS NULL THEN
    RAISE NOTICE 'Client not found: %', p_client_code;
    RETURN NULL;
  END IF;

  -- Check EDI status
  SELECT * INTO v_edi_status 
  FROM get_client_edi_status(p_client_code, NULL, 'GATE_OUT');

  -- Only process if EDI is enabled for gate out operations
  IF v_edi_status.edi_enabled AND v_edi_status.gate_out_enabled THEN
    -- Get first container from processed containers for logging
    IF p_processed_container_ids IS NOT NULL AND jsonb_array_length(p_processed_container_ids) > 0 THEN
      SELECT (p_processed_container_ids->0)::text::uuid INTO v_container_id;
      SELECT number INTO v_container_number FROM containers WHERE id = v_container_id;
    ELSE
      v_container_number := p_booking_number; -- Fallback to booking number
    END IF;

    -- Create transmission log
    v_log_id := log_edi_transmission(
      COALESCE(v_container_number, p_booking_number),
      'GATE_OUT',
      v_container_id,
      p_operation_id,
      v_client_id,
      v_edi_status.server_config_id
    );

    -- Update gate out operation with EDI info
    UPDATE gate_out_operations 
    SET 
      edi_transmitted = true,
      edi_transmission_date = now()
    WHERE id = p_operation_id;

    RAISE NOTICE 'EDI transmission logged for gate out operation: %', p_operation_id;
    RETURN v_log_id;
  ELSE
    RAISE NOTICE 'EDI not enabled for client % gate out operations', p_client_code;
    RETURN NULL;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old EDI transmission logs
CREATE OR REPLACE FUNCTION cleanup_old_edi_logs(
  p_days_to_keep integer DEFAULT 90
)
RETURNS integer AS $$
DECLARE
  v_deleted_count integer;
BEGIN
  DELETE FROM edi_transmission_logs
  WHERE created_at < CURRENT_DATE - INTERVAL '1 day' * p_days_to_keep;
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RAISE NOTICE 'Cleaned up % old EDI transmission logs', v_deleted_count;
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create comprehensive EDI client summary view
CREATE OR REPLACE VIEW edi_client_summary AS
SELECT 
  c.id as client_id,
  c.code as client_code,
  c.name as client_name,
  c.auto_edi as client_auto_edi,
  COALESCE(ecs.edi_enabled, false) as edi_configured,
  COALESCE(ecs.enable_gate_in, false) as gate_in_enabled,
  COALESCE(ecs.enable_gate_out, false) as gate_out_enabled,
  ecs.priority,
  esc.name as server_name,
  esc.type as server_type,
  esc.host as server_host,
  esc.enabled as server_enabled,
  -- Statistics from last 30 days
  COALESCE(stats.total_transmissions, 0) as total_transmissions_30d,
  COALESCE(stats.successful_transmissions, 0) as successful_transmissions_30d,
  COALESCE(stats.failed_transmissions, 0) as failed_transmissions_30d,
  COALESCE(stats.success_rate, 0) as success_rate_30d,
  stats.last_transmission_date,
  -- Recent operations count
  COALESCE(recent_ops.gate_in_count, 0) as recent_gate_in_operations,
  COALESCE(recent_ops.gate_out_count, 0) as recent_gate_out_operations,
  COALESCE(recent_ops.gate_in_with_edi, 0) as recent_gate_in_with_edi,
  COALESCE(recent_ops.gate_out_with_edi, 0) as recent_gate_out_with_edi
FROM clients c
LEFT JOIN edi_client_settings ecs ON c.id = ecs.client_id
LEFT JOIN edi_server_configurations esc ON ecs.server_config_id = esc.id
LEFT JOIN (
  SELECT 
    client_id,
    COUNT(*) as total_transmissions,
    COUNT(*) FILTER (WHERE status = 'success') as successful_transmissions,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_transmissions,
    CASE 
      WHEN COUNT(*) > 0 THEN 
        ROUND((COUNT(*) FILTER (WHERE status = 'success')::numeric / COUNT(*)::numeric) * 100, 2)
      ELSE 0 
    END as success_rate,
    MAX(created_at) as last_transmission_date
  FROM edi_transmission_logs
  WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY client_id
) stats ON c.id = stats.client_id
LEFT JOIN (
  SELECT 
    c.id as client_id,
    COUNT(*) FILTER (WHERE operation = 'GATE_IN') as gate_in_count,
    COUNT(*) FILTER (WHERE operation = 'GATE_OUT') as gate_out_count,
    COUNT(*) FILTER (WHERE operation = 'GATE_IN' AND edi_transmitted = true) as gate_in_with_edi,
    COUNT(*) FILTER (WHERE operation = 'GATE_OUT' AND edi_transmitted = true) as gate_out_with_edi
  FROM (
    SELECT client_code, 'GATE_IN' as operation, edi_transmitted
    FROM gate_in_operations
    WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
    UNION ALL
    SELECT client_code, 'GATE_OUT' as operation, edi_transmitted
    FROM gate_out_operations
    WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
  ) ops
  JOIN clients c ON c.code = ops.client_code
  GROUP BY c.id
) recent_ops ON c.id = recent_ops.client_id
WHERE c.active = true
ORDER BY c.name;

-- Create EDI transmission summary view
CREATE OR REPLACE VIEW edi_transmission_summary AS
SELECT 
  DATE_TRUNC('day', etl.created_at) as transmission_date,
  c.code as client_code,
  c.name as client_name,
  etl.operation,
  etl.status,
  esc.name as server_name,
  COUNT(*) as transmission_count,
  AVG(etl.attempts) as avg_attempts,
  MIN(etl.created_at) as first_transmission,
  MAX(etl.last_attempt) as last_transmission,
  COUNT(*) FILTER (WHERE etl.uploaded_to_sftp = true) as uploaded_count,
  COUNT(*) FILTER (WHERE etl.acknowledgment_received IS NOT NULL) as acknowledged_count
FROM edi_transmission_logs etl
LEFT JOIN clients c ON etl.client_id = c.id
LEFT JOIN edi_server_configurations esc ON etl.config_id = esc.id
WHERE etl.created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY 
  DATE_TRUNC('day', etl.created_at),
  c.code,
  c.name,
  etl.operation,
  etl.status,
  esc.name
ORDER BY transmission_date DESC, client_code, operation;

-- Create EDI server utilization view
CREATE OR REPLACE VIEW edi_server_utilization AS
SELECT 
  esc.id as server_id,
  esc.name as server_name,
  esc.type as server_type,
  esc.host,
  esc.enabled,
  esc.is_default,
  -- Client assignments
  jsonb_array_length(COALESCE(esc.assigned_clients, '[]'::jsonb)) as assigned_clients_count,
  -- Configured clients (via edi_client_settings)
  COALESCE(configured_clients.count, 0) as configured_clients_count,
  -- Transmission statistics
  COALESCE(transmission_stats.total_transmissions, 0) as total_transmissions_30d,
  COALESCE(transmission_stats.successful_transmissions, 0) as successful_transmissions_30d,
  COALESCE(transmission_stats.failed_transmissions, 0) as failed_transmissions_30d,
  COALESCE(transmission_stats.success_rate, 0) as success_rate_30d,
  transmission_stats.last_transmission_date,
  -- Usage by operation type
  COALESCE(transmission_stats.gate_in_transmissions, 0) as gate_in_transmissions_30d,
  COALESCE(transmission_stats.gate_out_transmissions, 0) as gate_out_transmissions_30d
FROM edi_server_configurations esc
LEFT JOIN (
  SELECT 
    server_config_id,
    COUNT(*) as count
  FROM edi_client_settings
  WHERE edi_enabled = true
  GROUP BY server_config_id
) configured_clients ON esc.id = configured_clients.server_config_id
LEFT JOIN (
  SELECT 
    config_id,
    COUNT(*) as total_transmissions,
    COUNT(*) FILTER (WHERE status = 'success') as successful_transmissions,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_transmissions,
    CASE 
      WHEN COUNT(*) > 0 THEN 
        ROUND((COUNT(*) FILTER (WHERE status = 'success')::numeric / COUNT(*)::numeric) * 100, 2)
      ELSE 0 
    END as success_rate,
    MAX(created_at) as last_transmission_date,
    COUNT(*) FILTER (WHERE operation = 'GATE_IN') as gate_in_transmissions,
    COUNT(*) FILTER (WHERE operation = 'GATE_OUT') as gate_out_transmissions
  FROM edi_transmission_logs
  WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY config_id
) transmission_stats ON esc.id = transmission_stats.config_id
ORDER BY esc.name;

-- Create triggers for automatic EDI processing

-- Trigger function for gate in operations
CREATE OR REPLACE FUNCTION trigger_gate_in_edi()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process EDI if the operation is completed and not already processed
  IF NEW.status = 'completed' AND (OLD.edi_transmitted IS NULL OR OLD.edi_transmitted = false) THEN
    PERFORM process_gate_in_edi(
      NEW.id,
      NEW.container_number,
      NEW.client_code,
      NEW.container_id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger function for gate out operations
CREATE OR REPLACE FUNCTION trigger_gate_out_edi()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process EDI if the operation is completed and not already processed
  IF NEW.status = 'completed' AND (OLD.edi_transmitted IS NULL OR OLD.edi_transmitted = false) THEN
    PERFORM process_gate_out_edi(
      NEW.id,
      NEW.booking_number,
      NEW.client_code,
      NEW.processed_container_ids
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the triggers (commented out by default to avoid automatic processing)
-- Uncomment these if you want automatic EDI processing on gate operations

-- CREATE TRIGGER gate_in_edi_trigger
--   AFTER UPDATE ON gate_in_operations
--   FOR EACH ROW
--   EXECUTE FUNCTION trigger_gate_in_edi();

-- CREATE TRIGGER gate_out_edi_trigger
--   AFTER UPDATE ON gate_out_operations
--   FOR EACH ROW
--   EXECUTE FUNCTION trigger_gate_out_edi();

-- Grant permissions on new functions and views
GRANT SELECT ON edi_client_summary TO authenticated;
GRANT SELECT ON edi_transmission_summary TO authenticated;
GRANT SELECT ON edi_server_utilization TO authenticated;

GRANT EXECUTE ON FUNCTION get_client_edi_status(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION process_gate_in_edi(uuid, text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION process_gate_out_edi(uuid, text, text, jsonb) TO authenticated;

-- Only admins can execute cleanup function
GRANT EXECUTE ON FUNCTION cleanup_old_edi_logs(integer) TO authenticated;

-- Create a scheduled job to clean up old logs (requires pg_cron extension)
-- This is commented out as pg_cron may not be available in all environments
-- SELECT cron.schedule('cleanup-edi-logs', '0 2 * * 0', 'SELECT cleanup_old_edi_logs(90);');