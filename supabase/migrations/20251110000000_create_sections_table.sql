/*
  # Create sections table for yard organization

  1. New Tables
    - `sections`
      - `id` (text, primary key) - e.g., 'section-a', 'section-top'
      - `yard_id` (text, references yard identifier)
      - `name` (text) - Display name like 'Zone A', 'Zone B'
      - `position_x` (numeric) - X coordinate
      - `position_y` (numeric) - Y coordinate
      - `position_z` (numeric) - Z coordinate
      - `width` (numeric) - Section width
      - `length` (numeric) - Section length
      - `color` (text) - Hex color for visualization
      - `is_active` (boolean)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `sections` table
    - Add policies for authenticated users to read sections
    - Add policies for admins/supervisors to manage sections

  3. Indexes
    - Index on yard_id for filtering by yard
*/

-- Create sections table
CREATE TABLE IF NOT EXISTS sections (
  id TEXT PRIMARY KEY,
  yard_id TEXT NOT NULL,
  name TEXT NOT NULL,
  position_x NUMERIC DEFAULT 0,
  position_y NUMERIC DEFAULT 0,
  position_z NUMERIC DEFAULT 0,
  width NUMERIC DEFAULT 300,
  length NUMERIC DEFAULT 200,
  color TEXT DEFAULT '#3b82f6',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_sections_yard_id ON sections(yard_id);

-- Enable RLS
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can view all sections
CREATE POLICY "Authenticated users can view sections"
  ON sections
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Admins and supervisors can insert sections
CREATE POLICY "Admins and supervisors can create sections"
  ON sections
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'supervisor')
    )
  );

-- Policy: Admins and supervisors can update sections
CREATE POLICY "Admins and supervisors can update sections"
  ON sections
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

-- Policy: Only admins can delete sections
CREATE POLICY "Only admins can delete sections"
  ON sections
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Insert default sections for existing  yard
INSERT INTO sections (id, yard_id, name, position_x, position_y, position_z, width, length, color)
VALUES
  ('zone-a', '', 'Zone A', 0, 0, 0, 400, 120, '#3b82f6'),
  ('zone-b', '', 'Zone B', 0, 140, 0, 400, 100, '#f59e0b'),
  ('zone-c', '', 'Zone C', 0, 260, 0, 400, 140, '#10b981')
ON CONFLICT (id) DO NOTHING;

-- Update existing stacks to assign them to sections based on their stack numbers
-- For Tantarelli layout:
-- Zone A (zone-a): Stacks 1-31
-- Zone B (zone-b): Stacks 33-55
-- Zone C (zone-c): Stacks 61-103

UPDATE stacks
SET 
  section_id = CASE
    WHEN stack_number >= 1 AND stack_number <= 31 THEN 'zone-a'
    WHEN stack_number >= 33 AND stack_number <= 55 THEN 'zone-b'
    WHEN stack_number >= 61 AND stack_number <= 103 THEN 'zone-c'
    ELSE section_id
  END,
  section_name = CASE
    WHEN stack_number >= 1 AND stack_number <= 31 THEN 'Zone A'
    WHEN stack_number >= 33 AND stack_number <= 55 THEN 'Zone B'
    WHEN stack_number >= 61 AND stack_number <= 103 THEN 'Zone C'
    ELSE section_name
  END
WHERE yard_id = '2554a779-a14b-45ed-a1e1-684e2fd9b614'
  AND section_id IS NULL;
