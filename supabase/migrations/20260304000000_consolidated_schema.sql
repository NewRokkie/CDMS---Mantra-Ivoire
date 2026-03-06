-- ============================================
-- CDMS - Complete Database Schema
-- ============================================
-- Source: Supabase Production (nelmhiqsoamjluadnlvd)
-- Generated: 2026-03-04
-- Description: Complete schema export with proper dependency order
-- ============================================

BEGIN;

-- ============================================
-- EXTENSIONS
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;

-- ============================================
-- ENUMS
-- ============================================

-- Add any custom enums here if they exist in the database

-- ============================================
-- TABLES - Core Reference Data (No FK dependencies)
-- ============================================

-- Table: container_types
-- Reference table for container types with High-Cube support
CREATE TABLE IF NOT EXISTS public.container_types (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    type_code VARCHAR(20) NOT NULL,
    display_name VARCHAR(50) NOT NULL,
    is_high_cube BOOLEAN DEFAULT false,
    available_sizes TEXT[] DEFAULT ARRAY['20ft', '40ft'],
    iso_code_20 VARCHAR(10),
    iso_code_40 VARCHAR(10),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT container_types_pkey PRIMARY KEY (id),
    CONSTRAINT container_types_type_code_key UNIQUE (type_code)
);

-- Table: yards
-- Yards/depots for container storage
CREATE TABLE IF NOT EXISTS public.yards (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    location TEXT NOT NULL,
    description TEXT,
    layout TEXT DEFAULT 'standard'::text,
    is_active BOOLEAN DEFAULT true,
    total_capacity INTEGER DEFAULT 0,
    current_occupancy INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by TEXT,
    timezone TEXT DEFAULT 'Africa/Abidjan'::text,
    contact_info JSONB,
    address JSONB,
    updated_by UUID,
    CONSTRAINT yards_pkey PRIMARY KEY (id),
    CONSTRAINT yards_code_key UNIQUE (code)
);

-- Table: sections
-- Sections within yards
CREATE TABLE IF NOT EXISTS public.sections (
    id TEXT NOT NULL,
    yard_id TEXT NOT NULL,
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT sections_pkey PRIMARY KEY (id)
);

-- ============================================
-- TABLES - Users & Authentication
-- ============================================

-- Table: users
-- User management with soft delete support
CREATE TABLE IF NOT EXISTS public.users (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    auth_user_id UUID,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'viewer'::text,
    yard_ids JSONB DEFAULT '[]'::jsonb,
    module_access JSONB DEFAULT '{}'::jsonb,
    active BOOLEAN DEFAULT true,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMPTZ,
    deleted_by TEXT,
    created_by TEXT,
    updated_by TEXT,
    CONSTRAINT users_pkey PRIMARY KEY (id),
    CONSTRAINT users_email_key UNIQUE (email)
);

-- ============================================
-- TABLES - Clients
-- ============================================

-- Table: clients
-- Client information and settings
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    free_days_allowed INTEGER NOT NULL DEFAULT 3,
    daily_storage_rate NUMERIC NOT NULL DEFAULT 45.00,
    currency TEXT NOT NULL DEFAULT 'USD'::text,
    auto_edi BOOLEAN NOT NULL DEFAULT false,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    billing_address JSONB,
    tax_id TEXT,
    credit_limit NUMERIC NOT NULL DEFAULT 0,
    payment_terms INTEGER NOT NULL DEFAULT 30,
    notes TEXT,
    created_by TEXT DEFAULT 'System'::text,
    updated_by TEXT DEFAULT 'System'::text,
    address JSONB NOT NULL DEFAULT '{"city": "", "state": "", "street": "", "country": "Côte d''Ivoire", "zipCode": ""}'::jsonb,
    contact_person JSONB DEFAULT '{"name": "", "email": "", "phone": "", "position": ""}'::jsonb,
    CONSTRAINT clients_pkey PRIMARY KEY (id),
    CONSTRAINT clients_code_key UNIQUE (code)
);

