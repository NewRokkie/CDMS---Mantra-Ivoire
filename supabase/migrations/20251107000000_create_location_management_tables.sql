/*
  # Location Management System - Database Schema

  1. Purpose
    - Implements comprehensive UUID-based location management system
    - Replaces string-based location IDs with proper database entities
    - Supports automatic location ID generation in SXXRXHX format
    - Handles virtual locations for 40ft container stacks

  2. New Tables
    - `locations` - Core location records with UUID primary keys
    - `virtual_stack_pairs` - Manages 40ft container stack pairings
    - `location_id_mappings` - Migration mapping from legacy string IDs
    - `location_audit_log` - Comprehensive audit trail for location operations

  3. Requirements Addressed
    - 1.1: Database schema with UUID primary keys
    - 1.2: Proper foreign key and check constraints
    - 10.5: Audit logging triggers

  4. Key Features
    - UUID primary keys for distributed system compatibility
    - SXXRXHX format validation for location IDs
    - Real-time occupancy tracking
    - Client pool integration
    - Comprehensive audit logging
*/

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

-- Container size enum (if not already exists)
DO $$ BEGIN
  CREATE TYPE container_size_enum AS ENUM ('20ft', '40ft');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- VIRTUAL STACK PAIRS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS virtual_stack_pairs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  yard_id TEXT NOT NULL,
  stack1_id UUID NOT NULL,
  stack2_id UUID NOT NULL,
  virtual_stack_number INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Constraints
  CONSTRAINT different_stacks CHECK (stack1_id != stack2_id),
  CONSTRAINT unique_stack_pair UNIQUE (yard_id, stack1_id, stack2_id),
  CONSTRAINT unique_virtual_stack UNIQUE (yard_id, virtual_stack_number)
);

-- ============================================================================
-- LOCATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id VARCHAR(8) NOT NULL UNIQUE,
  stack_id UUID NOT NULL,
  yard_id TEXT NOT NULL,
  row_number INTEGER NOT NULL CHECK (row_number > 0),
  tier_number INTEGER NOT NULL CHECK (tier_number > 0),
  is_virtual BOOLEAN DEFAULT false,
  virtual_stack_pair_id UUID REFERENCES virtual_stack_pairs(id) ON DELETE SET NULL,
  is_occupied BOOLEAN DEFAULT false,
  container_id UUID REFERENCES containers(id) ON DELETE SET NULL,
  container_size container_size_enum,
  client_pool_id UUID REFERENCES client_pools(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Constraints
  CONSTRAINT valid_location_id CHECK (location_id ~ '^S\d{2}R\d{1}H\d{1}$'),
  CONSTRAINT unique_stack_position UNIQUE (stack_id, row_number, tier_number),
  CONSTRAINT virtual_location_requires_pair CHECK (
    (is_virtual = false AND virtual_stack_pair_id IS NULL) OR
    (is_virtual = true AND virtual_stack_pair_id IS NOT NULL)
  ),
  CONSTRAINT occupied_requires_container CHECK (
    (is_occupied = false AND container_id IS NULL) OR
    (is_occupied = true AND container_id IS NOT NULL)
  )
);

-- ============================================================================
-- LOCATION ID MAPPINGS TABLE (for migration)
-- ============================================================================

CREATE TABLE IF NOT EXISTS location_id_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_string_id VARCHAR(50) NOT NULL UNIQUE,
  new_location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  migration_batch_id UUID NOT NULL,
  migrated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT unique_legacy_id UNIQUE (legacy_string_id)
);

-- ============================================================================
-- LOCATION AUDIT LOG TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS location_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  operation VARCHAR(20) NOT NULL CHECK (operation IN ('CREATE', 'UPDATE', 'DELETE', 'ASSIGN', 'RELEASE')),
  old_values JSONB,
  new_values JSONB,
  user_id UUID,
  user_email TEXT,
  timestamp TIMESTAMPTZ DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Location availability queries (most critical for performance)
CREATE INDEX IF NOT EXISTS idx_locations_availability 
  ON locations (is_occupied, container_size, client_pool_id, yard_id) 
  WHERE is_active = true;

-- Location ID lookups
CREATE INDEX IF NOT EXISTS idx_locations_location_id 
  ON locations (location_id);

-- Stack-based queries
CREATE INDEX IF NOT EXISTS idx_locations_stack_id 
  ON locations (stack_id);

-- Yard-based queries
CREATE INDEX IF NOT EXISTS idx_locations_yard_id 
  ON locations (yard_id);

-- Virtual location queries
CREATE INDEX IF NOT EXISTS idx_locations_virtual 
  ON locations (virtual_stack_pair_id) 
  WHERE is_virtual = true;

