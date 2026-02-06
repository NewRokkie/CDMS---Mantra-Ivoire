-- Fix Stack Capacities
-- This script recalculates and updates stack capacities based on row-tier configuration

BEGIN;

-- Show current capacities
SELECT 
  'BEFORE FIX' as status,
  stack_number,
  container_size,
  rows,
  max_tiers,
  capacity as current_capacity,
  row_tier_config,
  CASE 
    WHEN row_tier_config IS NOT NULL AND row_tier_config != 'null' THEN
      -- Calculate from row-tier config
      (
        SELECT SUM((config_item->>'maxTiers')::int)
        FROM jsonb_array_elements(row_tier_config) AS config_item
      )
    ELSE
      -- Uniform calculation
      rows * max_tiers
  END as expected_capacity
FROM stacks 
WHERE yard_id = '2554a779-a14b-45ed-a1e1-684e2fd9b614' 
  AND stack_number IN (1, 3, 5, 7, 9)
  AND is_active = true
ORDER BY stack_number;

-- Update capacities using the existing function
UPDATE stacks 
SET capacity = CASE 
  WHEN row_tier_config IS NOT NULL AND row_tier_config != 'null' THEN
    -- Calculate from row-tier config
    (
      SELECT SUM((config_item->>'maxTiers')::int)
      FROM jsonb_array_elements(row_tier_config) AS config_item
    )
  ELSE
    -- Uniform calculation
    rows * max_tiers
END,
updated_at = NOW()
WHERE yard_id = '2554a779-a14b-45ed-a1e1-684e2fd9b614' 
  AND stack_number IN (1, 3, 5, 7, 9)
  AND is_active = true;

-- Show updated capacities
SELECT 
  'AFTER FIX' as status,
  stack_number,
  container_size,
  rows,
  max_tiers,
  capacity as updated_capacity,
  row_tier_config
FROM stacks 
WHERE yard_id = '2554a779-a14b-45ed-a1e1-684e2fd9b614' 
  AND stack_number IN (1, 3, 5, 7, 9)
  AND is_active = true
ORDER BY stack_number;

COMMIT;