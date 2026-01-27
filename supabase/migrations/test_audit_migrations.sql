/*
  # Test Audit Log and Full/Empty Status Migrations
  
  This file contains test queries to verify the migrations were applied correctly.
  Run these queries in Supabase SQL Editor after applying migrations.
*/

-- ============================================
-- 1. Verify Columns Exist
-- ============================================

-- Check audit_logs column in containers
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'containers' 
  AND column_name IN ('audit_logs', 'full_empty');

-- Check full_empty column in gate_in_operations
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'gate_in_operations' 
  AND column_name = 'full_empty';

-- Check audit fields in gate operations
SELECT 
  table_name,
  column_name, 
  data_type
FROM information_schema.columns 
WHERE table_name IN ('gate_in_operations', 'gate_out_operations')
  AND column_name IN ('updated_at', 'updated_by')
ORDER BY table_name, column_name;

-- ============================================
-- 2. Verify Indexes Exist
-- ============================================

SELECT 
  indexname, 
  tablename, 
  indexdef
FROM pg_indexes 
WHERE tablename IN ('containers', 'gate_in_operations')
  AND (indexname LIKE '%audit%' OR indexname LIKE '%full_empty%');

-- ============================================
-- 3. Verify Functions Exist
-- ============================================

SELECT 
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines 
WHERE routine_name IN (
  'get_container_audit_logs',
  'search_container_audit_logs',
  'get_recent_audit_activity',
  'add_container_audit_log',
  'update_updated_at_column'
)
ORDER BY routine_name;

-- ============================================
-- 4. Verify Triggers Exist
-- ============================================

SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name IN (
  'container_audit_log_trigger',
  'update_gate_in_operations_updated_at',
  'update_gate_out_operations_updated_at'
);

-- ============================================
-- 5. Test Data Queries
-- ============================================

-- Check if existing containers have full_empty values
SELECT 
  full_empty,
  COUNT(*) as count
FROM containers
GROUP BY full_empty;

-- Check if existing gate_in_operations have full_empty values
SELECT 
  full_empty,
  COUNT(*) as count
FROM gate_in_operations
GROUP BY full_empty;

-- Sample audit logs from containers (if any exist)
SELECT 
  id,
  number,
  jsonb_array_length(audit_logs) as audit_log_count,
  audit_logs
FROM containers
WHERE jsonb_array_length(audit_logs) > 0
LIMIT 5;

-- ============================================
-- 6. Test Audit Log Trigger
-- ============================================

-- This will test if the audit log trigger works
-- (Only run if you have at least one container)
DO $$
DECLARE
  test_container_id uuid;
  audit_count_before int;
  audit_count_after int;
BEGIN
  -- Get a test container
  SELECT id INTO test_container_id 
  FROM containers 
  LIMIT 1;
  
  IF test_container_id IS NOT NULL THEN
    -- Count audit logs before
    SELECT jsonb_array_length(audit_logs) INTO audit_count_before
    FROM containers
    WHERE id = test_container_id;
    
    -- Update the container to trigger audit log
    UPDATE containers 
    SET location = COALESCE(location, 'Test Location')
    WHERE id = test_container_id;
    
    -- Count audit logs after
    SELECT jsonb_array_length(audit_logs) INTO audit_count_after
    FROM containers
    WHERE id = test_container_id;
    
    -- Report results
    RAISE NOTICE 'Audit logs before: %, after: %', audit_count_before, audit_count_after;
    
    IF audit_count_after > audit_count_before THEN
      RAISE NOTICE '✅ Audit log trigger is working!';
    ELSE
      RAISE NOTICE '❌ Audit log trigger may not be working';
    END IF;
  ELSE
    RAISE NOTICE 'No containers found to test';
  END IF;
END $$;

-- ============================================
-- 7. Test Helper Functions
-- ============================================

-- Test get_recent_audit_activity (get last 10 entries)
SELECT * FROM get_recent_audit_activity(10);

-- Test search_container_audit_logs (search for 'updated' actions)
SELECT * FROM search_container_audit_logs('updated', NULL, NULL, NULL) LIMIT 10;

-- Test get_container_audit_logs for a specific container
-- (Replace with actual container ID)
-- SELECT * FROM get_container_audit_logs('your-container-uuid-here');

-- ============================================
-- 8. Summary Report
-- ============================================

SELECT 
  '✅ Migration Verification Complete' as status,
  (SELECT COUNT(*) FROM containers WHERE audit_logs IS NOT NULL) as containers_with_audit_logs,
  (SELECT COUNT(*) FROM containers WHERE full_empty IS NOT NULL) as containers_with_full_empty,
  (SELECT COUNT(*) FROM gate_in_operations WHERE full_empty IS NOT NULL) as gate_ins_with_full_empty,
  (SELECT COUNT(*) FROM information_schema.routines WHERE routine_name LIKE '%audit%') as audit_functions_created;
