-- Migration: Create virtual_stack_pairs table
-- Generated: 2026-03-04T14:43:30.779Z

BEGIN;

-- Table: virtual_stack_pairs
-- Description: Manages pairing relationships between physical stacks for 40ft containers
-- Generated: 2026-03-04T14:43:30.779Z

CREATE TABLE IF NOT EXISTS public.virtual_stack_pairs (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    yard_id TEXT NOT NULL,
    stack1_id UUID NOT NULL,
    stack2_id UUID NOT NULL,
    virtual_stack_number INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT virtual_stack_pairs_pkey PRIMARY KEY (id),
    CONSTRAINT unique_stack_pair UNIQUE (yard_id),
    CONSTRAINT unique_stack_pair UNIQUE (yard_id),
    CONSTRAINT unique_stack_pair UNIQUE (stack1_id),
    CONSTRAINT unique_stack_pair UNIQUE (stack1_id),
    CONSTRAINT unique_stack_pair UNIQUE (stack1_id),
    CONSTRAINT unique_stack_pair UNIQUE (stack2_id),
    CONSTRAINT unique_stack_pair UNIQUE (yard_id),
    CONSTRAINT unique_stack_pair UNIQUE (stack2_id),
    CONSTRAINT unique_stack_pair UNIQUE (stack2_id),
    CONSTRAINT unique_virtual_stack UNIQUE (yard_id),
    CONSTRAINT unique_virtual_stack UNIQUE (virtual_stack_number),
    CONSTRAINT unique_virtual_stack UNIQUE (virtual_stack_number),
    CONSTRAINT unique_virtual_stack UNIQUE (yard_id)
);

-- Indexes for virtual_stack_pairs

-- Index: idx_virtual_pairs_stack1
CREATE INDEX idx_virtual_pairs_stack1 ON public.virtual_stack_pairs USING btree (stack1_id) WHERE (is_active = true);

-- Index: idx_virtual_pairs_stack2
CREATE INDEX idx_virtual_pairs_stack2 ON public.virtual_stack_pairs USING btree (stack2_id) WHERE (is_active = true);

-- Index: idx_virtual_pairs_stacks
CREATE INDEX idx_virtual_pairs_stacks ON public.virtual_stack_pairs USING btree (stack1_id, stack2_id);

-- Index: idx_virtual_pairs_yard
CREATE INDEX idx_virtual_pairs_yard ON public.virtual_stack_pairs USING btree (yard_id);

-- Index: idx_virtual_pairs_yard_active
CREATE INDEX idx_virtual_pairs_yard_active ON public.virtual_stack_pairs USING btree (yard_id, is_active) WHERE (is_active = true);

-- Index: unique_stack_pair
CREATE UNIQUE INDEX unique_stack_pair ON public.virtual_stack_pairs USING btree (yard_id, stack1_id, stack2_id);

-- Index: unique_virtual_stack
CREATE UNIQUE INDEX unique_virtual_stack ON public.virtual_stack_pairs USING btree (yard_id, virtual_stack_number);

-- Triggers for virtual_stack_pairs

-- Trigger: virtual_pairs_updated_at_trigger
-- Timing: BEFORE UPDATE
-- EXECUTE FUNCTION update_virtual_pairs_updated_at()

-- RLS Policies for virtual_stack_pairs
-- Note: RLS policies should be reviewed and customized based on security requirements
ALTER TABLE public.virtual_stack_pairs ENABLE ROW LEVEL SECURITY;

COMMIT;
