-- Migration: Add transaction_type column to booking_references table
-- Date: 2025-02-05
-- Description: Add transaction type field for Gate Out reports with values 'Positionnement' or 'Transfert (OUT)'

-- Add transaction_type column to booking_references table
ALTER TABLE booking_references 
ADD COLUMN transaction_type TEXT CHECK (transaction_type IN ('Positionnement', 'Transfert (OUT)'));

-- Set default value for existing records
UPDATE booking_references 
SET transaction_type = 'Positionnement' 
WHERE transaction_type IS NULL;

-- Add comment to document the column
COMMENT ON COLUMN booking_references.transaction_type IS 'Transaction type for Gate Out operations: Positionnement or Transfert (OUT)';

-- Create index for better query performance
CREATE INDEX idx_booking_references_transaction_type ON booking_references(transaction_type);