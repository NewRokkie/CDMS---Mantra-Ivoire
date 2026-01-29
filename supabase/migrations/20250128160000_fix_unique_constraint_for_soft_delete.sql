/*
  # Fix Unique Constraint for Soft Delete Stacks

  Problem:
  - The unique constraint "unique_yard_stack" on (yard_id, stack_number) prevents
    recreating stacks that were soft-deleted because the constraint applies to
    all records, including inactive ones.
  
  Solution:
  - Drop the existing unique constraint
  - Create a partial unique index that only applies to active stacks
  - This allows soft-deleted stacks to exist while preventing duplicate active stacks

  This enables:
  - Soft-deleting stacks (is_active = false)
  - Recreating stacks with the same yard_id + stack_number
  - Maintaining uniqueness for active stacks only
*/

-- ============================================================================
-- STEP 1: Drop the existing unique constraint
-- ============================================================================

ALTER TABLE stacks DROP CONSTRAINT IF EXISTS unique_yard_stack;

-- ============================================================================
-- STEP 2: Create partial unique index for active stacks only
-- ============================================================================

CREATE UNIQUE INDEX unique_active_yard_stack 
ON stacks (yard_id, stack_number) 
WHERE is_active = true;

-- ============================================================================
-- STEP 3: Add helpful comment
-- ============================================================================

COMMENT ON INDEX unique_active_yard_stack IS 
  'Ensures uniqueness of yard_id + stack_number only for active stacks, allowing soft-deleted stacks to be recreated';

-- ============================================================================
-- STEP 4: Success message
-- ============================================================================

DO $
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Fixed Unique Constraint for Soft Delete!';
  RAISE NOTICE '';
  RAISE NOTICE '🔧 Changes:';
  RAISE NOTICE '  • Dropped constraint: unique_yard_stack';
  RAISE NOTICE '  • Added partial index: unique_active_yard_stack (active stacks only)';
  RAISE NOTICE '';
  RAISE NOTICE '✨ Now you can:';
  RAISE NOTICE '  • Soft delete stacks (is_active = false)';
  RAISE NOTICE '  • Recreate stacks with same yard_id + stack_number';
  RAISE NOTICE '  • Maintain uniqueness for active stacks';
  RAISE NOTICE '';
END $;