-- Consolidated Schema Migration
-- Generated: 2026-03-04T14:43:30.843Z
-- This file contains the complete schema from Supabase production database

BEGIN;


-- ============================================
-- Table: audit_logs
-- ============================================

-- Table: audit_logs
-- Generated: 2026-03-04T14:43:30.843Z

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

-- Indexes for audit_logs

-- Index: idx_audit_logs_entity
CREATE INDEX idx_audit_logs_entity ON public.audit_logs USING btree (entity_type, entity_id);

-- Index: idx_audit_logs_timestamp
CREATE INDEX idx_audit_logs_timestamp ON public.audit_logs USING btree ("timestamp");

-- Triggers for audit_logs

-- RLS Policies for audit_logs
-- Note: RLS policies should be reviewed and customized based on security requirements
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;


-- ============================================
-- Table: booking_references
-- ============================================

-- Table: booking_references
-- Generated: 2026-03-04T14:43:30.843Z

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
    CONSTRAINT release_orders_booking_number_key UNIQUE (booking_number),
    CONSTRAINT release_orders_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON UPDATE NO ACTION ON DELETE NO ACTION
);

-- Indexes for booking_references

-- Index: idx_booking_references_container_quantities
CREATE INDEX idx_booking_references_container_quantities ON public.booking_references USING gin (container_quantities);

-- Index: idx_booking_references_new_booking_ref
CREATE INDEX idx_booking_references_new_booking_ref ON public.booking_references USING btree (new_booking_reference);

-- Index: idx_booking_references_transaction_type
CREATE INDEX idx_booking_references_transaction_type ON public.booking_references USING btree (transaction_type);

-- Index: idx_booking_references_updated_at
CREATE INDEX idx_booking_references_updated_at ON public.booking_references USING btree (updated_at);

-- Index: idx_release_orders_booking_number
CREATE INDEX idx_release_orders_booking_number ON public.booking_references USING btree (booking_number);

-- Index: idx_release_orders_client_id
CREATE INDEX idx_release_orders_client_id ON public.booking_references USING btree (client_id);

-- Index: idx_release_orders_status
CREATE INDEX idx_release_orders_status ON public.booking_references USING btree (status);

-- Index: release_orders_booking_number_key
CREATE UNIQUE INDEX release_orders_booking_number_key ON public.booking_references USING btree (booking_number);

-- Triggers for booking_references

-- Trigger: trigger_booking_references_updated_at
-- Timing: BEFORE UPDATE
-- EXECUTE FUNCTION update_booking_references_updated_at()

-- RLS Policies for booking_references
-- Note: RLS policies should be reviewed and customized based on security requirements
ALTER TABLE public.booking_references ENABLE ROW LEVEL SECURITY;


-- ============================================
-- Table: client_pools
-- ============================================

-- Table: client_pools
-- Generated: 2026-03-04T14:43:30.843Z

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
    CONSTRAINT client_pools_pkey PRIMARY KEY (id),
    CONSTRAINT fk_client_pools_client FOREIGN KEY (client_id) REFERENCES public.clients(id) ON UPDATE NO ACTION ON DELETE CASCADE,
    CONSTRAINT fk_client_pools_created_by FOREIGN KEY (created_by) REFERENCES public.users(id) ON UPDATE NO ACTION ON DELETE NO ACTION,
    CONSTRAINT fk_client_pools_updated_by FOREIGN KEY (updated_by) REFERENCES public.users(id) ON UPDATE NO ACTION ON DELETE NO ACTION
);

-- Indexes for client_pools

-- Index: idx_client_pools_active
CREATE INDEX idx_client_pools_active ON public.client_pools USING btree (is_active);

-- Index: idx_client_pools_client
CREATE INDEX idx_client_pools_client ON public.client_pools USING btree (client_id);

-- Index: idx_client_pools_yard
CREATE INDEX idx_client_pools_yard ON public.client_pools USING btree (yard_id);

-- Triggers for client_pools

-- Trigger: client_pools_updated_at
-- Timing: BEFORE UPDATE
-- EXECUTE FUNCTION update_client_pools_updated_at()

-- RLS Policies for client_pools
-- Note: RLS policies should be reviewed and customized based on security requirements
ALTER TABLE public.client_pools ENABLE ROW LEVEL SECURITY;


-- ============================================
-- Table: clients
-- ============================================

-- Table: clients
-- Generated: 2026-03-04T14:43:30.844Z

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

-- Indexes for clients

-- Index: clients_code_key
CREATE UNIQUE INDEX clients_code_key ON public.clients USING btree (code);

-- Triggers for clients

-- RLS Policies for clients
-- Note: RLS policies should be reviewed and customized based on security requirements
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;


-- ============================================
-- Table: container_buffer_zones
-- ============================================

-- Table: container_buffer_zones
-- Description: Table de gestion des conteneurs en zone tampon (endommagés en attente de traitement)
-- Generated: 2026-03-04T14:43:30.844Z

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
    CONSTRAINT container_buffer_zones_pkey PRIMARY KEY (id),
    CONSTRAINT container_buffer_zones_buffer_stack_id_fkey FOREIGN KEY (buffer_stack_id) REFERENCES public.stacks(id) ON UPDATE NO ACTION ON DELETE SET NULL,
    CONSTRAINT container_buffer_zones_container_id_fkey FOREIGN KEY (container_id) REFERENCES public.containers(id) ON UPDATE NO ACTION ON DELETE CASCADE,
    CONSTRAINT container_buffer_zones_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON UPDATE NO ACTION ON DELETE SET NULL,
    CONSTRAINT container_buffer_zones_gate_in_operation_id_fkey FOREIGN KEY (gate_in_operation_id) REFERENCES public.gate_in_operations(id) ON UPDATE NO ACTION ON DELETE SET NULL,
    CONSTRAINT container_buffer_zones_released_by_fkey FOREIGN KEY (released_by) REFERENCES public.users(id) ON UPDATE NO ACTION ON DELETE SET NULL
);

-- Indexes for container_buffer_zones

-- Index: idx_container_buffer_zones_buffer_stack_id
CREATE INDEX idx_container_buffer_zones_buffer_stack_id ON public.container_buffer_zones USING btree (buffer_stack_id);

-- Index: idx_container_buffer_zones_container_id
CREATE INDEX idx_container_buffer_zones_container_id ON public.container_buffer_zones USING btree (container_id);

-- Index: idx_container_buffer_zones_status
CREATE INDEX idx_container_buffer_zones_status ON public.container_buffer_zones USING btree (status);

-- Index: idx_container_buffer_zones_yard_id
CREATE INDEX idx_container_buffer_zones_yard_id ON public.container_buffer_zones USING btree (yard_id);

-- Triggers for container_buffer_zones

-- Trigger: trigger_buffer_zone_updated_at
-- Timing: BEFORE UPDATE
-- EXECUTE FUNCTION update_buffer_zone_updated_at()

-- RLS Policies for container_buffer_zones
-- Note: RLS policies should be reviewed and customized based on security requirements
ALTER TABLE public.container_buffer_zones ENABLE ROW LEVEL SECURITY;


-- ============================================
-- Table: container_types
-- ============================================

-- Table: container_types
-- Description: Reference table for container types with High-Cube support and size restrictions
-- Generated: 2026-03-04T14:43:30.844Z

CREATE TABLE IF NOT EXISTS public.container_types (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    type_code VARCHAR(20) NOT NULL,
    display_name VARCHAR(50) NOT NULL,
    is_high_cube BOOLEAN DEFAULT false,
    available_sizes ARRAY DEFAULT ARRAY['20ft'::text, '40ft'::text],
    iso_code_20 VARCHAR(10),
    iso_code_40 VARCHAR(10),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT container_types_pkey PRIMARY KEY (id),
    CONSTRAINT container_types_type_code_key UNIQUE (type_code)
);