-- ============================================
-- TABLES - Stack Management
-- ============================================

-- Table: stacks
-- Container stacks/pistes with buffer zone support
CREATE TABLE IF NOT EXISTS public.stacks (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    yard_id TEXT NOT NULL,
    stack_number INTEGER NOT NULL,
    section_id TEXT,
    section_name TEXT NOT NULL DEFAULT 'Main Section'::text,
    rows INTEGER NOT NULL DEFAULT 6,
    max_tiers INTEGER NOT NULL DEFAULT 4,
    capacity INTEGER NOT NULL DEFAULT 0,
    current_occupancy INTEGER NOT NULL DEFAULT 0,
    position_x NUMERIC DEFAULT 0,
    position_y NUMERIC DEFAULT 0,
    position_z NUMERIC DEFAULT 0,
    width NUMERIC DEFAULT 2.5,
    length NUMERIC DEFAULT 12,
    is_active BOOLEAN DEFAULT true,
    is_odd_stack BOOLEAN DEFAULT false,
    assigned_client_code TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by TEXT,
    updated_by TEXT,
    container_size TEXT NOT NULL DEFAULT '20feet'::text,
    is_special_stack BOOLEAN NOT NULL DEFAULT false,
    row_tier_config JSONB,
    is_virtual BOOLEAN DEFAULT false,
    is_buffer_zone BOOLEAN DEFAULT false,
    buffer_zone_type TEXT,
    damage_types_supported JSONB DEFAULT '[]'::jsonb,
    CONSTRAINT stacks_pkey PRIMARY KEY (id)
);

-- Table: stack_pairings
-- Defines which physical stacks are paired for 40ft containers
CREATE TABLE IF NOT EXISTS public.stack_pairings (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    yard_id TEXT NOT NULL,
    first_stack_number INTEGER NOT NULL,
    second_stack_number INTEGER NOT NULL,
    virtual_stack_number INTEGER NOT NULL,
    first_stack_id UUID,
    second_stack_id UUID,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT stack_pairings_pkey PRIMARY KEY (id)
);

-- Table: virtual_stack_pairs
-- Manages pairing relationships between physical stacks
CREATE TABLE IF NOT EXISTS public.virtual_stack_pairs (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    yard_id TEXT NOT NULL,
    stack1_id UUID NOT NULL,
    stack2_id UUID NOT NULL,
    virtual_stack_number INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT virtual_stack_pairs_pkey PRIMARY KEY (id)
);

-- ============================================
-- TABLES - Location Management
-- ============================================

-- Table: locations
-- Core location management with UUID-based records
CREATE TABLE IF NOT EXISTS public.locations (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    location_id VARCHAR(8) NOT NULL,
    stack_id UUID NOT NULL,
    yard_id TEXT NOT NULL,
    row_number INTEGER NOT NULL,
    tier_number INTEGER NOT NULL,
    is_virtual BOOLEAN DEFAULT false,
    virtual_stack_pair_id UUID,
    is_occupied BOOLEAN DEFAULT false,
    container_id UUID,
    container_size TEXT,
    client_pool_id UUID,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    available BOOLEAN DEFAULT true,
    container_number TEXT,
    CONSTRAINT locations_pkey PRIMARY KEY (id),
    CONSTRAINT locations_location_id_key UNIQUE (location_id)
);

-- Table: location_id_mappings
-- Migration mapping from legacy string IDs to UUIDs
CREATE TABLE IF NOT EXISTS public.location_id_mappings (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    legacy_string_id VARCHAR(50) NOT NULL,
    new_location_id UUID NOT NULL,
    migration_batch_id UUID NOT NULL,
    migrated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT location_id_mappings_pkey PRIMARY KEY (id),
    CONSTRAINT unique_legacy_id UNIQUE (legacy_string_id)
);

-- ============================================
-- TABLES - Client Pools & Assignments
-- ============================================

