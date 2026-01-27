/*
  # Add Container Audit Logs Support

  ## Changes
  1. Add audit_logs JSONB column to containers table to store audit history
  2. Create trigger function to automatically log container changes
  3. Create indexes for better query performance

  ## Notes
  - Audit logs are stored as JSONB array in the container record
  - Each audit log entry contains: timestamp, user, action, details
  - Trigger automatically captures INSERT, UPDATE operations
*/

-- Add audit_logs column to containers table
ALTER TABLE containers 
ADD COLUMN IF NOT EXISTS audit_logs jsonb DEFAULT '[]'::jsonb;

-- Create index for audit logs queries
CREATE INDEX IF NOT EXISTS idx_containers_audit_logs ON containers USING gin(audit_logs);

-- Create function to add audit log entry
CREATE OR REPLACE FUNCTION add_container_audit_log()
RETURNS TRIGGER AS $$
DECLARE
  current_user_name text;
  audit_action text;
  audit_details text;
BEGIN
  -- Get current user name from users table
  SELECT name INTO current_user_name
  FROM users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

  -- If user not found, use a default
  IF current_user_name IS NULL THEN
    current_user_name := 'System';
  END IF;

  -- Determine action and details
  IF TG_OP = 'INSERT' THEN
    audit_action := 'created';
    audit_details := 'Container created in system';
  ELSIF TG_OP = 'UPDATE' THEN
    audit_action := 'updated';
    audit_details := 'Container information updated';
    
    -- Add specific details about what changed
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      audit_details := audit_details || ' - Status changed from ' || OLD.status || ' to ' || NEW.status;
    END IF;
    
    IF OLD.location IS DISTINCT FROM NEW.location THEN
      audit_details := audit_details || ' - Location changed from ' || COALESCE(OLD.location, 'none') || ' to ' || COALESCE(NEW.location, 'none');
    END IF;
    
    IF OLD.full_empty IS DISTINCT FROM NEW.full_empty THEN
      audit_details := audit_details || ' - Status changed from ' || COALESCE(OLD.full_empty, 'unknown') || ' to ' || COALESCE(NEW.full_empty, 'unknown');
    END IF;
  END IF;

  -- Append new audit log entry
  NEW.audit_logs := COALESCE(NEW.audit_logs, '[]'::jsonb) || 
    jsonb_build_object(
      'timestamp', now(),
      'user', current_user_name,
      'action', audit_action,
      'details', audit_details
    );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for container audit logging
DROP TRIGGER IF EXISTS container_audit_log_trigger ON containers;
CREATE TRIGGER container_audit_log_trigger
  BEFORE INSERT OR UPDATE ON containers
  FOR EACH ROW
  EXECUTE FUNCTION add_container_audit_log();

-- Add comment to column
COMMENT ON COLUMN containers.audit_logs IS 'JSONB array storing audit log entries with timestamp, user, action, and details';
