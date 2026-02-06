-- Debug query to check admin users in the database
-- Run this in Supabase SQL Editor to see what's happening

-- 1. Check all users in the database
SELECT 
  id,
  name,
  email,
  role,
  active,
  is_deleted,
  created_at
FROM public.users
ORDER BY created_at DESC;

-- 2. Check specifically for admin users
SELECT 
  COUNT(*) as total_admin_count,
  COUNT(CASE WHEN active = true THEN 1 END) as active_admin_count,
  COUNT(CASE WHEN active = true AND is_deleted = false THEN 1 END) as active_non_deleted_admin_count
FROM public.users 
WHERE role = 'admin';

-- 3. Check the exact query that hasAdminUsers() uses
SELECT id
FROM public.users
WHERE role = 'admin'
  AND active = true
  AND is_deleted = false
LIMIT 1;

-- 4. Check RLS policies on users table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'users';

-- 5. Check if RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'users';