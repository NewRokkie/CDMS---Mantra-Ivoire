-- Add remote_path column to edi_transmission_logs table
-- This stores the full path where the EDI file was uploaded on the SFTP server

ALTER TABLE edi_transmission_logs
ADD COLUMN IF NOT EXISTS remote_path TEXT;

-- Add comment to document the column
COMMENT ON COLUMN edi_transmission_logs.remote_path IS 'Full path where the EDI file was uploaded on the SFTP server (e.g., /incoming/CODECO_ONEY_20260218234902_ONEU1388601.edi)';

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'edi_transmission_logs'
  AND column_name = 'remote_path';