-- Table: client_pools
-- Client pools by yard with capacity tracking
CREATE TABLE IF NOT EXISTS public.client_pools (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    yard_id TEXT NOT NULL,
    client_id UUID NOT NULL,
    client_code TEXT NOT NULL,
    client_name TEXT NOT NULL,
    assigned_stacks JSONB DEFAULT '[]'::jsonb,
    max_capacity INTEGER NOT NULL DEFAULT 0,
    current_occupancy INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    priority TEXT NOT NULL DEFAULT 'medium'::text,
    contract_start_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    contract_end_date TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID NOT NULL,
    updated_by UUID,
    CONSTRAINT client_pools_pkey PRIMARY KEY (id)
);

-- Table: stack_assignments
-- Stack assignments to client pools
CREATE TABLE IF NOT EXISTS public.stack_assignments (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    yard_id TEXT NOT NULL,
    stack_id TEXT NOT NULL,
    stack_number INTEGER NOT NULL,
    client_pool_id UUID NOT NULL,
    client_code TEXT NOT NULL,
    is_exclusive BOOLEAN DEFAULT false,
    priority INTEGER DEFAULT 1,
    notes TEXT,
    assigned_at TIMESTAMPTZ DEFAULT now(),
    assigned_by UUID NOT NULL,
    CONSTRAINT stack_assignments_pkey PRIMARY KEY (id)
);

-- ============================================
-- TABLES - Containers
-- ============================================

-- Table: containers
-- Container tracking with soft delete
CREATE TABLE IF NOT EXISTS public.containers (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    number TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'dry'::text,
    size TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'in_depot'::text,
    location TEXT,
    yard_id TEXT,
    client_id UUID,
    client_code TEXT,
    gate_in_date TIMESTAMPTZ,
    gate_out_date TIMESTAMPTZ,
    damage JSONB DEFAULT '[]'::jsonb,
    booking_reference TEXT,
    created_by TEXT,
    updated_by TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    classification VARCHAR(20) DEFAULT 'divers'::character varying,
    damage_assessment_stage VARCHAR(20) DEFAULT 'assignment'::character varying,
    damage_assessed_by VARCHAR(255),
    damage_assessed_at TIMESTAMPTZ,
    damage_type VARCHAR(50),
    number_confirmed BOOLEAN DEFAULT false,
    is_high_cube BOOLEAN DEFAULT false,
    audit_logs JSONB DEFAULT '[]'::jsonb,
    full_empty TEXT,
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID,
    transaction_type TEXT,
    buffer_zone_id UUID,
    edi_gate_in_transmitted BOOLEAN DEFAULT false,
    edi_gate_out_transmitted BOOLEAN DEFAULT false,
    edi_gate_out_transmission_date TIMESTAMPTZ,
    gate_out_operation_id UUID,
    CONSTRAINT containers_pkey PRIMARY KEY (id),
    CONSTRAINT containers_number_key UNIQUE (number)
);

-- Table: container_buffer_zones
-- Buffer zone for damaged containers awaiting treatment
CREATE TABLE IF NOT EXISTS public.container_buffer_zones (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    container_id UUID NOT NULL,
    gate_in_operation_id UUID,
    buffer_stack_id UUID,
    yard_id TEXT NOT NULL,
    damage_type TEXT,
    damage_description TEXT,
    damage_assessment JSONB,
    status TEXT NOT NULL DEFAULT 'in_buffer'::text,
    released_at TIMESTAMPTZ,
    released_by UUID,
    release_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID,
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT container_buffer_zones_pkey PRIMARY KEY (id)
);

-- ============================================
-- TABLES - Booking & Operations
-- ============================================

