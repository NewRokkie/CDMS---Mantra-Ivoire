-- Migration: Create audit_logs table
-- Generated: 2026-03-04T15:47:03.041Z

BEGIN;

-- Table: audit_logs
-- Generated: 2026-03-04T15:47:03.041Z

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

COMMIT;
