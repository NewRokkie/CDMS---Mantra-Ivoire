/*
  # Fix ALL RLS Policies — Comprehensive Correction

  ## Problem
  Multiple earlier migrations used `users.id = auth.uid()` which is WRONG.
  The correct comparison is `users.auth_user_id = auth.uid()` because:
    - users.id       = application UUID (set by app)
    - auth.uid()     = Supabase Auth UUID (from JWT)
    - users.auth_user_id = Supabase Auth UUID (correct link)

  ## Affected tables
  - containers         (20251012230000, 20251208100000 — WRONG policies still active)
  - gate_in_operations (20251012230000 — WRONG policies added on top of correct ones)
  - gate_out_operations (20251012230000 — WRONG policies added on top)
  - release_orders     (20251012230000 — WRONG policies)
  - clients            (20251012230000 — WRONG policies)
  - users              (20251012230000 — WRONG policies)
  - audit_logs         (20251012230000 — WRONG policies)

  ## Strategy
  Drop ALL known policies (both correct and incorrect) then recreate
  only correct ones using auth_user_id = auth.uid() consistently.
*/

-- ============================================================================
-- 1. CONTAINERS
-- ============================================================================
-- Drop every known policy name (old + new + soft-delete + our previous fix)
DROP POLICY IF EXISTS "Users can view own containers"                        ON public.containers;
DROP POLICY IF EXISTS "Users can insert containers"                          ON public.containers;
DROP POLICY IF EXISTS "Users can update containers"                          ON public.containers;
DROP POLICY IF EXISTS "Authenticated users can view containers"              ON public.containers;
DROP POLICY IF EXISTS "Authenticated users can insert containers"            ON public.containers;
DROP POLICY IF EXISTS "Authenticated users can update containers"            ON public.containers;
DROP POLICY IF EXISTS "Auth users view containers"                           ON public.containers;
DROP POLICY IF EXISTS "Auth users insert containers"                         ON public.containers;
DROP POLICY IF EXISTS "Auth users update containers"                         ON public.containers;
DROP POLICY IF EXISTS "Users can view containers"                            ON public.containers;
DROP POLICY IF EXISTS "Users can soft delete containers"                     ON public.containers;
DROP POLICY IF EXISTS "Authenticated users can delete containers"            ON public.containers;
DROP POLICY IF EXISTS "containers_select_policy"                             ON public.containers;
DROP POLICY IF EXISTS "containers_insert_policy"                             ON public.containers;
DROP POLICY IF EXISTS "containers_update_policy"                             ON public.containers;
DROP POLICY IF EXISTS "containers_delete_policy"                             ON public.containers;

-- Recreate with correct auth_user_id
CREATE POLICY "containers_select_policy"
  ON public.containers FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.auth_user_id = auth.uid()
        AND users.active = true
    )
  );

CREATE POLICY "containers_insert_policy"
  ON public.containers FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.auth_user_id = auth.uid()
        AND users.active = true
        AND users.role IN ('admin', 'supervisor', 'operator')
    )
  );

CREATE POLICY "containers_update_policy"
  ON public.containers FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.auth_user_id = auth.uid()
        AND users.active = true
        AND users.role IN ('admin', 'supervisor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.auth_user_id = auth.uid()
        AND users.active = true
        AND users.role IN ('admin', 'supervisor')
    )
  );

CREATE POLICY "containers_delete_policy"
  ON public.containers FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.auth_user_id = auth.uid()
        AND users.active = true
        AND users.role IN ('admin')
    )
  );

-- ============================================================================
-- 2. GATE_IN_OPERATIONS
-- ============================================================================
DROP POLICY IF EXISTS "Users can view gate in operations"                    ON public.gate_in_operations;
DROP POLICY IF EXISTS "Users can create gate in operations"                  ON public.gate_in_operations;
DROP POLICY IF EXISTS "Authenticated users can view gate in operations"      ON public.gate_in_operations;
DROP POLICY IF EXISTS "Operators can create gate in operations"              ON public.gate_in_operations;
DROP POLICY IF EXISTS "Operators can update gate in operations"              ON public.gate_in_operations;
DROP POLICY IF EXISTS "Auth users view gate in"                              ON public.gate_in_operations;
DROP POLICY IF EXISTS "Auth operators create gate in"                        ON public.gate_in_operations;
DROP POLICY IF EXISTS "gate_in_select_policy"                                ON public.gate_in_operations;
DROP POLICY IF EXISTS "gate_in_insert_policy"                                ON public.gate_in_operations;
DROP POLICY IF EXISTS "gate_in_update_policy"                                ON public.gate_in_operations;