-- Container assignment lookups
CREATE INDEX IF NOT EXISTS idx_locations_container_id 
  ON locations (container_id) 
  WHERE container_id IS NOT NULL;

-- Client pool queries
CREATE INDEX IF NOT EXISTS idx_locations_client_pool 
  ON locations (client_pool_id) 
  WHERE client_pool_id IS NOT NULL;

-- Audit trail queries
CREATE INDEX IF NOT EXISTS idx_audit_location_timestamp 
  ON location_audit_log (location_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_audit_operation 
  ON location_audit_log (operation, timestamp DESC);

-- Virtual stack pairs indexes
CREATE INDEX IF NOT EXISTS idx_virtual_pairs_yard 
  ON virtual_stack_pairs (yard_id);

CREATE INDEX IF NOT EXISTS idx_virtual_pairs_stacks 
  ON virtual_stack_pairs (stack1_id, stack2_id);

-- Migration mappings index
CREATE INDEX IF NOT EXISTS idx_mappings_legacy_id 
  ON location_id_mappings (legacy_string_id);

-- ============================================================================
-- AUDIT TRIGGER FUNCTIONS
-- ============================================================================

-- Function to log location changes
CREATE OR REPLACE FUNCTION log_location_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_operation VARCHAR(20);
  v_user_id UUID;
  v_user_email TEXT;
BEGIN
  -- Determine operation type
  IF TG_OP = 'INSERT' THEN
    v_operation := 'CREATE';
  ELSIF TG_OP = 'UPDATE' THEN
    -- Determine specific update type
    IF OLD.is_occupied = false AND NEW.is_occupied = true THEN
      v_operation := 'ASSIGN';
    ELSIF OLD.is_occupied = true AND NEW.is_occupied = false THEN
      v_operation := 'RELEASE';
    ELSE
      v_operation := 'UPDATE';
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    v_operation := 'DELETE';
  END IF;

  -- Get current user info (if available)
  BEGIN
    SELECT id, email INTO v_user_id, v_user_email
    FROM users
    WHERE auth_user_id = auth.uid()
    LIMIT 1;
  EXCEPTION
    WHEN OTHERS THEN
      v_user_id := NULL;
      v_user_email := NULL;
  END;

  -- Insert audit log
  IF TG_OP = 'DELETE' THEN
    INSERT INTO location_audit_log (
      location_id,
      operation,
      old_values,
      new_values,
      user_id,
      user_email
    ) VALUES (
      OLD.id,
      v_operation,
      row_to_json(OLD),
      NULL,
      v_user_id,
      v_user_email
    );
    RETURN OLD;
  ELSE
    INSERT INTO location_audit_log (
      location_id,
      operation,
      old_values,
      new_values,
      user_id,
      user_email
    ) VALUES (
      NEW.id,
      v_operation,
      CASE WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD) ELSE NULL END,
      row_to_json(NEW),
      v_user_id,
      v_user_email
    );
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_locations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update virtual_stack_pairs updated_at
CREATE OR REPLACE FUNCTION update_virtual_pairs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Audit logging trigger for locations
CREATE TRIGGER locations_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON locations
  FOR EACH ROW
  EXECUTE FUNCTION log_location_changes();

-- Updated_at trigger for locations
CREATE TRIGGER locations_updated_at_trigger
  BEFORE UPDATE ON locations
  FOR EACH ROW
  EXECUTE FUNCTION update_locations_updated_at();

-- Updated_at trigger for virtual_stack_pairs
CREATE TRIGGER virtual_pairs_updated_at_trigger
  BEFORE UPDATE ON virtual_stack_pairs
  FOR EACH ROW
  EXECUTE FUNCTION update_virtual_pairs_updated_at();

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE locations IS 'Core location management table with UUID-based records and SXXRXHX format location IDs';
COMMENT ON TABLE virtual_stack_pairs IS 'Manages pairing relationships between physical stacks for 40ft containers';
COMMENT ON TABLE location_id_mappings IS 'Migration mapping table from legacy string-based IDs to new UUID-based records';
COMMENT ON TABLE location_audit_log IS 'Comprehensive audit trail for all location management operations';

COMMENT ON COLUMN locations.location_id IS 'Location identifier in SXXRXHX format (e.g., S01R2H3)';
COMMENT ON COLUMN locations.is_virtual IS 'True if this location represents a virtual 40ft container position';
COMMENT ON COLUMN locations.is_occupied IS 'Real-time occupancy status for availability tracking';
COMMENT ON COLUMN locations.container_size IS 'Container size constraint for this location';
COMMENT ON COLUMN locations.client_pool_id IS 'Client pool assignment for access control';

