-- Migration: Add SFTP configuration fields to edi_client_settings
-- Date: 2025-02-10
-- Description: Adds SFTP server configuration fields to support per-client SFTP transmission

-- Add SFTP configuration columns to edi_client_settings table
ALTER TABLE edi_client_settings 
ADD COLUMN IF NOT EXISTS sftp_host VARCHAR(255),
ADD COLUMN IF NOT EXISTS sftp_port INTEGER DEFAULT 22,
ADD COLUMN IF NOT EXISTS sftp_username VARCHAR(255),
ADD COLUMN IF NOT EXISTS sftp_password_encrypted TEXT,
ADD COLUMN IF NOT EXISTS sftp_remote_dir VARCHAR(500) DEFAULT '/',
ADD COLUMN IF NOT EXISTS sftp_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS sftp_last_test_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS sftp_last_test_status VARCHAR(50);

-- Add comments for documentation
COMMENT ON COLUMN edi_client_settings.sftp_host IS 'SFTP server hostname or IP address';
COMMENT ON COLUMN edi_client_settings.sftp_port IS 'SFTP server port (default: 22)';
COMMENT ON COLUMN edi_client_settings.sftp_username IS 'SFTP username for authentication';
COMMENT ON COLUMN edi_client_settings.sftp_password_encrypted IS 'Encrypted SFTP password (use Supabase Vault for production)';
COMMENT ON COLUMN edi_client_settings.sftp_remote_dir IS 'Remote directory path for EDI file uploads';
COMMENT ON COLUMN edi_client_settings.sftp_enabled IS 'Enable/disable SFTP transmission for this client';
COMMENT ON COLUMN edi_client_settings.sftp_last_test_date IS 'Last SFTP connection test timestamp';
COMMENT ON COLUMN edi_client_settings.sftp_last_test_status IS 'Result of last connection test (success/failed)';

-- Create index for faster lookups of SFTP-enabled clients
CREATE INDEX IF NOT EXISTS idx_edi_client_settings_sftp_enabled 
ON edi_client_settings(sftp_enabled) 
WHERE sftp_enabled = true;

-- Add audit columns if they don't exist
ALTER TABLE edi_client_settings 
ADD COLUMN IF NOT EXISTS sftp_config_updated_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS sftp_config_updated_by UUID REFERENCES auth.users(id);

-- Create trigger to update sftp_config_updated_at timestamp
CREATE OR REPLACE FUNCTION update_sftp_config_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.sftp_host IS DISTINCT FROM OLD.sftp_host OR
      NEW.sftp_port IS DISTINCT FROM OLD.sftp_port OR
      NEW.sftp_username IS DISTINCT FROM OLD.sftp_username OR
      NEW.sftp_password_encrypted IS DISTINCT FROM OLD.sftp_password_encrypted OR
      NEW.sftp_remote_dir IS DISTINCT FROM OLD.sftp_remote_dir OR
      NEW.sftp_enabled IS DISTINCT FROM OLD.sftp_enabled) THEN
    NEW.sftp_config_updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_sftp_config_timestamp ON edi_client_settings;
CREATE TRIGGER trigger_update_sftp_config_timestamp
  BEFORE UPDATE ON edi_client_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_sftp_config_timestamp();

-- Add RLS policies for SFTP configuration access
-- Only admins and EDI managers can view/edit SFTP credentials
CREATE POLICY "Admin can manage SFTP config" ON edi_client_settings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'edi_manager')
    )
  );

-- Create view for SFTP configuration without exposing passwords
CREATE OR REPLACE VIEW edi_client_sftp_config AS
SELECT 
  id,
  client_id,
  sftp_host,
  sftp_port,
  sftp_username,
  CASE 
    WHEN sftp_password_encrypted IS NOT NULL THEN '***ENCRYPTED***'
    ELSE NULL
  END as sftp_password_status,
  sftp_remote_dir,
  sftp_enabled,
  sftp_last_test_date,
  sftp_last_test_status,
  sftp_config_updated_at,
  sftp_config_updated_by
FROM edi_client_settings
WHERE sftp_enabled = true;

-- Grant access to the view
GRANT SELECT ON edi_client_sftp_config TO authenticated;

-- Add helpful comments
COMMENT ON VIEW edi_client_sftp_config IS 'Safe view of SFTP configurations without exposing passwords';
