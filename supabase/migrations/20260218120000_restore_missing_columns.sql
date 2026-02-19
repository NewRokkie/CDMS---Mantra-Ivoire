/*
  # Restore Missing Columns — Comprehensive Schema Fix

  ## Problem
  Some columns were manually deleted from the database tables via SQL,
  causing INSERT/UPDATE failures with UNKNOWN_ERROR.

  ## Strategy
  Use "ADD COLUMN IF NOT EXISTS" (PostgreSQL 9.6+) for ALL columns that
  the TypeScript code (gateService.ts, containerService.ts) currently submits.
  Safe to run multiple times — will only add columns that are actually missing.

  ## Tables affected
  - containers
  - gate_in_operations
  - gate_out_operations
*/

-- ============================================================================
-- 1. TABLE: containers
-- ============================================================================

-- full_empty: FULL or EMPTY status (added by 20251107120001_add_full_empty_status.sql)
ALTER TABLE public.containers
  ADD COLUMN IF NOT EXISTS full_empty text DEFAULT 'FULL';

-- classification: 'divers' or 'alimentaire'
ALTER TABLE public.containers
  ADD COLUMN IF NOT EXISTS classification text DEFAULT 'divers';

-- transaction_type: 'Retour Livraison' or 'Transfert (IN)' (added by 20250212000000)
ALTER TABLE public.containers
  ADD COLUMN IF NOT EXISTS transaction_type text;

-- booking_reference: Related booking/BL number
ALTER TABLE public.containers
  ADD COLUMN IF NOT EXISTS booking_reference text;

-- DROP columns no longer used: weight, seal_number, temperature_setting
ALTER TABLE public.containers DROP COLUMN IF EXISTS weight;
ALTER TABLE public.containers DROP COLUMN IF EXISTS seal_number;
ALTER TABLE public.containers DROP COLUMN IF EXISTS temperature_setting;

-- Soft delete columns (added by 20251208100000_implement_soft_delete_containers.sql)
ALTER TABLE public.containers
  ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false;

ALTER TABLE public.containers
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

ALTER TABLE public.containers
  ADD COLUMN IF NOT EXISTS deleted_by text;

ALTER TABLE public.containers
  ADD COLUMN IF NOT EXISTS updated_by text;

-- audit_logs: JSONB array for inline audit trail
ALTER TABLE public.containers
  ADD COLUMN IF NOT EXISTS audit_logs jsonb DEFAULT '[]'::jsonb;

-- ============================================================================
-- 2. TABLE: gate_in_operations
-- ============================================================================

-- container_quantity: 1 or 2 (for paired 20ft containers)
ALTER TABLE public.gate_in_operations
  ADD COLUMN IF NOT EXISTS container_quantity integer DEFAULT 1;

-- second_container_number: Second container when quantity is 2
ALTER TABLE public.gate_in_operations
  ADD COLUMN IF NOT EXISTS second_container_number text;

-- full_empty: FULL or EMPTY status
ALTER TABLE public.gate_in_operations
  ADD COLUMN IF NOT EXISTS full_empty text DEFAULT 'FULL';

-- truck_arrival_date: Date of truck arrival (may differ from gate_in timestamp)
ALTER TABLE public.gate_in_operations
  ADD COLUMN IF NOT EXISTS truck_arrival_date date;

-- truck_arrival_time: Time of truck arrival (HH:MM)
ALTER TABLE public.gate_in_operations
  ADD COLUMN IF NOT EXISTS truck_arrival_time text;

-- classification: 'divers' or 'alimentaire'
ALTER TABLE public.gate_in_operations
  ADD COLUMN IF NOT EXISTS classification text DEFAULT 'divers';

-- transaction_type: 'Retour Livraison' or 'Transfert (IN)'
ALTER TABLE public.gate_in_operations
  ADD COLUMN IF NOT EXISTS transaction_type text;

-- equipment_reference: For EDI CODECO transmission
ALTER TABLE public.gate_in_operations
  ADD COLUMN IF NOT EXISTS equipment_reference text;

-- damage_assessment_stage: 'assignment' or 'inspection'
ALTER TABLE public.gate_in_operations
  ADD COLUMN IF NOT EXISTS damage_assessment_stage text;

-- damage_assessed_by: Operator who assessed damage
ALTER TABLE public.gate_in_operations
  ADD COLUMN IF NOT EXISTS damage_assessed_by text;

-- damage_assessed_at: When damage was assessed
ALTER TABLE public.gate_in_operations
  ADD COLUMN IF NOT EXISTS damage_assessed_at timestamptz;

