-- Persist High Cube choice from Gate In form into gate_in_operations
-- so it can be used when completing pending operations (assign location) and for display/EDI.
ALTER TABLE public.gate_in_operations
  ADD COLUMN IF NOT EXISTS is_high_cube boolean DEFAULT false;

COMMENT ON COLUMN public.gate_in_operations.is_high_cube IS 'True when container is high cube (e.g. Dry 40ft HC). Set from Gate In form switch.';

-- Persist container type ISO code from Gate In dropdown (e.g. 22P1, 45G1) for EDI and display.
ALTER TABLE public.gate_in_operations
  ADD COLUMN IF NOT EXISTS container_iso_code text;

COMMENT ON COLUMN public.gate_in_operations.container_iso_code IS 'ISO type code from Gate In form (e.g. 45G1 for Dry 40ft HC). From container type dropdown.';
