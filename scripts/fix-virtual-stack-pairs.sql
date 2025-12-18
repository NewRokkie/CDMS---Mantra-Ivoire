-- Fix duplicate virtual stack pairs caused by inconsistent stack ID ordering
-- This script identifies and removes duplicate virtual stack pairs where the same
-- logical pairing exists with different stack ID orderings

-- First, let's identify potential duplicates
-- Two pairs are considered duplicates if they have the same yard_id and the same
-- set of stack IDs (regardless of order)

WITH potential_duplicates AS (
  SELECT 
    yard_id,
    LEAST(stack1_id::text, stack2_id::text) as min_stack_id,
    GREATEST(stack1_id::text, stack2_id::text) as max_stack_id,
    COUNT(*) as pair_count,
    ARRAY_AGG(id ORDER BY created_at) as pair_ids,
    ARRAY_AGG(created_at ORDER BY created_at) as created_dates
  FROM virtual_stack_pairs 
  WHERE is_active = true
  GROUP BY yard_id, LEAST(stack1_id::text, stack2_id::text), GREATEST(stack1_id::text, stack2_id::text)
  HAVING COUNT(*) > 1
)
SELECT 
  yard_id,
  min_stack_id,
  max_stack_id,
  pair_count,
  pair_ids,
  created_dates
FROM potential_duplicates;

-- To fix the duplicates, we would:
-- 1. Keep the oldest record (first in created_at order)
-- 2. Update any virtual locations that reference the duplicate pairs to reference the kept pair
-- 3. Deactivate the duplicate pairs

-- Uncomment the following sections to actually perform the cleanup:

-- Step 1: Update virtual locations to reference the kept pair
WITH duplicates_to_fix AS (
  SELECT 
    yard_id,
    LEAST(stack1_id::text, stack2_id::text) as min_stack_id,
    GREATEST(stack1_id::text, stack2_id::text) as max_stack_id,
    (ARRAY_AGG(id ORDER BY created_at))[1] as keep_id
  FROM virtual_stack_pairs 
  WHERE is_active = true
  GROUP BY yard_id, LEAST(stack1_id::text, stack2_id::text), GREATEST(stack1_id::text, stack2_id::text)
  HAVING COUNT(*) > 1
),
pairs_to_remove AS (
  SELECT 
    vsp.id as remove_id,
    dtf.keep_id
  FROM virtual_stack_pairs vsp
  JOIN duplicates_to_fix dtf ON (
    vsp.yard_id = dtf.yard_id 
    AND LEAST(vsp.stack1_id::text, vsp.stack2_id::text) = dtf.min_stack_id
    AND GREATEST(vsp.stack1_id::text, vsp.stack2_id::text) = dtf.max_stack_id
    AND vsp.id != dtf.keep_id
    AND vsp.is_active = true
  )
)
UPDATE locations 
SET virtual_stack_pair_id = ptr.keep_id
FROM pairs_to_remove ptr
WHERE virtual_stack_pair_id = ptr.remove_id;

-- Step 2: Deactivate duplicate pairs (keep only the oldest one)
WITH duplicates_to_fix AS (
  SELECT 
    yard_id,
    LEAST(stack1_id::text, stack2_id::text) as min_stack_id,
    GREATEST(stack1_id::text, stack2_id::text) as max_stack_id,
    (ARRAY_AGG(id ORDER BY created_at))[1] as keep_id
  FROM virtual_stack_pairs 
  WHERE is_active = true
  GROUP BY yard_id, LEAST(stack1_id::text, stack2_id::text), GREATEST(stack1_id::text, stack2_id::text)
  HAVING COUNT(*) > 1
)
UPDATE virtual_stack_pairs 
SET is_active = false, updated_at = now()
FROM duplicates_to_fix dtf
WHERE virtual_stack_pairs.yard_id = dtf.yard_id 
  AND LEAST(virtual_stack_pairs.stack1_id::text, virtual_stack_pairs.stack2_id::text) = dtf.min_stack_id
  AND GREATEST(virtual_stack_pairs.stack1_id::text, virtual_stack_pairs.stack2_id::text) = dtf.max_stack_id
  AND virtual_stack_pairs.id != dtf.keep_id
  AND virtual_stack_pairs.is_active = true;