-- Indexes for container_types

-- Index: container_types_type_code_key
CREATE UNIQUE INDEX container_types_type_code_key ON public.container_types USING btree (type_code);

-- Index: idx_container_types_active
CREATE INDEX idx_container_types_active ON public.container_types USING btree (is_active);

-- Index: idx_container_types_high_cube
CREATE INDEX idx_container_types_high_cube ON public.container_types USING btree (is_high_cube);

-- Triggers for container_types

-- RLS Policies for container_types
-- Note: RLS policies should be reviewed and customized based on security requirements
ALTER TABLE public.container_types ENABLE ROW LEVEL SECURITY;


-- ============================================
-- Table: containers
-- ============================================

-- Table: containers
-- Generated: 2026-03-04T14:43:30.844Z

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
    CONSTRAINT containers_number_key UNIQUE (number),
    CONSTRAINT containers_buffer_zone_id_fkey FOREIGN KEY (buffer_zone_id) REFERENCES public.container_buffer_zones(id) ON UPDATE NO ACTION ON DELETE SET NULL,
    CONSTRAINT containers_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON UPDATE NO ACTION ON DELETE NO ACTION,
    CONSTRAINT containers_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES public.users(id) ON UPDATE NO ACTION ON DELETE NO ACTION,
    CONSTRAINT containers_gate_out_operation_id_fkey FOREIGN KEY (gate_out_operation_id) REFERENCES public.gate_out_operations(id) ON UPDATE NO ACTION ON DELETE NO ACTION
);

-- Indexes for containers

-- Index: containers_number_key
CREATE UNIQUE INDEX containers_number_key ON public.containers USING btree (number);

-- Index: idx_containers_audit_logs
CREATE INDEX idx_containers_audit_logs ON public.containers USING gin (audit_logs);

-- Index: idx_containers_classification
CREATE INDEX idx_containers_classification ON public.containers USING btree (classification);

-- Index: idx_containers_client_code
CREATE INDEX idx_containers_client_code ON public.containers USING btree (client_code);

-- Index: idx_containers_client_id
CREATE INDEX idx_containers_client_id ON public.containers USING btree (client_id);

-- Index: idx_containers_damage_assessment_stage
CREATE INDEX idx_containers_damage_assessment_stage ON public.containers USING btree (damage_assessment_stage);

-- Index: idx_containers_deleted_at
CREATE INDEX idx_containers_deleted_at ON public.containers USING btree (deleted_at) WHERE (deleted_at IS NOT NULL);

-- Index: idx_containers_edi_gate_out_transmitted
CREATE INDEX idx_containers_edi_gate_out_transmitted ON public.containers USING btree (edi_gate_out_transmitted) WHERE (edi_gate_out_transmitted = false);

-- Index: idx_containers_full_empty
CREATE INDEX idx_containers_full_empty ON public.containers USING btree (full_empty);

-- Index: idx_containers_gate_out_operation_id
CREATE INDEX idx_containers_gate_out_operation_id ON public.containers USING btree (gate_out_operation_id) WHERE (gate_out_operation_id IS NOT NULL);

-- Index: idx_containers_is_deleted
CREATE INDEX idx_containers_is_deleted ON public.containers USING btree (is_deleted) WHERE (is_deleted = false);

-- Index: idx_containers_location_pattern
CREATE INDEX idx_containers_location_pattern ON public.containers USING btree (location) WHERE (location ~ '^S\d+-R\d+-H\d+$'::text);

-- Index: idx_containers_number
CREATE INDEX idx_containers_number ON public.containers USING btree (number);

-- Index: idx_containers_status
CREATE INDEX idx_containers_status ON public.containers USING btree (status);

-- Index: idx_containers_transaction_type
CREATE INDEX idx_containers_transaction_type ON public.containers USING btree (transaction_type);

-- Index: idx_containers_yard_id
CREATE INDEX idx_containers_yard_id ON public.containers USING btree (yard_id);

-- Triggers for containers

-- Trigger: container_audit_log_trigger
-- Timing: BEFORE INSERT
-- EXECUTE FUNCTION add_container_audit_log()

-- Trigger: container_audit_log_trigger
-- Timing: BEFORE UPDATE
-- EXECUTE FUNCTION add_container_audit_log()

-- Trigger: containers_update_stack_occupancy
-- Timing: AFTER INSERT
-- EXECUTE FUNCTION trigger_update_stack_occupancy()

-- Trigger: containers_update_stack_occupancy
-- Timing: AFTER DELETE
-- EXECUTE FUNCTION trigger_update_stack_occupancy()

-- Trigger: containers_update_stack_occupancy
-- Timing: AFTER UPDATE
-- EXECUTE FUNCTION trigger_update_stack_occupancy()

-- Trigger: trigger_update_containers_damage_assessed_at
-- Timing: BEFORE UPDATE
-- EXECUTE FUNCTION update_containers_damage_assessed_at()

-- Trigger: validate_40ft_container_stack_trigger
-- Timing: BEFORE INSERT
-- EXECUTE FUNCTION validate_40ft_container_stack()

-- Trigger: validate_40ft_container_stack_trigger
-- Timing: BEFORE UPDATE
-- EXECUTE FUNCTION validate_40ft_container_stack()

-- RLS Policies for containers
-- Note: RLS policies should be reviewed and customized based on security requirements
ALTER TABLE public.containers ENABLE ROW LEVEL SECURITY;


-- ============================================
-- Table: edi_client_settings
-- ============================================

-- Table: edi_client_settings
-- Description: Client-specific EDI configuration settings and preferences
-- Generated: 2026-03-04T14:43:30.844Z

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
    CONSTRAINT edi_client_settings_client_id_key UNIQUE (client_id),
    CONSTRAINT edi_client_settings_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON UPDATE NO ACTION ON DELETE CASCADE,
    CONSTRAINT edi_client_settings_server_config_id_fkey FOREIGN KEY (server_config_id) REFERENCES public.edi_server_configurations(id) ON UPDATE NO ACTION ON DELETE SET NULL
);

-- Indexes for edi_client_settings

-- Index: edi_client_settings_client_id_key
CREATE UNIQUE INDEX edi_client_settings_client_id_key ON public.edi_client_settings USING btree (client_id);

-- Index: idx_edi_client_settings_client_code
CREATE INDEX idx_edi_client_settings_client_code ON public.edi_client_settings USING btree (client_code);

-- Index: idx_edi_client_settings_client_id
CREATE INDEX idx_edi_client_settings_client_id ON public.edi_client_settings USING btree (client_id);

-- Index: idx_edi_client_settings_edi_enabled
CREATE INDEX idx_edi_client_settings_edi_enabled ON public.edi_client_settings USING btree (edi_enabled);

-- Index: idx_edi_client_settings_priority
CREATE INDEX idx_edi_client_settings_priority ON public.edi_client_settings USING btree (priority);

-- Index: idx_edi_client_settings_server_config_id
CREATE INDEX idx_edi_client_settings_server_config_id ON public.edi_client_settings USING btree (server_config_id);

-- Triggers for edi_client_settings

-- Trigger: update_edi_client_settings_updated_at
-- Timing: BEFORE UPDATE
-- EXECUTE FUNCTION update_updated_at_column()

-- RLS Policies for edi_client_settings
-- Note: RLS policies should be reviewed and customized based on security requirements
ALTER TABLE public.edi_client_settings ENABLE ROW LEVEL SECURITY;


-- ============================================
-- Table: edi_server_configurations
-- ============================================

