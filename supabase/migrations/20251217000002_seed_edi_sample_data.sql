/*
  # EDI Management Sample Data and Performance Optimizations

  ## Overview
  This migration adds sample data for testing the EDI Management system and
  creates additional performance optimizations.

  ## Sample Data
  - Additional EDI server configurations for different scenarios
  - Sample client EDI settings for existing clients
  - Sample transmission logs for testing and demonstration

  ## Performance Optimizations
  - Additional indexes for complex queries
  - Materialized views for dashboard statistics
  - Query optimization hints
*/

-- Insert additional sample EDI server configurations
INSERT INTO edi_server_configurations (
  id,
  name,
  type,
  host,
  port,
  username,
  password,
  remote_path,
  enabled,
  test_mode,
  timeout,
  retry_attempts,
  partner_code,
  sender_code,
  file_name_pattern,
  assigned_clients,
  is_default
) VALUES 
(
  '00000000-0000-0000-0000-000000000002',
  'Maersk EDI Server',
  'SFTP',
  'edi.maersk.com',
  22,
  'depot_maersk',
  '', -- Password should be set through the application
  '/incoming/depot',
  true,
  false,
  45000,
  5,
  'MAEU',
  'DEPOT001',
  'CODECO_{timestamp}_{container}_{operation}.edi',
  '["MAERSK LINE", "MAEU", "MAERSK"]'::jsonb,
  false
),
(
  '00000000-0000-0000-0000-000000000003',
  'MSC EDI Server',
  'FTP',
  'edi.msc.com',
  21,
  'depot_msc',
  '', -- Password should be set through the application
  '/codeco/incoming',
  true,
  false,
  30000,
  3,
  'MSCU',
  'DEPOT001',
  'MSC_CODECO_{timestamp}_{container}.edi',
  '["MSC", "MEDITERRANEAN SHIPPING COMPANY", "MSCU"]'::jsonb,
  false
),
(
  '00000000-0000-0000-0000-000000000004',
  'CMA CGM EDI Server',
  'SFTP',
  'edi.cma-cgm.com',
  22,
  'depot_cmacgm',
  '', -- Password should be set through the application
  '/depot/codeco',
  true,
  false,
  60000,
  4,
  'CMDU',
  'DEPOT001',
  'CMACGM_CODECO_{timestamp}_{operation}_{container}.edi',
  '["CMA CGM", "CMDU", "CMA-CGM"]'::jsonb,
  false
),
(
  '00000000-0000-0000-0000-000000000005',
  'Test EDI Server',
  'SFTP',
  'test.edi.local',
  2222,
  'test_user',
  'test_password',
  '/test/codeco',
  true,
  true,
  15000,
  2,
  'TEST',
  'DEPOT001',
  'TEST_CODECO_{timestamp}_{container}_{operation}.edi',
  '["TEST CLIENT", "TEST"]'::jsonb,
  false
) ON CONFLICT (id) DO NOTHING;

-- Create sample client EDI settings for existing clients (if they exist)
-- This will only insert if the clients exist in the clients table
INSERT INTO edi_client_settings (
  client_id,
  client_code,
  client_name,
  edi_enabled,
  enable_gate_in,
  enable_gate_out,
  server_config_id,
  priority,
  notes
)
SELECT 
  c.id,
  c.code,
  c.name,
  true,
  true,
  true,
  (CASE 
    WHEN c.code ILIKE '%MAEU%' OR c.name ILIKE '%MAERSK%' THEN '00000000-0000-0000-0000-000000000002'
    WHEN c.code ILIKE '%MSCU%' OR c.name ILIKE '%MSC%' THEN '00000000-0000-0000-0000-000000000003'
    WHEN c.code ILIKE '%CMDU%' OR c.name ILIKE '%CMA%' THEN '00000000-0000-0000-0000-000000000004'
    WHEN c.code ILIKE '%TEST%' OR c.name ILIKE '%TEST%' THEN '00000000-0000-0000-0000-000000000005'
    ELSE '00000000-0000-0000-0000-000000000001'
  END)::uuid,
  CASE 
    WHEN c.code ILIKE '%MAEU%' OR c.code ILIKE '%MSCU%' OR c.code ILIKE '%CMDU%' THEN 'high'
    ELSE 'normal'
  END,
  'Auto-configured EDI settings based on client code/name matching'
