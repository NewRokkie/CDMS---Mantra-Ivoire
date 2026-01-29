/*
  # Fix client_pools and stack_assignments yard_id type

  1. Changes
    - Change client_pools.yard_id from UUID to TEXT for consistency with containers, gate_in_operations, gate_out_operations
    - Change stack_assignments.yard_id from UUID to TEXT for consistency

  2. Reason
    - All other tables use TEXT for yard_id
    - The application uses string identifiers like ''
    - UUID type was causing errors when querying with string yard IDs
*/

-- Drop foreign key constraints if any exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_client_pools_yard' 
    AND table_name = 'client_pools'
  ) THEN
    ALTER TABLE client_pools DROP CONSTRAINT fk_client_pools_yard;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_stack_assignments_yard' 
    AND table_name = 'stack_assignments'
  ) THEN
    ALTER TABLE stack_assignments DROP CONSTRAINT fk_stack_assignments_yard;
  END IF;
END $$;

-- Change client_pools.yard_id from UUID to TEXT
ALTER TABLE client_pools 
  ALTER COLUMN yard_id TYPE TEXT USING yard_id::TEXT;

-- Change stack_assignments.yard_id from UUID to TEXT
ALTER TABLE stack_assignments 
  ALTER COLUMN yard_id TYPE TEXT USING yard_id::TEXT;