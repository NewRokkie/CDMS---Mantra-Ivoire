/*
  # Stack Pairings for 40ft Containers

  1. Purpose
    - Manages pairing relationships between physical odd stacks for 40ft containers
    - Example: S03 + S05 → Virtual stack S04
    - Virtual stack S04 represents locations spanning both S03 and S05

  2. New Tables
    - `stack_pairings`
      - `id` (uuid, primary key)
      - `yard_id` (text, not null) - Reference to yard
      - `first_stack_number` (integer, not null) - First odd stack (e.g., 3)
      - `second_stack_number` (integer, not null) - Second odd stack (e.g., 5)
      - `virtual_stack_number` (integer, not null) - Virtual paired stack (e.g., 4)
      - `first_stack_id` (uuid) - FK to stacks table
      - `second_stack_id` (uuid) - FK to stacks table
      - `is_active` (boolean, default true)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  3. Security
    - Enable RLS on `stack_pairings` table
    - Add policy for authenticated users to read pairings
    - Add policy for admins to manage pairings

  4. Important Notes
    - Virtual stack numbers follow pattern: (first_stack + 1)
    - S03 + S05 → S04, S07 + S09 → S08, S11 + S13 → S12, etc.
    - Virtual stacks don't exist physically but represent paired capacity
    - Only applies to 40ft containers
*/

-- Create stack_pairings table
CREATE TABLE IF NOT EXISTS stack_pairings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  yard_id text NOT NULL,
  first_stack_number integer NOT NULL,
  second_stack_number integer NOT NULL,
  virtual_stack_number integer NOT NULL,
  first_stack_id uuid,
  second_stack_id uuid,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Ensure virtual stack is between the two physical stacks
  CONSTRAINT valid_virtual_stack CHECK (
    virtual_stack_number > first_stack_number AND 
    virtual_stack_number < second_stack_number
  ),
  
  -- Unique constraint per yard
  CONSTRAINT unique_pairing_per_yard UNIQUE (yard_id, first_stack_number, second_stack_number)
);

-- Enable RLS
ALTER TABLE stack_pairings ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can read pairings
CREATE POLICY "Authenticated users can view stack pairings"
  ON stack_pairings
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Admins can manage pairings
CREATE POLICY "Admins can manage stack pairings"
  ON stack_pairings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id::text = auth.uid()::text
      AND users.role = 'admin'
    )
  );

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_stack_pairings_yard 
  ON stack_pairings(yard_id);

CREATE INDEX IF NOT EXISTS idx_stack_pairings_stacks 
  ON stack_pairings(first_stack_number, second_stack_number);

-- Insert Zone A pairings for Depot Tantarelli
DO $$
DECLARE
  v_yard_id text;
  v_stack_3_id uuid;
  v_stack_5_id uuid;
  v_stack_7_id uuid;
  v_stack_9_id uuid;
  v_stack_11_id uuid;
  v_stack_13_id uuid;
  v_stack_15_id uuid;
  v_stack_17_id uuid;
  v_stack_19_id uuid;
  v_stack_21_id uuid;
  v_stack_23_id uuid;
  v_stack_25_id uuid;
  v_stack_27_id uuid;
  v_stack_29_id uuid;
