/*
  # Add row-tier configuration to stacks

  1. Changes
    - Add `row_tier_config` JSONB column to store per-row tier limits
    - This allows different rows to have different maximum tier heights
    
  2. Structure
    The row_tier_config will be a JSON array like:
    [
      { "row": 1, "maxTiers": 5 },
      { "row": 2, "maxTiers": 4 },
      { "row": 3, "maxTiers": 5 },
      { "row": 4, "maxTiers": 5 }
    ]
    
  3. Backward Compatibility
    - If row_tier_config is NULL, use the max_tiers value for all rows
    - Existing stacks will continue to work with uniform tier heights
*/

-- Add row_tier_config column
ALTER TABLE stacks 
ADD COLUMN IF NOT EXISTS row_tier_config JSONB;

-- Add index for JSONB queries
CREATE INDEX IF NOT EXISTS idx_stacks_row_tier_config ON stacks USING GIN (row_tier_config);

-- Add comment explaining the structure
COMMENT ON COLUMN stacks.row_tier_config IS 
'Per-row tier configuration as JSON array: [{"row": 1, "maxTiers": 5}, {"row": 2, "maxTiers": 4}, ...]';

-- Example: Update Stack 01 (depot-tantarelli) with custom row-tier config
-- Row 1: 5 tiers, Row 2: 4 tiers, Row 3: 5 tiers, Row 4: 5 tiers
UPDATE stacks
SET row_tier_config = '[
  {"row": 1, "maxTiers": 5},
  {"row": 2, "maxTiers": 4},
  {"row": 3, "maxTiers": 5},
  {"row": 4, "maxTiers": 5}
]'::jsonb
WHERE yard_id = 'depot-tantarelli' 
  AND stack_number = 1;

-- Function to calculate capacity based on row_tier_config
CREATE OR REPLACE FUNCTION calculate_stack_capacity(
  p_rows INTEGER,
  p_max_tiers INTEGER,
  p_row_tier_config JSONB
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  total_capacity INTEGER := 0;
  row_config JSONB;
  row_num INTEGER;
  row_tiers INTEGER;
BEGIN
  -- If no custom config, use uniform tiers
  IF p_row_tier_config IS NULL THEN
    RETURN p_rows * p_max_tiers;
  END IF;
  
  -- Calculate capacity from row_tier_config
  FOR row_config IN SELECT * FROM jsonb_array_elements(p_row_tier_config)
  LOOP
    row_num := (row_config->>'row')::INTEGER;
    row_tiers := (row_config->>'maxTiers')::INTEGER;
    
    -- Only count rows that are within the stack's row count
    IF row_num <= p_rows THEN
      total_capacity := total_capacity + row_tiers;
    END IF;
  END LOOP;
  
  -- If config doesn't cover all rows, add remaining rows with default max_tiers
  IF jsonb_array_length(p_row_tier_config) < p_rows THEN
    total_capacity := total_capacity + 
      (p_rows - jsonb_array_length(p_row_tier_config)) * p_max_tiers;
  END IF;
  
  RETURN total_capacity;
END;
$$;

-- Trigger to automatically update capacity when row_tier_config changes
CREATE OR REPLACE FUNCTION update_stack_capacity_on_config_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Recalculate capacity based on row_tier_config
  NEW.capacity := calculate_stack_capacity(
    NEW.rows,
    NEW.max_tiers,
    NEW.row_tier_config
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_stack_capacity ON stacks;
CREATE TRIGGER trigger_update_stack_capacity
  BEFORE INSERT OR UPDATE OF rows, max_tiers, row_tier_config
  ON stacks
  FOR EACH ROW
  EXECUTE FUNCTION update_stack_capacity_on_config_change();

-- Update existing stacks to recalculate capacity
UPDATE stacks
SET capacity = calculate_stack_capacity(rows, max_tiers, row_tier_config);
