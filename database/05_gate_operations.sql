-- =====================================================
-- CDMS (Container Depot Management System) - Gate Operations Module
-- Module: Gate In/Gate Out Operations
-- Version: 1.0
-- Description: Complete gate operations management for container entry and exit
-- Dependencies: 01_foundation_schema.sql, 02_yard_management.sql, 03_container_management.sql, 04_client_pools.sql
-- =====================================================

-- Set search path
SET search_path = cdms_core, public;

-- =====================================================
-- GATE OPERATIONS ENUMS
-- =====================================================

-- Gate operation status
CREATE TYPE gate_operation_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled', 'on_hold', 'failed');

-- Vehicle types
CREATE TYPE vehicle_type AS ENUM ('truck', 'trailer', 'chassis', 'container_truck');

-- Transport company status
CREATE TYPE transport_company_status AS ENUM ('active', 'inactive', 'blacklisted', 'suspended');

-- Validation result
CREATE TYPE validation_result AS ENUM ('passed', 'failed', 'warning', 'requires_inspection');

-- Gate type
CREATE TYPE gate_type AS ENUM ('in', 'out', 'both');

-- =====================================================
-- TRANSPORT AND LOGISTICS TABLES
-- =====================================================

-- Transport Companies registry
CREATE TABLE transport_companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Company identification
    name VARCHAR(200) NOT NULL,
    code VARCHAR(20) UNIQUE,
    registration_number VARCHAR(50),
    tax_id VARCHAR(50),

    -- Contact information
    contact_person VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(20),
    emergency_contact VARCHAR(20),

    -- Address
    address_street VARCHAR(255),
    address_city VARCHAR(100),
    address_country VARCHAR(100) DEFAULT 'Côte d''Ivoire',

    -- Operational status
    status transport_company_status DEFAULT 'active',
    is_approved BOOLEAN DEFAULT FALSE,
    approval_date DATE,

    -- Performance metrics
    total_operations INTEGER DEFAULT 0,
    successful_operations INTEGER DEFAULT 0,
    average_rating DECIMAL(3,2) DEFAULT 0.00,

    -- Insurance and compliance
    insurance_valid_until DATE,
    license_valid_until DATE,
    safety_certification_date DATE,

    -- Notes and restrictions
    notes TEXT,
    restrictions TEXT,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

-- Vehicles registry
CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Vehicle identification
    vehicle_number VARCHAR(20) UNIQUE NOT NULL,
    license_plate VARCHAR(15),
    chassis_number VARCHAR(50),

    -- Vehicle details
    vehicle_type vehicle_type DEFAULT 'truck',
    make VARCHAR(50),
    model VARCHAR(50),
    year INTEGER,
    color VARCHAR(30),

    -- Transport company
    transport_company_id UUID REFERENCES transport_companies(id),
    transport_company_name VARCHAR(200),

    -- Operational status
    is_active BOOLEAN DEFAULT TRUE,
    is_available BOOLEAN DEFAULT TRUE,
    current_location TEXT,

    -- Capacity and specifications
    max_gross_weight DECIMAL(8,2),
    max_containers INTEGER DEFAULT 1,
    supported_container_sizes container_size[],

    -- Compliance and documentation
    registration_valid_until DATE,
    inspection_valid_until DATE,
    insurance_valid_until DATE,
    last_maintenance_date DATE,
    next_maintenance_due DATE,

    -- Performance tracking
    total_trips INTEGER DEFAULT 0,
    total_containers_transported INTEGER DEFAULT 0,
    average_trip_duration INTERVAL,

    -- Notes
    notes TEXT,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

-- Drivers registry
CREATE TABLE drivers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Driver identification
    name VARCHAR(100) NOT NULL,
    license_number VARCHAR(50) UNIQUE,
    national_id VARCHAR(50),

    -- Contact information
    phone VARCHAR(20),
    email VARCHAR(255),
    emergency_contact VARCHAR(100),
    emergency_phone VARCHAR(20),

    -- Employment
    transport_company_id UUID REFERENCES transport_companies(id),
    transport_company_name VARCHAR(200),
    employee_id VARCHAR(20),

    -- License and certifications
    license_class VARCHAR(10),
    license_valid_until DATE,
    hazmat_certified BOOLEAN DEFAULT FALSE,
    hazmat_cert_valid_until DATE,

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_available BOOLEAN DEFAULT TRUE,
    current_status VARCHAR(20) DEFAULT 'available' CHECK (current_status IN ('available', 'on_trip', 'off_duty', 'suspended')),

    -- Performance metrics
    total_trips INTEGER DEFAULT 0,
    safety_rating DECIMAL(3,2) DEFAULT 5.00,
    incident_count INTEGER DEFAULT 0,

    -- Notes and restrictions
    notes TEXT,
    restrictions TEXT,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

