-- ============================================
-- CDMS - Custom Functions and Triggers
-- ============================================
-- Source: Supabase Production (nelmhiqsoamjluadnlvd)
-- Generated: 2026-03-04
-- Description: Essential business logic functions and triggers
-- ============================================

BEGIN;

-- ============================================
-- UTILITY FUNCTIONS
-- ============================================

-- Function: calculate_stack_capacity
-- Calculate stack capacity based on rows and tiers
CREATE OR REPLACE FUNCTION public.calculate_stack_capacity(
    p_rows INTEGER,
    p_max_tiers INTEGER,
    p_row_tier_config JSONB
) RETURNS INTEGER LANGUAGE plpgsql AS $$
DECLARE
  total_capacity INTEGER := 0;
  row_config JSONB;
  row_num INTEGER;
  row_tiers INTEGER;
BEGIN
  IF p_row_tier_config IS NULL THEN
    RETURN p_rows * p_max_tiers;
  END IF;

  FOR row_config IN SELECT * FROM jsonb_array_elements(p_row_tier_config)
  LOOP
    row_num := (row_config->>'row')::INTEGER;
    row_tiers := (row_config->>'maxTiers')::INTEGER;

    IF row_num <= p_rows THEN
      total_capacity := total_capacity + row_tiers;
    END IF;
  END LOOP;

  IF jsonb_array_length(p_row_tier_config) < p_rows THEN
    total_capacity := total_capacity +
      (p_rows - jsonb_array_length(p_row_tier_config)) * p_max_tiers;
  END IF;

  RETURN total_capacity;
END;
$$;

