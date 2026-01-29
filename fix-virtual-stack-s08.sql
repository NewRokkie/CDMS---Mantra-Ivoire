-- Fix Virtual Stack S08 Issue
-- Problem: S07 and S09 are now 20ft but virtual stack S08 still appears
-- Solution: Deactivate virtual stack S08 and its pairing since both physical stacks are 20ft

BEGIN;

-- Check current status
SELECT 
  'Current Status' as check_type,
  stack_number,
  container_size,
  is_active,
  is_virtual
FROM stacks 
WHERE yard_id = '2554a779-a14b-45ed-a1e1-684e2fd9b614' 
  AND stack_number IN (7, 8, 9)
ORDER BY stack_number;

-- Check virtual stack pairs
SELECT 
  'Virtual Pairs' as check_type,
  virtual_stack_number,
  is_active,
  stack1_id,
  stack2_id
FROM virtual_stack_pairs 
WHERE yard_id = '2554a779-a14b-45ed-a1e1-684e2fd9b614' 
  AND virtual_stack_number = 8;

-- Deactivate virtual stack S08 since both S07 and S09 are now 20ft
UPDATE stacks 
SET 
  is_active = false,
  updated_at = NOW()
WHERE yard_id = '2554a779-a14b-45ed-a1e1-684e2fd9b614' 
  AND stack_number = 8 
  AND is_virtual = true
  AND is_active = true;

-- Deactivate virtual stack pairs for S08
UPDATE virtual_stack_pairs 
SET 
  is_active = false,
  updated_at = NOW()
WHERE yard_id = '2554a779-a14b-45ed-a1e1-684e2fd9b614' 
  AND virtual_stack_number = 8
  AND is_active = true;

-- Deactivate locations for virtual stack S08
UPDATE locations 
SET 
  is_active = false,
  updated_at = NOW()
WHERE stack_id IN (
  SELECT id FROM stacks 
  WHERE yard_id = 2554a779-a14b-45ed-a1e1-684e2fd9b614 
    AND stack_number = 8 
    AND is_virtual = true
)
AND is_virtual = true
AND is_active = true;

-- Verify the fix
SELECT 
  'After Fix' as check_type,
  stack_number,
  container_size,
  is_active,
  is_virtual
FROM stacks 
WHERE yard_id = '2554a779-a14b-45ed-a1e1-684e2fd9b614' 
  AND stack_number IN (7, 8, 9)
ORDER BY stack_number;

-- Check virtual stack pairs after fix
SELECT 
  'Virtual Pairs After Fix' as check_type,
  virtual_stack_number,
  is_active,
  stack1_id,
  stack2_id
FROM virtual_stack_pairs 
WHERE yard_id = '2554a779-a14b-45ed-a1e1-684e2fd9b614' 
  AND virtual_stack_number = 8;

COMMIT;