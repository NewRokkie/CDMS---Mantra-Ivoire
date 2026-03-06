-- Migration: Create container_buffer_zones table
-- Generated: 2026-03-04T14:43:30.798Z

BEGIN;

-- Table: container_buffer_zones
-- Description: Table de gestion des conteneurs en zone tampon (endommagés en attente de traitement)
-- Generated: 2026-03-04T14:43:30.798Z

CREATE TABLE IF NOT EXISTS public.container_buffer_zones (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    container_id UUID NOT NULL,
    gate_in_operation_id UUID,
    buffer_stack_id UUID,
    yard_id TEXT NOT NULL,
    damage_type TEXT,
    damage_description TEXT,
    damage_assessment JSONB,
    status TEXT NOT NULL DEFAULT 'in_buffer'::text,
    released_at TIMESTAMPTZ,
    released_by UUID,
    release_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID,
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT container_buffer_zones_pkey PRIMARY KEY (id),
    CONSTRAINT container_buffer_zones_buffer_stack_id_fkey FOREIGN KEY (buffer_stack_id) REFERENCES public.stacks(id) ON UPDATE NO ACTION ON DELETE SET NULL,
    CONSTRAINT container_buffer_zones_container_id_fkey FOREIGN KEY (container_id) REFERENCES public.containers(id) ON UPDATE NO ACTION ON DELETE CASCADE,
    CONSTRAINT container_buffer_zones_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON UPDATE NO ACTION ON DELETE SET NULL,
    CONSTRAINT container_buffer_zones_gate_in_operation_id_fkey FOREIGN KEY (gate_in_operation_id) REFERENCES public.gate_in_operations(id) ON UPDATE NO ACTION ON DELETE SET NULL,
    CONSTRAINT container_buffer_zones_released_by_fkey FOREIGN KEY (released_by) REFERENCES public.users(id) ON UPDATE NO ACTION ON DELETE SET NULL
);

-- Indexes for container_buffer_zones

-- Index: idx_container_buffer_zones_buffer_stack_id
CREATE INDEX idx_container_buffer_zones_buffer_stack_id ON public.container_buffer_zones USING btree (buffer_stack_id);

-- Index: idx_container_buffer_zones_container_id
CREATE INDEX idx_container_buffer_zones_container_id ON public.container_buffer_zones USING btree (container_id);

-- Index: idx_container_buffer_zones_status
CREATE INDEX idx_container_buffer_zones_status ON public.container_buffer_zones USING btree (status);

-- Index: idx_container_buffer_zones_yard_id
CREATE INDEX idx_container_buffer_zones_yard_id ON public.container_buffer_zones USING btree (yard_id);

-- Triggers for container_buffer_zones

-- Trigger: trigger_buffer_zone_updated_at
-- Timing: BEFORE UPDATE
-- EXECUTE FUNCTION update_buffer_zone_updated_at()

-- RLS Policies for container_buffer_zones
-- Note: RLS policies should be reviewed and customized based on security requirements
ALTER TABLE public.container_buffer_zones ENABLE ROW LEVEL SECURITY;

COMMIT;
