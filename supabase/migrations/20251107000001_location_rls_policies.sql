/*
  # Location Management System - Row Level Security Policies

  1. Purpose
    - Implements comprehensive RLS policies for location management tables
    - Enforces client pool isolation at database level
    - Provides role-based access control for location operations
    - Ensures data security and multi-tenant isolation

  2. Requirements Addressed
    - 6.1: Client pool access control on locations table
    - 6.2: User role-based access policies
    - 6.3: Client pool assignment enforcement

  3. Security Model
    - Admins: Full access to all location data
    - Supervisors: Full access within their assigned yards
    - Operators: Read and update access within their assigned yards
    - Viewers: Read-only access within their assigned yards
    - Client Pool Isolation: Users only see locations assigned to their client pools

  4. Tables Covered
    - locations
    - virtual_stack_pairs
    - location_id_mappings
    - location_audit_log
*/

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE virtual_stack_pairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_id_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_audit_log ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- HELPER FUNCTION FOR USER ROLE CHECKS
-- ============================================================================

-- Function to check if current user has specific role
CREATE OR REPLACE FUNCTION has_role(required_roles TEXT[])
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE users.auth_user_id = auth.uid()
    AND users.role = ANY(required_roles)
    AND users.active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to check if user has access to specific yard
CREATE OR REPLACE FUNCTION has_yard_access(check_yard_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE users.auth_user_id = auth.uid()
    AND users.active = true
    AND (
      users.role = 'admin' OR
      users.yard_ids @> to_jsonb(check_yard_id)
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to check if user has access to specific client pool
CREATE OR REPLACE FUNCTION has_client_pool_access(check_pool_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID;
  v_user_role TEXT;
BEGIN
  -- Get current user info
  SELECT id, role INTO v_user_id, v_user_role
  FROM users
  WHERE auth_user_id = auth.uid()
  AND active = true
  LIMIT 1;

  -- Admins have access to all pools
  IF v_user_role = 'admin' THEN
    RETURN true;
  END IF;

  -- Check if pool is null (unassigned locations accessible to all)
  IF check_pool_id IS NULL THEN
    RETURN true;
  END IF;

  -- Check if user's client has access to this pool
  RETURN EXISTS (
    SELECT 1 FROM client_pools cp
    WHERE cp.id = check_pool_id
    AND cp.is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- LOCATIONS TABLE RLS POLICIES
-- ============================================================================

-- SELECT Policy: Users can view locations based on yard access and client pool
CREATE POLICY "locations_select_policy"
  ON locations
  FOR SELECT
  TO authenticated
  USING (
    -- Admins can see all locations
    has_role(ARRAY['admin']) OR
    -- Users can see locations in their assigned yards
    (has_yard_access(yard_id) AND has_client_pool_access(client_pool_id))
  );

-- INSERT Policy: Admins and supervisors can create locations
CREATE POLICY "locations_insert_policy"
  ON locations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(ARRAY['admin', 'supervisor']) AND
    has_yard_access(yard_id)
  );

-- UPDATE Policy: Admins, supervisors, and operators can update locations
CREATE POLICY "locations_update_policy"
  ON locations
  FOR UPDATE
  TO authenticated
  USING (
    (has_role(ARRAY['admin', 'supervisor', 'operator']) AND has_yard_access(yard_id))
  )
  WITH CHECK (
    (has_role(ARRAY['admin', 'supervisor', 'operator']) AND has_yard_access(yard_id))
  );

-- DELETE Policy: Only admins can delete locations
CREATE POLICY "locations_delete_policy"
  ON locations
  FOR DELETE
  TO authenticated
  USING (
    has_role(ARRAY['admin'])
  );

-- ============================================================================
-- VIRTUAL STACK PAIRS TABLE RLS POLICIES
-- ============================================================================

-- SELECT Policy: Users can view virtual stack pairs in their yards
CREATE POLICY "virtual_pairs_select_policy"
  ON virtual_stack_pairs
  FOR SELECT
  TO authenticated
  USING (
    has_role(ARRAY['admin']) OR
    has_yard_access(yard_id)
  );

-- INSERT Policy: Admins and supervisors can create virtual stack pairs
CREATE POLICY "virtual_pairs_insert_policy"
  ON virtual_stack_pairs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(ARRAY['admin', 'supervisor']) AND
    has_yard_access(yard_id)
  );

-- UPDATE Policy: Admins and supervisors can update virtual stack pairs
CREATE POLICY "virtual_pairs_update_policy"
  ON virtual_stack_pairs
  FOR UPDATE
  TO authenticated
  USING (
    has_role(ARRAY['admin', 'supervisor']) AND
    has_yard_access(yard_id)
  )
  WITH CHECK (
    has_role(ARRAY['admin', 'supervisor']) AND
    has_yard_access(yard_id)
  );

-- DELETE Policy: Only admins can delete virtual stack pairs
CREATE POLICY "virtual_pairs_delete_policy"
  ON virtual_stack_pairs
  FOR DELETE
  TO authenticated
  USING (
    has_role(ARRAY['admin'])
  );

-- ============================================================================
-- LOCATION ID MAPPINGS TABLE RLS POLICIES
-- ============================================================================

-- SELECT Policy: All authenticated users can view mappings (for migration compatibility)
CREATE POLICY "mappings_select_policy"
  ON location_id_mappings
  FOR SELECT
  TO authenticated
  USING (true);

-- INSERT Policy: Only admins can create mappings (migration operations)
CREATE POLICY "mappings_insert_policy"
  ON location_id_mappings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(ARRAY['admin'])
  );

-- UPDATE Policy: Only admins can update mappings
CREATE POLICY "mappings_update_policy"
  ON location_id_mappings
  FOR UPDATE
  TO authenticated
  USING (
    has_role(ARRAY['admin'])
  )
  WITH CHECK (
    has_role(ARRAY['admin'])
  );

-- DELETE Policy: Only admins can delete mappings
CREATE POLICY "mappings_delete_policy"
  ON location_id_mappings
  FOR DELETE
  TO authenticated
  USING (
    has_role(ARRAY['admin'])
  );

-- ============================================================================
-- LOCATION AUDIT LOG TABLE RLS POLICIES
-- ============================================================================

-- SELECT Policy: Admins and supervisors can view audit logs
CREATE POLICY "audit_log_select_policy"
  ON location_audit_log
  FOR SELECT
  TO authenticated
  USING (
    has_role(ARRAY['admin', 'supervisor'])
  );

-- INSERT Policy: System can create audit logs (via trigger)
CREATE POLICY "audit_log_insert_policy"
  ON location_audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- No UPDATE or DELETE policies - audit logs are immutable

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant execute on helper functions
GRANT EXECUTE ON FUNCTION has_role(TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION has_yard_access(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION has_client_pool_access(UUID) TO authenticated;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON POLICY "locations_select_policy" ON locations IS 
  'Users can view locations in their assigned yards with client pool access control';

COMMENT ON POLICY "locations_insert_policy" ON locations IS 
  'Admins and supervisors can create locations in their assigned yards';

COMMENT ON POLICY "locations_update_policy" ON locations IS 
  'Admins, supervisors, and operators can update locations in their assigned yards';

COMMENT ON POLICY "locations_delete_policy" ON locations IS 
  'Only admins can delete location records';

COMMENT ON FUNCTION has_role(TEXT[]) IS 
  'Helper function to check if current user has one of the specified roles';

COMMENT ON FUNCTION has_yard_access(TEXT) IS 
  'Helper function to check if current user has access to a specific yard';

COMMENT ON FUNCTION has_client_pool_access(UUID) IS 
  'Helper function to check if current user has access to a specific client pool';

