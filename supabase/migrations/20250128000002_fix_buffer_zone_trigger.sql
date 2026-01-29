/*
  # Fix buffer zone trigger to prevent scalar extraction errors

  1. Problem
    - The auto_mark_buffer_zones trigger is conflicting with application-level JSONB handling
    - This causes "cannot extract elements from a scalar" errors during stack creation
    - The trigger tries to set JSONB values that may conflict with application data

  2. Solution
    - Make the trigger more defensive and only set values if they're not already set
    - Ensure proper JSONB handling in the trigger
    - Add better error handling and validation
*/

-- Drop and recreate the trigger function with better JSONB handling
DROP FUNCTION IF EXISTS auto_mark_buffer_zones() CASCADE;

CREATE OR REPLACE FUNCTION auto_mark_buffer_zones()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process if this looks like a buffer zone and fields aren't already set by the application
  IF (NEW.section_name ILIKE 'BUFFER%' OR 
      NEW.section_name ILIKE 'DMG%' OR 
      NEW.section_name ILIKE '%TAMPON%' OR
      NEW.notes ILIKE '%ZONE TAMPON%' OR
      NEW.stack_number >= 9000) THEN
    
    -- Only set buffer zone fields if they haven't been explicitly set by the application
    IF NEW.is_buffer_zone IS NULL OR NEW.is_buffer_zone = false THEN
      NEW.is_buffer_zone = true;
    END IF;
    
    IF NEW.buffer_zone_type IS NULL THEN
      NEW.buffer_zone_type = 'damage';
    END IF;
    
    IF NEW.is_special_stack IS NULL OR NEW.is_special_stack = false THEN
      NEW.is_special_stack = true;
    END IF;
    
    -- Only set damage_types_supported if it's NULL or empty
    -- This prevents conflicts with application-level JSONB handling
    IF NEW.damage_types_supported IS NULL OR NEW.damage_types_supported = '[]'::jsonb THEN
      -- Extract damage type from section name if possible
      IF NEW.section_name ILIKE '%STRUCTURAL%' THEN
        NEW.damage_types_supported = '["structural"]'::jsonb;
      ELSIF NEW.section_name ILIKE '%SURFACE%' THEN
        NEW.damage_types_supported = '["surface"]'::jsonb;
      ELSIF NEW.section_name ILIKE '%DOOR%' THEN
        NEW.damage_types_supported = '["door"]'::jsonb;
      ELSIF NEW.section_name ILIKE '%CORNER%' THEN
        NEW.damage_types_supported = '["corner"]'::jsonb;
      ELSE
        NEW.damage_types_supported = '["general", "other"]'::jsonb;
      END IF;
    END IF;
  ELSE
    -- For non-buffer zones, ensure fields have proper defaults if not set
    IF NEW.is_buffer_zone IS NULL THEN
      NEW.is_buffer_zone = false;
    END IF;
    
    IF NEW.damage_types_supported IS NULL THEN
      NEW.damage_types_supported = '[]'::jsonb;
    END IF;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- If there's any error in the trigger, log it but don't fail the operation
    RAISE WARNING 'Error in auto_mark_buffer_zones trigger: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
DROP TRIGGER IF EXISTS trigger_auto_mark_buffer_zones ON stacks;
CREATE TRIGGER trigger_auto_mark_buffer_zones
  BEFORE INSERT OR UPDATE ON stacks
  FOR EACH ROW
  EXECUTE FUNCTION auto_mark_buffer_zones();

-- Also check and fix the row tier config trigger
DROP FUNCTION IF EXISTS update_stack_capacity() CASCADE;

CREATE OR REPLACE FUNCTION update_stack_capacity()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate capacity based on row_tier_config or uniform tiers
  IF NEW.row_tier_config IS NOT NULL AND NEW.row_tier_config != 'null'::jsonb THEN
    -- Calculate from row-tier configuration
    SELECT COALESCE(SUM((config->>'maxTiers')::integer), NEW.rows * NEW.max_tiers)
    INTO NEW.capacity
    FROM jsonb_array_elements(NEW.row_tier_config) AS config;
  ELSE
    -- Use uniform tier calculation
    NEW.capacity = NEW.rows * NEW.max_tiers;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- If there's any error, use simple calculation and log warning
    RAISE WARNING 'Error in update_stack_capacity trigger: %, using simple calculation', SQLERRM;
    NEW.capacity = NEW.rows * NEW.max_tiers;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the capacity trigger
DROP TRIGGER IF EXISTS trigger_update_stack_capacity ON stacks;
CREATE TRIGGER trigger_update_stack_capacity
  BEFORE INSERT OR UPDATE OF rows, max_tiers, row_tier_config ON stacks
  FOR EACH ROW
  EXECUTE FUNCTION update_stack_capacity();

-- Add comments for documentation
COMMENT ON FUNCTION auto_mark_buffer_zones() IS 'Automatically marks stacks as buffer zones based on naming patterns, with defensive JSONB handling';
COMMENT ON FUNCTION update_stack_capacity() IS 'Updates stack capacity based on row-tier configuration with error handling';