-- =====================================================
-- GATE OPERATIONS TABLES
-- =====================================================

-- Gate In Operations
CREATE TABLE gate_in_operations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Operation identification
    operation_number VARCHAR(50) UNIQUE,
    gate_reference VARCHAR(20),

    -- Container information
    container_id UUID REFERENCES containers(id),
    container_number VARCHAR(20) NOT NULL,
    second_container_number VARCHAR(20), -- For double operations
    container_size container_size NOT NULL,
    container_type container_type,
    container_quantity INTEGER DEFAULT 1 CHECK (container_quantity IN (1, 2)),
    container_condition container_condition DEFAULT 'good',
    full_empty_status full_empty_indicator DEFAULT 'EMPTY',

    -- Damage assessment
    is_damaged BOOLEAN DEFAULT FALSE,
    damage_description TEXT,
    damage_photos TEXT[], -- Array of photo URLs

    -- Client information
    client_id UUID REFERENCES clients(id),
    client_code VARCHAR(10),
    client_name VARCHAR(100),
    booking_reference VARCHAR(50),

    -- Transport details
    transport_company_id UUID REFERENCES transport_companies(id),
    transport_company VARCHAR(100),
    vehicle_id UUID REFERENCES vehicles(id),
    truck_number VARCHAR(20),
    driver_id UUID REFERENCES drivers(id),
    driver_name VARCHAR(100),
    driver_license VARCHAR(50),

    -- Timing information
    scheduled_arrival TIMESTAMP WITH TIME ZONE,
    actual_arrival TIMESTAMP WITH TIME ZONE,
    truck_arrival_date DATE,
    truck_arrival_time TIME,
    truck_departure_date DATE,
    truck_departure_time TIME,
    processing_started_at TIMESTAMP WITH TIME ZONE,
    processing_completed_at TIMESTAMP WITH TIME ZONE,
    processing_duration INTERVAL GENERATED ALWAYS AS (processing_completed_at - processing_started_at) STORED,

    -- Location assignment
    assigned_yard_id UUID REFERENCES yards(id),
    assigned_position_id UUID REFERENCES yard_positions(id),
    assigned_location TEXT,
    location_confirmed BOOLEAN DEFAULT FALSE,
    location_confirmed_at TIMESTAMP WITH TIME ZONE,

    -- Operation status and workflow
    operation_status gate_operation_status DEFAULT 'pending',
    current_step INTEGER DEFAULT 1, -- Which step of the process
    total_steps INTEGER DEFAULT 3, -- Total steps in process

    -- Validation and inspection
    pre_inspection_required BOOLEAN DEFAULT TRUE,
    pre_inspection_completed BOOLEAN DEFAULT FALSE,
    pre_inspection_passed BOOLEAN,
    inspection_notes TEXT,

    -- Seals and security
    seal_numbers TEXT[],
    seal_verified BOOLEAN DEFAULT FALSE,
    customs_cleared BOOLEAN DEFAULT TRUE,
    customs_reference VARCHAR(50),

    -- Weight and measurements
    gross_weight DECIMAL(8,2),
    tare_weight DECIMAL(8,2),
    net_weight DECIMAL(8,2) GENERATED ALWAYS AS (COALESCE(gross_weight, 0) - COALESCE(tare_weight, 0)) STORED,
    weight_verified BOOLEAN DEFAULT FALSE,

    -- User tracking
    created_by UUID REFERENCES users(id),
    assigned_to UUID REFERENCES users(id),
    completed_by UUID REFERENCES users(id),

    -- Notes and additional information
    special_instructions TEXT,
    notes TEXT,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Gate Out Operations