BEGIN
  -- Get yard_id (assuming first yard is Depot Tantarelli)
  SELECT id INTO v_yard_id FROM (SELECT DISTINCT yard_id as id FROM stacks LIMIT 1) sub;
  
  IF v_yard_id IS NULL THEN
    RAISE NOTICE 'No yard found, skipping pairing inserts';
    RETURN;
  END IF;

  -- Get stack IDs
  SELECT id INTO v_stack_3_id FROM stacks WHERE yard_id = v_yard_id AND stack_number = 3;
  SELECT id INTO v_stack_5_id FROM stacks WHERE yard_id = v_yard_id AND stack_number = 5;
  SELECT id INTO v_stack_7_id FROM stacks WHERE yard_id = v_yard_id AND stack_number = 7;
  SELECT id INTO v_stack_9_id FROM stacks WHERE yard_id = v_yard_id AND stack_number = 9;
  SELECT id INTO v_stack_11_id FROM stacks WHERE yard_id = v_yard_id AND stack_number = 11;
  SELECT id INTO v_stack_13_id FROM stacks WHERE yard_id = v_yard_id AND stack_number = 13;
  SELECT id INTO v_stack_15_id FROM stacks WHERE yard_id = v_yard_id AND stack_number = 15;
  SELECT id INTO v_stack_17_id FROM stacks WHERE yard_id = v_yard_id AND stack_number = 17;
  SELECT id INTO v_stack_19_id FROM stacks WHERE yard_id = v_yard_id AND stack_number = 19;
  SELECT id INTO v_stack_21_id FROM stacks WHERE yard_id = v_yard_id AND stack_number = 21;
  SELECT id INTO v_stack_23_id FROM stacks WHERE yard_id = v_yard_id AND stack_number = 23;
  SELECT id INTO v_stack_25_id FROM stacks WHERE yard_id = v_yard_id AND stack_number = 25;
  SELECT id INTO v_stack_27_id FROM stacks WHERE yard_id = v_yard_id AND stack_number = 27;
  SELECT id INTO v_stack_29_id FROM stacks WHERE yard_id = v_yard_id AND stack_number = 29;

  -- Insert pairings: S03+S05→S04, S07+S09→S08, etc.
  -- S03 + S05 → S04
  IF v_stack_3_id IS NOT NULL AND v_stack_5_id IS NOT NULL THEN
    INSERT INTO stack_pairings (yard_id, first_stack_number, second_stack_number, virtual_stack_number, first_stack_id, second_stack_id)
    VALUES (v_yard_id, 3, 5, 4, v_stack_3_id, v_stack_5_id)
    ON CONFLICT (yard_id, first_stack_number, second_stack_number) DO NOTHING;
  END IF;

  -- S07 + S09 → S08
  IF v_stack_7_id IS NOT NULL AND v_stack_9_id IS NOT NULL THEN
    INSERT INTO stack_pairings (yard_id, first_stack_number, second_stack_number, virtual_stack_number, first_stack_id, second_stack_id)
    VALUES (v_yard_id, 7, 9, 8, v_stack_7_id, v_stack_9_id)
    ON CONFLICT (yard_id, first_stack_number, second_stack_number) DO NOTHING;
  END IF;

  -- S11 + S13 → S12
  IF v_stack_11_id IS NOT NULL AND v_stack_13_id IS NOT NULL THEN
    INSERT INTO stack_pairings (yard_id, first_stack_number, second_stack_number, virtual_stack_number, first_stack_id, second_stack_id)
    VALUES (v_yard_id, 11, 13, 12, v_stack_11_id, v_stack_13_id)
    ON CONFLICT (yard_id, first_stack_number, second_stack_number) DO NOTHING;
  END IF;

  -- S15 + S17 → S16
  IF v_stack_15_id IS NOT NULL AND v_stack_17_id IS NOT NULL THEN
    INSERT INTO stack_pairings (yard_id, first_stack_number, second_stack_number, virtual_stack_number, first_stack_id, second_stack_id)
    VALUES (v_yard_id, 15, 17, 16, v_stack_15_id, v_stack_17_id)
    ON CONFLICT (yard_id, first_stack_number, second_stack_number) DO NOTHING;
  END IF;

  -- S19 + S21 → S20
  IF v_stack_19_id IS NOT NULL AND v_stack_21_id IS NOT NULL THEN
    INSERT INTO stack_pairings (yard_id, first_stack_number, second_stack_number, virtual_stack_number, first_stack_id, second_stack_id)
    VALUES (v_yard_id, 19, 21, 20, v_stack_19_id, v_stack_21_id)
    ON CONFLICT (yard_id, first_stack_number, second_stack_number) DO NOTHING;
  END IF;

  -- S23 + S25 → S24
  IF v_stack_23_id IS NOT NULL AND v_stack_25_id IS NOT NULL THEN
    INSERT INTO stack_pairings (yard_id, first_stack_number, second_stack_number, virtual_stack_number, first_stack_id, second_stack_id)
    VALUES (v_yard_id, 23, 25, 24, v_stack_23_id, v_stack_25_id)
    ON CONFLICT (yard_id, first_stack_number, second_stack_number) DO NOTHING;
  END IF;

  -- S27 + S29 → S28
  IF v_stack_27_id IS NOT NULL AND v_stack_29_id IS NOT NULL THEN
    INSERT INTO stack_pairings (yard_id, first_stack_number, second_stack_number, virtual_stack_number, first_stack_id, second_stack_id)
    VALUES (v_yard_id, 27, 29, 28, v_stack_27_id, v_stack_29_id)
    ON CONFLICT (yard_id, first_stack_number, second_stack_number) DO NOTHING;
  END IF;

  RAISE NOTICE 'Stack pairings inserted successfully for yard %', v_yard_id;
END $$;
