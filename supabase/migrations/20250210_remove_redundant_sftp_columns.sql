/*
  # Remove Redundant SFTP Columns from edi_client_settings

  ## Overview
  This migration removes redundant SFTP configuration columns from the edi_client_settings table.
  These columns are unnecessary because we already have server_config_id that links to 
  edi_server_configurations where all SFTP details are properly stored.

  ## Changes
  - Drop sftp_host column
  - Drop sftp_port column
  - Drop sftp_username column
  - Drop sftp_password_encrypted column
  - Drop sftp_remote_dir column
  - Drop sftp_enabled column
  - Drop sftp_last_test_date column
  - Drop sftp_last_test_status column
  - Drop sftp_config_updated_at column
  - Drop sftp_config_updated_by column
  - Drop related trigger and function
  - Drop related view

  ## Rationale
  The server_config_id foreign key provides a clean, normalized way to link clients to 
  their SFTP server configurations. Having duplicate SFTP fields in edi_client_settings 
  creates data redundancy and potential inconsistencies.
*/

-- Drop the view that uses these columns
DROP VIEW IF EXISTS edi_client_sftp_configs CASCADE;

-- Drop the trigger
DROP TRIGGER IF EXISTS update_sftp_config_timestamp ON edi_client_settings CASCADE;

-- Drop the trigger function
DROP FUNCTION IF EXISTS update_sftp_config_timestamp() CASCADE;

-- Drop the redundant SFTP columns from edi_client_settings
ALTER TABLE edi_client_settings 
DROP COLUMN IF EXISTS sftp_host CASCADE,
DROP COLUMN IF EXISTS sftp_port CASCADE,
DROP COLUMN IF EXISTS sftp_username CASCADE,
DROP COLUMN IF EXISTS sftp_password_encrypted CASCADE,
DROP COLUMN IF EXISTS sftp_remote_dir CASCADE,
DROP COLUMN IF EXISTS sftp_enabled CASCADE,
DROP COLUMN IF EXISTS sftp_last_test_date CASCADE,
DROP COLUMN IF EXISTS sftp_last_test_status CASCADE,
DROP COLUMN IF EXISTS sftp_config_updated_at CASCADE,
DROP COLUMN IF EXISTS sftp_config_updated_by CASCADE;

-- Add comment to clarify the proper way to configure SFTP
COMMENT ON COLUMN edi_client_settings.server_config_id IS 
  'Foreign key to edi_server_configurations table. All SFTP connection details (host, port, username, password, remote_dir) are stored in the referenced server configuration.';

-- Create a helpful view that shows client EDI settings with their SFTP server details
CREATE OR REPLACE VIEW edi_client_settings_with_server AS
SELECT 
  ecs.id,
  ecs.client_id,
  ecs.client_code,
  ecs.client_name,
  ecs.edi_enabled,
  ecs.enable_gate_in,
  ecs.enable_gate_out,
  ecs.server_config_id,
  ecs.priority,
  ecs.notes,
  ecs.created_at,
  ecs.updated_at,
  -- Server configuration details
  esc.name as server_name,
  esc.type as server_type,
  esc.host as server_host,
  esc.port as server_port,
  esc.username as server_username,
  esc.remote_path as server_remote_path,
  esc.enabled as server_enabled,
  esc.partner_code as server_partner_code,
  esc.sender_code as server_sender_code
FROM edi_client_settings ecs
LEFT JOIN edi_server_configurations esc ON ecs.server_config_id = esc.id;

-- Grant permissions on the new view
GRANT SELECT ON edi_client_settings_with_server TO authenticated;

-- Add helpful comment
COMMENT ON VIEW edi_client_settings_with_server IS 
  'Convenient view that joins edi_client_settings with edi_server_configurations to show complete EDI configuration for each client.';