CREATE TABLE gate_out_operations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Operation identification
    operation_number VARCHAR(50) UNIQUE,
    gate_reference VARCHAR(20),

    -- Release order linkage
    release_order_id UUID, -- Will be linked to release orders module
    booking_number VARCHAR(50),

    -- Container information
    container_id UUID REFERENCES containers(id),
    container_number VARCHAR(20) NOT NULL,
    container_size container_size NOT NULL,
    container_type container_type,
    container_condition container_condition,

    -- Validation requirements
    container_validated BOOLEAN DEFAULT FALSE,
    validation_reference VARCHAR(50),
    pre_exit_inspection_required BOOLEAN DEFAULT TRUE,
    pre_exit_inspection_completed BOOLEAN DEFAULT FALSE,
    pre_exit_inspection_passed BOOLEAN,

    -- Client information
    client_id UUID REFERENCES clients(id),
    client_code VARCHAR(10),
    client_name VARCHAR(100),

    -- Transport details
    transport_company_id UUID REFERENCES transport_companies(id),
    transport_company VARCHAR(100),
    vehicle_id UUID REFERENCES vehicles(id),
    vehicle_number VARCHAR(20),
    driver_id UUID REFERENCES drivers(id),
    driver_name VARCHAR(100),
    driver_license VARCHAR(50),

    -- Current location in yard
    current_yard_id UUID REFERENCES yards(id),
    current_position_id UUID REFERENCES yard_positions(id),
    current_location TEXT,

    -- Timing information
    scheduled_pickup TIMESTAMP WITH TIME ZONE,
    actual_pickup_started TIMESTAMP WITH TIME ZONE,
    actual_pickup_completed TIMESTAMP WITH TIME ZONE,
    processing_duration INTERVAL GENERATED ALWAYS AS (actual_pickup_completed - actual_pickup_started) STORED,

    -- Operation status and workflow
    operation_status gate_operation_status DEFAULT 'pending',
    current_step INTEGER DEFAULT 1,
    total_steps INTEGER DEFAULT 4,

    -- Documentation and compliance
    delivery_order_number VARCHAR(50),
    customs_clearance_ref VARCHAR(50),
    export_declaration_ref VARCHAR(50),

    -- Seals and security (for loaded containers)
    new_seal_numbers TEXT[],
    seal_applied BOOLEAN DEFAULT FALSE,
    seal_verified BOOLEAN DEFAULT FALSE,

    -- Weight verification (for loaded containers)
    final_gross_weight DECIMAL(8,2),
    weight_verified BOOLEAN DEFAULT FALSE,
    weighing_slip_ref VARCHAR(50),

    -- User tracking
    created_by UUID REFERENCES users(id),
    assigned_to UUID REFERENCES users(id),
    completed_by UUID REFERENCES users(id),

    -- Notes and special instructions
    special_instructions TEXT,
    notes TEXT,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Container Validation Records
CREATE TABLE container_validations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Container and operation reference
    container_id UUID REFERENCES containers(id) ON DELETE CASCADE,
    container_number VARCHAR(20) NOT NULL,
    gate_in_operation_id UUID REFERENCES gate_in_operations(id),
    gate_out_operation_id UUID REFERENCES gate_out_operations(id),

    -- Validation context
    validation_type VARCHAR(50) NOT NULL, -- 'gate_in', 'gate_out', 'pre_exit', 'manual'
    validation_step VARCHAR(50), -- 'document_check', 'physical_inspection', 'seal_verification', etc.

    -- Validation results
    result validation_result NOT NULL,
    is_valid BOOLEAN GENERATED ALWAYS AS (result = 'passed') STORED,

    -- Validation details
    validation_criteria JSONB, -- Checklist items and criteria
    validation_findings JSONB, -- Detailed findings
    issues_found TEXT[],
    recommendations TEXT[],

    -- Validation metadata
    validated_by UUID REFERENCES users(id),
    validated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    validation_duration INTERVAL,

    -- Documentation
    photos_taken TEXT[],
    documents_checked TEXT[],
    validation_report_url TEXT,

    -- Follow-up actions
    requires_follow_up BOOLEAN DEFAULT FALSE,
    follow_up_actions TEXT,
    follow_up_due_date DATE,
    follow_up_completed BOOLEAN DEFAULT FALSE,

    -- Override and exceptions
    is_override BOOLEAN DEFAULT FALSE,
    override_reason TEXT,
    override_authorized_by UUID REFERENCES users(id),

    -- Notes
    notes TEXT,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Gate Operation Queue (for managing operation workflow)
