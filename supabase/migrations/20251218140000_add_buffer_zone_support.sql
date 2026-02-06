/*
  # Ajout du support des zones tampons pour conteneurs endommagés

  1. Modifications des Tables
    - Ajout de champs pour identifier les stacks tampons
    - Ajout de métadonnées pour les zones tampons
    - Amélioration du suivi des dommages

  2. Nouvelles Fonctionnalités
    - Stacks tampons virtuels pour conteneurs endommagés
    - Assignation automatique en zone tampon
    - Suivi des types de dommages

  3. Sécurité
    - Maintien des politiques RLS existantes
    - Ajout d'index pour les performances
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

-- Fonction pour identifier automatiquement les stacks tampons basés sur le nom de section
CREATE OR REPLACE FUNCTION update_buffer_zone_flags()
RETURNS void AS $$
BEGIN
  -- Marquer les stacks existants comme zones tampons s'ils correspondent aux critères
  UPDATE stacks 
  SET 
    is_buffer_zone = true,
    buffer_zone_type = 'damage',
    is_special_stack = true
  WHERE 
    (section_name ILIKE 'BUFFER%' OR section_name ILIKE 'DMG%' OR section_name ILIKE '%TAMPON%')
    AND is_buffer_zone IS NOT true;
    
  -- Log le nombre de stacks mis à jour
  RAISE NOTICE 'Buffer zone flags updated for existing stacks';
END;
$$ LANGUAGE plpgsql;

-- Exécuter la fonction pour marquer les stacks existants
SELECT update_buffer_zone_flags();

-- Trigger pour marquer automatiquement les nouveaux stacks comme zones tampons
CREATE OR REPLACE FUNCTION auto_mark_buffer_zones()
RETURNS TRIGGER AS $$
BEGIN
  -- Vérifier si c'est un stack tampon basé sur le nom de section ou les notes
  IF (NEW.section_name ILIKE 'BUFFER%' OR 
      NEW.section_name ILIKE 'DMG%' OR 
      NEW.section_name ILIKE '%TAMPON%' OR
      NEW.notes ILIKE '%ZONE TAMPON%' OR
      NEW.stack_number >= 9000) THEN
    
    NEW.is_buffer_zone = true;
    NEW.buffer_zone_type = 'damage';
    NEW.is_special_stack = true;
    
    -- Extraire le type de dommage du nom de section si possible
    IF NEW.section_name ILIKE '%STRUCTURAL%' THEN
      NEW.damage_types_supported = '["structural"]'::jsonb;
    ELSIF NEW.section_name ILIKE '%SURFACE%' THEN
      NEW.damage_types_supported = '["surface"]'::jsonb;
    ELSIF NEW.section_name ILIKE '%DOOR%' THEN
      NEW.damage_types_supported = '["door"]'::jsonb;
    ELSIF NEW.section_name ILIKE '%CORNER%' THEN
      NEW.damage_types_supported = '["corner"]'::jsonb;
    ELSE
      NEW.damage_types_supported = '["general", "other"]'::jsonb;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger
DROP TRIGGER IF EXISTS trigger_auto_mark_buffer_zones ON stacks;
CREATE TRIGGER trigger_auto_mark_buffer_zones
  BEFORE INSERT OR UPDATE ON stacks
  FOR EACH ROW
  EXECUTE FUNCTION auto_mark_buffer_zones();

-- Vue pour les statistiques des zones tampons
CREATE OR REPLACE VIEW buffer_zone_stats AS
SELECT 
  yard_id,
  COUNT(*) as total_buffer_stacks,
  SUM(capacity) as total_capacity,
  SUM(current_occupancy) as current_occupancy,
  SUM(capacity - current_occupancy) as available_spaces,
  CASE 
    WHEN SUM(capacity) > 0 THEN ROUND((SUM(current_occupancy)::decimal / SUM(capacity) * 100), 2)
    ELSE 0 
  END as utilization_rate,
  array_agg(DISTINCT buffer_zone_type) FILTER (WHERE buffer_zone_type IS NOT NULL) as buffer_types,
  array_agg(DISTINCT container_size) as supported_sizes
FROM stacks 
WHERE is_buffer_zone = true AND is_active = true
GROUP BY yard_id;

-- Politique RLS pour la vue (hérite des politiques de la table stacks)
ALTER VIEW buffer_zone_stats OWNER TO postgres;

-- Fonction pour obtenir les statistiques des zones tampons
CREATE OR REPLACE FUNCTION get_buffer_zone_stats(p_yard_id TEXT)
RETURNS TABLE(
  total_buffer_stacks INTEGER,
  total_capacity INTEGER,
  current_occupancy INTEGER,
  available_spaces INTEGER,
  utilization_rate DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(bzs.total_buffer_stacks, 0)::INTEGER,
    COALESCE(bzs.total_capacity, 0)::INTEGER,
    COALESCE(bzs.current_occupancy, 0)::INTEGER,
    COALESCE(bzs.available_spaces, 0)::INTEGER,
    COALESCE(bzs.utilization_rate, 0)::DECIMAL
  FROM buffer_zone_stats bzs
  WHERE bzs.yard_id = p_yard_id;
  
  -- Si aucun résultat, retourner des zéros
  IF NOT FOUND THEN
    RETURN QUERY SELECT 0, 0, 0, 0, 0.0::DECIMAL;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Accorder les permissions nécessaires
GRANT EXECUTE ON FUNCTION get_buffer_zone_stats(TEXT) TO authenticated;
GRANT SELECT ON buffer_zone_stats TO authenticated;

-- Commentaires pour la documentation
COMMENT ON COLUMN stacks.is_buffer_zone IS 'Indique si ce stack est une zone tampon pour conteneurs endommagés';
COMMENT ON COLUMN stacks.buffer_zone_type IS 'Type de zone tampon (damage, maintenance, quarantine, etc.)';
COMMENT ON COLUMN stacks.damage_types_supported IS 'Types de dommages supportés par cette zone tampon';
COMMENT ON COLUMN gate_in_operations.damage_assessment IS 'Évaluation complète des dommages en format JSON';
COMMENT ON COLUMN gate_in_operations.is_buffer_assignment IS 'Indique si le conteneur a été assigné à une zone tampon';
COMMENT ON COLUMN gate_in_operations.buffer_zone_reason IS 'Raison de l\'assignation en zone tampon';

COMMENT ON VIEW buffer_zone_stats IS 'Statistiques agrégées des zones tampons par dépôt';
COMMENT ON FUNCTION get_buffer_zone_stats(TEXT) IS 'Fonction pour obtenir les statistiques des zones tampons d\'un dépôt spécifique';