/*
  # Ajout du support des zones tampons pour conteneurs endommagés - Version Simplifiée

  1. Modifications des Tables
    - Ajout de champs pour identifier les stacks tampons
    - Ajout de métadonnées pour les zones tampons
    - Amélioration du suivi des dommages

  2. Nouvelles Fonctionnalités
    - Stacks tampons virtuels pour conteneurs endommagés
    - Assignation automatique en zone tampon
    - Suivi des types de dommages
*/

-- Ajouter des colonnes pour les zones tampons dans la table stacks
ALTER TABLE stacks ADD COLUMN IF NOT EXISTS is_buffer_zone BOOLEAN DEFAULT false;
ALTER TABLE stacks ADD COLUMN IF NOT EXISTS buffer_zone_type TEXT;
ALTER TABLE stacks ADD COLUMN IF NOT EXISTS damage_types_supported JSONB DEFAULT '[]'::jsonb;

-- Ajouter des colonnes pour améliorer le suivi des dommages dans gate_in_operations
ALTER TABLE gate_in_operations ADD COLUMN IF NOT EXISTS damage_assessment JSONB;
ALTER TABLE gate_in_operations ADD COLUMN IF NOT EXISTS is_buffer_assignment BOOLEAN DEFAULT false;
ALTER TABLE gate_in_operations ADD COLUMN IF NOT EXISTS buffer_zone_reason TEXT;

-- Créer des index pour les performances
CREATE INDEX IF NOT EXISTS idx_stacks_is_buffer_zone ON stacks(is_buffer_zone) WHERE is_buffer_zone = true;
CREATE INDEX IF NOT EXISTS idx_stacks_buffer_zone_type ON stacks(buffer_zone_type) WHERE buffer_zone_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_gate_in_operations_damage_reported ON gate_in_operations(damage_reported) WHERE damage_reported = true;
CREATE INDEX IF NOT EXISTS idx_gate_in_operations_is_buffer_assignment ON gate_in_operations(is_buffer_assignment) WHERE is_buffer_assignment = true;

-- Marquer les stacks existants comme zones tampons s'ils correspondent aux critères
UPDATE stacks 
SET 
  is_buffer_zone = true,
  buffer_zone_type = 'damage',
  is_special_stack = true
WHERE 
  (section_name ILIKE 'BUFFER%' OR section_name ILIKE 'DMG%' OR section_name ILIKE '%TAMPON%' OR stack_number >= 9000)
  AND is_buffer_zone IS NOT true;

-- Commentaires pour la documentation
COMMENT ON COLUMN stacks.is_buffer_zone IS 'Indique si ce stack est une zone tampon pour conteneurs endommagés';
COMMENT ON COLUMN stacks.buffer_zone_type IS 'Type de zone tampon (damage, maintenance, quarantine, etc.)';
COMMENT ON COLUMN stacks.damage_types_supported IS 'Types de dommages supportés par cette zone tampon';
COMMENT ON COLUMN gate_in_operations.damage_assessment IS 'Évaluation complète des dommages en format JSON';
COMMENT ON COLUMN gate_in_operations.is_buffer_assignment IS 'Indique si le conteneur a été assigné à une zone tampon';
COMMENT ON COLUMN gate_in_operations.buffer_zone_reason IS 'Raison de l\'assignation en zone tampon';