-- Table: booking_references
-- Booking references (formerly release orders)
CREATE TABLE IF NOT EXISTS public.booking_references (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    booking_number TEXT NOT NULL,
    client_id UUID,
    client_code TEXT NOT NULL,
    client_name TEXT NOT NULL,
    booking_type TEXT NOT NULL,
    total_containers INTEGER NOT NULL DEFAULT 0,
    remaining_containers INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending'::text,
    valid_from TIMESTAMPTZ,
    valid_until TIMESTAMPTZ,
    notes TEXT,
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    cancellation_reason TEXT,
    new_booking_reference TEXT,
    container_quantities JSONB DEFAULT '{"size20ft": 0, "size40ft": 0}'::jsonb,
    max_quantity_threshold INTEGER DEFAULT 10,
    requires_detailed_breakdown BOOLEAN DEFAULT false,
    transaction_type TEXT,
    CONSTRAINT release_orders_pkey PRIMARY KEY (id),
    CONSTRAINT release_orders_booking_number_key UNIQUE (booking_number)
);

-- Table: gate_in_operations
-- Gate-in operation tracking
CREATE TABLE IF NOT EXISTS public.gate_in_operations (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    container_id UUID,
    container_number TEXT NOT NULL,
    client_code TEXT NOT NULL,
    client_name TEXT NOT NULL,
    container_type TEXT NOT NULL DEFAULT 'dry'::text,
    container_size TEXT NOT NULL,
    transport_company TEXT,
    driver_name TEXT,
    vehicle_number TEXT,
    assigned_location TEXT,
    damage_reported BOOLEAN DEFAULT false,
    damage_description TEXT,
    status TEXT DEFAULT 'completed'::text,
    operator_id TEXT,
    operator_name TEXT,
    yard_id TEXT,
    edi_transmitted BOOLEAN DEFAULT false,
    edi_transmission_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ,
    entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    entry_time TIME NOT NULL DEFAULT CURRENT_TIME,
    classification VARCHAR(20) DEFAULT 'divers'::character varying,
    damage_assessment_stage VARCHAR(20) DEFAULT 'assignment'::character varying,
    damage_assessed_by VARCHAR(255),
    damage_assessed_at TIMESTAMPTZ,
    damage_type VARCHAR(50),
    container_number_confirmed BOOLEAN DEFAULT false,
    assigned_stack VARCHAR(50),
    container_quantity INTEGER DEFAULT 1,
    second_container_number VARCHAR(20),
    second_container_number_confirmed BOOLEAN DEFAULT false,
    booking_reference VARCHAR(100),
    truck_arrival_date DATE,
    truck_arrival_time TIME,
    notes TEXT,
    operation_status VARCHAR(20) DEFAULT 'pending'::character varying,
    updated_at TIMESTAMPTZ DEFAULT now(),
    updated_by TEXT,
    full_empty TEXT,
    damage_assessment JSONB,
    is_buffer_assignment BOOLEAN DEFAULT false,
    buffer_zone_reason TEXT,
    edi_log_id UUID,
    edi_error_message TEXT,
    damage_assessment_started_at TIMESTAMPTZ,
    damage_assessment_completed_at TIMESTAMPTZ,
    location_assignment_started_at TIMESTAMPTZ,
    location_assignment_completed_at TIMESTAMPTZ,
    edi_processing_started_at TIMESTAMPTZ,
    equipment_reference TEXT,
    transaction_type TEXT,
    edi_message_id TEXT,
    edi_client_name TEXT,
    edi_client_code TEXT,
    is_high_cube BOOLEAN DEFAULT false,
    container_iso_code TEXT,
    edi_gate_in_transmitted BOOLEAN DEFAULT false,
    CONSTRAINT gate_in_operations_pkey PRIMARY KEY (id)
);

