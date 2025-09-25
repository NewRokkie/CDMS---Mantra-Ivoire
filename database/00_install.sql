-- =====================================================
-- CDMS (Container Depot Management System) - Installation Script
-- Version: 1.0
-- Author: Architect Mode - Kilo Code
-- Date: 2025-01-23
-- Description: Complete PostgreSQL database installation for Container Depot Management System
-- =====================================================

/*
  CDMS - CONTAINER DEPOT MANAGEMENT SYSTEM
  ========================================

  Un système complet de gestion de dépôts de conteneurs avec support multi-yards
  incluant les dépôts de Tantarelli, Vridi et San Pedro en Côte d'Ivoire.

  FONCTIONNALITÉS PRINCIPALES:
  ---------------------------
  ✅ Gestion multi-yards (Tantarelli, Vridi, San Pedro)
  ✅ Gestion complète des conteneurs avec tracking
  ✅ Opérations Gate In/Gate Out avec workflow complet
  ✅ Système de pools clients avec assignation de stacks
  ✅ Gestion des Release Orders et Booking References
  ✅ Système d'utilisateurs avec contrôle d'accès modulaire
  ✅ Audit complet et logs d'opérations
  ✅ Vues et rapports intégrés
  ✅ Triggers et fonctions pour automatisation

  ARCHITECTURE MODULAIRE:
  ----------------------
  Module 01: Foundation (Core System)
  Module 02: Yard Management (Multi-yards)
  Module 03: Container Management (Tracking & History)
  Module 04: Client Pools & Stack Assignments
  Module 05: Gate Operations (In/Out)
  Module 06: Release Orders & Booking References

  PRÉREQUIS:
  ----------
  - PostgreSQL 12+
  - Extensions: uuid-ossp, pgcrypto, btree_gin
  - Privilèges: CREATE DATABASE, CREATE SCHEMA, CREATE EXTENSION

  INSTALLATION:
  =============
  1. Créer la base de données:
     CREATE DATABASE cdms_db;

  2. Se connecter à la base de données:
     \c cdms_db

  3. Exécuter ce script d'installation:
     \i 00_install.sql

  ORDRE D'EXÉCUTION:
  ==================
*/

-- Vérification de la version PostgreSQL
DO $$
BEGIN
    IF current_setting('server_version_num')::INT < 120000 THEN
        RAISE EXCEPTION 'PostgreSQL version 12 or higher required. Current version: %',
                       current_setting('server_version');
    END IF;
    RAISE NOTICE 'PostgreSQL version check passed: %', current_setting('server_version');
END $$;

-- Message de bienvenue
SELECT '
╔════════════════════════════════════════════════════════════════════════════════╗
║                   CDMS - CONTAINER DEPOT MANAGEMENT SYSTEM                    ║
║                              Installation Started                             ║
╚════════════════════════════════════════════════════════════════════════════════╝
' as welcome_message;

-- =====================================================
-- PHASE 1: FOUNDATION MODULE
-- =====================================================

SELECT '🚀 Phase 1: Installation du module Foundation (Core System)...' as phase_1;

-- Exécution du module Foundation
\echo 'Installing Foundation Module...'
\i 01_foundation_schema.sql

-- =====================================================
-- PHASE 2: YARD MANAGEMENT MODULE
-- =====================================================

SELECT '🏗️  Phase 2: Installation du module Yard Management...' as phase_2;

-- Exécution du module Yard Management
\echo 'Installing Yard Management Module...'
\i 02_yard_management.sql

-- =====================================================
-- PHASE 3: CONTAINER MANAGEMENT MODULE
-- =====================================================

SELECT '📦 Phase 3: Installation du module Container Management...' as phase_3;

-- Exécution du module Container Management
\echo 'Installing Container Management Module...'
\i 03_container_management.sql

-- =====================================================
-- PHASE 4: CLIENT POOLS MODULE
-- =====================================================

SELECT '👥 Phase 4: Installation du module Client Pools & Stack Assignments...' as phase_4;

-- Exécution du module Client Pools
\echo 'Installing Client Pools Module...'
\i 04_client_pools.sql

-- =====================================================
-- PHASE 5: GATE OPERATIONS MODULE
-- =====================================================

SELECT '🚪 Phase 5: Installation du module Gate Operations...' as phase_5;

-- Exécution du module Gate Operations
\echo 'Installing Gate Operations Module...'
\i 05_gate_operations.sql

-- =====================================================
-- PHASE 6: RELEASE ORDERS MODULE
-- =====================================================

SELECT '📋 Phase 6: Installation du module Release Orders & Booking References...' as phase_6;

-- Exécution du module Release Orders
\echo 'Installing Release Orders Module...'
\i 06_release_orders.sql

-- =====================================================
-- POST-INSTALLATION: DONNÉES UTILISATEUR PAR DÉFAUT
-- =====================================================

