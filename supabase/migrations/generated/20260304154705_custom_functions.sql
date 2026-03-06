-- Custom Functions Migration
-- Generated: 2026-03-04T15:47:03.642Z

BEGIN;


-- Function: add_container_audit_log
CREATE OR REPLACE FUNCTION public.add_container_audit_log()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;


-- Function: analyze_location_query_performance
CREATE OR REPLACE FUNCTION public.analyze_location_query_performance()
 RETURNS TABLE(query_type text, avg_execution_time_ms numeric, total_calls bigint, cache_hit_ratio numeric)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    'location_availability'::TEXT as query_type,
    0.0::NUMERIC as avg_execution_time_ms,
    0::BIGINT as total_calls,
    0.0::NUMERIC as cache_hit_ratio;
  -- This is a placeholder - actual implementation would query pg_stat_statements
END;
$function$
;


-- Function: analyze_module_access_performance
CREATE OR REPLACE FUNCTION public.analyze_module_access_performance()
 RETURNS TABLE(table_name text, index_name text, index_size text, table_size text, index_usage_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    schemaname||'.'||tablename as table_name,
    indexname as index_name,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
    idx_scan as index_usage_count
  FROM pg_stat_user_indexes 
  WHERE 
    tablename IN ('users', 'user_module_access', 'module_access_sync_log')
    AND indexname LIKE '%module_access%' OR indexname LIKE '%sync%'
  ORDER BY pg_relation_size(indexrelid) DESC;
END;
$function$
;


-- Function: assign_container_to_location
CREATE OR REPLACE FUNCTION public.assign_container_to_location(p_location_id text, p_container_id uuid, p_container_number text)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_location RECORD;
  v_pair RECORD;
  v_row INTEGER;
  v_tier INTEGER;
BEGIN
  -- Check if location is available
  IF NOT is_location_available(p_location_id) THEN
    RAISE EXCEPTION 'Location % is not available', p_location_id;
  END IF;
  
  -- Get location details
  SELECT * INTO v_location
  FROM locations
  WHERE location_id = p_location_id
  LIMIT 1;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Location % not found', p_location_id;
  END IF;
  
  -- Update the virtual location
  UPDATE locations
  SET 
    is_occupied = true,
    available = false,
    container_id = p_container_id,
    container_number = p_container_number,
    updated_at = now()
  WHERE location_id = p_location_id;
  
  -- If this is a virtual location (40ft), also mark physical locations as occupied
  IF v_location.is_virtual AND v_location.virtual_stack_pair_id IS NOT NULL THEN
    SELECT * INTO v_pair
    FROM virtual_stack_pairs
    WHERE id = v_location.virtual_stack_pair_id;
    
    IF FOUND THEN
      v_row := v_location.row_number;
      v_tier := v_location.tier_number;
      
      -- Mark physical location 1 as occupied
      UPDATE locations
      SET 
        is_occupied = true,
        available = false,
        container_id = p_container_id,
        container_number = p_container_number,
        updated_at = now()
      WHERE yard_id = v_location.yard_id
        AND stack_id = v_pair.stack1_id
        AND row_number = v_row
        AND tier_number = v_tier;
      
      -- Mark physical location 2 as occupied
      UPDATE locations
      SET 
        is_occupied = true,
        available = false,
        container_id = p_container_id,
        container_number = p_container_number,
        updated_at = now()
      WHERE yard_id = v_location.yard_id
        AND stack_id = v_pair.stack2_id
        AND row_number = v_row
        AND tier_number = v_tier;
    END IF;
  END IF;
  
  RETURN true;
END;
$function$
;


-- Function: auto_create_edi_transmission_on_gate_completion
CREATE OR REPLACE FUNCTION public.auto_create_edi_transmission_on_gate_completion()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_client_id uuid;
  v_client_code text;
  v_client_name text;
  v_edi_log_id uuid;
  v_operation_type text;
BEGIN
  -- Only process when status changes to 'completed' and container is assigned
  IF NEW.status = 'completed' AND NEW.assigned_location IS NOT NULL AND 
     (OLD.status IS NULL OR OLD.status != 'completed') THEN
    
    -- Determine operation type based on table
    IF TG_TABLE_NAME = 'gate_in_operations' THEN
      v_operation_type := 'GATE_IN';
    ELSIF TG_TABLE_NAME = 'gate_out_operations' THEN
      v_operation_type := 'GATE_OUT';
    ELSE
      RETURN NEW; -- Unknown table, skip EDI processing
    END IF;

    -- Get client information
    SELECT id, code, name INTO v_client_id, v_client_code, v_client_name
    FROM clients 
    WHERE code = NEW.client_code;

    -- Check if client has EDI enabled (only if EDI functions exist)
    IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'get_edi_config_for_client') THEN
      IF EXISTS (
        SELECT 1 FROM get_edi_config_for_client(v_client_code, v_client_name)
        WHERE edi_enabled = true
      ) THEN
        -- Create EDI transmission log (only if function exists)
        IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'log_edi_transmission') THEN
          SELECT log_edi_transmission(
            NEW.container_number,
            v_operation_type,
            NEW.container_id,
            NEW.id,
            v_client_id
          ) INTO v_edi_log_id;

          -- Update the operation with EDI log reference
          NEW.edi_log_id := v_edi_log_id;
          NEW.edi_transmitted := false; -- Will be updated to true when transmission succeeds
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$
;


-- Function: auto_mark_buffer_zones
CREATE OR REPLACE FUNCTION public.auto_mark_buffer_zones()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Only process if this looks like a buffer zone and fields aren't already set by the application
  IF (NEW.section_name ILIKE 'BUFFER%' OR 
      NEW.section_name ILIKE 'DMG%' OR 
      NEW.section_name ILIKE '%TAMPON%' OR
      NEW.notes ILIKE '%ZONE TAMPON%' OR
      NEW.stack_number >= 9000) THEN
    
    -- Only set buffer zone fields if they haven't been explicitly set by the application
    IF NEW.is_buffer_zone IS NULL OR NEW.is_buffer_zone = false THEN
      NEW.is_buffer_zone = true;
    END IF;
    
    IF NEW.buffer_zone_type IS NULL THEN
      NEW.buffer_zone_type = 'damage';
    END IF;
    
    IF NEW.is_special_stack IS NULL OR NEW.is_special_stack = false THEN
      NEW.is_special_stack = true;
    END IF;
    
    -- Only set damage_types_supported if it's NULL or empty
    -- This prevents conflicts with application-level JSONB handling
    IF NEW.damage_types_supported IS NULL OR NEW.damage_types_supported = '[]'::jsonb THEN
      -- Extract damage type from section name if possible
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
    -- For non-buffer zones, ensure fields have proper defaults if not set
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
    -- If there's any error in the trigger, log it but don't fail the operation
    RAISE WARNING 'Error in auto_mark_buffer_zones trigger: %', SQLERRM;
    RETURN NEW;
END;
$function$
;


-- Function: calculate_session_duration
CREATE OR REPLACE FUNCTION public.calculate_session_duration()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF NEW.logout_time IS NOT NULL AND NEW.login_time IS NOT NULL THEN
        NEW.session_duration_minutes := EXTRACT(EPOCH FROM (NEW.logout_time - NEW.login_time)) / 60;
    END IF;
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$function$
;


-- Function: calculate_stack_capacity
CREATE OR REPLACE FUNCTION public.calculate_stack_capacity(p_rows integer, p_max_tiers integer, p_row_tier_config jsonb)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
  total_capacity INTEGER := 0;
  row_config JSONB;
  row_num INTEGER;
  row_tiers INTEGER;
BEGIN
  -- If no custom config, use uniform tiers
  IF p_row_tier_config IS NULL THEN
    RETURN p_rows * p_max_tiers;
  END IF;
  
  -- Calculate capacity from row_tier_config
  FOR row_config IN SELECT * FROM jsonb_array_elements(p_row_tier_config)
  LOOP
    row_num := (row_config->>'row')::INTEGER;
    row_tiers := (row_config->>'maxTiers')::INTEGER;
    
    -- Only count rows that are within the stack's row count
    IF row_num <= p_rows THEN
      total_capacity := total_capacity + row_tiers;
    END IF;
  END LOOP;
  
  -- If config doesn't cover all rows, add remaining rows with default max_tiers
  IF jsonb_array_length(p_row_tier_config) < p_rows THEN
    total_capacity := total_capacity + 
      (p_rows - jsonb_array_length(p_row_tier_config)) * p_max_tiers;
  END IF;
  
  RETURN total_capacity;
END;
$function$
;


