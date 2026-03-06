-- Migration: Create user_login_history table
-- Generated: 2026-03-04T15:47:03.049Z

BEGIN;

-- Table: user_login_history
-- Description: Tracks user login sessions for security and monitoring
-- Generated: 2026-03-04T15:47:03.049Z

CREATE TABLE IF NOT EXISTS public.user_login_history (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    login_time TIMESTAMPTZ NOT NULL DEFAULT now(),
    logout_time TIMESTAMPTZ,
    session_duration_minutes INTEGER,
    ip_address VARCHAR(45),
    user_agent TEXT,
    login_method VARCHAR(50) DEFAULT 'email'::character varying,
    is_successful BOOLEAN DEFAULT true,
    failure_reason TEXT,
    location_info JSONB DEFAULT '{}'::jsonb,
    device_info JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT user_login_history_pkey PRIMARY KEY (id),
    CONSTRAINT user_login_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE NO ACTION ON DELETE CASCADE
);

-- Indexes for user_login_history

-- Index: idx_login_history_ip_address
CREATE INDEX idx_login_history_ip_address ON public.user_login_history USING btree (ip_address);

-- Index: idx_login_history_login_time
CREATE INDEX idx_login_history_login_time ON public.user_login_history USING btree (login_time DESC);

-- Index: idx_login_history_successful
CREATE INDEX idx_login_history_successful ON public.user_login_history USING btree (is_successful);

-- Index: idx_login_history_user_id
CREATE INDEX idx_login_history_user_id ON public.user_login_history USING btree (user_id);

-- Index: idx_login_history_user_login
CREATE INDEX idx_login_history_user_login ON public.user_login_history USING btree (user_id, login_time DESC);

-- Triggers for user_login_history

-- Trigger: trigger_calculate_session_duration
-- Timing: BEFORE UPDATE
-- EXECUTE FUNCTION calculate_session_duration()

-- RLS Policies for user_login_history
-- Note: RLS policies should be reviewed and customized based on security requirements
ALTER TABLE public.user_login_history ENABLE ROW LEVEL SECURITY;

COMMIT;
