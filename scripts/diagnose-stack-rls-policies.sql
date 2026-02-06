/*
  # Diagnose Stack RLS Policies

  This script helps diagnose the current state of RLS policies on the stacks table
  to understand what's causing conflicts.
*/

-- Check current RLS policies on stacks table
SELECT 
  '=== CURRENT STACK RLS POLICIES ===' as section,
  '' as policy_name,
  '' as policy_type,
  '' as policy_definition
UNION ALL
SELECT 
  '',
  policyname as policy_name,
  cmd as policy_type,
  pg_get_expr(qual, 'stacks'::regclass) as policy_definition
FROM pg_policies 
WHERE tablename = 'stacks'
ORDER BY policy_name;

-- Check if helper functions exist
SELECT 
  '=== HELPER FUNCTIONS ===' as section,
  '' as function_name,
  '' as function_exists
UNION ALL
SELECT 
  '',
  'is_admin_or_supervisor' as function_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_admin_or_supervisor') 
    THEN 'EXISTS' 
    ELSE 'MISSING' 
  END as function_exists
UNION ALL
SELECT 
  '',
  'is_admin' as function_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_admin') 
    THEN 'EXISTS' 
    ELSE 'MISSING' 
  END as function_exists;

-- Check RLS status on stacks table
SELECT 
  '=== RLS STATUS ===' as section,
  '' as table_name,
  '' as rls_enabled
UNION ALL
SELECT 
  '',
  'stacks' as table_name,
  CASE 
    WHEN relrowsecurity THEN 'ENABLED' 
    ELSE 'DISABLED' 
  END as rls_enabled
FROM pg_class 
WHERE relname = 'stacks';

-- Show problematic policy patterns
SELECT 
  '=== PROBLEMATIC PATTERNS ===' as section,
  '' as policy_name,
  '' as issue
UNION ALL
SELECT 
  '',
  policyname as policy_name,
  CASE 
    WHEN pg_get_expr(qual, 'stacks'::regclass) LIKE '%EXISTS%SELECT%users%' 
    THEN 'DIRECT USER QUERY - MAY CAUSE RLS RECURSION'
    WHEN pg_get_expr(qual, 'stacks'::regclass) LIKE '%is_admin%' 
    THEN 'USES HELPER FUNCTION - GOOD'
    ELSE 'OTHER PATTERN'
  END as issue
FROM pg_policies 
WHERE tablename = 'stacks'
  AND pg_get_expr(qual, 'stacks'::regclass) IS NOT NULL;

-- Show current user context for testing
SELECT 
  '=== CURRENT USER CONTEXT ===' as section,
  '' as context_type,
  '' as context_value
UNION ALL
SELECT 
  '',
  'auth.uid()' as context_type,
  COALESCE(auth.uid()::text, 'NULL') as context_value
UNION ALL
SELECT 
  '',
  'current_user' as context_type,
  current_user as context_value;

-- Test helper functions if they exist
DO $$
BEGIN
  BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_admin_or_supervisor') THEN
      RAISE NOTICE '';
      RAISE NOTICE '=== TESTING HELPER FUNCTIONS ===';
      RAISE NOTICE 'is_admin_or_supervisor(): %', public.is_admin_or_supervisor();
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Error testing is_admin_or_supervisor(): %', SQLERRM;
  END;
  
  BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_admin') THEN
      RAISE NOTICE 'is_admin(): %', public.is_admin();
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Error testing is_admin(): %', SQLERRM;
  END;
END $$;