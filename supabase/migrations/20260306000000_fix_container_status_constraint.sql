-- ============================================
-- Migration: Fix Container Status Constraint
-- Date: 2026-03-06
-- Description: Add 'out_depot' back to valid container statuses
-- ============================================

-- Drop existing constraint
ALTER TABLE public.containers DROP CONSTRAINT IF EXISTS check_container_status;

-- Add constraint with 'out_depot' included
ALTER TABLE public.containers 
    ADD CONSTRAINT check_container_status 
    CHECK (status IN (
        'gate_in',      -- Container at gate, being processed for entry
        'in_depot',     -- Container stored in depot
        'in_buffer',    -- Container in buffer zone
        'gate_out',     -- Container at gate, being processed for exit (pending)
        'out_depot',    -- Container has left the depot (completed)
        'damaged',      -- Container is damaged
        'maintenance',  -- Container under maintenance
        'out_of_service' -- Container out of service
    ));

-- Add comment
COMMENT ON CONSTRAINT check_container_status ON public.containers IS 
'Valid container statuses: gate_in (at gate entry), in_depot (stored), in_buffer (buffer zone), gate_out (at gate exit pending), out_depot (left depot), damaged, maintenance, out_of_service';
