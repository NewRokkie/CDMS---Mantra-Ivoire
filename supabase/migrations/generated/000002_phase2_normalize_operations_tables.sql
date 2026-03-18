-- ============================================
-- PHASE 2: NORMALISATION DES TABLES
-- ============================================
-- Script de normalisation des tables avec trop de colonnes
-- Généré: 2026-03-04
-- Sévérité: MEDIUM PRIORITY
-- ============================================

BEGIN;

-- ============================================
-- ÉTAPE 1: CRÉATION DES TABLES DE NORMALISATION
-- ============================================

-- --------------------------------------------
-- 1.1 Table: gate_in_edi_details
-- Purpose: Déplacer les champs EDI de gate_in_operations
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS public.gate_in_edi_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gate_in_operation_id UUID UNIQUE NOT NULL,
    edi_message_id TEXT,
    edi_client_name TEXT,
    edi_client_code TEXT,
    edi_processing_started_at TIMESTAMPTZ,
    edi_gate_in_transmitted BOOLEAN DEFAULT false,
    edi_transmission_date TIMESTAMPTZ,
    edi_log_id UUID,
    edi_error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    CONSTRAINT fk_gate_in_edi_details_operation 
        FOREIGN KEY (gate_in_operation_id) 
        REFERENCES public.gate_in_operations(id) ON DELETE CASCADE,
    CONSTRAINT fk_gate_in_edi_details_log 
        FOREIGN KEY (edi_log_id) 
        REFERENCES public.edi_transmission_logs(id)
);

CREATE INDEX idx_gate_in_edi_details_operation ON public.gate_in_edi_details(gate_in_operation_id);
CREATE INDEX idx_gate_in_edi_details_transmitted ON public.gate_in_edi_details(edi_gate_in_transmitted, created_at);

COMMENT ON TABLE public.gate_in_edi_details IS 'Détails EDI pour les opérations gate_in (normalisé depuis gate_in_operations)';

-- --------------------------------------------
-- 1.2 Table: gate_in_transport_info
-- Purpose: Déplacer les informations de transport
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS public.gate_in_transport_info (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gate_in_operation_id UUID UNIQUE NOT NULL,
    transport_company TEXT,
    driver_name TEXT,
    driver_phone TEXT,
    vehicle_number TEXT,
    truck_arrival_date DATE,
    truck_arrival_time TIME,
    booking_reference VARCHAR(100),
    equipment_reference TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    CONSTRAINT fk_gate_in_transport_operation 
        FOREIGN KEY (gate_in_operation_id) 
        REFERENCES public.gate_in_operations(id) ON DELETE CASCADE
);

CREATE INDEX idx_gate_in_transport_operation ON public.gate_in_transport_info(gate_in_operation_id);
CREATE INDEX idx_gate_in_transport_vehicle ON public.gate_in_transport_info(vehicle_number);

COMMENT ON TABLE public.gate_in_transport_info IS 'Informations de transport pour gate_in (normalisé depuis gate_in_operations)';

-- --------------------------------------------
-- 1.3 Table: gate_in_damage_assessments
-- Purpose: Déplacer l'assessment des dommages
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS public.gate_in_damage_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gate_in_operation_id UUID UNIQUE NOT NULL,
    damage_reported BOOLEAN DEFAULT false,
    damage_description TEXT,
    damage_type VARCHAR(50),
    damage_assessment JSONB,
    damage_assessment_stage VARCHAR(20) DEFAULT 'assignment',
    damage_assessed_by VARCHAR(255),
    damage_assessed_at TIMESTAMPTZ,
    damage_assessment_started_at TIMESTAMPTZ,
    damage_assessment_completed_at TIMESTAMPTZ,
    is_buffer_assignment BOOLEAN DEFAULT false,
    buffer_zone_reason TEXT,
    assigned_stack VARCHAR(50),
    assigned_location TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    CONSTRAINT fk_gate_in_damage_operation 
        FOREIGN KEY (gate_in_operation_id) 
        REFERENCES public.gate_in_operations(id) ON DELETE CASCADE
);

