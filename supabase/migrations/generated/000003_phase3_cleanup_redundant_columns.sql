-- ============================================
-- PHASE 3: NETTOYAGE COLONNES REDONDANTES
-- ============================================
-- Script de suppression des colonnes redondantes et ajout des contraintes NOT NULL
-- Généré: 2026-03-04
-- Sévérité: LOW PRIORITY (après validation Phase 1 & 2)
-- ============================================

BEGIN;

-- ============================================
-- ÉTAPE 1: SUPPRESSION DES COLONNES REDONDANTES
-- ============================================
-- Après migration vers les tables normalisées (Phase 2),
-- nous pouvons supprimer les colonnes dupliquées

-- --------------------------------------------
-- 1.1 gate_in_operations: Suppression colonnes EDI
-- --------------------------------------------
-- Attention: À exécuter uniquement après validation que les données sont bien migrées

-- Backup des données avant suppression (optionnel mais recommandé)
CREATE TABLE IF NOT EXISTS public.gate_in_operations_backup_pre_cleanup AS
SELECT * FROM public.gate_in_operations;

-- Suppression des colonnes EDI (migrées vers gate_in_edi_details)
ALTER TABLE public.gate_in_operations 
    DROP COLUMN IF EXISTS edi_message_id,
    DROP COLUMN IF EXISTS edi_client_name,
    DROP COLUMN IF EXISTS edi_client_code,
    DROP COLUMN IF EXISTS edi_processing_started_at,
    DROP COLUMN IF EXISTS edi_gate_in_transmitted,
    DROP COLUMN IF EXISTS edi_log_id,
    DROP COLUMN IF EXISTS edi_error_message;

-- Suppression des colonnes de transport (migrées vers gate_in_transport_info)
ALTER TABLE public.gate_in_operations 
    DROP COLUMN IF EXISTS transport_company,
    DROP COLUMN IF EXISTS driver_name,
    DROP COLUMN IF EXISTS vehicle_number,
    DROP COLUMN IF EXISTS truck_arrival_date,
    DROP COLUMN IF EXISTS truck_arrival_time,
    DROP COLUMN IF EXISTS booking_reference,
    DROP COLUMN IF EXISTS equipment_reference;

-- Suppression des colonnes de damage assessment (migrées vers gate_in_damage_assessments)
ALTER TABLE public.gate_in_operations 
    DROP COLUMN IF EXISTS damage_reported,
    DROP COLUMN IF EXISTS damage_description,
    DROP COLUMN IF EXISTS damage_type,
    DROP COLUMN IF EXISTS damage_assessment,
    DROP COLUMN IF EXISTS damage_assessment_stage,
    DROP COLUMN IF EXISTS damage_assessed_by,
    DROP COLUMN IF EXISTS damage_assessed_at,
    DROP COLUMN IF EXISTS damage_assessment_started_at,
    DROP COLUMN IF EXISTS damage_assessment_completed_at,
    DROP COLUMN IF EXISTS is_buffer_assignment,
    DROP COLUMN IF EXISTS buffer_zone_reason,
    DROP COLUMN IF EXISTS assigned_stack,
    DROP COLUMN IF EXISTS assigned_location;

-- --------------------------------------------
-- 1.2 gate_out_operations: Suppression colonnes EDI
-- --------------------------------------------
ALTER TABLE public.gate_out_operations 
    DROP COLUMN IF EXISTS edi_message_id,
    DROP COLUMN IF EXISTS edi_client_name,
    DROP COLUMN IF EXISTS edi_processing_started_at,
    DROP COLUMN IF EXISTS edi_log_id,
    DROP COLUMN IF EXISTS edi_error_message,
    DROP COLUMN IF EXISTS container_selection_started_at,
    DROP COLUMN IF EXISTS container_selection_completed_at;

-- Suppression des colonnes de transport (migrées vers gate_out_transport_info)
ALTER TABLE public.gate_out_operations 
    DROP COLUMN IF EXISTS transport_company,
    DROP COLUMN IF EXISTS driver_name,
    DROP COLUMN IF EXISTS vehicle_number;

-- --------------------------------------------
-- 1.3 clients: Nettoyage des colonnes redondantes
-- --------------------------------------------
-- Suppression created_by et updated_by si non utilisés (texte vs UUID)
-- Note: À vérifier avec l'application

-- --------------------------------------------
-- 1.4 containers: Nettoyage
-- --------------------------------------------
-- Suppression des colonnes temporairement inutiles
ALTER TABLE public.containers 
    DROP COLUMN IF EXISTS audit_logs;

-- ============================================
-- ÉTAPE 2: AJOUT CONTRAINTES NOT NULL
-- ============================================
-- Ajout de contraintes NOT NULL sur les colonnes critiques

-- --------------------------------------------
-- 2.1 clients: email devrait avoir un DEFAULT
-- --------------------------------------------
ALTER TABLE public.clients 
    ALTER COLUMN email SET DEFAULT '';

-- --------------------------------------------
-- 2.2 containers: yard_id et location
-- --------------------------------------------
-- Note: À vérifier - ces champs peuvent être NULL pour certains containers
-- ALTER TABLE public.containers ALTER COLUMN yard_id SET NOT NULL;

-- --------------------------------------------
-- 2.3 gate_in_operations: yard_id
-- --------------------------------------------
ALTER TABLE public.gate_in_operations 
    ALTER COLUMN yard_id SET NOT NULL,
    ALTER COLUMN client_code SET NOT NULL,
    ALTER COLUMN client_name SET NOT NULL;

-- --------------------------------------------
-- 2.4 gate_out_operations: yard_id
-- --------------------------------------------
ALTER TABLE public.gate_out_operations 
    ALTER COLUMN yard_id SET NOT NULL,
    ALTER COLUMN client_code SET NOT NULL,
    ALTER COLUMN client_name SET NOT NULL;