-- Table: gate_out_operations
-- Gate-out operation tracking
CREATE TABLE IF NOT EXISTS public.gate_out_operations (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    release_order_id UUID,
    booking_number TEXT NOT NULL,
    client_code TEXT NOT NULL,
    client_name TEXT NOT NULL,
    booking_type TEXT,
    total_containers INTEGER,
    processed_containers INTEGER,
    remaining_containers INTEGER,
    processed_container_ids JSONB DEFAULT '[]'::jsonb,
    transport_company TEXT,
    driver_name TEXT,
    vehicle_number TEXT,
    status TEXT DEFAULT 'completed'::text,
    operator_id TEXT,
    operator_name TEXT,
    yard_id TEXT,
    edi_transmitted BOOLEAN DEFAULT false,
    edi_transmission_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT now(),
    updated_by TEXT,
    edi_log_id UUID,
    edi_error_message TEXT,
    container_selection_started_at TIMESTAMPTZ,
    container_selection_completed_at TIMESTAMPTZ,
    edi_processing_started_at TIMESTAMPTZ,
    edi_message_id TEXT,
    edi_client_name TEXT,
    CONSTRAINT gate_out_operations_pkey PRIMARY KEY (id)
);

-- ============================================
-- TABLES - EDI Management
-- ============================================

-- Table: edi_server_configurations
-- EDI server configurations for FTP/SFTP
CREATE TABLE IF NOT EXISTS public.edi_server_configurations (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    host TEXT NOT NULL,
    port INTEGER NOT NULL DEFAULT 22,
    username TEXT NOT NULL,
    password TEXT,
    remote_path TEXT NOT NULL DEFAULT '/'::text,
    enabled BOOLEAN NOT NULL DEFAULT true,
    test_mode BOOLEAN NOT NULL DEFAULT false,
    timeout INTEGER NOT NULL DEFAULT 30000,
    retry_attempts INTEGER NOT NULL DEFAULT 3,
    partner_code TEXT NOT NULL,
    sender_code TEXT NOT NULL,
    file_name_pattern TEXT NOT NULL DEFAULT 'CODECO_{timestamp}_{container}_{operation}.edi'::text,
    assigned_clients JSONB DEFAULT '[]'::jsonb,
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT edi_server_configurations_pkey PRIMARY KEY (id)
);

-- Table: edi_client_settings
-- Client-specific EDI configuration
CREATE TABLE IF NOT EXISTS public.edi_client_settings (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    client_id UUID,
    client_code TEXT NOT NULL,
    client_name TEXT NOT NULL,
    edi_enabled BOOLEAN NOT NULL DEFAULT false,
    enable_gate_in BOOLEAN NOT NULL DEFAULT true,
    enable_gate_out BOOLEAN NOT NULL DEFAULT true,
    server_config_id UUID,
    priority TEXT NOT NULL DEFAULT 'normal'::text,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT edi_client_settings_pkey PRIMARY KEY (id),
    CONSTRAINT edi_client_settings_client_id_key UNIQUE (client_id)
);

-- Table: edi_transmission_logs
-- Complete log of EDI transmissions
CREATE TABLE IF NOT EXISTS public.edi_transmission_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    container_number TEXT NOT NULL,
    operation TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending'::text,
    attempts INTEGER NOT NULL DEFAULT 0,
    last_attempt TIMESTAMPTZ DEFAULT now(),
    file_name TEXT NOT NULL,
    file_size INTEGER DEFAULT 0,
    file_content TEXT,
    partner_code TEXT NOT NULL,
    config_id UUID,
    uploaded_to_sftp BOOLEAN NOT NULL DEFAULT false,
    error_message TEXT,
    acknowledgment_received TIMESTAMPTZ,
    container_id UUID,
    gate_operation_id UUID,
    client_id UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    remote_path TEXT,
    CONSTRAINT edi_transmission_logs_pkey PRIMARY KEY (id)
);

-- ============================================
-- TABLES - User Module Access
-- ============================================

-- Table: user_module_access
-- User module permissions
CREATE TABLE IF NOT EXISTS public.user_module_access (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    module_permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT now(),
    updated_by UUID,
    sync_version INTEGER DEFAULT 1,
    last_sync_at TIMESTAMPTZ DEFAULT now(),
    sync_source TEXT DEFAULT 'user_module_access'::text,
    CONSTRAINT user_module_access_pkey PRIMARY KEY (id),
    CONSTRAINT user_module_access_user_id_key UNIQUE (user_id)
);

