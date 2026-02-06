-- Simple fix for Virtual Stack S08 issue
-- Since S07 and S09 are now 20ft, virtual stack S08 should be deactivated

-- Deactivate virtual stack S08
UPDATE stacks 
SET is_active = false, updated_at = NOW()
WHERE yard_id = '2554a779-a14b-45ed-a1e1-684e2fd9b614' 
  AND stack_number = 8 
  AND is_virtual = true;

-- Deactivate virtual stack pairs for S08
UPDATE virtual_stack_pairs 
SET is_active = false, updated_at = NOW()
WHERE yard_id = '2554a779-a14b-45ed-a1e1-684e2fd9b614' 
  AND virtual_stack_number = 8;

-- Deactivate locations for virtual stack S08
UPDATE locations 
SET is_active = false, updated_at = NOW()
WHERE stack_id IN (
  SELECT id FROM stacks 
  WHERE yard_id = '2554a779-a14b-45ed-a1e1-684e2fd9b614' 
    AND stack_number = 8 
    AND is_virtual = true
)
AND is_virtual = true;

-- Show final status
SELECT 
  stack_number,
  container_size,
  is_active,
  COALESCE(is_virtual, false) as is_virtual
FROM stacks 
WHERE yard_id = '2554a779-a14b-45ed-a1e1-684e2fd9b614' 
  AND stack_number IN (7, 8, 9)
ORDER BY stack_number;