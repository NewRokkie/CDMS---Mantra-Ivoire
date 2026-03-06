-- Migration: Create module_access_sync_log table
-- Generated: 2026-03-04T15:47:03.053Z

BEGIN;

-- Table: module_access_sync_log
-- Description: Audit log for all module access synchronization operations
-- Generated: 2026-03-04T15:47:03.053Z

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

COMMIT;
