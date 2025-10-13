/*
  # Add missing columns to clients table

  1. Changes
    - Add billing_address column (JSONB to store structured address data)
    - Add tax_id column (TEXT for tax identification number)
    - Add credit_limit column (NUMERIC for credit limit amount)
    - Add payment_terms column (INTEGER for payment terms in days)
    - Add notes column (TEXT for additional notes)

  2. Rationale
    - These columns are required by the Client type in the frontend
    - They store important business information for client management
    - Default values ensure existing records remain valid
*/

-- Add missing columns to clients table
DO $$
BEGIN
  -- Add billing_address if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'clients' AND column_name = 'billing_address'
  ) THEN
    ALTER TABLE clients ADD COLUMN billing_address JSONB;
  END IF;

  -- Add tax_id if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'clients' AND column_name = 'tax_id'
  ) THEN
    ALTER TABLE clients ADD COLUMN tax_id TEXT;
  END IF;

  -- Add credit_limit if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'clients' AND column_name = 'credit_limit'
  ) THEN
    ALTER TABLE clients ADD COLUMN credit_limit NUMERIC DEFAULT 0;
  END IF;

  -- Add payment_terms if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'clients' AND column_name = 'payment_terms'
  ) THEN
    ALTER TABLE clients ADD COLUMN payment_terms INTEGER DEFAULT 30;
  END IF;

  -- Add notes if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'clients' AND column_name = 'notes'
  ) THEN
    ALTER TABLE clients ADD COLUMN notes TEXT;
  END IF;
END $$;