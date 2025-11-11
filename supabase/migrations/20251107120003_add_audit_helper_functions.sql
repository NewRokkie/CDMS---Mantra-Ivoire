/*
  Full corrected SQL for audit log helper functions
  - Renamed returned column `timestamp` -> `logged_at`
  - Use CROSS JOIN LATERAL jsonb_array_elements(containers.audit_logs) AS log
  - Order by the aliased timestamp column (logged_at) to avoid repeated casts
  - Minor defensive NULL handling shown where appropriate
*/

-- Function to get all audit logs for a container
CREATE OR REPLACE FUNCTION get_container_audit_logs(container_id_param uuid)
RETURNS TABLE (
  logged_at timestamptz,
  user_name text,
  action text,
  details text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (log->>'timestamp')::timestamptz                           AS logged_at,
    log->>'user'                                               AS user_name,
    log->>'action'                                             AS action,
    log->>'details'                                            AS details
  FROM containers
  CROSS JOIN LATERAL jsonb_array_elements(containers.audit_logs) AS log
  WHERE containers.id = container_id_param
  ORDER BY logged_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to search audit logs by action type
CREATE OR REPLACE FUNCTION search_container_audit_logs(
  action_type text DEFAULT NULL,
  user_name_filter text DEFAULT NULL,
  from_date timestamptz DEFAULT NULL,
  to_date timestamptz DEFAULT NULL
)
RETURNS TABLE (
  container_id uuid,
  container_number text,
  logged_at timestamptz,
  user_name text,
  action text,
  details text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    containers.id                                               AS container_id,
    containers.number                                           AS container_number,
    (log->>'timestamp')::timestamptz                            AS logged_at,
    log->>'user'                                                AS user_name,
    log->>'action'                                              AS action,
    log->>'details'                                             AS details
  FROM containers
  CROSS JOIN LATERAL jsonb_array_elements(containers.audit_logs) AS log
  WHERE 
    (action_type IS NULL OR log->>'action' = action_type)
    AND (user_name_filter IS NULL OR log->>'user' ILIKE '%' || user_name_filter || '%')
    AND (from_date IS NULL OR (log->>'timestamp')::timestamptz >= from_date)
    AND (to_date IS NULL OR (log->>'timestamp')::timestamptz <= to_date)
  ORDER BY logged_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get recent audit activity (last N entries)
CREATE OR REPLACE FUNCTION get_recent_audit_activity(limit_count integer DEFAULT 50)
RETURNS TABLE (
  container_id uuid,
  container_number text,
  logged_at timestamptz,
  user_name text,
  action text,
  details text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    containers.id                                               AS container_id,
    containers.number                                           AS container_number,
    (log->>'timestamp')::timestamptz                            AS logged_at,
    log->>'user'                                                AS user_name,
    log->>'action'                                              AS action,
    log->>'details'                                             AS details
  FROM containers
  CROSS JOIN LATERAL jsonb_array_elements(containers.audit_logs) AS log
  ORDER BY logged_at DESC
  LIMIT GREATEST(COALESCE(limit_count, 0), 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_container_audit_logs(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION search_container_audit_logs(text, text, timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION get_recent_audit_activity(integer) TO authenticated;

-- Add comments
COMMENT ON FUNCTION get_container_audit_logs IS 'Get all audit log entries for a specific container';
COMMENT ON FUNCTION search_container_audit_logs IS 'Search audit logs with filters for action type, user, and date range';
COMMENT ON FUNCTION get_recent_audit_activity IS 'Get the most recent audit log entries across all containers';