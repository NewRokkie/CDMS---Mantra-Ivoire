-- Migration: Create user_activities table
-- Generated: 2026-03-04T14:43:30.833Z

BEGIN;

-- Table: user_activities
-- Description: Tracks user activities for audit and monitoring
-- Generated: 2026-03-04T14:43:30.833Z

CREATE TABLE IF NOT EXISTS public.user_activities (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT user_activities_pkey PRIMARY KEY (id),
    CONSTRAINT user_activities_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE NO ACTION ON DELETE CASCADE
);

-- Indexes for user_activities

-- Index: idx_user_activities_action
CREATE INDEX idx_user_activities_action ON public.user_activities USING btree (action);

-- Index: idx_user_activities_created_at
CREATE INDEX idx_user_activities_created_at ON public.user_activities USING btree (created_at DESC);

-- Index: idx_user_activities_entity
CREATE INDEX idx_user_activities_entity ON public.user_activities USING btree (entity_type, entity_id);

-- Index: idx_user_activities_user_date
CREATE INDEX idx_user_activities_user_date ON public.user_activities USING btree (user_id, created_at DESC);

-- Index: idx_user_activities_user_id
CREATE INDEX idx_user_activities_user_id ON public.user_activities USING btree (user_id);

-- Triggers for user_activities

-- RLS Policies for user_activities
-- Note: RLS policies should be reviewed and customized based on security requirements
ALTER TABLE public.user_activities ENABLE ROW LEVEL SECURITY;

COMMIT;
