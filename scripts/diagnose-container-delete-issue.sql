-- ============================================
-- DIAGNOSTIC: Container Deletion Issue
-- ============================================
-- Run this script to diagnose why container deletion is failing
-- This will show you the current state of policies and constraints
-- ============================================

-- Check 1: RLS Policies on containers table
SELECT 
  '=== RLS POLICIES ON CONTAINERS TABLE ===' AS check_name;

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'containers'
ORDER BY cmd;

-- Check 2: Foreign Key Constraints referencing containers
SELECT 
  '=== FOREIGN KEY CONSTRAINTS REFERENCING CONTAINERS ===' AS check_name;

SELECT
  tc.table_name AS "Table",
  kcu.column_name AS "Column",
  ccu.table_name AS "References Table",
  ccu.column_name AS "References Column",
  rc.delete_rule AS "On Delete Action"
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND ccu.table_name = 'containers'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- Check 3: Sample container with gate_in_operations
SELECT 
  '=== SAMPLE CONTAINER WITH GATE-IN OPERATIONS ===' AS check_name;

SELECT 
  c.id AS container_id,
  c.number AS container_number,
  c.status,
  COUNT(gio.id) AS gate_in_operations_count
FROM containers c
LEFT JOIN gate_in_operations gio ON gio.container_id = c.id
GROUP BY c.id, c.number, c.status
HAVING COUNT(gio.id) > 0
LIMIT 5;

-- Check 4: Your user role
SELECT 
  '=== YOUR USER ROLE ===' AS check_name;

SELECT 
  id,
  name,
  email,
  role,
  active
FROM users
WHERE auth_user_id = auth.uid();

-- Summary
SELECT 
  '=== DIAGNOSTIC SUMMARY ===' AS check_name;

DO $$
DECLARE
  has_delete_policy BOOLEAN;
  fk_count INTEGER;
  fk_with_no_action INTEGER;
BEGIN
  -- Check for DELETE policy
  SELECT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'containers' 
    AND cmd = 'DELETE'
  ) INTO has_delete_policy;
  
  -- Count foreign keys without proper delete action
  SELECT COUNT(*) INTO fk_count
  FROM information_schema.table_constraints AS tc
  JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND ccu.table_name = 'containers'
    AND tc.table_schema = 'public';
    
  SELECT COUNT(*) INTO fk_with_no_action
  FROM information_schema.table_constraints AS tc
  JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
  JOIN information_schema.referential_constraints AS rc
    ON rc.constraint_name = tc.constraint_name
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND ccu.table_name = 'containers'
    AND tc.table_schema = 'public'
    AND rc.delete_rule = 'NO ACTION';
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'DIAGNOSTIC RESULTS';
  RAISE NOTICE '========================================';
  
  IF has_delete_policy THEN
    RAISE NOTICE '✅ DELETE policy exists on containers table';
  ELSE
    RAISE NOTICE '❌ DELETE policy is MISSING on containers table';
  END IF;
  
  RAISE NOTICE 'Total foreign keys referencing containers: %', fk_count;
  
  IF fk_with_no_action > 0 THEN
    RAISE NOTICE '❌ % foreign key(s) have NO ACTION on delete (will block deletion)', fk_with_no_action;
  ELSE
    RAISE NOTICE '✅ All foreign keys have proper delete actions';
  END IF;
  
  RAISE NOTICE '';
  
  IF NOT has_delete_policy OR fk_with_no_action > 0 THEN
    RAISE NOTICE '🔧 ACTION REQUIRED: Run fix-container-delete-complete.sql';
  ELSE
    RAISE NOTICE '✅ Configuration looks good! If deletion still fails, check user permissions.';
  END IF;
  
  RAISE NOTICE '========================================';
END $$;
