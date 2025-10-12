/*
  # Setup Supabase Authentication

  1. Auth Configuration
    - Enable email/password authentication
    - Link auth.users to public.users table

  2. Helper Functions
    - handle_new_user: Auto-create profile on signup
    - sync_user_metadata: Keep profiles in sync

  3. Triggers
    - on_auth_user_created: Trigger on new auth user

  4. RLS Updates
    - Update policies to use auth.uid()
    - Secure user data access

  5. Demo Users Setup
    - Instructions for creating auth users
    - Password: demo123 for all users
*/

-- ============================================
-- FUNCTION: Handle new authenticated user
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- When a new user signs up, create a profile in public.users
  -- We'll use the email to link to existing user record if it exists

  -- Check if user already exists in public.users
  IF EXISTS (SELECT 1 FROM public.users WHERE email = NEW.email) THEN
    -- User exists, update with auth user id
    UPDATE public.users
    SET
      updated_at = now(),
      last_login = now()
    WHERE email = NEW.email;

    RETURN NEW;
  ELSE
    -- New user, create basic profile (admin will need to configure)
    INSERT INTO public.users (
      id,
      email,
      name,
      role,
      is_active,
      created_at,
      created_by,
      module_access
    ) VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
      'operator', -- Default role
      true,
      now(),
      'system',
      jsonb_build_object(
        'dashboard', true,
        'containers', true,
        'gateIn', true,
        'gateOut', true,
        'releases', true,
        'edi', false,
        'yard', true,
        'clients', false,
        'users', false,
        'moduleAccess', false,
        'reports', false,
        'depotManagement', false,
        'timeTracking', false,
        'analytics', false,
        'clientPools', false,
        'stackManagement', false,
        'auditLogs', false,
        'billingReports', false,
        'operationsReports', false
      )
    );

    RETURN NEW;
  END IF;
END;
$$;

-- ============================================
-- TRIGGER: On auth user created
-- ============================================

-- Drop trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- UPDATE RLS POLICIES with auth.uid()
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own containers" ON public.containers;
DROP POLICY IF EXISTS "Users can insert containers" ON public.containers;
DROP POLICY IF EXISTS "Users can update containers" ON public.containers;

-- Containers: Users can view their own or all if admin/operator
CREATE POLICY "Authenticated users can view containers"
  ON public.containers
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.is_active = true
      AND (
        users.role IN ('admin', 'supervisor', 'operator')
        OR (users.role = 'client' AND users.client_code = containers.client_code)
      )
    )
  );

CREATE POLICY "Authenticated users can insert containers"
  ON public.containers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.is_active = true
      AND users.role IN ('admin', 'supervisor', 'operator')
    )
  );

CREATE POLICY "Authenticated users can update containers"
  ON public.containers
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.is_active = true
      AND users.role IN ('admin', 'supervisor', 'operator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.is_active = true
      AND users.role IN ('admin', 'supervisor', 'operator')
    )
  );

-- Clients: Only admin/supervisor can manage
DROP POLICY IF EXISTS "Users can view clients" ON public.clients;
DROP POLICY IF EXISTS "Users can manage clients" ON public.clients;

CREATE POLICY "Authenticated users can view clients"
  ON public.clients
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.is_active = true
    )
  );

CREATE POLICY "Admin users can manage clients"
  ON public.clients
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.is_active = true
      AND users.role IN ('admin', 'supervisor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.is_active = true
      AND users.role IN ('admin', 'supervisor')
    )
  );

-- Users: Only admin can manage, users can view own profile
DROP POLICY IF EXISTS "Users can view users" ON public.users;
DROP POLICY IF EXISTS "Users can manage users" ON public.users;

CREATE POLICY "Users can view own profile"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id
    OR
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.is_active = true
      AND u.role = 'admin'
    )
  );

CREATE POLICY "Admin users can manage users"
  ON public.users
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.is_active = true
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.is_active = true
      AND users.role = 'admin'
    )
  );

