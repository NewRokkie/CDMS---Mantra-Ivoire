-- ============================================================================
-- Test Virtual Stack Detection
-- ============================================================================
-- This script verifies that containers in virtual stacks (even numbers like S04)
-- are properly detected and counted for availability checking
-- ============================================================================

-- Step 1: Show all containers in virtual stacks (even stack numbers)
SELECT 
  'CONTAINERS IN VIRTUAL STACKS' as check_type,
  c.number as container_number,
  c.location,
  SUBSTRING(c.location FROM 'S0*(\d+)') as stack_number,
  c.status,
  c.size,
  c.client_code,
  CASE 
    WHEN SUBSTRING(c.location FROM 'S0*(\d+)')::integer % 2 = 0 THEN 'Virtual (Even)'
    ELSE 'Physical (Odd)'
  END as stack_type
FROM containers c
WHERE c.location ~ 'S0*\d+[-]?R\d+[-]?H\d+'
  AND c.is_deleted = false
  AND c.status IN ('in_depot', 'gate_in')
  AND SUBSTRING(c.location FROM 'S0*(\d+)')::integer % 2 = 0
ORDER BY SUBSTRING(c.location FROM 'S0*(\d+)')::integer, c.location;

-- Step 2: Count containers by stack type
SELECT 
  'CONTAINER COUNT BY STACK TYPE' as check_type,
  CASE 
    WHEN SUBSTRING(c.location FROM 'S0*(\d+)')::integer % 2 = 0 THEN 'Virtual (Even)'
    ELSE 'Physical (Odd)'
  END as stack_type,
  COUNT(*) as container_count,
  COUNT(DISTINCT SUBSTRING(c.location FROM 'S0*(\d+)')) as unique_stacks
FROM containers c
WHERE c.location ~ 'S0*\d+[-]?R\d+[-]?H\d+'
  AND c.is_deleted = false
  AND c.status IN ('in_depot', 'gate_in')
GROUP BY stack_type
ORDER BY stack_type;

-- Step 3: Show S04 specifically
SELECT 
  'STACK S04 DETAILS' as check_type,
  c.number as container_number,
  c.location,
  c.status,
  c.size,
  c.client_code,
  c.created_at
FROM containers c
WHERE c.location ~ 'S0*4[-]?R\d+[-]?H\d+'
  AND c.is_deleted = false
ORDER BY c.location;

-- Step 4: Verify stack S04 configuration
SELECT 
  'STACK S04 CONFIGURATION' as check_type,
  s.id,
  s.stack_number,
  s.is_virtual,
  s.container_size,
  s.rows,
  s.max_tiers,
  s.capacity,
  sec.name as section_name,
  CASE 
    WHEN s.stack_number % 2 = 0 THEN 'Virtual (Even)'
    ELSE 'Physical (Odd)'
  END as stack_type
FROM stacks s
LEFT JOIN sections sec ON s.section_id = sec.id
WHERE s.stack_number = 4;

-- Step 5: Check all virtual stacks and their occupancy
WITH virtual_stacks AS (
  SELECT 
    s.id,
    s.stack_number,
    s.capacity,
    sec.name as section_name
  FROM stacks s
  LEFT JOIN sections sec ON s.section_id = sec.id
  WHERE s.is_virtual = true
    AND s.stack_number % 2 = 0
),
container_counts AS (
  SELECT 
    SUBSTRING(c.location FROM 'S0*(\d+)')::integer as stack_number,
    COUNT(*) as container_count
  FROM containers c
  WHERE c.location ~ 'S0*\d+[-]?R\d+[-]?H\d+'
    AND c.is_deleted = false
    AND c.status IN ('in_depot', 'gate_in')
  GROUP BY SUBSTRING(c.location FROM 'S0*(\d+)')::integer
)
SELECT 
  'VIRTUAL STACK OCCUPANCY' as check_type,
  vs.stack_number,
  vs.section_name,
  vs.capacity,
  COALESCE(cc.container_count, 0) as current_occupancy,
  vs.capacity - COALESCE(cc.container_count, 0) as available_slots,
  ROUND((COALESCE(cc.container_count, 0)::numeric / vs.capacity * 100), 1) as occupancy_percent
FROM virtual_stacks vs
LEFT JOIN container_counts cc ON vs.stack_number = cc.stack_number
ORDER BY vs.stack_number;

-- Step 6: Summary
SELECT 
  'SUMMARY' as info,
  COUNT(DISTINCT CASE WHEN s.is_virtual = true THEN s.id END) as total_virtual_stacks,
  COUNT(DISTINCT CASE WHEN s.is_virtual = false THEN s.id END) as total_physical_stacks,
  COUNT(DISTINCT CASE 
    WHEN c.location ~ 'S0*\d+[-]?R\d+[-]?H\d+' 
    AND SUBSTRING(c.location FROM 'S0*(\d+)')::integer % 2 = 0 
    THEN c.id 
  END) as containers_in_virtual_stacks,
  COUNT(DISTINCT CASE 
    WHEN c.location ~ 'S0*\d+[-]?R\d+[-]?H\d+' 
    AND SUBSTRING(c.location FROM 'S0*(\d+)')::integer % 2 = 1 
    THEN c.id 
  END) as containers_in_physical_stacks
FROM stacks s
CROSS JOIN containers c
WHERE c.is_deleted = false
  AND c.status IN ('in_depot', 'gate_in');
