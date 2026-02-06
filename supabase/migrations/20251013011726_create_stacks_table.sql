/*
  # Create stacks table for stack management

  1. New Tables
    - `stacks`
      - `id` (uuid, primary key)
      - `yard_id` (text, references yard identifier)
      - `stack_number` (integer, unique per yard)
      - `section_id` (text, optional section identifier)
      - `section_name` (text, section name)
      - `rows` (integer, number of rows in stack)
      - `max_tiers` (integer, maximum tiers/height)
      - `capacity` (integer, total container capacity)
      - `current_occupancy` (integer, current number of containers)
      - `position_x` (numeric, x coordinate)
      - `position_y` (numeric, y coordinate)
      - `position_z` (numeric, z coordinate)
      - `width` (numeric, stack width in meters)
      - `length` (numeric, stack length in meters)
      - `is_active` (boolean, whether stack is in use)
      - `is_odd_stack` (boolean, for pairing logic)
      - `assigned_client_code` (text, optional assigned client)
      - `notes` (text, additional notes)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `created_by` (text)
      - `updated_by` (text)

  2. Security
    - Enable RLS on `stacks` table
    - Add policies for authenticated users to read stacks
    - Add policies for admins/supervisors to manage stacks

  3. Indexes
    - Index on yard_id for filtering by yard
    - Index on stack_number for quick lookups
    - Unique constraint on (yard_id, stack_number)
*/

-- Create stacks table
CREATE TABLE IF NOT EXISTS stacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  yard_id TEXT NOT NULL,
  stack_number INTEGER NOT NULL,
  section_id TEXT,
  section_name TEXT NOT NULL DEFAULT 'Zone A',
  rows INTEGER NOT NULL DEFAULT 6,
  max_tiers INTEGER NOT NULL DEFAULT 4,
  capacity INTEGER NOT NULL DEFAULT 0,
  current_occupancy INTEGER NOT NULL DEFAULT 0,
  position_x NUMERIC DEFAULT 0,
  position_y NUMERIC DEFAULT 0,
  position_z NUMERIC DEFAULT 0,
  width NUMERIC DEFAULT 2.5,
  length NUMERIC DEFAULT 12,
  is_active BOOLEAN DEFAULT true,
  is_odd_stack BOOLEAN DEFAULT false,
  assigned_client_code TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by TEXT,
  updated_by TEXT,
  CONSTRAINT unique_yard_stack UNIQUE(yard_id, stack_number)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_stacks_yard_id ON stacks(yard_id);
CREATE INDEX IF NOT EXISTS idx_stacks_stack_number ON stacks(stack_number);
CREATE INDEX IF NOT EXISTS idx_stacks_section_id ON stacks(section_id);
CREATE INDEX IF NOT EXISTS idx_stacks_assigned_client ON stacks(assigned_client_code);

-- Enable RLS
ALTER TABLE stacks ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can view all stacks
CREATE POLICY "Authenticated users can view stacks"
  ON stacks
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Admins and supervisors can insert stacks
CREATE POLICY "Admins and supervisors can create stacks"
  ON stacks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'supervisor')
    )
  );

-- Policy: Admins and supervisors can update stacks
CREATE POLICY "Admins and supervisors can update stacks"
  ON stacks
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'supervisor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'supervisor')
    )
  );

-- Policy: Only admins can delete stacks
CREATE POLICY "Only admins can delete stacks"
  ON stacks
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );