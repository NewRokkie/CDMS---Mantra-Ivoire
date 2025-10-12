/*
  # Setup Supabase Authentication RLS (Fixed)

  Update all RLS policies to use auth.uid() with correct column names
*/

-- Containers
DROP POLICY IF EXISTS "Users can view own containers" ON public.containers;
DROP POLICY IF EXISTS "Users can insert containers" ON public.containers;
DROP POLICY IF EXISTS "Users can update containers" ON public.containers;
DROP POLICY IF EXISTS "Authenticated users can view containers" ON public.containers;
DROP POLICY IF EXISTS "Authenticated users can insert containers" ON public.containers;
DROP POLICY IF EXISTS "Authenticated users can update containers" ON public.containers;

CREATE POLICY "Auth users view containers"
  ON public.containers FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.auth_user_id = auth.uid() AND users.active = true
    )
  );

CREATE POLICY "Auth users insert containers"
  ON public.containers FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.auth_user_id = auth.uid() AND users.active = true
      AND users.role IN ('admin', 'supervisor', 'operator')
    )
  );

CREATE POLICY "Auth users update containers"
  ON public.containers FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.auth_user_id = auth.uid() AND users.active = true
      AND users.role IN ('admin', 'supervisor', 'operator')
    )
  );

-- Clients
DROP POLICY IF EXISTS "Users can view clients" ON public.clients;
DROP POLICY IF EXISTS "Users can manage clients" ON public.clients;
DROP POLICY IF EXISTS "Authenticated users can view clients" ON public.clients;
DROP POLICY IF EXISTS "Admin users can manage clients" ON public.clients;

CREATE POLICY "Auth users view clients"
  ON public.clients FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.auth_user_id = auth.uid() AND users.active = true
    )
  );

CREATE POLICY "Auth admins manage clients"
  ON public.clients FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.auth_user_id = auth.uid() AND users.active = true
      AND users.role IN ('admin', 'supervisor')
    )
  );

-- Users
DROP POLICY IF EXISTS "Users can view users" ON public.users;
DROP POLICY IF EXISTS "Users can manage users" ON public.users;
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Admin users can manage users" ON public.users;

CREATE POLICY "Auth users view own profile"
  ON public.users FOR SELECT TO authenticated
  USING (
    auth.uid() = auth_user_id
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_user_id = auth.uid() AND u.active = true AND u.role = 'admin'
    )
  );

CREATE POLICY "Auth admins manage users"
  ON public.users FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.auth_user_id = auth.uid() AND users.active = true AND users.role = 'admin'
    )
  );

-- Gate In
DROP POLICY IF EXISTS "Users can view gate in operations" ON public.gate_in_operations;
DROP POLICY IF EXISTS "Users can create gate in operations" ON public.gate_in_operations;
DROP POLICY IF EXISTS "Authenticated users can view gate in operations" ON public.gate_in_operations;
DROP POLICY IF EXISTS "Operators can create gate in operations" ON public.gate_in_operations;

CREATE POLICY "Auth users view gate in"
  ON public.gate_in_operations FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.auth_user_id = auth.uid() AND users.active = true
    )
  );

CREATE POLICY "Auth operators create gate in"
  ON public.gate_in_operations FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.auth_user_id = auth.uid() AND users.active = true
      AND users.role IN ('admin', 'supervisor', 'operator')
    )
  );

-- Gate Out
DROP POLICY IF EXISTS "Users can view gate out operations" ON public.gate_out_operations;
DROP POLICY IF EXISTS "Users can create gate out operations" ON public.gate_out_operations;
DROP POLICY IF EXISTS "Authenticated users can view gate out operations" ON public.gate_out_operations;
DROP POLICY IF EXISTS "Operators can create gate out operations" ON public.gate_out_operations;

CREATE POLICY "Auth users view gate out"
  ON public.gate_out_operations FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.auth_user_id = auth.uid() AND users.active = true
    )
  );

CREATE POLICY "Auth operators create gate out"
  ON public.gate_out_operations FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.auth_user_id = auth.uid() AND users.active = true
      AND users.role IN ('admin', 'supervisor', 'operator')
    )
  );

-- Release Orders
DROP POLICY IF EXISTS "Users can view release orders" ON public.release_orders;
DROP POLICY IF EXISTS "Users can manage release orders" ON public.release_orders;
DROP POLICY IF EXISTS "Authenticated users can view release orders" ON public.release_orders;
DROP POLICY IF EXISTS "Operators can manage release orders" ON public.release_orders;

CREATE POLICY "Auth users view releases"
  ON public.release_orders FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.auth_user_id = auth.uid() AND users.active = true
    )
  );

CREATE POLICY "Auth operators manage releases"
  ON public.release_orders FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.auth_user_id = auth.uid() AND users.active = true
      AND users.role IN ('admin', 'supervisor', 'operator')
    )
  );

-- Audit Logs
DROP POLICY IF EXISTS "Admin users can view audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;

CREATE POLICY "Auth admins view audit"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.auth_user_id = auth.uid() AND users.active = true
      AND users.role IN ('admin', 'supervisor')
    )
  );

CREATE POLICY "Auth users insert audit"
  ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (true);

GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT SELECT ON auth.users TO authenticated;
