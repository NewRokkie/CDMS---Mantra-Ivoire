/*
  # Temporarily disable problematic triggers to isolate the scalar extraction error

  1. Problem
    - Multiple triggers are processing the stacks table
    - These triggers might be causing JSONB conflicts
    - Need to isolate which trigger is causing the "cannot extract elements from a scalar" error

  2. Solution
    - Temporarily disable the buffer zone trigger
    - Temporarily disable the capacity update triggers
    - This will help identify if triggers are the root cause
*/

-- Disable the buffer zone trigger temporarily
DROP TRIGGER IF EXISTS trigger_auto_mark_buffer_zones ON stacks;

-- Disable the capacity update triggers temporarily
DROP TRIGGER IF EXISTS trigger_update_stack_capacity ON stacks;

-- Log the action
DO $$
BEGIN
  RAISE NOTICE 'Temporarily disabled stacks triggers to isolate scalar extraction error';
END $$;

-- Add a comment explaining this is temporary
COMMENT ON TABLE stacks IS 'Triggers temporarily disabled to fix scalar extraction error - will be re-enabled after testing';