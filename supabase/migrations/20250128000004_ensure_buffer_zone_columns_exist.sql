/*
  # Ensure buffer zone columns exist with proper defaults

  1. Problem
    - The "cannot extract elements from a scalar" error might be due to missing columns
    - Need to ensure all buffer zone columns exist with proper defaults
    - Some environments might not have the buffer zone columns yet

  2. Solution
    - Add buffer zone columns if they don't exist
    - Set proper defaults for existing records
    - Ensure JSONB columns have valid default values
*/

-- Add buffer zone columns if they don't exist
DO $$
BEGIN
  -- Add is_buffer_zone column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'stacks' AND column_name = 'is_buffer_zone'
  ) THEN
    ALTER TABLE stacks ADD COLUMN is_buffer_zone BOOLEAN DEFAULT false;
    RAISE NOTICE 'Added is_buffer_zone column';
  END IF;

  -- Add buffer_zone_type column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'stacks' AND column_name = 'buffer_zone_type'
  ) THEN
    ALTER TABLE stacks ADD COLUMN buffer_zone_type TEXT;
    RAISE NOTICE 'Added buffer_zone_type column';
  END IF;

  -- Add damage_types_supported column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'stacks' AND column_name = 'damage_types_supported'
  ) THEN
    ALTER TABLE stacks ADD COLUMN damage_types_supported JSONB DEFAULT '[]'::jsonb;
    RAISE NOTICE 'Added damage_types_supported column';
  END IF;
END $$;

-- Ensure all existing records have proper defaults
UPDATE stacks 
SET 
  is_buffer_zone = COALESCE(is_buffer_zone, false),
  damage_types_supported = COALESCE(damage_types_supported, '[]'::jsonb)
WHERE 
  is_buffer_zone IS NULL 
  OR damage_types_supported IS NULL;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_stacks_is_buffer_zone ON stacks(is_buffer_zone) WHERE is_buffer_zone = true;
CREATE INDEX IF NOT EXISTS idx_stacks_buffer_zone_type ON stacks(buffer_zone_type) WHERE buffer_zone_type IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN stacks.is_buffer_zone IS 'Indicates if this stack is a buffer zone for damaged containers';
COMMENT ON COLUMN stacks.buffer_zone_type IS 'Type of buffer zone (damage, maintenance, quarantine, etc.)';
COMMENT ON COLUMN stacks.damage_types_supported IS 'Types of damage supported by this buffer zone (JSONB array)';

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Buffer zone columns ensured with proper defaults';
END $$;