CREATE INDEX idx_gate_in_damage_operation ON public.gate_in_damage_assessments(gate_in_operation_id);
CREATE INDEX idx_gate_in_damage_stage ON public.gate_in_damage_assessments(damage_assessment_stage);
CREATE INDEX idx_gate_in_damage_assessment_json ON public.gate_in_damage_assessments USING GIN (damage_assessment);

COMMENT ON TABLE public.gate_in_damage_assessments IS 'Assessment des dommages pour gate_in (normalisé depuis gate_in_operations)';

-- --------------------------------------------
-- 1.4 Table: gate_out_edi_details
-- Purpose: Déplacer les champs EDI de gate_out_operations
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS public.gate_out_edi_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gate_out_operation_id UUID UNIQUE NOT NULL,
    edi_message_id TEXT,
    edi_client_name TEXT,
    edi_processing_started_at TIMESTAMPTZ,
    edi_gate_out_transmitted BOOLEAN DEFAULT false,
    edi_transmission_date TIMESTAMPTZ,
    edi_log_id UUID,
    edi_error_message TEXT,
    container_selection_started_at TIMESTAMPTZ,
    container_selection_completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    CONSTRAINT fk_gate_out_edi_details_operation 
        FOREIGN KEY (gate_out_operation_id) 
        REFERENCES public.gate_out_operations(id) ON DELETE CASCADE,
    CONSTRAINT fk_gate_out_edi_details_log 
        FOREIGN KEY (edi_log_id) 
        REFERENCES public.edi_transmission_logs(id)
);

CREATE INDEX idx_gate_out_edi_details_operation ON public.gate_out_edi_details(gate_out_operation_id);
CREATE INDEX idx_gate_out_edi_details_transmitted ON public.gate_out_edi_details(edi_gate_out_transmitted, created_at);

COMMENT ON TABLE public.gate_out_edi_details IS 'Détails EDI pour les opérations gate_out (normalisé depuis gate_out_operations)';

-- --------------------------------------------
-- 1.5 Table: gate_out_transport_info
-- Purpose: Déplacer les informations de transport de gate_out
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS public.gate_out_transport_info (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gate_out_operation_id UUID UNIQUE NOT NULL,
    transport_company TEXT,
    driver_name TEXT,
    driver_phone TEXT,
    vehicle_number TEXT,
    booking_number TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    CONSTRAINT fk_gate_out_transport_operation 
        FOREIGN KEY (gate_out_operation_id) 
        REFERENCES public.gate_out_operations(id) ON DELETE CASCADE
);

CREATE INDEX idx_gate_out_transport_operation ON public.gate_out_transport_info(gate_out_operation_id);
CREATE INDEX idx_gate_out_transport_booking ON public.gate_out_transport_info(booking_number);

COMMENT ON TABLE public.gate_out_transport_info IS 'Informations de transport pour gate_out (normalisé depuis gate_out_operations)';

-- ============================================
-- ÉTAPE 2: MIGRATION DES DONNÉES EXISTANTES
-- ============================================

-- 2.1 Migration gate_in_operations → gate_in_edi_details
INSERT INTO public.gate_in_edi_details (
    gate_in_operation_id,
    edi_message_id,
    edi_client_name,
    edi_client_code,
    edi_processing_started_at,
    edi_gate_in_transmitted,
    edi_transmission_date,
    edi_log_id,
    edi_error_message
)
SELECT 
    id,
    edi_message_id,
    edi_client_name,
    edi_client_code,
    edi_processing_started_at,
    edi_gate_in_transmitted,
    NULL, -- sera mis à jour via trigger
    edi_log_id,
    edi_error_message
FROM public.gate_in_operations
WHERE edi_message_id IS NOT NULL 
   OR edi_client_name IS NOT NULL 
   OR edi_log_id IS NOT NULL
ON CONFLICT (gate_in_operation_id) DO NOTHING;

