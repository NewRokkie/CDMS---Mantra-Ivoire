-- Migration: Add transaction_type column to gate_in_operations table
-- Date: 2025-02-05
-- Description: Add transaction type field for Gate In reports with values 'Retour Livraison' or 'Transfert (IN)'

-- Add transaction_type column to gate_in_operations table
ALTER TABLE gate_in_operations 
ADD COLUMN transaction_type TEXT CHECK (transaction_type IN ('Retour Livraison', 'Transfert (IN)'));

-- Set default value for existing records
UPDATE gate_in_operations 
SET transaction_type = 'Retour Livraison' 
WHERE transaction_type IS NULL;

-- Add comment to document the column
COMMENT ON COLUMN gate_in_operations.transaction_type IS 'Transaction type for Gate In operations: Retour Livraison or Transfert (IN)';

-- Create index for better query performance
CREATE INDEX idx_gate_in_operations_transaction_type ON gate_in_operations(transaction_type);