-- Table: edi_server_configurations
-- Description: EDI server configurations for FTP/SFTP connections to trading partners
-- Generated: 2026-03-04T14:43:30.844Z

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

-- Indexes for edi_server_configurations

-- Index: idx_edi_server_configs_assigned_clients
CREATE INDEX idx_edi_server_configs_assigned_clients ON public.edi_server_configurations USING gin (assigned_clients);

-- Index: idx_edi_server_configs_enabled
CREATE INDEX idx_edi_server_configs_enabled ON public.edi_server_configurations USING btree (enabled);

-- Index: idx_edi_server_configs_is_default
CREATE INDEX idx_edi_server_configs_is_default ON public.edi_server_configurations USING btree (is_default);

-- Index: idx_edi_server_configs_type
CREATE INDEX idx_edi_server_configs_type ON public.edi_server_configurations USING btree (type);

-- Triggers for edi_server_configurations

-- Trigger: update_edi_server_configurations_updated_at
-- Timing: BEFORE UPDATE
-- EXECUTE FUNCTION update_updated_at_column()

-- RLS Policies for edi_server_configurations
-- Note: RLS policies should be reviewed and customized based on security requirements
ALTER TABLE public.edi_server_configurations ENABLE ROW LEVEL SECURITY;


-- ============================================
-- Table: edi_transmission_logs
-- ============================================

-- Table: edi_transmission_logs
-- Description: Complete log of all EDI transmissions with status tracking
-- Generated: 2026-03-04T14:43:30.844Z

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
    CONSTRAINT edi_transmission_logs_pkey PRIMARY KEY (id),
    CONSTRAINT edi_transmission_logs_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON UPDATE NO ACTION ON DELETE SET NULL,
    CONSTRAINT edi_transmission_logs_config_id_fkey FOREIGN KEY (config_id) REFERENCES public.edi_server_configurations(id) ON UPDATE NO ACTION ON DELETE SET NULL,
    CONSTRAINT edi_transmission_logs_container_id_fkey FOREIGN KEY (container_id) REFERENCES public.containers(id) ON UPDATE NO ACTION ON DELETE SET NULL
);

-- Indexes for edi_transmission_logs

-- Index: idx_edi_logs_client_status_date
CREATE INDEX idx_edi_logs_client_status_date ON public.edi_transmission_logs USING btree (client_id, status, created_at DESC);

-- Index: idx_edi_logs_config_operation_date
CREATE INDEX idx_edi_logs_config_operation_date ON public.edi_transmission_logs USING btree (config_id, operation, created_at DESC);

-- Index: idx_edi_transmission_logs_client_id
CREATE INDEX idx_edi_transmission_logs_client_id ON public.edi_transmission_logs USING btree (client_id);

-- Index: idx_edi_transmission_logs_client_operation
CREATE INDEX idx_edi_transmission_logs_client_operation ON public.edi_transmission_logs USING btree (client_id, operation);

-- Index: idx_edi_transmission_logs_config_id
CREATE INDEX idx_edi_transmission_logs_config_id ON public.edi_transmission_logs USING btree (config_id);

-- Index: idx_edi_transmission_logs_container_id
CREATE INDEX idx_edi_transmission_logs_container_id ON public.edi_transmission_logs USING btree (container_id);

-- Index: idx_edi_transmission_logs_container_number
CREATE INDEX idx_edi_transmission_logs_container_number ON public.edi_transmission_logs USING btree (container_number);

-- Index: idx_edi_transmission_logs_created_at
CREATE INDEX idx_edi_transmission_logs_created_at ON public.edi_transmission_logs USING btree (created_at);

-- Index: idx_edi_transmission_logs_last_attempt
CREATE INDEX idx_edi_transmission_logs_last_attempt ON public.edi_transmission_logs USING btree (last_attempt);

-- Index: idx_edi_transmission_logs_operation
CREATE INDEX idx_edi_transmission_logs_operation ON public.edi_transmission_logs USING btree (operation);

-- Index: idx_edi_transmission_logs_partner_code
CREATE INDEX idx_edi_transmission_logs_partner_code ON public.edi_transmission_logs USING btree (partner_code);

-- Index: idx_edi_transmission_logs_status
CREATE INDEX idx_edi_transmission_logs_status ON public.edi_transmission_logs USING btree (status);

-- Index: idx_edi_transmission_logs_status_created_at
CREATE INDEX idx_edi_transmission_logs_status_created_at ON public.edi_transmission_logs USING btree (status, created_at);

-- Index: idx_edi_transmission_logs_uploaded_sftp
CREATE INDEX idx_edi_transmission_logs_uploaded_sftp ON public.edi_transmission_logs USING btree (uploaded_to_sftp);

-- Triggers for edi_transmission_logs

-- Trigger: update_edi_transmission_logs_updated_at
-- Timing: BEFORE UPDATE
-- EXECUTE FUNCTION update_updated_at_column()

-- RLS Policies for edi_transmission_logs
-- Note: RLS policies should be reviewed and customized based on security requirements
ALTER TABLE public.edi_transmission_logs ENABLE ROW LEVEL SECURITY;


-- ============================================
-- Table: gate_in_operations
-- ============================================

-- Table: gate_in_operations
-- Generated: 2026-03-04T14:43:30.844Z

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
    CONSTRAINT gate_in_operations_pkey PRIMARY KEY (id),
    CONSTRAINT gate_in_operations_container_id_fkey FOREIGN KEY (container_id) REFERENCES public.containers(id) ON UPDATE NO ACTION ON DELETE NO ACTION,
    CONSTRAINT gate_in_operations_edi_log_id_fkey FOREIGN KEY (edi_log_id) REFERENCES public.edi_transmission_logs(id) ON UPDATE NO ACTION ON DELETE SET NULL
);

-- Indexes for gate_in_operations

-- Index: idx_gate_in_container_id
CREATE INDEX idx_gate_in_container_id ON public.gate_in_operations USING btree (container_id);

-- Index: idx_gate_in_created_at
CREATE INDEX idx_gate_in_created_at ON public.gate_in_operations USING btree (created_at);

-- Index: idx_gate_in_damage_assessment_duration
CREATE INDEX idx_gate_in_damage_assessment_duration ON public.gate_in_operations USING btree (damage_assessment_started_at, damage_assessment_completed_at) WHERE ((damage_assessment_started_at IS NOT NULL) AND (damage_assessment_completed_at IS NOT NULL));

-- Index: idx_gate_in_edi_processing_duration
CREATE INDEX idx_gate_in_edi_processing_duration ON public.gate_in_operations USING btree (edi_processing_started_at, edi_transmission_date) WHERE ((edi_processing_started_at IS NOT NULL) AND (edi_transmission_date IS NOT NULL));

-- Index: idx_gate_in_location_assignment_duration
CREATE INDEX idx_gate_in_location_assignment_duration ON public.gate_in_operations USING btree (location_assignment_started_at, location_assignment_completed_at) WHERE ((location_assignment_started_at IS NOT NULL) AND (location_assignment_completed_at IS NOT NULL));

-- Index: idx_gate_in_operations_assigned_stack
CREATE INDEX idx_gate_in_operations_assigned_stack ON public.gate_in_operations USING btree (assigned_stack);

-- Index: idx_gate_in_operations_booking_reference
CREATE INDEX idx_gate_in_operations_booking_reference ON public.gate_in_operations USING btree (booking_reference);

-- Index: idx_gate_in_operations_classification
CREATE INDEX idx_gate_in_operations_classification ON public.gate_in_operations USING btree (classification);

-- Index: idx_gate_in_operations_client_code_edi
CREATE INDEX idx_gate_in_operations_client_code_edi ON public.gate_in_operations USING btree (client_code, edi_transmitted);

