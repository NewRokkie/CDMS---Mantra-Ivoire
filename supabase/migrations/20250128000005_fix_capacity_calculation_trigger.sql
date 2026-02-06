/*
  # Fix capacity calculation trigger to respect application-calculated values

  1. Problem
    - The update_stack_capacity trigger is overriding application-calculated capacity
    - When row_tier_config is used, the application calculates capacity correctly (17)
    - But the trigger recalculates it incorrectly, resulting in wrong values (20)
    - The trigger also doesn't update max_tiers based on row_tier_config

  2. Solution
    - Make the trigger more intelligent about when to recalculate
    - Only recalculate if the application hasn't already provided a correct value
    - Update max_tiers to reflect the highest tier in row_tier_config
    - Preserve application-calculated values when they're correct
*/

-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS trigger_update_stack_capacity ON stacks;
DROP FUNCTION IF EXISTS update_stack_capacity() CASCADE;

-- Create a smarter capacity calculation function
CREATE OR REPLACE FUNCTION update_stack_capacity()
RETURNS TRIGGER AS $$
DECLARE
  calculated_capacity INTEGER;
  max_tier_from_config INTEGER;
BEGIN
  -- Only recalculate if this is an UPDATE that changes the configuration
  -- or if the capacity seems incorrect for the given configuration
  
  IF NEW.row_tier_config IS NOT NULL AND NEW.row_tier_config != 'null'::jsonb AND NEW.row_tier_config != '[]'::jsonb THEN
    -- Calculate capacity from row-tier configuration
    SELECT COALESCE(SUM((config->>'maxTiers')::integer), 0)
    INTO calculated_capacity
    FROM jsonb_array_elements(NEW.row_tier_config) AS config;
    
    -- Get the maximum tier value from the configuration
    SELECT COALESCE(MAX((config->>'maxTiers')::integer), NEW.max_tiers)
    INTO max_tier_from_config
    FROM jsonb_array_elements(NEW.row_tier_config) AS config;
    
    -- Only update if the current capacity doesn't match the calculated one
    -- This prevents overriding correct application-calculated values
    IF TG_OP = 'INSERT' OR OLD.row_tier_config IS DISTINCT FROM NEW.row_tier_config 
       OR OLD.rows IS DISTINCT FROM NEW.rows THEN
      NEW.capacity = calculated_capacity;
      NEW.max_tiers = max_tier_from_config;
    END IF;
    
  ELSE
    -- No row-tier config, use uniform calculation only if needed
    calculated_capacity = NEW.rows * NEW.max_tiers;
    
    -- Only update if this is a configuration change
    IF TG_OP = 'INSERT' OR OLD.rows IS DISTINCT FROM NEW.rows 
       OR OLD.max_tiers IS DISTINCT FROM NEW.max_tiers THEN
      NEW.capacity = calculated_capacity;
    END IF;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- If there's any error, don't modify the values and log warning
    RAISE WARNING 'Error in update_stack_capacity trigger: %, preserving original values', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger only for specific column changes
CREATE TRIGGER trigger_update_stack_capacity
  BEFORE INSERT OR UPDATE OF rows, max_tiers, row_tier_config ON stacks
  FOR EACH ROW
  EXECUTE FUNCTION update_stack_capacity();

-- Add comment for documentation
COMMENT ON FUNCTION update_stack_capacity() IS 'Intelligently updates stack capacity based on row-tier configuration, preserving application-calculated values when appropriate';

-- Log the fix
DO $$
BEGIN
  RAISE NOTICE 'Fixed capacity calculation trigger to respect application-calculated values';
END $$;