-- ============================================
-- ÉTAPE 3: AJOUT CONTRAINTES DE CHECK
-- ============================================

-- --------------------------------------------
-- 3.1 containers: status valide
-- --------------------------------------------
ALTER TABLE public.containers DROP CONSTRAINT IF EXISTS check_container_status;
ALTER TABLE public.containers 
    ADD CONSTRAINT check_container_status 
    CHECK (status IN (
        'in_depot', 'gate_in', 'gate_out', 'damaged', 
        'in_buffer', 'maintenance', 'out_of_service'
    ));

-- --------------------------------------------
-- 3.2 containers: size valide
-- --------------------------------------------
ALTER TABLE public.containers DROP CONSTRAINT IF EXISTS check_container_size;
ALTER TABLE public.containers 
    ADD CONSTRAINT check_container_size 
    CHECK (size IN ('20ft', '40ft', '45ft'));

-- --------------------------------------------
-- 3.3 gate_in_operations: operation_status valide
-- --------------------------------------------
ALTER TABLE public.gate_in_operations DROP CONSTRAINT IF EXISTS check_operation_status;
ALTER TABLE public.gate_in_operations 
    ADD CONSTRAINT check_operation_status 
    CHECK (operation_status IN (
        'pending', 'in_progress', 'completed', 'cancelled', 'error'
    ));

-- --------------------------------------------
-- 3.4 booking_references: status valide
-- --------------------------------------------
ALTER TABLE public.booking_references DROP CONSTRAINT IF EXISTS check_booking_status;
ALTER TABLE public.booking_references 
    ADD CONSTRAINT check_booking_status 
    CHECK (status IN (
        'pending', 'active', 'completed', 'cancelled', 'expired'
    ));

-- --------------------------------------------
-- 3.5 edi_transmission_logs: status valide
-- --------------------------------------------
ALTER TABLE public.edi_transmission_logs DROP CONSTRAINT IF EXISTS check_edi_status;
ALTER TABLE public.edi_transmission_logs 
    ADD CONSTRAINT check_edi_status 
    CHECK (status IN (
        'pending', 'processing', 'success', 'failed', 'retrying'
    ));

-- ============================================
-- ÉTAPE 4: NORMALISATION COLONNES client_code/client_name
-- ============================================
-- Ces colonnes sont redondantes avec client_id (FK vers clients)
-- Option: Les garder pour performance (dénormalisation contrôlée)
-- ou les supprimer et toujours faire des JOIN

-- Option recommandée: Garder pour performance mais ajouter triggers de sync

-- Trigger pour synchroniser client_code et client_name dans booking_references
CREATE OR REPLACE FUNCTION sync_client_info_booking_references()
RETURNS TRIGGER AS $$
DECLARE
    client_record RECORD;
BEGIN
    IF NEW.client_id IS NOT NULL THEN
        SELECT code, name INTO client_record
        FROM public.clients
        WHERE id = NEW.client_id;
        
        IF FOUND THEN
            NEW.client_code := client_record.code;
            NEW.client_name := client_record.name;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_sync_client_info_booking
    BEFORE INSERT OR UPDATE ON public.booking_references
    FOR EACH ROW
    EXECUTE FUNCTION sync_client_info_booking_references();

-- Trigger similaire pour containers
CREATE OR REPLACE FUNCTION sync_client_info_containers()
RETURNS TRIGGER AS $$
DECLARE
    client_record RECORD;
BEGIN
    IF NEW.client_id IS NOT NULL THEN
        SELECT code, name INTO client_record
        FROM public.clients
        WHERE id = NEW.client_id;
        
        IF FOUND THEN
            NEW.client_code := client_record.code;
            NEW.client_name := client_record.name;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_sync_client_info_containers
    BEFORE INSERT OR UPDATE ON public.containers
    FOR EACH ROW
    EXECUTE FUNCTION sync_client_info_containers();

-- ============================================
-- ÉTAPE 5: VALIDATION FINALE
-- ============================================

-- Vérifier le nombre de colonnes restantes par table
SELECT 
    table_name,
    COUNT(*) as column_count
FROM information_schema.columns
WHERE table_schema = 'public'
GROUP BY table_name
ORDER BY column_count DESC
LIMIT 20;

-- Vérifier les contraintes CHECK ajoutées
SELECT 
    tc.table_name,
    tc.constraint_name,
    cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc
    ON tc.constraint_name = cc.constraint_name
WHERE tc.constraint_type = 'CHECK'
    AND tc.table_schema = 'public'
    AND cc.check_clause NOT LIKE '%NOT NULL%'
ORDER BY tc.table_name;

COMMIT;

-- ============================================
-- POST-MIGRATION: Commandes de vérification
-- ============================================
-- 
-- 1. Vérifier que les triggers de sync fonctionnent:
--    INSERT INTO booking_references (client_id, ...) VALUES (...);
--    SELECT client_code, client_name FROM booking_references WHERE ...;
--
-- 2. Vérifier la taille des tables après nettoyage:
--    SELECT 
--        relname,
--        pg_size_pretty(pg_total_relation_size(relid))
--    FROM pg_stat_user_tables
--    WHERE schemaname = 'public'
--    ORDER BY 2 DESC;
--
-- 3. Exécuter VACUUM pour récupérer l'espace:
--    VACUUM FULL public.gate_in_operations;
--    VACUUM FULL public.gate_out_operations;
--    VACUUM FULL public.containers;
--
-- 4. Mettre à jour les statistiques:
--    ANALYZE public.gate_in_operations;
--    ANALYZE public.gate_out_operations;
--    ANALYZE public.containers;
--    ANALYZE public.booking_references;