-- Index: idx_gate_in_operations_container_confirmed
CREATE INDEX idx_gate_in_operations_container_confirmed ON public.gate_in_operations USING btree (container_number_confirmed);

-- Index: idx_gate_in_operations_container_quantity
CREATE INDEX idx_gate_in_operations_container_quantity ON public.gate_in_operations USING btree (container_quantity);

-- Index: idx_gate_in_operations_damage_assessed_at
CREATE INDEX idx_gate_in_operations_damage_assessed_at ON public.gate_in_operations USING btree (damage_assessed_at);

-- Index: idx_gate_in_operations_damage_assessment_stage
CREATE INDEX idx_gate_in_operations_damage_assessment_stage ON public.gate_in_operations USING btree (damage_assessment_stage);

-- Index: idx_gate_in_operations_damage_reported
CREATE INDEX idx_gate_in_operations_damage_reported ON public.gate_in_operations USING btree (damage_reported) WHERE (damage_reported = true);

-- Index: idx_gate_in_operations_damage_stage_timing
CREATE INDEX idx_gate_in_operations_damage_stage_timing ON public.gate_in_operations USING btree (damage_assessment_stage, damage_assessed_at);

-- Index: idx_gate_in_operations_edi_log_id
CREATE INDEX idx_gate_in_operations_edi_log_id ON public.gate_in_operations USING btree (edi_log_id);

-- Index: idx_gate_in_operations_edi_transmission_date
CREATE INDEX idx_gate_in_operations_edi_transmission_date ON public.gate_in_operations USING btree (edi_transmission_date);

-- Index: idx_gate_in_operations_edi_transmitted
CREATE INDEX idx_gate_in_operations_edi_transmitted ON public.gate_in_operations USING btree (edi_transmitted, created_at) WHERE (edi_transmitted = true);

-- Index: idx_gate_in_operations_equipment_reference
CREATE INDEX idx_gate_in_operations_equipment_reference ON public.gate_in_operations USING btree (equipment_reference);

-- Index: idx_gate_in_operations_full_empty
CREATE INDEX idx_gate_in_operations_full_empty ON public.gate_in_operations USING btree (full_empty);

-- Index: idx_gate_in_operations_is_buffer_assignment
CREATE INDEX idx_gate_in_operations_is_buffer_assignment ON public.gate_in_operations USING btree (is_buffer_assignment) WHERE (is_buffer_assignment = true);

-- Index: idx_gate_in_operations_operation_status
CREATE INDEX idx_gate_in_operations_operation_status ON public.gate_in_operations USING btree (operation_status);

-- Index: idx_gate_in_operations_second_container_number
CREATE INDEX idx_gate_in_operations_second_container_number ON public.gate_in_operations USING btree (second_container_number);

-- Index: idx_gate_in_operations_transaction_type
CREATE INDEX idx_gate_in_operations_transaction_type ON public.gate_in_operations USING btree (transaction_type);

-- Index: idx_gate_in_operations_truck_arrival_date
CREATE INDEX idx_gate_in_operations_truck_arrival_date ON public.gate_in_operations USING btree (truck_arrival_date);

-- Index: idx_gate_in_total_duration
CREATE INDEX idx_gate_in_total_duration ON public.gate_in_operations USING btree (created_at, completed_at) WHERE (completed_at IS NOT NULL);

-- Index: idx_gate_in_yard_id
CREATE INDEX idx_gate_in_yard_id ON public.gate_in_operations USING btree (yard_id);

-- Triggers for gate_in_operations

-- Trigger: trigger_auto_create_edi_transmission_gate_in
-- Timing: BEFORE UPDATE
-- EXECUTE FUNCTION auto_create_edi_transmission_on_gate_completion()

-- Trigger: trigger_update_damage_assessed_at
-- Timing: BEFORE UPDATE
-- EXECUTE FUNCTION update_gate_in_damage_assessed_at()

-- Trigger: update_gate_in_operations_updated_at
-- Timing: BEFORE UPDATE
-- EXECUTE FUNCTION update_updated_at_column()

-- RLS Policies for gate_in_operations
-- Note: RLS policies should be reviewed and customized based on security requirements
ALTER TABLE public.gate_in_operations ENABLE ROW LEVEL SECURITY;


-- ============================================
-- Table: gate_out_operations
-- ============================================

-- Table: gate_out_operations
-- Generated: 2026-03-04T14:43:30.844Z

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
    CONSTRAINT gate_out_operations_pkey PRIMARY KEY (id),
    CONSTRAINT gate_out_operations_edi_log_id_fkey FOREIGN KEY (edi_log_id) REFERENCES public.edi_transmission_logs(id) ON UPDATE NO ACTION ON DELETE SET NULL,
    CONSTRAINT gate_out_operations_release_order_id_fkey FOREIGN KEY (release_order_id) REFERENCES public.booking_references(id) ON UPDATE NO ACTION ON DELETE NO ACTION
);

-- Indexes for gate_out_operations

-- Index: idx_gate_out_container_selection_duration
CREATE INDEX idx_gate_out_container_selection_duration ON public.gate_out_operations USING btree (container_selection_started_at, container_selection_completed_at) WHERE ((container_selection_started_at IS NOT NULL) AND (container_selection_completed_at IS NOT NULL));

-- Index: idx_gate_out_created_at
CREATE INDEX idx_gate_out_created_at ON public.gate_out_operations USING btree (created_at);

-- Index: idx_gate_out_edi_processing_duration
CREATE INDEX idx_gate_out_edi_processing_duration ON public.gate_out_operations USING btree (edi_processing_started_at, edi_transmission_date) WHERE ((edi_processing_started_at IS NOT NULL) AND (edi_transmission_date IS NOT NULL));

-- Index: idx_gate_out_operations_client_code_edi
CREATE INDEX idx_gate_out_operations_client_code_edi ON public.gate_out_operations USING btree (client_code, edi_transmitted);

-- Index: idx_gate_out_operations_edi_log_id
CREATE INDEX idx_gate_out_operations_edi_log_id ON public.gate_out_operations USING btree (edi_log_id);

-- Index: idx_gate_out_operations_edi_transmission_date
CREATE INDEX idx_gate_out_operations_edi_transmission_date ON public.gate_out_operations USING btree (edi_transmission_date);

-- Index: idx_gate_out_operations_edi_transmitted
CREATE INDEX idx_gate_out_operations_edi_transmitted ON public.gate_out_operations USING btree (edi_transmitted, created_at) WHERE (edi_transmitted = true);

-- Index: idx_gate_out_release_id
CREATE INDEX idx_gate_out_release_id ON public.gate_out_operations USING btree (release_order_id);

-- Index: idx_gate_out_total_duration
CREATE INDEX idx_gate_out_total_duration ON public.gate_out_operations USING btree (created_at, completed_at) WHERE (completed_at IS NOT NULL);

-- Index: idx_gate_out_yard_id
CREATE INDEX idx_gate_out_yard_id ON public.gate_out_operations USING btree (yard_id);

-- Triggers for gate_out_operations

-- Trigger: trigger_auto_create_edi_transmission_gate_out
-- Timing: BEFORE UPDATE
-- EXECUTE FUNCTION auto_create_edi_transmission_on_gate_completion()

-- Trigger: update_gate_out_operations_updated_at
-- Timing: BEFORE UPDATE
-- EXECUTE FUNCTION update_updated_at_column()

-- RLS Policies for gate_out_operations
-- Note: RLS policies should be reviewed and customized based on security requirements
ALTER TABLE public.gate_out_operations ENABLE ROW LEVEL SECURITY;


-- ============================================
-- Table: location_audit_log
-- ============================================

