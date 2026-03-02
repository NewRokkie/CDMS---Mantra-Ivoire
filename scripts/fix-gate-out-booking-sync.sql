-- Script to fix Gate Out booking synchronization issues
-- This script helps identify and fix discrepancies between gate_out_operations and booking_references

-- 1. Check current state of gate_out_operations and their bookings
SELECT 
  'Current Gate Out Operations State' as check_type,
  go.id as operation_id,
  go.booking_number,
  go.client_code,
  go.status as operation_status,
  go.total_containers,
  go.processed_containers,
  go.remaining_containers,
  br.id as booking_id,
  br.total_containers as booking_total,
  br.remaining_containers as booking_remaining,
  br.status as booking_status
FROM gate_out_operations go
LEFT JOIN booking_references br ON go.release_order_id = br.id
WHERE go.status IN ('pending', 'in_process')
ORDER BY go.created_at DESC;

-- 2. Find operations where processed containers don't match booking
SELECT 
  'Mismatched Processed Containers' as check_type,
  go.id as operation_id,
  go.booking_number,
  go.processed_containers as op_processed,
  go.total_containers as op_total,
  br.total_containers as booking_total,
  br.remaining_containers as booking_remaining,
  (br.total_containers - br.remaining_containers) as booking_processed,
  CASE 
    WHEN go.processed_containers != (br.total_containers - br.remaining_containers) 
    THEN 'MISMATCH'
    ELSE 'OK'
  END as status
FROM gate_out_operations go
JOIN booking_references br ON go.release_order_id = br.id
WHERE go.status IN ('pending', 'in_process', 'completed')
ORDER BY go.created_at DESC;

-- 3. Find containers with 'gate_out' status but no active operation
SELECT 
  'Orphaned Gate Out Containers' as check_type,
  c.id,
  c.number,
  c.status,
  c.location,
  c.client_code,
  c.gate_out_date
FROM containers c
WHERE c.status = 'gate_out'
  AND c.is_deleted = false
  AND NOT EXISTS (
    SELECT 1 
    FROM gate_out_operations go
    WHERE go.processed_container_ids @> ARRAY[c.id]::uuid[]
      AND go.status IN ('pending', 'in_process')
  );

-- 4. Recalculate and fix booking remaining containers based on actual processed containers
-- CAUTION: This will update booking_references table
-- Uncomment the following block to execute the fix

/*
WITH operation_stats AS (
  SELECT 
    release_order_id,
    SUM(processed_containers) as total_processed
  FROM gate_out_operations
  WHERE status IN ('in_process', 'completed')
  GROUP BY release_order_id
)
UPDATE booking_references br
SET 
  remaining_containers = GREATEST(0, br.total_containers - COALESCE(os.total_processed, 0)),
  status = CASE 
    WHEN br.total_containers - COALESCE(os.total_processed, 0) <= 0 THEN 'completed'
    WHEN COALESCE(os.total_processed, 0) > 0 THEN 'in_process'
    ELSE br.status
  END,
  updated_at = NOW()
FROM operation_stats os
WHERE br.id = os.release_order_id
  AND br.remaining_containers != GREATEST(0, br.total_containers - COALESCE(os.total_processed, 0));
*/

-- 5. Check for duplicate processed containers in operations
SELECT 
  'Duplicate Container Processing' as check_type,
  c.id as container_id,
  c.number as container_number,
  COUNT(DISTINCT go.id) as operation_count,
  STRING_AGG(DISTINCT go.id::text, ', ') as operation_ids
FROM containers c
JOIN gate_out_operations go ON go.processed_container_ids @> ARRAY[c.id]::uuid[]
WHERE go.status IN ('pending', 'in_process', 'completed')
GROUP BY c.id, c.number
HAVING COUNT(DISTINCT go.id) > 1;

-- 6. Verify container status consistency
SELECT 
  'Container Status Consistency' as check_type,
  c.id,
  c.number,
  c.status as container_status,
  c.location,
  go.id as operation_id,
  go.status as operation_status,
  CASE 
    WHEN c.status = 'gate_out' AND go.status = 'completed' THEN 'Should be out_depot'
    WHEN c.status = 'out_depot' AND go.status IN ('pending', 'in_process') THEN 'Should be gate_out'
    WHEN c.status = 'in_depot' AND go.processed_container_ids @> ARRAY[c.id]::uuid[] THEN 'Should be gate_out or out_depot'
    ELSE 'OK'
  END as consistency_check
FROM containers c
LEFT JOIN gate_out_operations go ON go.processed_container_ids @> ARRAY[c.id]::uuid[]
WHERE c.is_deleted = false
  AND c.status IN ('in_depot', 'gate_out', 'out_depot')
  AND (
    (c.status = 'gate_out' AND go.status = 'completed') OR
    (c.status = 'out_depot' AND go.status IN ('pending', 'in_process')) OR
    (c.status = 'in_depot' AND go.processed_container_ids @> ARRAY[c.id]::uuid[])
  );

-- 7. Summary statistics
SELECT 
  'Summary Statistics' as check_type,
  COUNT(*) FILTER (WHERE status = 'pending') as pending_operations,
  COUNT(*) FILTER (WHERE status = 'in_process') as in_process_operations,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_operations,
  SUM(total_containers) as total_containers_all_ops,
  SUM(processed_containers) as total_processed_all_ops,
  SUM(remaining_containers) as total_remaining_all_ops
FROM gate_out_operations
WHERE created_at > NOW() - INTERVAL '30 days';

-- 8. Booking references summary
SELECT 
  'Booking References Summary' as check_type,
  COUNT(*) FILTER (WHERE status = 'pending') as pending_bookings,
  COUNT(*) FILTER (WHERE status = 'in_process') as in_process_bookings,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_bookings,
  SUM(total_containers) as total_containers_all_bookings,
  SUM(remaining_containers) as total_remaining_all_bookings
FROM booking_references
WHERE created_at > NOW() - INTERVAL '30 days';