-- Function: is_location_available
-- Check if a location is available for assignment
CREATE OR REPLACE FUNCTION public.is_location_available(p_location_id TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE
  v_available BOOLEAN;
BEGIN
  SELECT available INTO v_available
  FROM locations
  WHERE location_id = p_location_id
  LIMIT 1;

  RETURN COALESCE(v_available, false);
END;
$$;

-- Function: get_next_location_id
-- Generate next location ID in sequence
CREATE OR REPLACE FUNCTION public.get_next_location_id(
    p_yard_id TEXT,
    p_stack_number INTEGER,
    p_row_number INTEGER
) RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  v_next_tier INTEGER;
  v_location_id TEXT;
BEGIN
  SELECT COALESCE(MAX(tier_number), 0) + 1 INTO v_next_tier
  FROM locations
  WHERE yard_id = p_yard_id
    AND stack_id = (SELECT id FROM stacks WHERE yard_id = p_yard_id AND stack_number = p_stack_number)
    AND row_number = p_row_number
    AND is_occupied = false;

  v_location_id := 'S' || LPAD(p_stack_number::TEXT, 2, '0') ||
                   'R' || LPAD(p_row_number::TEXT, 2, '0') ||
                   'H' || LPAD(v_next_tier::TEXT, 2, '0');

  RETURN v_location_id;
END;
$$;

-- ============================================
-- TRIGGER FUNCTIONS - AUDIT & TRACKING
-- ============================================

-- Function: add_container_audit_log
-- Add audit log entry when container is modified
CREATE OR REPLACE FUNCTION public.add_container_audit_log()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  current_user_name TEXT;
  audit_action TEXT;
  audit_details TEXT;
BEGIN
  SELECT name INTO current_user_name
  FROM users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

  IF current_user_name IS NULL THEN
    current_user_name := 'System';
  END IF;

  IF TG_OP = 'INSERT' THEN
    audit_action := 'created';
    audit_details := 'Container created in system';
  ELSIF TG_OP = 'UPDATE' THEN
    audit_action := 'updated';
    audit_details := 'Container information updated';

    IF OLD.status IS DISTINCT FROM NEW.status THEN
      audit_details := audit_details || ' - Status changed from ' || OLD.status || ' to ' || NEW.status;
    END IF;

    IF OLD.location IS DISTINCT FROM NEW.location THEN
      audit_details := audit_details || ' - Location changed from ' || COALESCE(OLD.location, 'none') || ' to ' || COALESCE(NEW.location, 'none');
    END IF;

    IF OLD.full_empty IS DISTINCT FROM NEW.full_empty THEN
      audit_details := audit_details || ' - Full/Empty changed from ' || COALESCE(OLD.full_empty, 'unknown') || ' to ' || COALESCE(NEW.full_empty, 'unknown');
    END IF;
  END IF;

  NEW.audit_logs := COALESCE(NEW.audit_logs, '[]'::jsonb) ||
    jsonb_build_object(
      'timestamp', now(),
      'user', current_user_name,
      'action', audit_action,
      'details', audit_details
    );

  RETURN NEW;
END;
$$;

-- Function: calculate_session_duration
-- Calculate session duration on logout
CREATE OR REPLACE FUNCTION public.calculate_session_duration()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.logout_time IS NOT NULL AND NEW.login_time IS NOT NULL THEN
        NEW.session_duration_minutes := EXTRACT(EPOCH FROM (NEW.logout_time - NEW.login_time)) / 60;
    END IF;
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

-- Function: auto_mark_buffer_zones
-- Automatically mark stacks as buffer zones based on naming conventions
CREATE OR REPLACE FUNCTION public.auto_mark_buffer_zones()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF (NEW.section_name ILIKE 'BUFFER%' OR
      NEW.section_name ILIKE 'DMG%' OR
      NEW.section_name ILIKE '%TAMPON%' OR
      NEW.notes ILIKE '%ZONE TAMPON%' OR
      NEW.stack_number >= 9000) THEN

    IF NEW.is_buffer_zone IS NULL OR NEW.is_buffer_zone = false THEN
      NEW.is_buffer_zone = true;
    END IF;

    IF NEW.buffer_zone_type IS NULL THEN
      NEW.buffer_zone_type = 'damage';
    END IF;

    IF NEW.is_special_stack IS NULL OR NEW.is_special_stack = false THEN
      NEW.is_special_stack = true;
    END IF;

    IF NEW.damage_types_supported IS NULL OR NEW.damage_types_supported = '[]'::jsonb THEN
      IF NEW.section_name ILIKE '%STRUCTURAL%' THEN
        NEW.damage_types_supported = '["structural"]'::jsonb;
      ELSIF NEW.section_name ILIKE '%SURFACE%' THEN
        NEW.damage_types_supported = '["surface"]'::jsonb;
      ELSIF NEW.section_name ILIKE '%DOOR%' THEN
        NEW.damage_types_supported = '["door"]'::jsonb;
      ELSIF NEW.section_name ILIKE '%CORNER%' THEN
        NEW.damage_types_supported = '["corner"]'::jsonb;
      ELSE
        NEW.damage_types_supported = '["general", "other"]'::jsonb;
      END IF;
    END IF;
  ELSE
    IF NEW.is_buffer_zone IS NULL THEN
      NEW.is_buffer_zone = false;
    END IF;

    IF NEW.damage_types_supported IS NULL THEN
      NEW.damage_types_supported = '[]'::jsonb;
    END IF;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in auto_mark_buffer_zones trigger: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- ============================================
-- TRIGGER FUNCTIONS - UPDATED_AT TIMESTAMPS
-- ============================================

-- Generic updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Table-specific updated_at functions (for backward compatibility)
CREATE OR REPLACE FUNCTION public.update_booking_references_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_client_pools_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_edi_client_settings_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_edi_server_configurations_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_gate_in_operations_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    IF NEW.updated_by IS NULL THEN
      SELECT name INTO NEW.updated_by
      FROM users
      WHERE auth_user_id = auth.uid()
      LIMIT 1;
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_gate_out_operations_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    IF NEW.updated_by IS NULL THEN
      SELECT name INTO NEW.updated_by
      FROM users
      WHERE auth_user_id = auth.uid()
      LIMIT 1;
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_users_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_users_audit_fields()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        NEW.created_by = (SELECT name FROM users WHERE auth_user_id = auth.uid() LIMIT 1);
    ELSIF TG_OP = 'UPDATE' THEN
        NEW.updated_by = (SELECT name FROM users WHERE auth_user_id = auth.uid() LIMIT 1);
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.locations_updated_at_trigger()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.virtual_pairs_updated_at_trigger()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.user_module_access_sync_tracking()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.last_sync_at = now();
    NEW.sync_version = COALESCE(NEW.sync_version, 1) + 1;
    RETURN NEW;
END;
$$;

-- ============================================
-- TRIGGER FUNCTIONS - STACK CAPACITY
-- ============================================

-- Function: update_stack_capacity
-- Update stack capacity when rows or tiers change
CREATE OR REPLACE FUNCTION public.update_stack_capacity()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        NEW.capacity = calculate_stack_capacity(NEW.rows, NEW.max_tiers, NEW.row_tier_config);
    END IF;
    RETURN NEW;
END;
$$;

-- ============================================
-- TRIGGER FUNCTIONS - LOCATION MANAGEMENT
-- ============================================

-- Function: locations_audit_trigger
-- Audit trail for location changes
CREATE OR REPLACE FUNCTION public.locations_audit_trigger()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO location_audit_log (location_id, operation, new_values, user_email, timestamp)
        VALUES (NEW.id, 'INSERT', to_jsonb(NEW), (SELECT email FROM users WHERE auth_user_id = auth.uid()), now());
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO location_audit_log (location_id, operation, old_values, new_values, user_email, timestamp)
        VALUES (NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), (SELECT email FROM users WHERE auth_user_id = auth.uid()), now());
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO location_audit_log (location_id, operation, old_values, user_email, timestamp)
        VALUES (OLD.id, 'DELETE', to_jsonb(OLD), (SELECT email FROM users WHERE auth_user_id = auth.uid()), now());
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;

