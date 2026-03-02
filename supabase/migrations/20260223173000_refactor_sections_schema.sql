-- Refactor sections table script
-- Goal: Add default sections (A, B, C, Tampon) to each yard and remove unused layout columns

-- 1. Insert default sections for each existing yard if not exists
-- Using format [zone-slug]-[yard-id] for uniqueness per yard
INSERT INTO sections (id, yard_id, name, is_active)
SELECT 'zone-a-' || id, id, 'Zone A', true FROM yards
ON CONFLICT (id) DO NOTHING;

INSERT INTO sections (id, yard_id, name, is_active)
SELECT 'zone-b-' || id, id, 'Zone B', true FROM yards
ON CONFLICT (id) DO NOTHING;

INSERT INTO sections (id, yard_id, name, is_active)
SELECT 'zone-c-' || id, id, 'Zone C', true FROM yards
ON CONFLICT (id) DO NOTHING;

INSERT INTO sections (id, yard_id, name, is_active)
SELECT 'zone-tampon-' || id, id, 'Zone Tampon', true FROM yards
ON CONFLICT (id) DO NOTHING;

-- 2. Update existing stacks to point to these new section IDs
-- This ensures that stacks previously assigned to hardcoded IDs or different formats are correctly linked
UPDATE stacks
SET section_id = 'zone-a-' || yard_id
WHERE section_name = 'Zone A' OR section_id = 'zone-a';

UPDATE stacks
SET section_id = 'zone-b-' || yard_id
WHERE section_name = 'Zone B' OR section_id = 'zone-b';

UPDATE stacks
SET section_id = 'zone-c-' || yard_id
WHERE section_name = 'Zone C' OR section_id = 'zone-c';

UPDATE stacks
SET section_id = 'zone-tampon-' || yard_id
WHERE section_name = 'Zone Tampon';

-- 3. Remove unused layout columns from sections table
ALTER TABLE sections 
DROP COLUMN IF EXISTS position_x,
DROP COLUMN IF EXISTS position_y,
DROP COLUMN IF EXISTS position_z,
DROP COLUMN IF EXISTS width,
DROP COLUMN IF EXISTS length,
DROP COLUMN IF EXISTS color;
