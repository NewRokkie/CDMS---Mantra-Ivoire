-- Create a database function to check for admin users
-- This function will run with SECURITY DEFINER to bypass RLS
-- Run this in your Supabase SQL Editor

CREATE OR REPLACE FUNCTION public.has_admin_users()
RETURNS boolean 
LANGUAGE plpgsql 
SECURITY DEFINER 
STABLE
AS $$
DECLARE 
  admin_count integer;
BEGIN
  SELECT COUNT(*) INTO admin_count 
  FROM public.users
  WHERE role = 'admin' 
    AND active = true 
    AND is_deleted = false;
  
  RETURN admin_count > 0;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.has_admin_users() TO authenticated;

-- Grant execute permission to anonymous users (needed for initial setup check)
GRANT EXECUTE ON FUNCTION public.has_admin_users() TO anon;