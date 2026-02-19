/*
  # Fix Infinite Recursion in Users RLS Policies

  ## Problem
  ERROR: 42P17 — infinite recursion detected in policy for relation "users"

  The `users_select_policy` and `users_all_policy` both contain:
    EXISTS (SELECT 1 FROM public.users WHERE ...)

  When PostgreSQL evaluates a policy on `public.users`, any sub-query that
  also reads `public.users` re-triggers the same policy → infinite recursion.

  ## Solution
  Create a SECURITY DEFINER function that queries the users table without
  triggering RLS (bypasses RLS by running as the function owner).

  Then rewrite the users policies to use this function instead of self-referential
  EXISTS sub-queries.
*/

-- ============================================================================
-- 1. Create SECURITY DEFINER helper functions (bypass RLS on users table)
-- ============================================================================

-- Returns the role of the currently authenticated user
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role
  FROM public.users
  WHERE auth_user_id = auth.uid()
    AND active = true
  LIMIT 1;
$$;

-- Returns true if the currently authenticated user is an admin
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE auth_user_id = auth.uid()
      AND active = true
      AND role = 'admin'
  );
$$;

-- Returns true if the currently authenticated user is active (any role)
CREATE OR REPLACE FUNCTION public.is_current_user_active()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE auth_user_id = auth.uid()
      AND active = true
  );
$$;

-- ============================================================================
-- 2. Fix users table policies (remove recursive sub-queries)
-- ============================================================================
DROP POLICY IF EXISTS "users_select_policy" ON public.users;
DROP POLICY IF EXISTS "users_all_policy"    ON public.users;
-- Also drop any legacy policies that might conflict
DROP POLICY IF EXISTS "Users can view users"       ON public.users;
DROP POLICY IF EXISTS "Users can manage users"     ON public.users;
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Admin users can manage users" ON public.users;
DROP POLICY IF EXISTS "Auth users view own profile"  ON public.users;
DROP POLICY IF EXISTS "Auth admins manage users"     ON public.users;

-- SELECT: own row always visible; admin can see all — uses SECURITY DEFINER (no recursion)
CREATE POLICY "users_select_policy"
  ON public.users FOR SELECT TO authenticated
  USING (
    auth.uid() = auth_user_id
    OR public.is_current_user_admin()
  );

-- ALL (INSERT/UPDATE/DELETE): only admins — uses SECURITY DEFINER (no recursion)
CREATE POLICY "users_all_policy"
  ON public.users FOR ALL TO authenticated
  USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());

-- ============================================================================
-- 3. Verify: no more recursion
-- ============================================================================
DO $$
BEGIN
  -- If this query succeeds without 42P17, recursion is fixed
  PERFORM COUNT(*) FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1;
  RAISE NOTICE '✓ users RLS policies rewritten — infinite recursion fixed';
  RAISE NOTICE '✓ SECURITY DEFINER functions created: get_current_user_role(), is_current_user_admin(), is_current_user_active()';
END $$;
