/*
  # Add is_special_stack field to stacks table

  1. Changes
    - Add `is_special_stack` boolean column to stacks table
    - Default value: false
    - Purpose: Mark stacks that cannot be paired with adjacent stacks for 40ft containers

  2. Business Rules
    - Special stacks CANNOT be paired with any other stack
    - Special stacks can only accept 20ft containers
    - Regular stacks can be paired with adjacent stacks (odd with even, even with odd)
    - Example: If Stack 01 is special, it cannot pair with Stack 02 even though they are adjacent

  3. Notes
    - This field is distinct from `is_odd_stack` which is used for pairing logic
    - `is_odd_stack` indicates the mathematical oddness (for pairing algorithm)
    - `is_special_stack` indicates a business rule restriction
*/

-- Add is_special_stack column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stacks' AND column_name = 'is_special_stack'
  ) THEN
    ALTER TABLE stacks
      ADD COLUMN is_special_stack BOOLEAN DEFAULT false NOT NULL;

    RAISE NOTICE 'Added is_special_stack column to stacks table';
  END IF;
END $$;