FROM clients c
WHERE c.active = true
  AND NOT EXISTS (
    SELECT 1 FROM edi_client_settings ecs WHERE ecs.client_id = c.id
  )
  AND EXISTS (
    SELECT 1 FROM edi_server_configurations esc 
    WHERE esc.id = (CASE 
      WHEN c.code ILIKE '%MAEU%' OR c.name ILIKE '%MAERSK%' THEN '00000000-0000-0000-0000-000000000002'
      WHEN c.code ILIKE '%MSCU%' OR c.name ILIKE '%MSC%' THEN '00000000-0000-0000-0000-000000000003'
      WHEN c.code ILIKE '%CMDU%' OR c.name ILIKE '%CMA%' THEN '00000000-0000-0000-0000-000000000004'
      WHEN c.code ILIKE '%TEST%' OR c.name ILIKE '%TEST%' THEN '00000000-0000-0000-0000-000000000005'
      ELSE '00000000-0000-0000-0000-000000000001'
    END)::uuid
  );

-- Create sample transmission logs for demonstration (only if containers exist)
INSERT INTO edi_transmission_logs (
  container_number,
  operation,
  status,
  attempts,
  last_attempt,
  file_name,
  file_size,
  file_content,
  partner_code,
  config_id,
  uploaded_to_sftp,
  acknowledgment_received,
  container_id,
  client_id,
  created_at
)
SELECT 
  c.number,
  CASE WHEN random() > 0.5 THEN 'GATE_IN' ELSE 'GATE_OUT' END,
  CASE 
    WHEN random() > 0.9 THEN 'failed'
    WHEN random() > 0.8 THEN 'pending'
    ELSE 'success'
  END,
  CASE 
    WHEN random() > 0.9 THEN floor(random() * 3) + 2
    ELSE 1
  END,
  NOW() - (random() * INTERVAL '7 days'),
  'CODECO_' || to_char(NOW() - (random() * INTERVAL '7 days'), 'YYYYMMDDHH24MISS') || '_' || c.number || '_GATE_IN.edi',
  floor(random() * 2000) + 500,
  'UNB+UNOC:3+DEPOT001+' || COALESCE(cl.code, 'UNKNOWN') || '+' || to_char(NOW(), 'YYYYMMDDHH24MI') || '+1''UNH+1+CODECO:D:95B:UN''BGM+34+' || c.number || '+9''DTM+137:' || to_char(NOW(), 'YYYYMMDD') || ':102''NAD+CA+DEPOT001''EQD+CN+' || c.number || '+22G1''UNT+6+1''UNZ+1+1''',
  COALESCE(cl.code, 'DEPOT'),
  COALESCE(ecs.server_config_id, '00000000-0000-0000-0000-000000000001'::uuid),
  CASE WHEN random() > 0.1 THEN true ELSE false END,
  CASE WHEN random() > 0.2 THEN NOW() - (random() * INTERVAL '6 days') ELSE NULL END,
  c.id,
  c.client_id,
  NOW() - (random() * INTERVAL '7 days')
FROM containers c
LEFT JOIN clients cl ON c.client_id = cl.id
LEFT JOIN edi_client_settings ecs ON cl.id = ecs.client_id
WHERE c.created_at >= CURRENT_DATE - INTERVAL '30 days'
  AND random() > 0.7 -- Only create logs for ~30% of containers
LIMIT 100; -- Limit to 100 sample logs

-- Create additional performance indexes
CREATE INDEX IF NOT EXISTS idx_edi_transmission_logs_client_operation ON edi_transmission_logs(client_id, operation);
CREATE INDEX IF NOT EXISTS idx_edi_transmission_logs_status_created_at ON edi_transmission_logs(status, created_at);
CREATE INDEX IF NOT EXISTS idx_edi_transmission_logs_partner_code ON edi_transmission_logs(partner_code);
CREATE INDEX IF NOT EXISTS idx_edi_transmission_logs_uploaded_sftp ON edi_transmission_logs(uploaded_to_sftp);

CREATE INDEX IF NOT EXISTS idx_edi_client_settings_edi_enabled ON edi_client_settings(edi_enabled) WHERE edi_enabled = true;
CREATE INDEX IF NOT EXISTS idx_edi_client_settings_priority ON edi_client_settings(priority);

CREATE INDEX IF NOT EXISTS idx_edi_server_configs_assigned_clients ON edi_server_configurations USING GIN (assigned_clients);

