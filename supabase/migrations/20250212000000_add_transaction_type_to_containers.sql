-- Migration: Add transaction_type column to containers table
-- Author: System
-- Date: 2025-02-12
-- Description: Add transaction type field to containers for tracking Gate In transaction type

-- Add transaction_type column to containers table
ALTER TABLE containers 
ADD COLUMN IF NOT EXISTS transaction_type TEXT CHECK (transaction_type IN ('Retour Livraison', 'Transfert (IN)'));

-- Set default value for existing records
UPDATE containers 
SET transaction_type = 'Retour Livraison' 
WHERE transaction_type IS NULL;

-- Add comment to document the column
COMMENT ON COLUMN containers.transaction_type IS 'Transaction type from Gate In: Retour Livraison or Transfert (IN)';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_containers_transaction_type ON containers(transaction_type);