-- Function: location_stats_refresh_trigger
-- Refresh materialized views or update stats after location changes
CREATE OR REPLACE FUNCTION public.location_stats_refresh_trigger()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    -- Update stack occupancy when location changes
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE stacks
        SET current_occupancy = (
            SELECT COUNT(*) FROM locations
            WHERE stack_id = NEW.stack_id AND is_occupied = true
        ),
        updated_at = now()
        WHERE id = NEW.stack_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE stacks
        SET current_occupancy = (
            SELECT COUNT(*) FROM locations
            WHERE stack_id = OLD.stack_id AND is_occupied = true
        ),
        updated_at = now()
        WHERE id = OLD.stack_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;

-- ============================================
-- TRIGGER FUNCTIONS - CONTAINER MANAGEMENT
-- ============================================

-- Function: validate_40ft_container_stack
-- Validate that 40ft containers are only placed in appropriate stacks
CREATE OR REPLACE FUNCTION public.validate_40ft_container_stack()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_stack RECORD;
    v_is_paired BOOLEAN;
BEGIN
    IF NEW.container_size = '40ft' OR NEW.is_high_cube = true THEN
        -- Check if stack is paired for 40ft
        SELECT s.* INTO v_stack
        FROM stacks s
        WHERE s.id = NEW.stack_id;

        IF FOUND THEN
            SELECT EXISTS (
                SELECT 1 FROM stack_pairings
                WHERE yard_id = v_stack.yard_id
                AND (first_stack_id = v_stack.id OR second_stack_id = v_stack.id)
                AND is_active = true
            ) INTO v_is_paired;

            IF NOT v_is_paired AND NOT v_stack.is_virtual THEN
                RAISE EXCEPTION '40ft containers can only be placed in paired or virtual stacks';
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- ============================================
-- TRIGGERS
-- ============================================

-- Container triggers
DROP TRIGGER IF EXISTS container_audit_log_trigger ON public.containers;
CREATE TRIGGER container_audit_log_trigger
    BEFORE INSERT OR UPDATE ON public.containers
    FOR EACH ROW
    EXECUTE FUNCTION public.add_container_audit_log();

-- Updated_at triggers for all tables
DROP TRIGGER IF EXISTS update_booking_references_updated_at ON public.booking_references;
CREATE TRIGGER update_booking_references_updated_at
    BEFORE UPDATE ON public.booking_references
    FOR EACH ROW
    EXECUTE FUNCTION public.update_booking_references_updated_at();

DROP TRIGGER IF EXISTS client_pools_updated_at ON public.client_pools;
CREATE TRIGGER client_pools_updated_at
    BEFORE UPDATE ON public.client_pools
    FOR EACH ROW
    EXECUTE FUNCTION public.update_client_pools_updated_at();

DROP TRIGGER IF EXISTS update_edi_client_settings_updated_at ON public.edi_client_settings;
CREATE TRIGGER update_edi_client_settings_updated_at
    BEFORE UPDATE ON public.edi_client_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_edi_client_settings_updated_at();

DROP TRIGGER IF EXISTS update_edi_server_configurations_updated_at ON public.edi_server_configurations;
CREATE TRIGGER update_edi_server_configurations_updated_at
    BEFORE UPDATE ON public.edi_server_configurations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_edi_server_configurations_updated_at();

DROP TRIGGER IF EXISTS update_gate_in_operations_updated_at ON public.gate_in_operations;
CREATE TRIGGER update_gate_in_operations_updated_at
    BEFORE UPDATE ON public.gate_in_operations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_gate_in_operations_updated_at();

DROP TRIGGER IF EXISTS update_gate_out_operations_updated_at ON public.gate_out_operations;
CREATE TRIGGER update_gate_out_operations_updated_at
    BEFORE UPDATE ON public.gate_out_operations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_gate_out_operations_updated_at();

DROP TRIGGER IF EXISTS trigger_update_users_updated_at ON public.users;
CREATE TRIGGER trigger_update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.update_users_updated_at();