-- Table: location_audit_log
-- Description: Comprehensive audit trail for all location management operations
-- Generated: 2026-03-04T14:43:30.844Z

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
    CONSTRAINT location_audit_log_pkey PRIMARY KEY (id),
    CONSTRAINT location_audit_log_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.locations(id) ON UPDATE NO ACTION ON DELETE SET NULL
);

-- Indexes for location_audit_log

-- Index: idx_audit_location_time_range
CREATE INDEX idx_audit_location_time_range ON public.location_audit_log USING btree (location_id, "timestamp" DESC, operation);

-- Index: idx_audit_location_timestamp
CREATE INDEX idx_audit_location_timestamp ON public.location_audit_log USING btree (location_id, "timestamp" DESC);

-- Index: idx_audit_new_values_gin
CREATE INDEX idx_audit_new_values_gin ON public.location_audit_log USING gin (new_values);

-- Index: idx_audit_old_values_gin
CREATE INDEX idx_audit_old_values_gin ON public.location_audit_log USING gin (old_values);

-- Index: idx_audit_operation
CREATE INDEX idx_audit_operation ON public.location_audit_log USING btree (operation, "timestamp" DESC);

-- Index: idx_audit_operation_timestamp
CREATE INDEX idx_audit_operation_timestamp ON public.location_audit_log USING btree (operation, "timestamp" DESC);

-- Index: idx_audit_user_timestamp
CREATE INDEX idx_audit_user_timestamp ON public.location_audit_log USING btree (user_id, "timestamp" DESC) WHERE (user_id IS NOT NULL);

-- Triggers for location_audit_log

-- RLS Policies for location_audit_log
-- Note: RLS policies should be reviewed and customized based on security requirements
ALTER TABLE public.location_audit_log ENABLE ROW LEVEL SECURITY;


-- ============================================
-- Table: location_id_mappings
-- ============================================

-- Table: location_id_mappings
-- Description: Migration mapping table from legacy string-based IDs to new UUID-based records
-- Generated: 2026-03-04T14:43:30.844Z

CREATE TABLE IF NOT EXISTS public.location_id_mappings (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    legacy_string_id VARCHAR(50) NOT NULL,
    new_location_id UUID NOT NULL,
    migration_batch_id UUID NOT NULL,
    migrated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT location_id_mappings_pkey PRIMARY KEY (id),
    CONSTRAINT unique_legacy_id UNIQUE (legacy_string_id),
    CONSTRAINT location_id_mappings_new_location_id_fkey FOREIGN KEY (new_location_id) REFERENCES public.locations(id) ON UPDATE NO ACTION ON DELETE CASCADE
);

-- Indexes for location_id_mappings

-- Index: idx_mappings_batch
CREATE INDEX idx_mappings_batch ON public.location_id_mappings USING btree (migration_batch_id);

-- Index: idx_mappings_legacy_id
CREATE INDEX idx_mappings_legacy_id ON public.location_id_mappings USING btree (legacy_string_id);

-- Index: idx_mappings_new_location
CREATE INDEX idx_mappings_new_location ON public.location_id_mappings USING btree (new_location_id);

-- Index: unique_legacy_id
CREATE UNIQUE INDEX unique_legacy_id ON public.location_id_mappings USING btree (legacy_string_id);

-- Triggers for location_id_mappings

-- RLS Policies for location_id_mappings
-- Note: RLS policies should be reviewed and customized based on security requirements
ALTER TABLE public.location_id_mappings ENABLE ROW LEVEL SECURITY;


-- ============================================
-- Table: locations
-- ============================================

-- Table: locations
-- Description: Core location management table with UUID-based records and SXXRXHX format location IDs
-- Generated: 2026-03-04T14:43:30.844Z

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
    container_size USER-DEFINED,
    client_pool_id UUID,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    available BOOLEAN DEFAULT true,
    container_number TEXT,
    CONSTRAINT locations_pkey PRIMARY KEY (id),
    CONSTRAINT locations_location_id_key UNIQUE (location_id),
    CONSTRAINT unique_stack_position UNIQUE (row_number),
    CONSTRAINT unique_stack_position UNIQUE (row_number),
    CONSTRAINT unique_stack_position UNIQUE (tier_number),
    CONSTRAINT unique_stack_position UNIQUE (tier_number),
    CONSTRAINT unique_stack_position UNIQUE (tier_number),
    CONSTRAINT unique_stack_position UNIQUE (stack_id),
    CONSTRAINT unique_stack_position UNIQUE (stack_id),
    CONSTRAINT unique_stack_position UNIQUE (stack_id),
    CONSTRAINT unique_stack_position UNIQUE (row_number),
    CONSTRAINT locations_client_pool_id_fkey FOREIGN KEY (client_pool_id) REFERENCES public.client_pools(id) ON UPDATE NO ACTION ON DELETE SET NULL,
    CONSTRAINT locations_container_id_fkey FOREIGN KEY (container_id) REFERENCES public.containers(id) ON UPDATE NO ACTION ON DELETE SET NULL,
    CONSTRAINT locations_virtual_stack_pair_id_fkey FOREIGN KEY (virtual_stack_pair_id) REFERENCES public.virtual_stack_pairs(id) ON UPDATE NO ACTION ON DELETE SET NULL
);

-- Indexes for locations

-- Index: idx_locations_availability
CREATE INDEX idx_locations_availability ON public.locations USING btree (is_occupied, container_size, client_pool_id, yard_id) WHERE (is_active = true);

-- Index: idx_locations_availability_composite
CREATE INDEX idx_locations_availability_composite ON public.locations USING btree (yard_id, is_occupied, container_size, is_active) WHERE ((is_active = true) AND (is_occupied = false));

-- Index: idx_locations_available
CREATE INDEX idx_locations_available ON public.locations USING btree (available) WHERE (available = true);

-- Index: idx_locations_client_pool
CREATE INDEX idx_locations_client_pool ON public.locations USING btree (client_pool_id) WHERE (client_pool_id IS NOT NULL);

-- Index: idx_locations_container_id
CREATE INDEX idx_locations_container_id ON public.locations USING btree (container_id) WHERE (container_id IS NOT NULL);

-- Index: idx_locations_container_number
CREATE INDEX idx_locations_container_number ON public.locations USING btree (container_number) WHERE (container_number IS NOT NULL);

-- Index: idx_locations_location_id
CREATE INDEX idx_locations_location_id ON public.locations USING btree (location_id);

-- Index: idx_locations_occupied_containers
CREATE INDEX idx_locations_occupied_containers ON public.locations USING btree (container_id, yard_id) WHERE ((is_occupied = true) AND (container_id IS NOT NULL));

-- Index: idx_locations_pool_availability
CREATE INDEX idx_locations_pool_availability ON public.locations USING btree (client_pool_id, is_occupied, container_size) WHERE (is_active = true);

-- Index: idx_locations_stack_id
CREATE INDEX idx_locations_stack_id ON public.locations USING btree (stack_id);

-- Index: idx_locations_stack_position
CREATE INDEX idx_locations_stack_position ON public.locations USING btree (stack_id, row_number, tier_number) WHERE (is_active = true);

-- Index: idx_locations_stack_row_tier
CREATE INDEX idx_locations_stack_row_tier ON public.locations USING btree (stack_id, row_number, tier_number);

-- Index: idx_locations_virtual
CREATE INDEX idx_locations_virtual ON public.locations USING btree (virtual_stack_pair_id) WHERE (is_virtual = true);

-- Index: idx_locations_virtual_pair
CREATE INDEX idx_locations_virtual_pair ON public.locations USING btree (virtual_stack_pair_id, is_occupied) WHERE ((is_virtual = true) AND (is_active = true));

