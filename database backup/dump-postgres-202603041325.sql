--
-- PostgreSQL database dump
--

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.0

-- Started on 2026-03-04 13:25:32

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 88 (class 2615 OID 16494)
-- Name: auth; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA auth;


ALTER SCHEMA auth OWNER TO supabase_admin;

--
-- TOC entry 90 (class 2615 OID 2200)
-- Name: public; Type: SCHEMA; Schema: -; Owner: pg_database_owner
--

CREATE SCHEMA public;


ALTER SCHEMA public OWNER TO pg_database_owner;

--
-- TOC entry 5126 (class 0 OID 0)
-- Dependencies: 90
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: pg_database_owner
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- TOC entry 91 (class 2615 OID 16555)
-- Name: realtime; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA realtime;


ALTER SCHEMA realtime OWNER TO supabase_admin;

--
-- TOC entry 1282 (class 1247 OID 16738)
-- Name: aal_level; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.aal_level AS ENUM (
    'aal1',
    'aal2',
    'aal3'
);


ALTER TYPE auth.aal_level OWNER TO supabase_auth_admin;

--
-- TOC entry 1306 (class 1247 OID 16879)
-- Name: code_challenge_method; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.code_challenge_method AS ENUM (
    's256',
    'plain'
);


ALTER TYPE auth.code_challenge_method OWNER TO supabase_auth_admin;

--
-- TOC entry 1279 (class 1247 OID 16732)
-- Name: factor_status; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.factor_status AS ENUM (
    'unverified',
    'verified'
);


ALTER TYPE auth.factor_status OWNER TO supabase_auth_admin;

--
-- TOC entry 1276 (class 1247 OID 16727)
-- Name: factor_type; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.factor_type AS ENUM (
    'totp',
    'webauthn',
    'phone'
);


ALTER TYPE auth.factor_type OWNER TO supabase_auth_admin;

--
-- TOC entry 1324 (class 1247 OID 16982)
-- Name: oauth_authorization_status; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.oauth_authorization_status AS ENUM (
    'pending',
    'approved',
    'denied',
    'expired'
);


ALTER TYPE auth.oauth_authorization_status OWNER TO supabase_auth_admin;

--
-- TOC entry 1336 (class 1247 OID 17055)
-- Name: oauth_client_type; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.oauth_client_type AS ENUM (
    'public',
    'confidential'
);


ALTER TYPE auth.oauth_client_type OWNER TO supabase_auth_admin;

--
-- TOC entry 1318 (class 1247 OID 16960)
-- Name: oauth_registration_type; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.oauth_registration_type AS ENUM (
    'dynamic',
    'manual'
);


ALTER TYPE auth.oauth_registration_type OWNER TO supabase_auth_admin;

--
-- TOC entry 1327 (class 1247 OID 16992)
-- Name: oauth_response_type; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.oauth_response_type AS ENUM (
    'code'
);


ALTER TYPE auth.oauth_response_type OWNER TO supabase_auth_admin;

--
-- TOC entry 1312 (class 1247 OID 16921)
-- Name: one_time_token_type; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.one_time_token_type AS ENUM (
    'confirmation_token',
    'reauthentication_token',
    'recovery_token',
    'email_change_token_new',
    'email_change_token_current',
    'phone_change_token'
);


ALTER TYPE auth.one_time_token_type OWNER TO supabase_auth_admin;

--
-- TOC entry 1407 (class 1247 OID 21198)
-- Name: container_size_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.container_size_enum AS ENUM (
    '20ft',
    '40ft'
);


ALTER TYPE public.container_size_enum OWNER TO postgres;

--
-- TOC entry 1360 (class 1247 OID 17124)
-- Name: action; Type: TYPE; Schema: realtime; Owner: supabase_admin
--

CREATE TYPE realtime.action AS ENUM (
    'INSERT',
    'UPDATE',
    'DELETE',
    'TRUNCATE',
    'ERROR'
);


ALTER TYPE realtime.action OWNER TO supabase_admin;

--
-- TOC entry 1345 (class 1247 OID 17084)
-- Name: equality_op; Type: TYPE; Schema: realtime; Owner: supabase_admin
--

CREATE TYPE realtime.equality_op AS ENUM (
    'eq',
    'neq',
    'lt',
    'lte',
    'gt',
    'gte',
    'in'
);


ALTER TYPE realtime.equality_op OWNER TO supabase_admin;

--
-- TOC entry 1348 (class 1247 OID 17099)
-- Name: user_defined_filter; Type: TYPE; Schema: realtime; Owner: supabase_admin
--

CREATE TYPE realtime.user_defined_filter AS (
	column_name text,
	op realtime.equality_op,
	value text
);


ALTER TYPE realtime.user_defined_filter OWNER TO supabase_admin;

--
-- TOC entry 1366 (class 1247 OID 17166)
-- Name: wal_column; Type: TYPE; Schema: realtime; Owner: supabase_admin
--

CREATE TYPE realtime.wal_column AS (
	name text,
	type_name text,
	type_oid oid,
	value jsonb,
	is_pkey boolean,
	is_selectable boolean
);


ALTER TYPE realtime.wal_column OWNER TO supabase_admin;

--
-- TOC entry 1363 (class 1247 OID 17137)
-- Name: wal_rls; Type: TYPE; Schema: realtime; Owner: supabase_admin
--

CREATE TYPE realtime.wal_rls AS (
	wal jsonb,
	is_rls_enabled boolean,
	subscription_ids uuid[],
	errors text[]
);


ALTER TYPE realtime.wal_rls OWNER TO supabase_admin;

--
-- TOC entry 519 (class 1255 OID 16540)
-- Name: email(); Type: FUNCTION; Schema: auth; Owner: supabase_auth_admin
--

CREATE FUNCTION auth.email() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.email', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email')
  )::text
$$;


ALTER FUNCTION auth.email() OWNER TO supabase_auth_admin;

--
-- TOC entry 5129 (class 0 OID 0)
-- Dependencies: 519
-- Name: FUNCTION email(); Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON FUNCTION auth.email() IS 'Deprecated. Use auth.jwt() -> ''email'' instead.';


--
-- TOC entry 612 (class 1255 OID 16709)
-- Name: jwt(); Type: FUNCTION; Schema: auth; Owner: supabase_auth_admin
--

CREATE FUNCTION auth.jwt() RETURNS jsonb
    LANGUAGE sql STABLE
    AS $$
  select 
    coalesce(
        nullif(current_setting('request.jwt.claim', true), ''),
        nullif(current_setting('request.jwt.claims', true), '')
    )::jsonb
$$;


ALTER FUNCTION auth.jwt() OWNER TO supabase_auth_admin;

--
-- TOC entry 448 (class 1255 OID 16539)
-- Name: role(); Type: FUNCTION; Schema: auth; Owner: supabase_auth_admin
--

CREATE FUNCTION auth.role() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )::text
$$;


ALTER FUNCTION auth.role() OWNER TO supabase_auth_admin;

--
-- TOC entry 5132 (class 0 OID 0)
-- Dependencies: 448
-- Name: FUNCTION role(); Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON FUNCTION auth.role() IS 'Deprecated. Use auth.jwt() -> ''role'' instead.';


--
-- TOC entry 477 (class 1255 OID 16538)
-- Name: uid(); Type: FUNCTION; Schema: auth; Owner: supabase_auth_admin
--

CREATE FUNCTION auth.uid() RETURNS uuid
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;


ALTER FUNCTION auth.uid() OWNER TO supabase_auth_admin;

--
-- TOC entry 5134 (class 0 OID 0)
-- Dependencies: 477
-- Name: FUNCTION uid(); Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON FUNCTION auth.uid() IS 'Deprecated. Use auth.jwt() -> ''sub'' instead.';


--
-- TOC entry 539 (class 1255 OID 21203)
-- Name: add_container_audit_log(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.add_container_audit_log() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION public.add_container_audit_log() OWNER TO postgres;

--
-- TOC entry 570 (class 1255 OID 21204)
-- Name: analyze_location_query_performance(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.analyze_location_query_performance() RETURNS TABLE(query_type text, avg_execution_time_ms numeric, total_calls bigint, cache_hit_ratio numeric)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    'location_availability'::TEXT as query_type,
    0.0::NUMERIC as avg_execution_time_ms,
    0::BIGINT as total_calls,
    0.0::NUMERIC as cache_hit_ratio;
  -- This is a placeholder - actual implementation would query pg_stat_statements
END;
$$;


ALTER FUNCTION public.analyze_location_query_performance() OWNER TO postgres;

--
-- TOC entry 550 (class 1255 OID 21205)
-- Name: analyze_module_access_performance(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.analyze_module_access_performance() RETURNS TABLE(table_name text, index_name text, index_size text, table_size text, index_usage_count bigint)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION public.analyze_module_access_performance() OWNER TO postgres;

--
-- TOC entry 5138 (class 0 OID 0)
-- Dependencies: 550
-- Name: FUNCTION analyze_module_access_performance(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.analyze_module_access_performance() IS 'Analyze index usage and performance for module access tables';


--
-- TOC entry 605 (class 1255 OID 21206)
-- Name: assign_container_to_location(text, uuid, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.assign_container_to_location(p_location_id text, p_container_id uuid, p_container_number text) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.assign_container_to_location(p_location_id text, p_container_id uuid, p_container_number text) OWNER TO postgres;

--
-- TOC entry 5140 (class 0 OID 0)
-- Dependencies: 605
-- Name: FUNCTION assign_container_to_location(p_location_id text, p_container_id uuid, p_container_number text); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.assign_container_to_location(p_location_id text, p_container_id uuid, p_container_number text) IS 'Assigns a container to a location, handling 40ft virtual stack logic';


--
-- TOC entry 553 (class 1255 OID 21207)
-- Name: auto_create_edi_transmission_on_gate_completion(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.auto_create_edi_transmission_on_gate_completion() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.auto_create_edi_transmission_on_gate_completion() OWNER TO postgres;

--
-- TOC entry 635 (class 1255 OID 21208)
-- Name: auto_mark_buffer_zones(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.auto_mark_buffer_zones() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.auto_mark_buffer_zones() OWNER TO postgres;

--
-- TOC entry 5143 (class 0 OID 0)
-- Dependencies: 635
-- Name: FUNCTION auto_mark_buffer_zones(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.auto_mark_buffer_zones() IS 'Automatically marks stacks as buffer zones based on naming patterns, with defensive JSONB handling';


--
-- TOC entry 485 (class 1255 OID 21209)
-- Name: calculate_session_duration(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.calculate_session_duration() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.logout_time IS NOT NULL AND NEW.login_time IS NOT NULL THEN
        NEW.session_duration_minutes := EXTRACT(EPOCH FROM (NEW.logout_time - NEW.login_time)) / 60;
    END IF;
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.calculate_session_duration() OWNER TO postgres;

--
-- TOC entry 487 (class 1255 OID 21210)
-- Name: calculate_stack_capacity(integer, integer, jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.calculate_stack_capacity(p_rows integer, p_max_tiers integer, p_row_tier_config jsonb) RETURNS integer
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.calculate_stack_capacity(p_rows integer, p_max_tiers integer, p_row_tier_config jsonb) OWNER TO postgres;

--
-- TOC entry 619 (class 1255 OID 21211)
-- Name: check_container_deletion_constraints(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.check_container_deletion_constraints(container_uuid uuid) RETURNS TABLE(can_delete boolean, blocking_reason text, gate_in_count integer, gate_out_count integer, location_assigned boolean, current_status text)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION public.check_container_deletion_constraints(container_uuid uuid) OWNER TO postgres;

--
-- TOC entry 5147 (class 0 OID 0)
-- Dependencies: 619
-- Name: FUNCTION check_container_deletion_constraints(container_uuid uuid); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.check_container_deletion_constraints(container_uuid uuid) IS 'Checks if a container can be deleted and returns blocking reasons';


--
-- TOC entry 457 (class 1255 OID 21212)
-- Name: check_row_reduction_safety(uuid, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.check_row_reduction_safety(p_stack_id uuid, p_new_row_count integer) RETURNS TABLE(is_safe boolean, affected_containers integer, max_row_in_use integer)
    LANGUAGE plpgsql
    AS $_$
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
$_$;


ALTER FUNCTION public.check_row_reduction_safety(p_stack_id uuid, p_new_row_count integer) OWNER TO postgres;

--
-- TOC entry 5149 (class 0 OID 0)
-- Dependencies: 457
-- Name: FUNCTION check_row_reduction_safety(p_stack_id uuid, p_new_row_count integer); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.check_row_reduction_safety(p_stack_id uuid, p_new_row_count integer) IS 'Validates if reducing stack rows is safe by checking for containers in rows that would be removed';


--
-- TOC entry 474 (class 1255 OID 21214)
-- Name: cleanup_old_edi_logs(integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.cleanup_old_edi_logs(p_days_to_keep integer DEFAULT 90) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_deleted_count integer;
BEGIN
  DELETE FROM edi_transmission_logs
  WHERE created_at < CURRENT_DATE - INTERVAL '1 day' * p_days_to_keep;
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RAISE NOTICE 'Cleaned up % old EDI transmission logs', v_deleted_count;
  RETURN v_deleted_count;
END;
$$;


ALTER FUNCTION public.cleanup_old_edi_logs(p_days_to_keep integer) OWNER TO postgres;

--
-- TOC entry 577 (class 1255 OID 21215)
-- Name: create_virtual_stacks(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.create_virtual_stacks() RETURNS void
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.create_virtual_stacks() OWNER TO postgres;

--
-- TOC entry 5152 (class 0 OID 0)
-- Dependencies: 577
-- Name: FUNCTION create_virtual_stacks(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.create_virtual_stacks() IS 'Creates virtual stacks for 40ft container pairings with proper buffer zone field handling';


--
-- TOC entry 461 (class 1255 OID 21216)
-- Name: generate_locations_for_stack(uuid, text, integer, integer, integer, boolean, uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.generate_locations_for_stack(p_stack_id uuid, p_yard_id text, p_stack_number integer, p_rows integer, p_max_tiers integer, p_is_virtual boolean DEFAULT false, p_virtual_stack_pair_id uuid DEFAULT NULL::uuid) RETURNS integer
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.generate_locations_for_stack(p_stack_id uuid, p_yard_id text, p_stack_number integer, p_rows integer, p_max_tiers integer, p_is_virtual boolean, p_virtual_stack_pair_id uuid) OWNER TO postgres;

--
-- TOC entry 617 (class 1255 OID 21217)
-- Name: get_buffer_zone_stats(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_buffer_zone_stats(p_yard_id text) RETURNS TABLE(total_buffer_stacks integer, total_capacity integer, current_occupancy integer, available_spaces integer, utilization_rate numeric)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION public.get_buffer_zone_stats(p_yard_id text) OWNER TO postgres;

--
-- TOC entry 5155 (class 0 OID 0)
-- Dependencies: 617
-- Name: FUNCTION get_buffer_zone_stats(p_yard_id text); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.get_buffer_zone_stats(p_yard_id text) IS 'Fonction pour obtenir les statistiques des zones tampons dun dépôt spécifique';


--
-- TOC entry 543 (class 1255 OID 21218)
-- Name: get_client_edi_status(text, text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_client_edi_status(p_client_code text, p_client_name text DEFAULT NULL::text, p_operation text DEFAULT NULL::text) RETURNS TABLE(edi_enabled boolean, gate_in_enabled boolean, gate_out_enabled boolean, server_config_id uuid, server_name text)
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.get_client_edi_status(p_client_code text, p_client_name text, p_operation text) OWNER TO postgres;

--
-- TOC entry 622 (class 1255 OID 21219)
-- Name: get_container_audit_logs(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_container_audit_logs(container_id_param uuid) RETURNS TABLE(logged_at timestamp with time zone, user_name text, action text, details text)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION public.get_container_audit_logs(container_id_param uuid) OWNER TO postgres;

--
-- TOC entry 5158 (class 0 OID 0)
-- Dependencies: 622
-- Name: FUNCTION get_container_audit_logs(container_id_param uuid); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.get_container_audit_logs(container_id_param uuid) IS 'Get all audit log entries for a specific container';


--
-- TOC entry 460 (class 1255 OID 32801)
-- Name: get_current_user_role(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_current_user_role() RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT role
  FROM public.users
  WHERE auth_user_id = auth.uid()
    AND active = true
  LIMIT 1;
$$;


ALTER FUNCTION public.get_current_user_role() OWNER TO postgres;

--
-- TOC entry 586 (class 1255 OID 21220)
-- Name: get_edi_config_for_client(text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_edi_config_for_client(p_client_code text, p_client_name text DEFAULT NULL::text) RETURNS TABLE(config_id uuid, config_name text, server_type text, host text, port integer, enabled boolean, edi_enabled boolean)
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.get_edi_config_for_client(p_client_code text, p_client_name text) OWNER TO postgres;

--
-- TOC entry 444 (class 1255 OID 21221)
-- Name: get_edi_realtime_stats(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_edi_realtime_stats() RETURNS TABLE(total_operations bigint, operations_with_edi bigint, clients_with_edi bigint, total_clients bigint, success_rate numeric, servers_configured bigint, last_transmission timestamp with time zone)
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.get_edi_realtime_stats() OWNER TO postgres;

--
-- TOC entry 445 (class 1255 OID 21222)
-- Name: get_edi_system_health(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_edi_system_health() RETURNS TABLE(component text, status text, details jsonb)
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.get_edi_system_health() OWNER TO postgres;

--
-- TOC entry 581 (class 1255 OID 21223)
-- Name: get_recent_audit_activity(integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_recent_audit_activity(limit_count integer DEFAULT 50) RETURNS TABLE(container_id uuid, container_number text, logged_at timestamp with time zone, user_name text, action text, details text)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION public.get_recent_audit_activity(limit_count integer) OWNER TO postgres;

--
-- TOC entry 5164 (class 0 OID 0)
-- Dependencies: 581
-- Name: FUNCTION get_recent_audit_activity(limit_count integer); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.get_recent_audit_activity(limit_count integer) IS 'Get the most recent audit log entries across all containers';


--
-- TOC entry 489 (class 1255 OID 21224)
-- Name: get_sync_inconsistencies(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_sync_inconsistencies() RETURNS TABLE(user_id uuid, username text, email text, has_users_module_access boolean, has_user_module_access boolean, users_permissions jsonb, uma_permissions jsonb, permissions_match boolean, last_sync_at timestamp with time zone, sync_version integer)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION public.get_sync_inconsistencies() OWNER TO postgres;

--
-- TOC entry 5166 (class 0 OID 0)
-- Dependencies: 489
-- Name: FUNCTION get_sync_inconsistencies(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.get_sync_inconsistencies() IS 'Identify users with inconsistent module access data between tables';


--
-- TOC entry 563 (class 1255 OID 21225)
-- Name: get_sync_query_recommendations(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_sync_query_recommendations() RETURNS TABLE(recommendation_type text, description text, suggested_action text, priority text)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION public.get_sync_query_recommendations() OWNER TO postgres;

--
-- TOC entry 5168 (class 0 OID 0)
-- Dependencies: 563
-- Name: FUNCTION get_sync_query_recommendations(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.get_sync_query_recommendations() IS 'Get recommendations for optimizing sync operations';


--
-- TOC entry 512 (class 1255 OID 21226)
-- Name: get_sync_statistics(uuid, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_sync_statistics(p_user_id uuid DEFAULT NULL::uuid, p_days_back integer DEFAULT 30) RETURNS TABLE(total_syncs bigint, successful_syncs bigint, failed_syncs bigint, success_rate numeric, avg_duration_ms numeric, last_sync_at timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION public.get_sync_statistics(p_user_id uuid, p_days_back integer) OWNER TO postgres;

--
-- TOC entry 5170 (class 0 OID 0)
-- Dependencies: 512
-- Name: FUNCTION get_sync_statistics(p_user_id uuid, p_days_back integer); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.get_sync_statistics(p_user_id uuid, p_days_back integer) IS 'Get sync statistics for monitoring and reporting';


--
-- TOC entry 592 (class 1255 OID 21227)
-- Name: get_virtual_stack_for_odd(integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_virtual_stack_for_odd(odd_stack integer) RETURNS integer
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.get_virtual_stack_for_odd(odd_stack integer) OWNER TO postgres;

--
-- TOC entry 499 (class 1255 OID 21228)
-- Name: handle_stack_soft_delete(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.handle_stack_soft_delete() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.handle_stack_soft_delete() OWNER TO postgres;

--
-- TOC entry 5173 (class 0 OID 0)
-- Dependencies: 499
-- Name: FUNCTION handle_stack_soft_delete(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.handle_stack_soft_delete() IS 'Automatically manages location activation/deactivation when stacks are soft deleted or reactivated';


--
-- TOC entry 585 (class 1255 OID 21229)
-- Name: has_admin_users(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.has_admin_users() RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION public.has_admin_users() OWNER TO postgres;

--
-- TOC entry 5175 (class 0 OID 0)
-- Dependencies: 585
-- Name: FUNCTION has_admin_users(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.has_admin_users() IS 'Helper function to check if any admin users exist in the system. Used for initial admin creation policy.';


--
-- TOC entry 466 (class 1255 OID 21230)
-- Name: has_client_pool_access(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.has_client_pool_access(check_pool_id uuid) RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION public.has_client_pool_access(check_pool_id uuid) OWNER TO postgres;

--
-- TOC entry 5177 (class 0 OID 0)
-- Dependencies: 466
-- Name: FUNCTION has_client_pool_access(check_pool_id uuid); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.has_client_pool_access(check_pool_id uuid) IS 'Helper function to check if current user has access to a specific client pool';


--
-- TOC entry 464 (class 1255 OID 21231)
-- Name: has_role(text[]); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.has_role(required_roles text[]) RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE users.auth_user_id = auth.uid()
    AND users.role = ANY(required_roles)
    AND users.active = true
  );
END;
$$;


ALTER FUNCTION public.has_role(required_roles text[]) OWNER TO postgres;

--
-- TOC entry 5179 (class 0 OID 0)
-- Dependencies: 464
-- Name: FUNCTION has_role(required_roles text[]); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.has_role(required_roles text[]) IS 'Helper function to check if current user has one of the specified roles';


--
-- TOC entry 582 (class 1255 OID 21232)
-- Name: has_yard_access(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.has_yard_access(check_yard_id text) RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION public.has_yard_access(check_yard_id text) OWNER TO postgres;

--
-- TOC entry 5181 (class 0 OID 0)
-- Dependencies: 582
-- Name: FUNCTION has_yard_access(check_yard_id text); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.has_yard_access(check_yard_id text) IS 'Helper function to check if current user has access to a specific yard';


--
-- TOC entry 579 (class 1255 OID 21233)
-- Name: initialize_client_edi_settings(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.initialize_client_edi_settings() RETURNS integer
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.initialize_client_edi_settings() OWNER TO postgres;

--
-- TOC entry 627 (class 1255 OID 21234)
-- Name: is_admin(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.is_admin() RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION public.is_admin() OWNER TO postgres;

--
-- TOC entry 5184 (class 0 OID 0)
-- Dependencies: 627
-- Name: FUNCTION is_admin(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.is_admin() IS 'Helper function to check if current authenticated user has admin role. Uses SECURITY DEFINER to avoid RLS recursion.';


--
-- TOC entry 608 (class 1255 OID 32803)
-- Name: is_current_user_active(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.is_current_user_active() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE auth_user_id = auth.uid()
      AND active = true
  );
$$;


ALTER FUNCTION public.is_current_user_active() OWNER TO postgres;

--
-- TOC entry 558 (class 1255 OID 32802)
-- Name: is_current_user_admin(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.is_current_user_admin() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE auth_user_id = auth.uid()
      AND active = true
      AND role = 'admin'
  );
$$;


ALTER FUNCTION public.is_current_user_admin() OWNER TO postgres;

--
-- TOC entry 610 (class 1255 OID 21235)
-- Name: is_location_available(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.is_location_available(p_location_id text) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.is_location_available(p_location_id text) OWNER TO postgres;

--
-- TOC entry 5188 (class 0 OID 0)
-- Dependencies: 610
-- Name: FUNCTION is_location_available(p_location_id text); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.is_location_available(p_location_id text) IS 'Checks if a location is available, considering 40ft virtual stack logic';


--
-- TOC entry 575 (class 1255 OID 21236)
-- Name: is_location_valid_for_stack(integer, integer, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.is_location_valid_for_stack(p_stack_number integer, p_row_number integer, p_tier_number integer) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.is_location_valid_for_stack(p_stack_number integer, p_row_number integer, p_tier_number integer) OWNER TO postgres;

--
-- TOC entry 5190 (class 0 OID 0)
-- Dependencies: 575
-- Name: FUNCTION is_location_valid_for_stack(p_stack_number integer, p_row_number integer, p_tier_number integer); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.is_location_valid_for_stack(p_stack_number integer, p_row_number integer, p_tier_number integer) IS 'Validates if a location (row, tier) is valid for a specific stack number. 
Uses hardcoded configurations for known stacks (e.g., Stack 01) and falls back to default max_tiers for others.';


--
-- TOC entry 568 (class 1255 OID 21237)
-- Name: log_edi_transmission(text, text, uuid, uuid, uuid, uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.log_edi_transmission(p_container_number text, p_operation text, p_container_id uuid DEFAULT NULL::uuid, p_gate_operation_id uuid DEFAULT NULL::uuid, p_client_id uuid DEFAULT NULL::uuid, p_config_id uuid DEFAULT NULL::uuid) RETURNS uuid
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.log_edi_transmission(p_container_number text, p_operation text, p_container_id uuid, p_gate_operation_id uuid, p_client_id uuid, p_config_id uuid) OWNER TO postgres;

--
-- TOC entry 545 (class 1255 OID 21238)
-- Name: log_location_changes(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.log_location_changes() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION public.log_location_changes() OWNER TO postgres;

--
-- TOC entry 559 (class 1255 OID 21239)
-- Name: log_module_access_sync(uuid, text, text, text, jsonb, jsonb, text, text, integer, uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.log_module_access_sync(p_user_id uuid, p_sync_type text, p_source_table text, p_target_table text, p_old_permissions jsonb, p_new_permissions jsonb, p_sync_status text, p_error_message text DEFAULT NULL::text, p_sync_duration_ms integer DEFAULT NULL::integer, p_created_by uuid DEFAULT NULL::uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION public.log_module_access_sync(p_user_id uuid, p_sync_type text, p_source_table text, p_target_table text, p_old_permissions jsonb, p_new_permissions jsonb, p_sync_status text, p_error_message text, p_sync_duration_ms integer, p_created_by uuid) OWNER TO postgres;

--
-- TOC entry 5194 (class 0 OID 0)
-- Dependencies: 559
-- Name: FUNCTION log_module_access_sync(p_user_id uuid, p_sync_type text, p_source_table text, p_target_table text, p_old_permissions jsonb, p_new_permissions jsonb, p_sync_status text, p_error_message text, p_sync_duration_ms integer, p_created_by uuid); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.log_module_access_sync(p_user_id uuid, p_sync_type text, p_source_table text, p_target_table text, p_old_permissions jsonb, p_new_permissions jsonb, p_sync_status text, p_error_message text, p_sync_duration_ms integer, p_created_by uuid) IS 'Helper function to create sync log entries';


--
-- TOC entry 453 (class 1255 OID 21240)
-- Name: log_user_activity(uuid, character varying, character varying, uuid, text, jsonb, character varying, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.log_user_activity(p_user_id uuid, p_action character varying, p_entity_type character varying DEFAULT NULL::character varying, p_entity_id uuid DEFAULT NULL::uuid, p_description text DEFAULT NULL::text, p_metadata jsonb DEFAULT '{}'::jsonb, p_ip_address character varying DEFAULT NULL::character varying, p_user_agent text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION public.log_user_activity(p_user_id uuid, p_action character varying, p_entity_type character varying, p_entity_id uuid, p_description text, p_metadata jsonb, p_ip_address character varying, p_user_agent text) OWNER TO postgres;

--
-- TOC entry 5196 (class 0 OID 0)
-- Dependencies: 453
-- Name: FUNCTION log_user_activity(p_user_id uuid, p_action character varying, p_entity_type character varying, p_entity_id uuid, p_description text, p_metadata jsonb, p_ip_address character varying, p_user_agent text); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.log_user_activity(p_user_id uuid, p_action character varying, p_entity_type character varying, p_entity_id uuid, p_description text, p_metadata jsonb, p_ip_address character varying, p_user_agent text) IS 'Logs a user activity to the user_activities table';


--
-- TOC entry 504 (class 1255 OID 21241)
-- Name: migrate_40ft_container_locations(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.migrate_40ft_container_locations() RETURNS void
    LANGUAGE plpgsql
    AS $_$
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
$_$;


ALTER FUNCTION public.migrate_40ft_container_locations() OWNER TO postgres;

--
-- TOC entry 613 (class 1255 OID 21242)
-- Name: permanently_delete_inactive_stack(uuid, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.permanently_delete_inactive_stack(p_stack_id uuid, p_deleted_by text DEFAULT NULL::text) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.permanently_delete_inactive_stack(p_stack_id uuid, p_deleted_by text) OWNER TO postgres;

--
-- TOC entry 5199 (class 0 OID 0)
-- Dependencies: 613
-- Name: FUNCTION permanently_delete_inactive_stack(p_stack_id uuid, p_deleted_by text); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.permanently_delete_inactive_stack(p_stack_id uuid, p_deleted_by text) IS 'Permanently delete an inactive stack and all its unoccupied locations (admin only)';


--
-- TOC entry 450 (class 1255 OID 21243)
-- Name: process_gate_in_edi(uuid, text, text, uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.process_gate_in_edi(p_operation_id uuid, p_container_number text, p_client_code text, p_container_id uuid DEFAULT NULL::uuid) RETURNS uuid
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.process_gate_in_edi(p_operation_id uuid, p_container_number text, p_client_code text, p_container_id uuid) OWNER TO postgres;

--
-- TOC entry 481 (class 1255 OID 21244)
-- Name: process_gate_out_edi(uuid, text, text, jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.process_gate_out_edi(p_operation_id uuid, p_booking_number text, p_client_code text, p_processed_container_ids jsonb DEFAULT NULL::jsonb) RETURNS uuid
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.process_gate_out_edi(p_operation_id uuid, p_booking_number text, p_client_code text, p_processed_container_ids jsonb) OWNER TO postgres;

--
-- TOC entry 468 (class 1255 OID 21245)
-- Name: record_failed_login(character varying, text, character varying, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.record_failed_login(p_email character varying, p_failure_reason text, p_ip_address character varying DEFAULT NULL::character varying, p_user_agent text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION public.record_failed_login(p_email character varying, p_failure_reason text, p_ip_address character varying, p_user_agent text) OWNER TO postgres;

--
-- TOC entry 5203 (class 0 OID 0)
-- Dependencies: 468
-- Name: FUNCTION record_failed_login(p_email character varying, p_failure_reason text, p_ip_address character varying, p_user_agent text); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.record_failed_login(p_email character varying, p_failure_reason text, p_ip_address character varying, p_user_agent text) IS 'Records a failed login attempt for security monitoring';


--
-- TOC entry 593 (class 1255 OID 21246)
-- Name: record_user_login(uuid, character varying, text, character varying, jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.record_user_login(p_user_id uuid, p_ip_address character varying DEFAULT NULL::character varying, p_user_agent text DEFAULT NULL::text, p_login_method character varying DEFAULT 'email'::character varying, p_device_info jsonb DEFAULT '{}'::jsonb) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION public.record_user_login(p_user_id uuid, p_ip_address character varying, p_user_agent text, p_login_method character varying, p_device_info jsonb) OWNER TO postgres;

--
-- TOC entry 5205 (class 0 OID 0)
-- Dependencies: 593
-- Name: FUNCTION record_user_login(p_user_id uuid, p_ip_address character varying, p_user_agent text, p_login_method character varying, p_device_info jsonb); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.record_user_login(p_user_id uuid, p_ip_address character varying, p_user_agent text, p_login_method character varying, p_device_info jsonb) IS 'Records a successful user login and updates last_login';


--
-- TOC entry 532 (class 1255 OID 21247)
-- Name: record_user_logout(uuid, uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.record_user_logout(p_login_id uuid, p_user_id uuid DEFAULT NULL::uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION public.record_user_logout(p_login_id uuid, p_user_id uuid) OWNER TO postgres;

--
-- TOC entry 5207 (class 0 OID 0)
-- Dependencies: 532
-- Name: FUNCTION record_user_logout(p_login_id uuid, p_user_id uuid); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.record_user_logout(p_login_id uuid, p_user_id uuid) IS 'Records a user logout and calculates session duration';


--
-- TOC entry 566 (class 1255 OID 21248)
-- Name: recreate_stack_with_location_recovery(text, integer, text, integer, integer, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.recreate_stack_with_location_recovery(p_yard_id text, p_stack_number integer, p_section_name text DEFAULT 'Main Section'::text, p_rows integer DEFAULT 6, p_max_tiers integer DEFAULT 4, p_created_by text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.recreate_stack_with_location_recovery(p_yard_id text, p_stack_number integer, p_section_name text, p_rows integer, p_max_tiers integer, p_created_by text) OWNER TO postgres;

--
-- TOC entry 5209 (class 0 OID 0)
-- Dependencies: 566
-- Name: FUNCTION recreate_stack_with_location_recovery(p_yard_id text, p_stack_number integer, p_section_name text, p_rows integer, p_max_tiers integer, p_created_by text); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.recreate_stack_with_location_recovery(p_yard_id text, p_stack_number integer, p_section_name text, p_rows integer, p_max_tiers integer, p_created_by text) IS 'Smart stack creation that reactivates existing stacks and recovers their locations when possible';


--
-- TOC entry 620 (class 1255 OID 21249)
-- Name: refresh_edi_client_performance(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.refresh_edi_client_performance() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY edi_client_performance;
END;
$$;


ALTER FUNCTION public.refresh_edi_client_performance() OWNER TO postgres;

--
-- TOC entry 521 (class 1255 OID 21250)
-- Name: refresh_edi_dashboard_stats(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.refresh_edi_dashboard_stats() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY edi_dashboard_stats;
END;
$$;


ALTER FUNCTION public.refresh_edi_dashboard_stats() OWNER TO postgres;

--
-- TOC entry 471 (class 1255 OID 21251)
-- Name: refresh_location_statistics(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.refresh_location_statistics() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY location_statistics_by_yard;
  REFRESH MATERIALIZED VIEW CONCURRENTLY location_statistics_by_stack;
END;
$$;


ALTER FUNCTION public.refresh_location_statistics() OWNER TO postgres;

--
-- TOC entry 5213 (class 0 OID 0)
-- Dependencies: 471
-- Name: FUNCTION refresh_location_statistics(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.refresh_location_statistics() IS 'Refreshes all location statistics materialized views concurrently';


--
-- TOC entry 493 (class 1255 OID 21252)
-- Name: refresh_sync_health_summary(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.refresh_sync_health_summary() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY sync_health_summary;
END;
$$;


ALTER FUNCTION public.refresh_sync_health_summary() OWNER TO postgres;

--
-- TOC entry 5215 (class 0 OID 0)
-- Dependencies: 493
-- Name: FUNCTION refresh_sync_health_summary(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.refresh_sync_health_summary() IS 'Refresh materialized view for sync monitoring. Schedule to run hourly.';


--
-- TOC entry 604 (class 1255 OID 21253)
-- Name: release_location(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.release_location(p_location_id text) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.release_location(p_location_id text) OWNER TO postgres;

--
-- TOC entry 5217 (class 0 OID 0)
-- Dependencies: 604
-- Name: FUNCTION release_location(p_location_id text); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.release_location(p_location_id text) IS 'Releases a location, handling 40ft virtual stack logic';


--
-- TOC entry 562 (class 1255 OID 21254)
-- Name: restore_container(uuid, uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.restore_container(container_uuid uuid, user_uuid uuid) RETURNS TABLE(success boolean, message text)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION public.restore_container(container_uuid uuid, user_uuid uuid) OWNER TO postgres;

--
-- TOC entry 5219 (class 0 OID 0)
-- Dependencies: 562
-- Name: FUNCTION restore_container(container_uuid uuid, user_uuid uuid); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.restore_container(container_uuid uuid, user_uuid uuid) IS 'Restores a soft-deleted container';


--
-- TOC entry 523 (class 1255 OID 21255)
-- Name: restore_user(uuid, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.restore_user(user_id uuid, restored_by text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION public.restore_user(user_id uuid, restored_by text) OWNER TO postgres;

--
-- TOC entry 542 (class 1255 OID 21256)
-- Name: search_container_audit_logs(text, text, timestamp with time zone, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.search_container_audit_logs(action_type text DEFAULT NULL::text, user_name_filter text DEFAULT NULL::text, from_date timestamp with time zone DEFAULT NULL::timestamp with time zone, to_date timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS TABLE(container_id uuid, container_number text, logged_at timestamp with time zone, user_name text, action text, details text)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION public.search_container_audit_logs(action_type text, user_name_filter text, from_date timestamp with time zone, to_date timestamp with time zone) OWNER TO postgres;

--
-- TOC entry 5222 (class 0 OID 0)
-- Dependencies: 542
-- Name: FUNCTION search_container_audit_logs(action_type text, user_name_filter text, from_date timestamp with time zone, to_date timestamp with time zone); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.search_container_audit_logs(action_type text, user_name_filter text, from_date timestamp with time zone, to_date timestamp with time zone) IS 'Search audit logs with filters for action type, user, and date range';


--
-- TOC entry 494 (class 1255 OID 21257)
-- Name: soft_delete_container(uuid, uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.soft_delete_container(container_uuid uuid, user_uuid uuid) RETURNS TABLE(success boolean, message text, blocking_reason text)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION public.soft_delete_container(container_uuid uuid, user_uuid uuid) OWNER TO postgres;

--
-- TOC entry 5224 (class 0 OID 0)
-- Dependencies: 494
-- Name: FUNCTION soft_delete_container(container_uuid uuid, user_uuid uuid); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.soft_delete_container(container_uuid uuid, user_uuid uuid) IS 'Performs soft delete on a container with validation';


--
-- TOC entry 609 (class 1255 OID 21258)
-- Name: soft_delete_stack(uuid, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.soft_delete_stack(p_stack_id uuid, p_deleted_by text DEFAULT NULL::text) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.soft_delete_stack(p_stack_id uuid, p_deleted_by text) OWNER TO postgres;

--
-- TOC entry 5226 (class 0 OID 0)
-- Dependencies: 609
-- Name: FUNCTION soft_delete_stack(p_stack_id uuid, p_deleted_by text); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.soft_delete_stack(p_stack_id uuid, p_deleted_by text) IS 'Safely soft delete a stack and deactivate all its locations';


--
-- TOC entry 458 (class 1255 OID 21259)
-- Name: trigger_gate_in_edi(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.trigger_gate_in_edi() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.trigger_gate_in_edi() OWNER TO postgres;

--
-- TOC entry 469 (class 1255 OID 21260)
-- Name: trigger_gate_out_edi(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.trigger_gate_out_edi() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.trigger_gate_out_edi() OWNER TO postgres;

--
-- TOC entry 606 (class 1255 OID 21261)
-- Name: trigger_refresh_location_statistics(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.trigger_refresh_location_statistics() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Schedule a refresh (in production, this would be handled by a job scheduler)
  -- For now, we'll just log that a refresh is needed
  PERFORM pg_notify('location_stats_refresh_needed', NEW.yard_id);
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.trigger_refresh_location_statistics() OWNER TO postgres;

--
-- TOC entry 597 (class 1255 OID 21262)
-- Name: trigger_update_stack_occupancy(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.trigger_update_stack_occupancy() RETURNS trigger
    LANGUAGE plpgsql
    AS $_$
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
$_$;


ALTER FUNCTION public.trigger_update_stack_occupancy() OWNER TO postgres;

--
-- TOC entry 587 (class 1255 OID 21263)
-- Name: update_booking_references_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_booking_references_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_booking_references_updated_at() OWNER TO postgres;

--
-- TOC entry 447 (class 1255 OID 21264)
-- Name: update_buffer_zone_flags(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_buffer_zone_flags() RETURNS void
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.update_buffer_zone_flags() OWNER TO postgres;

--
-- TOC entry 500 (class 1255 OID 38459)
-- Name: update_buffer_zone_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_buffer_zone_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_buffer_zone_updated_at() OWNER TO postgres;

--
-- TOC entry 625 (class 1255 OID 21265)
-- Name: update_client_pools_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_client_pools_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_client_pools_updated_at() OWNER TO postgres;

--
-- TOC entry 538 (class 1255 OID 21266)
-- Name: update_containers_damage_assessed_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_containers_damage_assessed_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.update_containers_damage_assessed_at() OWNER TO postgres;

--
-- TOC entry 5236 (class 0 OID 0)
-- Dependencies: 538
-- Name: FUNCTION update_containers_damage_assessed_at(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.update_containers_damage_assessed_at() IS 'Trigger function for containers table to automatically set damage_assessed_at timestamp';


--
-- TOC entry 591 (class 1255 OID 21267)
-- Name: update_damage_assessed_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_damage_assessed_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.update_damage_assessed_at() OWNER TO postgres;

--
-- TOC entry 5238 (class 0 OID 0)
-- Dependencies: 591
-- Name: FUNCTION update_damage_assessed_at(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.update_damage_assessed_at() IS 'Generic trigger function with table-specific logic (kept for backward compatibility)';


--
-- TOC entry 564 (class 1255 OID 21268)
-- Name: update_edi_transmission_status(uuid, text, text, text, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_edi_transmission_status(p_log_id uuid, p_status text, p_error_message text DEFAULT NULL::text, p_file_content text DEFAULT NULL::text, p_file_size integer DEFAULT NULL::integer) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.update_edi_transmission_status(p_log_id uuid, p_status text, p_error_message text, p_file_content text, p_file_size integer) OWNER TO postgres;

--
-- TOC entry 506 (class 1255 OID 21269)
-- Name: update_gate_in_damage_assessed_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_gate_in_damage_assessed_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.update_gate_in_damage_assessed_at() OWNER TO postgres;

--
-- TOC entry 5241 (class 0 OID 0)
-- Dependencies: 506
-- Name: FUNCTION update_gate_in_damage_assessed_at(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.update_gate_in_damage_assessed_at() IS 'Trigger function for gate_in_operations table to automatically set damage_assessed_at timestamp';


--
-- TOC entry 636 (class 1255 OID 46389)
-- Name: update_gate_out_containers_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_gate_out_containers_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_gate_out_containers_updated_at() OWNER TO postgres;

--
-- TOC entry 470 (class 1255 OID 21270)
-- Name: update_locations_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_locations_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_locations_updated_at() OWNER TO postgres;

--
-- TOC entry 544 (class 1255 OID 21271)
-- Name: update_stack_capacity(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_stack_capacity() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.update_stack_capacity() OWNER TO postgres;

--
-- TOC entry 5245 (class 0 OID 0)
-- Dependencies: 544
-- Name: FUNCTION update_stack_capacity(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.update_stack_capacity() IS 'Intelligently updates stack capacity based on row-tier configuration, preserving application-calculated values when appropriate';


--
-- TOC entry 492 (class 1255 OID 21272)
-- Name: update_stack_capacity_on_config_change(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_stack_capacity_on_config_change() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Recalculate capacity based on row_tier_config
  NEW.capacity := calculate_stack_capacity(
    NEW.rows,
    NEW.max_tiers,
    NEW.row_tier_config
  );
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_stack_capacity_on_config_change() OWNER TO postgres;

--
-- TOC entry 440 (class 1255 OID 21273)
-- Name: update_stack_occupancy(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_stack_occupancy() RETURNS void
    LANGUAGE plpgsql
    AS $_$
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
$_$;


ALTER FUNCTION public.update_stack_occupancy() OWNER TO postgres;

--
-- TOC entry 551 (class 1255 OID 21274)
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO postgres;

--
-- TOC entry 486 (class 1255 OID 21275)
-- Name: update_user_module_access_sync_tracking(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_user_module_access_sync_tracking() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.update_user_module_access_sync_tracking() OWNER TO postgres;

--
-- TOC entry 602 (class 1255 OID 21276)
-- Name: update_user_module_access_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_user_module_access_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_user_module_access_updated_at() OWNER TO postgres;

--
-- TOC entry 515 (class 1255 OID 21277)
-- Name: update_users_audit_fields(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_users_audit_fields() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION public.update_users_audit_fields() OWNER TO postgres;

--
-- TOC entry 588 (class 1255 OID 21278)
-- Name: update_users_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_users_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_users_updated_at() OWNER TO postgres;

--
-- TOC entry 536 (class 1255 OID 21279)
-- Name: update_virtual_pairs_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_virtual_pairs_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_virtual_pairs_updated_at() OWNER TO postgres;

--
-- TOC entry 507 (class 1255 OID 21280)
-- Name: upsert_virtual_stack_pair(text, uuid, uuid, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.upsert_virtual_stack_pair(p_yard_id text, p_stack1_id uuid, p_stack2_id uuid, p_virtual_stack_number integer) RETURNS TABLE(id uuid, yard_id text, stack1_id uuid, stack2_id uuid, virtual_stack_number integer, is_active boolean, created_at timestamp with time zone, updated_at timestamp with time zone)
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.upsert_virtual_stack_pair(p_yard_id text, p_stack1_id uuid, p_stack2_id uuid, p_virtual_stack_number integer) OWNER TO postgres;

--
-- TOC entry 516 (class 1255 OID 21281)
-- Name: validate_40ft_container_stack(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.validate_40ft_container_stack() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.validate_40ft_container_stack() OWNER TO postgres;

--
-- TOC entry 5256 (class 0 OID 0)
-- Dependencies: 516
-- Name: FUNCTION validate_40ft_container_stack(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.validate_40ft_container_stack() IS 'Validates that 40ft containers are only placed on virtual (even-numbered) stacks that represent paired odd stacks. Virtual stacks like S04, S08, S24, S28 represent the pairing of adjacent odd stacks (e.g., S24 = S23+S25).';


--
-- TOC entry 442 (class 1255 OID 21282)
-- Name: validate_row_config_change(uuid, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.validate_row_config_change(p_stack_id uuid, p_new_rows integer) RETURNS TABLE(can_change boolean, reason text, affected_containers integer, max_row_in_use integer)
    LANGUAGE plpgsql
    AS $_$
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
$_$;


ALTER FUNCTION public.validate_row_config_change(p_stack_id uuid, p_new_rows integer) OWNER TO postgres;

--
-- TOC entry 5258 (class 0 OID 0)
-- Dependencies: 442
-- Name: FUNCTION validate_row_config_change(p_stack_id uuid, p_new_rows integer); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.validate_row_config_change(p_stack_id uuid, p_new_rows integer) IS 'Comprehensive validation for row configuration changes with detailed feedback';


--
-- TOC entry 531 (class 1255 OID 17159)
-- Name: apply_rls(jsonb, integer); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer DEFAULT (1024 * 1024)) RETURNS SETOF realtime.wal_rls
    LANGUAGE plpgsql
    AS $$
declare
-- Regclass of the table e.g. public.notes
entity_ regclass = (quote_ident(wal ->> 'schema') || '.' || quote_ident(wal ->> 'table'))::regclass;

-- I, U, D, T: insert, update ...
action realtime.action = (
    case wal ->> 'action'
        when 'I' then 'INSERT'
        when 'U' then 'UPDATE'
        when 'D' then 'DELETE'
        else 'ERROR'
    end
);

-- Is row level security enabled for the table
is_rls_enabled bool = relrowsecurity from pg_class where oid = entity_;

subscriptions realtime.subscription[] = array_agg(subs)
    from
        realtime.subscription subs
    where
        subs.entity = entity_
        -- Filter by action early - only get subscriptions interested in this action
        -- action_filter column can be: '*' (all), 'INSERT', 'UPDATE', or 'DELETE'
        and (subs.action_filter = '*' or subs.action_filter = action::text);

-- Subscription vars
roles regrole[] = array_agg(distinct us.claims_role::text)
    from
        unnest(subscriptions) us;

working_role regrole;
claimed_role regrole;
claims jsonb;

subscription_id uuid;
subscription_has_access bool;
visible_to_subscription_ids uuid[] = '{}';

-- structured info for wal's columns
columns realtime.wal_column[];
-- previous identity values for update/delete
old_columns realtime.wal_column[];

error_record_exceeds_max_size boolean = octet_length(wal::text) > max_record_bytes;

-- Primary jsonb output for record
output jsonb;

begin
perform set_config('role', null, true);

columns =
    array_agg(
        (
            x->>'name',
            x->>'type',
            x->>'typeoid',
            realtime.cast(
                (x->'value') #>> '{}',
                coalesce(
                    (x->>'typeoid')::regtype, -- null when wal2json version <= 2.4
                    (x->>'type')::regtype
                )
            ),
            (pks ->> 'name') is not null,
            true
        )::realtime.wal_column
    )
    from
        jsonb_array_elements(wal -> 'columns') x
        left join jsonb_array_elements(wal -> 'pk') pks
            on (x ->> 'name') = (pks ->> 'name');

old_columns =
    array_agg(
        (
            x->>'name',
            x->>'type',
            x->>'typeoid',
            realtime.cast(
                (x->'value') #>> '{}',
                coalesce(
                    (x->>'typeoid')::regtype, -- null when wal2json version <= 2.4
                    (x->>'type')::regtype
                )
            ),
            (pks ->> 'name') is not null,
            true
        )::realtime.wal_column
    )
    from
        jsonb_array_elements(wal -> 'identity') x
        left join jsonb_array_elements(wal -> 'pk') pks
            on (x ->> 'name') = (pks ->> 'name');

for working_role in select * from unnest(roles) loop

    -- Update `is_selectable` for columns and old_columns
    columns =
        array_agg(
            (
                c.name,
                c.type_name,
                c.type_oid,
                c.value,
                c.is_pkey,
                pg_catalog.has_column_privilege(working_role, entity_, c.name, 'SELECT')
            )::realtime.wal_column
        )
        from
            unnest(columns) c;

    old_columns =
            array_agg(
                (
                    c.name,
                    c.type_name,
                    c.type_oid,
                    c.value,
                    c.is_pkey,
                    pg_catalog.has_column_privilege(working_role, entity_, c.name, 'SELECT')
                )::realtime.wal_column
            )
            from
                unnest(old_columns) c;

    if action <> 'DELETE' and count(1) = 0 from unnest(columns) c where c.is_pkey then
        return next (
            jsonb_build_object(
                'schema', wal ->> 'schema',
                'table', wal ->> 'table',
                'type', action
            ),
            is_rls_enabled,
            -- subscriptions is already filtered by entity
            (select array_agg(s.subscription_id) from unnest(subscriptions) as s where claims_role = working_role),
            array['Error 400: Bad Request, no primary key']
        )::realtime.wal_rls;

    -- The claims role does not have SELECT permission to the primary key of entity
    elsif action <> 'DELETE' and sum(c.is_selectable::int) <> count(1) from unnest(columns) c where c.is_pkey then
        return next (
            jsonb_build_object(
                'schema', wal ->> 'schema',
                'table', wal ->> 'table',
                'type', action
            ),
            is_rls_enabled,
            (select array_agg(s.subscription_id) from unnest(subscriptions) as s where claims_role = working_role),
            array['Error 401: Unauthorized']
        )::realtime.wal_rls;

    else
        output = jsonb_build_object(
            'schema', wal ->> 'schema',
            'table', wal ->> 'table',
            'type', action,
            'commit_timestamp', to_char(
                ((wal ->> 'timestamp')::timestamptz at time zone 'utc'),
                'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
            ),
            'columns', (
                select
                    jsonb_agg(
                        jsonb_build_object(
                            'name', pa.attname,
                            'type', pt.typname
                        )
                        order by pa.attnum asc
                    )
                from
                    pg_attribute pa
                    join pg_type pt
                        on pa.atttypid = pt.oid
                where
                    attrelid = entity_
                    and attnum > 0
                    and pg_catalog.has_column_privilege(working_role, entity_, pa.attname, 'SELECT')
            )
        )
        -- Add "record" key for insert and update
        || case
            when action in ('INSERT', 'UPDATE') then
                jsonb_build_object(
                    'record',
                    (
                        select
                            jsonb_object_agg(
                                -- if unchanged toast, get column name and value from old record
                                coalesce((c).name, (oc).name),
                                case
                                    when (c).name is null then (oc).value
                                    else (c).value
                                end
                            )
                        from
                            unnest(columns) c
                            full outer join unnest(old_columns) oc
                                on (c).name = (oc).name
                        where
                            coalesce((c).is_selectable, (oc).is_selectable)
                            and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                    )
                )
            else '{}'::jsonb
        end
        -- Add "old_record" key for update and delete
        || case
            when action = 'UPDATE' then
                jsonb_build_object(
                        'old_record',
                        (
                            select jsonb_object_agg((c).name, (c).value)
                            from unnest(old_columns) c
                            where
                                (c).is_selectable
                                and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                        )
                    )
            when action = 'DELETE' then
                jsonb_build_object(
                    'old_record',
                    (
                        select jsonb_object_agg((c).name, (c).value)
                        from unnest(old_columns) c
                        where
                            (c).is_selectable
                            and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                            and ( not is_rls_enabled or (c).is_pkey ) -- if RLS enabled, we can't secure deletes so filter to pkey
                    )
                )
            else '{}'::jsonb
        end;

        -- Create the prepared statement
        if is_rls_enabled and action <> 'DELETE' then
            if (select 1 from pg_prepared_statements where name = 'walrus_rls_stmt' limit 1) > 0 then
                deallocate walrus_rls_stmt;
            end if;
            execute realtime.build_prepared_statement_sql('walrus_rls_stmt', entity_, columns);
        end if;

        visible_to_subscription_ids = '{}';

        for subscription_id, claims in (
                select
                    subs.subscription_id,
                    subs.claims
                from
                    unnest(subscriptions) subs
                where
                    subs.entity = entity_
                    and subs.claims_role = working_role
                    and (
                        realtime.is_visible_through_filters(columns, subs.filters)
                        or (
                          action = 'DELETE'
                          and realtime.is_visible_through_filters(old_columns, subs.filters)
                        )
                    )
        ) loop

            if not is_rls_enabled or action = 'DELETE' then
                visible_to_subscription_ids = visible_to_subscription_ids || subscription_id;
            else
                -- Check if RLS allows the role to see the record
                perform
                    -- Trim leading and trailing quotes from working_role because set_config
                    -- doesn't recognize the role as valid if they are included
                    set_config('role', trim(both '"' from working_role::text), true),
                    set_config('request.jwt.claims', claims::text, true);

                execute 'execute walrus_rls_stmt' into subscription_has_access;

                if subscription_has_access then
                    visible_to_subscription_ids = visible_to_subscription_ids || subscription_id;
                end if;
            end if;
        end loop;

        perform set_config('role', null, true);

        return next (
            output,
            is_rls_enabled,
            visible_to_subscription_ids,
            case
                when error_record_exceeds_max_size then array['Error 413: Payload Too Large']
                else '{}'
            end
        )::realtime.wal_rls;

    end if;
end loop;

perform set_config('role', null, true);
end;
$$;


ALTER FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) OWNER TO supabase_admin;

--
-- TOC entry 554 (class 1255 OID 17238)
-- Name: broadcast_changes(text, text, text, text, text, record, record, text); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text DEFAULT 'ROW'::text) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    -- Declare a variable to hold the JSONB representation of the row
    row_data jsonb := '{}'::jsonb;
BEGIN
    IF level = 'STATEMENT' THEN
        RAISE EXCEPTION 'function can only be triggered for each row, not for each statement';
    END IF;
    -- Check the operation type and handle accordingly
    IF operation = 'INSERT' OR operation = 'UPDATE' OR operation = 'DELETE' THEN
        row_data := jsonb_build_object('old_record', OLD, 'record', NEW, 'operation', operation, 'table', table_name, 'schema', table_schema);
        PERFORM realtime.send (row_data, event_name, topic_name);
    ELSE
        RAISE EXCEPTION 'Unexpected operation type: %', operation;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to process the row: %', SQLERRM;
END;

$$;


ALTER FUNCTION realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text) OWNER TO supabase_admin;

--
-- TOC entry 583 (class 1255 OID 17171)
-- Name: build_prepared_statement_sql(text, regclass, realtime.wal_column[]); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) RETURNS text
    LANGUAGE sql
    AS $$
      /*
      Builds a sql string that, if executed, creates a prepared statement to
      tests retrive a row from *entity* by its primary key columns.
      Example
          select realtime.build_prepared_statement_sql('public.notes', '{"id"}'::text[], '{"bigint"}'::text[])
      */
          select
      'prepare ' || prepared_statement_name || ' as
          select
              exists(
                  select
                      1
                  from
                      ' || entity || '
                  where
                      ' || string_agg(quote_ident(pkc.name) || '=' || quote_nullable(pkc.value #>> '{}') , ' and ') || '
              )'
          from
              unnest(columns) pkc
          where
              pkc.is_pkey
          group by
              entity
      $$;


ALTER FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) OWNER TO supabase_admin;

--
-- TOC entry 465 (class 1255 OID 17121)
-- Name: cast(text, regtype); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime."cast"(val text, type_ regtype) RETURNS jsonb
    LANGUAGE plpgsql IMMUTABLE
    AS $$
declare
  res jsonb;
begin
  if type_::text = 'bytea' then
    return to_jsonb(val);
  end if;
  execute format('select to_jsonb(%L::'|| type_::text || ')', val) into res;
  return res;
end
$$;


ALTER FUNCTION realtime."cast"(val text, type_ regtype) OWNER TO supabase_admin;

--
-- TOC entry 438 (class 1255 OID 17116)
-- Name: check_equality_op(realtime.equality_op, regtype, text, text); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) RETURNS boolean
    LANGUAGE plpgsql IMMUTABLE
    AS $$
      /*
      Casts *val_1* and *val_2* as type *type_* and check the *op* condition for truthiness
      */
      declare
          op_symbol text = (
              case
                  when op = 'eq' then '='
                  when op = 'neq' then '!='
                  when op = 'lt' then '<'
                  when op = 'lte' then '<='
                  when op = 'gt' then '>'
                  when op = 'gte' then '>='
                  when op = 'in' then '= any'
                  else 'UNKNOWN OP'
              end
          );
          res boolean;
      begin
          execute format(
              'select %L::'|| type_::text || ' ' || op_symbol
              || ' ( %L::'
              || (
                  case
                      when op = 'in' then type_::text || '[]'
                      else type_::text end
              )
              || ')', val_1, val_2) into res;
          return res;
      end;
      $$;


ALTER FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) OWNER TO supabase_admin;

--
-- TOC entry 624 (class 1255 OID 17167)
-- Name: is_visible_through_filters(realtime.wal_column[], realtime.user_defined_filter[]); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) RETURNS boolean
    LANGUAGE sql IMMUTABLE
    AS $_$
    /*
    Should the record be visible (true) or filtered out (false) after *filters* are applied
    */
        select
            -- Default to allowed when no filters present
            $2 is null -- no filters. this should not happen because subscriptions has a default
            or array_length($2, 1) is null -- array length of an empty array is null
            or bool_and(
                coalesce(
                    realtime.check_equality_op(
                        op:=f.op,
                        type_:=coalesce(
                            col.type_oid::regtype, -- null when wal2json version <= 2.4
                            col.type_name::regtype
                        ),
                        -- cast jsonb to text
                        val_1:=col.value #>> '{}',
                        val_2:=f.value
                    ),
                    false -- if null, filter does not match
                )
            )
        from
            unnest(filters) f
            join unnest(columns) col
                on f.column_name = col.name;
    $_$;


ALTER FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) OWNER TO supabase_admin;

--
-- TOC entry 623 (class 1255 OID 17178)
-- Name: list_changes(name, name, integer, integer); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) RETURNS SETOF realtime.wal_rls
    LANGUAGE sql
    SET log_min_messages TO 'fatal'
    AS $$
      with pub as (
        select
          concat_ws(
            ',',
            case when bool_or(pubinsert) then 'insert' else null end,
            case when bool_or(pubupdate) then 'update' else null end,
            case when bool_or(pubdelete) then 'delete' else null end
          ) as w2j_actions,
          coalesce(
            string_agg(
              realtime.quote_wal2json(format('%I.%I', schemaname, tablename)::regclass),
              ','
            ) filter (where ppt.tablename is not null and ppt.tablename not like '% %'),
            ''
          ) w2j_add_tables
        from
          pg_publication pp
          left join pg_publication_tables ppt
            on pp.pubname = ppt.pubname
        where
          pp.pubname = publication
        group by
          pp.pubname
        limit 1
      ),
      w2j as (
        select
          x.*, pub.w2j_add_tables
        from
          pub,
          pg_logical_slot_get_changes(
            slot_name, null, max_changes,
            'include-pk', 'true',
            'include-transaction', 'false',
            'include-timestamp', 'true',
            'include-type-oids', 'true',
            'format-version', '2',
            'actions', pub.w2j_actions,
            'add-tables', pub.w2j_add_tables
          ) x
      )
      select
        xyz.wal,
        xyz.is_rls_enabled,
        xyz.subscription_ids,
        xyz.errors
      from
        w2j,
        realtime.apply_rls(
          wal := w2j.data::jsonb,
          max_record_bytes := max_record_bytes
        ) xyz(wal, is_rls_enabled, subscription_ids, errors)
      where
        w2j.w2j_add_tables <> ''
        and xyz.subscription_ids[1] is not null
    $$;


ALTER FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) OWNER TO supabase_admin;

--
-- TOC entry 557 (class 1255 OID 17115)
-- Name: quote_wal2json(regclass); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.quote_wal2json(entity regclass) RETURNS text
    LANGUAGE sql IMMUTABLE STRICT
    AS $$
      select
        (
          select string_agg('' || ch,'')
          from unnest(string_to_array(nsp.nspname::text, null)) with ordinality x(ch, idx)
          where
            not (x.idx = 1 and x.ch = '"')
            and not (
              x.idx = array_length(string_to_array(nsp.nspname::text, null), 1)
              and x.ch = '"'
            )
        )
        || '.'
        || (
          select string_agg('' || ch,'')
          from unnest(string_to_array(pc.relname::text, null)) with ordinality x(ch, idx)
          where
            not (x.idx = 1 and x.ch = '"')
            and not (
              x.idx = array_length(string_to_array(nsp.nspname::text, null), 1)
              and x.ch = '"'
            )
          )
      from
        pg_class pc
        join pg_namespace nsp
          on pc.relnamespace = nsp.oid
      where
        pc.oid = entity
    $$;


ALTER FUNCTION realtime.quote_wal2json(entity regclass) OWNER TO supabase_admin;

--
-- TOC entry 548 (class 1255 OID 17237)
-- Name: send(jsonb, text, text, boolean); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.send(payload jsonb, event text, topic text, private boolean DEFAULT true) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
  generated_id uuid;
  final_payload jsonb;
BEGIN
  BEGIN
    -- Generate a new UUID for the id
    generated_id := gen_random_uuid();

    -- Check if payload has an 'id' key, if not, add the generated UUID
    IF payload ? 'id' THEN
      final_payload := payload;
    ELSE
      final_payload := jsonb_set(payload, '{id}', to_jsonb(generated_id));
    END IF;

    -- Set the topic configuration
    EXECUTE format('SET LOCAL realtime.topic TO %L', topic);

    -- Attempt to insert the message
    INSERT INTO realtime.messages (id, payload, event, topic, private, extension)
    VALUES (generated_id, final_payload, event, topic, private, 'broadcast');
  EXCEPTION
    WHEN OTHERS THEN
      -- Capture and notify the error
      RAISE WARNING 'ErrorSendingBroadcastMessage: %', SQLERRM;
  END;
END;
$$;


ALTER FUNCTION realtime.send(payload jsonb, event text, topic text, private boolean) OWNER TO supabase_admin;

--
-- TOC entry 533 (class 1255 OID 17113)
-- Name: subscription_check_filters(); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.subscription_check_filters() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    /*
    Validates that the user defined filters for a subscription:
    - refer to valid columns that the claimed role may access
    - values are coercable to the correct column type
    */
    declare
        col_names text[] = coalesce(
                array_agg(c.column_name order by c.ordinal_position),
                '{}'::text[]
            )
            from
                information_schema.columns c
            where
                format('%I.%I', c.table_schema, c.table_name)::regclass = new.entity
                and pg_catalog.has_column_privilege(
                    (new.claims ->> 'role'),
                    format('%I.%I', c.table_schema, c.table_name)::regclass,
                    c.column_name,
                    'SELECT'
                );
        filter realtime.user_defined_filter;
        col_type regtype;

        in_val jsonb;
    begin
        for filter in select * from unnest(new.filters) loop
            -- Filtered column is valid
            if not filter.column_name = any(col_names) then
                raise exception 'invalid column for filter %', filter.column_name;
            end if;

            -- Type is sanitized and safe for string interpolation
            col_type = (
                select atttypid::regtype
                from pg_catalog.pg_attribute
                where attrelid = new.entity
                      and attname = filter.column_name
            );
            if col_type is null then
                raise exception 'failed to lookup type for column %', filter.column_name;
            end if;

            -- Set maximum number of entries for in filter
            if filter.op = 'in'::realtime.equality_op then
                in_val = realtime.cast(filter.value, (col_type::text || '[]')::regtype);
                if coalesce(jsonb_array_length(in_val), 0) > 100 then
                    raise exception 'too many values for `in` filter. Maximum 100';
                end if;
            else
                -- raises an exception if value is not coercable to type
                perform realtime.cast(filter.value, col_type);
            end if;

        end loop;

        -- Apply consistent order to filters so the unique constraint on
        -- (subscription_id, entity, filters) can't be tricked by a different filter order
        new.filters = coalesce(
            array_agg(f order by f.column_name, f.op, f.value),
            '{}'
        ) from unnest(new.filters) f;

        return new;
    end;
    $$;


ALTER FUNCTION realtime.subscription_check_filters() OWNER TO supabase_admin;

--
-- TOC entry 600 (class 1255 OID 17148)
-- Name: to_regrole(text); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.to_regrole(role_name text) RETURNS regrole
    LANGUAGE sql IMMUTABLE
    AS $$ select role_name::regrole $$;


ALTER FUNCTION realtime.to_regrole(role_name text) OWNER TO supabase_admin;

--
-- TOC entry 517 (class 1255 OID 21283)
-- Name: topic(); Type: FUNCTION; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE FUNCTION realtime.topic() RETURNS text
    LANGUAGE sql STABLE
    AS $$
select nullif(current_setting('realtime.topic', true), '')::text;
$$;


ALTER FUNCTION realtime.topic() OWNER TO supabase_realtime_admin;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 347 (class 1259 OID 16525)
-- Name: audit_log_entries; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.audit_log_entries (
    instance_id uuid,
    id uuid NOT NULL,
    payload json,
    created_at timestamp with time zone,
    ip_address character varying(64) DEFAULT ''::character varying NOT NULL
);


ALTER TABLE auth.audit_log_entries OWNER TO supabase_auth_admin;

--
-- TOC entry 5272 (class 0 OID 0)
-- Dependencies: 347
-- Name: TABLE audit_log_entries; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.audit_log_entries IS 'Auth: Audit trail for user actions.';


--
-- TOC entry 429 (class 1259 OID 39587)
-- Name: custom_oauth_providers; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.custom_oauth_providers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    provider_type text NOT NULL,
    identifier text NOT NULL,
    name text NOT NULL,
    client_id text NOT NULL,
    client_secret text NOT NULL,
    acceptable_client_ids text[] DEFAULT '{}'::text[] NOT NULL,
    scopes text[] DEFAULT '{}'::text[] NOT NULL,
    pkce_enabled boolean DEFAULT true NOT NULL,
    attribute_mapping jsonb DEFAULT '{}'::jsonb NOT NULL,
    authorization_params jsonb DEFAULT '{}'::jsonb NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    email_optional boolean DEFAULT false NOT NULL,
    issuer text,
    discovery_url text,
    skip_nonce_check boolean DEFAULT false NOT NULL,
    cached_discovery jsonb,
    discovery_cached_at timestamp with time zone,
    authorization_url text,
    token_url text,
    userinfo_url text,
    jwks_uri text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT custom_oauth_providers_authorization_url_https CHECK (((authorization_url IS NULL) OR (authorization_url ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_authorization_url_length CHECK (((authorization_url IS NULL) OR (char_length(authorization_url) <= 2048))),
    CONSTRAINT custom_oauth_providers_client_id_length CHECK (((char_length(client_id) >= 1) AND (char_length(client_id) <= 512))),
    CONSTRAINT custom_oauth_providers_discovery_url_length CHECK (((discovery_url IS NULL) OR (char_length(discovery_url) <= 2048))),
    CONSTRAINT custom_oauth_providers_identifier_format CHECK ((identifier ~ '^[a-z0-9][a-z0-9:-]{0,48}[a-z0-9]$'::text)),
    CONSTRAINT custom_oauth_providers_issuer_length CHECK (((issuer IS NULL) OR ((char_length(issuer) >= 1) AND (char_length(issuer) <= 2048)))),
    CONSTRAINT custom_oauth_providers_jwks_uri_https CHECK (((jwks_uri IS NULL) OR (jwks_uri ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_jwks_uri_length CHECK (((jwks_uri IS NULL) OR (char_length(jwks_uri) <= 2048))),
    CONSTRAINT custom_oauth_providers_name_length CHECK (((char_length(name) >= 1) AND (char_length(name) <= 100))),
    CONSTRAINT custom_oauth_providers_oauth2_requires_endpoints CHECK (((provider_type <> 'oauth2'::text) OR ((authorization_url IS NOT NULL) AND (token_url IS NOT NULL) AND (userinfo_url IS NOT NULL)))),
    CONSTRAINT custom_oauth_providers_oidc_discovery_url_https CHECK (((provider_type <> 'oidc'::text) OR (discovery_url IS NULL) OR (discovery_url ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_oidc_issuer_https CHECK (((provider_type <> 'oidc'::text) OR (issuer IS NULL) OR (issuer ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_oidc_requires_issuer CHECK (((provider_type <> 'oidc'::text) OR (issuer IS NOT NULL))),
    CONSTRAINT custom_oauth_providers_provider_type_check CHECK ((provider_type = ANY (ARRAY['oauth2'::text, 'oidc'::text]))),
    CONSTRAINT custom_oauth_providers_token_url_https CHECK (((token_url IS NULL) OR (token_url ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_token_url_length CHECK (((token_url IS NULL) OR (char_length(token_url) <= 2048))),
    CONSTRAINT custom_oauth_providers_userinfo_url_https CHECK (((userinfo_url IS NULL) OR (userinfo_url ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_userinfo_url_length CHECK (((userinfo_url IS NULL) OR (char_length(userinfo_url) <= 2048)))
);


ALTER TABLE auth.custom_oauth_providers OWNER TO supabase_auth_admin;

--
-- TOC entry 358 (class 1259 OID 16883)
-- Name: flow_state; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.flow_state (
    id uuid NOT NULL,
    user_id uuid,
    auth_code text,
    code_challenge_method auth.code_challenge_method,
    code_challenge text,
    provider_type text NOT NULL,
    provider_access_token text,
    provider_refresh_token text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    authentication_method text NOT NULL,
    auth_code_issued_at timestamp with time zone,
    invite_token text,
    referrer text,
    oauth_client_state_id uuid,
    linking_target_id uuid,
    email_optional boolean DEFAULT false NOT NULL
);


ALTER TABLE auth.flow_state OWNER TO supabase_auth_admin;

--
-- TOC entry 5275 (class 0 OID 0)
-- Dependencies: 358
-- Name: TABLE flow_state; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.flow_state IS 'Stores metadata for all OAuth/SSO login flows';


--
-- TOC entry 349 (class 1259 OID 16681)
-- Name: identities; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.identities (
    provider_id text NOT NULL,
    user_id uuid NOT NULL,
    identity_data jsonb NOT NULL,
    provider text NOT NULL,
    last_sign_in_at timestamp with time zone,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    email text GENERATED ALWAYS AS (lower((identity_data ->> 'email'::text))) STORED,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


ALTER TABLE auth.identities OWNER TO supabase_auth_admin;

--
-- TOC entry 5277 (class 0 OID 0)
-- Dependencies: 349
-- Name: TABLE identities; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.identities IS 'Auth: Stores identities associated to a user.';


--
-- TOC entry 5278 (class 0 OID 0)
-- Dependencies: 349
-- Name: COLUMN identities.email; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.identities.email IS 'Auth: Email is a generated column that references the optional email property in the identity_data';


--
-- TOC entry 346 (class 1259 OID 16518)
-- Name: instances; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.instances (
    id uuid NOT NULL,
    uuid uuid,
    raw_base_config text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


ALTER TABLE auth.instances OWNER TO supabase_auth_admin;

--
-- TOC entry 5280 (class 0 OID 0)
-- Dependencies: 346
-- Name: TABLE instances; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.instances IS 'Auth: Manages users across multiple sites.';


--
-- TOC entry 353 (class 1259 OID 16770)
-- Name: mfa_amr_claims; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.mfa_amr_claims (
    session_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    authentication_method text NOT NULL,
    id uuid NOT NULL
);


ALTER TABLE auth.mfa_amr_claims OWNER TO supabase_auth_admin;

--
-- TOC entry 5282 (class 0 OID 0)
-- Dependencies: 353
-- Name: TABLE mfa_amr_claims; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.mfa_amr_claims IS 'auth: stores authenticator method reference claims for multi factor authentication';


--
-- TOC entry 352 (class 1259 OID 16758)
-- Name: mfa_challenges; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.mfa_challenges (
    id uuid NOT NULL,
    factor_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    verified_at timestamp with time zone,
    ip_address inet NOT NULL,
    otp_code text,
    web_authn_session_data jsonb
);


ALTER TABLE auth.mfa_challenges OWNER TO supabase_auth_admin;

--
-- TOC entry 5284 (class 0 OID 0)
-- Dependencies: 352
-- Name: TABLE mfa_challenges; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.mfa_challenges IS 'auth: stores metadata about challenge requests made';


--
-- TOC entry 351 (class 1259 OID 16745)
-- Name: mfa_factors; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.mfa_factors (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    friendly_name text,
    factor_type auth.factor_type NOT NULL,
    status auth.factor_status NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    secret text,
    phone text,
    last_challenged_at timestamp with time zone,
    web_authn_credential jsonb,
    web_authn_aaguid uuid,
    last_webauthn_challenge_data jsonb
);


ALTER TABLE auth.mfa_factors OWNER TO supabase_auth_admin;

--
-- TOC entry 5286 (class 0 OID 0)
-- Dependencies: 351
-- Name: TABLE mfa_factors; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.mfa_factors IS 'auth: stores metadata about factors';


--
-- TOC entry 5287 (class 0 OID 0)
-- Dependencies: 351
-- Name: COLUMN mfa_factors.last_webauthn_challenge_data; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.mfa_factors.last_webauthn_challenge_data IS 'Stores the latest WebAuthn challenge data including attestation/assertion for customer verification';


--
-- TOC entry 361 (class 1259 OID 16995)
-- Name: oauth_authorizations; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.oauth_authorizations (
    id uuid NOT NULL,
    authorization_id text NOT NULL,
    client_id uuid NOT NULL,
    user_id uuid,
    redirect_uri text NOT NULL,
    scope text NOT NULL,
    state text,
    resource text,
    code_challenge text,
    code_challenge_method auth.code_challenge_method,
    response_type auth.oauth_response_type DEFAULT 'code'::auth.oauth_response_type NOT NULL,
    status auth.oauth_authorization_status DEFAULT 'pending'::auth.oauth_authorization_status NOT NULL,
    authorization_code text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '00:03:00'::interval) NOT NULL,
    approved_at timestamp with time zone,
    nonce text,
    CONSTRAINT oauth_authorizations_authorization_code_length CHECK ((char_length(authorization_code) <= 255)),
    CONSTRAINT oauth_authorizations_code_challenge_length CHECK ((char_length(code_challenge) <= 128)),
    CONSTRAINT oauth_authorizations_expires_at_future CHECK ((expires_at > created_at)),
    CONSTRAINT oauth_authorizations_nonce_length CHECK ((char_length(nonce) <= 255)),
    CONSTRAINT oauth_authorizations_redirect_uri_length CHECK ((char_length(redirect_uri) <= 2048)),
    CONSTRAINT oauth_authorizations_resource_length CHECK ((char_length(resource) <= 2048)),
    CONSTRAINT oauth_authorizations_scope_length CHECK ((char_length(scope) <= 4096)),
    CONSTRAINT oauth_authorizations_state_length CHECK ((char_length(state) <= 4096))
);


ALTER TABLE auth.oauth_authorizations OWNER TO supabase_auth_admin;

--
-- TOC entry 363 (class 1259 OID 17068)
-- Name: oauth_client_states; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.oauth_client_states (
    id uuid NOT NULL,
    provider_type text NOT NULL,
    code_verifier text,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE auth.oauth_client_states OWNER TO supabase_auth_admin;

--
-- TOC entry 5290 (class 0 OID 0)
-- Dependencies: 363
-- Name: TABLE oauth_client_states; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.oauth_client_states IS 'Stores OAuth states for third-party provider authentication flows where Supabase acts as the OAuth client.';


--
-- TOC entry 360 (class 1259 OID 16965)
-- Name: oauth_clients; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.oauth_clients (
    id uuid NOT NULL,
    client_secret_hash text,
    registration_type auth.oauth_registration_type NOT NULL,
    redirect_uris text NOT NULL,
    grant_types text NOT NULL,
    client_name text,
    client_uri text,
    logo_uri text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    client_type auth.oauth_client_type DEFAULT 'confidential'::auth.oauth_client_type NOT NULL,
    token_endpoint_auth_method text NOT NULL,
    CONSTRAINT oauth_clients_client_name_length CHECK ((char_length(client_name) <= 1024)),
    CONSTRAINT oauth_clients_client_uri_length CHECK ((char_length(client_uri) <= 2048)),
    CONSTRAINT oauth_clients_logo_uri_length CHECK ((char_length(logo_uri) <= 2048)),
    CONSTRAINT oauth_clients_token_endpoint_auth_method_check CHECK ((token_endpoint_auth_method = ANY (ARRAY['client_secret_basic'::text, 'client_secret_post'::text, 'none'::text])))
);


ALTER TABLE auth.oauth_clients OWNER TO supabase_auth_admin;

--
-- TOC entry 362 (class 1259 OID 17028)
-- Name: oauth_consents; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.oauth_consents (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    client_id uuid NOT NULL,
    scopes text NOT NULL,
    granted_at timestamp with time zone DEFAULT now() NOT NULL,
    revoked_at timestamp with time zone,
    CONSTRAINT oauth_consents_revoked_after_granted CHECK (((revoked_at IS NULL) OR (revoked_at >= granted_at))),
    CONSTRAINT oauth_consents_scopes_length CHECK ((char_length(scopes) <= 2048)),
    CONSTRAINT oauth_consents_scopes_not_empty CHECK ((char_length(TRIM(BOTH FROM scopes)) > 0))
);


ALTER TABLE auth.oauth_consents OWNER TO supabase_auth_admin;

--
-- TOC entry 359 (class 1259 OID 16933)
-- Name: one_time_tokens; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.one_time_tokens (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    token_type auth.one_time_token_type NOT NULL,
    token_hash text NOT NULL,
    relates_to text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT one_time_tokens_token_hash_check CHECK ((char_length(token_hash) > 0))
);


ALTER TABLE auth.one_time_tokens OWNER TO supabase_auth_admin;

--
-- TOC entry 345 (class 1259 OID 16507)
-- Name: refresh_tokens; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.refresh_tokens (
    instance_id uuid,
    id bigint NOT NULL,
    token character varying(255),
    user_id character varying(255),
    revoked boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    parent character varying(255),
    session_id uuid
);


ALTER TABLE auth.refresh_tokens OWNER TO supabase_auth_admin;

--
-- TOC entry 5295 (class 0 OID 0)
-- Dependencies: 345
-- Name: TABLE refresh_tokens; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.refresh_tokens IS 'Auth: Store of tokens used to refresh JWT tokens once they expire.';


--
-- TOC entry 344 (class 1259 OID 16506)
-- Name: refresh_tokens_id_seq; Type: SEQUENCE; Schema: auth; Owner: supabase_auth_admin
--

CREATE SEQUENCE auth.refresh_tokens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE auth.refresh_tokens_id_seq OWNER TO supabase_auth_admin;

--
-- TOC entry 5297 (class 0 OID 0)
-- Dependencies: 344
-- Name: refresh_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: auth; Owner: supabase_auth_admin
--

ALTER SEQUENCE auth.refresh_tokens_id_seq OWNED BY auth.refresh_tokens.id;


--
-- TOC entry 356 (class 1259 OID 16812)
-- Name: saml_providers; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.saml_providers (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    entity_id text NOT NULL,
    metadata_xml text NOT NULL,
    metadata_url text,
    attribute_mapping jsonb,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    name_id_format text,
    CONSTRAINT "entity_id not empty" CHECK ((char_length(entity_id) > 0)),
    CONSTRAINT "metadata_url not empty" CHECK (((metadata_url = NULL::text) OR (char_length(metadata_url) > 0))),
    CONSTRAINT "metadata_xml not empty" CHECK ((char_length(metadata_xml) > 0))
);


ALTER TABLE auth.saml_providers OWNER TO supabase_auth_admin;

--
-- TOC entry 5299 (class 0 OID 0)
-- Dependencies: 356
-- Name: TABLE saml_providers; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.saml_providers IS 'Auth: Manages SAML Identity Provider connections.';


--
-- TOC entry 357 (class 1259 OID 16830)
-- Name: saml_relay_states; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.saml_relay_states (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    request_id text NOT NULL,
    for_email text,
    redirect_to text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    flow_state_id uuid,
    CONSTRAINT "request_id not empty" CHECK ((char_length(request_id) > 0))
);


ALTER TABLE auth.saml_relay_states OWNER TO supabase_auth_admin;

--
-- TOC entry 5301 (class 0 OID 0)
-- Dependencies: 357
-- Name: TABLE saml_relay_states; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.saml_relay_states IS 'Auth: Contains SAML Relay State information for each Service Provider initiated login.';


--
-- TOC entry 348 (class 1259 OID 16533)
-- Name: schema_migrations; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.schema_migrations (
    version character varying(255) NOT NULL
);


ALTER TABLE auth.schema_migrations OWNER TO supabase_auth_admin;

--
-- TOC entry 5303 (class 0 OID 0)
-- Dependencies: 348
-- Name: TABLE schema_migrations; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.schema_migrations IS 'Auth: Manages updates to the auth system.';


--
-- TOC entry 350 (class 1259 OID 16711)
-- Name: sessions; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.sessions (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    factor_id uuid,
    aal auth.aal_level,
    not_after timestamp with time zone,
    refreshed_at timestamp without time zone,
    user_agent text,
    ip inet,
    tag text,
    oauth_client_id uuid,
    refresh_token_hmac_key text,
    refresh_token_counter bigint,
    scopes text,
    CONSTRAINT sessions_scopes_length CHECK ((char_length(scopes) <= 4096))
);


ALTER TABLE auth.sessions OWNER TO supabase_auth_admin;

--
-- TOC entry 5305 (class 0 OID 0)
-- Dependencies: 350
-- Name: TABLE sessions; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.sessions IS 'Auth: Stores session data associated to a user.';


--
-- TOC entry 5306 (class 0 OID 0)
-- Dependencies: 350
-- Name: COLUMN sessions.not_after; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.sessions.not_after IS 'Auth: Not after is a nullable column that contains a timestamp after which the session should be regarded as expired.';


--
-- TOC entry 5307 (class 0 OID 0)
-- Dependencies: 350
-- Name: COLUMN sessions.refresh_token_hmac_key; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.sessions.refresh_token_hmac_key IS 'Holds a HMAC-SHA256 key used to sign refresh tokens for this session.';


--
-- TOC entry 5308 (class 0 OID 0)
-- Dependencies: 350
-- Name: COLUMN sessions.refresh_token_counter; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.sessions.refresh_token_counter IS 'Holds the ID (counter) of the last issued refresh token.';


--
-- TOC entry 355 (class 1259 OID 16797)
-- Name: sso_domains; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.sso_domains (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    domain text NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    CONSTRAINT "domain not empty" CHECK ((char_length(domain) > 0))
);


ALTER TABLE auth.sso_domains OWNER TO supabase_auth_admin;

--
-- TOC entry 5310 (class 0 OID 0)
-- Dependencies: 355
-- Name: TABLE sso_domains; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.sso_domains IS 'Auth: Manages SSO email address domain mapping to an SSO Identity Provider.';


--
-- TOC entry 354 (class 1259 OID 16788)
-- Name: sso_providers; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.sso_providers (
    id uuid NOT NULL,
    resource_id text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    disabled boolean,
    CONSTRAINT "resource_id not empty" CHECK (((resource_id = NULL::text) OR (char_length(resource_id) > 0)))
);


ALTER TABLE auth.sso_providers OWNER TO supabase_auth_admin;

--
-- TOC entry 5312 (class 0 OID 0)
-- Dependencies: 354
-- Name: TABLE sso_providers; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.sso_providers IS 'Auth: Manages SSO identity provider information; see saml_providers for SAML.';


--
-- TOC entry 5313 (class 0 OID 0)
-- Dependencies: 354
-- Name: COLUMN sso_providers.resource_id; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.sso_providers.resource_id IS 'Auth: Uniquely identifies a SSO provider according to a user-chosen resource ID (case insensitive), useful in infrastructure as code.';


--
-- TOC entry 343 (class 1259 OID 16495)
-- Name: users; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.users (
    instance_id uuid,
    id uuid NOT NULL,
    aud character varying(255),
    role character varying(255),
    email character varying(255),
    encrypted_password character varying(255),
    email_confirmed_at timestamp with time zone,
    invited_at timestamp with time zone,
    confirmation_token character varying(255),
    confirmation_sent_at timestamp with time zone,
    recovery_token character varying(255),
    recovery_sent_at timestamp with time zone,
    email_change_token_new character varying(255),
    email_change character varying(255),
    email_change_sent_at timestamp with time zone,
    last_sign_in_at timestamp with time zone,
    raw_app_meta_data jsonb,
    raw_user_meta_data jsonb,
    is_super_admin boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    phone text DEFAULT NULL::character varying,
    phone_confirmed_at timestamp with time zone,
    phone_change text DEFAULT ''::character varying,
    phone_change_token character varying(255) DEFAULT ''::character varying,
    phone_change_sent_at timestamp with time zone,
    confirmed_at timestamp with time zone GENERATED ALWAYS AS (LEAST(email_confirmed_at, phone_confirmed_at)) STORED,
    email_change_token_current character varying(255) DEFAULT ''::character varying,
    email_change_confirm_status smallint DEFAULT 0,
    banned_until timestamp with time zone,
    reauthentication_token character varying(255) DEFAULT ''::character varying,
    reauthentication_sent_at timestamp with time zone,
    is_sso_user boolean DEFAULT false NOT NULL,
    deleted_at timestamp with time zone,
    is_anonymous boolean DEFAULT false NOT NULL,
    CONSTRAINT users_email_change_confirm_status_check CHECK (((email_change_confirm_status >= 0) AND (email_change_confirm_status <= 2)))
);


ALTER TABLE auth.users OWNER TO supabase_auth_admin;

--
-- TOC entry 5315 (class 0 OID 0)
-- Dependencies: 343
-- Name: TABLE users; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.users IS 'Auth: Stores user login data within a secure schema.';


--
-- TOC entry 5316 (class 0 OID 0)
-- Dependencies: 343
-- Name: COLUMN users.is_sso_user; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.users.is_sso_user IS 'Auth: Set this column to true when the account comes from SSO. These accounts can have duplicate emails.';


--
-- TOC entry 383 (class 1259 OID 21288)
-- Name: stacks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stacks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    yard_id text NOT NULL,
    stack_number integer NOT NULL,
    section_id text,
    section_name text DEFAULT 'Main Section'::text NOT NULL,
    rows integer DEFAULT 6 NOT NULL,
    max_tiers integer DEFAULT 4 NOT NULL,
    capacity integer DEFAULT 0 NOT NULL,
    current_occupancy integer DEFAULT 0 NOT NULL,
    position_x numeric DEFAULT 0,
    position_y numeric DEFAULT 0,
    position_z numeric DEFAULT 0,
    width numeric DEFAULT 2.5,
    length numeric DEFAULT 12,
    is_active boolean DEFAULT true,
    is_odd_stack boolean DEFAULT false,
    assigned_client_code text,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by text,
    updated_by text,
    container_size text DEFAULT '20feet'::text NOT NULL,
    is_special_stack boolean DEFAULT false NOT NULL,
    row_tier_config jsonb,
    is_virtual boolean DEFAULT false,
    is_buffer_zone boolean DEFAULT false,
    buffer_zone_type text,
    damage_types_supported jsonb DEFAULT '[]'::jsonb,
    CONSTRAINT stacks_container_size_check CHECK (((container_size = ANY (ARRAY['20ft'::text, '40ft'::text, '20feet'::text, '40feet'::text])) OR (container_size IS NULL)))
);


ALTER TABLE public.stacks OWNER TO postgres;

--
-- TOC entry 5318 (class 0 OID 0)
-- Dependencies: 383
-- Name: TABLE stacks; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.stacks IS 'Triggers temporarily disabled to fix scalar extraction error - will be re-enabled after testing';


--
-- TOC entry 5319 (class 0 OID 0)
-- Dependencies: 383
-- Name: COLUMN stacks.container_size; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.stacks.container_size IS 'Container size this stack is configured for (20ft or 40ft)';


--
-- TOC entry 5320 (class 0 OID 0)
-- Dependencies: 383
-- Name: COLUMN stacks.row_tier_config; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.stacks.row_tier_config IS 'Per-row tier configuration as JSON array: [{"row": 1, "maxTiers": 5}, {"row": 2, "maxTiers": 4}, ...]';


--
-- TOC entry 5321 (class 0 OID 0)
-- Dependencies: 383
-- Name: COLUMN stacks.is_virtual; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.stacks.is_virtual IS 'True if this is a virtual stack representing a 40ft container position between two physical stacks';


--
-- TOC entry 5322 (class 0 OID 0)
-- Dependencies: 383
-- Name: COLUMN stacks.is_buffer_zone; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.stacks.is_buffer_zone IS 'Indicates if this stack is a buffer zone for damaged containers';


--
-- TOC entry 5323 (class 0 OID 0)
-- Dependencies: 383
-- Name: COLUMN stacks.buffer_zone_type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.stacks.buffer_zone_type IS 'Type of buffer zone (damage, maintenance, quarantine, etc.)';


--
-- TOC entry 5324 (class 0 OID 0)
-- Dependencies: 383
-- Name: COLUMN stacks.damage_types_supported; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.stacks.damage_types_supported IS 'Types of damage supported by this buffer zone (JSONB array)';


--
-- TOC entry 5325 (class 0 OID 0)
-- Dependencies: 383
-- Name: CONSTRAINT stacks_container_size_check ON stacks; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON CONSTRAINT stacks_container_size_check ON public.stacks IS 'Allows 20ft, 40ft, 20feet, 40feet, or NULL';


--
-- TOC entry 384 (class 1259 OID 21314)
-- Name: active_stacks; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.active_stacks AS
 SELECT id,
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
    is_odd_stack,
    assigned_client_code,
    notes,
    created_at,
    updated_at,
    created_by,
    updated_by,
    container_size,
    is_special_stack,
    row_tier_config,
    is_virtual,
    is_buffer_zone,
    buffer_zone_type,
    damage_types_supported
   FROM public.stacks
  WHERE (is_active = true);


ALTER VIEW public.active_stacks OWNER TO postgres;

--
-- TOC entry 5327 (class 0 OID 0)
-- Dependencies: 384
-- Name: VIEW active_stacks; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON VIEW public.active_stacks IS 'Convenience view showing only active stacks';


--
-- TOC entry 385 (class 1259 OID 21319)
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entity_type text NOT NULL,
    entity_id text NOT NULL,
    action text NOT NULL,
    changes jsonb DEFAULT '{}'::jsonb,
    user_id text,
    user_name text,
    "timestamp" timestamp with time zone DEFAULT now(),
    ip_address text,
    user_agent text
);


ALTER TABLE public.audit_logs OWNER TO postgres;

--
-- TOC entry 386 (class 1259 OID 21327)
-- Name: booking_references; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.booking_references (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    booking_number text NOT NULL,
    client_id uuid,
    client_code text NOT NULL,
    client_name text NOT NULL,
    booking_type text NOT NULL,
    total_containers integer DEFAULT 0 NOT NULL,
    remaining_containers integer DEFAULT 0 NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    valid_from timestamp with time zone,
    valid_until timestamp with time zone,
    notes text,
    created_by text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    cancellation_reason text,
    new_booking_reference text,
    container_quantities jsonb DEFAULT '{"size20ft": 0, "size40ft": 0}'::jsonb,
    max_quantity_threshold integer DEFAULT 10,
    requires_detailed_breakdown boolean DEFAULT false,
    transaction_type text,
    CONSTRAINT booking_references_transaction_type_check CHECK ((transaction_type = ANY (ARRAY['Positionnement'::text, 'Transfert (OUT)'::text])))
);


ALTER TABLE public.booking_references OWNER TO postgres;

--
-- TOC entry 5330 (class 0 OID 0)
-- Dependencies: 386
-- Name: COLUMN booking_references.updated_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.booking_references.updated_at IS 'Timestamp of last update, automatically managed by trigger';


--
-- TOC entry 5331 (class 0 OID 0)
-- Dependencies: 386
-- Name: COLUMN booking_references.cancellation_reason; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.booking_references.cancellation_reason IS 'Reason provided when booking is cancelled';


--
-- TOC entry 5332 (class 0 OID 0)
-- Dependencies: 386
-- Name: COLUMN booking_references.new_booking_reference; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.booking_references.new_booking_reference IS 'New booking reference when booking is amended/cancelled';


--
-- TOC entry 5333 (class 0 OID 0)
-- Dependencies: 386
-- Name: COLUMN booking_references.container_quantities; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.booking_references.container_quantities IS 'JSON object containing container quantities by size (size20ft, size40ft)';


--
-- TOC entry 5334 (class 0 OID 0)
-- Dependencies: 386
-- Name: COLUMN booking_references.max_quantity_threshold; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.booking_references.max_quantity_threshold IS 'Maximum containers allowed before requiring detailed breakdown';


--
-- TOC entry 5335 (class 0 OID 0)
-- Dependencies: 386
-- Name: COLUMN booking_references.requires_detailed_breakdown; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.booking_references.requires_detailed_breakdown IS 'Whether this booking requires detailed container breakdown';


--
-- TOC entry 5336 (class 0 OID 0)
-- Dependencies: 386
-- Name: COLUMN booking_references.transaction_type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.booking_references.transaction_type IS 'Transaction type for Gate Out operations: Positionnement or Transfert (OUT)';


--
-- TOC entry 387 (class 1259 OID 21342)
-- Name: buffer_zone_stats; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.buffer_zone_stats AS
 SELECT yard_id,
    count(*) AS total_buffer_stacks,
    sum(capacity) AS total_capacity,
    sum(current_occupancy) AS current_occupancy,
    sum((capacity - current_occupancy)) AS available_spaces,
        CASE
            WHEN (sum(capacity) > 0) THEN round((((sum(current_occupancy))::numeric / (sum(capacity))::numeric) * (100)::numeric), 2)
            ELSE (0)::numeric
        END AS utilization_rate,
    array_agg(DISTINCT buffer_zone_type) FILTER (WHERE (buffer_zone_type IS NOT NULL)) AS buffer_types,
    array_agg(DISTINCT container_size) AS supported_sizes
   FROM public.stacks
  WHERE ((is_buffer_zone = true) AND (is_active = true))
  GROUP BY yard_id;


ALTER VIEW public.buffer_zone_stats OWNER TO postgres;

--
-- TOC entry 5338 (class 0 OID 0)
-- Dependencies: 387
-- Name: VIEW buffer_zone_stats; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON VIEW public.buffer_zone_stats IS 'Statistiques agrégées des zones tampons par dépôt';


--
-- TOC entry 388 (class 1259 OID 21347)
-- Name: client_pools; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.client_pools (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    yard_id text NOT NULL,
    client_id uuid NOT NULL,
    client_code text NOT NULL,
    client_name text NOT NULL,
    assigned_stacks jsonb DEFAULT '[]'::jsonb,
    max_capacity integer DEFAULT 0 NOT NULL,
    current_occupancy integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true,
    priority text DEFAULT 'medium'::text NOT NULL,
    contract_start_date timestamp with time zone DEFAULT now() NOT NULL,
    contract_end_date timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid NOT NULL,
    updated_by uuid,
    CONSTRAINT client_pools_priority_check CHECK ((priority = ANY (ARRAY['high'::text, 'medium'::text, 'low'::text])))
);


ALTER TABLE public.client_pools OWNER TO postgres;

--
-- TOC entry 389 (class 1259 OID 21362)
-- Name: clients; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.clients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    email text,
    phone text,
    free_days_allowed integer DEFAULT 3 NOT NULL,
    daily_storage_rate numeric DEFAULT 45.00 NOT NULL,
    currency text DEFAULT 'USD'::text NOT NULL,
    auto_edi boolean DEFAULT false NOT NULL,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    billing_address jsonb,
    tax_id text,
    credit_limit numeric DEFAULT 0 NOT NULL,
    payment_terms integer DEFAULT 30 NOT NULL,
    notes text,
    created_by text DEFAULT 'System'::text,
    updated_by text DEFAULT 'System'::text,
    address jsonb DEFAULT '{"city": "", "state": "", "street": "", "country": "Côte d''Ivoire", "zipCode": ""}'::jsonb NOT NULL,
    contact_person jsonb DEFAULT '{"name": "", "email": "", "phone": "", "position": ""}'::jsonb,
    CONSTRAINT check_address_structure CHECK (((address IS NULL) OR ((address ? 'street'::text) AND (address ? 'city'::text) AND (address ? 'state'::text) AND (address ? 'zipCode'::text) AND (address ? 'country'::text)))),
    CONSTRAINT check_billing_address_structure CHECK (((billing_address IS NULL) OR ((billing_address ? 'street'::text) AND (billing_address ? 'city'::text) AND (billing_address ? 'state'::text) AND (billing_address ? 'zipCode'::text) AND (billing_address ? 'country'::text))))
);


ALTER TABLE public.clients OWNER TO postgres;

--
-- TOC entry 5341 (class 0 OID 0)
-- Dependencies: 389
-- Name: COLUMN clients.free_days_allowed; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.clients.free_days_allowed IS 'Number of free storage days allowed';


--
-- TOC entry 5342 (class 0 OID 0)
-- Dependencies: 389
-- Name: COLUMN clients.daily_storage_rate; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.clients.daily_storage_rate IS 'Daily storage rate after free days';


--
-- TOC entry 5343 (class 0 OID 0)
-- Dependencies: 389
-- Name: COLUMN clients.currency; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.clients.currency IS 'Currency code for billing (USD, EUR, FCFA, etc.)';


--
-- TOC entry 5344 (class 0 OID 0)
-- Dependencies: 389
-- Name: COLUMN clients.auto_edi; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.clients.auto_edi IS 'Whether automatic EDI transmission is enabled';


--
-- TOC entry 5345 (class 0 OID 0)
-- Dependencies: 389
-- Name: COLUMN clients.credit_limit; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.clients.credit_limit IS 'Credit limit amount for the client';


--
-- TOC entry 5346 (class 0 OID 0)
-- Dependencies: 389
-- Name: COLUMN clients.payment_terms; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.clients.payment_terms IS 'Payment terms in days';


--
-- TOC entry 5347 (class 0 OID 0)
-- Dependencies: 389
-- Name: COLUMN clients.created_by; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.clients.created_by IS 'User who created this client record';


--
-- TOC entry 5348 (class 0 OID 0)
-- Dependencies: 389
-- Name: COLUMN clients.updated_by; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.clients.updated_by IS 'User who last updated this client record';


--
-- TOC entry 5349 (class 0 OID 0)
-- Dependencies: 389
-- Name: COLUMN clients.address; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.clients.address IS 'Structured address data stored as JSONB';


--
-- TOC entry 5350 (class 0 OID 0)
-- Dependencies: 389
-- Name: COLUMN clients.contact_person; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.clients.contact_person IS 'Structured contact person data stored as JSONB';


--
-- TOC entry 5351 (class 0 OID 0)
-- Dependencies: 389
-- Name: CONSTRAINT check_address_structure ON clients; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON CONSTRAINT check_address_structure ON public.clients IS 'Ensures address JSONB has required fields: street, city, state, zipCode, country';


--
-- TOC entry 5352 (class 0 OID 0)
-- Dependencies: 389
-- Name: CONSTRAINT check_billing_address_structure ON clients; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON CONSTRAINT check_billing_address_structure ON public.clients IS 'Ensures billing_address JSONB has required fields: street, city, state, zipCode, country';


--
-- TOC entry 428 (class 1259 OID 38410)
-- Name: container_buffer_zones; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.container_buffer_zones (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    container_id uuid NOT NULL,
    gate_in_operation_id uuid,
    buffer_stack_id uuid,
    yard_id text NOT NULL,
    damage_type text,
    damage_description text,
    damage_assessment jsonb,
    status text DEFAULT 'in_buffer'::text NOT NULL,
    released_at timestamp with time zone,
    released_by uuid,
    release_notes text,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT container_buffer_zones_status_check CHECK ((status = ANY (ARRAY['in_buffer'::text, 'released'::text])))
);


ALTER TABLE public.container_buffer_zones OWNER TO postgres;

--
-- TOC entry 5354 (class 0 OID 0)
-- Dependencies: 428
-- Name: TABLE container_buffer_zones; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.container_buffer_zones IS 'Table de gestion des conteneurs en zone tampon (endommagés en attente de traitement)';


--
-- TOC entry 5355 (class 0 OID 0)
-- Dependencies: 428
-- Name: COLUMN container_buffer_zones.buffer_stack_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.container_buffer_zones.buffer_stack_id IS 'Stack tampon configuré manuellement dans Stack Management (is_buffer_zone = true)';


--
-- TOC entry 5356 (class 0 OID 0)
-- Dependencies: 428
-- Name: COLUMN container_buffer_zones.status; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.container_buffer_zones.status IS 'in_buffer = conteneur actuellement en zone tampon, released = conteneur libéré vers un emplacement réel';


--
-- TOC entry 390 (class 1259 OID 21383)
-- Name: container_types; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.container_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    type_code character varying(20) NOT NULL,
    display_name character varying(50) NOT NULL,
    is_high_cube boolean DEFAULT false,
    available_sizes text[] DEFAULT ARRAY['20ft'::text, '40ft'::text],
    iso_code_20 character varying(10),
    iso_code_40 character varying(10),
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.container_types OWNER TO postgres;

--
-- TOC entry 5358 (class 0 OID 0)
-- Dependencies: 390
-- Name: TABLE container_types; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.container_types IS 'Reference table for container types with High-Cube support and size restrictions';


--
-- TOC entry 5359 (class 0 OID 0)
-- Dependencies: 390
-- Name: COLUMN container_types.type_code; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.container_types.type_code IS 'Unique code for container type (dry, high_cube, reefer, etc.)';


--
-- TOC entry 5360 (class 0 OID 0)
-- Dependencies: 390
-- Name: COLUMN container_types.display_name; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.container_types.display_name IS 'Human-readable name for the container type';


--
-- TOC entry 5361 (class 0 OID 0)
-- Dependencies: 390
-- Name: COLUMN container_types.is_high_cube; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.container_types.is_high_cube IS 'Whether this type represents High-Cube containers';


--
-- TOC entry 5362 (class 0 OID 0)
-- Dependencies: 390
-- Name: COLUMN container_types.available_sizes; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.container_types.available_sizes IS 'Array of available sizes for this container type';


--
-- TOC entry 5363 (class 0 OID 0)
-- Dependencies: 390
-- Name: COLUMN container_types.iso_code_20; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.container_types.iso_code_20 IS 'ISO code for 20ft containers of this type';


--
-- TOC entry 5364 (class 0 OID 0)
-- Dependencies: 390
-- Name: COLUMN container_types.iso_code_40; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.container_types.iso_code_40 IS 'ISO code for 40ft containers of this type';


--
-- TOC entry 391 (class 1259 OID 21394)
-- Name: containers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.containers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    number text NOT NULL,
    type text DEFAULT 'dry'::text NOT NULL,
    size text NOT NULL,
    status text DEFAULT 'in_depot'::text NOT NULL,
    location text,
    yard_id text,
    client_id uuid,
    client_code text,
    gate_in_date timestamp with time zone,
    gate_out_date timestamp with time zone,
    damage jsonb DEFAULT '[]'::jsonb,
    booking_reference text,
    created_by text,
    updated_by text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    classification character varying(20) DEFAULT 'divers'::character varying,
    damage_assessment_stage character varying(20) DEFAULT 'assignment'::character varying,
    damage_assessed_by character varying(255),
    damage_assessed_at timestamp with time zone,
    damage_type character varying(50),
    number_confirmed boolean DEFAULT false,
    is_high_cube boolean DEFAULT false,
    audit_logs jsonb DEFAULT '[]'::jsonb,
    full_empty text,
    is_deleted boolean DEFAULT false,
    deleted_at timestamp with time zone,
    deleted_by uuid,
    transaction_type text,
    buffer_zone_id uuid,
    edi_gate_in_transmitted boolean DEFAULT false,
    edi_gate_out_transmitted boolean DEFAULT false,
    edi_gate_out_transmission_date timestamp with time zone,
    gate_out_operation_id uuid,
    CONSTRAINT check_containers_classification CHECK (((classification)::text = ANY (ARRAY[('divers'::character varying)::text, ('alimentaire'::character varying)::text]))),
    CONSTRAINT check_containers_damage_assessment_stage CHECK (((damage_assessment_stage)::text = ANY (ARRAY[('gate_in'::character varying)::text, ('assignment'::character varying)::text, ('inspection'::character varying)::text]))),
    CONSTRAINT containers_full_empty_check CHECK ((full_empty = ANY (ARRAY['FULL'::text, 'EMPTY'::text]))),
    CONSTRAINT containers_status_check CHECK ((status = ANY (ARRAY['gate_in'::text, 'in_depot'::text, 'in_buffer'::text, 'gate_out'::text, 'out_depot'::text, 'deleted'::text]))),
    CONSTRAINT containers_transaction_type_check CHECK ((transaction_type = ANY (ARRAY['Retour Livraison'::text, 'Transfert (IN)'::text])))
);


ALTER TABLE public.containers OWNER TO postgres;

--
-- TOC entry 5366 (class 0 OID 0)
-- Dependencies: 391
-- Name: COLUMN containers.status; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.containers.status IS 'Container status: gate_in (01), in_depot (02), gate_out (03), out_depot (04), maintenance, cleaning';


--
-- TOC entry 5367 (class 0 OID 0)
-- Dependencies: 391
-- Name: COLUMN containers.classification; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.containers.classification IS 'Container classification: divers (general) or alimentaire (food-grade)';


--
-- TOC entry 5368 (class 0 OID 0)
-- Dependencies: 391
-- Name: COLUMN containers.damage_assessment_stage; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.containers.damage_assessment_stage IS 'Stage at which damage assessment was performed - now defaults to assignment stage';


--
-- TOC entry 5369 (class 0 OID 0)
-- Dependencies: 391
-- Name: COLUMN containers.number_confirmed; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.containers.number_confirmed IS 'Whether container number has been confirmed during gate in';


--
-- TOC entry 5370 (class 0 OID 0)
-- Dependencies: 391
-- Name: COLUMN containers.is_high_cube; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.containers.is_high_cube IS 'True when container is high cube (e.g. Dry 40ft HC = 45G1). Set from Gate In form.';


--
-- TOC entry 5371 (class 0 OID 0)
-- Dependencies: 391
-- Name: COLUMN containers.audit_logs; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.containers.audit_logs IS 'JSONB array storing audit log entries with timestamp, user, action, and details';


--
-- TOC entry 5372 (class 0 OID 0)
-- Dependencies: 391
-- Name: COLUMN containers.full_empty; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.containers.full_empty IS 'Container load status: FULL or EMPTY';


--
-- TOC entry 5373 (class 0 OID 0)
-- Dependencies: 391
-- Name: COLUMN containers.is_deleted; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.containers.is_deleted IS 'Soft delete flag - true if container is deleted';


--
-- TOC entry 5374 (class 0 OID 0)
-- Dependencies: 391
-- Name: COLUMN containers.deleted_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.containers.deleted_at IS 'Timestamp when container was soft deleted';


--
-- TOC entry 5375 (class 0 OID 0)
-- Dependencies: 391
-- Name: COLUMN containers.deleted_by; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.containers.deleted_by IS 'User who soft deleted the container';


--
-- TOC entry 5376 (class 0 OID 0)
-- Dependencies: 391
-- Name: COLUMN containers.transaction_type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.containers.transaction_type IS 'Transaction type from Gate In: Retour Livraison or Transfert (IN)';


--
-- TOC entry 5377 (class 0 OID 0)
-- Dependencies: 391
-- Name: COLUMN containers.edi_gate_in_transmitted; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.containers.edi_gate_in_transmitted IS 'Flag global : true si EDI GATE IN déjà transmis pour ce conteneur (empêche double envoi)';


--
-- TOC entry 5378 (class 0 OID 0)
-- Dependencies: 391
-- Name: COLUMN containers.edi_gate_out_transmitted; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.containers.edi_gate_out_transmitted IS 'Indicates if CODECO GATE_OUT EDI message was transmitted for this container';


--
-- TOC entry 5379 (class 0 OID 0)
-- Dependencies: 391
-- Name: COLUMN containers.edi_gate_out_transmission_date; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.containers.edi_gate_out_transmission_date IS 'Timestamp when CODECO GATE_OUT EDI message was transmitted';


--
-- TOC entry 5380 (class 0 OID 0)
-- Dependencies: 391
-- Name: COLUMN containers.gate_out_operation_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.containers.gate_out_operation_id IS 'Links container to the gate_out_operation that processed it';


--
-- TOC entry 392 (class 1259 OID 21419)
-- Name: gate_in_operations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.gate_in_operations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    container_id uuid,
    container_number text NOT NULL,
    client_code text NOT NULL,
    client_name text NOT NULL,
    container_type text DEFAULT 'dry'::text NOT NULL,
    container_size text NOT NULL,
    transport_company text,
    driver_name text,
    vehicle_number text,
    assigned_location text,
    damage_reported boolean DEFAULT false,
    damage_description text,
    status text DEFAULT 'completed'::text,
    operator_id text,
    operator_name text,
    yard_id text,
    edi_transmitted boolean DEFAULT false,
    edi_transmission_date timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone,
    entry_date date DEFAULT CURRENT_DATE NOT NULL,
    entry_time time without time zone DEFAULT CURRENT_TIME NOT NULL,
    classification character varying(20) DEFAULT 'divers'::character varying,
    damage_assessment_stage character varying(20) DEFAULT 'assignment'::character varying,
    damage_assessed_by character varying(255),
    damage_assessed_at timestamp with time zone,
    damage_type character varying(50),
    container_number_confirmed boolean DEFAULT false,
    assigned_stack character varying(50),
    container_quantity integer DEFAULT 1,
    second_container_number character varying(20),
    second_container_number_confirmed boolean DEFAULT false,
    booking_reference character varying(100),
    truck_arrival_date date,
    truck_arrival_time time without time zone,
    notes text,
    operation_status character varying(20) DEFAULT 'pending'::character varying,
    updated_at timestamp with time zone DEFAULT now(),
    updated_by text,
    full_empty text,
    damage_assessment jsonb,
    is_buffer_assignment boolean DEFAULT false,
    buffer_zone_reason text,
    edi_log_id uuid,
    edi_error_message text,
    damage_assessment_started_at timestamp with time zone,
    damage_assessment_completed_at timestamp with time zone,
    location_assignment_started_at timestamp with time zone,
    location_assignment_completed_at timestamp with time zone,
    edi_processing_started_at timestamp with time zone,
    equipment_reference text,
    transaction_type text,
    edi_message_id text,
    edi_client_name text,
    edi_client_code text,
    is_high_cube boolean DEFAULT false,
    container_iso_code text,
    edi_gate_in_transmitted boolean DEFAULT false,
    CONSTRAINT check_40ft_single_container CHECK ((((container_size = '40ft'::text) AND (container_quantity = 1)) OR (container_size <> '40ft'::text))),
    CONSTRAINT check_classification CHECK (((classification)::text = ANY (ARRAY[('divers'::character varying)::text, ('alimentaire'::character varying)::text]))),
    CONSTRAINT check_container_number_format CHECK ((container_number ~ '^[A-Z]{4}[0-9]{7}$'::text)),
    CONSTRAINT check_container_quantity CHECK ((container_quantity = ANY (ARRAY[1, 2]))),
    CONSTRAINT check_damage_assessment_stage CHECK (((damage_assessment_stage)::text = ANY (ARRAY[('gate_in'::character varying)::text, ('assignment'::character varying)::text, ('inspection'::character varying)::text]))),
    CONSTRAINT check_operation_status CHECK (((operation_status)::text = ANY (ARRAY[('pending'::character varying)::text, ('completed'::character varying)::text, ('cancelled'::character varying)::text]))),
    CONSTRAINT check_second_container_number CHECK ((((container_quantity = 2) AND (second_container_number IS NOT NULL)) OR ((container_quantity = 1) AND (second_container_number IS NULL)) OR ((container_quantity = 2) AND (second_container_number IS NULL)))),
    CONSTRAINT check_second_container_number_format CHECK (((second_container_number IS NULL) OR ((second_container_number)::text ~ '^[A-Z]{4}[0-9]{7}$'::text))),
    CONSTRAINT gate_in_operations_full_empty_check CHECK ((full_empty = ANY (ARRAY['FULL'::text, 'EMPTY'::text]))),
    CONSTRAINT gate_in_operations_transaction_type_check CHECK ((transaction_type = ANY (ARRAY['Retour Livraison'::text, 'Transfert (IN)'::text])))
);


ALTER TABLE public.gate_in_operations OWNER TO postgres;

--
-- TOC entry 5382 (class 0 OID 0)
-- Dependencies: 392
-- Name: COLUMN gate_in_operations.classification; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.gate_in_operations.classification IS 'Container classification: divers (general) or alimentaire (food-grade)';


--
-- TOC entry 5383 (class 0 OID 0)
-- Dependencies: 392
-- Name: COLUMN gate_in_operations.damage_assessment_stage; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.gate_in_operations.damage_assessment_stage IS 'When damage was assessed: assignment (during location assignment) or inspection (during inspection)';


--
-- TOC entry 5384 (class 0 OID 0)
-- Dependencies: 392
-- Name: COLUMN gate_in_operations.damage_assessed_by; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.gate_in_operations.damage_assessed_by IS 'User who assessed the damage';


--
-- TOC entry 5385 (class 0 OID 0)
-- Dependencies: 392
-- Name: COLUMN gate_in_operations.damage_assessed_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.gate_in_operations.damage_assessed_at IS 'Timestamp when damage was assessed';


--
-- TOC entry 5386 (class 0 OID 0)
-- Dependencies: 392
-- Name: COLUMN gate_in_operations.damage_type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.gate_in_operations.damage_type IS 'Type of damage reported';


--
-- TOC entry 5387 (class 0 OID 0)
-- Dependencies: 392
-- Name: COLUMN gate_in_operations.container_number_confirmed; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.gate_in_operations.container_number_confirmed IS 'Whether container number has been confirmed via confirmation field';


--
-- TOC entry 5388 (class 0 OID 0)
-- Dependencies: 392
-- Name: COLUMN gate_in_operations.assigned_stack; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.gate_in_operations.assigned_stack IS 'Stack number extracted from assigned_location (e.g., S04 from S04R1H1)';


--
-- TOC entry 5389 (class 0 OID 0)
-- Dependencies: 392
-- Name: COLUMN gate_in_operations.container_quantity; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.gate_in_operations.container_quantity IS 'Number of containers in this operation (1 or 2)';


--
-- TOC entry 5390 (class 0 OID 0)
-- Dependencies: 392
-- Name: COLUMN gate_in_operations.second_container_number; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.gate_in_operations.second_container_number IS 'Second container number for operations with 2 containers (20ft only)';


--
-- TOC entry 5391 (class 0 OID 0)
-- Dependencies: 392
-- Name: COLUMN gate_in_operations.second_container_number_confirmed; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.gate_in_operations.second_container_number_confirmed IS 'Whether second container number has been confirmed';


--
-- TOC entry 5392 (class 0 OID 0)
-- Dependencies: 392
-- Name: COLUMN gate_in_operations.booking_reference; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.gate_in_operations.booking_reference IS 'Related booking or BL reference number';


--
-- TOC entry 5393 (class 0 OID 0)
-- Dependencies: 392
-- Name: COLUMN gate_in_operations.truck_arrival_date; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.gate_in_operations.truck_arrival_date IS 'Date when the truck arrived at the gate (YYYY-MM-DD)';


--
-- TOC entry 5394 (class 0 OID 0)
-- Dependencies: 392
-- Name: COLUMN gate_in_operations.truck_arrival_time; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.gate_in_operations.truck_arrival_time IS 'Time when the truck arrived at the gate (HH:MM)';


--
-- TOC entry 5395 (class 0 OID 0)
-- Dependencies: 392
-- Name: COLUMN gate_in_operations.notes; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.gate_in_operations.notes IS 'Additional notes or comments for the operation';


--
-- TOC entry 5396 (class 0 OID 0)
-- Dependencies: 392
-- Name: COLUMN gate_in_operations.operation_status; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.gate_in_operations.operation_status IS 'Current status of the gate in operation';


--
-- TOC entry 5397 (class 0 OID 0)
-- Dependencies: 392
-- Name: COLUMN gate_in_operations.updated_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.gate_in_operations.updated_at IS 'Timestamp of last update to this gate in operation';


--
-- TOC entry 5398 (class 0 OID 0)
-- Dependencies: 392
-- Name: COLUMN gate_in_operations.updated_by; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.gate_in_operations.updated_by IS 'User who last updated this gate in operation';


--
-- TOC entry 5399 (class 0 OID 0)
-- Dependencies: 392
-- Name: COLUMN gate_in_operations.full_empty; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.gate_in_operations.full_empty IS 'Container load status at gate in: FULL or EMPTY';


--
-- TOC entry 5400 (class 0 OID 0)
-- Dependencies: 392
-- Name: COLUMN gate_in_operations.damage_assessment; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.gate_in_operations.damage_assessment IS 'Évaluation complète des dommages en format JSON';


--
-- TOC entry 5401 (class 0 OID 0)
-- Dependencies: 392
-- Name: COLUMN gate_in_operations.is_buffer_assignment; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.gate_in_operations.is_buffer_assignment IS 'Indique si le conteneur a été assigné à une zone tampon';


--
-- TOC entry 5402 (class 0 OID 0)
-- Dependencies: 392
-- Name: COLUMN gate_in_operations.buffer_zone_reason; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.gate_in_operations.buffer_zone_reason IS 'Raison de lassignation en zone tampon';


--
-- TOC entry 5403 (class 0 OID 0)
-- Dependencies: 392
-- Name: COLUMN gate_in_operations.damage_assessment_started_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.gate_in_operations.damage_assessment_started_at IS 'Timestamp when damage assessment modal opened';


--
-- TOC entry 5404 (class 0 OID 0)
-- Dependencies: 392
-- Name: COLUMN gate_in_operations.damage_assessment_completed_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.gate_in_operations.damage_assessment_completed_at IS 'Timestamp when damage assessment was submitted';


--
-- TOC entry 5405 (class 0 OID 0)
-- Dependencies: 392
-- Name: COLUMN gate_in_operations.location_assignment_started_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.gate_in_operations.location_assignment_started_at IS 'Timestamp when location selection began';


--
-- TOC entry 5406 (class 0 OID 0)
-- Dependencies: 392
-- Name: COLUMN gate_in_operations.location_assignment_completed_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.gate_in_operations.location_assignment_completed_at IS 'Timestamp when location was assigned';


--
-- TOC entry 5407 (class 0 OID 0)
-- Dependencies: 392
-- Name: COLUMN gate_in_operations.edi_processing_started_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.gate_in_operations.edi_processing_started_at IS 'Timestamp when EDI processing began';


--
-- TOC entry 5408 (class 0 OID 0)
-- Dependencies: 392
-- Name: COLUMN gate_in_operations.equipment_reference; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.gate_in_operations.equipment_reference IS 'Equipment reference number for EDI transmission to help clients identify container transfers';


--
-- TOC entry 5409 (class 0 OID 0)
-- Dependencies: 392
-- Name: COLUMN gate_in_operations.transaction_type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.gate_in_operations.transaction_type IS 'Transaction type for Gate In operations: Retour Livraison or Transfert (IN)';


--
-- TOC entry 5410 (class 0 OID 0)
-- Dependencies: 392
-- Name: COLUMN gate_in_operations.is_high_cube; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.gate_in_operations.is_high_cube IS 'True when container is high cube (e.g. Dry 40ft HC). Set from Gate In form switch.';


--
-- TOC entry 5411 (class 0 OID 0)
-- Dependencies: 392
-- Name: COLUMN gate_in_operations.container_iso_code; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.gate_in_operations.container_iso_code IS 'ISO type code from Gate In form (e.g. 45G1 for Dry 40ft HC). From container type dropdown.';


--
-- TOC entry 5412 (class 0 OID 0)
-- Dependencies: 392
-- Name: COLUMN gate_in_operations.edi_gate_in_transmitted; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.gate_in_operations.edi_gate_in_transmitted IS 'Indique si l EDI GATE IN a été transmis pour cette opération';


--
-- TOC entry 393 (class 1259 OID 21451)
-- Name: damage_assessments_by_stage; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.damage_assessments_by_stage AS
 SELECT 'gate_in_operations'::text AS source_table,
    gate_in_operations.id,
    gate_in_operations.container_number AS identifier,
    gate_in_operations.damage_assessment_stage,
    gate_in_operations.damage_reported,
    gate_in_operations.damage_description,
    gate_in_operations.damage_type,
    gate_in_operations.damage_assessed_by,
    gate_in_operations.damage_assessed_at,
    gate_in_operations.created_at
   FROM public.gate_in_operations
  WHERE (gate_in_operations.damage_reported = true)
UNION ALL
 SELECT 'containers'::text AS source_table,
    containers.id,
    containers.number AS identifier,
    containers.damage_assessment_stage,
        CASE
            WHEN ((containers.damage IS NOT NULL) AND (jsonb_array_length(containers.damage) > 0)) THEN true
            ELSE false
        END AS damage_reported,
        CASE
            WHEN ((containers.damage IS NOT NULL) AND (jsonb_array_length(containers.damage) > 0)) THEN (containers.damage ->> 0)
            ELSE NULL::text
        END AS damage_description,
    containers.damage_type,
    containers.damage_assessed_by,
    containers.damage_assessed_at,
    containers.created_at
   FROM public.containers
  WHERE ((containers.damage IS NOT NULL) AND (jsonb_array_length(containers.damage) > 0));


ALTER VIEW public.damage_assessments_by_stage OWNER TO postgres;

--
-- TOC entry 5414 (class 0 OID 0)
-- Dependencies: 393
-- Name: VIEW damage_assessments_by_stage; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON VIEW public.damage_assessments_by_stage IS 'Unified view of damage assessments across gate_in_operations and containers tables, organized by assessment stage';


--
-- TOC entry 394 (class 1259 OID 21456)
-- Name: edi_transmission_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.edi_transmission_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    container_number text NOT NULL,
    operation text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    last_attempt timestamp with time zone DEFAULT now(),
    file_name text NOT NULL,
    file_size integer DEFAULT 0,
    file_content text,
    partner_code text NOT NULL,
    config_id uuid,
    uploaded_to_sftp boolean DEFAULT false NOT NULL,
    error_message text,
    acknowledgment_received timestamp with time zone,
    container_id uuid,
    gate_operation_id uuid,
    client_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    remote_path text,
    CONSTRAINT edi_transmission_logs_operation_check CHECK ((operation = ANY (ARRAY['GATE_IN'::text, 'GATE_OUT'::text]))),
    CONSTRAINT edi_transmission_logs_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'success'::text, 'failed'::text, 'retrying'::text])))
);


ALTER TABLE public.edi_transmission_logs OWNER TO postgres;

--
-- TOC entry 5416 (class 0 OID 0)
-- Dependencies: 394
-- Name: TABLE edi_transmission_logs; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.edi_transmission_logs IS 'Complete log of all EDI transmissions with status tracking';


--
-- TOC entry 5417 (class 0 OID 0)
-- Dependencies: 394
-- Name: COLUMN edi_transmission_logs.gate_operation_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.edi_transmission_logs.gate_operation_id IS 'Reference to the gate operation that triggered this EDI transmission';


--
-- TOC entry 5418 (class 0 OID 0)
-- Dependencies: 394
-- Name: COLUMN edi_transmission_logs.remote_path; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.edi_transmission_logs.remote_path IS 'Full path where the EDI file was uploaded on the SFTP server (e.g., /incoming/CODECO_ONEY_20260218234902_ONEU1388601.edi)';


--
-- TOC entry 395 (class 1259 OID 21471)
-- Name: edi_client_performance; Type: MATERIALIZED VIEW; Schema: public; Owner: postgres
--

CREATE MATERIALIZED VIEW public.edi_client_performance AS
 SELECT c.id AS client_id,
    c.code AS client_code,
    c.name AS client_name,
    count(etl.id) AS total_transmissions,
    count(etl.id) FILTER (WHERE (etl.status = 'success'::text)) AS successful_transmissions,
    count(etl.id) FILTER (WHERE (etl.status = 'failed'::text)) AS failed_transmissions,
    round(
        CASE
            WHEN (count(etl.id) > 0) THEN (((count(etl.id) FILTER (WHERE (etl.status = 'success'::text)))::numeric / (count(etl.id))::numeric) * (100)::numeric)
            ELSE (0)::numeric
        END, 2) AS success_rate,
    avg(etl.attempts) AS avg_attempts,
    avg(etl.file_size) AS avg_file_size,
    min(etl.created_at) AS first_transmission,
    max(etl.created_at) AS last_transmission,
    count(etl.id) FILTER (WHERE (etl.operation = 'GATE_IN'::text)) AS gate_in_count,
    count(etl.id) FILTER (WHERE (etl.operation = 'GATE_OUT'::text)) AS gate_out_count,
    count(DISTINCT etl.config_id) AS servers_used,
    now() AS last_updated
   FROM (public.clients c
     LEFT JOIN public.edi_transmission_logs etl ON (((c.id = etl.client_id) AND (etl.created_at >= (CURRENT_DATE - '90 days'::interval)))))
  WHERE (c.active = true)
  GROUP BY c.id, c.code, c.name
  WITH NO DATA;


ALTER MATERIALIZED VIEW public.edi_client_performance OWNER TO postgres;

--
-- TOC entry 396 (class 1259 OID 21478)
-- Name: edi_client_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.edi_client_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid,
    client_code text NOT NULL,
    client_name text NOT NULL,
    edi_enabled boolean DEFAULT false NOT NULL,
    enable_gate_in boolean DEFAULT true NOT NULL,
    enable_gate_out boolean DEFAULT true NOT NULL,
    server_config_id uuid,
    priority text DEFAULT 'normal'::text NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT edi_client_settings_priority_check CHECK ((priority = ANY (ARRAY['high'::text, 'normal'::text, 'low'::text])))
);


ALTER TABLE public.edi_client_settings OWNER TO postgres;

--
-- TOC entry 5421 (class 0 OID 0)
-- Dependencies: 396
-- Name: TABLE edi_client_settings; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.edi_client_settings IS 'Client-specific EDI configuration settings and preferences';


--
-- TOC entry 5422 (class 0 OID 0)
-- Dependencies: 396
-- Name: COLUMN edi_client_settings.server_config_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.edi_client_settings.server_config_id IS 'Foreign key to edi_server_configurations table. All SFTP connection details (host, port, username, password, remote_dir) are stored in the referenced server configuration.';


--
-- TOC entry 5423 (class 0 OID 0)
-- Dependencies: 396
-- Name: COLUMN edi_client_settings.priority; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.edi_client_settings.priority IS 'Processing priority: high, normal, or low';


--
-- TOC entry 397 (class 1259 OID 21491)
-- Name: edi_server_configurations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.edi_server_configurations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    host text NOT NULL,
    port integer DEFAULT 22 NOT NULL,
    username text NOT NULL,
    password text,
    remote_path text DEFAULT '/'::text NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    test_mode boolean DEFAULT false NOT NULL,
    timeout integer DEFAULT 30000 NOT NULL,
    retry_attempts integer DEFAULT 3 NOT NULL,
    partner_code text NOT NULL,
    sender_code text NOT NULL,
    file_name_pattern text DEFAULT 'CODECO_{timestamp}_{container}_{operation}.edi'::text NOT NULL,
    assigned_clients jsonb DEFAULT '[]'::jsonb,
    is_default boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT edi_server_configurations_port_check CHECK (((port > 0) AND (port <= 65535))),
    CONSTRAINT edi_server_configurations_retry_attempts_check CHECK (((retry_attempts >= 0) AND (retry_attempts <= 10))),
    CONSTRAINT edi_server_configurations_timeout_check CHECK (((timeout >= 1000) AND (timeout <= 300000))),
    CONSTRAINT edi_server_configurations_type_check CHECK ((type = ANY (ARRAY['FTP'::text, 'SFTP'::text])))
);


ALTER TABLE public.edi_server_configurations OWNER TO postgres;

--
-- TOC entry 5425 (class 0 OID 0)
-- Dependencies: 397
-- Name: TABLE edi_server_configurations; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.edi_server_configurations IS 'EDI server configurations for FTP/SFTP connections to trading partners';


--
-- TOC entry 5426 (class 0 OID 0)
-- Dependencies: 397
-- Name: COLUMN edi_server_configurations.file_name_pattern; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.edi_server_configurations.file_name_pattern IS 'Pattern for generating EDI file names. Supports {timestamp}, {container}, {operation} placeholders';


--
-- TOC entry 5427 (class 0 OID 0)
-- Dependencies: 397
-- Name: COLUMN edi_server_configurations.assigned_clients; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.edi_server_configurations.assigned_clients IS 'JSON array of client codes/names assigned to this server configuration';


--
-- TOC entry 427 (class 1259 OID 23651)
-- Name: edi_client_settings_with_server; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.edi_client_settings_with_server AS
 SELECT ecs.id,
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
    esc.name AS server_name,
    esc.type AS server_type,
    esc.host AS server_host,
    esc.port AS server_port,
    esc.username AS server_username,
    esc.remote_path AS server_remote_path,
    esc.enabled AS server_enabled,
    esc.partner_code AS server_partner_code,
    esc.sender_code AS server_sender_code
   FROM (public.edi_client_settings ecs
     LEFT JOIN public.edi_server_configurations esc ON ((ecs.server_config_id = esc.id)));


ALTER VIEW public.edi_client_settings_with_server OWNER TO postgres;

--
-- TOC entry 5429 (class 0 OID 0)
-- Dependencies: 427
-- Name: VIEW edi_client_settings_with_server; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON VIEW public.edi_client_settings_with_server IS 'Convenient view that joins edi_client_settings with edi_server_configurations to show complete EDI configuration for each client.';


--
-- TOC entry 398 (class 1259 OID 21512)
-- Name: gate_out_operations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.gate_out_operations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    release_order_id uuid,
    booking_number text NOT NULL,
    client_code text NOT NULL,
    client_name text NOT NULL,
    booking_type text,
    total_containers integer,
    processed_containers integer,
    remaining_containers integer,
    processed_container_ids jsonb DEFAULT '[]'::jsonb,
    transport_company text,
    driver_name text,
    vehicle_number text,
    status text DEFAULT 'completed'::text,
    operator_id text,
    operator_name text,
    yard_id text,
    edi_transmitted boolean DEFAULT false,
    edi_transmission_date timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now(),
    updated_by text,
    edi_log_id uuid,
    edi_error_message text,
    container_selection_started_at timestamp with time zone,
    container_selection_completed_at timestamp with time zone,
    edi_processing_started_at timestamp with time zone,
    edi_message_id text,
    edi_client_name text
);


ALTER TABLE public.gate_out_operations OWNER TO postgres;

--
-- TOC entry 5431 (class 0 OID 0)
-- Dependencies: 398
-- Name: COLUMN gate_out_operations.updated_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.gate_out_operations.updated_at IS 'Timestamp of last update to this gate out operation';


--
-- TOC entry 5432 (class 0 OID 0)
-- Dependencies: 398
-- Name: COLUMN gate_out_operations.updated_by; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.gate_out_operations.updated_by IS 'User who last updated this gate out operation';


--
-- TOC entry 5433 (class 0 OID 0)
-- Dependencies: 398
-- Name: COLUMN gate_out_operations.container_selection_started_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.gate_out_operations.container_selection_started_at IS 'Timestamp when container selection began';


--
-- TOC entry 5434 (class 0 OID 0)
-- Dependencies: 398
-- Name: COLUMN gate_out_operations.container_selection_completed_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.gate_out_operations.container_selection_completed_at IS 'Timestamp when all containers were selected';


--
-- TOC entry 5435 (class 0 OID 0)
-- Dependencies: 398
-- Name: COLUMN gate_out_operations.edi_processing_started_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.gate_out_operations.edi_processing_started_at IS 'Timestamp when EDI processing began';


--
-- TOC entry 399 (class 1259 OID 21523)
-- Name: edi_client_summary; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.edi_client_summary AS
 SELECT c.id AS client_id,
    c.code AS client_code,
    c.name AS client_name,
    c.auto_edi AS client_auto_edi,
    COALESCE(ecs.edi_enabled, false) AS edi_configured,
    COALESCE(ecs.enable_gate_in, false) AS gate_in_enabled,
    COALESCE(ecs.enable_gate_out, false) AS gate_out_enabled,
    ecs.priority,
    esc.name AS server_name,
    esc.type AS server_type,
    esc.host AS server_host,
    esc.enabled AS server_enabled,
    COALESCE(stats.total_transmissions, (0)::bigint) AS total_transmissions_30d,
    COALESCE(stats.successful_transmissions, (0)::bigint) AS successful_transmissions_30d,
    COALESCE(stats.failed_transmissions, (0)::bigint) AS failed_transmissions_30d,
    COALESCE(stats.success_rate, (0)::numeric) AS success_rate_30d,
    stats.last_transmission_date,
    COALESCE(recent_ops.gate_in_count, (0)::bigint) AS recent_gate_in_operations,
    COALESCE(recent_ops.gate_out_count, (0)::bigint) AS recent_gate_out_operations,
    COALESCE(recent_ops.gate_in_with_edi, (0)::bigint) AS recent_gate_in_with_edi,
    COALESCE(recent_ops.gate_out_with_edi, (0)::bigint) AS recent_gate_out_with_edi
   FROM ((((public.clients c
     LEFT JOIN public.edi_client_settings ecs ON ((c.id = ecs.client_id)))
     LEFT JOIN public.edi_server_configurations esc ON ((ecs.server_config_id = esc.id)))
     LEFT JOIN ( SELECT edi_transmission_logs.client_id,
            count(*) AS total_transmissions,
            count(*) FILTER (WHERE (edi_transmission_logs.status = 'success'::text)) AS successful_transmissions,
            count(*) FILTER (WHERE (edi_transmission_logs.status = 'failed'::text)) AS failed_transmissions,
                CASE
                    WHEN (count(*) > 0) THEN round((((count(*) FILTER (WHERE (edi_transmission_logs.status = 'success'::text)))::numeric / (count(*))::numeric) * (100)::numeric), 2)
                    ELSE (0)::numeric
                END AS success_rate,
            max(edi_transmission_logs.created_at) AS last_transmission_date
           FROM public.edi_transmission_logs
          WHERE (edi_transmission_logs.created_at >= (CURRENT_DATE - '30 days'::interval))
          GROUP BY edi_transmission_logs.client_id) stats ON ((c.id = stats.client_id)))
     LEFT JOIN ( SELECT c_1.id AS client_id,
            count(*) FILTER (WHERE (ops.operation = 'GATE_IN'::text)) AS gate_in_count,
            count(*) FILTER (WHERE (ops.operation = 'GATE_OUT'::text)) AS gate_out_count,
            count(*) FILTER (WHERE ((ops.operation = 'GATE_IN'::text) AND (ops.edi_transmitted = true))) AS gate_in_with_edi,
            count(*) FILTER (WHERE ((ops.operation = 'GATE_OUT'::text) AND (ops.edi_transmitted = true))) AS gate_out_with_edi
           FROM (( SELECT gate_in_operations.client_code,
                    'GATE_IN'::text AS operation,
                    gate_in_operations.edi_transmitted
                   FROM public.gate_in_operations
                  WHERE (gate_in_operations.created_at >= (CURRENT_DATE - '7 days'::interval))
                UNION ALL
                 SELECT gate_out_operations.client_code,
                    'GATE_OUT'::text AS operation,
                    gate_out_operations.edi_transmitted
                   FROM public.gate_out_operations
                  WHERE (gate_out_operations.created_at >= (CURRENT_DATE - '7 days'::interval))) ops
             JOIN public.clients c_1 ON ((c_1.code = ops.client_code)))
          GROUP BY c_1.id) recent_ops ON ((c.id = recent_ops.client_id)))
  WHERE (c.active = true)
  ORDER BY c.name;


ALTER VIEW public.edi_client_summary OWNER TO postgres;

--
-- TOC entry 400 (class 1259 OID 21528)
-- Name: edi_dashboard_stats; Type: MATERIALIZED VIEW; Schema: public; Owner: postgres
--

CREATE MATERIALIZED VIEW public.edi_dashboard_stats AS
 SELECT count(*) AS total_transmissions,
    count(*) FILTER (WHERE (status = 'success'::text)) AS successful_transmissions,
    count(*) FILTER (WHERE (status = 'failed'::text)) AS failed_transmissions,
    count(*) FILTER (WHERE (status = ANY (ARRAY['pending'::text, 'retrying'::text]))) AS pending_transmissions,
    round(
        CASE
            WHEN (count(*) > 0) THEN (((count(*) FILTER (WHERE (status = 'success'::text)))::numeric / (count(*))::numeric) * (100)::numeric)
            ELSE (0)::numeric
        END, 2) AS success_rate,
    count(*) FILTER (WHERE (operation = 'GATE_IN'::text)) AS gate_in_transmissions,
    count(*) FILTER (WHERE (operation = 'GATE_OUT'::text)) AS gate_out_transmissions,
    count(*) FILTER (WHERE (created_at >= CURRENT_DATE)) AS today_transmissions,
    count(*) FILTER (WHERE (created_at >= (CURRENT_DATE - '7 days'::interval))) AS week_transmissions,
    count(*) FILTER (WHERE (created_at >= (CURRENT_DATE - '30 days'::interval))) AS month_transmissions,
    count(DISTINCT config_id) AS active_servers,
    count(DISTINCT client_id) AS clients_with_transmissions,
    avg(attempts) AS avg_attempts,
    max(created_at) AS last_transmission_date,
    now() AS last_updated
   FROM public.edi_transmission_logs
  WHERE (created_at >= (CURRENT_DATE - '90 days'::interval))
  WITH NO DATA;


ALTER MATERIALIZED VIEW public.edi_dashboard_stats OWNER TO postgres;

--
-- TOC entry 401 (class 1259 OID 21535)
-- Name: edi_server_utilization; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.edi_server_utilization AS
 SELECT esc.id AS server_id,
    esc.name AS server_name,
    esc.type AS server_type,
    esc.host,
    esc.enabled,
    esc.is_default,
    jsonb_array_length(COALESCE(esc.assigned_clients, '[]'::jsonb)) AS assigned_clients_count,
    COALESCE(configured_clients.count, (0)::bigint) AS configured_clients_count,
    COALESCE(transmission_stats.total_transmissions, (0)::bigint) AS total_transmissions_30d,
    COALESCE(transmission_stats.successful_transmissions, (0)::bigint) AS successful_transmissions_30d,
    COALESCE(transmission_stats.failed_transmissions, (0)::bigint) AS failed_transmissions_30d,
    COALESCE(transmission_stats.success_rate, (0)::numeric) AS success_rate_30d,
    transmission_stats.last_transmission_date,
    COALESCE(transmission_stats.gate_in_transmissions, (0)::bigint) AS gate_in_transmissions_30d,
    COALESCE(transmission_stats.gate_out_transmissions, (0)::bigint) AS gate_out_transmissions_30d
   FROM ((public.edi_server_configurations esc
     LEFT JOIN ( SELECT edi_client_settings.server_config_id,
            count(*) AS count
           FROM public.edi_client_settings
          WHERE (edi_client_settings.edi_enabled = true)
          GROUP BY edi_client_settings.server_config_id) configured_clients ON ((esc.id = configured_clients.server_config_id)))
     LEFT JOIN ( SELECT edi_transmission_logs.config_id,
            count(*) AS total_transmissions,
            count(*) FILTER (WHERE (edi_transmission_logs.status = 'success'::text)) AS successful_transmissions,
            count(*) FILTER (WHERE (edi_transmission_logs.status = 'failed'::text)) AS failed_transmissions,
                CASE
                    WHEN (count(*) > 0) THEN round((((count(*) FILTER (WHERE (edi_transmission_logs.status = 'success'::text)))::numeric / (count(*))::numeric) * (100)::numeric), 2)
                    ELSE (0)::numeric
                END AS success_rate,
            max(edi_transmission_logs.created_at) AS last_transmission_date,
            count(*) FILTER (WHERE (edi_transmission_logs.operation = 'GATE_IN'::text)) AS gate_in_transmissions,
            count(*) FILTER (WHERE (edi_transmission_logs.operation = 'GATE_OUT'::text)) AS gate_out_transmissions
           FROM public.edi_transmission_logs
          WHERE (edi_transmission_logs.created_at >= (CURRENT_DATE - '30 days'::interval))
          GROUP BY edi_transmission_logs.config_id) transmission_stats ON ((esc.id = transmission_stats.config_id)))
  ORDER BY esc.name;


ALTER VIEW public.edi_server_utilization OWNER TO postgres;

--
-- TOC entry 402 (class 1259 OID 21540)
-- Name: edi_statistics; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.edi_statistics AS
 SELECT count(*) AS total_transmissions,
    count(*) FILTER (WHERE (status = 'success'::text)) AS successful_transmissions,
    count(*) FILTER (WHERE (status = 'failed'::text)) AS failed_transmissions,
    count(*) FILTER (WHERE (status = ANY (ARRAY['pending'::text, 'retrying'::text]))) AS pending_transmissions,
        CASE
            WHEN (count(*) > 0) THEN round((((count(*) FILTER (WHERE (status = 'success'::text)))::numeric / (count(*))::numeric) * (100)::numeric), 2)
            ELSE (0)::numeric
        END AS success_rate,
    max(created_at) AS last_transmission_date,
    count(DISTINCT client_id) AS clients_with_transmissions,
    count(DISTINCT config_id) AS servers_used
   FROM public.edi_transmission_logs
  WHERE (created_at >= (CURRENT_DATE - '30 days'::interval));


ALTER VIEW public.edi_statistics OWNER TO postgres;

--
-- TOC entry 403 (class 1259 OID 21545)
-- Name: edi_transmission_summary; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.edi_transmission_summary AS
 SELECT date_trunc('day'::text, etl.created_at) AS transmission_date,
    c.code AS client_code,
    c.name AS client_name,
    etl.operation,
    etl.status,
    esc.name AS server_name,
    count(*) AS transmission_count,
    avg(etl.attempts) AS avg_attempts,
    min(etl.created_at) AS first_transmission,
    max(etl.last_attempt) AS last_transmission,
    count(*) FILTER (WHERE (etl.uploaded_to_sftp = true)) AS uploaded_count,
    count(*) FILTER (WHERE (etl.acknowledgment_received IS NOT NULL)) AS acknowledged_count
   FROM ((public.edi_transmission_logs etl
     LEFT JOIN public.clients c ON ((etl.client_id = c.id)))
     LEFT JOIN public.edi_server_configurations esc ON ((etl.config_id = esc.id)))
  WHERE (etl.created_at >= (CURRENT_DATE - '30 days'::interval))
  GROUP BY (date_trunc('day'::text, etl.created_at)), c.code, c.name, etl.operation, etl.status, esc.name
  ORDER BY (date_trunc('day'::text, etl.created_at)) DESC, c.code, etl.operation;


ALTER VIEW public.edi_transmission_summary OWNER TO postgres;

--
-- TOC entry 404 (class 1259 OID 21555)
-- Name: gate_operations_with_edi; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.gate_operations_with_edi AS
 SELECT 'GATE_IN'::text AS operation_type,
    gate_in_operations.id,
    gate_in_operations.container_number,
    gate_in_operations.client_code,
    gate_in_operations.client_name,
    gate_in_operations.status,
    gate_in_operations.assigned_location,
    gate_in_operations.completed_at,
    gate_in_operations.edi_transmitted,
    gate_in_operations.edi_transmission_date,
    gate_in_operations.edi_log_id,
    gate_in_operations.edi_error_message,
    gate_in_operations.created_at,
    gate_in_operations.updated_at
   FROM public.gate_in_operations
UNION ALL
 SELECT 'GATE_OUT'::text AS operation_type,
    gate_out_operations.id,
    gate_out_operations.booking_number AS container_number,
    gate_out_operations.client_code,
    gate_out_operations.client_name,
    gate_out_operations.status,
    NULL::text AS assigned_location,
    gate_out_operations.completed_at,
    gate_out_operations.edi_transmitted,
    gate_out_operations.edi_transmission_date,
    gate_out_operations.edi_log_id,
    gate_out_operations.edi_error_message,
    gate_out_operations.created_at,
    gate_out_operations.updated_at
   FROM public.gate_out_operations
  WHERE (EXISTS ( SELECT 1
           FROM information_schema.tables
          WHERE (((tables.table_name)::name = 'gate_out_operations'::name) AND (EXISTS ( SELECT 1
                   FROM information_schema.columns
                  WHERE (((columns.table_name)::name = 'gate_out_operations'::name) AND ((columns.column_name)::name = 'edi_transmitted'::name)))))));


ALTER VIEW public.gate_operations_with_edi OWNER TO postgres;

--
-- TOC entry 405 (class 1259 OID 21560)
-- Name: location_audit_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.location_audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    location_id uuid,
    operation character varying(20) NOT NULL,
    old_values jsonb,
    new_values jsonb,
    user_id uuid,
    user_email text,
    "timestamp" timestamp with time zone DEFAULT now(),
    ip_address text,
    user_agent text,
    CONSTRAINT location_audit_log_operation_check CHECK (((operation)::text = ANY (ARRAY[('CREATE'::character varying)::text, ('UPDATE'::character varying)::text, ('DELETE'::character varying)::text, ('ASSIGN'::character varying)::text, ('RELEASE'::character varying)::text])))
)
WITH (autovacuum_vacuum_scale_factor='0.1', autovacuum_analyze_scale_factor='0.05');


ALTER TABLE public.location_audit_log OWNER TO postgres;

--
-- TOC entry 5443 (class 0 OID 0)
-- Dependencies: 405
-- Name: TABLE location_audit_log; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.location_audit_log IS 'Comprehensive audit trail for all location management operations';


--
-- TOC entry 406 (class 1259 OID 21568)
-- Name: location_id_mappings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.location_id_mappings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    legacy_string_id character varying(50) NOT NULL,
    new_location_id uuid NOT NULL,
    migration_batch_id uuid NOT NULL,
    migrated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.location_id_mappings OWNER TO postgres;

--
-- TOC entry 5445 (class 0 OID 0)
-- Dependencies: 406
-- Name: TABLE location_id_mappings; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.location_id_mappings IS 'Migration mapping table from legacy string-based IDs to new UUID-based records';


--
-- TOC entry 407 (class 1259 OID 21573)
-- Name: locations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.locations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    location_id character varying(8) NOT NULL,
    stack_id uuid NOT NULL,
    yard_id text NOT NULL,
    row_number integer NOT NULL,
    tier_number integer NOT NULL,
    is_virtual boolean DEFAULT false,
    virtual_stack_pair_id uuid,
    is_occupied boolean DEFAULT false,
    container_id uuid,
    container_size public.container_size_enum,
    client_pool_id uuid,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    available boolean DEFAULT true,
    container_number text,
    CONSTRAINT locations_row_number_check CHECK ((row_number > 0)),
    CONSTRAINT locations_tier_number_check CHECK ((tier_number > 0)),
    CONSTRAINT occupied_requires_container CHECK ((((is_occupied = false) AND (container_id IS NULL)) OR ((is_occupied = true) AND (container_id IS NOT NULL)))),
    CONSTRAINT valid_location_id CHECK (((location_id)::text ~ '^S\d{2}R\d{1}H\d{1}$'::text)),
    CONSTRAINT virtual_location_requires_pair CHECK ((((is_virtual = false) AND (virtual_stack_pair_id IS NULL)) OR ((is_virtual = true) AND (virtual_stack_pair_id IS NOT NULL))))
)
WITH (autovacuum_vacuum_scale_factor='0.05', autovacuum_analyze_scale_factor='0.02', autovacuum_vacuum_cost_delay='10');


ALTER TABLE public.locations OWNER TO postgres;

--
-- TOC entry 5447 (class 0 OID 0)
-- Dependencies: 407
-- Name: TABLE locations; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.locations IS 'Core location management table with UUID-based records and SXXRXHX format location IDs';


--
-- TOC entry 5448 (class 0 OID 0)
-- Dependencies: 407
-- Name: COLUMN locations.location_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.locations.location_id IS 'Location identifier in SXXRXHX format (e.g., S01R2H3)';


--
-- TOC entry 5449 (class 0 OID 0)
-- Dependencies: 407
-- Name: COLUMN locations.is_virtual; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.locations.is_virtual IS 'True if this location represents a virtual 40ft container position';


--
-- TOC entry 5450 (class 0 OID 0)
-- Dependencies: 407
-- Name: COLUMN locations.is_occupied; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.locations.is_occupied IS 'Real-time occupancy status for availability tracking';


--
-- TOC entry 5451 (class 0 OID 0)
-- Dependencies: 407
-- Name: COLUMN locations.container_size; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.locations.container_size IS 'Container size constraint for this location';


--
-- TOC entry 5452 (class 0 OID 0)
-- Dependencies: 407
-- Name: COLUMN locations.client_pool_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.locations.client_pool_id IS 'Client pool assignment for access control';


--
-- TOC entry 5453 (class 0 OID 0)
-- Dependencies: 407
-- Name: COLUMN locations.available; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.locations.available IS 'True if location is free and can accept a container';


--
-- TOC entry 5454 (class 0 OID 0)
-- Dependencies: 407
-- Name: COLUMN locations.container_number; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.locations.container_number IS 'Container number currently occupying this location (for quick reference)';


--
-- TOC entry 408 (class 1259 OID 21590)
-- Name: location_statistics_by_stack; Type: MATERIALIZED VIEW; Schema: public; Owner: postgres
--

CREATE MATERIALIZED VIEW public.location_statistics_by_stack AS
 SELECT stack_id,
    yard_id,
    count(*) AS total_positions,
    count(*) FILTER (WHERE (is_occupied = true)) AS occupied_positions,
    count(*) FILTER (WHERE (is_occupied = false)) AS available_positions,
    round((avg(
        CASE
            WHEN is_occupied THEN 1
            ELSE 0
        END) * (100)::numeric), 2) AS occupancy_percentage,
    max(row_number) AS max_rows,
    max(tier_number) AS max_tiers,
    client_pool_id,
    max(updated_at) AS last_updated
   FROM public.locations
  WHERE ((is_active = true) AND (is_virtual = false))
  GROUP BY stack_id, yard_id, client_pool_id
  WITH NO DATA;


ALTER MATERIALIZED VIEW public.location_statistics_by_stack OWNER TO postgres;

--
-- TOC entry 5456 (class 0 OID 0)
-- Dependencies: 408
-- Name: MATERIALIZED VIEW location_statistics_by_stack; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON MATERIALIZED VIEW public.location_statistics_by_stack IS 'Pre-aggregated statistics for stack-level occupancy and capacity';


--
-- TOC entry 409 (class 1259 OID 21597)
-- Name: location_statistics_by_yard; Type: MATERIALIZED VIEW; Schema: public; Owner: postgres
--

CREATE MATERIALIZED VIEW public.location_statistics_by_yard AS
 SELECT yard_id,
    count(*) AS total_locations,
    count(*) FILTER (WHERE (is_occupied = true)) AS occupied_locations,
    count(*) FILTER (WHERE (is_occupied = false)) AS available_locations,
    count(*) FILTER (WHERE (is_virtual = true)) AS virtual_locations,
    count(*) FILTER (WHERE (is_virtual = false)) AS physical_locations,
    count(DISTINCT stack_id) AS total_stacks,
    count(DISTINCT client_pool_id) FILTER (WHERE (client_pool_id IS NOT NULL)) AS assigned_pools,
    round((avg(
        CASE
            WHEN is_occupied THEN 1
            ELSE 0
        END) * (100)::numeric), 2) AS occupancy_percentage,
    max(updated_at) AS last_updated
   FROM public.locations
  WHERE (is_active = true)
  GROUP BY yard_id
  WITH NO DATA;


ALTER MATERIALIZED VIEW public.location_statistics_by_yard OWNER TO postgres;

--
-- TOC entry 5458 (class 0 OID 0)
-- Dependencies: 409
-- Name: MATERIALIZED VIEW location_statistics_by_yard; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON MATERIALIZED VIEW public.location_statistics_by_yard IS 'Pre-aggregated statistics for yard-level location metrics and occupancy';


--
-- TOC entry 410 (class 1259 OID 21606)
-- Name: module_access_sync_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.module_access_sync_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    sync_type text NOT NULL,
    source_table text NOT NULL,
    target_table text NOT NULL,
    old_permissions jsonb,
    new_permissions jsonb,
    sync_status text NOT NULL,
    error_message text,
    sync_duration_ms integer,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    CONSTRAINT check_source_table CHECK ((source_table = ANY (ARRAY['users'::text, 'user_module_access'::text]))),
    CONSTRAINT check_sync_duration CHECK (((sync_duration_ms IS NULL) OR (sync_duration_ms >= 0))),
    CONSTRAINT check_sync_status CHECK ((sync_status = ANY (ARRAY['success'::text, 'failed'::text, 'partial'::text, 'skipped'::text]))),
    CONSTRAINT check_sync_type CHECK ((sync_type = ANY (ARRAY['auto'::text, 'manual'::text, 'repair'::text, 'migration'::text, 'validation'::text]))),
    CONSTRAINT check_target_table CHECK ((target_table = ANY (ARRAY['users'::text, 'user_module_access'::text])))
);


ALTER TABLE public.module_access_sync_log OWNER TO postgres;

--
-- TOC entry 5460 (class 0 OID 0)
-- Dependencies: 410
-- Name: TABLE module_access_sync_log; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.module_access_sync_log IS 'Audit log for all module access synchronization operations';


--
-- TOC entry 5461 (class 0 OID 0)
-- Dependencies: 410
-- Name: COLUMN module_access_sync_log.sync_type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.module_access_sync_log.sync_type IS 'Type of sync: auto, manual, repair, migration, validation';


--
-- TOC entry 5462 (class 0 OID 0)
-- Dependencies: 410
-- Name: COLUMN module_access_sync_log.source_table; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.module_access_sync_log.source_table IS 'Source table for the sync operation';


--
-- TOC entry 5463 (class 0 OID 0)
-- Dependencies: 410
-- Name: COLUMN module_access_sync_log.target_table; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.module_access_sync_log.target_table IS 'Target table for the sync operation';


--
-- TOC entry 5464 (class 0 OID 0)
-- Dependencies: 410
-- Name: COLUMN module_access_sync_log.sync_status; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.module_access_sync_log.sync_status IS 'Result status: success, failed, partial, skipped';


--
-- TOC entry 5465 (class 0 OID 0)
-- Dependencies: 410
-- Name: COLUMN module_access_sync_log.sync_duration_ms; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.module_access_sync_log.sync_duration_ms IS 'Duration of sync operation in milliseconds';


--
-- TOC entry 411 (class 1259 OID 21618)
-- Name: sections; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sections (
    id text NOT NULL,
    yard_id text NOT NULL,
    name text NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.sections OWNER TO postgres;

--
-- TOC entry 412 (class 1259 OID 21632)
-- Name: stack_assignments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stack_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    yard_id text NOT NULL,
    stack_id text NOT NULL,
    stack_number integer NOT NULL,
    client_pool_id uuid NOT NULL,
    client_code text NOT NULL,
    is_exclusive boolean DEFAULT false,
    priority integer DEFAULT 1,
    notes text,
    assigned_at timestamp with time zone DEFAULT now(),
    assigned_by uuid NOT NULL
);


ALTER TABLE public.stack_assignments OWNER TO postgres;

--
-- TOC entry 413 (class 1259 OID 21641)
-- Name: stack_pairings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stack_pairings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    yard_id text NOT NULL,
    first_stack_number integer NOT NULL,
    second_stack_number integer NOT NULL,
    virtual_stack_number integer NOT NULL,
    first_stack_id uuid,
    second_stack_id uuid,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT valid_virtual_stack CHECK (((virtual_stack_number > first_stack_number) AND (virtual_stack_number < second_stack_number)))
);


ALTER TABLE public.stack_pairings OWNER TO postgres;

--
-- TOC entry 5469 (class 0 OID 0)
-- Dependencies: 413
-- Name: TABLE stack_pairings; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.stack_pairings IS 'Defines which physical stacks are paired to create virtual stacks for 40ft containers';


--
-- TOC entry 414 (class 1259 OID 21651)
-- Name: stack_status_summary; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.stack_status_summary AS
 SELECT s.id,
    s.yard_id,
    s.stack_number,
    s.section_name,
    s.is_active,
    s.capacity,
    s.current_occupancy,
    count(l.id) AS total_locations,
    count(l.id) FILTER (WHERE (l.is_active = true)) AS active_locations,
    count(l.id) FILTER (WHERE (l.is_occupied = true)) AS occupied_locations,
    s.created_at,
    s.updated_at
   FROM (public.stacks s
     LEFT JOIN public.locations l ON ((s.id = l.stack_id)))
  GROUP BY s.id, s.yard_id, s.stack_number, s.section_name, s.is_active, s.capacity, s.current_occupancy, s.created_at, s.updated_at
  ORDER BY s.yard_id, s.stack_number;


ALTER VIEW public.stack_status_summary OWNER TO postgres;

--
-- TOC entry 5471 (class 0 OID 0)
-- Dependencies: 414
-- Name: VIEW stack_status_summary; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON VIEW public.stack_status_summary IS 'Summary view showing stack status with location counts for monitoring';


--
-- TOC entry 415 (class 1259 OID 21656)
-- Name: user_module_access; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_module_access (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    module_permissions jsonb DEFAULT '{}'::jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    updated_by uuid,
    sync_version integer DEFAULT 1,
    last_sync_at timestamp with time zone DEFAULT now(),
    sync_source text DEFAULT 'user_module_access'::text,
    CONSTRAINT check_sync_source CHECK ((sync_source = ANY (ARRAY['users'::text, 'user_module_access'::text])))
);


ALTER TABLE public.user_module_access OWNER TO postgres;

--
-- TOC entry 5473 (class 0 OID 0)
-- Dependencies: 415
-- Name: COLUMN user_module_access.sync_version; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_module_access.sync_version IS 'Version number incremented on each sync operation';


--
-- TOC entry 5474 (class 0 OID 0)
-- Dependencies: 415
-- Name: COLUMN user_module_access.last_sync_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_module_access.last_sync_at IS 'Timestamp of the last synchronization operation';


--
-- TOC entry 5475 (class 0 OID 0)
-- Dependencies: 415
-- Name: COLUMN user_module_access.sync_source; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_module_access.sync_source IS 'Source system for the last sync: users or user_module_access';


--
-- TOC entry 416 (class 1259 OID 21668)
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    auth_user_id uuid,
    name text NOT NULL,
    email text NOT NULL,
    role text DEFAULT 'viewer'::text NOT NULL,
    yard_ids jsonb DEFAULT '[]'::jsonb,
    module_access jsonb DEFAULT '{}'::jsonb,
    active boolean DEFAULT true,
    last_login timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    is_deleted boolean,
    deleted_at timestamp with time zone,
    deleted_by text,
    created_by text,
    updated_by text,
    CONSTRAINT check_deleted_at_when_deleted CHECK ((((is_deleted = false) AND (deleted_at IS NULL) AND (deleted_by IS NULL)) OR ((is_deleted = true) AND (deleted_at IS NOT NULL) AND (deleted_by IS NOT NULL))))
);


ALTER TABLE public.users OWNER TO postgres;

--
-- TOC entry 5477 (class 0 OID 0)
-- Dependencies: 416
-- Name: COLUMN users.is_deleted; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.users.is_deleted IS 'Soft delete flag - true if user is deleted';


--
-- TOC entry 5478 (class 0 OID 0)
-- Dependencies: 416
-- Name: COLUMN users.deleted_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.users.deleted_at IS 'Timestamp when user was soft deleted';


--
-- TOC entry 5479 (class 0 OID 0)
-- Dependencies: 416
-- Name: COLUMN users.deleted_by; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.users.deleted_by IS 'User who soft deleted this user';


--
-- TOC entry 5480 (class 0 OID 0)
-- Dependencies: 416
-- Name: COLUMN users.created_by; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.users.created_by IS 'User who created this record';


--
-- TOC entry 5481 (class 0 OID 0)
-- Dependencies: 416
-- Name: COLUMN users.updated_by; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.users.updated_by IS 'User who last updated this record';


--
-- TOC entry 417 (class 1259 OID 21681)
-- Name: sync_health_summary; Type: MATERIALIZED VIEW; Schema: public; Owner: postgres
--

CREATE MATERIALIZED VIEW public.sync_health_summary AS
 SELECT count(*) AS total_users,
    count(uma.user_id) AS users_with_module_access,
    count(u.module_access) AS users_with_legacy_access,
    count(
        CASE
            WHEN ((u.module_access IS NOT NULL) AND (uma.user_id IS NOT NULL)) THEN 1
            ELSE NULL::integer
        END) AS users_with_both,
    count(
        CASE
            WHEN ((u.module_access IS NULL) AND (uma.user_id IS NULL)) THEN 1
            ELSE NULL::integer
        END) AS users_with_neither,
    avg(EXTRACT(epoch FROM (CURRENT_TIMESTAMP - uma.last_sync_at))) AS avg_seconds_since_sync,
    max(uma.sync_version) AS max_sync_version,
    count(
        CASE
            WHEN (uma.sync_version > 1) THEN 1
            ELSE NULL::integer
        END) AS users_with_multiple_syncs,
    CURRENT_TIMESTAMP AS last_updated
   FROM (public.users u
     FULL JOIN public.user_module_access uma ON ((u.id = uma.user_id)))
  WHERE (u.deleted_at IS NULL)
  WITH NO DATA;


ALTER MATERIALIZED VIEW public.sync_health_summary OWNER TO postgres;

--
-- TOC entry 418 (class 1259 OID 21688)
-- Name: sync_performance_metrics; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.sync_performance_metrics AS
 SELECT 'Total Users'::text AS metric,
    (sync_health_summary.total_users)::text AS value,
    'count'::text AS unit
   FROM public.sync_health_summary
UNION ALL
 SELECT 'Users with Module Access'::text AS metric,
    (sync_health_summary.users_with_module_access)::text AS value,
    'count'::text AS unit
   FROM public.sync_health_summary
UNION ALL
 SELECT 'Average Seconds Since Last Sync'::text AS metric,
    (round(sync_health_summary.avg_seconds_since_sync, 2))::text AS value,
    'seconds'::text AS unit
   FROM public.sync_health_summary
UNION ALL
 SELECT 'Users Requiring Multiple Syncs'::text AS metric,
    (sync_health_summary.users_with_multiple_syncs)::text AS value,
    'count'::text AS unit
   FROM public.sync_health_summary;


ALTER VIEW public.sync_performance_metrics OWNER TO postgres;

--
-- TOC entry 419 (class 1259 OID 21693)
-- Name: user_activities; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_activities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    action character varying(100) NOT NULL,
    entity_type character varying(50),
    entity_id uuid,
    description text,
    metadata jsonb DEFAULT '{}'::jsonb,
    ip_address character varying(45),
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.user_activities OWNER TO postgres;

--
-- TOC entry 5485 (class 0 OID 0)
-- Dependencies: 419
-- Name: TABLE user_activities; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.user_activities IS 'Tracks user activities for audit and monitoring';


--
-- TOC entry 5486 (class 0 OID 0)
-- Dependencies: 419
-- Name: COLUMN user_activities.user_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_activities.user_id IS 'User who performed the action';


--
-- TOC entry 5487 (class 0 OID 0)
-- Dependencies: 419
-- Name: COLUMN user_activities.action; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_activities.action IS 'Type of action performed (e.g., login, create, update, delete)';


--
-- TOC entry 5488 (class 0 OID 0)
-- Dependencies: 419
-- Name: COLUMN user_activities.entity_type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_activities.entity_type IS 'Type of entity affected (e.g., container, user, client)';


--
-- TOC entry 5489 (class 0 OID 0)
-- Dependencies: 419
-- Name: COLUMN user_activities.entity_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_activities.entity_id IS 'ID of the affected entity';


--
-- TOC entry 5490 (class 0 OID 0)
-- Dependencies: 419
-- Name: COLUMN user_activities.description; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_activities.description IS 'Human-readable description of the activity';


--
-- TOC entry 5491 (class 0 OID 0)
-- Dependencies: 419
-- Name: COLUMN user_activities.metadata; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_activities.metadata IS 'Additional context and data about the activity';


--
-- TOC entry 420 (class 1259 OID 21701)
-- Name: user_login_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_login_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    login_time timestamp with time zone DEFAULT now() NOT NULL,
    logout_time timestamp with time zone,
    session_duration_minutes integer,
    ip_address character varying(45),
    user_agent text,
    login_method character varying(50) DEFAULT 'email'::character varying,
    is_successful boolean DEFAULT true,
    failure_reason text,
    location_info jsonb DEFAULT '{}'::jsonb,
    device_info jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.user_login_history OWNER TO postgres;

--
-- TOC entry 5493 (class 0 OID 0)
-- Dependencies: 420
-- Name: TABLE user_login_history; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.user_login_history IS 'Tracks user login sessions for security and monitoring';


--
-- TOC entry 5494 (class 0 OID 0)
-- Dependencies: 420
-- Name: COLUMN user_login_history.user_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_login_history.user_id IS 'User who logged in';


--
-- TOC entry 5495 (class 0 OID 0)
-- Dependencies: 420
-- Name: COLUMN user_login_history.login_time; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_login_history.login_time IS 'When the user logged in';


--
-- TOC entry 5496 (class 0 OID 0)
-- Dependencies: 420
-- Name: COLUMN user_login_history.logout_time; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_login_history.logout_time IS 'When the user logged out (NULL if still active)';


--
-- TOC entry 5497 (class 0 OID 0)
-- Dependencies: 420
-- Name: COLUMN user_login_history.session_duration_minutes; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_login_history.session_duration_minutes IS 'Duration of the session in minutes';


--
-- TOC entry 5498 (class 0 OID 0)
-- Dependencies: 420
-- Name: COLUMN user_login_history.is_successful; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_login_history.is_successful IS 'Whether the login attempt was successful';


--
-- TOC entry 5499 (class 0 OID 0)
-- Dependencies: 420
-- Name: COLUMN user_login_history.failure_reason; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_login_history.failure_reason IS 'Reason for login failure if applicable';


--
-- TOC entry 421 (class 1259 OID 21714)
-- Name: v_40ft_container_validation; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.v_40ft_container_validation WITH (security_invoker='on') AS
 SELECT id,
    number AS container_number,
    size,
    location,
    ("substring"(location, 'S0*(\d+)'::text))::integer AS stack_number,
        CASE
            WHEN (("substring"(location, 'S0*(\d+)'::text))::integer = ANY (ARRAY[4, 8, 12, 16, 20, 24, 28, 34, 38, 42, 46, 50, 54, 62, 66, 70, 74, 78, 82, 86, 90, 94, 98])) THEN 'VALID - Virtual Stack'::text
            WHEN ((("substring"(location, 'S0*(\d+)'::text))::integer % 2) = 1) THEN 'INVALID - Odd Physical Stack'::text
            ELSE 'INVALID - Not a recognized virtual stack'::text
        END AS validation_status,
    client_code,
    status,
    created_at,
    updated_at
   FROM public.containers c
  WHERE (((size = '40ft'::text) OR (size = '40feet'::text)) AND (location IS NOT NULL))
  ORDER BY
        CASE
            WHEN (("substring"(location, 'S0*(\d+)'::text))::integer = ANY (ARRAY[4, 8, 12, 16, 20, 24, 28, 34, 38, 42, 46, 50, 54, 62, 66, 70, 74, 78, 82, 86, 90, 94, 98])) THEN 'VALID - Virtual Stack'::text
            WHEN ((("substring"(location, 'S0*(\d+)'::text))::integer % 2) = 1) THEN 'INVALID - Odd Physical Stack'::text
            ELSE 'INVALID - Not a recognized virtual stack'::text
        END DESC, created_at DESC;


ALTER VIEW public.v_40ft_container_validation OWNER TO postgres;

--
-- TOC entry 5501 (class 0 OID 0)
-- Dependencies: 421
-- Name: VIEW v_40ft_container_validation; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON VIEW public.v_40ft_container_validation IS 'Monitoring view for 40ft container placements. Shows validation status for each 40ft container location.';


--
-- TOC entry 422 (class 1259 OID 21719)
-- Name: v_stacks_with_pairings; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.v_stacks_with_pairings WITH (security_invoker='on') AS
 SELECT id,
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
    is_special_stack,
    container_size,
    assigned_client_code,
    notes,
    created_at,
    updated_at,
        CASE
            WHEN is_virtual THEN ( SELECT json_build_object('first_stack', sp.first_stack_number, 'second_stack', sp.second_stack_number, 'pairing_id', sp.id) AS json_build_object
               FROM public.stack_pairings sp
              WHERE ((sp.yard_id = s.yard_id) AND (sp.virtual_stack_number = s.stack_number) AND (sp.is_active = true))
             LIMIT 1)
            WHEN ((NOT is_virtual) AND (container_size = '40ft'::text)) THEN ( SELECT json_build_object('virtual_stack', sp.virtual_stack_number, 'paired_with',
                    CASE
                        WHEN (sp.first_stack_number = s.stack_number) THEN sp.second_stack_number
                        ELSE sp.first_stack_number
                    END, 'pairing_id', sp.id) AS json_build_object
               FROM public.stack_pairings sp
              WHERE ((sp.yard_id = s.yard_id) AND ((sp.first_stack_number = s.stack_number) OR (sp.second_stack_number = s.stack_number)) AND (sp.is_active = true))
             LIMIT 1)
            ELSE NULL::json
        END AS pairing_info
   FROM public.stacks s;


ALTER VIEW public.v_stacks_with_pairings OWNER TO postgres;

--
-- TOC entry 5503 (class 0 OID 0)
-- Dependencies: 422
-- Name: VIEW v_stacks_with_pairings; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON VIEW public.v_stacks_with_pairings IS 'View combining stacks with their pairing information for easy querying';


--
-- TOC entry 423 (class 1259 OID 21724)
-- Name: virtual_stack_pairs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.virtual_stack_pairs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    yard_id text NOT NULL,
    stack1_id uuid NOT NULL,
    stack2_id uuid NOT NULL,
    virtual_stack_number integer NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT different_stacks CHECK ((stack1_id <> stack2_id))
);


ALTER TABLE public.virtual_stack_pairs OWNER TO postgres;

--
-- TOC entry 5505 (class 0 OID 0)
-- Dependencies: 423
-- Name: TABLE virtual_stack_pairs; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.virtual_stack_pairs IS 'Manages pairing relationships between physical stacks for 40ft containers';


--
-- TOC entry 424 (class 1259 OID 21734)
-- Name: yards; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.yards (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    location text NOT NULL,
    description text,
    layout text DEFAULT 'standard'::text,
    is_active boolean DEFAULT true,
    total_capacity integer DEFAULT 0,
    current_occupancy integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by text,
    timezone text DEFAULT 'Africa/Abidjan'::text,
    contact_info jsonb,
    address jsonb,
    updated_by uuid
);


ALTER TABLE public.yards OWNER TO postgres;

--
-- TOC entry 425 (class 1259 OID 21747)
-- Name: messages; Type: TABLE; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE TABLE realtime.messages (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
)
PARTITION BY RANGE (inserted_at);


ALTER TABLE realtime.messages OWNER TO supabase_realtime_admin;

--
-- TOC entry 430 (class 1259 OID 40732)
-- Name: messages_2026_02_28; Type: TABLE; Schema: realtime; Owner: supabase_admin
--

CREATE TABLE realtime.messages_2026_02_28 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


ALTER TABLE realtime.messages_2026_02_28 OWNER TO supabase_admin;

--
-- TOC entry 431 (class 1259 OID 41852)
-- Name: messages_2026_03_01; Type: TABLE; Schema: realtime; Owner: supabase_admin
--

CREATE TABLE realtime.messages_2026_03_01 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


ALTER TABLE realtime.messages_2026_03_01 OWNER TO supabase_admin;

--
-- TOC entry 432 (class 1259 OID 42967)
-- Name: messages_2026_03_02; Type: TABLE; Schema: realtime; Owner: supabase_admin
--

CREATE TABLE realtime.messages_2026_03_02 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


ALTER TABLE realtime.messages_2026_03_02 OWNER TO supabase_admin;

--
-- TOC entry 433 (class 1259 OID 45187)
-- Name: messages_2026_03_03; Type: TABLE; Schema: realtime; Owner: supabase_admin
--

CREATE TABLE realtime.messages_2026_03_03 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


ALTER TABLE realtime.messages_2026_03_03 OWNER TO supabase_admin;

--
-- TOC entry 434 (class 1259 OID 45199)
-- Name: messages_2026_03_04; Type: TABLE; Schema: realtime; Owner: supabase_admin
--

CREATE TABLE realtime.messages_2026_03_04 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


ALTER TABLE realtime.messages_2026_03_04 OWNER TO supabase_admin;

--
-- TOC entry 435 (class 1259 OID 45211)
-- Name: messages_2026_03_05; Type: TABLE; Schema: realtime; Owner: supabase_admin
--

CREATE TABLE realtime.messages_2026_03_05 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


ALTER TABLE realtime.messages_2026_03_05 OWNER TO supabase_admin;

--
-- TOC entry 436 (class 1259 OID 46326)
-- Name: messages_2026_03_06; Type: TABLE; Schema: realtime; Owner: supabase_admin
--

CREATE TABLE realtime.messages_2026_03_06 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


ALTER TABLE realtime.messages_2026_03_06 OWNER TO supabase_admin;

--
-- TOC entry 437 (class 1259 OID 47512)
-- Name: messages_2026_03_07; Type: TABLE; Schema: realtime; Owner: supabase_admin
--

CREATE TABLE realtime.messages_2026_03_07 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


ALTER TABLE realtime.messages_2026_03_07 OWNER TO supabase_admin;

--
-- TOC entry 364 (class 1259 OID 17078)
-- Name: schema_migrations; Type: TABLE; Schema: realtime; Owner: supabase_admin
--

CREATE TABLE realtime.schema_migrations (
    version bigint NOT NULL,
    inserted_at timestamp(0) without time zone
);


ALTER TABLE realtime.schema_migrations OWNER TO supabase_admin;

--
-- TOC entry 367 (class 1259 OID 17101)
-- Name: subscription; Type: TABLE; Schema: realtime; Owner: supabase_admin
--

CREATE TABLE realtime.subscription (
    id bigint NOT NULL,
    subscription_id uuid NOT NULL,
    entity regclass NOT NULL,
    filters realtime.user_defined_filter[] DEFAULT '{}'::realtime.user_defined_filter[] NOT NULL,
    claims jsonb NOT NULL,
    claims_role regrole GENERATED ALWAYS AS (realtime.to_regrole((claims ->> 'role'::text))) STORED NOT NULL,
    created_at timestamp without time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    action_filter text DEFAULT '*'::text,
    CONSTRAINT subscription_action_filter_check CHECK ((action_filter = ANY (ARRAY['*'::text, 'INSERT'::text, 'UPDATE'::text, 'DELETE'::text])))
);


ALTER TABLE realtime.subscription OWNER TO supabase_admin;

--
-- TOC entry 366 (class 1259 OID 17100)
-- Name: subscription_id_seq; Type: SEQUENCE; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE realtime.subscription ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME realtime.subscription_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 3948 (class 0 OID 0)
-- Name: messages_2026_02_28; Type: TABLE ATTACH; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2026_02_28 FOR VALUES FROM ('2026-02-28 00:00:00') TO ('2026-03-01 00:00:00');


--
-- TOC entry 3949 (class 0 OID 0)
-- Name: messages_2026_03_01; Type: TABLE ATTACH; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2026_03_01 FOR VALUES FROM ('2026-03-01 00:00:00') TO ('2026-03-02 00:00:00');


--
-- TOC entry 3950 (class 0 OID 0)
-- Name: messages_2026_03_02; Type: TABLE ATTACH; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2026_03_02 FOR VALUES FROM ('2026-03-02 00:00:00') TO ('2026-03-03 00:00:00');


--
-- TOC entry 3951 (class 0 OID 0)
-- Name: messages_2026_03_03; Type: TABLE ATTACH; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2026_03_03 FOR VALUES FROM ('2026-03-03 00:00:00') TO ('2026-03-04 00:00:00');


--
-- TOC entry 3952 (class 0 OID 0)
-- Name: messages_2026_03_04; Type: TABLE ATTACH; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2026_03_04 FOR VALUES FROM ('2026-03-04 00:00:00') TO ('2026-03-05 00:00:00');


--
-- TOC entry 3953 (class 0 OID 0)
-- Name: messages_2026_03_05; Type: TABLE ATTACH; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2026_03_05 FOR VALUES FROM ('2026-03-05 00:00:00') TO ('2026-03-06 00:00:00');


--
-- TOC entry 3954 (class 0 OID 0)
-- Name: messages_2026_03_06; Type: TABLE ATTACH; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2026_03_06 FOR VALUES FROM ('2026-03-06 00:00:00') TO ('2026-03-07 00:00:00');


--
-- TOC entry 3955 (class 0 OID 0)
-- Name: messages_2026_03_07; Type: TABLE ATTACH; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2026_03_07 FOR VALUES FROM ('2026-03-07 00:00:00') TO ('2026-03-08 00:00:00');


--
-- TOC entry 3965 (class 2604 OID 16510)
-- Name: refresh_tokens id; Type: DEFAULT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.refresh_tokens ALTER COLUMN id SET DEFAULT nextval('auth.refresh_tokens_id_seq'::regclass);


--
-- TOC entry 4360 (class 2606 OID 16783)
-- Name: mfa_amr_claims amr_id_pk; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT amr_id_pk PRIMARY KEY (id);


--
-- TOC entry 4332 (class 2606 OID 16531)
-- Name: audit_log_entries audit_log_entries_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.audit_log_entries
    ADD CONSTRAINT audit_log_entries_pkey PRIMARY KEY (id);


--
-- TOC entry 4691 (class 2606 OID 39624)
-- Name: custom_oauth_providers custom_oauth_providers_identifier_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.custom_oauth_providers
    ADD CONSTRAINT custom_oauth_providers_identifier_key UNIQUE (identifier);


--
-- TOC entry 4693 (class 2606 OID 39622)
-- Name: custom_oauth_providers custom_oauth_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.custom_oauth_providers
    ADD CONSTRAINT custom_oauth_providers_pkey PRIMARY KEY (id);


--
-- TOC entry 4383 (class 2606 OID 16889)
-- Name: flow_state flow_state_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.flow_state
    ADD CONSTRAINT flow_state_pkey PRIMARY KEY (id);


--
-- TOC entry 4338 (class 2606 OID 16907)
-- Name: identities identities_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_pkey PRIMARY KEY (id);


--
-- TOC entry 4340 (class 2606 OID 16917)
-- Name: identities identities_provider_id_provider_unique; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_provider_id_provider_unique UNIQUE (provider_id, provider);


--
-- TOC entry 4330 (class 2606 OID 16524)
-- Name: instances instances_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.instances
    ADD CONSTRAINT instances_pkey PRIMARY KEY (id);


--
-- TOC entry 4362 (class 2606 OID 16776)
-- Name: mfa_amr_claims mfa_amr_claims_session_id_authentication_method_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT mfa_amr_claims_session_id_authentication_method_pkey UNIQUE (session_id, authentication_method);


--
-- TOC entry 4358 (class 2606 OID 16764)
-- Name: mfa_challenges mfa_challenges_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_challenges
    ADD CONSTRAINT mfa_challenges_pkey PRIMARY KEY (id);


--
-- TOC entry 4350 (class 2606 OID 16957)
-- Name: mfa_factors mfa_factors_last_challenged_at_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_last_challenged_at_key UNIQUE (last_challenged_at);


--
-- TOC entry 4352 (class 2606 OID 16751)
-- Name: mfa_factors mfa_factors_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_pkey PRIMARY KEY (id);


--
-- TOC entry 4396 (class 2606 OID 17016)
-- Name: oauth_authorizations oauth_authorizations_authorization_code_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_authorization_code_key UNIQUE (authorization_code);


--
-- TOC entry 4398 (class 2606 OID 17014)
-- Name: oauth_authorizations oauth_authorizations_authorization_id_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_authorization_id_key UNIQUE (authorization_id);


--
-- TOC entry 4400 (class 2606 OID 17012)
-- Name: oauth_authorizations oauth_authorizations_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_pkey PRIMARY KEY (id);


--
-- TOC entry 4410 (class 2606 OID 17074)
-- Name: oauth_client_states oauth_client_states_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_client_states
    ADD CONSTRAINT oauth_client_states_pkey PRIMARY KEY (id);


--
-- TOC entry 4393 (class 2606 OID 16976)
-- Name: oauth_clients oauth_clients_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_clients
    ADD CONSTRAINT oauth_clients_pkey PRIMARY KEY (id);


--
-- TOC entry 4404 (class 2606 OID 17038)
-- Name: oauth_consents oauth_consents_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_pkey PRIMARY KEY (id);


--
-- TOC entry 4406 (class 2606 OID 17040)
-- Name: oauth_consents oauth_consents_user_client_unique; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_user_client_unique UNIQUE (user_id, client_id);


--
-- TOC entry 4387 (class 2606 OID 16942)
-- Name: one_time_tokens one_time_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.one_time_tokens
    ADD CONSTRAINT one_time_tokens_pkey PRIMARY KEY (id);


--
-- TOC entry 4324 (class 2606 OID 16514)
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- TOC entry 4327 (class 2606 OID 16694)
-- Name: refresh_tokens refresh_tokens_token_unique; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_token_unique UNIQUE (token);


--
-- TOC entry 4372 (class 2606 OID 16823)
-- Name: saml_providers saml_providers_entity_id_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_entity_id_key UNIQUE (entity_id);


--
-- TOC entry 4374 (class 2606 OID 16821)
-- Name: saml_providers saml_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_pkey PRIMARY KEY (id);


--
-- TOC entry 4379 (class 2606 OID 16837)
-- Name: saml_relay_states saml_relay_states_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_pkey PRIMARY KEY (id);


--
-- TOC entry 4335 (class 2606 OID 16537)
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- TOC entry 4345 (class 2606 OID 16715)
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- TOC entry 4369 (class 2606 OID 16804)
-- Name: sso_domains sso_domains_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sso_domains
    ADD CONSTRAINT sso_domains_pkey PRIMARY KEY (id);


--
-- TOC entry 4364 (class 2606 OID 16795)
-- Name: sso_providers sso_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sso_providers
    ADD CONSTRAINT sso_providers_pkey PRIMARY KEY (id);


--
-- TOC entry 4317 (class 2606 OID 16877)
-- Name: users users_phone_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_phone_key UNIQUE (phone);


--
-- TOC entry 4319 (class 2606 OID 16501)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 4431 (class 2606 OID 21832)
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- TOC entry 4446 (class 2606 OID 21834)
-- Name: client_pools client_pools_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_pools
    ADD CONSTRAINT client_pools_pkey PRIMARY KEY (id);


--
-- TOC entry 4451 (class 2606 OID 21836)
-- Name: clients clients_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_code_key UNIQUE (code);


--
-- TOC entry 4453 (class 2606 OID 21838)
-- Name: clients clients_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (id);


--
-- TOC entry 4682 (class 2606 OID 38421)
-- Name: container_buffer_zones container_buffer_zones_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.container_buffer_zones
    ADD CONSTRAINT container_buffer_zones_pkey PRIMARY KEY (id);


--
-- TOC entry 4455 (class 2606 OID 21840)
-- Name: container_types container_types_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.container_types
    ADD CONSTRAINT container_types_pkey PRIMARY KEY (id);


--
-- TOC entry 4457 (class 2606 OID 21842)
-- Name: container_types container_types_type_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.container_types
    ADD CONSTRAINT container_types_type_code_key UNIQUE (type_code);


--
-- TOC entry 4461 (class 2606 OID 21844)
-- Name: containers containers_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.containers
    ADD CONSTRAINT containers_number_key UNIQUE (number);


--
-- TOC entry 4463 (class 2606 OID 21846)
-- Name: containers containers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.containers
    ADD CONSTRAINT containers_pkey PRIMARY KEY (id);


--
-- TOC entry 4526 (class 2606 OID 21848)
-- Name: edi_client_settings edi_client_settings_client_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.edi_client_settings
    ADD CONSTRAINT edi_client_settings_client_id_key UNIQUE (client_id);


--
-- TOC entry 4528 (class 2606 OID 21850)
-- Name: edi_client_settings edi_client_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.edi_client_settings
    ADD CONSTRAINT edi_client_settings_pkey PRIMARY KEY (id);


--
-- TOC entry 4535 (class 2606 OID 21852)
-- Name: edi_server_configurations edi_server_configurations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.edi_server_configurations
    ADD CONSTRAINT edi_server_configurations_pkey PRIMARY KEY (id);


--
-- TOC entry 4509 (class 2606 OID 21854)
-- Name: edi_transmission_logs edi_transmission_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.edi_transmission_logs
    ADD CONSTRAINT edi_transmission_logs_pkey PRIMARY KEY (id);


--
-- TOC entry 4480 (class 2606 OID 21856)
-- Name: gate_in_operations gate_in_operations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gate_in_operations
    ADD CONSTRAINT gate_in_operations_pkey PRIMARY KEY (id);


--
-- TOC entry 4541 (class 2606 OID 21858)
-- Name: gate_out_operations gate_out_operations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gate_out_operations
    ADD CONSTRAINT gate_out_operations_pkey PRIMARY KEY (id);


--
-- TOC entry 4561 (class 2606 OID 21860)
-- Name: location_audit_log location_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.location_audit_log
    ADD CONSTRAINT location_audit_log_pkey PRIMARY KEY (id);


--
-- TOC entry 4566 (class 2606 OID 21862)
-- Name: location_id_mappings location_id_mappings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.location_id_mappings
    ADD CONSTRAINT location_id_mappings_pkey PRIMARY KEY (id);


--
-- TOC entry 4585 (class 2606 OID 21864)
-- Name: locations locations_location_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.locations
    ADD CONSTRAINT locations_location_id_key UNIQUE (location_id);


--
-- TOC entry 4587 (class 2606 OID 21866)
-- Name: locations locations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.locations
    ADD CONSTRAINT locations_pkey PRIMARY KEY (id);


--
-- TOC entry 4601 (class 2606 OID 21868)
-- Name: module_access_sync_log module_access_sync_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.module_access_sync_log
    ADD CONSTRAINT module_access_sync_log_pkey PRIMARY KEY (id);


--
-- TOC entry 4442 (class 2606 OID 21870)
-- Name: booking_references release_orders_booking_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.booking_references
    ADD CONSTRAINT release_orders_booking_number_key UNIQUE (booking_number);


--
-- TOC entry 4444 (class 2606 OID 21872)
-- Name: booking_references release_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.booking_references
    ADD CONSTRAINT release_orders_pkey PRIMARY KEY (id);


--
-- TOC entry 4604 (class 2606 OID 21874)
-- Name: sections sections_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sections
    ADD CONSTRAINT sections_pkey PRIMARY KEY (id);


--
-- TOC entry 4609 (class 2606 OID 21876)
-- Name: stack_assignments stack_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stack_assignments
    ADD CONSTRAINT stack_assignments_pkey PRIMARY KEY (id);


--
-- TOC entry 4613 (class 2606 OID 21878)
-- Name: stack_pairings stack_pairings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stack_pairings
    ADD CONSTRAINT stack_pairings_pkey PRIMARY KEY (id);


--
-- TOC entry 4428 (class 2606 OID 21880)
-- Name: stacks stacks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stacks
    ADD CONSTRAINT stacks_pkey PRIMARY KEY (id);


--
-- TOC entry 4568 (class 2606 OID 21882)
-- Name: location_id_mappings unique_legacy_id; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.location_id_mappings
    ADD CONSTRAINT unique_legacy_id UNIQUE (legacy_string_id);


--
-- TOC entry 4615 (class 2606 OID 21884)
-- Name: stack_pairings unique_pairing_per_yard; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stack_pairings
    ADD CONSTRAINT unique_pairing_per_yard UNIQUE (yard_id, first_stack_number, second_stack_number);


--
-- TOC entry 4667 (class 2606 OID 21886)
-- Name: virtual_stack_pairs unique_stack_pair; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.virtual_stack_pairs
    ADD CONSTRAINT unique_stack_pair UNIQUE (yard_id, stack1_id, stack2_id);


--
-- TOC entry 4589 (class 2606 OID 21888)
-- Name: locations unique_stack_position; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.locations
    ADD CONSTRAINT unique_stack_position UNIQUE (stack_id, row_number, tier_number);


--
-- TOC entry 4669 (class 2606 OID 21890)
-- Name: virtual_stack_pairs unique_virtual_stack; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.virtual_stack_pairs
    ADD CONSTRAINT unique_virtual_stack UNIQUE (yard_id, virtual_stack_number);


--
-- TOC entry 4653 (class 2606 OID 21892)
-- Name: user_activities user_activities_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_activities
    ADD CONSTRAINT user_activities_pkey PRIMARY KEY (id);


--
-- TOC entry 4660 (class 2606 OID 21894)
-- Name: user_login_history user_login_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_login_history
    ADD CONSTRAINT user_login_history_pkey PRIMARY KEY (id);


--
-- TOC entry 4630 (class 2606 OID 21896)
-- Name: user_module_access user_module_access_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_module_access
    ADD CONSTRAINT user_module_access_pkey PRIMARY KEY (id);


--
-- TOC entry 4632 (class 2606 OID 21898)
-- Name: user_module_access user_module_access_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_module_access
    ADD CONSTRAINT user_module_access_user_id_key UNIQUE (user_id);


--
-- TOC entry 4643 (class 2606 OID 21900)
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- TOC entry 4645 (class 2606 OID 21902)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 4671 (class 2606 OID 21904)
-- Name: virtual_stack_pairs virtual_stack_pairs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.virtual_stack_pairs
    ADD CONSTRAINT virtual_stack_pairs_pkey PRIMARY KEY (id);


--
-- TOC entry 4675 (class 2606 OID 21906)
-- Name: yards yards_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.yards
    ADD CONSTRAINT yards_code_key UNIQUE (code);


--
-- TOC entry 4677 (class 2606 OID 21908)
-- Name: yards yards_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.yards
    ADD CONSTRAINT yards_pkey PRIMARY KEY (id);


--
-- TOC entry 4680 (class 2606 OID 21910)
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER TABLE ONLY realtime.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id, inserted_at);


--
-- TOC entry 4697 (class 2606 OID 40740)
-- Name: messages_2026_02_28 messages_2026_02_28_pkey; Type: CONSTRAINT; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.messages_2026_02_28
    ADD CONSTRAINT messages_2026_02_28_pkey PRIMARY KEY (id, inserted_at);


--
-- TOC entry 4700 (class 2606 OID 41860)
-- Name: messages_2026_03_01 messages_2026_03_01_pkey; Type: CONSTRAINT; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.messages_2026_03_01
    ADD CONSTRAINT messages_2026_03_01_pkey PRIMARY KEY (id, inserted_at);


--
-- TOC entry 4703 (class 2606 OID 42975)
-- Name: messages_2026_03_02 messages_2026_03_02_pkey; Type: CONSTRAINT; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.messages_2026_03_02
    ADD CONSTRAINT messages_2026_03_02_pkey PRIMARY KEY (id, inserted_at);


--
-- TOC entry 4706 (class 2606 OID 45195)
-- Name: messages_2026_03_03 messages_2026_03_03_pkey; Type: CONSTRAINT; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.messages_2026_03_03
    ADD CONSTRAINT messages_2026_03_03_pkey PRIMARY KEY (id, inserted_at);


--
-- TOC entry 4709 (class 2606 OID 45207)
-- Name: messages_2026_03_04 messages_2026_03_04_pkey; Type: CONSTRAINT; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.messages_2026_03_04
    ADD CONSTRAINT messages_2026_03_04_pkey PRIMARY KEY (id, inserted_at);


--
-- TOC entry 4712 (class 2606 OID 45219)
-- Name: messages_2026_03_05 messages_2026_03_05_pkey; Type: CONSTRAINT; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.messages_2026_03_05
    ADD CONSTRAINT messages_2026_03_05_pkey PRIMARY KEY (id, inserted_at);


--
-- TOC entry 4715 (class 2606 OID 46334)
-- Name: messages_2026_03_06 messages_2026_03_06_pkey; Type: CONSTRAINT; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.messages_2026_03_06
    ADD CONSTRAINT messages_2026_03_06_pkey PRIMARY KEY (id, inserted_at);


--
-- TOC entry 4718 (class 2606 OID 47520)
-- Name: messages_2026_03_07 messages_2026_03_07_pkey; Type: CONSTRAINT; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.messages_2026_03_07
    ADD CONSTRAINT messages_2026_03_07_pkey PRIMARY KEY (id, inserted_at);


--
-- TOC entry 4415 (class 2606 OID 17109)
-- Name: subscription pk_subscription; Type: CONSTRAINT; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.subscription
    ADD CONSTRAINT pk_subscription PRIMARY KEY (id);


--
-- TOC entry 4412 (class 2606 OID 17082)
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- TOC entry 4333 (class 1259 OID 16532)
-- Name: audit_logs_instance_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX audit_logs_instance_id_idx ON auth.audit_log_entries USING btree (instance_id);


--
-- TOC entry 4307 (class 1259 OID 16704)
-- Name: confirmation_token_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX confirmation_token_idx ON auth.users USING btree (confirmation_token) WHERE ((confirmation_token)::text !~ '^[0-9 ]*$'::text);


--
-- TOC entry 4687 (class 1259 OID 39628)
-- Name: custom_oauth_providers_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX custom_oauth_providers_created_at_idx ON auth.custom_oauth_providers USING btree (created_at);


--
-- TOC entry 4688 (class 1259 OID 39627)
-- Name: custom_oauth_providers_enabled_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX custom_oauth_providers_enabled_idx ON auth.custom_oauth_providers USING btree (enabled);


--
-- TOC entry 4689 (class 1259 OID 39625)
-- Name: custom_oauth_providers_identifier_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX custom_oauth_providers_identifier_idx ON auth.custom_oauth_providers USING btree (identifier);


--
-- TOC entry 4694 (class 1259 OID 39626)
-- Name: custom_oauth_providers_provider_type_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX custom_oauth_providers_provider_type_idx ON auth.custom_oauth_providers USING btree (provider_type);


--
-- TOC entry 4308 (class 1259 OID 16706)
-- Name: email_change_token_current_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX email_change_token_current_idx ON auth.users USING btree (email_change_token_current) WHERE ((email_change_token_current)::text !~ '^[0-9 ]*$'::text);


--
-- TOC entry 4309 (class 1259 OID 16707)
-- Name: email_change_token_new_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX email_change_token_new_idx ON auth.users USING btree (email_change_token_new) WHERE ((email_change_token_new)::text !~ '^[0-9 ]*$'::text);


--
-- TOC entry 4348 (class 1259 OID 16785)
-- Name: factor_id_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX factor_id_created_at_idx ON auth.mfa_factors USING btree (user_id, created_at);


--
-- TOC entry 4381 (class 1259 OID 16893)
-- Name: flow_state_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX flow_state_created_at_idx ON auth.flow_state USING btree (created_at DESC);


--
-- TOC entry 4336 (class 1259 OID 16873)
-- Name: identities_email_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX identities_email_idx ON auth.identities USING btree (email text_pattern_ops);


--
-- TOC entry 5520 (class 0 OID 0)
-- Dependencies: 4336
-- Name: INDEX identities_email_idx; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON INDEX auth.identities_email_idx IS 'Auth: Ensures indexed queries on the email column';


--
-- TOC entry 4341 (class 1259 OID 16701)
-- Name: identities_user_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX identities_user_id_idx ON auth.identities USING btree (user_id);


--
-- TOC entry 4384 (class 1259 OID 16890)
-- Name: idx_auth_code; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX idx_auth_code ON auth.flow_state USING btree (auth_code);


--
-- TOC entry 4408 (class 1259 OID 17075)
-- Name: idx_oauth_client_states_created_at; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX idx_oauth_client_states_created_at ON auth.oauth_client_states USING btree (created_at);


--
-- TOC entry 4385 (class 1259 OID 16891)
-- Name: idx_user_id_auth_method; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX idx_user_id_auth_method ON auth.flow_state USING btree (user_id, authentication_method);


--
-- TOC entry 4356 (class 1259 OID 16896)
-- Name: mfa_challenge_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX mfa_challenge_created_at_idx ON auth.mfa_challenges USING btree (created_at DESC);


--
-- TOC entry 4353 (class 1259 OID 16757)
-- Name: mfa_factors_user_friendly_name_unique; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX mfa_factors_user_friendly_name_unique ON auth.mfa_factors USING btree (friendly_name, user_id) WHERE (TRIM(BOTH FROM friendly_name) <> ''::text);


--
-- TOC entry 4354 (class 1259 OID 16902)
-- Name: mfa_factors_user_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX mfa_factors_user_id_idx ON auth.mfa_factors USING btree (user_id);


--
-- TOC entry 4394 (class 1259 OID 17027)
-- Name: oauth_auth_pending_exp_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX oauth_auth_pending_exp_idx ON auth.oauth_authorizations USING btree (expires_at) WHERE (status = 'pending'::auth.oauth_authorization_status);


--
-- TOC entry 4391 (class 1259 OID 16980)
-- Name: oauth_clients_deleted_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX oauth_clients_deleted_at_idx ON auth.oauth_clients USING btree (deleted_at);


--
-- TOC entry 4401 (class 1259 OID 17053)
-- Name: oauth_consents_active_client_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX oauth_consents_active_client_idx ON auth.oauth_consents USING btree (client_id) WHERE (revoked_at IS NULL);


--
-- TOC entry 4402 (class 1259 OID 17051)
-- Name: oauth_consents_active_user_client_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX oauth_consents_active_user_client_idx ON auth.oauth_consents USING btree (user_id, client_id) WHERE (revoked_at IS NULL);


--
-- TOC entry 4407 (class 1259 OID 17052)
-- Name: oauth_consents_user_order_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX oauth_consents_user_order_idx ON auth.oauth_consents USING btree (user_id, granted_at DESC);


--
-- TOC entry 4388 (class 1259 OID 16949)
-- Name: one_time_tokens_relates_to_hash_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX one_time_tokens_relates_to_hash_idx ON auth.one_time_tokens USING hash (relates_to);


--
-- TOC entry 4389 (class 1259 OID 16948)
-- Name: one_time_tokens_token_hash_hash_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX one_time_tokens_token_hash_hash_idx ON auth.one_time_tokens USING hash (token_hash);


--
-- TOC entry 4390 (class 1259 OID 16950)
-- Name: one_time_tokens_user_id_token_type_key; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX one_time_tokens_user_id_token_type_key ON auth.one_time_tokens USING btree (user_id, token_type);


--
-- TOC entry 4310 (class 1259 OID 16708)
-- Name: reauthentication_token_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX reauthentication_token_idx ON auth.users USING btree (reauthentication_token) WHERE ((reauthentication_token)::text !~ '^[0-9 ]*$'::text);


--
-- TOC entry 4311 (class 1259 OID 16705)
-- Name: recovery_token_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX recovery_token_idx ON auth.users USING btree (recovery_token) WHERE ((recovery_token)::text !~ '^[0-9 ]*$'::text);


--
-- TOC entry 4320 (class 1259 OID 16515)
-- Name: refresh_tokens_instance_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX refresh_tokens_instance_id_idx ON auth.refresh_tokens USING btree (instance_id);


--
-- TOC entry 4321 (class 1259 OID 16516)
-- Name: refresh_tokens_instance_id_user_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX refresh_tokens_instance_id_user_id_idx ON auth.refresh_tokens USING btree (instance_id, user_id);


--
-- TOC entry 4322 (class 1259 OID 16700)
-- Name: refresh_tokens_parent_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX refresh_tokens_parent_idx ON auth.refresh_tokens USING btree (parent);


--
-- TOC entry 4325 (class 1259 OID 16787)
-- Name: refresh_tokens_session_id_revoked_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX refresh_tokens_session_id_revoked_idx ON auth.refresh_tokens USING btree (session_id, revoked);


--
-- TOC entry 4328 (class 1259 OID 16892)
-- Name: refresh_tokens_updated_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX refresh_tokens_updated_at_idx ON auth.refresh_tokens USING btree (updated_at DESC);


--
-- TOC entry 4375 (class 1259 OID 16829)
-- Name: saml_providers_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX saml_providers_sso_provider_id_idx ON auth.saml_providers USING btree (sso_provider_id);


--
-- TOC entry 4376 (class 1259 OID 16894)
-- Name: saml_relay_states_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX saml_relay_states_created_at_idx ON auth.saml_relay_states USING btree (created_at DESC);


--
-- TOC entry 4377 (class 1259 OID 16844)
-- Name: saml_relay_states_for_email_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX saml_relay_states_for_email_idx ON auth.saml_relay_states USING btree (for_email);


--
-- TOC entry 4380 (class 1259 OID 16843)
-- Name: saml_relay_states_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX saml_relay_states_sso_provider_id_idx ON auth.saml_relay_states USING btree (sso_provider_id);


--
-- TOC entry 4342 (class 1259 OID 16895)
-- Name: sessions_not_after_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX sessions_not_after_idx ON auth.sessions USING btree (not_after DESC);


--
-- TOC entry 4343 (class 1259 OID 17065)
-- Name: sessions_oauth_client_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX sessions_oauth_client_id_idx ON auth.sessions USING btree (oauth_client_id);


--
-- TOC entry 4346 (class 1259 OID 16786)
-- Name: sessions_user_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX sessions_user_id_idx ON auth.sessions USING btree (user_id);


--
-- TOC entry 4367 (class 1259 OID 16811)
-- Name: sso_domains_domain_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX sso_domains_domain_idx ON auth.sso_domains USING btree (lower(domain));


--
-- TOC entry 4370 (class 1259 OID 16810)
-- Name: sso_domains_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX sso_domains_sso_provider_id_idx ON auth.sso_domains USING btree (sso_provider_id);


--
-- TOC entry 4365 (class 1259 OID 16796)
-- Name: sso_providers_resource_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX sso_providers_resource_id_idx ON auth.sso_providers USING btree (lower(resource_id));


--
-- TOC entry 4366 (class 1259 OID 16958)
-- Name: sso_providers_resource_id_pattern_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX sso_providers_resource_id_pattern_idx ON auth.sso_providers USING btree (resource_id text_pattern_ops);


--
-- TOC entry 4355 (class 1259 OID 16955)
-- Name: unique_phone_factor_per_user; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX unique_phone_factor_per_user ON auth.mfa_factors USING btree (user_id, phone);


--
-- TOC entry 4347 (class 1259 OID 16784)
-- Name: user_id_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX user_id_created_at_idx ON auth.sessions USING btree (user_id, created_at);


--
-- TOC entry 4312 (class 1259 OID 16864)
-- Name: users_email_partial_key; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX users_email_partial_key ON auth.users USING btree (email) WHERE (is_sso_user = false);


--
-- TOC entry 5521 (class 0 OID 0)
-- Dependencies: 4312
-- Name: INDEX users_email_partial_key; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON INDEX auth.users_email_partial_key IS 'Auth: A partial unique index that applies only when is_sso_user is false';


--
-- TOC entry 4313 (class 1259 OID 16702)
-- Name: users_instance_id_email_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX users_instance_id_email_idx ON auth.users USING btree (instance_id, lower((email)::text));


--
-- TOC entry 4314 (class 1259 OID 16505)
-- Name: users_instance_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX users_instance_id_idx ON auth.users USING btree (instance_id);


--
-- TOC entry 4315 (class 1259 OID 16919)
-- Name: users_is_anonymous_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX users_is_anonymous_idx ON auth.users USING btree (is_anonymous);


--
-- TOC entry 4553 (class 1259 OID 21927)
-- Name: idx_audit_location_time_range; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_location_time_range ON public.location_audit_log USING btree (location_id, "timestamp" DESC, operation);


--
-- TOC entry 4554 (class 1259 OID 21928)
-- Name: idx_audit_location_timestamp; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_location_timestamp ON public.location_audit_log USING btree (location_id, "timestamp" DESC);


--
-- TOC entry 4432 (class 1259 OID 21929)
-- Name: idx_audit_logs_entity; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_logs_entity ON public.audit_logs USING btree (entity_type, entity_id);


--
-- TOC entry 4433 (class 1259 OID 21930)
-- Name: idx_audit_logs_timestamp; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_logs_timestamp ON public.audit_logs USING btree ("timestamp");


--
-- TOC entry 4555 (class 1259 OID 21931)
-- Name: idx_audit_new_values_gin; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_new_values_gin ON public.location_audit_log USING gin (new_values);


--
-- TOC entry 4556 (class 1259 OID 21932)
-- Name: idx_audit_old_values_gin; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_old_values_gin ON public.location_audit_log USING gin (old_values);


--
-- TOC entry 4557 (class 1259 OID 21933)
-- Name: idx_audit_operation; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_operation ON public.location_audit_log USING btree (operation, "timestamp" DESC);


--
-- TOC entry 4558 (class 1259 OID 21934)
-- Name: idx_audit_operation_timestamp; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_operation_timestamp ON public.location_audit_log USING btree (operation, "timestamp" DESC);


--
-- TOC entry 4559 (class 1259 OID 21935)
-- Name: idx_audit_user_timestamp; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_user_timestamp ON public.location_audit_log USING btree (user_id, "timestamp" DESC) WHERE (user_id IS NOT NULL);


--
-- TOC entry 4434 (class 1259 OID 21936)
-- Name: idx_booking_references_container_quantities; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_booking_references_container_quantities ON public.booking_references USING gin (container_quantities);


--
-- TOC entry 4435 (class 1259 OID 21937)
-- Name: idx_booking_references_new_booking_ref; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_booking_references_new_booking_ref ON public.booking_references USING btree (new_booking_reference);


--
-- TOC entry 4436 (class 1259 OID 21938)
-- Name: idx_booking_references_transaction_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_booking_references_transaction_type ON public.booking_references USING btree (transaction_type);


--
-- TOC entry 4437 (class 1259 OID 21939)
-- Name: idx_booking_references_updated_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_booking_references_updated_at ON public.booking_references USING btree (updated_at);


--
-- TOC entry 4447 (class 1259 OID 21940)
-- Name: idx_client_pools_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_client_pools_active ON public.client_pools USING btree (is_active);


--
-- TOC entry 4448 (class 1259 OID 21941)
-- Name: idx_client_pools_client; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_client_pools_client ON public.client_pools USING btree (client_id);


--
-- TOC entry 4449 (class 1259 OID 21942)
-- Name: idx_client_pools_yard; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_client_pools_yard ON public.client_pools USING btree (yard_id);


--
-- TOC entry 4683 (class 1259 OID 38450)
-- Name: idx_container_buffer_zones_buffer_stack_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_container_buffer_zones_buffer_stack_id ON public.container_buffer_zones USING btree (buffer_stack_id);


--
-- TOC entry 4684 (class 1259 OID 38447)
-- Name: idx_container_buffer_zones_container_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_container_buffer_zones_container_id ON public.container_buffer_zones USING btree (container_id);


--
-- TOC entry 4685 (class 1259 OID 38449)
-- Name: idx_container_buffer_zones_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_container_buffer_zones_status ON public.container_buffer_zones USING btree (status);


--
-- TOC entry 4686 (class 1259 OID 38448)
-- Name: idx_container_buffer_zones_yard_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_container_buffer_zones_yard_id ON public.container_buffer_zones USING btree (yard_id);


--
-- TOC entry 4458 (class 1259 OID 21943)
-- Name: idx_container_types_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_container_types_active ON public.container_types USING btree (is_active);


--
-- TOC entry 4459 (class 1259 OID 21944)
-- Name: idx_container_types_high_cube; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_container_types_high_cube ON public.container_types USING btree (is_high_cube);


--
-- TOC entry 4464 (class 1259 OID 21945)
-- Name: idx_containers_audit_logs; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_containers_audit_logs ON public.containers USING gin (audit_logs);


--
-- TOC entry 4465 (class 1259 OID 21946)
-- Name: idx_containers_classification; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_containers_classification ON public.containers USING btree (classification);


--
-- TOC entry 4466 (class 1259 OID 21947)
-- Name: idx_containers_client_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_containers_client_code ON public.containers USING btree (client_code);


--
-- TOC entry 4467 (class 1259 OID 21948)
-- Name: idx_containers_client_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_containers_client_id ON public.containers USING btree (client_id);


--
-- TOC entry 4468 (class 1259 OID 21949)
-- Name: idx_containers_damage_assessment_stage; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_containers_damage_assessment_stage ON public.containers USING btree (damage_assessment_stage);


--
-- TOC entry 4469 (class 1259 OID 21950)
-- Name: idx_containers_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_containers_deleted_at ON public.containers USING btree (deleted_at) WHERE (deleted_at IS NOT NULL);


--
-- TOC entry 4470 (class 1259 OID 46399)
-- Name: idx_containers_edi_gate_out_transmitted; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_containers_edi_gate_out_transmitted ON public.containers USING btree (edi_gate_out_transmitted) WHERE (edi_gate_out_transmitted = false);


--
-- TOC entry 4471 (class 1259 OID 21951)
-- Name: idx_containers_full_empty; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_containers_full_empty ON public.containers USING btree (full_empty);


--
-- TOC entry 4472 (class 1259 OID 47536)
-- Name: idx_containers_gate_out_operation_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_containers_gate_out_operation_id ON public.containers USING btree (gate_out_operation_id) WHERE (gate_out_operation_id IS NOT NULL);


--
-- TOC entry 4473 (class 1259 OID 21952)
-- Name: idx_containers_is_deleted; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_containers_is_deleted ON public.containers USING btree (is_deleted) WHERE (is_deleted = false);


--
-- TOC entry 4474 (class 1259 OID 21953)
-- Name: idx_containers_location_pattern; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_containers_location_pattern ON public.containers USING btree (location) WHERE (location ~ '^S\d+-R\d+-H\d+$'::text);


--
-- TOC entry 4475 (class 1259 OID 21954)
-- Name: idx_containers_number; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_containers_number ON public.containers USING btree (number);


--
-- TOC entry 4476 (class 1259 OID 21955)
-- Name: idx_containers_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_containers_status ON public.containers USING btree (status);


--
-- TOC entry 4477 (class 1259 OID 26007)
-- Name: idx_containers_transaction_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_containers_transaction_type ON public.containers USING btree (transaction_type);


--
-- TOC entry 4478 (class 1259 OID 21956)
-- Name: idx_containers_yard_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_containers_yard_id ON public.containers USING btree (yard_id);


--
-- TOC entry 4524 (class 1259 OID 21957)
-- Name: idx_edi_client_performance_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_edi_client_performance_unique ON public.edi_client_performance USING btree (client_id, last_updated);


--
-- TOC entry 4529 (class 1259 OID 21958)
-- Name: idx_edi_client_settings_client_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_edi_client_settings_client_code ON public.edi_client_settings USING btree (client_code);


--
-- TOC entry 4530 (class 1259 OID 21959)
-- Name: idx_edi_client_settings_client_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_edi_client_settings_client_id ON public.edi_client_settings USING btree (client_id);


--
-- TOC entry 4531 (class 1259 OID 21960)
-- Name: idx_edi_client_settings_edi_enabled; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_edi_client_settings_edi_enabled ON public.edi_client_settings USING btree (edi_enabled);


--
-- TOC entry 4532 (class 1259 OID 21961)
-- Name: idx_edi_client_settings_priority; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_edi_client_settings_priority ON public.edi_client_settings USING btree (priority);


--
-- TOC entry 4533 (class 1259 OID 21962)
-- Name: idx_edi_client_settings_server_config_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_edi_client_settings_server_config_id ON public.edi_client_settings USING btree (server_config_id);


--
-- TOC entry 4552 (class 1259 OID 21963)
-- Name: idx_edi_dashboard_stats_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_edi_dashboard_stats_unique ON public.edi_dashboard_stats USING btree (last_updated);


--
-- TOC entry 4510 (class 1259 OID 21964)
-- Name: idx_edi_logs_client_status_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_edi_logs_client_status_date ON public.edi_transmission_logs USING btree (client_id, status, created_at DESC);


--
-- TOC entry 4511 (class 1259 OID 21965)
-- Name: idx_edi_logs_config_operation_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_edi_logs_config_operation_date ON public.edi_transmission_logs USING btree (config_id, operation, created_at DESC);


--
-- TOC entry 4536 (class 1259 OID 21966)
-- Name: idx_edi_server_configs_assigned_clients; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_edi_server_configs_assigned_clients ON public.edi_server_configurations USING gin (assigned_clients);


--
-- TOC entry 4537 (class 1259 OID 21967)
-- Name: idx_edi_server_configs_enabled; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_edi_server_configs_enabled ON public.edi_server_configurations USING btree (enabled);


--
-- TOC entry 4538 (class 1259 OID 21968)
-- Name: idx_edi_server_configs_is_default; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_edi_server_configs_is_default ON public.edi_server_configurations USING btree (is_default);


--
-- TOC entry 4539 (class 1259 OID 21969)
-- Name: idx_edi_server_configs_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_edi_server_configs_type ON public.edi_server_configurations USING btree (type);


--
-- TOC entry 4512 (class 1259 OID 21970)
-- Name: idx_edi_transmission_logs_client_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_edi_transmission_logs_client_id ON public.edi_transmission_logs USING btree (client_id);


--
-- TOC entry 4513 (class 1259 OID 21971)
-- Name: idx_edi_transmission_logs_client_operation; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_edi_transmission_logs_client_operation ON public.edi_transmission_logs USING btree (client_id, operation);


--
-- TOC entry 4514 (class 1259 OID 21972)
-- Name: idx_edi_transmission_logs_config_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_edi_transmission_logs_config_id ON public.edi_transmission_logs USING btree (config_id);


--
-- TOC entry 4515 (class 1259 OID 21973)
-- Name: idx_edi_transmission_logs_container_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_edi_transmission_logs_container_id ON public.edi_transmission_logs USING btree (container_id);


--
-- TOC entry 4516 (class 1259 OID 21974)
-- Name: idx_edi_transmission_logs_container_number; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_edi_transmission_logs_container_number ON public.edi_transmission_logs USING btree (container_number);


--
-- TOC entry 4517 (class 1259 OID 21975)
-- Name: idx_edi_transmission_logs_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_edi_transmission_logs_created_at ON public.edi_transmission_logs USING btree (created_at);


--
-- TOC entry 4518 (class 1259 OID 21976)
-- Name: idx_edi_transmission_logs_last_attempt; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_edi_transmission_logs_last_attempt ON public.edi_transmission_logs USING btree (last_attempt);


--
-- TOC entry 4519 (class 1259 OID 21977)
-- Name: idx_edi_transmission_logs_operation; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_edi_transmission_logs_operation ON public.edi_transmission_logs USING btree (operation);


--
-- TOC entry 4520 (class 1259 OID 21978)
-- Name: idx_edi_transmission_logs_partner_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_edi_transmission_logs_partner_code ON public.edi_transmission_logs USING btree (partner_code);


--
-- TOC entry 4521 (class 1259 OID 21979)
-- Name: idx_edi_transmission_logs_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_edi_transmission_logs_status ON public.edi_transmission_logs USING btree (status);


--
-- TOC entry 4522 (class 1259 OID 21980)
-- Name: idx_edi_transmission_logs_status_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_edi_transmission_logs_status_created_at ON public.edi_transmission_logs USING btree (status, created_at);


--
-- TOC entry 4523 (class 1259 OID 21981)
-- Name: idx_edi_transmission_logs_uploaded_sftp; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_edi_transmission_logs_uploaded_sftp ON public.edi_transmission_logs USING btree (uploaded_to_sftp);


--
-- TOC entry 4481 (class 1259 OID 21982)
-- Name: idx_gate_in_container_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_gate_in_container_id ON public.gate_in_operations USING btree (container_id);


--
-- TOC entry 4482 (class 1259 OID 21983)
-- Name: idx_gate_in_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_gate_in_created_at ON public.gate_in_operations USING btree (created_at);


--
-- TOC entry 4483 (class 1259 OID 21984)
-- Name: idx_gate_in_damage_assessment_duration; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_gate_in_damage_assessment_duration ON public.gate_in_operations USING btree (damage_assessment_started_at, damage_assessment_completed_at) WHERE ((damage_assessment_started_at IS NOT NULL) AND (damage_assessment_completed_at IS NOT NULL));


--
-- TOC entry 4484 (class 1259 OID 21985)
-- Name: idx_gate_in_edi_processing_duration; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_gate_in_edi_processing_duration ON public.gate_in_operations USING btree (edi_processing_started_at, edi_transmission_date) WHERE ((edi_processing_started_at IS NOT NULL) AND (edi_transmission_date IS NOT NULL));


--
-- TOC entry 4485 (class 1259 OID 21986)
-- Name: idx_gate_in_location_assignment_duration; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_gate_in_location_assignment_duration ON public.gate_in_operations USING btree (location_assignment_started_at, location_assignment_completed_at) WHERE ((location_assignment_started_at IS NOT NULL) AND (location_assignment_completed_at IS NOT NULL));


--
-- TOC entry 4486 (class 1259 OID 21987)
-- Name: idx_gate_in_operations_assigned_stack; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_gate_in_operations_assigned_stack ON public.gate_in_operations USING btree (assigned_stack);


--
-- TOC entry 4487 (class 1259 OID 21988)
-- Name: idx_gate_in_operations_booking_reference; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_gate_in_operations_booking_reference ON public.gate_in_operations USING btree (booking_reference);


--
-- TOC entry 4488 (class 1259 OID 21989)
-- Name: idx_gate_in_operations_classification; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_gate_in_operations_classification ON public.gate_in_operations USING btree (classification);


--
-- TOC entry 4489 (class 1259 OID 21990)
-- Name: idx_gate_in_operations_client_code_edi; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_gate_in_operations_client_code_edi ON public.gate_in_operations USING btree (client_code, edi_transmitted);


--
-- TOC entry 4490 (class 1259 OID 21991)
-- Name: idx_gate_in_operations_container_confirmed; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_gate_in_operations_container_confirmed ON public.gate_in_operations USING btree (container_number_confirmed);


--
-- TOC entry 4491 (class 1259 OID 21992)
-- Name: idx_gate_in_operations_container_quantity; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_gate_in_operations_container_quantity ON public.gate_in_operations USING btree (container_quantity);


--
-- TOC entry 4492 (class 1259 OID 21993)
-- Name: idx_gate_in_operations_damage_assessed_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_gate_in_operations_damage_assessed_at ON public.gate_in_operations USING btree (damage_assessed_at);


--
-- TOC entry 4493 (class 1259 OID 21994)
-- Name: idx_gate_in_operations_damage_assessment_stage; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_gate_in_operations_damage_assessment_stage ON public.gate_in_operations USING btree (damage_assessment_stage);


--
-- TOC entry 4494 (class 1259 OID 21995)
-- Name: idx_gate_in_operations_damage_reported; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_gate_in_operations_damage_reported ON public.gate_in_operations USING btree (damage_reported) WHERE (damage_reported = true);


--
-- TOC entry 4495 (class 1259 OID 21996)
-- Name: idx_gate_in_operations_damage_stage_timing; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_gate_in_operations_damage_stage_timing ON public.gate_in_operations USING btree (damage_assessment_stage, damage_assessed_at);


--
-- TOC entry 4496 (class 1259 OID 21997)
-- Name: idx_gate_in_operations_edi_log_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_gate_in_operations_edi_log_id ON public.gate_in_operations USING btree (edi_log_id);


--
-- TOC entry 4497 (class 1259 OID 21998)
-- Name: idx_gate_in_operations_edi_transmission_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_gate_in_operations_edi_transmission_date ON public.gate_in_operations USING btree (edi_transmission_date);


--
-- TOC entry 4498 (class 1259 OID 21999)
-- Name: idx_gate_in_operations_edi_transmitted; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_gate_in_operations_edi_transmitted ON public.gate_in_operations USING btree (edi_transmitted, created_at) WHERE (edi_transmitted = true);


--
-- TOC entry 4499 (class 1259 OID 22000)
-- Name: idx_gate_in_operations_equipment_reference; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_gate_in_operations_equipment_reference ON public.gate_in_operations USING btree (equipment_reference);


--
-- TOC entry 4500 (class 1259 OID 22001)
-- Name: idx_gate_in_operations_full_empty; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_gate_in_operations_full_empty ON public.gate_in_operations USING btree (full_empty);


--
-- TOC entry 4501 (class 1259 OID 22003)
-- Name: idx_gate_in_operations_is_buffer_assignment; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_gate_in_operations_is_buffer_assignment ON public.gate_in_operations USING btree (is_buffer_assignment) WHERE (is_buffer_assignment = true);


--
-- TOC entry 4502 (class 1259 OID 22004)
-- Name: idx_gate_in_operations_operation_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_gate_in_operations_operation_status ON public.gate_in_operations USING btree (operation_status);


--
-- TOC entry 4503 (class 1259 OID 22005)
-- Name: idx_gate_in_operations_second_container_number; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_gate_in_operations_second_container_number ON public.gate_in_operations USING btree (second_container_number);


--
-- TOC entry 4504 (class 1259 OID 22006)
-- Name: idx_gate_in_operations_transaction_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_gate_in_operations_transaction_type ON public.gate_in_operations USING btree (transaction_type);


--
-- TOC entry 4505 (class 1259 OID 22007)
-- Name: idx_gate_in_operations_truck_arrival_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_gate_in_operations_truck_arrival_date ON public.gate_in_operations USING btree (truck_arrival_date);


--
-- TOC entry 4506 (class 1259 OID 22008)
-- Name: idx_gate_in_total_duration; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_gate_in_total_duration ON public.gate_in_operations USING btree (created_at, completed_at) WHERE (completed_at IS NOT NULL);


--
-- TOC entry 4507 (class 1259 OID 22009)
-- Name: idx_gate_in_yard_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_gate_in_yard_id ON public.gate_in_operations USING btree (yard_id);


--
-- TOC entry 4542 (class 1259 OID 22010)
-- Name: idx_gate_out_container_selection_duration; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_gate_out_container_selection_duration ON public.gate_out_operations USING btree (container_selection_started_at, container_selection_completed_at) WHERE ((container_selection_started_at IS NOT NULL) AND (container_selection_completed_at IS NOT NULL));


--
-- TOC entry 4543 (class 1259 OID 22011)
-- Name: idx_gate_out_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_gate_out_created_at ON public.gate_out_operations USING btree (created_at);


--
-- TOC entry 4544 (class 1259 OID 22012)
-- Name: idx_gate_out_edi_processing_duration; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_gate_out_edi_processing_duration ON public.gate_out_operations USING btree (edi_processing_started_at, edi_transmission_date) WHERE ((edi_processing_started_at IS NOT NULL) AND (edi_transmission_date IS NOT NULL));


--
-- TOC entry 4545 (class 1259 OID 22013)
-- Name: idx_gate_out_operations_client_code_edi; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_gate_out_operations_client_code_edi ON public.gate_out_operations USING btree (client_code, edi_transmitted);


--
-- TOC entry 4546 (class 1259 OID 22014)
-- Name: idx_gate_out_operations_edi_log_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_gate_out_operations_edi_log_id ON public.gate_out_operations USING btree (edi_log_id);


--
-- TOC entry 4547 (class 1259 OID 22015)
-- Name: idx_gate_out_operations_edi_transmission_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_gate_out_operations_edi_transmission_date ON public.gate_out_operations USING btree (edi_transmission_date);


--
-- TOC entry 4548 (class 1259 OID 22016)
-- Name: idx_gate_out_operations_edi_transmitted; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_gate_out_operations_edi_transmitted ON public.gate_out_operations USING btree (edi_transmitted, created_at) WHERE (edi_transmitted = true);


--
-- TOC entry 4549 (class 1259 OID 22017)
-- Name: idx_gate_out_release_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_gate_out_release_id ON public.gate_out_operations USING btree (release_order_id);


--
-- TOC entry 4550 (class 1259 OID 22018)
-- Name: idx_gate_out_total_duration; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_gate_out_total_duration ON public.gate_out_operations USING btree (created_at, completed_at) WHERE (completed_at IS NOT NULL);


--
-- TOC entry 4551 (class 1259 OID 22019)
-- Name: idx_gate_out_yard_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_gate_out_yard_id ON public.gate_out_operations USING btree (yard_id);


--
-- TOC entry 4590 (class 1259 OID 22020)
-- Name: idx_location_stats_stack; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_location_stats_stack ON public.location_statistics_by_stack USING btree (stack_id);


--
-- TOC entry 4591 (class 1259 OID 22021)
-- Name: idx_location_stats_stack_yard; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_location_stats_stack_yard ON public.location_statistics_by_stack USING btree (yard_id, occupancy_percentage);


--
-- TOC entry 4592 (class 1259 OID 22022)
-- Name: idx_location_stats_yard; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_location_stats_yard ON public.location_statistics_by_yard USING btree (yard_id);


--
-- TOC entry 4569 (class 1259 OID 22023)
-- Name: idx_locations_availability; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_locations_availability ON public.locations USING btree (is_occupied, container_size, client_pool_id, yard_id) WHERE (is_active = true);


--
-- TOC entry 4570 (class 1259 OID 22024)
-- Name: idx_locations_availability_composite; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_locations_availability_composite ON public.locations USING btree (yard_id, is_occupied, container_size, is_active) WHERE ((is_active = true) AND (is_occupied = false));


--
-- TOC entry 5522 (class 0 OID 0)
-- Dependencies: 4570
-- Name: INDEX idx_locations_availability_composite; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON INDEX public.idx_locations_availability_composite IS 'Composite index optimized for location availability queries with multiple filters';


--
-- TOC entry 4571 (class 1259 OID 22025)
-- Name: idx_locations_available; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_locations_available ON public.locations USING btree (available) WHERE (available = true);


--
-- TOC entry 4572 (class 1259 OID 22026)
-- Name: idx_locations_client_pool; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_locations_client_pool ON public.locations USING btree (client_pool_id) WHERE (client_pool_id IS NOT NULL);


--
-- TOC entry 4573 (class 1259 OID 22027)
-- Name: idx_locations_container_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_locations_container_id ON public.locations USING btree (container_id) WHERE (container_id IS NOT NULL);


--
-- TOC entry 4574 (class 1259 OID 22028)
-- Name: idx_locations_container_number; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_locations_container_number ON public.locations USING btree (container_number) WHERE (container_number IS NOT NULL);


--
-- TOC entry 4575 (class 1259 OID 22029)
-- Name: idx_locations_location_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_locations_location_id ON public.locations USING btree (location_id);


--
-- TOC entry 4576 (class 1259 OID 22030)
-- Name: idx_locations_occupied_containers; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_locations_occupied_containers ON public.locations USING btree (container_id, yard_id) WHERE ((is_occupied = true) AND (container_id IS NOT NULL));


--
-- TOC entry 4577 (class 1259 OID 22031)
-- Name: idx_locations_pool_availability; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_locations_pool_availability ON public.locations USING btree (client_pool_id, is_occupied, container_size) WHERE (is_active = true);


--
-- TOC entry 5523 (class 0 OID 0)
-- Dependencies: 4577
-- Name: INDEX idx_locations_pool_availability; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON INDEX public.idx_locations_pool_availability IS 'Optimizes client pool-specific availability queries';


--
-- TOC entry 4578 (class 1259 OID 22032)
-- Name: idx_locations_stack_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_locations_stack_id ON public.locations USING btree (stack_id);


--
-- TOC entry 4579 (class 1259 OID 22033)
-- Name: idx_locations_stack_position; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_locations_stack_position ON public.locations USING btree (stack_id, row_number, tier_number) WHERE (is_active = true);


--
-- TOC entry 5524 (class 0 OID 0)
-- Dependencies: 4579
-- Name: INDEX idx_locations_stack_position; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON INDEX public.idx_locations_stack_position IS 'Optimizes stack-based location queries ordered by position';


--
-- TOC entry 4580 (class 1259 OID 22034)
-- Name: idx_locations_stack_row_tier; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_locations_stack_row_tier ON public.locations USING btree (stack_id, row_number, tier_number);


--
-- TOC entry 4581 (class 1259 OID 22035)
-- Name: idx_locations_virtual; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_locations_virtual ON public.locations USING btree (virtual_stack_pair_id) WHERE (is_virtual = true);


--
-- TOC entry 4582 (class 1259 OID 22036)
-- Name: idx_locations_virtual_pair; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_locations_virtual_pair ON public.locations USING btree (virtual_stack_pair_id, is_occupied) WHERE ((is_virtual = true) AND (is_active = true));


--
-- TOC entry 4583 (class 1259 OID 22037)
-- Name: idx_locations_yard_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_locations_yard_id ON public.locations USING btree (yard_id);


--
-- TOC entry 4654 (class 1259 OID 22038)
-- Name: idx_login_history_ip_address; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_login_history_ip_address ON public.user_login_history USING btree (ip_address);


--
-- TOC entry 4655 (class 1259 OID 22039)
-- Name: idx_login_history_login_time; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_login_history_login_time ON public.user_login_history USING btree (login_time DESC);


--
-- TOC entry 4656 (class 1259 OID 22040)
-- Name: idx_login_history_successful; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_login_history_successful ON public.user_login_history USING btree (is_successful);


--
-- TOC entry 4657 (class 1259 OID 22041)
-- Name: idx_login_history_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_login_history_user_id ON public.user_login_history USING btree (user_id);


--
-- TOC entry 4658 (class 1259 OID 22042)
-- Name: idx_login_history_user_login; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_login_history_user_login ON public.user_login_history USING btree (user_id, login_time DESC);


--
-- TOC entry 4562 (class 1259 OID 22043)
-- Name: idx_mappings_batch; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mappings_batch ON public.location_id_mappings USING btree (migration_batch_id);


--
-- TOC entry 4563 (class 1259 OID 22044)
-- Name: idx_mappings_legacy_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mappings_legacy_id ON public.location_id_mappings USING btree (legacy_string_id);


--
-- TOC entry 4564 (class 1259 OID 22045)
-- Name: idx_mappings_new_location; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mappings_new_location ON public.location_id_mappings USING btree (new_location_id);


--
-- TOC entry 4438 (class 1259 OID 22046)
-- Name: idx_release_orders_booking_number; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_release_orders_booking_number ON public.booking_references USING btree (booking_number);


--
-- TOC entry 4439 (class 1259 OID 22047)
-- Name: idx_release_orders_client_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_release_orders_client_id ON public.booking_references USING btree (client_id);


--
-- TOC entry 4440 (class 1259 OID 22048)
-- Name: idx_release_orders_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_release_orders_status ON public.booking_references USING btree (status);


--
-- TOC entry 4602 (class 1259 OID 22049)
-- Name: idx_sections_yard_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sections_yard_id ON public.sections USING btree (yard_id);


--
-- TOC entry 4605 (class 1259 OID 22050)
-- Name: idx_stack_assignments_client; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stack_assignments_client ON public.stack_assignments USING btree (client_code);


--
-- TOC entry 4606 (class 1259 OID 22051)
-- Name: idx_stack_assignments_pool; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stack_assignments_pool ON public.stack_assignments USING btree (client_pool_id);


--
-- TOC entry 4607 (class 1259 OID 22052)
-- Name: idx_stack_assignments_yard; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stack_assignments_yard ON public.stack_assignments USING btree (yard_id);


--
-- TOC entry 4610 (class 1259 OID 22053)
-- Name: idx_stack_pairings_stacks; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stack_pairings_stacks ON public.stack_pairings USING btree (first_stack_number, second_stack_number);


--
-- TOC entry 4611 (class 1259 OID 22054)
-- Name: idx_stack_pairings_yard; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stack_pairings_yard ON public.stack_pairings USING btree (yard_id);


--
-- TOC entry 4417 (class 1259 OID 22055)
-- Name: idx_stacks_assigned_client; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stacks_assigned_client ON public.stacks USING btree (assigned_client_code);


--
-- TOC entry 4418 (class 1259 OID 22056)
-- Name: idx_stacks_buffer_zone_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stacks_buffer_zone_type ON public.stacks USING btree (buffer_zone_type) WHERE (buffer_zone_type IS NOT NULL);


--
-- TOC entry 4419 (class 1259 OID 22057)
-- Name: idx_stacks_container_size; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stacks_container_size ON public.stacks USING btree (container_size);


--
-- TOC entry 4420 (class 1259 OID 22058)
-- Name: idx_stacks_is_buffer_zone; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stacks_is_buffer_zone ON public.stacks USING btree (is_buffer_zone) WHERE (is_buffer_zone = true);


--
-- TOC entry 4421 (class 1259 OID 22059)
-- Name: idx_stacks_is_virtual; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stacks_is_virtual ON public.stacks USING btree (is_virtual) WHERE (is_virtual = true);


--
-- TOC entry 4422 (class 1259 OID 22060)
-- Name: idx_stacks_row_tier_config; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stacks_row_tier_config ON public.stacks USING gin (row_tier_config);


--
-- TOC entry 4423 (class 1259 OID 22061)
-- Name: idx_stacks_section_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stacks_section_id ON public.stacks USING btree (section_id);


--
-- TOC entry 4424 (class 1259 OID 22062)
-- Name: idx_stacks_stack_number; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stacks_stack_number ON public.stacks USING btree (stack_number);


--
-- TOC entry 4425 (class 1259 OID 22063)
-- Name: idx_stacks_yard_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stacks_yard_id ON public.stacks USING btree (yard_id);


--
-- TOC entry 4426 (class 1259 OID 22064)
-- Name: idx_stacks_yard_section; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stacks_yard_section ON public.stacks USING btree (yard_id, section_id);


--
-- TOC entry 4646 (class 1259 OID 22065)
-- Name: idx_sync_health_summary_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_sync_health_summary_unique ON public.sync_health_summary USING btree (last_updated);


--
-- TOC entry 4593 (class 1259 OID 22066)
-- Name: idx_sync_log_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sync_log_created_at ON public.module_access_sync_log USING btree (created_at DESC);


--
-- TOC entry 4594 (class 1259 OID 22067)
-- Name: idx_sync_log_created_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sync_log_created_by ON public.module_access_sync_log USING btree (created_by);


--
-- TOC entry 4595 (class 1259 OID 22068)
-- Name: idx_sync_log_sync_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sync_log_sync_status ON public.module_access_sync_log USING btree (sync_status);


--
-- TOC entry 4596 (class 1259 OID 22069)
-- Name: idx_sync_log_sync_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sync_log_sync_type ON public.module_access_sync_log USING btree (sync_type);


--
-- TOC entry 4597 (class 1259 OID 22070)
-- Name: idx_sync_log_type_status_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sync_log_type_status_date ON public.module_access_sync_log USING btree (sync_type, sync_status, created_at DESC);


--
-- TOC entry 4598 (class 1259 OID 22071)
-- Name: idx_sync_log_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sync_log_user_id ON public.module_access_sync_log USING btree (user_id);


--
-- TOC entry 4599 (class 1259 OID 22072)
-- Name: idx_sync_log_user_status_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sync_log_user_status_date ON public.module_access_sync_log USING btree (user_id, sync_status, created_at DESC);


--
-- TOC entry 4647 (class 1259 OID 22073)
-- Name: idx_user_activities_action; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_activities_action ON public.user_activities USING btree (action);


--
-- TOC entry 4648 (class 1259 OID 22074)
-- Name: idx_user_activities_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_activities_created_at ON public.user_activities USING btree (created_at DESC);


--
-- TOC entry 4649 (class 1259 OID 22075)
-- Name: idx_user_activities_entity; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_activities_entity ON public.user_activities USING btree (entity_type, entity_id);


--
-- TOC entry 4650 (class 1259 OID 22076)
-- Name: idx_user_activities_user_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_activities_user_date ON public.user_activities USING btree (user_id, created_at DESC);


--
-- TOC entry 4651 (class 1259 OID 22077)
-- Name: idx_user_activities_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_activities_user_id ON public.user_activities USING btree (user_id);


--
-- TOC entry 4616 (class 1259 OID 22078)
-- Name: idx_user_module_access_containers; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_module_access_containers ON public.user_module_access USING btree (((module_permissions ->> 'containers'::text)));


--
-- TOC entry 4617 (class 1259 OID 22079)
-- Name: idx_user_module_access_dashboard; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_module_access_dashboard ON public.user_module_access USING btree (((module_permissions ->> 'dashboard'::text)));


--
-- TOC entry 4618 (class 1259 OID 22080)
-- Name: idx_user_module_access_has_permissions; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_module_access_has_permissions ON public.user_module_access USING btree ((((jsonb_typeof(module_permissions) = 'object'::text) AND (module_permissions <> '{}'::jsonb))));


--
-- TOC entry 4619 (class 1259 OID 22081)
-- Name: idx_user_module_access_last_sync; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_module_access_last_sync ON public.user_module_access USING btree (last_sync_at);


--
-- TOC entry 4620 (class 1259 OID 22082)
-- Name: idx_user_module_access_module_access; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_module_access_module_access ON public.user_module_access USING btree (((module_permissions ->> 'moduleAccess'::text)));


--
-- TOC entry 4621 (class 1259 OID 22083)
-- Name: idx_user_module_access_permissions_gin; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_module_access_permissions_gin ON public.user_module_access USING gin (module_permissions);


--
-- TOC entry 4622 (class 1259 OID 22084)
-- Name: idx_user_module_access_recent_updates; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_module_access_recent_updates ON public.user_module_access USING btree (updated_at DESC, user_id);


--
-- TOC entry 4623 (class 1259 OID 22085)
-- Name: idx_user_module_access_sync_composite; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_module_access_sync_composite ON public.user_module_access USING btree (user_id, sync_version, last_sync_at);


--
-- TOC entry 4624 (class 1259 OID 22086)
-- Name: idx_user_module_access_sync_source; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_module_access_sync_source ON public.user_module_access USING btree (sync_source);


--
-- TOC entry 4625 (class 1259 OID 22087)
-- Name: idx_user_module_access_sync_tracking; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_module_access_sync_tracking ON public.user_module_access USING btree (user_id, last_sync_at, sync_version, updated_at);


--
-- TOC entry 4626 (class 1259 OID 22088)
-- Name: idx_user_module_access_sync_version; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_module_access_sync_version ON public.user_module_access USING btree (sync_version);


--
-- TOC entry 4627 (class 1259 OID 22089)
-- Name: idx_user_module_access_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_module_access_user ON public.user_module_access USING btree (user_id);


--
-- TOC entry 4628 (class 1259 OID 22090)
-- Name: idx_user_module_access_users; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_module_access_users ON public.user_module_access USING btree (((module_permissions ->> 'users'::text)));


--
-- TOC entry 4633 (class 1259 OID 22091)
-- Name: idx_users_active_lookup; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_active_lookup ON public.users USING btree (is_deleted, active, email) WHERE (is_deleted = false);


--
-- TOC entry 4634 (class 1259 OID 22092)
-- Name: idx_users_created_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_created_by ON public.users USING btree (created_by);


--
-- TOC entry 4635 (class 1259 OID 22093)
-- Name: idx_users_deleted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_deleted_at ON public.users USING btree (deleted_at) WHERE (deleted_at IS NOT NULL);


--
-- TOC entry 4636 (class 1259 OID 22094)
-- Name: idx_users_deleted_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_deleted_by ON public.users USING btree (deleted_by) WHERE (deleted_by IS NOT NULL);


--
-- TOC entry 4637 (class 1259 OID 22095)
-- Name: idx_users_has_module_access; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_has_module_access ON public.users USING btree (id, updated_at) WHERE (module_access IS NOT NULL);


--
-- TOC entry 4638 (class 1259 OID 22096)
-- Name: idx_users_is_deleted; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_is_deleted ON public.users USING btree (is_deleted) WHERE (is_deleted = false);


--
-- TOC entry 4639 (class 1259 OID 22097)
-- Name: idx_users_is_deleted_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_is_deleted_active ON public.users USING btree (is_deleted, active) WHERE (is_deleted = false);


--
-- TOC entry 4640 (class 1259 OID 22098)
-- Name: idx_users_module_access_gin; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_module_access_gin ON public.users USING gin (module_access) WHERE (module_access IS NOT NULL);


--
-- TOC entry 4641 (class 1259 OID 22099)
-- Name: idx_users_updated_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_updated_by ON public.users USING btree (updated_by);


--
-- TOC entry 4661 (class 1259 OID 22100)
-- Name: idx_virtual_pairs_stack1; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_virtual_pairs_stack1 ON public.virtual_stack_pairs USING btree (stack1_id) WHERE (is_active = true);


--
-- TOC entry 4662 (class 1259 OID 22101)
-- Name: idx_virtual_pairs_stack2; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_virtual_pairs_stack2 ON public.virtual_stack_pairs USING btree (stack2_id) WHERE (is_active = true);


--
-- TOC entry 4663 (class 1259 OID 22102)
-- Name: idx_virtual_pairs_stacks; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_virtual_pairs_stacks ON public.virtual_stack_pairs USING btree (stack1_id, stack2_id);


--
-- TOC entry 4664 (class 1259 OID 22103)
-- Name: idx_virtual_pairs_yard; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_virtual_pairs_yard ON public.virtual_stack_pairs USING btree (yard_id);


--
-- TOC entry 4665 (class 1259 OID 22104)
-- Name: idx_virtual_pairs_yard_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_virtual_pairs_yard_active ON public.virtual_stack_pairs USING btree (yard_id, is_active) WHERE (is_active = true);


--
-- TOC entry 4672 (class 1259 OID 22105)
-- Name: idx_yards_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_yards_code ON public.yards USING btree (code);


--
-- TOC entry 4673 (class 1259 OID 22106)
-- Name: idx_yards_is_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_yards_is_active ON public.yards USING btree (is_active);


--
-- TOC entry 4429 (class 1259 OID 22107)
-- Name: unique_active_yard_stack; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX unique_active_yard_stack ON public.stacks USING btree (yard_id, stack_number) WHERE (is_active = true);


--
-- TOC entry 4413 (class 1259 OID 17256)
-- Name: ix_realtime_subscription_entity; Type: INDEX; Schema: realtime; Owner: supabase_admin
--

CREATE INDEX ix_realtime_subscription_entity ON realtime.subscription USING btree (entity);


--
-- TOC entry 4678 (class 1259 OID 22108)
-- Name: messages_inserted_at_topic_index; Type: INDEX; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE INDEX messages_inserted_at_topic_index ON ONLY realtime.messages USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- TOC entry 4695 (class 1259 OID 40741)
-- Name: messages_2026_02_28_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: supabase_admin
--

CREATE INDEX messages_2026_02_28_inserted_at_topic_idx ON realtime.messages_2026_02_28 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- TOC entry 4698 (class 1259 OID 41861)
-- Name: messages_2026_03_01_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: supabase_admin
--

CREATE INDEX messages_2026_03_01_inserted_at_topic_idx ON realtime.messages_2026_03_01 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- TOC entry 4701 (class 1259 OID 42976)
-- Name: messages_2026_03_02_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: supabase_admin
--

CREATE INDEX messages_2026_03_02_inserted_at_topic_idx ON realtime.messages_2026_03_02 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- TOC entry 4704 (class 1259 OID 45196)
-- Name: messages_2026_03_03_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: supabase_admin
--

CREATE INDEX messages_2026_03_03_inserted_at_topic_idx ON realtime.messages_2026_03_03 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- TOC entry 4707 (class 1259 OID 45208)
-- Name: messages_2026_03_04_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: supabase_admin
--

CREATE INDEX messages_2026_03_04_inserted_at_topic_idx ON realtime.messages_2026_03_04 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- TOC entry 4710 (class 1259 OID 45220)
-- Name: messages_2026_03_05_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: supabase_admin
--

CREATE INDEX messages_2026_03_05_inserted_at_topic_idx ON realtime.messages_2026_03_05 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- TOC entry 4713 (class 1259 OID 46335)
-- Name: messages_2026_03_06_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: supabase_admin
--

CREATE INDEX messages_2026_03_06_inserted_at_topic_idx ON realtime.messages_2026_03_06 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- TOC entry 4716 (class 1259 OID 47521)
-- Name: messages_2026_03_07_inserted_at_topic_idx; Type: INDEX; Schema: realtime; Owner: supabase_admin
--

CREATE INDEX messages_2026_03_07_inserted_at_topic_idx ON realtime.messages_2026_03_07 USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- TOC entry 4416 (class 1259 OID 17260)
-- Name: subscription_subscription_id_entity_filters_action_filter_key; Type: INDEX; Schema: realtime; Owner: supabase_admin
--

CREATE UNIQUE INDEX subscription_subscription_id_entity_filters_action_filter_key ON realtime.subscription USING btree (subscription_id, entity, filters, action_filter);


--
-- TOC entry 4719 (class 0 OID 0)
-- Name: messages_2026_02_28_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2026_02_28_inserted_at_topic_idx;


--
-- TOC entry 4720 (class 0 OID 0)
-- Name: messages_2026_02_28_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2026_02_28_pkey;


--
-- TOC entry 4721 (class 0 OID 0)
-- Name: messages_2026_03_01_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2026_03_01_inserted_at_topic_idx;


--
-- TOC entry 4722 (class 0 OID 0)
-- Name: messages_2026_03_01_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2026_03_01_pkey;


--
-- TOC entry 4723 (class 0 OID 0)
-- Name: messages_2026_03_02_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2026_03_02_inserted_at_topic_idx;


--
-- TOC entry 4724 (class 0 OID 0)
-- Name: messages_2026_03_02_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2026_03_02_pkey;


--
-- TOC entry 4725 (class 0 OID 0)
-- Name: messages_2026_03_03_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2026_03_03_inserted_at_topic_idx;


--
-- TOC entry 4726 (class 0 OID 0)
-- Name: messages_2026_03_03_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2026_03_03_pkey;


--
-- TOC entry 4727 (class 0 OID 0)
-- Name: messages_2026_03_04_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2026_03_04_inserted_at_topic_idx;


--
-- TOC entry 4728 (class 0 OID 0)
-- Name: messages_2026_03_04_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2026_03_04_pkey;


--
-- TOC entry 4729 (class 0 OID 0)
-- Name: messages_2026_03_05_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2026_03_05_inserted_at_topic_idx;


--
-- TOC entry 4730 (class 0 OID 0)
-- Name: messages_2026_03_05_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2026_03_05_pkey;


--
-- TOC entry 4731 (class 0 OID 0)
-- Name: messages_2026_03_06_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2026_03_06_inserted_at_topic_idx;


--
-- TOC entry 4732 (class 0 OID 0)
-- Name: messages_2026_03_06_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2026_03_06_pkey;


--
-- TOC entry 4733 (class 0 OID 0)
-- Name: messages_2026_03_07_inserted_at_topic_idx; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_inserted_at_topic_index ATTACH PARTITION realtime.messages_2026_03_07_inserted_at_topic_idx;


--
-- TOC entry 4734 (class 0 OID 0)
-- Name: messages_2026_03_07_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2026_03_07_pkey;


--
-- TOC entry 4791 (class 2620 OID 22116)
-- Name: client_pools client_pools_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER client_pools_updated_at BEFORE UPDATE ON public.client_pools FOR EACH ROW EXECUTE FUNCTION public.update_client_pools_updated_at();


--
-- TOC entry 4792 (class 2620 OID 22117)
-- Name: containers container_audit_log_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER container_audit_log_trigger BEFORE INSERT OR UPDATE ON public.containers FOR EACH ROW EXECUTE FUNCTION public.add_container_audit_log();


--
-- TOC entry 4793 (class 2620 OID 22118)
-- Name: containers containers_update_stack_occupancy; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER containers_update_stack_occupancy AFTER INSERT OR DELETE OR UPDATE ON public.containers FOR EACH ROW EXECUTE FUNCTION public.trigger_update_stack_occupancy();


--
-- TOC entry 4804 (class 2620 OID 22119)
-- Name: locations location_stats_refresh_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER location_stats_refresh_trigger AFTER INSERT OR DELETE OR UPDATE ON public.locations FOR EACH STATEMENT EXECUTE FUNCTION public.trigger_refresh_location_statistics();


--
-- TOC entry 4805 (class 2620 OID 22120)
-- Name: locations locations_audit_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER locations_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.locations FOR EACH ROW EXECUTE FUNCTION public.log_location_changes();


--
-- TOC entry 4806 (class 2620 OID 22121)
-- Name: locations locations_updated_at_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER locations_updated_at_trigger BEFORE UPDATE ON public.locations FOR EACH ROW EXECUTE FUNCTION public.update_locations_updated_at();


--
-- TOC entry 4787 (class 2620 OID 22122)
-- Name: stacks stack_soft_delete_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER stack_soft_delete_trigger AFTER UPDATE ON public.stacks FOR EACH ROW WHEN ((old.is_active IS DISTINCT FROM new.is_active)) EXECUTE FUNCTION public.handle_stack_soft_delete();


--
-- TOC entry 4796 (class 2620 OID 22123)
-- Name: gate_in_operations trigger_auto_create_edi_transmission_gate_in; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_auto_create_edi_transmission_gate_in BEFORE UPDATE ON public.gate_in_operations FOR EACH ROW EXECUTE FUNCTION public.auto_create_edi_transmission_on_gate_completion();


--
-- TOC entry 4802 (class 2620 OID 22124)
-- Name: gate_out_operations trigger_auto_create_edi_transmission_gate_out; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_auto_create_edi_transmission_gate_out BEFORE UPDATE ON public.gate_out_operations FOR EACH ROW EXECUTE FUNCTION public.auto_create_edi_transmission_on_gate_completion();


--
-- TOC entry 4788 (class 2620 OID 22125)
-- Name: stacks trigger_auto_mark_buffer_zones; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_auto_mark_buffer_zones BEFORE INSERT OR UPDATE ON public.stacks FOR EACH ROW EXECUTE FUNCTION public.auto_mark_buffer_zones();


--
-- TOC entry 4790 (class 2620 OID 22126)
-- Name: booking_references trigger_booking_references_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_booking_references_updated_at BEFORE UPDATE ON public.booking_references FOR EACH ROW EXECUTE FUNCTION public.update_booking_references_updated_at();


--
-- TOC entry 4812 (class 2620 OID 38460)
-- Name: container_buffer_zones trigger_buffer_zone_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_buffer_zone_updated_at BEFORE UPDATE ON public.container_buffer_zones FOR EACH ROW EXECUTE FUNCTION public.update_buffer_zone_updated_at();


--
-- TOC entry 4810 (class 2620 OID 22127)
-- Name: user_login_history trigger_calculate_session_duration; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_calculate_session_duration BEFORE UPDATE ON public.user_login_history FOR EACH ROW WHEN (((new.logout_time IS NOT NULL) AND (old.logout_time IS NULL))) EXECUTE FUNCTION public.calculate_session_duration();


--
-- TOC entry 4794 (class 2620 OID 22128)
-- Name: containers trigger_update_containers_damage_assessed_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_containers_damage_assessed_at BEFORE UPDATE ON public.containers FOR EACH ROW EXECUTE FUNCTION public.update_containers_damage_assessed_at();


--
-- TOC entry 4797 (class 2620 OID 22129)
-- Name: gate_in_operations trigger_update_damage_assessed_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_damage_assessed_at BEFORE UPDATE ON public.gate_in_operations FOR EACH ROW EXECUTE FUNCTION public.update_gate_in_damage_assessed_at();


--
-- TOC entry 4789 (class 2620 OID 22130)
-- Name: stacks trigger_update_stack_capacity; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_stack_capacity BEFORE INSERT OR UPDATE OF rows, max_tiers, row_tier_config ON public.stacks FOR EACH ROW EXECUTE FUNCTION public.update_stack_capacity();


--
-- TOC entry 4808 (class 2620 OID 22131)
-- Name: users trigger_update_users_audit_fields; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_users_audit_fields BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_users_audit_fields();


--
-- TOC entry 4809 (class 2620 OID 22132)
-- Name: users trigger_update_users_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_users_updated_at();


--
-- TOC entry 4800 (class 2620 OID 22133)
-- Name: edi_client_settings update_edi_client_settings_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_edi_client_settings_updated_at BEFORE UPDATE ON public.edi_client_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 4801 (class 2620 OID 22134)
-- Name: edi_server_configurations update_edi_server_configurations_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_edi_server_configurations_updated_at BEFORE UPDATE ON public.edi_server_configurations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 4799 (class 2620 OID 22135)
-- Name: edi_transmission_logs update_edi_transmission_logs_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_edi_transmission_logs_updated_at BEFORE UPDATE ON public.edi_transmission_logs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 4798 (class 2620 OID 22136)
-- Name: gate_in_operations update_gate_in_operations_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_gate_in_operations_updated_at BEFORE UPDATE ON public.gate_in_operations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 4803 (class 2620 OID 22137)
-- Name: gate_out_operations update_gate_out_operations_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_gate_out_operations_updated_at BEFORE UPDATE ON public.gate_out_operations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 4807 (class 2620 OID 22138)
-- Name: user_module_access user_module_access_sync_tracking; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER user_module_access_sync_tracking BEFORE UPDATE ON public.user_module_access FOR EACH ROW EXECUTE FUNCTION public.update_user_module_access_sync_tracking();


--
-- TOC entry 4795 (class 2620 OID 22139)
-- Name: containers validate_40ft_container_stack_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER validate_40ft_container_stack_trigger BEFORE INSERT OR UPDATE OF location, size ON public.containers FOR EACH ROW EXECUTE FUNCTION public.validate_40ft_container_stack();


--
-- TOC entry 4811 (class 2620 OID 22140)
-- Name: virtual_stack_pairs virtual_pairs_updated_at_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER virtual_pairs_updated_at_trigger BEFORE UPDATE ON public.virtual_stack_pairs FOR EACH ROW EXECUTE FUNCTION public.update_virtual_pairs_updated_at();


--
-- TOC entry 4786 (class 2620 OID 22141)
-- Name: subscription tr_check_filters; Type: TRIGGER; Schema: realtime; Owner: supabase_admin
--

CREATE TRIGGER tr_check_filters BEFORE INSERT OR UPDATE ON realtime.subscription FOR EACH ROW EXECUTE FUNCTION realtime.subscription_check_filters();


--
-- TOC entry 4736 (class 2606 OID 16688)
-- Name: identities identities_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4741 (class 2606 OID 16777)
-- Name: mfa_amr_claims mfa_amr_claims_session_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT mfa_amr_claims_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE;


--
-- TOC entry 4740 (class 2606 OID 16765)
-- Name: mfa_challenges mfa_challenges_auth_factor_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_challenges
    ADD CONSTRAINT mfa_challenges_auth_factor_id_fkey FOREIGN KEY (factor_id) REFERENCES auth.mfa_factors(id) ON DELETE CASCADE;


--
-- TOC entry 4739 (class 2606 OID 16752)
-- Name: mfa_factors mfa_factors_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4747 (class 2606 OID 17017)
-- Name: oauth_authorizations oauth_authorizations_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_client_id_fkey FOREIGN KEY (client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- TOC entry 4748 (class 2606 OID 17022)
-- Name: oauth_authorizations oauth_authorizations_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4749 (class 2606 OID 17046)
-- Name: oauth_consents oauth_consents_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_client_id_fkey FOREIGN KEY (client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- TOC entry 4750 (class 2606 OID 17041)
-- Name: oauth_consents oauth_consents_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4746 (class 2606 OID 16943)
-- Name: one_time_tokens one_time_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.one_time_tokens
    ADD CONSTRAINT one_time_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4735 (class 2606 OID 16721)
-- Name: refresh_tokens refresh_tokens_session_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE;


--
-- TOC entry 4743 (class 2606 OID 16824)
-- Name: saml_providers saml_providers_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- TOC entry 4744 (class 2606 OID 16897)
-- Name: saml_relay_states saml_relay_states_flow_state_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_flow_state_id_fkey FOREIGN KEY (flow_state_id) REFERENCES auth.flow_state(id) ON DELETE CASCADE;


--
-- TOC entry 4745 (class 2606 OID 16838)
-- Name: saml_relay_states saml_relay_states_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- TOC entry 4737 (class 2606 OID 17060)
-- Name: sessions sessions_oauth_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_oauth_client_id_fkey FOREIGN KEY (oauth_client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- TOC entry 4738 (class 2606 OID 16716)
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4742 (class 2606 OID 16805)
-- Name: sso_domains sso_domains_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sso_domains
    ADD CONSTRAINT sso_domains_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- TOC entry 4781 (class 2606 OID 38432)
-- Name: container_buffer_zones container_buffer_zones_buffer_stack_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.container_buffer_zones
    ADD CONSTRAINT container_buffer_zones_buffer_stack_id_fkey FOREIGN KEY (buffer_stack_id) REFERENCES public.stacks(id) ON DELETE SET NULL;


--
-- TOC entry 4782 (class 2606 OID 38422)
-- Name: container_buffer_zones container_buffer_zones_container_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.container_buffer_zones
    ADD CONSTRAINT container_buffer_zones_container_id_fkey FOREIGN KEY (container_id) REFERENCES public.containers(id) ON DELETE CASCADE;


--
-- TOC entry 4783 (class 2606 OID 38442)
-- Name: container_buffer_zones container_buffer_zones_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.container_buffer_zones
    ADD CONSTRAINT container_buffer_zones_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 4784 (class 2606 OID 38427)
-- Name: container_buffer_zones container_buffer_zones_gate_in_operation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.container_buffer_zones
    ADD CONSTRAINT container_buffer_zones_gate_in_operation_id_fkey FOREIGN KEY (gate_in_operation_id) REFERENCES public.gate_in_operations(id) ON DELETE SET NULL;


--
-- TOC entry 4785 (class 2606 OID 38437)
-- Name: container_buffer_zones container_buffer_zones_released_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.container_buffer_zones
    ADD CONSTRAINT container_buffer_zones_released_by_fkey FOREIGN KEY (released_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 4755 (class 2606 OID 38452)
-- Name: containers containers_buffer_zone_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.containers
    ADD CONSTRAINT containers_buffer_zone_id_fkey FOREIGN KEY (buffer_zone_id) REFERENCES public.container_buffer_zones(id) ON DELETE SET NULL;


--
-- TOC entry 4756 (class 2606 OID 22144)
-- Name: containers containers_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.containers
    ADD CONSTRAINT containers_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id);


--
-- TOC entry 4757 (class 2606 OID 22149)
-- Name: containers containers_deleted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.containers
    ADD CONSTRAINT containers_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES public.users(id);


--
-- TOC entry 4758 (class 2606 OID 47531)
-- Name: containers containers_gate_out_operation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.containers
    ADD CONSTRAINT containers_gate_out_operation_id_fkey FOREIGN KEY (gate_out_operation_id) REFERENCES public.gate_out_operations(id);


--
-- TOC entry 4764 (class 2606 OID 22154)
-- Name: edi_client_settings edi_client_settings_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.edi_client_settings
    ADD CONSTRAINT edi_client_settings_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- TOC entry 4765 (class 2606 OID 22159)
-- Name: edi_client_settings edi_client_settings_server_config_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.edi_client_settings
    ADD CONSTRAINT edi_client_settings_server_config_id_fkey FOREIGN KEY (server_config_id) REFERENCES public.edi_server_configurations(id) ON DELETE SET NULL;


--
-- TOC entry 4761 (class 2606 OID 22164)
-- Name: edi_transmission_logs edi_transmission_logs_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.edi_transmission_logs
    ADD CONSTRAINT edi_transmission_logs_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;


--
-- TOC entry 4762 (class 2606 OID 22169)
-- Name: edi_transmission_logs edi_transmission_logs_config_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.edi_transmission_logs
    ADD CONSTRAINT edi_transmission_logs_config_id_fkey FOREIGN KEY (config_id) REFERENCES public.edi_server_configurations(id) ON DELETE SET NULL;


--
-- TOC entry 4763 (class 2606 OID 22174)
-- Name: edi_transmission_logs edi_transmission_logs_container_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.edi_transmission_logs
    ADD CONSTRAINT edi_transmission_logs_container_id_fkey FOREIGN KEY (container_id) REFERENCES public.containers(id) ON DELETE SET NULL;


--
-- TOC entry 4752 (class 2606 OID 22179)
-- Name: client_pools fk_client_pools_client; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_pools
    ADD CONSTRAINT fk_client_pools_client FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- TOC entry 4753 (class 2606 OID 22184)
-- Name: client_pools fk_client_pools_created_by; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_pools
    ADD CONSTRAINT fk_client_pools_created_by FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- TOC entry 4754 (class 2606 OID 22189)
-- Name: client_pools fk_client_pools_updated_by; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_pools
    ADD CONSTRAINT fk_client_pools_updated_by FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- TOC entry 4775 (class 2606 OID 22194)
-- Name: stack_assignments fk_stack_assignments_assigned_by; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stack_assignments
    ADD CONSTRAINT fk_stack_assignments_assigned_by FOREIGN KEY (assigned_by) REFERENCES public.users(id);


--
-- TOC entry 4776 (class 2606 OID 22199)
-- Name: stack_assignments fk_stack_assignments_pool; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stack_assignments
    ADD CONSTRAINT fk_stack_assignments_pool FOREIGN KEY (client_pool_id) REFERENCES public.client_pools(id) ON DELETE CASCADE;


--
-- TOC entry 4773 (class 2606 OID 22204)
-- Name: module_access_sync_log fk_sync_log_created_by; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.module_access_sync_log
    ADD CONSTRAINT fk_sync_log_created_by FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 4774 (class 2606 OID 22209)
-- Name: module_access_sync_log fk_sync_log_user_id; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.module_access_sync_log
    ADD CONSTRAINT fk_sync_log_user_id FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 4777 (class 2606 OID 22214)
-- Name: user_module_access fk_user_module_access_updated_by; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_module_access
    ADD CONSTRAINT fk_user_module_access_updated_by FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- TOC entry 4778 (class 2606 OID 22219)
-- Name: user_module_access fk_user_module_access_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_module_access
    ADD CONSTRAINT fk_user_module_access_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 4759 (class 2606 OID 22224)
-- Name: gate_in_operations gate_in_operations_container_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gate_in_operations
    ADD CONSTRAINT gate_in_operations_container_id_fkey FOREIGN KEY (container_id) REFERENCES public.containers(id);


--
-- TOC entry 4760 (class 2606 OID 22229)
-- Name: gate_in_operations gate_in_operations_edi_log_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gate_in_operations
    ADD CONSTRAINT gate_in_operations_edi_log_id_fkey FOREIGN KEY (edi_log_id) REFERENCES public.edi_transmission_logs(id) ON DELETE SET NULL;


--
-- TOC entry 4766 (class 2606 OID 22234)
-- Name: gate_out_operations gate_out_operations_edi_log_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gate_out_operations
    ADD CONSTRAINT gate_out_operations_edi_log_id_fkey FOREIGN KEY (edi_log_id) REFERENCES public.edi_transmission_logs(id) ON DELETE SET NULL;


--
-- TOC entry 4767 (class 2606 OID 22239)
-- Name: gate_out_operations gate_out_operations_release_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gate_out_operations
    ADD CONSTRAINT gate_out_operations_release_order_id_fkey FOREIGN KEY (release_order_id) REFERENCES public.booking_references(id);


--
-- TOC entry 4768 (class 2606 OID 22244)
-- Name: location_audit_log location_audit_log_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.location_audit_log
    ADD CONSTRAINT location_audit_log_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.locations(id) ON DELETE SET NULL;


--
-- TOC entry 4769 (class 2606 OID 22249)
-- Name: location_id_mappings location_id_mappings_new_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.location_id_mappings
    ADD CONSTRAINT location_id_mappings_new_location_id_fkey FOREIGN KEY (new_location_id) REFERENCES public.locations(id) ON DELETE CASCADE;


--
-- TOC entry 4770 (class 2606 OID 22254)
-- Name: locations locations_client_pool_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.locations
    ADD CONSTRAINT locations_client_pool_id_fkey FOREIGN KEY (client_pool_id) REFERENCES public.client_pools(id) ON DELETE SET NULL;


--
-- TOC entry 4771 (class 2606 OID 22259)
-- Name: locations locations_container_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.locations
    ADD CONSTRAINT locations_container_id_fkey FOREIGN KEY (container_id) REFERENCES public.containers(id) ON DELETE SET NULL;


--
-- TOC entry 4772 (class 2606 OID 22264)
-- Name: locations locations_virtual_stack_pair_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.locations
    ADD CONSTRAINT locations_virtual_stack_pair_id_fkey FOREIGN KEY (virtual_stack_pair_id) REFERENCES public.virtual_stack_pairs(id) ON DELETE SET NULL;


--
-- TOC entry 4751 (class 2606 OID 22269)
-- Name: booking_references release_orders_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.booking_references
    ADD CONSTRAINT release_orders_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id);


--
-- TOC entry 4779 (class 2606 OID 22274)
-- Name: user_activities user_activities_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_activities
    ADD CONSTRAINT user_activities_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 4780 (class 2606 OID 22279)
-- Name: user_login_history user_login_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_login_history
    ADD CONSTRAINT user_login_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 4982 (class 0 OID 16525)
-- Dependencies: 347
-- Name: audit_log_entries; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.audit_log_entries ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4993 (class 0 OID 16883)
-- Dependencies: 358
-- Name: flow_state; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.flow_state ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4984 (class 0 OID 16681)
-- Dependencies: 349
-- Name: identities; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.identities ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4981 (class 0 OID 16518)
-- Dependencies: 346
-- Name: instances; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.instances ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4988 (class 0 OID 16770)
-- Dependencies: 353
-- Name: mfa_amr_claims; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.mfa_amr_claims ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4987 (class 0 OID 16758)
-- Dependencies: 352
-- Name: mfa_challenges; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.mfa_challenges ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4986 (class 0 OID 16745)
-- Dependencies: 351
-- Name: mfa_factors; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.mfa_factors ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4994 (class 0 OID 16933)
-- Dependencies: 359
-- Name: one_time_tokens; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.one_time_tokens ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4980 (class 0 OID 16507)
-- Dependencies: 345
-- Name: refresh_tokens; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.refresh_tokens ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4991 (class 0 OID 16812)
-- Dependencies: 356
-- Name: saml_providers; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.saml_providers ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4992 (class 0 OID 16830)
-- Dependencies: 357
-- Name: saml_relay_states; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.saml_relay_states ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4983 (class 0 OID 16533)
-- Dependencies: 348
-- Name: schema_migrations; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.schema_migrations ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4985 (class 0 OID 16711)
-- Dependencies: 350
-- Name: sessions; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.sessions ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4990 (class 0 OID 16797)
-- Dependencies: 355
-- Name: sso_domains; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.sso_domains ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4989 (class 0 OID 16788)
-- Dependencies: 354
-- Name: sso_providers; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.sso_providers ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4979 (class 0 OID 16495)
-- Dependencies: 343
-- Name: users; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 5093 (class 3256 OID 23596)
-- Name: edi_client_settings Admin can manage SFTP config; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admin can manage SFTP config" ON public.edi_client_settings USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.auth_user_id = auth.uid()) AND (users.role = 'admin'::text)))));


--
-- TOC entry 5022 (class 3256 OID 22284)
-- Name: sections Admins and supervisors can create sections; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins and supervisors can create sections" ON public.sections FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND (users.role = ANY (ARRAY['admin'::text, 'supervisor'::text]))))));


--
-- TOC entry 5023 (class 3256 OID 22285)
-- Name: client_pools Admins and supervisors can insert client pools; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins and supervisors can insert client pools" ON public.client_pools FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = ( SELECT users_1.id
           FROM public.users users_1
          WHERE (users_1.auth_user_id = auth.uid()))) AND (users.role = ANY (ARRAY['admin'::text, 'supervisor'::text]))))));


--
-- TOC entry 5024 (class 3256 OID 22286)
-- Name: stack_assignments Admins and supervisors can insert stack assignments; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins and supervisors can insert stack assignments" ON public.stack_assignments FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = ( SELECT users_1.id
           FROM public.users users_1
          WHERE (users_1.auth_user_id = auth.uid()))) AND (users.role = ANY (ARRAY['admin'::text, 'supervisor'::text]))))));


--
-- TOC entry 5025 (class 3256 OID 22287)
-- Name: edi_client_settings Admins and supervisors can manage EDI client settings; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins and supervisors can manage EDI client settings" ON public.edi_client_settings TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.auth_user_id = auth.uid()) AND (users.role = ANY (ARRAY['admin'::text, 'supervisor'::text])) AND (users.active = true)))));


--
-- TOC entry 5027 (class 3256 OID 22288)
-- Name: edi_server_configurations Admins and supervisors can manage EDI server configurations; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins and supervisors can manage EDI server configurations" ON public.edi_server_configurations TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.auth_user_id = auth.uid()) AND (users.role = ANY (ARRAY['admin'::text, 'supervisor'::text])) AND (users.active = true)))));


--
-- TOC entry 5028 (class 3256 OID 22289)
-- Name: client_pools Admins and supervisors can update client pools; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins and supervisors can update client pools" ON public.client_pools FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = ( SELECT users_1.id
           FROM public.users users_1
          WHERE (users_1.auth_user_id = auth.uid()))) AND (users.role = ANY (ARRAY['admin'::text, 'supervisor'::text])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = ( SELECT users_1.id
           FROM public.users users_1
          WHERE (users_1.auth_user_id = auth.uid()))) AND (users.role = ANY (ARRAY['admin'::text, 'supervisor'::text]))))));


--
-- TOC entry 5029 (class 3256 OID 22291)
-- Name: sections Admins and supervisors can update sections; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins and supervisors can update sections" ON public.sections FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND (users.role = ANY (ARRAY['admin'::text, 'supervisor'::text])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND (users.role = ANY (ARRAY['admin'::text, 'supervisor'::text]))))));


--
-- TOC entry 5030 (class 3256 OID 22293)
-- Name: stack_assignments Admins and supervisors can update stack assignments; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins and supervisors can update stack assignments" ON public.stack_assignments FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = ( SELECT users_1.id
           FROM public.users users_1
          WHERE (users_1.auth_user_id = auth.uid()))) AND (users.role = ANY (ARRAY['admin'::text, 'supervisor'::text])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = ( SELECT users_1.id
           FROM public.users users_1
          WHERE (users_1.auth_user_id = auth.uid()))) AND (users.role = ANY (ARRAY['admin'::text, 'supervisor'::text]))))));


--
-- TOC entry 5032 (class 3256 OID 22295)
-- Name: edi_server_configurations Admins and supervisors can view EDI server configurations; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins and supervisors can view EDI server configurations" ON public.edi_server_configurations FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.auth_user_id = auth.uid()) AND (users.role = ANY (ARRAY['admin'::text, 'supervisor'::text])) AND (users.active = true)))));


--
-- TOC entry 5033 (class 3256 OID 22296)
-- Name: module_access_sync_log Admins and system can insert sync logs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins and system can insert sync logs" ON public.module_access_sync_log FOR INSERT TO authenticated WITH CHECK (((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = ( SELECT users_1.id
           FROM public.users users_1
          WHERE (users_1.auth_user_id = auth.uid()))) AND (users.role = 'admin'::text)))) OR (created_by IS NULL)));


--
-- TOC entry 5034 (class 3256 OID 22297)
-- Name: client_pools Admins can delete client pools; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can delete client pools" ON public.client_pools FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = ( SELECT users_1.id
           FROM public.users users_1
          WHERE (users_1.auth_user_id = auth.uid()))) AND (users.role = 'admin'::text)))));


--
-- TOC entry 5035 (class 3256 OID 22298)
-- Name: user_module_access Admins can delete module access; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can delete module access" ON public.user_module_access FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = ( SELECT users_1.id
           FROM public.users users_1
          WHERE (users_1.auth_user_id = auth.uid()))) AND (users.role = 'admin'::text)))));


--
-- TOC entry 5037 (class 3256 OID 22299)
-- Name: module_access_sync_log Admins can delete old sync logs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can delete old sync logs" ON public.module_access_sync_log FOR DELETE TO authenticated USING (((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = ( SELECT users_1.id
           FROM public.users users_1
          WHERE (users_1.auth_user_id = auth.uid()))) AND (users.role = 'admin'::text)))) AND (created_at < (now() - '1 year'::interval))));


--
-- TOC entry 5038 (class 3256 OID 22300)
-- Name: stack_assignments Admins can delete stack assignments; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can delete stack assignments" ON public.stack_assignments FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = ( SELECT users_1.id
           FROM public.users users_1
          WHERE (users_1.auth_user_id = auth.uid()))) AND (users.role = 'admin'::text)))));


--
-- TOC entry 5039 (class 3256 OID 22301)
-- Name: user_module_access Admins can insert module access; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can insert module access" ON public.user_module_access FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = ( SELECT users_1.id
           FROM public.users users_1
          WHERE (users_1.auth_user_id = auth.uid()))) AND (users.role = 'admin'::text)))));


--
-- TOC entry 5040 (class 3256 OID 22302)
-- Name: user_module_access Admins can update module access; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can update module access" ON public.user_module_access FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = ( SELECT users_1.id
           FROM public.users users_1
          WHERE (users_1.auth_user_id = auth.uid()))) AND (users.role = 'admin'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = ( SELECT users_1.id
           FROM public.users users_1
          WHERE (users_1.auth_user_id = auth.uid()))) AND (users.role = 'admin'::text)))));


--
-- TOC entry 5041 (class 3256 OID 22304)
-- Name: yards Allow admins to delete yards; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow admins to delete yards" ON public.yards FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.auth_user_id = auth.uid()) AND (users.role = 'admin'::text)))));


--
-- TOC entry 5042 (class 3256 OID 22305)
-- Name: yards Allow admins to insert yards; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow admins to insert yards" ON public.yards FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.auth_user_id = auth.uid()) AND (users.role = 'admin'::text)))));


--
-- TOC entry 5043 (class 3256 OID 22306)
-- Name: yards Allow admins to update yards; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow admins to update yards" ON public.yards FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.auth_user_id = auth.uid()) AND (users.role = 'admin'::text)))));


--
-- TOC entry 5044 (class 3256 OID 22307)
-- Name: yards Allow authenticated users to read yards; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow authenticated users to read yards" ON public.yards FOR SELECT TO authenticated USING (true);


--
-- TOC entry 5045 (class 3256 OID 22308)
-- Name: user_module_access Allow initial admin module access creation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow initial admin module access creation" ON public.user_module_access FOR INSERT TO authenticated WITH CHECK (((NOT public.has_admin_users()) AND (user_id IN ( SELECT users.id
   FROM public.users
  WHERE ((users.role = 'admin'::text) AND (users.auth_user_id = auth.uid()))))));


--
-- TOC entry 5112 (class 3256 OID 32811)
-- Name: edi_client_settings Allow read access to edi_client_settings; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow read access to edi_client_settings" ON public.edi_client_settings FOR SELECT USING (true);


--
-- TOC entry 5113 (class 3256 OID 32812)
-- Name: edi_server_configurations Allow read access to edi_server_configurations; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow read access to edi_server_configurations" ON public.edi_server_configurations FOR SELECT USING (true);


--
-- TOC entry 5047 (class 3256 OID 22313)
-- Name: gate_out_operations Auth operators update gate out; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Auth operators update gate out" ON public.gate_out_operations FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.auth_user_id = auth.uid()) AND (users.active = true) AND (users.role = ANY (ARRAY['admin'::text, 'supervisor'::text, 'operator'::text])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.auth_user_id = auth.uid()) AND (users.active = true) AND (users.role = ANY (ARRAY['admin'::text, 'supervisor'::text, 'operator'::text]))))));


--
-- TOC entry 5051 (class 3256 OID 22322)
-- Name: locations Authenticated users can manage locations; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Authenticated users can manage locations" ON public.locations TO authenticated USING (true) WITH CHECK (true);


--
-- TOC entry 5114 (class 3256 OID 38461)
-- Name: container_buffer_zones Authenticated users can read buffer zones; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Authenticated users can read buffer zones" ON public.container_buffer_zones FOR SELECT TO authenticated USING (true);


--
-- TOC entry 5052 (class 3256 OID 22323)
-- Name: user_activities Authenticated users can view all activities; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Authenticated users can view all activities" ON public.user_activities FOR SELECT TO authenticated USING (true);


--
-- TOC entry 5053 (class 3256 OID 22324)
-- Name: user_login_history Authenticated users can view all login history; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Authenticated users can view all login history" ON public.user_login_history FOR SELECT TO authenticated USING (true);


--
-- TOC entry 5054 (class 3256 OID 22325)
-- Name: container_types Authenticated users can view container types; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Authenticated users can view container types" ON public.container_types FOR SELECT TO authenticated USING (true);


--
-- TOC entry 5055 (class 3256 OID 22326)
-- Name: sections Authenticated users can view sections; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Authenticated users can view sections" ON public.sections FOR SELECT TO authenticated USING (true);


--
-- TOC entry 5056 (class 3256 OID 22327)
-- Name: stacks Authenticated users can view stacks; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Authenticated users can view stacks" ON public.stacks FOR SELECT TO authenticated USING (true);


--
-- TOC entry 5525 (class 0 OID 0)
-- Dependencies: 5056
-- Name: POLICY "Authenticated users can view stacks" ON stacks; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON POLICY "Authenticated users can view stacks" ON public.stacks IS 'Allows all authenticated users to view stack configurations';


--
-- TOC entry 5057 (class 3256 OID 22328)
-- Name: module_access_sync_log No updates allowed on sync logs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "No updates allowed on sync logs" ON public.module_access_sync_log FOR UPDATE TO authenticated USING (false);


--
-- TOC entry 5058 (class 3256 OID 22329)
-- Name: sections Only admins can delete sections; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Only admins can delete sections" ON public.sections FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::text)))));


--
-- TOC entry 5059 (class 3256 OID 22330)
-- Name: container_types Only admins can manage container types; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Only admins can manage container types" ON public.container_types TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.auth_user_id = auth.uid()) AND (users.role = 'admin'::text) AND (users.active = true)))));


--
-- TOC entry 5064 (class 3256 OID 22331)
-- Name: containers Operators can create containers; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Operators can create containers" ON public.containers FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.auth_user_id = auth.uid()) AND (users.role = ANY (ARRAY['admin'::text, 'supervisor'::text, 'operator'::text])) AND (users.active = true)))));


--
-- TOC entry 5115 (class 3256 OID 38462)
-- Name: container_buffer_zones Operators can insert buffer zones; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Operators can insert buffer zones" ON public.container_buffer_zones FOR INSERT TO authenticated WITH CHECK (true);


--
-- TOC entry 5116 (class 3256 OID 38463)
-- Name: container_buffer_zones Operators can update buffer zones; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Operators can update buffer zones" ON public.container_buffer_zones FOR UPDATE TO authenticated USING (true);


--
-- TOC entry 5065 (class 3256 OID 22332)
-- Name: containers Operators can update containers; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Operators can update containers" ON public.containers FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.auth_user_id = auth.uid()) AND (users.role = ANY (ARRAY['admin'::text, 'supervisor'::text, 'operator'::text])) AND (users.active = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.auth_user_id = auth.uid()) AND (users.role = ANY (ARRAY['admin'::text, 'supervisor'::text, 'operator'::text])) AND (users.active = true)))));


--
-- TOC entry 5066 (class 3256 OID 22336)
-- Name: user_activities Service role can insert activities; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Service role can insert activities" ON public.user_activities FOR INSERT TO authenticated WITH CHECK (true);


--
-- TOC entry 5067 (class 3256 OID 22337)
-- Name: user_login_history Service role can manage login history; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Service role can manage login history" ON public.user_login_history TO authenticated USING (true) WITH CHECK (true);


--
-- TOC entry 5068 (class 3256 OID 22338)
-- Name: edi_transmission_logs System can create EDI transmission logs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "System can create EDI transmission logs" ON public.edi_transmission_logs FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.auth_user_id = auth.uid()) AND (users.role = ANY (ARRAY['admin'::text, 'supervisor'::text, 'operator'::text])) AND (users.active = true)))));


--
-- TOC entry 5069 (class 3256 OID 22339)
-- Name: audit_logs System can create audit logs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "System can create audit logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (true);


--
-- TOC entry 5070 (class 3256 OID 22340)
-- Name: edi_transmission_logs System can update EDI transmission logs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "System can update EDI transmission logs" ON public.edi_transmission_logs FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.auth_user_id = auth.uid()) AND (users.role = ANY (ARRAY['admin'::text, 'supervisor'::text, 'operator'::text])) AND (users.active = true)))));


--
-- TOC entry 5072 (class 3256 OID 22345)
-- Name: edi_client_settings Users can view EDI client settings; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view EDI client settings" ON public.edi_client_settings FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.auth_user_id = auth.uid()) AND (users.role = ANY (ARRAY['admin'::text, 'supervisor'::text, 'operator'::text])) AND (users.active = true)))));


--
-- TOC entry 5073 (class 3256 OID 22346)
-- Name: edi_transmission_logs Users can view EDI transmission logs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view EDI transmission logs" ON public.edi_transmission_logs FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.auth_user_id = auth.uid()) AND (users.role = ANY (ARRAY['admin'::text, 'supervisor'::text, 'operator'::text])) AND (users.active = true)))));


--
-- TOC entry 5074 (class 3256 OID 22347)
-- Name: audit_logs Users can view audit logs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view audit logs" ON public.audit_logs FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.auth_user_id = auth.uid()) AND (users.role = ANY (ARRAY['admin'::text, 'supervisor'::text])) AND (users.active = true)))));


--
-- TOC entry 5075 (class 3256 OID 22348)
-- Name: client_pools Users can view client pools; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view client pools" ON public.client_pools FOR SELECT TO authenticated USING (true);


--
-- TOC entry 5076 (class 3256 OID 22350)
-- Name: stack_assignments Users can view stack assignments; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view stack assignments" ON public.stack_assignments FOR SELECT TO authenticated USING (true);


--
-- TOC entry 5079 (class 3256 OID 22351)
-- Name: user_module_access Users can view their own module access; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view their own module access" ON public.user_module_access FOR SELECT TO authenticated USING (((user_id = ( SELECT users.id
   FROM public.users
  WHERE (users.auth_user_id = auth.uid()))) OR (EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = ( SELECT users_1.id
           FROM public.users users_1
          WHERE (users_1.auth_user_id = auth.uid()))) AND (users.role = 'admin'::text))))));


--
-- TOC entry 5080 (class 3256 OID 22352)
-- Name: module_access_sync_log Users can view their own sync logs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view their own sync logs" ON public.module_access_sync_log FOR SELECT TO authenticated USING (((user_id = ( SELECT users.id
   FROM public.users
  WHERE (users.auth_user_id = auth.uid()))) OR (user_id IS NULL) OR (EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = ( SELECT users_1.id
           FROM public.users users_1
          WHERE (users_1.auth_user_id = auth.uid()))) AND (users.role = 'admin'::text))))));


--
-- TOC entry 5081 (class 3256 OID 22353)
-- Name: location_audit_log audit_log_insert_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY audit_log_insert_policy ON public.location_audit_log FOR INSERT TO authenticated WITH CHECK (true);


--
-- TOC entry 5082 (class 3256 OID 22354)
-- Name: location_audit_log audit_log_select_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY audit_log_select_policy ON public.location_audit_log FOR SELECT TO authenticated USING (public.has_role(ARRAY['admin'::text, 'supervisor'::text]));


--
-- TOC entry 4996 (class 0 OID 21319)
-- Dependencies: 385
-- Name: audit_logs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 5109 (class 3256 OID 32800)
-- Name: audit_logs audit_logs_insert_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY audit_logs_insert_policy ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (true);


--
-- TOC entry 5108 (class 3256 OID 32799)
-- Name: audit_logs audit_logs_select_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY audit_logs_select_policy ON public.audit_logs FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.auth_user_id = auth.uid()) AND (users.active = true) AND (users.role = 'admin'::text)))));


--
-- TOC entry 4997 (class 0 OID 21327)
-- Dependencies: 386
-- Name: booking_references; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.booking_references ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 5105 (class 3256 OID 32791)
-- Name: booking_references booking_references_all_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY booking_references_all_policy ON public.booking_references TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.auth_user_id = auth.uid()) AND (users.active = true) AND (users.role = ANY (ARRAY['admin'::text, 'supervisor'::text, 'operator'::text])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.auth_user_id = auth.uid()) AND (users.active = true) AND (users.role = ANY (ARRAY['admin'::text, 'supervisor'::text, 'operator'::text]))))));


--
-- TOC entry 5104 (class 3256 OID 32790)
-- Name: booking_references booking_references_select_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY booking_references_select_policy ON public.booking_references FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.auth_user_id = auth.uid()) AND (users.active = true) AND (users.role = ANY (ARRAY['admin'::text, 'supervisor'::text, 'operator'::text, 'client'::text]))))));


--
-- TOC entry 4998 (class 0 OID 21347)
-- Dependencies: 388
-- Name: client_pools; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.client_pools ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4999 (class 0 OID 21362)
-- Dependencies: 389
-- Name: clients; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 5107 (class 3256 OID 32794)
-- Name: clients clients_all_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY clients_all_policy ON public.clients TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.auth_user_id = auth.uid()) AND (users.active = true) AND (users.role = ANY (ARRAY['admin'::text, 'supervisor'::text])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.auth_user_id = auth.uid()) AND (users.active = true) AND (users.role = ANY (ARRAY['admin'::text, 'supervisor'::text]))))));


--
-- TOC entry 5083 (class 3256 OID 22355)
-- Name: clients clients_delete_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY clients_delete_policy ON public.clients FOR DELETE TO authenticated USING (true);


--
-- TOC entry 5084 (class 3256 OID 22356)
-- Name: clients clients_insert_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY clients_insert_policy ON public.clients FOR INSERT TO authenticated WITH CHECK (true);


--
-- TOC entry 5106 (class 3256 OID 32793)
-- Name: clients clients_select_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY clients_select_policy ON public.clients FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.auth_user_id = auth.uid()) AND (users.active = true)))));


--
-- TOC entry 5085 (class 3256 OID 22358)
-- Name: clients clients_update_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY clients_update_policy ON public.clients FOR UPDATE TO authenticated USING (true) WITH CHECK (true);


--
-- TOC entry 5021 (class 0 OID 38410)
-- Dependencies: 428
-- Name: container_buffer_zones; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.container_buffer_zones ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 5000 (class 0 OID 21383)
-- Dependencies: 390
-- Name: container_types; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.container_types ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 5001 (class 0 OID 21394)
-- Dependencies: 391
-- Name: containers; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.containers ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 5097 (class 3256 OID 32781)
-- Name: containers containers_delete_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY containers_delete_policy ON public.containers FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.auth_user_id = auth.uid()) AND (users.active = true) AND (users.role = 'admin'::text)))));


--
-- TOC entry 5095 (class 3256 OID 32778)
-- Name: containers containers_insert_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY containers_insert_policy ON public.containers FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.auth_user_id = auth.uid()) AND (users.active = true) AND (users.role = ANY (ARRAY['admin'::text, 'supervisor'::text, 'operator'::text]))))));


--
-- TOC entry 5094 (class 3256 OID 32777)
-- Name: containers containers_select_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY containers_select_policy ON public.containers FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.auth_user_id = auth.uid()) AND (users.active = true)))));


--
-- TOC entry 5096 (class 3256 OID 32779)
-- Name: containers containers_update_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY containers_update_policy ON public.containers FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.auth_user_id = auth.uid()) AND (users.active = true) AND (users.role = ANY (ARRAY['admin'::text, 'supervisor'::text])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.auth_user_id = auth.uid()) AND (users.active = true) AND (users.role = ANY (ARRAY['admin'::text, 'supervisor'::text]))))));


--
-- TOC entry 5004 (class 0 OID 21478)
-- Dependencies: 396
-- Name: edi_client_settings; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.edi_client_settings ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 5005 (class 0 OID 21491)
-- Dependencies: 397
-- Name: edi_server_configurations; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.edi_server_configurations ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 5003 (class 0 OID 21456)
-- Dependencies: 394
-- Name: edi_transmission_logs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.edi_transmission_logs ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 5099 (class 3256 OID 32783)
-- Name: gate_in_operations gate_in_insert_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY gate_in_insert_policy ON public.gate_in_operations FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.auth_user_id = auth.uid()) AND (users.active = true) AND (users.role = ANY (ARRAY['admin'::text, 'supervisor'::text, 'operator'::text]))))));


--
-- TOC entry 5002 (class 0 OID 21419)
-- Dependencies: 392
-- Name: gate_in_operations; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.gate_in_operations ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 5098 (class 3256 OID 32782)
-- Name: gate_in_operations gate_in_select_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY gate_in_select_policy ON public.gate_in_operations FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.auth_user_id = auth.uid()) AND (users.active = true) AND (users.role = ANY (ARRAY['admin'::text, 'supervisor'::text, 'operator'::text, 'client'::text]))))));


--
-- TOC entry 5100 (class 3256 OID 32784)
-- Name: gate_in_operations gate_in_update_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY gate_in_update_policy ON public.gate_in_operations FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.auth_user_id = auth.uid()) AND (users.active = true) AND (users.role = ANY (ARRAY['admin'::text, 'supervisor'::text, 'operator'::text])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.auth_user_id = auth.uid()) AND (users.active = true) AND (users.role = ANY (ARRAY['admin'::text, 'supervisor'::text, 'operator'::text]))))));


--
-- TOC entry 5102 (class 3256 OID 32787)
-- Name: gate_out_operations gate_out_insert_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY gate_out_insert_policy ON public.gate_out_operations FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.auth_user_id = auth.uid()) AND (users.active = true) AND (users.role = ANY (ARRAY['admin'::text, 'supervisor'::text, 'operator'::text]))))));


--
-- TOC entry 5006 (class 0 OID 21512)
-- Dependencies: 398
-- Name: gate_out_operations; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.gate_out_operations ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 5101 (class 3256 OID 32786)
-- Name: gate_out_operations gate_out_select_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY gate_out_select_policy ON public.gate_out_operations FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.auth_user_id = auth.uid()) AND (users.active = true) AND (users.role = ANY (ARRAY['admin'::text, 'supervisor'::text, 'operator'::text, 'client'::text]))))));


--
-- TOC entry 5103 (class 3256 OID 32788)
-- Name: gate_out_operations gate_out_update_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY gate_out_update_policy ON public.gate_out_operations FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.auth_user_id = auth.uid()) AND (users.active = true) AND (users.role = ANY (ARRAY['admin'::text, 'supervisor'::text, 'operator'::text])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.auth_user_id = auth.uid()) AND (users.active = true) AND (users.role = ANY (ARRAY['admin'::text, 'supervisor'::text, 'operator'::text]))))));


--
-- TOC entry 5007 (class 0 OID 21560)
-- Dependencies: 405
-- Name: location_audit_log; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.location_audit_log ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 5008 (class 0 OID 21568)
-- Dependencies: 406
-- Name: location_id_mappings; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.location_id_mappings ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 5009 (class 0 OID 21573)
-- Dependencies: 407
-- Name: locations; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 5086 (class 3256 OID 22359)
-- Name: locations locations_authenticated_access; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY locations_authenticated_access ON public.locations TO authenticated USING (true) WITH CHECK (true);


--
-- TOC entry 5526 (class 0 OID 0)
-- Dependencies: 5086
-- Name: POLICY locations_authenticated_access ON locations; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON POLICY locations_authenticated_access ON public.locations IS 'Allows authenticated users to manage locations for automatic stack operations';


--
-- TOC entry 5087 (class 3256 OID 22360)
-- Name: location_id_mappings mappings_delete_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY mappings_delete_policy ON public.location_id_mappings FOR DELETE TO authenticated USING (public.has_role(ARRAY['admin'::text]));


--
-- TOC entry 5088 (class 3256 OID 22361)
-- Name: location_id_mappings mappings_insert_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY mappings_insert_policy ON public.location_id_mappings FOR INSERT TO authenticated WITH CHECK (public.has_role(ARRAY['admin'::text]));


--
-- TOC entry 5089 (class 3256 OID 22362)
-- Name: location_id_mappings mappings_select_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY mappings_select_policy ON public.location_id_mappings FOR SELECT TO authenticated USING (true);


--
-- TOC entry 5046 (class 3256 OID 22363)
-- Name: location_id_mappings mappings_update_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY mappings_update_policy ON public.location_id_mappings FOR UPDATE TO authenticated USING (public.has_role(ARRAY['admin'::text])) WITH CHECK (public.has_role(ARRAY['admin'::text]));


--
-- TOC entry 5010 (class 0 OID 21606)
-- Dependencies: 410
-- Name: module_access_sync_log; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.module_access_sync_log ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 5011 (class 0 OID 21618)
-- Dependencies: 411
-- Name: sections; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 5012 (class 0 OID 21632)
-- Dependencies: 412
-- Name: stack_assignments; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.stack_assignments ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 5013 (class 0 OID 21641)
-- Dependencies: 413
-- Name: stack_pairings; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.stack_pairings ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 5048 (class 3256 OID 22364)
-- Name: stack_pairings stack_pairings_all_access; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY stack_pairings_all_access ON public.stack_pairings TO authenticated USING (true) WITH CHECK (true);


--
-- TOC entry 5527 (class 0 OID 0)
-- Dependencies: 5048
-- Name: POLICY stack_pairings_all_access ON stack_pairings; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON POLICY stack_pairings_all_access ON public.stack_pairings IS 'Allows authenticated users full access to stack pairings for automatic 40ft container management';


--
-- TOC entry 4995 (class 0 OID 21288)
-- Dependencies: 383
-- Name: stacks; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.stacks ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 5049 (class 3256 OID 22365)
-- Name: stacks stacks_delete_service_role; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY stacks_delete_service_role ON public.stacks FOR DELETE TO service_role USING (true);


--
-- TOC entry 5528 (class 0 OID 0)
-- Dependencies: 5049
-- Name: POLICY stacks_delete_service_role ON stacks; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON POLICY stacks_delete_service_role ON public.stacks IS 'Only service role can delete stacks (admin operations through API)';


--
-- TOC entry 5050 (class 3256 OID 22366)
-- Name: stacks stacks_delete_service_role_only; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY stacks_delete_service_role_only ON public.stacks FOR DELETE TO service_role USING (true);


--
-- TOC entry 5060 (class 3256 OID 22367)
-- Name: stacks stacks_insert_authenticated; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY stacks_insert_authenticated ON public.stacks FOR INSERT TO authenticated WITH CHECK (true);


--
-- TOC entry 5529 (class 0 OID 0)
-- Dependencies: 5060
-- Name: POLICY stacks_insert_authenticated ON stacks; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON POLICY stacks_insert_authenticated ON public.stacks IS 'Authenticated users can create stacks';


--
-- TOC entry 5061 (class 3256 OID 22368)
-- Name: stacks stacks_select_authenticated; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY stacks_select_authenticated ON public.stacks FOR SELECT TO authenticated USING (true);


--
-- TOC entry 5530 (class 0 OID 0)
-- Dependencies: 5061
-- Name: POLICY stacks_select_authenticated ON stacks; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON POLICY stacks_select_authenticated ON public.stacks IS 'Authenticated users can view all stacks';


--
-- TOC entry 5062 (class 3256 OID 22369)
-- Name: stacks stacks_service_role_delete; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY stacks_service_role_delete ON public.stacks FOR DELETE TO service_role USING (true);


--
-- TOC entry 5063 (class 3256 OID 22370)
-- Name: stacks stacks_update_authenticated; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY stacks_update_authenticated ON public.stacks FOR UPDATE TO authenticated USING (true) WITH CHECK (true);


--
-- TOC entry 5531 (class 0 OID 0)
-- Dependencies: 5063
-- Name: POLICY stacks_update_authenticated ON stacks; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON POLICY stacks_update_authenticated ON public.stacks IS 'Authenticated users can update stacks';


--
-- TOC entry 5016 (class 0 OID 21693)
-- Dependencies: 419
-- Name: user_activities; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.user_activities ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 5017 (class 0 OID 21701)
-- Dependencies: 420
-- Name: user_login_history; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.user_login_history ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 5014 (class 0 OID 21656)
-- Dependencies: 415
-- Name: user_module_access; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.user_module_access ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 5015 (class 0 OID 21668)
-- Dependencies: 416
-- Name: users; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 5111 (class 3256 OID 32805)
-- Name: users users_all_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY users_all_policy ON public.users TO authenticated USING (public.is_current_user_admin()) WITH CHECK (public.is_current_user_admin());


--
-- TOC entry 5071 (class 3256 OID 22371)
-- Name: users users_basic_access; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY users_basic_access ON public.users TO authenticated USING ((auth.uid() = auth_user_id)) WITH CHECK ((auth.uid() = auth_user_id));


--
-- TOC entry 5077 (class 3256 OID 22372)
-- Name: users users_delete_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY users_delete_policy ON public.users FOR DELETE TO authenticated USING (public.is_admin());


--
-- TOC entry 5532 (class 0 OID 0)
-- Dependencies: 5077
-- Name: POLICY users_delete_policy ON users; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON POLICY users_delete_policy ON public.users IS 'Only admin users can delete user records';


--
-- TOC entry 5078 (class 3256 OID 22373)
-- Name: users users_insert_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY users_insert_policy ON public.users FOR INSERT TO authenticated WITH CHECK (public.is_admin());


--
-- TOC entry 5533 (class 0 OID 0)
-- Dependencies: 5078
-- Name: POLICY users_insert_policy ON users; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON POLICY users_insert_policy ON public.users IS 'Only admin users can create new user records';


--
-- TOC entry 5110 (class 3256 OID 32804)
-- Name: users users_select_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY users_select_policy ON public.users FOR SELECT TO authenticated USING (((auth.uid() = auth_user_id) OR public.is_current_user_admin()));


--
-- TOC entry 5026 (class 3256 OID 22375)
-- Name: users users_service_role_access; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY users_service_role_access ON public.users TO service_role USING (true) WITH CHECK (true);


--
-- TOC entry 5036 (class 3256 OID 22376)
-- Name: users users_update_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY users_update_policy ON public.users FOR UPDATE TO authenticated USING (((auth.uid() = auth_user_id) OR public.is_admin())) WITH CHECK (((auth.uid() = auth_user_id) OR public.is_admin()));


--
-- TOC entry 5534 (class 0 OID 0)
-- Dependencies: 5036
-- Name: POLICY users_update_policy ON users; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON POLICY users_update_policy ON public.users IS 'Users can update their own profile, admins can update any user';


--
-- TOC entry 5090 (class 3256 OID 22377)
-- Name: virtual_stack_pairs virtual_pairs_delete_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY virtual_pairs_delete_policy ON public.virtual_stack_pairs FOR DELETE TO authenticated USING (public.has_role(ARRAY['admin'::text]));


--
-- TOC entry 5031 (class 3256 OID 22378)
-- Name: virtual_stack_pairs virtual_pairs_insert_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY virtual_pairs_insert_policy ON public.virtual_stack_pairs FOR INSERT TO authenticated WITH CHECK ((public.has_role(ARRAY['admin'::text, 'supervisor'::text]) AND public.has_yard_access(yard_id)));


--
-- TOC entry 5091 (class 3256 OID 22379)
-- Name: virtual_stack_pairs virtual_pairs_select_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY virtual_pairs_select_policy ON public.virtual_stack_pairs FOR SELECT TO authenticated USING ((public.has_role(ARRAY['admin'::text]) OR public.has_yard_access(yard_id)));


--
-- TOC entry 5092 (class 3256 OID 22380)
-- Name: virtual_stack_pairs virtual_pairs_update_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY virtual_pairs_update_policy ON public.virtual_stack_pairs FOR UPDATE TO authenticated USING ((public.has_role(ARRAY['admin'::text, 'supervisor'::text]) AND public.has_yard_access(yard_id))) WITH CHECK ((public.has_role(ARRAY['admin'::text, 'supervisor'::text]) AND public.has_yard_access(yard_id)));


--
-- TOC entry 5018 (class 0 OID 21724)
-- Dependencies: 423
-- Name: virtual_stack_pairs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.virtual_stack_pairs ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 5019 (class 0 OID 21734)
-- Dependencies: 424
-- Name: yards; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.yards ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 5020 (class 0 OID 21747)
-- Dependencies: 425
-- Name: messages; Type: ROW SECURITY; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 5125 (class 0 OID 0)
-- Dependencies: 88
-- Name: SCHEMA auth; Type: ACL; Schema: -; Owner: supabase_admin
--

GRANT USAGE ON SCHEMA auth TO anon;
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT USAGE ON SCHEMA auth TO service_role;
GRANT ALL ON SCHEMA auth TO supabase_auth_admin;
GRANT ALL ON SCHEMA auth TO dashboard_user;
GRANT USAGE ON SCHEMA auth TO postgres;


--
-- TOC entry 5127 (class 0 OID 0)
-- Dependencies: 90
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;


--
-- TOC entry 5128 (class 0 OID 0)
-- Dependencies: 91
-- Name: SCHEMA realtime; Type: ACL; Schema: -; Owner: supabase_admin
--

GRANT USAGE ON SCHEMA realtime TO postgres;
GRANT USAGE ON SCHEMA realtime TO anon;
GRANT USAGE ON SCHEMA realtime TO authenticated;
GRANT USAGE ON SCHEMA realtime TO service_role;
GRANT ALL ON SCHEMA realtime TO supabase_realtime_admin;


--
-- TOC entry 5130 (class 0 OID 0)
-- Dependencies: 519
-- Name: FUNCTION email(); Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON FUNCTION auth.email() TO dashboard_user;


--
-- TOC entry 5131 (class 0 OID 0)
-- Dependencies: 612
-- Name: FUNCTION jwt(); Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON FUNCTION auth.jwt() TO postgres;
GRANT ALL ON FUNCTION auth.jwt() TO dashboard_user;


--
-- TOC entry 5133 (class 0 OID 0)
-- Dependencies: 448
-- Name: FUNCTION role(); Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON FUNCTION auth.role() TO dashboard_user;


--
-- TOC entry 5135 (class 0 OID 0)
-- Dependencies: 477
-- Name: FUNCTION uid(); Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON FUNCTION auth.uid() TO dashboard_user;


--
-- TOC entry 5136 (class 0 OID 0)
-- Dependencies: 539
-- Name: FUNCTION add_container_audit_log(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.add_container_audit_log() TO anon;
GRANT ALL ON FUNCTION public.add_container_audit_log() TO authenticated;
GRANT ALL ON FUNCTION public.add_container_audit_log() TO service_role;


--
-- TOC entry 5137 (class 0 OID 0)
-- Dependencies: 570
-- Name: FUNCTION analyze_location_query_performance(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.analyze_location_query_performance() TO anon;
GRANT ALL ON FUNCTION public.analyze_location_query_performance() TO authenticated;
GRANT ALL ON FUNCTION public.analyze_location_query_performance() TO service_role;


--
-- TOC entry 5139 (class 0 OID 0)
-- Dependencies: 550
-- Name: FUNCTION analyze_module_access_performance(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.analyze_module_access_performance() TO anon;
GRANT ALL ON FUNCTION public.analyze_module_access_performance() TO authenticated;
GRANT ALL ON FUNCTION public.analyze_module_access_performance() TO service_role;


--
-- TOC entry 5141 (class 0 OID 0)
-- Dependencies: 605
-- Name: FUNCTION assign_container_to_location(p_location_id text, p_container_id uuid, p_container_number text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.assign_container_to_location(p_location_id text, p_container_id uuid, p_container_number text) TO anon;
GRANT ALL ON FUNCTION public.assign_container_to_location(p_location_id text, p_container_id uuid, p_container_number text) TO authenticated;
GRANT ALL ON FUNCTION public.assign_container_to_location(p_location_id text, p_container_id uuid, p_container_number text) TO service_role;


--
-- TOC entry 5142 (class 0 OID 0)
-- Dependencies: 553
-- Name: FUNCTION auto_create_edi_transmission_on_gate_completion(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.auto_create_edi_transmission_on_gate_completion() TO anon;
GRANT ALL ON FUNCTION public.auto_create_edi_transmission_on_gate_completion() TO authenticated;
GRANT ALL ON FUNCTION public.auto_create_edi_transmission_on_gate_completion() TO service_role;


--
-- TOC entry 5144 (class 0 OID 0)
-- Dependencies: 635
-- Name: FUNCTION auto_mark_buffer_zones(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.auto_mark_buffer_zones() TO anon;
GRANT ALL ON FUNCTION public.auto_mark_buffer_zones() TO authenticated;
GRANT ALL ON FUNCTION public.auto_mark_buffer_zones() TO service_role;


--
-- TOC entry 5145 (class 0 OID 0)
-- Dependencies: 485
-- Name: FUNCTION calculate_session_duration(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.calculate_session_duration() TO anon;
GRANT ALL ON FUNCTION public.calculate_session_duration() TO authenticated;
GRANT ALL ON FUNCTION public.calculate_session_duration() TO service_role;


--
-- TOC entry 5146 (class 0 OID 0)
-- Dependencies: 487
-- Name: FUNCTION calculate_stack_capacity(p_rows integer, p_max_tiers integer, p_row_tier_config jsonb); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.calculate_stack_capacity(p_rows integer, p_max_tiers integer, p_row_tier_config jsonb) TO anon;
GRANT ALL ON FUNCTION public.calculate_stack_capacity(p_rows integer, p_max_tiers integer, p_row_tier_config jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.calculate_stack_capacity(p_rows integer, p_max_tiers integer, p_row_tier_config jsonb) TO service_role;


--
-- TOC entry 5148 (class 0 OID 0)
-- Dependencies: 619
-- Name: FUNCTION check_container_deletion_constraints(container_uuid uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.check_container_deletion_constraints(container_uuid uuid) TO anon;
GRANT ALL ON FUNCTION public.check_container_deletion_constraints(container_uuid uuid) TO authenticated;
GRANT ALL ON FUNCTION public.check_container_deletion_constraints(container_uuid uuid) TO service_role;


--
-- TOC entry 5150 (class 0 OID 0)
-- Dependencies: 457
-- Name: FUNCTION check_row_reduction_safety(p_stack_id uuid, p_new_row_count integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.check_row_reduction_safety(p_stack_id uuid, p_new_row_count integer) TO anon;
GRANT ALL ON FUNCTION public.check_row_reduction_safety(p_stack_id uuid, p_new_row_count integer) TO authenticated;
GRANT ALL ON FUNCTION public.check_row_reduction_safety(p_stack_id uuid, p_new_row_count integer) TO service_role;


--
-- TOC entry 5151 (class 0 OID 0)
-- Dependencies: 474
-- Name: FUNCTION cleanup_old_edi_logs(p_days_to_keep integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.cleanup_old_edi_logs(p_days_to_keep integer) TO anon;
GRANT ALL ON FUNCTION public.cleanup_old_edi_logs(p_days_to_keep integer) TO authenticated;
GRANT ALL ON FUNCTION public.cleanup_old_edi_logs(p_days_to_keep integer) TO service_role;


--
-- TOC entry 5153 (class 0 OID 0)
-- Dependencies: 577
-- Name: FUNCTION create_virtual_stacks(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.create_virtual_stacks() TO anon;
GRANT ALL ON FUNCTION public.create_virtual_stacks() TO authenticated;
GRANT ALL ON FUNCTION public.create_virtual_stacks() TO service_role;


--
-- TOC entry 5154 (class 0 OID 0)
-- Dependencies: 461
-- Name: FUNCTION generate_locations_for_stack(p_stack_id uuid, p_yard_id text, p_stack_number integer, p_rows integer, p_max_tiers integer, p_is_virtual boolean, p_virtual_stack_pair_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.generate_locations_for_stack(p_stack_id uuid, p_yard_id text, p_stack_number integer, p_rows integer, p_max_tiers integer, p_is_virtual boolean, p_virtual_stack_pair_id uuid) TO anon;
GRANT ALL ON FUNCTION public.generate_locations_for_stack(p_stack_id uuid, p_yard_id text, p_stack_number integer, p_rows integer, p_max_tiers integer, p_is_virtual boolean, p_virtual_stack_pair_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.generate_locations_for_stack(p_stack_id uuid, p_yard_id text, p_stack_number integer, p_rows integer, p_max_tiers integer, p_is_virtual boolean, p_virtual_stack_pair_id uuid) TO service_role;


--
-- TOC entry 5156 (class 0 OID 0)
-- Dependencies: 617
-- Name: FUNCTION get_buffer_zone_stats(p_yard_id text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_buffer_zone_stats(p_yard_id text) TO anon;
GRANT ALL ON FUNCTION public.get_buffer_zone_stats(p_yard_id text) TO authenticated;
GRANT ALL ON FUNCTION public.get_buffer_zone_stats(p_yard_id text) TO service_role;


--
-- TOC entry 5157 (class 0 OID 0)
-- Dependencies: 543
-- Name: FUNCTION get_client_edi_status(p_client_code text, p_client_name text, p_operation text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_client_edi_status(p_client_code text, p_client_name text, p_operation text) TO anon;
GRANT ALL ON FUNCTION public.get_client_edi_status(p_client_code text, p_client_name text, p_operation text) TO authenticated;
GRANT ALL ON FUNCTION public.get_client_edi_status(p_client_code text, p_client_name text, p_operation text) TO service_role;


--
-- TOC entry 5159 (class 0 OID 0)
-- Dependencies: 622
-- Name: FUNCTION get_container_audit_logs(container_id_param uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_container_audit_logs(container_id_param uuid) TO anon;
GRANT ALL ON FUNCTION public.get_container_audit_logs(container_id_param uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_container_audit_logs(container_id_param uuid) TO service_role;


--
-- TOC entry 5160 (class 0 OID 0)
-- Dependencies: 460
-- Name: FUNCTION get_current_user_role(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_current_user_role() TO anon;
GRANT ALL ON FUNCTION public.get_current_user_role() TO authenticated;
GRANT ALL ON FUNCTION public.get_current_user_role() TO service_role;


--
-- TOC entry 5161 (class 0 OID 0)
-- Dependencies: 586
-- Name: FUNCTION get_edi_config_for_client(p_client_code text, p_client_name text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_edi_config_for_client(p_client_code text, p_client_name text) TO anon;
GRANT ALL ON FUNCTION public.get_edi_config_for_client(p_client_code text, p_client_name text) TO authenticated;
GRANT ALL ON FUNCTION public.get_edi_config_for_client(p_client_code text, p_client_name text) TO service_role;


--
-- TOC entry 5162 (class 0 OID 0)
-- Dependencies: 444
-- Name: FUNCTION get_edi_realtime_stats(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_edi_realtime_stats() TO anon;
GRANT ALL ON FUNCTION public.get_edi_realtime_stats() TO authenticated;
GRANT ALL ON FUNCTION public.get_edi_realtime_stats() TO service_role;


--
-- TOC entry 5163 (class 0 OID 0)
-- Dependencies: 445
-- Name: FUNCTION get_edi_system_health(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_edi_system_health() TO anon;
GRANT ALL ON FUNCTION public.get_edi_system_health() TO authenticated;
GRANT ALL ON FUNCTION public.get_edi_system_health() TO service_role;


--
-- TOC entry 5165 (class 0 OID 0)
-- Dependencies: 581
-- Name: FUNCTION get_recent_audit_activity(limit_count integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_recent_audit_activity(limit_count integer) TO anon;
GRANT ALL ON FUNCTION public.get_recent_audit_activity(limit_count integer) TO authenticated;
GRANT ALL ON FUNCTION public.get_recent_audit_activity(limit_count integer) TO service_role;


--
-- TOC entry 5167 (class 0 OID 0)
-- Dependencies: 489
-- Name: FUNCTION get_sync_inconsistencies(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_sync_inconsistencies() TO anon;
GRANT ALL ON FUNCTION public.get_sync_inconsistencies() TO authenticated;
GRANT ALL ON FUNCTION public.get_sync_inconsistencies() TO service_role;


--
-- TOC entry 5169 (class 0 OID 0)
-- Dependencies: 563
-- Name: FUNCTION get_sync_query_recommendations(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_sync_query_recommendations() TO anon;
GRANT ALL ON FUNCTION public.get_sync_query_recommendations() TO authenticated;
GRANT ALL ON FUNCTION public.get_sync_query_recommendations() TO service_role;


--
-- TOC entry 5171 (class 0 OID 0)
-- Dependencies: 512
-- Name: FUNCTION get_sync_statistics(p_user_id uuid, p_days_back integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_sync_statistics(p_user_id uuid, p_days_back integer) TO anon;
GRANT ALL ON FUNCTION public.get_sync_statistics(p_user_id uuid, p_days_back integer) TO authenticated;
GRANT ALL ON FUNCTION public.get_sync_statistics(p_user_id uuid, p_days_back integer) TO service_role;


--
-- TOC entry 5172 (class 0 OID 0)
-- Dependencies: 592
-- Name: FUNCTION get_virtual_stack_for_odd(odd_stack integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_virtual_stack_for_odd(odd_stack integer) TO anon;
GRANT ALL ON FUNCTION public.get_virtual_stack_for_odd(odd_stack integer) TO authenticated;
GRANT ALL ON FUNCTION public.get_virtual_stack_for_odd(odd_stack integer) TO service_role;


--
-- TOC entry 5174 (class 0 OID 0)
-- Dependencies: 499
-- Name: FUNCTION handle_stack_soft_delete(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.handle_stack_soft_delete() TO anon;
GRANT ALL ON FUNCTION public.handle_stack_soft_delete() TO authenticated;
GRANT ALL ON FUNCTION public.handle_stack_soft_delete() TO service_role;


--
-- TOC entry 5176 (class 0 OID 0)
-- Dependencies: 585
-- Name: FUNCTION has_admin_users(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.has_admin_users() TO anon;
GRANT ALL ON FUNCTION public.has_admin_users() TO authenticated;
GRANT ALL ON FUNCTION public.has_admin_users() TO service_role;


--
-- TOC entry 5178 (class 0 OID 0)
-- Dependencies: 466
-- Name: FUNCTION has_client_pool_access(check_pool_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.has_client_pool_access(check_pool_id uuid) TO anon;
GRANT ALL ON FUNCTION public.has_client_pool_access(check_pool_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.has_client_pool_access(check_pool_id uuid) TO service_role;


--
-- TOC entry 5180 (class 0 OID 0)
-- Dependencies: 464
-- Name: FUNCTION has_role(required_roles text[]); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.has_role(required_roles text[]) TO anon;
GRANT ALL ON FUNCTION public.has_role(required_roles text[]) TO authenticated;
GRANT ALL ON FUNCTION public.has_role(required_roles text[]) TO service_role;


--
-- TOC entry 5182 (class 0 OID 0)
-- Dependencies: 582
-- Name: FUNCTION has_yard_access(check_yard_id text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.has_yard_access(check_yard_id text) TO anon;
GRANT ALL ON FUNCTION public.has_yard_access(check_yard_id text) TO authenticated;
GRANT ALL ON FUNCTION public.has_yard_access(check_yard_id text) TO service_role;


--
-- TOC entry 5183 (class 0 OID 0)
-- Dependencies: 579
-- Name: FUNCTION initialize_client_edi_settings(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.initialize_client_edi_settings() TO anon;
GRANT ALL ON FUNCTION public.initialize_client_edi_settings() TO authenticated;
GRANT ALL ON FUNCTION public.initialize_client_edi_settings() TO service_role;


--
-- TOC entry 5185 (class 0 OID 0)
-- Dependencies: 627
-- Name: FUNCTION is_admin(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.is_admin() TO anon;
GRANT ALL ON FUNCTION public.is_admin() TO authenticated;
GRANT ALL ON FUNCTION public.is_admin() TO service_role;


--
-- TOC entry 5186 (class 0 OID 0)
-- Dependencies: 608
-- Name: FUNCTION is_current_user_active(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.is_current_user_active() TO anon;
GRANT ALL ON FUNCTION public.is_current_user_active() TO authenticated;
GRANT ALL ON FUNCTION public.is_current_user_active() TO service_role;


--
-- TOC entry 5187 (class 0 OID 0)
-- Dependencies: 558
-- Name: FUNCTION is_current_user_admin(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.is_current_user_admin() TO anon;
GRANT ALL ON FUNCTION public.is_current_user_admin() TO authenticated;
GRANT ALL ON FUNCTION public.is_current_user_admin() TO service_role;


--
-- TOC entry 5189 (class 0 OID 0)
-- Dependencies: 610
-- Name: FUNCTION is_location_available(p_location_id text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.is_location_available(p_location_id text) TO anon;
GRANT ALL ON FUNCTION public.is_location_available(p_location_id text) TO authenticated;
GRANT ALL ON FUNCTION public.is_location_available(p_location_id text) TO service_role;


--
-- TOC entry 5191 (class 0 OID 0)
-- Dependencies: 575
-- Name: FUNCTION is_location_valid_for_stack(p_stack_number integer, p_row_number integer, p_tier_number integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.is_location_valid_for_stack(p_stack_number integer, p_row_number integer, p_tier_number integer) TO anon;
GRANT ALL ON FUNCTION public.is_location_valid_for_stack(p_stack_number integer, p_row_number integer, p_tier_number integer) TO authenticated;
GRANT ALL ON FUNCTION public.is_location_valid_for_stack(p_stack_number integer, p_row_number integer, p_tier_number integer) TO service_role;


--
-- TOC entry 5192 (class 0 OID 0)
-- Dependencies: 568
-- Name: FUNCTION log_edi_transmission(p_container_number text, p_operation text, p_container_id uuid, p_gate_operation_id uuid, p_client_id uuid, p_config_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.log_edi_transmission(p_container_number text, p_operation text, p_container_id uuid, p_gate_operation_id uuid, p_client_id uuid, p_config_id uuid) TO anon;
GRANT ALL ON FUNCTION public.log_edi_transmission(p_container_number text, p_operation text, p_container_id uuid, p_gate_operation_id uuid, p_client_id uuid, p_config_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.log_edi_transmission(p_container_number text, p_operation text, p_container_id uuid, p_gate_operation_id uuid, p_client_id uuid, p_config_id uuid) TO service_role;


--
-- TOC entry 5193 (class 0 OID 0)
-- Dependencies: 545
-- Name: FUNCTION log_location_changes(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.log_location_changes() TO anon;
GRANT ALL ON FUNCTION public.log_location_changes() TO authenticated;
GRANT ALL ON FUNCTION public.log_location_changes() TO service_role;


--
-- TOC entry 5195 (class 0 OID 0)
-- Dependencies: 559
-- Name: FUNCTION log_module_access_sync(p_user_id uuid, p_sync_type text, p_source_table text, p_target_table text, p_old_permissions jsonb, p_new_permissions jsonb, p_sync_status text, p_error_message text, p_sync_duration_ms integer, p_created_by uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.log_module_access_sync(p_user_id uuid, p_sync_type text, p_source_table text, p_target_table text, p_old_permissions jsonb, p_new_permissions jsonb, p_sync_status text, p_error_message text, p_sync_duration_ms integer, p_created_by uuid) TO anon;
GRANT ALL ON FUNCTION public.log_module_access_sync(p_user_id uuid, p_sync_type text, p_source_table text, p_target_table text, p_old_permissions jsonb, p_new_permissions jsonb, p_sync_status text, p_error_message text, p_sync_duration_ms integer, p_created_by uuid) TO authenticated;
GRANT ALL ON FUNCTION public.log_module_access_sync(p_user_id uuid, p_sync_type text, p_source_table text, p_target_table text, p_old_permissions jsonb, p_new_permissions jsonb, p_sync_status text, p_error_message text, p_sync_duration_ms integer, p_created_by uuid) TO service_role;


--
-- TOC entry 5197 (class 0 OID 0)
-- Dependencies: 453
-- Name: FUNCTION log_user_activity(p_user_id uuid, p_action character varying, p_entity_type character varying, p_entity_id uuid, p_description text, p_metadata jsonb, p_ip_address character varying, p_user_agent text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.log_user_activity(p_user_id uuid, p_action character varying, p_entity_type character varying, p_entity_id uuid, p_description text, p_metadata jsonb, p_ip_address character varying, p_user_agent text) TO anon;
GRANT ALL ON FUNCTION public.log_user_activity(p_user_id uuid, p_action character varying, p_entity_type character varying, p_entity_id uuid, p_description text, p_metadata jsonb, p_ip_address character varying, p_user_agent text) TO authenticated;
GRANT ALL ON FUNCTION public.log_user_activity(p_user_id uuid, p_action character varying, p_entity_type character varying, p_entity_id uuid, p_description text, p_metadata jsonb, p_ip_address character varying, p_user_agent text) TO service_role;


--
-- TOC entry 5198 (class 0 OID 0)
-- Dependencies: 504
-- Name: FUNCTION migrate_40ft_container_locations(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.migrate_40ft_container_locations() TO anon;
GRANT ALL ON FUNCTION public.migrate_40ft_container_locations() TO authenticated;
GRANT ALL ON FUNCTION public.migrate_40ft_container_locations() TO service_role;


--
-- TOC entry 5200 (class 0 OID 0)
-- Dependencies: 613
-- Name: FUNCTION permanently_delete_inactive_stack(p_stack_id uuid, p_deleted_by text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.permanently_delete_inactive_stack(p_stack_id uuid, p_deleted_by text) TO anon;
GRANT ALL ON FUNCTION public.permanently_delete_inactive_stack(p_stack_id uuid, p_deleted_by text) TO authenticated;
GRANT ALL ON FUNCTION public.permanently_delete_inactive_stack(p_stack_id uuid, p_deleted_by text) TO service_role;


--
-- TOC entry 5201 (class 0 OID 0)
-- Dependencies: 450
-- Name: FUNCTION process_gate_in_edi(p_operation_id uuid, p_container_number text, p_client_code text, p_container_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.process_gate_in_edi(p_operation_id uuid, p_container_number text, p_client_code text, p_container_id uuid) TO anon;
GRANT ALL ON FUNCTION public.process_gate_in_edi(p_operation_id uuid, p_container_number text, p_client_code text, p_container_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.process_gate_in_edi(p_operation_id uuid, p_container_number text, p_client_code text, p_container_id uuid) TO service_role;


--
-- TOC entry 5202 (class 0 OID 0)
-- Dependencies: 481
-- Name: FUNCTION process_gate_out_edi(p_operation_id uuid, p_booking_number text, p_client_code text, p_processed_container_ids jsonb); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.process_gate_out_edi(p_operation_id uuid, p_booking_number text, p_client_code text, p_processed_container_ids jsonb) TO anon;
GRANT ALL ON FUNCTION public.process_gate_out_edi(p_operation_id uuid, p_booking_number text, p_client_code text, p_processed_container_ids jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.process_gate_out_edi(p_operation_id uuid, p_booking_number text, p_client_code text, p_processed_container_ids jsonb) TO service_role;


--
-- TOC entry 5204 (class 0 OID 0)
-- Dependencies: 468
-- Name: FUNCTION record_failed_login(p_email character varying, p_failure_reason text, p_ip_address character varying, p_user_agent text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.record_failed_login(p_email character varying, p_failure_reason text, p_ip_address character varying, p_user_agent text) TO anon;
GRANT ALL ON FUNCTION public.record_failed_login(p_email character varying, p_failure_reason text, p_ip_address character varying, p_user_agent text) TO authenticated;
GRANT ALL ON FUNCTION public.record_failed_login(p_email character varying, p_failure_reason text, p_ip_address character varying, p_user_agent text) TO service_role;


--
-- TOC entry 5206 (class 0 OID 0)
-- Dependencies: 593
-- Name: FUNCTION record_user_login(p_user_id uuid, p_ip_address character varying, p_user_agent text, p_login_method character varying, p_device_info jsonb); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.record_user_login(p_user_id uuid, p_ip_address character varying, p_user_agent text, p_login_method character varying, p_device_info jsonb) TO anon;
GRANT ALL ON FUNCTION public.record_user_login(p_user_id uuid, p_ip_address character varying, p_user_agent text, p_login_method character varying, p_device_info jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.record_user_login(p_user_id uuid, p_ip_address character varying, p_user_agent text, p_login_method character varying, p_device_info jsonb) TO service_role;


--
-- TOC entry 5208 (class 0 OID 0)
-- Dependencies: 532
-- Name: FUNCTION record_user_logout(p_login_id uuid, p_user_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.record_user_logout(p_login_id uuid, p_user_id uuid) TO anon;
GRANT ALL ON FUNCTION public.record_user_logout(p_login_id uuid, p_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.record_user_logout(p_login_id uuid, p_user_id uuid) TO service_role;


--
-- TOC entry 5210 (class 0 OID 0)
-- Dependencies: 566
-- Name: FUNCTION recreate_stack_with_location_recovery(p_yard_id text, p_stack_number integer, p_section_name text, p_rows integer, p_max_tiers integer, p_created_by text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.recreate_stack_with_location_recovery(p_yard_id text, p_stack_number integer, p_section_name text, p_rows integer, p_max_tiers integer, p_created_by text) TO anon;
GRANT ALL ON FUNCTION public.recreate_stack_with_location_recovery(p_yard_id text, p_stack_number integer, p_section_name text, p_rows integer, p_max_tiers integer, p_created_by text) TO authenticated;
GRANT ALL ON FUNCTION public.recreate_stack_with_location_recovery(p_yard_id text, p_stack_number integer, p_section_name text, p_rows integer, p_max_tiers integer, p_created_by text) TO service_role;


--
-- TOC entry 5211 (class 0 OID 0)
-- Dependencies: 620
-- Name: FUNCTION refresh_edi_client_performance(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.refresh_edi_client_performance() TO anon;
GRANT ALL ON FUNCTION public.refresh_edi_client_performance() TO authenticated;
GRANT ALL ON FUNCTION public.refresh_edi_client_performance() TO service_role;


--
-- TOC entry 5212 (class 0 OID 0)
-- Dependencies: 521
-- Name: FUNCTION refresh_edi_dashboard_stats(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.refresh_edi_dashboard_stats() TO anon;
GRANT ALL ON FUNCTION public.refresh_edi_dashboard_stats() TO authenticated;
GRANT ALL ON FUNCTION public.refresh_edi_dashboard_stats() TO service_role;


--
-- TOC entry 5214 (class 0 OID 0)
-- Dependencies: 471
-- Name: FUNCTION refresh_location_statistics(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.refresh_location_statistics() TO anon;
GRANT ALL ON FUNCTION public.refresh_location_statistics() TO authenticated;
GRANT ALL ON FUNCTION public.refresh_location_statistics() TO service_role;


--
-- TOC entry 5216 (class 0 OID 0)
-- Dependencies: 493
-- Name: FUNCTION refresh_sync_health_summary(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.refresh_sync_health_summary() TO anon;
GRANT ALL ON FUNCTION public.refresh_sync_health_summary() TO authenticated;
GRANT ALL ON FUNCTION public.refresh_sync_health_summary() TO service_role;


--
-- TOC entry 5218 (class 0 OID 0)
-- Dependencies: 604
-- Name: FUNCTION release_location(p_location_id text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.release_location(p_location_id text) TO anon;
GRANT ALL ON FUNCTION public.release_location(p_location_id text) TO authenticated;
GRANT ALL ON FUNCTION public.release_location(p_location_id text) TO service_role;


--
-- TOC entry 5220 (class 0 OID 0)
-- Dependencies: 562
-- Name: FUNCTION restore_container(container_uuid uuid, user_uuid uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.restore_container(container_uuid uuid, user_uuid uuid) TO anon;
GRANT ALL ON FUNCTION public.restore_container(container_uuid uuid, user_uuid uuid) TO authenticated;
GRANT ALL ON FUNCTION public.restore_container(container_uuid uuid, user_uuid uuid) TO service_role;


--
-- TOC entry 5221 (class 0 OID 0)
-- Dependencies: 523
-- Name: FUNCTION restore_user(user_id uuid, restored_by text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.restore_user(user_id uuid, restored_by text) TO anon;
GRANT ALL ON FUNCTION public.restore_user(user_id uuid, restored_by text) TO authenticated;
GRANT ALL ON FUNCTION public.restore_user(user_id uuid, restored_by text) TO service_role;


--
-- TOC entry 5223 (class 0 OID 0)
-- Dependencies: 542
-- Name: FUNCTION search_container_audit_logs(action_type text, user_name_filter text, from_date timestamp with time zone, to_date timestamp with time zone); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.search_container_audit_logs(action_type text, user_name_filter text, from_date timestamp with time zone, to_date timestamp with time zone) TO anon;
GRANT ALL ON FUNCTION public.search_container_audit_logs(action_type text, user_name_filter text, from_date timestamp with time zone, to_date timestamp with time zone) TO authenticated;
GRANT ALL ON FUNCTION public.search_container_audit_logs(action_type text, user_name_filter text, from_date timestamp with time zone, to_date timestamp with time zone) TO service_role;


--
-- TOC entry 5225 (class 0 OID 0)
-- Dependencies: 494
-- Name: FUNCTION soft_delete_container(container_uuid uuid, user_uuid uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.soft_delete_container(container_uuid uuid, user_uuid uuid) TO anon;
GRANT ALL ON FUNCTION public.soft_delete_container(container_uuid uuid, user_uuid uuid) TO authenticated;
GRANT ALL ON FUNCTION public.soft_delete_container(container_uuid uuid, user_uuid uuid) TO service_role;


--
-- TOC entry 5227 (class 0 OID 0)
-- Dependencies: 609
-- Name: FUNCTION soft_delete_stack(p_stack_id uuid, p_deleted_by text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.soft_delete_stack(p_stack_id uuid, p_deleted_by text) TO anon;
GRANT ALL ON FUNCTION public.soft_delete_stack(p_stack_id uuid, p_deleted_by text) TO authenticated;
GRANT ALL ON FUNCTION public.soft_delete_stack(p_stack_id uuid, p_deleted_by text) TO service_role;


--
-- TOC entry 5228 (class 0 OID 0)
-- Dependencies: 458
-- Name: FUNCTION trigger_gate_in_edi(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.trigger_gate_in_edi() TO anon;
GRANT ALL ON FUNCTION public.trigger_gate_in_edi() TO authenticated;
GRANT ALL ON FUNCTION public.trigger_gate_in_edi() TO service_role;


--
-- TOC entry 5229 (class 0 OID 0)
-- Dependencies: 469
-- Name: FUNCTION trigger_gate_out_edi(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.trigger_gate_out_edi() TO anon;
GRANT ALL ON FUNCTION public.trigger_gate_out_edi() TO authenticated;
GRANT ALL ON FUNCTION public.trigger_gate_out_edi() TO service_role;


--
-- TOC entry 5230 (class 0 OID 0)
-- Dependencies: 606
-- Name: FUNCTION trigger_refresh_location_statistics(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.trigger_refresh_location_statistics() TO anon;
GRANT ALL ON FUNCTION public.trigger_refresh_location_statistics() TO authenticated;
GRANT ALL ON FUNCTION public.trigger_refresh_location_statistics() TO service_role;


--
-- TOC entry 5231 (class 0 OID 0)
-- Dependencies: 597
-- Name: FUNCTION trigger_update_stack_occupancy(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.trigger_update_stack_occupancy() TO anon;
GRANT ALL ON FUNCTION public.trigger_update_stack_occupancy() TO authenticated;
GRANT ALL ON FUNCTION public.trigger_update_stack_occupancy() TO service_role;


--
-- TOC entry 5232 (class 0 OID 0)
-- Dependencies: 587
-- Name: FUNCTION update_booking_references_updated_at(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_booking_references_updated_at() TO anon;
GRANT ALL ON FUNCTION public.update_booking_references_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.update_booking_references_updated_at() TO service_role;


--
-- TOC entry 5233 (class 0 OID 0)
-- Dependencies: 447
-- Name: FUNCTION update_buffer_zone_flags(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_buffer_zone_flags() TO anon;
GRANT ALL ON FUNCTION public.update_buffer_zone_flags() TO authenticated;
GRANT ALL ON FUNCTION public.update_buffer_zone_flags() TO service_role;


--
-- TOC entry 5234 (class 0 OID 0)
-- Dependencies: 500
-- Name: FUNCTION update_buffer_zone_updated_at(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_buffer_zone_updated_at() TO anon;
GRANT ALL ON FUNCTION public.update_buffer_zone_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.update_buffer_zone_updated_at() TO service_role;


--
-- TOC entry 5235 (class 0 OID 0)
-- Dependencies: 625
-- Name: FUNCTION update_client_pools_updated_at(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_client_pools_updated_at() TO anon;
GRANT ALL ON FUNCTION public.update_client_pools_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.update_client_pools_updated_at() TO service_role;


--
-- TOC entry 5237 (class 0 OID 0)
-- Dependencies: 538
-- Name: FUNCTION update_containers_damage_assessed_at(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_containers_damage_assessed_at() TO anon;
GRANT ALL ON FUNCTION public.update_containers_damage_assessed_at() TO authenticated;
GRANT ALL ON FUNCTION public.update_containers_damage_assessed_at() TO service_role;


--
-- TOC entry 5239 (class 0 OID 0)
-- Dependencies: 591
-- Name: FUNCTION update_damage_assessed_at(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_damage_assessed_at() TO anon;
GRANT ALL ON FUNCTION public.update_damage_assessed_at() TO authenticated;
GRANT ALL ON FUNCTION public.update_damage_assessed_at() TO service_role;


--
-- TOC entry 5240 (class 0 OID 0)
-- Dependencies: 564
-- Name: FUNCTION update_edi_transmission_status(p_log_id uuid, p_status text, p_error_message text, p_file_content text, p_file_size integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_edi_transmission_status(p_log_id uuid, p_status text, p_error_message text, p_file_content text, p_file_size integer) TO anon;
GRANT ALL ON FUNCTION public.update_edi_transmission_status(p_log_id uuid, p_status text, p_error_message text, p_file_content text, p_file_size integer) TO authenticated;
GRANT ALL ON FUNCTION public.update_edi_transmission_status(p_log_id uuid, p_status text, p_error_message text, p_file_content text, p_file_size integer) TO service_role;


--
-- TOC entry 5242 (class 0 OID 0)
-- Dependencies: 506
-- Name: FUNCTION update_gate_in_damage_assessed_at(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_gate_in_damage_assessed_at() TO anon;
GRANT ALL ON FUNCTION public.update_gate_in_damage_assessed_at() TO authenticated;
GRANT ALL ON FUNCTION public.update_gate_in_damage_assessed_at() TO service_role;


--
-- TOC entry 5243 (class 0 OID 0)
-- Dependencies: 636
-- Name: FUNCTION update_gate_out_containers_updated_at(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_gate_out_containers_updated_at() TO anon;
GRANT ALL ON FUNCTION public.update_gate_out_containers_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.update_gate_out_containers_updated_at() TO service_role;


--
-- TOC entry 5244 (class 0 OID 0)
-- Dependencies: 470
-- Name: FUNCTION update_locations_updated_at(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_locations_updated_at() TO anon;
GRANT ALL ON FUNCTION public.update_locations_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.update_locations_updated_at() TO service_role;


--
-- TOC entry 5246 (class 0 OID 0)
-- Dependencies: 544
-- Name: FUNCTION update_stack_capacity(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_stack_capacity() TO anon;
GRANT ALL ON FUNCTION public.update_stack_capacity() TO authenticated;
GRANT ALL ON FUNCTION public.update_stack_capacity() TO service_role;


--
-- TOC entry 5247 (class 0 OID 0)
-- Dependencies: 492
-- Name: FUNCTION update_stack_capacity_on_config_change(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_stack_capacity_on_config_change() TO anon;
GRANT ALL ON FUNCTION public.update_stack_capacity_on_config_change() TO authenticated;
GRANT ALL ON FUNCTION public.update_stack_capacity_on_config_change() TO service_role;


--
-- TOC entry 5248 (class 0 OID 0)
-- Dependencies: 440
-- Name: FUNCTION update_stack_occupancy(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_stack_occupancy() TO anon;
GRANT ALL ON FUNCTION public.update_stack_occupancy() TO authenticated;
GRANT ALL ON FUNCTION public.update_stack_occupancy() TO service_role;


--
-- TOC entry 5249 (class 0 OID 0)
-- Dependencies: 551
-- Name: FUNCTION update_updated_at_column(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_updated_at_column() TO anon;
GRANT ALL ON FUNCTION public.update_updated_at_column() TO authenticated;
GRANT ALL ON FUNCTION public.update_updated_at_column() TO service_role;


--
-- TOC entry 5250 (class 0 OID 0)
-- Dependencies: 486
-- Name: FUNCTION update_user_module_access_sync_tracking(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_user_module_access_sync_tracking() TO anon;
GRANT ALL ON FUNCTION public.update_user_module_access_sync_tracking() TO authenticated;
GRANT ALL ON FUNCTION public.update_user_module_access_sync_tracking() TO service_role;


--
-- TOC entry 5251 (class 0 OID 0)
-- Dependencies: 602
-- Name: FUNCTION update_user_module_access_updated_at(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_user_module_access_updated_at() TO anon;
GRANT ALL ON FUNCTION public.update_user_module_access_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.update_user_module_access_updated_at() TO service_role;


--
-- TOC entry 5252 (class 0 OID 0)
-- Dependencies: 515
-- Name: FUNCTION update_users_audit_fields(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_users_audit_fields() TO anon;
GRANT ALL ON FUNCTION public.update_users_audit_fields() TO authenticated;
GRANT ALL ON FUNCTION public.update_users_audit_fields() TO service_role;


--
-- TOC entry 5253 (class 0 OID 0)
-- Dependencies: 588
-- Name: FUNCTION update_users_updated_at(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_users_updated_at() TO anon;
GRANT ALL ON FUNCTION public.update_users_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.update_users_updated_at() TO service_role;


--
-- TOC entry 5254 (class 0 OID 0)
-- Dependencies: 536
-- Name: FUNCTION update_virtual_pairs_updated_at(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_virtual_pairs_updated_at() TO anon;
GRANT ALL ON FUNCTION public.update_virtual_pairs_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.update_virtual_pairs_updated_at() TO service_role;


--
-- TOC entry 5255 (class 0 OID 0)
-- Dependencies: 507
-- Name: FUNCTION upsert_virtual_stack_pair(p_yard_id text, p_stack1_id uuid, p_stack2_id uuid, p_virtual_stack_number integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.upsert_virtual_stack_pair(p_yard_id text, p_stack1_id uuid, p_stack2_id uuid, p_virtual_stack_number integer) TO anon;
GRANT ALL ON FUNCTION public.upsert_virtual_stack_pair(p_yard_id text, p_stack1_id uuid, p_stack2_id uuid, p_virtual_stack_number integer) TO authenticated;
GRANT ALL ON FUNCTION public.upsert_virtual_stack_pair(p_yard_id text, p_stack1_id uuid, p_stack2_id uuid, p_virtual_stack_number integer) TO service_role;


--
-- TOC entry 5257 (class 0 OID 0)
-- Dependencies: 516
-- Name: FUNCTION validate_40ft_container_stack(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.validate_40ft_container_stack() TO anon;
GRANT ALL ON FUNCTION public.validate_40ft_container_stack() TO authenticated;
GRANT ALL ON FUNCTION public.validate_40ft_container_stack() TO service_role;


--
-- TOC entry 5259 (class 0 OID 0)
-- Dependencies: 442
-- Name: FUNCTION validate_row_config_change(p_stack_id uuid, p_new_rows integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.validate_row_config_change(p_stack_id uuid, p_new_rows integer) TO anon;
GRANT ALL ON FUNCTION public.validate_row_config_change(p_stack_id uuid, p_new_rows integer) TO authenticated;
GRANT ALL ON FUNCTION public.validate_row_config_change(p_stack_id uuid, p_new_rows integer) TO service_role;


--
-- TOC entry 5260 (class 0 OID 0)
-- Dependencies: 531
-- Name: FUNCTION apply_rls(wal jsonb, max_record_bytes integer); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) TO postgres;
GRANT ALL ON FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) TO anon;
GRANT ALL ON FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) TO authenticated;
GRANT ALL ON FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) TO service_role;
GRANT ALL ON FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) TO supabase_realtime_admin;


--
-- TOC entry 5261 (class 0 OID 0)
-- Dependencies: 554
-- Name: FUNCTION broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text) TO postgres;
GRANT ALL ON FUNCTION realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text) TO dashboard_user;


--
-- TOC entry 5262 (class 0 OID 0)
-- Dependencies: 583
-- Name: FUNCTION build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) TO postgres;
GRANT ALL ON FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) TO anon;
GRANT ALL ON FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) TO authenticated;
GRANT ALL ON FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) TO service_role;
GRANT ALL ON FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) TO supabase_realtime_admin;


--
-- TOC entry 5263 (class 0 OID 0)
-- Dependencies: 465
-- Name: FUNCTION "cast"(val text, type_ regtype); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime."cast"(val text, type_ regtype) TO postgres;
GRANT ALL ON FUNCTION realtime."cast"(val text, type_ regtype) TO dashboard_user;
GRANT ALL ON FUNCTION realtime."cast"(val text, type_ regtype) TO anon;
GRANT ALL ON FUNCTION realtime."cast"(val text, type_ regtype) TO authenticated;
GRANT ALL ON FUNCTION realtime."cast"(val text, type_ regtype) TO service_role;
GRANT ALL ON FUNCTION realtime."cast"(val text, type_ regtype) TO supabase_realtime_admin;


--
-- TOC entry 5264 (class 0 OID 0)
-- Dependencies: 438
-- Name: FUNCTION check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) TO postgres;
GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) TO anon;
GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) TO authenticated;
GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) TO service_role;
GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) TO supabase_realtime_admin;


--
-- TOC entry 5265 (class 0 OID 0)
-- Dependencies: 624
-- Name: FUNCTION is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) TO postgres;
GRANT ALL ON FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) TO anon;
GRANT ALL ON FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) TO authenticated;
GRANT ALL ON FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) TO service_role;
GRANT ALL ON FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) TO supabase_realtime_admin;


--
-- TOC entry 5266 (class 0 OID 0)
-- Dependencies: 623
-- Name: FUNCTION list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) TO postgres;
GRANT ALL ON FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) TO anon;
GRANT ALL ON FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) TO authenticated;
GRANT ALL ON FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) TO service_role;
GRANT ALL ON FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) TO supabase_realtime_admin;


--
-- TOC entry 5267 (class 0 OID 0)
-- Dependencies: 557
-- Name: FUNCTION quote_wal2json(entity regclass); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.quote_wal2json(entity regclass) TO postgres;
GRANT ALL ON FUNCTION realtime.quote_wal2json(entity regclass) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.quote_wal2json(entity regclass) TO anon;
GRANT ALL ON FUNCTION realtime.quote_wal2json(entity regclass) TO authenticated;
GRANT ALL ON FUNCTION realtime.quote_wal2json(entity regclass) TO service_role;
GRANT ALL ON FUNCTION realtime.quote_wal2json(entity regclass) TO supabase_realtime_admin;


--
-- TOC entry 5268 (class 0 OID 0)
-- Dependencies: 548
-- Name: FUNCTION send(payload jsonb, event text, topic text, private boolean); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.send(payload jsonb, event text, topic text, private boolean) TO postgres;
GRANT ALL ON FUNCTION realtime.send(payload jsonb, event text, topic text, private boolean) TO dashboard_user;


--
-- TOC entry 5269 (class 0 OID 0)
-- Dependencies: 533
-- Name: FUNCTION subscription_check_filters(); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.subscription_check_filters() TO postgres;
GRANT ALL ON FUNCTION realtime.subscription_check_filters() TO dashboard_user;
GRANT ALL ON FUNCTION realtime.subscription_check_filters() TO anon;
GRANT ALL ON FUNCTION realtime.subscription_check_filters() TO authenticated;
GRANT ALL ON FUNCTION realtime.subscription_check_filters() TO service_role;
GRANT ALL ON FUNCTION realtime.subscription_check_filters() TO supabase_realtime_admin;


--
-- TOC entry 5270 (class 0 OID 0)
-- Dependencies: 600
-- Name: FUNCTION to_regrole(role_name text); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.to_regrole(role_name text) TO postgres;
GRANT ALL ON FUNCTION realtime.to_regrole(role_name text) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.to_regrole(role_name text) TO anon;
GRANT ALL ON FUNCTION realtime.to_regrole(role_name text) TO authenticated;
GRANT ALL ON FUNCTION realtime.to_regrole(role_name text) TO service_role;
GRANT ALL ON FUNCTION realtime.to_regrole(role_name text) TO supabase_realtime_admin;


--
-- TOC entry 5271 (class 0 OID 0)
-- Dependencies: 517
-- Name: FUNCTION topic(); Type: ACL; Schema: realtime; Owner: supabase_realtime_admin
--

GRANT ALL ON FUNCTION realtime.topic() TO postgres;
GRANT ALL ON FUNCTION realtime.topic() TO dashboard_user;


--
-- TOC entry 5273 (class 0 OID 0)
-- Dependencies: 347
-- Name: TABLE audit_log_entries; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.audit_log_entries TO dashboard_user;
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.audit_log_entries TO postgres;
GRANT SELECT ON TABLE auth.audit_log_entries TO postgres WITH GRANT OPTION;


--
-- TOC entry 5274 (class 0 OID 0)
-- Dependencies: 429
-- Name: TABLE custom_oauth_providers; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.custom_oauth_providers TO postgres;
GRANT ALL ON TABLE auth.custom_oauth_providers TO dashboard_user;


--
-- TOC entry 5276 (class 0 OID 0)
-- Dependencies: 358
-- Name: TABLE flow_state; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.flow_state TO postgres;
GRANT SELECT ON TABLE auth.flow_state TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.flow_state TO dashboard_user;


--
-- TOC entry 5279 (class 0 OID 0)
-- Dependencies: 349
-- Name: TABLE identities; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.identities TO postgres;
GRANT SELECT ON TABLE auth.identities TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.identities TO dashboard_user;


--
-- TOC entry 5281 (class 0 OID 0)
-- Dependencies: 346
-- Name: TABLE instances; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.instances TO dashboard_user;
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.instances TO postgres;
GRANT SELECT ON TABLE auth.instances TO postgres WITH GRANT OPTION;


--
-- TOC entry 5283 (class 0 OID 0)
-- Dependencies: 353
-- Name: TABLE mfa_amr_claims; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.mfa_amr_claims TO postgres;
GRANT SELECT ON TABLE auth.mfa_amr_claims TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.mfa_amr_claims TO dashboard_user;


--
-- TOC entry 5285 (class 0 OID 0)
-- Dependencies: 352
-- Name: TABLE mfa_challenges; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.mfa_challenges TO postgres;
GRANT SELECT ON TABLE auth.mfa_challenges TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.mfa_challenges TO dashboard_user;


--
-- TOC entry 5288 (class 0 OID 0)
-- Dependencies: 351
-- Name: TABLE mfa_factors; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.mfa_factors TO postgres;
GRANT SELECT ON TABLE auth.mfa_factors TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.mfa_factors TO dashboard_user;


--
-- TOC entry 5289 (class 0 OID 0)
-- Dependencies: 361
-- Name: TABLE oauth_authorizations; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.oauth_authorizations TO postgres;
GRANT ALL ON TABLE auth.oauth_authorizations TO dashboard_user;


--
-- TOC entry 5291 (class 0 OID 0)
-- Dependencies: 363
-- Name: TABLE oauth_client_states; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.oauth_client_states TO postgres;
GRANT ALL ON TABLE auth.oauth_client_states TO dashboard_user;


--
-- TOC entry 5292 (class 0 OID 0)
-- Dependencies: 360
-- Name: TABLE oauth_clients; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.oauth_clients TO postgres;
GRANT ALL ON TABLE auth.oauth_clients TO dashboard_user;


--
-- TOC entry 5293 (class 0 OID 0)
-- Dependencies: 362
-- Name: TABLE oauth_consents; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.oauth_consents TO postgres;
GRANT ALL ON TABLE auth.oauth_consents TO dashboard_user;


--
-- TOC entry 5294 (class 0 OID 0)
-- Dependencies: 359
-- Name: TABLE one_time_tokens; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.one_time_tokens TO postgres;
GRANT SELECT ON TABLE auth.one_time_tokens TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.one_time_tokens TO dashboard_user;


--
-- TOC entry 5296 (class 0 OID 0)
-- Dependencies: 345
-- Name: TABLE refresh_tokens; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.refresh_tokens TO dashboard_user;
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.refresh_tokens TO postgres;
GRANT SELECT ON TABLE auth.refresh_tokens TO postgres WITH GRANT OPTION;


--
-- TOC entry 5298 (class 0 OID 0)
-- Dependencies: 344
-- Name: SEQUENCE refresh_tokens_id_seq; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON SEQUENCE auth.refresh_tokens_id_seq TO dashboard_user;
GRANT ALL ON SEQUENCE auth.refresh_tokens_id_seq TO postgres;


--
-- TOC entry 5300 (class 0 OID 0)
-- Dependencies: 356
-- Name: TABLE saml_providers; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.saml_providers TO postgres;
GRANT SELECT ON TABLE auth.saml_providers TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.saml_providers TO dashboard_user;


--
-- TOC entry 5302 (class 0 OID 0)
-- Dependencies: 357
-- Name: TABLE saml_relay_states; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.saml_relay_states TO postgres;
GRANT SELECT ON TABLE auth.saml_relay_states TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.saml_relay_states TO dashboard_user;


--
-- TOC entry 5304 (class 0 OID 0)
-- Dependencies: 348
-- Name: TABLE schema_migrations; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT SELECT ON TABLE auth.schema_migrations TO postgres WITH GRANT OPTION;


--
-- TOC entry 5309 (class 0 OID 0)
-- Dependencies: 350
-- Name: TABLE sessions; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.sessions TO postgres;
GRANT SELECT ON TABLE auth.sessions TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.sessions TO dashboard_user;


--
-- TOC entry 5311 (class 0 OID 0)
-- Dependencies: 355
-- Name: TABLE sso_domains; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.sso_domains TO postgres;
GRANT SELECT ON TABLE auth.sso_domains TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.sso_domains TO dashboard_user;


--
-- TOC entry 5314 (class 0 OID 0)
-- Dependencies: 354
-- Name: TABLE sso_providers; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.sso_providers TO postgres;
GRANT SELECT ON TABLE auth.sso_providers TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.sso_providers TO dashboard_user;


--
-- TOC entry 5317 (class 0 OID 0)
-- Dependencies: 343
-- Name: TABLE users; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.users TO dashboard_user;
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.users TO postgres;
GRANT SELECT ON TABLE auth.users TO postgres WITH GRANT OPTION;


--
-- TOC entry 5326 (class 0 OID 0)
-- Dependencies: 383
-- Name: TABLE stacks; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.stacks TO anon;
GRANT ALL ON TABLE public.stacks TO authenticated;
GRANT ALL ON TABLE public.stacks TO service_role;


--
-- TOC entry 5328 (class 0 OID 0)
-- Dependencies: 384
-- Name: TABLE active_stacks; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.active_stacks TO anon;
GRANT ALL ON TABLE public.active_stacks TO authenticated;
GRANT ALL ON TABLE public.active_stacks TO service_role;


--
-- TOC entry 5329 (class 0 OID 0)
-- Dependencies: 385
-- Name: TABLE audit_logs; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.audit_logs TO anon;
GRANT ALL ON TABLE public.audit_logs TO authenticated;
GRANT ALL ON TABLE public.audit_logs TO service_role;


--
-- TOC entry 5337 (class 0 OID 0)
-- Dependencies: 386
-- Name: TABLE booking_references; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.booking_references TO anon;
GRANT ALL ON TABLE public.booking_references TO authenticated;
GRANT ALL ON TABLE public.booking_references TO service_role;


--
-- TOC entry 5339 (class 0 OID 0)
-- Dependencies: 387
-- Name: TABLE buffer_zone_stats; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.buffer_zone_stats TO anon;
GRANT ALL ON TABLE public.buffer_zone_stats TO authenticated;
GRANT ALL ON TABLE public.buffer_zone_stats TO service_role;


--
-- TOC entry 5340 (class 0 OID 0)
-- Dependencies: 388
-- Name: TABLE client_pools; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.client_pools TO anon;
GRANT ALL ON TABLE public.client_pools TO authenticated;
GRANT ALL ON TABLE public.client_pools TO service_role;


--
-- TOC entry 5353 (class 0 OID 0)
-- Dependencies: 389
-- Name: TABLE clients; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.clients TO anon;
GRANT ALL ON TABLE public.clients TO authenticated;
GRANT ALL ON TABLE public.clients TO service_role;


--
-- TOC entry 5357 (class 0 OID 0)
-- Dependencies: 428
-- Name: TABLE container_buffer_zones; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.container_buffer_zones TO anon;
GRANT ALL ON TABLE public.container_buffer_zones TO authenticated;
GRANT ALL ON TABLE public.container_buffer_zones TO service_role;


--
-- TOC entry 5365 (class 0 OID 0)
-- Dependencies: 390
-- Name: TABLE container_types; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.container_types TO anon;
GRANT ALL ON TABLE public.container_types TO authenticated;
GRANT ALL ON TABLE public.container_types TO service_role;


--
-- TOC entry 5381 (class 0 OID 0)
-- Dependencies: 391
-- Name: TABLE containers; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.containers TO anon;
GRANT ALL ON TABLE public.containers TO authenticated;
GRANT ALL ON TABLE public.containers TO service_role;


--
-- TOC entry 5413 (class 0 OID 0)
-- Dependencies: 392
-- Name: TABLE gate_in_operations; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.gate_in_operations TO anon;
GRANT ALL ON TABLE public.gate_in_operations TO authenticated;
GRANT ALL ON TABLE public.gate_in_operations TO service_role;


--
-- TOC entry 5415 (class 0 OID 0)
-- Dependencies: 393
-- Name: TABLE damage_assessments_by_stage; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.damage_assessments_by_stage TO anon;
GRANT ALL ON TABLE public.damage_assessments_by_stage TO authenticated;
GRANT ALL ON TABLE public.damage_assessments_by_stage TO service_role;


--
-- TOC entry 5419 (class 0 OID 0)
-- Dependencies: 394
-- Name: TABLE edi_transmission_logs; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.edi_transmission_logs TO anon;
GRANT ALL ON TABLE public.edi_transmission_logs TO authenticated;
GRANT ALL ON TABLE public.edi_transmission_logs TO service_role;


--
-- TOC entry 5420 (class 0 OID 0)
-- Dependencies: 395
-- Name: TABLE edi_client_performance; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.edi_client_performance TO anon;
GRANT ALL ON TABLE public.edi_client_performance TO authenticated;
GRANT ALL ON TABLE public.edi_client_performance TO service_role;


--
-- TOC entry 5424 (class 0 OID 0)
-- Dependencies: 396
-- Name: TABLE edi_client_settings; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.edi_client_settings TO anon;
GRANT ALL ON TABLE public.edi_client_settings TO authenticated;
GRANT ALL ON TABLE public.edi_client_settings TO service_role;


--
-- TOC entry 5428 (class 0 OID 0)
-- Dependencies: 397
-- Name: TABLE edi_server_configurations; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.edi_server_configurations TO anon;
GRANT ALL ON TABLE public.edi_server_configurations TO authenticated;
GRANT ALL ON TABLE public.edi_server_configurations TO service_role;


--
-- TOC entry 5430 (class 0 OID 0)
-- Dependencies: 427
-- Name: TABLE edi_client_settings_with_server; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.edi_client_settings_with_server TO anon;
GRANT ALL ON TABLE public.edi_client_settings_with_server TO authenticated;
GRANT ALL ON TABLE public.edi_client_settings_with_server TO service_role;


--
-- TOC entry 5436 (class 0 OID 0)
-- Dependencies: 398
-- Name: TABLE gate_out_operations; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.gate_out_operations TO anon;
GRANT ALL ON TABLE public.gate_out_operations TO authenticated;
GRANT ALL ON TABLE public.gate_out_operations TO service_role;


--
-- TOC entry 5437 (class 0 OID 0)
-- Dependencies: 399
-- Name: TABLE edi_client_summary; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.edi_client_summary TO anon;
GRANT ALL ON TABLE public.edi_client_summary TO authenticated;
GRANT ALL ON TABLE public.edi_client_summary TO service_role;


--
-- TOC entry 5438 (class 0 OID 0)
-- Dependencies: 400
-- Name: TABLE edi_dashboard_stats; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.edi_dashboard_stats TO anon;
GRANT ALL ON TABLE public.edi_dashboard_stats TO authenticated;
GRANT ALL ON TABLE public.edi_dashboard_stats TO service_role;


--
-- TOC entry 5439 (class 0 OID 0)
-- Dependencies: 401
-- Name: TABLE edi_server_utilization; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.edi_server_utilization TO anon;
GRANT ALL ON TABLE public.edi_server_utilization TO authenticated;
GRANT ALL ON TABLE public.edi_server_utilization TO service_role;


--
-- TOC entry 5440 (class 0 OID 0)
-- Dependencies: 402
-- Name: TABLE edi_statistics; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.edi_statistics TO anon;
GRANT ALL ON TABLE public.edi_statistics TO authenticated;
GRANT ALL ON TABLE public.edi_statistics TO service_role;


--
-- TOC entry 5441 (class 0 OID 0)
-- Dependencies: 403
-- Name: TABLE edi_transmission_summary; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.edi_transmission_summary TO anon;
GRANT ALL ON TABLE public.edi_transmission_summary TO authenticated;
GRANT ALL ON TABLE public.edi_transmission_summary TO service_role;


--
-- TOC entry 5442 (class 0 OID 0)
-- Dependencies: 404
-- Name: TABLE gate_operations_with_edi; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.gate_operations_with_edi TO anon;
GRANT ALL ON TABLE public.gate_operations_with_edi TO authenticated;
GRANT ALL ON TABLE public.gate_operations_with_edi TO service_role;


--
-- TOC entry 5444 (class 0 OID 0)
-- Dependencies: 405
-- Name: TABLE location_audit_log; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.location_audit_log TO anon;
GRANT ALL ON TABLE public.location_audit_log TO authenticated;
GRANT ALL ON TABLE public.location_audit_log TO service_role;


--
-- TOC entry 5446 (class 0 OID 0)
-- Dependencies: 406
-- Name: TABLE location_id_mappings; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.location_id_mappings TO anon;
GRANT ALL ON TABLE public.location_id_mappings TO authenticated;
GRANT ALL ON TABLE public.location_id_mappings TO service_role;


--
-- TOC entry 5455 (class 0 OID 0)
-- Dependencies: 407
-- Name: TABLE locations; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.locations TO anon;
GRANT ALL ON TABLE public.locations TO authenticated;
GRANT ALL ON TABLE public.locations TO service_role;


--
-- TOC entry 5457 (class 0 OID 0)
-- Dependencies: 408
-- Name: TABLE location_statistics_by_stack; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.location_statistics_by_stack TO anon;
GRANT ALL ON TABLE public.location_statistics_by_stack TO authenticated;
GRANT ALL ON TABLE public.location_statistics_by_stack TO service_role;


--
-- TOC entry 5459 (class 0 OID 0)
-- Dependencies: 409
-- Name: TABLE location_statistics_by_yard; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.location_statistics_by_yard TO anon;
GRANT ALL ON TABLE public.location_statistics_by_yard TO authenticated;
GRANT ALL ON TABLE public.location_statistics_by_yard TO service_role;


--
-- TOC entry 5466 (class 0 OID 0)
-- Dependencies: 410
-- Name: TABLE module_access_sync_log; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.module_access_sync_log TO anon;
GRANT ALL ON TABLE public.module_access_sync_log TO authenticated;
GRANT ALL ON TABLE public.module_access_sync_log TO service_role;


--
-- TOC entry 5467 (class 0 OID 0)
-- Dependencies: 411
-- Name: TABLE sections; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.sections TO anon;
GRANT ALL ON TABLE public.sections TO authenticated;
GRANT ALL ON TABLE public.sections TO service_role;


--
-- TOC entry 5468 (class 0 OID 0)
-- Dependencies: 412
-- Name: TABLE stack_assignments; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.stack_assignments TO anon;
GRANT ALL ON TABLE public.stack_assignments TO authenticated;
GRANT ALL ON TABLE public.stack_assignments TO service_role;


--
-- TOC entry 5470 (class 0 OID 0)
-- Dependencies: 413
-- Name: TABLE stack_pairings; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.stack_pairings TO anon;
GRANT ALL ON TABLE public.stack_pairings TO authenticated;
GRANT ALL ON TABLE public.stack_pairings TO service_role;


--
-- TOC entry 5472 (class 0 OID 0)
-- Dependencies: 414
-- Name: TABLE stack_status_summary; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.stack_status_summary TO anon;
GRANT ALL ON TABLE public.stack_status_summary TO authenticated;
GRANT ALL ON TABLE public.stack_status_summary TO service_role;


--
-- TOC entry 5476 (class 0 OID 0)
-- Dependencies: 415
-- Name: TABLE user_module_access; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.user_module_access TO anon;
GRANT ALL ON TABLE public.user_module_access TO authenticated;
GRANT ALL ON TABLE public.user_module_access TO service_role;


--
-- TOC entry 5482 (class 0 OID 0)
-- Dependencies: 416
-- Name: TABLE users; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.users TO anon;
GRANT ALL ON TABLE public.users TO authenticated;
GRANT ALL ON TABLE public.users TO service_role;


--
-- TOC entry 5483 (class 0 OID 0)
-- Dependencies: 417
-- Name: TABLE sync_health_summary; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.sync_health_summary TO anon;
GRANT ALL ON TABLE public.sync_health_summary TO authenticated;
GRANT ALL ON TABLE public.sync_health_summary TO service_role;


--
-- TOC entry 5484 (class 0 OID 0)
-- Dependencies: 418
-- Name: TABLE sync_performance_metrics; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.sync_performance_metrics TO anon;
GRANT ALL ON TABLE public.sync_performance_metrics TO authenticated;
GRANT ALL ON TABLE public.sync_performance_metrics TO service_role;


--
-- TOC entry 5492 (class 0 OID 0)
-- Dependencies: 419
-- Name: TABLE user_activities; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.user_activities TO anon;
GRANT ALL ON TABLE public.user_activities TO authenticated;
GRANT ALL ON TABLE public.user_activities TO service_role;


--
-- TOC entry 5500 (class 0 OID 0)
-- Dependencies: 420
-- Name: TABLE user_login_history; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.user_login_history TO anon;
GRANT ALL ON TABLE public.user_login_history TO authenticated;
GRANT ALL ON TABLE public.user_login_history TO service_role;


--
-- TOC entry 5502 (class 0 OID 0)
-- Dependencies: 421
-- Name: TABLE v_40ft_container_validation; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.v_40ft_container_validation TO anon;
GRANT ALL ON TABLE public.v_40ft_container_validation TO authenticated;
GRANT ALL ON TABLE public.v_40ft_container_validation TO service_role;


--
-- TOC entry 5504 (class 0 OID 0)
-- Dependencies: 422
-- Name: TABLE v_stacks_with_pairings; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.v_stacks_with_pairings TO anon;
GRANT ALL ON TABLE public.v_stacks_with_pairings TO authenticated;
GRANT ALL ON TABLE public.v_stacks_with_pairings TO service_role;


--
-- TOC entry 5506 (class 0 OID 0)
-- Dependencies: 423
-- Name: TABLE virtual_stack_pairs; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.virtual_stack_pairs TO anon;
GRANT ALL ON TABLE public.virtual_stack_pairs TO authenticated;
GRANT ALL ON TABLE public.virtual_stack_pairs TO service_role;


--
-- TOC entry 5507 (class 0 OID 0)
-- Dependencies: 424
-- Name: TABLE yards; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.yards TO anon;
GRANT ALL ON TABLE public.yards TO authenticated;
GRANT ALL ON TABLE public.yards TO service_role;


--
-- TOC entry 5508 (class 0 OID 0)
-- Dependencies: 425
-- Name: TABLE messages; Type: ACL; Schema: realtime; Owner: supabase_realtime_admin
--

GRANT ALL ON TABLE realtime.messages TO postgres;
GRANT ALL ON TABLE realtime.messages TO dashboard_user;
GRANT SELECT,INSERT,UPDATE ON TABLE realtime.messages TO anon;
GRANT SELECT,INSERT,UPDATE ON TABLE realtime.messages TO authenticated;
GRANT SELECT,INSERT,UPDATE ON TABLE realtime.messages TO service_role;


--
-- TOC entry 5509 (class 0 OID 0)
-- Dependencies: 430
-- Name: TABLE messages_2026_02_28; Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON TABLE realtime.messages_2026_02_28 TO postgres;
GRANT ALL ON TABLE realtime.messages_2026_02_28 TO dashboard_user;


--
-- TOC entry 5510 (class 0 OID 0)
-- Dependencies: 431
-- Name: TABLE messages_2026_03_01; Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON TABLE realtime.messages_2026_03_01 TO postgres;
GRANT ALL ON TABLE realtime.messages_2026_03_01 TO dashboard_user;


--
-- TOC entry 5511 (class 0 OID 0)
-- Dependencies: 432
-- Name: TABLE messages_2026_03_02; Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON TABLE realtime.messages_2026_03_02 TO postgres;
GRANT ALL ON TABLE realtime.messages_2026_03_02 TO dashboard_user;


--
-- TOC entry 5512 (class 0 OID 0)
-- Dependencies: 433
-- Name: TABLE messages_2026_03_03; Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON TABLE realtime.messages_2026_03_03 TO postgres;
GRANT ALL ON TABLE realtime.messages_2026_03_03 TO dashboard_user;


--
-- TOC entry 5513 (class 0 OID 0)
-- Dependencies: 434
-- Name: TABLE messages_2026_03_04; Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON TABLE realtime.messages_2026_03_04 TO postgres;
GRANT ALL ON TABLE realtime.messages_2026_03_04 TO dashboard_user;


--
-- TOC entry 5514 (class 0 OID 0)
-- Dependencies: 435
-- Name: TABLE messages_2026_03_05; Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON TABLE realtime.messages_2026_03_05 TO postgres;
GRANT ALL ON TABLE realtime.messages_2026_03_05 TO dashboard_user;


--
-- TOC entry 5515 (class 0 OID 0)
-- Dependencies: 436
-- Name: TABLE messages_2026_03_06; Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON TABLE realtime.messages_2026_03_06 TO postgres;
GRANT ALL ON TABLE realtime.messages_2026_03_06 TO dashboard_user;


--
-- TOC entry 5516 (class 0 OID 0)
-- Dependencies: 437
-- Name: TABLE messages_2026_03_07; Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON TABLE realtime.messages_2026_03_07 TO postgres;
GRANT ALL ON TABLE realtime.messages_2026_03_07 TO dashboard_user;


--
-- TOC entry 5517 (class 0 OID 0)
-- Dependencies: 364
-- Name: TABLE schema_migrations; Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON TABLE realtime.schema_migrations TO postgres;
GRANT ALL ON TABLE realtime.schema_migrations TO dashboard_user;
GRANT SELECT ON TABLE realtime.schema_migrations TO anon;
GRANT SELECT ON TABLE realtime.schema_migrations TO authenticated;
GRANT SELECT ON TABLE realtime.schema_migrations TO service_role;
GRANT ALL ON TABLE realtime.schema_migrations TO supabase_realtime_admin;


--
-- TOC entry 5518 (class 0 OID 0)
-- Dependencies: 367
-- Name: TABLE subscription; Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON TABLE realtime.subscription TO postgres;
GRANT ALL ON TABLE realtime.subscription TO dashboard_user;
GRANT SELECT ON TABLE realtime.subscription TO anon;
GRANT SELECT ON TABLE realtime.subscription TO authenticated;
GRANT SELECT ON TABLE realtime.subscription TO service_role;
GRANT ALL ON TABLE realtime.subscription TO supabase_realtime_admin;


--
-- TOC entry 5519 (class 0 OID 0)
-- Dependencies: 366
-- Name: SEQUENCE subscription_id_seq; Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON SEQUENCE realtime.subscription_id_seq TO postgres;
GRANT ALL ON SEQUENCE realtime.subscription_id_seq TO dashboard_user;
GRANT USAGE ON SEQUENCE realtime.subscription_id_seq TO anon;
GRANT USAGE ON SEQUENCE realtime.subscription_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE realtime.subscription_id_seq TO service_role;
GRANT ALL ON SEQUENCE realtime.subscription_id_seq TO supabase_realtime_admin;


--
-- TOC entry 2754 (class 826 OID 16553)
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: auth; Owner: supabase_auth_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON SEQUENCES TO dashboard_user;


--
-- TOC entry 2755 (class 826 OID 16554)
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: auth; Owner: supabase_auth_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON FUNCTIONS TO dashboard_user;


--
-- TOC entry 2753 (class 826 OID 16552)
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: auth; Owner: supabase_auth_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON TABLES TO dashboard_user;


--
-- TOC entry 2769 (class 826 OID 16490)
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- TOC entry 2750 (class 826 OID 16491)
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- TOC entry 2770 (class 826 OID 16489)
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- TOC entry 2752 (class 826 OID 16493)
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- TOC entry 2771 (class 826 OID 16488)
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- TOC entry 2751 (class 826 OID 16492)
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- TOC entry 2757 (class 826 OID 16557)
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: realtime; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT ALL ON SEQUENCES TO dashboard_user;


--
-- TOC entry 2758 (class 826 OID 16558)
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: realtime; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT ALL ON FUNCTIONS TO dashboard_user;


--
-- TOC entry 2756 (class 826 OID 16556)
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: realtime; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT ALL ON TABLES TO dashboard_user;


-- Completed on 2026-03-04 13:26:15

--
-- PostgreSQL database dump complete
--

