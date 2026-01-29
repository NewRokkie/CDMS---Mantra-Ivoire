-- Script to verify address data structure after migration
-- Run this after applying the migration to check the results

-- Check all client addresses
SELECT 
    id,
    name,
    code,
    address,
    billing_address,
    -- Check if address has proper structure
    CASE 
        WHEN address ? 'street' AND address ? 'city' AND address ? 'state' AND address ? 'zipCode' AND address ? 'country' 
        THEN 'VALID'
        ELSE 'INVALID'
    END as address_structure,
    -- Check if billing address has proper structure (if exists)
    CASE 
        WHEN billing_address IS NULL THEN 'N/A'
        WHEN billing_address ? 'street' AND billing_address ? 'city' AND billing_address ? 'state' AND billing_address ? 'zipCode' AND billing_address ? 'country' 
        THEN 'VALID'
        ELSE 'INVALID'
    END as billing_address_structure,
    -- Check for nested JSON in street field
    CASE 
        WHEN address->>'street' ~ '^{.*}$' THEN 'NESTED_JSON_DETECTED'
        ELSE 'CLEAN'
    END as street_field_status
FROM clients
ORDER BY name;

-- Summary statistics
SELECT 
    COUNT(*) as total_clients,
    COUNT(CASE WHEN address ? 'street' AND address ? 'city' AND address ? 'state' AND address ? 'zipCode' AND address ? 'country' THEN 1 END) as valid_addresses,
    COUNT(CASE WHEN address->>'street' ~ '^{.*}$' THEN 1 END) as nested_json_addresses,
    COUNT(CASE WHEN billing_address IS NOT NULL THEN 1 END) as clients_with_billing_address
FROM clients;

-- Show any remaining problematic addresses
SELECT 
    id,
    name,
    address,
    'Nested JSON in street field' as issue
FROM clients 
WHERE address->>'street' ~ '^{.*}$'

UNION ALL

SELECT 
    id,
    name,
    address,
    'Missing required fields' as issue
FROM clients 
WHERE address IS NOT NULL 
AND NOT (address ? 'street' AND address ? 'city' AND address ? 'state' AND address ? 'zipCode' AND address ? 'country');