-- 2.2 Migration gate_in_operations → gate_in_transport_info
INSERT INTO public.gate_in_transport_info (
    gate_in_operation_id,
    transport_company,
    driver_name,
    vehicle_number,
    truck_arrival_date,
    truck_arrival_time,
    booking_reference,
    equipment_reference
)
SELECT 
    id,
    transport_company,
    driver_name,
    vehicle_number,
    truck_arrival_date,
    truck_arrival_time,
    booking_reference,
    equipment_reference
FROM public.gate_in_operations
WHERE transport_company IS NOT NULL 
   OR driver_name IS NOT NULL 
   OR vehicle_number IS NOT NULL
ON CONFLICT (gate_in_operation_id) DO NOTHING;

-- 2.3 Migration gate_in_operations → gate_in_damage_assessments
INSERT INTO public.gate_in_damage_assessments (
    gate_in_operation_id,
    damage_reported,
    damage_description,
    damage_type,
    damage_assessment,
    damage_assessment_stage,
    damage_assessed_by,
    damage_assessed_at,
    damage_assessment_started_at,
    damage_assessment_completed_at,
    is_buffer_assignment,
    buffer_zone_reason,
    assigned_stack,
    assigned_location
)
SELECT 
    id,
    damage_reported,
    damage_description,
    damage_type,
    damage_assessment,
    damage_assessment_stage,
    damage_assessed_by,
    damage_assessed_at,
    damage_assessment_started_at,
    damage_assessment_completed_at,
    is_buffer_assignment,
    buffer_zone_reason,
    assigned_stack,
    assigned_location
FROM public.gate_in_operations
WHERE damage_reported = true 
   OR damage_assessment IS NOT NULL 
   OR damage_assessed_by IS NOT NULL
ON CONFLICT (gate_in_operation_id) DO NOTHING;

-- 2.4 Migration gate_out_operations → gate_out_edi_details
INSERT INTO public.gate_out_edi_details (
    gate_out_operation_id,
    edi_message_id,
    edi_client_name,
    edi_processing_started_at,
    edi_log_id,
    edi_error_message,
    container_selection_started_at,
    container_selection_completed_at
)
SELECT 
    id,
    edi_message_id,
    edi_client_name,
    edi_processing_started_at,
    edi_log_id,
    edi_error_message,
    container_selection_started_at,
    container_selection_completed_at
FROM public.gate_out_operations
WHERE edi_message_id IS NOT NULL 
   OR edi_client_name IS NOT NULL 
   OR edi_log_id IS NOT NULL
ON CONFLICT (gate_out_operation_id) DO NOTHING;

-- 2.5 Migration gate_out_operations → gate_out_transport_info
INSERT INTO public.gate_out_transport_info (
    gate_out_operation_id,
    transport_company,
    driver_name,
    vehicle_number,
    booking_number
)
SELECT 
    id,
    transport_company,
    driver_name,
    vehicle_number,
    booking_number
FROM public.gate_out_operations
WHERE transport_company IS NOT NULL 
   OR driver_name IS NOT NULL 
   OR vehicle_number IS NOT NULL
ON CONFLICT (gate_out_operation_id) DO NOTHING;

-- ============================================
-- ÉTAPE 3: TRIGGERS DE SYNCHRONISATION
-- ============================================

-- Trigger pour maintenir gate_in_edi_details synchronisé
CREATE OR REPLACE FUNCTION sync_gate_in_edi_details()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        INSERT INTO public.gate_in_edi_details (
            gate_in_operation_id,
            edi_message_id,
            edi_client_name,
            edi_client_code,
            edi_processing_started_at,
            edi_gate_in_transmitted,
            edi_log_id,
            edi_error_message,
            updated_at
        ) VALUES (
            NEW.id,
            NEW.edi_message_id,
            NEW.edi_client_name,
            NEW.edi_client_code,
            NEW.edi_processing_started_at,
            NEW.edi_gate_in_transmitted,
            NEW.edi_log_id,
            NEW.edi_error_message,
            now()
        )
        ON CONFLICT (gate_in_operation_id) DO UPDATE SET
            edi_message_id = NEW.edi_message_id,
            edi_client_name = NEW.edi_client_name,
            edi_client_code = NEW.edi_client_code,
            edi_processing_started_at = NEW.edi_processing_started_at,
            edi_gate_in_transmitted = NEW.edi_gate_in_transmitted,
            edi_log_id = NEW.edi_log_id,
            edi_error_message = NEW.edi_error_message,
            updated_at = now();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_sync_gate_in_edi_details
    AFTER INSERT OR UPDATE ON public.gate_in_operations
    FOR EACH ROW
    EXECUTE FUNCTION sync_gate_in_edi_details();

