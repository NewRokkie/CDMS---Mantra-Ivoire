-- Migration: Create user_module_access table
-- Generated: 2026-03-04T15:47:03.039Z

BEGIN;

-- Table: user_module_access
-- Generated: 2026-03-04T15:47:03.039Z

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

COMMIT;
