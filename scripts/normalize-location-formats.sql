-- ============================================================================
-- Normalize Location Formats
-- ============================================================================
-- This script standardizes all location formats to S##R#H# (without dashes)
-- to ensure consistency across the application
-- ============================================================================

-- Step 1: Show current location format distribution
WITH format_examples AS (
  SELECT 
    CASE 
      WHEN location ~ 'S\d+-R\d+-H\d+' THEN 'With dashes (S##-R#-H#)'
      WHEN location ~ 'S\d+R\d+H\d+' THEN 'Without dashes (S##R#H#)'
      ELSE 'Other format'
    END as format_type,
    location,
    ROW_NUMBER() OVER (PARTITION BY 
      CASE 
        WHEN location ~ 'S\d+-R\d+-H\d+' THEN 'With dashes (S##-R#-H#)'
        WHEN location ~ 'S\d+R\d+H\d+' THEN 'Without dashes (S##R#H#)'
        ELSE 'Other format'
      END 
      ORDER BY location) as rn
  FROM containers
  WHERE location IS NOT NULL
    AND is_deleted = false
)
SELECT 
  'CURRENT FORMAT DISTRIBUTION' as info,
  format_type,
  COUNT(*) as count,
  ARRAY_AGG(location ORDER BY location) FILTER (WHERE rn <= 5) as examples
FROM format_examples
GROUP BY format_type
ORDER BY count DESC;

-- Step 2: Preview normalization changes for containers
SELECT 
  'PREVIEW CONTAINER CHANGES' as info,
  number as container_number,
  location as old_location,
  REGEXP_REPLACE(
    REGEXP_REPLACE(location, 'S0*(\d+)', 'S' || LPAD(SUBSTRING(location FROM 'S0*(\d+)')::text, 2, '0')),
    '[-]', '', 'g'
  ) as new_location,
  status
FROM containers
WHERE location IS NOT NULL
  AND is_deleted = false
  AND location ~ '[-]'
LIMIT 10;

-- Step 3: Normalize container locations (remove dashes, ensure 2-digit stack numbers)
UPDATE containers
SET 
  location = REGEXP_REPLACE(
    REGEXP_REPLACE(location, 'S0*(\d+)', 'S' || LPAD(SUBSTRING(location FROM 'S0*(\d+)')::text, 2, '0')),
    '[-]', '', 'g'
  ),
  updated_at = NOW()
WHERE location IS NOT NULL
  AND is_deleted = false
  AND location ~ '[-]';

-- Step 4: Normalize gate_in_operations assigned_location
UPDATE gate_in_operations
SET 
  assigned_location = REGEXP_REPLACE(
    REGEXP_REPLACE(assigned_location, 'S0*(\d+)', 'S' || LPAD(SUBSTRING(assigned_location FROM 'S0*(\d+)')::text, 2, '0')),
    '[-]', '', 'g'
  ),
  updated_at = NOW()
WHERE assigned_location IS NOT NULL
  AND assigned_location ~ '[-]';

-- Step 5: Verify normalization results
WITH format_examples AS (
  SELECT 
    CASE 
      WHEN location ~ 'S\d+-R\d+-H\d+' THEN 'With dashes (S##-R#-H#)'
      WHEN location ~ 'S\d+R\d+H\d+' THEN 'Without dashes (S##R#H#)'
      ELSE 'Other format'
    END as format_type,
    location,
    ROW_NUMBER() OVER (PARTITION BY 
      CASE 
        WHEN location ~ 'S\d+-R\d+-H\d+' THEN 'With dashes (S##-R#-H#)'
        WHEN location ~ 'S\d+R\d+H\d+' THEN 'Without dashes (S##R#H#)'
        ELSE 'Other format'
      END 
      ORDER BY location) as rn
  FROM containers
  WHERE location IS NOT NULL
    AND is_deleted = false
)
SELECT 
  'AFTER NORMALIZATION' as info,
  format_type,
  COUNT(*) as count,
  ARRAY_AGG(location ORDER BY location) FILTER (WHERE rn <= 5) as examples
FROM format_examples
GROUP BY format_type
ORDER BY count DESC;

-- Step 6: Check for any remaining inconsistencies
SELECT 
  'REMAINING ISSUES' as info,
  c.number as container_number,
  c.location as container_location,
  gio.assigned_location as gate_in_location,
  CASE 
    WHEN c.location != gio.assigned_location THEN 'Mismatch'
    ELSE 'OK'
  END as sync_status
FROM containers c
LEFT JOIN gate_in_operations gio ON gio.container_id = c.id
WHERE c.location IS NOT NULL
  AND gio.assigned_location IS NOT NULL
  AND c.location != gio.assigned_location
  AND c.is_deleted = false
LIMIT 20;

-- Step 7: Summary statistics
SELECT 
  'SUMMARY' as info,
  COUNT(*) as total_containers,
  COUNT(CASE WHEN location IS NOT NULL THEN 1 END) as with_location,
  COUNT(CASE WHEN location ~ 'S\d+R\d+H\d+' AND location !~ '[-]' THEN 1 END) as normalized_format,
  COUNT(CASE WHEN location ~ '[-]' THEN 1 END) as with_dashes
FROM containers
WHERE is_deleted = false;
