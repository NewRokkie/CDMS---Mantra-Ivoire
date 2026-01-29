-- Fix Virtual Stack Capacities
-- Problem: Virtual stacks (S04) show 0 capacity while physical stacks (S03, S05) have capacity 22

-- 1. Check current capacities
SELECT 
    stack_number,
    container_size,
    capacity,
    rows,
    max_tiers,
    is_virtual,
    is_active,
    CASE 
        WHEN row_tier_config IS NOT NULL THEN 'Row-Tier Config'
        ELSE 'Uniform: ' || rows || ' x ' || max_tiers || ' = ' || (rows * max_tiers)
    END as expected_calculation
FROM stacks 
WHERE yard_id = '2554a779-a14b-45ed-a1e1-684e2fd9b614'
    AND stack_number IN (3, 4, 5)
    AND is_active = true
ORDER BY stack_number;

-- 2. Fix physical stacks capacities if they are 0
UPDATE stacks 
SET capacity = rows * max_tiers,
    updated_at = NOW()
WHERE yard_id = '2554a779-a14b-45ed-a1e1-684e2fd9b614'
    AND stack_number IN (3, 5)
    AND is_active = true
    AND capacity = 0
    AND rows > 0 
    AND max_tiers > 0;

-- 3. Fix virtual stack capacity to match physical stacks
-- Virtual stack S04 should have the same capacity as S03 and S05
UPDATE stacks 
SET capacity = (
    SELECT DISTINCT capacity 
    FROM stacks s2 
    WHERE s2.yard_id = '2554a779-a14b-45ed-a1e1-684e2fd9b614'
        AND s2.stack_number = 3
        AND s2.is_active = true
        AND s2.capacity > 0
    LIMIT 1
),
updated_at = NOW()
WHERE yard_id = '2554a779-a14b-45ed-a1e1-684e2fd9b614'
    AND stack_number = 4
    AND is_virtual = true
    AND is_active = true
    AND (capacity = 0 OR capacity IS NULL);

-- 4. Verify the fix
SELECT 
    stack_number,
    container_size,
    capacity,
    rows,
    max_tiers,
    is_virtual,
    is_active,
    'Fixed: ' || capacity as status
FROM stacks 
WHERE yard_id = '2554a779-a14b-45ed-a1e1-684e2fd9b614'
    AND stack_number IN (3, 4, 5)
    AND is_active = true
ORDER BY stack_number;

-- 5. Also check and fix any other virtual stacks that might have the same issue
UPDATE stacks 
SET capacity = CASE 
    WHEN rows > 0 AND max_tiers > 0 THEN rows * max_tiers
    ELSE 22  -- Default fallback for 40ft stacks
END,
updated_at = NOW()
WHERE yard_id = '2554a779-a14b-45ed-a1e1-684e2fd9b614'
    AND is_virtual = true
    AND is_active = true
    AND (capacity = 0 OR capacity IS NULL);

-- 6. Final verification of all virtual stacks
SELECT 
    stack_number,
    container_size,
    capacity,
    rows,
    max_tiers,
    is_virtual,
    'Virtual Stack - Capacity: ' || capacity as status
FROM stacks 
WHERE yard_id = '2554a779-a14b-45ed-a1e1-684e2fd9b614'
    AND is_virtual = true
    AND is_active = true
ORDER BY stack_number;