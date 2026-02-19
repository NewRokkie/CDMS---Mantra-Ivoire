-- ============================================================================
-- Test Container Location Sync with gate_in_operations
-- ============================================================================
-- This script tests that updating a container's location also updates the
-- corresponding gate_in_operations record.
-- ============================================================================

-- Step 1: Show current state of a test container
SELECT 
  'BEFORE UPDATE' as stage,
  c.number as container_number,
  c.location as container_location,
  gio.assigned_location as gate_in_location,
  gio.assigned_stack as gate_in_stack
FROM containers c
LEFT JOIN gate_in_operations gio ON gio.container_id = c.id
WHERE c.number IN ('TEMU8897580', 'MSKU1212324', 'ONEU1388601')
ORDER BY c.number;

-- Step 2: Check for any mismatches between containers and gate_in_operations
SELECT 
  'MISMATCHES' as check_type,
  COUNT(*) as mismatch_count,
  COUNT(DISTINCT c.id) as affected_containers
FROM containers c
LEFT JOIN gate_in_operations gio ON gio.container_id = c.id
WHERE c.location IS NOT NULL
  AND c.status = 'in_depot'
  AND (
    gio.assigned_location IS NULL 
    OR gio.assigned_location != c.location
  );

-- Step 3: Show detailed mismatches
SELECT 
  c.number as container_number,
  c.location as container_location,
  c.status as container_status,
  gio.assigned_location as gate_in_location,
  gio.assigned_stack as gate_in_stack,
  gio.status as gate_in_status,
  gio.created_at as gate_in_created
FROM containers c
LEFT JOIN gate_in_operations gio ON gio.container_id = c.id
WHERE c.location IS NOT NULL
  AND c.status = 'in_depot'
  AND (
    gio.assigned_location IS NULL 
    OR gio.assigned_location != c.location
  )
ORDER BY c.number
LIMIT 20;

-- Step 4: Show statistics
SELECT 
  'STATISTICS' as info,
  COUNT(DISTINCT c.id) as total_containers_in_depot,
  COUNT(DISTINCT CASE WHEN gio.id IS NOT NULL THEN c.id END) as containers_with_gate_in,
  COUNT(DISTINCT CASE WHEN c.location = gio.assigned_location THEN c.id END) as locations_in_sync,
  COUNT(DISTINCT CASE WHEN c.location != gio.assigned_location OR gio.assigned_location IS NULL THEN c.id END) as locations_out_of_sync
FROM containers c
LEFT JOIN gate_in_operations gio ON gio.container_id = c.id
WHERE c.status = 'in_depot'
  AND c.location IS NOT NULL;
