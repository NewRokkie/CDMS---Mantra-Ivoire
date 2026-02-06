-- Script to check if all client table columns exist and their data types
-- Run this to verify the database schema

-- Check all columns in the clients table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'clients' 
ORDER BY ordinal_position;

-- Specifically check for the financial fields
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    CASE 
        WHEN column_name IN ('credit_limit', 'payment_terms', 'free_days_allowed', 'daily_storage_rate') 
        THEN 'FINANCIAL_FIELD'
        ELSE 'OTHER'
    END as field_category
FROM information_schema.columns 
WHERE table_name = 'clients' 
AND column_name IN ('credit_limit', 'payment_terms', 'free_days_allowed', 'daily_storage_rate', 'currency', 'auto_edi')
ORDER BY column_name;

-- Check current data in these fields for existing clients
SELECT 
    id,
    name,
    code,
    credit_limit,
    payment_terms,
    free_days_allowed,
    daily_storage_rate,
    currency,
    auto_edi
FROM clients
ORDER BY name
LIMIT 10;