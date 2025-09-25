-- =====================================================
-- CDMS (Container Depot Management System) - Container Management Module
-- Module: Container Management
-- Version: 1.0
-- Description: Complete container management with tracking and movement history
-- Dependencies: 01_foundation_schema.sql, 02_yard_management.sql
-- =====================================================

-- Set search path
SET search_path = cdms_core, public;

-- =====================================================
-- CONTAINER MANAGEMENT ENUMS
-- =====================================================

-- Container damage severity
CREATE TYPE damage_severity AS ENUM ('minor', 'moderate', 'major', 'critical');

-- Container inspection status
CREATE TYPE inspection_status AS ENUM ('pending', 'in_progress', 'completed', 'failed', 'expired');

-- Container movement types
CREATE TYPE movement_type AS ENUM ('gate_in', 'gate_out', 'yard_move', 'stack_move', 'maintenance', 'cleaning', 'inspection');

-- Container condition
CREATE TYPE container_condition AS ENUM ('excellent', 'good', 'fair', 'poor', 'damaged');

-- Full/Empty indicator
CREATE TYPE full_empty_indicator AS ENUM ('FULL', 'EMPTY');

-- =====================================================
-- CONTAINER MANAGEMENT TABLES
-- =====================================================

-- Main Containers table
CREATE TABLE containers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Container identification
    container_number VARCHAR(20) UNIQUE NOT NULL,
    check_digit CHAR(1), -- Last digit of container number for validation

    -- Container specifications
    container_type container_type NOT NULL DEFAULT 'dry',
    container_size container_size NOT NULL DEFAULT '20ft',
    status container_status NOT NULL DEFAULT 'in_depot',
    condition container_condition DEFAULT 'good',
    full_empty_status full_empty_indicator DEFAULT 'EMPTY',

    -- Current location information
    current_yard_id UUID REFERENCES yards(id),
    current_position_id UUID REFERENCES yard_positions(id),
    location_description TEXT, -- Human readable location

    -- Client and ownership
    client_id UUID, -- Will be linked when clients module is created
    client_code VARCHAR(10),
    client_name VARCHAR(100),

    -- Operational dates
    gate_in_date TIMESTAMP WITH TIME ZONE,
    gate_out_date TIMESTAMP WITH TIME ZONE,
    estimated_departure TIMESTAMP WITH TIME ZONE,
    free_days_until DATE,

    -- Physical attributes
    tare_weight DECIMAL(8,2), -- Empty weight in tons
    gross_weight DECIMAL(8,2), -- Loaded weight in tons
    max_gross_weight DECIMAL(8,2), -- Maximum allowed weight

    -- Seals and security
    seal_numbers TEXT[], -- Array of seal numbers
    customs_seal VARCHAR(20),

    -- Damage and inspection
    is_damaged BOOLEAN DEFAULT FALSE,
    damage_description TEXT,
    last_inspection_date TIMESTAMP WITH TIME ZONE,
    next_inspection_due TIMESTAMP WITH TIME ZONE,

    -- Temperature control (for reefers)
    temperature_set DECIMAL(4,1), -- Celsius
    temperature_min DECIMAL(4,1),
    temperature_max DECIMAL(4,1),
    is_temperature_controlled BOOLEAN DEFAULT FALSE,

    -- Special handling requirements
    is_hazardous BOOLEAN DEFAULT FALSE,
    hazard_class VARCHAR(10),
    special_instructions TEXT,

    -- Release order reference
    release_order_id UUID, -- Will be linked when release orders module is created
    booking_reference VARCHAR(50),

    -- Billing information
    daily_storage_rate DECIMAL(10,2) DEFAULT 0.00,
    currency VARCHAR(3) DEFAULT 'USD',
    demurrage_start_date DATE,

    -- Operational notes
    notes TEXT,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

