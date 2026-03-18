-- Migration: Create client_pools table
-- Generated: 2026-03-04T15:47:03.011Z

BEGIN;

-- Table: client_pools
-- Generated: 2026-03-04T15:47:03.011Z

CREATE TABLE IF NOT EXISTS public.client_pools (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    yard_id TEXT NOT NULL,
    client_id UUID NOT NULL,
    client_code TEXT NOT NULL,
    client_name TEXT NOT NULL,
    assigned_stacks JSONB DEFAULT '[]'::jsonb,
    max_capacity INTEGER NOT NULL DEFAULT 0,
    current_occupancy INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    priority TEXT NOT NULL DEFAULT 'medium'::text,
    contract_start_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    contract_end_date TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID NOT NULL,
    updated_by UUID,
    CONSTRAINT client_pools_pkey PRIMARY KEY (id),
    CONSTRAINT fk_client_pools_client FOREIGN KEY (client_id) REFERENCES public.clients(id) ON UPDATE NO ACTION ON DELETE CASCADE,
    CONSTRAINT fk_client_pools_created_by FOREIGN KEY (created_by) REFERENCES public.users(id) ON UPDATE NO ACTION ON DELETE NO ACTION,
    CONSTRAINT fk_client_pools_updated_by FOREIGN KEY (updated_by) REFERENCES public.users(id) ON UPDATE NO ACTION ON DELETE NO ACTION
);

-- Indexes for client_pools

-- Index: idx_client_pools_active
CREATE INDEX idx_client_pools_active ON public.client_pools USING btree (is_active);

-- Index: idx_client_pools_client
CREATE INDEX idx_client_pools_client ON public.client_pools USING btree (client_id);

-- Index: idx_client_pools_yard
CREATE INDEX idx_client_pools_yard ON public.client_pools USING btree (yard_id);

-- Triggers for client_pools

-- Trigger: client_pools_updated_at
-- Timing: BEFORE UPDATE
-- EXECUTE FUNCTION update_client_pools_updated_at()

-- RLS Policies for client_pools
-- Note: RLS policies should be reviewed and customized based on security requirements
ALTER TABLE public.client_pools ENABLE ROW LEVEL SECURITY;

COMMIT;
