-- Migration: Create container_types table
-- Generated: 2026-03-04T15:47:02.964Z

BEGIN;

-- Table: container_types
-- Description: Reference table for container types with High-Cube support and size restrictions
-- Generated: 2026-03-04T15:47:02.969Z

CREATE TABLE IF NOT EXISTS public.container_types (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    type_code VARCHAR(20) NOT NULL,
    display_name VARCHAR(50) NOT NULL,
    is_high_cube BOOLEAN DEFAULT false,
    available_sizes ARRAY DEFAULT ARRAY['20ft'::text, '40ft'::text],
    iso_code_20 VARCHAR(10),
    iso_code_40 VARCHAR(10),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT container_types_pkey PRIMARY KEY (id),
    CONSTRAINT container_types_type_code_key UNIQUE (type_code)
);

-- Indexes for container_types

-- Index: container_types_type_code_key
CREATE UNIQUE INDEX container_types_type_code_key ON public.container_types USING btree (type_code);

-- Index: idx_container_types_active
CREATE INDEX idx_container_types_active ON public.container_types USING btree (is_active);

-- Index: idx_container_types_high_cube
CREATE INDEX idx_container_types_high_cube ON public.container_types USING btree (is_high_cube);

-- Triggers for container_types

-- RLS Policies for container_types
-- Note: RLS policies should be reviewed and customized based on security requirements
ALTER TABLE public.container_types ENABLE ROW LEVEL SECURITY;

COMMIT;