-- Container Movement History
CREATE TABLE container_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    container_id UUID REFERENCES containers(id) ON DELETE CASCADE,
    container_number VARCHAR(20) NOT NULL,

    -- Movement details
    movement_type movement_type NOT NULL,
    movement_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Location information
    from_yard_id UUID REFERENCES yards(id),
    to_yard_id UUID REFERENCES yards(id),
    from_position_id UUID REFERENCES yard_positions(id),
    to_position_id UUID REFERENCES yard_positions(id),
    from_location TEXT,
    to_location TEXT,

    -- Transport details (for gate operations)
    truck_number VARCHAR(20),
    driver_name VARCHAR(100),
    transport_company VARCHAR(100),

    -- Status change
    old_status container_status,
    new_status container_status,

    -- Operation context
    gate_operation_id UUID, -- Will be linked to gate operations
    release_order_id UUID, -- Will be linked to release orders

    -- User and session
    performed_by UUID REFERENCES users(id),
    performed_by_name VARCHAR(100),
    session_id UUID REFERENCES user_sessions(id),

    -- Additional details
    notes TEXT,
    operation_duration INTERVAL, -- Time taken for the operation

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Container Damage Records
CREATE TABLE container_damages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    container_id UUID REFERENCES containers(id) ON DELETE CASCADE,
    container_number VARCHAR(20) NOT NULL,

    -- Damage details
    damage_type VARCHAR(50) NOT NULL, -- e.g., 'dent', 'hole', 'rust', 'structural'
    damage_location VARCHAR(100), -- e.g., 'front_wall', 'left_side', 'roof', 'door'
    severity damage_severity DEFAULT 'minor',

    -- Description and measurements
    description TEXT NOT NULL,
    length_cm DECIMAL(6,2),
    width_cm DECIMAL(6,2),
    depth_cm DECIMAL(6,2),

    -- Detection and reporting
    detected_during VARCHAR(50), -- 'gate_in', 'inspection', 'gate_out', 'maintenance'
    detected_by UUID REFERENCES users(id),
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Photos and documentation
    photo_urls TEXT[], -- Array of photo URLs
    repair_required BOOLEAN DEFAULT FALSE,
    repair_estimate DECIMAL(10,2),
    repair_priority priority_level DEFAULT 'medium',

    -- Repair tracking
    repair_scheduled_date DATE,
    repair_completed_date DATE,
    repair_performed_by VARCHAR(100),
    repair_cost DECIMAL(10,2),
    repair_notes TEXT,

    -- Status
    is_active BOOLEAN DEFAULT TRUE, -- FALSE when damage is repaired

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

-- Container Inspections
CREATE TABLE container_inspections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    container_id UUID REFERENCES containers(id) ON DELETE CASCADE,
    container_number VARCHAR(20) NOT NULL,

    -- Inspection details
    inspection_type VARCHAR(50) NOT NULL, -- 'gate_in', 'gate_out', 'periodic', 'damage_assessment', 'pre_trip'
    inspection_status inspection_status DEFAULT 'pending',

    -- Scheduling
    scheduled_date DATE,
    scheduled_by UUID REFERENCES users(id),

    -- Execution
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    performed_by UUID REFERENCES users(id),
    performed_by_name VARCHAR(100),

    -- Results
    overall_condition container_condition,
    is_approved BOOLEAN,
    defects_found INTEGER DEFAULT 0,

    -- Checklist items (stored as JSON for flexibility)
    checklist_items JSONB DEFAULT '[]',

    -- Findings and recommendations
    findings TEXT,
    recommendations TEXT,
    follow_up_required BOOLEAN DEFAULT FALSE,
    follow_up_date DATE,

    -- Documentation
    photos_urls TEXT[],
    documents_urls TEXT[],

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

-- Container Location History (for detailed tracking)
CREATE TABLE container_location_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    container_id UUID REFERENCES containers(id) ON DELETE CASCADE,
    container_number VARCHAR(20) NOT NULL,

    -- Location snapshot
    yard_id UUID REFERENCES yards(id),
    section_id UUID REFERENCES yard_sections(id),
    stack_id UUID REFERENCES yard_stacks(id),
    position_id UUID REFERENCES yard_positions(id),

    -- Position coordinates at time of record
    position_x DECIMAL(10,2),
    position_y DECIMAL(10,2),
    position_z DECIMAL(10,2),

    -- Location description
    location_description TEXT,

    -- Time range
    arrived_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    departed_at TIMESTAMP WITH TIME ZONE,
    duration INTERVAL GENERATED ALWAYS AS (departed_at - arrived_at) STORED,

    -- Context
    movement_id UUID REFERENCES container_movements(id),
    reason VARCHAR(100), -- Why container was moved to this location

    -- Status during this location
    container_status container_status,

    -- Metadata
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    recorded_by UUID REFERENCES users(id)
);

