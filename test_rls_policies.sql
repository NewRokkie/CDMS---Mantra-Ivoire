-- Test RLS policies for stack_pairings and locations tables

-- Check current policies on stack_pairings
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'stack_pairings';

-- Check current policies on locations
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'locations';

-- Test if we can insert into stack_pairings
SELECT 'Testing stack_pairings access' as test;

-- Test if we can insert into locations
SELECT 'Testing locations access' as test;