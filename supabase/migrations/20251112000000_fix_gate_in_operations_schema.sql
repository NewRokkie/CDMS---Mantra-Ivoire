/*
  # Fix Gate In Operations Table Schema

  ## Issues Found
  1. Missing 'classification' column (referenced in code as 'divers' or 'alimentaire')
  2. Missing damage assessment columns (damage_assessment_stage, damage_assessed_by, damage_assessed_at, damage_type)
  3. Missing container_quantity column (for tracking 1 or 2 containers per operation)
  4. Missing second_container_number column (for paired 20ft containers)
  5. Missing container_quantity field in pending operations

  ## Changes
  1. Add classification column with check constraint
  2. Add damage assessment tracking columns
  3. Add container_quantity column
  4. Add second_container_number column
  5. Create indexes for better query performance
  6. Update existing records with default values

  ## Notes
  - classification: 'divers' (default) or 'alimentaire' (food-grade containers)
  - damage_assessment_stage: 'assignment' (during location assignment) or 'inspection' (during inspection)
  - container_quantity: 1 or 2 (number of containers in this operation)
  - second_container_number: for operations with 2 containers (20ft only)
*/

-- Add classification column to gate_in_operations
ALTER TABLE gate_in_operations 
ADD COLUMN IF NOT EXISTS classification text CHECK (classification IN ('divers', 'alimentaire')) DEFAULT 'divers';

-- Add classification column to containers table (also missing)
ALTER TABLE containers 
ADD COLUMN IF NOT EXISTS classification text CHECK (classification IN ('divers', 'alimentaire')) DEFAULT 'divers';

-- Add damage assessment columns
ALTER TABLE gate_in_operations 
ADD COLUMN IF NOT EXISTS damage_assessment_stage text CHECK (damage_assessment_stage IN ('assignment', 'inspection')),
ADD COLUMN IF NOT EXISTS damage_assessed_by text,
ADD COLUMN IF NOT EXISTS damage_assessed_at timestamptz,
ADD COLUMN IF NOT EXISTS damage_type text;

-- Add container quantity and second container number
ALTER TABLE gate_in_operations 
ADD COLUMN IF NOT EXISTS container_quantity integer DEFAULT 1 CHECK (container_quantity IN (1, 2)),
ADD COLUMN IF NOT EXISTS second_container_number text;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_gate_in_operations_classification ON gate_in_operations(classification);
CREATE INDEX IF NOT EXISTS idx_gate_in_operations_container_quantity ON gate_in_operations(container_quantity);
CREATE INDEX IF NOT EXISTS idx_gate_in_operations_second_container_number ON gate_in_operations(second_container_number);
CREATE INDEX IF NOT EXISTS idx_gate_in_operations_damage_assessment_stage ON gate_in_operations(damage_assessment_stage);
CREATE INDEX IF NOT EXISTS idx_containers_classification ON containers(classification);

-- Update existing records with default classification
UPDATE gate_in_operations 
SET classification = 'divers' 
WHERE classification IS NULL;

UPDATE containers 
SET classification = 'divers' 
WHERE classification IS NULL;

-- Update existing records with default container_quantity
UPDATE gate_in_operations 
SET container_quantity = 1 
WHERE container_quantity IS NULL;

-- Set damage_assessment_stage for existing records that have damage reported
UPDATE gate_in_operations 
SET damage_assessment_stage = 'assignment',
    damage_assessed_at = completed_at
WHERE damage_reported = true 
  AND damage_assessment_stage IS NULL
  AND completed_at IS NOT NULL;

-- Add comments to columns
COMMENT ON COLUMN gate_in_operations.classification IS 'Container classification: divers (general) or alimentaire (food-grade)';
COMMENT ON COLUMN gate_in_operations.damage_assessment_stage IS 'When damage was assessed: assignment (during location assignment) or inspection (during inspection)';
COMMENT ON COLUMN gate_in_operations.damage_assessed_by IS 'User who assessed the damage';
COMMENT ON COLUMN gate_in_operations.damage_assessed_at IS 'Timestamp when damage was assessed';
COMMENT ON COLUMN gate_in_operations.damage_type IS 'Type of damage reported';
COMMENT ON COLUMN gate_in_operations.container_quantity IS 'Number of containers in this operation (1 or 2)';
COMMENT ON COLUMN gate_in_operations.second_container_number IS 'Second container number for operations with 2 containers (20ft only)';
COMMENT ON COLUMN containers.classification IS 'Container classification: divers (general) or alimentaire (food-grade)';

-- Add constraint to ensure second_container_number is only set when container_quantity is 2
ALTER TABLE gate_in_operations 
ADD CONSTRAINT check_second_container_number 
CHECK (
  (container_quantity = 2 AND second_container_number IS NOT NULL) OR
  (container_quantity = 1 AND second_container_number IS NULL) OR
  (container_quantity = 2 AND second_container_number IS NULL) -- Allow NULL during creation
);

-- Add constraint to ensure 40ft containers can only have quantity of 1
ALTER TABLE gate_in_operations 
ADD CONSTRAINT check_40ft_single_container 
CHECK (
  (container_size = '40ft' AND container_quantity = 1) OR
  (container_size != '40ft')
);

-- Fix RLS Policies - Add missing UPDATE policy for gate_in_operations
-- This is critical for the pending operations flow where location assignment updates the record
CREATE POLICY "Operators can update gate in operations"
  ON gate_in_operations FOR UPDATE
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

