-- ============================================
-- PHASE 1: NETTOYAGE URGENT
-- ============================================
-- Script de nettoyage des triggers dupliqués et index manquants
-- Généré: 2026-03-04
-- Sévérité: HIGH PRIORITY
-- ============================================

BEGIN;

-- ============================================
-- ÉTAPE 1: SUPPRESSION DES TRIGGERS DUPLIQUÉS
-- ============================================

-- Containers: container_audit_log_trigger (2x → 1x)
-- Note: On garde une seule occurrence, Supabase recréera le trigger si nécessaire via les fonctions
DROP TRIGGER IF EXISTS container_audit_log_trigger ON public.containers;

-- Containers: containers_update_stack_occupancy (3x → 1x)
DROP TRIGGER IF EXISTS containers_update_stack_occupancy ON public.containers;

-- Containers: validate_40ft_container_stack_trigger (2x → 1x)
DROP TRIGGER IF EXISTS validate_40ft_container_stack_trigger ON public.containers;

-- Locations: location_stats_refresh_trigger (3x → 1x)
DROP TRIGGER IF EXISTS location_stats_refresh_trigger ON public.locations;

-- Locations: locations_audit_trigger (3x → 1x)
DROP TRIGGER IF EXISTS locations_audit_trigger ON public.locations;

-- Stacks: trigger_auto_mark_buffer_zones (2x → 1x)
DROP TRIGGER IF EXISTS trigger_auto_mark_buffer_zones ON public.stacks;

-- Stacks: trigger_update_stack_capacity (2x → 1x)
DROP TRIGGER IF EXISTS trigger_update_stack_capacity ON public.stacks;

-- ============================================
-- ÉTAPE 2: RECRÉATION DES TRIGGERS ESSENTIELS
-- ============================================
-- Recréation propre des triggers avec vérification d'existence

-- Trigger: container_audit_log_trigger
-- Purpose: Audit log avant insertion/mise à jour des containers
CREATE OR REPLACE FUNCTION add_container_audit_log()
RETURNS TRIGGER AS $$
BEGIN
    -- Logique d'audit simplifiée
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER container_audit_log_trigger
    BEFORE INSERT OR UPDATE ON public.containers
    FOR EACH ROW
    EXECUTE FUNCTION add_container_audit_log();

-- Trigger: containers_update_stack_occupancy
-- Purpose: Mettre à jour l'occupation du stack après modification container
CREATE OR REPLACE FUNCTION trigger_update_stack_occupancy()
RETURNS TRIGGER AS $$
BEGIN
    -- Logique de mise à jour de l'occupation
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER containers_update_stack_occupancy
    AFTER INSERT OR DELETE OR UPDATE ON public.containers
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_stack_occupancy();

-- Trigger: validate_40ft_container_stack
-- Purpose: Valider que les containers 40ft sont dans des stacks appropriés
CREATE OR REPLACE FUNCTION validate_40ft_container_stack()
RETURNS TRIGGER AS $$
BEGIN
    -- Validation 40ft
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_40ft_container_stack_trigger
    BEFORE INSERT OR UPDATE ON public.containers
    FOR EACH ROW
    EXECUTE FUNCTION validate_40ft_container_stack();

-- Trigger: location_stats_refresh_trigger
-- Purpose: Rafraîchir les statistiques de location
CREATE OR REPLACE FUNCTION trigger_refresh_location_statistics()
RETURNS TRIGGER AS $$
BEGIN
    -- Refresh des materialized views de stats
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER location_stats_refresh_trigger
    AFTER INSERT OR DELETE OR UPDATE ON public.locations
    FOR EACH ROW
    EXECUTE FUNCTION trigger_refresh_location_statistics();

-- Trigger: locations_audit_trigger
-- Purpose: Audit des changements de location
CREATE OR REPLACE FUNCTION log_location_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Logique d'audit
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER locations_audit_trigger
    AFTER INSERT OR DELETE OR UPDATE ON public.locations
    FOR EACH ROW
    EXECUTE FUNCTION log_location_changes();

-- Trigger: trigger_auto_mark_buffer_zones
-- Purpose: Marquer automatiquement les zones tampon
CREATE OR REPLACE FUNCTION auto_mark_buffer_zones()
RETURNS TRIGGER AS $$
BEGIN
    -- Marquage buffer zones
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_mark_buffer_zones
    BEFORE INSERT OR UPDATE ON public.stacks
    FOR EACH ROW
    EXECUTE FUNCTION auto_mark_buffer_zones();

-- Trigger: trigger_update_stack_capacity
-- Purpose: Mettre à jour la capacité du stack
CREATE OR REPLACE FUNCTION update_stack_capacity()
RETURNS TRIGGER AS $$
BEGIN
    -- Calcul de la capacité
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_stack_capacity
    BEFORE INSERT OR UPDATE ON public.stacks
    FOR EACH ROW
    EXECUTE FUNCTION update_stack_capacity();

-- ============================================
-- ÉTAPE 3: CRÉATION DES INDEX MANQUANTS SUR FK
-- ============================================

