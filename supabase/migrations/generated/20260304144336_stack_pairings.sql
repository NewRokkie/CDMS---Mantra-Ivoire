-- Migration: Create stack_pairings table
-- Generated: 2026-03-04T14:43:30.775Z

BEGIN;

-- Table: stack_pairings
-- Description: Defines which physical stacks are paired to create virtual stacks for 40ft containers
-- Generated: 2026-03-04T14:43:30.775Z

CREATE TABLE IF NOT EXISTS public.stack_pairings (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    yard_id TEXT NOT NULL,
    first_stack_number INTEGER NOT NULL,
    second_stack_number INTEGER NOT NULL,
    virtual_stack_number INTEGER NOT NULL,
    first_stack_id UUID,
    second_stack_id UUID,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT stack_pairings_pkey PRIMARY KEY (id),
    CONSTRAINT unique_pairing_per_yard UNIQUE (yard_id),
    CONSTRAINT unique_pairing_per_yard UNIQUE (yard_id),
    CONSTRAINT unique_pairing_per_yard UNIQUE (yard_id),
    CONSTRAINT unique_pairing_per_yard UNIQUE (first_stack_number),
    CONSTRAINT unique_pairing_per_yard UNIQUE (first_stack_number),
    CONSTRAINT unique_pairing_per_yard UNIQUE (first_stack_number),
    CONSTRAINT unique_pairing_per_yard UNIQUE (second_stack_number),
    CONSTRAINT unique_pairing_per_yard UNIQUE (second_stack_number),
    CONSTRAINT unique_pairing_per_yard UNIQUE (second_stack_number)
);

-- Indexes for stack_pairings

-- Index: idx_stack_pairings_stacks
CREATE INDEX idx_stack_pairings_stacks ON public.stack_pairings USING btree (first_stack_number, second_stack_number);

-- Index: idx_stack_pairings_yard
CREATE INDEX idx_stack_pairings_yard ON public.stack_pairings USING btree (yard_id);

-- Index: unique_pairing_per_yard
CREATE UNIQUE INDEX unique_pairing_per_yard ON public.stack_pairings USING btree (yard_id, first_stack_number, second_stack_number);

-- Triggers for stack_pairings

-- RLS Policies for stack_pairings
-- Note: RLS policies should be reviewed and customized based on security requirements
ALTER TABLE public.stack_pairings ENABLE ROW LEVEL SECURITY;

COMMIT;
