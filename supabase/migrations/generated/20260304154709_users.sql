-- Migration: Create users table
-- Generated: 2026-03-04T15:47:02.983Z

BEGIN;

-- Table: users
-- Generated: 2026-03-04T15:47:02.983Z

CREATE TABLE IF NOT EXISTS public.users (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    auth_user_id UUID,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'viewer'::text,
    yard_ids JSONB DEFAULT '[]'::jsonb,
    module_access JSONB DEFAULT '{}'::jsonb,
    active BOOLEAN DEFAULT true,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    is_deleted BOOLEAN,
    deleted_at TIMESTAMPTZ,
    deleted_by TEXT,
    created_by TEXT,
    updated_by TEXT,
    CONSTRAINT users_pkey PRIMARY KEY (id),
    CONSTRAINT users_email_key UNIQUE (email)
);

-- Indexes for users

-- Index: idx_users_active_lookup
CREATE INDEX idx_users_active_lookup ON public.users USING btree (is_deleted, active, email) WHERE (is_deleted = false);

-- Index: idx_users_created_by
CREATE INDEX idx_users_created_by ON public.users USING btree (created_by);

-- Index: idx_users_deleted_at
CREATE INDEX idx_users_deleted_at ON public.users USING btree (deleted_at) WHERE (deleted_at IS NOT NULL);

-- Index: idx_users_deleted_by
CREATE INDEX idx_users_deleted_by ON public.users USING btree (deleted_by) WHERE (deleted_by IS NOT NULL);

-- Index: idx_users_has_module_access
CREATE INDEX idx_users_has_module_access ON public.users USING btree (id, updated_at) WHERE (module_access IS NOT NULL);

-- Index: idx_users_is_deleted
CREATE INDEX idx_users_is_deleted ON public.users USING btree (is_deleted) WHERE (is_deleted = false);

-- Index: idx_users_is_deleted_active
CREATE INDEX idx_users_is_deleted_active ON public.users USING btree (is_deleted, active) WHERE (is_deleted = false);

-- Index: idx_users_module_access_gin
CREATE INDEX idx_users_module_access_gin ON public.users USING gin (module_access) WHERE (module_access IS NOT NULL);

-- Index: idx_users_updated_by
CREATE INDEX idx_users_updated_by ON public.users USING btree (updated_by);

-- Index: users_email_key
CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);

-- Triggers for users

-- Trigger: trigger_update_users_audit_fields
-- Timing: BEFORE UPDATE
-- EXECUTE FUNCTION update_users_audit_fields()

-- Trigger: trigger_update_users_updated_at
-- Timing: BEFORE UPDATE
-- EXECUTE FUNCTION update_users_updated_at()

-- RLS Policies for users
-- Note: RLS policies should be reviewed and customized based on security requirements
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

COMMIT;
