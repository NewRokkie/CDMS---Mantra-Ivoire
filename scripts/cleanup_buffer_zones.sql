/*
  ============================================================
  SCRIPT DE NETTOYAGE - ZONES TAMPONS (À exécuter UNE SEULE FOIS)
  ============================================================
  
  Ce script :
  1. Réinitialise les conteneurs actuellement assignés en zone tampon
  2. Supprime les stacks tampons créés automatiquement (>= 9000)
  3. Vide la table container_buffer_zones si elle existe déjà
  4. Remet les conteneurs concernés en statut 'gate_in' (pending assignment)
  
  ATTENTION: Ce script est IRRÉVERSIBLE. Effectuez une sauvegarde avant exécution.
  ============================================================
*/

BEGIN;

-- ============================================================
-- Étape 1 : Identifier les conteneurs impactés
-- ============================================================

-- Afficher les conteneurs qui seront réinitialisés (pour vérification)
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM containers c
  WHERE 
    c.location LIKE 'BUFFER%'
    OR c.status = 'in_buffer'
    OR c.buffer_zone_id IS NOT NULL;
    
  RAISE NOTICE '=== NETTOYAGE ZONE TAMPON ===';
  RAISE NOTICE 'Nombre de conteneurs à réinitialiser: %', v_count;
END $$;

-- ============================================================
-- Étape 2 : Réinitialiser les opérations Gate In des zones tampons
-- ============================================================

UPDATE gate_in_operations
SET
  status = 'pending',
  assigned_location = NULL,
  assigned_stack = NULL,
  is_buffer_assignment = NULL,
  buffer_zone_reason = NULL,
  completed_at = NULL
WHERE
  is_buffer_assignment = true
  OR assigned_location LIKE 'BUFFER%'
  OR (
    container_id IN (
      SELECT id FROM containers
      WHERE location LIKE 'BUFFER%' OR status = 'in_buffer'
    )
  );

-- ============================================================
-- Étape 3 : Réinitialiser les conteneurs assignés en zone tampon
-- ============================================================

UPDATE containers
SET
  location = NULL,
  status = 'gate_in',  -- Retour en état "en attente d'assignation"
  buffer_zone_id = NULL,
  updated_at = now()
WHERE
  location LIKE 'BUFFER%'
  OR status = 'in_buffer'
  OR buffer_zone_id IS NOT NULL;

-- ============================================================
-- Étape 4 : Vider la table container_buffer_zones (si elle existe)
-- ============================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'container_buffer_zones') THEN
    DELETE FROM container_buffer_zones;
    RAISE NOTICE 'Table container_buffer_zones vidée.';
  END IF;
END $$;

-- ============================================================
-- Étape 5 : Supprimer les stacks tampons auto-créés (>= 9000)
-- ============================================================

DO $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- D'abord, dissocier les locations liées à ces stacks tampons
  UPDATE locations
  SET 
    is_occupied = false,
    container_id = NULL
  WHERE stack_id IN (
    SELECT id FROM stacks WHERE stack_number >= 9000 AND is_buffer_zone = true
  );
  
  -- Supprimer les stacks tampons auto-créés (non manuels)
  -- On garde uniquement ceux créés MANUELLEMENT (via Stack Management, pas par le système)
  WITH deleted AS (
    DELETE FROM stacks
    WHERE 
      stack_number >= 9000 
      AND is_buffer_zone = true
      AND (created_by = 'system-buffer-zone' OR created_by IS NULL)
    RETURNING id
  )
  SELECT COUNT(*) INTO v_deleted_count FROM deleted;
  
  RAISE NOTICE 'Stacks tampons auto-créés supprimés: %', v_deleted_count;
END $$;

-- ============================================================
-- Étape 6 : Libérer les emplacements "locations" liés aux anciens stacks tampons
-- ============================================================

-- Libérer les locations marquées comme occupées par des conteneurs
-- qui étaient en zone tampon
UPDATE locations l
SET
  is_occupied = false,
  container_id = NULL
WHERE
  l.container_id IN (
    SELECT id FROM containers WHERE status = 'gate_in' AND location IS NULL
  );

-- ============================================================
-- Rapport final
-- ============================================================

DO $$
DECLARE
  v_containers_reset INTEGER;
  v_ops_reset INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_containers_reset FROM containers WHERE status = 'gate_in' AND location IS NULL;
  SELECT COUNT(*) INTO v_ops_reset FROM gate_in_operations WHERE status = 'pending' AND assigned_location IS NULL;
  
  RAISE NOTICE '=== NETTOYAGE TERMINÉ ===';
  RAISE NOTICE 'Conteneurs en attente de réassignation: %', v_containers_reset;
  RAISE NOTICE 'Opérations Gate In remises en pending: %', v_ops_reset;
  RAISE NOTICE 'Les conteneurs listés ci-dessus doivent être réassignés via le module Gate In.';
END $$;

COMMIT;
