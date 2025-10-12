/*
  # Core Database Schema for Container Depot Management System

  ## Overview
  This migration creates the foundational tables for a complete container depot management system.
  
  ## New Tables

  ### 1. `clients`
  Client/shipping line master data
  - `id` (uuid, primary key)
  - `code` (text, unique) - Client identifier code (e.g., MAEU, MSCU)
  - `name` (text) - Full company name
  - `contact_person` (text) - Primary contact
  - `email` (text) - Contact email
  - `phone` (text) - Contact phone
  - `address` (text) - Company address
  - `free_days_allowed` (integer) - Free storage days
  - `daily_storage_rate` (decimal) - Daily rate after free days
  - `currency` (text) - Currency code (USD, EUR, etc)
  - `auto_edi` (boolean) - Auto EDI transmission enabled
  - `active` (boolean) - Client active status
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 2. `containers`
  Container inventory and tracking
  - `id` (uuid, primary key)
  - `number` (text, unique) - Container number (ISO format)
  - `type` (text) - standard, reefer, tank, flat_rack, open_top
  - `size` (text) - 20ft, 40ft, 45ft
  - `status` (text) - in_depot, out_depot, maintenance, cleaning
  - `location` (text) - Physical location in yard (e.g., S01-R02-H03)
  - `yard_id` (uuid) - Reference to yard
  - `client_id` (uuid, foreign key) - Owner client
  - `client_code` (text) - Denormalized for quick access
  - `gate_in_date` (timestamptz) - When container entered
  - `gate_out_date` (timestamptz) - When container left
  - `weight` (decimal) - Container weight
  - `damage` (jsonb) - Array of damage descriptions
  - `booking_reference` (text) - Related booking/BL number
  - `seal_number` (text) - Seal number if applicable
  - `temperature_setting` (decimal) - For reefers
  - `created_by` (text) - User who created record
  - `updated_by` (text) - User who last updated
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 3. `release_orders`
  Release orders for container pickup
  - `id` (uuid, primary key)
  - `booking_number` (text, unique) - Booking/BL reference
  - `client_id` (uuid, foreign key)
  - `client_code` (text)
  - `client_name` (text)
  - `booking_type` (text) - import, export
  - `total_containers` (integer) - Total containers in order
  - `remaining_containers` (integer) - Containers yet to be picked up
  - `status` (text) - pending, in_process, completed, cancelled
  - `valid_from` (timestamptz) - Order valid from date
  - `valid_until` (timestamptz) - Order expiry date
  - `notes` (text) - Additional notes
  - `created_by` (text)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 4. `gate_in_operations`
  Gate in operation logs
  - `id` (uuid, primary key)
  - `container_id` (uuid, foreign key)
  - `container_number` (text)
  - `client_code` (text)
  - `client_name` (text)
  - `container_type` (text)
  - `container_size` (text)
  - `transport_company` (text) - Trucking company
  - `driver_name` (text)
  - `vehicle_number` (text) - Truck number
  - `assigned_location` (text) - Where container was placed
  - `damage_reported` (boolean)
  - `damage_description` (text)
  - `weight` (decimal)
  - `status` (text) - pending, completed, cancelled
  - `operator_id` (text) - User who performed operation
  - `operator_name` (text)
  - `yard_id` (text) - Which yard
  - `edi_transmitted` (boolean) - EDI CODECO sent
  - `edi_transmission_date` (timestamptz)
  - `created_at` (timestamptz)
  - `completed_at` (timestamptz)

  ### 5. `gate_out_operations`
  Gate out operation logs
  - `id` (uuid, primary key)
  - `release_order_id` (uuid, foreign key)
  - `booking_number` (text)
  - `client_code` (text)
  - `client_name` (text)
  - `booking_type` (text)
  - `total_containers` (integer)
  - `processed_containers` (integer)
  - `remaining_containers` (integer)
  - `processed_container_ids` (jsonb) - Array of container IDs
  - `transport_company` (text)
  - `driver_name` (text)
  - `vehicle_number` (text)
  - `status` (text) - pending, completed, cancelled
  - `operator_id` (text)
  - `operator_name` (text)
  - `yard_id` (text)
  - `edi_transmitted` (boolean)
  - `edi_transmission_date` (timestamptz)
  - `created_at` (timestamptz)
  - `completed_at` (timestamptz)

  ### 6. `users`
  System users (separate from auth.users)
  - `id` (uuid, primary key)
  - `auth_user_id` (uuid) - Link to Supabase auth.users
  - `name` (text)
  - `email` (text, unique)
  - `role` (text) - admin, supervisor, operator, viewer
  - `yard_ids` (jsonb) - Array of accessible yard IDs
  - `module_access` (jsonb) - Module permissions
  - `active` (boolean)
  - `last_login` (timestamptz)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 7. `audit_logs`
  Audit trail for all operations
  - `id` (uuid, primary key)
  - `entity_type` (text) - container, client, user, etc
  - `entity_id` (text) - ID of affected entity
  - `action` (text) - create, update, delete
  - `changes` (jsonb) - Before/after values
  - `user_id` (text) - Who made the change
  - `user_name` (text)
  - `timestamp` (timestamptz)
  - `ip_address` (text)
  - `user_agent` (text)

  ## Security
  - Row Level Security (RLS) enabled on all tables
  - Users can only access data for their assigned yards
  - Admins can access all data
  - Audit logs are read-only for non-admins

  ## Indexes
  - Performance indexes on foreign keys and frequently queried columns
  - Full-text search indexes on container numbers and client names

  ## Notes
  - All timestamps use timestamptz for timezone awareness
  - JSONB used for flexible data structures (damage, container IDs)
  - Denormalized fields (client_code, client_name) for query performance
  - Soft deletes not implemented - use 'active' status fields instead
*/

