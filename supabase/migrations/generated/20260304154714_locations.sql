-- Migration: Create locations table
-- Generated: 2026-03-04T15:47:03.004Z

BEGIN;

-- Table: locations
-- Description: Core location management table with UUID-based records and SXXRXHX format location IDs
-- Generated: 2026-03-04T15:47:03.004Z

CREATE TABLE IF NOT EXISTS public.locations (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    location_id VARCHAR(8) NOT NULL,
    stack_id UUID NOT NULL,
    yard_id TEXT NOT NULL,
    row_number INTEGER NOT NULL,
    tier_number INTEGER NOT NULL,
    is_virtual BOOLEAN DEFAULT false,
    virtual_stack_pair_id UUID,
    is_occupied BOOLEAN DEFAULT false,
    container_id UUID,
    container_size USER-DEFINED,
    client_pool_id UUID,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    available BOOLEAN DEFAULT true,
    container_number TEXT,
    CONSTRAINT locations_pkey PRIMARY KEY (id),
    CONSTRAINT locations_location_id_key UNIQUE (location_id),
    CONSTRAINT unique_stack_position UNIQUE (row_number),
    CONSTRAINT unique_stack_position UNIQUE (row_number),
    CONSTRAINT unique_stack_position UNIQUE (tier_number),
    CONSTRAINT unique_stack_position UNIQUE (tier_number),
    CONSTRAINT unique_stack_position UNIQUE (tier_number),
    CONSTRAINT unique_stack_position UNIQUE (stack_id),
    CONSTRAINT unique_stack_position UNIQUE (stack_id),
    CONSTRAINT unique_stack_position UNIQUE (stack_id),
    CONSTRAINT unique_stack_position UNIQUE (row_number),
    CONSTRAINT locations_client_pool_id_fkey FOREIGN KEY (client_pool_id) REFERENCES public.client_pools(id) ON UPDATE NO ACTION ON DELETE SET NULL,
    CONSTRAINT locations_container_id_fkey FOREIGN KEY (container_id) REFERENCES public.containers(id) ON UPDATE NO ACTION ON DELETE SET NULL,
    CONSTRAINT locations_virtual_stack_pair_id_fkey FOREIGN KEY (virtual_stack_pair_id) REFERENCES public.virtual_stack_pairs(id) ON UPDATE NO ACTION ON DELETE SET NULL
);

-- Indexes for locations

-- Index: idx_locations_availability
CREATE INDEX idx_locations_availability ON public.locations USING btree (is_occupied, container_size, client_pool_id, yard_id) WHERE (is_active = true);

-- Index: idx_locations_availability_composite
CREATE INDEX idx_locations_availability_composite ON public.locations USING btree (yard_id, is_occupied, container_size, is_active) WHERE ((is_active = true) AND (is_occupied = false));

-- Index: idx_locations_available
CREATE INDEX idx_locations_available ON public.locations USING btree (available) WHERE (available = true);

-- Index: idx_locations_client_pool
CREATE INDEX idx_locations_client_pool ON public.locations USING btree (client_pool_id) WHERE (client_pool_id IS NOT NULL);

-- Index: idx_locations_container_id
CREATE INDEX idx_locations_container_id ON public.locations USING btree (container_id) WHERE (container_id IS NOT NULL);

-- Index: idx_locations_container_number
CREATE INDEX idx_locations_container_number ON public.locations USING btree (container_number) WHERE (container_number IS NOT NULL);

-- Index: idx_locations_location_id
CREATE INDEX idx_locations_location_id ON public.locations USING btree (location_id);

-- Index: idx_locations_occupied_containers
CREATE INDEX idx_locations_occupied_containers ON public.locations USING btree (container_id, yard_id) WHERE ((is_occupied = true) AND (container_id IS NOT NULL));

-- Index: idx_locations_pool_availability
CREATE INDEX idx_locations_pool_availability ON public.locations USING btree (client_pool_id, is_occupied, container_size) WHERE (is_active = true);

-- Index: idx_locations_stack_id
CREATE INDEX idx_locations_stack_id ON public.locations USING btree (stack_id);

-- Index: idx_locations_stack_position
CREATE INDEX idx_locations_stack_position ON public.locations USING btree (stack_id, row_number, tier_number) WHERE (is_active = true);

-- Index: idx_locations_stack_row_tier
CREATE INDEX idx_locations_stack_row_tier ON public.locations USING btree (stack_id, row_number, tier_number);

-- Index: idx_locations_virtual
CREATE INDEX idx_locations_virtual ON public.locations USING btree (virtual_stack_pair_id) WHERE (is_virtual = true);

-- Index: idx_locations_virtual_pair
CREATE INDEX idx_locations_virtual_pair ON public.locations USING btree (virtual_stack_pair_id, is_occupied) WHERE ((is_virtual = true) AND (is_active = true));

-- Index: idx_locations_yard_id
CREATE INDEX idx_locations_yard_id ON public.locations USING btree (yard_id);

-- Index: locations_location_id_key
CREATE UNIQUE INDEX locations_location_id_key ON public.locations USING btree (location_id);

-- Index: unique_stack_position
CREATE UNIQUE INDEX unique_stack_position ON public.locations USING btree (stack_id, row_number, tier_number);

-- Triggers for locations

-- Trigger: location_stats_refresh_trigger
-- Timing: AFTER INSERT
-- EXECUTE FUNCTION trigger_refresh_location_statistics()

-- Trigger: location_stats_refresh_trigger
-- Timing: AFTER DELETE
-- EXECUTE FUNCTION trigger_refresh_location_statistics()

-- Trigger: location_stats_refresh_trigger
-- Timing: AFTER UPDATE
-- EXECUTE FUNCTION trigger_refresh_location_statistics()

-- Trigger: locations_audit_trigger
-- Timing: AFTER INSERT
-- EXECUTE FUNCTION log_location_changes()

-- Trigger: locations_audit_trigger
-- Timing: AFTER DELETE
-- EXECUTE FUNCTION log_location_changes()

-- Trigger: locations_audit_trigger
-- Timing: AFTER UPDATE
-- EXECUTE FUNCTION log_location_changes()

-- Trigger: locations_updated_at_trigger
-- Timing: BEFORE UPDATE
-- EXECUTE FUNCTION update_locations_updated_at()

-- RLS Policies for locations
-- Note: RLS policies should be reviewed and customized based on security requirements
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

COMMIT;
