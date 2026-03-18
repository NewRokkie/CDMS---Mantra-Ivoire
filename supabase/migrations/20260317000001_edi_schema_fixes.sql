-- Migration: EDI Schema Fixes
-- Date: 2026-03-17
-- Fixes:
--   1. edi_transmission_logs: rename gate_operation_id → gate_in_operation_id,
--      add gate_out_operation_id with FK to gate_out_operations
--   2. edi_transmission_logs: add proper updated_at trigger
--   3. edi_client_settings: add notification_prefs JSONB column
--   4. Create edi_notifications table (used by ediNotificationService)

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. edi_transmission_logs: split gate_operation_id into two typed FK columns
-- ─────────────────────────────────────────────────────────────────────────────

-- Rename existing generic column to gate_in_operation_id
ALTER TABLE public.edi_transmission_logs
  RENAME COLUMN gate_operation_id TO gate_in_operation_id;

-- Add FK constraint for gate_in_operations
ALTER TABLE public.edi_transmission_logs
  ADD CONSTRAINT edi_transmission_logs_gate_in_operation_id_fkey
  FOREIGN KEY (gate_in_operation_id)
  REFERENCES public.gate_in_operations(id)
  ON UPDATE NO ACTION ON DELETE SET NULL;

-- Add gate_out_operation_id column with FK to gate_out_operations
ALTER TABLE public.edi_transmission_logs
  ADD COLUMN IF NOT EXISTS gate_out_operation_id UUID;

ALTER TABLE public.edi_transmission_logs
  ADD CONSTRAINT edi_transmission_logs_gate_out_operation_id_fkey
  FOREIGN KEY (gate_out_operation_id)
  REFERENCES public.gate_out_operations(id)
  ON UPDATE NO ACTION ON DELETE SET NULL;

-- Index for the new column
CREATE INDEX IF NOT EXISTS idx_edi_transmission_logs_gate_in_op_id
  ON public.edi_transmission_logs USING btree (gate_in_operation_id);

CREATE INDEX IF NOT EXISTS idx_edi_transmission_logs_gate_out_op_id
  ON public.edi_transmission_logs USING btree (gate_out_operation_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. edi_transmission_logs: ensure updated_at trigger exists
-- ─────────────────────────────────────────────────────────────────────────────

-- Create the generic trigger function if it doesn't already exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate trigger to be idempotent
DROP TRIGGER IF EXISTS update_edi_transmission_logs_updated_at
  ON public.edi_transmission_logs;

CREATE TRIGGER update_edi_transmission_logs_updated_at
  BEFORE UPDATE ON public.edi_transmission_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. edi_client_settings: add notification_prefs JSONB column
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.edi_client_settings
  ADD COLUMN IF NOT EXISTS notification_prefs JSONB DEFAULT '{"notifyOnFailure": true, "notifyOnSuccess": false, "channels": ["in-app"]}'::jsonb;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Create edi_notifications table
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.edi_notifications (
  id                  UUID        NOT NULL DEFAULT gen_random_uuid(),
  type                TEXT        NOT NULL CHECK (type IN ('failure', 'success')),
  client_code         TEXT        NOT NULL,
  container_number    TEXT        NOT NULL,
  operation           TEXT        NOT NULL,
  transmission_log_id UUID,
  message             TEXT        NOT NULL,
  read                BOOLEAN     NOT NULL DEFAULT false,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT edi_notifications_pkey PRIMARY KEY (id),
  CONSTRAINT edi_notifications_transmission_log_id_fkey
    FOREIGN KEY (transmission_log_id)
    REFERENCES public.edi_transmission_logs(id)
    ON UPDATE NO ACTION ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_edi_notifications_read
  ON public.edi_notifications USING btree (read);

CREATE INDEX IF NOT EXISTS idx_edi_notifications_client_code
  ON public.edi_notifications USING btree (client_code);

CREATE INDEX IF NOT EXISTS idx_edi_notifications_created_at
  ON public.edi_notifications USING btree (created_at DESC);

-- RLS
ALTER TABLE public.edi_notifications ENABLE ROW LEVEL SECURITY;

COMMIT;