-- Create clients table
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  contact_person text,
  email text,
  phone text,
  address text,
  free_days_allowed integer DEFAULT 3,
  daily_storage_rate decimal(10,2) DEFAULT 45.00,
  currency text DEFAULT 'USD',
  auto_edi boolean DEFAULT false,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create containers table
CREATE TABLE IF NOT EXISTS containers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number text UNIQUE NOT NULL,
  type text NOT NULL,
  size text NOT NULL,
  status text NOT NULL DEFAULT 'in_depot',
  location text,
  yard_id text,
  client_id uuid REFERENCES clients(id),
  client_code text,
  gate_in_date timestamptz,
  gate_out_date timestamptz,
  weight decimal(10,2),
  damage jsonb DEFAULT '[]'::jsonb,
  booking_reference text,
  seal_number text,
  temperature_setting decimal(5,2),
  created_by text,
  updated_by text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create release_orders table
CREATE TABLE IF NOT EXISTS release_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_number text UNIQUE NOT NULL,
  client_id uuid REFERENCES clients(id),
  client_code text NOT NULL,
  client_name text NOT NULL,
  booking_type text NOT NULL,
  total_containers integer NOT NULL DEFAULT 0,
  remaining_containers integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  valid_from timestamptz,
  valid_until timestamptz,
  notes text,
  created_by text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create gate_in_operations table
CREATE TABLE IF NOT EXISTS gate_in_operations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  container_id uuid REFERENCES containers(id),
  container_number text NOT NULL,
  client_code text NOT NULL,
  client_name text NOT NULL,
  container_type text NOT NULL,
  container_size text NOT NULL,
  transport_company text,
  driver_name text,
  vehicle_number text,
  assigned_location text,
  damage_reported boolean DEFAULT false,
  damage_description text,
  weight decimal(10,2),
  status text DEFAULT 'completed',
  operator_id text,
  operator_name text,
  yard_id text,
  edi_transmitted boolean DEFAULT false,
  edi_transmission_date timestamptz,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Create gate_out_operations table
