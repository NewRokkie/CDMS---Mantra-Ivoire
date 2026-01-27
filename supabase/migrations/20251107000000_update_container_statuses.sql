-- Migration: Update container status values
-- Date: 2025-11-07
-- Description: Add new container status values for gate in/out process tracking

-- Update container status to support new flow:
-- 01 - gate_in: Container in Gate In process (pending location assignment)
-- 02 - in_depot: Container assigned to location in depot
-- 03 - gate_out: Container in Gate Out process (pending operation completion)
-- 04 - out_depot: Container has left depot
-- Additional: maintenance, cleaning

-- Note: The status column is text type, so no constraint changes needed
-- This migration documents the new status values

-- Update any existing containers with old 'in_service' status to 'in_depot'
UPDATE containers 
SET status = 'in_depot' 
WHERE status = 'in_service';

-- Add comment to document status values
COMMENT ON COLUMN containers.status IS 'Container status: gate_in (01), in_depot (02), gate_out (03), out_depot (04), maintenance, cleaning';
