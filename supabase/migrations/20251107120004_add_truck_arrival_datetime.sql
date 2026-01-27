/*
  # Add Truck Arrival Date/Time to Gate In Operations

  ## Changes
  1. Add truck_arrival_date and truck_arrival_time to gate_in_operations table
  2. These fields capture when the truck actually arrived at the gate
  3. This is different from created_at which is when the record was created in the system

  ## Notes
  - truck_arrival_date: Date when truck arrived (YYYY-MM-DD)
  - truck_arrival_time: Time when truck arrived (HH:MM)
  - These fields are used to set the actual gate_in_date for containers
*/

-- Add truck arrival date and time fields to gate_in_operations
ALTER TABLE gate_in_operations 
ADD COLUMN IF NOT EXISTS truck_arrival_date date,
ADD COLUMN IF NOT EXISTS truck_arrival_time time;

-- Create index for querying by arrival date
CREATE INDEX IF NOT EXISTS idx_gate_in_operations_truck_arrival_date 
ON gate_in_operations(truck_arrival_date);

-- Update existing records to use created_at as truck_arrival_date if not set
UPDATE gate_in_operations 
SET truck_arrival_date = created_at::date,
    truck_arrival_time = created_at::time
WHERE truck_arrival_date IS NULL;

-- Add comments
COMMENT ON COLUMN gate_in_operations.truck_arrival_date IS 'Date when the truck arrived at the gate (YYYY-MM-DD)';
COMMENT ON COLUMN gate_in_operations.truck_arrival_time IS 'Time when the truck arrived at the gate (HH:MM)';
