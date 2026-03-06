-- Migration: Create stack_assignments table
-- Generated: 2026-03-04T14:43:30.792Z

BEGIN;

-- Table: stack_assignments
-- Generated: 2026-03-04T14:43:30.792Z

CREATE TABLE IF NOT EXISTS public.stack_assignments (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    yard_id TEXT NOT NULL,
    stack_id TEXT NOT NULL,
    stack_number INTEGER NOT NULL,
    client_pool_id UUID NOT NULL,
    client_code TEXT NOT NULL,
    is_exclusive BOOLEAN DEFAULT false,
    priority INTEGER DEFAULT 1,
    notes TEXT,
    assigned_at TIMESTAMPTZ DEFAULT now(),
    assigned_by UUID NOT NULL,
    CONSTRAINT stack_assignments_pkey PRIMARY KEY (id),
    CONSTRAINT fk_stack_assignments_assigned_by FOREIGN KEY (assigned_by) REFERENCES public.users(id) ON UPDATE NO ACTION ON DELETE NO ACTION,
    CONSTRAINT fk_stack_assignments_pool FOREIGN KEY (client_pool_id) REFERENCES public.client_pools(id) ON UPDATE NO ACTION ON DELETE CASCADE
);

-- Indexes for stack_assignments

-- Index: idx_stack_assignments_client
CREATE INDEX idx_stack_assignments_client ON public.stack_assignments USING btree (client_code);

-- Index: idx_stack_assignments_pool
CREATE INDEX idx_stack_assignments_pool ON public.stack_assignments USING btree (client_pool_id);

-- Index: idx_stack_assignments_yard
CREATE INDEX idx_stack_assignments_yard ON public.stack_assignments USING btree (yard_id);

-- Triggers for stack_assignments

-- RLS Policies for stack_assignments
-- Note: RLS policies should be reviewed and customized based on security requirements
ALTER TABLE public.stack_assignments ENABLE ROW LEVEL SECURITY;

COMMIT;
