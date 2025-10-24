-- Create yards table
CREATE TABLE IF NOT EXISTS yards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  location TEXT NOT NULL,
  description TEXT,
  layout TEXT DEFAULT 'standard',
  is_active BOOLEAN DEFAULT true,
  total_capacity INTEGER DEFAULT 0,
  current_occupancy INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by TEXT
);

-- Create index on code for faster lookups
CREATE INDEX IF NOT EXISTS idx_yards_code ON yards(code);
CREATE INDEX IF NOT EXISTS idx_yards_is_active ON yards(is_active);

-- Enable RLS
ALTER TABLE yards ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow authenticated users to read yards"
  ON yards FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow admins to insert yards"
  ON yards FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Allow admins to update yards"
  ON yards FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Allow admins to delete yards"
  ON yards FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Insert default yards if they don't exist
INSERT INTO yards (name, code, location, layout, is_active, total_capacity, current_occupancy, created_by)
VALUES
  ('Depot Tantarelli', 'DEPOT-01', 'Tantarelli Port Complex', 'tantarelli', true, 2500, 1847, 'System'),
  ('Main Depot', 'DEPOT-02', 'Main Port Terminal', 'standard', true, 2000, 1200, 'System')
ON CONFLICT (code) DO NOTHING;