-- Index: idx_locations_yard_id
CREATE INDEX idx_locations_yard_id ON public.locations USING btree (yard_id);

-- Index: locations_location_id_key
CREATE UNIQUE INDEX locations_location_id_key ON public.locations USING btree (location_id);

-- Index: unique_stack_position
CREATE UNIQUE INDEX unique_stack_position ON public.locations USING btree (stack_id, row_number, tier_number);

-- Triggers for locations

-- Trigger: location_stats_refresh_trigger
-- Timing: AFTER INSERT
-- EXECUTE FUNCTION trigger_refresh_location_statistics()

-- Trigger: location_stats_refresh_trigger
-- Timing: AFTER DELETE
-- EXECUTE FUNCTION trigger_refresh_location_statistics()

-- Trigger: location_stats_refresh_trigger
-- Timing: AFTER UPDATE
-- EXECUTE FUNCTION trigger_refresh_location_statistics()

-- Trigger: locations_audit_trigger
-- Timing: AFTER INSERT
-- EXECUTE FUNCTION log_location_changes()

-- Trigger: locations_audit_trigger
-- Timing: AFTER DELETE
-- EXECUTE FUNCTION log_location_changes()

-- Trigger: locations_audit_trigger
-- Timing: AFTER UPDATE
-- EXECUTE FUNCTION log_location_changes()

-- Trigger: locations_updated_at_trigger
-- Timing: BEFORE UPDATE
-- EXECUTE FUNCTION update_locations_updated_at()

-- RLS Policies for locations
-- Note: RLS policies should be reviewed and customized based on security requirements
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;


-- ============================================
-- Table: module_access_sync_log
-- ============================================

-- Table: module_access_sync_log
-- Description: Audit log for all module access synchronization operations
-- Generated: 2026-03-04T14:43:30.844Z

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
    CONSTRAINT module_access_sync_log_pkey PRIMARY KEY (id),
    CONSTRAINT fk_sync_log_created_by FOREIGN KEY (created_by) REFERENCES public.users(id) ON UPDATE NO ACTION ON DELETE SET NULL,
    CONSTRAINT fk_sync_log_user_id FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE NO ACTION ON DELETE CASCADE
);

-- Indexes for module_access_sync_log

-- Index: idx_sync_log_created_at
CREATE INDEX idx_sync_log_created_at ON public.module_access_sync_log USING btree (created_at DESC);

-- Index: idx_sync_log_created_by
CREATE INDEX idx_sync_log_created_by ON public.module_access_sync_log USING btree (created_by);

-- Index: idx_sync_log_sync_status
CREATE INDEX idx_sync_log_sync_status ON public.module_access_sync_log USING btree (sync_status);

-- Index: idx_sync_log_sync_type
CREATE INDEX idx_sync_log_sync_type ON public.module_access_sync_log USING btree (sync_type);

-- Index: idx_sync_log_type_status_date
CREATE INDEX idx_sync_log_type_status_date ON public.module_access_sync_log USING btree (sync_type, sync_status, created_at DESC);

-- Index: idx_sync_log_user_id
CREATE INDEX idx_sync_log_user_id ON public.module_access_sync_log USING btree (user_id);

-- Index: idx_sync_log_user_status_date
CREATE INDEX idx_sync_log_user_status_date ON public.module_access_sync_log USING btree (user_id, sync_status, created_at DESC);

-- Triggers for module_access_sync_log

-- RLS Policies for module_access_sync_log
-- Note: RLS policies should be reviewed and customized based on security requirements
ALTER TABLE public.module_access_sync_log ENABLE ROW LEVEL SECURITY;


-- ============================================
-- Table: sections
-- ============================================

-- Table: sections
-- Generated: 2026-03-04T14:43:30.844Z

CREATE TABLE IF NOT EXISTS public.sections (
    id TEXT NOT NULL,
    yard_id TEXT NOT NULL,
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT sections_pkey PRIMARY KEY (id)
);

-- Indexes for sections

-- Index: idx_sections_yard_id
CREATE INDEX idx_sections_yard_id ON public.sections USING btree (yard_id);

-- Triggers for sections

-- RLS Policies for sections
-- Note: RLS policies should be reviewed and customized based on security requirements
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;


-- ============================================
-- Table: stack_assignments
-- ============================================

-- Table: stack_assignments
-- Generated: 2026-03-04T14:43:30.844Z

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
    CONSTRAINT stack_assignments_pkey PRIMARY KEY (id),
    CONSTRAINT fk_stack_assignments_assigned_by FOREIGN KEY (assigned_by) REFERENCES public.users(id) ON UPDATE NO ACTION ON DELETE NO ACTION,
    CONSTRAINT fk_stack_assignments_pool FOREIGN KEY (client_pool_id) REFERENCES public.client_pools(id) ON UPDATE NO ACTION ON DELETE CASCADE
);

-- Indexes for stack_assignments

-- Index: idx_stack_assignments_client
CREATE INDEX idx_stack_assignments_client ON public.stack_assignments USING btree (client_code);

-- Index: idx_stack_assignments_pool
CREATE INDEX idx_stack_assignments_pool ON public.stack_assignments USING btree (client_pool_id);

-- Index: idx_stack_assignments_yard
CREATE INDEX idx_stack_assignments_yard ON public.stack_assignments USING btree (yard_id);

-- Triggers for stack_assignments

-- RLS Policies for stack_assignments
-- Note: RLS policies should be reviewed and customized based on security requirements
ALTER TABLE public.stack_assignments ENABLE ROW LEVEL SECURITY;


-- ============================================
-- Table: stack_pairings
-- ============================================

-- Table: stack_pairings
-- Description: Defines which physical stacks are paired to create virtual stacks for 40ft containers
-- Generated: 2026-03-04T14:43:30.844Z

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
    CONSTRAINT stack_pairings_pkey PRIMARY KEY (id),
    CONSTRAINT unique_pairing_per_yard UNIQUE (yard_id),
    CONSTRAINT unique_pairing_per_yard UNIQUE (yard_id),
    CONSTRAINT unique_pairing_per_yard UNIQUE (yard_id),
    CONSTRAINT unique_pairing_per_yard UNIQUE (first_stack_number),
    CONSTRAINT unique_pairing_per_yard UNIQUE (first_stack_number),
    CONSTRAINT unique_pairing_per_yard UNIQUE (first_stack_number),
    CONSTRAINT unique_pairing_per_yard UNIQUE (second_stack_number),
    CONSTRAINT unique_pairing_per_yard UNIQUE (second_stack_number),
    CONSTRAINT unique_pairing_per_yard UNIQUE (second_stack_number)
);

-- Indexes for stack_pairings

-- Index: idx_stack_pairings_stacks
CREATE INDEX idx_stack_pairings_stacks ON public.stack_pairings USING btree (first_stack_number, second_stack_number);

-- Index: idx_stack_pairings_yard
CREATE INDEX idx_stack_pairings_yard ON public.stack_pairings USING btree (yard_id);

-- Index: unique_pairing_per_yard
CREATE UNIQUE INDEX unique_pairing_per_yard ON public.stack_pairings USING btree (yard_id, first_stack_number, second_stack_number);

-- Triggers for stack_pairings

-- RLS Policies for stack_pairings
-- Note: RLS policies should be reviewed and customized based on security requirements
ALTER TABLE public.stack_pairings ENABLE ROW LEVEL SECURITY;


-- ============================================
-- Table: stacks
-- ============================================

-- Table: stacks
-- Description: Triggers temporarily disabled to fix scalar extraction error - will be re-enabled after testing
-- Generated: 2026-03-04T14:43:30.844Z

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