-- Create composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_edi_logs_client_status_date ON edi_transmission_logs(client_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_edi_logs_config_operation_date ON edi_transmission_logs(config_id, operation, created_at DESC);

-- Create materialized view for dashboard statistics (refreshed periodically)
CREATE MATERIALIZED VIEW IF NOT EXISTS edi_dashboard_stats AS
SELECT 
  -- Overall statistics
  COUNT(*) as total_transmissions,
  COUNT(*) FILTER (WHERE status = 'success') as successful_transmissions,
  COUNT(*) FILTER (WHERE status = 'failed') as failed_transmissions,
  COUNT(*) FILTER (WHERE status IN ('pending', 'retrying')) as pending_transmissions,
  ROUND(
    CASE 
      WHEN COUNT(*) > 0 THEN 
        (COUNT(*) FILTER (WHERE status = 'success')::numeric / COUNT(*)::numeric) * 100
      ELSE 0 
    END, 2
  ) as success_rate,
  
  -- By operation type
  COUNT(*) FILTER (WHERE operation = 'GATE_IN') as gate_in_transmissions,
  COUNT(*) FILTER (WHERE operation = 'GATE_OUT') as gate_out_transmissions,
  
  -- By time periods
  COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) as today_transmissions,
  COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as week_transmissions,
  COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as month_transmissions,
  
  -- Server statistics
  COUNT(DISTINCT config_id) as active_servers,
  COUNT(DISTINCT client_id) as clients_with_transmissions,
  
  -- Performance metrics
  AVG(attempts) as avg_attempts,
  MAX(created_at) as last_transmission_date,
  
  -- Current timestamp for cache invalidation
  NOW() as last_updated
FROM edi_transmission_logs
WHERE created_at >= CURRENT_DATE - INTERVAL '90 days';

-- Create unique index on materialized view (required for concurrent refresh)
CREATE UNIQUE INDEX IF NOT EXISTS idx_edi_dashboard_stats_unique ON edi_dashboard_stats (last_updated);

-- Create function to refresh dashboard statistics
CREATE OR REPLACE FUNCTION refresh_edi_dashboard_stats()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY edi_dashboard_stats;
END;
$$ LANGUAGE plpgsql;

-- Create materialized view for client performance metrics
CREATE MATERIALIZED VIEW IF NOT EXISTS edi_client_performance AS
SELECT 
  c.id as client_id,
  c.code as client_code,
  c.name as client_name,
  
  -- Transmission statistics
  COUNT(etl.id) as total_transmissions,
  COUNT(etl.id) FILTER (WHERE etl.status = 'success') as successful_transmissions,
  COUNT(etl.id) FILTER (WHERE etl.status = 'failed') as failed_transmissions,
  ROUND(
    CASE 
      WHEN COUNT(etl.id) > 0 THEN 
        (COUNT(etl.id) FILTER (WHERE etl.status = 'success')::numeric / COUNT(etl.id)::numeric) * 100
      ELSE 0 
    END, 2
  ) as success_rate,
  
  -- Performance metrics
  AVG(etl.attempts) as avg_attempts,
  AVG(etl.file_size) as avg_file_size,
  
  -- Time metrics
  MIN(etl.created_at) as first_transmission,
  MAX(etl.created_at) as last_transmission,
  
  -- Operation breakdown
  COUNT(etl.id) FILTER (WHERE etl.operation = 'GATE_IN') as gate_in_count,
  COUNT(etl.id) FILTER (WHERE etl.operation = 'GATE_OUT') as gate_out_count,
  
  -- Server usage
  COUNT(DISTINCT etl.config_id) as servers_used,
  
  -- Current timestamp
  NOW() as last_updated
FROM clients c
LEFT JOIN edi_transmission_logs etl ON c.id = etl.client_id 
  AND etl.created_at >= CURRENT_DATE - INTERVAL '90 days'
WHERE c.active = true
GROUP BY c.id, c.code, c.name;

-- Create unique index for client performance view
CREATE UNIQUE INDEX IF NOT EXISTS idx_edi_client_performance_unique ON edi_client_performance (client_id, last_updated);

-- Create function to refresh client performance metrics
CREATE OR REPLACE FUNCTION refresh_edi_client_performance()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY edi_client_performance;
END;
$$ LANGUAGE plpgsql;

