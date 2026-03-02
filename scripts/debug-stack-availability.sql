-- ============================================================================
-- Debug Stack Availability Issues
-- ============================================================================
-- This script helps diagnose why occupied positions are showing as available
-- in the Stack Selection Modal
-- ============================================================================

-- Step 1: Check containers in S04R1H1-H3
SELECT 
  'CONTAINERS IN S04R1' as check_type,
  c.number as container_number,
  c.location as container_location,
  c.status as container_status,
  c.size as container_size,
  c.client_code,
  c.created_at
FROM containers c
WHERE c.location ~ 'S0*4[-]?R1[-]?H[1-3]'
  AND c.is_deleted = false
ORDER BY c.location;

-- Step 2: Check all containers in stack S04
SELECT 
  'ALL CONTAINERS IN S04' as check_type,
  c.number as container_number,
  c.location as container_location,
  c.status as container_status,
  c.size as container_size,
  c.client_code
FROM containers c
WHERE c.location ~ 'S0*4[-]?R\d+[-]?H\d+'
  AND c.is_deleted = false
ORDER BY c.location;

-- Step 3: Check gate_in_operations for these containers
SELECT 
  'GATE_IN_OPERATIONS' as check_type,
  gio.container_number,
  gio.assigned_location,
  gio.assigned_stack,
  gio.status as gate_in_status,
  c.location as container_location,
  c.status as container_status
FROM gate_in_operations gio
LEFT JOIN containers c ON gio.container_id = c.id
WHERE gio.assigned_location ~ 'S0*4[-]?R1[-]?H[1-3]'
   OR c.location ~ 'S0*4[-]?R1[-]?H[1-3]'
ORDER BY gio.assigned_location;

-- Step 4: Check for location format inconsistencies
SELECT 
  'LOCATION FORMAT CHECK' as check_type,
  c.number as container_number,
  c.location,
  CASE 
    WHEN c.location ~ 'S\d+-R\d+-H\d+' THEN 'With dashes'
    WHEN c.location ~ 'S\d+R\d+H\d+' THEN 'Without dashes'
    ELSE 'Unknown format'
  END as format_type,
  c.status
FROM containers c
WHERE c.location IS NOT NULL
  AND c.is_deleted = false
  AND c.status IN ('in_depot', 'gate_in')
GROUP BY c.number, c.location, c.status
ORDER BY format_type, c.location
LIMIT 20;

-- Step 5: Count containers by status
SELECT 
  'CONTAINER STATUS SUMMARY' as check_type,
  c.status,
  COUNT(*) as count,
  COUNT(CASE WHEN c.location IS NOT NULL THEN 1 END) as with_location
FROM containers c
WHERE c.is_deleted = false
GROUP BY c.status
ORDER BY count DESC;

-- Step 6: Check for duplicate locations
SELECT 
  'DUPLICATE LOCATIONS' as check_type,
  c.location,
  COUNT(*) as container_count,
  STRING_AGG(c.number, ', ') as container_numbers,
  STRING_AGG(c.status::text, ', ') as statuses
FROM containers c
WHERE c.location IS NOT NULL
  AND c.is_deleted = false
  AND c.status IN ('in_depot', 'gate_in')
GROUP BY c.location
HAVING COUNT(*) > 1
ORDER BY container_count DESC;

-- Step 7: Verify S04 is a virtual stack
SELECT 
  'STACK S04 CONFIGURATION' as check_type,
  s.id,
  s.stack_number,
  s.is_virtual,
  s.container_size,
  s.rows,
  s.max_tiers,
  s.capacity,
  sec.name as section_name
FROM stacks s
LEFT JOIN sections sec ON s.section_id = sec.id
WHERE s.stack_number = 4;
