/*
  # Fix clients address field type

  1. Changes
    - Change address column from TEXT to JSONB to properly store structured address data
    - Migrate existing text data to JSON format if needed

  2. Rationale
    - The frontend expects address to be a structured object
    - JSONB allows for proper querying and indexing of address components
    - Matches the pattern used for billing_address
*/

-- First, let's check if there's any existing data and convert it
DO $$
BEGIN
  -- Check if address column is TEXT type
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'clients' 
    AND column_name = 'address' 
    AND data_type = 'text'
  ) THEN
    -- Create a temporary column for the new JSONB data
    ALTER TABLE clients ADD COLUMN address_temp JSONB;
    
    -- Convert existing text addresses to JSON format
    -- This assumes existing addresses are simple text strings
    UPDATE clients 
    SET address_temp = jsonb_build_object(
      'street', COALESCE(address, ''),
      'city', '',
      'state', '',
      'zipCode', '',
      'country', 'Côte d''Ivoire'
    )
    WHERE address IS NOT NULL AND address != '';
    
    -- Set default JSON structure for empty addresses
    UPDATE clients 
    SET address_temp = jsonb_build_object(
      'street', '',
      'city', '',
      'state', '',
      'zipCode', '',
      'country', 'Côte d''Ivoire'
    )
    WHERE address IS NULL OR address = '';
    
    -- Drop the old column and rename the new one
    ALTER TABLE clients DROP COLUMN address;
    ALTER TABLE clients RENAME COLUMN address_temp TO address;
    
    -- Set NOT NULL constraint
    ALTER TABLE clients ALTER COLUMN address SET NOT NULL;
    
    -- Set default value for new records
    ALTER TABLE clients ALTER COLUMN address SET DEFAULT '{"street":"","city":"","state":"","zipCode":"","country":"Côte d''Ivoire"}'::jsonb;
  END IF;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN clients.address IS 'Structured address data stored as JSONB';