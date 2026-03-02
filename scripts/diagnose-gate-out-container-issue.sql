-- Diagnostic script for Gate Out container not found issue
-- This script helps identify why a container in the yard is not being found during Gate Out

-- 1. Check if the container exists in the database
SELECT 
  'Container Existence Check' as check_type,
  id,
  number,
  status,
  location,
  client_code,
  yard_id,
  is_deleted,
  created_at,
  gate_in_date,
  gate_out_date
FROM containers
WHERE location = 'S04R1H1'
ORDER BY created_at DESC;

-- 2. Check all containers with 'in_depot' status at location S04R1H1
SELECT 
  'In Depot Status Check' as check_type,
  id,
  number,
  status,
  location,
  client_code,
  size,
  is_deleted
FROM containers
WHERE location = 'S04R1H1'
  AND status = 'in_depot'
  AND is_deleted = false;

-- 3. Check all 40ft containers in the yard
SELECT 
  'All 40ft Containers' as check_type,
  id,
  number,
  status,
  location,
  client_code,
  size,
  is_deleted
FROM containers
WHERE size = '40ft'
  AND is_deleted = false
  AND status IN ('in_depot', 'gate_in')
ORDER BY location;

-- 4. Check pending Gate Out operations
SELECT 
  'Pending Gate Out Operations' as check_type,
  id,
  booking_number,
  client_code,
  client_name,
  booking_type,
  total_containers,
  processed_containers,
  remaining_containers,
  status,
  vehicle_number,
  created_at
FROM gate_out_operations
WHERE status = 'pending'
ORDER BY created_at DESC;

-- 5. Check booking references for 40ft containers
SELECT 
  'Booking References for 40ft' as check_type,
  id,
  booking_number,
  client_code,
  client_name,
  booking_type,
  container_size,
  total_containers,
  remaining_containers,
  status
FROM booking_references
WHERE container_size = '40ft'
  AND status IN ('pending', 'in_process')
ORDER BY created_at DESC;

-- 6. Check if there are any soft-deleted containers at S04R1H1
SELECT 
  'Soft Deleted Containers' as check_type,
  id,
  number,
  status,
  location,
  client_code,
  is_deleted,
  deleted_at,
  deleted_by
FROM containers
WHERE location = 'S04R1H1'
  AND is_deleted = true;

-- 7. Check container-client relationship
SELECT 
  'Container-Client Relationship' as check_type,
  c.id,
  c.number,
  c.client_code,
  c.location,
  c.status,
  cl.name as client_name,
  cl.code as client_code_from_clients_table
FROM containers c
LEFT JOIN clients cl ON c.client_id = cl.id
WHERE c.location = 'S04R1H1'
  AND c.is_deleted = false;
