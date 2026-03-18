-- Migration: Create clients table
-- Generated: 2026-03-04T14:43:30.767Z

BEGIN;

-- Table: clients
-- Generated: 2026-03-04T14:43:30.767Z

CREATE TABLE IF NOT EXISTS public.clients (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    free_days_allowed INTEGER NOT NULL DEFAULT 3,
    daily_storage_rate NUMERIC NOT NULL DEFAULT 45.00,
    currency TEXT NOT NULL DEFAULT 'USD'::text,
    auto_edi BOOLEAN NOT NULL DEFAULT false,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    billing_address JSONB,
    tax_id TEXT,
    credit_limit NUMERIC NOT NULL DEFAULT 0,
    payment_terms INTEGER NOT NULL DEFAULT 30,
    notes TEXT,
    created_by TEXT DEFAULT 'System'::text,
    updated_by TEXT DEFAULT 'System'::text,
    address JSONB NOT NULL DEFAULT '{"city": "", "state": "", "street": "", "country": "Côte d''Ivoire", "zipCode": ""}'::jsonb,
    contact_person JSONB DEFAULT '{"name": "", "email": "", "phone": "", "position": ""}'::jsonb,
    CONSTRAINT clients_pkey PRIMARY KEY (id),
    CONSTRAINT clients_code_key UNIQUE (code)
);

-- Indexes for clients

-- Index: clients_code_key
CREATE UNIQUE INDEX clients_code_key ON public.clients USING btree (code);

-- Triggers for clients

-- RLS Policies for clients
-- Note: RLS policies should be reviewed and customized based on security requirements
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

COMMIT;
