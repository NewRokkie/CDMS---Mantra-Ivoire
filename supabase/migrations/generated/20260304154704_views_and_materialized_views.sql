-- Views & Materialized Views Migration
-- Generated: 2026-03-04T15:47:03.058Z

BEGIN;


-- ============================================
-- VIEWS
-- ============================================

-- View: active_stacks
-- Updatable: YES
DROP VIEW IF EXISTS public.active_stacks CASCADE;
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
   FROM stacks
  WHERE (is_active = true);;

-- View: buffer_zone_stats
-- Updatable: YES
DROP VIEW IF EXISTS public.buffer_zone_stats CASCADE;
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
   FROM stacks
  WHERE ((is_buffer_zone = true) AND (is_active = true))
  GROUP BY yard_id;;

-- View: damage_assessments_by_stage
-- Updatable: YES
DROP VIEW IF EXISTS public.damage_assessments_by_stage CASCADE;
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
   FROM gate_in_operations
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
   FROM containers
  WHERE ((containers.damage IS NOT NULL) AND (jsonb_array_length(containers.damage) > 0));;

-- View: edi_client_settings_with_server
-- Updatable: YES
DROP VIEW IF EXISTS public.edi_client_settings_with_server CASCADE;
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
   FROM (edi_client_settings ecs
     LEFT JOIN edi_server_configurations esc ON ((ecs.server_config_id = esc.id)));;

-- View: edi_client_summary
-- Updatable: YES
DROP VIEW IF EXISTS public.edi_client_summary CASCADE;
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
   FROM ((((clients c
     LEFT JOIN edi_client_settings ecs ON ((c.id = ecs.client_id)))
     LEFT JOIN edi_server_configurations esc ON ((ecs.server_config_id = esc.id)))
     LEFT JOIN ( SELECT edi_transmission_logs.client_id,
            count(*) AS total_transmissions,
            count(*) FILTER (WHERE (edi_transmission_logs.status = 'success'::text)) AS successful_transmissions,
            count(*) FILTER (WHERE (edi_transmission_logs.status = 'failed'::text)) AS failed_transmissions,
                CASE
                    WHEN (count(*) > 0) THEN round((((count(*) FILTER (WHERE (edi_transmission_logs.status = 'success'::text)))::numeric / (count(*))::numeric) * (100)::numeric), 2)
                    ELSE (0)::numeric
                END AS success_rate,
            max(edi_transmission_logs.created_at) AS last_transmission_date
           FROM edi_transmission_logs
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
                   FROM gate_in_operations
                  WHERE (gate_in_operations.created_at >= (CURRENT_DATE - '7 days'::interval))
                UNION ALL
                 SELECT gate_out_operations.client_code,
                    'GATE_OUT'::text AS operation,
                    gate_out_operations.edi_transmitted
                   FROM gate_out_operations
                  WHERE (gate_out_operations.created_at >= (CURRENT_DATE - '7 days'::interval))) ops
             JOIN clients c_1 ON ((c_1.code = ops.client_code)))
          GROUP BY c_1.id) recent_ops ON ((c.id = recent_ops.client_id)))
  WHERE (c.active = true)
  ORDER BY c.name;;