CREATE TABLE gate_operation_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Operation reference
    gate_in_operation_id UUID REFERENCES gate_in_operations(id),
    gate_out_operation_id UUID REFERENCES gate_out_operations(id),
    operation_type gate_type NOT NULL,

    -- Queue management
    queue_number INTEGER,
    queue_priority priority_level DEFAULT 'medium',
    estimated_processing_time INTERVAL DEFAULT '30 minutes',

    -- Status tracking
    queue_status VARCHAR(20) DEFAULT 'waiting' CHECK (queue_status IN ('waiting', 'called', 'processing', 'completed', 'no_show')),
    called_at TIMESTAMP WITH TIME ZONE,
    processing_started_at TIMESTAMP WITH TIME ZONE,
    processing_completed_at TIMESTAMP WITH TIME ZONE,

    -- Assignment
    assigned_gate VARCHAR(10),
    assigned_operator UUID REFERENCES users(id),

    -- Performance metrics
    actual_processing_time INTERVAL,
    waiting_time INTERVAL,
    total_time INTERVAL GENERATED ALWAYS AS (processing_completed_at - created_at) STORED,

    -- Notes
    notes TEXT,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- INDEXES FOR GATE OPERATIONS
-- =====================================================

-- Transport companies indexes
CREATE INDEX idx_transport_companies_code ON transport_companies(code);
CREATE INDEX idx_transport_companies_status ON transport_companies(status);
CREATE INDEX idx_transport_companies_name ON transport_companies(name);