-- Create function to get real-time EDI statistics (uses materialized views when possible)
CREATE OR REPLACE FUNCTION get_edi_realtime_stats()
RETURNS TABLE (
  total_operations bigint,
  operations_with_edi bigint,
  clients_with_edi bigint,
  total_clients bigint,
  success_rate numeric,
  servers_configured bigint,
  last_transmission timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    -- Total operations from gate operations
    (
      SELECT COUNT(*) 
      FROM (
        SELECT 1 FROM gate_in_operations WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
        UNION ALL
        SELECT 1 FROM gate_out_operations WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
      ) ops
    ) as total_operations,
    
    -- Operations with EDI
    (
      SELECT COUNT(*) 
      FROM (
        SELECT 1 FROM gate_in_operations WHERE edi_transmitted = true AND created_at >= CURRENT_DATE - INTERVAL '30 days'
        UNION ALL
        SELECT 1 FROM gate_out_operations WHERE edi_transmitted = true AND created_at >= CURRENT_DATE - INTERVAL '30 days'
      ) ops_edi
    ) as operations_with_edi,
    
    -- Clients with EDI enabled
    (
      SELECT COUNT(DISTINCT c.id)
      FROM clients c
      LEFT JOIN edi_client_settings ecs ON c.id = ecs.client_id
      WHERE c.active = true 
        AND (c.auto_edi = true OR ecs.edi_enabled = true)
    ) as clients_with_edi,
    
    -- Total active clients
    (SELECT COUNT(*) FROM clients WHERE active = true) as total_clients,
    
    -- Success rate from dashboard stats
    COALESCE((SELECT success_rate FROM edi_dashboard_stats LIMIT 1), 0) as success_rate,
    
    -- Configured servers
    (SELECT COUNT(*) FROM edi_server_configurations WHERE enabled = true) as servers_configured,
    
    -- Last transmission
    (SELECT MAX(created_at) FROM edi_transmission_logs) as last_transmission;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions on new objects
GRANT SELECT ON edi_dashboard_stats TO authenticated;
GRANT SELECT ON edi_client_performance TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_edi_dashboard_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_edi_client_performance() TO authenticated;
GRANT EXECUTE ON FUNCTION get_edi_realtime_stats() TO authenticated;

-- Create a function to initialize EDI settings for existing clients
CREATE OR REPLACE FUNCTION initialize_client_edi_settings()
RETURNS integer AS $$
DECLARE
  v_count integer := 0;
  client_rec record;
BEGIN
  -- Loop through clients that don't have EDI settings but have auto_edi enabled
  FOR client_rec IN 
    SELECT c.id, c.code, c.name, c.auto_edi
    FROM clients c
    WHERE c.active = true 
      AND c.auto_edi = true
      AND NOT EXISTS (
        SELECT 1 FROM edi_client_settings ecs WHERE ecs.client_id = c.id
      )
  LOOP
    -- Create EDI settings for this client
    INSERT INTO edi_client_settings (
      client_id,
      client_code,
      client_name,
      edi_enabled,
      enable_gate_in,
      enable_gate_out,
      server_config_id,
      priority,
      notes
    ) VALUES (
      client_rec.id,
      client_rec.code,
      client_rec.name,
      true,
      true,
      true,
      '00000000-0000-0000-0000-000000000001'::uuid,
      'normal',
      'Auto-initialized from client auto_edi setting'
    );
    
    v_count := v_count + 1;
  END LOOP;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Initialize EDI settings for existing clients with auto_edi enabled
SELECT initialize_client_edi_settings();

-- Create indexes on gate operations for EDI queries
CREATE INDEX IF NOT EXISTS idx_gate_in_operations_edi_transmitted ON gate_in_operations(edi_transmitted, created_at) WHERE edi_transmitted = true;
CREATE INDEX IF NOT EXISTS idx_gate_out_operations_edi_transmitted ON gate_out_operations(edi_transmitted, created_at) WHERE edi_transmitted = true;
CREATE INDEX IF NOT EXISTS idx_gate_in_operations_client_code_edi ON gate_in_operations(client_code, edi_transmitted);
CREATE INDEX IF NOT EXISTS idx_gate_out_operations_client_code_edi ON gate_out_operations(client_code, edi_transmitted);

-- Refresh materialized views initially
SELECT refresh_edi_dashboard_stats();
SELECT refresh_edi_client_performance();

-- Add comments to tables for documentation
COMMENT ON TABLE edi_server_configurations IS 'EDI server configurations for FTP/SFTP connections to trading partners';
COMMENT ON TABLE edi_client_settings IS 'Client-specific EDI configuration settings and preferences';
COMMENT ON TABLE edi_transmission_logs IS 'Complete log of all EDI transmissions with status tracking';

COMMENT ON COLUMN edi_server_configurations.assigned_clients IS 'JSON array of client codes/names assigned to this server configuration';
COMMENT ON COLUMN edi_server_configurations.file_name_pattern IS 'Pattern for generating EDI file names. Supports {timestamp}, {container}, {operation} placeholders';
COMMENT ON COLUMN edi_client_settings.priority IS 'Processing priority: high, normal, or low';
COMMENT ON COLUMN edi_transmission_logs.gate_operation_id IS 'Reference to the gate operation that triggered this EDI transmission';

-- Create a summary function for EDI system health
CREATE OR REPLACE FUNCTION get_edi_system_health()
RETURNS TABLE (
  component text,
  status text,
  details jsonb
) AS $$
BEGIN
  -- Server configurations health
  RETURN QUERY
  SELECT 
    'Server Configurations' as component,
    CASE 
      WHEN COUNT(*) FILTER (WHERE enabled = true) = 0 THEN 'ERROR'
      WHEN COUNT(*) FILTER (WHERE enabled = true) = 1 AND bool_or(is_default) THEN 'WARNING'
      ELSE 'OK'
    END as status,
    jsonb_build_object(
      'total_servers', COUNT(*),
      'enabled_servers', COUNT(*) FILTER (WHERE enabled = true),
      'default_server_exists', bool_or(is_default AND enabled),
      'servers_with_clients', COUNT(*) FILTER (WHERE jsonb_array_length(assigned_clients) > 0)
    ) as details
  FROM edi_server_configurations;
  
  -- Client settings health
  RETURN QUERY
  SELECT 
    'Client Settings' as component,
    CASE 
      WHEN clients_with_edi_settings = 0 THEN 'WARNING'
      WHEN clients_with_edi_settings < total_active_clients * 0.5 THEN 'WARNING'
      ELSE 'OK'
    END as status,
    jsonb_build_object(
      'total_active_clients', total_active_clients,
      'clients_with_edi_settings', clients_with_edi_settings,
      'clients_with_edi_enabled', clients_with_edi_enabled,
      'coverage_percentage', ROUND((clients_with_edi_settings::numeric / NULLIF(total_active_clients, 0)::numeric) * 100, 2)
    ) as details
  FROM (
    SELECT 
      COUNT(*) FILTER (WHERE c.active = true) as total_active_clients,
      COUNT(ecs.id) as clients_with_edi_settings,
      COUNT(*) FILTER (WHERE ecs.edi_enabled = true) as clients_with_edi_enabled
    FROM clients c
    LEFT JOIN edi_client_settings ecs ON c.id = ecs.client_id
  ) stats;
  
  -- Transmission health (last 24 hours)
  RETURN QUERY
  SELECT 
    'Recent Transmissions' as component,
    CASE 
      WHEN total_transmissions = 0 THEN 'INFO'
      WHEN success_rate < 80 THEN 'ERROR'
      WHEN success_rate < 95 THEN 'WARNING'
      ELSE 'OK'
    END as status,
    jsonb_build_object(
      'total_transmissions_24h', total_transmissions,
      'successful_transmissions', successful_transmissions,
      'failed_transmissions', failed_transmissions,
      'success_rate', success_rate,
      'avg_attempts', avg_attempts
    ) as details
  FROM (
    SELECT 
      COUNT(*) as total_transmissions,
      COUNT(*) FILTER (WHERE status = 'success') as successful_transmissions,
      COUNT(*) FILTER (WHERE status = 'failed') as failed_transmissions,
      CASE 
        WHEN COUNT(*) > 0 THEN 
          ROUND((COUNT(*) FILTER (WHERE status = 'success')::numeric / COUNT(*)::numeric) * 100, 2)
        ELSE 0 
      END as success_rate,
      ROUND(AVG(attempts), 2) as avg_attempts
    FROM edi_transmission_logs
    WHERE created_at >= CURRENT_DATE - INTERVAL '24 hours'
  ) recent_stats;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION get_edi_system_health() TO authenticated;
GRANT EXECUTE ON FUNCTION initialize_client_edi_settings() TO authenticated;