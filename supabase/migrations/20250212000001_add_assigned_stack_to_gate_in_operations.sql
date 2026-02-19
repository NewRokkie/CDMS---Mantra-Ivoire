-- Migration: Add assigned_stack column to gate_in_operations table
-- Author: System
-- Date: 2025-02-12
-- Description: Add assigned_stack column to track the stack number separately from the full location

-- First, check if there's an existing constraint that might conflict
-- Drop any existing check constraint on assigned_stack if it exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'check_stack_format' 
        AND conrelid = 'gate_in_operations'::regclass
    ) THEN
        ALTER TABLE gate_in_operations DROP CONSTRAINT check_stack_format;
    END IF;
END $$;

-- Add assigned_stack column to gate_in_operations table
ALTER TABLE gate_in_operations 
ADD COLUMN IF NOT EXISTS assigned_stack TEXT;

-- Populate assigned_stack from existing assigned_location values
-- Extract stack number from location format like "S04R1H1" -> "S04"
UPDATE gate_in_operations
SET assigned_stack = SUBSTRING(assigned_location FROM '^(S[0-9]+)')
WHERE assigned_location IS NOT NULL 
  AND assigned_stack IS NULL
  AND assigned_location ~ '^S[0-9]+R[0-9]+H[0-9]+';

-- Add comment to document the column
COMMENT ON COLUMN gate_in_operations.assigned_stack IS 'Stack number extracted from assigned_location (e.g., S04 from S04R1H1)';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_gate_in_operations_assigned_stack ON gate_in_operations(assigned_stack);