-- View: edi_server_utilization
-- Updatable: YES
DROP VIEW IF EXISTS public.edi_server_utilization CASCADE;
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
   FROM ((edi_server_configurations esc
     LEFT JOIN ( SELECT edi_client_settings.server_config_id,
            count(*) AS count
           FROM edi_client_settings
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
           FROM edi_transmission_logs
          WHERE (edi_transmission_logs.created_at >= (CURRENT_DATE - '30 days'::interval))
          GROUP BY edi_transmission_logs.config_id) transmission_stats ON ((esc.id = transmission_stats.config_id)))
  ORDER BY esc.name;;

-- View: edi_statistics
-- Updatable: YES
DROP VIEW IF EXISTS public.edi_statistics CASCADE;
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
   FROM edi_transmission_logs
  WHERE (created_at >= (CURRENT_DATE - '30 days'::interval));;

-- View: edi_transmission_summary
-- Updatable: YES
DROP VIEW IF EXISTS public.edi_transmission_summary CASCADE;
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
   FROM ((edi_transmission_logs etl
     LEFT JOIN clients c ON ((etl.client_id = c.id)))
     LEFT JOIN edi_server_configurations esc ON ((etl.config_id = esc.id)))
  WHERE (etl.created_at >= (CURRENT_DATE - '30 days'::interval))
  GROUP BY (date_trunc('day'::text, etl.created_at)), c.code, c.name, etl.operation, etl.status, esc.name
  ORDER BY (date_trunc('day'::text, etl.created_at)) DESC, c.code, etl.operation;;

-- View: gate_operations_with_edi
-- Updatable: YES
DROP VIEW IF EXISTS public.gate_operations_with_edi CASCADE;
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
   FROM gate_in_operations
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
   FROM gate_out_operations
  WHERE (EXISTS ( SELECT 1
           FROM information_schema.tables
          WHERE (((tables.table_name)::name = 'gate_out_operations'::name) AND (EXISTS ( SELECT 1
                   FROM information_schema.columns
                  WHERE (((columns.table_name)::name = 'gate_out_operations'::name) AND ((columns.column_name)::name = 'edi_transmitted'::name)))))));;

-- View: stack_status_summary
-- Updatable: YES
DROP VIEW IF EXISTS public.stack_status_summary CASCADE;
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
   FROM (stacks s
     LEFT JOIN locations l ON ((s.id = l.stack_id)))
  GROUP BY s.id, s.yard_id, s.stack_number, s.section_name, s.is_active, s.capacity, s.current_occupancy, s.created_at, s.updated_at
  ORDER BY s.yard_id, s.stack_number;;

-- View: sync_performance_metrics
-- Updatable: YES
DROP VIEW IF EXISTS public.sync_performance_metrics CASCADE;
CREATE VIEW public.sync_performance_metrics AS
 SELECT 'Total Users'::text AS metric,
    (sync_health_summary.total_users)::text AS value,
    'count'::text AS unit
   FROM sync_health_summary
UNION ALL
 SELECT 'Users with Module Access'::text AS metric,
    (sync_health_summary.users_with_module_access)::text AS value,
    'count'::text AS unit
   FROM sync_health_summary
UNION ALL
 SELECT 'Average Seconds Since Last Sync'::text AS metric,
    (round(sync_health_summary.avg_seconds_since_sync, 2))::text AS value,
    'seconds'::text AS unit
   FROM sync_health_summary
UNION ALL
 SELECT 'Users Requiring Multiple Syncs'::text AS metric,
    (sync_health_summary.users_with_multiple_syncs)::text AS value,
    'count'::text AS unit
   FROM sync_health_summary;;

-- View: v_40ft_container_validation
-- Updatable: YES
DROP VIEW IF EXISTS public.v_40ft_container_validation CASCADE;
CREATE VIEW public.v_40ft_container_validation AS
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
   FROM containers c
  WHERE (((size = '40ft'::text) OR (size = '40feet'::text)) AND (location IS NOT NULL))
  ORDER BY
        CASE
            WHEN (("substring"(location, 'S0*(\d+)'::text))::integer = ANY (ARRAY[4, 8, 12, 16, 20, 24, 28, 34, 38, 42, 46, 50, 54, 62, 66, 70, 74, 78, 82, 86, 90, 94, 98])) THEN 'VALID - Virtual Stack'::text
            WHEN ((("substring"(location, 'S0*(\d+)'::text))::integer % 2) = 1) THEN 'INVALID - Odd Physical Stack'::text
            ELSE 'INVALID - Not a recognized virtual stack'::text
        END DESC, created_at DESC;;

-- View: v_stacks_with_pairings
-- Updatable: YES
DROP VIEW IF EXISTS public.v_stacks_with_pairings CASCADE;
CREATE VIEW public.v_stacks_with_pairings AS
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
               FROM stack_pairings sp
              WHERE ((sp.yard_id = s.yard_id) AND (sp.virtual_stack_number = s.stack_number) AND (sp.is_active = true))
             LIMIT 1)
            WHEN ((NOT is_virtual) AND (container_size = '40ft'::text)) THEN ( SELECT json_build_object('virtual_stack', sp.virtual_stack_number, 'paired_with',
                    CASE
                        WHEN (sp.first_stack_number = s.stack_number) THEN sp.second_stack_number
                        ELSE sp.first_stack_number
                    END, 'pairing_id', sp.id) AS json_build_object
               FROM stack_pairings sp
              WHERE ((sp.yard_id = s.yard_id) AND ((sp.first_stack_number = s.stack_number) OR (sp.second_stack_number = s.stack_number)) AND (sp.is_active = true))
             LIMIT 1)
            ELSE NULL::json
        END AS pairing_info
   FROM stacks s;;


