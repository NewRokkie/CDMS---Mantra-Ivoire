-- Migration: Add time tracking fields for Gate In/Gate Out operations
-- Purpose: Track operation durations for performance reporting

-- Add time tracking columns to gate_in_operations
ALTER TABLE gate_in_operations ADD COLUMN IF NOT EXISTS 
  damage_assessment_started_at timestamptz;
ALTER TABLE gate_in_operations ADD COLUMN IF NOT EXISTS 
  damage_assessment_completed_at timestamptz;
ALTER TABLE gate_in_operations ADD COLUMN IF NOT EXISTS 
  location_assignment_started_at timestamptz;
ALTER TABLE gate_in_operations ADD COLUMN IF NOT EXISTS 
  location_assignment_completed_at timestamptz;
ALTER TABLE gate_in_operations ADD COLUMN IF NOT EXISTS 
  edi_processing_started_at timestamptz;

-- Add time tracking columns to gate_out_operations
ALTER TABLE gate_out_operations ADD COLUMN IF NOT EXISTS 
  container_selection_started_at timestamptz;
ALTER TABLE gate_out_operations ADD COLUMN IF NOT EXISTS 
  container_selection_completed_at timestamptz;
ALTER TABLE gate_out_operations ADD COLUMN IF NOT EXISTS 
  edi_processing_started_at timestamptz;

-- Create indexes for performance on time tracking queries
CREATE INDEX IF NOT EXISTS idx_gate_in_damage_assessment_duration 
  ON gate_in_operations(damage_assessment_started_at, damage_assessment_completed_at)
  WHERE damage_assessment_started_at IS NOT NULL AND damage_assessment_completed_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_gate_in_location_assignment_duration 
  ON gate_in_operations(location_assignment_started_at, location_assignment_completed_at)
  WHERE location_assignment_started_at IS NOT NULL AND location_assignment_completed_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_gate_in_edi_processing_duration 
  ON gate_in_operations(edi_processing_started_at, edi_transmission_date)
  WHERE edi_processing_started_at IS NOT NULL AND edi_transmission_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_gate_out_container_selection_duration 
  ON gate_out_operations(container_selection_started_at, container_selection_completed_at)
  WHERE container_selection_started_at IS NOT NULL AND container_selection_completed_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_gate_out_edi_processing_duration 
  ON gate_out_operations(edi_processing_started_at, edi_transmission_date)
  WHERE edi_processing_started_at IS NOT NULL AND edi_transmission_date IS NOT NULL;

-- Create indexes for overall operation duration queries
CREATE INDEX IF NOT EXISTS idx_gate_in_total_duration 
  ON gate_in_operations(created_at, completed_at)
  WHERE completed_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_gate_out_total_duration 
  ON gate_out_operations(created_at, completed_at)
  WHERE completed_at IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN gate_in_operations.damage_assessment_started_at IS 'Timestamp when damage assessment modal opened';
COMMENT ON COLUMN gate_in_operations.damage_assessment_completed_at IS 'Timestamp when damage assessment was submitted';
COMMENT ON COLUMN gate_in_operations.location_assignment_started_at IS 'Timestamp when location selection began';
COMMENT ON COLUMN gate_in_operations.location_assignment_completed_at IS 'Timestamp when location was assigned';
COMMENT ON COLUMN gate_in_operations.edi_processing_started_at IS 'Timestamp when EDI processing began';

COMMENT ON COLUMN gate_out_operations.container_selection_started_at IS 'Timestamp when container selection began';
COMMENT ON COLUMN gate_out_operations.container_selection_completed_at IS 'Timestamp when all containers were selected';
COMMENT ON COLUMN gate_out_operations.edi_processing_started_at IS 'Timestamp when EDI processing began';