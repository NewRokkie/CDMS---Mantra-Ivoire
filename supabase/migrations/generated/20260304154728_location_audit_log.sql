-- Migration: Create location_audit_log table
-- Generated: 2026-03-04T15:47:03.044Z

BEGIN;

-- Table: location_audit_log
-- Description: Comprehensive audit trail for all location management operations
-- Generated: 2026-03-04T15:47:03.044Z

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

COMMIT;