-- Container Maintenance Records
CREATE TABLE container_maintenance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    container_id UUID REFERENCES containers(id) ON DELETE CASCADE,
    container_number VARCHAR(20) NOT NULL,

    -- Maintenance details
    maintenance_type VARCHAR(50) NOT NULL, -- 'cleaning', 'repair', 'inspection', 'pti', 'certification'
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'on_hold')),

    -- Scheduling
    scheduled_date DATE,
    scheduled_by UUID REFERENCES users(id),
    priority priority_level DEFAULT 'medium',

    -- Execution
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    performed_by VARCHAR(100),

    -- Work details
    work_description TEXT,
    materials_used TEXT,
    labor_hours DECIMAL(4,1),

    -- Costs
    labor_cost DECIMAL(10,2),
    material_cost DECIMAL(10,2),
    total_cost DECIMAL(10,2) GENERATED ALWAYS AS (COALESCE(labor_cost, 0) + COALESCE(material_cost, 0)) STORED,

    -- Quality control
    quality_check_passed BOOLEAN,
    quality_checked_by UUID REFERENCES users(id),
    quality_check_notes TEXT,

    -- Next maintenance
    next_maintenance_due DATE,
    next_maintenance_type VARCHAR(50),

    -- Documentation
    photos_before TEXT[],
    photos_after TEXT[],
    maintenance_report_url TEXT,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

-- =====================================================
-- INDEXES FOR CONTAINER MANAGEMENT
-- =====================================================

-- Containers indexes
CREATE INDEX idx_containers_number ON containers(container_number);
CREATE INDEX idx_containers_client ON containers(client_code) WHERE client_code IS NOT NULL;
CREATE INDEX idx_containers_status ON containers(status);
CREATE INDEX idx_containers_type_size ON containers(container_type, container_size);
CREATE INDEX idx_containers_yard ON containers(current_yard_id) WHERE current_yard_id IS NOT NULL;
CREATE INDEX idx_containers_position ON containers(current_position_id) WHERE current_position_id IS NOT NULL;
CREATE INDEX idx_containers_damaged ON containers(is_damaged) WHERE is_damaged = TRUE;
CREATE INDEX idx_containers_gate_in ON containers(gate_in_date) WHERE gate_in_date IS NOT NULL;
CREATE INDEX idx_containers_gate_out ON containers(gate_out_date) WHERE gate_out_date IS NOT NULL;
CREATE INDEX idx_containers_booking ON containers(booking_reference) WHERE booking_reference IS NOT NULL;

-- Movements indexes
CREATE INDEX idx_container_movements_container ON container_movements(container_id);
CREATE INDEX idx_container_movements_number ON container_movements(container_number);
CREATE INDEX idx_container_movements_type ON container_movements(movement_type);
CREATE INDEX idx_container_movements_date ON container_movements(movement_date);
CREATE INDEX idx_container_movements_yards ON container_movements(from_yard_id, to_yard_id);
CREATE INDEX idx_container_movements_user ON container_movements(performed_by);

