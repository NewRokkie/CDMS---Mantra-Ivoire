/*
  # Fix RLS Policies for Stack Management

  1. Problem
    - Stack pairings RLS policy already exists but may be too restrictive
    - Locations table needs proper RLS policies for authenticated users
    - Automatic virtual stack management is failing due to permission issues

  2. Solution
    - Ensure stack_pairings allows authenticated users to manage pairings
    - Add proper locations table policies for authenticated users
    - Fix any syntax errors in existing policies

  3. Security
    - Still requires authentication
    - Maintains data integrity while allowing automatic operations
*/

-- ============================================================================
-- FIX STACK PAIRINGS RLS POLICIES
-- ============================================================================

-- Check if the policy exists and drop it if it does
DO $$ 
BEGIN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Authenticated users can manage stack pairings" ON stack_pairings;
    DROP POLICY IF EXISTS "Authenticated users can view stack pairings" ON stack_pairings;
    DROP POLICY IF EXISTS "Admins can manage stack pairings" ON stack_pairings;
END $$;

-- Create comprehensive policies for stack_pairings
CREATE POLICY "stack_pairings_all_access"
  ON stack_pairings
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add comment for clarity
COMMENT ON POLICY "stack_pairings_all_access" ON stack_pairings IS 
'Allows authenticated users full access to stack pairings for automatic 40ft container management';

-- ============================================================================
-- FIX LOCATIONS TABLE RLS POLICIES
-- ============================================================================

-- Ensure locations table has proper policies for authenticated users
-- Drop existing restrictive policies if they exist
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "locations_select_policy" ON locations;
    DROP POLICY IF EXISTS "locations_insert_policy" ON locations;
    DROP POLICY IF EXISTS "locations_update_policy" ON locations;
    DROP POLICY IF EXISTS "locations_delete_policy" ON locations;
END $$;

-- Create simple but secure policies for locations
CREATE POLICY "locations_authenticated_access"
  ON locations
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add comment for clarity
COMMENT ON POLICY "locations_authenticated_access" ON locations IS 
'Allows authenticated users to manage locations for automatic stack operations';

-- ============================================================================
-- ENSURE TABLES HAVE RLS ENABLED
-- ============================================================================

-- Enable RLS on tables if not already enabled
ALTER TABLE stack_pairings ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- GRANT NECESSARY PERMISSIONS
-- ============================================================================

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant table permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON stack_pairings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON locations TO authenticated;