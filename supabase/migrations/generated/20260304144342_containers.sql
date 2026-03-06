-- Migration: Create containers table
-- Generated: 2026-03-04T14:43:30.795Z

BEGIN;

-- Table: containers
-- Generated: 2026-03-04T14:43:30.795Z

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

COMMIT;
