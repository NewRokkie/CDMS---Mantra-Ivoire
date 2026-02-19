-- ============================================================================
-- SCRIPT DE RÉINITIALISATION DES DONNÉES DE LA BASE DE DONNÉES SUPABASE
-- ============================================================================
-- ATTENTION: Ce script vide TOUTES les données des tables
-- La structure (tables, vues, fonctions) est conservée
-- Cette action est IRRÉVERSIBLE
-- ============================================================================

BEGIN;

-- ============================================================================
-- ÉTAPE 1: Désactiver temporairement les triggers et contraintes
-- ============================================================================
SET session_replication_role = 'replica';

-- ============================================================================
-- ÉTAPE 2: Vider les tables dans l'ordre des dépendances (CASCADE)
-- ============================================================================

-- Tables EDI (dépendantes de clients et containers)
TRUNCATE TABLE edi_transmission_logs CASCADE;
-- TRUNCATE TABLE edi_client_settings CASCADE;
-- TRUNCATE TABLE edi_server_configurations CASCADE;

-- Tables d'activité utilisateur
TRUNCATE TABLE user_login_history CASCADE;
TRUNCATE TABLE user_activities CASCADE;

-- Tables de gestion des emplacements
TRUNCATE TABLE location_audit_log CASCADE;
-- TRUNCATE TABLE location_id_mappings CASCADE;
-- TRUNCATE TABLE locations CASCADE;

-- Tables de gestion des stacks
TRUNCATE TABLE stack_assignments CASCADE;
-- TRUNCATE TABLE stack_pairings CASCADE;
-- TRUNCATE TABLE virtual_stack_pairs CASCADE;
-- TRUNCATE TABLE stacks CASCADE;

-- Tables de gestion des sections et yards
-- TRUNCATE TABLE sections CASCADE;
-- TRUNCATE TABLE yards CASCADE;

-- Tables de gestion des pools clients
TRUNCATE TABLE client_pools CASCADE;

-- Tables de gestion des modules utilisateur
-- TRUNCATE TABLE user_module_access CASCADE;

-- Tables des opérations de porte
TRUNCATE TABLE gate_out_operations CASCADE;
TRUNCATE TABLE gate_in_operations CASCADE;

-- Tables des ordres et conteneurs
TRUNCATE TABLE booking_references CASCADE;
TRUNCATE TABLE containers CASCADE;

-- Tables des clients et utilisateurs
-- TRUNCATE TABLE clients CASCADE;
-- TRUNCATE TABLE users CASCADE;

-- Tables d'audit
TRUNCATE TABLE audit_logs CASCADE;

-- ============================================================================
-- ÉTAPE 3: Rafraîchir les vues matérialisées (si elles existent)
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'edi_dashboard_stats') THEN
    REFRESH MATERIALIZED VIEW edi_dashboard_stats;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'edi_client_performance') THEN
    REFRESH MATERIALIZED VIEW edi_client_performance;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'location_statistics_by_yard') THEN
    REFRESH MATERIALIZED VIEW location_statistics_by_yard;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'location_statistics_by_stack') THEN
    REFRESH MATERIALIZED VIEW location_statistics_by_stack;
  END IF;
END $$;

-- ============================================================================
-- ÉTAPE 4: Réinitialiser les séquences (pour repartir à 1)
-- ============================================================================
-- Les séquences des UUID sont automatiques, mais si vous avez des SERIAL:
-- ALTER SEQUENCE nom_sequence RESTART WITH 1;

-- ============================================================================
-- ÉTAPE 5: Réactiver les triggers et contraintes
-- ============================================================================
SET session_replication_role = 'origin';

COMMIT;

-- ============================================================================
-- VÉRIFICATION POST-RÉINITIALISATION
-- ============================================================================
-- Décommentez les lignes suivantes pour vérifier que les tables sont vides

-- SELECT 'edi_transmission_logs' as table_name, COUNT(*) as row_count FROM edi_transmission_logs
-- UNION ALL SELECT 'edi_client_settings', COUNT(*) FROM edi_client_settings
-- UNION ALL SELECT 'edi_server_configurations', COUNT(*) FROM edi_server_configurations
-- UNION ALL SELECT 'user_login_history', COUNT(*) FROM user_login_history
-- UNION ALL SELECT 'user_activities', COUNT(*) FROM user_activities
-- UNION ALL SELECT 'location_audit_log', COUNT(*) FROM location_audit_log
-- UNION ALL SELECT 'location_id_mappings', COUNT(*) FROM location_id_mappings
-- UNION ALL SELECT 'locations', COUNT(*) FROM locations
-- UNION ALL SELECT 'stack_assignments', COUNT(*) FROM stack_assignments
-- UNION ALL SELECT 'stack_pairings', COUNT(*) FROM stack_pairings
-- UNION ALL SELECT 'virtual_stack_pairs', COUNT(*) FROM virtual_stack_pairs
-- UNION ALL SELECT 'stacks', COUNT(*) FROM stacks
-- UNION ALL SELECT 'sections', COUNT(*) FROM sections
-- UNION ALL SELECT 'yards', COUNT(*) FROM yards
-- UNION ALL SELECT 'client_pools', COUNT(*) FROM client_pools
-- UNION ALL SELECT 'user_module_access', COUNT(*) FROM user_module_access
-- UNION ALL SELECT 'gate_out_operations', COUNT(*) FROM gate_out_operations
-- UNION ALL SELECT 'gate_in_operations', COUNT(*) FROM gate_in_operations
-- UNION ALL SELECT 'release_orders', COUNT(*) FROM release_orders
-- UNION ALL SELECT 'containers', COUNT(*) FROM containers
-- UNION ALL SELECT 'clients', COUNT(*) FROM clients
-- UNION ALL SELECT 'users', COUNT(*) FROM users
-- UNION ALL SELECT 'audit_logs', COUNT(*) FROM audit_logs;

-- ============================================================================
-- FIN DU SCRIPT
-- ============================================================================
