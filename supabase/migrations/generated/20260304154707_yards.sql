-- Migration: Create yards table
-- Generated: 2026-03-04T15:47:02.974Z

BEGIN;

-- Table: yards
-- Generated: 2026-03-04T15:47:02.974Z

CREATE TABLE IF NOT EXISTS public.yards (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    location TEXT NOT NULL,
    description TEXT,
    layout TEXT DEFAULT 'standard'::text,
    is_active BOOLEAN DEFAULT true,
    total_capacity INTEGER DEFAULT 0,
    current_occupancy INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by TEXT,
    timezone TEXT DEFAULT 'Africa/Abidjan'::text,
    contact_info JSONB,
    address JSONB,
    updated_by UUID,
    CONSTRAINT yards_pkey PRIMARY KEY (id),
    CONSTRAINT yards_code_key UNIQUE (code)
);

-- Indexes for yards

-- Index: idx_yards_code
CREATE INDEX idx_yards_code ON public.yards USING btree (code);

-- Index: idx_yards_is_active
CREATE INDEX idx_yards_is_active ON public.yards USING btree (is_active);

-- Index: yards_code_key
CREATE UNIQUE INDEX yards_code_key ON public.yards USING btree (code);

-- Triggers for yards

-- RLS Policies for yards
-- Note: RLS policies should be reviewed and customized based on security requirements
ALTER TABLE public.yards ENABLE ROW LEVEL SECURITY;

COMMIT;
