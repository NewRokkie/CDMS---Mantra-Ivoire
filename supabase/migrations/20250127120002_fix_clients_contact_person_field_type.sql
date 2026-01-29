/*
  # Fix clients contact_person field type

  1. Changes
    - Change contact_person column from TEXT to JSONB to properly store structured contact data
    - Migrate existing text data to JSON format if needed

  2. Rationale
    - The frontend expects contact_person to be a structured object with name, email, phone, position
    - JSONB allows for proper querying and indexing of contact components
    - Prevents the raw JSON string display issue
*/

-- Fix contact_person field type
DO $$
BEGIN
  -- Check if contact_person column is TEXT type
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'clients' 
    AND column_name = 'contact_person' 
    AND data_type = 'text'
  ) THEN
    -- Create a temporary column for the new JSONB data
    ALTER TABLE clients ADD COLUMN contact_person_temp JSONB;
    
    -- Convert existing text contact_person to JSON format
    UPDATE clients 
    SET contact_person_temp = CASE
      -- If it's already valid JSON, parse it
      WHEN contact_person ~ '^{.*}$' THEN 
        CASE 
          WHEN contact_person::jsonb ? 'name' THEN contact_person::jsonb
          ELSE jsonb_build_object(
            'name', COALESCE(contact_person::jsonb->>'name', contact_person),
            'email', COALESCE(contact_person::jsonb->>'email', email, ''),
            'phone', COALESCE(contact_person::jsonb->>'phone', phone, ''),
            'position', COALESCE(contact_person::jsonb->>'position', '')
          )
        END
      -- If it's just a name string
      WHEN contact_person IS NOT NULL AND contact_person != '' THEN 
        jsonb_build_object(
          'name', contact_person,
          'email', COALESCE(email, ''),
          'phone', COALESCE(phone, ''),
          'position', ''
        )
      -- Default empty structure
      ELSE 
        jsonb_build_object(
          'name', '',
          'email', COALESCE(email, ''),
          'phone', COALESCE(phone, ''),
          'position', ''
        )
    END;
    
    -- Drop the old column and rename the new one
    ALTER TABLE clients DROP COLUMN contact_person;
    ALTER TABLE clients RENAME COLUMN contact_person_temp TO contact_person;
    
    -- Set default value for new records
    ALTER TABLE clients ALTER COLUMN contact_person SET DEFAULT '{"name":"","email":"","phone":"","position":""}'::jsonb;
  END IF;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN clients.contact_person IS 'Structured contact person data stored as JSONB';