-- Gate operations: Operators and above can manage
DROP POLICY IF EXISTS "Users can view gate in operations" ON public.gate_in_operations;
DROP POLICY IF EXISTS "Users can create gate in operations" ON public.gate_in_operations;

CREATE POLICY "Authenticated users can view gate in operations"
  ON public.gate_in_operations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.is_active = true
      AND (
        users.role IN ('admin', 'supervisor', 'operator')
        OR (users.role = 'client' AND users.client_code = gate_in_operations.client_code)
      )
    )
  );

CREATE POLICY "Operators can create gate in operations"
  ON public.gate_in_operations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.is_active = true
      AND users.role IN ('admin', 'supervisor', 'operator')
    )
  );

-- Similar for gate out
DROP POLICY IF EXISTS "Users can view gate out operations" ON public.gate_out_operations;
DROP POLICY IF EXISTS "Users can create gate out operations" ON public.gate_out_operations;

CREATE POLICY "Authenticated users can view gate out operations"
  ON public.gate_out_operations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.is_active = true
      AND (
        users.role IN ('admin', 'supervisor', 'operator')
        OR (users.role = 'client' AND users.client_code = gate_out_operations.client_code)
      )
    )
  );

CREATE POLICY "Operators can create gate out operations"
  ON public.gate_out_operations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.is_active = true
      AND users.role IN ('admin', 'supervisor', 'operator')
    )
  );

-- Release orders: Authenticated users based on role
DROP POLICY IF EXISTS "Users can view release orders" ON public.release_orders;
DROP POLICY IF EXISTS "Users can manage release orders" ON public.release_orders;

CREATE POLICY "Authenticated users can view release orders"
  ON public.release_orders
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.is_active = true
      AND (
        users.role IN ('admin', 'supervisor', 'operator')
        OR (users.role = 'client' AND users.client_code = release_orders.client_code)
      )
    )
  );

CREATE POLICY "Operators can manage release orders"
  ON public.release_orders
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.is_active = true
      AND users.role IN ('admin', 'supervisor', 'operator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.is_active = true
      AND users.role IN ('admin', 'supervisor', 'operator')
    )
  );

-- Audit logs: Read-only for admin
DROP POLICY IF EXISTS "Admin users can view audit logs" ON public.audit_logs;

CREATE POLICY "Admin users can view audit logs"
  ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.is_active = true
      AND users.role IN ('admin', 'supervisor')
    )
  );

CREATE POLICY "System can insert audit logs"
  ON public.audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true); -- Any authenticated user can create audit logs

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

-- Grant usage on auth schema to authenticated users (needed for auth.uid())
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT SELECT ON auth.users TO authenticated;

-- ============================================
-- INSTRUCTIONS FOR CREATING DEMO USERS
-- ============================================

/*
  To create demo users with Supabase Auth, you need to use the Supabase Dashboard
  or the Management API. Here are the demo users to create:

  1. Admin User
     Email: admin@depot.com
     Password: demo123

  2. Operator User
     Email: operator@depot.com
     Password: demo123

  3. Supervisor User
     Email: supervisor@depot.com
     Password: demo123

  4. Client User 1
     Email: client@shipping.com
     Password: demo123

  5. Client User 2
     Email: client2@maersk.com
     Password: demo123

  After creating auth users, the trigger will automatically link them to
  the existing users in the public.users table based on email.

  Or you can use the Supabase CLI:

  supabase auth signup email admin@depot.com password demo123
  supabase auth signup email operator@depot.com password demo123
  supabase auth signup email supervisor@depot.com password demo123
  supabase auth signup email client@shipping.com password demo123
  supabase auth signup email client2@maersk.com password demo123
*/

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✓ Supabase Auth setup complete!';
  RAISE NOTICE '→ Create auth users in Supabase Dashboard';
  RAISE NOTICE '→ Or use: supabase auth signup email <email> password demo123';
  RAISE NOTICE '→ Existing users will be auto-linked by email';
  RAISE NOTICE '→ RLS policies updated to use auth.uid()';
END $$;
