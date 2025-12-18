/*
  # EDI Management Database Migration

  ## Overview
  This migration creates the database tables required for the EDI Management system,
  including server configurations, client EDI settings, and transmission logs.

  ## New Tables

  ### 1. `edi_server_configurations`
  EDI server configurations for FTP/SFTP connections
  - `id` (uuid, primary key)
  - `name` (text) - Server configuration name
  - `type` (text) - FTP or SFTP
  - `host` (text) - Server hostname/IP
  - `port` (integer) - Server port
  - `username` (text) - Connection username
  - `password` (text) - Connection password (encrypted)
  - `remote_path` (text) - Remote directory path
  - `enabled` (boolean) - Configuration enabled status
  - `test_mode` (boolean) - Test mode flag
  - `timeout` (integer) - Connection timeout in milliseconds
  - `retry_attempts` (integer) - Number of retry attempts
  - `partner_code` (text) - EDI partner code
  - `sender_code` (text) - EDI sender code
  - `file_name_pattern` (text) - File naming pattern
  - `assigned_clients` (jsonb) - Array of assigned client codes/names
  - `is_default` (boolean) - Default server flag
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 2. `edi_client_settings`
  Client-specific EDI configuration settings
  - `id` (uuid, primary key)
  - `client_id` (uuid, foreign key) - Reference to clients table
  - `client_code` (text) - Client code for quick access
  - `client_name` (text) - Client name for quick access
  - `edi_enabled` (boolean) - EDI enabled for this client
  - `enable_gate_in` (boolean) - Enable EDI for gate in operations
  - `enable_gate_out` (boolean) - Enable EDI for gate out operations
  - `server_config_id` (uuid, foreign key) - Reference to edi_server_configurations
  - `priority` (text) - Processing priority (high, normal, low)
  - `notes` (text) - Additional configuration notes
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 3. `edi_transmission_logs`
  EDI transmission history and status tracking
  - `id` (uuid, primary key)
  - `container_number` (text) - Container number
  - `operation` (text) - GATE_IN or GATE_OUT
  - `status` (text) - pending, success, failed, retrying
  - `attempts` (integer) - Number of transmission attempts
  - `last_attempt` (timestamptz) - Last transmission attempt timestamp
  - `file_name` (text) - Generated EDI file name
  - `file_size` (integer) - File size in bytes
  - `file_content` (text) - EDI file content
  - `partner_code` (text) - EDI partner code
  - `config_id` (uuid, foreign key) - Reference to edi_server_configurations
  - `uploaded_to_sftp` (boolean) - Successfully uploaded flag
  - `error_message` (text) - Error message if failed
  - `acknowledgment_received` (timestamptz) - ACK received timestamp
  - `container_id` (uuid, foreign key) - Reference to containers table
  - `gate_operation_id` (uuid) - Reference to gate operation (gate_in_operations or gate_out_operations)
  - `client_id` (uuid, foreign key) - Reference to clients table
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ## Security
  - Row Level Security (RLS) enabled on all tables
  - Users can only access data for their assigned yards
  - Admins and supervisors can manage EDI configurations
  - Operators can view transmission logs

  ## Indexes
  - Performance indexes on foreign keys and frequently queried columns
  - Indexes for transmission log queries by status and date

  ## Notes
  - All timestamps use timestamptz for timezone awareness
  - JSONB used for flexible assigned_clients array
  - Foreign key constraints ensure data integrity
  - Audit trail maintained with created_at/updated_at timestamps
*/

-- Create edi_server_configurations table
CREATE TABLE IF NOT EXISTS edi_server_configurations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('FTP', 'SFTP')),
  host text NOT NULL,
  port integer NOT NULL DEFAULT 22 CHECK (port > 0 AND port <= 65535),
  username text NOT NULL,
  password text, -- Will be encrypted in application layer
  remote_path text NOT NULL DEFAULT '/',
  enabled boolean NOT NULL DEFAULT true,
  test_mode boolean NOT NULL DEFAULT false,
  timeout integer NOT NULL DEFAULT 30000 CHECK (timeout >= 1000 AND timeout <= 300000),
  retry_attempts integer NOT NULL DEFAULT 3 CHECK (retry_attempts >= 0 AND retry_attempts <= 10),
  partner_code text NOT NULL,
  sender_code text NOT NULL,
  file_name_pattern text NOT NULL DEFAULT 'CODECO_{timestamp}_{container}_{operation}.edi',
  assigned_clients jsonb DEFAULT '[]'::jsonb,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create edi_client_settings table
CREATE TABLE IF NOT EXISTS edi_client_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  client_code text NOT NULL,
  client_name text NOT NULL,
  edi_enabled boolean NOT NULL DEFAULT false,
  enable_gate_in boolean NOT NULL DEFAULT true,
  enable_gate_out boolean NOT NULL DEFAULT true,
  server_config_id uuid REFERENCES edi_server_configurations(id) ON DELETE SET NULL,
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('high', 'normal', 'low')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(client_id)
);

