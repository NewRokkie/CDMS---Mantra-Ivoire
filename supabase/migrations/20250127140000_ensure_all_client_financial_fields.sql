/*
  # Ensure all client financial fields exist with correct types

  1. Problem
    - Some financial fields might be missing from the clients table
    - Data types might be incorrect
    - Default values might not be set properly

  2. Solution
    - Ensure all financial fields exist with correct types
    - Set appropriate default values
    - Add any missing columns

  3. Fields to check/add
    - credit_limit (NUMERIC)
    - payment_terms (INTEGER) 
    - free_days_allowed (INTEGER)
    - daily_storage_rate (NUMERIC)
    - currency (TEXT)
    - auto_edi (BOOLEAN)
*/

-- Ensure all financial fields exist with correct types
DO $$
BEGIN
  -- Add credit_limit if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'clients' AND column_name = 'credit_limit'
  ) THEN
    ALTER TABLE clients ADD COLUMN credit_limit NUMERIC DEFAULT 0;
    RAISE NOTICE 'Added credit_limit column';
  ELSE
    -- Ensure it has the correct type
    ALTER TABLE clients ALTER COLUMN credit_limit TYPE NUMERIC USING credit_limit::NUMERIC;
    ALTER TABLE clients ALTER COLUMN credit_limit SET DEFAULT 0;
    RAISE NOTICE 'Updated credit_limit column type and default';
  END IF;

  -- Add payment_terms if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'clients' AND column_name = 'payment_terms'
  ) THEN
    ALTER TABLE clients ADD COLUMN payment_terms INTEGER DEFAULT 30;
    RAISE NOTICE 'Added payment_terms column';
  ELSE
    -- Ensure it has the correct type
    ALTER TABLE clients ALTER COLUMN payment_terms TYPE INTEGER USING payment_terms::INTEGER;
    ALTER TABLE clients ALTER COLUMN payment_terms SET DEFAULT 30;
    RAISE NOTICE 'Updated payment_terms column type and default';
  END IF;

  -- Ensure free_days_allowed exists and has correct type
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'clients' AND column_name = 'free_days_allowed'
  ) THEN
    ALTER TABLE clients ADD COLUMN free_days_allowed INTEGER DEFAULT 3;
    RAISE NOTICE 'Added free_days_allowed column';
  ELSE
    -- Ensure it has the correct type
    ALTER TABLE clients ALTER COLUMN free_days_allowed TYPE INTEGER USING free_days_allowed::INTEGER;
    ALTER TABLE clients ALTER COLUMN free_days_allowed SET DEFAULT 3;
    RAISE NOTICE 'Updated free_days_allowed column type and default';
  END IF;

  -- Ensure daily_storage_rate exists and has correct type
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'clients' AND column_name = 'daily_storage_rate'
  ) THEN
    ALTER TABLE clients ADD COLUMN daily_storage_rate NUMERIC DEFAULT 45.00;
    RAISE NOTICE 'Added daily_storage_rate column';
  ELSE
    -- Ensure it has the correct type
    ALTER TABLE clients ALTER COLUMN daily_storage_rate TYPE NUMERIC USING daily_storage_rate::NUMERIC;
    ALTER TABLE clients ALTER COLUMN daily_storage_rate SET DEFAULT 45.00;
    RAISE NOTICE 'Updated daily_storage_rate column type and default';
  END IF;

  -- Ensure currency exists and has correct type
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'clients' AND column_name = 'currency'
  ) THEN
    ALTER TABLE clients ADD COLUMN currency TEXT DEFAULT 'USD';
    RAISE NOTICE 'Added currency column';
  ELSE
    -- Ensure it has the correct default
    ALTER TABLE clients ALTER COLUMN currency SET DEFAULT 'USD';
    RAISE NOTICE 'Updated currency column default';
  END IF;

  -- Ensure auto_edi exists and has correct type
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'clients' AND column_name = 'auto_edi'
  ) THEN
    ALTER TABLE clients ADD COLUMN auto_edi BOOLEAN DEFAULT false;
    RAISE NOTICE 'Added auto_edi column';
  ELSE
    -- Ensure it has the correct default
    ALTER TABLE clients ALTER COLUMN auto_edi SET DEFAULT false;
    RAISE NOTICE 'Updated auto_edi column default';
  END IF;

END $$;

-- Update any NULL values to defaults
UPDATE clients SET credit_limit = 0 WHERE credit_limit IS NULL;
UPDATE clients SET payment_terms = 30 WHERE payment_terms IS NULL;
UPDATE clients SET free_days_allowed = 3 WHERE free_days_allowed IS NULL;
UPDATE clients SET daily_storage_rate = 45.00 WHERE daily_storage_rate IS NULL;
UPDATE clients SET currency = 'USD' WHERE currency IS NULL OR currency = '';
UPDATE clients SET auto_edi = false WHERE auto_edi IS NULL;

-- Add NOT NULL constraints where appropriate
ALTER TABLE clients ALTER COLUMN credit_limit SET NOT NULL;
ALTER TABLE clients ALTER COLUMN payment_terms SET NOT NULL;
ALTER TABLE clients ALTER COLUMN free_days_allowed SET NOT NULL;
ALTER TABLE clients ALTER COLUMN daily_storage_rate SET NOT NULL;
ALTER TABLE clients ALTER COLUMN currency SET NOT NULL;
ALTER TABLE clients ALTER COLUMN auto_edi SET NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN clients.credit_limit IS 'Credit limit amount for the client';
COMMENT ON COLUMN clients.payment_terms IS 'Payment terms in days';
COMMENT ON COLUMN clients.free_days_allowed IS 'Number of free storage days allowed';
COMMENT ON COLUMN clients.daily_storage_rate IS 'Daily storage rate after free days';
COMMENT ON COLUMN clients.currency IS 'Currency code for billing (USD, EUR, FCFA, etc.)';
COMMENT ON COLUMN clients.auto_edi IS 'Whether automatic EDI transmission is enabled';