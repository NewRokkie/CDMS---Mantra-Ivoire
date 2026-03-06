-- Migration: Create gate_in_operations table
-- Generated: 2026-03-04T14:43:30.805Z

BEGIN;

-- Table: gate_in_operations
-- Generated: 2026-03-04T14:43:30.805Z

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

COMMIT;