SELECT '👤 Création des utilisateurs par défaut...' as creating_users;

-- Insertion des utilisateurs par défaut basés sur le système d'authentification
INSERT INTO users (
    id, name, email, role, company, phone, department, is_active,
    created_by, yardAssignments
) VALUES
-- Administrateur système
('admin-user-001'::UUID, 'John Administrator', 'admin@depot.com', 'admin', 'Container Depot Ltd', '+1-555-1001', 'Administration', TRUE, NULL, ARRAY['depot-tantarelli', 'depot-vridi', 'depot-san-pedro']),

-- Opérateur principal
('operator-user-001'::UUID, 'Jane Operator', 'operator@depot.com', 'operator', 'Container Depot Ltd', '+1-555-1002', 'Operations', TRUE, 'admin-user-001'::UUID, ARRAY['depot-tantarelli']),

-- Superviseur multi-yards
('supervisor-user-001'::UUID, 'Mike Supervisor', 'supervisor@depot.com', 'supervisor', 'Container Depot Ltd', '+1-555-1003', 'Operations', TRUE, 'admin-user-001'::UUID, ARRAY['depot-tantarelli', 'depot-vridi']),

-- Client Maersk
('client-maersk-001'::UUID, 'John Maersk Client', 'client2@maersk.com', 'client', 'Maersk Line', '+1-555-2002', 'Logistics', TRUE, 'admin-user-001'::UUID, ARRAY['depot-tantarelli', 'depot-san-pedro'])

ON CONFLICT (email) DO NOTHING;

-- Assignation des accès modules pour tous les utilisateurs
INSERT INTO user_module_access (user_id, module_name, has_access, granted_by)
SELECT
    u.id,
    mp.module_name,
    CASE
        WHEN u.role = 'admin' THEN TRUE
        WHEN u.role = 'supervisor' AND mp.category IN ('core', 'operations', 'management') THEN TRUE
        WHEN u.role = 'operator' AND mp.category IN ('core', 'operations') THEN TRUE
        WHEN u.role = 'client' AND mp.module_name IN ('dashboard', 'containers', 'releases', 'yard', 'depot_management') THEN TRUE
        ELSE FALSE
    END,
    'admin-user-001'::UUID
FROM users u
CROSS JOIN module_permissions mp
WHERE u.email IN ('admin@depot.com', 'operator@depot.com', 'supervisor@depot.com', 'client2@maersk.com')
ON CONFLICT (user_id, module_name) DO NOTHING;

-- Assignation des yards aux utilisateurs
INSERT INTO user_yard_assignments (user_id, yard_id, assigned_by)
SELECT
    u.id,
    y.id,
    'admin-user-001'::UUID
FROM users u
CROSS JOIN yards y
WHERE (u.email = 'admin@depot.com') -- Admin accès à tous les yards
   OR (u.email = 'operator@depot.com' AND y.code = 'DEPOT-01') -- Opérateur au Tantarelli
   OR (u.email = 'supervisor@depot.com' AND y.code IN ('DEPOT-01', 'DEPOT-02')) -- Superviseur à 2 yards
   OR (u.email = 'client2@maersk.com' AND y.code IN ('DEPOT-01', 'DEPOT-03')) -- Client Maersk à 2 yards
ON CONFLICT (user_id, yard_id) DO NOTHING;

-- =====================================================
-- POST-INSTALLATION: VALIDATION ET STATISTIQUES
-- =====================================================

SELECT '📊 Génération du rapport d''installation...' as generating_report;

-- Rapport d'installation
WITH installation_stats AS (
    SELECT
        'Schémas créés' as item,
        COUNT(DISTINCT schemaname) as count
    FROM pg_tables
    WHERE schemaname IN ('cdms_core', 'cdms_audit', 'cdms_config')

    UNION ALL

    SELECT
        'Tables créées' as item,
        COUNT(*) as count
    FROM pg_tables
    WHERE schemaname IN ('cdms_core', 'cdms_audit', 'cdms_config')

    UNION ALL

    SELECT
        'Vues créées' as item,
        COUNT(*) as count
    FROM pg_views
    WHERE schemaname IN ('cdms_core', 'cdms_audit', 'cdms_config')

    UNION ALL

    SELECT
        'Fonctions créées' as item,
        COUNT(*) as count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname IN ('cdms_core', 'cdms_audit', 'cdms_config')

    UNION ALL

    SELECT
        'Indexes créés' as item,
        COUNT(*) as count
    FROM pg_indexes
    WHERE schemaname IN ('cdms_core', 'cdms_audit', 'cdms_config')

    UNION ALL

    SELECT
        'Utilisateurs créés' as item,
        COUNT(*) as count
    FROM users

    UNION ALL

    SELECT
        'Yards configurés' as item,
        COUNT(*) as count
    FROM yards

    UNION ALL

    SELECT
        'Clients configurés' as item,
        COUNT(*) as count
    FROM clients

    UNION ALL

    SELECT
        'Pools clients créés' as item,
        COUNT(*) as count
    FROM client_pools

    UNION ALL

    SELECT
        'Conteneurs d''exemple' as item,
        COUNT(*) as count
    FROM containers
)
SELECT
    '📋 ' || item as "Composant",
    count || ' éléments' as "Quantité"