-- Indexes for stacks

-- Index: idx_stacks_assigned_client
CREATE INDEX idx_stacks_assigned_client ON public.stacks USING btree (assigned_client_code);

-- Index: idx_stacks_buffer_zone_type
CREATE INDEX idx_stacks_buffer_zone_type ON public.stacks USING btree (buffer_zone_type) WHERE (buffer_zone_type IS NOT NULL);

-- Index: idx_stacks_container_size
CREATE INDEX idx_stacks_container_size ON public.stacks USING btree (container_size);

-- Index: idx_stacks_is_buffer_zone
CREATE INDEX idx_stacks_is_buffer_zone ON public.stacks USING btree (is_buffer_zone) WHERE (is_buffer_zone = true);

-- Index: idx_stacks_is_virtual
CREATE INDEX idx_stacks_is_virtual ON public.stacks USING btree (is_virtual) WHERE (is_virtual = true);

-- Index: idx_stacks_row_tier_config
CREATE INDEX idx_stacks_row_tier_config ON public.stacks USING gin (row_tier_config);

-- Index: idx_stacks_section_id
CREATE INDEX idx_stacks_section_id ON public.stacks USING btree (section_id);

-- Index: idx_stacks_stack_number
CREATE INDEX idx_stacks_stack_number ON public.stacks USING btree (stack_number);

-- Index: idx_stacks_yard_id
CREATE INDEX idx_stacks_yard_id ON public.stacks USING btree (yard_id);

-- Index: idx_stacks_yard_section
CREATE INDEX idx_stacks_yard_section ON public.stacks USING btree (yard_id, section_id);

-- Index: unique_active_yard_stack
CREATE UNIQUE INDEX unique_active_yard_stack ON public.stacks USING btree (yard_id, stack_number) WHERE (is_active = true);

-- Triggers for stacks

-- Trigger: stack_soft_delete_trigger
-- Timing: AFTER UPDATE
-- EXECUTE FUNCTION handle_stack_soft_delete()

-- Trigger: trigger_auto_mark_buffer_zones
-- Timing: BEFORE INSERT
-- EXECUTE FUNCTION auto_mark_buffer_zones()

-- Trigger: trigger_auto_mark_buffer_zones
-- Timing: BEFORE UPDATE
-- EXECUTE FUNCTION auto_mark_buffer_zones()

-- Trigger: trigger_update_stack_capacity
-- Timing: BEFORE INSERT
-- EXECUTE FUNCTION update_stack_capacity()

-- Trigger: trigger_update_stack_capacity
-- Timing: BEFORE UPDATE
-- EXECUTE FUNCTION update_stack_capacity()

-- RLS Policies for stacks
-- Note: RLS policies should be reviewed and customized based on security requirements
ALTER TABLE public.stacks ENABLE ROW LEVEL SECURITY;


-- ============================================
-- Table: user_activities
-- ============================================

-- Table: user_activities
-- Description: Tracks user activities for audit and monitoring
-- Generated: 2026-03-04T14:43:30.844Z

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
    CONSTRAINT user_activities_pkey PRIMARY KEY (id),
    CONSTRAINT user_activities_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE NO ACTION ON DELETE CASCADE
);

-- Indexes for user_activities

-- Index: idx_user_activities_action
CREATE INDEX idx_user_activities_action ON public.user_activities USING btree (action);

-- Index: idx_user_activities_created_at
CREATE INDEX idx_user_activities_created_at ON public.user_activities USING btree (created_at DESC);

-- Index: idx_user_activities_entity
CREATE INDEX idx_user_activities_entity ON public.user_activities USING btree (entity_type, entity_id);

-- Index: idx_user_activities_user_date
CREATE INDEX idx_user_activities_user_date ON public.user_activities USING btree (user_id, created_at DESC);

-- Index: idx_user_activities_user_id
CREATE INDEX idx_user_activities_user_id ON public.user_activities USING btree (user_id);

-- Triggers for user_activities

-- RLS Policies for user_activities
-- Note: RLS policies should be reviewed and customized based on security requirements
ALTER TABLE public.user_activities ENABLE ROW LEVEL SECURITY;


-- ============================================
-- Table: user_login_history
-- ============================================

-- Table: user_login_history
-- Description: Tracks user login sessions for security and monitoring
-- Generated: 2026-03-04T14:43:30.844Z

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
    CONSTRAINT user_login_history_pkey PRIMARY KEY (id),
    CONSTRAINT user_login_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE NO ACTION ON DELETE CASCADE
);

-- Indexes for user_login_history

-- Index: idx_login_history_ip_address
CREATE INDEX idx_login_history_ip_address ON public.user_login_history USING btree (ip_address);

-- Index: idx_login_history_login_time
CREATE INDEX idx_login_history_login_time ON public.user_login_history USING btree (login_time DESC);

-- Index: idx_login_history_successful
CREATE INDEX idx_login_history_successful ON public.user_login_history USING btree (is_successful);

-- Index: idx_login_history_user_id
CREATE INDEX idx_login_history_user_id ON public.user_login_history USING btree (user_id);

-- Index: idx_login_history_user_login
CREATE INDEX idx_login_history_user_login ON public.user_login_history USING btree (user_id, login_time DESC);

-- Triggers for user_login_history

-- Trigger: trigger_calculate_session_duration
-- Timing: BEFORE UPDATE
-- EXECUTE FUNCTION calculate_session_duration()

-- RLS Policies for user_login_history
-- Note: RLS policies should be reviewed and customized based on security requirements
ALTER TABLE public.user_login_history ENABLE ROW LEVEL SECURITY;


-- ============================================
-- Table: user_module_access
-- ============================================

-- Table: user_module_access
-- Generated: 2026-03-04T14:43:30.844Z

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
    CONSTRAINT user_module_access_user_id_key UNIQUE (user_id),
    CONSTRAINT fk_user_module_access_updated_by FOREIGN KEY (updated_by) REFERENCES public.users(id) ON UPDATE NO ACTION ON DELETE NO ACTION,
    CONSTRAINT fk_user_module_access_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE NO ACTION ON DELETE CASCADE
);

-- Indexes for user_module_access

-- Index: idx_user_module_access_containers
CREATE INDEX idx_user_module_access_containers ON public.user_module_access USING btree (((module_permissions ->> 'containers'::text)));

-- Index: idx_user_module_access_dashboard
CREATE INDEX idx_user_module_access_dashboard ON public.user_module_access USING btree (((module_permissions ->> 'dashboard'::text)));

-- Index: idx_user_module_access_has_permissions
CREATE INDEX idx_user_module_access_has_permissions ON public.user_module_access USING btree ((((jsonb_typeof(module_permissions) = 'object'::text) AND (module_permissions <> '{}'::jsonb))));

-- Index: idx_user_module_access_last_sync
CREATE INDEX idx_user_module_access_last_sync ON public.user_module_access USING btree (last_sync_at);

-- Index: idx_user_module_access_module_access
CREATE INDEX idx_user_module_access_module_access ON public.user_module_access USING btree (((module_permissions ->> 'moduleAccess'::text)));

-- Index: idx_user_module_access_permissions_gin
CREATE INDEX idx_user_module_access_permissions_gin ON public.user_module_access USING gin (module_permissions);

-- Index: idx_user_module_access_recent_updates
CREATE INDEX idx_user_module_access_recent_updates ON public.user_module_access USING btree (updated_at DESC, user_id);

-- Index: idx_user_module_access_sync_composite
CREATE INDEX idx_user_module_access_sync_composite ON public.user_module_access USING btree (user_id, sync_version, last_sync_at);

-- Index: idx_user_module_access_sync_source
CREATE INDEX idx_user_module_access_sync_source ON public.user_module_access USING btree (sync_source);

