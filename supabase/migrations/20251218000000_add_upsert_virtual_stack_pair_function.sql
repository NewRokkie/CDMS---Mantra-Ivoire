-- Create upsert function for virtual stack pairs to handle race conditions
-- This function will insert a new virtual stack pair or return the existing one

CREATE OR REPLACE FUNCTION upsert_virtual_stack_pair(
  p_yard_id TEXT,
  p_stack1_id UUID,
  p_stack2_id UUID,
  p_virtual_stack_number INTEGER
)
RETURNS TABLE (
  id UUID,
  yard_id TEXT,
  stack1_id UUID,
  stack2_id UUID,
  virtual_stack_number INTEGER,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
DECLARE
  existing_pair_id UUID;
BEGIN
  -- First, try to find existing pair with both possible orderings
  SELECT vsp.id INTO existing_pair_id
  FROM virtual_stack_pairs vsp
  WHERE vsp.yard_id = p_yard_id
    AND vsp.is_active = true
    AND (
      (vsp.stack1_id = p_stack1_id AND vsp.stack2_id = p_stack2_id) OR
      (vsp.stack1_id = p_stack2_id AND vsp.stack2_id = p_stack1_id)
    )
  LIMIT 1;

  -- If existing pair found, return it
  IF existing_pair_id IS NOT NULL THEN
    RETURN QUERY
    SELECT vsp.id, vsp.yard_id, vsp.stack1_id, vsp.stack2_id, 
           vsp.virtual_stack_number, vsp.is_active, vsp.created_at, vsp.updated_at
    FROM virtual_stack_pairs vsp
    WHERE vsp.id = existing_pair_id;
    RETURN;
  END IF;

  -- Try to insert new pair
  BEGIN
    INSERT INTO virtual_stack_pairs (
      yard_id, stack1_id, stack2_id, virtual_stack_number, is_active
    ) VALUES (
      p_yard_id, p_stack1_id, p_stack2_id, p_virtual_stack_number, true
    );
    
    -- Return the newly inserted pair
    RETURN QUERY
    SELECT vsp.id, vsp.yard_id, vsp.stack1_id, vsp.stack2_id, 
           vsp.virtual_stack_number, vsp.is_active, vsp.created_at, vsp.updated_at
    FROM virtual_stack_pairs vsp
    WHERE vsp.yard_id = p_yard_id
      AND vsp.stack1_id = p_stack1_id
      AND vsp.stack2_id = p_stack2_id
      AND vsp.is_active = true
    ORDER BY vsp.created_at DESC
    LIMIT 1;
    
  EXCEPTION WHEN unique_violation THEN
    -- If unique constraint violation occurs, find and return the existing pair
    -- This handles the race condition where another process inserted the same pair
    SELECT vsp.id INTO existing_pair_id
    FROM virtual_stack_pairs vsp
    WHERE vsp.yard_id = p_yard_id
      AND vsp.is_active = true
      AND (
        (vsp.stack1_id = p_stack1_id AND vsp.stack2_id = p_stack2_id) OR
        (vsp.stack1_id = p_stack2_id AND vsp.stack2_id = p_stack1_id)
      )
    LIMIT 1;

    IF existing_pair_id IS NOT NULL THEN
      RETURN QUERY
      SELECT vsp.id, vsp.yard_id, vsp.stack1_id, vsp.stack2_id, 
             vsp.virtual_stack_number, vsp.is_active, vsp.created_at, vsp.updated_at
      FROM virtual_stack_pairs vsp
      WHERE vsp.id = existing_pair_id;
    ELSE
      -- This should not happen, but just in case
      RAISE EXCEPTION 'Failed to create or find virtual stack pair';
    END IF;
  END;
END;
$$;