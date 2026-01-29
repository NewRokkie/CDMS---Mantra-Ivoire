/*
  # Fix Tantarelli Stack Numbers

  1. Purpose
    - Update stack numbers to match Tantarelli layout (only odd numbers with specific pairing)
    - Mark special stacks (1, 31, 101, 103)
    - Remove even-numbered stacks that don't exist physically

  2. Changes
    - Delete stacks that shouldn't exist in Tantarelli layout
    - Keep only: 1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31, 33, 35, 37, 39, 41, 43, 45, 47, 49
    - Mark stacks 1 and 31 as special (cannot be paired)
    - Update positions to reflect actual layout

  3. Valid Pairs
    - Zone 1: 03+05, 07+09, 11+13, 15+17, 19+21, 23+25, 27+29
    - Zone 2: 33+35, 37+39, 41+43, 45+47, 49+... (extendable)
*/

DO $$
DECLARE
  tantarelli_stacks INTEGER[] := ARRAY[1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31, 33, 35, 37, 39, 41, 43, 45, 47, 49];
  special_stacks INTEGER[] := ARRAY[1, 31];
  yard_exists BOOLEAN;
BEGIN
  -- Check if  exists
  SELECT EXISTS(SELECT 1 FROM stacks WHERE yard_id = '2554a779-a14b-45ed-a1e1-684e2fd9b614') INTO yard_exists;

  IF yard_exists THEN
    -- Delete stacks that don't belong in Tantarelli layout
    DELETE FROM stacks
    WHERE yard_id = '2554a779-a14b-45ed-a1e1-684e2fd9b614'
    AND stack_number != ALL(tantarelli_stacks);

    -- Mark special stacks
    UPDATE stacks
    SET is_special_stack = true
    WHERE yard_id = '2554a779-a14b-45ed-a1e1-684e2fd9b614'
    AND stack_number = ANY(special_stacks);

    -- Update is_odd_stack for all odd numbers
    UPDATE stacks
    SET is_odd_stack = true
    WHERE yard_id = '2554a779-a14b-45ed-a1e1-684e2fd9b614'
    AND stack_number % 2 = 1;

    -- Update section names based on stack ranges
    UPDATE stacks
    SET section_name = CASE
      WHEN stack_number >= 1 AND stack_number <= 29 THEN 'Zone A'
      WHEN stack_number >= 31 AND stack_number <= 55 THEN 'Zone A'
      ELSE 'Zone B'
    END
    WHERE yard_id = '2554a779-a14b-45ed-a1e1-684e2fd9b614';

    RAISE NOTICE 'Updated Tantarelli stacks - kept only valid odd-numbered stacks and marked special stacks';
  ELSE
    RAISE NOTICE 'No stacks found for , skipping fix';
  END IF;
END $$;
