-- Migration: Create edi_transmission_logs table
-- Generated: 2026-03-04T15:47:03.036Z

BEGIN;

-- Table: edi_transmission_logs
-- Description: Complete log of all EDI transmissions with status tracking
-- Generated: 2026-03-04T15:47:03.036Z

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

COMMIT;