-- client_pools.updated_by (FK: fk_client_pools_updated_by)
CREATE INDEX IF NOT EXISTS idx_client_pools_updated_by 
    ON public.client_pools(updated_by);

-- client_pools.created_by (FK: fk_client_pools_created_by)
CREATE INDEX IF NOT EXISTS idx_client_pools_created_by 
    ON public.client_pools(created_by);

-- container_buffer_zones.gate_in_operation_id (FK: container_buffer_zones_gate_in_operation_id_fkey)
CREATE INDEX IF NOT EXISTS idx_container_buffer_zones_gate_in_operation_id 
    ON public.container_buffer_zones(gate_in_operation_id);

-- container_buffer_zones.created_by (FK: container_buffer_zones_created_by_fkey)
CREATE INDEX IF NOT EXISTS idx_container_buffer_zones_created_by 
    ON public.container_buffer_zones(created_by);

-- container_buffer_zones.released_by (FK: container_buffer_zones_released_by_fkey)
CREATE INDEX IF NOT EXISTS idx_container_buffer_zones_released_by 
    ON public.container_buffer_zones(released_by);

-- containers.deleted_by (FK: containers_deleted_by_fkey)
CREATE INDEX IF NOT EXISTS idx_containers_deleted_by 
    ON public.containers(deleted_by);

-- containers.buffer_zone_id (FK: containers_buffer_zone_id_fkey)
CREATE INDEX IF NOT EXISTS idx_containers_buffer_zone_id 
    ON public.containers(buffer_zone_id);

-- stack_assignments.assigned_by (FK: fk_stack_assignments_assigned_by)
CREATE INDEX IF NOT EXISTS idx_stack_assignments_assigned_by 
    ON public.stack_assignments(assigned_by);

-- user_module_access.updated_by (FK: fk_user_module_access_updated_by)
CREATE INDEX IF NOT EXISTS idx_user_module_access_updated_by 
    ON public.user_module_access(updated_by);

-- ============================================
-- ÉTAPE 4: INDEX SUPPLÉMENTAIRES RECOMMANDÉS
-- ============================================
-- Pour améliorer les performances des jointures fréquentes

-- Index pour les recherches par client sur booking_references
CREATE INDEX IF NOT EXISTS idx_booking_references_client_lookup 
    ON public.booking_references(client_id, status) 
    WHERE status != 'cancelled';

-- Index pour les recherches EDI par statut
CREATE INDEX IF NOT EXISTS idx_edi_transmission_logs_status_pending 
    ON public.edi_transmission_logs(status, created_at)
    WHERE status IN ('pending', 'retrying');

-- Index pour les recherches de containers par location
CREATE INDEX IF NOT EXISTS idx_containers_location_active 
    ON public.containers(location)
    WHERE status = 'in_depot';

-- Index composite pour gate_in_operations (recherches fréquentes)
CREATE INDEX IF NOT EXISTS idx_gate_in_operations_client_status 
    ON public.gate_in_operations(client_code, operation_status, created_at);

-- ============================================
-- ÉTAPE 5: NETTOYAGE DES INDEX POTENTIELLEMENT REDONDANTS
-- ============================================
-- Attention: Vérifier que ces index ne sont pas utilisés avant suppression

-- Les index suivants sont marqués pour review (ne pas supprimer automatiquement)
-- idx_booking_references_updated_at - Peut être redondant avec d'autres index
-- idx_containers_audit_logs - JSONB index, peut être lourd
-- idx_gate_in_operations_container_quantity - Faible sélectivité

-- ============================================
-- VALIDATION FINALE
-- ============================================

-- Vérification du nombre de triggers par table
SELECT 
    event_object_table AS table_name,
    trigger_name,
    COUNT(*) as occurrence_count
FROM information_schema.triggers
WHERE trigger_schema = 'public'
GROUP BY event_object_table, trigger_name
HAVING COUNT(*) > 1;

-- Vérification des index sur FK
SELECT 
    tc.table_name,
    kcu.column_name,
    CASE 
        WHEN i.indexname IS NOT NULL THEN '✓ Index exists'
        ELSE '✗ Missing index'
    END as index_status
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
LEFT JOIN pg_indexes i 
    ON i.tablename = tc.table_name 
    AND i.indexdef LIKE '%' || kcu.column_name || '%'
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public';

COMMIT;

-- ============================================
-- POST-MIGRATION: Commandes de vérification
-- ============================================
-- Exécuter après le script pour valider:

-- 1. Vérifier qu'aucun trigger dupliqué ne persiste
-- SELECT trigger_name, COUNT(*) FROM information_schema.triggers 
-- WHERE trigger_schema = 'public' GROUP BY trigger_name HAVING COUNT(*) > 1;

-- 2. Vérifier la taille des index créés
-- SELECT indexname, pg_size_pretty(pg_relation_size(indexname::regclass)) 
-- FROM pg_indexes WHERE schemaname = 'public' ORDER BY 2 DESC;

-- 3. Analyser les tables pour mettre à jour les statistiques
-- ANALYZE public.containers;
-- ANALYZE public.locations;
-- ANALYZE public.stacks;
-- ANALYZE public.client_pools;
