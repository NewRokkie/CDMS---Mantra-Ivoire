-- Debug script to examine existing virtual stack pairs
-- Run this in Supabase SQL Editor to see what pairs exist

-- Show all active virtual stack pairs
SELECT 
  id,
  yard_id,
  stack1_id,
  stack2_id,
  virtual_stack_number,
  created_at,
  -- Show normalized ordering for comparison
  LEAST(stack1_id::text, stack2_id::text) as normalized_stack1,
  GREATEST(stack1_id::text, stack2_id::text) as normalized_stack2
FROM virtual_stack_pairs 
WHERE is_active = true
ORDER BY yard_id, virtual_stack_number;

-- Check for potential duplicates (same logical pairing with different orderings)
WITH normalized_pairs AS (
  SELECT 
    id,
    yard_id,
    stack1_id,
    stack2_id,
    virtual_stack_number,
    LEAST(stack1_id::text, stack2_id::text) as min_stack,
    GREATEST(stack1_id::text, stack2_id::text) as max_stack,
    created_at
  FROM virtual_stack_pairs 
  WHERE is_active = true
)
SELECT 
  yard_id,
  min_stack,
  max_stack,
  COUNT(*) as pair_count,
  STRING_AGG(id::text, ', ' ORDER BY created_at) as pair_ids,
  STRING_AGG(virtual_stack_number::text, ', ' ORDER BY created_at) as virtual_numbers
FROM normalized_pairs
GROUP BY yard_id, min_stack, max_stack
HAVING COUNT(*) > 1
ORDER BY yard_id, min_stack, max_stack;

-- Show pairs for the specific yard from the logs
SELECT 
  id,
  stack1_id,
  stack2_id,
  virtual_stack_number,
  created_at,
  LEAST(stack1_id::text, stack2_id::text) as normalized_stack1,
  GREATEST(stack1_id::text, stack2_id::text) as normalized_stack2
FROM virtual_stack_pairs 
WHERE yard_id = '2554a779-a14b-45ed-a1e1-684e2fd9b614'
  AND is_active = true
ORDER BY created_at;