CREATE POLICY "gate_in_select_policy"
  ON public.gate_in_operations FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.auth_user_id = auth.uid()
        AND users.active = true
        AND users.role IN ('admin', 'supervisor', 'operator', 'client')
    )
  );

CREATE POLICY "gate_in_insert_policy"
  ON public.gate_in_operations FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.auth_user_id = auth.uid()
        AND users.active = true
        AND users.role IN ('admin', 'supervisor', 'operator')
    )
  );

CREATE POLICY "gate_in_update_policy"
  ON public.gate_in_operations FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.auth_user_id = auth.uid()
        AND users.active = true
        AND users.role IN ('admin', 'supervisor', 'operator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.auth_user_id = auth.uid()
        AND users.active = true
        AND users.role IN ('admin', 'supervisor', 'operator')
    )
  );

-- ============================================================================
-- 3. GATE_OUT_OPERATIONS
-- ============================================================================
DROP POLICY IF EXISTS "Users can view gate out operations"                   ON public.gate_out_operations;
DROP POLICY IF EXISTS "Users can create gate out operations"                 ON public.gate_out_operations;
DROP POLICY IF EXISTS "Authenticated users can view gate out operations"     ON public.gate_out_operations;
DROP POLICY IF EXISTS "Operators can create gate out operations"             ON public.gate_out_operations;
DROP POLICY IF EXISTS "Operators can update gate out operations"             ON public.gate_out_operations;
DROP POLICY IF EXISTS "Auth users view gate out"                             ON public.gate_out_operations;
DROP POLICY IF EXISTS "Auth operators create gate out"                       ON public.gate_out_operations;
DROP POLICY IF EXISTS "gate_out_select_policy"                               ON public.gate_out_operations;
DROP POLICY IF EXISTS "gate_out_insert_policy"                               ON public.gate_out_operations;
DROP POLICY IF EXISTS "gate_out_update_policy"                               ON public.gate_out_operations;

CREATE POLICY "gate_out_select_policy"
  ON public.gate_out_operations FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.auth_user_id = auth.uid()
        AND users.active = true
        AND users.role IN ('admin', 'supervisor', 'operator', 'client')
    )
  );

CREATE POLICY "gate_out_insert_policy"
  ON public.gate_out_operations FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.auth_user_id = auth.uid()
        AND users.active = true
        AND users.role IN ('admin', 'supervisor', 'operator')
    )
  );

CREATE POLICY "gate_out_update_policy"
  ON public.gate_out_operations FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.auth_user_id = auth.uid()
        AND users.active = true
        AND users.role IN ('admin', 'supervisor', 'operator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.auth_user_id = auth.uid()
        AND users.active = true
        AND users.role IN ('admin', 'supervisor', 'operator')
    )
  );

-- ============================================================================
-- 4. BOOKING_REFERENCES (table réelle, anciennement nommée release_orders)
-- ============================================================================
DROP POLICY IF EXISTS "Users can view release orders"                        ON public.booking_references;
DROP POLICY IF EXISTS "Users can manage release orders"                      ON public.booking_references;
DROP POLICY IF EXISTS "Authenticated users can view release orders"          ON public.booking_references;
DROP POLICY IF EXISTS "Operators can manage release orders"                  ON public.booking_references;
DROP POLICY IF EXISTS "Auth users view releases"                             ON public.booking_references;
DROP POLICY IF EXISTS "Auth operators manage releases"                       ON public.booking_references;
DROP POLICY IF EXISTS "release_orders_select_policy"                         ON public.booking_references;
DROP POLICY IF EXISTS "release_orders_all_policy"                            ON public.booking_references;
DROP POLICY IF EXISTS "booking_references_select_policy"                     ON public.booking_references;
DROP POLICY IF EXISTS "booking_references_all_policy"                        ON public.booking_references;

CREATE POLICY "booking_references_select_policy"
  ON public.booking_references FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.auth_user_id = auth.uid()
        AND users.active = true
        AND users.role IN ('admin', 'supervisor', 'operator', 'client')
    )
  );

CREATE POLICY "booking_references_all_policy"
  ON public.booking_references FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.auth_user_id = auth.uid()
        AND users.active = true
        AND users.role IN ('admin', 'supervisor', 'operator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.auth_user_id = auth.uid()
        AND users.active = true
        AND users.role IN ('admin', 'supervisor', 'operator')
    )
  );

-- ============================================================================
-- 5. CLIENTS
-- ============================================================================
DROP POLICY IF EXISTS "Users can view clients"                               ON public.clients;
DROP POLICY IF EXISTS "Users can manage clients"                             ON public.clients;
DROP POLICY IF EXISTS "Authenticated users can view clients"                 ON public.clients;
DROP POLICY IF EXISTS "Admin users can manage clients"                       ON public.clients;
DROP POLICY IF EXISTS "Auth users view clients"                              ON public.clients;
DROP POLICY IF EXISTS "Auth admins manage clients"                           ON public.clients;
DROP POLICY IF EXISTS "clients_select_policy"                                ON public.clients;
DROP POLICY IF EXISTS "clients_all_policy"                                   ON public.clients;

