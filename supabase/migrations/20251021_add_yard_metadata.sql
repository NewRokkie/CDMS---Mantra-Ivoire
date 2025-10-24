-- Add metadata columns to yards table
ALTER TABLE yards
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Africa/Abidjan',
ADD COLUMN IF NOT EXISTS contact_info JSONB,
ADD COLUMN IF NOT EXISTS address JSONB;

-- Update existing yards with default metadata
UPDATE yards
SET
  timezone = 'Africa/Abidjan',
  contact_info = '{
    "manager": "Unknown",
    "phone": "N/A",
    "email": "N/A"
  }'::jsonb,
  address = '{
    "street": "Unknown",
    "city": "Unknown",
    "state": "Unknown",
    "zipCode": "Unknown",
    "country": "Unknown"
  }'::jsonb
WHERE timezone IS NULL OR contact_info IS NULL OR address IS NULL;
