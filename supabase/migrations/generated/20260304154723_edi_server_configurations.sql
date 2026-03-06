-- Migration: Create edi_server_configurations table
-- Generated: 2026-03-04T15:47:03.030Z

BEGIN;

-- Table: edi_server_configurations
-- Description: EDI server configurations for FTP/SFTP connections to trading partners
-- Generated: 2026-03-04T15:47:03.030Z

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

COMMIT;
