-- Migration: Create edi_client_settings table
-- Generated: 2026-03-04T14:43:30.816Z

BEGIN;

-- Table: edi_client_settings
-- Description: Client-specific EDI configuration settings and preferences
-- Generated: 2026-03-04T14:43:30.816Z

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

COMMIT;