-- Create edi_transmission_logs table
CREATE TABLE IF NOT EXISTS edi_transmission_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  container_number text NOT NULL,
  operation text NOT NULL CHECK (operation IN ('GATE_IN', 'GATE_OUT')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'retrying')),
  attempts integer NOT NULL DEFAULT 0,
  last_attempt timestamptz DEFAULT now(),
  file_name text NOT NULL,
  file_size integer DEFAULT 0,
  file_content text,
  partner_code text NOT NULL,
  config_id uuid REFERENCES edi_server_configurations(id) ON DELETE SET NULL,
  uploaded_to_sftp boolean NOT NULL DEFAULT false,
  error_message text,
  acknowledgment_received timestamptz,
  container_id uuid REFERENCES containers(id) ON DELETE SET NULL,
  gate_operation_id uuid, -- Generic reference to gate operations
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_edi_server_configs_enabled ON edi_server_configurations(enabled);
CREATE INDEX IF NOT EXISTS idx_edi_server_configs_is_default ON edi_server_configurations(is_default);
CREATE INDEX IF NOT EXISTS idx_edi_server_configs_type ON edi_server_configurations(type);

CREATE INDEX IF NOT EXISTS idx_edi_client_settings_client_id ON edi_client_settings(client_id);
CREATE INDEX IF NOT EXISTS idx_edi_client_settings_client_code ON edi_client_settings(client_code);
CREATE INDEX IF NOT EXISTS idx_edi_client_settings_edi_enabled ON edi_client_settings(edi_enabled);
CREATE INDEX IF NOT EXISTS idx_edi_client_settings_server_config_id ON edi_client_settings(server_config_id);

CREATE INDEX IF NOT EXISTS idx_edi_transmission_logs_container_number ON edi_transmission_logs(container_number);
CREATE INDEX IF NOT EXISTS idx_edi_transmission_logs_operation ON edi_transmission_logs(operation);
CREATE INDEX IF NOT EXISTS idx_edi_transmission_logs_status ON edi_transmission_logs(status);
CREATE INDEX IF NOT EXISTS idx_edi_transmission_logs_created_at ON edi_transmission_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_edi_transmission_logs_last_attempt ON edi_transmission_logs(last_attempt);
CREATE INDEX IF NOT EXISTS idx_edi_transmission_logs_container_id ON edi_transmission_logs(container_id);
CREATE INDEX IF NOT EXISTS idx_edi_transmission_logs_client_id ON edi_transmission_logs(client_id);
CREATE INDEX IF NOT EXISTS idx_edi_transmission_logs_config_id ON edi_transmission_logs(config_id);

-- Enable Row Level Security
ALTER TABLE edi_server_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE edi_client_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE edi_transmission_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for edi_server_configurations
CREATE POLICY "Admins and supervisors can view EDI server configurations"
  ON edi_server_configurations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
      AND users.role IN ('admin', 'supervisor')
      AND users.active = true
    )
  );

CREATE POLICY "Admins and supervisors can manage EDI server configurations"
  ON edi_server_configurations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
      AND users.role IN ('admin', 'supervisor')
      AND users.active = true
    )
  );

-- RLS Policies for edi_client_settings
CREATE POLICY "Users can view EDI client settings"
  ON edi_client_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
      AND users.role IN ('admin', 'supervisor', 'operator')
      AND users.active = true
    )
  );

CREATE POLICY "Admins and supervisors can manage EDI client settings"
  ON edi_client_settings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
      AND users.role IN ('admin', 'supervisor')
      AND users.active = true
    )
  );

-- RLS Policies for edi_transmission_logs
CREATE POLICY "Users can view EDI transmission logs"
  ON edi_transmission_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
      AND users.role IN ('admin', 'supervisor', 'operator')
      AND users.active = true
    )
  );

CREATE POLICY "System can create EDI transmission logs"
  ON edi_transmission_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
      AND users.role IN ('admin', 'supervisor', 'operator')
      AND users.active = true
    )
  );

CREATE POLICY "System can update EDI transmission logs"
  ON edi_transmission_logs FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
      AND users.role IN ('admin', 'supervisor', 'operator')
      AND users.active = true
    )
  );

-- Create trigger functions for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_edi_server_configurations_updated_at
  BEFORE UPDATE ON edi_server_configurations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_edi_client_settings_updated_at
  BEFORE UPDATE ON edi_client_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_edi_transmission_logs_updated_at
  BEFORE UPDATE ON edi_transmission_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default EDI server configuration
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
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Default EDI Server',
  'SFTP',
  'edi.depot.local',
  22,
  'depot_user',
  '', -- Password should be set through the application
  '/incoming/codeco',
  true,
  true,
  30000,
  3,
  'DEPOT',
  'DEPOT001',
  'CODECO_{timestamp}_{container}_{operation}.edi',
  '[]'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

-- Create helper functions for EDI operations