-- Vehicles indexes
CREATE INDEX idx_vehicles_number ON vehicles(vehicle_number);
CREATE INDEX idx_vehicles_company ON vehicles(transport_company_id);
CREATE INDEX idx_vehicles_type ON vehicles(vehicle_type);
CREATE INDEX idx_vehicles_active ON vehicles(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_vehicles_available ON vehicles(is_available) WHERE is_available = TRUE;

-- Drivers indexes
CREATE INDEX idx_drivers_license ON drivers(license_number);
CREATE INDEX idx_drivers_company ON drivers(transport_company_id);
CREATE INDEX idx_drivers_status ON drivers(current_status);
CREATE INDEX idx_drivers_active ON drivers(is_active) WHERE is_active = TRUE;

-- Gate In operations indexes
CREATE INDEX idx_gate_in_operations_number ON gate_in_operations(operation_number);
CREATE INDEX idx_gate_in_operations_container ON gate_in_operations(container_number);
CREATE INDEX idx_gate_in_operations_client ON gate_in_operations(client_code);
CREATE INDEX idx_gate_in_operations_status ON gate_in_operations(operation_status);
CREATE INDEX idx_gate_in_operations_date ON gate_in_operations(truck_arrival_date);
CREATE INDEX idx_gate_in_operations_booking ON gate_in_operations(booking_reference) WHERE booking_reference IS NOT NULL;
CREATE INDEX idx_gate_in_operations_pending ON gate_in_operations(created_at) WHERE operation_status = 'pending';

-- Gate Out operations indexes
CREATE INDEX idx_gate_out_operations_number ON gate_out_operations(operation_number);
CREATE INDEX idx_gate_out_operations_container ON gate_out_operations(container_number);
CREATE INDEX idx_gate_out_operations_client ON gate_out_operations(client_code);
CREATE INDEX idx_gate_out_operations_status ON gate_out_operations(operation_status);
CREATE INDEX idx_gate_out_operations_booking ON gate_out_operations(booking_number) WHERE booking_number IS NOT NULL;
CREATE INDEX idx_gate_out_operations_release ON gate_out_operations(release_order_id) WHERE release_order_id IS NOT NULL;
CREATE INDEX idx_gate_out_operations_pending ON gate_out_operations(created_at) WHERE operation_status = 'pending';

-- Validations indexes
CREATE INDEX idx_container_validations_container ON container_validations(container_id);
CREATE INDEX idx_container_validations_number ON container_validations(container_number);
CREATE INDEX idx_container_validations_type ON container_validations(validation_type);
CREATE INDEX idx_container_validations_result ON container_validations(result);
CREATE INDEX idx_container_validations_date ON container_validations(validated_at);

-- Queue indexes
CREATE INDEX idx_gate_operation_queue_type ON gate_operation_queue(operation_type);
CREATE INDEX idx_gate_operation_queue_status ON gate_operation_queue(queue_status);
CREATE INDEX idx_gate_operation_queue_priority ON gate_operation_queue(queue_priority);
CREATE INDEX idx_gate_operation_queue_number ON gate_operation_queue(queue_number);

-- =====================================================
-- TRIGGERS FOR GATE OPERATIONS
-- =====================================================

-- Add updated_at triggers
CREATE TRIGGER update_transport_companies_updated_at BEFORE UPDATE ON transport_companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_drivers_updated_at BEFORE UPDATE ON drivers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gate_in_operations_updated_at BEFORE UPDATE ON gate_in_operations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gate_out_operations_updated_at BEFORE UPDATE ON gate_out_operations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gate_operation_queue_updated_at BEFORE UPDATE ON gate_operation_queue
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add audit triggers
CREATE TRIGGER audit_gate_in_operations_changes AFTER INSERT OR UPDATE OR DELETE ON gate_in_operations
    FOR EACH ROW EXECUTE FUNCTION create_audit_log_entry();

CREATE TRIGGER audit_gate_out_operations_changes AFTER INSERT OR UPDATE OR DELETE ON gate_out_operations
    FOR EACH ROW EXECUTE FUNCTION create_audit_log_entry();

-- =====================================================
-- GATE OPERATIONS SPECIFIC FUNCTIONS
-- =====================================================

-- Function to generate operation number
CREATE OR REPLACE FUNCTION generate_operation_number(operation_type TEXT)
RETURNS VARCHAR(50) AS $$
DECLARE
    prefix VARCHAR(10);
    sequence_num INTEGER;
    operation_number VARCHAR(50);
BEGIN
    prefix := CASE
        WHEN operation_type = 'gate_in' THEN 'GIN'
        WHEN operation_type = 'gate_out' THEN 'GOUT'
        ELSE 'OP'
    END;

    -- Get next sequence number for today
    SELECT COALESCE(MAX(CAST(SUBSTRING(operation_number FROM '([0-9]+)$') AS INTEGER)), 0) + 1
    INTO sequence_num
    FROM (
        SELECT operation_number FROM gate_in_operations
        WHERE operation_number LIKE prefix || '-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-%'
        UNION ALL
        SELECT operation_number FROM gate_out_operations
        WHERE operation_number LIKE prefix || '-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-%'
    ) combined;

    operation_number := prefix || '-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(sequence_num::TEXT, 4, '0');

    RETURN operation_number;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically assign operation number
CREATE OR REPLACE FUNCTION assign_operation_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.operation_number IS NULL THEN
        NEW.operation_number := generate_operation_number(TG_TABLE_NAME);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for operation number assignment
CREATE TRIGGER assign_gate_in_operation_number BEFORE INSERT ON gate_in_operations
    FOR EACH ROW EXECUTE FUNCTION assign_operation_number();

CREATE TRIGGER assign_gate_out_operation_number BEFORE INSERT ON gate_out_operations
    FOR EACH ROW EXECUTE FUNCTION assign_operation_number();

-- Function to update container status on gate operations
CREATE OR REPLACE FUNCTION update_container_on_gate_operation()
RETURNS TRIGGER AS $$
BEGIN
    -- For Gate In operations
    IF TG_TABLE_NAME = 'gate_in_operations' THEN
        IF NEW.operation_status = 'completed' AND (OLD.operation_status IS NULL OR OLD.operation_status != 'completed') THEN
            -- Update container to in_depot status
            UPDATE containers
            SET status = 'in_depot',
                gate_in_date = NEW.processing_completed_at,
                current_yard_id = NEW.assigned_yard_id,
                current_position_id = NEW.assigned_position_id,
                location_description = NEW.assigned_location,
                client_code = NEW.client_code,
                client_name = NEW.client_name,
                booking_reference = NEW.booking_reference,
                condition = NEW.container_condition,
                full_empty_status = NEW.full_empty_status,
                is_damaged = NEW.is_damaged,
                damage_description = NEW.damage_description,
                gross_weight = NEW.gross_weight,
                tare_weight = NEW.tare_weight,
                seal_numbers = NEW.seal_numbers,
                updated_at = CURRENT_TIMESTAMP,
                updated_by = NEW.completed_by
            WHERE container_number = NEW.container_number;

            -- If container doesn't exist, create it
            IF NOT FOUND THEN
                INSERT INTO containers (
                    container_number, container_type, container_size, status, condition,
                    full_empty_status, client_code, client_name, current_yard_id, current_position_id,
                    location_description, gate_in_date, booking_reference, is_damaged,
                    damage_description, gross_weight, tare_weight, seal_numbers,
                    created_by, updated_by
                ) VALUES (
                    NEW.container_number, NEW.container_type, NEW.container_size, 'in_depot', NEW.container_condition,
                    NEW.full_empty_status, NEW.client_code, NEW.client_name, NEW.assigned_yard_id, NEW.assigned_position_id,
                    NEW.assigned_location, NEW.processing_completed_at, NEW.booking_reference, NEW.is_damaged,
                    NEW.damage_description, NEW.gross_weight, NEW.tare_weight, NEW.seal_numbers,
                    NEW.completed_by, NEW.completed_by
                );
            END IF;
        END IF;
    END IF;

    -- For Gate Out operations
    IF TG_TABLE_NAME = 'gate_out_operations' THEN
        IF NEW.operation_status = 'completed' AND (OLD.operation_status IS NULL OR OLD.operation_status != 'completed') THEN
            -- Update container to out_depot status
            UPDATE containers
            SET status = 'out_depot',
                gate_out_date = NEW.processing_completed_at,
                current_yard_id = NULL,
                current_position_id = NULL,
                location_description = 'Out of depot',
                final_gross_weight = NEW.final_gross_weight,
                updated_at = CURRENT_TIMESTAMP,
                updated_by = NEW.completed_by
            WHERE container_number = NEW.container_number;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for container status updates
CREATE TRIGGER update_container_on_gate_in AFTER INSERT OR UPDATE ON gate_in_operations
    FOR EACH ROW EXECUTE FUNCTION update_container_on_gate_operation();

CREATE TRIGGER update_container_on_gate_out AFTER INSERT OR UPDATE ON gate_out_operations
    FOR EACH ROW EXECUTE FUNCTION update_container_on_gate_operation();

-- Function to validate gate operation prerequisites
CREATE OR REPLACE FUNCTION validate_gate_operation_prerequisites()
RETURNS TRIGGER AS $$
BEGIN
    -- For Gate Out operations, ensure container is in depot
    IF TG_TABLE_NAME = 'gate_out_operations' THEN
        IF NOT EXISTS (
            SELECT 1 FROM containers
            WHERE container_number = NEW.container_number
            AND status = 'in_depot'
        ) THEN
            RAISE EXCEPTION 'Container % is not currently in depot', NEW.container_number;
        END IF;
    END IF;

    -- Validate transport company is active
    IF NEW.transport_company_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM transport_companies
            WHERE id = NEW.transport_company_id
            AND status = 'active'
        ) THEN
            RAISE EXCEPTION 'Transport company is not active';
        END IF;
    END IF;

    -- Validate driver is active and available
    IF NEW.driver_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM drivers
            WHERE id = NEW.driver_id
            AND is_active = TRUE
            AND current_status IN ('available', 'on_trip')
        ) THEN
            RAISE EXCEPTION 'Driver is not active or available';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for validation
