-- Migration: Create location_id_mappings table
-- Generated: 2026-03-04T14:43:30.786Z

BEGIN;

-- Table: location_id_mappings
-- Description: Migration mapping table from legacy string-based IDs to new UUID-based records
-- Generated: 2026-03-04T14:43:30.786Z

CREATE TABLE IF NOT EXISTS public.location_id_mappings (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    legacy_string_id VARCHAR(50) NOT NULL,
    new_location_id UUID NOT NULL,
    migration_batch_id UUID NOT NULL,
    migrated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT location_id_mappings_pkey PRIMARY KEY (id),
    CONSTRAINT unique_legacy_id UNIQUE (legacy_string_id),
    CONSTRAINT location_id_mappings_new_location_id_fkey FOREIGN KEY (new_location_id) REFERENCES public.locations(id) ON UPDATE NO ACTION ON DELETE CASCADE
);

-- Indexes for location_id_mappings

-- Index: idx_mappings_batch
CREATE INDEX idx_mappings_batch ON public.location_id_mappings USING btree (migration_batch_id);

-- Index: idx_mappings_legacy_id
CREATE INDEX idx_mappings_legacy_id ON public.location_id_mappings USING btree (legacy_string_id);

-- Index: idx_mappings_new_location
CREATE INDEX idx_mappings_new_location ON public.location_id_mappings USING btree (new_location_id);

-- Index: unique_legacy_id
CREATE UNIQUE INDEX unique_legacy_id ON public.location_id_mappings USING btree (legacy_string_id);

-- Triggers for location_id_mappings

-- RLS Policies for location_id_mappings
-- Note: RLS policies should be reviewed and customized based on security requirements
ALTER TABLE public.location_id_mappings ENABLE ROW LEVEL SECURITY;

COMMIT;