-- ============================================
-- TABLES - Audit & Activity Logs
-- ============================================

-- Table: audit_logs
-- General audit trail
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    action TEXT NOT NULL,
    changes JSONB DEFAULT '{}'::jsonb,
    user_id TEXT,
    user_name TEXT,
    timestamp TIMESTAMPTZ DEFAULT now(),
    ip_address TEXT,
    user_agent TEXT,
    CONSTRAINT audit_logs_pkey PRIMARY KEY (id)
);

-- Table: location_audit_log
-- Location management audit trail
CREATE TABLE IF NOT EXISTS public.location_audit_log (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    location_id UUID,
    operation VARCHAR(20) NOT NULL,
    old_values JSONB,
    new_values JSONB,
    user_id UUID,
    user_email TEXT,
    timestamp TIMESTAMPTZ DEFAULT now(),
    ip_address TEXT,
    user_agent TEXT,
    CONSTRAINT location_audit_log_pkey PRIMARY KEY (id)
);

-- Table: user_activities
-- User activity tracking
CREATE TABLE IF NOT EXISTS public.user_activities (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT user_activities_pkey PRIMARY KEY (id)
);

-- Table: user_login_history
-- User login session tracking
CREATE TABLE IF NOT EXISTS public.user_login_history (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    login_time TIMESTAMPTZ NOT NULL DEFAULT now(),
    logout_time TIMESTAMPTZ,
    session_duration_minutes INTEGER,
    ip_address VARCHAR(45),
    user_agent TEXT,
    login_method VARCHAR(50) DEFAULT 'email'::character varying,
    is_successful BOOLEAN DEFAULT true,
    failure_reason TEXT,
    location_info JSONB DEFAULT '{}'::jsonb,
    device_info JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT user_login_history_pkey PRIMARY KEY (id)
);

-- Table: module_access_sync_log
-- Module access synchronization audit
CREATE TABLE IF NOT EXISTS public.module_access_sync_log (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID,
    sync_type TEXT NOT NULL,
    source_table TEXT NOT NULL,
    target_table TEXT NOT NULL,
    old_permissions JSONB,
    new_permissions JSONB,
    sync_status TEXT NOT NULL,
    error_message TEXT,
    sync_duration_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID,
    CONSTRAINT module_access_sync_log_pkey PRIMARY KEY (id)
);

-- ============================================
-- FOREIGN KEY CONSTRAINTS
-- ============================================

-- Note: Foreign keys are added after all tables are created
-- to avoid dependency issues

-- client_pools FKs
ALTER TABLE public.client_pools
    ADD CONSTRAINT fk_client_pools_client 
    FOREIGN KEY (client_id) REFERENCES public.clients(id) ON UPDATE NO ACTION ON DELETE CASCADE;
ALTER TABLE public.client_pools
    ADD CONSTRAINT fk_client_pools_created_by 
    FOREIGN KEY (created_by) REFERENCES public.users(id) ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE public.client_pools
    ADD CONSTRAINT fk_client_pools_updated_by 
    FOREIGN KEY (updated_by) REFERENCES public.users(id) ON UPDATE NO ACTION ON DELETE NO ACTION;

-- booking_references FKs
ALTER TABLE public.booking_references
    ADD CONSTRAINT release_orders_client_id_fkey 
    FOREIGN KEY (client_id) REFERENCES public.clients(id) ON UPDATE NO ACTION ON DELETE NO ACTION;

-- containers FKs
ALTER TABLE public.containers
    ADD CONSTRAINT fk_containers_client 
    FOREIGN KEY (client_id) REFERENCES public.clients(id) ON UPDATE NO ACTION ON DELETE SET NULL;
