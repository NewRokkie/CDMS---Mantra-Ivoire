-- ================================================================
-- BACKUP COMPLET DE LA BASE DE DONNÉES
-- Date: 2026-03-17T18:34:33.139Z
-- Environnement: TEST
-- Serveur: aws-1-eu-west-1.pooler.supabase.com
-- Base: postgres
-- ================================================================
-- Ce fichier contient:
--   • Tables (structure + données)
--   • Views & Materialized Views
--   • Functions
--   • Triggers
--   • Sequences
--   • Custom Types (ENUM, DOMAIN, COMPOSITE)
-- ================================================================

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET client_min_messages = warning;
SET row_security = off;

-- ================================================================
-- 1. CUSTOM TYPES (ENUM, DOMAIN, COMPOSITE)
-- ================================================================

DROP TYPE IF EXISTS public."container_size_enum" CASCADE;
CREATE TYPE public."container_size_enum" AS ENUM ('20ft', '40ft');

DROP TABLE IF EXISTS public."clients" CASCADE;
DROP TABLE IF EXISTS public."yards" CASCADE;
DROP TABLE IF EXISTS public."sections" CASCADE;
DROP TABLE IF EXISTS public."stacks" CASCADE;
DROP TABLE IF EXISTS public."stack_pairings" CASCADE;
DROP TABLE IF EXISTS public."virtual_stack_pairs" CASCADE;
DROP TABLE IF EXISTS public."container_types" CASCADE;
DROP TABLE IF EXISTS public."locations" CASCADE;
DROP TABLE IF EXISTS public."location_id_mappings" CASCADE;
DROP TABLE IF EXISTS public."edi_server_configurations" CASCADE;
DROP TABLE IF EXISTS public."client_pools" CASCADE;
DROP TABLE IF EXISTS public."stack_assignments" CASCADE;
DROP TABLE IF EXISTS public."booking_references" CASCADE;
DROP TABLE IF EXISTS public."gate_in_operations" CASCADE;
DROP TABLE IF EXISTS public."gate_out_operations" CASCADE;
DROP TABLE IF EXISTS public."containers" CASCADE;
DROP TABLE IF EXISTS public."container_buffer_zones" CASCADE;
DROP TABLE IF EXISTS public."edi_client_settings" CASCADE;
DROP TABLE IF EXISTS public."edi_transmission_logs" CASCADE;
DROP TABLE IF EXISTS public."edi_notifications" CASCADE;
DROP TABLE IF EXISTS public."gate_in_edi_details" CASCADE;
DROP TABLE IF EXISTS public."gate_in_transport_info" CASCADE;
DROP TABLE IF EXISTS public."gate_in_damage_assessments" CASCADE;
DROP TABLE IF EXISTS public."gate_out_edi_details" CASCADE;
DROP TABLE IF EXISTS public."gate_out_transport_info" CASCADE;
DROP TABLE IF EXISTS public."audit_logs" CASCADE;
DROP TABLE IF EXISTS public."location_audit_log" CASCADE;
DROP TABLE IF EXISTS public."user_activities" CASCADE;
DROP TABLE IF EXISTS public."user_login_history" CASCADE;
DROP TABLE IF EXISTS public."user_module_access" CASCADE;
DROP TABLE IF EXISTS public."module_access_sync_log" CASCADE;
DROP VIEW IF EXISTS public."active_stacks" CASCADE;
DROP VIEW IF EXISTS public."buffer_zone_stats" CASCADE;
DROP VIEW IF EXISTS public."damage_assessments_by_stage" CASCADE;
DROP VIEW IF EXISTS public."edi_client_settings_with_server" CASCADE;
DROP VIEW IF EXISTS public."edi_client_summary" CASCADE;
DROP VIEW IF EXISTS public."edi_server_utilization" CASCADE;
DROP VIEW IF EXISTS public."edi_statistics" CASCADE;
DROP VIEW IF EXISTS public."edi_transmission_summary" CASCADE;
DROP VIEW IF EXISTS public."gate_operations_with_edi" CASCADE;
DROP VIEW IF EXISTS public."stack_status_summary" CASCADE;
DROP VIEW IF EXISTS public."sync_performance_metrics" CASCADE;
DROP VIEW IF EXISTS public."v_40ft_container_validation" CASCADE;
DROP VIEW IF EXISTS public."v_gate_in_operations_full" CASCADE;
DROP VIEW IF EXISTS public."v_stacks_with_pairings" CASCADE;
DROP MATERIALIZED VIEW IF EXISTS public."edi_client_performance" CASCADE;
DROP MATERIALIZED VIEW IF EXISTS public."edi_dashboard_stats" CASCADE;
DROP MATERIALIZED VIEW IF EXISTS public."location_statistics_by_stack" CASCADE;
DROP MATERIALIZED VIEW IF EXISTS public."location_statistics_by_yard" CASCADE;
DROP MATERIALIZED VIEW IF EXISTS public."sync_health_summary" CASCADE;

-- ================================================================
-- 2. STRUCTURE DES TABLES
-- ================================================================


CREATE TABLE public."clients" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "code" text NOT NULL,
  "name" text NOT NULL,
  "email" text DEFAULT ''::text NOT NULL,
  "phone" text,
  "free_days_allowed" int4 DEFAULT 3 NOT NULL,
  "daily_storage_rate" numeric DEFAULT 45.00 NOT NULL,
  "currency" text DEFAULT 'USD'::text NOT NULL,
  "auto_edi" bool DEFAULT false NOT NULL,
  "active" bool DEFAULT true,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now(),
  "billing_address" jsonb,
  "tax_id" text,
  "credit_limit" numeric DEFAULT 0 NOT NULL,
  "payment_terms" int4 DEFAULT 30 NOT NULL,
  "notes" text,
  "created_by" text DEFAULT 'System'::text,
  "updated_by" text DEFAULT 'System'::text,
  "address" jsonb DEFAULT '{"city": "", "state": "", "street": "", "country": "Côte d''Ivoire", "zipCode": ""}'::jsonb NOT NULL,
  "contact_person" jsonb DEFAULT '{"name": "", "email": "", "phone": "", "position": ""}'::jsonb,
  CONSTRAINT "clients_code_key" UNIQUE (code)
);
CREATE UNIQUE INDEX clients_code_key ON public.clients USING btree (code);

CREATE TABLE public."yards" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "code" text NOT NULL,
  "location" text NOT NULL,
  "description" text,
  "layout" text DEFAULT 'standard'::text,
  "is_active" bool DEFAULT true,
  "total_capacity" int4 DEFAULT 0,
  "current_occupancy" int4 DEFAULT 0,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now(),
  "created_by" text,
  "timezone" text DEFAULT 'Africa/Abidjan'::text,
  "contact_info" jsonb,
  "address" jsonb,
  "updated_by" uuid,
  CONSTRAINT "yards_code_key" UNIQUE (code)
);
CREATE UNIQUE INDEX yards_code_key ON public.yards USING btree (code);
CREATE INDEX idx_yards_code ON public.yards USING btree (code);
CREATE INDEX idx_yards_is_active ON public.yards USING btree (is_active);

CREATE TABLE public."sections" (
  "id" text NOT NULL,
  "yard_id" text NOT NULL,
  "name" text NOT NULL,
  "is_active" bool DEFAULT true,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now()
);
CREATE INDEX idx_sections_yard_id ON public.sections USING btree (yard_id);

CREATE TABLE public."stacks" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "yard_id" text NOT NULL,
  "stack_number" int4 NOT NULL,
  "section_id" text,
  "section_name" text DEFAULT 'Main Section'::text NOT NULL,
  "rows" int4 DEFAULT 6 NOT NULL,
  "max_tiers" int4 DEFAULT 4 NOT NULL,
  "capacity" int4 DEFAULT 0 NOT NULL,
  "current_occupancy" int4 DEFAULT 0 NOT NULL,
  "position_x" numeric DEFAULT 0,
  "position_y" numeric DEFAULT 0,
  "position_z" numeric DEFAULT 0,
  "width" numeric DEFAULT 2.5,
  "length" numeric DEFAULT 12,
  "is_active" bool DEFAULT true,
  "is_odd_stack" bool DEFAULT false,
  "assigned_client_code" text,
  "notes" text,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now(),
  "created_by" text,
  "updated_by" text,
  "container_size" text DEFAULT '20feet'::text NOT NULL,
  "is_special_stack" bool DEFAULT false NOT NULL,
  "row_tier_config" jsonb,
  "is_virtual" bool DEFAULT false,
  "is_buffer_zone" bool DEFAULT false,
  "buffer_zone_type" text,
  "damage_types_supported" jsonb DEFAULT '[]'::jsonb
);
CREATE INDEX idx_stacks_assigned_client ON public.stacks USING btree (assigned_client_code);
CREATE INDEX idx_stacks_buffer_zone_type ON public.stacks USING btree (buffer_zone_type) WHERE (buffer_zone_type IS NOT NULL);
CREATE INDEX idx_stacks_container_size ON public.stacks USING btree (container_size);
CREATE INDEX idx_stacks_is_buffer_zone ON public.stacks USING btree (is_buffer_zone) WHERE (is_buffer_zone = true);
CREATE INDEX idx_stacks_is_virtual ON public.stacks USING btree (is_virtual) WHERE (is_virtual = true);
CREATE INDEX idx_stacks_row_tier_config ON public.stacks USING gin (row_tier_config);
CREATE INDEX idx_stacks_section_id ON public.stacks USING btree (section_id);
CREATE INDEX idx_stacks_stack_number ON public.stacks USING btree (stack_number);
CREATE INDEX idx_stacks_yard_id ON public.stacks USING btree (yard_id);
CREATE INDEX idx_stacks_yard_section ON public.stacks USING btree (yard_id, section_id);
CREATE UNIQUE INDEX unique_active_yard_stack ON public.stacks USING btree (yard_id, stack_number) WHERE (is_active = true);

CREATE TABLE public."stack_pairings" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "yard_id" text NOT NULL,
  "first_stack_number" int4 NOT NULL,
  "second_stack_number" int4 NOT NULL,
  "virtual_stack_number" int4 NOT NULL,
  "first_stack_id" uuid,
  "second_stack_id" uuid,
  "is_active" bool DEFAULT true,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now(),
  CONSTRAINT "unique_pairing_per_yard" UNIQUE (yard_id, first_stack_number, second_stack_number)
);
CREATE UNIQUE INDEX unique_pairing_per_yard ON public.stack_pairings USING btree (yard_id, first_stack_number, second_stack_number);
CREATE INDEX idx_stack_pairings_stacks ON public.stack_pairings USING btree (first_stack_number, second_stack_number);
CREATE INDEX idx_stack_pairings_yard ON public.stack_pairings USING btree (yard_id);

CREATE TABLE public."virtual_stack_pairs" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "yard_id" text NOT NULL,
  "stack1_id" uuid NOT NULL,
  "stack2_id" uuid NOT NULL,
  "virtual_stack_number" int4 NOT NULL,
  "is_active" bool DEFAULT true,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now(),
  CONSTRAINT "unique_stack_pair" UNIQUE (yard_id, stack1_id, stack2_id),
  CONSTRAINT "unique_virtual_stack" UNIQUE (yard_id, virtual_stack_number)
);
CREATE UNIQUE INDEX unique_stack_pair ON public.virtual_stack_pairs USING btree (yard_id, stack1_id, stack2_id);
CREATE UNIQUE INDEX unique_virtual_stack ON public.virtual_stack_pairs USING btree (yard_id, virtual_stack_number);
CREATE INDEX idx_virtual_pairs_stack1 ON public.virtual_stack_pairs USING btree (stack1_id) WHERE (is_active = true);
CREATE INDEX idx_virtual_pairs_stack2 ON public.virtual_stack_pairs USING btree (stack2_id) WHERE (is_active = true);
CREATE INDEX idx_virtual_pairs_stacks ON public.virtual_stack_pairs USING btree (stack1_id, stack2_id);
CREATE INDEX idx_virtual_pairs_yard ON public.virtual_stack_pairs USING btree (yard_id);
CREATE INDEX idx_virtual_pairs_yard_active ON public.virtual_stack_pairs USING btree (yard_id, is_active) WHERE (is_active = true);

CREATE TABLE public."container_types" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "type_code" varchar(20) NOT NULL,
  "display_name" varchar(50) NOT NULL,
  "is_high_cube" bool DEFAULT false,
  "available_sizes" text[] DEFAULT ARRAY['20ft'::text, '40ft'::text],
  "iso_code_20" varchar(10),
  "iso_code_40" varchar(10),
  "is_active" bool DEFAULT true,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now(),
  CONSTRAINT "container_types_type_code_key" UNIQUE (type_code)
);
CREATE UNIQUE INDEX container_types_type_code_key ON public.container_types USING btree (type_code);
CREATE INDEX idx_container_types_active ON public.container_types USING btree (is_active);
CREATE INDEX idx_container_types_high_cube ON public.container_types USING btree (is_high_cube);

CREATE TABLE public."locations" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "location_id" varchar(8) NOT NULL,
  "stack_id" uuid NOT NULL,
  "yard_id" text NOT NULL,
  "row_number" int4 NOT NULL,
  "tier_number" int4 NOT NULL,
  "is_virtual" bool DEFAULT false,
  "virtual_stack_pair_id" uuid,
  "is_occupied" bool DEFAULT false,
  "container_id" uuid,
  "container_size" container_size_enum,
  "client_pool_id" uuid,
  "is_active" bool DEFAULT true,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now(),
  "available" bool DEFAULT true,
  "container_number" text,
  CONSTRAINT "locations_client_pool_id_fkey" FOREIGN KEY (client_pool_id) REFERENCES client_pools(id) ON DELETE SET NULL,
  CONSTRAINT "locations_container_id_fkey" FOREIGN KEY (container_id) REFERENCES containers(id) ON DELETE SET NULL,
  CONSTRAINT "locations_virtual_stack_pair_id_fkey" FOREIGN KEY (virtual_stack_pair_id) REFERENCES virtual_stack_pairs(id) ON DELETE SET NULL,
  CONSTRAINT "locations_location_id_key" UNIQUE (location_id),
  CONSTRAINT "unique_stack_position" UNIQUE (stack_id, row_number, tier_number)
);
CREATE UNIQUE INDEX locations_location_id_key ON public.locations USING btree (location_id);
CREATE UNIQUE INDEX unique_stack_position ON public.locations USING btree (stack_id, row_number, tier_number);
CREATE INDEX idx_locations_availability ON public.locations USING btree (is_occupied, container_size, client_pool_id, yard_id) WHERE (is_active = true);
CREATE INDEX idx_locations_availability_composite ON public.locations USING btree (yard_id, is_occupied, container_size, is_active) WHERE ((is_active = true) AND (is_occupied = false));
CREATE INDEX idx_locations_available ON public.locations USING btree (available) WHERE (available = true);
CREATE INDEX idx_locations_client_pool ON public.locations USING btree (client_pool_id) WHERE (client_pool_id IS NOT NULL);
CREATE INDEX idx_locations_container_id ON public.locations USING btree (container_id) WHERE (container_id IS NOT NULL);
CREATE INDEX idx_locations_container_number ON public.locations USING btree (container_number) WHERE (container_number IS NOT NULL);
CREATE INDEX idx_locations_location_id ON public.locations USING btree (location_id);
CREATE INDEX idx_locations_occupied_containers ON public.locations USING btree (container_id, yard_id) WHERE ((is_occupied = true) AND (container_id IS NOT NULL));
CREATE INDEX idx_locations_pool_availability ON public.locations USING btree (client_pool_id, is_occupied, container_size) WHERE (is_active = true);
CREATE INDEX idx_locations_stack_id ON public.locations USING btree (stack_id);
CREATE INDEX idx_locations_stack_position ON public.locations USING btree (stack_id, row_number, tier_number) WHERE (is_active = true);
CREATE INDEX idx_locations_stack_row_tier ON public.locations USING btree (stack_id, row_number, tier_number);
CREATE INDEX idx_locations_virtual ON public.locations USING btree (virtual_stack_pair_id) WHERE (is_virtual = true);
CREATE INDEX idx_locations_virtual_pair ON public.locations USING btree (virtual_stack_pair_id, is_occupied) WHERE ((is_virtual = true) AND (is_active = true));
CREATE INDEX idx_locations_yard_id ON public.locations USING btree (yard_id);

CREATE TABLE public."location_id_mappings" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "legacy_string_id" varchar(50) NOT NULL,
  "new_location_id" uuid NOT NULL,
  "migration_batch_id" uuid NOT NULL,
  "migrated_at" timestamptz DEFAULT now(),
  CONSTRAINT "location_id_mappings_new_location_id_fkey" FOREIGN KEY (new_location_id) REFERENCES locations(id) ON DELETE CASCADE,
  CONSTRAINT "unique_legacy_id" UNIQUE (legacy_string_id)
);
CREATE UNIQUE INDEX unique_legacy_id ON public.location_id_mappings USING btree (legacy_string_id);
CREATE INDEX idx_mappings_batch ON public.location_id_mappings USING btree (migration_batch_id);
CREATE INDEX idx_mappings_legacy_id ON public.location_id_mappings USING btree (legacy_string_id);
CREATE INDEX idx_mappings_new_location ON public.location_id_mappings USING btree (new_location_id);

CREATE TABLE public."edi_server_configurations" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "type" text NOT NULL,
  "host" text NOT NULL,
  "port" int4 DEFAULT 22 NOT NULL,
  "username" text NOT NULL,
  "password" text,
  "remote_path" text DEFAULT '/'::text NOT NULL,
  "enabled" bool DEFAULT true NOT NULL,
  "test_mode" bool DEFAULT false NOT NULL,
  "timeout" int4 DEFAULT 30000 NOT NULL,
  "retry_attempts" int4 DEFAULT 3 NOT NULL,
  "partner_code" text NOT NULL,
  "sender_code" text NOT NULL,
  "file_name_pattern" text DEFAULT 'CODECO_{timestamp}_{container}_{operation}.edi'::text NOT NULL,
  "assigned_clients" jsonb DEFAULT '[]'::jsonb,
  "is_default" bool DEFAULT false NOT NULL,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now()
);
CREATE INDEX idx_edi_server_configs_assigned_clients ON public.edi_server_configurations USING gin (assigned_clients);
CREATE INDEX idx_edi_server_configs_enabled ON public.edi_server_configurations USING btree (enabled);
CREATE INDEX idx_edi_server_configs_is_default ON public.edi_server_configurations USING btree (is_default);
CREATE INDEX idx_edi_server_configs_type ON public.edi_server_configurations USING btree (type);

CREATE TABLE public."client_pools" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "yard_id" text NOT NULL,
  "client_id" uuid NOT NULL,
  "client_code" text NOT NULL,
  "client_name" text NOT NULL,
  "assigned_stacks" jsonb DEFAULT '[]'::jsonb,
  "max_capacity" int4 DEFAULT 0 NOT NULL,
  "current_occupancy" int4 DEFAULT 0 NOT NULL,
  "is_active" bool DEFAULT true,
  "priority" text DEFAULT 'medium'::text NOT NULL,
  "contract_start_date" timestamptz DEFAULT now() NOT NULL,
  "contract_end_date" timestamptz,
  "notes" text,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now(),
  "created_by" uuid NOT NULL,
  "updated_by" uuid,
  CONSTRAINT "fk_client_pools_client" FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  CONSTRAINT "fk_client_pools_created_by" FOREIGN KEY (created_by) REFERENCES users(id),
  CONSTRAINT "fk_client_pools_updated_by" FOREIGN KEY (updated_by) REFERENCES users(id)
);
CREATE INDEX idx_client_pools_updated_by ON public.client_pools USING btree (updated_by);
CREATE INDEX idx_client_pools_created_by ON public.client_pools USING btree (created_by);
CREATE INDEX idx_client_pools_active ON public.client_pools USING btree (is_active);
CREATE INDEX idx_client_pools_client ON public.client_pools USING btree (client_id);
CREATE INDEX idx_client_pools_yard ON public.client_pools USING btree (yard_id);

CREATE TABLE public."stack_assignments" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "yard_id" text NOT NULL,
  "stack_id" text NOT NULL,
  "stack_number" int4 NOT NULL,
  "client_pool_id" uuid NOT NULL,
  "client_code" text NOT NULL,
  "is_exclusive" bool DEFAULT false,
  "priority" int4 DEFAULT 1,
  "notes" text,
  "assigned_at" timestamptz DEFAULT now(),
  "assigned_by" uuid NOT NULL,
  CONSTRAINT "fk_stack_assignments_assigned_by" FOREIGN KEY (assigned_by) REFERENCES users(id),
  CONSTRAINT "fk_stack_assignments_pool" FOREIGN KEY (client_pool_id) REFERENCES client_pools(id) ON DELETE CASCADE
);
CREATE INDEX idx_stack_assignments_assigned_by ON public.stack_assignments USING btree (assigned_by);
CREATE INDEX idx_stack_assignments_client ON public.stack_assignments USING btree (client_code);
CREATE INDEX idx_stack_assignments_pool ON public.stack_assignments USING btree (client_pool_id);
CREATE INDEX idx_stack_assignments_yard ON public.stack_assignments USING btree (yard_id);

CREATE TABLE public."booking_references" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "booking_number" text NOT NULL,
  "client_id" uuid,
  "client_code" text NOT NULL,
  "client_name" text NOT NULL,
  "booking_type" text NOT NULL,
  "total_containers" int4 DEFAULT 0 NOT NULL,
  "remaining_containers" int4 DEFAULT 0 NOT NULL,
  "status" text DEFAULT 'pending'::text NOT NULL,
  "valid_from" timestamptz,
  "valid_until" timestamptz,
  "notes" text,
  "created_by" text,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now(),
  "cancellation_reason" text,
  "new_booking_reference" text,
  "container_quantities" jsonb DEFAULT '{"size20ft": 0, "size40ft": 0}'::jsonb,
  "max_quantity_threshold" int4 DEFAULT 10,
  "requires_detailed_breakdown" bool DEFAULT false,
  "transaction_type" text,
  CONSTRAINT "release_orders_client_id_fkey" FOREIGN KEY (client_id) REFERENCES clients(id),
  CONSTRAINT "release_orders_booking_number_key" UNIQUE (booking_number)
);
CREATE UNIQUE INDEX release_orders_booking_number_key ON public.booking_references USING btree (booking_number);
CREATE INDEX idx_booking_references_container_quantities ON public.booking_references USING gin (container_quantities);
CREATE INDEX idx_booking_references_new_booking_ref ON public.booking_references USING btree (new_booking_reference);
CREATE INDEX idx_booking_references_transaction_type ON public.booking_references USING btree (transaction_type);
CREATE INDEX idx_booking_references_updated_at ON public.booking_references USING btree (updated_at);
CREATE INDEX idx_release_orders_booking_number ON public.booking_references USING btree (booking_number);
CREATE INDEX idx_release_orders_client_id ON public.booking_references USING btree (client_id);
CREATE INDEX idx_release_orders_status ON public.booking_references USING btree (status);
CREATE INDEX idx_booking_references_client_lookup ON public.booking_references USING btree (client_id, status) WHERE (status <> 'cancelled'::text);

CREATE TABLE public."gate_in_operations" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "container_id" uuid,
  "container_number" text NOT NULL,
  "client_code" text NOT NULL,
  "client_name" text NOT NULL,
  "container_type" text DEFAULT 'dry'::text NOT NULL,
  "container_size" text NOT NULL,
  "assigned_location" text,
  "damage_reported" bool DEFAULT false,
  "damage_description" text,
  "status" text DEFAULT 'completed'::text,
  "operator_id" text,
  "operator_name" text,
  "yard_id" text NOT NULL,
  "edi_transmitted" bool DEFAULT false,
  "edi_transmission_date" timestamptz,
  "created_at" timestamptz DEFAULT now(),
  "completed_at" timestamptz,
  "entry_date" date DEFAULT CURRENT_DATE NOT NULL,
  "entry_time" time DEFAULT CURRENT_TIME NOT NULL,
  "classification" varchar(20) DEFAULT 'divers'::character varying,
  "damage_assessment_stage" varchar(20) DEFAULT 'assignment'::character varying,
  "damage_assessed_by" varchar(255),
  "damage_assessed_at" timestamptz,
  "damage_type" varchar(50),
  "container_number_confirmed" bool DEFAULT false,
  "container_quantity" int4 DEFAULT 1,
  "second_container_number" varchar(20),
  "second_container_number_confirmed" bool DEFAULT false,
  "notes" text,
  "operation_status" varchar(20) DEFAULT 'pending'::character varying,
  "updated_at" timestamptz DEFAULT now(),
  "updated_by" text,
  "full_empty" text,
  "edi_log_id" uuid,
  "edi_error_message" text,
  "location_assignment_started_at" timestamptz,
  "location_assignment_completed_at" timestamptz,
  "transaction_type" text,
  "is_high_cube" bool DEFAULT false,
  "container_iso_code" text,
  CONSTRAINT "gate_in_operations_container_id_fkey" FOREIGN KEY (container_id) REFERENCES containers(id),
  CONSTRAINT "gate_in_operations_edi_log_id_fkey" FOREIGN KEY (edi_log_id) REFERENCES edi_transmission_logs(id) ON DELETE SET NULL
);
CREATE INDEX idx_gate_in_container_id ON public.gate_in_operations USING btree (container_id);
CREATE INDEX idx_gate_in_created_at ON public.gate_in_operations USING btree (created_at);
CREATE INDEX idx_gate_in_location_assignment_duration ON public.gate_in_operations USING btree (location_assignment_started_at, location_assignment_completed_at) WHERE ((location_assignment_started_at IS NOT NULL) AND (location_assignment_completed_at IS NOT NULL));
CREATE INDEX idx_gate_in_operations_classification ON public.gate_in_operations USING btree (classification);
CREATE INDEX idx_gate_in_operations_client_code_edi ON public.gate_in_operations USING btree (client_code, edi_transmitted);
CREATE INDEX idx_gate_in_operations_container_confirmed ON public.gate_in_operations USING btree (container_number_confirmed);
CREATE INDEX idx_gate_in_operations_container_quantity ON public.gate_in_operations USING btree (container_quantity);
CREATE INDEX idx_gate_in_operations_damage_assessed_at ON public.gate_in_operations USING btree (damage_assessed_at);
CREATE INDEX idx_gate_in_operations_damage_assessment_stage ON public.gate_in_operations USING btree (damage_assessment_stage);
CREATE INDEX idx_gate_in_operations_damage_reported ON public.gate_in_operations USING btree (damage_reported) WHERE (damage_reported = true);
CREATE INDEX idx_gate_in_operations_damage_stage_timing ON public.gate_in_operations USING btree (damage_assessment_stage, damage_assessed_at);
CREATE INDEX idx_gate_in_operations_edi_log_id ON public.gate_in_operations USING btree (edi_log_id);
CREATE INDEX idx_gate_in_operations_edi_transmission_date ON public.gate_in_operations USING btree (edi_transmission_date);
CREATE INDEX idx_gate_in_operations_edi_transmitted ON public.gate_in_operations USING btree (edi_transmitted, created_at) WHERE (edi_transmitted = true);
CREATE INDEX idx_gate_in_operations_full_empty ON public.gate_in_operations USING btree (full_empty);
CREATE INDEX idx_gate_in_operations_operation_status ON public.gate_in_operations USING btree (operation_status);
CREATE INDEX idx_gate_in_operations_second_container_number ON public.gate_in_operations USING btree (second_container_number);
CREATE INDEX idx_gate_in_operations_transaction_type ON public.gate_in_operations USING btree (transaction_type);
CREATE INDEX idx_gate_in_total_duration ON public.gate_in_operations USING btree (created_at, completed_at) WHERE (completed_at IS NOT NULL);
CREATE INDEX idx_gate_in_yard_id ON public.gate_in_operations USING btree (yard_id);
CREATE INDEX idx_gate_in_operations_client_status ON public.gate_in_operations USING btree (client_code, operation_status, created_at);

CREATE TABLE public."gate_out_operations" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "release_order_id" uuid,
  "booking_number" text NOT NULL,
  "client_code" text NOT NULL,
  "client_name" text NOT NULL,
  "booking_type" text,
  "total_containers" int4,
  "processed_containers" int4,
  "remaining_containers" int4,
  "processed_container_ids" jsonb DEFAULT '[]'::jsonb,
  "status" text DEFAULT 'completed'::text,
  "operator_id" text,
  "operator_name" text,
  "yard_id" text NOT NULL,
  "edi_transmitted" bool DEFAULT false,
  "edi_transmission_date" timestamptz,
  "created_at" timestamptz DEFAULT now(),
  "completed_at" timestamptz,
  "updated_at" timestamptz DEFAULT now(),
  "updated_by" text,
  "edi_log_id" uuid,
  "edi_error_message" text,
  CONSTRAINT "gate_out_operations_edi_log_id_fkey" FOREIGN KEY (edi_log_id) REFERENCES edi_transmission_logs(id) ON DELETE SET NULL,
  CONSTRAINT "gate_out_operations_release_order_id_fkey" FOREIGN KEY (release_order_id) REFERENCES booking_references(id)
);
CREATE INDEX idx_gate_out_created_at ON public.gate_out_operations USING btree (created_at);
CREATE INDEX idx_gate_out_operations_client_code_edi ON public.gate_out_operations USING btree (client_code, edi_transmitted);
CREATE INDEX idx_gate_out_operations_edi_log_id ON public.gate_out_operations USING btree (edi_log_id);
CREATE INDEX idx_gate_out_operations_edi_transmission_date ON public.gate_out_operations USING btree (edi_transmission_date);
CREATE INDEX idx_gate_out_operations_edi_transmitted ON public.gate_out_operations USING btree (edi_transmitted, created_at) WHERE (edi_transmitted = true);
CREATE INDEX idx_gate_out_release_id ON public.gate_out_operations USING btree (release_order_id);
CREATE INDEX idx_gate_out_total_duration ON public.gate_out_operations USING btree (created_at, completed_at) WHERE (completed_at IS NOT NULL);
CREATE INDEX idx_gate_out_yard_id ON public.gate_out_operations USING btree (yard_id);

CREATE TABLE public."containers" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "number" text NOT NULL,
  "type" text DEFAULT 'dry'::text NOT NULL,
  "size" text NOT NULL,
  "status" text DEFAULT 'in_depot'::text NOT NULL,
  "location" text,
  "yard_id" text,
  "client_id" uuid,
  "client_code" text,
  "gate_in_date" timestamptz,
  "gate_out_date" timestamptz,
  "damage" jsonb DEFAULT '[]'::jsonb,
  "booking_reference" text,
  "created_by" text,
  "updated_by" text,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now(),
  "classification" varchar(20) DEFAULT 'divers'::character varying,
  "damage_assessment_stage" varchar(20) DEFAULT 'assignment'::character varying,
  "damage_assessed_by" varchar(255),
  "damage_assessed_at" timestamptz,
  "damage_type" varchar(50),
  "number_confirmed" bool DEFAULT false,
  "is_high_cube" bool DEFAULT false,
  "full_empty" text,
  "is_deleted" bool DEFAULT false,
  "deleted_at" timestamptz,
  "deleted_by" uuid,
  "transaction_type" text,
  "buffer_zone_id" uuid,
  "edi_gate_in_transmitted" bool DEFAULT false,
  "edi_gate_out_transmitted" bool DEFAULT false,
  "edi_gate_out_transmission_date" timestamptz,
  "gate_out_operation_id" uuid,
  CONSTRAINT "containers_buffer_zone_id_fkey" FOREIGN KEY (buffer_zone_id) REFERENCES container_buffer_zones(id) ON DELETE SET NULL,
  CONSTRAINT "containers_client_id_fkey" FOREIGN KEY (client_id) REFERENCES clients(id),
  CONSTRAINT "containers_deleted_by_fkey" FOREIGN KEY (deleted_by) REFERENCES users(id),
  CONSTRAINT "containers_gate_out_operation_id_fkey" FOREIGN KEY (gate_out_operation_id) REFERENCES gate_out_operations(id),
  CONSTRAINT "containers_number_key" UNIQUE (number)
);
CREATE INDEX idx_containers_gate_out_operation_id ON public.containers USING btree (gate_out_operation_id) WHERE (gate_out_operation_id IS NOT NULL);
CREATE INDEX idx_containers_deleted_by ON public.containers USING btree (deleted_by);
CREATE INDEX idx_containers_buffer_zone_id ON public.containers USING btree (buffer_zone_id);
CREATE UNIQUE INDEX containers_number_key ON public.containers USING btree (number);
CREATE INDEX idx_containers_classification ON public.containers USING btree (classification);
CREATE INDEX idx_containers_client_code ON public.containers USING btree (client_code);
CREATE INDEX idx_containers_client_id ON public.containers USING btree (client_id);
CREATE INDEX idx_containers_damage_assessment_stage ON public.containers USING btree (damage_assessment_stage);
CREATE INDEX idx_containers_deleted_at ON public.containers USING btree (deleted_at) WHERE (deleted_at IS NOT NULL);
CREATE INDEX idx_containers_full_empty ON public.containers USING btree (full_empty);
CREATE INDEX idx_containers_is_deleted ON public.containers USING btree (is_deleted) WHERE (is_deleted = false);
CREATE INDEX idx_containers_location_pattern ON public.containers USING btree (location) WHERE (location ~ '^S\d+-R\d+-H\d+$'::text);
CREATE INDEX idx_containers_number ON public.containers USING btree (number);
CREATE INDEX idx_containers_status ON public.containers USING btree (status);
CREATE INDEX idx_containers_yard_id ON public.containers USING btree (yard_id);
CREATE INDEX idx_containers_location_active ON public.containers USING btree (location) WHERE (status = 'in_depot'::text);
CREATE INDEX idx_containers_transaction_type ON public.containers USING btree (transaction_type);
CREATE INDEX idx_containers_edi_gate_out_transmitted ON public.containers USING btree (edi_gate_out_transmitted) WHERE (edi_gate_out_transmitted = false);

CREATE TABLE public."container_buffer_zones" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "container_id" uuid NOT NULL,
  "gate_in_operation_id" uuid,
  "buffer_stack_id" uuid,
  "yard_id" text NOT NULL,
  "damage_type" text,
  "damage_description" text,
  "damage_assessment" jsonb,
  "status" text DEFAULT 'in_buffer'::text NOT NULL,
  "released_at" timestamptz,
  "released_by" uuid,
  "release_notes" text,
  "created_at" timestamptz DEFAULT now(),
  "created_by" uuid,
  "updated_at" timestamptz DEFAULT now(),
  CONSTRAINT "container_buffer_zones_buffer_stack_id_fkey" FOREIGN KEY (buffer_stack_id) REFERENCES stacks(id) ON DELETE SET NULL,
  CONSTRAINT "container_buffer_zones_container_id_fkey" FOREIGN KEY (container_id) REFERENCES containers(id) ON DELETE CASCADE,
  CONSTRAINT "container_buffer_zones_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT "container_buffer_zones_gate_in_operation_id_fkey" FOREIGN KEY (gate_in_operation_id) REFERENCES gate_in_operations(id) ON DELETE SET NULL,
  CONSTRAINT "container_buffer_zones_released_by_fkey" FOREIGN KEY (released_by) REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX idx_container_buffer_zones_container_id ON public.container_buffer_zones USING btree (container_id);
CREATE INDEX idx_container_buffer_zones_yard_id ON public.container_buffer_zones USING btree (yard_id);
CREATE INDEX idx_container_buffer_zones_status ON public.container_buffer_zones USING btree (status);
CREATE INDEX idx_container_buffer_zones_buffer_stack_id ON public.container_buffer_zones USING btree (buffer_stack_id);
CREATE INDEX idx_container_buffer_zones_gate_in_operation_id ON public.container_buffer_zones USING btree (gate_in_operation_id);
CREATE INDEX idx_container_buffer_zones_created_by ON public.container_buffer_zones USING btree (created_by);
CREATE INDEX idx_container_buffer_zones_released_by ON public.container_buffer_zones USING btree (released_by);

CREATE TABLE public."edi_client_settings" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "client_id" uuid,
  "client_code" text NOT NULL,
  "client_name" text NOT NULL,
  "edi_enabled" bool DEFAULT false NOT NULL,
  "enable_gate_in" bool DEFAULT true NOT NULL,
  "enable_gate_out" bool DEFAULT true NOT NULL,
  "server_config_id" uuid,
  "priority" text DEFAULT 'normal'::text NOT NULL,
  "notes" text,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now(),
  "notification_prefs" jsonb DEFAULT '{"channels": ["in-app"], "notifyOnFailure": true, "notifyOnSuccess": false}'::jsonb,
  CONSTRAINT "edi_client_settings_client_id_fkey" FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  CONSTRAINT "edi_client_settings_server_config_id_fkey" FOREIGN KEY (server_config_id) REFERENCES edi_server_configurations(id) ON DELETE SET NULL,
  CONSTRAINT "edi_client_settings_client_id_key" UNIQUE (client_id)
);
CREATE UNIQUE INDEX edi_client_settings_client_id_key ON public.edi_client_settings USING btree (client_id);
CREATE INDEX idx_edi_client_settings_client_code ON public.edi_client_settings USING btree (client_code);
CREATE INDEX idx_edi_client_settings_client_id ON public.edi_client_settings USING btree (client_id);
CREATE INDEX idx_edi_client_settings_edi_enabled ON public.edi_client_settings USING btree (edi_enabled);
CREATE INDEX idx_edi_client_settings_priority ON public.edi_client_settings USING btree (priority);
CREATE INDEX idx_edi_client_settings_server_config_id ON public.edi_client_settings USING btree (server_config_id);

CREATE TABLE public."edi_transmission_logs" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "container_number" text NOT NULL,
  "operation" text NOT NULL,
  "status" text DEFAULT 'pending'::text NOT NULL,
  "attempts" int4 DEFAULT 0 NOT NULL,
  "last_attempt" timestamptz DEFAULT now(),
  "file_name" text NOT NULL,
  "file_size" int4 DEFAULT 0,
  "file_content" text,
  "partner_code" text NOT NULL,
  "config_id" uuid,
  "uploaded_to_sftp" bool DEFAULT false NOT NULL,
  "error_message" text,
  "acknowledgment_received" timestamptz,
  "container_id" uuid,
  "gate_in_operation_id" uuid,
  "client_id" uuid,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now(),
  "remote_path" text,
  "gate_out_operation_id" uuid,
  CONSTRAINT "edi_transmission_logs_client_id_fkey" FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL,
  CONSTRAINT "edi_transmission_logs_config_id_fkey" FOREIGN KEY (config_id) REFERENCES edi_server_configurations(id) ON DELETE SET NULL,
  CONSTRAINT "edi_transmission_logs_container_id_fkey" FOREIGN KEY (container_id) REFERENCES containers(id) ON DELETE SET NULL,
  CONSTRAINT "edi_transmission_logs_gate_in_operation_id_fkey" FOREIGN KEY (gate_in_operation_id) REFERENCES gate_in_operations(id) ON DELETE SET NULL,
  CONSTRAINT "edi_transmission_logs_gate_out_operation_id_fkey" FOREIGN KEY (gate_out_operation_id) REFERENCES gate_out_operations(id) ON DELETE SET NULL
);
CREATE INDEX idx_edi_transmission_logs_gate_in_op_id ON public.edi_transmission_logs USING btree (gate_in_operation_id);
CREATE INDEX idx_edi_transmission_logs_gate_out_op_id ON public.edi_transmission_logs USING btree (gate_out_operation_id);
CREATE INDEX idx_edi_logs_client_status_date ON public.edi_transmission_logs USING btree (client_id, status, created_at DESC);
CREATE INDEX idx_edi_logs_config_operation_date ON public.edi_transmission_logs USING btree (config_id, operation, created_at DESC);
CREATE INDEX idx_edi_transmission_logs_client_id ON public.edi_transmission_logs USING btree (client_id);
CREATE INDEX idx_edi_transmission_logs_client_operation ON public.edi_transmission_logs USING btree (client_id, operation);
CREATE INDEX idx_edi_transmission_logs_config_id ON public.edi_transmission_logs USING btree (config_id);
CREATE INDEX idx_edi_transmission_logs_container_id ON public.edi_transmission_logs USING btree (container_id);
CREATE INDEX idx_edi_transmission_logs_container_number ON public.edi_transmission_logs USING btree (container_number);
CREATE INDEX idx_edi_transmission_logs_created_at ON public.edi_transmission_logs USING btree (created_at);
CREATE INDEX idx_edi_transmission_logs_last_attempt ON public.edi_transmission_logs USING btree (last_attempt);
CREATE INDEX idx_edi_transmission_logs_operation ON public.edi_transmission_logs USING btree (operation);
CREATE INDEX idx_edi_transmission_logs_partner_code ON public.edi_transmission_logs USING btree (partner_code);
CREATE INDEX idx_edi_transmission_logs_status ON public.edi_transmission_logs USING btree (status);
CREATE INDEX idx_edi_transmission_logs_status_created_at ON public.edi_transmission_logs USING btree (status, created_at);
CREATE INDEX idx_edi_transmission_logs_uploaded_sftp ON public.edi_transmission_logs USING btree (uploaded_to_sftp);
CREATE INDEX idx_edi_transmission_logs_status_pending ON public.edi_transmission_logs USING btree (status, created_at) WHERE (status = ANY (ARRAY['pending'::text, 'retrying'::text]));

CREATE TABLE public."edi_notifications" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "type" text NOT NULL,
  "client_code" text NOT NULL,
  "container_number" text NOT NULL,
  "operation" text NOT NULL,
  "transmission_log_id" uuid,
  "message" text NOT NULL,
  "read" bool DEFAULT false NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "edi_notifications_transmission_log_id_fkey" FOREIGN KEY (transmission_log_id) REFERENCES edi_transmission_logs(id) ON DELETE SET NULL
);
CREATE INDEX idx_edi_notifications_read ON public.edi_notifications USING btree (read);
CREATE INDEX idx_edi_notifications_client_code ON public.edi_notifications USING btree (client_code);
CREATE INDEX idx_edi_notifications_created_at ON public.edi_notifications USING btree (created_at DESC);

CREATE TABLE public."gate_in_edi_details" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "gate_in_operation_id" uuid NOT NULL,
  "edi_message_id" text,
  "edi_client_name" text,
  "edi_client_code" text,
  "edi_processing_started_at" timestamptz,
  "edi_gate_in_transmitted" bool DEFAULT false,
  "edi_transmission_date" timestamptz,
  "edi_log_id" uuid,
  "edi_error_message" text,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now(),
  CONSTRAINT "fk_gate_in_edi_details_log" FOREIGN KEY (edi_log_id) REFERENCES edi_transmission_logs(id),
  CONSTRAINT "fk_gate_in_edi_details_operation" FOREIGN KEY (gate_in_operation_id) REFERENCES gate_in_operations(id) ON DELETE CASCADE,
  CONSTRAINT "gate_in_edi_details_gate_in_operation_id_key" UNIQUE (gate_in_operation_id)
);
CREATE INDEX idx_gate_in_edi_details_edi_log_id ON public.gate_in_edi_details USING btree (edi_log_id);
CREATE UNIQUE INDEX gate_in_edi_details_gate_in_operation_id_key ON public.gate_in_edi_details USING btree (gate_in_operation_id);
CREATE INDEX idx_gate_in_edi_details_operation ON public.gate_in_edi_details USING btree (gate_in_operation_id);
CREATE INDEX idx_gate_in_edi_details_transmitted ON public.gate_in_edi_details USING btree (edi_gate_in_transmitted, created_at);

CREATE TABLE public."gate_in_transport_info" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "gate_in_operation_id" uuid NOT NULL,
  "transport_company" text,
  "driver_name" text,
  "driver_phone" text,
  "vehicle_number" text,
  "truck_arrival_date" date,
  "truck_arrival_time" time,
  "booking_reference" varchar(100),
  "equipment_reference" text,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now(),
  CONSTRAINT "fk_gate_in_transport_operation" FOREIGN KEY (gate_in_operation_id) REFERENCES gate_in_operations(id) ON DELETE CASCADE,
  CONSTRAINT "gate_in_transport_info_gate_in_operation_id_key" UNIQUE (gate_in_operation_id)
);
CREATE UNIQUE INDEX gate_in_transport_info_gate_in_operation_id_key ON public.gate_in_transport_info USING btree (gate_in_operation_id);
CREATE INDEX idx_gate_in_transport_operation ON public.gate_in_transport_info USING btree (gate_in_operation_id);
CREATE INDEX idx_gate_in_transport_vehicle ON public.gate_in_transport_info USING btree (vehicle_number);

CREATE TABLE public."gate_in_damage_assessments" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "gate_in_operation_id" uuid NOT NULL,
  "damage_reported" bool DEFAULT false,
  "damage_description" text,
  "damage_type" varchar(50),
  "damage_assessment" jsonb,
  "damage_assessment_stage" varchar(20) DEFAULT 'assignment'::character varying,
  "damage_assessed_by" varchar(255),
  "damage_assessed_at" timestamptz,
  "damage_assessment_started_at" timestamptz,
  "damage_assessment_completed_at" timestamptz,
  "is_buffer_assignment" bool DEFAULT false,
  "buffer_zone_reason" text,
  "assigned_stack" varchar(50),
  "assigned_location" text,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now(),
  CONSTRAINT "fk_gate_in_damage_operation" FOREIGN KEY (gate_in_operation_id) REFERENCES gate_in_operations(id) ON DELETE CASCADE,
  CONSTRAINT "gate_in_damage_assessments_gate_in_operation_id_key" UNIQUE (gate_in_operation_id)
);
CREATE UNIQUE INDEX gate_in_damage_assessments_gate_in_operation_id_key ON public.gate_in_damage_assessments USING btree (gate_in_operation_id);
CREATE INDEX idx_gate_in_damage_operation ON public.gate_in_damage_assessments USING btree (gate_in_operation_id);
CREATE INDEX idx_gate_in_damage_stage ON public.gate_in_damage_assessments USING btree (damage_assessment_stage);
CREATE INDEX idx_gate_in_damage_assessment_json ON public.gate_in_damage_assessments USING gin (damage_assessment);

CREATE TABLE public."gate_out_edi_details" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "gate_out_operation_id" uuid NOT NULL,
  "edi_message_id" text,
  "edi_client_name" text,
  "edi_processing_started_at" timestamptz,
  "edi_gate_out_transmitted" bool DEFAULT false,
  "edi_transmission_date" timestamptz,
  "edi_log_id" uuid,
  "edi_error_message" text,
  "container_selection_started_at" timestamptz,
  "container_selection_completed_at" timestamptz,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now(),
  CONSTRAINT "fk_gate_out_edi_details_log" FOREIGN KEY (edi_log_id) REFERENCES edi_transmission_logs(id),
  CONSTRAINT "fk_gate_out_edi_details_operation" FOREIGN KEY (gate_out_operation_id) REFERENCES gate_out_operations(id) ON DELETE CASCADE,
  CONSTRAINT "gate_out_edi_details_gate_out_operation_id_key" UNIQUE (gate_out_operation_id)
);
CREATE INDEX idx_gate_out_edi_details_edi_log_id ON public.gate_out_edi_details USING btree (edi_log_id);
CREATE UNIQUE INDEX gate_out_edi_details_gate_out_operation_id_key ON public.gate_out_edi_details USING btree (gate_out_operation_id);
CREATE INDEX idx_gate_out_edi_details_operation ON public.gate_out_edi_details USING btree (gate_out_operation_id);
CREATE INDEX idx_gate_out_edi_details_transmitted ON public.gate_out_edi_details USING btree (edi_gate_out_transmitted, created_at);

CREATE TABLE public."gate_out_transport_info" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "gate_out_operation_id" uuid NOT NULL,
  "transport_company" text,
  "driver_name" text,
  "driver_phone" text,
  "vehicle_number" text,
  "booking_number" text NOT NULL,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now(),
  CONSTRAINT "fk_gate_out_transport_operation" FOREIGN KEY (gate_out_operation_id) REFERENCES gate_out_operations(id) ON DELETE CASCADE,
  CONSTRAINT "gate_out_transport_info_gate_out_operation_id_key" UNIQUE (gate_out_operation_id)
);
CREATE UNIQUE INDEX gate_out_transport_info_gate_out_operation_id_key ON public.gate_out_transport_info USING btree (gate_out_operation_id);
CREATE INDEX idx_gate_out_transport_operation ON public.gate_out_transport_info USING btree (gate_out_operation_id);
CREATE INDEX idx_gate_out_transport_booking ON public.gate_out_transport_info USING btree (booking_number);

CREATE TABLE public."audit_logs" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "entity_type" text NOT NULL,
  "entity_id" text NOT NULL,
  "action" text NOT NULL,
  "changes" jsonb DEFAULT '{}'::jsonb,
  "user_id" text,
  "user_name" text,
  "timestamp" timestamptz DEFAULT now(),
  "ip_address" text,
  "user_agent" text
);
CREATE INDEX idx_audit_logs_entity ON public.audit_logs USING btree (entity_type, entity_id);
CREATE INDEX idx_audit_logs_timestamp ON public.audit_logs USING btree ("timestamp");

CREATE TABLE public."location_audit_log" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "location_id" uuid,
  "operation" varchar(20) NOT NULL,
  "old_values" jsonb,
  "new_values" jsonb,
  "user_id" uuid,
  "user_email" text,
  "timestamp" timestamptz DEFAULT now(),
  "ip_address" text,
  "user_agent" text,
  CONSTRAINT "location_audit_log_location_id_fkey" FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL
);
CREATE INDEX idx_audit_location_time_range ON public.location_audit_log USING btree (location_id, "timestamp" DESC, operation);
CREATE INDEX idx_audit_location_timestamp ON public.location_audit_log USING btree (location_id, "timestamp" DESC);
CREATE INDEX idx_audit_new_values_gin ON public.location_audit_log USING gin (new_values);
CREATE INDEX idx_audit_old_values_gin ON public.location_audit_log USING gin (old_values);
CREATE INDEX idx_audit_operation ON public.location_audit_log USING btree (operation, "timestamp" DESC);
CREATE INDEX idx_audit_operation_timestamp ON public.location_audit_log USING btree (operation, "timestamp" DESC);
CREATE INDEX idx_audit_user_timestamp ON public.location_audit_log USING btree (user_id, "timestamp" DESC) WHERE (user_id IS NOT NULL);

CREATE TABLE public."user_activities" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "action" varchar(100) NOT NULL,
  "entity_type" varchar(50),
  "entity_id" uuid,
  "description" text,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "ip_address" varchar(45),
  "user_agent" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "user_activities_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_user_activities_action ON public.user_activities USING btree (action);
CREATE INDEX idx_user_activities_created_at ON public.user_activities USING btree (created_at DESC);
CREATE INDEX idx_user_activities_entity ON public.user_activities USING btree (entity_type, entity_id);
CREATE INDEX idx_user_activities_user_date ON public.user_activities USING btree (user_id, created_at DESC);
CREATE INDEX idx_user_activities_user_id ON public.user_activities USING btree (user_id);

CREATE TABLE public."user_login_history" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "login_time" timestamptz DEFAULT now() NOT NULL,
  "logout_time" timestamptz,
  "session_duration_minutes" int4,
  "ip_address" varchar(45),
  "user_agent" text,
  "login_method" varchar(50) DEFAULT 'email'::character varying,
  "is_successful" bool DEFAULT true,
  "failure_reason" text,
  "location_info" jsonb DEFAULT '{}'::jsonb,
  "device_info" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "user_login_history_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_login_history_ip_address ON public.user_login_history USING btree (ip_address);
CREATE INDEX idx_login_history_login_time ON public.user_login_history USING btree (login_time DESC);
CREATE INDEX idx_login_history_successful ON public.user_login_history USING btree (is_successful);
CREATE INDEX idx_login_history_user_id ON public.user_login_history USING btree (user_id);
CREATE INDEX idx_login_history_user_login ON public.user_login_history USING btree (user_id, login_time DESC);

CREATE TABLE public."user_module_access" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "module_permissions" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "updated_at" timestamptz DEFAULT now(),
  "updated_by" uuid,
  "sync_version" int4 DEFAULT 1,
  "last_sync_at" timestamptz DEFAULT now(),
  "sync_source" text DEFAULT 'user_module_access'::text,
  CONSTRAINT "fk_user_module_access_updated_by" FOREIGN KEY (updated_by) REFERENCES users(id),
  CONSTRAINT "fk_user_module_access_user" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT "user_module_access_user_id_key" UNIQUE (user_id)
);
CREATE INDEX idx_user_module_access_updated_by ON public.user_module_access USING btree (updated_by);
CREATE UNIQUE INDEX user_module_access_user_id_key ON public.user_module_access USING btree (user_id);
CREATE INDEX idx_user_module_access_containers ON public.user_module_access USING btree (((module_permissions ->> 'containers'::text)));
CREATE INDEX idx_user_module_access_dashboard ON public.user_module_access USING btree (((module_permissions ->> 'dashboard'::text)));
CREATE INDEX idx_user_module_access_has_permissions ON public.user_module_access USING btree ((((jsonb_typeof(module_permissions) = 'object'::text) AND (module_permissions <> '{}'::jsonb))));
CREATE INDEX idx_user_module_access_last_sync ON public.user_module_access USING btree (last_sync_at);
CREATE INDEX idx_user_module_access_module_access ON public.user_module_access USING btree (((module_permissions ->> 'moduleAccess'::text)));
CREATE INDEX idx_user_module_access_permissions_gin ON public.user_module_access USING gin (module_permissions);
CREATE INDEX idx_user_module_access_recent_updates ON public.user_module_access USING btree (updated_at DESC, user_id);
CREATE INDEX idx_user_module_access_sync_composite ON public.user_module_access USING btree (user_id, sync_version, last_sync_at);
CREATE INDEX idx_user_module_access_sync_source ON public.user_module_access USING btree (sync_source);
CREATE INDEX idx_user_module_access_sync_tracking ON public.user_module_access USING btree (user_id, last_sync_at, sync_version, updated_at);
CREATE INDEX idx_user_module_access_sync_version ON public.user_module_access USING btree (sync_version);
CREATE INDEX idx_user_module_access_user ON public.user_module_access USING btree (user_id);
CREATE INDEX idx_user_module_access_users ON public.user_module_access USING btree (((module_permissions ->> 'users'::text)));

CREATE TABLE public."module_access_sync_log" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid,
  "sync_type" text NOT NULL,
  "source_table" text NOT NULL,
  "target_table" text NOT NULL,
  "old_permissions" jsonb,
  "new_permissions" jsonb,
  "sync_status" text NOT NULL,
  "error_message" text,
  "sync_duration_ms" int4,
  "created_at" timestamptz DEFAULT now(),
  "created_by" uuid,
  CONSTRAINT "fk_sync_log_created_by" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT "fk_sync_log_user_id" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_sync_log_created_at ON public.module_access_sync_log USING btree (created_at DESC);
CREATE INDEX idx_sync_log_created_by ON public.module_access_sync_log USING btree (created_by);
CREATE INDEX idx_sync_log_sync_status ON public.module_access_sync_log USING btree (sync_status);
CREATE INDEX idx_sync_log_sync_type ON public.module_access_sync_log USING btree (sync_type);
CREATE INDEX idx_sync_log_type_status_date ON public.module_access_sync_log USING btree (sync_type, sync_status, created_at DESC);
CREATE INDEX idx_sync_log_user_id ON public.module_access_sync_log USING btree (user_id);
CREATE INDEX idx_sync_log_user_status_date ON public.module_access_sync_log USING btree (user_id, sync_status, created_at DESC);

-- ================================================================
-- 3. VIEWS & MATERIALIZED VIEWS
-- ================================================================


CREATE VIEW public."active_stacks" AS
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

CREATE VIEW public."buffer_zone_stats" AS
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

CREATE VIEW public."damage_assessments_by_stage" AS
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

CREATE VIEW public."edi_client_settings_with_server" AS
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

CREATE VIEW public."edi_client_summary" AS
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

CREATE VIEW public."edi_server_utilization" AS
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

CREATE VIEW public."edi_statistics" AS
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

CREATE VIEW public."edi_transmission_summary" AS
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

CREATE VIEW public."gate_operations_with_edi" AS
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

CREATE VIEW public."stack_status_summary" AS
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

CREATE VIEW public."sync_performance_metrics" AS
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

CREATE VIEW public."v_40ft_container_validation" AS
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

CREATE VIEW public."v_gate_in_operations_full" AS
 SELECT gio.id,
    gio.container_id,
    gio.container_number,
    gio.client_code,
    gio.client_name,
    gio.container_type,
    gio.container_size,
    gio.status,
    gio.operator_id,
    gio.operator_name,
    gio.yard_id,
    gio.created_at,
    gio.completed_at,
    gio.entry_date,
    gio.entry_time,
    gio.classification,
    gio.container_number_confirmed,
    gio.second_container_number,
    gio.second_container_number_confirmed,
    gio.operation_status,
    gio.updated_at,
    gio.updated_by,
    gio.full_empty,
    gio.container_quantity,
    gio.transaction_type,
    gied.edi_message_id,
    gied.edi_client_name,
    gied.edi_client_code,
    gied.edi_gate_in_transmitted,
    gied.edi_transmission_date,
    gied.edi_log_id,
    gied.edi_error_message,
    gti.transport_company,
    gti.driver_name,
    gti.driver_phone,
    gti.vehicle_number,
    gti.truck_arrival_date,
    gti.truck_arrival_time,
    gti.booking_reference AS transport_booking_reference,
    gti.equipment_reference,
    gda.damage_reported,
    gda.damage_description,
    gda.damage_type,
    gda.damage_assessment,
    gda.damage_assessed_by,
    gda.damage_assessed_at,
    gda.damage_assessment_stage,
    gda.is_buffer_assignment,
    gda.assigned_stack,
    gda.assigned_location
   FROM (((gate_in_operations gio
     LEFT JOIN gate_in_edi_details gied ON ((gio.id = gied.gate_in_operation_id)))
     LEFT JOIN gate_in_transport_info gti ON ((gio.id = gti.gate_in_operation_id)))
     LEFT JOIN gate_in_damage_assessments gda ON ((gio.id = gda.gate_in_operation_id)));;

CREATE VIEW public."v_stacks_with_pairings" AS
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

CREATE MATERIALIZED VIEW public."edi_client_performance" AS
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
CREATE UNIQUE INDEX idx_edi_client_performance_unique ON public.edi_client_performance USING btree (client_id, last_updated);

CREATE MATERIALIZED VIEW public."edi_dashboard_stats" AS
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
CREATE UNIQUE INDEX idx_edi_dashboard_stats_unique ON public.edi_dashboard_stats USING btree (last_updated);

CREATE MATERIALIZED VIEW public."location_statistics_by_stack" AS
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
CREATE UNIQUE INDEX idx_location_stats_stack ON public.location_statistics_by_stack USING btree (stack_id);
CREATE INDEX idx_location_stats_stack_yard ON public.location_statistics_by_stack USING btree (yard_id, occupancy_percentage);

CREATE MATERIALIZED VIEW public."location_statistics_by_yard" AS
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
CREATE UNIQUE INDEX idx_location_stats_yard ON public.location_statistics_by_yard USING btree (yard_id);

CREATE MATERIALIZED VIEW public."sync_health_summary" AS
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
CREATE UNIQUE INDEX idx_sync_health_summary_unique ON public.sync_health_summary USING btree (last_updated);

-- ================================================================
-- 4. FUNCTIONS
-- ================================================================


CREATE OR REPLACE FUNCTION public.add_container_audit_log()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN

    RETURN NEW;
END;
$function$
;

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
  v_should_process boolean := false;
BEGIN
  -- Determine operation type based on table
  IF TG_TABLE_NAME = 'gate_in_operations' THEN
    v_operation_type := 'GATE_IN';
    -- For Gate In: only process when status changes to 'completed' and container is assigned
    v_should_process := (NEW.status = 'completed' AND NEW.assigned_location IS NOT NULL AND
                        (OLD.status IS NULL OR OLD.status != 'completed'));
  ELSIF TG_TABLE_NAME = 'gate_out_operations' THEN
    v_operation_type := 'GATE_OUT';
    -- For Gate Out: only process when status changes to 'completed'
    -- Note: gate_out_operations doesn't have assigned_location field
    v_should_process := (NEW.status = 'completed' AND
                        (OLD.status IS NULL OR OLD.status != 'completed'));
  ELSE
    RETURN NEW; -- Unknown table, skip EDI processing
  END IF;

  -- Only process if conditions are met
  IF v_should_process THEN
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
          -- For Gate In, use container_number; for Gate Out, we'll handle it differently
          IF TG_TABLE_NAME = 'gate_in_operations' THEN
            SELECT log_edi_transmission(
              NEW.container_number,
              v_operation_type,
              NEW.container_id,
              NEW.id,
              v_client_id
            ) INTO v_edi_log_id;
          ELSIF TG_TABLE_NAME = 'gate_out_operations' THEN
            -- For Gate Out, we don't have a single container_number in the operation
            -- EDI transmission will be handled by the application code
            -- Just mark that EDI should be processed
            NULL; -- No log creation here for Gate Out
          END IF;

          -- Update the operation with EDI log reference (only for Gate In)
          IF v_edi_log_id IS NOT NULL THEN
            NEW.edi_log_id := v_edi_log_id;
            NEW.edi_transmitted := false; -- Will be updated to true when transmission succeeds
          END IF;
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.auto_mark_buffer_zones()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN

    RETURN NEW;
END;
$function$
;

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

CREATE OR REPLACE FUNCTION public.log_location_changes()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN

    RETURN COALESCE(NEW, OLD);
END;
$function$
;

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

CREATE OR REPLACE FUNCTION public.refresh_edi_client_performance()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY edi_client_performance;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.refresh_edi_dashboard_stats()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY edi_dashboard_stats;
END;
$function$
;

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

CREATE OR REPLACE FUNCTION public.sync_client_info_booking_references()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
      DECLARE
        client_record RECORD;
      BEGIN
        IF NEW.client_id IS NOT NULL THEN
          SELECT code, name INTO client_record
          FROM public.clients
          WHERE id = NEW.client_id;

          IF FOUND THEN
            NEW.client_code := client_record.code;
            NEW.client_name := client_record.name;
          END IF;
        END IF;

        RETURN NEW;
      END;
      $function$
;

CREATE OR REPLACE FUNCTION public.sync_client_info_containers()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
      DECLARE
        client_record RECORD;
      BEGIN
        IF NEW.client_id IS NOT NULL THEN
          SELECT code, name INTO client_record
          FROM public.clients
          WHERE id = NEW.client_id;

          IF FOUND THEN
            NEW.client_code := client_record.code;
            -- client_name n'existe plus dans containers, on le skip
          END IF;
        END IF;

        RETURN NEW;
      END;
      $function$
;

CREATE OR REPLACE FUNCTION public.sync_gate_in_edi_details()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
        BEGIN
          IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
            INSERT INTO public.gate_in_edi_details (
              gate_in_operation_id, updated_at
            ) VALUES (
              NEW.id, now()
            )
            ON CONFLICT (gate_in_operation_id) DO UPDATE SET
              updated_at = now();
          END IF;
          RETURN NEW;
        END;
        $function$
;

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

CREATE OR REPLACE FUNCTION public.trigger_refresh_location_statistics()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN

    RETURN COALESCE(NEW, OLD);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trigger_update_stack_occupancy()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN

    RETURN COALESCE(NEW, OLD);
END;
$function$
;

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

CREATE OR REPLACE FUNCTION public.update_stack_capacity()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN

    RETURN NEW;
END;
$function$
;

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

CREATE OR REPLACE FUNCTION public.validate_40ft_container_stack()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN

    RETURN NEW;
END;
$function$
;

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

-- ================================================================
-- 5. TRIGGERS
-- ================================================================


CREATE TRIGGER client_pools_updated_at BEFORE UPDATE ON public.client_pools FOR EACH ROW EXECUTE FUNCTION update_client_pools_updated_at();

CREATE TRIGGER container_audit_log_trigger BEFORE INSERT OR UPDATE ON public.containers FOR EACH ROW EXECUTE FUNCTION add_container_audit_log();

CREATE TRIGGER containers_update_stack_occupancy AFTER INSERT OR DELETE OR UPDATE ON public.containers FOR EACH ROW EXECUTE FUNCTION trigger_update_stack_occupancy();

CREATE TRIGGER location_stats_refresh_trigger AFTER INSERT OR DELETE OR UPDATE ON public.locations FOR EACH ROW EXECUTE FUNCTION trigger_refresh_location_statistics();

CREATE TRIGGER locations_audit_trigger AFTER INSERT OR DELETE OR UPDATE ON public.locations FOR EACH ROW EXECUTE FUNCTION log_location_changes();

CREATE TRIGGER locations_updated_at_trigger BEFORE UPDATE ON public.locations FOR EACH ROW EXECUTE FUNCTION update_locations_updated_at();

CREATE TRIGGER stack_soft_delete_trigger AFTER UPDATE ON public.stacks FOR EACH ROW WHEN ((old.is_active IS DISTINCT FROM new.is_active)) EXECUTE FUNCTION handle_stack_soft_delete();

CREATE TRIGGER trigger_auto_create_edi_transmission_gate_in BEFORE UPDATE ON public.gate_in_operations FOR EACH ROW EXECUTE FUNCTION auto_create_edi_transmission_on_gate_completion();

CREATE TRIGGER trigger_auto_create_edi_transmission_gate_out BEFORE UPDATE ON public.gate_out_operations FOR EACH ROW EXECUTE FUNCTION auto_create_edi_transmission_on_gate_completion();

CREATE TRIGGER trigger_auto_mark_buffer_zones BEFORE INSERT OR UPDATE ON public.stacks FOR EACH ROW EXECUTE FUNCTION auto_mark_buffer_zones();

CREATE TRIGGER trigger_booking_references_updated_at BEFORE UPDATE ON public.booking_references FOR EACH ROW EXECUTE FUNCTION update_booking_references_updated_at();

CREATE TRIGGER trigger_buffer_zone_updated_at BEFORE UPDATE ON public.container_buffer_zones FOR EACH ROW EXECUTE FUNCTION update_buffer_zone_updated_at();

CREATE TRIGGER trigger_calculate_session_duration BEFORE UPDATE ON public.user_login_history FOR EACH ROW WHEN (((new.logout_time IS NOT NULL) AND (old.logout_time IS NULL))) EXECUTE FUNCTION calculate_session_duration();

CREATE TRIGGER trigger_sync_client_info_booking BEFORE INSERT OR UPDATE ON public.booking_references FOR EACH ROW EXECUTE FUNCTION sync_client_info_booking_references();

CREATE TRIGGER trigger_sync_client_info_containers BEFORE INSERT OR UPDATE ON public.containers FOR EACH ROW EXECUTE FUNCTION sync_client_info_containers();

CREATE TRIGGER trigger_sync_gate_in_edi_details AFTER INSERT OR UPDATE ON public.gate_in_operations FOR EACH ROW EXECUTE FUNCTION sync_gate_in_edi_details();

CREATE TRIGGER trigger_update_containers_damage_assessed_at BEFORE UPDATE ON public.containers FOR EACH ROW EXECUTE FUNCTION update_containers_damage_assessed_at();

CREATE TRIGGER trigger_update_damage_assessed_at BEFORE UPDATE ON public.gate_in_operations FOR EACH ROW EXECUTE FUNCTION update_gate_in_damage_assessed_at();

CREATE TRIGGER trigger_update_stack_capacity BEFORE INSERT OR UPDATE ON public.stacks FOR EACH ROW EXECUTE FUNCTION update_stack_capacity();

CREATE TRIGGER trigger_update_users_audit_fields BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_users_audit_fields();

CREATE TRIGGER trigger_update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_users_updated_at();

CREATE TRIGGER update_edi_client_settings_updated_at BEFORE UPDATE ON public.edi_client_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_edi_server_configurations_updated_at BEFORE UPDATE ON public.edi_server_configurations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_edi_transmission_logs_updated_at BEFORE UPDATE ON public.edi_transmission_logs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gate_in_operations_updated_at BEFORE UPDATE ON public.gate_in_operations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gate_out_operations_updated_at BEFORE UPDATE ON public.gate_out_operations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER user_module_access_sync_tracking BEFORE UPDATE ON public.user_module_access FOR EACH ROW EXECUTE FUNCTION update_user_module_access_sync_tracking();

CREATE TRIGGER validate_40ft_container_stack_trigger BEFORE INSERT OR UPDATE ON public.containers FOR EACH ROW EXECUTE FUNCTION validate_40ft_container_stack();

CREATE TRIGGER virtual_pairs_updated_at_trigger BEFORE UPDATE ON public.virtual_stack_pairs FOR EACH ROW EXECUTE FUNCTION update_virtual_pairs_updated_at();

-- ================================================================
-- 6. DONNÉES DES TABLES
-- ================================================================

INSERT INTO public."clients" ("id", "code", "name", "email", "phone", "free_days_allowed", "daily_storage_rate", "currency", "auto_edi", "active", "created_at", "updated_at", "billing_address", "tax_id", "credit_limit", "payment_terms", "notes", "created_by", "updated_by", "address", "contact_person") VALUES ('6064bef8-2ffe-40ce-ba46-42844187cd32', '1026103', 'OLAM IVOIRE', 'test@ofi.com', '+225 27 21 21 96 96', 0, 0, 'FCFA', false, true, '2026-01-27 17:29:17.753+00', '2026-01-27 17:29:17.753+00', '{"city":"Abidjan","state":"Treichville","street":"Outspan Ivoire, Boulevard de Vridi, Zone Portuaire","country":"Côte d''Ivoire","zipCode":"15 BP 200 Abidjan 15"}'::jsonb, '', 0, 30, '', 'Sayegh Habib', 'Sayegh Habib', '{"city":"Abidjan","state":"Treichville","street":"Outspan Ivoire, Boulevard de Vridi, Zone Portuaire","country":"Côte d''Ivoire","zipCode":"15 BP 200 Abidjan 15"}'::jsonb, '{"name":"TEST","email":"test@ofi.com","phone":"+225 27 21 21 96 96","position":"BOFF"}'::jsonb);
INSERT INTO public."clients" ("id", "code", "name", "email", "phone", "free_days_allowed", "daily_storage_rate", "currency", "auto_edi", "active", "created_at", "updated_at", "billing_address", "tax_id", "credit_limit", "payment_terms", "notes", "created_by", "updated_by", "address", "contact_person") VALUES ('f7fcb0b8-5771-444c-9dd1-5f014c0207ff', '1088663', 'ONE LINE', 'mondesir.konan@one-line.com', '+225 27 21 75 69 20', 0, 0, 'FCFA', true, true, '2026-01-27 15:46:00.061+00', '2026-02-10 18:34:41.081+00', '{"city":"Abidjan","state":"Marcory","street":"Bvd de Marseille, Palm Towers, 7ème étage","country":"Côte d''Ivoire","zipCode":"215 ABIDJAN"}'::jsonb, '1805732 Y', 0, 30, '', 'Sayegh Habib', 'Sayegh Habib', '{"city":"Abidjan","state":"Marcory","street":"Bvd de Marseille, Palm Towers, 7ème étage","country":"Côte d''Ivoire","zipCode":"215 ABIDJAN"}'::jsonb, '{"name":"Mondesir Konan","email":"mondesir.konan@one-line.com","phone":"+225 27 21 75 69 20","position":"Comptable"}'::jsonb);
INSERT INTO public."clients" ("id", "code", "name", "email", "phone", "free_days_allowed", "daily_storage_rate", "currency", "auto_edi", "active", "created_at", "updated_at", "billing_address", "tax_id", "credit_limit", "payment_terms", "notes", "created_by", "updated_by", "address", "contact_person") VALUES ('0045251f-518b-40f3-9a39-25ce01ebd5f1', '1052069', 'PIL', 'aboubacar.diallo@abj.pilship.com', '+225 27 21 22 92 22', 0, 0, 'FCFA', false, true, '2026-01-27 16:40:27.331+00', '2026-03-04 18:38:24.705+00', '{"city":"Abidjan","state":"Treichville","street":"Boulevard de Marseille, Zone 2","country":"Côte d''Ivoire","zipCode":"26 BP 462 Abidjan 26"}'::jsonb, '1652120 C', 0, 30, '', 'Sayegh Habib', 'Sayegh Habib', '{"city":"Abidjan","state":"Treichville","street":"Boulevard de Marseille, Zone 2","country":"Côte d''Ivoire","zipCode":"26 BP 462 Abidjan 26"}'::jsonb, '{"name":"Fatoumata Barry","email":"fatoumata.barry@abj.pilship.com","phone":"+225 27 21 22 92 22","position":"Assistante de direction"}'::jsonb);
INSERT INTO public."clients" ("id", "code", "name", "email", "phone", "free_days_allowed", "daily_storage_rate", "currency", "auto_edi", "active", "created_at", "updated_at", "billing_address", "tax_id", "credit_limit", "payment_terms", "notes", "created_by", "updated_by", "address", "contact_person") VALUES ('11383bc5-d304-46b6-8643-1eccee57e727', '1030342', 'MAERSK LINE', 'contact@maersk.com', '+225 27 21 21 91 00', 0, 0, 'FCFA', false, true, '2026-01-27 17:31:43.029+00', '2026-03-04 18:12:04.354+00', '{"city":"Abidjan","state":"Treichville","street":"Zone Portuaire, Boulevard de Vridi à Abidjan","country":"Côte d''Ivoire","zipCode":"01 BP 6939 Abidjan 01"}'::jsonb, '', 0, 30, '', 'Sayegh Habib', 'System', '{"city":"Abidjan","state":"Treichville","street":"Zone Portuaire, Boulevard de Vridi à Abidjan","country":"Côte d''Ivoire","zipCode":"01 BP 6939 Abidjan 01"}'::jsonb, '{"name":"Koné Fatou","email":"fatou.kone@maersk.com","phone":"+225 07 08 08 08 02","position":"Terminal Manager"}'::jsonb);
INSERT INTO public."yards" ("id", "name", "code", "location", "description", "layout", "is_active", "total_capacity", "current_occupancy", "created_at", "updated_at", "created_by", "timezone", "contact_info", "address", "updated_by") VALUES ('2554a779-a14b-45ed-a1e1-684e2fd9b614', 'TANTARELLI', 'DEPOT-01', 'Abidjan, Vridi, SOPAL', 'Depot Tantarelli, ancienne base mantra', 'tantarelli', true, 0, 0, '2026-01-27 15:15:00.673+00', '2026-03-05 14:46:42.346+00', 'f4ef9b8e-325d-4ac1-940f-bca5b5284848', 'Africa/Abidjan', '{"email":"elodie.bokpoh@olamnet.com","phone":"05 56 40 60 81","manager":"Elodie Bokpoh"}'::jsonb, '{"city":"Abidjan","state":"Treichville","street":"","country":"Côte d''Ivoire","zipCode":""}'::jsonb, 'f4ef9b8e-325d-4ac1-940f-bca5b5284848');
INSERT INTO public."sections" ("id", "yard_id", "name", "is_active", "created_at", "updated_at") VALUES ('zone-tampon-2554a779-a14b-45ed-a1e1-684e2fd9b614', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 'Zone Tampon', true, '2026-02-23 17:36:04.333+00', '2026-02-23 17:36:04.333+00');
INSERT INTO public."sections" ("id", "yard_id", "name", "is_active", "created_at", "updated_at") VALUES ('zone-a-2554a779-a14b-45ed-a1e1-684e2fd9b614', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 'Zone A', true, '2026-02-23 17:44:01.082+00', '2026-02-23 17:44:01.082+00');
INSERT INTO public."sections" ("id", "yard_id", "name", "is_active", "created_at", "updated_at") VALUES ('zone-b-2554a779-a14b-45ed-a1e1-684e2fd9b614', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 'Zone B', true, '2026-02-23 17:44:01.082+00', '2026-02-23 17:44:01.082+00');
INSERT INTO public."sections" ("id", "yard_id", "name", "is_active", "created_at", "updated_at") VALUES ('zone-c-2554a779-a14b-45ed-a1e1-684e2fd9b614', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 'Zone C', true, '2026-02-23 17:44:01.082+00', '2026-02-23 17:44:01.082+00');
INSERT INTO public."stacks" ("id", "yard_id", "stack_number", "section_id", "section_name", "rows", "max_tiers", "capacity", "current_occupancy", "position_x", "position_y", "position_z", "width", "length", "is_active", "is_odd_stack", "assigned_client_code", "notes", "created_at", "updated_at", "created_by", "updated_by", "container_size", "is_special_stack", "row_tier_config", "is_virtual", "is_buffer_zone", "buffer_zone_type", "damage_types_supported") VALUES ('15370a31-0a16-4560-b91c-13019ecba55a', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 900, 'zone-tampon-2554a779-a14b-45ed-a1e1-684e2fd9b614', 'Zone Tampon', 5, 5, 25, 0, 0, 0, 0, 2.5, 12, true, false, NULL, NULL, '2026-03-04 18:20:36.974+00', '2026-03-04 18:38:36.204+00', 'f4ef9b8e-325d-4ac1-940f-bca5b5284848', 'f4ef9b8e-325d-4ac1-940f-bca5b5284848', '20ft', false, NULL, false, true, NULL, '"[]"'::jsonb);
INSERT INTO public."stacks" ("id", "yard_id", "stack_number", "section_id", "section_name", "rows", "max_tiers", "capacity", "current_occupancy", "position_x", "position_y", "position_z", "width", "length", "is_active", "is_odd_stack", "assigned_client_code", "notes", "created_at", "updated_at", "created_by", "updated_by", "container_size", "is_special_stack", "row_tier_config", "is_virtual", "is_buffer_zone", "buffer_zone_type", "damage_types_supported") VALUES ('3a0fc405-2b47-4224-9da0-2b9f18aa733b', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 'zone-a-2554a779-a14b-45ed-a1e1-684e2fd9b614', 'Zone A', 4, 5, 17, 0, 0, 0, 0, 2.5, 12, true, false, NULL, NULL, '2026-01-28 11:54:40.040+00', '2026-03-17 17:48:27.452+00', 'f4ef9b8e-325d-4ac1-940f-bca5b5284848', 'f4ef9b8e-325d-4ac1-940f-bca5b5284848', '20ft', true, '"[{\"row\":1,\"maxTiers\":3},{\"row\":2,\"maxTiers\":4},{\"row\":3,\"maxTiers\":5},{\"row\":4,\"maxTiers\":5}]"'::jsonb, false, false, NULL, '"[]"'::jsonb);
INSERT INTO public."stacks" ("id", "yard_id", "stack_number", "section_id", "section_name", "rows", "max_tiers", "capacity", "current_occupancy", "position_x", "position_y", "position_z", "width", "length", "is_active", "is_odd_stack", "assigned_client_code", "notes", "created_at", "updated_at", "created_by", "updated_by", "container_size", "is_special_stack", "row_tier_config", "is_virtual", "is_buffer_zone", "buffer_zone_type", "damage_types_supported") VALUES ('8e2bdaee-4f12-4fab-b944-7c8fb0bfcf3d', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 27, 'zone-a-2554a779-a14b-45ed-a1e1-684e2fd9b614', 'Zone A', 5, 5, 22, 0, 0, 0, 0, 2.5, 12, true, false, NULL, NULL, '2026-02-03 15:53:36.572+00', '2026-02-03 15:53:36.572+00', 'f4ef9b8e-325d-4ac1-940f-bca5b5284848', NULL, '20ft', false, '"[{\"row\":1,\"maxTiers\":3},{\"row\":2,\"maxTiers\":4},{\"row\":3,\"maxTiers\":5},{\"row\":4,\"maxTiers\":5},{\"row\":5,\"maxTiers\":5}]"'::jsonb, false, false, NULL, '"[]"'::jsonb);
INSERT INTO public."stacks" ("id", "yard_id", "stack_number", "section_id", "section_name", "rows", "max_tiers", "capacity", "current_occupancy", "position_x", "position_y", "position_z", "width", "length", "is_active", "is_odd_stack", "assigned_client_code", "notes", "created_at", "updated_at", "created_by", "updated_by", "container_size", "is_special_stack", "row_tier_config", "is_virtual", "is_buffer_zone", "buffer_zone_type", "damage_types_supported") VALUES ('6ba6bb8b-33d7-4aca-8062-01ef903b4a96', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 901, 'zone-tampon-2554a779-a14b-45ed-a1e1-684e2fd9b614', 'Zone Tampon', 5, 5, 25, 0, 0, 0, 0, 2.5, 12, true, false, NULL, NULL, '2026-03-04 18:21:09.776+00', '2026-03-04 18:27:57.735+00', 'f4ef9b8e-325d-4ac1-940f-bca5b5284848', 'f4ef9b8e-325d-4ac1-940f-bca5b5284848', '40ft', false, NULL, false, true, NULL, '"[]"'::jsonb);
INSERT INTO public."stacks" ("id", "yard_id", "stack_number", "section_id", "section_name", "rows", "max_tiers", "capacity", "current_occupancy", "position_x", "position_y", "position_z", "width", "length", "is_active", "is_odd_stack", "assigned_client_code", "notes", "created_at", "updated_at", "created_by", "updated_by", "container_size", "is_special_stack", "row_tier_config", "is_virtual", "is_buffer_zone", "buffer_zone_type", "damage_types_supported") VALUES ('6544d836-600b-46d3-9701-a0f179f80037', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 'zone-a-2554a779-a14b-45ed-a1e1-684e2fd9b614', 'Zone A', 5, 5, 22, 0, 2.5, 0, 0, 2.5, 12, true, true, NULL, 'Virtual stack for 40ft containers: S03 + S05', '2026-01-28 15:51:15.001+00', '2026-03-04 18:13:12.714+00', 'f4ef9b8e-325d-4ac1-940f-bca5b5284848', 'f4ef9b8e-325d-4ac1-940f-bca5b5284848', '40ft', false, '"[{\"row\":1,\"maxTiers\":3},{\"row\":2,\"maxTiers\":4},{\"row\":3,\"maxTiers\":5},{\"row\":4,\"maxTiers\":5},{\"row\":5,\"maxTiers\":5}]"'::jsonb, true, false, NULL, '[]'::jsonb);
INSERT INTO public."stacks" ("id", "yard_id", "stack_number", "section_id", "section_name", "rows", "max_tiers", "capacity", "current_occupancy", "position_x", "position_y", "position_z", "width", "length", "is_active", "is_odd_stack", "assigned_client_code", "notes", "created_at", "updated_at", "created_by", "updated_by", "container_size", "is_special_stack", "row_tier_config", "is_virtual", "is_buffer_zone", "buffer_zone_type", "damage_types_supported") VALUES ('5827a621-7b2e-4d64-94d4-ab8badba6153', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 'zone-a-2554a779-a14b-45ed-a1e1-684e2fd9b614', 'Zone A', 5, 5, 22, 0, 0, 0, 0, 2.5, 12, true, false, NULL, NULL, '2026-01-28 12:19:51.826+00', '2026-03-06 18:41:17.251+00', 'f4ef9b8e-325d-4ac1-940f-bca5b5284848', 'f4ef9b8e-325d-4ac1-940f-bca5b5284848', '40ft', false, '"[{\"row\":1,\"maxTiers\":3},{\"row\":2,\"maxTiers\":4},{\"row\":3,\"maxTiers\":5},{\"row\":4,\"maxTiers\":5},{\"row\":5,\"maxTiers\":5}]"'::jsonb, false, false, NULL, '"[]"'::jsonb);
INSERT INTO public."stacks" ("id", "yard_id", "stack_number", "section_id", "section_name", "rows", "max_tiers", "capacity", "current_occupancy", "position_x", "position_y", "position_z", "width", "length", "is_active", "is_odd_stack", "assigned_client_code", "notes", "created_at", "updated_at", "created_by", "updated_by", "container_size", "is_special_stack", "row_tier_config", "is_virtual", "is_buffer_zone", "buffer_zone_type", "damage_types_supported") VALUES ('dc9af4d4-6071-4ec7-8eef-cad11bc1b066', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 103, 'zone-c-2554a779-a14b-45ed-a1e1-684e2fd9b614', 'Zone C', 3, 5, 12, 0, 0, 0, 0, 2.5, 12, true, false, NULL, NULL, '2026-02-03 17:05:12.491+00', '2026-03-17 17:48:28.213+00', 'f4ef9b8e-325d-4ac1-940f-bca5b5284848', NULL, '20ft', true, '"[{\"row\":1,\"maxTiers\":3},{\"row\":2,\"maxTiers\":4},{\"row\":3,\"maxTiers\":5}]"'::jsonb, false, false, NULL, '"[]"'::jsonb);
INSERT INTO public."stacks" ("id", "yard_id", "stack_number", "section_id", "section_name", "rows", "max_tiers", "capacity", "current_occupancy", "position_x", "position_y", "position_z", "width", "length", "is_active", "is_odd_stack", "assigned_client_code", "notes", "created_at", "updated_at", "created_by", "updated_by", "container_size", "is_special_stack", "row_tier_config", "is_virtual", "is_buffer_zone", "buffer_zone_type", "damage_types_supported") VALUES ('286c36b3-4b47-464f-b756-c338b983b39b', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 91, 'zone-c-2554a779-a14b-45ed-a1e1-684e2fd9b614', 'Zone C', 4, 5, 17, 0, 0, 0, 0, 2.5, 12, true, false, NULL, NULL, '2026-02-03 17:02:36.618+00', '2026-02-03 17:02:36.618+00', 'f4ef9b8e-325d-4ac1-940f-bca5b5284848', NULL, '20ft', false, '"[{\"row\":1,\"maxTiers\":3},{\"row\":2,\"maxTiers\":4},{\"row\":3,\"maxTiers\":5},{\"row\":4,\"maxTiers\":5}]"'::jsonb, false, false, NULL, '"[]"'::jsonb);
INSERT INTO public."stacks" ("id", "yard_id", "stack_number", "section_id", "section_name", "rows", "max_tiers", "capacity", "current_occupancy", "position_x", "position_y", "position_z", "width", "length", "is_active", "is_odd_stack", "assigned_client_code", "notes", "created_at", "updated_at", "created_by", "updated_by", "container_size", "is_special_stack", "row_tier_config", "is_virtual", "is_buffer_zone", "buffer_zone_type", "damage_types_supported") VALUES ('378b72b7-f320-449f-997e-9c8d0e803f7f', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 93, 'zone-c-2554a779-a14b-45ed-a1e1-684e2fd9b614', 'Zone C', 4, 5, 17, 0, 0, 0, 0, 2.5, 12, true, false, NULL, NULL, '2026-02-03 17:02:58.843+00', '2026-02-03 17:02:58.843+00', 'f4ef9b8e-325d-4ac1-940f-bca5b5284848', NULL, '20ft', false, '"[{\"row\":1,\"maxTiers\":3},{\"row\":2,\"maxTiers\":4},{\"row\":3,\"maxTiers\":5},{\"row\":4,\"maxTiers\":5}]"'::jsonb, false, false, NULL, '"[]"'::jsonb);
INSERT INTO public."stacks" ("id", "yard_id", "stack_number", "section_id", "section_name", "rows", "max_tiers", "capacity", "current_occupancy", "position_x", "position_y", "position_z", "width", "length", "is_active", "is_odd_stack", "assigned_client_code", "notes", "created_at", "updated_at", "created_by", "updated_by", "container_size", "is_special_stack", "row_tier_config", "is_virtual", "is_buffer_zone", "buffer_zone_type", "damage_types_supported") VALUES ('1508eda3-5e35-4fd3-83dd-aa075a053456', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 95, 'zone-c-2554a779-a14b-45ed-a1e1-684e2fd9b614', 'Zone C', 4, 5, 17, 0, 0, 0, 0, 2.5, 12, true, false, NULL, NULL, '2026-02-03 17:03:24.177+00', '2026-02-03 17:03:24.177+00', 'f4ef9b8e-325d-4ac1-940f-bca5b5284848', NULL, '20ft', false, '"[{\"row\":1,\"maxTiers\":3},{\"row\":2,\"maxTiers\":4},{\"row\":3,\"maxTiers\":5},{\"row\":4,\"maxTiers\":5}]"'::jsonb, false, false, NULL, '"[]"'::jsonb);
INSERT INTO public."stacks" ("id", "yard_id", "stack_number", "section_id", "section_name", "rows", "max_tiers", "capacity", "current_occupancy", "position_x", "position_y", "position_z", "width", "length", "is_active", "is_odd_stack", "assigned_client_code", "notes", "created_at", "updated_at", "created_by", "updated_by", "container_size", "is_special_stack", "row_tier_config", "is_virtual", "is_buffer_zone", "buffer_zone_type", "damage_types_supported") VALUES ('bb3faac4-2e5f-43ca-beec-fc9b39b8cd2b', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 97, 'zone-c-2554a779-a14b-45ed-a1e1-684e2fd9b614', 'Zone C', 4, 5, 17, 0, 0, 0, 0, 2.5, 12, true, false, NULL, NULL, '2026-02-03 17:03:38.975+00', '2026-02-03 17:03:38.975+00', 'f4ef9b8e-325d-4ac1-940f-bca5b5284848', NULL, '20ft', false, '"[{\"row\":1,\"maxTiers\":3},{\"row\":2,\"maxTiers\":4},{\"row\":3,\"maxTiers\":5},{\"row\":4,\"maxTiers\":5}]"'::jsonb, false, false, NULL, '"[]"'::jsonb);
INSERT INTO public."stacks" ("id", "yard_id", "stack_number", "section_id", "section_name", "rows", "max_tiers", "capacity", "current_occupancy", "position_x", "position_y", "position_z", "width", "length", "is_active", "is_odd_stack", "assigned_client_code", "notes", "created_at", "updated_at", "created_by", "updated_by", "container_size", "is_special_stack", "row_tier_config", "is_virtual", "is_buffer_zone", "buffer_zone_type", "damage_types_supported") VALUES ('b4430373-2de7-4a02-83b3-8283f8f1a3e6', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 99, 'zone-c-2554a779-a14b-45ed-a1e1-684e2fd9b614', 'Zone C', 4, 5, 17, 0, 0, 0, 0, 2.5, 12, true, false, NULL, NULL, '2026-02-03 17:03:59.634+00', '2026-02-03 17:03:59.634+00', 'f4ef9b8e-325d-4ac1-940f-bca5b5284848', NULL, '20ft', false, '"[{\"row\":1,\"maxTiers\":3},{\"row\":2,\"maxTiers\":4},{\"row\":3,\"maxTiers\":5},{\"row\":4,\"maxTiers\":5}]"'::jsonb, false, false, NULL, '"[]"'::jsonb);
INSERT INTO public."stacks" ("id", "yard_id", "stack_number", "section_id", "section_name", "rows", "max_tiers", "capacity", "current_occupancy", "position_x", "position_y", "position_z", "width", "length", "is_active", "is_odd_stack", "assigned_client_code", "notes", "created_at", "updated_at", "created_by", "updated_by", "container_size", "is_special_stack", "row_tier_config", "is_virtual", "is_buffer_zone", "buffer_zone_type", "damage_types_supported") VALUES ('7c9a62e6-8641-4440-be1a-4fe70cf006f7', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 101, 'zone-c-2554a779-a14b-45ed-a1e1-684e2fd9b614', 'Zone C', 2, 4, 7, 0, 0, 0, 0, 2.5, 12, true, false, NULL, NULL, '2026-02-03 17:04:40.169+00', '2026-02-03 17:04:40.169+00', 'f4ef9b8e-325d-4ac1-940f-bca5b5284848', NULL, '20ft', true, '"[{\"row\":1,\"maxTiers\":3},{\"row\":2,\"maxTiers\":4}]"'::jsonb, false, false, NULL, '"[]"'::jsonb);
INSERT INTO public."stacks" ("id", "yard_id", "stack_number", "section_id", "section_name", "rows", "max_tiers", "capacity", "current_occupancy", "position_x", "position_y", "position_z", "width", "length", "is_active", "is_odd_stack", "assigned_client_code", "notes", "created_at", "updated_at", "created_by", "updated_by", "container_size", "is_special_stack", "row_tier_config", "is_virtual", "is_buffer_zone", "buffer_zone_type", "damage_types_supported") VALUES ('089626b9-64bc-4fbd-b75d-0f677bbf65ca', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 'zone-a-2554a779-a14b-45ed-a1e1-684e2fd9b614', 'Zone A', 5, 5, 22, 0, 0, 0, 0, 2.5, 12, true, false, NULL, NULL, '2026-01-28 12:22:02.804+00', '2026-03-06 18:41:17.410+00', 'f4ef9b8e-325d-4ac1-940f-bca5b5284848', 'f4ef9b8e-325d-4ac1-940f-bca5b5284848', '40ft', false, '"[{\"row\":1,\"maxTiers\":3},{\"row\":2,\"maxTiers\":4},{\"row\":3,\"maxTiers\":5},{\"row\":4,\"maxTiers\":5},{\"row\":5,\"maxTiers\":5}]"'::jsonb, false, false, NULL, '"[]"'::jsonb);
INSERT INTO public."stacks" ("id", "yard_id", "stack_number", "section_id", "section_name", "rows", "max_tiers", "capacity", "current_occupancy", "position_x", "position_y", "position_z", "width", "length", "is_active", "is_odd_stack", "assigned_client_code", "notes", "created_at", "updated_at", "created_by", "updated_by", "container_size", "is_special_stack", "row_tier_config", "is_virtual", "is_buffer_zone", "buffer_zone_type", "damage_types_supported") VALUES ('353fcdeb-237a-4e43-b552-2acf2d44ddd1', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 29, 'zone-a-2554a779-a14b-45ed-a1e1-684e2fd9b614', 'Zone A', 5, 5, 22, 0, 0, 0, 0, 2.5, 12, true, false, NULL, NULL, '2026-02-03 15:53:47.269+00', '2026-02-03 15:53:47.269+00', 'f4ef9b8e-325d-4ac1-940f-bca5b5284848', NULL, '20ft', false, '"[{\"row\":1,\"maxTiers\":3},{\"row\":2,\"maxTiers\":4},{\"row\":3,\"maxTiers\":5},{\"row\":4,\"maxTiers\":5},{\"row\":5,\"maxTiers\":5}]"'::jsonb, false, false, NULL, '"[]"'::jsonb);
INSERT INTO public."stacks" ("id", "yard_id", "stack_number", "section_id", "section_name", "rows", "max_tiers", "capacity", "current_occupancy", "position_x", "position_y", "position_z", "width", "length", "is_active", "is_odd_stack", "assigned_client_code", "notes", "created_at", "updated_at", "created_by", "updated_by", "container_size", "is_special_stack", "row_tier_config", "is_virtual", "is_buffer_zone", "buffer_zone_type", "damage_types_supported") VALUES ('d4213a0c-31d5-4914-bd7f-70300891eb1c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 31, 'zone-a-2554a779-a14b-45ed-a1e1-684e2fd9b614', 'Zone A', 7, 5, 32, 0, 0, 0, 0, 2.5, 12, true, false, NULL, NULL, '2026-02-03 15:56:48.399+00', '2026-02-03 15:57:10.516+00', 'f4ef9b8e-325d-4ac1-940f-bca5b5284848', 'f4ef9b8e-325d-4ac1-940f-bca5b5284848', '20ft', true, '"[{\"row\":1,\"maxTiers\":3},{\"row\":2,\"maxTiers\":4},{\"row\":3,\"maxTiers\":5},{\"row\":4,\"maxTiers\":5},{\"row\":5,\"maxTiers\":5},{\"row\":6,\"maxTiers\":5},{\"row\":7,\"maxTiers\":5}]"'::jsonb, false, false, NULL, '"[]"'::jsonb);
INSERT INTO public."stacks" ("id", "yard_id", "stack_number", "section_id", "section_name", "rows", "max_tiers", "capacity", "current_occupancy", "position_x", "position_y", "position_z", "width", "length", "is_active", "is_odd_stack", "assigned_client_code", "notes", "created_at", "updated_at", "created_by", "updated_by", "container_size", "is_special_stack", "row_tier_config", "is_virtual", "is_buffer_zone", "buffer_zone_type", "damage_types_supported") VALUES ('d8c8ecc6-4924-4436-bd2b-d24d14dfcd4d', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 8, 'zone-a-2554a779-a14b-45ed-a1e1-684e2fd9b614', 'Zone A', 5, 5, 22, 0, 0, 0, 0, 2.5, 12, false, true, NULL, NULL, '2026-01-29 13:49:18.450+00', '2026-01-29 14:47:57.696+00', 'f4ef9b8e-325d-4ac1-940f-bca5b5284848', 'f4ef9b8e-325d-4ac1-940f-bca5b5284848', '40ft', false, '"[{\"row\":1,\"maxTiers\":3},{\"row\":2,\"maxTiers\":4},{\"row\":3,\"maxTiers\":5},{\"row\":4,\"maxTiers\":5},{\"row\":5,\"maxTiers\":5}]"'::jsonb, true, false, NULL, '[]'::jsonb);
INSERT INTO public."stacks" ("id", "yard_id", "stack_number", "section_id", "section_name", "rows", "max_tiers", "capacity", "current_occupancy", "position_x", "position_y", "position_z", "width", "length", "is_active", "is_odd_stack", "assigned_client_code", "notes", "created_at", "updated_at", "created_by", "updated_by", "container_size", "is_special_stack", "row_tier_config", "is_virtual", "is_buffer_zone", "buffer_zone_type", "damage_types_supported") VALUES ('ebc216f7-261e-4acc-b2c0-1a6ee0656f14', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 11, 'zone-a-2554a779-a14b-45ed-a1e1-684e2fd9b614', 'Zone A', 5, 5, 22, 0, 0, 0, 0, 2.5, 12, true, false, NULL, NULL, '2026-02-03 13:30:15.851+00', '2026-02-03 13:30:15.851+00', 'f4ef9b8e-325d-4ac1-940f-bca5b5284848', NULL, '20ft', false, '"[{\"row\":1,\"maxTiers\":3},{\"row\":2,\"maxTiers\":4},{\"row\":3,\"maxTiers\":5},{\"row\":4,\"maxTiers\":5},{\"row\":5,\"maxTiers\":5}]"'::jsonb, false, false, NULL, '"[]"'::jsonb);
INSERT INTO public."stacks" ("id", "yard_id", "stack_number", "section_id", "section_name", "rows", "max_tiers", "capacity", "current_occupancy", "position_x", "position_y", "position_z", "width", "length", "is_active", "is_odd_stack", "assigned_client_code", "notes", "created_at", "updated_at", "created_by", "updated_by", "container_size", "is_special_stack", "row_tier_config", "is_virtual", "is_buffer_zone", "buffer_zone_type", "damage_types_supported") VALUES ('16e8bafc-d3dd-4ebb-a0eb-5b716c5cd63e', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 13, 'zone-a-2554a779-a14b-45ed-a1e1-684e2fd9b614', 'Zone A', 5, 5, 22, 0, 0, 0, 0, 2.5, 12, true, false, NULL, NULL, '2026-02-03 13:31:05.237+00', '2026-02-03 13:31:05.237+00', 'f4ef9b8e-325d-4ac1-940f-bca5b5284848', NULL, '20ft', false, '"[{\"row\":1,\"maxTiers\":3},{\"row\":2,\"maxTiers\":4},{\"row\":3,\"maxTiers\":5},{\"row\":4,\"maxTiers\":5},{\"row\":5,\"maxTiers\":5}]"'::jsonb, false, false, NULL, '"[]"'::jsonb);
INSERT INTO public."stacks" ("id", "yard_id", "stack_number", "section_id", "section_name", "rows", "max_tiers", "capacity", "current_occupancy", "position_x", "position_y", "position_z", "width", "length", "is_active", "is_odd_stack", "assigned_client_code", "notes", "created_at", "updated_at", "created_by", "updated_by", "container_size", "is_special_stack", "row_tier_config", "is_virtual", "is_buffer_zone", "buffer_zone_type", "damage_types_supported") VALUES ('afaec2cf-7562-4f8c-98b4-5cc8b871853c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 15, 'zone-a-2554a779-a14b-45ed-a1e1-684e2fd9b614', 'Zone A', 5, 5, 22, 0, 0, 0, 0, 2.5, 12, true, false, NULL, NULL, '2026-02-03 13:45:55.403+00', '2026-02-03 13:45:55.403+00', 'f4ef9b8e-325d-4ac1-940f-bca5b5284848', NULL, '20ft', false, '"[{\"row\":1,\"maxTiers\":3},{\"row\":2,\"maxTiers\":4},{\"row\":3,\"maxTiers\":5},{\"row\":4,\"maxTiers\":5},{\"row\":5,\"maxTiers\":5}]"'::jsonb, false, false, NULL, '"[]"'::jsonb);
INSERT INTO public."stacks" ("id", "yard_id", "stack_number", "section_id", "section_name", "rows", "max_tiers", "capacity", "current_occupancy", "position_x", "position_y", "position_z", "width", "length", "is_active", "is_odd_stack", "assigned_client_code", "notes", "created_at", "updated_at", "created_by", "updated_by", "container_size", "is_special_stack", "row_tier_config", "is_virtual", "is_buffer_zone", "buffer_zone_type", "damage_types_supported") VALUES ('ceff0a0a-1182-42c8-89df-93528ad8fbbb', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 17, 'zone-a-2554a779-a14b-45ed-a1e1-684e2fd9b614', 'Zone A', 5, 5, 22, 0, 0, 0, 0, 2.5, 12, true, false, NULL, NULL, '2026-02-03 13:46:17.303+00', '2026-02-03 13:46:17.303+00', 'f4ef9b8e-325d-4ac1-940f-bca5b5284848', NULL, '20ft', false, '"[{\"row\":1,\"maxTiers\":3},{\"row\":2,\"maxTiers\":4},{\"row\":3,\"maxTiers\":5},{\"row\":4,\"maxTiers\":5},{\"row\":5,\"maxTiers\":5}]"'::jsonb, false, false, NULL, '"[]"'::jsonb);
INSERT INTO public."stacks" ("id", "yard_id", "stack_number", "section_id", "section_name", "rows", "max_tiers", "capacity", "current_occupancy", "position_x", "position_y", "position_z", "width", "length", "is_active", "is_odd_stack", "assigned_client_code", "notes", "created_at", "updated_at", "created_by", "updated_by", "container_size", "is_special_stack", "row_tier_config", "is_virtual", "is_buffer_zone", "buffer_zone_type", "damage_types_supported") VALUES ('fd4cf70f-17d3-4d89-aaca-98c943349181', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 19, 'zone-a-2554a779-a14b-45ed-a1e1-684e2fd9b614', 'Zone A', 5, 5, 22, 0, 0, 0, 0, 2.5, 12, true, false, NULL, NULL, '2026-02-03 15:52:19.550+00', '2026-02-03 15:52:19.550+00', 'f4ef9b8e-325d-4ac1-940f-bca5b5284848', NULL, '20ft', false, '"[{\"row\":1,\"maxTiers\":3},{\"row\":2,\"maxTiers\":4},{\"row\":3,\"maxTiers\":5},{\"row\":4,\"maxTiers\":5},{\"row\":5,\"maxTiers\":5}]"'::jsonb, false, false, NULL, '"[]"'::jsonb);
INSERT INTO public."stacks" ("id", "yard_id", "stack_number", "section_id", "section_name", "rows", "max_tiers", "capacity", "current_occupancy", "position_x", "position_y", "position_z", "width", "length", "is_active", "is_odd_stack", "assigned_client_code", "notes", "created_at", "updated_at", "created_by", "updated_by", "container_size", "is_special_stack", "row_tier_config", "is_virtual", "is_buffer_zone", "buffer_zone_type", "damage_types_supported") VALUES ('f886faef-18a8-4cd4-afb3-ed78378801cc', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 21, 'zone-a-2554a779-a14b-45ed-a1e1-684e2fd9b614', 'Zone A', 5, 5, 22, 0, 0, 0, 0, 2.5, 12, true, false, NULL, NULL, '2026-02-03 15:52:44.396+00', '2026-02-03 15:52:44.396+00', 'f4ef9b8e-325d-4ac1-940f-bca5b5284848', NULL, '20ft', false, '"[{\"row\":1,\"maxTiers\":3},{\"row\":2,\"maxTiers\":4},{\"row\":3,\"maxTiers\":5},{\"row\":4,\"maxTiers\":5},{\"row\":5,\"maxTiers\":5}]"'::jsonb, false, false, NULL, '"[]"'::jsonb);
INSERT INTO public."stacks" ("id", "yard_id", "stack_number", "section_id", "section_name", "rows", "max_tiers", "capacity", "current_occupancy", "position_x", "position_y", "position_z", "width", "length", "is_active", "is_odd_stack", "assigned_client_code", "notes", "created_at", "updated_at", "created_by", "updated_by", "container_size", "is_special_stack", "row_tier_config", "is_virtual", "is_buffer_zone", "buffer_zone_type", "damage_types_supported") VALUES ('29cdab8e-451b-4328-b4b4-586ea7919ea4', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 23, 'zone-a-2554a779-a14b-45ed-a1e1-684e2fd9b614', 'Zone A', 5, 5, 22, 0, 0, 0, 0, 2.5, 12, true, false, NULL, NULL, '2026-02-03 15:52:57.803+00', '2026-02-03 15:52:57.803+00', 'f4ef9b8e-325d-4ac1-940f-bca5b5284848', NULL, '20ft', false, '"[{\"row\":1,\"maxTiers\":3},{\"row\":2,\"maxTiers\":4},{\"row\":3,\"maxTiers\":5},{\"row\":4,\"maxTiers\":5},{\"row\":5,\"maxTiers\":5}]"'::jsonb, false, false, NULL, '"[]"'::jsonb);
INSERT INTO public."stacks" ("id", "yard_id", "stack_number", "section_id", "section_name", "rows", "max_tiers", "capacity", "current_occupancy", "position_x", "position_y", "position_z", "width", "length", "is_active", "is_odd_stack", "assigned_client_code", "notes", "created_at", "updated_at", "created_by", "updated_by", "container_size", "is_special_stack", "row_tier_config", "is_virtual", "is_buffer_zone", "buffer_zone_type", "damage_types_supported") VALUES ('30c09d67-32f9-4744-8900-b7c9e1ff8aaa', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 25, 'zone-a-2554a779-a14b-45ed-a1e1-684e2fd9b614', 'Zone A', 5, 5, 22, 0, 0, 0, 0, 2.5, 12, true, false, NULL, NULL, '2026-02-03 15:53:12.177+00', '2026-02-03 15:53:12.177+00', 'f4ef9b8e-325d-4ac1-940f-bca5b5284848', NULL, '20ft', false, '"[{\"row\":1,\"maxTiers\":3},{\"row\":2,\"maxTiers\":4},{\"row\":3,\"maxTiers\":5},{\"row\":4,\"maxTiers\":5},{\"row\":5,\"maxTiers\":5}]"'::jsonb, false, false, NULL, '"[]"'::jsonb);
INSERT INTO public."stacks" ("id", "yard_id", "stack_number", "section_id", "section_name", "rows", "max_tiers", "capacity", "current_occupancy", "position_x", "position_y", "position_z", "width", "length", "is_active", "is_odd_stack", "assigned_client_code", "notes", "created_at", "updated_at", "created_by", "updated_by", "container_size", "is_special_stack", "row_tier_config", "is_virtual", "is_buffer_zone", "buffer_zone_type", "damage_types_supported") VALUES ('64af6192-e8c2-49ab-8a8b-417cb4851d66', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 7, 'zone-a-2554a779-a14b-45ed-a1e1-684e2fd9b614', 'Zone A', 5, 5, 22, 0, 0, 0, 0, 2.5, 12, true, false, NULL, NULL, '2026-01-28 15:52:31.473+00', '2026-01-29 14:00:59.496+00', 'f4ef9b8e-325d-4ac1-940f-bca5b5284848', 'f4ef9b8e-325d-4ac1-940f-bca5b5284848', '20ft', false, '"[{\"row\":1,\"maxTiers\":3},{\"row\":2,\"maxTiers\":4},{\"row\":3,\"maxTiers\":5},{\"row\":4,\"maxTiers\":5},{\"row\":5,\"maxTiers\":5}]"'::jsonb, false, false, NULL, '"[]"'::jsonb);
INSERT INTO public."stacks" ("id", "yard_id", "stack_number", "section_id", "section_name", "rows", "max_tiers", "capacity", "current_occupancy", "position_x", "position_y", "position_z", "width", "length", "is_active", "is_odd_stack", "assigned_client_code", "notes", "created_at", "updated_at", "created_by", "updated_by", "container_size", "is_special_stack", "row_tier_config", "is_virtual", "is_buffer_zone", "buffer_zone_type", "damage_types_supported") VALUES ('1368468e-7518-4cd8-8162-5d2fa3009a51', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 9, 'zone-a-2554a779-a14b-45ed-a1e1-684e2fd9b614', 'Zone A', 5, 5, 22, 0, 0, 0, 0, 2.5, 12, true, false, NULL, NULL, '2026-01-28 15:55:42.559+00', '2026-01-29 14:01:00.762+00', 'f4ef9b8e-325d-4ac1-940f-bca5b5284848', 'f4ef9b8e-325d-4ac1-940f-bca5b5284848', '20ft', false, '"[{\"row\":1,\"maxTiers\":3},{\"row\":2,\"maxTiers\":4},{\"row\":3,\"maxTiers\":5},{\"row\":4,\"maxTiers\":5},{\"row\":5,\"maxTiers\":5}]"'::jsonb, false, false, NULL, '"[]"'::jsonb);
INSERT INTO public."stacks" ("id", "yard_id", "stack_number", "section_id", "section_name", "rows", "max_tiers", "capacity", "current_occupancy", "position_x", "position_y", "position_z", "width", "length", "is_active", "is_odd_stack", "assigned_client_code", "notes", "created_at", "updated_at", "created_by", "updated_by", "container_size", "is_special_stack", "row_tier_config", "is_virtual", "is_buffer_zone", "buffer_zone_type", "damage_types_supported") VALUES ('5c108a81-42f9-44b3-836d-e6a36bdaedaa', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 33, 'zone-b-2554a779-a14b-45ed-a1e1-684e2fd9b614', 'Zone B', 5, 4, 18, 0, 0, 0, 0, 2.5, 12, true, false, NULL, NULL, '2026-02-03 15:58:38.945+00', '2026-02-03 15:58:38.945+00', 'f4ef9b8e-325d-4ac1-940f-bca5b5284848', NULL, '20ft', false, '"[{\"row\":1,\"maxTiers\":3},{\"row\":2,\"maxTiers\":4},{\"row\":3,\"maxTiers\":4},{\"row\":4,\"maxTiers\":4},{\"row\":5,\"maxTiers\":3}]"'::jsonb, false, false, NULL, '"[]"'::jsonb);
INSERT INTO public."stacks" ("id", "yard_id", "stack_number", "section_id", "section_name", "rows", "max_tiers", "capacity", "current_occupancy", "position_x", "position_y", "position_z", "width", "length", "is_active", "is_odd_stack", "assigned_client_code", "notes", "created_at", "updated_at", "created_by", "updated_by", "container_size", "is_special_stack", "row_tier_config", "is_virtual", "is_buffer_zone", "buffer_zone_type", "damage_types_supported") VALUES ('ef025a9c-317d-4607-9607-997358f60af3', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 35, 'zone-b-2554a779-a14b-45ed-a1e1-684e2fd9b614', 'Zone B', 5, 4, 18, 0, 0, 0, 0, 2.5, 12, true, false, NULL, NULL, '2026-02-03 15:59:39.314+00', '2026-02-03 15:59:39.314+00', 'f4ef9b8e-325d-4ac1-940f-bca5b5284848', NULL, '20ft', false, '"[{\"row\":1,\"maxTiers\":3},{\"row\":2,\"maxTiers\":4},{\"row\":3,\"maxTiers\":4},{\"row\":4,\"maxTiers\":4},{\"row\":5,\"maxTiers\":3}]"'::jsonb, false, false, NULL, '"[]"'::jsonb);
INSERT INTO public."stacks" ("id", "yard_id", "stack_number", "section_id", "section_name", "rows", "max_tiers", "capacity", "current_occupancy", "position_x", "position_y", "position_z", "width", "length", "is_active", "is_odd_stack", "assigned_client_code", "notes", "created_at", "updated_at", "created_by", "updated_by", "container_size", "is_special_stack", "row_tier_config", "is_virtual", "is_buffer_zone", "buffer_zone_type", "damage_types_supported") VALUES ('fc220d4f-d1f0-4d7e-aac3-a7739941fa6c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 37, 'zone-b-2554a779-a14b-45ed-a1e1-684e2fd9b614', 'Zone B', 5, 4, 18, 0, 0, 0, 0, 2.5, 12, true, false, NULL, NULL, '2026-02-03 16:00:53.469+00', '2026-02-03 16:00:53.469+00', 'f4ef9b8e-325d-4ac1-940f-bca5b5284848', NULL, '20ft', false, '"[{\"row\":1,\"maxTiers\":3},{\"row\":2,\"maxTiers\":4},{\"row\":3,\"maxTiers\":4},{\"row\":4,\"maxTiers\":4},{\"row\":5,\"maxTiers\":3}]"'::jsonb, false, false, NULL, '"[]"'::jsonb);
INSERT INTO public."stacks" ("id", "yard_id", "stack_number", "section_id", "section_name", "rows", "max_tiers", "capacity", "current_occupancy", "position_x", "position_y", "position_z", "width", "length", "is_active", "is_odd_stack", "assigned_client_code", "notes", "created_at", "updated_at", "created_by", "updated_by", "container_size", "is_special_stack", "row_tier_config", "is_virtual", "is_buffer_zone", "buffer_zone_type", "damage_types_supported") VALUES ('b1a99f00-c3df-448b-9e80-d5bc9257eabc', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 39, 'zone-b-2554a779-a14b-45ed-a1e1-684e2fd9b614', 'Zone B', 5, 4, 18, 0, 0, 0, 0, 2.5, 12, true, false, NULL, NULL, '2026-02-03 16:01:26.051+00', '2026-02-03 16:01:26.051+00', 'f4ef9b8e-325d-4ac1-940f-bca5b5284848', NULL, '20ft', false, '"[{\"row\":1,\"maxTiers\":3},{\"row\":2,\"maxTiers\":4},{\"row\":3,\"maxTiers\":4},{\"row\":4,\"maxTiers\":4},{\"row\":5,\"maxTiers\":3}]"'::jsonb, false, false, NULL, '"[]"'::jsonb);
INSERT INTO public."stacks" ("id", "yard_id", "stack_number", "section_id", "section_name", "rows", "max_tiers", "capacity", "current_occupancy", "position_x", "position_y", "position_z", "width", "length", "is_active", "is_odd_stack", "assigned_client_code", "notes", "created_at", "updated_at", "created_by", "updated_by", "container_size", "is_special_stack", "row_tier_config", "is_virtual", "is_buffer_zone", "buffer_zone_type", "damage_types_supported") VALUES ('aa4fb230-6936-438c-bca3-d8baaab3243d', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 41, 'zone-b-2554a779-a14b-45ed-a1e1-684e2fd9b614', 'Zone B', 4, 4, 14, 0, 0, 0, 0, 2.5, 12, true, false, NULL, NULL, '2026-02-03 16:01:50.405+00', '2026-02-03 16:02:59.311+00', 'f4ef9b8e-325d-4ac1-940f-bca5b5284848', 'f4ef9b8e-325d-4ac1-940f-bca5b5284848', '20ft', false, '"[{\"row\":1,\"maxTiers\":3},{\"row\":2,\"maxTiers\":4},{\"row\":3,\"maxTiers\":4},{\"row\":4,\"maxTiers\":3}]"'::jsonb, false, false, NULL, '"[]"'::jsonb);
INSERT INTO public."stacks" ("id", "yard_id", "stack_number", "section_id", "section_name", "rows", "max_tiers", "capacity", "current_occupancy", "position_x", "position_y", "position_z", "width", "length", "is_active", "is_odd_stack", "assigned_client_code", "notes", "created_at", "updated_at", "created_by", "updated_by", "container_size", "is_special_stack", "row_tier_config", "is_virtual", "is_buffer_zone", "buffer_zone_type", "damage_types_supported") VALUES ('f99b7be8-4815-4ba5-a2b0-a428cc8cc8d4', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 43, 'zone-b-2554a779-a14b-45ed-a1e1-684e2fd9b614', 'Zone B', 4, 4, 14, 0, 0, 0, 0, 2.5, 12, true, false, NULL, NULL, '2026-02-03 16:15:26.763+00', '2026-02-03 16:15:26.763+00', 'f4ef9b8e-325d-4ac1-940f-bca5b5284848', NULL, '20ft', false, '"[{\"row\":1,\"maxTiers\":3},{\"row\":2,\"maxTiers\":4},{\"row\":3,\"maxTiers\":4},{\"row\":4,\"maxTiers\":3}]"'::jsonb, false, false, NULL, '"[]"'::jsonb);
INSERT INTO public."stacks" ("id", "yard_id", "stack_number", "section_id", "section_name", "rows", "max_tiers", "capacity", "current_occupancy", "position_x", "position_y", "position_z", "width", "length", "is_active", "is_odd_stack", "assigned_client_code", "notes", "created_at", "updated_at", "created_by", "updated_by", "container_size", "is_special_stack", "row_tier_config", "is_virtual", "is_buffer_zone", "buffer_zone_type", "damage_types_supported") VALUES ('d0ec7709-2dcf-4e52-aadf-e60ef7f1b709', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 45, 'zone-b-2554a779-a14b-45ed-a1e1-684e2fd9b614', 'Zone B', 4, 4, 14, 0, 0, 0, 0, 2.5, 12, true, false, NULL, NULL, '2026-02-03 16:50:29.847+00', '2026-02-03 16:50:29.847+00', 'f4ef9b8e-325d-4ac1-940f-bca5b5284848', NULL, '20ft', false, '"[{\"row\":1,\"maxTiers\":3},{\"row\":2,\"maxTiers\":4},{\"row\":3,\"maxTiers\":4},{\"row\":4,\"maxTiers\":3}]"'::jsonb, false, false, NULL, '"[]"'::jsonb);
INSERT INTO public."stacks" ("id", "yard_id", "stack_number", "section_id", "section_name", "rows", "max_tiers", "capacity", "current_occupancy", "position_x", "position_y", "position_z", "width", "length", "is_active", "is_odd_stack", "assigned_client_code", "notes", "created_at", "updated_at", "created_by", "updated_by", "container_size", "is_special_stack", "row_tier_config", "is_virtual", "is_buffer_zone", "buffer_zone_type", "damage_types_supported") VALUES ('6acacf2a-13fa-4f69-9262-51cb9bea8544', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 47, 'zone-b-2554a779-a14b-45ed-a1e1-684e2fd9b614', 'Zone B', 4, 4, 14, 0, 0, 0, 0, 2.5, 12, true, false, NULL, NULL, '2026-02-03 16:50:49.136+00', '2026-02-03 16:50:49.136+00', 'f4ef9b8e-325d-4ac1-940f-bca5b5284848', NULL, '20ft', false, '"[{\"row\":1,\"maxTiers\":3},{\"row\":2,\"maxTiers\":4},{\"row\":3,\"maxTiers\":4},{\"row\":4,\"maxTiers\":3}]"'::jsonb, false, false, NULL, '"[]"'::jsonb);
INSERT INTO public."stacks" ("id", "yard_id", "stack_number", "section_id", "section_name", "rows", "max_tiers", "capacity", "current_occupancy", "position_x", "position_y", "position_z", "width", "length", "is_active", "is_odd_stack", "assigned_client_code", "notes", "created_at", "updated_at", "created_by", "updated_by", "container_size", "is_special_stack", "row_tier_config", "is_virtual", "is_buffer_zone", "buffer_zone_type", "damage_types_supported") VALUES ('c5cb9506-bedc-4ae3-b274-47aa1dce6fc1', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 49, 'zone-b-2554a779-a14b-45ed-a1e1-684e2fd9b614', 'Zone B', 4, 4, 14, 0, 0, 0, 0, 2.5, 12, true, false, NULL, NULL, '2026-02-03 16:51:08.097+00', '2026-02-03 16:51:08.097+00', 'f4ef9b8e-325d-4ac1-940f-bca5b5284848', NULL, '20ft', false, '"[{\"row\":1,\"maxTiers\":3},{\"row\":2,\"maxTiers\":4},{\"row\":3,\"maxTiers\":4},{\"row\":4,\"maxTiers\":3}]"'::jsonb, false, false, NULL, '"[]"'::jsonb);
INSERT INTO public."stacks" ("id", "yard_id", "stack_number", "section_id", "section_name", "rows", "max_tiers", "capacity", "current_occupancy", "position_x", "position_y", "position_z", "width", "length", "is_active", "is_odd_stack", "assigned_client_code", "notes", "created_at", "updated_at", "created_by", "updated_by", "container_size", "is_special_stack", "row_tier_config", "is_virtual", "is_buffer_zone", "buffer_zone_type", "damage_types_supported") VALUES ('04101c70-883e-46fa-904f-06df48e6f96a', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 51, 'zone-b-2554a779-a14b-45ed-a1e1-684e2fd9b614', 'Zone B', 4, 4, 14, 0, 0, 0, 0, 2.5, 12, true, false, NULL, NULL, '2026-02-03 16:51:30.539+00', '2026-02-03 16:51:30.539+00', 'f4ef9b8e-325d-4ac1-940f-bca5b5284848', NULL, '20ft', false, '"[{\"row\":1,\"maxTiers\":3},{\"row\":2,\"maxTiers\":4},{\"row\":3,\"maxTiers\":4},{\"row\":4,\"maxTiers\":3}]"'::jsonb, false, false, NULL, '"[]"'::jsonb);
INSERT INTO public."stacks" ("id", "yard_id", "stack_number", "section_id", "section_name", "rows", "max_tiers", "capacity", "current_occupancy", "position_x", "position_y", "position_z", "width", "length", "is_active", "is_odd_stack", "assigned_client_code", "notes", "created_at", "updated_at", "created_by", "updated_by", "container_size", "is_special_stack", "row_tier_config", "is_virtual", "is_buffer_zone", "buffer_zone_type", "damage_types_supported") VALUES ('19e2e045-92cf-4519-b4f9-119e21304e80', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 53, 'zone-b-2554a779-a14b-45ed-a1e1-684e2fd9b614', 'Zone B', 4, 4, 14, 0, 0, 0, 0, 2.5, 12, true, false, NULL, NULL, '2026-02-03 16:51:54.638+00', '2026-02-03 16:51:54.638+00', 'f4ef9b8e-325d-4ac1-940f-bca5b5284848', NULL, '20ft', false, '"[{\"row\":1,\"maxTiers\":3},{\"row\":2,\"maxTiers\":4},{\"row\":3,\"maxTiers\":4},{\"row\":4,\"maxTiers\":3}]"'::jsonb, false, false, NULL, '"[]"'::jsonb);
INSERT INTO public."stacks" ("id", "yard_id", "stack_number", "section_id", "section_name", "rows", "max_tiers", "capacity", "current_occupancy", "position_x", "position_y", "position_z", "width", "length", "is_active", "is_odd_stack", "assigned_client_code", "notes", "created_at", "updated_at", "created_by", "updated_by", "container_size", "is_special_stack", "row_tier_config", "is_virtual", "is_buffer_zone", "buffer_zone_type", "damage_types_supported") VALUES ('c1b873a8-13ac-4a7c-a696-9b047d672292', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 55, 'zone-b-2554a779-a14b-45ed-a1e1-684e2fd9b614', 'Zone B', 4, 4, 14, 0, 0, 0, 0, 2.5, 12, true, false, NULL, NULL, '2026-02-03 16:52:28.513+00', '2026-02-03 16:52:28.513+00', 'f4ef9b8e-325d-4ac1-940f-bca5b5284848', NULL, '20ft', false, '"[{\"row\":1,\"maxTiers\":3},{\"row\":2,\"maxTiers\":4},{\"row\":3,\"maxTiers\":4},{\"row\":4,\"maxTiers\":3}]"'::jsonb, false, false, NULL, '"[]"'::jsonb);
INSERT INTO public."stacks" ("id", "yard_id", "stack_number", "section_id", "section_name", "rows", "max_tiers", "capacity", "current_occupancy", "position_x", "position_y", "position_z", "width", "length", "is_active", "is_odd_stack", "assigned_client_code", "notes", "created_at", "updated_at", "created_by", "updated_by", "container_size", "is_special_stack", "row_tier_config", "is_virtual", "is_buffer_zone", "buffer_zone_type", "damage_types_supported") VALUES ('203cecb6-e66d-4e8d-b43d-71a13a18fb0e', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 61, 'zone-c-2554a779-a14b-45ed-a1e1-684e2fd9b614', 'Zone C', 6, 5, 27, 0, 0, 0, 0, 2.5, 12, true, false, NULL, NULL, '2026-02-03 16:54:28.453+00', '2026-02-03 16:54:28.453+00', 'f4ef9b8e-325d-4ac1-940f-bca5b5284848', NULL, '20ft', false, '"[{\"row\":1,\"maxTiers\":3},{\"row\":2,\"maxTiers\":4},{\"row\":3,\"maxTiers\":5},{\"row\":4,\"maxTiers\":5},{\"row\":5,\"maxTiers\":5},{\"row\":6,\"maxTiers\":5}]"'::jsonb, false, false, NULL, '"[]"'::jsonb);
INSERT INTO public."stacks" ("id", "yard_id", "stack_number", "section_id", "section_name", "rows", "max_tiers", "capacity", "current_occupancy", "position_x", "position_y", "position_z", "width", "length", "is_active", "is_odd_stack", "assigned_client_code", "notes", "created_at", "updated_at", "created_by", "updated_by", "container_size", "is_special_stack", "row_tier_config", "is_virtual", "is_buffer_zone", "buffer_zone_type", "damage_types_supported") VALUES ('85718d1f-57cf-42d8-8562-eeed13123d6c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 63, 'zone-c-2554a779-a14b-45ed-a1e1-684e2fd9b614', 'Zone C', 6, 5, 27, 0, 0, 0, 0, 2.5, 12, true, false, NULL, NULL, '2026-02-03 16:55:08.256+00', '2026-02-03 16:55:08.256+00', 'f4ef9b8e-325d-4ac1-940f-bca5b5284848', NULL, '20ft', false, '"[{\"row\":1,\"maxTiers\":3},{\"row\":2,\"maxTiers\":4},{\"row\":3,\"maxTiers\":5},{\"row\":4,\"maxTiers\":5},{\"row\":5,\"maxTiers\":5},{\"row\":6,\"maxTiers\":5}]"'::jsonb, false, false, NULL, '"[]"'::jsonb);
INSERT INTO public."stacks" ("id", "yard_id", "stack_number", "section_id", "section_name", "rows", "max_tiers", "capacity", "current_occupancy", "position_x", "position_y", "position_z", "width", "length", "is_active", "is_odd_stack", "assigned_client_code", "notes", "created_at", "updated_at", "created_by", "updated_by", "container_size", "is_special_stack", "row_tier_config", "is_virtual", "is_buffer_zone", "buffer_zone_type", "damage_types_supported") VALUES ('ceb38ff1-6f08-4e7a-9506-ea3f56d57817', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 65, 'zone-c-2554a779-a14b-45ed-a1e1-684e2fd9b614', 'Zone C', 6, 5, 27, 0, 0, 0, 0, 2.5, 12, true, false, NULL, NULL, '2026-02-03 16:55:40.625+00', '2026-02-03 16:55:40.625+00', 'f4ef9b8e-325d-4ac1-940f-bca5b5284848', NULL, '20ft', false, '"[{\"row\":1,\"maxTiers\":3},{\"row\":2,\"maxTiers\":4},{\"row\":3,\"maxTiers\":5},{\"row\":4,\"maxTiers\":5},{\"row\":5,\"maxTiers\":5},{\"row\":6,\"maxTiers\":5}]"'::jsonb, false, false, NULL, '"[]"'::jsonb);
INSERT INTO public."stacks" ("id", "yard_id", "stack_number", "section_id", "section_name", "rows", "max_tiers", "capacity", "current_occupancy", "position_x", "position_y", "position_z", "width", "length", "is_active", "is_odd_stack", "assigned_client_code", "notes", "created_at", "updated_at", "created_by", "updated_by", "container_size", "is_special_stack", "row_tier_config", "is_virtual", "is_buffer_zone", "buffer_zone_type", "damage_types_supported") VALUES ('b9f8a44a-6304-47eb-8474-41f29743d6b0', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 67, 'zone-c-2554a779-a14b-45ed-a1e1-684e2fd9b614', 'Zone C', 6, 5, 27, 0, 0, 0, 0, 2.5, 12, true, false, NULL, NULL, '2026-02-03 16:56:03.758+00', '2026-02-03 16:56:03.758+00', 'f4ef9b8e-325d-4ac1-940f-bca5b5284848', NULL, '20ft', false, '"[{\"row\":1,\"maxTiers\":3},{\"row\":2,\"maxTiers\":4},{\"row\":3,\"maxTiers\":5},{\"row\":4,\"maxTiers\":5},{\"row\":5,\"maxTiers\":5},{\"row\":6,\"maxTiers\":5}]"'::jsonb, false, false, NULL, '"[]"'::jsonb);
INSERT INTO public."stacks" ("id", "yard_id", "stack_number", "section_id", "section_name", "rows", "max_tiers", "capacity", "current_occupancy", "position_x", "position_y", "position_z", "width", "length", "is_active", "is_odd_stack", "assigned_client_code", "notes", "created_at", "updated_at", "created_by", "updated_by", "container_size", "is_special_stack", "row_tier_config", "is_virtual", "is_buffer_zone", "buffer_zone_type", "damage_types_supported") VALUES ('be725133-f6e8-4302-b87f-9e091196c971', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 69, 'zone-c-2554a779-a14b-45ed-a1e1-684e2fd9b614', 'Zone C', 6, 5, 27, 0, 0, 0, 0, 2.5, 12, true, false, NULL, NULL, '2026-02-03 16:56:27.510+00', '2026-02-03 16:56:27.510+00', 'f4ef9b8e-325d-4ac1-940f-bca5b5284848', NULL, '20ft', false, '"[{\"row\":1,\"maxTiers\":3},{\"row\":2,\"maxTiers\":4},{\"row\":3,\"maxTiers\":5},{\"row\":4,\"maxTiers\":5},{\"row\":5,\"maxTiers\":5},{\"row\":6,\"maxTiers\":5}]"'::jsonb, false, false, NULL, '"[]"'::jsonb);
INSERT INTO public."stacks" ("id", "yard_id", "stack_number", "section_id", "section_name", "rows", "max_tiers", "capacity", "current_occupancy", "position_x", "position_y", "position_z", "width", "length", "is_active", "is_odd_stack", "assigned_client_code", "notes", "created_at", "updated_at", "created_by", "updated_by", "container_size", "is_special_stack", "row_tier_config", "is_virtual", "is_buffer_zone", "buffer_zone_type", "damage_types_supported") VALUES ('d433895b-d55d-4075-b062-aa925d066d5d', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 71, 'zone-c-2554a779-a14b-45ed-a1e1-684e2fd9b614', 'Zone C', 6, 5, 27, 0, 0, 0, 0, 2.5, 12, true, false, NULL, NULL, '2026-02-03 16:56:58.474+00', '2026-02-03 16:56:58.474+00', 'f4ef9b8e-325d-4ac1-940f-bca5b5284848', NULL, '20ft', false, '"[{\"row\":1,\"maxTiers\":3},{\"row\":2,\"maxTiers\":4},{\"row\":3,\"maxTiers\":5},{\"row\":4,\"maxTiers\":5},{\"row\":5,\"maxTiers\":5},{\"row\":6,\"maxTiers\":5}]"'::jsonb, false, false, NULL, '"[]"'::jsonb);
INSERT INTO public."stacks" ("id", "yard_id", "stack_number", "section_id", "section_name", "rows", "max_tiers", "capacity", "current_occupancy", "position_x", "position_y", "position_z", "width", "length", "is_active", "is_odd_stack", "assigned_client_code", "notes", "created_at", "updated_at", "created_by", "updated_by", "container_size", "is_special_stack", "row_tier_config", "is_virtual", "is_buffer_zone", "buffer_zone_type", "damage_types_supported") VALUES ('123352f4-087a-493b-bc8d-614a4f7c496b', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 73, 'zone-c-2554a779-a14b-45ed-a1e1-684e2fd9b614', 'Zone C', 4, 5, 17, 0, 0, 0, 0, 2.5, 12, true, false, NULL, NULL, '2026-02-03 16:57:57.648+00', '2026-02-03 16:57:57.648+00', 'f4ef9b8e-325d-4ac1-940f-bca5b5284848', NULL, '20ft', false, '"[{\"row\":1,\"maxTiers\":3},{\"row\":2,\"maxTiers\":4},{\"row\":3,\"maxTiers\":5},{\"row\":4,\"maxTiers\":5}]"'::jsonb, false, false, NULL, '"[]"'::jsonb);
INSERT INTO public."stacks" ("id", "yard_id", "stack_number", "section_id", "section_name", "rows", "max_tiers", "capacity", "current_occupancy", "position_x", "position_y", "position_z", "width", "length", "is_active", "is_odd_stack", "assigned_client_code", "notes", "created_at", "updated_at", "created_by", "updated_by", "container_size", "is_special_stack", "row_tier_config", "is_virtual", "is_buffer_zone", "buffer_zone_type", "damage_types_supported") VALUES ('8e638f61-f5a2-462d-bb24-1add32b486fd', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 75, 'zone-c-2554a779-a14b-45ed-a1e1-684e2fd9b614', 'Zone C', 4, 5, 17, 0, 0, 0, 0, 2.5, 12, true, false, NULL, NULL, '2026-02-03 16:58:23.209+00', '2026-02-03 16:58:23.209+00', 'f4ef9b8e-325d-4ac1-940f-bca5b5284848', NULL, '20ft', false, '"[{\"row\":1,\"maxTiers\":3},{\"row\":2,\"maxTiers\":4},{\"row\":3,\"maxTiers\":5},{\"row\":4,\"maxTiers\":5}]"'::jsonb, false, false, NULL, '"[]"'::jsonb);
INSERT INTO public."stacks" ("id", "yard_id", "stack_number", "section_id", "section_name", "rows", "max_tiers", "capacity", "current_occupancy", "position_x", "position_y", "position_z", "width", "length", "is_active", "is_odd_stack", "assigned_client_code", "notes", "created_at", "updated_at", "created_by", "updated_by", "container_size", "is_special_stack", "row_tier_config", "is_virtual", "is_buffer_zone", "buffer_zone_type", "damage_types_supported") VALUES ('40c45414-80b4-478f-96f8-e4bb81aa6360', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 77, 'zone-c-2554a779-a14b-45ed-a1e1-684e2fd9b614', 'Zone C', 4, 5, 17, 0, 0, 0, 0, 2.5, 12, true, false, NULL, NULL, '2026-02-03 16:58:40.190+00', '2026-02-03 16:58:40.190+00', 'f4ef9b8e-325d-4ac1-940f-bca5b5284848', NULL, '20ft', false, '"[{\"row\":1,\"maxTiers\":3},{\"row\":2,\"maxTiers\":4},{\"row\":3,\"maxTiers\":5},{\"row\":4,\"maxTiers\":5}]"'::jsonb, false, false, NULL, '"[]"'::jsonb);
INSERT INTO public."stacks" ("id", "yard_id", "stack_number", "section_id", "section_name", "rows", "max_tiers", "capacity", "current_occupancy", "position_x", "position_y", "position_z", "width", "length", "is_active", "is_odd_stack", "assigned_client_code", "notes", "created_at", "updated_at", "created_by", "updated_by", "container_size", "is_special_stack", "row_tier_config", "is_virtual", "is_buffer_zone", "buffer_zone_type", "damage_types_supported") VALUES ('dcf3a17b-5fd4-4753-ab0d-5a0529fa9271', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 79, 'zone-c-2554a779-a14b-45ed-a1e1-684e2fd9b614', 'Zone C', 4, 5, 17, 0, 0, 0, 0, 2.5, 12, true, false, NULL, NULL, '2026-02-03 16:59:10.464+00', '2026-02-03 16:59:10.464+00', 'f4ef9b8e-325d-4ac1-940f-bca5b5284848', NULL, '20ft', false, '"[{\"row\":1,\"maxTiers\":3},{\"row\":2,\"maxTiers\":4},{\"row\":3,\"maxTiers\":5},{\"row\":4,\"maxTiers\":5}]"'::jsonb, false, false, NULL, '"[]"'::jsonb);
INSERT INTO public."stacks" ("id", "yard_id", "stack_number", "section_id", "section_name", "rows", "max_tiers", "capacity", "current_occupancy", "position_x", "position_y", "position_z", "width", "length", "is_active", "is_odd_stack", "assigned_client_code", "notes", "created_at", "updated_at", "created_by", "updated_by", "container_size", "is_special_stack", "row_tier_config", "is_virtual", "is_buffer_zone", "buffer_zone_type", "damage_types_supported") VALUES ('c622973b-c21b-4877-99e7-97cb30e0fcdc', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 81, 'zone-c-2554a779-a14b-45ed-a1e1-684e2fd9b614', 'Zone C', 4, 5, 17, 0, 0, 0, 0, 2.5, 12, true, false, NULL, NULL, '2026-02-03 17:00:08.570+00', '2026-02-03 17:00:08.570+00', 'f4ef9b8e-325d-4ac1-940f-bca5b5284848', NULL, '20ft', false, '"[{\"row\":1,\"maxTiers\":3},{\"row\":2,\"maxTiers\":4},{\"row\":3,\"maxTiers\":5},{\"row\":4,\"maxTiers\":5}]"'::jsonb, false, false, NULL, '"[]"'::jsonb);
INSERT INTO public."stacks" ("id", "yard_id", "stack_number", "section_id", "section_name", "rows", "max_tiers", "capacity", "current_occupancy", "position_x", "position_y", "position_z", "width", "length", "is_active", "is_odd_stack", "assigned_client_code", "notes", "created_at", "updated_at", "created_by", "updated_by", "container_size", "is_special_stack", "row_tier_config", "is_virtual", "is_buffer_zone", "buffer_zone_type", "damage_types_supported") VALUES ('75608710-099c-41a9-aacc-3eaf95d03820', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 83, 'zone-c-2554a779-a14b-45ed-a1e1-684e2fd9b614', 'Zone C', 4, 5, 17, 0, 0, 0, 0, 2.5, 12, true, false, NULL, NULL, '2026-02-03 17:00:50.259+00', '2026-02-03 17:00:50.259+00', 'f4ef9b8e-325d-4ac1-940f-bca5b5284848', NULL, '20ft', false, '"[{\"row\":1,\"maxTiers\":3},{\"row\":2,\"maxTiers\":4},{\"row\":3,\"maxTiers\":5},{\"row\":4,\"maxTiers\":5}]"'::jsonb, false, false, NULL, '"[]"'::jsonb);
INSERT INTO public."stacks" ("id", "yard_id", "stack_number", "section_id", "section_name", "rows", "max_tiers", "capacity", "current_occupancy", "position_x", "position_y", "position_z", "width", "length", "is_active", "is_odd_stack", "assigned_client_code", "notes", "created_at", "updated_at", "created_by", "updated_by", "container_size", "is_special_stack", "row_tier_config", "is_virtual", "is_buffer_zone", "buffer_zone_type", "damage_types_supported") VALUES ('48621071-6349-4493-b95c-5e9186f5aa4c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 85, 'zone-c-2554a779-a14b-45ed-a1e1-684e2fd9b614', 'Zone C', 4, 5, 17, 0, 0, 0, 0, 2.5, 12, true, false, NULL, NULL, '2026-02-03 17:01:05.295+00', '2026-02-03 17:01:05.295+00', 'f4ef9b8e-325d-4ac1-940f-bca5b5284848', NULL, '20ft', false, '"[{\"row\":1,\"maxTiers\":3},{\"row\":2,\"maxTiers\":4},{\"row\":3,\"maxTiers\":5},{\"row\":4,\"maxTiers\":5}]"'::jsonb, false, false, NULL, '"[]"'::jsonb);
INSERT INTO public."stacks" ("id", "yard_id", "stack_number", "section_id", "section_name", "rows", "max_tiers", "capacity", "current_occupancy", "position_x", "position_y", "position_z", "width", "length", "is_active", "is_odd_stack", "assigned_client_code", "notes", "created_at", "updated_at", "created_by", "updated_by", "container_size", "is_special_stack", "row_tier_config", "is_virtual", "is_buffer_zone", "buffer_zone_type", "damage_types_supported") VALUES ('6452fa6d-e2e5-46af-be2f-323fd5fc6c69', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 89, 'zone-c-2554a779-a14b-45ed-a1e1-684e2fd9b614', 'Zone C', 4, 5, 17, 0, 0, 0, 0, 2.5, 12, true, false, NULL, NULL, '2026-02-03 17:01:41.801+00', '2026-02-03 17:01:41.801+00', 'f4ef9b8e-325d-4ac1-940f-bca5b5284848', NULL, '20ft', false, '"[{\"row\":1,\"maxTiers\":3},{\"row\":2,\"maxTiers\":4},{\"row\":3,\"maxTiers\":5},{\"row\":4,\"maxTiers\":5}]"'::jsonb, false, false, NULL, '"[]"'::jsonb);
INSERT INTO public."stacks" ("id", "yard_id", "stack_number", "section_id", "section_name", "rows", "max_tiers", "capacity", "current_occupancy", "position_x", "position_y", "position_z", "width", "length", "is_active", "is_odd_stack", "assigned_client_code", "notes", "created_at", "updated_at", "created_by", "updated_by", "container_size", "is_special_stack", "row_tier_config", "is_virtual", "is_buffer_zone", "buffer_zone_type", "damage_types_supported") VALUES ('6a63cc25-1571-438b-bcc2-07863ddb9375', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 87, 'zone-c-2554a779-a14b-45ed-a1e1-684e2fd9b614', 'Zone C', 4, 5, 17, 0, 0, 0, 0, 2.5, 12, true, false, NULL, NULL, '2026-02-03 17:02:06.429+00', '2026-02-03 17:02:06.429+00', 'f4ef9b8e-325d-4ac1-940f-bca5b5284848', NULL, '20ft', false, '"[{\"row\":1,\"maxTiers\":3},{\"row\":2,\"maxTiers\":4},{\"row\":3,\"maxTiers\":5},{\"row\":4,\"maxTiers\":5}]"'::jsonb, false, false, NULL, '"[]"'::jsonb);
INSERT INTO public."stack_pairings" ("id", "yard_id", "first_stack_number", "second_stack_number", "virtual_stack_number", "first_stack_id", "second_stack_id", "is_active", "created_at", "updated_at") VALUES ('4b15d30a-c2bc-4a84-be42-dae5acb2200d', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 7, 9, 8, '64af6192-e8c2-49ab-8a8b-417cb4851d66', '1368468e-7518-4cd8-8162-5d2fa3009a51', false, '2026-01-29 13:49:18.122+00', '2026-01-29 13:49:18.122+00');
INSERT INTO public."stack_pairings" ("id", "yard_id", "first_stack_number", "second_stack_number", "virtual_stack_number", "first_stack_id", "second_stack_id", "is_active", "created_at", "updated_at") VALUES ('727f98b5-73b9-46bb-a307-03f53808e98d', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 5, 4, '5827a621-7b2e-4d64-94d4-ab8badba6153', '089626b9-64bc-4fbd-b75d-0f677bbf65ca', false, '2026-01-28 15:01:32.040+00', '2026-02-12 16:53:48.368+00');
INSERT INTO public."virtual_stack_pairs" ("id", "yard_id", "stack1_id", "stack2_id", "virtual_stack_number", "is_active", "created_at", "updated_at") VALUES ('dab8622d-d957-4bd5-bf3b-790a24a107e9', '2554a779-a14b-45ed-a1e1-684e2fd9b614', '5827a621-7b2e-4d64-94d4-ab8badba6153', '089626b9-64bc-4fbd-b75d-0f677bbf65ca', 4, true, '2026-02-20 16:00:39.243+00', '2026-03-04 18:13:12.863+00');
INSERT INTO public."container_types" ("id", "type_code", "display_name", "is_high_cube", "available_sizes", "iso_code_20", "iso_code_40", "is_active", "created_at", "updated_at") VALUES ('a750a73e-c3d8-4853-b09c-a7f80fd7a43b', 'dry', 'Dry Container', false, ARRAY["20ft","40ft"], '22G1', '42G1', true, '2025-11-03 18:16:27.081+00', '2025-11-03 18:16:27.081+00');
INSERT INTO public."container_types" ("id", "type_code", "display_name", "is_high_cube", "available_sizes", "iso_code_20", "iso_code_40", "is_active", "created_at", "updated_at") VALUES ('653c87c3-450f-4e72-bfb3-f6a68971e828', 'high_cube', 'High-Cube Container', true, ARRAY["40ft"], NULL, '45G1', true, '2025-11-03 18:16:27.081+00', '2025-11-03 18:16:27.081+00');
INSERT INTO public."container_types" ("id", "type_code", "display_name", "is_high_cube", "available_sizes", "iso_code_20", "iso_code_40", "is_active", "created_at", "updated_at") VALUES ('77cd412c-e6c7-4833-b957-61579d44a253', 'reefer', 'Refrigerated Container', false, ARRAY["20ft","40ft"], '22R1', '42R1', true, '2025-11-03 18:16:27.081+00', '2025-11-03 18:16:27.081+00');
INSERT INTO public."container_types" ("id", "type_code", "display_name", "is_high_cube", "available_sizes", "iso_code_20", "iso_code_40", "is_active", "created_at", "updated_at") VALUES ('f3b9bdc3-7b8d-466b-9d52-26b6632f7b3e', 'tank', 'Tank Container', false, ARRAY["20ft"], '22T1', NULL, true, '2025-11-03 18:16:27.081+00', '2025-11-03 18:16:27.081+00');
INSERT INTO public."container_types" ("id", "type_code", "display_name", "is_high_cube", "available_sizes", "iso_code_20", "iso_code_40", "is_active", "created_at", "updated_at") VALUES ('5c65e991-8997-4c3f-9e3c-3842352dac2d', 'flat_rack', 'Flat Rack Container', false, ARRAY["20ft","40ft"], '22P1', '42P1', true, '2025-11-03 18:16:27.081+00', '2025-11-03 18:16:27.081+00');
INSERT INTO public."container_types" ("id", "type_code", "display_name", "is_high_cube", "available_sizes", "iso_code_20", "iso_code_40", "is_active", "created_at", "updated_at") VALUES ('4bd607e9-7f13-4820-bb9d-b6c633688da9', 'open_top', 'Open Top Container', false, ARRAY["20ft","40ft"], '22U1', '42U1', true, '2025-11-03 18:16:27.081+00', '2025-11-03 18:16:27.081+00');
INSERT INTO public."container_types" ("id", "type_code", "display_name", "is_high_cube", "available_sizes", "iso_code_20", "iso_code_40", "is_active", "created_at", "updated_at") VALUES ('2aff5864-db52-407d-aa1d-4253eb181440', 'hard_top', 'Hard Top Container', false, ARRAY["20ft","40ft"], '22H1', '42H1', true, '2025-11-03 18:16:27.081+00', '2025-11-03 18:16:27.081+00');
INSERT INTO public."container_types" ("id", "type_code", "display_name", "is_high_cube", "available_sizes", "iso_code_20", "iso_code_40", "is_active", "created_at", "updated_at") VALUES ('c6bc3173-9ec7-4223-9188-1e2b3b2bc317', 'ventilated', 'Ventilated Container', false, ARRAY["20ft","40ft"], '22V1', '42V1', true, '2025-11-03 18:16:27.081+00', '2025-11-03 18:16:27.081+00');
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('a992123f-e26c-41d6-be74-45e54a60af12', 'S01R1H1', '3a0fc405-2b47-4224-9da0-2b9f18aa733b', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:16.103+00', '2026-03-17 16:47:16.103+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('81f8b5e5-fae6-4740-b27f-bc3b550a33d2', 'S01R1H2', '3a0fc405-2b47-4224-9da0-2b9f18aa733b', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:16.294+00', '2026-03-17 16:47:16.294+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('5c35abf9-97f3-4cf8-97bb-c03c1c44fc2f', 'S01R1H3', '3a0fc405-2b47-4224-9da0-2b9f18aa733b', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:16.515+00', '2026-03-17 16:47:16.515+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('7a984241-b34c-4052-a570-5a098a09bcca', 'S01R1H4', '3a0fc405-2b47-4224-9da0-2b9f18aa733b', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:16.679+00', '2026-03-17 16:47:16.679+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('d8dcc75a-56db-4ad4-b4d2-0c9fa663b679', 'S01R1H5', '3a0fc405-2b47-4224-9da0-2b9f18aa733b', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:16.834+00', '2026-03-17 16:47:16.834+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('c481179c-b4fb-4fe5-9db7-3a9025e4c391', 'S01R2H1', '3a0fc405-2b47-4224-9da0-2b9f18aa733b', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:16.995+00', '2026-03-17 16:47:16.995+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('c632dc0d-9704-4e32-9ed8-975a07cecf19', 'S01R2H2', '3a0fc405-2b47-4224-9da0-2b9f18aa733b', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:17.194+00', '2026-03-17 16:47:17.194+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('65a6785d-26ff-4c7c-8de0-ad7b9953538a', 'S01R2H3', '3a0fc405-2b47-4224-9da0-2b9f18aa733b', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:17.394+00', '2026-03-17 16:47:17.394+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('0eee340e-aa24-4f25-b4c5-93640bcf97ad', 'S01R2H4', '3a0fc405-2b47-4224-9da0-2b9f18aa733b', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:17.622+00', '2026-03-17 16:47:17.622+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('10d276f7-23fc-4f03-b2d3-3422a2d07bfa', 'S01R2H5', '3a0fc405-2b47-4224-9da0-2b9f18aa733b', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:17.883+00', '2026-03-17 16:47:17.883+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('54e24b6a-71bc-4f23-8f35-8452a2fc6c31', 'S01R3H1', '3a0fc405-2b47-4224-9da0-2b9f18aa733b', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:18.055+00', '2026-03-17 16:47:18.055+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('13e5c195-5f8b-425c-86da-f4f49dc61112', 'S01R3H2', '3a0fc405-2b47-4224-9da0-2b9f18aa733b', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:18.238+00', '2026-03-17 16:47:18.238+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('d8970937-956d-44f9-afa6-b422cf4c4397', 'S01R3H3', '3a0fc405-2b47-4224-9da0-2b9f18aa733b', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:18.414+00', '2026-03-17 16:47:18.414+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('fc2c2e5b-2e8a-4baf-bc72-0575a8eaf48b', 'S01R3H4', '3a0fc405-2b47-4224-9da0-2b9f18aa733b', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:18.594+00', '2026-03-17 16:47:18.594+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('00aa6b73-2f9d-4d70-a915-d2e7da1b4c03', 'S01R3H5', '3a0fc405-2b47-4224-9da0-2b9f18aa733b', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:18.795+00', '2026-03-17 16:47:18.795+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('dd50a763-fb05-4aa2-97c3-effbd84a493d', 'S01R4H1', '3a0fc405-2b47-4224-9da0-2b9f18aa733b', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:19.014+00', '2026-03-17 16:47:19.014+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('221dfda5-cae6-4b58-ba6b-8f3b3c9f8059', 'S01R4H2', '3a0fc405-2b47-4224-9da0-2b9f18aa733b', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:19.174+00', '2026-03-17 16:47:19.174+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('913efe50-07e2-4bf1-8e8e-b800d3ada09c', 'S01R4H3', '3a0fc405-2b47-4224-9da0-2b9f18aa733b', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:19.375+00', '2026-03-17 16:47:19.375+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('06b7e43a-3a43-47b6-a3b0-7e09c5cbd6c2', 'S01R4H4', '3a0fc405-2b47-4224-9da0-2b9f18aa733b', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:19.575+00', '2026-03-17 16:47:19.575+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('08652fcb-212d-4b6e-a883-54503e668527', 'S01R4H5', '3a0fc405-2b47-4224-9da0-2b9f18aa733b', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:19.795+00', '2026-03-17 16:47:19.795+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('1f996d27-d0a7-4678-b8bb-dfb6387702c7', 'S03R1H1', '5827a621-7b2e-4d64-94d4-ab8badba6153', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:19.955+00', '2026-03-17 16:47:19.955+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('29db5e91-2730-4c88-bb72-a3943ab39f8b', 'S03R1H2', '5827a621-7b2e-4d64-94d4-ab8badba6153', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:20.155+00', '2026-03-17 16:47:20.155+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('c09ae4ff-dfd4-4ab8-9533-62d3028965d3', 'S03R1H3', '5827a621-7b2e-4d64-94d4-ab8badba6153', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:20.354+00', '2026-03-17 16:47:20.354+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('3fb88f72-230d-4f53-8c60-52abd38ce3b2', 'S03R1H4', '5827a621-7b2e-4d64-94d4-ab8badba6153', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:20.555+00', '2026-03-17 16:47:20.555+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('031bb2e8-04f3-48be-9332-de732076aebf', 'S03R1H5', '5827a621-7b2e-4d64-94d4-ab8badba6153', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:20.715+00', '2026-03-17 16:47:20.715+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('f1d9f48b-fadc-4573-be20-9e8ebc8e6e5c', 'S03R2H1', '5827a621-7b2e-4d64-94d4-ab8badba6153', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:20.935+00', '2026-03-17 16:47:20.935+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('57f784b1-31d7-40ed-8a4d-81f0206555ea', 'S03R2H2', '5827a621-7b2e-4d64-94d4-ab8badba6153', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:21.114+00', '2026-03-17 16:47:21.114+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('0fd25375-9f34-4b69-af50-dfe018d18085', 'S03R2H3', '5827a621-7b2e-4d64-94d4-ab8badba6153', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:21.343+00', '2026-03-17 16:47:21.343+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('cb4548fb-f497-40d3-80c9-8c330f388763', 'S03R2H4', '5827a621-7b2e-4d64-94d4-ab8badba6153', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:21.535+00', '2026-03-17 16:47:21.535+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('2f168cad-37d5-4bec-a18e-303b73e16717', 'S03R2H5', '5827a621-7b2e-4d64-94d4-ab8badba6153', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:21.703+00', '2026-03-17 16:47:21.703+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('0c823529-3ef6-4da3-a9a7-7a128ed1f669', 'S03R3H1', '5827a621-7b2e-4d64-94d4-ab8badba6153', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:21.903+00', '2026-03-17 16:47:21.903+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('ca2ebdbf-8111-46de-91f8-3c8e29fc30b3', 'S03R3H2', '5827a621-7b2e-4d64-94d4-ab8badba6153', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:22.055+00', '2026-03-17 16:47:22.055+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('a0740b19-baa7-4bdd-955d-092929d0c228', 'S03R3H3', '5827a621-7b2e-4d64-94d4-ab8badba6153', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:22.214+00', '2026-03-17 16:47:22.214+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('e4c55508-faa8-4ae9-b662-680f18ea0f62', 'S03R3H4', '5827a621-7b2e-4d64-94d4-ab8badba6153', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:22.375+00', '2026-03-17 16:47:22.375+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('d9a49c78-f8b4-4769-a739-f9dd56089daa', 'S03R3H5', '5827a621-7b2e-4d64-94d4-ab8badba6153', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:22.603+00', '2026-03-17 16:47:22.603+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('385f38ce-b581-4b11-acf1-a457e9c296ba', 'S03R4H1', '5827a621-7b2e-4d64-94d4-ab8badba6153', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:22.783+00', '2026-03-17 16:47:22.783+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('928a8135-4ed7-4384-a50b-cdae3f6aaeff', 'S03R4H2', '5827a621-7b2e-4d64-94d4-ab8badba6153', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:23.042+00', '2026-03-17 16:47:23.042+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('d6535025-94d6-4735-ba8e-a6e59255072c', 'S03R4H3', '5827a621-7b2e-4d64-94d4-ab8badba6153', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:23.255+00', '2026-03-17 16:47:23.255+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('ba803797-7608-4f43-bff6-c27c6e1ec7f0', 'S03R4H4', '5827a621-7b2e-4d64-94d4-ab8badba6153', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:23.462+00', '2026-03-17 16:47:23.462+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('0ef44def-7c51-4e6e-99e9-5a180cd1732a', 'S03R4H5', '5827a621-7b2e-4d64-94d4-ab8badba6153', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:23.635+00', '2026-03-17 16:47:23.635+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('5301f41f-f3c2-41d3-98ea-66f754c3c66d', 'S03R5H1', '5827a621-7b2e-4d64-94d4-ab8badba6153', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:23.835+00', '2026-03-17 16:47:23.835+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('7b34d312-c155-4669-a7c9-434195529b73', 'S03R5H2', '5827a621-7b2e-4d64-94d4-ab8badba6153', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:23.994+00', '2026-03-17 16:47:23.994+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('1691e77b-d837-4b63-b86e-b8c64a13ad73', 'S03R5H3', '5827a621-7b2e-4d64-94d4-ab8badba6153', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:24.191+00', '2026-03-17 16:47:24.191+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('43001b81-520e-448f-b25e-53d1ed528081', 'S03R5H4', '5827a621-7b2e-4d64-94d4-ab8badba6153', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:24.415+00', '2026-03-17 16:47:24.415+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('3eda8c3b-e18a-40a5-a157-08255a1df6fb', 'S03R5H5', '5827a621-7b2e-4d64-94d4-ab8badba6153', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:24.594+00', '2026-03-17 16:47:24.594+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('eed22370-d73b-4cf7-b778-083286c724c8', 'S05R1H1', '089626b9-64bc-4fbd-b75d-0f677bbf65ca', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:24.795+00', '2026-03-17 16:47:24.795+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('44de8ba1-ab19-4d6f-9852-488547d58cda', 'S05R1H2', '089626b9-64bc-4fbd-b75d-0f677bbf65ca', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:25.002+00', '2026-03-17 16:47:25.002+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('8f771903-6cf1-4ff6-ac3a-f4b2976438e4', 'S05R1H3', '089626b9-64bc-4fbd-b75d-0f677bbf65ca', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:25.201+00', '2026-03-17 16:47:25.201+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('d1fad94f-8d27-4f5b-9725-fee213ff5eaa', 'S05R1H4', '089626b9-64bc-4fbd-b75d-0f677bbf65ca', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:25.395+00', '2026-03-17 16:47:25.395+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('0ad27d9f-4d8a-475c-9ee8-033d21eb9367', 'S05R1H5', '089626b9-64bc-4fbd-b75d-0f677bbf65ca', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:25.554+00', '2026-03-17 16:47:25.554+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('0493798d-8b18-4e3d-8a52-76f774e499a9', 'S05R2H1', '089626b9-64bc-4fbd-b75d-0f677bbf65ca', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:25.714+00', '2026-03-17 16:47:25.714+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('dda63ddf-d05b-41a4-a75f-060137709f65', 'S05R2H2', '089626b9-64bc-4fbd-b75d-0f677bbf65ca', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:25.879+00', '2026-03-17 16:47:25.879+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('b8af83c4-ae40-47d4-b780-44fc7ebc96c6', 'S05R2H3', '089626b9-64bc-4fbd-b75d-0f677bbf65ca', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:26.035+00', '2026-03-17 16:47:26.035+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('cc757cce-a702-461c-8505-8ff7fdec6ae3', 'S05R2H4', '089626b9-64bc-4fbd-b75d-0f677bbf65ca', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:26.203+00', '2026-03-17 16:47:26.203+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('4773a530-ef6b-4bf0-b3d6-e1679448f64b', 'S05R2H5', '089626b9-64bc-4fbd-b75d-0f677bbf65ca', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:26.375+00', '2026-03-17 16:47:26.375+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('6880e767-58bc-4023-a702-b1ab64262829', 'S05R3H1', '089626b9-64bc-4fbd-b75d-0f677bbf65ca', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:26.543+00', '2026-03-17 16:47:26.543+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('51ebe1a0-746c-4f89-9286-e6a7995b5656', 'S05R3H2', '089626b9-64bc-4fbd-b75d-0f677bbf65ca', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:26.695+00', '2026-03-17 16:47:26.695+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('7768dacb-f747-4c32-b948-28ec730eccdf', 'S05R3H3', '089626b9-64bc-4fbd-b75d-0f677bbf65ca', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:26.877+00', '2026-03-17 16:47:26.877+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('f15be527-c567-43e3-9f5a-4ebeec73edfb', 'S05R3H4', '089626b9-64bc-4fbd-b75d-0f677bbf65ca', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:27.055+00', '2026-03-17 16:47:27.055+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('8ea2cc91-922b-407b-bd05-6aedaebc5fd7', 'S05R3H5', '089626b9-64bc-4fbd-b75d-0f677bbf65ca', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:27.215+00', '2026-03-17 16:47:27.215+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('2ad99db5-5b2f-4293-9082-c62f98d8d340', 'S05R4H1', '089626b9-64bc-4fbd-b75d-0f677bbf65ca', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:27.375+00', '2026-03-17 16:47:27.375+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('79e37297-7252-430d-bbf8-1e71a2880f2c', 'S05R4H2', '089626b9-64bc-4fbd-b75d-0f677bbf65ca', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:27.570+00', '2026-03-17 16:47:27.570+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('f0ea9974-8e0b-48e8-82f9-90a4b97dd043', 'S05R4H3', '089626b9-64bc-4fbd-b75d-0f677bbf65ca', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:27.735+00', '2026-03-17 16:47:27.735+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('53f35c91-5f84-48c6-aadb-e8209f3a922f', 'S05R4H4', '089626b9-64bc-4fbd-b75d-0f677bbf65ca', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:27.895+00', '2026-03-17 16:47:27.895+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('b6818707-5b18-4c34-af17-38673fa598c2', 'S05R4H5', '089626b9-64bc-4fbd-b75d-0f677bbf65ca', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:28.054+00', '2026-03-17 16:47:28.054+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('ad2d2c12-d605-4de6-b55c-ffb0394e41e2', 'S05R5H1', '089626b9-64bc-4fbd-b75d-0f677bbf65ca', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:28.243+00', '2026-03-17 16:47:28.243+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('09462e53-d4a8-47b8-b852-5231b692551b', 'S05R5H2', '089626b9-64bc-4fbd-b75d-0f677bbf65ca', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:28.471+00', '2026-03-17 16:47:28.471+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('81ee13c0-7bf5-4d09-8582-d8405fc26fb8', 'S05R5H3', '089626b9-64bc-4fbd-b75d-0f677bbf65ca', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:28.654+00', '2026-03-17 16:47:28.654+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('3cebc682-d908-4cad-a312-cf9a3751cc47', 'S05R5H4', '089626b9-64bc-4fbd-b75d-0f677bbf65ca', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:28.834+00', '2026-03-17 16:47:28.834+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('f961c136-3788-417e-9cee-8ae05901f1e6', 'S05R5H5', '089626b9-64bc-4fbd-b75d-0f677bbf65ca', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:28.994+00', '2026-03-17 16:47:28.994+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('d4c4210a-d1c6-4f73-8028-cc50443b4c3d', 'S07R1H1', '64af6192-e8c2-49ab-8a8b-417cb4851d66', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:29.163+00', '2026-03-17 16:47:29.163+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('4e8ef4ae-6cc2-4154-be6d-c368b634e50d', 'S07R1H2', '64af6192-e8c2-49ab-8a8b-417cb4851d66', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:29.335+00', '2026-03-17 16:47:29.335+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('d580a1c0-132b-4017-9a62-bdf92cbf53e0', 'S07R1H3', '64af6192-e8c2-49ab-8a8b-417cb4851d66', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:29.495+00', '2026-03-17 16:47:29.495+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('4e34e7cb-ea4b-4c60-8658-008ac6853328', 'S07R1H4', '64af6192-e8c2-49ab-8a8b-417cb4851d66', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:29.674+00', '2026-03-17 16:47:29.674+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('6c3f0ec3-c3a4-4332-875c-48ffa891bc19', 'S07R1H5', '64af6192-e8c2-49ab-8a8b-417cb4851d66', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:29.850+00', '2026-03-17 16:47:29.850+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('caccb4c6-2ad8-4a13-bb36-98a891323d2d', 'S07R2H1', '64af6192-e8c2-49ab-8a8b-417cb4851d66', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:30.042+00', '2026-03-17 16:47:30.042+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('6d39d2c9-b0ef-4aef-a737-541e6b19d640', 'S07R2H2', '64af6192-e8c2-49ab-8a8b-417cb4851d66', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:30.215+00', '2026-03-17 16:47:30.215+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('b7ddd845-7911-41c5-a5e1-ca01d54576cc', 'S07R2H3', '64af6192-e8c2-49ab-8a8b-417cb4851d66', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:30.383+00', '2026-03-17 16:47:30.383+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('4632e87b-2b90-46fc-abbe-0e6c46bb9344', 'S07R2H4', '64af6192-e8c2-49ab-8a8b-417cb4851d66', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:30.575+00', '2026-03-17 16:47:30.575+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('46c3f5f2-1e92-439b-b879-cdc780cb6c65', 'S07R2H5', '64af6192-e8c2-49ab-8a8b-417cb4851d66', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:30.755+00', '2026-03-17 16:47:30.755+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('480f8e68-3bf0-4c6b-bfae-e0e863aa1251', 'S07R3H1', '64af6192-e8c2-49ab-8a8b-417cb4851d66', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:30.924+00', '2026-03-17 16:47:30.924+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('165bf69c-a9b0-412a-8868-750f6ef7d14d', 'S07R3H2', '64af6192-e8c2-49ab-8a8b-417cb4851d66', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:31.143+00', '2026-03-17 16:47:31.143+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('b3e2f693-5d37-49c1-b129-8dd4bfa768b4', 'S07R3H3', '64af6192-e8c2-49ab-8a8b-417cb4851d66', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:31.354+00', '2026-03-17 16:47:31.354+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('35e7abd6-ff84-4b9e-a35a-e34c4cc744ec', 'S07R3H4', '64af6192-e8c2-49ab-8a8b-417cb4851d66', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:31.515+00', '2026-03-17 16:47:31.515+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('0e4e35e2-1d7c-438f-b69c-1fb5551139c8', 'S07R3H5', '64af6192-e8c2-49ab-8a8b-417cb4851d66', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:31.723+00', '2026-03-17 16:47:31.723+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('e9a4d78f-e859-40ff-8d31-a3a9678f7e78', 'S07R4H1', '64af6192-e8c2-49ab-8a8b-417cb4851d66', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:31.935+00', '2026-03-17 16:47:31.935+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('08742d5a-de95-4fd7-ac8c-de775bd508f2', 'S07R4H2', '64af6192-e8c2-49ab-8a8b-417cb4851d66', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:32.122+00', '2026-03-17 16:47:32.122+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('78585faa-2a21-4370-95ab-4894ca3e28ae', 'S07R4H3', '64af6192-e8c2-49ab-8a8b-417cb4851d66', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:32.294+00', '2026-03-17 16:47:32.294+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('1830bee3-de6c-4c39-adb4-f16fe1f24d8a', 'S07R4H4', '64af6192-e8c2-49ab-8a8b-417cb4851d66', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:32.514+00', '2026-03-17 16:47:32.514+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('50f9247f-dbfe-45a1-8fa5-40d62cbed2d3', 'S07R4H5', '64af6192-e8c2-49ab-8a8b-417cb4851d66', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:32.675+00', '2026-03-17 16:47:32.675+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('349b5d8b-ed70-49a1-9f73-a547fb890bf1', 'S07R5H1', '64af6192-e8c2-49ab-8a8b-417cb4851d66', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:32.874+00', '2026-03-17 16:47:32.874+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('240cd87c-43a3-4988-b937-44b579e3a57d', 'S07R5H2', '64af6192-e8c2-49ab-8a8b-417cb4851d66', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:33.142+00', '2026-03-17 16:47:33.142+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('8dfde0cd-d455-448f-8689-8ebc1da0a55d', 'S07R5H3', '64af6192-e8c2-49ab-8a8b-417cb4851d66', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:33.294+00', '2026-03-17 16:47:33.294+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('006a90af-16d2-42bb-81c2-0e5ac56b67ce', 'S07R5H4', '64af6192-e8c2-49ab-8a8b-417cb4851d66', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:33.521+00', '2026-03-17 16:47:33.521+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('e22a1f21-9861-493a-9045-2f4364814c08', 'S07R5H5', '64af6192-e8c2-49ab-8a8b-417cb4851d66', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:33.714+00', '2026-03-17 16:47:33.714+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('f364d6d1-31ea-4643-99ff-c16e05552ed8', 'S09R1H1', '1368468e-7518-4cd8-8162-5d2fa3009a51', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:33.875+00', '2026-03-17 16:47:33.875+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('78156d74-20bb-483b-b0b6-7990f62f6450', 'S09R1H2', '1368468e-7518-4cd8-8162-5d2fa3009a51', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:34.062+00', '2026-03-17 16:47:34.062+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('8e2491fe-8d78-4137-b08c-bf9c81b856db', 'S09R1H3', '1368468e-7518-4cd8-8162-5d2fa3009a51', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:34.283+00', '2026-03-17 16:47:34.283+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('bae27103-1ffa-4727-86bb-4dc0b9822b6a', 'S09R1H4', '1368468e-7518-4cd8-8162-5d2fa3009a51', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:34.482+00', '2026-03-17 16:47:34.482+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('07b5074f-0a14-4db8-87e0-c408880e2943', 'S09R1H5', '1368468e-7518-4cd8-8162-5d2fa3009a51', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:34.674+00', '2026-03-17 16:47:34.674+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('31569250-6153-4366-ad30-73c6fffd2941', 'S09R2H1', '1368468e-7518-4cd8-8162-5d2fa3009a51', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:34.875+00', '2026-03-17 16:47:34.875+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('8ec8bdbd-e174-42db-8c99-8a8905c68bbe', 'S09R2H2', '1368468e-7518-4cd8-8162-5d2fa3009a51', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:35.074+00', '2026-03-17 16:47:35.074+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('c05e30bd-51ec-49c1-ac4c-f96fd0aa1d8e', 'S09R2H3', '1368468e-7518-4cd8-8162-5d2fa3009a51', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:35.274+00', '2026-03-17 16:47:35.274+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('4f19fcb2-d738-45db-b321-8f85813ae87e', 'S09R2H4', '1368468e-7518-4cd8-8162-5d2fa3009a51', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:35.475+00', '2026-03-17 16:47:35.475+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('40c59ac2-b54d-4aa6-8750-58d41516ea8d', 'S09R2H5', '1368468e-7518-4cd8-8162-5d2fa3009a51', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:35.714+00', '2026-03-17 16:47:35.714+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('e09f150b-63fc-488d-afe5-0c25c6b759ca', 'S09R3H1', '1368468e-7518-4cd8-8162-5d2fa3009a51', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:35.882+00', '2026-03-17 16:47:35.882+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('c78832f4-067b-4235-b973-74c5e0521941', 'S09R3H2', '1368468e-7518-4cd8-8162-5d2fa3009a51', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:36.074+00', '2026-03-17 16:47:36.074+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('b5338d80-167a-4e07-97b1-e5c001d2d25e', 'S09R3H3', '1368468e-7518-4cd8-8162-5d2fa3009a51', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:36.262+00', '2026-03-17 16:47:36.262+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('d2c4485d-9d8b-42ab-b8ba-fe09b45715ff', 'S09R3H4', '1368468e-7518-4cd8-8162-5d2fa3009a51', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:36.475+00', '2026-03-17 16:47:36.475+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('40d9122d-5bc0-436e-a8ed-ec606b623a32', 'S09R3H5', '1368468e-7518-4cd8-8162-5d2fa3009a51', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:36.674+00', '2026-03-17 16:47:36.674+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('a562797f-6d54-4191-9570-8a5ce02a364d', 'S09R4H1', '1368468e-7518-4cd8-8162-5d2fa3009a51', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:36.875+00', '2026-03-17 16:47:36.875+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('5614be48-2ca7-4c23-8e63-77c0cfa0393c', 'S09R4H2', '1368468e-7518-4cd8-8162-5d2fa3009a51', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:37.074+00', '2026-03-17 16:47:37.074+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('27667746-3f2c-4392-b35b-16c78eaee385', 'S09R4H3', '1368468e-7518-4cd8-8162-5d2fa3009a51', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:37.274+00', '2026-03-17 16:47:37.274+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('dae6dd44-05b8-4822-8b45-fd4a7b9c9078', 'S09R4H4', '1368468e-7518-4cd8-8162-5d2fa3009a51', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:37.495+00', '2026-03-17 16:47:37.495+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('ee5a8f31-21a0-4d5a-88cf-51441655aa38', 'S09R4H5', '1368468e-7518-4cd8-8162-5d2fa3009a51', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:37.695+00', '2026-03-17 16:47:37.695+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('304ef637-5f60-4a07-a7c0-99fed77f42a6', 'S09R5H1', '1368468e-7518-4cd8-8162-5d2fa3009a51', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:37.895+00', '2026-03-17 16:47:37.895+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('2bfe8c34-40f6-4c40-bd7c-24fbdde0f611', 'S09R5H2', '1368468e-7518-4cd8-8162-5d2fa3009a51', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:38.062+00', '2026-03-17 16:47:38.062+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('532ce3fa-39e6-47ec-85cd-cdadef524192', 'S09R5H3', '1368468e-7518-4cd8-8162-5d2fa3009a51', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:38.274+00', '2026-03-17 16:47:38.274+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('cda5de99-e54d-4da6-ba66-a1c8277a3fec', 'S09R5H4', '1368468e-7518-4cd8-8162-5d2fa3009a51', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:38.475+00', '2026-03-17 16:47:38.475+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('d6640387-eb20-4a7c-b325-05f1d45b2070', 'S09R5H5', '1368468e-7518-4cd8-8162-5d2fa3009a51', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:38.635+00', '2026-03-17 16:47:38.635+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('a5946a2d-a998-46ea-8a92-75b7cefd7668', 'S11R1H1', 'ebc216f7-261e-4acc-b2c0-1a6ee0656f14', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:38.871+00', '2026-03-17 16:47:38.871+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('0ad019f3-f1c1-4f2b-9035-b2371df771f0', 'S11R1H2', 'ebc216f7-261e-4acc-b2c0-1a6ee0656f14', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:39.036+00', '2026-03-17 16:47:39.036+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('b124c52c-553b-447d-9161-39dd287a5a48', 'S11R1H3', 'ebc216f7-261e-4acc-b2c0-1a6ee0656f14', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:39.215+00', '2026-03-17 16:47:39.215+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('15149776-3566-497b-b0e7-842c605018cb', 'S11R1H4', 'ebc216f7-261e-4acc-b2c0-1a6ee0656f14', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:39.774+00', '2026-03-17 16:47:39.774+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('41f4a864-5889-4050-9bf8-1ead0fdcabb9', 'S11R1H5', 'ebc216f7-261e-4acc-b2c0-1a6ee0656f14', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:39.974+00', '2026-03-17 16:47:39.974+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('6637c5fb-4d18-42da-b50e-325a415996ac', 'S11R2H1', 'ebc216f7-261e-4acc-b2c0-1a6ee0656f14', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:40.163+00', '2026-03-17 16:47:40.163+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('068b0a02-351f-485b-a31f-0a4f4b025461', 'S11R2H2', 'ebc216f7-261e-4acc-b2c0-1a6ee0656f14', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:40.375+00', '2026-03-17 16:47:40.375+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('2f2eefce-1863-45b4-8180-38bb6df0b4b6', 'S11R2H3', 'ebc216f7-261e-4acc-b2c0-1a6ee0656f14', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:40.596+00', '2026-03-17 16:47:40.596+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('82013d22-1b28-47c5-813d-1846383849b6', 'S11R2H4', 'ebc216f7-261e-4acc-b2c0-1a6ee0656f14', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:40.811+00', '2026-03-17 16:47:40.811+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('17207a54-cdb4-4f84-ae10-1b3df2c743ff', 'S11R2H5', 'ebc216f7-261e-4acc-b2c0-1a6ee0656f14', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:41.014+00', '2026-03-17 16:47:41.014+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('02ed5664-8df3-4b54-b781-7121ac15546e', 'S11R3H1', 'ebc216f7-261e-4acc-b2c0-1a6ee0656f14', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:41.234+00', '2026-03-17 16:47:41.234+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('1f197d16-6f10-4010-9eb4-64ea4969ba6c', 'S11R3H2', 'ebc216f7-261e-4acc-b2c0-1a6ee0656f14', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:41.412+00', '2026-03-17 16:47:41.412+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('cf59339f-927c-461d-8e1e-b6feea26d1d1', 'S11R3H3', 'ebc216f7-261e-4acc-b2c0-1a6ee0656f14', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:41.615+00', '2026-03-17 16:47:41.615+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('b16a34ab-532a-4df0-8cde-47b75964069f', 'S11R3H4', 'ebc216f7-261e-4acc-b2c0-1a6ee0656f14', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:41.882+00', '2026-03-17 16:47:41.882+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('be538c6e-2ac8-4e13-8688-bf268704dd88', 'S11R3H5', 'ebc216f7-261e-4acc-b2c0-1a6ee0656f14', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:42.074+00', '2026-03-17 16:47:42.074+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('02c2a207-9822-410a-83c2-1069798c8a80', 'S11R4H1', 'ebc216f7-261e-4acc-b2c0-1a6ee0656f14', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:42.275+00', '2026-03-17 16:47:42.275+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('39e27d19-a3d6-4ab4-acfb-df1831760977', 'S11R4H2', 'ebc216f7-261e-4acc-b2c0-1a6ee0656f14', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:42.455+00', '2026-03-17 16:47:42.455+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('76933c82-b800-4082-9922-c63b8a3bd95e', 'S11R4H3', 'ebc216f7-261e-4acc-b2c0-1a6ee0656f14', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:42.630+00', '2026-03-17 16:47:42.630+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('dbe6643e-0e5b-4422-8029-637253b7927e', 'S11R4H4', 'ebc216f7-261e-4acc-b2c0-1a6ee0656f14', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:42.795+00', '2026-03-17 16:47:42.795+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('399afeda-3880-4205-9679-c3ff0567f716', 'S11R4H5', 'ebc216f7-261e-4acc-b2c0-1a6ee0656f14', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:42.975+00', '2026-03-17 16:47:42.975+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('51f088d1-dc7a-49e0-a635-fae70cc06a17', 'S11R5H1', 'ebc216f7-261e-4acc-b2c0-1a6ee0656f14', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:43.175+00', '2026-03-17 16:47:43.175+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('1a530902-0d5a-4ef1-a3f0-a3f51176a090', 'S11R5H2', 'ebc216f7-261e-4acc-b2c0-1a6ee0656f14', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:43.435+00', '2026-03-17 16:47:43.435+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('97848dd7-b2ad-43cd-b42d-1f86f9991543', 'S11R5H3', 'ebc216f7-261e-4acc-b2c0-1a6ee0656f14', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:43.602+00', '2026-03-17 16:47:43.602+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('9fde8b64-fb20-4c70-b40b-ead71ad99525', 'S11R5H4', 'ebc216f7-261e-4acc-b2c0-1a6ee0656f14', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:43.754+00', '2026-03-17 16:47:43.754+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('4375e787-57a6-46bf-85ab-6563633da238', 'S11R5H5', 'ebc216f7-261e-4acc-b2c0-1a6ee0656f14', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:43.954+00', '2026-03-17 16:47:43.954+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('e61dbfe0-5b1a-492e-945f-4a71bd285c29', 'S13R1H1', '16e8bafc-d3dd-4ebb-a0eb-5b716c5cd63e', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:44.154+00', '2026-03-17 16:47:44.154+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('6f761be8-9b33-448e-b97a-e602521e7379', 'S13R1H2', '16e8bafc-d3dd-4ebb-a0eb-5b716c5cd63e', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:44.355+00', '2026-03-17 16:47:44.355+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('3538ec25-875f-47bd-8f84-88cd6e10b31b', 'S13R1H3', '16e8bafc-d3dd-4ebb-a0eb-5b716c5cd63e', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:44.575+00', '2026-03-17 16:47:44.575+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('b53ba496-a4c6-4bb1-9a45-029a8e07548c', 'S13R1H4', '16e8bafc-d3dd-4ebb-a0eb-5b716c5cd63e', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:44.774+00', '2026-03-17 16:47:44.774+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('dd1a3540-d5aa-4afa-a80f-9f4df8dc117d', 'S13R1H5', '16e8bafc-d3dd-4ebb-a0eb-5b716c5cd63e', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:44.974+00', '2026-03-17 16:47:44.974+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('16f63776-3273-48bb-a295-947b19f52b0b', 'S13R2H1', '16e8bafc-d3dd-4ebb-a0eb-5b716c5cd63e', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:45.201+00', '2026-03-17 16:47:45.201+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('975d6bff-11ea-4c89-b8ed-b9ca0182356f', 'S13R2H2', '16e8bafc-d3dd-4ebb-a0eb-5b716c5cd63e', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:45.415+00', '2026-03-17 16:47:45.415+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('4395d35c-8873-45ab-abf9-73626e3251d0', 'S13R2H3', '16e8bafc-d3dd-4ebb-a0eb-5b716c5cd63e', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:45.614+00', '2026-03-17 16:47:45.614+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('0ee0a5b7-0dac-41dc-9e74-c5f2a4a83b72', 'S13R2H4', '16e8bafc-d3dd-4ebb-a0eb-5b716c5cd63e', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:45.850+00', '2026-03-17 16:47:45.850+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('0f14c71f-5172-4fc0-8fda-ee220db378d6', 'S13R2H5', '16e8bafc-d3dd-4ebb-a0eb-5b716c5cd63e', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:46.015+00', '2026-03-17 16:47:46.015+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('7e479034-4e5c-469f-8abc-49f74c14116c', 'S13R3H1', '16e8bafc-d3dd-4ebb-a0eb-5b716c5cd63e', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:46.174+00', '2026-03-17 16:47:46.174+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('46a45cb9-00a5-4fc1-8c60-104ae1ef27eb', 'S13R3H2', '16e8bafc-d3dd-4ebb-a0eb-5b716c5cd63e', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:46.335+00', '2026-03-17 16:47:46.335+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('74ae3a45-795c-41bc-bed9-0e8fa2fe700b', 'S13R3H3', '16e8bafc-d3dd-4ebb-a0eb-5b716c5cd63e', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:46.563+00', '2026-03-17 16:47:46.563+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('61021398-4359-484a-a5bc-06232dcbf1aa', 'S13R3H4', '16e8bafc-d3dd-4ebb-a0eb-5b716c5cd63e', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:46.775+00', '2026-03-17 16:47:46.775+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('9075ddcb-19e8-4c3a-8d0d-ab7e1fddde8a', 'S13R3H5', '16e8bafc-d3dd-4ebb-a0eb-5b716c5cd63e', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:47.002+00', '2026-03-17 16:47:47.002+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('376133a6-65fb-48f9-9932-7ca19e2ebe7c', 'S13R4H1', '16e8bafc-d3dd-4ebb-a0eb-5b716c5cd63e', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:47.215+00', '2026-03-17 16:47:47.215+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('343cb3cb-f9a7-4405-8e50-477882c21520', 'S13R4H2', '16e8bafc-d3dd-4ebb-a0eb-5b716c5cd63e', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:47.402+00', '2026-03-17 16:47:47.402+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('e2a45694-c22d-45c4-b2d5-09a2f45af4c5', 'S13R4H3', '16e8bafc-d3dd-4ebb-a0eb-5b716c5cd63e', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:47.616+00', '2026-03-17 16:47:47.616+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('fb3e43be-0417-4cd9-bacf-951c1627c4e2', 'S13R4H4', '16e8bafc-d3dd-4ebb-a0eb-5b716c5cd63e', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:47.803+00', '2026-03-17 16:47:47.803+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('62e288b5-2f7c-4f38-9b6b-4c79a5996cbc', 'S13R4H5', '16e8bafc-d3dd-4ebb-a0eb-5b716c5cd63e', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:48.014+00', '2026-03-17 16:47:48.014+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('bf7e54ee-5469-41e6-9f82-272a8c2dd6fb', 'S13R5H1', '16e8bafc-d3dd-4ebb-a0eb-5b716c5cd63e', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:48.194+00', '2026-03-17 16:47:48.194+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('e157a6c3-b232-4cf4-8a09-cc56957f05dc', 'S13R5H2', '16e8bafc-d3dd-4ebb-a0eb-5b716c5cd63e', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:48.414+00', '2026-03-17 16:47:48.414+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('6fafb0d2-2c99-4b33-abe1-70da673ea2e5', 'S13R5H3', '16e8bafc-d3dd-4ebb-a0eb-5b716c5cd63e', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:48.595+00', '2026-03-17 16:47:48.595+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('746ff262-c4f7-4358-93de-4e963245c02e', 'S13R5H4', '16e8bafc-d3dd-4ebb-a0eb-5b716c5cd63e', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:48.775+00', '2026-03-17 16:47:48.775+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('3353fc0b-c0dd-4b46-8555-d019e62e7d54', 'S13R5H5', '16e8bafc-d3dd-4ebb-a0eb-5b716c5cd63e', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:48.995+00', '2026-03-17 16:47:48.995+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('3091c041-1ec4-415f-bb83-ff5d20fa18f6', 'S15R1H1', 'afaec2cf-7562-4f8c-98b4-5cc8b871853c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:49.194+00', '2026-03-17 16:47:49.194+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('d781050d-928e-45f3-a6a6-782f9059e3f7', 'S15R1H2', 'afaec2cf-7562-4f8c-98b4-5cc8b871853c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:49.394+00', '2026-03-17 16:47:49.394+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('fb114b22-458d-4d58-b778-f99cbb4ff08b', 'S15R1H3', 'afaec2cf-7562-4f8c-98b4-5cc8b871853c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:49.594+00', '2026-03-17 16:47:49.594+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('9931240a-6b81-4e7d-b7fe-30052749f222', 'S15R1H4', 'afaec2cf-7562-4f8c-98b4-5cc8b871853c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:49.814+00', '2026-03-17 16:47:49.814+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('de7bd206-1d13-4e05-b811-73494f2d1ed2', 'S15R1H5', 'afaec2cf-7562-4f8c-98b4-5cc8b871853c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:50.014+00', '2026-03-17 16:47:50.014+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('11012ab5-89eb-40f2-b503-5f920122570a', 'S15R2H1', 'afaec2cf-7562-4f8c-98b4-5cc8b871853c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:50.194+00', '2026-03-17 16:47:50.194+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('00ae8846-26f0-4206-9a86-821e91a5ba51', 'S15R2H2', 'afaec2cf-7562-4f8c-98b4-5cc8b871853c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:50.414+00', '2026-03-17 16:47:50.414+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('f2b6fab8-6ccd-4aec-a110-6879982c17e9', 'S15R2H3', 'afaec2cf-7562-4f8c-98b4-5cc8b871853c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:50.614+00', '2026-03-17 16:47:50.614+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('d9503bea-badc-42a6-bdc1-c5bfbb2f10c4', 'S15R2H4', 'afaec2cf-7562-4f8c-98b4-5cc8b871853c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:50.815+00', '2026-03-17 16:47:50.815+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('f0b1231a-8c63-45cc-9a87-6714f4d9fcdb', 'S15R2H5', 'afaec2cf-7562-4f8c-98b4-5cc8b871853c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:51.035+00', '2026-03-17 16:47:51.035+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('00c046a0-524a-428b-871d-845e1fb13757', 'S15R3H1', 'afaec2cf-7562-4f8c-98b4-5cc8b871853c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:51.195+00', '2026-03-17 16:47:51.195+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('6540217a-0125-4cd7-8182-c35afe5afa75', 'S15R3H2', 'afaec2cf-7562-4f8c-98b4-5cc8b871853c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:51.375+00', '2026-03-17 16:47:51.375+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('a10db79d-cabd-4bc6-8b64-2ea0a3e5670b', 'S15R3H3', 'afaec2cf-7562-4f8c-98b4-5cc8b871853c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:51.596+00', '2026-03-17 16:47:51.596+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('d6d4c95c-f7f2-4c66-b529-876111124363', 'S15R3H4', 'afaec2cf-7562-4f8c-98b4-5cc8b871853c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:51.795+00', '2026-03-17 16:47:51.795+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('081290ec-3fd2-4b71-bb6c-daa05fbe4cfa', 'S15R3H5', 'afaec2cf-7562-4f8c-98b4-5cc8b871853c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:51.983+00', '2026-03-17 16:47:51.983+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('31f6ea45-0c3d-4080-a253-07ac15e5376c', 'S15R4H1', 'afaec2cf-7562-4f8c-98b4-5cc8b871853c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:52.175+00', '2026-03-17 16:47:52.175+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('af6c2093-555a-427c-b292-11ea46443ef7', 'S15R4H2', 'afaec2cf-7562-4f8c-98b4-5cc8b871853c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:52.343+00', '2026-03-17 16:47:52.343+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('78fa30dc-4b67-4d7b-b274-3d2f860a4ea2', 'S15R4H3', 'afaec2cf-7562-4f8c-98b4-5cc8b871853c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:52.555+00', '2026-03-17 16:47:52.555+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('278f3053-d345-4e9b-be7b-8aa7939a311a', 'S15R4H4', 'afaec2cf-7562-4f8c-98b4-5cc8b871853c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:52.795+00', '2026-03-17 16:47:52.795+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('a45b9640-21a5-42db-8a2e-aab1d1edf276', 'S15R4H5', 'afaec2cf-7562-4f8c-98b4-5cc8b871853c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:53.035+00', '2026-03-17 16:47:53.035+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('6cbe8940-030b-4db4-86e5-38bd338b284b', 'S15R5H1', 'afaec2cf-7562-4f8c-98b4-5cc8b871853c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:53.235+00', '2026-03-17 16:47:53.235+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('ffd28db9-0b8a-407d-bb62-800724fa2862', 'S15R5H2', 'afaec2cf-7562-4f8c-98b4-5cc8b871853c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:53.435+00', '2026-03-17 16:47:53.435+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('d7c4ea2d-14fb-4c08-a26d-edca0caabfca', 'S15R5H3', 'afaec2cf-7562-4f8c-98b4-5cc8b871853c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:53.642+00', '2026-03-17 16:47:53.642+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('3a9b6967-cefe-4705-aafe-12af472a29c9', 'S15R5H4', 'afaec2cf-7562-4f8c-98b4-5cc8b871853c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:53.834+00', '2026-03-17 16:47:53.834+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('f9eb8817-6781-4258-8c50-1b384c76d84a', 'S15R5H5', 'afaec2cf-7562-4f8c-98b4-5cc8b871853c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:54.014+00', '2026-03-17 16:47:54.014+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('71749319-a15d-4553-94fa-d6957a1cd179', 'S17R1H1', 'ceff0a0a-1182-42c8-89df-93528ad8fbbb', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:54.182+00', '2026-03-17 16:47:54.182+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('17340a56-7ef7-49bf-9c8a-7dbdbde5f535', 'S17R1H2', 'ceff0a0a-1182-42c8-89df-93528ad8fbbb', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:54.394+00', '2026-03-17 16:47:54.394+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('af3c46f7-c052-4458-bf79-8f62e5970640', 'S17R1H3', 'ceff0a0a-1182-42c8-89df-93528ad8fbbb', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:54.594+00', '2026-03-17 16:47:54.594+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('3e2a2ac7-129c-409f-b3ec-d56267a39d3b', 'S17R1H4', 'ceff0a0a-1182-42c8-89df-93528ad8fbbb', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:54.794+00', '2026-03-17 16:47:54.794+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('d3f60b00-6ebd-489c-9398-2fde467576d9', 'S17R1H5', 'ceff0a0a-1182-42c8-89df-93528ad8fbbb', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:54.995+00', '2026-03-17 16:47:54.995+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('7631619e-7929-4a30-84c0-61263607b37a', 'S17R2H1', 'ceff0a0a-1182-42c8-89df-93528ad8fbbb', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:55.194+00', '2026-03-17 16:47:55.194+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('9b586aee-4679-489c-a058-4d5d0355f6ae', 'S17R2H2', 'ceff0a0a-1182-42c8-89df-93528ad8fbbb', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:55.414+00', '2026-03-17 16:47:55.414+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('0265ed0f-f0f9-499a-bc7e-c0c133997110', 'S17R2H3', 'ceff0a0a-1182-42c8-89df-93528ad8fbbb', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:55.632+00', '2026-03-17 16:47:55.632+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('b2de00f4-ad73-423b-a99e-bfb3a055a3ee', 'S17R2H4', 'ceff0a0a-1182-42c8-89df-93528ad8fbbb', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:55.835+00', '2026-03-17 16:47:55.835+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('dbaa3590-b13d-4b8b-bcbb-a96a02e3b692', 'S17R2H5', 'ceff0a0a-1182-42c8-89df-93528ad8fbbb', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:56.023+00', '2026-03-17 16:47:56.023+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('50bd2f38-0146-47b8-b7a2-266c491a0cd9', 'S17R3H1', 'ceff0a0a-1182-42c8-89df-93528ad8fbbb', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:56.250+00', '2026-03-17 16:47:56.250+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('0fa99d9d-f493-4d21-9b4a-31bfd50fa345', 'S17R3H2', 'ceff0a0a-1182-42c8-89df-93528ad8fbbb', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:56.455+00', '2026-03-17 16:47:56.455+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('3c9dc60f-1bff-4d8a-a892-a8d1781551c2', 'S17R3H3', 'ceff0a0a-1182-42c8-89df-93528ad8fbbb', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:56.683+00', '2026-03-17 16:47:56.683+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('f54c0cc2-c829-4744-b99a-b2b546565fbd', 'S17R3H4', 'ceff0a0a-1182-42c8-89df-93528ad8fbbb', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:56.855+00', '2026-03-17 16:47:56.855+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('04af6410-cd95-45c8-b4e3-ff4def97b973', 'S17R3H5', 'ceff0a0a-1182-42c8-89df-93528ad8fbbb', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:57.042+00', '2026-03-17 16:47:57.042+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('e55c027e-b7ce-46d8-b2e3-2ef37d2aced3', 'S17R4H1', 'ceff0a0a-1182-42c8-89df-93528ad8fbbb', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:57.215+00', '2026-03-17 16:47:57.215+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('c85a6654-ae4b-47d8-8f81-d6c16ab3c3a9', 'S17R4H2', 'ceff0a0a-1182-42c8-89df-93528ad8fbbb', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:57.432+00', '2026-03-17 16:47:57.432+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('c2f9f5e1-9af9-481b-ba54-41fd23005887', 'S17R4H3', 'ceff0a0a-1182-42c8-89df-93528ad8fbbb', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:57.642+00', '2026-03-17 16:47:57.642+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('ef04751e-9d35-483b-bce3-998d95c8d135', 'S17R4H4', 'ceff0a0a-1182-42c8-89df-93528ad8fbbb', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:57.815+00', '2026-03-17 16:47:57.815+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('b6d1a278-10dd-4378-8e74-be147db27d88', 'S17R4H5', 'ceff0a0a-1182-42c8-89df-93528ad8fbbb', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:57.975+00', '2026-03-17 16:47:57.975+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('9f27268b-d241-4ab0-8c49-1ccb9a45921f', 'S17R5H1', 'ceff0a0a-1182-42c8-89df-93528ad8fbbb', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:58.195+00', '2026-03-17 16:47:58.195+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('fbe60dfd-2d08-439a-a61a-843248301a0b', 'S17R5H2', 'ceff0a0a-1182-42c8-89df-93528ad8fbbb', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:58.423+00', '2026-03-17 16:47:58.423+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('6491a4de-b3f1-44b4-8912-a0b5ed69bfc7', 'S17R5H3', 'ceff0a0a-1182-42c8-89df-93528ad8fbbb', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:58.594+00', '2026-03-17 16:47:58.594+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('c81e5cf6-8775-4fe8-b104-015f8fa4ad40', 'S17R5H4', 'ceff0a0a-1182-42c8-89df-93528ad8fbbb', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:58.794+00', '2026-03-17 16:47:58.794+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('0134fd30-6b0d-4b54-a956-a58feed8ba43', 'S17R5H5', 'ceff0a0a-1182-42c8-89df-93528ad8fbbb', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:58.963+00', '2026-03-17 16:47:58.963+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('5b24b742-7b79-4b54-bcc8-a94b9cc4d3e7', 'S19R1H1', 'fd4cf70f-17d3-4d89-aaca-98c943349181', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:59.174+00', '2026-03-17 16:47:59.174+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('8d67f010-9634-4066-807f-e23ca4b98be5', 'S19R1H2', 'fd4cf70f-17d3-4d89-aaca-98c943349181', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:59.422+00', '2026-03-17 16:47:59.422+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('9b74ef23-8a72-4598-a017-ade448715696', 'S19R1H3', 'fd4cf70f-17d3-4d89-aaca-98c943349181', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:59.654+00', '2026-03-17 16:47:59.654+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('f5ef217b-8168-47d4-a8b9-88572d431f78', 'S19R1H4', 'fd4cf70f-17d3-4d89-aaca-98c943349181', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:47:59.834+00', '2026-03-17 16:47:59.834+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('f261802b-dceb-43f7-a5df-fb512f642d8c', 'S19R1H5', 'fd4cf70f-17d3-4d89-aaca-98c943349181', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:00.035+00', '2026-03-17 16:48:00.035+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('220ba7fe-7fc8-4614-9c0a-6cbbd9d46794', 'S19R2H1', 'fd4cf70f-17d3-4d89-aaca-98c943349181', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:00.275+00', '2026-03-17 16:48:00.275+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('c567ffd4-7a5d-4c91-aeb5-8bfda82b7040', 'S19R2H2', 'fd4cf70f-17d3-4d89-aaca-98c943349181', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:00.446+00', '2026-03-17 16:48:00.446+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('53a7b5ec-c4c7-4782-9cb9-c4d2372d5d1b', 'S19R2H3', 'fd4cf70f-17d3-4d89-aaca-98c943349181', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:00.655+00', '2026-03-17 16:48:00.655+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('a01d532d-ff5d-41d2-a27d-b224bc9755af', 'S19R2H4', 'fd4cf70f-17d3-4d89-aaca-98c943349181', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:00.854+00', '2026-03-17 16:48:00.854+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('63208c43-3b24-46c5-abd8-24bfbb6d54c1', 'S19R2H5', 'fd4cf70f-17d3-4d89-aaca-98c943349181', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:01.054+00', '2026-03-17 16:48:01.054+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('18bdc083-b6ba-48a9-a52c-f641ec2cdc59', 'S19R3H1', 'fd4cf70f-17d3-4d89-aaca-98c943349181', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:01.263+00', '2026-03-17 16:48:01.263+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('65fbb066-2740-4466-bf9a-b7f71cff3447', 'S19R3H2', 'fd4cf70f-17d3-4d89-aaca-98c943349181', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:01.414+00', '2026-03-17 16:48:01.414+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('842bed46-3c1c-430e-b585-277263e21ca1', 'S19R3H3', 'fd4cf70f-17d3-4d89-aaca-98c943349181', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:01.594+00', '2026-03-17 16:48:01.594+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('64ed0966-9028-4b3a-b67e-0826b8ec5a5b', 'S19R3H4', 'fd4cf70f-17d3-4d89-aaca-98c943349181', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:01.795+00', '2026-03-17 16:48:01.795+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('ff1bd530-07df-4b7a-975d-8f419ac9f3af', 'S19R3H5', 'fd4cf70f-17d3-4d89-aaca-98c943349181', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:02.015+00', '2026-03-17 16:48:02.015+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('847e830b-cb05-45f0-a5eb-6c14ee5cec7a', 'S19R4H1', 'fd4cf70f-17d3-4d89-aaca-98c943349181', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:02.221+00', '2026-03-17 16:48:02.221+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('aea6522f-a56f-438c-b6c7-8664311f536b', 'S19R4H2', 'fd4cf70f-17d3-4d89-aaca-98c943349181', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:02.442+00', '2026-03-17 16:48:02.442+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('82d27c94-21e5-4743-aff1-56d5a573c9a5', 'S19R4H3', 'fd4cf70f-17d3-4d89-aaca-98c943349181', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:02.595+00', '2026-03-17 16:48:02.595+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('4833a3dd-d224-4ba0-a184-34da4d5d124a', 'S19R4H4', 'fd4cf70f-17d3-4d89-aaca-98c943349181', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:02.771+00', '2026-03-17 16:48:02.771+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('1850b2d3-fce2-418a-b02b-a2bc96345070', 'S19R4H5', 'fd4cf70f-17d3-4d89-aaca-98c943349181', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:02.941+00', '2026-03-17 16:48:02.941+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('a6a17aea-0d2c-4ece-a53e-24ea2843324e', 'S19R5H1', 'fd4cf70f-17d3-4d89-aaca-98c943349181', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:03.094+00', '2026-03-17 16:48:03.094+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('f28cd83d-517d-48f9-95d8-5744df957683', 'S19R5H2', 'fd4cf70f-17d3-4d89-aaca-98c943349181', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:03.255+00', '2026-03-17 16:48:03.255+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('621c445a-1d4c-41d4-a540-54c64c082adc', 'S19R5H3', 'fd4cf70f-17d3-4d89-aaca-98c943349181', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:03.435+00', '2026-03-17 16:48:03.435+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('ba2ed80e-22b5-4bee-aa05-d46ca20ef6b0', 'S19R5H4', 'fd4cf70f-17d3-4d89-aaca-98c943349181', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:03.610+00', '2026-03-17 16:48:03.610+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('52312308-9f6b-4f01-87da-cf15b2021579', 'S19R5H5', 'fd4cf70f-17d3-4d89-aaca-98c943349181', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:03.775+00', '2026-03-17 16:48:03.775+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('0da6a98c-5b0f-46ae-ac29-d11f7c365a97', 'S21R1H1', 'f886faef-18a8-4cd4-afb3-ed78378801cc', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:03.935+00', '2026-03-17 16:48:03.935+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('894df609-4fde-49d5-9c61-3e03899e9a66', 'S21R1H2', 'f886faef-18a8-4cd4-afb3-ed78378801cc', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:04.095+00', '2026-03-17 16:48:04.095+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('1f562736-f7c1-403f-b85d-af3149269146', 'S21R1H3', 'f886faef-18a8-4cd4-afb3-ed78378801cc', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:04.255+00', '2026-03-17 16:48:04.255+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('53fb892a-54c9-4fc2-aea1-6da20d79a4df', 'S21R1H4', 'f886faef-18a8-4cd4-afb3-ed78378801cc', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:04.414+00', '2026-03-17 16:48:04.414+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('67fa6ddd-0400-40eb-81a7-636321400074', 'S21R1H5', 'f886faef-18a8-4cd4-afb3-ed78378801cc', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:04.606+00', '2026-03-17 16:48:04.606+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('e503bb94-36b9-428d-8a6b-328b9943ad96', 'S21R2H1', 'f886faef-18a8-4cd4-afb3-ed78378801cc', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:04.783+00', '2026-03-17 16:48:04.783+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('00010fdf-df17-4e0c-9d43-4ac15035b9cc', 'S21R2H2', 'f886faef-18a8-4cd4-afb3-ed78378801cc', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:04.954+00', '2026-03-17 16:48:04.954+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('04dd89e1-4c7c-450a-8923-ed40f235696d', 'S21R2H3', 'f886faef-18a8-4cd4-afb3-ed78378801cc', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:05.115+00', '2026-03-17 16:48:05.115+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('97838079-fab9-4b87-82b7-749012e9c95a', 'S21R2H4', 'f886faef-18a8-4cd4-afb3-ed78378801cc', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:05.275+00', '2026-03-17 16:48:05.275+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('ee1fc5a4-8b24-44fa-82c4-16af018b0b56', 'S21R2H5', 'f886faef-18a8-4cd4-afb3-ed78378801cc', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:05.434+00', '2026-03-17 16:48:05.434+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('11058282-9b0c-4099-8ad8-80bfccfa61c5', 'S21R3H1', 'f886faef-18a8-4cd4-afb3-ed78378801cc', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:05.603+00', '2026-03-17 16:48:05.603+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('8c6a5206-7487-44ae-9251-5296052960be', 'S21R3H2', 'f886faef-18a8-4cd4-afb3-ed78378801cc', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:05.782+00', '2026-03-17 16:48:05.782+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('072248e0-df06-4846-9996-94ba672287b3', 'S21R3H3', 'f886faef-18a8-4cd4-afb3-ed78378801cc', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:05.978+00', '2026-03-17 16:48:05.978+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('eb76d2d2-2b7e-48e1-b570-182e7b12af2d', 'S21R3H4', 'f886faef-18a8-4cd4-afb3-ed78378801cc', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:06.134+00', '2026-03-17 16:48:06.134+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('74f86d4a-b1c3-4146-81c6-ca802c2b3687', 'S21R3H5', 'f886faef-18a8-4cd4-afb3-ed78378801cc', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:06.294+00', '2026-03-17 16:48:06.294+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('cd823d53-fa14-495a-8463-ddb0c3585513', 'S21R4H1', 'f886faef-18a8-4cd4-afb3-ed78378801cc', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:06.463+00', '2026-03-17 16:48:06.463+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('f9f80358-0846-400d-9854-1e2949cf21d9', 'S21R4H2', 'f886faef-18a8-4cd4-afb3-ed78378801cc', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:06.622+00', '2026-03-17 16:48:06.622+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('f11a0610-1ffd-4e08-9121-f12555880721', 'S21R4H3', 'f886faef-18a8-4cd4-afb3-ed78378801cc', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:06.775+00', '2026-03-17 16:48:06.775+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('64c63103-34ea-4fb5-8569-fdee034a1187', 'S21R4H4', 'f886faef-18a8-4cd4-afb3-ed78378801cc', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:06.935+00', '2026-03-17 16:48:06.935+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('bbd84dbe-c80c-41d5-a71a-f6d147b7ae1d', 'S21R4H5', 'f886faef-18a8-4cd4-afb3-ed78378801cc', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:07.095+00', '2026-03-17 16:48:07.095+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('9d9d1fbe-477e-4cbe-98bc-a3f991bb4eb6', 'S21R5H1', 'f886faef-18a8-4cd4-afb3-ed78378801cc', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:07.255+00', '2026-03-17 16:48:07.255+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('b2c8335f-a784-4f6d-8ce5-786ce7e007f7', 'S21R5H2', 'f886faef-18a8-4cd4-afb3-ed78378801cc', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:07.423+00', '2026-03-17 16:48:07.423+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('6dcce1f8-aa4f-4d98-b490-277ec34026a7', 'S21R5H3', 'f886faef-18a8-4cd4-afb3-ed78378801cc', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:07.574+00', '2026-03-17 16:48:07.574+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('b6ce6cae-a170-4e8a-a1e0-1050c3f2cae5', 'S21R5H4', 'f886faef-18a8-4cd4-afb3-ed78378801cc', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:07.735+00', '2026-03-17 16:48:07.735+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('d4a1afa2-0473-4696-8c5d-c20e6cb1bd2a', 'S21R5H5', 'f886faef-18a8-4cd4-afb3-ed78378801cc', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:07.905+00', '2026-03-17 16:48:07.905+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('8155a4e7-dcd8-499f-8f10-349b08ea4de2', 'S23R1H1', '29cdab8e-451b-4328-b4b4-586ea7919ea4', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:08.063+00', '2026-03-17 16:48:08.063+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('f0375505-88e2-40e7-bc1f-aec34bed1ee1', 'S23R1H2', '29cdab8e-451b-4328-b4b4-586ea7919ea4', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:08.223+00', '2026-03-17 16:48:08.223+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('f4dcccbf-1a66-4be0-b0a0-9db232c77931', 'S23R1H3', '29cdab8e-451b-4328-b4b4-586ea7919ea4', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:08.375+00', '2026-03-17 16:48:08.375+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('48d657ff-96b2-459e-b317-067c82ed06f2', 'S23R1H4', '29cdab8e-451b-4328-b4b4-586ea7919ea4', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:08.543+00', '2026-03-17 16:48:08.543+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('5f61ab03-61c3-44b0-8362-556f7fe82ac9', 'S23R1H5', '29cdab8e-451b-4328-b4b4-586ea7919ea4', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:08.714+00', '2026-03-17 16:48:08.714+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('d188aff5-3afe-42b1-a36c-92454d0dd1c1', 'S23R2H1', '29cdab8e-451b-4328-b4b4-586ea7919ea4', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:08.874+00', '2026-03-17 16:48:08.874+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('47f0940d-4c72-49af-804e-b137eeed653e', 'S23R2H2', '29cdab8e-451b-4328-b4b4-586ea7919ea4', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:09.049+00', '2026-03-17 16:48:09.049+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('cee3948a-e08e-436c-9b7f-2bdd11638389', 'S23R2H3', '29cdab8e-451b-4328-b4b4-586ea7919ea4', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:09.194+00', '2026-03-17 16:48:09.194+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('08b9f526-f186-4952-8132-8924669a0f0e', 'S23R2H4', '29cdab8e-451b-4328-b4b4-586ea7919ea4', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:09.355+00', '2026-03-17 16:48:09.355+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('9a3f3a38-acae-4a33-97f9-2e06f4f67774', 'S23R2H5', '29cdab8e-451b-4328-b4b4-586ea7919ea4', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:09.522+00', '2026-03-17 16:48:09.522+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('e50cbf86-6afd-4785-8242-631f8f695db9', 'S23R3H1', '29cdab8e-451b-4328-b4b4-586ea7919ea4', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:09.674+00', '2026-03-17 16:48:09.674+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('feb6c44c-e5a2-4f1e-bef1-818ac29e062f', 'S23R3H2', '29cdab8e-451b-4328-b4b4-586ea7919ea4', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:09.859+00', '2026-03-17 16:48:09.859+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('85f80581-fd9d-4d2a-8c71-91f11bd33d73', 'S23R3H3', '29cdab8e-451b-4328-b4b4-586ea7919ea4', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:10.022+00', '2026-03-17 16:48:10.022+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('cd640f87-5d27-41ef-8d65-091bd5232990', 'S23R3H4', '29cdab8e-451b-4328-b4b4-586ea7919ea4', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:10.182+00', '2026-03-17 16:48:10.182+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('7f7c623a-880e-464b-ac59-327e44ebb459', 'S23R3H5', '29cdab8e-451b-4328-b4b4-586ea7919ea4', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:10.335+00', '2026-03-17 16:48:10.335+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('c4e0f4d0-9209-41b5-bb82-bd49d4d50fc7', 'S23R4H1', '29cdab8e-451b-4328-b4b4-586ea7919ea4', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:10.503+00', '2026-03-17 16:48:10.503+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('32556405-513b-4e19-8c37-a3ccda1ddb5e', 'S23R4H2', '29cdab8e-451b-4328-b4b4-586ea7919ea4', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:10.654+00', '2026-03-17 16:48:10.654+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('7acaf005-0cfa-41a4-bded-6874d6d09ed8', 'S23R4H3', '29cdab8e-451b-4328-b4b4-586ea7919ea4', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:10.823+00', '2026-03-17 16:48:10.823+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('c03e19f3-524a-45c3-a113-bfaf12c4951e', 'S23R4H4', '29cdab8e-451b-4328-b4b4-586ea7919ea4', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:10.974+00', '2026-03-17 16:48:10.974+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('8d5f5f73-c65e-4cff-a723-adc88582b6e2', 'S23R4H5', '29cdab8e-451b-4328-b4b4-586ea7919ea4', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:11.142+00', '2026-03-17 16:48:11.142+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('9e199d71-af3d-4e0d-abee-7308703a8d4f', 'S23R5H1', '29cdab8e-451b-4328-b4b4-586ea7919ea4', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:11.302+00', '2026-03-17 16:48:11.302+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('1289d1d9-dc6d-4b6d-9df3-b305e67fc390', 'S23R5H2', '29cdab8e-451b-4328-b4b4-586ea7919ea4', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:11.455+00', '2026-03-17 16:48:11.455+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('2d2607e4-af65-443c-b557-72c958e4f343', 'S23R5H3', '29cdab8e-451b-4328-b4b4-586ea7919ea4', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:11.615+00', '2026-03-17 16:48:11.615+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('2e8b0621-7bb3-4651-8ef0-78c71370a5be', 'S23R5H4', '29cdab8e-451b-4328-b4b4-586ea7919ea4', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:11.783+00', '2026-03-17 16:48:11.783+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('c030a2e5-43b2-4026-9364-ec101e55ab2b', 'S23R5H5', '29cdab8e-451b-4328-b4b4-586ea7919ea4', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:12.034+00', '2026-03-17 16:48:12.034+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('05586888-eb29-43e9-889d-69da9021a6f9', 'S25R1H1', '30c09d67-32f9-4744-8900-b7c9e1ff8aaa', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:12.274+00', '2026-03-17 16:48:12.274+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('82e6ac74-06bd-4025-b6a3-fd02e4b119d2', 'S25R1H2', '30c09d67-32f9-4744-8900-b7c9e1ff8aaa', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:12.483+00', '2026-03-17 16:48:12.483+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('d143766f-42e2-43f1-9b14-15afede04662', 'S25R1H3', '30c09d67-32f9-4744-8900-b7c9e1ff8aaa', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:12.634+00', '2026-03-17 16:48:12.634+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('b5aa77a8-9f7e-4bff-9282-b7c80aed7563', 'S25R1H4', '30c09d67-32f9-4744-8900-b7c9e1ff8aaa', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:12.842+00', '2026-03-17 16:48:12.842+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('a429c31b-41a3-4b95-bef9-db5ad3e36b41', 'S25R1H5', '30c09d67-32f9-4744-8900-b7c9e1ff8aaa', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:13.055+00', '2026-03-17 16:48:13.055+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('d69053e9-4ba2-4774-b77a-1869be874dbd', 'S25R2H1', '30c09d67-32f9-4744-8900-b7c9e1ff8aaa', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:13.222+00', '2026-03-17 16:48:13.222+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('24fe65d1-acf4-4569-af8d-90c6e8831900', 'S25R2H2', '30c09d67-32f9-4744-8900-b7c9e1ff8aaa', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:13.414+00', '2026-03-17 16:48:13.414+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('cda0b04a-da0a-490d-98f1-62ef134d2c0e', 'S25R2H3', '30c09d67-32f9-4744-8900-b7c9e1ff8aaa', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:13.634+00', '2026-03-17 16:48:13.634+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('109f0bb2-eefd-47a6-a82f-29782e89bf96', 'S25R2H4', '30c09d67-32f9-4744-8900-b7c9e1ff8aaa', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:13.811+00', '2026-03-17 16:48:13.811+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('eed3e920-f9e3-4256-8e24-1845d82a30a7', 'S25R2H5', '30c09d67-32f9-4744-8900-b7c9e1ff8aaa', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:14.014+00', '2026-03-17 16:48:14.014+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('d23b6875-20f1-4d1d-a944-82865dae9cfe', 'S25R3H1', '30c09d67-32f9-4744-8900-b7c9e1ff8aaa', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:14.175+00', '2026-03-17 16:48:14.175+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('cd2eaaf9-5681-44c3-b8b5-2a94f4e08f0c', 'S25R3H2', '30c09d67-32f9-4744-8900-b7c9e1ff8aaa', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:14.335+00', '2026-03-17 16:48:14.335+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('87036159-779e-4782-8b84-4207dd9d99f1', 'S25R3H3', '30c09d67-32f9-4744-8900-b7c9e1ff8aaa', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:14.495+00', '2026-03-17 16:48:14.495+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('aa198f0b-0c4d-45f6-a7de-8946b70b7d93', 'S25R3H4', '30c09d67-32f9-4744-8900-b7c9e1ff8aaa', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:14.663+00', '2026-03-17 16:48:14.663+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('cf4354d4-8770-47cf-8e9e-ca1b287c8949', 'S25R3H5', '30c09d67-32f9-4744-8900-b7c9e1ff8aaa', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:14.845+00', '2026-03-17 16:48:14.845+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('2e5255e1-7c7e-4c02-9aec-2ca21615890c', 'S25R4H1', '30c09d67-32f9-4744-8900-b7c9e1ff8aaa', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:14.995+00', '2026-03-17 16:48:14.995+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('d59610a9-aa08-41bb-9305-a9989571f3f3', 'S25R4H2', '30c09d67-32f9-4744-8900-b7c9e1ff8aaa', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:15.154+00', '2026-03-17 16:48:15.154+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('555bb515-9707-4a0b-bc41-04f2bdbc48b1', 'S25R4H3', '30c09d67-32f9-4744-8900-b7c9e1ff8aaa', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:15.314+00', '2026-03-17 16:48:15.314+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('c50f97b2-3074-42b3-97ea-a59efbd5019a', 'S25R4H4', '30c09d67-32f9-4744-8900-b7c9e1ff8aaa', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:15.475+00', '2026-03-17 16:48:15.475+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('c272ed5d-f8b0-4b77-9d60-98d35fbdffe2', 'S25R4H5', '30c09d67-32f9-4744-8900-b7c9e1ff8aaa', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:15.634+00', '2026-03-17 16:48:15.634+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('ccc31eb2-dda0-4d02-aaf9-eeaf742c0a25', 'S25R5H1', '30c09d67-32f9-4744-8900-b7c9e1ff8aaa', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:15.795+00', '2026-03-17 16:48:15.795+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('f2ae13a6-e7f6-449d-971c-59ed6a0b67d3', 'S25R5H2', '30c09d67-32f9-4744-8900-b7c9e1ff8aaa', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:15.963+00', '2026-03-17 16:48:15.963+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('1c539889-5d36-472c-bea0-f6670689eb6a', 'S25R5H3', '30c09d67-32f9-4744-8900-b7c9e1ff8aaa', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:16.115+00', '2026-03-17 16:48:16.115+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('29bd05cf-1fd6-4e59-941b-1ce56a3febf9', 'S25R5H4', '30c09d67-32f9-4744-8900-b7c9e1ff8aaa', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:16.275+00', '2026-03-17 16:48:16.275+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('c68dbd8a-9cca-454f-a3cb-ab64c1da487f', 'S25R5H5', '30c09d67-32f9-4744-8900-b7c9e1ff8aaa', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:16.434+00', '2026-03-17 16:48:16.434+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('930f3d81-112e-466a-bd15-6e11dbefde7e', 'S27R1H1', '8e2bdaee-4f12-4fab-b944-7c8fb0bfcf3d', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:16.591+00', '2026-03-17 16:48:16.591+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('df42942c-47e5-4ab5-aec8-d6a0141326c0', 'S27R1H2', '8e2bdaee-4f12-4fab-b944-7c8fb0bfcf3d', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:16.763+00', '2026-03-17 16:48:16.763+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('0bb9d120-c32c-4cb5-8fd5-d349def7a86c', 'S27R1H3', '8e2bdaee-4f12-4fab-b944-7c8fb0bfcf3d', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:16.914+00', '2026-03-17 16:48:16.914+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('9e0e355c-e555-4d58-b435-5503257f3c98', 'S27R1H4', '8e2bdaee-4f12-4fab-b944-7c8fb0bfcf3d', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:17.095+00', '2026-03-17 16:48:17.095+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('110b8a52-220f-44b6-a3f4-8e78aa2034ce', 'S27R1H5', '8e2bdaee-4f12-4fab-b944-7c8fb0bfcf3d', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:17.343+00', '2026-03-17 16:48:17.343+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('d22eef8e-6201-438f-8ee3-ab60b37eef4e', 'S27R2H1', '8e2bdaee-4f12-4fab-b944-7c8fb0bfcf3d', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:17.503+00', '2026-03-17 16:48:17.503+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('ec2625b7-a9ac-45bf-903a-f06942b13c30', 'S27R2H2', '8e2bdaee-4f12-4fab-b944-7c8fb0bfcf3d', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:17.762+00', '2026-03-17 16:48:17.762+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('a2c22f00-037d-4040-b312-bb66fd169081', 'S27R2H3', '8e2bdaee-4f12-4fab-b944-7c8fb0bfcf3d', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:17.995+00', '2026-03-17 16:48:17.995+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('206505d0-79f2-42b7-873d-adf674db4b22', 'S27R2H4', '8e2bdaee-4f12-4fab-b944-7c8fb0bfcf3d', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:18.195+00', '2026-03-17 16:48:18.195+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('04d39cf8-e765-4433-aa2c-652aff14aea0', 'S27R2H5', '8e2bdaee-4f12-4fab-b944-7c8fb0bfcf3d', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:18.362+00', '2026-03-17 16:48:18.362+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('51a3ea54-f03f-435e-888f-386d29a9b828', 'S27R3H1', '8e2bdaee-4f12-4fab-b944-7c8fb0bfcf3d', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:18.555+00', '2026-03-17 16:48:18.555+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('4ab51544-d7b6-40fc-a99a-7fee5df78e0b', 'S27R3H2', '8e2bdaee-4f12-4fab-b944-7c8fb0bfcf3d', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:18.774+00', '2026-03-17 16:48:18.774+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('5eb0db8b-83ed-4489-8ac0-a8e1504cf6ee', 'S27R3H3', '8e2bdaee-4f12-4fab-b944-7c8fb0bfcf3d', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:18.974+00', '2026-03-17 16:48:18.974+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('860f2172-f45d-40b3-829f-a39db1109f28', 'S27R3H4', '8e2bdaee-4f12-4fab-b944-7c8fb0bfcf3d', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:19.135+00', '2026-03-17 16:48:19.135+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('50ffb0f7-6908-4ce0-9399-ae2b74915a43', 'S27R3H5', '8e2bdaee-4f12-4fab-b944-7c8fb0bfcf3d', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:19.294+00', '2026-03-17 16:48:19.294+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('002529ad-7eb4-4e29-95b6-4b0255e871d2', 'S27R4H1', '8e2bdaee-4f12-4fab-b944-7c8fb0bfcf3d', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:19.496+00', '2026-03-17 16:48:19.496+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('2417c6ab-e850-4a80-a3d8-844cc8e88f8d', 'S27R4H2', '8e2bdaee-4f12-4fab-b944-7c8fb0bfcf3d', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:19.702+00', '2026-03-17 16:48:19.702+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('b309430f-e1eb-495b-abbe-29042243f2c6', 'S27R4H3', '8e2bdaee-4f12-4fab-b944-7c8fb0bfcf3d', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:19.862+00', '2026-03-17 16:48:19.862+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('03d30922-a2f6-42e5-adbc-6e7a9167a92e', 'S27R4H4', '8e2bdaee-4f12-4fab-b944-7c8fb0bfcf3d', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:20.034+00', '2026-03-17 16:48:20.034+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('774a990f-93a5-4b3e-ac52-0147aa49ac3e', 'S27R4H5', '8e2bdaee-4f12-4fab-b944-7c8fb0bfcf3d', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:20.195+00', '2026-03-17 16:48:20.195+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('a494e5ce-ec30-41c2-950b-8a263b5afe72', 'S27R5H1', '8e2bdaee-4f12-4fab-b944-7c8fb0bfcf3d', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:20.415+00', '2026-03-17 16:48:20.415+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('e744c764-b65b-4699-917e-964f019e6bc3', 'S27R5H2', '8e2bdaee-4f12-4fab-b944-7c8fb0bfcf3d', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:20.683+00', '2026-03-17 16:48:20.683+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('44e1d62a-2d79-4caf-82a6-84f41e1c1c98', 'S27R5H3', '8e2bdaee-4f12-4fab-b944-7c8fb0bfcf3d', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:20.874+00', '2026-03-17 16:48:20.874+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('37e45eea-e1e7-415e-95f8-41934b4ad6d2', 'S27R5H4', '8e2bdaee-4f12-4fab-b944-7c8fb0bfcf3d', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:21.075+00', '2026-03-17 16:48:21.075+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('aea71ad1-02c1-45bc-a3d0-2e4c9cd296f6', 'S27R5H5', '8e2bdaee-4f12-4fab-b944-7c8fb0bfcf3d', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:21.242+00', '2026-03-17 16:48:21.242+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('108d11b4-38e9-46d0-9d6c-e2134844c0f1', 'S29R1H1', '353fcdeb-237a-4e43-b552-2acf2d44ddd1', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:21.434+00', '2026-03-17 16:48:21.434+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('14f95c09-d7cb-4aa5-add1-04b4d1a3b308', 'S29R1H2', '353fcdeb-237a-4e43-b552-2acf2d44ddd1', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:21.635+00', '2026-03-17 16:48:21.635+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('7db4ca40-1314-4491-9951-4c69ac3d1d32', 'S29R1H3', '353fcdeb-237a-4e43-b552-2acf2d44ddd1', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:21.835+00', '2026-03-17 16:48:21.835+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('54d7cdc0-d975-4dc0-9518-680527a6d680', 'S29R1H4', '353fcdeb-237a-4e43-b552-2acf2d44ddd1', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:22.023+00', '2026-03-17 16:48:22.023+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('ad48c662-b7b1-4688-a41b-6a67a4f8beac', 'S29R1H5', '353fcdeb-237a-4e43-b552-2acf2d44ddd1', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:22.234+00', '2026-03-17 16:48:22.234+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('fb87892e-5d19-4b00-bab1-dd43fc9e33f8', 'S29R2H1', '353fcdeb-237a-4e43-b552-2acf2d44ddd1', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:22.422+00', '2026-03-17 16:48:22.422+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('6c311d76-b80b-459b-818b-6120223e5db3', 'S29R2H2', '353fcdeb-237a-4e43-b552-2acf2d44ddd1', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:22.662+00', '2026-03-17 16:48:22.662+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('b2a9c996-2273-471f-b759-b4b296239018', 'S29R2H3', '353fcdeb-237a-4e43-b552-2acf2d44ddd1', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:22.835+00', '2026-03-17 16:48:22.835+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('ef1b3b9d-43a5-42ed-8b9f-df504b2b8a9f', 'S29R2H4', '353fcdeb-237a-4e43-b552-2acf2d44ddd1', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:23.054+00', '2026-03-17 16:48:23.054+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('1f5093c0-4776-4956-85db-1bc889eb9f2f', 'S29R2H5', '353fcdeb-237a-4e43-b552-2acf2d44ddd1', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:23.222+00', '2026-03-17 16:48:23.222+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('93c324ed-b4ee-43b5-9221-c6ea68bb1d55', 'S29R3H1', '353fcdeb-237a-4e43-b552-2acf2d44ddd1', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:23.434+00', '2026-03-17 16:48:23.434+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('801f1d83-4eab-4086-a58c-c3eeef6346eb', 'S29R3H2', '353fcdeb-237a-4e43-b552-2acf2d44ddd1', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:23.594+00', '2026-03-17 16:48:23.594+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('06adb5ee-40ae-481d-8939-93375900dde5', 'S29R3H3', '353fcdeb-237a-4e43-b552-2acf2d44ddd1', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:23.823+00', '2026-03-17 16:48:23.823+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('b9891fbc-60b7-45aa-99c2-a826b4abac98', 'S29R3H4', '353fcdeb-237a-4e43-b552-2acf2d44ddd1', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:23.994+00', '2026-03-17 16:48:23.994+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('b8a867b7-774e-4056-91a7-da3fd755f3f5', 'S29R3H5', '353fcdeb-237a-4e43-b552-2acf2d44ddd1', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:24.222+00', '2026-03-17 16:48:24.222+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('db8d8daf-0bee-4aae-b536-e0f5ea6283e1', 'S29R4H1', '353fcdeb-237a-4e43-b552-2acf2d44ddd1', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:24.435+00', '2026-03-17 16:48:24.435+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('553c8f6c-7d03-4f22-83c7-8f4223573ba3', 'S29R4H2', '353fcdeb-237a-4e43-b552-2acf2d44ddd1', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:24.594+00', '2026-03-17 16:48:24.594+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('f2048b1e-e3b3-40ce-8da9-2427627c6a12', 'S29R4H3', '353fcdeb-237a-4e43-b552-2acf2d44ddd1', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:24.763+00', '2026-03-17 16:48:24.763+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('302cd12f-c286-478b-8d66-e306edc6cab3', 'S29R4H4', '353fcdeb-237a-4e43-b552-2acf2d44ddd1', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:24.946+00', '2026-03-17 16:48:24.946+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('b8ff6b9a-1f65-4fb9-8540-2f36b99b6cfa', 'S29R4H5', '353fcdeb-237a-4e43-b552-2acf2d44ddd1', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:25.094+00', '2026-03-17 16:48:25.094+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('aaf18b61-d11a-43dc-a0ff-7efadf6268f0', 'S29R5H1', '353fcdeb-237a-4e43-b552-2acf2d44ddd1', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:25.262+00', '2026-03-17 16:48:25.262+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('df9e9548-20fb-4361-bfd2-3fd6ae6405da', 'S29R5H2', '353fcdeb-237a-4e43-b552-2acf2d44ddd1', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:25.415+00', '2026-03-17 16:48:25.415+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('832e330a-2cee-404f-94ae-314fa5b59c3f', 'S29R5H3', '353fcdeb-237a-4e43-b552-2acf2d44ddd1', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:25.574+00', '2026-03-17 16:48:25.574+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('84032828-f3af-41c6-812f-a6f9d7f856a0', 'S29R5H4', '353fcdeb-237a-4e43-b552-2acf2d44ddd1', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:25.750+00', '2026-03-17 16:48:25.750+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('b36ab6ac-bede-42f2-bd21-86bf630f09e6', 'S29R5H5', '353fcdeb-237a-4e43-b552-2acf2d44ddd1', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:25.915+00', '2026-03-17 16:48:25.915+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('66e32f13-c00a-4c97-9012-8086b27b7183', 'S31R1H1', 'd4213a0c-31d5-4914-bd7f-70300891eb1c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:26.087+00', '2026-03-17 16:48:26.087+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('9408e9c7-836e-4088-ace9-af80305fb355', 'S31R1H2', 'd4213a0c-31d5-4914-bd7f-70300891eb1c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:26.236+00', '2026-03-17 16:48:26.236+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('9d48bcfd-5c30-4c91-a0ba-c98084378a5d', 'S31R1H3', 'd4213a0c-31d5-4914-bd7f-70300891eb1c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:26.395+00', '2026-03-17 16:48:26.395+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('68b00787-9fd8-4645-b2a0-c661fa6292a9', 'S31R1H4', 'd4213a0c-31d5-4914-bd7f-70300891eb1c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:26.554+00', '2026-03-17 16:48:26.554+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('11591758-389a-4701-b15f-cbcfa8b456ec', 'S31R1H5', 'd4213a0c-31d5-4914-bd7f-70300891eb1c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:26.715+00', '2026-03-17 16:48:26.715+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('764c6847-45c6-40cf-bb57-0c56d22ba434', 'S31R2H1', 'd4213a0c-31d5-4914-bd7f-70300891eb1c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:26.875+00', '2026-03-17 16:48:26.875+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('91c52716-f55e-4124-9f55-64e3131a1ed7', 'S31R2H2', 'd4213a0c-31d5-4914-bd7f-70300891eb1c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:27.035+00', '2026-03-17 16:48:27.035+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('849c15be-1c3e-4b79-863d-3fb1131afeb3', 'S31R2H3', 'd4213a0c-31d5-4914-bd7f-70300891eb1c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:27.211+00', '2026-03-17 16:48:27.211+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('f53f7f54-9c7e-47c3-968b-bbe051d2d353', 'S31R2H4', 'd4213a0c-31d5-4914-bd7f-70300891eb1c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:27.374+00', '2026-03-17 16:48:27.374+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('a4c9316d-eba1-46f5-b3f5-832eac947089', 'S31R2H5', 'd4213a0c-31d5-4914-bd7f-70300891eb1c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:27.575+00', '2026-03-17 16:48:27.575+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('bba74e79-f2a2-4471-a216-4ef83c12834d', 'S31R3H1', 'd4213a0c-31d5-4914-bd7f-70300891eb1c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:27.802+00', '2026-03-17 16:48:27.802+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('64646c66-b851-4582-b2b6-e8d6e052f643', 'S31R3H2', 'd4213a0c-31d5-4914-bd7f-70300891eb1c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:27.983+00', '2026-03-17 16:48:27.983+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('554548c5-e901-446b-98f8-a7b74ad5b37a', 'S31R3H3', 'd4213a0c-31d5-4914-bd7f-70300891eb1c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:28.155+00', '2026-03-17 16:48:28.155+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('afb3e303-d614-48f5-89f4-87bbb58bb8cc', 'S31R3H4', 'd4213a0c-31d5-4914-bd7f-70300891eb1c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:28.355+00', '2026-03-17 16:48:28.355+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('c13ae1ad-baf5-4e67-b583-1fcb0e3a955e', 'S31R3H5', 'd4213a0c-31d5-4914-bd7f-70300891eb1c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:28.542+00', '2026-03-17 16:48:28.542+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('e38d5207-99cd-4509-858a-4c5ebdd6536c', 'S31R4H1', 'd4213a0c-31d5-4914-bd7f-70300891eb1c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:28.721+00', '2026-03-17 16:48:28.721+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('b28c8377-2c02-4835-8532-45e45ab49e41', 'S31R4H2', 'd4213a0c-31d5-4914-bd7f-70300891eb1c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:28.875+00', '2026-03-17 16:48:28.875+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('9d2531ab-5769-4ade-be5b-3e560fdcda4c', 'S31R4H3', 'd4213a0c-31d5-4914-bd7f-70300891eb1c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:29.075+00', '2026-03-17 16:48:29.075+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('20d0104d-37e4-4be7-a25d-3c70c6c7a8ed', 'S31R4H4', 'd4213a0c-31d5-4914-bd7f-70300891eb1c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:29.342+00', '2026-03-17 16:48:29.342+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('4f0c100c-800d-4fcb-a50e-0f28ee24b790', 'S31R4H5', 'd4213a0c-31d5-4914-bd7f-70300891eb1c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:29.555+00', '2026-03-17 16:48:29.555+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('38e3c87f-20ed-4d5e-aa24-67434daf2cec', 'S31R5H1', 'd4213a0c-31d5-4914-bd7f-70300891eb1c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:29.751+00', '2026-03-17 16:48:29.751+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('2cd51469-ad83-4a9e-a25e-5f5fb3453740', 'S31R5H2', 'd4213a0c-31d5-4914-bd7f-70300891eb1c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:29.955+00', '2026-03-17 16:48:29.955+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('a42288ea-2e4b-46ed-b35b-3394113d49cc', 'S31R5H3', 'd4213a0c-31d5-4914-bd7f-70300891eb1c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:30.114+00', '2026-03-17 16:48:30.114+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('7de45768-475b-450f-9c5a-e77b1ad2a518', 'S31R5H4', 'd4213a0c-31d5-4914-bd7f-70300891eb1c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:30.290+00', '2026-03-17 16:48:30.290+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('a99f13e5-eb2e-45be-b468-f21ffce88f92', 'S31R5H5', 'd4213a0c-31d5-4914-bd7f-70300891eb1c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:30.474+00', '2026-03-17 16:48:30.474+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('ba9dad18-477d-4ebc-9f51-d98f78af4612', 'S31R6H1', 'd4213a0c-31d5-4914-bd7f-70300891eb1c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 6, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:30.703+00', '2026-03-17 16:48:30.703+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('04a86997-6c3e-45b3-b581-5eee3a3350dd', 'S31R6H2', 'd4213a0c-31d5-4914-bd7f-70300891eb1c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 6, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:30.915+00', '2026-03-17 16:48:30.915+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('2292b5d6-4fec-4add-ac3c-022629a8c54d', 'S31R6H3', 'd4213a0c-31d5-4914-bd7f-70300891eb1c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 6, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:31.082+00', '2026-03-17 16:48:31.082+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('1d72e943-4492-49c2-8515-1674650683b2', 'S31R6H4', 'd4213a0c-31d5-4914-bd7f-70300891eb1c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 6, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:31.235+00', '2026-03-17 16:48:31.235+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('9c4fbd1e-2d59-4f41-8be7-529c3acb73f9', 'S31R6H5', 'd4213a0c-31d5-4914-bd7f-70300891eb1c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 6, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:31.434+00', '2026-03-17 16:48:31.434+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('083f1fd9-d29c-474c-87b3-5ad36782461a', 'S31R7H1', 'd4213a0c-31d5-4914-bd7f-70300891eb1c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 7, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:31.602+00', '2026-03-17 16:48:31.602+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('4fe1d5dc-f97d-4ab0-b251-1927025969f5', 'S31R7H2', 'd4213a0c-31d5-4914-bd7f-70300891eb1c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 7, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:31.815+00', '2026-03-17 16:48:31.815+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('9279bf04-8f8e-4bb2-90b7-ac2b9ebcdb38', 'S31R7H3', 'd4213a0c-31d5-4914-bd7f-70300891eb1c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 7, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:31.982+00', '2026-03-17 16:48:31.982+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('7cceaedf-a427-4bcf-adce-567119fccb7c', 'S31R7H4', 'd4213a0c-31d5-4914-bd7f-70300891eb1c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 7, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:32.174+00', '2026-03-17 16:48:32.174+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('e4191e99-772b-4ce0-9652-c1dd00c387e5', 'S31R7H5', 'd4213a0c-31d5-4914-bd7f-70300891eb1c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 7, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:32.422+00', '2026-03-17 16:48:32.422+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('c86a282a-277b-4ed3-b2ef-2842dcb373ea', 'S33R1H1', '5c108a81-42f9-44b3-836d-e6a36bdaedaa', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:32.610+00', '2026-03-17 16:48:32.610+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('0da503ac-1f96-4e82-83ff-62583ae4ed8a', 'S33R1H2', '5c108a81-42f9-44b3-836d-e6a36bdaedaa', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:32.795+00', '2026-03-17 16:48:32.795+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('3f793b75-7e96-4ef1-88c5-8438225fddfa', 'S33R1H3', '5c108a81-42f9-44b3-836d-e6a36bdaedaa', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:33.043+00', '2026-03-17 16:48:33.043+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('5e3085bc-3a27-4b71-8f91-658b1a1a061f', 'S33R1H4', '5c108a81-42f9-44b3-836d-e6a36bdaedaa', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:33.255+00', '2026-03-17 16:48:33.255+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('d9d28a54-fab5-4f2c-91a6-784f40dd6610', 'S33R2H1', '5c108a81-42f9-44b3-836d-e6a36bdaedaa', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:33.474+00', '2026-03-17 16:48:33.474+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('5ec9b0a0-7414-42d3-a432-e160b8cacf5a', 'S33R2H2', '5c108a81-42f9-44b3-836d-e6a36bdaedaa', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:33.674+00', '2026-03-17 16:48:33.674+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('cef22a40-eb27-4823-8455-ceb14c6b4303', 'S33R2H3', '5c108a81-42f9-44b3-836d-e6a36bdaedaa', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:33.875+00', '2026-03-17 16:48:33.875+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('05da633c-05cf-4fe7-8b91-136ec74c6acf', 'S33R2H4', '5c108a81-42f9-44b3-836d-e6a36bdaedaa', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:34.074+00', '2026-03-17 16:48:34.074+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('223e02d5-6665-4869-8707-0cc6d7da300a', 'S33R3H1', '5c108a81-42f9-44b3-836d-e6a36bdaedaa', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:34.275+00', '2026-03-17 16:48:34.275+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('c54131b1-2673-43ab-b810-bf3f5095b03e', 'S33R3H2', '5c108a81-42f9-44b3-836d-e6a36bdaedaa', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:34.475+00', '2026-03-17 16:48:34.475+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('8583e592-b392-4047-9780-5c82f33f9a07', 'S33R3H3', '5c108a81-42f9-44b3-836d-e6a36bdaedaa', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:34.643+00', '2026-03-17 16:48:34.643+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('e5233787-fa4c-42b3-b631-8280153a5581', 'S33R3H4', '5c108a81-42f9-44b3-836d-e6a36bdaedaa', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:34.855+00', '2026-03-17 16:48:34.855+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('e56ff355-38de-460e-923f-6164bbca84b6', 'S33R4H1', '5c108a81-42f9-44b3-836d-e6a36bdaedaa', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:35.031+00', '2026-03-17 16:48:35.031+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('0c98d507-3ee4-4348-bf5d-ed1b8e86b370', 'S33R4H2', '5c108a81-42f9-44b3-836d-e6a36bdaedaa', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:35.255+00', '2026-03-17 16:48:35.255+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('08832e87-bbd7-4f46-9565-508362d64f29', 'S33R4H3', '5c108a81-42f9-44b3-836d-e6a36bdaedaa', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:35.476+00', '2026-03-17 16:48:35.476+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('b1478fb3-f281-4d6e-b5cf-36c864fdee18', 'S33R4H4', '5c108a81-42f9-44b3-836d-e6a36bdaedaa', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:35.654+00', '2026-03-17 16:48:35.654+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('eb159188-f803-43a9-be56-d0cd59c046f3', 'S33R5H1', '5c108a81-42f9-44b3-836d-e6a36bdaedaa', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:35.843+00', '2026-03-17 16:48:35.843+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('9a6bbd72-d922-4552-b101-d8c1c9228ac5', 'S33R5H2', '5c108a81-42f9-44b3-836d-e6a36bdaedaa', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:36.018+00', '2026-03-17 16:48:36.018+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('55240729-1d8c-4bf2-9876-59b11d6021f0', 'S33R5H3', '5c108a81-42f9-44b3-836d-e6a36bdaedaa', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:36.214+00', '2026-03-17 16:48:36.214+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('1a4ac627-95c9-4906-8c5a-6e2cea817949', 'S33R5H4', '5c108a81-42f9-44b3-836d-e6a36bdaedaa', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:36.414+00', '2026-03-17 16:48:36.414+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('36e81b86-9ed6-413c-8ad0-2a4d6c0504b3', 'S35R1H1', 'ef025a9c-317d-4607-9607-997358f60af3', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:36.583+00', '2026-03-17 16:48:36.583+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('455d2993-ca1a-457b-9ccb-255f6dec3ed2', 'S35R1H2', 'ef025a9c-317d-4607-9607-997358f60af3', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:36.794+00', '2026-03-17 16:48:36.794+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('2c8c70e1-d64b-44f4-8d16-47b9acfd5b2e', 'S35R1H3', 'ef025a9c-317d-4607-9607-997358f60af3', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:36.955+00', '2026-03-17 16:48:36.955+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('a44761df-764e-49fa-87fc-de1682a023a5', 'S35R1H4', 'ef025a9c-317d-4607-9607-997358f60af3', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:37.175+00', '2026-03-17 16:48:37.175+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('c06064e0-e539-4944-b4d1-08d2012612ef', 'S35R2H1', 'ef025a9c-317d-4607-9607-997358f60af3', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:37.383+00', '2026-03-17 16:48:37.383+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('a536209a-0238-4383-9463-1fab135724d3', 'S35R2H2', 'ef025a9c-317d-4607-9607-997358f60af3', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:37.614+00', '2026-03-17 16:48:37.614+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('97fda498-6975-440c-81de-4c88a61f4c87', 'S35R2H3', 'ef025a9c-317d-4607-9607-997358f60af3', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:37.802+00', '2026-03-17 16:48:37.802+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('572b93a3-984c-4b73-9c08-748649969d5d', 'S35R2H4', 'ef025a9c-317d-4607-9607-997358f60af3', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:38.014+00', '2026-03-17 16:48:38.014+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('4f949452-f512-44aa-b87e-de6d1cae3b1e', 'S35R3H1', 'ef025a9c-317d-4607-9607-997358f60af3', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:38.263+00', '2026-03-17 16:48:38.263+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('1e84782e-ff17-4201-8e4c-a798c592503a', 'S35R3H2', 'ef025a9c-317d-4607-9607-997358f60af3', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:38.414+00', '2026-03-17 16:48:38.414+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('a1977ace-bff0-4a02-b221-777d418b5df0', 'S35R3H3', 'ef025a9c-317d-4607-9607-997358f60af3', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:38.594+00', '2026-03-17 16:48:38.594+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('a02eedee-506f-43db-9a5f-795d8615bba0', 'S35R3H4', 'ef025a9c-317d-4607-9607-997358f60af3', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:38.794+00', '2026-03-17 16:48:38.794+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('7bfa0109-4a73-422e-91db-94c65589fcee', 'S35R4H1', 'ef025a9c-317d-4607-9607-997358f60af3', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:38.955+00', '2026-03-17 16:48:38.955+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('d3242256-76f4-4671-80b5-0493e143e5fd', 'S35R4H2', 'ef025a9c-317d-4607-9607-997358f60af3', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:39.136+00', '2026-03-17 16:48:39.136+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('b6b776b1-1a17-42f3-a93f-8ddd35fe1370', 'S35R4H3', 'ef025a9c-317d-4607-9607-997358f60af3', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:39.295+00', '2026-03-17 16:48:39.295+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('e4c9d974-add5-4f7f-a983-aa2990b1ca04', 'S35R4H4', 'ef025a9c-317d-4607-9607-997358f60af3', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:39.454+00', '2026-03-17 16:48:39.454+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('0e532e88-7df9-4833-8fa6-32fa9525ad64', 'S35R5H1', 'ef025a9c-317d-4607-9607-997358f60af3', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:39.622+00', '2026-03-17 16:48:39.622+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('905d1d65-4a58-4e64-ad6b-d7de0e1b0b63', 'S35R5H2', 'ef025a9c-317d-4607-9607-997358f60af3', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:39.774+00', '2026-03-17 16:48:39.774+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('ef4015f1-9395-4b17-9dea-ae40b94f154c', 'S35R5H3', 'ef025a9c-317d-4607-9607-997358f60af3', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:39.943+00', '2026-03-17 16:48:39.943+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('b9107c34-e8e6-4a3b-bb7c-f3bf7a165a3b', 'S35R5H4', 'ef025a9c-317d-4607-9607-997358f60af3', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:40.094+00', '2026-03-17 16:48:40.094+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('b6375a66-b309-4c85-9116-ff606e7af03c', 'S37R1H1', 'fc220d4f-d1f0-4d7e-aac3-a7739941fa6c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:40.259+00', '2026-03-17 16:48:40.259+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('5310cccf-c381-4402-b5dd-b4325482738a', 'S37R1H2', 'fc220d4f-d1f0-4d7e-aac3-a7739941fa6c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:40.415+00', '2026-03-17 16:48:40.415+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('c9f37e37-bb93-4407-b33c-4e2c2516c944', 'S37R1H3', 'fc220d4f-d1f0-4d7e-aac3-a7739941fa6c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:40.581+00', '2026-03-17 16:48:40.581+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('bc5a299c-6627-4378-86b7-55769d2504a7', 'S37R1H4', 'fc220d4f-d1f0-4d7e-aac3-a7739941fa6c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:40.735+00', '2026-03-17 16:48:40.735+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('158a4d3c-475e-4651-85c6-793bb4bdc99e', 'S37R2H1', 'fc220d4f-d1f0-4d7e-aac3-a7739941fa6c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:40.902+00', '2026-03-17 16:48:40.902+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('ef9d9784-54de-4af3-ae33-6286859032a3', 'S37R2H2', 'fc220d4f-d1f0-4d7e-aac3-a7739941fa6c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:41.062+00', '2026-03-17 16:48:41.062+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('47ff6f24-b39a-4819-ac94-e6ace6582a04', 'S37R2H3', 'fc220d4f-d1f0-4d7e-aac3-a7739941fa6c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:41.214+00', '2026-03-17 16:48:41.214+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('8cfd5647-9382-4b99-95b7-312547d0bdaf', 'S37R2H4', 'fc220d4f-d1f0-4d7e-aac3-a7739941fa6c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:41.373+00', '2026-03-17 16:48:41.373+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('d2221b75-2382-44ac-a244-79f5a46f63e0', 'S37R3H1', 'fc220d4f-d1f0-4d7e-aac3-a7739941fa6c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:41.540+00', '2026-03-17 16:48:41.540+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('b39b3706-2974-49da-8c74-561e4289d2cd', 'S37R3H2', 'fc220d4f-d1f0-4d7e-aac3-a7739941fa6c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:41.703+00', '2026-03-17 16:48:41.703+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('513bd8a5-5964-4aff-9bfd-833d16820147', 'S37R3H3', 'fc220d4f-d1f0-4d7e-aac3-a7739941fa6c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:41.862+00', '2026-03-17 16:48:41.862+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('0e45494a-0be2-418e-8133-8e1e7961e3f7', 'S37R3H4', 'fc220d4f-d1f0-4d7e-aac3-a7739941fa6c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:42.030+00', '2026-03-17 16:48:42.030+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('c6f095ce-e913-4e20-a13d-fe77d3c90c0d', 'S37R4H1', 'fc220d4f-d1f0-4d7e-aac3-a7739941fa6c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:42.234+00', '2026-03-17 16:48:42.234+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('1fa63510-558d-4d2f-8b37-03ba50868d8e', 'S37R4H2', 'fc220d4f-d1f0-4d7e-aac3-a7739941fa6c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:42.475+00', '2026-03-17 16:48:42.475+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('eae0f64b-917f-4388-a00a-c4f98a80a3bb', 'S37R4H3', 'fc220d4f-d1f0-4d7e-aac3-a7739941fa6c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:42.639+00', '2026-03-17 16:48:42.639+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('830d142e-592c-4a6b-92da-37218d9129ab', 'S37R4H4', 'fc220d4f-d1f0-4d7e-aac3-a7739941fa6c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:42.826+00', '2026-03-17 16:48:42.826+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('4e4b0034-e9e4-412d-b50d-09747b9403b4', 'S37R5H1', 'fc220d4f-d1f0-4d7e-aac3-a7739941fa6c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:42.974+00', '2026-03-17 16:48:42.974+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('5bba5385-a287-4733-841b-7a47a307be3c', 'S37R5H2', 'fc220d4f-d1f0-4d7e-aac3-a7739941fa6c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:43.154+00', '2026-03-17 16:48:43.154+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('be8100ad-c63c-4930-9a71-47d4bba98c64', 'S37R5H3', 'fc220d4f-d1f0-4d7e-aac3-a7739941fa6c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:43.322+00', '2026-03-17 16:48:43.322+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('5cf59d72-db81-49d5-ac5b-e0028175fd32', 'S37R5H4', 'fc220d4f-d1f0-4d7e-aac3-a7739941fa6c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:43.543+00', '2026-03-17 16:48:43.543+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('7661d122-6736-4002-8d52-46cee34b8020', 'S39R1H1', 'b1a99f00-c3df-448b-9e80-d5bc9257eabc', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:43.714+00', '2026-03-17 16:48:43.714+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('ede0dcf2-72f5-412c-bf32-0459b4d6cf3e', 'S39R1H2', 'b1a99f00-c3df-448b-9e80-d5bc9257eabc', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:43.915+00', '2026-03-17 16:48:43.915+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('715f539d-0498-4e10-9e86-4c1fe9f65b9e', 'S39R1H3', 'b1a99f00-c3df-448b-9e80-d5bc9257eabc', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:44.155+00', '2026-03-17 16:48:44.155+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('214170be-3838-4876-bc10-46cebaf8796b', 'S39R1H4', 'b1a99f00-c3df-448b-9e80-d5bc9257eabc', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:44.331+00', '2026-03-17 16:48:44.331+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('bbf47599-aab5-4345-9677-21b4b3d81e26', 'S39R2H1', 'b1a99f00-c3df-448b-9e80-d5bc9257eabc', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:44.515+00', '2026-03-17 16:48:44.515+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('bfd7bb64-ad83-49ef-991e-ecbc6666e6fa', 'S39R2H2', 'b1a99f00-c3df-448b-9e80-d5bc9257eabc', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:44.675+00', '2026-03-17 16:48:44.675+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('a0f9d3cb-a75f-4f94-8834-b2f7c4d855c3', 'S39R2H3', 'b1a99f00-c3df-448b-9e80-d5bc9257eabc', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:44.855+00', '2026-03-17 16:48:44.855+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('63f33073-8577-47fd-bc51-768db4f3e925', 'S39R2H4', 'b1a99f00-c3df-448b-9e80-d5bc9257eabc', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:45.022+00', '2026-03-17 16:48:45.022+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('e1c3d65e-1306-4096-8789-06662779f7ab', 'S39R3H1', 'b1a99f00-c3df-448b-9e80-d5bc9257eabc', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:45.283+00', '2026-03-17 16:48:45.283+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('64b89032-88b4-42e6-9cd0-d32c056f40e4', 'S39R3H2', 'b1a99f00-c3df-448b-9e80-d5bc9257eabc', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:45.502+00', '2026-03-17 16:48:45.502+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('08744ebe-ee54-4a2b-b766-7d6c4ff84299', 'S39R3H3', 'b1a99f00-c3df-448b-9e80-d5bc9257eabc', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:45.686+00', '2026-03-17 16:48:45.686+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('a4ba5abe-75a3-4eee-8538-ecc2de8a3a70', 'S39R3H4', 'b1a99f00-c3df-448b-9e80-d5bc9257eabc', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:45.942+00', '2026-03-17 16:48:45.942+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('3b95fd67-29e4-4550-b340-e388e08dce8e', 'S39R4H1', 'b1a99f00-c3df-448b-9e80-d5bc9257eabc', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:46.094+00', '2026-03-17 16:48:46.094+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('4db877fc-8956-4770-b939-49c0235d1238', 'S39R4H2', 'b1a99f00-c3df-448b-9e80-d5bc9257eabc', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:46.254+00', '2026-03-17 16:48:46.254+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('08626757-884a-4f78-a922-1c3a62397201', 'S39R4H3', 'b1a99f00-c3df-448b-9e80-d5bc9257eabc', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:46.423+00', '2026-03-17 16:48:46.423+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('08385c88-b9bc-4db7-9ebf-9489fe0ba669', 'S39R4H4', 'b1a99f00-c3df-448b-9e80-d5bc9257eabc', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:46.575+00', '2026-03-17 16:48:46.575+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('ce14bd1f-5cb8-4822-9418-eaa9f1bf6c4c', 'S39R5H1', 'b1a99f00-c3df-448b-9e80-d5bc9257eabc', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:46.734+00', '2026-03-17 16:48:46.734+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('048ead62-d448-48fa-8fc8-ae93e00bdbed', 'S39R5H2', 'b1a99f00-c3df-448b-9e80-d5bc9257eabc', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:46.895+00', '2026-03-17 16:48:46.895+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('67ea8192-d9bc-48b7-b446-2658e4bdb66a', 'S39R5H3', 'b1a99f00-c3df-448b-9e80-d5bc9257eabc', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:47.054+00', '2026-03-17 16:48:47.054+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('b000ed80-9134-4c54-b5bd-2caa573a8cd3', 'S39R5H4', 'b1a99f00-c3df-448b-9e80-d5bc9257eabc', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:47.215+00', '2026-03-17 16:48:47.215+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('2d7e626c-4bb6-488e-bb9d-9a02340b8fa1', 'S41R1H1', 'aa4fb230-6936-438c-bca3-d8baaab3243d', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:47.375+00', '2026-03-17 16:48:47.375+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('c3c7674a-9cb5-4463-8ff7-9375b76b26c0', 'S41R1H2', 'aa4fb230-6936-438c-bca3-d8baaab3243d', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:47.534+00', '2026-03-17 16:48:47.534+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('b3c8a62c-74d6-4713-9d14-9e2727f941d9', 'S41R1H3', 'aa4fb230-6936-438c-bca3-d8baaab3243d', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:47.694+00', '2026-03-17 16:48:47.694+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('030c1eb9-67cb-4ef5-ab62-dcfbfde768d5', 'S41R1H4', 'aa4fb230-6936-438c-bca3-d8baaab3243d', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:47.855+00', '2026-03-17 16:48:47.855+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('33428026-81d2-46a2-b767-898e8c3a5708', 'S41R2H1', 'aa4fb230-6936-438c-bca3-d8baaab3243d', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:48.015+00', '2026-03-17 16:48:48.015+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('9a877b85-e56f-49e4-86c6-ff52351953b7', 'S41R2H2', 'aa4fb230-6936-438c-bca3-d8baaab3243d', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:48.175+00', '2026-03-17 16:48:48.175+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('384fdc8a-acbf-40b0-890d-8f44b15a1359', 'S41R2H3', 'aa4fb230-6936-438c-bca3-d8baaab3243d', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:48.354+00', '2026-03-17 16:48:48.354+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('32125434-bdd9-4826-97ca-73b521dc88da', 'S41R2H4', 'aa4fb230-6936-438c-bca3-d8baaab3243d', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:48.555+00', '2026-03-17 16:48:48.555+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('f83d1314-fab6-4289-ac65-50f1319ef3a5', 'S41R3H1', 'aa4fb230-6936-438c-bca3-d8baaab3243d', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:48.755+00', '2026-03-17 16:48:48.755+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('b1b4433e-6ad1-454f-ba2f-ae1e4b1a582f', 'S41R3H2', 'aa4fb230-6936-438c-bca3-d8baaab3243d', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:48.924+00', '2026-03-17 16:48:48.924+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('f716645a-7c26-417e-b437-e7ed67eea2c9', 'S41R3H3', 'aa4fb230-6936-438c-bca3-d8baaab3243d', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:49.135+00', '2026-03-17 16:48:49.135+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('780decca-a212-4938-ad2b-0467e3d5c03e', 'S41R3H4', 'aa4fb230-6936-438c-bca3-d8baaab3243d', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:49.315+00', '2026-03-17 16:48:49.315+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('9d9f6fd0-b577-41d7-97f1-549c9f6a7ecc', 'S41R4H1', 'aa4fb230-6936-438c-bca3-d8baaab3243d', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:49.534+00', '2026-03-17 16:48:49.534+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('aeb850cb-3203-49ea-9ce2-f79cedbf9a9d', 'S41R4H2', 'aa4fb230-6936-438c-bca3-d8baaab3243d', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:49.714+00', '2026-03-17 16:48:49.714+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('eb16f172-de1c-42a3-ada2-50c717d41a1f', 'S41R4H3', 'aa4fb230-6936-438c-bca3-d8baaab3243d', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:49.915+00', '2026-03-17 16:48:49.915+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('dcc0f55e-48d6-4333-8ffe-d6ae80bfd99a', 'S41R4H4', 'aa4fb230-6936-438c-bca3-d8baaab3243d', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:50.142+00', '2026-03-17 16:48:50.142+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('c12fea40-5fc7-4dff-b47e-95829fc68046', 'S43R1H1', 'f99b7be8-4815-4ba5-a2b0-a428cc8cc8d4', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:50.363+00', '2026-03-17 16:48:50.363+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('4ad7a6e0-86fe-4a28-9a04-f8faa1654b72', 'S43R1H2', 'f99b7be8-4815-4ba5-a2b0-a428cc8cc8d4', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:50.534+00', '2026-03-17 16:48:50.534+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('5982a0a7-17c0-4364-b431-031de598d40c', 'S43R1H3', 'f99b7be8-4815-4ba5-a2b0-a428cc8cc8d4', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:50.695+00', '2026-03-17 16:48:50.695+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('8e5accfc-6043-4e96-9f93-5c3ee728ff33', 'S43R1H4', 'f99b7be8-4815-4ba5-a2b0-a428cc8cc8d4', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:50.862+00', '2026-03-17 16:48:50.862+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('c4329873-f030-4ad0-9e99-7d5ab3fe2a98', 'S43R2H1', 'f99b7be8-4815-4ba5-a2b0-a428cc8cc8d4', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:51.074+00', '2026-03-17 16:48:51.074+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('aa37a46a-32ef-4448-9c8d-e4412c8d44f9', 'S43R2H2', 'f99b7be8-4815-4ba5-a2b0-a428cc8cc8d4', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:51.235+00', '2026-03-17 16:48:51.235+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('140e55a3-d469-458b-a04d-abad9aba2c3f', 'S43R2H3', 'f99b7be8-4815-4ba5-a2b0-a428cc8cc8d4', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:51.430+00', '2026-03-17 16:48:51.430+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('41062920-7884-40b8-8463-19f395d1b00c', 'S43R2H4', 'f99b7be8-4815-4ba5-a2b0-a428cc8cc8d4', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:51.594+00', '2026-03-17 16:48:51.594+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('eb5c3e2d-8390-4b8e-bfd9-f8bf1b800234', 'S43R3H1', 'f99b7be8-4815-4ba5-a2b0-a428cc8cc8d4', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:51.819+00', '2026-03-17 16:48:51.819+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('0a278ae8-10cd-4935-b39f-82403cfe8c24', 'S43R3H2', 'f99b7be8-4815-4ba5-a2b0-a428cc8cc8d4', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:52.034+00', '2026-03-17 16:48:52.034+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('8fe30874-2131-4734-83d3-55be33727315', 'S43R3H3', 'f99b7be8-4815-4ba5-a2b0-a428cc8cc8d4', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:52.195+00', '2026-03-17 16:48:52.195+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('56fceccc-7045-432f-b88f-50ca51eb1e1c', 'S43R3H4', 'f99b7be8-4815-4ba5-a2b0-a428cc8cc8d4', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:52.463+00', '2026-03-17 16:48:52.463+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('36826faf-91e5-4262-a1ea-5dec8901c8ac', 'S43R4H1', 'f99b7be8-4815-4ba5-a2b0-a428cc8cc8d4', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:52.623+00', '2026-03-17 16:48:52.623+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('2f10400f-d801-4dbb-a6c8-81b4b85472a9', 'S43R4H2', 'f99b7be8-4815-4ba5-a2b0-a428cc8cc8d4', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:52.815+00', '2026-03-17 16:48:52.815+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('6cfac55a-a08c-4a4d-903a-d4429606b8d7', 'S43R4H3', 'f99b7be8-4815-4ba5-a2b0-a428cc8cc8d4', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:53.034+00', '2026-03-17 16:48:53.034+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('41f423e8-12bb-4016-a968-c4aabafbb187', 'S43R4H4', 'f99b7be8-4815-4ba5-a2b0-a428cc8cc8d4', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:53.234+00', '2026-03-17 16:48:53.234+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('6e9c85b0-f70c-48d5-bb4b-119e23b9e85f', 'S45R1H1', 'd0ec7709-2dcf-4e52-aadf-e60ef7f1b709', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:53.435+00', '2026-03-17 16:48:53.435+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('68992864-e3e8-4c9b-98c3-e3ed37e556e7', 'S45R1H2', 'd0ec7709-2dcf-4e52-aadf-e60ef7f1b709', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:53.653+00', '2026-03-17 16:48:53.653+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('f8ad5169-c6f5-4a9b-9ad9-68c828974c2e', 'S45R1H3', 'd0ec7709-2dcf-4e52-aadf-e60ef7f1b709', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:53.814+00', '2026-03-17 16:48:53.814+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('0ac92832-8c99-4975-a75f-edaa7e0f7ff0', 'S45R1H4', 'd0ec7709-2dcf-4e52-aadf-e60ef7f1b709', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:54.015+00', '2026-03-17 16:48:54.015+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('0cef8fc3-47ff-49bc-82b0-42bff439a651', 'S45R2H1', 'd0ec7709-2dcf-4e52-aadf-e60ef7f1b709', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:54.230+00', '2026-03-17 16:48:54.230+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('e55caa44-9e48-4126-8677-89d275503c8d', 'S45R2H2', 'd0ec7709-2dcf-4e52-aadf-e60ef7f1b709', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:54.437+00', '2026-03-17 16:48:54.437+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('a4fcb9fe-6801-496c-bc76-8486a40f53d9', 'S45R2H3', 'd0ec7709-2dcf-4e52-aadf-e60ef7f1b709', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:54.654+00', '2026-03-17 16:48:54.654+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('3f701ef0-6498-472f-aacb-8443c402d0ab', 'S45R2H4', 'd0ec7709-2dcf-4e52-aadf-e60ef7f1b709', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:54.874+00', '2026-03-17 16:48:54.874+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('04c91733-6540-4ba2-82df-b4719c97a2ee', 'S45R3H1', 'd0ec7709-2dcf-4e52-aadf-e60ef7f1b709', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:55.094+00', '2026-03-17 16:48:55.094+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('8ec5fd7f-55bc-4a3e-ab53-822c8fbe1b15', 'S45R3H2', 'd0ec7709-2dcf-4e52-aadf-e60ef7f1b709', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:55.315+00', '2026-03-17 16:48:55.315+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('04ba2c34-836c-4990-b0d3-ca73efce7cca', 'S45R3H3', 'd0ec7709-2dcf-4e52-aadf-e60ef7f1b709', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:55.535+00', '2026-03-17 16:48:55.535+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('3efc0415-b94c-4850-9791-2bb478823195', 'S45R3H4', 'd0ec7709-2dcf-4e52-aadf-e60ef7f1b709', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:55.762+00', '2026-03-17 16:48:55.762+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('3208034c-a076-4c4e-be7a-2efd50e3457f', 'S45R4H1', 'd0ec7709-2dcf-4e52-aadf-e60ef7f1b709', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:56.011+00', '2026-03-17 16:48:56.011+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('479f72a3-a4d0-4db4-a66b-5d619acce3fd', 'S45R4H2', 'd0ec7709-2dcf-4e52-aadf-e60ef7f1b709', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:56.183+00', '2026-03-17 16:48:56.183+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('52586317-e77b-4dc9-a005-095f7a6c6dec', 'S45R4H3', 'd0ec7709-2dcf-4e52-aadf-e60ef7f1b709', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:56.410+00', '2026-03-17 16:48:56.410+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('63a5b00c-9d49-4408-9cb2-60ba138f947a', 'S45R4H4', 'd0ec7709-2dcf-4e52-aadf-e60ef7f1b709', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:56.614+00', '2026-03-17 16:48:56.614+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('4aebc37b-9774-4a33-ae10-8a4c99cc694c', 'S47R1H1', '6acacf2a-13fa-4f69-9262-51cb9bea8544', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:56.815+00', '2026-03-17 16:48:56.815+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('1a249059-f391-4a27-85fb-2e6d8e9750e1', 'S47R1H2', '6acacf2a-13fa-4f69-9262-51cb9bea8544', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:57.002+00', '2026-03-17 16:48:57.002+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('8e45bc35-3c6b-4df8-ae17-cf7511e668cc', 'S47R1H3', '6acacf2a-13fa-4f69-9262-51cb9bea8544', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:57.222+00', '2026-03-17 16:48:57.222+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('6cee4cf6-ae55-4332-8bd0-3a8de2eb213e', 'S47R1H4', '6acacf2a-13fa-4f69-9262-51cb9bea8544', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:57.442+00', '2026-03-17 16:48:57.442+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('b3c8ae8b-65d3-4018-84eb-e844b67c22ab', 'S47R2H1', '6acacf2a-13fa-4f69-9262-51cb9bea8544', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:57.594+00', '2026-03-17 16:48:57.594+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('b3face33-05a7-4003-a8dc-007be012b260', 'S47R2H2', '6acacf2a-13fa-4f69-9262-51cb9bea8544', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:57.762+00', '2026-03-17 16:48:57.762+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('0d40864a-45d5-4e47-883b-513604511aea', 'S47R2H3', '6acacf2a-13fa-4f69-9262-51cb9bea8544', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:57.915+00', '2026-03-17 16:48:57.915+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('7d524d26-8f2e-4964-911c-03f8a3fe2dc6', 'S47R2H4', '6acacf2a-13fa-4f69-9262-51cb9bea8544', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:58.094+00', '2026-03-17 16:48:58.094+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('6f4be06a-6a1c-4a4a-af16-5510d36ee05b', 'S47R3H1', '6acacf2a-13fa-4f69-9262-51cb9bea8544', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:58.255+00', '2026-03-17 16:48:58.255+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('c2b2d91f-c941-45a5-afa3-94b45fc01824', 'S47R3H2', '6acacf2a-13fa-4f69-9262-51cb9bea8544', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:58.431+00', '2026-03-17 16:48:58.431+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('477a4488-7997-4d62-9ba4-a926cc44e1ba', 'S47R3H3', '6acacf2a-13fa-4f69-9262-51cb9bea8544', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:58.595+00', '2026-03-17 16:48:58.595+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('36a2f079-6a0a-46e1-8288-109bd0ae6648', 'S47R3H4', '6acacf2a-13fa-4f69-9262-51cb9bea8544', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:58.771+00', '2026-03-17 16:48:58.771+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('ddb176a2-a4b3-4a4e-a26e-98c560ef8e1e', 'S47R4H1', '6acacf2a-13fa-4f69-9262-51cb9bea8544', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:58.951+00', '2026-03-17 16:48:58.951+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('a69192a7-782b-4725-9848-20d54370479a', 'S47R4H2', '6acacf2a-13fa-4f69-9262-51cb9bea8544', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:59.122+00', '2026-03-17 16:48:59.122+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('b6983580-8f24-4675-970f-ae4aea4ae32b', 'S47R4H3', '6acacf2a-13fa-4f69-9262-51cb9bea8544', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:59.295+00', '2026-03-17 16:48:59.295+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('7d22af21-58f5-4130-9f37-6321daf71a9f', 'S47R4H4', '6acacf2a-13fa-4f69-9262-51cb9bea8544', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:59.454+00', '2026-03-17 16:48:59.454+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('63ae237a-2bca-4063-9541-811ef60de473', 'S49R1H1', 'c5cb9506-bedc-4ae3-b274-47aa1dce6fc1', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:59.615+00', '2026-03-17 16:48:59.615+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('bdab2d5a-69ee-423f-a794-4c0c1941a420', 'S49R1H2', 'c5cb9506-bedc-4ae3-b274-47aa1dce6fc1', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:59.782+00', '2026-03-17 16:48:59.782+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('ad591d21-63eb-418f-bdf0-80d6b5c985ee', 'S49R1H3', 'c5cb9506-bedc-4ae3-b274-47aa1dce6fc1', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:48:59.935+00', '2026-03-17 16:48:59.935+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('90d1af4b-cade-4614-aea8-e699b608d01f', 'S49R1H4', 'c5cb9506-bedc-4ae3-b274-47aa1dce6fc1', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:00.099+00', '2026-03-17 16:49:00.099+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('b3b35a90-e0e0-4bcb-9e29-7a62cdee3fde', 'S49R2H1', 'c5cb9506-bedc-4ae3-b274-47aa1dce6fc1', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:00.254+00', '2026-03-17 16:49:00.254+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('a00652ac-0743-41c0-b8a2-acf153ecf240', 'S49R2H2', 'c5cb9506-bedc-4ae3-b274-47aa1dce6fc1', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:00.430+00', '2026-03-17 16:49:00.430+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('68ed3722-9127-4f0c-a2ac-5ac78d507a83', 'S49R2H3', 'c5cb9506-bedc-4ae3-b274-47aa1dce6fc1', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:00.575+00', '2026-03-17 16:49:00.575+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('323602fe-ba9f-4bc1-8010-4f4ce4d5999b', 'S49R2H4', 'c5cb9506-bedc-4ae3-b274-47aa1dce6fc1', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:00.734+00', '2026-03-17 16:49:00.734+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('8fa118e2-190a-4e0a-b0a2-a96e78adcbca', 'S49R3H1', 'c5cb9506-bedc-4ae3-b274-47aa1dce6fc1', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:00.895+00', '2026-03-17 16:49:00.895+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('7c856d0a-19e6-47f6-8787-5241782cd9af', 'S49R3H2', 'c5cb9506-bedc-4ae3-b274-47aa1dce6fc1', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:01.055+00', '2026-03-17 16:49:01.055+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('90dea677-f72d-440f-bc0e-b76171e0a6c9', 'S49R3H3', 'c5cb9506-bedc-4ae3-b274-47aa1dce6fc1', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:01.215+00', '2026-03-17 16:49:01.215+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('cb543069-9223-4619-b5e6-d4b8730a0a2e', 'S49R3H4', 'c5cb9506-bedc-4ae3-b274-47aa1dce6fc1', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:01.735+00', '2026-03-17 16:49:01.735+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('f2c2b3d5-7865-4d82-8822-289d2da75c1c', 'S49R4H1', 'c5cb9506-bedc-4ae3-b274-47aa1dce6fc1', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:01.895+00', '2026-03-17 16:49:01.895+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('7962de53-c15c-4361-841d-b39efa2131b6', 'S49R4H2', 'c5cb9506-bedc-4ae3-b274-47aa1dce6fc1', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:02.072+00', '2026-03-17 16:49:02.072+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('254fa454-a026-44e6-85ff-cb636f63ed96', 'S49R4H3', 'c5cb9506-bedc-4ae3-b274-47aa1dce6fc1', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:02.250+00', '2026-03-17 16:49:02.250+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('ea09f878-f995-42fc-b7ce-dec0139d4576', 'S49R4H4', 'c5cb9506-bedc-4ae3-b274-47aa1dce6fc1', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:02.414+00', '2026-03-17 16:49:02.414+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('c03b8682-2d8f-41fe-86af-72ab14b34b43', 'S51R1H1', '04101c70-883e-46fa-904f-06df48e6f96a', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:02.595+00', '2026-03-17 16:49:02.595+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('a23459f6-996a-4939-bc65-30af558f020e', 'S51R1H2', '04101c70-883e-46fa-904f-06df48e6f96a', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:02.755+00', '2026-03-17 16:49:02.755+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('789b7008-bd7a-4e79-b6e7-6a2014440969', 'S51R1H3', '04101c70-883e-46fa-904f-06df48e6f96a', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:02.914+00', '2026-03-17 16:49:02.914+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('2e70381e-56aa-491a-8996-6d785ca0e8b4', 'S51R1H4', '04101c70-883e-46fa-904f-06df48e6f96a', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:03.075+00', '2026-03-17 16:49:03.075+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('20350fc8-df20-4bbf-a3b9-1c42e0a8354f', 'S51R2H1', '04101c70-883e-46fa-904f-06df48e6f96a', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:03.243+00', '2026-03-17 16:49:03.243+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('ab3da1b7-f952-4fa5-8988-82e9fcf75740', 'S51R2H2', '04101c70-883e-46fa-904f-06df48e6f96a', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:03.414+00', '2026-03-17 16:49:03.414+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('2b628231-9d3a-4aa8-8a2d-75f55f965681', 'S51R2H3', '04101c70-883e-46fa-904f-06df48e6f96a', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:03.590+00', '2026-03-17 16:49:03.590+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('3ae3a68a-1c8c-4cd2-acd2-b7d92f78223b', 'S51R2H4', '04101c70-883e-46fa-904f-06df48e6f96a', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:03.754+00', '2026-03-17 16:49:03.754+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('54864360-1f4b-47f4-b222-38df8f7527d5', 'S51R3H1', '04101c70-883e-46fa-904f-06df48e6f96a', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:03.915+00', '2026-03-17 16:49:03.915+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('203a4507-9d89-420e-9c6a-80774bbdfa5b', 'S51R3H2', '04101c70-883e-46fa-904f-06df48e6f96a', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:04.075+00', '2026-03-17 16:49:04.075+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('a3045f7b-c666-4d2a-a93d-af19a875c5db', 'S51R3H3', '04101c70-883e-46fa-904f-06df48e6f96a', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:04.235+00', '2026-03-17 16:49:04.235+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('3c592035-df7b-4b06-a86c-67277bdc004a', 'S51R3H4', '04101c70-883e-46fa-904f-06df48e6f96a', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:04.403+00', '2026-03-17 16:49:04.403+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('38cb99d2-287e-4bc0-bc31-917ed9401fc8', 'S51R4H1', '04101c70-883e-46fa-904f-06df48e6f96a', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:04.554+00', '2026-03-17 16:49:04.554+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('439c8132-f975-4555-8a7d-5dd6b1435c3e', 'S51R4H2', '04101c70-883e-46fa-904f-06df48e6f96a', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:04.714+00', '2026-03-17 16:49:04.714+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('4c7a6594-a550-4863-acbc-e4661eb3b151', 'S51R4H3', '04101c70-883e-46fa-904f-06df48e6f96a', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:04.883+00', '2026-03-17 16:49:04.883+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('24e5e5a9-4476-483e-b07a-1f2522dcbe8b', 'S51R4H4', '04101c70-883e-46fa-904f-06df48e6f96a', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:05.062+00', '2026-03-17 16:49:05.062+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('9000afa7-b5e7-42b0-8565-1a68c09ac799', 'S53R1H1', '19e2e045-92cf-4519-b4f9-119e21304e80', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:05.222+00', '2026-03-17 16:49:05.222+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('d5009c08-6b0e-4023-8c67-bae6852728c5', 'S53R1H2', '19e2e045-92cf-4519-b4f9-119e21304e80', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:05.375+00', '2026-03-17 16:49:05.375+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('5ebb23f0-aa2c-425a-8b5d-50da08adee62', 'S53R1H3', '19e2e045-92cf-4519-b4f9-119e21304e80', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:05.550+00', '2026-03-17 16:49:05.550+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('dce19445-35df-4c7b-a523-19388f0af50c', 'S53R1H4', '19e2e045-92cf-4519-b4f9-119e21304e80', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:05.715+00', '2026-03-17 16:49:05.715+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('9c57c320-394b-41ef-80d5-0b3f09f57111', 'S53R2H1', '19e2e045-92cf-4519-b4f9-119e21304e80', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:05.874+00', '2026-03-17 16:49:05.874+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('46e8ec74-eec5-4cc7-b758-566e2eb30d85', 'S53R2H2', '19e2e045-92cf-4519-b4f9-119e21304e80', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:06.035+00', '2026-03-17 16:49:06.035+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('2278c23c-f0ea-479e-8d21-92e9da4d1411', 'S53R2H3', '19e2e045-92cf-4519-b4f9-119e21304e80', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:06.196+00', '2026-03-17 16:49:06.196+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('e210074d-acf2-44d3-8a3b-fe2bcf2725e0', 'S53R2H4', '19e2e045-92cf-4519-b4f9-119e21304e80', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:06.354+00', '2026-03-17 16:49:06.354+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('b2a3fef3-769f-46e5-9242-f7d5532ed1f2', 'S53R3H1', '19e2e045-92cf-4519-b4f9-119e21304e80', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:06.515+00', '2026-03-17 16:49:06.515+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('f699fcfe-bc9b-4c0c-bd35-6847590bfb0b', 'S53R3H2', '19e2e045-92cf-4519-b4f9-119e21304e80', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:06.714+00', '2026-03-17 16:49:06.714+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('71f79f03-6f18-4d65-8340-8e7dbe636478', 'S53R3H3', '19e2e045-92cf-4519-b4f9-119e21304e80', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:06.892+00', '2026-03-17 16:49:06.892+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('b9f85dba-c0b4-4637-b68f-0f6c19d426dd', 'S53R3H4', '19e2e045-92cf-4519-b4f9-119e21304e80', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:07.074+00', '2026-03-17 16:49:07.074+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('cc4d519d-d5f1-4b00-acc0-5626db8e6241', 'S53R4H1', '19e2e045-92cf-4519-b4f9-119e21304e80', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:07.255+00', '2026-03-17 16:49:07.255+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('7600ce03-1319-4ba9-a3e5-d4ce71f11cd0', 'S53R4H2', '19e2e045-92cf-4519-b4f9-119e21304e80', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:07.454+00', '2026-03-17 16:49:07.454+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('a97f9aae-4220-4e2e-b114-353fa87ac990', 'S53R4H3', '19e2e045-92cf-4519-b4f9-119e21304e80', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:07.691+00', '2026-03-17 16:49:07.691+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('ea1686e7-4b44-4d46-9db3-486581a292bd', 'S53R4H4', '19e2e045-92cf-4519-b4f9-119e21304e80', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:07.882+00', '2026-03-17 16:49:07.882+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('0e1e9042-eb89-43fb-a26e-e27c271b91a9', 'S55R1H1', 'c1b873a8-13ac-4a7c-a696-9b047d672292', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:08.062+00', '2026-03-17 16:49:08.062+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('dcdda41f-aeb9-4ae7-b194-8d198186db36', 'S55R1H2', 'c1b873a8-13ac-4a7c-a696-9b047d672292', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:08.295+00', '2026-03-17 16:49:08.295+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('ada10b06-bfca-4e69-87c0-27a977ae6719', 'S55R1H3', 'c1b873a8-13ac-4a7c-a696-9b047d672292', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:08.534+00', '2026-03-17 16:49:08.534+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('06501a09-ace5-418b-a872-d82648dd23ec', 'S55R1H4', 'c1b873a8-13ac-4a7c-a696-9b047d672292', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:08.695+00', '2026-03-17 16:49:08.695+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('a1f22d80-a5a3-4ded-878e-01d541c96b80', 'S55R2H1', 'c1b873a8-13ac-4a7c-a696-9b047d672292', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:08.855+00', '2026-03-17 16:49:08.855+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('fbcaeb31-c49b-4497-a31a-59a67fac3ca6', 'S55R2H2', 'c1b873a8-13ac-4a7c-a696-9b047d672292', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:09.014+00', '2026-03-17 16:49:09.014+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('9f1d12cf-18e2-4cfd-8deb-49d644d965a0', 'S55R2H3', 'c1b873a8-13ac-4a7c-a696-9b047d672292', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:09.195+00', '2026-03-17 16:49:09.195+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('befcdc49-3960-46cc-ad6f-dcee7b16b350', 'S55R2H4', 'c1b873a8-13ac-4a7c-a696-9b047d672292', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:09.435+00', '2026-03-17 16:49:09.435+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('2248b80c-7d7e-4c36-bb14-ca109cc5da54', 'S55R3H1', 'c1b873a8-13ac-4a7c-a696-9b047d672292', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:09.603+00', '2026-03-17 16:49:09.603+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('dc8fc7c2-e17a-4fb4-b9f1-0c2b4bec9198', 'S55R3H2', 'c1b873a8-13ac-4a7c-a696-9b047d672292', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:09.842+00', '2026-03-17 16:49:09.842+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('96f4d8d1-7bc7-4b6f-80ea-3434282f4074', 'S55R3H3', 'c1b873a8-13ac-4a7c-a696-9b047d672292', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:10.015+00', '2026-03-17 16:49:10.015+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('9fad93d3-e838-46bf-b58c-1ba9a45f1941', 'S55R3H4', 'c1b873a8-13ac-4a7c-a696-9b047d672292', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:10.175+00', '2026-03-17 16:49:10.175+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('c6b1c8fa-9f40-4847-90bb-364c61ca1745', 'S55R4H1', 'c1b873a8-13ac-4a7c-a696-9b047d672292', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:10.355+00', '2026-03-17 16:49:10.355+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('f42d884b-657d-4177-a091-837476f3b285', 'S55R4H2', 'c1b873a8-13ac-4a7c-a696-9b047d672292', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:10.514+00', '2026-03-17 16:49:10.514+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('def8f074-b272-4604-944b-3fa9f0ce2473', 'S55R4H3', 'c1b873a8-13ac-4a7c-a696-9b047d672292', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:10.674+00', '2026-03-17 16:49:10.674+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('2fcd7672-7071-479d-a5b5-3a16eb7e3fb2', 'S55R4H4', 'c1b873a8-13ac-4a7c-a696-9b047d672292', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:10.836+00', '2026-03-17 16:49:10.836+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('e100d3fd-22f4-4010-9e4e-c6008d9aea7a', 'S61R1H1', '203cecb6-e66d-4e8d-b43d-71a13a18fb0e', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:10.995+00', '2026-03-17 16:49:10.995+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('20f6f114-09b8-4845-85b4-a797251809ed', 'S61R1H2', '203cecb6-e66d-4e8d-b43d-71a13a18fb0e', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:11.155+00', '2026-03-17 16:49:11.155+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('5e316b8c-2eee-4af7-a167-0631cdf6ab54', 'S61R1H3', '203cecb6-e66d-4e8d-b43d-71a13a18fb0e', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:11.315+00', '2026-03-17 16:49:11.315+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('da6fcd4e-2fa2-416d-b5ab-17c9f910f650', 'S61R1H4', '203cecb6-e66d-4e8d-b43d-71a13a18fb0e', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:11.482+00', '2026-03-17 16:49:11.482+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('4cd92595-b892-4c7f-b10a-8102cd3af984', 'S61R1H5', '203cecb6-e66d-4e8d-b43d-71a13a18fb0e', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:11.662+00', '2026-03-17 16:49:11.662+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('c2f7c191-0336-4b30-a713-4f113921dad0', 'S61R2H1', '203cecb6-e66d-4e8d-b43d-71a13a18fb0e', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:11.823+00', '2026-03-17 16:49:11.823+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('812357a3-becd-4ded-bfb8-586535a3f48e', 'S61R2H2', '203cecb6-e66d-4e8d-b43d-71a13a18fb0e', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:11.983+00', '2026-03-17 16:49:11.983+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('2d82c645-11d3-4110-8edf-3686b7672458', 'S61R2H3', '203cecb6-e66d-4e8d-b43d-71a13a18fb0e', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:12.134+00', '2026-03-17 16:49:12.134+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('70af83ee-8a47-4400-a4c8-484ff8f1f8f0', 'S61R2H4', '203cecb6-e66d-4e8d-b43d-71a13a18fb0e', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:12.311+00', '2026-03-17 16:49:12.311+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('36db695a-fcff-42e0-8661-5343a77f2b01', 'S61R2H5', '203cecb6-e66d-4e8d-b43d-71a13a18fb0e', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:12.475+00', '2026-03-17 16:49:12.475+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('ccc0c880-aa64-4f20-b822-2713cbb878ce', 'S61R3H1', '203cecb6-e66d-4e8d-b43d-71a13a18fb0e', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:12.635+00', '2026-03-17 16:49:12.635+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('f1b721e2-20aa-4ff9-8be9-2815a6a0dfd9', 'S61R3H2', '203cecb6-e66d-4e8d-b43d-71a13a18fb0e', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:12.794+00', '2026-03-17 16:49:12.794+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('50e342b3-427c-4c75-93c1-3832df3f5866', 'S61R3H3', '203cecb6-e66d-4e8d-b43d-71a13a18fb0e', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:12.954+00', '2026-03-17 16:49:12.954+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('fdba2e5d-f843-41ee-922e-361920349b09', 'S61R3H4', '203cecb6-e66d-4e8d-b43d-71a13a18fb0e', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:13.202+00', '2026-03-17 16:49:13.202+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('c7a16c81-3359-4b48-810d-b696ced7acaa', 'S61R3H5', '203cecb6-e66d-4e8d-b43d-71a13a18fb0e', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:13.374+00', '2026-03-17 16:49:13.374+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('47bb34cd-1b4b-405a-a781-10784996cc5f', 'S61R4H1', '203cecb6-e66d-4e8d-b43d-71a13a18fb0e', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:13.535+00', '2026-03-17 16:49:13.535+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('b60af388-b9d1-4d3f-93ed-b941fd9d45e2', 'S61R4H2', '203cecb6-e66d-4e8d-b43d-71a13a18fb0e', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:13.734+00', '2026-03-17 16:49:13.734+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('091ddd3f-7f50-4b81-83b0-2e16272cbdfc', 'S61R4H3', '203cecb6-e66d-4e8d-b43d-71a13a18fb0e', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:13.902+00', '2026-03-17 16:49:13.902+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('f1126cf2-9a7c-49ec-b094-990e585b370b', 'S61R4H4', '203cecb6-e66d-4e8d-b43d-71a13a18fb0e', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:14.094+00', '2026-03-17 16:49:14.094+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('21244402-8462-4277-8d93-c5dcb3b075bc', 'S61R4H5', '203cecb6-e66d-4e8d-b43d-71a13a18fb0e', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:14.275+00', '2026-03-17 16:49:14.275+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('4b6506dd-bb9e-42c8-9046-8149f49924cf', 'S61R5H1', '203cecb6-e66d-4e8d-b43d-71a13a18fb0e', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:14.436+00', '2026-03-17 16:49:14.436+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('11a381ca-5a08-4e92-a8e9-579821e05131', 'S61R5H2', '203cecb6-e66d-4e8d-b43d-71a13a18fb0e', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:14.603+00', '2026-03-17 16:49:14.603+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('35459dc7-cbbe-49fe-8ca5-11dcdc6b4f27', 'S61R5H3', '203cecb6-e66d-4e8d-b43d-71a13a18fb0e', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:14.843+00', '2026-03-17 16:49:14.843+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('a2a47eb3-561d-4796-9929-d90c7722a860', 'S61R5H4', '203cecb6-e66d-4e8d-b43d-71a13a18fb0e', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:15.071+00', '2026-03-17 16:49:15.071+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('4bc7aee1-83b8-4954-ae6e-8e96dd1f5478', 'S61R5H5', '203cecb6-e66d-4e8d-b43d-71a13a18fb0e', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:15.274+00', '2026-03-17 16:49:15.274+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('fd1b4391-33cd-4a59-9fbb-dcdbbb9eb6be', 'S61R6H1', '203cecb6-e66d-4e8d-b43d-71a13a18fb0e', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 6, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:15.436+00', '2026-03-17 16:49:15.436+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('fc642b07-bf3d-41d1-b6ed-7d0a247a3d54', 'S61R6H2', '203cecb6-e66d-4e8d-b43d-71a13a18fb0e', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 6, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:15.604+00', '2026-03-17 16:49:15.604+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('a4ea3b7b-bffa-45fd-9af1-3bc58c70f5fd', 'S61R6H3', '203cecb6-e66d-4e8d-b43d-71a13a18fb0e', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 6, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:15.814+00', '2026-03-17 16:49:15.814+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('cff4c3bd-e3f6-4886-a3cc-abf3608d6d64', 'S61R6H4', '203cecb6-e66d-4e8d-b43d-71a13a18fb0e', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 6, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:16.034+00', '2026-03-17 16:49:16.034+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('9c1beeb3-4e9b-4b21-abf0-ba6d252957ef', 'S61R6H5', '203cecb6-e66d-4e8d-b43d-71a13a18fb0e', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 6, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:16.314+00', '2026-03-17 16:49:16.314+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('60ad0e8d-d2d0-4443-98f9-4348fedc167e', 'S63R1H1', '85718d1f-57cf-42d8-8562-eeed13123d6c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:16.512+00', '2026-03-17 16:49:16.512+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('a806efb4-aa35-468a-9781-a93ba394e55c', 'S63R1H2', '85718d1f-57cf-42d8-8562-eeed13123d6c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:16.678+00', '2026-03-17 16:49:16.678+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('74725d84-0229-4ec4-95ed-11af248e5662', 'S63R1H3', '85718d1f-57cf-42d8-8562-eeed13123d6c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:16.854+00', '2026-03-17 16:49:16.854+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('504f7a2d-e63d-4dd1-8b94-81252a8195be', 'S63R1H4', '85718d1f-57cf-42d8-8562-eeed13123d6c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:17.014+00', '2026-03-17 16:49:17.014+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('6307906b-5e61-4f77-8863-76039d861752', 'S63R1H5', '85718d1f-57cf-42d8-8562-eeed13123d6c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:17.195+00', '2026-03-17 16:49:17.195+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('7c7b7980-d656-4763-a955-906d5a9d1509', 'S63R2H1', '85718d1f-57cf-42d8-8562-eeed13123d6c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:17.362+00', '2026-03-17 16:49:17.362+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('0c9c244c-0091-4902-ba44-1f8b1a6d95d1', 'S63R2H2', '85718d1f-57cf-42d8-8562-eeed13123d6c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:17.574+00', '2026-03-17 16:49:17.574+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('3ac2ed5d-6c2e-4452-adf0-e68def7ca4d6', 'S63R2H3', '85718d1f-57cf-42d8-8562-eeed13123d6c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:17.823+00', '2026-03-17 16:49:17.823+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('d309f796-0889-4adc-942c-dcee69233690', 'S63R2H4', '85718d1f-57cf-42d8-8562-eeed13123d6c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:18.015+00', '2026-03-17 16:49:18.015+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('4bd080c4-c4ca-4307-8b1f-72458ce1ceda', 'S63R2H5', '85718d1f-57cf-42d8-8562-eeed13123d6c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:18.222+00', '2026-03-17 16:49:18.222+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('14cb2acd-56f3-4d79-b4af-dad0b006d2f5', 'S63R3H1', '85718d1f-57cf-42d8-8562-eeed13123d6c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:18.434+00', '2026-03-17 16:49:18.434+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('690609b1-4bb5-4b77-a48f-9f4c7a527ef0', 'S63R3H2', '85718d1f-57cf-42d8-8562-eeed13123d6c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:18.603+00', '2026-03-17 16:49:18.603+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('de525da0-ab14-4220-b228-bc52c819d48d', 'S63R3H3', '85718d1f-57cf-42d8-8562-eeed13123d6c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:18.815+00', '2026-03-17 16:49:18.815+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('98a68da6-20d7-424a-93f2-b85c9a1dc838', 'S63R3H4', '85718d1f-57cf-42d8-8562-eeed13123d6c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:18.991+00', '2026-03-17 16:49:18.991+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('e18feb58-f99a-4a1a-b769-b54c1118ae7d', 'S63R3H5', '85718d1f-57cf-42d8-8562-eeed13123d6c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:19.135+00', '2026-03-17 16:49:19.135+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('51816089-dde6-47d2-b6bb-e844616977c4', 'S63R4H1', '85718d1f-57cf-42d8-8562-eeed13123d6c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:19.383+00', '2026-03-17 16:49:19.383+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('385b11c7-5673-415b-9bf3-d4dfc554f0df', 'S63R4H2', '85718d1f-57cf-42d8-8562-eeed13123d6c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:19.534+00', '2026-03-17 16:49:19.534+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('1dfd0c7f-1b48-420c-adcc-fe8b4f326529', 'S63R4H3', '85718d1f-57cf-42d8-8562-eeed13123d6c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:19.750+00', '2026-03-17 16:49:19.750+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('1d2120cc-28c9-4feb-a96e-9c895a5f81a6', 'S63R4H4', '85718d1f-57cf-42d8-8562-eeed13123d6c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:19.994+00', '2026-03-17 16:49:19.994+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('a646e99a-76de-4fb4-9658-d6f86b65c9c8', 'S63R4H5', '85718d1f-57cf-42d8-8562-eeed13123d6c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:20.195+00', '2026-03-17 16:49:20.195+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('df76aafc-65c5-42fa-906b-af092442f387', 'S63R5H1', '85718d1f-57cf-42d8-8562-eeed13123d6c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:20.375+00', '2026-03-17 16:49:20.375+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('43144232-2a8f-4e51-98ce-9230868b99b5', 'S63R5H2', '85718d1f-57cf-42d8-8562-eeed13123d6c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:20.554+00', '2026-03-17 16:49:20.554+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('2979f098-d5aa-4b14-9934-0ad62e452d71', 'S63R5H3', '85718d1f-57cf-42d8-8562-eeed13123d6c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:20.714+00', '2026-03-17 16:49:20.714+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('4c5d288a-8407-420a-ae07-50ecaa2fb309', 'S63R5H4', '85718d1f-57cf-42d8-8562-eeed13123d6c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:20.904+00', '2026-03-17 16:49:20.904+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('24f40bd5-989f-46ae-9847-4b8a85f5fdd8', 'S63R5H5', '85718d1f-57cf-42d8-8562-eeed13123d6c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:21.114+00', '2026-03-17 16:49:21.114+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('87e757f3-3fbe-4a47-8836-1a8bbce8564c', 'S63R6H1', '85718d1f-57cf-42d8-8562-eeed13123d6c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 6, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:21.279+00', '2026-03-17 16:49:21.279+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('a24572f0-aad4-478a-8318-75f9234e9d8a', 'S63R6H2', '85718d1f-57cf-42d8-8562-eeed13123d6c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 6, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:21.454+00', '2026-03-17 16:49:21.454+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('1ce38f49-9d7a-4b10-bc22-7c381713dd9e', 'S63R6H3', '85718d1f-57cf-42d8-8562-eeed13123d6c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 6, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:21.614+00', '2026-03-17 16:49:21.614+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('c647f90b-fe10-452c-9c3a-4dbdf53ccf5d', 'S63R6H4', '85718d1f-57cf-42d8-8562-eeed13123d6c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 6, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:21.790+00', '2026-03-17 16:49:21.790+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('351b9589-3767-4754-ac68-1659c7428aac', 'S63R6H5', '85718d1f-57cf-42d8-8562-eeed13123d6c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 6, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:21.954+00', '2026-03-17 16:49:21.954+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('d7c79905-69e8-43a8-9b19-81356453a26b', 'S65R1H1', 'ceb38ff1-6f08-4e7a-9506-ea3f56d57817', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:22.155+00', '2026-03-17 16:49:22.155+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('06446d30-1ecd-4fa9-bf26-e57ec4b4e03f', 'S65R1H2', 'ceb38ff1-6f08-4e7a-9506-ea3f56d57817', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:22.317+00', '2026-03-17 16:49:22.317+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('5302ceab-6967-4f70-8232-a7585796aded', 'S65R1H3', 'ceb38ff1-6f08-4e7a-9506-ea3f56d57817', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:22.475+00', '2026-03-17 16:49:22.475+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('4aa451bd-2471-49d1-9fc4-8b05e83b5408', 'S65R1H4', 'ceb38ff1-6f08-4e7a-9506-ea3f56d57817', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:22.639+00', '2026-03-17 16:49:22.639+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('321ccafb-5fd6-487e-bc7d-9bb628f30b2b', 'S65R1H5', 'ceb38ff1-6f08-4e7a-9506-ea3f56d57817', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:22.794+00', '2026-03-17 16:49:22.794+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('5d03acc7-c012-4830-8de5-5ae226c6164c', 'S65R2H1', 'ceb38ff1-6f08-4e7a-9506-ea3f56d57817', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:22.955+00', '2026-03-17 16:49:22.955+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('737e227d-29a1-4f11-a523-f7a1d3a83000', 'S65R2H2', 'ceb38ff1-6f08-4e7a-9506-ea3f56d57817', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:23.114+00', '2026-03-17 16:49:23.114+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('0677437a-d130-4a19-8cb2-3fbedc304e7f', 'S65R2H3', 'ceb38ff1-6f08-4e7a-9506-ea3f56d57817', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:23.322+00', '2026-03-17 16:49:23.322+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('b0cac95e-c189-455d-80f1-b7fa55b82fdc', 'S65R2H4', 'ceb38ff1-6f08-4e7a-9506-ea3f56d57817', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:23.494+00', '2026-03-17 16:49:23.494+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('9d3c61f2-d125-4949-94e0-2b6648a03018', 'S65R2H5', 'ceb38ff1-6f08-4e7a-9506-ea3f56d57817', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:23.654+00', '2026-03-17 16:49:23.654+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('89d3ff34-7fb4-4000-b104-c8059457cf37', 'S65R3H1', 'ceb38ff1-6f08-4e7a-9506-ea3f56d57817', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:23.830+00', '2026-03-17 16:49:23.830+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('ac19487b-8bf8-4088-9f0f-ec83fea4ddf4', 'S65R3H2', 'ceb38ff1-6f08-4e7a-9506-ea3f56d57817', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:23.994+00', '2026-03-17 16:49:23.994+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('715654da-75e9-4764-acec-528f307c833f', 'S65R3H3', 'ceb38ff1-6f08-4e7a-9506-ea3f56d57817', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:24.163+00', '2026-03-17 16:49:24.163+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('35162602-ed6b-4068-98d8-fdf40c3b088b', 'S65R3H4', 'ceb38ff1-6f08-4e7a-9506-ea3f56d57817', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:24.342+00', '2026-03-17 16:49:24.342+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('9e860508-f840-4082-8a74-92484ab5dd3b', 'S65R3H5', 'ceb38ff1-6f08-4e7a-9506-ea3f56d57817', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:24.502+00', '2026-03-17 16:49:24.502+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('45c9a5c5-c6e4-48cd-aa05-06a8e5e98dd1', 'S65R4H1', 'ceb38ff1-6f08-4e7a-9506-ea3f56d57817', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:24.663+00', '2026-03-17 16:49:24.663+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('3f8f33b4-2c7d-44ec-9d45-db2e7fdf48ec', 'S65R4H2', 'ceb38ff1-6f08-4e7a-9506-ea3f56d57817', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:24.823+00', '2026-03-17 16:49:24.823+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('4c677e5c-6bca-4915-b5b1-b69dab8cd6e8', 'S65R4H3', 'ceb38ff1-6f08-4e7a-9506-ea3f56d57817', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:24.983+00', '2026-03-17 16:49:24.983+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('1b826fa8-2197-4bfc-b1a1-1b2b118b939d', 'S65R4H4', 'ceb38ff1-6f08-4e7a-9506-ea3f56d57817', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:25.135+00', '2026-03-17 16:49:25.135+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('0bc80dd3-d9d3-4385-b47d-c283808bc6c0', 'S65R4H5', 'ceb38ff1-6f08-4e7a-9506-ea3f56d57817', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:25.312+00', '2026-03-17 16:49:25.312+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('f675ced6-dce5-438d-9bdb-dab850a0fa19', 'S65R5H1', 'ceb38ff1-6f08-4e7a-9506-ea3f56d57817', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:25.474+00', '2026-03-17 16:49:25.474+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('c7bf22e7-8421-4be2-b55a-ce4f9cd12cbb', 'S65R5H2', 'ceb38ff1-6f08-4e7a-9506-ea3f56d57817', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:25.642+00', '2026-03-17 16:49:25.642+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('a88795e0-7ec4-493f-9639-4c5a12bdf9b0', 'S65R5H3', 'ceb38ff1-6f08-4e7a-9506-ea3f56d57817', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:25.855+00', '2026-03-17 16:49:25.855+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('1ffa50b2-22f2-4146-8f8c-00c6ce19f13d', 'S65R5H4', 'ceb38ff1-6f08-4e7a-9506-ea3f56d57817', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:26.014+00', '2026-03-17 16:49:26.014+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('c498c26a-77cf-4740-b9ef-e0bd1b9a7e03', 'S65R5H5', 'ceb38ff1-6f08-4e7a-9506-ea3f56d57817', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:26.215+00', '2026-03-17 16:49:26.215+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('b79b0fc4-965b-4d37-8373-8ee03ce07524', 'S65R6H1', 'ceb38ff1-6f08-4e7a-9506-ea3f56d57817', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 6, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:26.415+00', '2026-03-17 16:49:26.415+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('c8677ef1-e2d9-4171-90aa-eeae0656a230', 'S65R6H2', 'ceb38ff1-6f08-4e7a-9506-ea3f56d57817', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 6, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:26.635+00', '2026-03-17 16:49:26.635+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('8782a439-2ef8-4481-bd5e-8d0cee921593', 'S65R6H3', 'ceb38ff1-6f08-4e7a-9506-ea3f56d57817', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 6, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:26.843+00', '2026-03-17 16:49:26.843+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('0e4d4efe-d0bb-411a-8b84-1849a7938ba6', 'S65R6H4', 'ceb38ff1-6f08-4e7a-9506-ea3f56d57817', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 6, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:27.054+00', '2026-03-17 16:49:27.054+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('6bf8257c-9c3c-4f9a-a70b-fe27510eb2b7', 'S65R6H5', 'ceb38ff1-6f08-4e7a-9506-ea3f56d57817', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 6, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:27.214+00', '2026-03-17 16:49:27.214+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('bbded68f-e6ad-4ee3-b790-baf9a8e6cb5b', 'S67R1H1', 'b9f8a44a-6304-47eb-8474-41f29743d6b0', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:27.380+00', '2026-03-17 16:49:27.380+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('7090824c-9aa5-4a04-91e9-527b2a036e51', 'S67R1H2', 'b9f8a44a-6304-47eb-8474-41f29743d6b0', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:27.534+00', '2026-03-17 16:49:27.534+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('fa08fe56-f0de-438b-b1cf-c0e28337c07a', 'S67R1H3', 'b9f8a44a-6304-47eb-8474-41f29743d6b0', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:27.702+00', '2026-03-17 16:49:27.702+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('0075626e-1324-4b1a-8759-2370114e7e35', 'S67R1H4', 'b9f8a44a-6304-47eb-8474-41f29743d6b0', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:27.855+00', '2026-03-17 16:49:27.855+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('a91a9113-c052-4be7-b2e9-7387470e737a', 'S67R1H5', 'b9f8a44a-6304-47eb-8474-41f29743d6b0', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:28.014+00', '2026-03-17 16:49:28.014+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('8fc3ff52-d36c-472c-807a-a3f728c0bb0d', 'S67R2H1', 'b9f8a44a-6304-47eb-8474-41f29743d6b0', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:28.190+00', '2026-03-17 16:49:28.190+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('5683b2d8-e858-4866-bbbf-28d5fb51fcbb', 'S67R2H2', 'b9f8a44a-6304-47eb-8474-41f29743d6b0', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:28.355+00', '2026-03-17 16:49:28.355+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('272af9ab-5af7-467f-832e-4ccb6d9f9324', 'S67R2H3', 'b9f8a44a-6304-47eb-8474-41f29743d6b0', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:28.514+00', '2026-03-17 16:49:28.514+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('ab4778d8-6db6-47a4-b5b8-c3e5cc50ec17', 'S67R2H4', 'b9f8a44a-6304-47eb-8474-41f29743d6b0', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:28.675+00', '2026-03-17 16:49:28.675+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('57d9d997-ee8e-42d5-b781-8969e6a94955', 'S67R2H5', 'b9f8a44a-6304-47eb-8474-41f29743d6b0', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:28.835+00', '2026-03-17 16:49:28.835+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('fb3fc71a-3f8f-467f-a4e5-8adea8e4e79d', 'S67R3H1', 'b9f8a44a-6304-47eb-8474-41f29743d6b0', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:29.003+00', '2026-03-17 16:49:29.003+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('b5100561-a812-4128-89c8-5cbbc7f3f938', 'S67R3H2', 'b9f8a44a-6304-47eb-8474-41f29743d6b0', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:29.162+00', '2026-03-17 16:49:29.162+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('5c7fc702-da3d-414b-b818-b813f0d7456e', 'S67R3H3', 'b9f8a44a-6304-47eb-8474-41f29743d6b0', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:29.314+00', '2026-03-17 16:49:29.314+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('8bcc51ab-e77b-461b-b9b7-c00d96ec6948', 'S67R3H4', 'b9f8a44a-6304-47eb-8474-41f29743d6b0', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:29.474+00', '2026-03-17 16:49:29.474+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('e57bbfcb-69d6-4961-8740-c7e004a7ffcc', 'S67R3H5', 'b9f8a44a-6304-47eb-8474-41f29743d6b0', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:29.634+00', '2026-03-17 16:49:29.634+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('9c634eb7-6cb7-47a5-8953-17dad331e971', 'S67R4H1', 'b9f8a44a-6304-47eb-8474-41f29743d6b0', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:29.803+00', '2026-03-17 16:49:29.803+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('78e20292-35ba-4816-9bb3-23b955d72121', 'S67R4H2', 'b9f8a44a-6304-47eb-8474-41f29743d6b0', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:29.955+00', '2026-03-17 16:49:29.955+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('3aa9c688-74fc-4aae-a750-8cf1fe5ee40f', 'S67R4H3', 'b9f8a44a-6304-47eb-8474-41f29743d6b0', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:30.114+00', '2026-03-17 16:49:30.114+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('fd421b7f-7087-42fd-a6ed-0d5159111482', 'S67R4H4', 'b9f8a44a-6304-47eb-8474-41f29743d6b0', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:30.314+00', '2026-03-17 16:49:30.314+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('df829e72-a324-48fb-b093-48ebb59e2fcb', 'S67R4H5', 'b9f8a44a-6304-47eb-8474-41f29743d6b0', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:30.474+00', '2026-03-17 16:49:30.474+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('559864d3-773e-4d7d-b101-b91aae7da488', 'S67R5H1', 'b9f8a44a-6304-47eb-8474-41f29743d6b0', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:30.694+00', '2026-03-17 16:49:30.694+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('839ec2c0-9e7f-4c65-ab89-481ae9029111', 'S67R5H2', 'b9f8a44a-6304-47eb-8474-41f29743d6b0', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:30.874+00', '2026-03-17 16:49:30.874+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('8c9cacc1-4caa-4808-b271-181b24bcce8d', 'S67R5H3', 'b9f8a44a-6304-47eb-8474-41f29743d6b0', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:31.095+00', '2026-03-17 16:49:31.095+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('3c17044d-a23c-4b21-95f6-fe82c37b00a0', 'S67R5H4', 'b9f8a44a-6304-47eb-8474-41f29743d6b0', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:31.294+00', '2026-03-17 16:49:31.294+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('c02b1dc8-0a19-40da-9a24-50e7781b700f', 'S67R5H5', 'b9f8a44a-6304-47eb-8474-41f29743d6b0', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:31.495+00', '2026-03-17 16:49:31.495+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('25b0fb6c-9ba2-43ea-85e6-32fcfacf3cf1', 'S67R6H1', 'b9f8a44a-6304-47eb-8474-41f29743d6b0', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 6, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:31.695+00', '2026-03-17 16:49:31.695+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('fbcc7818-85bb-4bca-9a46-6d70d3c7df16', 'S67R6H2', 'b9f8a44a-6304-47eb-8474-41f29743d6b0', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 6, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:31.954+00', '2026-03-17 16:49:31.954+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('74d7cf80-0d1d-4820-9e75-05aecd631759', 'S67R6H3', 'b9f8a44a-6304-47eb-8474-41f29743d6b0', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 6, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:32.170+00', '2026-03-17 16:49:32.170+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('287938fa-b421-4571-b43e-32e243f09ab1', 'S67R6H4', 'b9f8a44a-6304-47eb-8474-41f29743d6b0', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 6, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:32.342+00', '2026-03-17 16:49:32.342+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('69efa0e7-5a2d-41aa-8db0-c4678e74becf', 'S67R6H5', 'b9f8a44a-6304-47eb-8474-41f29743d6b0', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 6, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:32.534+00', '2026-03-17 16:49:32.534+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('cc33f899-d7d2-44f9-b470-5bd2dc963a2a', 'S69R1H1', 'be725133-f6e8-4302-b87f-9e091196c971', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:32.734+00', '2026-03-17 16:49:32.734+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('b614b2eb-1f9e-4b86-a05a-cbb64975bce0', 'S69R1H2', 'be725133-f6e8-4302-b87f-9e091196c971', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:32.955+00', '2026-03-17 16:49:32.955+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('fcdba4e8-e892-4b40-be04-77f0da63c8ed', 'S69R1H3', 'be725133-f6e8-4302-b87f-9e091196c971', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:33.154+00', '2026-03-17 16:49:33.154+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('43e463dc-98a9-4ef2-9e95-d66c6b7d13e3', 'S69R1H4', 'be725133-f6e8-4302-b87f-9e091196c971', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:33.355+00', '2026-03-17 16:49:33.355+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('76a650cb-2fe1-431b-bae8-d3c628703c35', 'S69R1H5', 'be725133-f6e8-4302-b87f-9e091196c971', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:33.554+00', '2026-03-17 16:49:33.554+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('ae30056f-efd4-4829-889e-f5511220761e', 'S69R2H1', 'be725133-f6e8-4302-b87f-9e091196c971', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:33.779+00', '2026-03-17 16:49:33.779+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('e0424dfa-3da2-49fb-a8d4-9d0e2de98991', 'S69R2H2', 'be725133-f6e8-4302-b87f-9e091196c971', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:33.975+00', '2026-03-17 16:49:33.975+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('6280afbb-b0af-4efb-b40c-cefa3cd3398c', 'S69R2H3', 'be725133-f6e8-4302-b87f-9e091196c971', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:34.155+00', '2026-03-17 16:49:34.155+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('f56ca7ce-4734-4a07-94f4-8ed5cd415ef4', 'S69R2H4', 'be725133-f6e8-4302-b87f-9e091196c971', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:34.363+00', '2026-03-17 16:49:34.363+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('ab793985-e91e-4cfd-85c8-0263371ce943', 'S69R2H5', 'be725133-f6e8-4302-b87f-9e091196c971', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:34.575+00', '2026-03-17 16:49:34.575+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('54124400-a6cf-41e7-b6b1-c35c06e731ba', 'S69R3H1', 'be725133-f6e8-4302-b87f-9e091196c971', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:34.775+00', '2026-03-17 16:49:34.775+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('3614afa2-6d5d-40da-9831-16bc279896df', 'S69R3H2', 'be725133-f6e8-4302-b87f-9e091196c971', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:34.995+00', '2026-03-17 16:49:34.995+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('726c85bf-f07b-48d7-8e12-1516e9e87e64', 'S69R3H3', 'be725133-f6e8-4302-b87f-9e091196c971', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:35.195+00', '2026-03-17 16:49:35.195+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('fd68688d-19f5-489d-999c-441ead9bfd8f', 'S69R3H4', 'be725133-f6e8-4302-b87f-9e091196c971', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:35.395+00', '2026-03-17 16:49:35.395+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('c50f8164-8cb0-4ab2-a089-84a4660075f1', 'S69R3H5', 'be725133-f6e8-4302-b87f-9e091196c971', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:35.595+00', '2026-03-17 16:49:35.595+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('06c98779-78ab-49eb-89e7-8b3f762be78e', 'S69R4H1', 'be725133-f6e8-4302-b87f-9e091196c971', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:35.762+00', '2026-03-17 16:49:35.762+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('24de525f-2644-46c3-8438-18b0eac9e982', 'S69R4H2', 'be725133-f6e8-4302-b87f-9e091196c971', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:35.935+00', '2026-03-17 16:49:35.935+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('ad5544c0-118f-4621-a2e7-630173f83bd3', 'S69R4H3', 'be725133-f6e8-4302-b87f-9e091196c971', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:36.155+00', '2026-03-17 16:49:36.155+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('9cf3a4a0-b080-4b7f-b9b6-fea7e49a77d2', 'S69R4H4', 'be725133-f6e8-4302-b87f-9e091196c971', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:36.355+00', '2026-03-17 16:49:36.355+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('2fa301c5-ee34-4605-abbc-db86e592aa87', 'S69R4H5', 'be725133-f6e8-4302-b87f-9e091196c971', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:36.575+00', '2026-03-17 16:49:36.575+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('bcadc999-6c83-4a5b-9e0b-0db60d874da8', 'S69R5H1', 'be725133-f6e8-4302-b87f-9e091196c971', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:36.775+00', '2026-03-17 16:49:36.775+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('ece866e7-9431-46e2-889c-b70307ff1829', 'S69R5H2', 'be725133-f6e8-4302-b87f-9e091196c971', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:36.995+00', '2026-03-17 16:49:36.995+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('e0b0acfb-eeef-442c-ab89-dbbbe4309d46', 'S69R5H3', 'be725133-f6e8-4302-b87f-9e091196c971', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:37.196+00', '2026-03-17 16:49:37.196+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('5002d937-5d8b-457f-a413-1977b822a452', 'S69R5H4', 'be725133-f6e8-4302-b87f-9e091196c971', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:37.354+00', '2026-03-17 16:49:37.354+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('8598f289-cb74-4d0f-8b6e-348cc805508d', 'S69R5H5', 'be725133-f6e8-4302-b87f-9e091196c971', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:37.575+00', '2026-03-17 16:49:37.575+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('db846498-74a6-4216-9f93-804ba6aa0437', 'S69R6H1', 'be725133-f6e8-4302-b87f-9e091196c971', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 6, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:37.795+00', '2026-03-17 16:49:37.795+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('3f6cd65e-6847-495e-bfba-53114ff90a9c', 'S69R6H2', 'be725133-f6e8-4302-b87f-9e091196c971', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 6, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:38.035+00', '2026-03-17 16:49:38.035+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('9b23b8d9-4025-4d81-a508-538ce2ff1d1c', 'S69R6H3', 'be725133-f6e8-4302-b87f-9e091196c971', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 6, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:38.215+00', '2026-03-17 16:49:38.215+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('47bcb52f-00c8-42cb-a55a-723515abc101', 'S69R6H4', 'be725133-f6e8-4302-b87f-9e091196c971', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 6, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:38.375+00', '2026-03-17 16:49:38.375+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('26e34544-e907-4276-82e8-7f9113fd2bbb', 'S69R6H5', 'be725133-f6e8-4302-b87f-9e091196c971', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 6, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:38.575+00', '2026-03-17 16:49:38.575+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('f0be97ec-261c-496e-a10c-08e7a1a4749f', 'S71R1H1', 'd433895b-d55d-4075-b062-aa925d066d5d', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:38.735+00', '2026-03-17 16:49:38.735+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('f0bb014b-db7a-4d41-ae61-468a7c605377', 'S71R1H2', 'd433895b-d55d-4075-b062-aa925d066d5d', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:38.975+00', '2026-03-17 16:49:38.975+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('9606f4ba-5f00-4dc2-a860-9b552787de72', 'S71R1H3', 'd433895b-d55d-4075-b062-aa925d066d5d', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:39.183+00', '2026-03-17 16:49:39.183+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('50bcfec6-032f-4516-9d9e-656816326f33', 'S71R1H4', 'd433895b-d55d-4075-b062-aa925d066d5d', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:39.395+00', '2026-03-17 16:49:39.395+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('0edbd630-7f65-47cb-bf3f-e7de5afede3b', 'S71R1H5', 'd433895b-d55d-4075-b062-aa925d066d5d', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:39.575+00', '2026-03-17 16:49:39.575+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('ab50ec09-6d6a-4ca5-aa6a-377d522f5f29', 'S71R2H1', 'd433895b-d55d-4075-b062-aa925d066d5d', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:39.775+00', '2026-03-17 16:49:39.775+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('bb6b0406-9a49-4f82-9bb3-68fa8894dad8', 'S71R2H2', 'd433895b-d55d-4075-b062-aa925d066d5d', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:39.975+00', '2026-03-17 16:49:39.975+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('a7a4586a-15c9-4405-bad7-6351a2751e64', 'S71R2H3', 'd433895b-d55d-4075-b062-aa925d066d5d', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:40.143+00', '2026-03-17 16:49:40.143+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('d1d93da5-bae1-47a9-8477-3da29fc6c9d2', 'S71R2H4', 'd433895b-d55d-4075-b062-aa925d066d5d', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:40.355+00', '2026-03-17 16:49:40.355+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('e90aad4f-d416-4e47-9732-5fa5998270b0', 'S71R2H5', 'd433895b-d55d-4075-b062-aa925d066d5d', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:40.515+00', '2026-03-17 16:49:40.515+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('55cc76d4-0bc5-4cba-b3e9-6d48301136a5', 'S71R3H1', 'd433895b-d55d-4075-b062-aa925d066d5d', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:40.715+00', '2026-03-17 16:49:40.715+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('abfc2979-6355-4ea3-9df0-d2547bb34613', 'S71R3H2', 'd433895b-d55d-4075-b062-aa925d066d5d', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:40.891+00', '2026-03-17 16:49:40.891+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('f6a51b91-2917-476b-b9c6-2a523b99677e', 'S71R3H3', 'd433895b-d55d-4075-b062-aa925d066d5d', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:41.053+00', '2026-03-17 16:49:41.053+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('547593be-942f-411d-87b2-93e101911487', 'S71R3H4', 'd433895b-d55d-4075-b062-aa925d066d5d', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:41.223+00', '2026-03-17 16:49:41.223+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('845da5e1-af90-419e-b7d1-4650fc973034', 'S71R3H5', 'd433895b-d55d-4075-b062-aa925d066d5d', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:41.435+00', '2026-03-17 16:49:41.435+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('c0a90656-453a-46d7-a4ed-e7bc1d2e520f', 'S71R4H1', 'd433895b-d55d-4075-b062-aa925d066d5d', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:41.595+00', '2026-03-17 16:49:41.595+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('b6bf0002-9306-4dd7-ab45-12eef1b6bc36', 'S71R4H2', 'd433895b-d55d-4075-b062-aa925d066d5d', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:41.843+00', '2026-03-17 16:49:41.843+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('2d67e9c3-44b0-4c6c-b5ee-eee5911aee1e', 'S71R4H3', 'd433895b-d55d-4075-b062-aa925d066d5d', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:41.995+00', '2026-03-17 16:49:41.995+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('f7a7f44b-8dfe-4546-a54a-50283f31b58c', 'S71R4H4', 'd433895b-d55d-4075-b062-aa925d066d5d', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:42.175+00', '2026-03-17 16:49:42.175+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('8937dfc1-4b74-4c4f-8bfb-deb26ec30cdb', 'S71R4H5', 'd433895b-d55d-4075-b062-aa925d066d5d', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:42.343+00', '2026-03-17 16:49:42.343+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('ead793f5-8e9d-4f87-8d80-38241321304e', 'S71R5H1', 'd433895b-d55d-4075-b062-aa925d066d5d', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:42.503+00', '2026-03-17 16:49:42.503+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('2589a0af-96a1-4a1b-adeb-b343dcf1d997', 'S71R5H2', 'd433895b-d55d-4075-b062-aa925d066d5d', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:42.675+00', '2026-03-17 16:49:42.675+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('ed7bc343-abaa-4030-99cd-2693f7dfb281', 'S71R5H3', 'd433895b-d55d-4075-b062-aa925d066d5d', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:42.851+00', '2026-03-17 16:49:42.851+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('96f1e887-4cf1-4398-970b-b1b51f264835', 'S71R5H4', 'd433895b-d55d-4075-b062-aa925d066d5d', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:43.055+00', '2026-03-17 16:49:43.055+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('5741ff48-59ba-41d9-a375-8c0c22d330a6', 'S71R5H5', 'd433895b-d55d-4075-b062-aa925d066d5d', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:43.323+00', '2026-03-17 16:49:43.323+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('e074d23c-4dda-46bf-ac3c-cc792db969c3', 'S71R6H1', 'd433895b-d55d-4075-b062-aa925d066d5d', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 6, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:43.483+00', '2026-03-17 16:49:43.483+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('5cefbe66-8305-48b0-a5c6-800aec0795cf', 'S71R6H2', 'd433895b-d55d-4075-b062-aa925d066d5d', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 6, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:43.695+00', '2026-03-17 16:49:43.695+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('9896b669-a3c0-4d35-9d88-61ebff3580aa', 'S71R6H3', 'd433895b-d55d-4075-b062-aa925d066d5d', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 6, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:43.896+00', '2026-03-17 16:49:43.896+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('4c441b3c-51e8-435a-b8a8-35b2599c7ab9', 'S71R6H4', 'd433895b-d55d-4075-b062-aa925d066d5d', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 6, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:44.094+00', '2026-03-17 16:49:44.094+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('e03c7729-7aae-493a-806c-47f7a3a71161', 'S71R6H5', 'd433895b-d55d-4075-b062-aa925d066d5d', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 6, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:44.294+00', '2026-03-17 16:49:44.294+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('a80a3817-3ff6-4294-b178-697eb29e3c77', 'S73R1H1', '123352f4-087a-493b-bc8d-614a4f7c496b', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:44.494+00', '2026-03-17 16:49:44.494+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('cf078b61-df79-4220-8f20-6dc680a836da', 'S73R1H2', '123352f4-087a-493b-bc8d-614a4f7c496b', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:44.695+00', '2026-03-17 16:49:44.695+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('e06822f5-c533-4daf-945e-ec32a1b39d1e', 'S73R1H3', '123352f4-087a-493b-bc8d-614a4f7c496b', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:44.934+00', '2026-03-17 16:49:44.934+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('8ff20eb6-6630-46f6-be39-cc147d0d10fd', 'S73R1H4', '123352f4-087a-493b-bc8d-614a4f7c496b', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:45.095+00', '2026-03-17 16:49:45.095+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('aac3e282-3d60-4582-aa41-98d2db0b79d2', 'S73R1H5', '123352f4-087a-493b-bc8d-614a4f7c496b', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:45.303+00', '2026-03-17 16:49:45.303+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('a2c9e69c-ec6c-4587-9dd2-250a2face074', 'S73R2H1', '123352f4-087a-493b-bc8d-614a4f7c496b', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:45.515+00', '2026-03-17 16:49:45.515+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('7b8f6c5d-cf5d-46e3-9b59-14494ae43e6f', 'S73R2H2', '123352f4-087a-493b-bc8d-614a4f7c496b', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:45.715+00', '2026-03-17 16:49:45.715+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('a9119001-7c44-4e67-9ff5-1f209028f822', 'S73R2H3', '123352f4-087a-493b-bc8d-614a4f7c496b', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:45.915+00', '2026-03-17 16:49:45.915+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('6014c3ac-e1fb-4da2-824e-079fa6f8fd28', 'S73R2H4', '123352f4-087a-493b-bc8d-614a4f7c496b', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:46.114+00', '2026-03-17 16:49:46.114+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('adc63fd4-0454-41a7-9142-341f88cdd4ac', 'S73R2H5', '123352f4-087a-493b-bc8d-614a4f7c496b', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:46.334+00', '2026-03-17 16:49:46.334+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('6191e3bf-1d2f-49dd-93e6-022e11f431f2', 'S73R3H1', '123352f4-087a-493b-bc8d-614a4f7c496b', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:46.534+00', '2026-03-17 16:49:46.534+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('5a49c5e4-53fb-4e94-99e4-b376958c4020', 'S73R3H2', '123352f4-087a-493b-bc8d-614a4f7c496b', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:46.753+00', '2026-03-17 16:49:46.753+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('eaabe7b8-7f6b-4965-baf0-837c28787828', 'S73R3H3', '123352f4-087a-493b-bc8d-614a4f7c496b', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:46.955+00', '2026-03-17 16:49:46.955+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('4d634055-ac31-4cba-b71c-620e388f5bd9', 'S73R3H4', '123352f4-087a-493b-bc8d-614a4f7c496b', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:47.123+00', '2026-03-17 16:49:47.123+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('cb821768-ebc4-47b4-a396-7fda7164c030', 'S73R3H5', '123352f4-087a-493b-bc8d-614a4f7c496b', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:47.356+00', '2026-03-17 16:49:47.356+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('1acab834-86e4-4b5c-a940-8efdfade6694', 'S73R4H1', '123352f4-087a-493b-bc8d-614a4f7c496b', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:47.523+00', '2026-03-17 16:49:47.523+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('385bf24f-4fec-40e4-8ed1-38ca34cae07c', 'S73R4H2', '123352f4-087a-493b-bc8d-614a4f7c496b', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:47.743+00', '2026-03-17 16:49:47.743+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('83a11fd1-33c4-4486-8076-b11c174de882', 'S73R4H3', '123352f4-087a-493b-bc8d-614a4f7c496b', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:47.895+00', '2026-03-17 16:49:47.895+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('3989422c-4457-4d3d-b280-362bdbde3384', 'S73R4H4', '123352f4-087a-493b-bc8d-614a4f7c496b', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:48.055+00', '2026-03-17 16:49:48.055+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('727e2e67-fbeb-449c-a538-557a180fb1f6', 'S73R4H5', '123352f4-087a-493b-bc8d-614a4f7c496b', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:48.215+00', '2026-03-17 16:49:48.215+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('34900298-713e-4306-a953-262eb0fc107a', 'S75R1H1', '8e638f61-f5a2-462d-bb24-1add32b486fd', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:48.374+00', '2026-03-17 16:49:48.374+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('82c60e1d-5e62-492b-bd3e-ce40bf17447a', 'S75R1H2', '8e638f61-f5a2-462d-bb24-1add32b486fd', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:48.535+00', '2026-03-17 16:49:48.535+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('744f82a1-ca01-4074-a4e1-30a5b675faf3', 'S75R1H3', '8e638f61-f5a2-462d-bb24-1add32b486fd', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:48.695+00', '2026-03-17 16:49:48.695+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('df7b3e5b-c2f9-4318-b75f-5a659c97cc0b', 'S75R1H4', '8e638f61-f5a2-462d-bb24-1add32b486fd', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:48.854+00', '2026-03-17 16:49:48.854+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('6b855393-dff0-47b3-83f5-56c1eeeb1dd7', 'S75R1H5', '8e638f61-f5a2-462d-bb24-1add32b486fd', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:49.023+00', '2026-03-17 16:49:49.023+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('405894ac-b825-4b66-8ca0-adac005d54c8', 'S75R2H1', '8e638f61-f5a2-462d-bb24-1add32b486fd', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:49.174+00', '2026-03-17 16:49:49.174+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('97a90629-fdc2-4fa3-946b-480b7c28b1d2', 'S75R2H2', '8e638f61-f5a2-462d-bb24-1add32b486fd', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:49.336+00', '2026-03-17 16:49:49.336+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('07152024-9cff-4e9f-be75-28dd4010838e', 'S75R2H3', '8e638f61-f5a2-462d-bb24-1add32b486fd', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:49.494+00', '2026-03-17 16:49:49.494+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('7e5582b9-a2e4-4b47-8bf2-f68660109625', 'S75R2H4', '8e638f61-f5a2-462d-bb24-1add32b486fd', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:49.655+00', '2026-03-17 16:49:49.655+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('e8e3526b-6af3-4225-9d8e-66d0da8b1922', 'S75R2H5', '8e638f61-f5a2-462d-bb24-1add32b486fd', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:49.815+00', '2026-03-17 16:49:49.815+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('d0d77a7d-7274-4dbe-ab93-6533c3479a69', 'S75R3H1', '8e638f61-f5a2-462d-bb24-1add32b486fd', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:49.995+00', '2026-03-17 16:49:49.995+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('5674495c-01e5-49ae-b597-1452a47a7e24', 'S75R3H2', '8e638f61-f5a2-462d-bb24-1add32b486fd', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:50.155+00', '2026-03-17 16:49:50.155+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('20531187-1e78-4aa7-ad6c-1c8219bda122', 'S75R3H3', '8e638f61-f5a2-462d-bb24-1add32b486fd', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:50.315+00', '2026-03-17 16:49:50.315+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('e8a2a50b-5b05-4041-93a2-4f5e7f9c1ff5', 'S75R3H4', '8e638f61-f5a2-462d-bb24-1add32b486fd', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:50.475+00', '2026-03-17 16:49:50.475+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('480b5b59-a6db-431b-be72-ee96a7f5a167', 'S75R3H5', '8e638f61-f5a2-462d-bb24-1add32b486fd', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:50.655+00', '2026-03-17 16:49:50.655+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('10058472-b758-45fe-bded-5ec2698a16db', 'S75R4H1', '8e638f61-f5a2-462d-bb24-1add32b486fd', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:50.815+00', '2026-03-17 16:49:50.815+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('e46eed76-10cd-41d2-84a2-00caa55d4c88', 'S75R4H2', '8e638f61-f5a2-462d-bb24-1add32b486fd', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:50.975+00', '2026-03-17 16:49:50.975+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('0f7de967-1207-4dc5-af1f-67aeb1acba56', 'S75R4H3', '8e638f61-f5a2-462d-bb24-1add32b486fd', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:51.195+00', '2026-03-17 16:49:51.195+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('61003c66-faf7-4f6b-983f-726800ac7147', 'S75R4H4', '8e638f61-f5a2-462d-bb24-1add32b486fd', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:51.436+00', '2026-03-17 16:49:51.436+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('24b1a4d7-fac6-46dd-8acd-013b4f063e6c', 'S75R4H5', '8e638f61-f5a2-462d-bb24-1add32b486fd', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:51.655+00', '2026-03-17 16:49:51.655+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('1b5b5d76-f470-4cd2-b485-b8a5ba911d9a', 'S77R1H1', '40c45414-80b4-478f-96f8-e4bb81aa6360', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:51.815+00', '2026-03-17 16:49:51.815+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('d5b95ff2-b315-4456-8992-10de79ee03e6', 'S77R1H2', '40c45414-80b4-478f-96f8-e4bb81aa6360', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:52.011+00', '2026-03-17 16:49:52.011+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('cc389cf7-9e59-4654-abc3-6698ec6ebcea', 'S77R1H3', '40c45414-80b4-478f-96f8-e4bb81aa6360', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:52.191+00', '2026-03-17 16:49:52.191+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('3ccef79b-4e3d-4c39-b70e-cd16e6825c42', 'S77R1H4', '40c45414-80b4-478f-96f8-e4bb81aa6360', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:52.443+00', '2026-03-17 16:49:52.443+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('540b3359-6c3e-4c50-a777-b45a3af3f752', 'S77R1H5', '40c45414-80b4-478f-96f8-e4bb81aa6360', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:52.655+00', '2026-03-17 16:49:52.655+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('822c1b2b-43ca-46ff-af10-ccd32b2ba874', 'S77R2H1', '40c45414-80b4-478f-96f8-e4bb81aa6360', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:52.863+00', '2026-03-17 16:49:52.863+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('5d643cb0-e60e-4359-833b-fd50e88d611e', 'S77R2H2', '40c45414-80b4-478f-96f8-e4bb81aa6360', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:53.033+00', '2026-03-17 16:49:53.033+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('81b93aa3-1f8a-4a74-8314-f67324b4ada3', 'S77R2H3', '40c45414-80b4-478f-96f8-e4bb81aa6360', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:53.203+00', '2026-03-17 16:49:53.203+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('237358ef-a432-499a-94a1-4b0618e612c1', 'S77R2H4', '40c45414-80b4-478f-96f8-e4bb81aa6360', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:53.373+00', '2026-03-17 16:49:53.373+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('c4300a81-4c40-4dfb-91a4-00e4e5636d2d', 'S77R2H5', '40c45414-80b4-478f-96f8-e4bb81aa6360', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:53.563+00', '2026-03-17 16:49:53.563+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('03b94ef3-0ed3-4ed3-a766-2640ce1f37ee', 'S77R3H1', '40c45414-80b4-478f-96f8-e4bb81aa6360', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:53.755+00', '2026-03-17 16:49:53.755+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('a34ceca5-35cc-461d-83ca-d78fd19e58a6', 'S77R3H2', '40c45414-80b4-478f-96f8-e4bb81aa6360', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:53.975+00', '2026-03-17 16:49:53.975+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('c4313b8e-3f63-431f-bbdb-2cb54dfd634a', 'S77R3H3', '40c45414-80b4-478f-96f8-e4bb81aa6360', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:54.163+00', '2026-03-17 16:49:54.163+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('d00ae4a0-ba09-4589-aedc-1974650577b0', 'S77R3H4', '40c45414-80b4-478f-96f8-e4bb81aa6360', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:54.335+00', '2026-03-17 16:49:54.335+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('36df7b71-1a2c-4f07-bb3f-5b4f198a095e', 'S77R3H5', '40c45414-80b4-478f-96f8-e4bb81aa6360', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:54.495+00', '2026-03-17 16:49:54.495+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('88447f3d-8686-4b39-b09b-9154ae4fa79c', 'S77R4H1', '40c45414-80b4-478f-96f8-e4bb81aa6360', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:54.675+00', '2026-03-17 16:49:54.675+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('b5a74cd8-0a95-4102-a815-3187bd1b901d', 'S77R4H2', '40c45414-80b4-478f-96f8-e4bb81aa6360', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:54.856+00', '2026-03-17 16:49:54.856+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('6f8366e8-1e0d-4b7f-8888-6df7e6997ed6', 'S77R4H3', '40c45414-80b4-478f-96f8-e4bb81aa6360', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:55.043+00', '2026-03-17 16:49:55.043+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('849acad1-1e21-4527-8795-952d93718738', 'S77R4H4', '40c45414-80b4-478f-96f8-e4bb81aa6360', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:55.223+00', '2026-03-17 16:49:55.223+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('623f4643-e1f8-4e8b-930a-78239f3d7517', 'S77R4H5', '40c45414-80b4-478f-96f8-e4bb81aa6360', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:55.390+00', '2026-03-17 16:49:55.390+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('43c2b413-a996-4dd3-9857-37b34d60ab46', 'S79R1H1', 'dcf3a17b-5fd4-4753-ab0d-5a0529fa9271', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:55.591+00', '2026-03-17 16:49:55.591+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('4c5a1269-b66e-4af7-ab72-0330755b29c7', 'S79R1H2', 'dcf3a17b-5fd4-4753-ab0d-5a0529fa9271', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:55.922+00', '2026-03-17 16:49:55.922+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('6d058fd1-6297-461e-b459-cea8ee68836c', 'S79R1H3', 'dcf3a17b-5fd4-4753-ab0d-5a0529fa9271', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:56.075+00', '2026-03-17 16:49:56.075+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('5c503d20-1789-4377-8306-57d2fe9aaea6', 'S79R1H4', 'dcf3a17b-5fd4-4753-ab0d-5a0529fa9271', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:56.335+00', '2026-03-17 16:49:56.335+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('119bcac9-ee25-4e73-a509-1a73287dfddd', 'S79R1H5', 'dcf3a17b-5fd4-4753-ab0d-5a0529fa9271', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:56.502+00', '2026-03-17 16:49:56.502+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('de3e475e-cae0-4776-b27e-89256d093b20', 'S79R2H1', 'dcf3a17b-5fd4-4753-ab0d-5a0529fa9271', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:56.691+00', '2026-03-17 16:49:56.691+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('3882e615-2890-4130-bebb-af952cf17734', 'S79R2H2', 'dcf3a17b-5fd4-4753-ab0d-5a0529fa9271', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:56.870+00', '2026-03-17 16:49:56.870+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('5ff8307b-aafb-4ab3-b353-1772a032b1ec', 'S79R2H3', 'dcf3a17b-5fd4-4753-ab0d-5a0529fa9271', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:57.035+00', '2026-03-17 16:49:57.035+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('82031fb0-9be4-4106-b84a-76f8833f3f80', 'S79R2H4', 'dcf3a17b-5fd4-4753-ab0d-5a0529fa9271', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:57.363+00', '2026-03-17 16:49:57.363+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('c035b8b9-c209-48c6-8402-06b41d7ea59d', 'S79R2H5', 'dcf3a17b-5fd4-4753-ab0d-5a0529fa9271', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:57.575+00', '2026-03-17 16:49:57.575+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('d42d6d89-47ab-4731-9145-6ff9faeb40bc', 'S79R3H1', 'dcf3a17b-5fd4-4753-ab0d-5a0529fa9271', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:57.755+00', '2026-03-17 16:49:57.755+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('2a67783b-7999-4169-8105-2d7c54bc00f3', 'S79R3H2', 'dcf3a17b-5fd4-4753-ab0d-5a0529fa9271', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:57.955+00', '2026-03-17 16:49:57.955+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('f0b6b722-7aa3-490b-974f-c8ff426d0fbe', 'S79R3H3', 'dcf3a17b-5fd4-4753-ab0d-5a0529fa9271', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:58.123+00', '2026-03-17 16:49:58.123+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('10d601d6-0aef-4dde-98fa-56d0c521084b', 'S79R3H4', 'dcf3a17b-5fd4-4753-ab0d-5a0529fa9271', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:58.283+00', '2026-03-17 16:49:58.283+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('ba75e95a-bed2-4e8d-a8cf-f3c51eeca792', 'S79R3H5', 'dcf3a17b-5fd4-4753-ab0d-5a0529fa9271', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:58.443+00', '2026-03-17 16:49:58.443+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('2d4c999b-962c-4261-ab6c-4302e64cd353', 'S79R4H1', 'dcf3a17b-5fd4-4753-ab0d-5a0529fa9271', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:58.623+00', '2026-03-17 16:49:58.623+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('f0abf8e3-0e7c-4c5e-b7fd-ef551262c021', 'S79R4H2', 'dcf3a17b-5fd4-4753-ab0d-5a0529fa9271', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:58.865+00', '2026-03-17 16:49:58.865+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('1155f7d2-c1d8-47bf-ad52-064440eaf83e', 'S79R4H3', 'dcf3a17b-5fd4-4753-ab0d-5a0529fa9271', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:59.045+00', '2026-03-17 16:49:59.045+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('10caa5d7-24c9-422e-a879-2bdfef56cdf6', 'S79R4H4', 'dcf3a17b-5fd4-4753-ab0d-5a0529fa9271', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:59.215+00', '2026-03-17 16:49:59.215+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('5ac519ee-58ba-443d-bf1c-dea4c1ed4bab', 'S79R4H5', 'dcf3a17b-5fd4-4753-ab0d-5a0529fa9271', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:59.403+00', '2026-03-17 16:49:59.403+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('c9b3c91c-dcd8-4eaf-ab04-539431ca467f', 'S81R1H1', 'c622973b-c21b-4877-99e7-97cb30e0fcdc', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:59.639+00', '2026-03-17 16:49:59.639+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('fa6247ab-dd3f-4a2c-9234-25099f2abf63', 'S81R1H2', 'c622973b-c21b-4877-99e7-97cb30e0fcdc', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:59.795+00', '2026-03-17 16:49:59.795+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('48ab0df8-bead-4397-9c97-25253f1d2505', 'S81R1H3', 'c622973b-c21b-4877-99e7-97cb30e0fcdc', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:49:59.975+00', '2026-03-17 16:49:59.975+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('8a36ae4c-c5ef-4568-8bbe-0d0a8eb146f9', 'S81R1H4', 'c622973b-c21b-4877-99e7-97cb30e0fcdc', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:00.331+00', '2026-03-17 16:50:00.331+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('e779192d-c5f0-4705-b486-589489a087a1', 'S81R1H5', 'c622973b-c21b-4877-99e7-97cb30e0fcdc', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:00.491+00', '2026-03-17 16:50:00.491+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('83acda1f-ff77-4a1a-ae11-ad608dff9d79', 'S81R2H1', 'c622973b-c21b-4877-99e7-97cb30e0fcdc', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:00.691+00', '2026-03-17 16:50:00.691+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('842e5a9c-83fc-497d-a6f0-b5adca71ed12', 'S81R2H2', 'c622973b-c21b-4877-99e7-97cb30e0fcdc', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:00.835+00', '2026-03-17 16:50:00.835+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('c793af7c-e416-42e1-8783-9383526ef006', 'S81R2H3', 'c622973b-c21b-4877-99e7-97cb30e0fcdc', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:01.045+00', '2026-03-17 16:50:01.045+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('93ebbcfd-7489-4f46-b93e-97fa76593251', 'S81R2H4', 'c622973b-c21b-4877-99e7-97cb30e0fcdc', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:01.231+00', '2026-03-17 16:50:01.231+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('660f4364-e72b-429a-85a2-e3baf1c49e76', 'S81R2H5', 'c622973b-c21b-4877-99e7-97cb30e0fcdc', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:01.424+00', '2026-03-17 16:50:01.424+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('71b21c37-201e-4f52-be9b-295bc311cb5f', 'S81R3H1', 'c622973b-c21b-4877-99e7-97cb30e0fcdc', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:01.603+00', '2026-03-17 16:50:01.603+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('668c350a-e0d0-4bdb-a8ef-ec730f940599', 'S81R3H2', 'c622973b-c21b-4877-99e7-97cb30e0fcdc', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:01.775+00', '2026-03-17 16:50:01.775+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('83e8ae46-f03b-469b-bbf4-e9faf1bba5b2', 'S81R3H3', 'c622973b-c21b-4877-99e7-97cb30e0fcdc', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:02.051+00', '2026-03-17 16:50:02.051+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('55bc068c-7d90-4d1e-b061-033161750121', 'S81R3H4', 'c622973b-c21b-4877-99e7-97cb30e0fcdc', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:02.243+00', '2026-03-17 16:50:02.243+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('73f46729-1c72-4aa1-821a-7510298e369d', 'S81R3H5', 'c622973b-c21b-4877-99e7-97cb30e0fcdc', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:02.415+00', '2026-03-17 16:50:02.415+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('87db9d32-839c-4102-9ee1-f2f51913b571', 'S81R4H1', 'c622973b-c21b-4877-99e7-97cb30e0fcdc', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:02.634+00', '2026-03-17 16:50:02.634+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('8bf7423b-4b72-4171-af00-0e246dd15392', 'S81R4H2', 'c622973b-c21b-4877-99e7-97cb30e0fcdc', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:02.795+00', '2026-03-17 16:50:02.795+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('b45ce033-319c-4faa-9aad-9bc084e30836', 'S81R4H3', 'c622973b-c21b-4877-99e7-97cb30e0fcdc', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:02.956+00', '2026-03-17 16:50:02.956+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('3a0feb02-92a3-4625-b486-5a3b029ebc53', 'S81R4H4', 'c622973b-c21b-4877-99e7-97cb30e0fcdc', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:03.215+00', '2026-03-17 16:50:03.215+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('6ae3f252-7f97-43f5-8696-f6f15794130c', 'S81R4H5', 'c622973b-c21b-4877-99e7-97cb30e0fcdc', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:03.383+00', '2026-03-17 16:50:03.383+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('809a3ed6-1081-4abc-a77b-53935a3c2ef9', 'S83R1H1', '75608710-099c-41a9-aacc-3eaf95d03820', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:03.551+00', '2026-03-17 16:50:03.551+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('681db5da-95e2-49bd-8909-c0025680ee44', 'S83R1H2', '75608710-099c-41a9-aacc-3eaf95d03820', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:03.715+00', '2026-03-17 16:50:03.715+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('a869e7fe-d00c-4923-b88f-9c8068253fa3', 'S83R1H3', '75608710-099c-41a9-aacc-3eaf95d03820', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:03.963+00', '2026-03-17 16:50:03.963+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('006809f8-10bd-4cc4-8679-86f5c5c811b4', 'S83R1H4', '75608710-099c-41a9-aacc-3eaf95d03820', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:04.183+00', '2026-03-17 16:50:04.183+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('abcda722-32ec-491a-ad05-004bcc1f5b69', 'S83R1H5', '75608710-099c-41a9-aacc-3eaf95d03820', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:04.343+00', '2026-03-17 16:50:04.343+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('ecb61a86-22ee-4e90-a3ff-7f43b5a6e2b9', 'S83R2H1', '75608710-099c-41a9-aacc-3eaf95d03820', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:04.511+00', '2026-03-17 16:50:04.511+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('bd8d79fa-0b66-4e83-a309-644b266c1d21', 'S83R2H2', '75608710-099c-41a9-aacc-3eaf95d03820', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:04.675+00', '2026-03-17 16:50:04.675+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('132c8b76-df76-4462-8c1c-ba92781aae5b', 'S83R2H3', '75608710-099c-41a9-aacc-3eaf95d03820', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:04.863+00', '2026-03-17 16:50:04.863+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('3d3dfde3-35ad-4e3d-a12a-f131b2afb818', 'S83R2H4', '75608710-099c-41a9-aacc-3eaf95d03820', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:05.030+00', '2026-03-17 16:50:05.030+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('b304e039-2646-4343-b9bc-c2ad103cf775', 'S83R2H5', '75608710-099c-41a9-aacc-3eaf95d03820', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:05.196+00', '2026-03-17 16:50:05.196+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('c6bd2069-c15c-41c9-8a47-ec3d13de3f6d', 'S83R3H1', '75608710-099c-41a9-aacc-3eaf95d03820', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:05.415+00', '2026-03-17 16:50:05.415+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('a949f3c9-3458-4f00-9817-46a3eeb5c9c8', 'S83R3H2', '75608710-099c-41a9-aacc-3eaf95d03820', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:05.643+00', '2026-03-17 16:50:05.643+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('886eaf3f-c2de-4363-9038-e010d21b5a8c', 'S83R3H3', '75608710-099c-41a9-aacc-3eaf95d03820', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:05.855+00', '2026-03-17 16:50:05.855+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('e3156d28-5460-4fe6-b5ca-5ace872686a7', 'S83R3H4', '75608710-099c-41a9-aacc-3eaf95d03820', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:06.035+00', '2026-03-17 16:50:06.035+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('04d1c379-a3a0-4232-9e03-cbfc825dc2b4', 'S83R3H5', '75608710-099c-41a9-aacc-3eaf95d03820', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:06.255+00', '2026-03-17 16:50:06.255+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('f61415c0-ad36-4be3-b0a3-b0e5a3639f4f', 'S83R4H1', '75608710-099c-41a9-aacc-3eaf95d03820', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:06.475+00', '2026-03-17 16:50:06.475+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('445473ae-e8e6-4a14-976d-1a0762725152', 'S83R4H2', '75608710-099c-41a9-aacc-3eaf95d03820', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:06.683+00', '2026-03-17 16:50:06.683+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('bf44a09c-8cee-4f43-89a2-23595a9bc7ee', 'S83R4H3', '75608710-099c-41a9-aacc-3eaf95d03820', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:06.846+00', '2026-03-17 16:50:06.846+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('f14d5ff2-5e0f-411a-ad2a-883e7d6739ad', 'S83R4H4', '75608710-099c-41a9-aacc-3eaf95d03820', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:07.055+00', '2026-03-17 16:50:07.055+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('76f6013e-89ad-417a-958c-c17cfa611c17', 'S83R4H5', '75608710-099c-41a9-aacc-3eaf95d03820', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:07.223+00', '2026-03-17 16:50:07.223+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('0ab1bf39-2af0-490b-9f51-f67942462631', 'S85R1H1', '48621071-6349-4493-b95c-5e9186f5aa4c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:07.435+00', '2026-03-17 16:50:07.435+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('0a3b770d-2649-412a-8dd5-c5fb92bdb038', 'S85R1H2', '48621071-6349-4493-b95c-5e9186f5aa4c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:07.655+00', '2026-03-17 16:50:07.655+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('306ed912-1828-4fd8-b970-d5d0216753bd', 'S85R1H3', '48621071-6349-4493-b95c-5e9186f5aa4c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:07.851+00', '2026-03-17 16:50:07.851+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('c9359c77-e1ff-4e5d-be6f-67df8cbf6278', 'S85R1H4', '48621071-6349-4493-b95c-5e9186f5aa4c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:08.031+00', '2026-03-17 16:50:08.031+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('915b3b91-6a02-42bf-940e-490950c0df21', 'S85R1H5', '48621071-6349-4493-b95c-5e9186f5aa4c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:08.235+00', '2026-03-17 16:50:08.235+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('35dc3858-a8cd-472c-895c-fc19a6be0465', 'S85R2H1', '48621071-6349-4493-b95c-5e9186f5aa4c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:08.399+00', '2026-03-17 16:50:08.399+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('1be91a8d-8b37-49ee-8fd4-8211991888ea', 'S85R2H2', '48621071-6349-4493-b95c-5e9186f5aa4c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:08.595+00', '2026-03-17 16:50:08.595+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('54b0f81e-349e-4254-a115-d0434292f922', 'S85R2H3', '48621071-6349-4493-b95c-5e9186f5aa4c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:08.831+00', '2026-03-17 16:50:08.831+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('a2aca923-a7ad-4ec2-a6cb-8b5bf460e3b1', 'S85R2H4', '48621071-6349-4493-b95c-5e9186f5aa4c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:08.976+00', '2026-03-17 16:50:08.976+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('0420e092-8e04-4610-a32f-dc563b386ab3', 'S85R2H5', '48621071-6349-4493-b95c-5e9186f5aa4c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:09.262+00', '2026-03-17 16:50:09.262+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('7d90c3b0-3351-46ff-803a-66861903b45c', 'S85R3H1', '48621071-6349-4493-b95c-5e9186f5aa4c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:09.443+00', '2026-03-17 16:50:09.443+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('68501e5d-8ee0-40b5-a765-b276cf30cf9b', 'S85R3H2', '48621071-6349-4493-b95c-5e9186f5aa4c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:09.635+00', '2026-03-17 16:50:09.635+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('9cb994b3-48e0-408f-bf09-b4af6134d504', 'S85R3H3', '48621071-6349-4493-b95c-5e9186f5aa4c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:09.795+00', '2026-03-17 16:50:09.795+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('c252539d-f9b8-400c-bc75-8ddbbf9b11ce', 'S85R3H4', '48621071-6349-4493-b95c-5e9186f5aa4c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:10.016+00', '2026-03-17 16:50:10.016+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('c16cfa0e-9aad-4cc1-b206-ab5b832ce22b', 'S85R3H5', '48621071-6349-4493-b95c-5e9186f5aa4c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:10.215+00', '2026-03-17 16:50:10.215+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('240c5e57-5e5b-4ff8-a5fc-a5033dba9a8c', 'S85R4H1', '48621071-6349-4493-b95c-5e9186f5aa4c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:10.423+00', '2026-03-17 16:50:10.423+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('6a9ee458-2a2c-4055-9114-3ecefa6b759a', 'S85R4H2', '48621071-6349-4493-b95c-5e9186f5aa4c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:10.623+00', '2026-03-17 16:50:10.623+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('1bbbeb96-998c-4a33-bb21-ab7fbd20632f', 'S85R4H3', '48621071-6349-4493-b95c-5e9186f5aa4c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:10.775+00', '2026-03-17 16:50:10.775+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('a312f8ba-c08d-4e4f-aaa3-aef06f01f3f0', 'S85R4H4', '48621071-6349-4493-b95c-5e9186f5aa4c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:11.032+00', '2026-03-17 16:50:11.032+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('177a5b77-f0a1-41b4-8202-d9a4b892e5b7', 'S85R4H5', '48621071-6349-4493-b95c-5e9186f5aa4c', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:11.215+00', '2026-03-17 16:50:11.215+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('70ee0b40-d558-4668-a087-7237f5ed668c', 'S87R1H1', '6a63cc25-1571-438b-bcc2-07863ddb9375', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:11.483+00', '2026-03-17 16:50:11.483+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('63fc98eb-be10-4b3c-9d80-b919d48b1e7c', 'S87R1H2', '6a63cc25-1571-438b-bcc2-07863ddb9375', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:11.751+00', '2026-03-17 16:50:11.751+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('8f839828-a7e7-49de-afeb-f84b0b09b880', 'S87R1H3', '6a63cc25-1571-438b-bcc2-07863ddb9375', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:11.916+00', '2026-03-17 16:50:11.916+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('1feb57e5-1fa6-450d-8972-71a7e0bde59e', 'S87R1H4', '6a63cc25-1571-438b-bcc2-07863ddb9375', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:12.103+00', '2026-03-17 16:50:12.103+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('e857fbed-3f69-4bd1-9400-06d12ca9a1e5', 'S87R1H5', '6a63cc25-1571-438b-bcc2-07863ddb9375', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:12.255+00', '2026-03-17 16:50:12.255+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('8df63f0b-694b-4c68-85d4-c58a8f11ad27', 'S87R2H1', '6a63cc25-1571-438b-bcc2-07863ddb9375', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:12.455+00', '2026-03-17 16:50:12.455+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('4a507f34-b76e-45e2-a7a2-1ca6846d6f1e', 'S87R2H2', '6a63cc25-1571-438b-bcc2-07863ddb9375', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:12.623+00', '2026-03-17 16:50:12.623+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('b1664448-4c01-40ed-8b6c-94486e8e9551', 'S87R2H3', '6a63cc25-1571-438b-bcc2-07863ddb9375', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:12.803+00', '2026-03-17 16:50:12.803+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('4dc6420e-8f22-4373-bf1d-2d6cec7287c2', 'S87R2H4', '6a63cc25-1571-438b-bcc2-07863ddb9375', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:12.975+00', '2026-03-17 16:50:12.975+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('f139ded1-5284-4662-a428-6a5be78be392', 'S87R2H5', '6a63cc25-1571-438b-bcc2-07863ddb9375', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:13.135+00', '2026-03-17 16:50:13.135+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('1823c6be-8c2d-4c3b-8b4f-e3605ce70e9c', 'S87R3H1', '6a63cc25-1571-438b-bcc2-07863ddb9375', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:13.315+00', '2026-03-17 16:50:13.315+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('85735cac-62c5-4a40-a513-f808e914b734', 'S87R3H2', '6a63cc25-1571-438b-bcc2-07863ddb9375', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:13.482+00', '2026-03-17 16:50:13.482+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('3d722354-47c6-487d-a953-aea3f137e5d0', 'S87R3H3', '6a63cc25-1571-438b-bcc2-07863ddb9375', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:13.683+00', '2026-03-17 16:50:13.683+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('722d58fa-0b55-4a1f-b369-43ba5d4ed26e', 'S87R3H4', '6a63cc25-1571-438b-bcc2-07863ddb9375', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:13.875+00', '2026-03-17 16:50:13.875+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('3ee4db83-67cb-4b9b-8e17-adfedfbc4b70', 'S87R3H5', '6a63cc25-1571-438b-bcc2-07863ddb9375', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:14.045+00', '2026-03-17 16:50:14.045+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('4fd23ca1-f605-4050-bf4e-35509a625c2f', 'S87R4H1', '6a63cc25-1571-438b-bcc2-07863ddb9375', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:14.271+00', '2026-03-17 16:50:14.271+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('729a5d20-d0df-46e6-9b0a-43c55f3e115e', 'S87R4H2', '6a63cc25-1571-438b-bcc2-07863ddb9375', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:14.476+00', '2026-03-17 16:50:14.476+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('e1624ee1-5a95-4d69-afd8-0aca92cf8127', 'S87R4H3', '6a63cc25-1571-438b-bcc2-07863ddb9375', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:14.643+00', '2026-03-17 16:50:14.643+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('85e12513-39b4-46b0-832b-d84b003638b4', 'S87R4H4', '6a63cc25-1571-438b-bcc2-07863ddb9375', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:14.803+00', '2026-03-17 16:50:14.803+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('7a7952d5-45b7-48fd-bd30-809d9bbcebe6', 'S87R4H5', '6a63cc25-1571-438b-bcc2-07863ddb9375', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:15.015+00', '2026-03-17 16:50:15.015+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('cfe58584-be74-4e83-9258-949d038040c1', 'S89R1H1', '6452fa6d-e2e5-46af-be2f-323fd5fc6c69', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:15.223+00', '2026-03-17 16:50:15.223+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('17be8378-81d2-4a6f-8a2f-6b5676e1dd50', 'S89R1H2', '6452fa6d-e2e5-46af-be2f-323fd5fc6c69', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:15.395+00', '2026-03-17 16:50:15.395+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('b44991fc-6f24-4112-bc4d-a738610740c2', 'S89R1H3', '6452fa6d-e2e5-46af-be2f-323fd5fc6c69', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:15.623+00', '2026-03-17 16:50:15.623+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('f99d781f-297c-498e-aa8e-dc7fd483b830', 'S89R1H4', '6452fa6d-e2e5-46af-be2f-323fd5fc6c69', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:15.815+00', '2026-03-17 16:50:15.815+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('5db74d96-01f3-4428-8f6d-b133e25911e6', 'S89R1H5', '6452fa6d-e2e5-46af-be2f-323fd5fc6c69', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:16.016+00', '2026-03-17 16:50:16.016+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('78c13248-9c8f-4d86-924d-81021fd5cc01', 'S89R2H1', '6452fa6d-e2e5-46af-be2f-323fd5fc6c69', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:16.215+00', '2026-03-17 16:50:16.215+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('3a94b25a-9be9-496b-bb2e-643152cb8b77', 'S89R2H2', '6452fa6d-e2e5-46af-be2f-323fd5fc6c69', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:16.415+00', '2026-03-17 16:50:16.415+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('141914fe-059f-45eb-a272-3a7de1621dd5', 'S89R2H3', '6452fa6d-e2e5-46af-be2f-323fd5fc6c69', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:16.623+00', '2026-03-17 16:50:16.623+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('e51d20c1-d54e-4df2-8618-f1b5752409e5', 'S89R2H4', '6452fa6d-e2e5-46af-be2f-323fd5fc6c69', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:16.835+00', '2026-03-17 16:50:16.835+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('aaafb4e2-39bd-4392-b818-de4b627487de', 'S89R2H5', '6452fa6d-e2e5-46af-be2f-323fd5fc6c69', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:17.051+00', '2026-03-17 16:50:17.051+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('dc72cf2d-a285-48ac-9d36-66db526859cd', 'S89R3H1', '6452fa6d-e2e5-46af-be2f-323fd5fc6c69', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:17.215+00', '2026-03-17 16:50:17.215+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('4649d251-e514-460f-ba9c-3ce8017ab416', 'S89R3H2', '6452fa6d-e2e5-46af-be2f-323fd5fc6c69', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:17.411+00', '2026-03-17 16:50:17.411+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('20cce1a5-dacd-47fb-bd6e-7b53f3c56219', 'S89R3H3', '6452fa6d-e2e5-46af-be2f-323fd5fc6c69', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:17.575+00', '2026-03-17 16:50:17.575+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('b30cd92d-7d7e-4739-8276-50857ed58bc4', 'S89R3H4', '6452fa6d-e2e5-46af-be2f-323fd5fc6c69', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:17.743+00', '2026-03-17 16:50:17.743+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('7245b526-1fcb-4e9d-ad20-91cbe9cf893f', 'S89R3H5', '6452fa6d-e2e5-46af-be2f-323fd5fc6c69', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:17.951+00', '2026-03-17 16:50:17.951+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('da723ff3-033e-4288-b930-39bbcaa8f710', 'S89R4H1', '6452fa6d-e2e5-46af-be2f-323fd5fc6c69', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:18.135+00', '2026-03-17 16:50:18.135+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('628ad1a0-e45b-4525-a1fe-bc1404ba9bba', 'S89R4H2', '6452fa6d-e2e5-46af-be2f-323fd5fc6c69', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:18.315+00', '2026-03-17 16:50:18.315+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('07b98dd8-041d-4775-ad69-60f8d51edab7', 'S89R4H3', '6452fa6d-e2e5-46af-be2f-323fd5fc6c69', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:18.475+00', '2026-03-17 16:50:18.475+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('8f7c1f81-472b-4ff4-bd7a-4117ad0bda67', 'S89R4H4', '6452fa6d-e2e5-46af-be2f-323fd5fc6c69', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:18.675+00', '2026-03-17 16:50:18.675+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('f8e365d9-64ba-40a8-b049-67ccc643792e', 'S89R4H5', '6452fa6d-e2e5-46af-be2f-323fd5fc6c69', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:18.843+00', '2026-03-17 16:50:18.843+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('75cb3762-b957-4273-80a5-5b24da75113b', 'S91R1H1', '286c36b3-4b47-464f-b756-c338b983b39b', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:19.055+00', '2026-03-17 16:50:19.055+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('a894e342-a2e8-4cc4-a1c7-7d2d141fd920', 'S91R1H2', '286c36b3-4b47-464f-b756-c338b983b39b', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:19.223+00', '2026-03-17 16:50:19.223+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('9dfe9039-8009-4549-b5ed-66cdfa9e3cc5', 'S91R1H3', '286c36b3-4b47-464f-b756-c338b983b39b', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:19.422+00', '2026-03-17 16:50:19.422+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('cf02038a-df81-4196-a759-3196894682c1', 'S91R1H4', '286c36b3-4b47-464f-b756-c338b983b39b', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:19.616+00', '2026-03-17 16:50:19.616+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('64bfb263-d4e9-46f8-8755-104bbc87c299', 'S91R1H5', '286c36b3-4b47-464f-b756-c338b983b39b', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:19.815+00', '2026-03-17 16:50:19.815+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('5277d144-d825-4446-9e3b-9f8180e07fc7', 'S91R2H1', '286c36b3-4b47-464f-b756-c338b983b39b', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:20.015+00', '2026-03-17 16:50:20.015+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('4d1efec3-1476-4a38-8f41-dcac0d586eaa', 'S91R2H2', '286c36b3-4b47-464f-b756-c338b983b39b', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:20.223+00', '2026-03-17 16:50:20.223+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('fa329b24-5df0-4965-bce5-39ef2b2aa20b', 'S91R2H3', '286c36b3-4b47-464f-b756-c338b983b39b', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:20.403+00', '2026-03-17 16:50:20.403+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('0470581c-5d4a-4064-af33-5cd9394da32d', 'S91R2H4', '286c36b3-4b47-464f-b756-c338b983b39b', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:20.603+00', '2026-03-17 16:50:20.603+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('458aab37-0cda-4a08-8db9-a9b4f8e1572c', 'S91R2H5', '286c36b3-4b47-464f-b756-c338b983b39b', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:20.763+00', '2026-03-17 16:50:20.763+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('a24ef73f-b8c5-4dd3-b9eb-b32f98105eed', 'S91R3H1', '286c36b3-4b47-464f-b756-c338b983b39b', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:20.955+00', '2026-03-17 16:50:20.955+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('e530eeb8-c42b-45e1-bbd7-6c489238563c', 'S91R3H2', '286c36b3-4b47-464f-b756-c338b983b39b', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:21.182+00', '2026-03-17 16:50:21.182+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('0fbe5117-97e0-4056-afd7-44f51f3558d6', 'S91R3H3', '286c36b3-4b47-464f-b756-c338b983b39b', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:21.375+00', '2026-03-17 16:50:21.375+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('52b23dd1-a8d1-46c4-818b-c169328d6c66', 'S91R3H4', '286c36b3-4b47-464f-b756-c338b983b39b', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:21.575+00', '2026-03-17 16:50:21.575+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('b022a02a-f3b5-4269-b400-f37512586b6a', 'S91R3H5', '286c36b3-4b47-464f-b756-c338b983b39b', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:21.775+00', '2026-03-17 16:50:21.775+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('3aadff7b-c39d-4c46-babb-e108bcd4d6af', 'S91R4H1', '286c36b3-4b47-464f-b756-c338b983b39b', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:21.975+00', '2026-03-17 16:50:21.975+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('233f4be1-a17c-45da-be6b-833f91e78ed5', 'S91R4H2', '286c36b3-4b47-464f-b756-c338b983b39b', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:22.176+00', '2026-03-17 16:50:22.176+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('43d4c6bc-e023-41d0-862d-f8f659c92fe3', 'S91R4H3', '286c36b3-4b47-464f-b756-c338b983b39b', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:22.375+00', '2026-03-17 16:50:22.375+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('2e4e31d5-b296-463a-b861-f579d8a94940', 'S91R4H4', '286c36b3-4b47-464f-b756-c338b983b39b', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:22.535+00', '2026-03-17 16:50:22.535+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('cc671fd4-55af-4c7a-932a-8cd1fff69c6d', 'S91R4H5', '286c36b3-4b47-464f-b756-c338b983b39b', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:22.735+00', '2026-03-17 16:50:22.735+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('4b21e19d-2e4e-45a1-98aa-62603d18c674', 'S93R1H1', '378b72b7-f320-449f-997e-9c8d0e803f7f', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:22.895+00', '2026-03-17 16:50:22.895+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('8ac0099d-2c22-4176-bd28-f41bdb6700a3', 'S93R1H2', '378b72b7-f320-449f-997e-9c8d0e803f7f', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:23.055+00', '2026-03-17 16:50:23.055+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('d295d2c7-bd22-4a89-9b47-083773b0190f', 'S93R1H3', '378b72b7-f320-449f-997e-9c8d0e803f7f', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:23.223+00', '2026-03-17 16:50:23.223+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('aeadf85f-c630-42bd-9ef1-d6a058c31fb1', 'S93R1H4', '378b72b7-f320-449f-997e-9c8d0e803f7f', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:23.395+00', '2026-03-17 16:50:23.395+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('0eb2063e-5784-4f2e-9ace-5cf20090d21f', 'S93R1H5', '378b72b7-f320-449f-997e-9c8d0e803f7f', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:23.615+00', '2026-03-17 16:50:23.615+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('e93e03f9-ea54-4bc7-a91b-307ad81540ab', 'S93R2H1', '378b72b7-f320-449f-997e-9c8d0e803f7f', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:23.815+00', '2026-03-17 16:50:23.815+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('6655c9b5-522f-488e-b548-805a58724a82', 'S93R2H2', '378b72b7-f320-449f-997e-9c8d0e803f7f', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:24.015+00', '2026-03-17 16:50:24.015+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('1c444dbe-ba2a-455b-8e4f-790cf186ee91', 'S93R2H3', '378b72b7-f320-449f-997e-9c8d0e803f7f', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:24.195+00', '2026-03-17 16:50:24.195+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('c7687532-57b8-49fd-9071-e8a3c20f4eb1', 'S93R2H4', '378b72b7-f320-449f-997e-9c8d0e803f7f', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:24.404+00', '2026-03-17 16:50:24.404+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('20bf92e8-9d29-4136-9651-9e86b464afc4', 'S93R2H5', '378b72b7-f320-449f-997e-9c8d0e803f7f', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:24.595+00', '2026-03-17 16:50:24.595+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('543aee35-8c24-45ef-b937-92172c0b70ff', 'S93R3H1', '378b72b7-f320-449f-997e-9c8d0e803f7f', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:24.763+00', '2026-03-17 16:50:24.763+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('ba60e3d7-f63d-41ab-ac7c-63ecdbd05d6e', 'S93R3H2', '378b72b7-f320-449f-997e-9c8d0e803f7f', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:24.995+00', '2026-03-17 16:50:24.995+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('aed8abea-c334-4eca-9b94-f48599371b5c', 'S93R3H3', '378b72b7-f320-449f-997e-9c8d0e803f7f', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:25.263+00', '2026-03-17 16:50:25.263+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('30bed8fe-9751-4b29-8f6a-9e10d761ab6c', 'S93R3H4', '378b72b7-f320-449f-997e-9c8d0e803f7f', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:25.435+00', '2026-03-17 16:50:25.435+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('566b95a9-b9ae-42a4-a9aa-6e6e93e362b6', 'S93R3H5', '378b72b7-f320-449f-997e-9c8d0e803f7f', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:25.643+00', '2026-03-17 16:50:25.643+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('2fa5ccca-0b8f-45ee-8443-89d98668a8b6', 'S93R4H1', '378b72b7-f320-449f-997e-9c8d0e803f7f', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:25.863+00', '2026-03-17 16:50:25.863+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('935b8a90-b356-4ec9-9644-79fad5c8b4e0', 'S93R4H2', '378b72b7-f320-449f-997e-9c8d0e803f7f', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:26.015+00', '2026-03-17 16:50:26.015+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('b464ef64-21eb-4d4e-8806-6770a20c40ee', 'S93R4H3', '378b72b7-f320-449f-997e-9c8d0e803f7f', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:26.195+00', '2026-03-17 16:50:26.195+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('7df2ad7f-8ea4-41fe-95c9-724f93e3cedd', 'S93R4H4', '378b72b7-f320-449f-997e-9c8d0e803f7f', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:26.364+00', '2026-03-17 16:50:26.364+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('55e3b43f-31fb-4a5d-8e26-de8bd74a40cc', 'S93R4H5', '378b72b7-f320-449f-997e-9c8d0e803f7f', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:26.583+00', '2026-03-17 16:50:26.583+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('02ef10a4-3fc1-4561-a0ca-7ab1bcca7242', 'S95R1H1', '1508eda3-5e35-4fd3-83dd-aa075a053456', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:26.783+00', '2026-03-17 16:50:26.783+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('6973439c-37bf-4b7b-b68f-31b753433a18', 'S95R1H2', '1508eda3-5e35-4fd3-83dd-aa075a053456', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:26.974+00', '2026-03-17 16:50:26.974+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('01f1af06-3d23-4ee5-b78e-0a0f119b9393', 'S95R1H3', '1508eda3-5e35-4fd3-83dd-aa075a053456', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:27.175+00', '2026-03-17 16:50:27.175+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('3a1baa22-ea82-4862-bf5a-3e028d3c264c', 'S95R1H4', '1508eda3-5e35-4fd3-83dd-aa075a053456', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:27.395+00', '2026-03-17 16:50:27.395+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('bccb9c8e-1000-4124-b212-bbcaff184297', 'S95R1H5', '1508eda3-5e35-4fd3-83dd-aa075a053456', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:27.574+00', '2026-03-17 16:50:27.574+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('3d3063ab-92e4-42a7-bb4b-cc3aae17600f', 'S95R2H1', '1508eda3-5e35-4fd3-83dd-aa075a053456', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:27.775+00', '2026-03-17 16:50:27.775+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('7d719911-65f8-4de4-a169-c2898f7c730e', 'S95R2H2', '1508eda3-5e35-4fd3-83dd-aa075a053456', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:28.015+00', '2026-03-17 16:50:28.015+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('5531affa-ab38-4c3c-9144-ce8343ddfc42', 'S95R2H3', '1508eda3-5e35-4fd3-83dd-aa075a053456', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:28.275+00', '2026-03-17 16:50:28.275+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('47085588-05cc-4245-bd3b-2281357c7d54', 'S95R2H4', '1508eda3-5e35-4fd3-83dd-aa075a053456', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:28.443+00', '2026-03-17 16:50:28.443+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('156f6bd7-6601-4aae-8682-0908ad81f64c', 'S95R2H5', '1508eda3-5e35-4fd3-83dd-aa075a053456', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:28.615+00', '2026-03-17 16:50:28.615+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('7eb5dbc8-54ad-44cb-b568-8554867b49fd', 'S95R3H1', '1508eda3-5e35-4fd3-83dd-aa075a053456', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:28.784+00', '2026-03-17 16:50:28.784+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('b42d310f-8f72-49fa-84df-bf2ef9238473', 'S95R3H2', '1508eda3-5e35-4fd3-83dd-aa075a053456', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:28.991+00', '2026-03-17 16:50:28.991+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('17eb2832-98f4-4abf-8186-9e8262eb05bd', 'S95R3H3', '1508eda3-5e35-4fd3-83dd-aa075a053456', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:29.155+00', '2026-03-17 16:50:29.155+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('43e98a9e-1a02-4ad9-aa01-05ce62da46aa', 'S95R3H4', '1508eda3-5e35-4fd3-83dd-aa075a053456', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:29.323+00', '2026-03-17 16:50:29.323+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('b130497e-ba63-4e3d-a1d6-86f916808fdb', 'S95R3H5', '1508eda3-5e35-4fd3-83dd-aa075a053456', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:29.515+00', '2026-03-17 16:50:29.515+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('4c65defc-9be1-4a5f-b297-021e90434df8', 'S95R4H1', '1508eda3-5e35-4fd3-83dd-aa075a053456', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:29.763+00', '2026-03-17 16:50:29.763+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('879c643d-f8b5-407d-be44-a3eeee97542f', 'S95R4H2', '1508eda3-5e35-4fd3-83dd-aa075a053456', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:29.956+00', '2026-03-17 16:50:29.956+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('2bb63f71-d481-42fb-babd-187e1269ce5b', 'S95R4H3', '1508eda3-5e35-4fd3-83dd-aa075a053456', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:30.155+00', '2026-03-17 16:50:30.155+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('2ed247b8-0a20-4f93-b47d-0d49905eec85', 'S95R4H4', '1508eda3-5e35-4fd3-83dd-aa075a053456', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:30.363+00', '2026-03-17 16:50:30.363+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('04c35381-443d-4582-ba0d-d55425ab3605', 'S95R4H5', '1508eda3-5e35-4fd3-83dd-aa075a053456', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:30.555+00', '2026-03-17 16:50:30.555+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('113c427f-36de-4ffa-967f-d28b4166f150', 'S97R1H1', 'bb3faac4-2e5f-43ca-beec-fc9b39b8cd2b', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:30.755+00', '2026-03-17 16:50:30.755+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('5baa41e9-55a1-49be-9318-f610e4d1c895', 'S97R1H2', 'bb3faac4-2e5f-43ca-beec-fc9b39b8cd2b', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:30.963+00', '2026-03-17 16:50:30.963+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('3081083f-1e28-416e-9031-fa8b5207c754', 'S97R1H3', 'bb3faac4-2e5f-43ca-beec-fc9b39b8cd2b', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:31.155+00', '2026-03-17 16:50:31.155+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('429c8504-fbab-4217-88b3-67b84694191c', 'S97R1H4', 'bb3faac4-2e5f-43ca-beec-fc9b39b8cd2b', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:31.355+00', '2026-03-17 16:50:31.355+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('d50d9e51-3c4a-484f-96b5-374af7b4f878', 'S97R1H5', 'bb3faac4-2e5f-43ca-beec-fc9b39b8cd2b', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:31.515+00', '2026-03-17 16:50:31.515+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('3b023a89-38dc-4f12-9def-655f2edd3e36', 'S97R2H1', 'bb3faac4-2e5f-43ca-beec-fc9b39b8cd2b', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:31.715+00', '2026-03-17 16:50:31.715+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('121b1de8-4246-47a5-a69d-f4efef00b60b', 'S97R2H2', 'bb3faac4-2e5f-43ca-beec-fc9b39b8cd2b', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:31.916+00', '2026-03-17 16:50:31.916+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('519402c5-cb3f-40ee-b3e8-460cdca4fe42', 'S97R2H3', 'bb3faac4-2e5f-43ca-beec-fc9b39b8cd2b', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:32.123+00', '2026-03-17 16:50:32.123+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('ef0cf144-b343-4d4d-a870-745d9ea23d37', 'S97R2H4', 'bb3faac4-2e5f-43ca-beec-fc9b39b8cd2b', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:32.283+00', '2026-03-17 16:50:32.283+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('3b580bb1-f27f-4ea4-b64d-e9f7b4509425', 'S97R2H5', 'bb3faac4-2e5f-43ca-beec-fc9b39b8cd2b', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:32.484+00', '2026-03-17 16:50:32.484+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('efd67718-23aa-4576-9028-4c3282a30004', 'S97R3H1', 'bb3faac4-2e5f-43ca-beec-fc9b39b8cd2b', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:32.675+00', '2026-03-17 16:50:32.675+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('c6e52db4-f47c-4b59-a07b-d169c3a0575f', 'S97R3H2', 'bb3faac4-2e5f-43ca-beec-fc9b39b8cd2b', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:32.855+00', '2026-03-17 16:50:32.855+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('58e5427f-1f34-424c-8b58-3487ac95dcb3', 'S97R3H3', 'bb3faac4-2e5f-43ca-beec-fc9b39b8cd2b', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:33.055+00', '2026-03-17 16:50:33.055+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('aa77c19c-7fb2-404a-944b-3898ddc736c7', 'S97R3H4', 'bb3faac4-2e5f-43ca-beec-fc9b39b8cd2b', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:33.215+00', '2026-03-17 16:50:33.215+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('78bdf0c7-8d93-418f-9174-98b879240b9e', 'S97R3H5', 'bb3faac4-2e5f-43ca-beec-fc9b39b8cd2b', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:33.435+00', '2026-03-17 16:50:33.435+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('aafce54f-7227-4169-9bf8-9bd437c7819e', 'S97R4H1', 'bb3faac4-2e5f-43ca-beec-fc9b39b8cd2b', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:33.635+00', '2026-03-17 16:50:33.635+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('ef5e1527-4bfc-4718-933a-62d8e3c7fe64', 'S97R4H2', 'bb3faac4-2e5f-43ca-beec-fc9b39b8cd2b', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:33.808+00', '2026-03-17 16:50:33.808+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('f2cdf961-8ca5-440d-b37e-4a3f668883d3', 'S97R4H3', 'bb3faac4-2e5f-43ca-beec-fc9b39b8cd2b', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:33.995+00', '2026-03-17 16:50:33.995+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('2ff75deb-9ebc-4101-8743-428ac4c65827', 'S97R4H4', 'bb3faac4-2e5f-43ca-beec-fc9b39b8cd2b', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:34.175+00', '2026-03-17 16:50:34.175+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('33ebd303-b885-4ca1-93db-0d3d32d97628', 'S97R4H5', 'bb3faac4-2e5f-43ca-beec-fc9b39b8cd2b', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:34.355+00', '2026-03-17 16:50:34.355+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('db5cd8ab-83c3-4acc-8d8d-0108c0914457', 'S99R1H1', 'b4430373-2de7-4a02-83b3-8283f8f1a3e6', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:34.575+00', '2026-03-17 16:50:34.575+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('0c1f6163-a61e-4f02-98ee-6480536350ab', 'S99R1H2', 'b4430373-2de7-4a02-83b3-8283f8f1a3e6', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:34.751+00', '2026-03-17 16:50:34.751+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('e60a64f6-129b-4bc5-b649-cc6a219ad250', 'S99R1H3', 'b4430373-2de7-4a02-83b3-8283f8f1a3e6', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:34.956+00', '2026-03-17 16:50:34.956+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('94ec38c7-ffa5-4313-9c3e-ada24a81214f', 'S99R1H4', 'b4430373-2de7-4a02-83b3-8283f8f1a3e6', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:35.115+00', '2026-03-17 16:50:35.115+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('78f356e0-9a7a-4f65-83c2-950bf18e4793', 'S99R1H5', 'b4430373-2de7-4a02-83b3-8283f8f1a3e6', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:35.323+00', '2026-03-17 16:50:35.323+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('f0172c9d-9c7e-4f76-af55-36598a96c248', 'S99R2H1', 'b4430373-2de7-4a02-83b3-8283f8f1a3e6', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:35.475+00', '2026-03-17 16:50:35.475+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('f78ef587-7320-4c75-8c90-77a4cfc87cef', 'S99R2H2', 'b4430373-2de7-4a02-83b3-8283f8f1a3e6', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:35.683+00', '2026-03-17 16:50:35.683+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('2cfa9ca0-e209-4b4b-9337-ae3985c87508', 'S99R2H3', 'b4430373-2de7-4a02-83b3-8283f8f1a3e6', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:35.875+00', '2026-03-17 16:50:35.875+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('68bf81f2-c5c3-4cbc-908e-b5e5a02ea0cb', 'S99R2H4', 'b4430373-2de7-4a02-83b3-8283f8f1a3e6', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:36.055+00', '2026-03-17 16:50:36.055+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('ef0166ef-bb82-4c34-9a0e-bb3faec6f73e', 'S99R2H5', 'b4430373-2de7-4a02-83b3-8283f8f1a3e6', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:36.275+00', '2026-03-17 16:50:36.275+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('fbd7b842-e12b-416c-ae2a-838ce109f87f', 'S99R3H1', 'b4430373-2de7-4a02-83b3-8283f8f1a3e6', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:36.491+00', '2026-03-17 16:50:36.491+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('50807bea-baa0-40bc-b71d-18e4b02dce58', 'S99R3H2', 'b4430373-2de7-4a02-83b3-8283f8f1a3e6', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:36.660+00', '2026-03-17 16:50:36.660+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('acdc638d-0552-4861-abe6-bc96aaeee42f', 'S99R3H3', 'b4430373-2de7-4a02-83b3-8283f8f1a3e6', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:36.855+00', '2026-03-17 16:50:36.855+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('2787dabf-0156-4096-8c07-4ec3ab8f4d8c', 'S99R3H4', 'b4430373-2de7-4a02-83b3-8283f8f1a3e6', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:37.223+00', '2026-03-17 16:50:37.223+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('3d705b27-e6f9-4dcd-a939-201ef3a82044', 'S99R3H5', 'b4430373-2de7-4a02-83b3-8283f8f1a3e6', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:37.384+00', '2026-03-17 16:50:37.384+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('52e8e55b-168e-46f4-a294-07f45bba9b40', 'S99R4H1', 'b4430373-2de7-4a02-83b3-8283f8f1a3e6', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:37.563+00', '2026-03-17 16:50:37.563+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('bda83f2a-1eb4-4a05-b831-86b02cac9807', 'S99R4H2', 'b4430373-2de7-4a02-83b3-8283f8f1a3e6', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:37.735+00', '2026-03-17 16:50:37.735+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('2d02dd48-4ccd-44cf-afa9-c6771e872c24', 'S99R4H3', 'b4430373-2de7-4a02-83b3-8283f8f1a3e6', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:37.895+00', '2026-03-17 16:50:37.895+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('c35cc8ef-e39d-458b-b3c0-320988883fc9', 'S99R4H4', 'b4430373-2de7-4a02-83b3-8283f8f1a3e6', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:38.063+00', '2026-03-17 16:50:38.063+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('442c0648-e50d-478d-9f76-d01ba5a2024b', 'S99R4H5', 'b4430373-2de7-4a02-83b3-8283f8f1a3e6', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:38.243+00', '2026-03-17 16:50:38.243+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('c48417e6-376a-47c9-9f7f-1e8036647a5d', 'S101R1H1', '7c9a62e6-8641-4440-be1a-4fe70cf006f7', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:38.403+00', '2026-03-17 16:50:38.403+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('fcb68dea-df31-49de-989c-a6e41d1ab0f4', 'S101R1H2', '7c9a62e6-8641-4440-be1a-4fe70cf006f7', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:38.591+00', '2026-03-17 16:50:38.591+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('b1f3a597-91a7-438d-948d-cc207b87303d', 'S101R1H3', '7c9a62e6-8641-4440-be1a-4fe70cf006f7', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:38.783+00', '2026-03-17 16:50:38.783+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('b41c839b-9e56-4bd9-8f24-080b837bc13c', 'S101R1H4', '7c9a62e6-8641-4440-be1a-4fe70cf006f7', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:38.943+00', '2026-03-17 16:50:38.943+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('b7668a01-a5a4-490e-83ee-7c924eb5b641', 'S101R2H1', '7c9a62e6-8641-4440-be1a-4fe70cf006f7', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:39.103+00', '2026-03-17 16:50:39.103+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('5d7a94c2-b4d1-4072-8f45-0a9da3171d65', 'S101R2H2', '7c9a62e6-8641-4440-be1a-4fe70cf006f7', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:39.255+00', '2026-03-17 16:50:39.255+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('0bd7d478-0d00-4c11-bb5a-ccb0c68a67ec', 'S101R2H3', '7c9a62e6-8641-4440-be1a-4fe70cf006f7', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:39.423+00', '2026-03-17 16:50:39.423+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('cc39dd81-e172-4f3a-9319-6375a1576981', 'S101R2H4', '7c9a62e6-8641-4440-be1a-4fe70cf006f7', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:39.583+00', '2026-03-17 16:50:39.583+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('73df3c83-8922-4837-a8ce-52212530731e', 'S103R1H1', 'dc9af4d4-6071-4ec7-8eef-cad11bc1b066', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:39.764+00', '2026-03-17 16:50:39.764+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('ce492b75-d3a5-4a69-9e5c-0194e625db23', 'S103R1H2', 'dc9af4d4-6071-4ec7-8eef-cad11bc1b066', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:39.943+00', '2026-03-17 16:50:39.943+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('9f591437-e1a5-40c5-b5b0-2f8c005c1497', 'S103R1H3', 'dc9af4d4-6071-4ec7-8eef-cad11bc1b066', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:40.095+00', '2026-03-17 16:50:40.095+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('fab303fe-27d7-4ea2-b838-68ce1a4378b3', 'S103R1H4', 'dc9af4d4-6071-4ec7-8eef-cad11bc1b066', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:40.263+00', '2026-03-17 16:50:40.263+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('98d151bd-afe6-4d48-8be5-7fc83a84df68', 'S103R1H5', 'dc9af4d4-6071-4ec7-8eef-cad11bc1b066', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:40.435+00', '2026-03-17 16:50:40.435+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('402d6985-d604-428a-b369-b20ec6e249d4', 'S103R2H1', 'dc9af4d4-6071-4ec7-8eef-cad11bc1b066', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:40.603+00', '2026-03-17 16:50:40.603+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('54257e9e-8a69-4fe1-8d23-499f8e2ae231', 'S103R2H2', 'dc9af4d4-6071-4ec7-8eef-cad11bc1b066', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:40.755+00', '2026-03-17 16:50:40.755+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('83e06e21-e6ee-4d3c-8bdd-2f9bd229dace', 'S103R2H3', 'dc9af4d4-6071-4ec7-8eef-cad11bc1b066', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:40.915+00', '2026-03-17 16:50:40.915+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('3feb5d7d-d342-4c9e-ab6a-4e399d6c3f9d', 'S103R2H4', 'dc9af4d4-6071-4ec7-8eef-cad11bc1b066', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:41.084+00', '2026-03-17 16:50:41.084+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('5381ea15-02d9-49f4-aff4-a57ae1e22f10', 'S103R2H5', 'dc9af4d4-6071-4ec7-8eef-cad11bc1b066', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:41.243+00', '2026-03-17 16:50:41.243+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('e729753d-6917-4ef0-a89f-437c58c552f5', 'S103R3H1', 'dc9af4d4-6071-4ec7-8eef-cad11bc1b066', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:41.403+00', '2026-03-17 16:50:41.403+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('80f14a21-ec14-4fe4-8fba-56dc59a85fbb', 'S103R3H2', 'dc9af4d4-6071-4ec7-8eef-cad11bc1b066', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:41.603+00', '2026-03-17 16:50:41.603+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('4b0dc613-158a-41d8-84a7-ae85db95343c', 'S103R3H3', 'dc9af4d4-6071-4ec7-8eef-cad11bc1b066', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:41.755+00', '2026-03-17 16:50:41.755+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('270ee58f-9254-4b6e-a764-b021b0b0ecb7', 'S103R3H4', 'dc9af4d4-6071-4ec7-8eef-cad11bc1b066', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:41.915+00', '2026-03-17 16:50:41.915+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('0736e354-1cc6-41d3-bc86-ada80639f454', 'S103R3H5', 'dc9af4d4-6071-4ec7-8eef-cad11bc1b066', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:42.083+00', '2026-03-17 16:50:42.083+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('f1ad40f5-d547-4cf9-bcc4-c882d32254a0', 'S900R1H1', '15370a31-0a16-4560-b91c-13019ecba55a', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:42.303+00', '2026-03-17 16:50:42.303+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('12e22cf0-3ddd-433f-a86e-56bc5486631c', 'S900R1H2', '15370a31-0a16-4560-b91c-13019ecba55a', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:42.463+00', '2026-03-17 16:50:42.463+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('0c634f8e-29bc-4b13-8029-5d9932bfa826', 'S900R1H3', '15370a31-0a16-4560-b91c-13019ecba55a', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:42.643+00', '2026-03-17 16:50:42.643+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('5e8363ea-848c-4d3e-85ef-6ce686c6b3c1', 'S900R1H4', '15370a31-0a16-4560-b91c-13019ecba55a', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:42.802+00', '2026-03-17 16:50:42.802+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('22ee81ab-c7f4-4695-b47f-401166711225', 'S900R1H5', '15370a31-0a16-4560-b91c-13019ecba55a', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:42.983+00', '2026-03-17 16:50:42.983+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('3dfdbfb8-6f5d-46b6-9af1-48ca88cb6ee6', 'S900R2H1', '15370a31-0a16-4560-b91c-13019ecba55a', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:43.190+00', '2026-03-17 16:50:43.190+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('a986f0e2-c8bf-4af9-aaef-b0ab44a84951', 'S900R2H2', '15370a31-0a16-4560-b91c-13019ecba55a', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:43.371+00', '2026-03-17 16:50:43.371+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('1abfed2e-110f-4b5e-90f7-bcaba05bd8d4', 'S900R2H3', '15370a31-0a16-4560-b91c-13019ecba55a', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:43.543+00', '2026-03-17 16:50:43.543+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('896fd441-301f-4a55-9e9d-83b3de7a3ba8', 'S900R2H4', '15370a31-0a16-4560-b91c-13019ecba55a', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:43.723+00', '2026-03-17 16:50:43.723+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('4937df63-75b7-4c7d-bccb-cc58f93e9791', 'S900R2H5', '15370a31-0a16-4560-b91c-13019ecba55a', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:43.955+00', '2026-03-17 16:50:43.955+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('bfe39baa-d46d-477f-801c-d3aefff50986', 'S900R3H1', '15370a31-0a16-4560-b91c-13019ecba55a', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:44.183+00', '2026-03-17 16:50:44.183+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('e9e6734f-03c4-4717-af2b-0719eaf7cf8d', 'S900R3H2', '15370a31-0a16-4560-b91c-13019ecba55a', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:44.363+00', '2026-03-17 16:50:44.363+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('71478be2-6cb0-4fcb-8409-3038ffdb8d72', 'S900R3H3', '15370a31-0a16-4560-b91c-13019ecba55a', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:44.555+00', '2026-03-17 16:50:44.555+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('9f8b7df6-3724-462f-b13e-ad253834ce5f', 'S900R3H4', '15370a31-0a16-4560-b91c-13019ecba55a', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:44.755+00', '2026-03-17 16:50:44.755+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('c21a29d5-306c-44ae-91c4-49e0d27a1fdf', 'S900R3H5', '15370a31-0a16-4560-b91c-13019ecba55a', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:44.974+00', '2026-03-17 16:50:44.974+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('b59a7fed-d84a-4c6b-be5b-4383c5fc882d', 'S900R4H1', '15370a31-0a16-4560-b91c-13019ecba55a', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:45.155+00', '2026-03-17 16:50:45.155+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('82606671-4307-4209-8fe7-0e13a04db632', 'S900R4H2', '15370a31-0a16-4560-b91c-13019ecba55a', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:45.371+00', '2026-03-17 16:50:45.371+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('a6852f35-a42e-43ad-8c48-93c96f475c9a', 'S900R4H3', '15370a31-0a16-4560-b91c-13019ecba55a', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:45.555+00', '2026-03-17 16:50:45.555+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('82433859-6f9a-4842-8b70-2ffce436cff8', 'S900R4H4', '15370a31-0a16-4560-b91c-13019ecba55a', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:45.755+00', '2026-03-17 16:50:45.755+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('c286ff57-c54b-49a6-8eb3-54f97ab8f288', 'S900R4H5', '15370a31-0a16-4560-b91c-13019ecba55a', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:45.955+00', '2026-03-17 16:50:45.955+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('89031b89-5923-4029-ae03-cceb966535e7', 'S900R5H1', '15370a31-0a16-4560-b91c-13019ecba55a', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:46.155+00', '2026-03-17 16:50:46.155+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('aa38329a-2fda-4e21-ae9e-530fa50cb617', 'S900R5H2', '15370a31-0a16-4560-b91c-13019ecba55a', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:46.375+00', '2026-03-17 16:50:46.375+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('3002e519-cad9-4057-9a6c-e386f046daae', 'S900R5H3', '15370a31-0a16-4560-b91c-13019ecba55a', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:46.575+00', '2026-03-17 16:50:46.575+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('3af834c8-a4fa-4c6d-9eab-c041261d5919', 'S900R5H4', '15370a31-0a16-4560-b91c-13019ecba55a', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:46.755+00', '2026-03-17 16:50:46.755+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('c8297cfa-22fa-4cc4-999d-0f17aab44796', 'S900R5H5', '15370a31-0a16-4560-b91c-13019ecba55a', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:46.984+00', '2026-03-17 16:50:46.984+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('6155e91d-1961-44d1-a02c-d1eacb73f846', 'S901R1H1', '6ba6bb8b-33d7-4aca-8062-01ef903b4a96', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:47.135+00', '2026-03-17 16:50:47.135+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('eb4f9230-60f4-457c-807c-e669a6429d3e', 'S901R1H2', '6ba6bb8b-33d7-4aca-8062-01ef903b4a96', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:47.335+00', '2026-03-17 16:50:47.335+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('0a688398-750f-4106-9b6f-6b169ff28948', 'S901R1H3', '6ba6bb8b-33d7-4aca-8062-01ef903b4a96', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:47.495+00', '2026-03-17 16:50:47.495+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('3c650040-b42f-4b38-a7b1-4e4fe2fb1a6e', 'S901R1H4', '6ba6bb8b-33d7-4aca-8062-01ef903b4a96', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:47.693+00', '2026-03-17 16:50:47.693+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('cc3d7c70-6eb5-49fe-b935-d2e73ad45e13', 'S901R1H5', '6ba6bb8b-33d7-4aca-8062-01ef903b4a96', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 1, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:47.875+00', '2026-03-17 16:50:47.875+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('b5d28417-ce63-40cf-90a1-9525366171ba', 'S901R2H1', '6ba6bb8b-33d7-4aca-8062-01ef903b4a96', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:48.063+00', '2026-03-17 16:50:48.063+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('548e656a-6422-460f-bd4b-5a82a3fd8334', 'S901R2H2', '6ba6bb8b-33d7-4aca-8062-01ef903b4a96', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:48.265+00', '2026-03-17 16:50:48.265+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('d2967782-3af9-41c0-bab8-201f2f2b6239', 'S901R2H3', '6ba6bb8b-33d7-4aca-8062-01ef903b4a96', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:48.474+00', '2026-03-17 16:50:48.474+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('e06501ee-5ab5-4218-881e-9b5a2bf16502', 'S901R2H4', '6ba6bb8b-33d7-4aca-8062-01ef903b4a96', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:48.674+00', '2026-03-17 16:50:48.674+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('e2f6780c-6f70-441b-8fee-fbf28df1f461', 'S901R2H5', '6ba6bb8b-33d7-4aca-8062-01ef903b4a96', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 2, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:48.855+00', '2026-03-17 16:50:48.855+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('6a680251-633b-4d4a-beee-ada64d29d48d', 'S901R3H1', '6ba6bb8b-33d7-4aca-8062-01ef903b4a96', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:49.034+00', '2026-03-17 16:50:49.034+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('27848b2c-b979-4e1d-b312-e769e39b9f26', 'S901R3H2', '6ba6bb8b-33d7-4aca-8062-01ef903b4a96', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:49.255+00', '2026-03-17 16:50:49.255+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('0395f444-338a-4ed7-b773-7f89bec8f952', 'S901R3H3', '6ba6bb8b-33d7-4aca-8062-01ef903b4a96', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:49.455+00', '2026-03-17 16:50:49.455+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('3d3e46fd-ef07-408e-8277-5ffa676f96ca', 'S901R3H4', '6ba6bb8b-33d7-4aca-8062-01ef903b4a96', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:49.655+00', '2026-03-17 16:50:49.655+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('aafb3d8d-485c-489c-987d-5f6ae482441b', 'S901R3H5', '6ba6bb8b-33d7-4aca-8062-01ef903b4a96', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 3, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:49.835+00', '2026-03-17 16:50:49.835+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('10e0955f-3993-4615-a274-3e4add08e798', 'S901R4H1', '6ba6bb8b-33d7-4aca-8062-01ef903b4a96', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:50.016+00', '2026-03-17 16:50:50.016+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('9dd252c6-72cf-448c-b313-635c21b2e537', 'S901R4H2', '6ba6bb8b-33d7-4aca-8062-01ef903b4a96', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:50.223+00', '2026-03-17 16:50:50.223+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('4318d6d5-bb6c-498e-8e95-7aee7c996e79', 'S901R4H3', '6ba6bb8b-33d7-4aca-8062-01ef903b4a96', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:50.408+00', '2026-03-17 16:50:50.408+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('92623900-a553-47ed-a0bb-bff9ad05de81', 'S901R4H4', '6ba6bb8b-33d7-4aca-8062-01ef903b4a96', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:50.615+00', '2026-03-17 16:50:50.615+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('51276b3f-783e-469e-82b5-34ee250e0a40', 'S901R4H5', '6ba6bb8b-33d7-4aca-8062-01ef903b4a96', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 4, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:50.775+00', '2026-03-17 16:50:50.775+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('69279244-c831-451d-a924-abbe9533cc0b', 'S901R5H1', '6ba6bb8b-33d7-4aca-8062-01ef903b4a96', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 1, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:50.935+00', '2026-03-17 16:50:50.935+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('40bbc947-f6ec-4353-bada-931f77ab341f', 'S901R5H2', '6ba6bb8b-33d7-4aca-8062-01ef903b4a96', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 2, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:51.103+00', '2026-03-17 16:50:51.103+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('0314b903-e37f-4d80-b55a-0f12b4f5752b', 'S901R5H3', '6ba6bb8b-33d7-4aca-8062-01ef903b4a96', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 3, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:51.271+00', '2026-03-17 16:50:51.271+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('7c550981-ed75-4440-b42c-dc07d2bb281c', 'S901R5H4', '6ba6bb8b-33d7-4aca-8062-01ef903b4a96', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 4, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:51.453+00', '2026-03-17 16:50:51.453+00', true, NULL);
INSERT INTO public."locations" ("id", "location_id", "stack_id", "yard_id", "row_number", "tier_number", "is_virtual", "virtual_stack_pair_id", "is_occupied", "container_id", "container_size", "client_pool_id", "is_active", "created_at", "updated_at", "available", "container_number") VALUES ('15881f6c-d302-482a-b6a7-3d7e5f2c693b', 'S901R5H5', '6ba6bb8b-33d7-4aca-8062-01ef903b4a96', '2554a779-a14b-45ed-a1e1-684e2fd9b614', 5, 5, false, NULL, false, NULL, NULL, NULL, true, '2026-03-17 16:50:51.615+00', '2026-03-17 16:50:51.615+00', true, NULL);
INSERT INTO public."edi_server_configurations" ("id", "name", "type", "host", "port", "username", "password", "remote_path", "enabled", "test_mode", "timeout", "retry_attempts", "partner_code", "sender_code", "file_name_pattern", "assigned_clients", "is_default", "created_at", "updated_at") VALUES ('00000000-0000-0000-0000-000000000003', 'ONE LINE TEST', 'SFTP', 'ediftptest-ndc.one-line.com', 22, 'mantraf', 'Iz@n0g1man', '/in', true, false, 30000, 3, 'ONEY', 'MANTRA', 'CODECO_{timestamp}_{container}_{operation}.edi', '["ONE LINE"]'::jsonb, false, '2025-12-17 12:16:30.074+00', '2026-02-10 18:16:03.002+00');
INSERT INTO public."edi_client_settings" ("id", "client_id", "client_code", "client_name", "edi_enabled", "enable_gate_in", "enable_gate_out", "server_config_id", "priority", "notes", "created_at", "updated_at", "notification_prefs") VALUES ('bc01eec5-5dd9-4a27-8943-672e9bd7d8ef', 'f7fcb0b8-5771-444c-9dd1-5f014c0207ff', '1088663', 'ONE LINE', true, true, true, '00000000-0000-0000-0000-000000000003', 'normal', NULL, '2026-02-10 18:13:52.157+00', '2026-02-10 18:34:41.011+00', '{"channels":["in-app"],"notifyOnFailure":true,"notifyOnSuccess":false}'::jsonb);
INSERT INTO public."edi_client_settings" ("id", "client_id", "client_code", "client_name", "edi_enabled", "enable_gate_in", "enable_gate_out", "server_config_id", "priority", "notes", "created_at", "updated_at", "notification_prefs") VALUES ('36613c3e-7f7a-48cd-b062-c74ee0d7a108', '0045251f-518b-40f3-9a39-25ce01ebd5f1', '1052069', 'PIL', false, false, false, NULL, 'normal', NULL, '2026-03-04 18:38:24.317+00', '2026-03-04 18:38:24.317+00', '{"channels":["in-app"],"notifyOnFailure":true,"notifyOnSuccess":false}'::jsonb);
INSERT INTO public."audit_logs" ("id", "entity_type", "entity_id", "action", "changes", "user_id", "user_name", "timestamp", "ip_address", "user_agent") VALUES ('5e8843dd-e5a3-418c-940e-2d9a4a9c1ef2', 'user', 'f4ef9b8e-325d-4ac1-940f-bca5b5284848', 'update', '{"after":{"last_login":"2026-03-17T17:48:18.479Z","updated_at":"2026-03-17T17:48:19.118Z"},"before":{"id":"f4ef9b8e-325d-4ac1-940f-bca5b5284848","name":"Sayegh Habib","role":"admin","email":"habib.sayegh@olamnet.com","yardIds":["2554a779-a14b-45ed-a1e1-684e2fd9b614"],"isActive":true,"createdAt":"2026-01-27T15:00:18.845Z","createdBy":"System","isDeleted":false,"lastLogin":"2026-03-17T15:35:02.563Z","updatedBy":"003bec1e-e37c-4040-a722-441f88346d54","moduleAccess":{"edi":true,"yard":true,"users":true,"gateIn":true,"clients":true,"gateOut":true,"reports":true,"releases":true,"analytics":true,"auditLogs":true,"dashboard":true,"containers":true,"clientPools":true,"moduleAccess":true,"timeTracking":true,"billingReports":true,"depotManagement":true,"stackManagement":true,"operationsReports":true}},"operationId":"update-user-f4ef9b8e-325d-4ac1-940f-bca5b5284848-1773769698481","fieldsChanged":["last_login"]}'::jsonb, 'system', 'system', '2026-03-17 17:48:19.567+00', 'unknown', 'unknown');
INSERT INTO public."audit_logs" ("id", "entity_type", "entity_id", "action", "changes", "user_id", "user_name", "timestamp", "ip_address", "user_agent") VALUES ('3c5d266b-a7ad-4eaa-9857-17e65f6d00a0', 'user', 'f4ef9b8e-325d-4ac1-940f-bca5b5284848', 'update', '{"after":{"last_login":"2026-03-17T17:48:52.760Z","updated_at":"2026-03-17T17:48:53.027Z"},"before":{"id":"f4ef9b8e-325d-4ac1-940f-bca5b5284848","name":"Sayegh Habib","role":"admin","email":"habib.sayegh@olamnet.com","yardIds":["2554a779-a14b-45ed-a1e1-684e2fd9b614"],"isActive":true,"createdAt":"2026-01-27T15:00:18.845Z","createdBy":"System","isDeleted":false,"lastLogin":"2026-03-17T17:48:18.479Z","updatedBy":"003bec1e-e37c-4040-a722-441f88346d54","moduleAccess":{"edi":true,"yard":true,"users":true,"gateIn":true,"clients":true,"gateOut":true,"reports":true,"releases":true,"analytics":true,"auditLogs":true,"dashboard":true,"containers":true,"clientPools":true,"moduleAccess":true,"timeTracking":true,"billingReports":true,"depotManagement":true,"stackManagement":true,"operationsReports":true}},"operationId":"update-user-f4ef9b8e-325d-4ac1-940f-bca5b5284848-1773769732761","fieldsChanged":["last_login"]}'::jsonb, 'system', 'system', '2026-03-17 17:48:53.267+00', 'unknown', 'unknown');
INSERT INTO public."user_module_access" ("id", "user_id", "module_permissions", "updated_at", "updated_by", "sync_version", "last_sync_at", "sync_source") VALUES ('1244597d-b6a7-4f0b-8795-df01d96ae942', 'f4ef9b8e-325d-4ac1-940f-bca5b5284848', '{"edi":true,"yard":true,"users":true,"gateIn":true,"clients":true,"gateOut":true,"reports":true,"releases":true,"analytics":true,"auditLogs":true,"dashboard":true,"containers":true,"clientPools":true,"moduleAccess":true,"timeTracking":true,"billingReports":true,"depotManagement":true,"stackManagement":true,"operationsReports":true}'::jsonb, '2026-01-27 15:00:19.230+00', 'f4ef9b8e-325d-4ac1-940f-bca5b5284848', 1, '2026-01-27 15:00:19.230+00', 'user_module_access');
INSERT INTO public."user_module_access" ("id", "user_id", "module_permissions", "updated_at", "updated_by", "sync_version", "last_sync_at", "sync_source") VALUES ('846a7ce7-132e-4a4e-8ea3-50fd789150d9', 'b2b78129-d250-441d-b8a7-58442ebf67eb', '{"edi":true,"yard":true,"users":false,"gateIn":true,"clients":false,"gateOut":true,"reports":false,"releases":true,"analytics":false,"auditLogs":false,"dashboard":true,"containers":true,"clientPools":true,"moduleAccess":false,"timeTracking":false,"billingReports":false,"depotManagement":false,"stackManagement":false,"operationsReports":false}'::jsonb, '2026-01-27 15:31:32.084+00', 'f4ef9b8e-325d-4ac1-940f-bca5b5284848', 13, '2026-01-27 15:31:32.084+00', 'user_module_access');
INSERT INTO public."user_module_access" ("id", "user_id", "module_permissions", "updated_at", "updated_by", "sync_version", "last_sync_at", "sync_source") VALUES ('070e2e6b-08aa-4326-bea6-65620181224d', 'acd2f95c-bb33-4e6a-8e7f-7cd0b617527e', '{"edi":true,"yard":true,"users":false,"gateIn":true,"clients":true,"gateOut":true,"reports":false,"releases":true,"analytics":false,"auditLogs":false,"dashboard":true,"containers":true,"clientPools":true,"moduleAccess":false,"timeTracking":true,"billingReports":false,"depotManagement":false,"stackManagement":false,"operationsReports":true}'::jsonb, '2026-02-24 17:08:05.015+00', 'f4ef9b8e-325d-4ac1-940f-bca5b5284848', 13, '2026-02-24 17:08:05.015+00', 'user_module_access');

-- Refresh Materialized Views (after data insert)
REFRESH MATERIALIZED VIEW public."edi_client_performance";
REFRESH MATERIALIZED VIEW public."edi_dashboard_stats";
REFRESH MATERIALIZED VIEW public."location_statistics_by_stack";
REFRESH MATERIALIZED VIEW public."location_statistics_by_yard";
REFRESH MATERIALIZED VIEW public."sync_health_summary";

-- ================================================================
-- 7. SÉQUENCES
-- ================================================================


-- ================================================================
-- 8. ROW LEVEL SECURITY
-- ================================================================

ALTER TABLE public."clients" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."yards" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."sections" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."stacks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."stack_pairings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."virtual_stack_pairs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."container_types" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."locations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."location_id_mappings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."edi_server_configurations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."client_pools" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."stack_assignments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."booking_references" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."gate_in_operations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."gate_out_operations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."containers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."container_buffer_zones" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."edi_client_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."edi_transmission_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."edi_notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."gate_in_edi_details" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."gate_in_transport_info" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."gate_in_damage_assessments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."gate_out_edi_details" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."gate_out_transport_info" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."audit_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."location_audit_log" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."user_activities" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."user_login_history" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."user_module_access" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."module_access_sync_log" ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- FIN DU BACKUP
-- ================================================================