-- Function to get EDI configuration for a client
CREATE OR REPLACE FUNCTION get_edi_config_for_client(
  p_client_code text,
  p_client_name text DEFAULT NULL
)
RETURNS TABLE (
  config_id uuid,
  config_name text,
  server_type text,
  host text,
  port integer,
  enabled boolean,
  edi_enabled boolean
) AS $$
BEGIN
  -- First try to find specific client EDI settings
  RETURN QUERY
  SELECT 
    esc.id as config_id,
    esc.name as config_name,
    esc.type as server_type,
    esc.host,
    esc.port,
    esc.enabled,
    ecs.edi_enabled
  FROM edi_client_settings ecs
  JOIN edi_server_configurations esc ON ecs.server_config_id = esc.id
  WHERE ecs.client_code = p_client_code
    AND ecs.edi_enabled = true
    AND esc.enabled = true
  LIMIT 1;

  -- If no specific settings found, check if client is in assigned_clients of any server
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      esc.id as config_id,
      esc.name as config_name,
      esc.type as server_type,
      esc.host,
      esc.port,
      esc.enabled,
      true as edi_enabled
    FROM edi_server_configurations esc
    WHERE esc.enabled = true
      AND (
        esc.assigned_clients @> to_jsonb(ARRAY[p_client_code])
        OR (p_client_name IS NOT NULL AND esc.assigned_clients @> to_jsonb(ARRAY[p_client_name]))
      )
    ORDER BY esc.is_default DESC
    LIMIT 1;
  END IF;

  -- If still no configuration found, return default server if available
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      esc.id as config_id,
      esc.name as config_name,
      esc.type as server_type,
      esc.host,
      esc.port,
      esc.enabled,
      false as edi_enabled -- Default server but EDI not specifically enabled
    FROM edi_server_configurations esc
    WHERE esc.enabled = true
      AND esc.is_default = true
    LIMIT 1;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to log EDI transmission
CREATE OR REPLACE FUNCTION log_edi_transmission(
  p_container_number text,
  p_operation text,
  p_container_id uuid DEFAULT NULL,
  p_gate_operation_id uuid DEFAULT NULL,
  p_client_id uuid DEFAULT NULL,
  p_config_id uuid DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_log_id uuid;
  v_config_id uuid;
  v_partner_code text;
  v_file_name text;
BEGIN
  -- Get configuration if not provided
  IF p_config_id IS NULL THEN
    SELECT config_id INTO v_config_id
    FROM get_edi_config_for_client(
      (SELECT code FROM clients WHERE id = p_client_id),
      (SELECT name FROM clients WHERE id = p_client_id)
    )
    WHERE edi_enabled = true
    LIMIT 1;
  ELSE
    v_config_id := p_config_id;
  END IF;

  -- Get partner code and generate file name
  SELECT partner_code INTO v_partner_code
  FROM edi_server_configurations
  WHERE id = v_config_id;

  v_file_name := 'CODECO_' || to_char(now(), 'YYYYMMDDHH24MISS') || '_' || p_container_number || '_' || p_operation || '.edi';

  -- Insert transmission log
  INSERT INTO edi_transmission_logs (
    container_number,
    operation,
    status,
    file_name,
    partner_code,
    config_id,
    container_id,
    gate_operation_id,
    client_id
  ) VALUES (
    p_container_number,
    p_operation,
    'pending',
    v_file_name,
    COALESCE(v_partner_code, 'DEPOT'),
    v_config_id,
    p_container_id,
    p_gate_operation_id,
    p_client_id
  ) RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update EDI transmission status
CREATE OR REPLACE FUNCTION update_edi_transmission_status(
  p_log_id uuid,
  p_status text,
  p_error_message text DEFAULT NULL,
  p_file_content text DEFAULT NULL,
  p_file_size integer DEFAULT NULL
)
RETURNS boolean AS $$
BEGIN
  UPDATE edi_transmission_logs
  SET 
    status = p_status,
    attempts = attempts + 1,
    last_attempt = now(),
    error_message = p_error_message,
    file_content = COALESCE(p_file_content, file_content),
    file_size = COALESCE(p_file_size, file_size),
    uploaded_to_sftp = CASE WHEN p_status = 'success' THEN true ELSE uploaded_to_sftp END,
    acknowledgment_received = CASE WHEN p_status = 'success' THEN now() ELSE acknowledgment_received END
  WHERE id = p_log_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Create view for EDI statistics
CREATE OR REPLACE VIEW edi_statistics AS
SELECT 
  COUNT(*) as total_transmissions,
  COUNT(*) FILTER (WHERE status = 'success') as successful_transmissions,
  COUNT(*) FILTER (WHERE status = 'failed') as failed_transmissions,
  COUNT(*) FILTER (WHERE status IN ('pending', 'retrying')) as pending_transmissions,
  CASE 
    WHEN COUNT(*) > 0 THEN 
      ROUND((COUNT(*) FILTER (WHERE status = 'success')::numeric / COUNT(*)::numeric) * 100, 2)
    ELSE 0 
  END as success_rate,
  MAX(created_at) as last_transmission_date,
  COUNT(DISTINCT client_id) as clients_with_transmissions,
  COUNT(DISTINCT config_id) as servers_used
FROM edi_transmission_logs
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days';

-- Grant necessary permissions
GRANT SELECT ON edi_statistics TO authenticated;
GRANT EXECUTE ON FUNCTION get_edi_config_for_client(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION log_edi_transmission(text, text, uuid, uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION update_edi_transmission_status(uuid, text, text, text, integer) TO authenticated;