ALTER TABLE public.containers
    ADD CONSTRAINT fk_containers_deleted_by 
    FOREIGN KEY (deleted_by) REFERENCES public.users(id) ON UPDATE NO ACTION ON DELETE SET NULL;
ALTER TABLE public.containers
    ADD CONSTRAINT fk_containers_buffer_zone 
    FOREIGN KEY (buffer_zone_id) REFERENCES public.container_buffer_zones(id) ON UPDATE NO ACTION ON DELETE SET NULL;
ALTER TABLE public.containers
    ADD CONSTRAINT fk_containers_gate_out_operation 
    FOREIGN KEY (gate_out_operation_id) REFERENCES public.gate_out_operations(id) ON UPDATE NO ACTION ON DELETE SET NULL;

-- container_buffer_zones FKs
ALTER TABLE public.container_buffer_zones
    ADD CONSTRAINT fk_container_buffer_zones_container 
    FOREIGN KEY (container_id) REFERENCES public.containers(id) ON UPDATE NO ACTION ON DELETE CASCADE;
ALTER TABLE public.container_buffer_zones
    ADD CONSTRAINT fk_container_buffer_zones_gate_in 
    FOREIGN KEY (gate_in_operation_id) REFERENCES public.gate_in_operations(id) ON UPDATE NO ACTION ON DELETE SET NULL;
ALTER TABLE public.container_buffer_zones
    ADD CONSTRAINT fk_container_buffer_zones_buffer_stack 
    FOREIGN KEY (buffer_stack_id) REFERENCES public.stacks(id) ON UPDATE NO ACTION ON DELETE SET NULL;
ALTER TABLE public.container_buffer_zones
    ADD CONSTRAINT fk_container_buffer_zones_created_by 
    FOREIGN KEY (created_by) REFERENCES public.users(id) ON UPDATE NO ACTION ON DELETE NO ACTION;
ALTER TABLE public.container_buffer_zones
    ADD CONSTRAINT fk_container_buffer_zones_released_by 
    FOREIGN KEY (released_by) REFERENCES public.users(id) ON UPDATE NO ACTION ON DELETE NO ACTION;

-- locations FKs
ALTER TABLE public.locations
    ADD CONSTRAINT fk_locations_stack 
    FOREIGN KEY (stack_id) REFERENCES public.stacks(id) ON UPDATE NO ACTION ON DELETE CASCADE;
ALTER TABLE public.locations
    ADD CONSTRAINT fk_locations_container 
    FOREIGN KEY (container_id) REFERENCES public.containers(id) ON UPDATE NO ACTION ON DELETE SET NULL;
ALTER TABLE public.locations
    ADD CONSTRAINT fk_locations_client_pool 
    FOREIGN KEY (client_pool_id) REFERENCES public.client_pools(id) ON UPDATE NO ACTION ON DELETE SET NULL;
ALTER TABLE public.locations
    ADD CONSTRAINT fk_locations_virtual_pair 
    FOREIGN KEY (virtual_stack_pair_id) REFERENCES public.virtual_stack_pairs(id) ON UPDATE NO ACTION ON DELETE SET NULL;

-- location_id_mappings FKs
ALTER TABLE public.location_id_mappings
    ADD CONSTRAINT fk_mappings_new_location 
    FOREIGN KEY (new_location_id) REFERENCES public.locations(id) ON UPDATE NO ACTION ON DELETE CASCADE;

-- stack_assignments FKs
ALTER TABLE public.stack_assignments
    ADD CONSTRAINT fk_stack_assignments_client_pool 
    FOREIGN KEY (client_pool_id) REFERENCES public.client_pools(id) ON UPDATE NO ACTION ON DELETE CASCADE;
ALTER TABLE public.stack_assignments
    ADD CONSTRAINT fk_stack_assignments_assigned_by 
    FOREIGN KEY (assigned_by) REFERENCES public.users(id) ON UPDATE NO ACTION ON DELETE NO ACTION;

