-- Migration: Create booking_references table
-- Generated: 2026-03-04T14:43:30.801Z

BEGIN;

-- Table: booking_references
-- Generated: 2026-03-04T14:43:30.801Z

CREATE TABLE IF NOT EXISTS public.booking_references (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    booking_number TEXT NOT NULL,
    client_id UUID,
    client_code TEXT NOT NULL,
    client_name TEXT NOT NULL,
    booking_type TEXT NOT NULL,
    total_containers INTEGER NOT NULL DEFAULT 0,
    remaining_containers INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending'::text,
    valid_from TIMESTAMPTZ,
    valid_until TIMESTAMPTZ,
    notes TEXT,
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    cancellation_reason TEXT,
    new_booking_reference TEXT,
    container_quantities JSONB DEFAULT '{"size20ft": 0, "size40ft": 0}'::jsonb,
    max_quantity_threshold INTEGER DEFAULT 10,
    requires_detailed_breakdown BOOLEAN DEFAULT false,
    transaction_type TEXT,
    CONSTRAINT release_orders_pkey PRIMARY KEY (id),
    CONSTRAINT release_orders_booking_number_key UNIQUE (booking_number),
    CONSTRAINT release_orders_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON UPDATE NO ACTION ON DELETE NO ACTION
);

-- Indexes for booking_references

-- Index: idx_booking_references_container_quantities
CREATE INDEX idx_booking_references_container_quantities ON public.booking_references USING gin (container_quantities);

-- Index: idx_booking_references_new_booking_ref
CREATE INDEX idx_booking_references_new_booking_ref ON public.booking_references USING btree (new_booking_reference);

-- Index: idx_booking_references_transaction_type
CREATE INDEX idx_booking_references_transaction_type ON public.booking_references USING btree (transaction_type);

-- Index: idx_booking_references_updated_at
CREATE INDEX idx_booking_references_updated_at ON public.booking_references USING btree (updated_at);

-- Index: idx_release_orders_booking_number
CREATE INDEX idx_release_orders_booking_number ON public.booking_references USING btree (booking_number);

-- Index: idx_release_orders_client_id
CREATE INDEX idx_release_orders_client_id ON public.booking_references USING btree (client_id);

-- Index: idx_release_orders_status
CREATE INDEX idx_release_orders_status ON public.booking_references USING btree (status);

-- Index: release_orders_booking_number_key
CREATE UNIQUE INDEX release_orders_booking_number_key ON public.booking_references USING btree (booking_number);

-- Triggers for booking_references

-- Trigger: trigger_booking_references_updated_at
-- Timing: BEFORE UPDATE
-- EXECUTE FUNCTION update_booking_references_updated_at()

-- RLS Policies for booking_references
-- Note: RLS policies should be reviewed and customized based on security requirements
ALTER TABLE public.booking_references ENABLE ROW LEVEL SECURITY;

COMMIT;
