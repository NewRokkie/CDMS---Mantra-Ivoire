-- ============================================================================
-- CLEANUP ORPHANED AUTH USERS
-- ============================================================================
-- This script helps clean up auth users that don't have corresponding 
-- database records, which can happen when initial admin setup fails
-- ============================================================================

-- Step 1: Find orphaned auth users (auth users without database records)
-- Run this first to see what will be cleaned up
SELECT 
  au.id as auth_user_id,
  au.email,
  au.created_at as auth_created_at,
  u.id as db_user_id,
  CASE 
    WHEN u.id IS NULL THEN 'ORPHANED - No database record'
    ELSE 'OK - Has database record'
  END as status
FROM auth.users au
LEFT JOIN public.users u ON au.id = u.auth_user_id
WHERE au.email_confirmed_at IS NOT NULL OR au.email_confirmed_at IS NULL
ORDER BY au.created_at DESC;

-- Step 2: Clean up orphaned auth users (CAREFUL - this deletes data!)
-- Only run this after reviewing the results from Step 1
-- Uncomment the lines below to execute the cleanup

/*
-- Delete orphaned auth users (those without database records)
DELETE FROM auth.users 
WHERE id IN (
  SELECT au.id 
  FROM auth.users au
  LEFT JOIN public.users u ON au.id = u.auth_user_id
  WHERE u.id IS NULL
);

-- Verify cleanup
SELECT COUNT(*) as remaining_auth_users FROM auth.users;
SELECT COUNT(*) as database_users FROM public.users;
*/

-- Step 3: Alternative - Clean up specific email
-- If you know the specific email that's causing issues, use this instead:
-- Replace 'your-email@example.com' with the actual email

/*
DELETE FROM auth.users 
WHERE email = 'your-email@example.com' 
  AND id NOT IN (SELECT auth_user_id FROM public.users WHERE auth_user_id IS NOT NULL);
*/

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check current state
SELECT 'Auth Users' as table_name, COUNT(*) as count FROM auth.users
UNION ALL
SELECT 'Database Users' as table_name, COUNT(*) as count FROM public.users
UNION ALL
SELECT 'Admin Users' as table_name, COUNT(*) as count FROM public.users WHERE role = 'admin';

-- Check for mismatched records
SELECT 
  'Orphaned Auth Users' as issue_type,
  COUNT(*) as count
FROM auth.users au
LEFT JOIN public.users u ON au.id = u.auth_user_id
WHERE u.id IS NULL

UNION ALL

SELECT 
  'Orphaned Database Users' as issue_type,
  COUNT(*) as count
FROM public.users u
LEFT JOIN auth.users au ON u.auth_user_id = au.id
WHERE au.id IS NULL AND u.auth_user_id IS NOT NULL;