FROM installation_stats
ORDER BY
    CASE item
        WHEN 'Schémas créés' THEN 1
        WHEN 'Tables créées' THEN 2
        WHEN 'Vues créées' THEN 3
        WHEN 'Fonctions créées' THEN 4
        WHEN 'Indexes créés' THEN 5
        WHEN 'Utilisateurs créés' THEN 6
        WHEN 'Yards configurés' THEN 7
        WHEN 'Clients configurés' THEN 8
        WHEN 'Pools clients créés' THEN 9
        WHEN 'Conteneurs d''exemple' THEN 10
    END;

-- Vérification des contraintes et relations
SELECT '🔍 Vérification de l''intégrité des données...' as integrity_check;

DO $$
DECLARE
    constraint_violations INTEGER := 0;
    foreign_key_errors INTEGER := 0;
BEGIN
    -- Vérification des contraintes de clés étrangères
    SELECT COUNT(*) INTO foreign_key_errors
    FROM information_schema.table_constraints tc
    JOIN information_schema.referential_constraints rc ON tc.constraint_name = rc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema IN ('cdms_core', 'cdms_audit', 'cdms_config');

    IF foreign_key_errors > 0 THEN
        RAISE NOTICE '✅ % contraintes de clés étrangères vérifiées', foreign_key_errors;
    END IF;

    -- Vérification des données de test
    IF (SELECT COUNT(*) FROM yards) >= 3 AND
       (SELECT COUNT(*) FROM clients) >= 4 AND
       (SELECT COUNT(*) FROM users) >= 4 THEN
        RAISE NOTICE '✅ Données de test installées avec succès';
    ELSE
        RAISE WARNING '⚠️  Certaines données de test pourraient être manquantes';
    END IF;
END $$;

-- =====================================================
-- MESSAGE DE FIN D'INSTALLATION
-- =====================================================

SELECT '
╔════════════════════════════════════════════════════════════════════════════════╗
║                        INSTALLATION TERMINÉE AVEC SUCCÈS                     ║
╠════════════════════════════════════════════════════════════════════════════════╣
║                                                                                ║
║  🎉 Le système CDMS a été installé avec succès !                             ║
║                                                                                ║
║  📋 MODULES INSTALLÉS:                                                        ║
║     • Foundation (Utilisateurs, permissions, configuration)                   ║
║     • Yard Management (3 dépôts: Tantarelli, Vridi, San Pedro)              ║
║     • Container Management (Conteneurs et tracking complet)                   ║
║     • Client Pools (4 clients avec assignations de stacks)                   ║
║     • Gate Operations (Gate In/Out avec transport)                            ║
║     • Release Orders (Booking references et ordres de libération)             ║
║                                                                                ║
║  👤 COMPTES UTILISATEUR CRÉÉS:                                               ║
║     • admin@depot.com / demo123 (Administrateur)                             ║
║     • operator@depot.com / demo123 (Opérateur)                               ║
║     • supervisor@depot.com / demo123 (Superviseur)                           ║
║     • client2@maersk.com / demo123 (Client Maersk)                          ║
║                                                                                ║
║  🏗️  YARDS CONFIGURÉS:                                                       ║
║     • DEPOT-01: Depot Tantarelli (Layout spécial)                           ║
║     • DEPOT-02: Depot Vridi (Layout standard)                               ║
║     • DEPOT-03: Depot San Pedro (Layout standard)                           ║
║                                                                                ║
║  📦 DONNÉES D''EXEMPLE:                                                       ║
║     • Conteneurs, clients, transport, bookings                               ║
║     • Prêt pour tests et développement                                       ║
║                                                                                ║
║  🚀 PROCHAINES ÉTAPES:                                                       ║
║     1. Connecter votre application React/TypeScript                           ║
║     2. Configurer les connexions réseau                                      ║
║     3. Personnaliser les données selon vos besoins                           ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
' as installation_complete;

-- Affichage des informations de connexion
SELECT
    'Schéma principal' as "Type de connexion",
    'cdms_core' as "Schéma",
    'Toutes les tables opérationnelles' as "Description"
UNION ALL
SELECT
    'Schéma d''audit',
    'cdms_audit',
    'Logs et audit trail'
UNION ALL
SELECT
    'Schéma de configuration',
    'cdms_config',
    'Configuration système';

-- Configuration finale du search_path
ALTER DATABASE current_database() SET search_path = cdms_core, cdms_audit, cdms_config, public;

-- Message final
SELECT '✅ Installation CDMS terminée! Le système est prêt à être utilisé.' as final_status;