DROP TRIGGER IF EXISTS trigger_update_users_audit_fields ON public.users;
CREATE TRIGGER trigger_update_users_audit_fields
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.update_users_audit_fields();

DROP TRIGGER IF EXISTS locations_updated_at_trigger ON public.locations;
CREATE TRIGGER locations_updated_at_trigger
    BEFORE UPDATE ON public.locations
    FOR EACH ROW
    EXECUTE FUNCTION public.locations_updated_at_trigger();

DROP TRIGGER IF EXISTS virtual_pairs_updated_at_trigger ON public.virtual_stack_pairs;
CREATE TRIGGER virtual_pairs_updated_at_trigger
    BEFORE UPDATE ON public.virtual_stack_pairs
    FOR EACH ROW
    EXECUTE FUNCTION public.virtual_pairs_updated_at_trigger();

DROP TRIGGER IF EXISTS user_module_access_sync_tracking ON public.user_module_access;
CREATE TRIGGER user_module_access_sync_tracking
    BEFORE UPDATE ON public.user_module_access
    FOR EACH ROW
    EXECUTE FUNCTION public.user_module_access_sync_tracking();

-- Stack capacity trigger
DROP TRIGGER IF EXISTS trigger_update_stack_capacity ON public.stacks;
CREATE TRIGGER trigger_update_stack_capacity
    BEFORE INSERT OR UPDATE ON public.stacks
    FOR EACH ROW
    EXECUTE FUNCTION public.update_stack_capacity();

-- Buffer zone trigger
DROP TRIGGER IF EXISTS trigger_auto_mark_buffer_zones ON public.stacks;
CREATE TRIGGER trigger_auto_mark_buffer_zones
    BEFORE INSERT OR UPDATE ON public.stacks
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_mark_buffer_zones();

-- Location audit triggers
DROP TRIGGER IF EXISTS locations_audit_trigger ON public.locations;
CREATE TRIGGER locations_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.locations
    FOR EACH ROW
    EXECUTE FUNCTION public.locations_audit_trigger();

-- Location stats trigger
DROP TRIGGER IF EXISTS location_stats_refresh_trigger ON public.locations;
CREATE TRIGGER location_stats_refresh_trigger
    AFTER INSERT OR DELETE OR UPDATE ON public.locations
    FOR EACH ROW
    EXECUTE FUNCTION public.location_stats_refresh_trigger();

-- User login history trigger
DROP TRIGGER IF EXISTS trigger_calculate_session_duration ON public.user_login_history;
CREATE TRIGGER trigger_calculate_session_duration
    BEFORE UPDATE ON public.user_login_history
    FOR EACH ROW
    EXECUTE FUNCTION public.calculate_session_duration();

-- ============================================
-- RLS POLICIES (Basic templates - customize as needed)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.containers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gate_in_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gate_out_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edi_transmission_logs ENABLE ROW LEVEL SECURITY;

-- Basic policies (these should be customized for your security requirements)

-- Users: Allow authenticated users to read all, update only their own
DROP POLICY IF EXISTS "Users can view all users" ON public.users;
CREATE POLICY "Users can view all users" ON public.users
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can update own record" ON public.users;
CREATE POLICY "Users can update own record" ON public.users
    FOR UPDATE USING (auth.uid() = auth_user_id OR auth.role() = 'service_role');

-- Containers: Allow authenticated users to read, with write based on role
DROP POLICY IF EXISTS "Authenticated users can view containers" ON public.containers;
CREATE POLICY "Authenticated users can view containers" ON public.containers
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins can manage containers" ON public.containers;
CREATE POLICY "Admins can manage containers" ON public.containers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.auth_user_id = auth.uid()
            AND users.role IN ('admin', 'super_admin')
        )
    );

-- Similar policies for other tables
DROP POLICY IF EXISTS "Authenticated users can view stacks" ON public.stacks;
CREATE POLICY "Authenticated users can view stacks" ON public.stacks
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can view locations" ON public.locations;
CREATE POLICY "Authenticated users can view locations" ON public.locations
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can view clients" ON public.clients;
CREATE POLICY "Authenticated users can view clients" ON public.clients
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can view operations" ON public.gate_in_operations;
CREATE POLICY "Authenticated users can view operations" ON public.gate_in_operations
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can view operations" ON public.gate_out_operations;
CREATE POLICY "Authenticated users can view operations" ON public.gate_out_operations
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can view bookings" ON public.booking_references;
CREATE POLICY "Authenticated users can view bookings" ON public.booking_references
    FOR SELECT USING (auth.role() = 'authenticated');

COMMIT;

-- ============================================
-- END OF FUNCTIONS AND TRIGGERS
-- ============================================