CREATE TRIGGER validate_gate_in_prerequisites BEFORE INSERT OR UPDATE ON gate_in_operations
    FOR EACH ROW EXECUTE FUNCTION validate_gate_operation_prerequisites();

CREATE TRIGGER validate_gate_out_prerequisites BEFORE INSERT OR UPDATE ON gate_out_operations
    FOR EACH ROW EXECUTE FUNCTION validate_gate_operation_prerequisites();

-- =====================================================
-- VIEWS FOR GATE OPERATIONS
-- =====================================================

-- View for pending Gate In operations
CREATE VIEW v_pending_gate_in AS
SELECT
    gio.id,
    gio.operation_number,
    gio.container_number,
    gio.container_size,
    gio.container_type,
    gio.client_code,
    gio.client_name,
    gio.truck_number,
    gio.driver_name,
    gio.transport_company,
    gio.scheduled_arrival,
    gio.operation_status,
    gio.current_step,
    gio.total_steps,
    gio.created_at,
    (CURRENT_TIMESTAMP - gio.created_at) as waiting_time,
    u.name as created_by_name
FROM gate_in_operations gio
LEFT JOIN users u ON gio.created_by = u.id
WHERE gio.operation_status IN ('pending', 'in_progress')
ORDER BY gio.scheduled_arrival NULLS LAST, gio.created_at;