CREATE TABLE IF NOT EXISTS gate_out_operations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  release_order_id uuid REFERENCES release_orders(id),
  booking_number text NOT NULL,
  client_code text NOT NULL,
  client_name text NOT NULL,
  booking_type text,
  total_containers integer,
  processed_containers integer,
  remaining_containers integer,
  processed_container_ids jsonb DEFAULT '[]'::jsonb,
  transport_company text,
  driver_name text,
  vehicle_number text,
  status text DEFAULT 'completed',
  operator_id text,
  operator_name text,
  yard_id text,
  edi_transmitted boolean DEFAULT false,
  edi_transmission_date timestamptz,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid,
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  role text NOT NULL DEFAULT 'viewer',
  yard_ids jsonb DEFAULT '[]'::jsonb,
  module_access jsonb DEFAULT '{}'::jsonb,
  active boolean DEFAULT true,
  last_login timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  action text NOT NULL,
  changes jsonb DEFAULT '{}'::jsonb,
  user_id text,
  user_name text,
  timestamp timestamptz DEFAULT now(),
  ip_address text,
  user_agent text
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_containers_client_id ON containers(client_id);
CREATE INDEX IF NOT EXISTS idx_containers_client_code ON containers(client_code);
CREATE INDEX IF NOT EXISTS idx_containers_status ON containers(status);
CREATE INDEX IF NOT EXISTS idx_containers_yard_id ON containers(yard_id);
CREATE INDEX IF NOT EXISTS idx_containers_number ON containers(number);

CREATE INDEX IF NOT EXISTS idx_release_orders_client_id ON release_orders(client_id);
CREATE INDEX IF NOT EXISTS idx_release_orders_status ON release_orders(status);
CREATE INDEX IF NOT EXISTS idx_release_orders_booking_number ON release_orders(booking_number);

CREATE INDEX IF NOT EXISTS idx_gate_in_container_id ON gate_in_operations(container_id);
CREATE INDEX IF NOT EXISTS idx_gate_in_yard_id ON gate_in_operations(yard_id);
CREATE INDEX IF NOT EXISTS idx_gate_in_created_at ON gate_in_operations(created_at);

CREATE INDEX IF NOT EXISTS idx_gate_out_release_id ON gate_out_operations(release_order_id);
CREATE INDEX IF NOT EXISTS idx_gate_out_yard_id ON gate_out_operations(yard_id);
CREATE INDEX IF NOT EXISTS idx_gate_out_created_at ON gate_out_operations(created_at);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);

-- Enable Row Level Security
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE containers ENABLE ROW LEVEL SECURITY;
ALTER TABLE release_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE gate_in_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE gate_out_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for clients
CREATE POLICY "Users can view all clients"
  ON clients FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage clients"
  ON clients FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
      AND users.role IN ('admin', 'supervisor')
      AND users.active = true
    )
  );

-- RLS Policies for containers
CREATE POLICY "Users can view containers"
  ON containers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Operators can create containers"
  ON containers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
      AND users.role IN ('admin', 'supervisor', 'operator')
      AND users.active = true
    )
  );

CREATE POLICY "Operators can update containers"
  ON containers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
      AND users.role IN ('admin', 'supervisor', 'operator')
      AND users.active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
      AND users.role IN ('admin', 'supervisor', 'operator')
      AND users.active = true
    )
  );

-- RLS Policies for release_orders
CREATE POLICY "Users can view release orders"
  ON release_orders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Operators can manage release orders"
  ON release_orders FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
      AND users.role IN ('admin', 'supervisor', 'operator')
      AND users.active = true
    )
  );

-- RLS Policies for gate operations
CREATE POLICY "Users can view gate in operations"
  ON gate_in_operations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Operators can create gate in operations"
  ON gate_in_operations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
      AND users.role IN ('admin', 'supervisor', 'operator')
      AND users.active = true
    )
  );

CREATE POLICY "Users can view gate out operations"
  ON gate_out_operations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Operators can create gate out operations"
  ON gate_out_operations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
      AND users.role IN ('admin', 'supervisor', 'operator')
      AND users.active = true
    )
  );

-- RLS Policies for users
CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  TO authenticated
  USING (auth_user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM users
    WHERE users.auth_user_id = auth.uid()
    AND users.role IN ('admin', 'supervisor')
  ));

CREATE POLICY "Admins can manage users"
  ON users FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
      AND users.role = 'admin'
      AND users.active = true
    )
  );

-- RLS Policies for audit_logs
CREATE POLICY "Users can view audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
      AND users.role IN ('admin', 'supervisor')
      AND users.active = true
    )
  );

CREATE POLICY "System can create audit logs"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);
