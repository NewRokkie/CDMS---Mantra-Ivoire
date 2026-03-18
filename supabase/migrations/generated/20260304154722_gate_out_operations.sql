-- Migration: Create gate_out_operations table
-- Generated: 2026-03-04T15:47:03.028Z

BEGIN;

-- Table: gate_out_operations
-- Generated: 2026-03-04T15:47:03.028Z

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

COMMIT;
