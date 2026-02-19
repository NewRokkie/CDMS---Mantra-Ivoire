-- ============================================================================
-- Sync gate_in_operations locations with containers table
-- ============================================================================
-- This script updates the assigned_location and assigned_stack fields in the
-- gate_in_operations table to match the current location in the containers table.
-- This is needed when container locations are updated through the container edit
-- modal, which previously only updated the containers table.
-- ============================================================================

-- Update assigned_location and assigned_stack in gate_in_operations
-- to match the current location in containers table
UPDATE gate_in_operations gio
SET 
  assigned_location = c.location,
  assigned_stack = SUBSTRING(c.location FROM '^(S\d+)'),
  updated_at = NOW()
FROM containers c
WHERE gio.container_id = c.id
  AND c.location IS NOT NULL
  AND (
    gio.assigned_location IS NULL 
    OR gio.assigned_location != c.location
  );

-- Show summary of updates
SELECT 
  COUNT(*) as total_updated,
  COUNT(DISTINCT gio.container_id) as unique_containers
FROM gate_in_operations gio
JOIN containers c ON gio.container_id = c.id
WHERE c.location IS NOT NULL
  AND gio.assigned_location = c.location;

-- Show any remaining mismatches (should be 0 after running the update)
SELECT 
  c.number as container_number,
  c.location as container_location,
  gio.assigned_location as gate_in_location,
  gio.assigned_stack as gate_in_stack
FROM gate_in_operations gio
JOIN containers c ON gio.container_id = c.id
WHERE c.location IS NOT NULL
  AND (
    gio.assigned_location IS NULL 
    OR gio.assigned_location != c.location
  )
ORDER BY c.number;
