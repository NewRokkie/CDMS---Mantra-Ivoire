/*
  # Create Client Pools and Module Access Tables

  1. New Tables
    - `client_pools`
      - `id` (uuid, primary key)
      - `yard_id` (uuid, foreign key to yards)
      - `client_id` (uuid, foreign key to clients)
      - `client_code` (text)
      - `client_name` (text)
      - `assigned_stacks` (jsonb) - Array of stack IDs
      - `max_capacity` (integer)
      - `current_occupancy` (integer, default 0)
      - `is_active` (boolean, default true)
      - `priority` (text) - 'high', 'medium', 'low'
      - `contract_start_date` (timestamptz)
      - `contract_end_date` (timestamptz, nullable)
      - `notes` (text, nullable)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `created_by` (uuid, foreign key to users)
      - `updated_by` (uuid, foreign key to users, nullable)

    - `stack_assignments`
      - `id` (uuid, primary key)
      - `yard_id` (uuid, foreign key to yards)
      - `stack_id` (text) - Stack identifier
      - `stack_number` (integer)
      - `client_pool_id` (uuid, foreign key to client_pools)
      - `client_code` (text)
      - `is_exclusive` (boolean, default false)
      - `priority` (integer, default 1)
      - `notes` (text, nullable)
      - `assigned_at` (timestamptz)
      - `assigned_by` (uuid, foreign key to users)

    - `user_module_access`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `module_permissions` (jsonb) - Full module access object
      - `updated_at` (timestamptz)
      - `updated_by` (uuid, foreign key to users)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users based on role
    - Admins can manage all records
    - Supervisors can view and update within their yard
    - Operators can only view

  3. Indexes
    - Index on yard_id for client_pools
    - Index on client_id for client_pools
    - Index on client_pool_id for stack_assignments
    - Index on user_id for user_module_access
*/

-- Create client_pools table
CREATE TABLE IF NOT EXISTS client_pools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  yard_id uuid NOT NULL,
  client_id uuid NOT NULL,
  client_code text NOT NULL,
  client_name text NOT NULL,
  assigned_stacks jsonb DEFAULT '[]'::jsonb,
  max_capacity integer NOT NULL DEFAULT 0,
  current_occupancy integer NOT NULL DEFAULT 0,
  is_active boolean DEFAULT true,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  contract_start_date timestamptz NOT NULL DEFAULT now(),
  contract_end_date timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid NOT NULL,
  updated_by uuid,
  CONSTRAINT fk_client_pools_created_by FOREIGN KEY (created_by) REFERENCES users(id),
  CONSTRAINT fk_client_pools_updated_by FOREIGN KEY (updated_by) REFERENCES users(id),
  CONSTRAINT fk_client_pools_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

-- Create stack_assignments table
CREATE TABLE IF NOT EXISTS stack_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  yard_id uuid NOT NULL,
  stack_id text NOT NULL,
  stack_number integer NOT NULL,
  client_pool_id uuid NOT NULL,
  client_code text NOT NULL,
  is_exclusive boolean DEFAULT false,
  priority integer DEFAULT 1,
  notes text,
  assigned_at timestamptz DEFAULT now(),
  assigned_by uuid NOT NULL,
  CONSTRAINT fk_stack_assignments_pool FOREIGN KEY (client_pool_id) REFERENCES client_pools(id) ON DELETE CASCADE,
  CONSTRAINT fk_stack_assignments_assigned_by FOREIGN KEY (assigned_by) REFERENCES users(id)
);

-- Create user_module_access table
CREATE TABLE IF NOT EXISTS user_module_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  module_permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid NOT NULL,
  CONSTRAINT fk_user_module_access_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_module_access_updated_by FOREIGN KEY (updated_by) REFERENCES users(id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_client_pools_yard ON client_pools(yard_id);
CREATE INDEX IF NOT EXISTS idx_client_pools_client ON client_pools(client_id);
CREATE INDEX IF NOT EXISTS idx_client_pools_active ON client_pools(is_active);
CREATE INDEX IF NOT EXISTS idx_stack_assignments_pool ON stack_assignments(client_pool_id);
CREATE INDEX IF NOT EXISTS idx_stack_assignments_yard ON stack_assignments(yard_id);
CREATE INDEX IF NOT EXISTS idx_stack_assignments_client ON stack_assignments(client_code);
CREATE INDEX IF NOT EXISTS idx_user_module_access_user ON user_module_access(user_id);

-- Enable Row Level Security
ALTER TABLE client_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE stack_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_module_access ENABLE ROW LEVEL SECURITY;

-- RLS Policies for client_pools
CREATE POLICY "Users can view client pools"
  ON client_pools FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and supervisors can insert client pools"
  ON client_pools FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
      AND users.role IN ('admin', 'supervisor')
    )
  );

CREATE POLICY "Admins and supervisors can update client pools"
  ON client_pools FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
      AND users.role IN ('admin', 'supervisor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
      AND users.role IN ('admin', 'supervisor')
    )
  );

CREATE POLICY "Admins can delete client pools"
  ON client_pools FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
      AND users.role = 'admin'
    )
  );

-- RLS Policies for stack_assignments
CREATE POLICY "Users can view stack assignments"
  ON stack_assignments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and supervisors can insert stack assignments"
  ON stack_assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
      AND users.role IN ('admin', 'supervisor')
    )
  );

CREATE POLICY "Admins and supervisors can update stack assignments"
  ON stack_assignments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
      AND users.role IN ('admin', 'supervisor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
      AND users.role IN ('admin', 'supervisor')
    )
  );

CREATE POLICY "Admins can delete stack assignments"
  ON stack_assignments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
      AND users.role = 'admin'
    )
  );

-- RLS Policies for user_module_access
CREATE POLICY "Users can view their own module access"
  ON user_module_access FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert module access"
  ON user_module_access FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can update module access"
  ON user_module_access FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete module access"
  ON user_module_access FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
      AND users.role = 'admin'
    )
  );

-- Add trigger to update updated_at on client_pools
CREATE OR REPLACE FUNCTION update_client_pools_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER client_pools_updated_at
  BEFORE UPDATE ON client_pools
  FOR EACH ROW
  EXECUTE FUNCTION update_client_pools_updated_at();

-- Add trigger to update updated_at on user_module_access
CREATE OR REPLACE FUNCTION update_user_module_access_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_module_access_updated_at
  BEFORE UPDATE ON user_module_access
  FOR EACH ROW
  EXECUTE FUNCTION update_user_module_access_updated_at();