-- ============================================
-- ÉTAPE 4: VUES DE COMPATIBILITÉ
-- ============================================

-- Vue pour maintenir la compatibilité avec le code existant
CREATE OR REPLACE VIEW public.v_gate_in_operations_full AS
SELECT 
    gio.*,
    gied.edi_message_id AS full_edi_message_id,
    gied.edi_client_name AS full_edi_client_name,
    gied.edi_client_code AS full_edi_client_code,
    gied.edi_gate_in_transmitted,
    gti.transport_company,
    gti.driver_name,
    gti.vehicle_number,
    gti.truck_arrival_date,
    gti.truck_arrival_time,
    gti.booking_reference,
    gda.damage_reported AS full_damage_reported,
    gda.damage_description,
    gda.damage_type,
    gda.damage_assessment,
    gda.damage_assessed_by,
    gda.damage_assessed_at,
    gda.assigned_stack,
    gda.assigned_location
FROM public.gate_in_operations gio
LEFT JOIN public.gate_in_edi_details gied ON gio.id = gied.gate_in_operation_id
LEFT JOIN public.gate_in_transport_info gti ON gio.id = gti.gate_in_operation_id
LEFT JOIN public.gate_in_damage_assessments gda ON gio.id = gda.gate_in_operation_id;

COMMENT ON VIEW public.v_gate_in_operations_full IS 'Vue de compatibilité pour gate_in_operations avec toutes les données normalisées';

-- ============================================
-- ÉTAPE 5: CONTRÔLES DE VALIDATION
-- ============================================

-- Vérifier le nombre de lignes migrées
SELECT 
    'gate_in_edi_details' AS table_name, 
    COUNT(*) AS rows_migrated 
FROM public.gate_in_edi_details
UNION ALL
SELECT 
    'gate_in_transport_info', 
    COUNT(*) 
FROM public.gate_in_transport_info
UNION ALL
SELECT 
    'gate_in_damage_assessments', 
    COUNT(*) 
FROM public.gate_in_damage_assessments
UNION ALL
SELECT 
    'gate_out_edi_details', 
    COUNT(*) 
FROM public.gate_out_edi_details
UNION ALL
SELECT 
    'gate_out_transport_info', 
    COUNT(*) 
FROM public.gate_out_transport_info;

COMMIT;

-- ============================================
-- POST-MIGRATION: Notes importantes
-- ============================================
-- 
-- 1. Les colonnes originales dans gate_in_operations et gate_out_operations
--    sont conservées pour la compatibilité descendante.
--
-- 2. Pour supprimer définitivement les colonnes après validation:
--    ALTER TABLE public.gate_in_operations DROP COLUMN IF EXISTS edi_message_id;
--    (Voir script phase2b_drop_redundant_columns.sql)
--
-- 3. Mettre à jour le code application pour utiliser les nouvelles tables:
--    - gate_in_edi_details pour les données EDI
--    - gate_in_transport_info pour les données de transport
--    - gate_in_damage_assessments pour les dommages
--
-- 4. La vue v_gate_in_operations_full maintient la compatibilité
--
-- 5. Exécuter ANALYZE après migration:
--    ANALYZE public.gate_in_edi_details;
--    ANALYZE public.gate_in_transport_info;
--    ANALYZE public.gate_in_damage_assessments;
--    ANALYZE public.gate_out_edi_details;
--    ANALYZE public.gate_out_transport_info;