-- Damages indexes
CREATE INDEX idx_container_damages_container ON container_damages(container_id);
CREATE INDEX idx_container_damages_number ON container_damages(container_number);
CREATE INDEX idx_container_damages_severity ON container_damages(severity);
CREATE INDEX idx_container_damages_active ON container_damages(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_container_damages_repair ON container_damages(repair_required) WHERE repair_required = TRUE;

-- Inspections indexes
CREATE INDEX idx_container_inspections_container ON container_inspections(container_id);
CREATE INDEX idx_container_inspections_status ON container_inspections(inspection_status);
CREATE INDEX idx_container_inspections_scheduled ON container_inspections(scheduled_date);
CREATE INDEX idx_container_inspections_type ON container_inspections(inspection_type);

-- Location history indexes
CREATE INDEX idx_container_location_container ON container_location_history(container_id);
CREATE INDEX idx_container_location_yard ON container_location_history(yard_id);
CREATE INDEX idx_container_location_position ON container_location_history(position_id);
CREATE INDEX idx_container_location_arrived ON container_location_history(arrived_at);
CREATE INDEX idx_container_location_active ON container_location_history(departed_at) WHERE departed_at IS NULL;

-- Maintenance indexes
CREATE INDEX idx_container_maintenance_container ON container_maintenance(container_id);
CREATE INDEX idx_container_maintenance_type ON container_maintenance(maintenance_type);
CREATE INDEX idx_container_maintenance_status ON container_maintenance(status);
CREATE INDEX idx_container_maintenance_scheduled ON container_maintenance(scheduled_date);
CREATE INDEX idx_container_maintenance_due ON container_maintenance(next_maintenance_due) WHERE next_maintenance_due IS NOT NULL;

-- =====================================================
-- TRIGGERS FOR CONTAINER MANAGEMENT
-- =====================================================

-- Add updated_at triggers
CREATE TRIGGER update_containers_updated_at BEFORE UPDATE ON containers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_container_damages_updated_at BEFORE UPDATE ON container_damages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_container_inspections_updated_at BEFORE UPDATE ON container_inspections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_container_maintenance_updated_at BEFORE UPDATE ON container_maintenance
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add audit triggers
CREATE TRIGGER audit_containers_changes AFTER INSERT OR UPDATE OR DELETE ON containers
    FOR EACH ROW EXECUTE FUNCTION create_audit_log_entry();

CREATE TRIGGER audit_container_movements_changes AFTER INSERT OR UPDATE OR DELETE ON container_movements
    FOR EACH ROW EXECUTE FUNCTION create_audit_log_entry();

-- =====================================================
-- CONTAINER-SPECIFIC FUNCTIONS
-- =====================================================

-- Function to validate container number check digit
CREATE OR REPLACE FUNCTION validate_container_number(container_num VARCHAR(20))
RETURNS BOOLEAN AS $$
DECLARE
    check_sum INTEGER := 0;
    i INTEGER;
    char_val INTEGER;
    multiplier INTEGER[] := ARRAY[1, 2, 4, 8, 16, 32, 64, 128, 256, 512];
    calculated_check INTEGER;
BEGIN
    -- Container number should be 11 characters (ABCD1234567)
    IF LENGTH(container_num) != 11 THEN
        RETURN FALSE;
    END IF;

    -- Calculate check digit for first 10 characters
    FOR i IN 1..10 LOOP
        char_val := CASE
            WHEN SUBSTRING(container_num, i, 1) ~ '[0-9]' THEN
                SUBSTRING(container_num, i, 1)::INTEGER
            ELSE
                -- Convert letter to number (A=10, B=12, C=13, etc., skip 11)
                ASCII(SUBSTRING(container_num, i, 1)) - 55 +
                CASE WHEN ASCII(SUBSTRING(container_num, i, 1)) > 75 THEN 1 ELSE 0 END
        END;

        check_sum := check_sum + (char_val * multiplier[i]);
    END LOOP;

    calculated_check := check_sum % 11;
    calculated_check := CASE WHEN calculated_check = 10 THEN 0 ELSE calculated_check END;

    RETURN calculated_check = SUBSTRING(container_num, 11, 1)::INTEGER;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically create movement record when container location changes
CREATE OR REPLACE FUNCTION log_container_movement()
RETURNS TRIGGER AS $$
BEGIN
    -- Only log if position actually changed
    IF (OLD.current_position_id IS DISTINCT FROM NEW.current_position_id) OR
       (OLD.current_yard_id IS DISTINCT FROM NEW.current_yard_id) OR
       (OLD.status IS DISTINCT FROM NEW.status) THEN

        INSERT INTO container_movements (
            container_id,
            container_number,
            movement_type,
            from_yard_id,
            to_yard_id,
            from_position_id,
            to_position_id,
            from_location,
            to_location,
            old_status,
            new_status,
            performed_by,
            performed_by_name
        ) VALUES (
            NEW.id,
            NEW.container_number,
            CASE
                WHEN NEW.status = 'in_depot' AND OLD.status != 'in_depot' THEN 'gate_in'
                WHEN NEW.status != 'in_depot' AND OLD.status = 'in_depot' THEN 'gate_out'
                WHEN OLD.current_position_id IS DISTINCT FROM NEW.current_position_id THEN 'yard_move'
                ELSE 'stack_move'
            END,
            OLD.current_yard_id,
            NEW.current_yard_id,
            OLD.current_position_id,
            NEW.current_position_id,
            OLD.location_description,
            NEW.location_description,
            OLD.status,
            NEW.status,
            NEW.updated_by,
            (SELECT name FROM users WHERE id = NEW.updated_by)
        );

        -- Update location history - close previous location
        UPDATE container_location_history
        SET departed_at = CURRENT_TIMESTAMP
        WHERE container_id = NEW.id AND departed_at IS NULL;

        -- Create new location history record if container is in depot
        IF NEW.current_yard_id IS NOT NULL THEN
            INSERT INTO container_location_history (
                container_id,
                container_number,
                yard_id,
                section_id,
                stack_id,
                position_id,
                location_description,
                container_status,
                recorded_by
            ) VALUES (
                NEW.id,
                NEW.container_number,
                NEW.current_yard_id,
                (SELECT section_id FROM yard_positions WHERE id = NEW.current_position_id),
                (SELECT stack_id FROM yard_positions WHERE id = NEW.current_position_id),
                NEW.current_position_id,
                NEW.location_description,
                NEW.status,
                NEW.updated_by
            );
        END IF;

        -- Update yard position occupancy
        IF OLD.current_position_id IS NOT NULL THEN
            UPDATE yard_positions
            SET is_occupied = FALSE,
                container_id = NULL,
                container_number = NULL,
                container_size = NULL,
                client_code = NULL,
                placed_at = NULL
            WHERE id = OLD.current_position_id;
        END IF;

        IF NEW.current_position_id IS NOT NULL THEN
            UPDATE yard_positions
            SET is_occupied = TRUE,
                container_id = NEW.id,
                container_number = NEW.container_number,
                container_size = NEW.container_size,
                client_code = NEW.client_code,
                placed_at = CURRENT_TIMESTAMP
            WHERE id = NEW.current_position_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for container movement logging
CREATE TRIGGER log_container_movements AFTER UPDATE ON containers
    FOR EACH ROW EXECUTE FUNCTION log_container_movement();

-- Function to update container status when damage is reported
CREATE OR REPLACE FUNCTION update_container_on_damage()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.severity IN ('major', 'critical') THEN
        UPDATE containers
        SET is_damaged = TRUE,
            status = CASE
                WHEN status = 'in_depot' THEN 'maintenance'
                ELSE status
            END,
            damage_description = NEW.description,
            updated_at = CURRENT_TIMESTAMP,
            updated_by = NEW.created_by
        WHERE id = NEW.container_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for damage impact on container
CREATE TRIGGER update_container_damage_status AFTER INSERT OR UPDATE ON container_damages
    FOR EACH ROW EXECUTE FUNCTION update_container_on_damage();

-- =====================================================
-- VIEWS FOR CONTAINER MANAGEMENT
-- =====================================================

-- View for container overview with current location
CREATE VIEW v_container_overview AS
SELECT
    c.id,
    c.container_number,
    c.container_type,
    c.container_size,
    c.status,
    c.condition,
    c.full_empty_status,
    c.client_code,
    c.client_name,
    y.name as current_yard_name,
    y.code as current_yard_code,
    ys.name as current_section_name,
    ysk.stack_number as current_stack_number,
    c.location_description,
    c.gate_in_date,
    c.gate_out_date,
    c.is_damaged,
    c.booking_reference,
    CASE
        WHEN c.gate_in_date IS NOT NULL AND c.gate_out_date IS NULL THEN
            CURRENT_DATE - c.gate_in_date::DATE
        ELSE NULL
    END as days_in_depot,
    c.created_at,
    c.updated_at
FROM containers c
LEFT JOIN yards y ON c.current_yard_id = y.id
LEFT JOIN yard_positions yp ON c.current_position_id = yp.id
LEFT JOIN yard_sections ys ON yp.section_id = ys.id
LEFT JOIN yard_stacks ysk ON yp.stack_id = ysk.id;

-- View for container movement summary
CREATE VIEW v_container_movement_summary AS
SELECT
    c.container_number,
    COUNT(cm.id) as total_movements,
    MAX(cm.movement_date) as last_movement_date,
    COUNT(DISTINCT cm.from_yard_id) + COUNT(DISTINCT cm.to_yard_id) as yards_visited,
    AVG(EXTRACT(EPOCH FROM cm.operation_duration)/3600)::DECIMAL(6,2) as avg_operation_hours
FROM containers c
LEFT JOIN container_movements cm ON c.id = cm.container_id
GROUP BY c.id, c.container_number;

-- View for damaged containers requiring attention
CREATE VIEW v_damaged_containers AS
SELECT
    c.container_number,
    c.container_type,
    c.container_size,
    c.status,
    c.client_code,
    y.name as yard_name,
    COUNT(cd.id) as damage_count,
    MAX(cd.severity) as max_severity,
    MAX(cd.detected_at) as last_damage_detected,
    SUM(CASE WHEN cd.repair_required = TRUE THEN 1 ELSE 0 END) as repairs_needed,
    SUM(cd.repair_estimate) as total_repair_estimate
FROM containers c
JOIN container_damages cd ON c.id = cd.container_id
LEFT JOIN yards y ON c.current_yard_id = y.id
WHERE cd.is_active = TRUE
GROUP BY c.id, c.container_number, c.container_type, c.container_size, c.status, c.client_code, y.name;

-- =====================================================
-- SAMPLE DATA FOR CONTAINER MANAGEMENT
-- =====================================================

-- Insert sample containers
INSERT INTO containers (
    id, container_number, check_digit, container_type, container_size, status, condition,
    full_empty_status, client_code, client_name, current_yard_id, location_description,
    gate_in_date, tare_weight, gross_weight, max_gross_weight, booking_reference,
    daily_storage_rate, notes
) VALUES
-- Maersk containers
('cont-maeu-001'::UUID, 'MAEU1234567', '0', 'dry', '40ft', 'in_depot', 'good', 'EMPTY', 'MAEU', 'Maersk Line', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::UUID, 'Stack S3, Tier 1', '2025-01-10 08:30:00', 3.8, 3.8, 30.5, 'BK-MAEU-2025-001', 15.00, 'Standard 40ft dry container'),
('cont-maeu-002'::UUID, 'MAEU2345678', '1', 'dry', '20ft', 'in_depot', 'good', 'EMPTY', 'MAEU', 'Maersk Line', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::UUID, 'Stack S5, Tier 2', '2025-01-09 14:15:00', 2.3, 2.3, 24.0, 'BK-MAEU-2025-002', 12.00, 'Standard 20ft dry container'),

-- MSC containers
('cont-mscu-001'::UUID, 'MSCU3456789', '2', 'reefer', '40ft', 'in_depot', 'excellent', 'EMPTY', 'MSCU', 'MSC Mediterranean Shipping', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::UUID, 'Stack S7, Tier 1', '2025-01-11 09:45:00', 4.2, 4.2, 30.5, 'BK-MSCU-2025-003', 25.00, 'Refrigerated container with temperature control'),
('cont-mscu-002'::UUID, 'MSCU4567890', '3', 'dry', '20ft', 'in_depot', 'fair', 'EMPTY', 'MSCU', 'MSC Mediterranean Shipping', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::UUID, 'Stack S9, Tier 3', '2025-01-08 16:20:00', 2.4, 2.4, 24.0, 'BK-MSCU-2025-004', 12.00, 'Standard container with minor wear'),

-- CMA CGM containers
('cont-cmdu-001'::UUID, 'CMDU5678901', '4', 'dry', '40ft', 'in_depot', 'good', 'EMPTY', 'CMDU', 'CMA CGM', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::UUID, 'Stack S11, Tier 1', '2025-01-07 11:30:00', 3.9, 3.9, 30.5, 'BK-CMDU-2025-005', 14.00, 'High-cube dry container');

-- =====================================================
-- CONTAINER MANAGEMENT MODULE COMPLETE
-- =====================================================

COMMENT ON TABLE containers IS 'Main container registry with specifications and current status';
COMMENT ON TABLE container_movements IS 'Complete history of container movements and status changes';
COMMENT ON TABLE container_damages IS 'Damage records with repair tracking and cost estimates';
COMMENT ON TABLE container_inspections IS 'Container inspection records and quality control';
COMMENT ON TABLE container_location_history IS 'Detailed location tracking with duration analysis';
COMMENT ON TABLE container_maintenance IS 'Maintenance and repair records with cost tracking';

-- Display success message
SELECT 'Container Management Module (03) - Schema created successfully!' as status,
       'Includes: Container registry, movement tracking, damage management, inspections, and maintenance' as details;
