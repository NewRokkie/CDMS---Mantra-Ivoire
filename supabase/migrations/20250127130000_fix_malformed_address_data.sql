/*
  # Fix malformed address data in clients table

  1. Problem
    - Address data is stored with nested JSON strings in the street field
    - Structure: {"street": "{\"street\":\"...\",\"city\":\"...\"}", "city": "", ...}
    - This makes querying impossible and causes display issues

  2. Solution
    - Extract the actual address data from the nested JSON string
    - Properly structure the address JSONB field
    - Clean up any malformed data

  3. Process
    - Parse the nested JSON from the street field
    - Update the address field with proper structure
    - Handle edge cases and malformed data
*/

-- Fix malformed address data
DO $$
DECLARE
    client_record RECORD;
    parsed_address JSONB;
    nested_address_str TEXT;
BEGIN
    -- Loop through all clients with malformed address data
    FOR client_record IN 
        SELECT id, address 
        FROM clients 
        WHERE address IS NOT NULL 
        AND address::text != 'null'
    LOOP
        BEGIN
            -- Check if the street field contains nested JSON
            nested_address_str := client_record.address->>'street';
            
            -- If the street field looks like JSON, try to parse it
            IF nested_address_str IS NOT NULL 
               AND nested_address_str ~ '^{.*}$' 
               AND length(nested_address_str) > 10 THEN
                
                -- Parse the nested JSON from the street field
                parsed_address := nested_address_str::jsonb;
                
                -- Update the address with the properly parsed data
                UPDATE clients 
                SET address = jsonb_build_object(
                    'street', COALESCE(parsed_address->>'street', ''),
                    'city', COALESCE(parsed_address->>'city', ''),
                    'state', COALESCE(parsed_address->>'state', ''),
                    'zipCode', COALESCE(parsed_address->>'zipCode', ''),
                    'country', COALESCE(parsed_address->>'country', 'Côte d''Ivoire')
                )
                WHERE id = client_record.id;
                
                RAISE NOTICE 'Fixed address for client ID: %', client_record.id;
                
            -- If it's already properly structured, ensure all fields exist
            ELSIF client_record.address ? 'street' 
                  AND client_record.address ? 'city' 
                  AND NOT (client_record.address->>'street' ~ '^{.*}$') THEN
                
                -- Ensure all required fields exist with proper defaults
                UPDATE clients 
                SET address = jsonb_build_object(
                    'street', COALESCE(client_record.address->>'street', ''),
                    'city', COALESCE(client_record.address->>'city', ''),
                    'state', COALESCE(client_record.address->>'state', ''),
                    'zipCode', COALESCE(client_record.address->>'zipCode', ''),
                    'country', COALESCE(client_record.address->>'country', 'Côte d''Ivoire')
                )
                WHERE id = client_record.id;
                
            END IF;
            
        EXCEPTION WHEN OTHERS THEN
            -- If parsing fails, create a default structure with available data
            RAISE NOTICE 'Failed to parse address for client ID: %, Error: %', client_record.id, SQLERRM;
            
            UPDATE clients 
            SET address = jsonb_build_object(
                'street', COALESCE(client_record.address->>'street', ''),
                'city', COALESCE(client_record.address->>'city', ''),
                'state', COALESCE(client_record.address->>'state', ''),
                'zipCode', COALESCE(client_record.address->>'zipCode', ''),
                'country', 'Côte d''Ivoire'
            )
            WHERE id = client_record.id;
        END;
    END LOOP;
    
    -- Also fix billing_address if it has similar issues
    FOR client_record IN 
        SELECT id, billing_address 
        FROM clients 
        WHERE billing_address IS NOT NULL 
        AND billing_address::text != 'null'
    LOOP
        BEGIN
            nested_address_str := client_record.billing_address->>'street';
            
            IF nested_address_str IS NOT NULL 
               AND nested_address_str ~ '^{.*}$' 
               AND length(nested_address_str) > 10 THEN
                
                parsed_address := nested_address_str::jsonb;
                
                UPDATE clients 
                SET billing_address = jsonb_build_object(
                    'street', COALESCE(parsed_address->>'street', ''),
                    'city', COALESCE(parsed_address->>'city', ''),
                    'state', COALESCE(parsed_address->>'state', ''),
                    'zipCode', COALESCE(parsed_address->>'zipCode', ''),
                    'country', COALESCE(parsed_address->>'country', 'Côte d''Ivoire')
                )
                WHERE id = client_record.id;
                
                RAISE NOTICE 'Fixed billing address for client ID: %', client_record.id;
            END IF;
            
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Failed to parse billing address for client ID: %, Error: %', client_record.id, SQLERRM;
        END;
    END LOOP;
    
END $$;

-- Add a constraint to prevent future malformed data
-- This will ensure the address JSONB has the expected structure
ALTER TABLE clients 
ADD CONSTRAINT check_address_structure 
CHECK (
    address IS NULL OR (
        address ? 'street' AND
        address ? 'city' AND
        address ? 'state' AND
        address ? 'zipCode' AND
        address ? 'country'
    )
);

-- Add a constraint for billing_address as well
ALTER TABLE clients 
ADD CONSTRAINT check_billing_address_structure 
CHECK (
    billing_address IS NULL OR (
        billing_address ? 'street' AND
        billing_address ? 'city' AND
        billing_address ? 'state' AND
        billing_address ? 'zipCode' AND
        billing_address ? 'country'
    )
);

-- Add comments for documentation
COMMENT ON CONSTRAINT check_address_structure ON clients IS 'Ensures address JSONB has required fields: street, city, state, zipCode, country';
COMMENT ON CONSTRAINT check_billing_address_structure ON clients IS 'Ensures billing_address JSONB has required fields: street, city, state, zipCode, country';