-- ============================================
-- MATERIALIZED VIEWS
-- ============================================

-- Materialized View: edi_client_performance
-- Populated: YES
DROP MATERIALIZED VIEW IF EXISTS public.edi_client_performance CASCADE;
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
   FROM (clients c
     LEFT JOIN edi_transmission_logs etl ON (((c.id = etl.client_id) AND (etl.created_at >= (CURRENT_DATE - '90 days'::interval)))))
  WHERE (c.active = true)
  GROUP BY c.id, c.code, c.name;;

-- Indexes for edi_client_performance
CREATE UNIQUE INDEX idx_edi_client_performance_unique ON public.edi_client_performance USING btree (client_id, last_updated);

-- Materialized View: edi_dashboard_stats
-- Populated: YES
DROP MATERIALIZED VIEW IF EXISTS public.edi_dashboard_stats CASCADE;
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
   FROM edi_transmission_logs
  WHERE (created_at >= (CURRENT_DATE - '90 days'::interval));;

-- Indexes for edi_dashboard_stats
CREATE UNIQUE INDEX idx_edi_dashboard_stats_unique ON public.edi_dashboard_stats USING btree (last_updated);

-- Materialized View: location_statistics_by_stack
-- Populated: YES
DROP MATERIALIZED VIEW IF EXISTS public.location_statistics_by_stack CASCADE;
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
   FROM locations
  WHERE ((is_active = true) AND (is_virtual = false))
  GROUP BY stack_id, yard_id, client_pool_id;;

-- Indexes for location_statistics_by_stack
CREATE UNIQUE INDEX idx_location_stats_stack ON public.location_statistics_by_stack USING btree (stack_id);
CREATE INDEX idx_location_stats_stack_yard ON public.location_statistics_by_stack USING btree (yard_id, occupancy_percentage);

-- Materialized View: location_statistics_by_yard
-- Populated: YES
DROP MATERIALIZED VIEW IF EXISTS public.location_statistics_by_yard CASCADE;
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
   FROM locations
  WHERE (is_active = true)
  GROUP BY yard_id;;

-- Indexes for location_statistics_by_yard
CREATE UNIQUE INDEX idx_location_stats_yard ON public.location_statistics_by_yard USING btree (yard_id);

-- Materialized View: sync_health_summary
-- Populated: YES
DROP MATERIALIZED VIEW IF EXISTS public.sync_health_summary CASCADE;
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
   FROM (users u
     FULL JOIN user_module_access uma ON ((u.id = uma.user_id)))
  WHERE (u.deleted_at IS NULL);;

-- Indexes for sync_health_summary
CREATE UNIQUE INDEX idx_sync_health_summary_unique ON public.sync_health_summary USING btree (last_updated);

COMMIT;