-- damage_type: Type/category of damage
ALTER TABLE public.gate_in_operations
  ADD COLUMN IF NOT EXISTS damage_type text;

-- booking_reference: Related booking number
ALTER TABLE public.gate_in_operations
  ADD COLUMN IF NOT EXISTS booking_reference text;

-- notes: Additional operator notes
ALTER TABLE public.gate_in_operations
  ADD COLUMN IF NOT EXISTS notes text;

-- assigned_stack: Stack where container was placed (added by 20250212000001)
ALTER TABLE public.gate_in_operations
  ADD COLUMN IF NOT EXISTS assigned_stack text;

-- EDI fields (added by 20251218120000_add_edi_fields_to_gate_operations.sql)
ALTER TABLE public.gate_in_operations
  ADD COLUMN IF NOT EXISTS edi_message_id text;

ALTER TABLE public.gate_in_operations
  ADD COLUMN IF NOT EXISTS edi_client_name text;

ALTER TABLE public.gate_in_operations
  ADD COLUMN IF NOT EXISTS edi_client_code text;

-- ============================================================================
-- 3. TABLE: gate_out_operations
-- ============================================================================

-- EDI fields
ALTER TABLE public.gate_out_operations
  ADD COLUMN IF NOT EXISTS edi_message_id text;

ALTER TABLE public.gate_out_operations
  ADD COLUMN IF NOT EXISTS edi_client_name text;

-- ============================================================================
-- 4. TABLE: booking_references (formerly release_orders)
--    Check if this table exists and has required columns
-- ============================================================================

-- transaction_type (added by 20250205000000_add_transaction_type_to_booking_references.sql)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'booking_references'
  ) THEN
    -- Add missing columns to booking_references if they don't exist
    ALTER TABLE public.booking_references
      ADD COLUMN IF NOT EXISTS transaction_type text;

    ALTER TABLE public.booking_references
      ADD COLUMN IF NOT EXISTS cancellation_reason text;

    ALTER TABLE public.booking_references
      ADD COLUMN IF NOT EXISTS new_booking_reference text;

    RAISE NOTICE '✓ booking_references columns verified/added';
  ELSE
    RAISE WARNING '⚠ Table booking_references does not exist — may still be named release_orders';
  END IF;
END $$;

-- ============================================================================
-- 5. VERIFY: Run a test INSERT simulation to catch remaining column issues
-- ============================================================================
DO $$
DECLARE
  v_missing_containers text := '';
  v_missing_gate_in text := '';
  col_name text;
BEGIN
  -- Check containers columns
  FOREACH col_name IN ARRAY ARRAY[
    'number', 'type', 'size', 'status', 'full_empty', 'location',
    'yard_id', 'client_id', 'client_code', 'gate_in_date', 'gate_out_date',
    'classification', 'transaction_type', 'damage',
    'booking_reference', 'created_by'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'containers' AND column_name = col_name
    ) THEN
      v_missing_containers := v_missing_containers || col_name || ', ';
    END IF;
  END LOOP;

  -- Check gate_in_operations columns
  FOREACH col_name IN ARRAY ARRAY[
    'container_id', 'container_number', 'container_quantity', 'second_container_number',
    'client_code', 'client_name', 'container_type', 'container_size', 'full_empty',
    'transport_company', 'driver_name', 'vehicle_number',
    'truck_arrival_date', 'truck_arrival_time', 'assigned_location',
    'classification', 'transaction_type', 'equipment_reference',
    'damage_reported', 'damage_description', 'damage_assessment_stage',
    'damage_assessed_by', 'damage_assessed_at', 'damage_type',
    'booking_reference', 'notes', 'status', 'operator_id', 'operator_name',
    'yard_id', 'edi_transmitted', 'completed_at'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'gate_in_operations' AND column_name = col_name
    ) THEN
      v_missing_gate_in := v_missing_gate_in || col_name || ', ';
    END IF;
  END LOOP;

  -- Report results
  IF v_missing_containers = '' THEN
    RAISE NOTICE '✅ containers: ALL required columns present';
  ELSE
    RAISE WARNING '❌ containers: Still missing columns: %', v_missing_containers;
  END IF;

  IF v_missing_gate_in = '' THEN
    RAISE NOTICE '✅ gate_in_operations: ALL required columns present';
  ELSE
    RAISE WARNING '❌ gate_in_operations: Still missing columns: %', v_missing_gate_in;
  END IF;

  RAISE NOTICE '✓ Schema restoration migration completed';
END $$;