-- View for pending Gate Out operations
CREATE VIEW v_pending_gate_out AS
SELECT
    goo.id,
    goo.operation_number,
    goo.container_number,
    goo.container_size,
    goo.client_code,
    goo.client_name,
    goo.vehicle_number,
    goo.driver_name,
    goo.transport_company,
    goo.booking_number,
    goo.scheduled_pickup,
    goo.operation_status,
    goo.current_step,
    goo.total_steps,
    goo.current_location,
    goo.created_at,
    (CURRENT_TIMESTAMP - goo.created_at) as waiting_time,
    u.name as created_by_name
FROM gate_out_operations goo
LEFT JOIN users u ON goo.created_by = u.id
WHERE goo.operation_status IN ('pending', 'in_progress')
ORDER BY goo.scheduled_pickup NULLS LAST, goo.created_at;

-- View for gate operation statistics
CREATE VIEW v_gate_operation_stats AS
SELECT
    'gate_in' as operation_type,
    COUNT(*) as total_operations,
    COUNT(*) FILTER (WHERE operation_status = 'completed') as completed_operations,
    COUNT(*) FILTER (WHERE operation_status = 'pending') as pending_operations,
    COUNT(*) FILTER (WHERE operation_status = 'in_progress') as in_progress_operations,
    AVG(EXTRACT(EPOCH FROM processing_duration)/3600)::DECIMAL(6,2) as avg_processing_hours,
    COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE) as today_operations
FROM gate_in_operations
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
UNION ALL
SELECT
    'gate_out' as operation_type,
    COUNT(*) as total_operations,
    COUNT(*) FILTER (WHERE operation_status = 'completed') as completed_operations,
    COUNT(*) FILTER (WHERE operation_status = 'pending') as pending_operations,
    COUNT(*) FILTER (WHERE operation_status = 'in_progress') as in_progress_operations,
    AVG(EXTRACT(EPOCH FROM processing_duration)/3600)::DECIMAL(6,2) as avg_processing_hours,
    COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE) as today_operations
FROM gate_out_operations
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days';

-- =====================================================
-- SAMPLE DATA FOR GATE OPERATIONS
-- =====================================================

-- Insert sample transport companies
INSERT INTO transport_companies (
    id, name, code, contact_person, email, phone, status, is_approved,
    address_city, address_country, total_operations, successful_operations, average_rating
) VALUES
('transport-001'::UUID, 'SIVOM Transport', 'SIVOM', 'Kouassi Jean', 'contact@sivom.ci', '+225 20 30 40 50', 'active', TRUE, 'Abidjan', 'Côte d''Ivoire', 1250, 1190, 4.5),
('transport-002'::UUID, 'GETMA Logistics', 'GETMA', 'Adjoua Marie', 'info@getma.ci', '+225 20 30 40 51', 'active', TRUE, 'Abidjan', 'Côte d''Ivoire', 890, 845, 4.2),
('transport-003'::UUID, 'Express Cargo CI', 'EXPC', 'Traoré Ibrahim', 'ops@expresscargo.ci', '+225 20 30 40 52', 'active', TRUE, 'Abidjan', 'Côte d''Ivoire', 567, 523, 4.0);