-- gate_in_operations FKs
ALTER TABLE public.gate_in_operations
    ADD CONSTRAINT fk_gate_in_container 
    FOREIGN KEY (container_id) REFERENCES public.containers(id) ON UPDATE NO ACTION ON DELETE SET NULL;
ALTER TABLE public.gate_in_operations
    ADD CONSTRAINT fk_gate_in_edi_log 
    FOREIGN KEY (edi_log_id) REFERENCES public.edi_transmission_logs(id) ON UPDATE NO ACTION ON DELETE SET NULL;

-- gate_out_operations FKs
ALTER TABLE public.gate_out_operations
    ADD CONSTRAINT fk_gate_out_release_order 
    FOREIGN KEY (release_order_id) REFERENCES public.booking_references(id) ON UPDATE NO ACTION ON DELETE SET NULL;
ALTER TABLE public.gate_out_operations
    ADD CONSTRAINT fk_gate_out_edi_log 
    FOREIGN KEY (edi_log_id) REFERENCES public.edi_transmission_logs(id) ON UPDATE NO ACTION ON DELETE SET NULL;

-- edi_client_settings FKs
ALTER TABLE public.edi_client_settings
    ADD CONSTRAINT fk_edi_client_settings_client 
    FOREIGN KEY (client_id) REFERENCES public.clients(id) ON UPDATE NO ACTION ON DELETE CASCADE;
ALTER TABLE public.edi_client_settings
    ADD CONSTRAINT fk_edi_client_settings_server_config 
    FOREIGN KEY (server_config_id) REFERENCES public.edi_server_configurations(id) ON UPDATE NO ACTION ON DELETE SET NULL;

-- edi_transmission_logs FKs
ALTER TABLE public.edi_transmission_logs
    ADD CONSTRAINT fk_edi_logs_client 
    FOREIGN KEY (client_id) REFERENCES public.clients(id) ON UPDATE NO ACTION ON DELETE SET NULL;
ALTER TABLE public.edi_transmission_logs
    ADD CONSTRAINT fk_edi_logs_config 
    FOREIGN KEY (config_id) REFERENCES public.edi_server_configurations(id) ON UPDATE NO ACTION ON DELETE SET NULL;
ALTER TABLE public.edi_transmission_logs
    ADD CONSTRAINT fk_edi_logs_container 
    FOREIGN KEY (container_id) REFERENCES public.containers(id) ON UPDATE NO ACTION ON DELETE SET NULL;

-- user_module_access FKs
ALTER TABLE public.user_module_access
    ADD CONSTRAINT fk_user_module_access_user 
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE NO ACTION ON DELETE CASCADE;
ALTER TABLE public.user_module_access
    ADD CONSTRAINT fk_user_module_access_updated_by 
    FOREIGN KEY (updated_by) REFERENCES public.users(id) ON UPDATE NO ACTION ON DELETE NO ACTION;

-- user_activities FKs
ALTER TABLE public.user_activities
    ADD CONSTRAINT fk_user_activities_user 
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE NO ACTION ON DELETE CASCADE;

-- user_login_history FKs
ALTER TABLE public.user_login_history
    ADD CONSTRAINT fk_login_history_user 
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE NO ACTION ON DELETE CASCADE;

-- module_access_sync_log FKs
ALTER TABLE public.module_access_sync_log
    ADD CONSTRAINT fk_sync_log_user 
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE NO ACTION ON DELETE SET NULL;
ALTER TABLE public.module_access_sync_log
    ADD CONSTRAINT fk_sync_log_created_by 
    FOREIGN KEY (created_by) REFERENCES public.users(id) ON UPDATE NO ACTION ON DELETE NO ACTION;

-- location_audit_log FKs
ALTER TABLE public.location_audit_log
    ADD CONSTRAINT fk_location_audit_log_location 
    FOREIGN KEY (location_id) REFERENCES public.locations(id) ON UPDATE NO ACTION ON DELETE SET NULL;

COMMIT;

-- ============================================
-- END OF SCHEMA
-- ============================================