-- Index: idx_user_module_access_sync_tracking
CREATE INDEX idx_user_module_access_sync_tracking ON public.user_module_access USING btree (user_id, last_sync_at, sync_version, updated_at);

-- Index: idx_user_module_access_sync_version
CREATE INDEX idx_user_module_access_sync_version ON public.user_module_access USING btree (sync_version);

-- Index: idx_user_module_access_user
CREATE INDEX idx_user_module_access_user ON public.user_module_access USING btree (user_id);

-- Index: idx_user_module_access_users
CREATE INDEX idx_user_module_access_users ON public.user_module_access USING btree (((module_permissions ->> 'users'::text)));

-- Index: user_module_access_user_id_key
CREATE UNIQUE INDEX user_module_access_user_id_key ON public.user_module_access USING btree (user_id);

-- Triggers for user_module_access

-- Trigger: user_module_access_sync_tracking
-- Timing: BEFORE UPDATE
-- EXECUTE FUNCTION update_user_module_access_sync_tracking()

-- RLS Policies for user_module_access
-- Note: RLS policies should be reviewed and customized based on security requirements
ALTER TABLE public.user_module_access ENABLE ROW LEVEL SECURITY;


-- ============================================
-- Table: users
-- ============================================

-- Table: users
-- Generated: 2026-03-04T14:43:30.844Z

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
    is_deleted BOOLEAN,
    deleted_at TIMESTAMPTZ,
    deleted_by TEXT,
    created_by TEXT,
    updated_by TEXT,
    CONSTRAINT users_pkey PRIMARY KEY (id),
    CONSTRAINT users_email_key UNIQUE (email)
);

-- Indexes for users

-- Index: idx_users_active_lookup
CREATE INDEX idx_users_active_lookup ON public.users USING btree (is_deleted, active, email) WHERE (is_deleted = false);

-- Index: idx_users_created_by
CREATE INDEX idx_users_created_by ON public.users USING btree (created_by);

-- Index: idx_users_deleted_at
CREATE INDEX idx_users_deleted_at ON public.users USING btree (deleted_at) WHERE (deleted_at IS NOT NULL);

-- Index: idx_users_deleted_by
CREATE INDEX idx_users_deleted_by ON public.users USING btree (deleted_by) WHERE (deleted_by IS NOT NULL);

-- Index: idx_users_has_module_access
CREATE INDEX idx_users_has_module_access ON public.users USING btree (id, updated_at) WHERE (module_access IS NOT NULL);

-- Index: idx_users_is_deleted
CREATE INDEX idx_users_is_deleted ON public.users USING btree (is_deleted) WHERE (is_deleted = false);

-- Index: idx_users_is_deleted_active
CREATE INDEX idx_users_is_deleted_active ON public.users USING btree (is_deleted, active) WHERE (is_deleted = false);

-- Index: idx_users_module_access_gin
CREATE INDEX idx_users_module_access_gin ON public.users USING gin (module_access) WHERE (module_access IS NOT NULL);

-- Index: idx_users_updated_by
CREATE INDEX idx_users_updated_by ON public.users USING btree (updated_by);

-- Index: users_email_key
CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);

-- Triggers for users

-- Trigger: trigger_update_users_audit_fields
-- Timing: BEFORE UPDATE
-- EXECUTE FUNCTION update_users_audit_fields()

-- Trigger: trigger_update_users_updated_at
-- Timing: BEFORE UPDATE
-- EXECUTE FUNCTION update_users_updated_at()

-- RLS Policies for users
-- Note: RLS policies should be reviewed and customized based on security requirements
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;


-- ============================================
-- Table: virtual_stack_pairs
-- ============================================

-- Table: virtual_stack_pairs
-- Description: Manages pairing relationships between physical stacks for 40ft containers
-- Generated: 2026-03-04T14:43:30.844Z

CREATE TABLE IF NOT EXISTS public.virtual_stack_pairs (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    yard_id TEXT NOT NULL,
    stack1_id UUID NOT NULL,
    stack2_id UUID NOT NULL,
    virtual_stack_number INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT virtual_stack_pairs_pkey PRIMARY KEY (id),
    CONSTRAINT unique_stack_pair UNIQUE (yard_id),
    CONSTRAINT unique_stack_pair UNIQUE (yard_id),
    CONSTRAINT unique_stack_pair UNIQUE (stack1_id),
    CONSTRAINT unique_stack_pair UNIQUE (stack1_id),
    CONSTRAINT unique_stack_pair UNIQUE (stack1_id),
    CONSTRAINT unique_stack_pair UNIQUE (stack2_id),
    CONSTRAINT unique_stack_pair UNIQUE (yard_id),
    CONSTRAINT unique_stack_pair UNIQUE (stack2_id),
    CONSTRAINT unique_stack_pair UNIQUE (stack2_id),
    CONSTRAINT unique_virtual_stack UNIQUE (yard_id),
    CONSTRAINT unique_virtual_stack UNIQUE (virtual_stack_number),
    CONSTRAINT unique_virtual_stack UNIQUE (virtual_stack_number),
    CONSTRAINT unique_virtual_stack UNIQUE (yard_id)
);

-- Indexes for virtual_stack_pairs

-- Index: idx_virtual_pairs_stack1
CREATE INDEX idx_virtual_pairs_stack1 ON public.virtual_stack_pairs USING btree (stack1_id) WHERE (is_active = true);

-- Index: idx_virtual_pairs_stack2
CREATE INDEX idx_virtual_pairs_stack2 ON public.virtual_stack_pairs USING btree (stack2_id) WHERE (is_active = true);

-- Index: idx_virtual_pairs_stacks
CREATE INDEX idx_virtual_pairs_stacks ON public.virtual_stack_pairs USING btree (stack1_id, stack2_id);

-- Index: idx_virtual_pairs_yard
CREATE INDEX idx_virtual_pairs_yard ON public.virtual_stack_pairs USING btree (yard_id);

-- Index: idx_virtual_pairs_yard_active
CREATE INDEX idx_virtual_pairs_yard_active ON public.virtual_stack_pairs USING btree (yard_id, is_active) WHERE (is_active = true);

-- Index: unique_stack_pair
CREATE UNIQUE INDEX unique_stack_pair ON public.virtual_stack_pairs USING btree (yard_id, stack1_id, stack2_id);

-- Index: unique_virtual_stack
CREATE UNIQUE INDEX unique_virtual_stack ON public.virtual_stack_pairs USING btree (yard_id, virtual_stack_number);

-- Triggers for virtual_stack_pairs

-- Trigger: virtual_pairs_updated_at_trigger
-- Timing: BEFORE UPDATE
-- EXECUTE FUNCTION update_virtual_pairs_updated_at()

-- RLS Policies for virtual_stack_pairs
-- Note: RLS policies should be reviewed and customized based on security requirements
ALTER TABLE public.virtual_stack_pairs ENABLE ROW LEVEL SECURITY;


-- ============================================
-- Table: yards
-- ============================================

-- Table: yards
-- Generated: 2026-03-04T14:43:30.844Z

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

-- Indexes for yards

-- Index: idx_yards_code
CREATE INDEX idx_yards_code ON public.yards USING btree (code);

-- Index: idx_yards_is_active
CREATE INDEX idx_yards_is_active ON public.yards USING btree (is_active);

-- Index: yards_code_key
CREATE UNIQUE INDEX yards_code_key ON public.yards USING btree (code);

-- Triggers for yards

-- RLS Policies for yards
-- Note: RLS policies should be reviewed and customized based on security requirements
ALTER TABLE public.yards ENABLE ROW LEVEL SECURITY;

COMMIT;