-- Insert sample vehicles
INSERT INTO vehicles (
    id, vehicle_number, license_plate, vehicle_type, transport_company_id, transport_company_name,
    make, model, year, max_containers, supported_container_sizes, is_active, is_available
) VALUES
('vehicle-001'::UUID, 'TRK-001', 'AB-1234-CD', 'truck', 'transport-001'::UUID, 'SIVOM Transport', 'Volvo', 'FH16', 2020, 1, ARRAY['20ft', '40ft']::container_size[], TRUE, TRUE),
('vehicle-002'::UUID, 'TRK-002', 'AB-2345-EF', 'truck', 'transport-001'::UUID, 'SIVOM Transport', 'Mercedes', 'Actros', 2019, 1, ARRAY['20ft', '40ft']::container_size[], TRUE, TRUE),
('vehicle-003'::UUID, 'TRK-003', 'AB-3456-GH', 'truck', 'transport-002'::UUID, 'GETMA Logistics', 'Scania', 'R450', 2021, 1, ARRAY['20ft', '40ft']::container_size[], TRUE, TRUE);

-- Insert sample drivers
INSERT INTO drivers (
    id, name, license_number, phone, transport_company_id, transport_company_name,
    license_class, license_valid_until, is_active, is_available, current_status,
    total_trips, safety_rating
) VALUES
('driver-001'::UUID, 'Kouamé Yves', 'DL-2023-001', '+225 01 02 03 04 05', 'transport-001'::UUID, 'SIVOM Transport', 'C', '2026-12-31', TRUE, TRUE, 'available', 450, 4.8),
('driver-002'::UUID, 'Diabaté Fatou', 'DL-2023-002', '+225 01 02 03 04 06', 'transport-001'::UUID, 'SIVOM Transport', 'C', '2027-06-30', TRUE, TRUE, 'available', 320, 4.9),
('driver-003'::UUID, 'Koné Seydou', 'DL-2023-003', '+225 01 02 03 04 07', 'transport-002'::UUID, 'GETMA Logistics', 'C', '2026-09-30', TRUE, TRUE, 'available', 278, 4.7);

-- Insert sample Gate In operations
INSERT INTO gate_in_operations (
    id, container_number, container_size, container_type, container_quantity,
    full_empty_status, client_code, client_name, booking_reference,
    transport_company_id, transport_company, vehicle_id, truck_number,
    driver_id, driver_name, truck_arrival_date, truck_arrival_time,
    operation_status, assigned_yard_id, assigned_location, notes
) VALUES
('gate-in-001'::UUID, 'MAEU9876543', '40ft', 'dry', 1, 'EMPTY', 'MAEU', 'Maersk Line', 'BK-MAEU-2025-010',
 'transport-001'::UUID, 'SIVOM Transport', 'vehicle-001'::UUID, 'TRK-001',
 'driver-001'::UUID, 'Kouamé Yves', '2025-01-12', '09:30:00',
 'pending', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::UUID, 'To be assigned to Stack S3', 'Standard gate in operation'),

('gate-in-002'::UUID, 'MSCU8765432', '20ft', 'reefer', 1, 'EMPTY', 'MSCU', 'MSC Mediterranean Shipping', 'BK-MSCU-2025-015',
 'transport-002'::UUID, 'GETMA Logistics', 'vehicle-003'::UUID, 'TRK-003',
 'driver-003'::UUID, 'Koné Seydou', '2025-01-12', '11:15:00',
 'pending', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::UUID, 'To be assigned to Stack S7', 'Reefer container requiring power connection');

-- =====================================================
-- GATE OPERATIONS MODULE COMPLETE
-- =====================================================

COMMENT ON TABLE transport_companies IS 'Transport companies registry with compliance tracking';
COMMENT ON TABLE vehicles IS 'Vehicle fleet management with capacity and compliance';
COMMENT ON TABLE drivers IS 'Driver registry with licensing and performance tracking';
COMMENT ON TABLE gate_in_operations IS 'Container gate-in operations with full workflow management';
COMMENT ON TABLE gate_out_operations IS 'Container gate-out operations with validation and tracking';
COMMENT ON TABLE container_validations IS 'Container validation records for quality control';
COMMENT ON TABLE gate_operation_queue IS 'Queue management system for gate operations';

-- Display success message
SELECT 'Gate Operations Module (05) - Schema created successfully!' as status,
       'Includes: Transport management, gate in/out operations, validation system, and queue management' as details;