CREATE POLICY "clients_select_policy"
  ON public.clients FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.auth_user_id = auth.uid()
        AND users.active = true
    )
  );

CREATE POLICY "clients_all_policy"
  ON public.clients FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.auth_user_id = auth.uid()
        AND users.active = true
        AND users.role IN ('admin', 'supervisor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.auth_user_id = auth.uid()
        AND users.active = true
        AND users.role IN ('admin', 'supervisor')
    )
  );

-- ============================================================================
-- 6. USERS
-- ============================================================================
DROP POLICY IF EXISTS "Users can view users"                                 ON public.users;
DROP POLICY IF EXISTS "Users can manage users"                               ON public.users;
DROP POLICY IF EXISTS "Users can view own profile"                           ON public.users;
DROP POLICY IF EXISTS "Admin users can manage users"                         ON public.users;
DROP POLICY IF EXISTS "Auth users view own profile"                          ON public.users;
DROP POLICY IF EXISTS "Auth admins manage users"                             ON public.users;
DROP POLICY IF EXISTS "users_select_policy"                                  ON public.users;
DROP POLICY IF EXISTS "users_all_policy"                                     ON public.users;

CREATE POLICY "users_select_policy"
  ON public.users FOR SELECT TO authenticated
  USING (
    -- Own profile
    auth.uid() = auth_user_id
    OR
    -- Admin can see all
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_user_id = auth.uid()
        AND u.active = true
        AND u.role = 'admin'
    )
  );

CREATE POLICY "users_all_policy"
  ON public.users FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.auth_user_id = auth.uid()
        AND users.active = true
        AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.auth_user_id = auth.uid()
        AND users.active = true
        AND users.role = 'admin'
    )
  );

-- ============================================================================
-- 7. AUDIT_LOGS
-- ============================================================================
DROP POLICY IF EXISTS "Admin users can view audit logs"                      ON public.audit_logs;
DROP POLICY IF EXISTS "System can insert audit logs"                         ON public.audit_logs;
DROP POLICY IF EXISTS "Auth admins view audit"                               ON public.audit_logs;
DROP POLICY IF EXISTS "Auth users insert audit"                              ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_select_policy"                             ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert_policy"                             ON public.audit_logs;

CREATE POLICY "audit_logs_select_policy"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.auth_user_id = auth.uid()
        AND users.active = true
        AND users.role IN ('admin')
    )
  );

CREATE POLICY "audit_logs_insert_policy"
  ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (true); -- Any authenticated user can create audit logs

-- ============================================================================
-- 8. VERIFY: Check auth_user_id is correctly populated for all users
-- ============================================================================
DO $$
DECLARE
  v_total_users integer;
  v_users_with_auth_id integer;
  v_users_without_auth_id integer;
BEGIN
  SELECT COUNT(*) INTO v_total_users FROM public.users WHERE active = true;
  SELECT COUNT(*) INTO v_users_with_auth_id FROM public.users WHERE auth_user_id IS NOT NULL AND active = true;
  v_users_without_auth_id := v_total_users - v_users_with_auth_id;

  RAISE NOTICE '✓ RLS policies fixed for all tables';
  RAISE NOTICE '→ Total active users: %', v_total_users;
  RAISE NOTICE '→ Users with auth_user_id: %', v_users_with_auth_id;
  RAISE NOTICE '→ Users WITHOUT auth_user_id (will be blocked by RLS): %', v_users_without_auth_id;

  IF v_users_without_auth_id > 0 THEN
    RAISE WARNING '⚠ % users do not have auth_user_id set. These users cannot perform operations. Run: UPDATE public.users SET auth_user_id = (SELECT id FROM auth.users WHERE auth.users.email = users.email LIMIT 1) WHERE auth_user_id IS NULL;', v_users_without_auth_id;
  END IF;
END $$;

-- ============================================================================
-- 9. ALSO fix auth_user_id for users where it might be missing (auto-link by email)
-- ============================================================================
UPDATE public.users u
SET auth_user_id = au.id
FROM auth.users au
WHERE u.email = au.email
  AND u.auth_user_id IS NULL
  AND au.id IS NOT NULL;

DO $$
DECLARE v_fixed integer;
BEGIN
  GET DIAGNOSTICS v_fixed = ROW_COUNT;
  IF v_fixed > 0 THEN
    RAISE NOTICE '✓ Auto-linked auth_user_id for % users by email match', v_fixed;
  END IF;
END $$;
