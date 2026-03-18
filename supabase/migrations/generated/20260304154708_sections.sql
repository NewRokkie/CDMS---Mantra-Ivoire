-- Migration: Create sections table
-- Generated: 2026-03-04T15:47:02.978Z

BEGIN;

-- Table: sections
-- Generated: 2026-03-04T15:47:02.978Z

CREATE TABLE IF NOT EXISTS public.sections (
    id TEXT NOT NULL,
    yard_id TEXT NOT NULL,
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT sections_pkey PRIMARY KEY (id)
);

-- Indexes for sections

-- Index: idx_sections_yard_id
CREATE INDEX idx_sections_yard_id ON public.sections USING btree (yard_id);

-- Triggers for sections

-- RLS Policies for sections
-- Note: RLS policies should be reviewed and customized based on security requirements
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;

COMMIT;