-- Function: check_container_deletion_constraints
CREATE OR REPLACE FUNCTION public.check_container_deletion_constraints(container_uuid uuid)
 RETURNS TABLE(can_delete boolean, blocking_reason text, gate_in_count integer, gate_out_count integer, location_assigned boolean, current_status text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_gate_in_count INTEGER;
  v_gate_out_count INTEGER;
  v_location TEXT;
  v_status TEXT;
  v_can_delete BOOLEAN := true;
  v_reason TEXT := '';
BEGIN
  SELECT c.location, c.status INTO v_location, v_status
  FROM containers c WHERE c.id = container_uuid;

  SELECT COUNT(*) INTO v_gate_in_count FROM gate_in_operations WHERE container_id = container_uuid;
  SELECT COUNT(*) INTO v_gate_out_count FROM gate_out_operations 
  WHERE processed_container_ids @> to_jsonb(ARRAY[container_uuid::text]);

  IF v_status IN ('in_depot', 'gate_in') THEN
    v_can_delete := false;
    v_reason := 'Container is currently in depot. Please gate it out first.';
  END IF;

  IF v_location IS NOT NULL AND v_location != '' THEN
    IF v_can_delete THEN
      v_can_delete := false;
      v_reason := 'Container has an assigned location (' || v_location || '). Please remove location assignment first.';
    END IF;
  END IF;

  RETURN QUERY SELECT v_can_delete, v_reason, v_gate_in_count, v_gate_out_count,
    (v_location IS NOT NULL AND v_location != ''), v_status;
END;
$function$
;


-- Function: check_row_reduction_safety
CREATE OR REPLACE FUNCTION public.check_row_reduction_safety(p_stack_id uuid, p_new_row_count integer)
 RETURNS TABLE(is_safe boolean, affected_containers integer, max_row_in_use integer)
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_stack RECORD;
  v_affected_count INTEGER;
  v_max_row INTEGER;
BEGIN
  -- Get stack details
  SELECT * INTO v_stack FROM stacks WHERE id = p_stack_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0, 0;
    RETURN;
  END IF;
  
  -- Find containers in rows that would be removed
  SELECT COUNT(*), MAX(
    CASE 
      WHEN location ~ 'R(\d+)' THEN substring(location from 'R(\d+)')::INTEGER
      ELSE 0
    END
  )
  INTO v_affected_count, v_max_row
  FROM containers
  WHERE yard_id = v_stack.yard_id
    AND (
      location ~ ('^S' || LPAD(v_stack.stack_number::TEXT, 2, '0') || 'R\d+H\d+$')
      OR location ~ ('^S' || LPAD(v_stack.stack_number::TEXT, 2, '0') || '-R\d+-H\d+$')
    )
    AND status IN ('in_depot', 'gate_in')
    AND (
      CASE 
        WHEN location ~ 'R(\d+)' THEN substring(location from 'R(\d+)')::INTEGER
        ELSE 0
      END
    ) > p_new_row_count;
  
  RETURN QUERY SELECT 
    v_affected_count = 0,
    COALESCE(v_affected_count, 0),
    COALESCE(v_max_row, 0);
END;
$function$
;


-- Function: cleanup_old_edi_logs
CREATE OR REPLACE FUNCTION public.cleanup_old_edi_logs(p_days_to_keep integer DEFAULT 90)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_deleted_count integer;
BEGIN
  DELETE FROM edi_transmission_logs
  WHERE created_at < CURRENT_DATE - INTERVAL '1 day' * p_days_to_keep;
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RAISE NOTICE 'Cleaned up % old EDI transmission logs', v_deleted_count;
  RETURN v_deleted_count;
END;
$function$
;


-- Function: create_virtual_stacks
CREATE OR REPLACE FUNCTION public.create_virtual_stacks()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_yard_id TEXT;
  v_pairing RECORD;
  v_first_stack RECORD;
  v_second_stack RECORD;
  v_virtual_stack_num INTEGER;
  v_section_id TEXT;
BEGIN
  -- Get all stack pairings
  FOR v_pairing IN 
    SELECT DISTINCT yard_id, first_stack_number, second_stack_number, virtual_stack_number
    FROM stack_pairings
    WHERE is_active = true
  LOOP
    -- Get first stack details
    SELECT * INTO v_first_stack
    FROM stacks
    WHERE yard_id = v_pairing.yard_id 
      AND stack_number = v_pairing.first_stack_number
    LIMIT 1;
    
    -- Get second stack details
    SELECT * INTO v_second_stack
    FROM stacks
    WHERE yard_id = v_pairing.yard_id 
      AND stack_number = v_pairing.second_stack_number
    LIMIT 1;
    
    IF v_first_stack.id IS NOT NULL AND v_second_stack.id IS NOT NULL THEN
      v_virtual_stack_num := v_pairing.virtual_stack_number;
      v_section_id := v_first_stack.section_id;
      
      -- Check if virtual stack already exists
      IF NOT EXISTS (
        SELECT 1 FROM stacks 
        WHERE yard_id = v_pairing.yard_id 
          AND stack_number = v_virtual_stack_num
      ) THEN
        -- Create virtual stack with same configuration as physical stacks
        INSERT INTO stacks (
          yard_id,
          stack_number,
          section_id,
          section_name,
          rows,
          max_tiers,
          capacity,
          current_occupancy,
          position_x,
          position_y,
          position_z,
          width,
          length,
          is_active,
          is_virtual,
          is_odd_stack,
          container_size,
          notes,
          created_at,
          updated_at,
          -- Add buffer zone fields with appropriate defaults
          is_buffer_zone,
          buffer_zone_type,
          damage_types_supported
        ) VALUES (
          v_pairing.yard_id,
          v_virtual_stack_num,
          v_section_id,
          v_first_stack.section_name,
          v_first_stack.rows,
          v_first_stack.max_tiers,
          v_first_stack.capacity, -- Same capacity as one physical stack
          0, -- Will be calculated
          (v_first_stack.position_x + v_second_stack.position_x) / 2, -- Midpoint
          (v_first_stack.position_y + v_second_stack.position_y) / 2,
          v_first_stack.position_z,
          v_first_stack.width,
          v_first_stack.length * 2, -- 40ft length
          true,
          true, -- This is a virtual stack
          false,
          '40ft',
          'Virtual stack for 40ft containers spanning S' || v_pairing.first_stack_number || ' and S' || v_pairing.second_stack_number,
          now(),
          now(),
          -- Buffer zone defaults for virtual stacks
          false, -- Virtual stacks are not buffer zones
          null,  -- No buffer zone type
          '[]'::jsonb -- Empty damage types array
        )
        ON CONFLICT (yard_id, stack_number) DO UPDATE
        SET 
          is_virtual = true,
          container_size = '40ft',
          updated_at = now(),
          -- Ensure buffer zone fields are set
          is_buffer_zone = COALESCE(EXCLUDED.is_buffer_zone, false),
          buffer_zone_type = EXCLUDED.buffer_zone_type,
          damage_types_supported = COALESCE(EXCLUDED.damage_types_supported, '[]'::jsonb);
        
        RAISE NOTICE 'Created virtual stack S% for yard %', v_virtual_stack_num, v_pairing.yard_id;
      ELSE
        -- Update existing stack to mark as virtual
        UPDATE stacks
        SET 
          is_virtual = true,
          container_size = '40ft',
          updated_at = now(),
          -- Ensure buffer zone fields are properly set for existing virtual stacks
          is_buffer_zone = COALESCE(is_buffer_zone, false),
          buffer_zone_type = buffer_zone_type,
          damage_types_supported = COALESCE(damage_types_supported, '[]'::jsonb)
        WHERE yard_id = v_pairing.yard_id 
          AND stack_number = v_virtual_stack_num;
        
        RAISE NOTICE 'Updated stack S% to virtual for yard %', v_virtual_stack_num, v_pairing.yard_id;
      END IF;
      
      -- Update physical stacks to mark as 40ft
      UPDATE stacks
      SET 
        container_size = '40ft',
        updated_at = now()
      WHERE yard_id = v_pairing.yard_id 
        AND stack_number IN (v_pairing.first_stack_number, v_pairing.second_stack_number);
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Virtual stacks creation completed';
END;
$function$
;


-- Function: generate_locations_for_stack
CREATE OR REPLACE FUNCTION public.generate_locations_for_stack(p_stack_id uuid, p_yard_id text, p_stack_number integer, p_rows integer, p_max_tiers integer, p_is_virtual boolean DEFAULT false, p_virtual_stack_pair_id uuid DEFAULT NULL::uuid)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_row INTEGER;
  v_tier INTEGER;
  v_location_id TEXT;
  v_count INTEGER := 0;
BEGIN
  -- Generate location for each row and tier combination
  FOR v_row IN 1..p_rows LOOP
    FOR v_tier IN 1..p_max_tiers LOOP
      -- Format: S01R1H1, S04R2H3, etc.
      v_location_id := 'S' || LPAD(p_stack_number::TEXT, 2, '0') || 
                       'R' || v_row || 
                       'H' || v_tier;
      
      -- Insert location if it doesn't exist
      INSERT INTO locations (
        location_id,
        stack_id,
        yard_id,
        row_number,
        tier_number,
        is_virtual,
        virtual_stack_pair_id,
        is_occupied,
        available,
        is_active,
        created_at,
        updated_at
      ) VALUES (
        v_location_id,
        p_stack_id,
        p_yard_id,
        v_row,
        v_tier,
        p_is_virtual,
        p_virtual_stack_pair_id,
        false,
        true,
        true,
        now(),
        now()
      )
      ON CONFLICT (location_id) DO UPDATE
      SET 
        stack_id = EXCLUDED.stack_id,
        is_virtual = EXCLUDED.is_virtual,
        virtual_stack_pair_id = EXCLUDED.virtual_stack_pair_id,
        updated_at = now();
      
      v_count := v_count + 1;
    END LOOP;
  END LOOP;
  
  RETURN v_count;
END;
$function$
;


-- Function: get_buffer_zone_stats
CREATE OR REPLACE FUNCTION public.get_buffer_zone_stats(p_yard_id text)
 RETURNS TABLE(total_buffer_stacks integer, total_capacity integer, current_occupancy integer, available_spaces integer, utilization_rate numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(bzs.total_buffer_stacks, 0)::INTEGER,
    COALESCE(bzs.total_capacity, 0)::INTEGER,
    COALESCE(bzs.current_occupancy, 0)::INTEGER,
    COALESCE(bzs.available_spaces, 0)::INTEGER,
    COALESCE(bzs.utilization_rate, 0)::DECIMAL
  FROM buffer_zone_stats bzs
  WHERE bzs.yard_id = p_yard_id;
  
  -- Si aucun résultat, retourner des zéros
  IF NOT FOUND THEN
    RETURN QUERY SELECT 0, 0, 0, 0, 0.0::DECIMAL;
  END IF;
END;
$function$
;


-- Function: get_client_edi_status
CREATE OR REPLACE FUNCTION public.get_client_edi_status(p_client_code text, p_client_name text DEFAULT NULL::text, p_operation text DEFAULT NULL::text)
 RETURNS TABLE(edi_enabled boolean, gate_in_enabled boolean, gate_out_enabled boolean, server_config_id uuid, server_name text)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(ecs.edi_enabled, false) as edi_enabled,
    COALESCE(ecs.enable_gate_in, false) as gate_in_enabled,
    COALESCE(ecs.enable_gate_out, false) as gate_out_enabled,
    ecs.server_config_id,
    esc.name as server_name
  FROM clients c
  LEFT JOIN edi_client_settings ecs ON c.id = ecs.client_id
  LEFT JOIN edi_server_configurations esc ON ecs.server_config_id = esc.id
  WHERE c.code = p_client_code
     OR (p_client_name IS NOT NULL AND c.name = p_client_name)
  LIMIT 1;

  -- If no specific client settings found, check if client has auto_edi enabled
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      COALESCE(c.auto_edi, false) as edi_enabled,
      COALESCE(c.auto_edi, false) as gate_in_enabled,
      COALESCE(c.auto_edi, false) as gate_out_enabled,
      esc.id as server_config_id,
      esc.name as server_name
    FROM clients c
    CROSS JOIN edi_server_configurations esc
    WHERE (c.code = p_client_code OR (p_client_name IS NOT NULL AND c.name = p_client_name))
      AND esc.is_default = true
      AND esc.enabled = true
    LIMIT 1;
  END IF;
END;
$function$
;


-- Function: get_container_audit_logs
CREATE OR REPLACE FUNCTION public.get_container_audit_logs(container_id_param uuid)
 RETURNS TABLE(logged_at timestamp with time zone, user_name text, action text, details text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;


-- Function: get_current_user_role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT role
  FROM public.users
  WHERE auth_user_id = auth.uid()
    AND active = true
  LIMIT 1;
$function$
;


-- Function: get_edi_config_for_client
CREATE OR REPLACE FUNCTION public.get_edi_config_for_client(p_client_code text, p_client_name text DEFAULT NULL::text)
 RETURNS TABLE(config_id uuid, config_name text, server_type text, host text, port integer, enabled boolean, edi_enabled boolean)
 LANGUAGE plpgsql
AS $function$
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
$function$
;


-- Function: get_edi_realtime_stats
CREATE OR REPLACE FUNCTION public.get_edi_realtime_stats()
 RETURNS TABLE(total_operations bigint, operations_with_edi bigint, clients_with_edi bigint, total_clients bigint, success_rate numeric, servers_configured bigint, last_transmission timestamp with time zone)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    -- Total operations from gate operations
    (
      SELECT COUNT(*) 
      FROM (
        SELECT 1 FROM gate_in_operations WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
        UNION ALL
        SELECT 1 FROM gate_out_operations WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
      ) ops
    ) as total_operations,
    
    -- Operations with EDI
    (
      SELECT COUNT(*) 
      FROM (
        SELECT 1 FROM gate_in_operations WHERE edi_transmitted = true AND created_at >= CURRENT_DATE - INTERVAL '30 days'
        UNION ALL
        SELECT 1 FROM gate_out_operations WHERE edi_transmitted = true AND created_at >= CURRENT_DATE - INTERVAL '30 days'
      ) ops_edi
    ) as operations_with_edi,
    
    -- Clients with EDI enabled
    (
      SELECT COUNT(DISTINCT c.id)
      FROM clients c
      LEFT JOIN edi_client_settings ecs ON c.id = ecs.client_id
      WHERE c.active = true 
        AND (c.auto_edi = true OR ecs.edi_enabled = true)
    ) as clients_with_edi,
    
    -- Total active clients
    (SELECT COUNT(*) FROM clients WHERE active = true) as total_clients,
    
    -- Success rate from dashboard stats
    COALESCE((SELECT success_rate FROM edi_dashboard_stats LIMIT 1), 0) as success_rate,
    
    -- Configured servers
    (SELECT COUNT(*) FROM edi_server_configurations WHERE enabled = true) as servers_configured,
    
    -- Last transmission
    (SELECT MAX(created_at) FROM edi_transmission_logs) as last_transmission;
END;
$function$
;


-- Function: get_edi_system_health
CREATE OR REPLACE FUNCTION public.get_edi_system_health()
 RETURNS TABLE(component text, status text, details jsonb)
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Server configurations health
  RETURN QUERY
  SELECT 
    'Server Configurations' as component,
    CASE 
      WHEN COUNT(*) FILTER (WHERE enabled = true) = 0 THEN 'ERROR'
      WHEN COUNT(*) FILTER (WHERE enabled = true) = 1 AND bool_or(is_default) THEN 'WARNING'
      ELSE 'OK'
    END as status,
    jsonb_build_object(
      'total_servers', COUNT(*),
      'enabled_servers', COUNT(*) FILTER (WHERE enabled = true),
      'default_server_exists', bool_or(is_default AND enabled),
      'servers_with_clients', COUNT(*) FILTER (WHERE jsonb_array_length(assigned_clients) > 0)
    ) as details
  FROM edi_server_configurations;
  
  -- Client settings health
  RETURN QUERY
  SELECT 
    'Client Settings' as component,
    CASE 
      WHEN clients_with_edi_settings = 0 THEN 'WARNING'
      WHEN clients_with_edi_settings < total_active_clients * 0.5 THEN 'WARNING'
      ELSE 'OK'
    END as status,
    jsonb_build_object(
      'total_active_clients', total_active_clients,
      'clients_with_edi_settings', clients_with_edi_settings,
      'clients_with_edi_enabled', clients_with_edi_enabled,
      'coverage_percentage', ROUND((clients_with_edi_settings::numeric / NULLIF(total_active_clients, 0)::numeric) * 100, 2)
    ) as details
  FROM (
    SELECT 
      COUNT(*) FILTER (WHERE c.active = true) as total_active_clients,
      COUNT(ecs.id) as clients_with_edi_settings,
      COUNT(*) FILTER (WHERE ecs.edi_enabled = true) as clients_with_edi_enabled
    FROM clients c
    LEFT JOIN edi_client_settings ecs ON c.id = ecs.client_id
  ) stats;
  
  -- Transmission health (last 24 hours)
  RETURN QUERY
  SELECT 
    'Recent Transmissions' as component,
    CASE 
      WHEN total_transmissions = 0 THEN 'INFO'
      WHEN success_rate < 80 THEN 'ERROR'
      WHEN success_rate < 95 THEN 'WARNING'
      ELSE 'OK'
    END as status,
    jsonb_build_object(
      'total_transmissions_24h', total_transmissions,
      'successful_transmissions', successful_transmissions,
      'failed_transmissions', failed_transmissions,
      'success_rate', success_rate,
      'avg_attempts', avg_attempts
    ) as details
  FROM (
    SELECT 
      COUNT(*) as total_transmissions,
      COUNT(*) FILTER (WHERE status = 'success') as successful_transmissions,
      COUNT(*) FILTER (WHERE status = 'failed') as failed_transmissions,
      CASE 
        WHEN COUNT(*) > 0 THEN 
          ROUND((COUNT(*) FILTER (WHERE status = 'success')::numeric / COUNT(*)::numeric) * 100, 2)
        ELSE 0 
      END as success_rate,
      ROUND(AVG(attempts), 2) as avg_attempts
    FROM edi_transmission_logs
    WHERE created_at >= CURRENT_DATE - INTERVAL '24 hours'
  ) recent_stats;
END;
$function$
;


-- Function: get_recent_audit_activity
CREATE OR REPLACE FUNCTION public.get_recent_audit_activity(limit_count integer DEFAULT 50)
 RETURNS TABLE(container_id uuid, container_number text, logged_at timestamp with time zone, user_name text, action text, details text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;


-- Function: get_sync_inconsistencies
CREATE OR REPLACE FUNCTION public.get_sync_inconsistencies()
 RETURNS TABLE(user_id uuid, username text, email text, has_users_module_access boolean, has_user_module_access boolean, users_permissions jsonb, uma_permissions jsonb, permissions_match boolean, last_sync_at timestamp with time zone, sync_version integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(u.id, uma.user_id) as user_id,
    u.username,
    u.email,
    (u.module_access IS NOT NULL) as has_users_module_access,
    (uma.module_permissions IS NOT NULL) as has_user_module_access,
    u.module_access as users_permissions,
    uma.module_permissions as uma_permissions,
    CASE 
      WHEN u.module_access IS NULL AND uma.module_permissions IS NULL THEN true
      WHEN u.module_access IS NULL OR uma.module_permissions IS NULL THEN false
      ELSE u.module_access = uma.module_permissions
    END as permissions_match,
    uma.last_sync_at,
    uma.sync_version
  FROM users u
  FULL OUTER JOIN user_module_access uma ON u.id = uma.user_id
  WHERE 
    u.deleted_at IS NULL
    AND (
      -- Cases where sync is needed
      (u.module_access IS NOT NULL AND uma.module_permissions IS NULL) OR
      (u.module_access IS NULL AND uma.module_permissions IS NOT NULL) OR
      (u.module_access IS NOT NULL AND uma.module_permissions IS NOT NULL AND u.module_access != uma.module_permissions)
    )
  ORDER BY COALESCE(u.username, 'zzz_unknown');
END;
$function$
;


-- Function: get_sync_query_recommendations
CREATE OR REPLACE FUNCTION public.get_sync_query_recommendations()
 RETURNS TABLE(recommendation_type text, description text, suggested_action text, priority text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    'Index Usage'::text as recommendation_type,
    'Monitor index usage for module access queries'::text as description,
    'Run analyze_module_access_performance() regularly'::text as suggested_action,
    'Medium'::text as priority
  
  UNION ALL
  
  SELECT 
    'Materialized View Refresh'::text,
    'Keep sync health summary up to date'::text,
    'Schedule refresh_sync_health_summary() every hour'::text,
    'Low'::text
  
  UNION ALL
  
  SELECT 
    'Sync Inconsistency Monitoring'::text,
    'Regularly check for data inconsistencies'::text,
    'Run get_sync_inconsistencies() daily and alert on results'::text,
    'High'::text
  
  UNION ALL
  
  SELECT 
    'Old Sync Log Cleanup'::text,
    'Prevent sync log table from growing too large'::text,
    'Archive or delete sync logs older than 6 months'::text,
    'Medium'::text;
END;
$function$
;


-- Function: get_sync_statistics
CREATE OR REPLACE FUNCTION public.get_sync_statistics(p_user_id uuid DEFAULT NULL::uuid, p_days_back integer DEFAULT 30)
 RETURNS TABLE(total_syncs bigint, successful_syncs bigint, failed_syncs bigint, success_rate numeric, avg_duration_ms numeric, last_sync_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_syncs,
    COUNT(*) FILTER (WHERE sync_status = 'success') as successful_syncs,
    COUNT(*) FILTER (WHERE sync_status = 'failed') as failed_syncs,
    CASE 
      WHEN COUNT(*) > 0 THEN 
        ROUND((COUNT(*) FILTER (WHERE sync_status = 'success')::numeric / COUNT(*)::numeric) * 100, 2)
      ELSE 0
    END as success_rate,
    ROUND(AVG(sync_duration_ms), 2) as avg_duration_ms,
    MAX(created_at) as last_sync_at
  FROM module_access_sync_log
  WHERE 
    (p_user_id IS NULL OR user_id = p_user_id)
    AND created_at >= now() - (p_days_back || ' days')::interval;
END;
$function$
;


-- Function: get_virtual_stack_for_odd
CREATE OR REPLACE FUNCTION public.get_virtual_stack_for_odd(odd_stack integer)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
  virtual_stack INTEGER;
BEGIN
  -- Map odd stacks to their virtual stack numbers
  -- Virtual stack = lower odd stack + 1
  -- E.g., S03+S05 -> S04, S23+S25 -> S24
  
  CASE 
    WHEN odd_stack IN (3, 5) THEN virtual_stack := 4;
    WHEN odd_stack IN (7, 9) THEN virtual_stack := 8;
    WHEN odd_stack IN (11, 13) THEN virtual_stack := 12;
    WHEN odd_stack IN (15, 17) THEN virtual_stack := 16;
    WHEN odd_stack IN (19, 21) THEN virtual_stack := 20;
    WHEN odd_stack IN (23, 25) THEN virtual_stack := 24;
    WHEN odd_stack IN (27, 29) THEN virtual_stack := 28;
    WHEN odd_stack IN (33, 35) THEN virtual_stack := 34;
    WHEN odd_stack IN (37, 39) THEN virtual_stack := 38;
    WHEN odd_stack IN (41, 43) THEN virtual_stack := 42;
    WHEN odd_stack IN (45, 47) THEN virtual_stack := 46;
    WHEN odd_stack IN (49, 51) THEN virtual_stack := 50;
    WHEN odd_stack IN (53, 55) THEN virtual_stack := 54;
    WHEN odd_stack IN (61, 63) THEN virtual_stack := 62;
    WHEN odd_stack IN (65, 67) THEN virtual_stack := 66;
    WHEN odd_stack IN (69, 71) THEN virtual_stack := 70;
    WHEN odd_stack IN (73, 75) THEN virtual_stack := 74;
    WHEN odd_stack IN (77, 79) THEN virtual_stack := 78;
    WHEN odd_stack IN (81, 83) THEN virtual_stack := 82;
    WHEN odd_stack IN (85, 87) THEN virtual_stack := 86;
    WHEN odd_stack IN (89, 91) THEN virtual_stack := 90;
    WHEN odd_stack IN (93, 95) THEN virtual_stack := 94;
    WHEN odd_stack IN (97, 99) THEN virtual_stack := 98;
    ELSE virtual_stack := NULL;
  END CASE;
  
  RETURN virtual_stack;
END;
$function$
;


-- Function: handle_stack_soft_delete
CREATE OR REPLACE FUNCTION public.handle_stack_soft_delete()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- When a stack is deactivated (soft deleted)
  IF OLD.is_active = true AND NEW.is_active = false THEN
    -- Deactivate all locations for this stack
    UPDATE locations 
    SET 
      is_active = false,
      updated_at = NOW()
    WHERE stack_id = NEW.id AND is_active = true;
    
    -- Log the action
    RAISE NOTICE 'Stack S% soft deleted - deactivated % locations', 
      NEW.stack_number, 
      (SELECT COUNT(*) FROM locations WHERE stack_id = NEW.id);
      
  -- When a stack is reactivated
  ELSIF OLD.is_active = false AND NEW.is_active = true THEN
    -- Reactivate all locations for this stack
    UPDATE locations 
    SET 
      is_active = true,
      updated_at = NOW()
    WHERE stack_id = NEW.id AND is_active = false;
    
    -- Log the action
    RAISE NOTICE 'Stack S% reactivated - enabled % locations', 
      NEW.stack_number,
      (SELECT COUNT(*) FROM locations WHERE stack_id = NEW.id);
  END IF;
  
  RETURN NEW;
END;
$function$
;


-- Function: has_admin_users
CREATE OR REPLACE FUNCTION public.has_admin_users()
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE 
  admin_count integer;
BEGIN
  SELECT COUNT(*) INTO admin_count 
  FROM public.users
  WHERE role = 'admin' 
    AND active = true 
    AND is_deleted = false;
  
  RETURN admin_count > 0;
END;
$function$
;


-- Function: has_client_pool_access
CREATE OR REPLACE FUNCTION public.has_client_pool_access(check_pool_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
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
$function$
;


-- Function: has_role
CREATE OR REPLACE FUNCTION public.has_role(required_roles text[])
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE users.auth_user_id = auth.uid()
    AND users.role = ANY(required_roles)
    AND users.active = true
  );
END;
$function$
;


-- Function: has_yard_access
CREATE OR REPLACE FUNCTION public.has_yard_access(check_yard_id text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
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
$function$
;


-- Function: initialize_client_edi_settings
CREATE OR REPLACE FUNCTION public.initialize_client_edi_settings()
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_count integer := 0;
  client_rec record;
BEGIN
  -- Loop through clients that don't have EDI settings but have auto_edi enabled
  FOR client_rec IN 
    SELECT c.id, c.code, c.name, c.auto_edi
    FROM clients c
    WHERE c.active = true 
      AND c.auto_edi = true
      AND NOT EXISTS (
        SELECT 1 FROM edi_client_settings ecs WHERE ecs.client_id = c.id
      )
  LOOP
    -- Create EDI settings for this client
    INSERT INTO edi_client_settings (
      client_id,
      client_code,
      client_name,
      edi_enabled,
      enable_gate_in,
      enable_gate_out,
      server_config_id,
      priority,
      notes
    ) VALUES (
      client_rec.id,
      client_rec.code,
      client_rec.name,
      true,
      true,
      true,
      '00000000-0000-0000-0000-000000000001'::uuid,
      'normal',
      'Auto-initialized from client auto_edi setting'
    );
    
    v_count := v_count + 1;
  END LOOP;
  
  RETURN v_count;
END;
$function$
;


-- Function: is_admin
CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  user_role text;
BEGIN
  -- Get the role directly without RLS interference
  SELECT role INTO user_role
  FROM public.users
  WHERE auth_user_id = auth.uid()
    AND active = true
    AND (deleted_at IS NULL OR is_deleted = false)
  LIMIT 1;
  
  -- Return true if user is admin
  RETURN user_role = 'admin';
END;
$function$
;


-- Function: is_current_user_active
CREATE OR REPLACE FUNCTION public.is_current_user_active()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE auth_user_id = auth.uid()
      AND active = true
  );
$function$
;


-- Function: is_current_user_admin
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE auth_user_id = auth.uid()
      AND active = true
      AND role = 'admin'
  );
$function$
;


-- Function: is_location_available
CREATE OR REPLACE FUNCTION public.is_location_available(p_location_id text)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_location RECORD;
  v_is_virtual BOOLEAN;
  v_pair RECORD;
  v_row INTEGER;
  v_tier INTEGER;
  v_physical1_available BOOLEAN;
  v_physical2_available BOOLEAN;
BEGIN
  -- Get location details
  SELECT * INTO v_location
  FROM locations
  WHERE location_id = p_location_id
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- If location is not active, it's not available
  IF NOT v_location.is_active THEN
    RETURN false;
  END IF;
  
  -- If location is occupied, it's not available
  IF v_location.is_occupied THEN
    RETURN false;
  END IF;
  
  -- If this is a virtual location (40ft), check physical locations
  IF v_location.is_virtual AND v_location.virtual_stack_pair_id IS NOT NULL THEN
    -- Get the pairing information
    SELECT * INTO v_pair
    FROM virtual_stack_pairs
    WHERE id = v_location.virtual_stack_pair_id;
    
    IF FOUND THEN
      v_row := v_location.row_number;
      v_tier := v_location.tier_number;
      
      -- Check if both physical locations are available
      -- Physical location 1 (e.g., S03R1H1)
      SELECT available INTO v_physical1_available
      FROM locations
      WHERE yard_id = v_location.yard_id
        AND stack_id = v_pair.stack1_id
        AND row_number = v_row
        AND tier_number = v_tier
      LIMIT 1;
      
      -- Physical location 2 (e.g., S05R1H1)
      SELECT available INTO v_physical2_available
      FROM locations
      WHERE yard_id = v_location.yard_id
        AND stack_id = v_pair.stack2_id
        AND row_number = v_row
        AND tier_number = v_tier
      LIMIT 1;
      
      -- Virtual location is available only if BOTH physical locations are available
      RETURN COALESCE(v_physical1_available, false) AND COALESCE(v_physical2_available, false);
    END IF;
  END IF;
  
  -- For regular (20ft) locations, just check the available flag
  RETURN v_location.available;
END;
$function$
;


-- Function: is_location_valid_for_stack
CREATE OR REPLACE FUNCTION public.is_location_valid_for_stack(p_stack_number integer, p_row_number integer, p_tier_number integer)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_max_tiers_for_row INTEGER;
  v_default_max_tiers INTEGER;
BEGIN
  -- Get default max_tiers for the stack
  SELECT max_tiers INTO v_default_max_tiers
  FROM stacks
  WHERE stack_number = p_stack_number;
  
  -- If stack not found, return false
  IF v_default_max_tiers IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Apply known configurations for specific stacks
  CASE p_stack_number
    WHEN 1 THEN
      -- Stack 01 has specific row-tier configuration
      CASE p_row_number
        WHEN 1 THEN v_max_tiers_for_row := 3;  -- Row 1: max 3 tiers
        WHEN 2 THEN v_max_tiers_for_row := 4;  -- Row 2: max 4 tiers
        WHEN 3 THEN v_max_tiers_for_row := 5;  -- Row 3: max 5 tiers
        WHEN 4 THEN v_max_tiers_for_row := 5;  -- Row 4: max 5 tiers
        ELSE v_max_tiers_for_row := v_default_max_tiers;
      END CASE;
    ELSE
      -- For other stacks, use default max_tiers for all rows
      v_max_tiers_for_row := v_default_max_tiers;
  END CASE;
  
  -- Check if tier number is within allowed range
  RETURN p_tier_number <= v_max_tiers_for_row;
END;
$function$
;


-- Function: log_edi_transmission
CREATE OR REPLACE FUNCTION public.log_edi_transmission(p_container_number text, p_operation text, p_container_id uuid DEFAULT NULL::uuid, p_gate_operation_id uuid DEFAULT NULL::uuid, p_client_id uuid DEFAULT NULL::uuid, p_config_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
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
$function$
;


-- Function: log_location_changes
CREATE OR REPLACE FUNCTION public.log_location_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;


-- Function: log_module_access_sync
CREATE OR REPLACE FUNCTION public.log_module_access_sync(p_user_id uuid, p_sync_type text, p_source_table text, p_target_table text, p_old_permissions jsonb, p_new_permissions jsonb, p_sync_status text, p_error_message text DEFAULT NULL::text, p_sync_duration_ms integer DEFAULT NULL::integer, p_created_by uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  log_id uuid;
BEGIN
  INSERT INTO module_access_sync_log (
    user_id,
    sync_type,
    source_table,
    target_table,
    old_permissions,
    new_permissions,
    sync_status,
    error_message,
    sync_duration_ms,
    created_by
  ) VALUES (
    p_user_id,
    p_sync_type,
    p_source_table,
    p_target_table,
    p_old_permissions,
    p_new_permissions,
    p_sync_status,
    p_error_message,
    p_sync_duration_ms,
    p_created_by
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$function$
;


-- Function: log_user_activity
CREATE OR REPLACE FUNCTION public.log_user_activity(p_user_id uuid, p_action character varying, p_entity_type character varying DEFAULT NULL::character varying, p_entity_id uuid DEFAULT NULL::uuid, p_description text DEFAULT NULL::text, p_metadata jsonb DEFAULT '{}'::jsonb, p_ip_address character varying DEFAULT NULL::character varying, p_user_agent text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_activity_id UUID;
BEGIN
    INSERT INTO public.user_activities (
        user_id,
        action,
        entity_type,
        entity_id,
        description,
        metadata,
        ip_address,
        user_agent
    ) VALUES (
        p_user_id,
        p_action,
        p_entity_type,
        p_entity_id,
        p_description,
        p_metadata,
        p_ip_address,
        p_user_agent
    )
    RETURNING id INTO v_activity_id;
    
    RETURN v_activity_id;
END;
$function$
;


-- Function: migrate_40ft_container_locations
CREATE OR REPLACE FUNCTION public.migrate_40ft_container_locations()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_container RECORD;
  v_stack_num INTEGER;
  v_row INTEGER;
  v_tier INTEGER;
  v_pairing RECORD;
  v_virtual_stack_num INTEGER;
  v_new_location TEXT;
BEGIN
  -- Find all 40ft containers
  FOR v_container IN 
    SELECT id, number, location, size, yard_id
    FROM containers
    WHERE size = '40ft' 
      AND location IS NOT NULL
      AND location ~ '^S\d+-R\d+-H\d+$'
  LOOP
    -- Parse location (e.g., S03-R1-H1)
    v_stack_num := substring(v_container.location from 'S(\d+)')::INTEGER;
    v_row := substring(v_container.location from 'R(\d+)')::INTEGER;
    v_tier := substring(v_container.location from 'H(\d+)')::INTEGER;
    
    -- Find if this stack is part of a pairing
    SELECT * INTO v_pairing
    FROM stack_pairings
    WHERE yard_id = v_container.yard_id
      AND (first_stack_number = v_stack_num OR second_stack_number = v_stack_num)
      AND is_active = true
    LIMIT 1;
    
    IF v_pairing.virtual_stack_number IS NOT NULL THEN
      -- Use virtual stack number
      v_virtual_stack_num := v_pairing.virtual_stack_number;
      v_new_location := 'S' || LPAD(v_virtual_stack_num::TEXT, 2, '0') || '-R' || v_row || '-H' || v_tier;
      
      -- Update container location
      UPDATE containers
      SET 
        location = v_new_location,
        updated_at = now()
      WHERE id = v_container.id;
      
      RAISE NOTICE 'Migrated container % from % to %', v_container.number, v_container.location, v_new_location;
    END IF;
  END LOOP;
  
  RAISE NOTICE '40ft container location migration completed';
END;
$function$
;


-- Function: permanently_delete_inactive_stack
CREATE OR REPLACE FUNCTION public.permanently_delete_inactive_stack(p_stack_id uuid, p_deleted_by text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_stack_number INTEGER;
  v_is_active BOOLEAN;
  v_location_count INTEGER;
  v_occupied_locations INTEGER;
BEGIN
  -- Get stack info
  SELECT stack_number, is_active INTO v_stack_number, v_is_active
  FROM stacks 
  WHERE id = p_stack_id;
  
  IF v_stack_number IS NULL THEN
    RAISE NOTICE 'Stack with ID % not found', p_stack_id;
    RETURN false;
  END IF;
  
  IF v_is_active = true THEN
    RAISE NOTICE 'Cannot permanently delete active stack S%. Use soft delete first.', v_stack_number;
    RETURN false;
  END IF;
  
  -- Check for occupied locations
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE is_occupied = true)
  INTO v_location_count, v_occupied_locations
  FROM locations 
  WHERE stack_id = p_stack_id;
  
  IF v_occupied_locations > 0 THEN
    RAISE NOTICE 'Cannot permanently delete stack S% - has % occupied locations', 
      v_stack_number, v_occupied_locations;
    RETURN false;
  END IF;
  
  -- Delete locations first (they reference the stack)
  DELETE FROM locations WHERE stack_id = p_stack_id;
  
  -- Delete the stack
  DELETE FROM stacks WHERE id = p_stack_id;
  
  RAISE NOTICE 'Permanently deleted inactive stack S% and % locations', 
    v_stack_number, v_location_count;
    
  RETURN true;
END;
$function$
;


-- Function: process_gate_in_edi
CREATE OR REPLACE FUNCTION public.process_gate_in_edi(p_operation_id uuid, p_container_number text, p_client_code text, p_container_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_client_id uuid;
  v_edi_status record;
  v_log_id uuid;
BEGIN
  -- Get client ID
  SELECT id INTO v_client_id FROM clients WHERE code = p_client_code;
  
  IF v_client_id IS NULL THEN
    RAISE NOTICE 'Client not found: %', p_client_code;
    RETURN NULL;
  END IF;

  -- Check EDI status
  SELECT * INTO v_edi_status 
  FROM get_client_edi_status(p_client_code, NULL, 'GATE_IN');

  -- Only process if EDI is enabled for gate in operations
  IF v_edi_status.edi_enabled AND v_edi_status.gate_in_enabled THEN
    -- Create transmission log
    v_log_id := log_edi_transmission(
      p_container_number,
      'GATE_IN',
      p_container_id,
      p_operation_id,
      v_client_id,
      v_edi_status.server_config_id
    );

    -- Update gate in operation with EDI info
    UPDATE gate_in_operations 
    SET 
      edi_transmitted = true,
      edi_transmission_date = now()
    WHERE id = p_operation_id;

    RAISE NOTICE 'EDI transmission logged for gate in operation: %', p_operation_id;
    RETURN v_log_id;
  ELSE
    RAISE NOTICE 'EDI not enabled for client % gate in operations', p_client_code;
    RETURN NULL;
  END IF;
END;
$function$
;


-- Function: process_gate_out_edi
CREATE OR REPLACE FUNCTION public.process_gate_out_edi(p_operation_id uuid, p_booking_number text, p_client_code text, p_processed_container_ids jsonb DEFAULT NULL::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_client_id uuid;
  v_edi_status record;
  v_log_id uuid;
  v_container_id uuid;
  v_container_number text;
BEGIN
  -- Get client ID
  SELECT id INTO v_client_id FROM clients WHERE code = p_client_code;
  
  IF v_client_id IS NULL THEN
    RAISE NOTICE 'Client not found: %', p_client_code;
    RETURN NULL;
  END IF;

  -- Check EDI status
  SELECT * INTO v_edi_status 
  FROM get_client_edi_status(p_client_code, NULL, 'GATE_OUT');

  -- Only process if EDI is enabled for gate out operations
  IF v_edi_status.edi_enabled AND v_edi_status.gate_out_enabled THEN
    -- Get first container from processed containers for logging
    IF p_processed_container_ids IS NOT NULL AND jsonb_array_length(p_processed_container_ids) > 0 THEN
      SELECT (p_processed_container_ids->0)::text::uuid INTO v_container_id;
      SELECT number INTO v_container_number FROM containers WHERE id = v_container_id;
    ELSE
      v_container_number := p_booking_number; -- Fallback to booking number
    END IF;

    -- Create transmission log
    v_log_id := log_edi_transmission(
      COALESCE(v_container_number, p_booking_number),
      'GATE_OUT',
      v_container_id,
      p_operation_id,
      v_client_id,
      v_edi_status.server_config_id
    );

    -- Update gate out operation with EDI info
    UPDATE gate_out_operations 
    SET 
      edi_transmitted = true,
      edi_transmission_date = now()
    WHERE id = p_operation_id;

    RAISE NOTICE 'EDI transmission logged for gate out operation: %', p_operation_id;
    RETURN v_log_id;
  ELSE
    RAISE NOTICE 'EDI not enabled for client % gate out operations', p_client_code;
    RETURN NULL;
  END IF;
END;
$function$
;


-- Function: record_failed_login
CREATE OR REPLACE FUNCTION public.record_failed_login(p_email character varying, p_failure_reason text, p_ip_address character varying DEFAULT NULL::character varying, p_user_agent text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_user_id UUID;
    v_login_id UUID;
BEGIN
    -- Try to find user by email
    SELECT id INTO v_user_id
    FROM public.users
    WHERE email = p_email
    LIMIT 1;
    
    -- Insert failed login record
    INSERT INTO public.user_login_history (
        user_id,
        login_time,
        ip_address,
        user_agent,
        is_successful,
        failure_reason
    ) VALUES (
        v_user_id,
        NOW(),
        p_ip_address,
        p_user_agent,
        false,
        p_failure_reason
    )
    RETURNING id INTO v_login_id;
    
    -- Log activity if user exists
    IF v_user_id IS NOT NULL THEN
        PERFORM log_user_activity(
            v_user_id,
            'login_failed',
            'session',
            v_login_id,
            'Failed login attempt: ' || p_failure_reason,
            jsonb_build_object('reason', p_failure_reason),
            p_ip_address,
            p_user_agent
        );
    END IF;
    
    RETURN v_login_id;
END;
$function$
;


-- Function: record_user_login
CREATE OR REPLACE FUNCTION public.record_user_login(p_user_id uuid, p_ip_address character varying DEFAULT NULL::character varying, p_user_agent text DEFAULT NULL::text, p_login_method character varying DEFAULT 'email'::character varying, p_device_info jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_login_id UUID;
BEGIN
    -- Insert login record
    INSERT INTO public.user_login_history (
        user_id,
        login_time,
        ip_address,
        user_agent,
        login_method,
        is_successful,
        device_info
    ) VALUES (
        p_user_id,
        NOW(),
        p_ip_address,
        p_user_agent,
        p_login_method,
        true,
        p_device_info
    )
    RETURNING id INTO v_login_id;
    
    -- Update user's last_login
    UPDATE public.users
    SET last_login = NOW()
    WHERE id = p_user_id;
    
    -- Log activity
    PERFORM log_user_activity(
        p_user_id,
        'login',
        'session',
        v_login_id,
        'User logged in',
        jsonb_build_object('login_method', p_login_method),
        p_ip_address,
        p_user_agent
    );
    
    RETURN v_login_id;
END;
$function$
;


-- Function: record_user_logout
CREATE OR REPLACE FUNCTION public.record_user_logout(p_login_id uuid, p_user_id uuid DEFAULT NULL::uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_user_id UUID;
    v_login_time TIMESTAMPTZ;
BEGIN
    -- Get user_id and login_time if not provided
    SELECT user_id, login_time INTO v_user_id, v_login_time
    FROM public.user_login_history
    WHERE id = p_login_id;
    
    IF v_user_id IS NULL THEN
        RETURN false;
    END IF;
    
    -- Update logout time
    UPDATE public.user_login_history
    SET logout_time = NOW()
    WHERE id = p_login_id
    AND logout_time IS NULL;
    
    -- Log activity
    PERFORM log_user_activity(
        v_user_id,
        'logout',
        'session',
        p_login_id,
        'User logged out',
        jsonb_build_object('session_duration_minutes', EXTRACT(EPOCH FROM (NOW() - v_login_time)) / 60),
        NULL,
        NULL
    );
    
    RETURN true;
END;
$function$
;


-- Function: recreate_stack_with_location_recovery
CREATE OR REPLACE FUNCTION public.recreate_stack_with_location_recovery(p_yard_id text, p_stack_number integer, p_section_name text DEFAULT 'Main Section'::text, p_rows integer DEFAULT 6, p_max_tiers integer DEFAULT 4, p_created_by text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_existing_stack_id UUID;
  v_new_stack_id UUID;
  v_existing_locations_count INTEGER;
  v_created_locations_count INTEGER;
BEGIN
  -- Check if a stack with same yard_id and stack_number already exists (active or inactive)
  SELECT id INTO v_existing_stack_id
  FROM stacks 
  WHERE yard_id = p_yard_id AND stack_number = p_stack_number
  LIMIT 1;
  
  IF v_existing_stack_id IS NOT NULL THEN
    -- Stack exists, reactivate it and update properties
    UPDATE stacks 
    SET 
      is_active = true,
      section_name = p_section_name,
      rows = p_rows,
      max_tiers = p_max_tiers,
      capacity = p_rows * p_max_tiers,
      updated_at = NOW(),
      updated_by = p_created_by
    WHERE id = v_existing_stack_id;
    
    v_new_stack_id := v_existing_stack_id;
    
    -- Count existing locations that will be reactivated
    SELECT COUNT(*) INTO v_existing_locations_count
    FROM locations 
    WHERE stack_id = v_existing_stack_id;
    
    RAISE NOTICE 'Reactivated existing stack S% with % existing locations', 
      p_stack_number, v_existing_locations_count;
      
  ELSE
    -- Create new stack
    INSERT INTO stacks (
      yard_id,
      stack_number,
      section_name,
      rows,
      max_tiers,
      capacity,
      is_active,
      created_by,
      updated_by
    ) VALUES (
      p_yard_id,
      p_stack_number,
      p_section_name,
      p_rows,
      p_max_tiers,
      p_rows * p_max_tiers,
      true,
      p_created_by,
      p_created_by
    )
    RETURNING id INTO v_new_stack_id;
    
    RAISE NOTICE 'Created new stack S% with ID %', p_stack_number, v_new_stack_id;
  END IF;
  
  -- Generate locations if they don't exist or are insufficient
  -- This will be handled by the location generation system
  SELECT COUNT(*) INTO v_existing_locations_count
  FROM locations 
  WHERE stack_id = v_new_stack_id AND is_active = true;
  
  -- Calculate expected locations
  v_created_locations_count := p_rows * p_max_tiers;
  
  IF v_existing_locations_count < v_created_locations_count THEN
    RAISE NOTICE 'Stack S% needs % additional locations (has %, needs %)', 
      p_stack_number, 
      v_created_locations_count - v_existing_locations_count,
      v_existing_locations_count,
      v_created_locations_count;
    
    -- Note: Location generation will be handled by the application layer
    -- or by calling the generate_locations_for_stack function if it exists
  END IF;
  
  RETURN v_new_stack_id;
END;
$function$
;


-- Function: refresh_edi_client_performance
CREATE OR REPLACE FUNCTION public.refresh_edi_client_performance()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY edi_client_performance;
END;
$function$
;


-- Function: refresh_edi_dashboard_stats
CREATE OR REPLACE FUNCTION public.refresh_edi_dashboard_stats()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY edi_dashboard_stats;
END;
$function$
;


-- Function: refresh_location_statistics
CREATE OR REPLACE FUNCTION public.refresh_location_statistics()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY location_statistics_by_yard;
  REFRESH MATERIALIZED VIEW CONCURRENTLY location_statistics_by_stack;
END;
$function$
;


-- Function: refresh_sync_health_summary
CREATE OR REPLACE FUNCTION public.refresh_sync_health_summary()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY sync_health_summary;
END;
$function$
;


-- Function: release_location
CREATE OR REPLACE FUNCTION public.release_location(p_location_id text)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_location RECORD;
  v_pair RECORD;
  v_row INTEGER;
  v_tier INTEGER;
BEGIN
  -- Get location details
  SELECT * INTO v_location
  FROM locations
  WHERE location_id = p_location_id
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Update the virtual location
  UPDATE locations
  SET 
    is_occupied = false,
    available = true,
    container_id = NULL,
    container_number = NULL,
    updated_at = now()
  WHERE location_id = p_location_id;
  
  -- If this is a virtual location (40ft), also release physical locations
  IF v_location.is_virtual AND v_location.virtual_stack_pair_id IS NOT NULL THEN
    SELECT * INTO v_pair
    FROM virtual_stack_pairs
    WHERE id = v_location.virtual_stack_pair_id;
    
    IF FOUND THEN
      v_row := v_location.row_number;
      v_tier := v_location.tier_number;
      
      -- Release physical location 1
      UPDATE locations
      SET 
        is_occupied = false,
        available = true,
        container_id = NULL,
        container_number = NULL,
        updated_at = now()
      WHERE yard_id = v_location.yard_id
        AND stack_id = v_pair.stack1_id
        AND row_number = v_row
        AND tier_number = v_tier;
      
      -- Release physical location 2
      UPDATE locations
      SET 
        is_occupied = false,
        available = true,
        container_id = NULL,
        container_number = NULL,
        updated_at = now()
      WHERE yard_id = v_location.yard_id
        AND stack_id = v_pair.stack2_id
        AND row_number = v_row
        AND tier_number = v_tier;
    END IF;
  END IF;
  
  RETURN true;
END;
$function$
;


-- Function: restore_container
CREATE OR REPLACE FUNCTION public.restore_container(container_uuid uuid, user_uuid uuid)
 RETURNS TABLE(success boolean, message text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_container_number TEXT;
BEGIN
  SELECT number INTO v_container_number FROM containers 
  WHERE id = container_uuid AND is_deleted = true;

  IF v_container_number IS NULL THEN
    RETURN QUERY SELECT false, 'Container not found or not deleted';
    RETURN;
  END IF;

  UPDATE containers SET 
    is_deleted = false, deleted_at = NULL, deleted_by = NULL,
    updated_at = NOW(), updated_by = user_uuid
  WHERE id = container_uuid;

  RETURN QUERY SELECT true, 'Container ' || v_container_number || ' restored successfully';
END;
$function$
;


-- Function: restore_user
CREATE OR REPLACE FUNCTION public.restore_user(user_id uuid, restored_by text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  user_exists boolean;
BEGIN
  -- Check if user exists and is deleted
  SELECT EXISTS(
    SELECT 1 FROM users 
    WHERE id = user_id AND is_deleted = true
  ) INTO user_exists;
  
  IF NOT user_exists THEN
    RETURN false;
  END IF;
  
  -- Restore the user
  UPDATE users 
  SET 
    is_deleted = false,
    deleted_at = NULL,
    deleted_by = NULL,
    active = true,
    updated_at = now(),
    updated_by = restored_by
  WHERE id = user_id AND is_deleted = true;
  
  RETURN true;
END;
$function$
;


-- Function: search_container_audit_logs
CREATE OR REPLACE FUNCTION public.search_container_audit_logs(action_type text DEFAULT NULL::text, user_name_filter text DEFAULT NULL::text, from_date timestamp with time zone DEFAULT NULL::timestamp with time zone, to_date timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS TABLE(container_id uuid, container_number text, logged_at timestamp with time zone, user_name text, action text, details text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;


-- Function: soft_delete_container
CREATE OR REPLACE FUNCTION public.soft_delete_container(container_uuid uuid, user_uuid uuid)
 RETURNS TABLE(success boolean, message text, blocking_reason text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_can_delete BOOLEAN;
  v_blocking_reason TEXT;
  v_container_number TEXT;
BEGIN
  SELECT number INTO v_container_number FROM containers 
  WHERE id = container_uuid AND is_deleted = false;

  IF v_container_number IS NULL THEN
    RETURN QUERY SELECT false, 'Container not found or already deleted', NULL::TEXT;
    RETURN;
  END IF;

  SELECT can_delete, blocking_reason INTO v_can_delete, v_blocking_reason
  FROM check_container_deletion_constraints(container_uuid);

  IF NOT v_can_delete THEN
    RETURN QUERY SELECT false, 'Cannot delete container', v_blocking_reason;
    RETURN;
  END IF;

  UPDATE containers SET 
    is_deleted = true, deleted_at = NOW(), deleted_by = user_uuid,
    updated_at = NOW(), updated_by = user_uuid
  WHERE id = container_uuid;

  RETURN QUERY SELECT true, 'Container ' || v_container_number || ' deleted successfully', NULL::TEXT;
END;
$function$
;


-- Function: soft_delete_stack
CREATE OR REPLACE FUNCTION public.soft_delete_stack(p_stack_id uuid, p_deleted_by text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_stack_number INTEGER;
  v_affected_locations INTEGER;
BEGIN
  -- Get stack number for logging
  SELECT stack_number INTO v_stack_number
  FROM stacks 
  WHERE id = p_stack_id AND is_active = true;
  
  IF v_stack_number IS NULL THEN
    RAISE NOTICE 'Stack with ID % not found or already inactive', p_stack_id;
    RETURN false;
  END IF;
  
  -- Soft delete the stack
  UPDATE stacks 
  SET 
    is_active = false,
    updated_at = NOW(),
    updated_by = p_deleted_by
  WHERE id = p_stack_id;
  
  -- Count affected locations (trigger will handle the deactivation)
  SELECT COUNT(*) INTO v_affected_locations
  FROM locations 
  WHERE stack_id = p_stack_id AND is_active = false;
  
  RAISE NOTICE 'Soft deleted stack S% - deactivated % locations', 
    v_stack_number, v_affected_locations;
    
  RETURN true;
END;
$function$
;


-- Function: trigger_gate_in_edi
CREATE OR REPLACE FUNCTION public.trigger_gate_in_edi()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Only process EDI if the operation is completed and not already processed
  IF NEW.status = 'completed' AND (OLD.edi_transmitted IS NULL OR OLD.edi_transmitted = false) THEN
    PERFORM process_gate_in_edi(
      NEW.id,
      NEW.container_number,
      NEW.client_code,
      NEW.container_id
    );
  END IF;
  
  RETURN NEW;
END;
$function$
;


-- Function: trigger_gate_out_edi
CREATE OR REPLACE FUNCTION public.trigger_gate_out_edi()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Only process EDI if the operation is completed and not already processed
  IF NEW.status = 'completed' AND (OLD.edi_transmitted IS NULL OR OLD.edi_transmitted = false) THEN
    PERFORM process_gate_out_edi(
      NEW.id,
      NEW.booking_number,
      NEW.client_code,
      NEW.processed_container_ids
    );
  END IF;
  
  RETURN NEW;
END;
$function$
;


-- Function: trigger_refresh_location_statistics
CREATE OR REPLACE FUNCTION public.trigger_refresh_location_statistics()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Schedule a refresh (in production, this would be handled by a job scheduler)
  -- For now, we'll just log that a refresh is needed
  PERFORM pg_notify('location_stats_refresh_needed', NEW.yard_id);
  RETURN NEW;
END;
$function$
;


-- Function: trigger_update_stack_occupancy
CREATE OR REPLACE FUNCTION public.trigger_update_stack_occupancy()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_old_stack_num INTEGER;
  v_new_stack_num INTEGER;
  v_yard_id TEXT;
  v_pairing RECORD;
BEGIN
  -- Extract stack numbers from locations
  IF TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN
    IF OLD.location IS NOT NULL AND OLD.location ~ '^S\d+' THEN
      v_old_stack_num := substring(OLD.location from 'S(\d+)')::INTEGER;
      v_yard_id := OLD.yard_id;
    END IF;
  END IF;
  
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF NEW.location IS NOT NULL AND NEW.location ~ '^S\d+' THEN
      v_new_stack_num := substring(NEW.location from 'S(\d+)')::INTEGER;
      v_yard_id := NEW.yard_id;
    END IF;
  END IF;
  
  -- Update old stack occupancy (and its paired stacks if applicable)
  IF v_old_stack_num IS NOT NULL THEN
    -- Update the stack itself - match both S24R6H4 and S24-R6-H4 formats
    UPDATE stacks
    SET 
      current_occupancy = (
        SELECT COUNT(*)
        FROM containers
        WHERE yard_id = stacks.yard_id
          AND (
            location ~ ('^S' || LPAD(stacks.stack_number::TEXT, 2, '0') || 'R\d+H\d+$')
            OR location ~ ('^S' || LPAD(stacks.stack_number::TEXT, 2, '0') || '-R\d+-H\d+$')
          )
          AND status IN ('in_depot', 'gate_in')
      ),
      updated_at = now()
    WHERE stack_number = v_old_stack_num
      AND yard_id = v_yard_id;
    
    -- Check if this stack is part of a pairing
    SELECT * INTO v_pairing
    FROM stack_pairings
    WHERE yard_id = v_yard_id
      AND (first_stack_number = v_old_stack_num 
           OR second_stack_number = v_old_stack_num 
           OR virtual_stack_number = v_old_stack_num)
      AND is_active = true
    LIMIT 1;
    
    IF FOUND THEN
      -- Count containers from ALL three stack locations (both formats)
      DECLARE
        v_total_count INTEGER;
      BEGIN
        SELECT COUNT(*) INTO v_total_count
        FROM containers
        WHERE yard_id = v_yard_id
          AND (
            location ~ ('^S' || LPAD(v_pairing.first_stack_number::TEXT, 2, '0') || 'R\d+H\d+$')
            OR location ~ ('^S' || LPAD(v_pairing.first_stack_number::TEXT, 2, '0') || '-R\d+-H\d+$')
            OR location ~ ('^S' || LPAD(v_pairing.second_stack_number::TEXT, 2, '0') || 'R\d+H\d+$')
            OR location ~ ('^S' || LPAD(v_pairing.second_stack_number::TEXT, 2, '0') || '-R\d+-H\d+$')
            OR location ~ ('^S' || LPAD(v_pairing.virtual_stack_number::TEXT, 2, '0') || 'R\d+H\d+$')
            OR location ~ ('^S' || LPAD(v_pairing.virtual_stack_number::TEXT, 2, '0') || '-R\d+-H\d+$')
          )
          AND status IN ('in_depot', 'gate_in');
        
        -- Update all three stacks with the same count
        UPDATE stacks
        SET 
          current_occupancy = v_total_count,
          updated_at = now()
        WHERE yard_id = v_yard_id
          AND stack_number IN (
            v_pairing.first_stack_number,
            v_pairing.second_stack_number,
            v_pairing.virtual_stack_number
          );
      END;
    END IF;
  END IF;
  
  -- Update new stack occupancy (and its paired stacks if applicable)
  IF v_new_stack_num IS NOT NULL AND v_new_stack_num != v_old_stack_num THEN
    -- Update the stack itself - match both formats
    UPDATE stacks
    SET 
      current_occupancy = (
        SELECT COUNT(*)
        FROM containers
        WHERE yard_id = stacks.yard_id
          AND (
            location ~ ('^S' || LPAD(stacks.stack_number::TEXT, 2, '0') || 'R\d+H\d+$')
            OR location ~ ('^S' || LPAD(stacks.stack_number::TEXT, 2, '0') || '-R\d+-H\d+$')
          )
          AND status IN ('in_depot', 'gate_in')
      ),
      updated_at = now()
    WHERE stack_number = v_new_stack_num
      AND yard_id = v_yard_id;
    
    -- Check if this stack is part of a pairing
    SELECT * INTO v_pairing
    FROM stack_pairings
    WHERE yard_id = v_yard_id
      AND (first_stack_number = v_new_stack_num 
           OR second_stack_number = v_new_stack_num 
           OR virtual_stack_number = v_new_stack_num)
      AND is_active = true
    LIMIT 1;
    
    IF FOUND THEN
      -- Count containers from ALL three stack locations (both formats)
      DECLARE
        v_total_count INTEGER;
      BEGIN
        SELECT COUNT(*) INTO v_total_count
        FROM containers
        WHERE yard_id = v_yard_id
          AND (
            location ~ ('^S' || LPAD(v_pairing.first_stack_number::TEXT, 2, '0') || 'R\d+H\d+$')
            OR location ~ ('^S' || LPAD(v_pairing.first_stack_number::TEXT, 2, '0') || '-R\d+-H\d+$')
            OR location ~ ('^S' || LPAD(v_pairing.second_stack_number::TEXT, 2, '0') || 'R\d+H\d+$')
            OR location ~ ('^S' || LPAD(v_pairing.second_stack_number::TEXT, 2, '0') || '-R\d+-H\d+$')
            OR location ~ ('^S' || LPAD(v_pairing.virtual_stack_number::TEXT, 2, '0') || 'R\d+H\d+$')
            OR location ~ ('^S' || LPAD(v_pairing.virtual_stack_number::TEXT, 2, '0') || '-R\d+-H\d+$')
          )
          AND status IN ('in_depot', 'gate_in');
        
        -- Update all three stacks with the same count
        UPDATE stacks
        SET 
          current_occupancy = v_total_count,
          updated_at = now()
        WHERE yard_id = v_yard_id
          AND stack_number IN (
            v_pairing.first_stack_number,
            v_pairing.second_stack_number,
            v_pairing.virtual_stack_number
          );
      END;
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$
;


-- Function: update_booking_references_updated_at
CREATE OR REPLACE FUNCTION public.update_booking_references_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;


-- Function: update_buffer_zone_flags
CREATE OR REPLACE FUNCTION public.update_buffer_zone_flags()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Marquer les stacks existants comme zones tampons s'ils correspondent aux critères
  UPDATE stacks 
  SET 
    is_buffer_zone = true,
    buffer_zone_type = 'damage',
    is_special_stack = true
  WHERE 
    (section_name ILIKE 'BUFFER%' OR section_name ILIKE 'DMG%' OR section_name ILIKE '%TAMPON%')
    AND is_buffer_zone IS NOT true;
    
  -- Log le nombre de stacks mis à jour
  RAISE NOTICE 'Buffer zone flags updated for existing stacks';
END;
$function$
;


-- Function: update_buffer_zone_updated_at
CREATE OR REPLACE FUNCTION public.update_buffer_zone_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;


-- Function: update_client_pools_updated_at
CREATE OR REPLACE FUNCTION public.update_client_pools_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$function$
;


-- Function: update_containers_damage_assessed_at
CREATE OR REPLACE FUNCTION public.update_containers_damage_assessed_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Check if damage JSONB array is being updated from empty to non-empty
  IF (OLD.damage IS NULL OR jsonb_array_length(OLD.damage) = 0) 
     AND (NEW.damage IS NOT NULL AND jsonb_array_length(NEW.damage) > 0) 
     AND NEW.damage_assessed_at IS NULL THEN
    NEW.damage_assessed_at = NOW();
  END IF;
  
  -- If damage_assessment_stage is being updated and damage_assessed_at is null, set it to now
  IF NEW.damage_assessment_stage IS DISTINCT FROM OLD.damage_assessment_stage AND NEW.damage_assessed_at IS NULL THEN
    NEW.damage_assessed_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$function$
;


-- Function: update_damage_assessed_at
CREATE OR REPLACE FUNCTION public.update_damage_assessed_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Only try to access damage_reported if it exists (for gate_in_operations)
  IF TG_TABLE_NAME = 'gate_in_operations' THEN
    -- If damage_reported is being set to true and damage_assessed_at is null, set it to now
    IF NEW.damage_reported = true AND OLD.damage_reported = false AND NEW.damage_assessed_at IS NULL THEN
      NEW.damage_assessed_at = NOW();
    END IF;
  ELSIF TG_TABLE_NAME = 'containers' THEN
    -- For containers table, check damage JSONB field
    IF (OLD.damage IS NULL OR jsonb_array_length(OLD.damage) = 0) 
       AND (NEW.damage IS NOT NULL AND jsonb_array_length(NEW.damage) > 0) 
       AND NEW.damage_assessed_at IS NULL THEN
      NEW.damage_assessed_at = NOW();
    END IF;
  END IF;
  
  -- If damage_assessment_stage is being updated and damage_assessed_at is null, set it to now
  IF NEW.damage_assessment_stage IS DISTINCT FROM OLD.damage_assessment_stage AND NEW.damage_assessed_at IS NULL THEN
    NEW.damage_assessed_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$function$
;


-- Function: update_edi_transmission_status
CREATE OR REPLACE FUNCTION public.update_edi_transmission_status(p_log_id uuid, p_status text, p_error_message text DEFAULT NULL::text, p_file_content text DEFAULT NULL::text, p_file_size integer DEFAULT NULL::integer)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
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
$function$
;


-- Function: update_gate_in_damage_assessed_at
CREATE OR REPLACE FUNCTION public.update_gate_in_damage_assessed_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- If damage_reported is being set to true and damage_assessed_at is null, set it to now
  IF NEW.damage_reported = true AND OLD.damage_reported = false AND NEW.damage_assessed_at IS NULL THEN
    NEW.damage_assessed_at = NOW();
  END IF;
  
  -- If damage_assessment_stage is being updated and damage_assessed_at is null, set it to now
  IF NEW.damage_assessment_stage IS DISTINCT FROM OLD.damage_assessment_stage AND NEW.damage_assessed_at IS NULL THEN
    NEW.damage_assessed_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$function$
;


-- Function: update_gate_out_containers_updated_at
CREATE OR REPLACE FUNCTION public.update_gate_out_containers_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;


-- Function: update_locations_updated_at
CREATE OR REPLACE FUNCTION public.update_locations_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;


-- Function: update_stack_capacity
CREATE OR REPLACE FUNCTION public.update_stack_capacity()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  calculated_capacity INTEGER;
  max_tier_from_config INTEGER;
BEGIN
  -- Only recalculate if this is an UPDATE that changes the configuration
  -- or if the capacity seems incorrect for the given configuration
  
  IF NEW.row_tier_config IS NOT NULL AND NEW.row_tier_config != 'null'::jsonb AND NEW.row_tier_config != '[]'::jsonb THEN
    -- Calculate capacity from row-tier configuration
    SELECT COALESCE(SUM((config->>'maxTiers')::integer), 0)
    INTO calculated_capacity
    FROM jsonb_array_elements(NEW.row_tier_config) AS config;
    
    -- Get the maximum tier value from the configuration
    SELECT COALESCE(MAX((config->>'maxTiers')::integer), NEW.max_tiers)
    INTO max_tier_from_config
    FROM jsonb_array_elements(NEW.row_tier_config) AS config;
    
    -- Only update if the current capacity doesn't match the calculated one
    -- This prevents overriding correct application-calculated values
    IF TG_OP = 'INSERT' OR OLD.row_tier_config IS DISTINCT FROM NEW.row_tier_config 
       OR OLD.rows IS DISTINCT FROM NEW.rows THEN
      NEW.capacity = calculated_capacity;
      NEW.max_tiers = max_tier_from_config;
    END IF;
    
  ELSE
    -- No row-tier config, use uniform calculation only if needed
    calculated_capacity = NEW.rows * NEW.max_tiers;
    
    -- Only update if this is a configuration change
    IF TG_OP = 'INSERT' OR OLD.rows IS DISTINCT FROM NEW.rows 
       OR OLD.max_tiers IS DISTINCT FROM NEW.max_tiers THEN
      NEW.capacity = calculated_capacity;
    END IF;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- If there's any error, don't modify the values and log warning
    RAISE WARNING 'Error in update_stack_capacity trigger: %, preserving original values', SQLERRM;
    RETURN NEW;
END;
$function$
;


-- Function: update_stack_capacity_on_config_change
CREATE OR REPLACE FUNCTION public.update_stack_capacity_on_config_change()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Recalculate capacity based on row_tier_config
  NEW.capacity := calculate_stack_capacity(
    NEW.rows,
    NEW.max_tiers,
    NEW.row_tier_config
  );
  
  RETURN NEW;
END;
$function$
;


-- Function: update_stack_occupancy
CREATE OR REPLACE FUNCTION public.update_stack_occupancy()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_stack RECORD;
  v_occupancy INTEGER;
BEGIN
  FOR v_stack IN SELECT id, yard_id, stack_number FROM stacks LOOP
    -- Count containers in this stack
    SELECT COUNT(*) INTO v_occupancy
    FROM containers
    WHERE yard_id = v_stack.yard_id
      AND location ~ ('^S' || LPAD(v_stack.stack_number::TEXT, 2, '0') || '-R\d+-H\d+$')
      AND status IN ('in_depot', 'gate_in');
    
    -- Update stack occupancy
    UPDATE stacks
    SET 
      current_occupancy = v_occupancy,
      updated_at = now()
    WHERE id = v_stack.id;
  END LOOP;
  
  RAISE NOTICE 'Stack occupancy update completed';
END;
$function$
;


-- Function: update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;


-- Function: update_user_module_access_sync_tracking
CREATE OR REPLACE FUNCTION public.update_user_module_access_sync_tracking()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Increment sync version and update last_sync_at when module_permissions change
  IF OLD.module_permissions IS DISTINCT FROM NEW.module_permissions THEN
    NEW.sync_version = COALESCE(OLD.sync_version, 0) + 1;
    NEW.last_sync_at = now();
    -- Keep the existing sync_source unless explicitly changed
    IF NEW.sync_source IS NULL THEN
      NEW.sync_source = COALESCE(OLD.sync_source, 'user_module_access');
    END IF;
  END IF;
  
  -- Always update the updated_at timestamp
  NEW.updated_at = now();
  
  RETURN NEW;
END;
$function$
;


-- Function: update_user_module_access_updated_at
CREATE OR REPLACE FUNCTION public.update_user_module_access_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$function$
;


-- Function: update_users_audit_fields
CREATE OR REPLACE FUNCTION public.update_users_audit_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Set updated_by to the current auth user ID if available, otherwise use 'System'
  -- This avoids the infinite recursion by not querying the users table
  NEW.updated_by = COALESCE(
    auth.uid()::text,
    'System'
  );
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;


-- Function: update_users_updated_at
CREATE OR REPLACE FUNCTION public.update_users_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;


-- Function: update_virtual_pairs_updated_at
CREATE OR REPLACE FUNCTION public.update_virtual_pairs_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;


-- Function: upsert_virtual_stack_pair
CREATE OR REPLACE FUNCTION public.upsert_virtual_stack_pair(p_yard_id text, p_stack1_id uuid, p_stack2_id uuid, p_virtual_stack_number integer)
 RETURNS TABLE(id uuid, yard_id text, stack1_id uuid, stack2_id uuid, virtual_stack_number integer, is_active boolean, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
AS $function$
DECLARE
  existing_pair_id UUID;
BEGIN
  -- First, try to find existing pair with both possible orderings
  SELECT vsp.id INTO existing_pair_id
  FROM virtual_stack_pairs vsp
  WHERE vsp.yard_id = p_yard_id
    AND vsp.is_active = true
    AND (
      (vsp.stack1_id = p_stack1_id AND vsp.stack2_id = p_stack2_id) OR
      (vsp.stack1_id = p_stack2_id AND vsp.stack2_id = p_stack1_id)
    )
  LIMIT 1;

  -- If existing pair found, return it
  IF existing_pair_id IS NOT NULL THEN
    RETURN QUERY
    SELECT vsp.id, vsp.yard_id, vsp.stack1_id, vsp.stack2_id, 
           vsp.virtual_stack_number, vsp.is_active, vsp.created_at, vsp.updated_at
    FROM virtual_stack_pairs vsp
    WHERE vsp.id = existing_pair_id;
    RETURN;
  END IF;

  -- Try to insert new pair
  BEGIN
    INSERT INTO virtual_stack_pairs (
      yard_id, stack1_id, stack2_id, virtual_stack_number, is_active
    ) VALUES (
      p_yard_id, p_stack1_id, p_stack2_id, p_virtual_stack_number, true
    );
    
    -- Return the newly inserted pair
    RETURN QUERY
    SELECT vsp.id, vsp.yard_id, vsp.stack1_id, vsp.stack2_id, 
           vsp.virtual_stack_number, vsp.is_active, vsp.created_at, vsp.updated_at
    FROM virtual_stack_pairs vsp
    WHERE vsp.yard_id = p_yard_id
      AND vsp.stack1_id = p_stack1_id
      AND vsp.stack2_id = p_stack2_id
      AND vsp.is_active = true
    ORDER BY vsp.created_at DESC
    LIMIT 1;
    
  EXCEPTION WHEN unique_violation THEN
    -- If unique constraint violation occurs, find and return the existing pair
    -- This handles the race condition where another process inserted the same pair
    SELECT vsp.id INTO existing_pair_id
    FROM virtual_stack_pairs vsp
    WHERE vsp.yard_id = p_yard_id
      AND vsp.is_active = true
      AND (
        (vsp.stack1_id = p_stack1_id AND vsp.stack2_id = p_stack2_id) OR
        (vsp.stack1_id = p_stack2_id AND vsp.stack2_id = p_stack1_id)
      )
    LIMIT 1;

    IF existing_pair_id IS NOT NULL THEN
      RETURN QUERY
      SELECT vsp.id, vsp.yard_id, vsp.stack1_id, vsp.stack2_id, 
             vsp.virtual_stack_number, vsp.is_active, vsp.created_at, vsp.updated_at
      FROM virtual_stack_pairs vsp
      WHERE vsp.id = existing_pair_id;
    ELSE
      -- This should not happen, but just in case
      RAISE EXCEPTION 'Failed to create or find virtual stack pair';
    END IF;
  END;
END;
$function$
;


-- Function: validate_40ft_container_stack
CREATE OR REPLACE FUNCTION public.validate_40ft_container_stack()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  stack_number INTEGER;
  valid_virtual_stacks INTEGER[] := ARRAY[
    4, 8, 12, 16, 20, 24, 28,     -- Zone A
    34, 38, 42, 46, 50, 54,        -- Zone B
    62, 66, 70, 74, 78, 82,        -- Zone C
    86, 90, 94, 98                 -- Zone D
  ];
BEGIN
  -- Only validate if container size is 40ft and location is set
  IF (NEW.size = '40ft' OR NEW.size = '40feet') AND NEW.location IS NOT NULL THEN
    -- Extract stack number from location (format: S##R#H# or S##-R#-H#)
    stack_number := CAST(
      SUBSTRING(NEW.location FROM 'S0*(\d+)') AS INTEGER
    );
    
    -- Check if stack number is in the valid virtual stacks array
    IF stack_number IS NOT NULL AND NOT (stack_number = ANY(valid_virtual_stacks)) THEN
      RAISE EXCEPTION 
        '40ft containers can only be placed on virtual stacks. Stack % is not valid. Valid virtual stacks are: S04, S08, S12, S16, S20, S24, S28, S34, S38, S42, S46, S50, S54, S62, S66, S70, S74, S78, S82, S86, S90, S94, S98',
        stack_number
        USING HINT = 'Virtual stacks represent paired odd stacks (e.g., S24 = S23+S25)';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$
;


-- Function: validate_row_config_change
CREATE OR REPLACE FUNCTION public.validate_row_config_change(p_stack_id uuid, p_new_rows integer)
 RETURNS TABLE(can_change boolean, reason text, affected_containers integer, max_row_in_use integer)
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_stack RECORD;
  v_affected INTEGER;
  v_max_row INTEGER;
BEGIN
  -- Get stack details
  SELECT * INTO v_stack FROM stacks WHERE id = p_stack_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Stack not found'::TEXT, 0, 0;
    RETURN;
  END IF;
  
  -- If increasing rows, always safe
  IF p_new_rows >= v_stack.rows THEN
    RETURN QUERY SELECT true, 'Increasing rows is always safe'::TEXT, 0, v_stack.rows;
    RETURN;
  END IF;
  
  -- Check for containers in rows that would be removed
  SELECT 
    COUNT(*),
    MAX(
      CASE 
        WHEN location ~ 'R(\d+)' THEN substring(location from 'R(\d+)')::INTEGER
        ELSE 0
      END
    )
  INTO v_affected, v_max_row
  FROM containers
  WHERE yard_id = v_stack.yard_id
    AND (
      location ~ ('^S' || LPAD(v_stack.stack_number::TEXT, 2, '0') || 'R\d+H\d+$')
      OR location ~ ('^S' || LPAD(v_stack.stack_number::TEXT, 2, '0') || '-R\d+-H\d+$')
    )
    AND status IN ('in_depot', 'gate_in')
    AND (
      CASE 
        WHEN location ~ 'R(\d+)' THEN substring(location from 'R(\d+)')::INTEGER
        ELSE 0
      END
    ) > p_new_rows;
  
  IF v_affected > 0 THEN
    RETURN QUERY SELECT 
      false, 
      format('Cannot reduce rows: %s containers exist in rows %s-%s', v_affected, p_new_rows + 1, v_max_row)::TEXT,
      v_affected,
      COALESCE(v_max_row, 0);
  ELSE
    RETURN QUERY SELECT true, 'Safe to reduce rows'::TEXT, 0, COALESCE(v_max_row, 0);
  END IF;
END;
$function$
;

COMMIT;
