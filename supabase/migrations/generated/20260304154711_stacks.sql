-- Migration: Create stacks table
-- Generated: 2026-03-04T15:47:02.992Z

BEGIN;

-- Table: stacks
-- Description: Triggers temporarily disabled to fix scalar extraction error - will be re-enabled after testing
-- Generated: 2026-03-04T15:47:02.992Z

CREATE TABLE IF NOT EXISTS public.stacks (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    yard_id TEXT NOT NULL,
    stack_number INTEGER NOT NULL,
    section_id TEXT,
    section_name TEXT NOT NULL DEFAULT 'Main Section'::text,
    rows INTEGER NOT NULL DEFAULT 6,
    max_tiers INTEGER NOT NULL DEFAULT 4,
    capacity INTEGER NOT NULL DEFAULT 0,
    current_occupancy INTEGER NOT NULL DEFAULT 0,
    position_x NUMERIC DEFAULT 0,
    position_y NUMERIC DEFAULT 0,
    position_z NUMERIC DEFAULT 0,
    width NUMERIC DEFAULT 2.5,
    length NUMERIC DEFAULT 12,
    is_active BOOLEAN DEFAULT true,
    is_odd_stack BOOLEAN DEFAULT false,
    assigned_client_code TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by TEXT,
    updated_by TEXT,
    container_size TEXT NOT NULL DEFAULT '20feet'::text,
    is_special_stack BOOLEAN NOT NULL DEFAULT false,
    row_tier_config JSONB,
    is_virtual BOOLEAN DEFAULT false,
    is_buffer_zone BOOLEAN DEFAULT false,
    buffer_zone_type TEXT,
    damage_types_supported JSONB DEFAULT '[]'::jsonb,
    CONSTRAINT stacks_pkey PRIMARY KEY (id)
);

-- Indexes for stacks

-- Index: idx_stacks_assigned_client
CREATE INDEX idx_stacks_assigned_client ON public.stacks USING btree (assigned_client_code);

-- Index: idx_stacks_buffer_zone_type
CREATE INDEX idx_stacks_buffer_zone_type ON public.stacks USING btree (buffer_zone_type) WHERE (buffer_zone_type IS NOT NULL);

-- Index: idx_stacks_container_size
CREATE INDEX idx_stacks_container_size ON public.stacks USING btree (container_size);

-- Index: idx_stacks_is_buffer_zone
CREATE INDEX idx_stacks_is_buffer_zone ON public.stacks USING btree (is_buffer_zone) WHERE (is_buffer_zone = true);

-- Index: idx_stacks_is_virtual
CREATE INDEX idx_stacks_is_virtual ON public.stacks USING btree (is_virtual) WHERE (is_virtual = true);

-- Index: idx_stacks_row_tier_config
CREATE INDEX idx_stacks_row_tier_config ON public.stacks USING gin (row_tier_config);

-- Index: idx_stacks_section_id
CREATE INDEX idx_stacks_section_id ON public.stacks USING btree (section_id);

-- Index: idx_stacks_stack_number
CREATE INDEX idx_stacks_stack_number ON public.stacks USING btree (stack_number);

-- Index: idx_stacks_yard_id
CREATE INDEX idx_stacks_yard_id ON public.stacks USING btree (yard_id);

-- Index: idx_stacks_yard_section
CREATE INDEX idx_stacks_yard_section ON public.stacks USING btree (yard_id, section_id);

-- Index: unique_active_yard_stack
CREATE UNIQUE INDEX unique_active_yard_stack ON public.stacks USING btree (yard_id, stack_number) WHERE (is_active = true);

-- Triggers for stacks

-- Trigger: stack_soft_delete_trigger
-- Timing: AFTER UPDATE
-- EXECUTE FUNCTION handle_stack_soft_delete()

-- Trigger: trigger_auto_mark_buffer_zones
-- Timing: BEFORE INSERT
-- EXECUTE FUNCTION auto_mark_buffer_zones()

-- Trigger: trigger_auto_mark_buffer_zones
-- Timing: BEFORE UPDATE
-- EXECUTE FUNCTION auto_mark_buffer_zones()

-- Trigger: trigger_update_stack_capacity
-- Timing: BEFORE INSERT
-- EXECUTE FUNCTION update_stack_capacity()

-- Trigger: trigger_update_stack_capacity
-- Timing: BEFORE UPDATE
-- EXECUTE FUNCTION update_stack_capacity()

-- RLS Policies for stacks
-- Note: RLS policies should be reviewed and customized based on security requirements
ALTER TABLE public.stacks ENABLE ROW LEVEL SECURITY;

COMMIT;
