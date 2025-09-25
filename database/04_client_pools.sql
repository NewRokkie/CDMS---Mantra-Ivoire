-- =====================================================
-- CDMS (Container Depot Management System) - Client Pools & Stack Assignments Module
-- Module: Client Pools & Stack Assignments
-- Version: 1.0
-- Description: Client management with pool-based stack assignments and capacity optimization
-- Dependencies: 01_foundation_schema.sql, 02_yard_management.sql, 03_container_management.sql
-- =====================================================

-- Set search path
SET search_path = cdms_core, public;

-- =====================================================
-- CLIENT MANAGEMENT ENUMS
-- =====================================================

-- Client status
CREATE TYPE client_status AS ENUM ('active', 'inactive', 'suspended', 'terminated');

-- Client pool priority
CREATE TYPE pool_priority AS ENUM ('low', 'medium', 'high', 'critical');

-- Stack assignment type
CREATE TYPE assignment_type AS ENUM ('exclusive', 'shared', 'temporary', 'emergency');

-- Contract type
CREATE TYPE contract_type AS ENUM ('standard', 'premium', 'temporary', 'trial');

-- =====================================================
-- CLIENT MANAGEMENT TABLES
-- =====================================================

-- Main Clients table
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Client identification
    name VARCHAR(200) NOT NULL,
    code VARCHAR(10) UNIQUE NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),

    -- Address information
    address_street VARCHAR(255),
    address_city VARCHAR(100),
    address_state VARCHAR(100),
    address_zip_code VARCHAR(20),
    address_country VARCHAR(100) DEFAULT 'Côte d''Ivoire',

    -- Contact person
    contact_person_name VARCHAR(100),
    contact_person_email VARCHAR(255),
    contact_person_phone VARCHAR(20),
    contact_person_position VARCHAR(100),

    -- Billing address (if different)
    billing_address_street VARCHAR(255),
    billing_address_city VARCHAR(100),
    billing_address_state VARCHAR(100),
    billing_address_zip_code VARCHAR(20),
    billing_address_country VARCHAR(100),

    -- Financial information
    tax_id VARCHAR(50),
    credit_limit DECIMAL(15,2) DEFAULT 0.00,
    payment_terms INTEGER DEFAULT 30, -- days
    currency VARCHAR(3) DEFAULT 'USD',

    -- Operational parameters
    free_days_allowed INTEGER DEFAULT 7, -- Free storage days
    daily_storage_rate DECIMAL(10,2) DEFAULT 15.00, -- USD per day after free days

    -- Status and activity
    status client_status DEFAULT 'active',
    is_active BOOLEAN DEFAULT TRUE,

    -- Notes and additional info
    notes TEXT,
    business_type VARCHAR(100), -- e.g., 'shipping_line', 'freight_forwarder', 'trader'

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

-- Client Pools (groups of clients with shared stack allocations)
CREATE TABLE client_pools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Pool identification
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    client_code VARCHAR(10) REFERENCES clients(code),
    client_name VARCHAR(200),

    -- Pool configuration
    max_capacity INTEGER NOT NULL DEFAULT 0,
    current_occupancy INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    priority pool_priority DEFAULT 'medium',

    -- Contract information
    contract_type contract_type DEFAULT 'standard',
    contract_start_date DATE NOT NULL,
    contract_end_date DATE,
    contract_reference VARCHAR(50),

    -- Operational settings
    auto_assign_containers BOOLEAN DEFAULT TRUE,
    preferred_container_sizes container_size[],
    special_handling_required BOOLEAN DEFAULT FALSE,

    -- Yard restrictions
    allowed_yard_ids UUID[], -- Array of yard IDs where this pool can operate
    preferred_yard_id UUID REFERENCES yards(id),

    -- Performance metrics
    total_containers_processed INTEGER DEFAULT 0,
    avg_dwell_time_days DECIMAL(6,2) DEFAULT 0.00,
    last_activity_date TIMESTAMP WITH TIME ZONE,

    -- Notes and configuration
    notes TEXT,
    configuration JSONB DEFAULT '{}',

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

-- Stack Assignments (which stacks are assigned to which client pools)
CREATE TABLE stack_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- References
    stack_id UUID REFERENCES yard_stacks(id) ON DELETE CASCADE,
    stack_number INTEGER NOT NULL,
    client_pool_id UUID REFERENCES client_pools(id) ON DELETE CASCADE,
    client_code VARCHAR(10),
    yard_id UUID REFERENCES yards(id),

    -- Assignment details
    assignment_type assignment_type DEFAULT 'exclusive',
    priority INTEGER DEFAULT 1, -- Higher number = higher priority
    is_exclusive BOOLEAN DEFAULT TRUE,

    -- Capacity allocation
    allocated_capacity INTEGER, -- How many positions are allocated to this client
    max_utilization_percent DECIMAL(5,2) DEFAULT 100.00,

    -- Time-based restrictions
    time_restrictions JSONB, -- e.g., {"allowed_hours": "06:00-22:00", "allowed_days": [1,2,3,4,5]}

    -- Assignment validity
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    valid_from DATE DEFAULT CURRENT_DATE,
    valid_until DATE,
    assigned_by UUID REFERENCES users(id),

    -- Status and notes
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(stack_id, client_pool_id, assignment_type)
);

-- Stack Utilization Statistics
CREATE TABLE stack_utilization_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- References
    stack_id UUID REFERENCES yard_stacks(id) ON DELETE CASCADE,
    client_pool_id UUID REFERENCES client_pools(id) ON DELETE CASCADE,
    yard_id UUID REFERENCES yards(id),

    -- Time period
    stats_date DATE NOT NULL DEFAULT CURRENT_DATE,
    stats_period VARCHAR(20) DEFAULT 'daily', -- daily, weekly, monthly

    -- Utilization metrics
    total_positions INTEGER DEFAULT 0,
    occupied_positions INTEGER DEFAULT 0,
    reserved_positions INTEGER DEFAULT 0,
    available_positions INTEGER DEFAULT 0,
    utilization_rate DECIMAL(5,2) DEFAULT 0.00,

    -- Container metrics
    containers_in INTEGER DEFAULT 0,
    containers_out INTEGER DEFAULT 0,
    net_movement INTEGER DEFAULT 0,

    -- Average dwell time for containers
    avg_dwell_hours DECIMAL(8,2) DEFAULT 0.00,
    total_container_hours INTEGER DEFAULT 0,

    -- Revenue metrics (if applicable)
    estimated_revenue DECIMAL(12,2) DEFAULT 0.00,
    storage_days_charged INTEGER DEFAULT 0,

    -- Performance indicators
    stack_efficiency_score DECIMAL(4,2) DEFAULT 0.00, -- 0-100 score
    client_satisfaction_score DECIMAL(4,2) DEFAULT 0.00, -- 0-100 score

    UNIQUE(stack_id, client_pool_id, stats_date, stats_period)
);

-- Container Assignment Requests (queue system for optimal placement)
CREATE TABLE container_assignment_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Container and client info
    container_id UUID REFERENCES containers(id) ON DELETE CASCADE,
    container_number VARCHAR(20) NOT NULL,
    client_code VARCHAR(10) NOT NULL,
    client_pool_id UUID REFERENCES client_pools(id),

    -- Container specifications
    container_size container_size NOT NULL,
    container_type container_type,
    special_requirements TEXT,
    preferred_section VARCHAR(50),
    requires_special_handling BOOLEAN DEFAULT FALSE,

    -- Request details
    request_status VARCHAR(20) DEFAULT 'pending' CHECK (request_status IN ('pending', 'processing', 'assigned', 'failed', 'cancelled')),
    priority priority_level DEFAULT 'medium',
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    requested_by UUID REFERENCES users(id),

    -- Assignment result
    assigned_stack_id UUID REFERENCES yard_stacks(id),
    assigned_position_id UUID REFERENCES yard_positions(id),
    assigned_at TIMESTAMP WITH TIME ZONE,
    assigned_by UUID REFERENCES users(id),

    -- Failure handling
    failure_reason TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,

    -- Additional context
    gate_operation_id UUID, -- Link to gate operation when created
    booking_reference VARCHAR(50),
    estimated_duration INTERVAL, -- How long container expected to stay

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Client Pool Performance Metrics
CREATE TABLE client_pool_performance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- References
    client_pool_id UUID REFERENCES client_pools(id) ON DELETE CASCADE,
    client_code VARCHAR(10),
    yard_id UUID REFERENCES yards(id),

    -- Time period
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    period_type VARCHAR(20) DEFAULT 'monthly', -- weekly, monthly, quarterly, yearly

    -- Volume metrics
    total_containers_processed INTEGER DEFAULT 0,
    containers_gate_in INTEGER DEFAULT 0,
    containers_gate_out INTEGER DEFAULT 0,
    peak_occupancy INTEGER DEFAULT 0,

    -- Time metrics
    avg_dwell_time_days DECIMAL(6,2) DEFAULT 0.00,
    total_storage_days INTEGER DEFAULT 0,
    free_days_used INTEGER DEFAULT 0,
    chargeable_days INTEGER DEFAULT 0,

    -- Utilization metrics
    avg_capacity_utilization DECIMAL(5,2) DEFAULT 0.00,
    peak_capacity_utilization DECIMAL(5,2) DEFAULT 0.00,
    total_assigned_stacks INTEGER DEFAULT 0,
    active_assigned_stacks INTEGER DEFAULT 0,

    -- Financial metrics
    total_storage_revenue DECIMAL(15,2) DEFAULT 0.00,
    total_handling_fees DECIMAL(15,2) DEFAULT 0.00,
    total_additional_charges DECIMAL(15,2) DEFAULT 0.00,

    -- Performance scores
    efficiency_score DECIMAL(4,2) DEFAULT 0.00, -- 0-100
    compliance_score DECIMAL(4,2) DEFAULT 0.00, -- 0-100
    customer_satisfaction DECIMAL(4,2) DEFAULT 0.00, -- 0-100

    -- Incidents and issues
    incidents_count INTEGER DEFAULT 0,
    damage_reports INTEGER DEFAULT 0,
    disputes_count INTEGER DEFAULT 0,

    -- Metadata
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    calculated_by UUID REFERENCES users(id)
);

-- =====================================================
-- INDEXES FOR CLIENT POOLS MODULE
-- =====================================================

-- Clients indexes
CREATE INDEX idx_clients_code ON clients(code);
CREATE INDEX idx_clients_status ON clients(status);
CREATE INDEX idx_clients_active ON clients(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_clients_name ON clients(name);
CREATE INDEX idx_clients_contact_email ON clients(contact_person_email);

-- Client pools indexes
CREATE INDEX idx_client_pools_client ON client_pools(client_id);
CREATE INDEX idx_client_pools_code ON client_pools(client_code);
CREATE INDEX idx_client_pools_active ON client_pools(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_client_pools_priority ON client_pools(priority);
CREATE INDEX idx_client_pools_contract ON client_pools(contract_start_date, contract_end_date);
CREATE INDEX idx_client_pools_yard ON client_pools(preferred_yard_id) WHERE preferred_yard_id IS NOT NULL;

-- Stack assignments indexes
CREATE INDEX idx_stack_assignments_stack ON stack_assignments(stack_id);
CREATE INDEX idx_stack_assignments_client ON stack_assignments(client_pool_id);
CREATE INDEX idx_stack_assignments_yard ON stack_assignments(yard_id);
CREATE INDEX idx_stack_assignments_active ON stack_assignments(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_stack_assignments_priority ON stack_assignments(priority DESC);
CREATE INDEX idx_stack_assignments_exclusive ON stack_assignments(is_exclusive) WHERE is_exclusive = TRUE;

-- Utilization stats indexes
CREATE INDEX idx_stack_utilization_stack ON stack_utilization_stats(stack_id);
CREATE INDEX idx_stack_utilization_client ON stack_utilization_stats(client_pool_id);
CREATE INDEX idx_stack_utilization_date ON stack_utilization_stats(stats_date);
CREATE INDEX idx_stack_utilization_period ON stack_utilization_stats(stats_period);

-- Assignment requests indexes
CREATE INDEX idx_assignment_requests_container ON container_assignment_requests(container_id);
CREATE INDEX idx_assignment_requests_client ON container_assignment_requests(client_code);
CREATE INDEX idx_assignment_requests_status ON container_assignment_requests(request_status);
CREATE INDEX idx_assignment_requests_priority ON container_assignment_requests(priority);
CREATE INDEX idx_assignment_requests_pending ON container_assignment_requests(requested_at) WHERE request_status = 'pending';

-- Performance metrics indexes
CREATE INDEX idx_client_performance_pool ON client_pool_performance(client_pool_id);
CREATE INDEX idx_client_performance_period ON client_pool_performance(period_start, period_end);
CREATE INDEX idx_client_performance_yard ON client_pool_performance(yard_id);

-- =====================================================
-- TRIGGERS FOR CLIENT POOLS MODULE
-- =====================================================

-- Add updated_at triggers
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_client_pools_updated_at BEFORE UPDATE ON client_pools
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stack_assignments_updated_at BEFORE UPDATE ON stack_assignments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assignment_requests_updated_at BEFORE UPDATE ON container_assignment_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add audit triggers
CREATE TRIGGER audit_clients_changes AFTER INSERT OR UPDATE OR DELETE ON clients
    FOR EACH ROW EXECUTE FUNCTION create_audit_log_entry();

CREATE TRIGGER audit_client_pools_changes AFTER INSERT OR UPDATE OR DELETE ON client_pools
    FOR EACH ROW EXECUTE FUNCTION create_audit_log_entry();

CREATE TRIGGER audit_stack_assignments_changes AFTER INSERT OR UPDATE OR DELETE ON stack_assignments
    FOR EACH ROW EXECUTE FUNCTION create_audit_log_entry();

-- =====================================================
-- CLIENT POOLS SPECIFIC FUNCTIONS
-- =====================================================

-- Function to calculate client pool utilization
CREATE OR REPLACE FUNCTION calculate_client_pool_utilization(pool_id UUID)
RETURNS DECIMAL(5,2) AS $$
DECLARE
    total_capacity INTEGER := 0;
    current_occupancy INTEGER := 0;
    utilization_rate DECIMAL(5,2);
BEGIN
    -- Get total capacity from assigned stacks
    SELECT COALESCE(SUM(ys.capacity), 0) INTO total_capacity
    FROM stack_assignments sa
    JOIN yard_stacks ys ON sa.stack_id = ys.id
    WHERE sa.client_pool_id = pool_id AND sa.is_active = TRUE;

    -- Get current occupancy
    SELECT COALESCE(SUM(ys.current_occupancy), 0) INTO current_occupancy
    FROM stack_assignments sa
    JOIN yard_stacks ys ON sa.stack_id = ys.id
    WHERE sa.client_pool_id = pool_id AND sa.is_active = TRUE;

    -- Calculate utilization rate
    IF total_capacity > 0 THEN
        utilization_rate := ROUND((current_occupancy::DECIMAL / total_capacity) * 100, 2);
    ELSE
        utilization_rate := 0.00;
    END IF;

    -- Update client pool record
    UPDATE client_pools
    SET current_occupancy = current_occupancy,
        max_capacity = total_capacity,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = pool_id;

    RETURN utilization_rate;
END;
$$ LANGUAGE plpgsql;

-- Function to find optimal stack for container assignment
CREATE OR REPLACE FUNCTION find_optimal_stack_for_container(
    p_client_code VARCHAR(10),
    p_container_size container_size,
    p_yard_id UUID DEFAULT NULL
)
RETURNS TABLE (
    stack_id UUID,
    stack_number INTEGER,
    section_name VARCHAR(50),
    available_slots INTEGER,
    total_capacity INTEGER,
    utilization_rate DECIMAL(5,2),
    priority_score INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ys.id as stack_id,
        ys.stack_number,
        sect.name as section_name,
        (ys.capacity - ys.current_occupancy) as available_slots,
        ys.capacity as total_capacity,
        ROUND((ys.current_occupancy::DECIMAL / NULLIF(ys.capacity, 0)) * 100, 2) as utilization_rate,
        sa.priority as priority_score
    FROM stack_assignments sa
    JOIN yard_stacks ys ON sa.stack_id = ys.id
    JOIN yard_sections sect ON ys.section_id = sect.id
    JOIN client_pools cp ON sa.client_pool_id = cp.id
    WHERE cp.client_code = p_client_code
    AND sa.is_active = TRUE
    AND ys.is_active = TRUE
    AND ys.current_occupancy < ys.capacity
    AND (p_yard_id IS NULL OR ys.yard_id = p_yard_id)
    AND (
        p_container_size = '20ft'
        OR (p_container_size = '40ft' AND ys.config_rule IN ('paired_40ft', 'both'))
    )
    ORDER BY
        sa.priority DESC,
        utilization_rate ASC, -- Prefer less utilized stacks
        available_slots DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically assign container to optimal stack
CREATE OR REPLACE FUNCTION auto_assign_container_to_stack(
    p_container_id UUID,
    p_container_number VARCHAR(20),
    p_client_code VARCHAR(10),
    p_container_size container_size,
    p_assigned_by UUID
)
RETURNS UUID AS $$
DECLARE
    selected_stack_id UUID;
    selected_position_id UUID;
    assignment_request_id UUID;
BEGIN
    -- Create assignment request
    INSERT INTO container_assignment_requests (
        container_id,
        container_number,
        client_code,
        container_size,
        request_status,
        requested_by
    ) VALUES (
        p_container_id,
        p_container_number,
        p_client_code,
        p_container_size,
        'processing',
        p_assigned_by
    ) RETURNING id INTO assignment_request_id;

    -- Find optimal stack
    SELECT stack_id INTO selected_stack_id
    FROM find_optimal_stack_for_container(p_client_code, p_container_size)
    LIMIT 1;

    IF selected_stack_id IS NOT NULL THEN
        -- Find available position in selected stack
        SELECT id INTO selected_position_id
        FROM yard_positions
        WHERE stack_id = selected_stack_id
        AND is_occupied = FALSE
        AND is_accessible = TRUE
        ORDER BY tier_number ASC, row_number ASC
        LIMIT 1;

        IF selected_position_id IS NOT NULL THEN
            -- Update assignment request
            UPDATE container_assignment_requests
            SET request_status = 'assigned',
                assigned_stack_id = selected_stack_id,
                assigned_position_id = selected_position_id,
                assigned_at = CURRENT_TIMESTAMP,
                assigned_by = p_assigned_by
            WHERE id = assignment_request_id;

            -- Update container location
            UPDATE containers
            SET current_position_id = selected_position_id,
                current_yard_id = (SELECT yard_id FROM yard_positions WHERE id = selected_position_id),
                location_description = (
                    SELECT CONCAT('Stack S', ys.stack_number, ', Tier ', yp.tier_number, ', Row ', yp.row_number)
                    FROM yard_positions yp
                    JOIN yard_stacks ys ON yp.stack_id = ys.id
                    WHERE yp.id = selected_position_id
                ),
                updated_at = CURRENT_TIMESTAMP,
                updated_by = p_assigned_by
            WHERE id = p_container_id;

            RETURN selected_position_id;
        ELSE
            -- No available position
            UPDATE container_assignment_requests
            SET request_status = 'failed',
                failure_reason = 'No available positions in assigned stacks'
            WHERE id = assignment_request_id;
        END IF;
    ELSE
        -- No suitable stack found
        UPDATE container_assignment_requests
        SET request_status = 'failed',
            failure_reason = 'No suitable stacks available for client'
        WHERE id = assignment_request_id;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VIEWS FOR CLIENT POOLS MODULE
-- =====================================================

-- View for client pool overview
CREATE VIEW v_client_pool_overview AS
SELECT
    cp.id,
    cp.client_code,
    cp.client_name,
    cp.max_capacity,
    cp.current_occupancy,
    ROUND((cp.current_occupancy::DECIMAL / NULLIF(cp.max_capacity, 0)) * 100, 2) as utilization_rate,
    cp.priority,
    cp.contract_type,
    cp.contract_start_date,
    cp.contract_end_date,
    cp.is_active,
    COUNT(DISTINCT sa.stack_id) as assigned_stacks_count,
    COUNT(DISTINCT sa.stack_id) FILTER (WHERE sa.is_active = TRUE) as active_stacks_count,
    cp.total_containers_processed,
    cp.avg_dwell_time_days,
    cp.last_activity_date
FROM client_pools cp
LEFT JOIN stack_assignments sa ON cp.id = sa.client_pool_id
GROUP BY cp.id, cp.client_code, cp.client_name, cp.max_capacity, cp.current_occupancy,
         cp.priority, cp.contract_type, cp.contract_start_date, cp.contract_end_date,
         cp.is_active, cp.total_containers_processed, cp.avg_dwell_time_days, cp.last_activity_date;

-- View for stack assignment details
CREATE VIEW v_stack_assignment_details AS
SELECT
    sa.id,
    cp.client_code,
    cp.client_name,
    y.name as yard_name,
    y.code as yard_code,
    sect.name as section_name,
    ys.stack_number,
    sa.assignment_type,
    sa.priority,
    sa.is_exclusive,
    ys.capacity,
    ys.current_occupancy,
    ROUND((ys.current_occupancy::DECIMAL / NULLIF(ys.capacity, 0)) * 100, 2) as utilization_rate,
    (ys.capacity - ys.current_occupancy) as available_capacity,
    sa.assigned_at,
    sa.valid_from,
    sa.valid_until,
    sa.is_active
FROM stack_assignments sa
JOIN client_pools cp ON sa.client_pool_id = cp.id
JOIN yard_stacks ys ON sa.stack_id = ys.id
JOIN yard_sections sect ON ys.section_id = sect.id
JOIN yards y ON ys.yard_id = y.id;

-- View for container assignment queue
CREATE VIEW v_container_assignment_queue AS
SELECT
    car.id,
    car.container_number,
    car.client_code,
    cp.client_name,
    car.container_size,
    car.container_type,
    car.request_status,
    car.priority,
    car.requested_at,
    car.special_requirements,
    car.failure_reason,
    car.retry_count,
    u.name as requested_by_name
FROM container_assignment_requests car
LEFT JOIN client_pools cp ON car.client_pool_id = cp.id
LEFT JOIN users u ON car.requested_by = u.id
WHERE car.request_status IN ('pending', 'processing')
ORDER BY car.priority DESC, car.requested_at ASC;

-- =====================================================
-- INITIAL DATA FOR CLIENT POOLS MODULE
-- =====================================================

-- Insert default clients
INSERT INTO clients (
    id, name, code, email, phone,
    contact_person_name, contact_person_email, contact_person_phone, contact_person_position,
    address_street, address_city, address_state, address_zip_code, address_country,
    credit_limit, payment_terms, free_days_allowed, daily_storage_rate,
    business_type, notes
) VALUES
-- Maersk Line
(
    'client-maeu'::UUID,
    'Maersk Line',
    'MAEU',
    'operations@maersk.com',
    '+225 20 21 22 23',
    'Jean-Pierre Kouassi',
    'jp.kouassi@maersk.com',
    '+225 20 21 22 24',
    'Operations Manager',
    'Zone Portuaire, Vridi',
    'Abidjan',
    'Lagunes',
    '01 BP 1001',
    'Côte d''Ivoire',
    500000.00,
    30,
    7,
    15.00,
    'shipping_line',
    'Premier client mondial de transport maritime avec volumes élevés'
),
-- MSC Mediterranean Shipping
(
    'client-mscu'::UUID,
    'MSC Mediterranean Shipping',
    'MSCU',
    'abidjan@msc.com',
    '+225 20 22 23 24',
    'Marie-Claire Adjoua',
    'mc.adjoua@msc.com',
    '+225 20 22 23 25',
    'Port Manager',
    'Boulevard de la République',
    'Abidjan',
    'Lagunes',
    '08 BP 2002',
    'Côte d''Ivoire',
    750000.00,
    30,
    5,
    18.00,
    'shipping_line',
    'Deuxième compagnie mondiale avec besoins spéciaux pour conteneurs reefer'
),
-- CMA CGM
(
    'client-cmdu'::UUID,
    'CMA CGM',
    'CMDU',
    'abidjan.agency@cma-cgm.com',
    '+225 20 23 24 25',
    'Pierre Koné',
    'p.kone@cma-cgm.com',
    '+225 20 23 24 26',
    'Terminal Manager',
    'Avenue Chardy, Plateau',
    'Abidjan',
    'Lagunes',
    '01 BP 3003',
    'Côte d''Ivoire',
    400000.00,
    45,
    10,
    12.00,
    'shipping_line',
    'Compagnie française avec tarifs préférentiels pour longue durée'
),
-- Shipping Solutions Inc (smaller client)
(
    'client-ship001'::UUID,
    'Shipping Solutions Inc',
    'SHIP001',
    'operations@shipsol.ci',
    '+225 20 24 25 26',
    'Sarah Traoré',
    's.traore@shipsol.ci',
    '+225 20 24 25 27',
    'Logistics Coordinator',
    'Rue des Jardins, Cocody',
    'Abidjan',
    'Lagunes',
    '22 BP 4004',
    'Côte d''Ivoire',
    150000.00,
    15,
    3,
    20.00,
    'freight_forwarder',
    'Client transitaire local avec besoins ponctuels mais réguliers'
);

-- Insert client pools for each client
INSERT INTO client_pools (
    id, client_id, client_code, client_name, max_capacity, current_occupancy,
    priority, contract_type, contract_start_date, contract_end_date,
    auto_assign_containers, preferred_container_sizes, preferred_yard_id,
    total_containers_processed, notes
) VALUES
-- Maersk Pool
(
    'pool-maeu'::UUID,
    'client-maeu'::UUID,
    'MAEU',
    'Maersk Line',
    150,
    89,
    'high',
    'premium',
    '2024-01-01',
    '2025-12-31',
    TRUE,
    ARRAY['20ft', '40ft']::container_size[],
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::UUID,
    2847,
    'Client premium avec stacks dédiés haute capacité'
),
-- MSC Pool
(
    'pool-mscu'::UUID,
    'client-mscu'::UUID,
    'MSCU',
    'MSC Mediterranean Shipping',
    140,
    76,
    'high',
    'standard',
    '2024-02-01',
    '2025-12-31',
    TRUE,
    ARRAY['20ft', '40ft']::container_size[],
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::UUID,
    1956,
    'Client haut volume nécessitant stacks compatibles reefer'
),
-- CMA CGM Pool
(
    'pool-cmdu'::UUID,
    'client-cmdu'::UUID,
    'CMDU',
    'CMA CGM',
    100,
    45,
    'medium',
    'standard',
    '2024-03-01',
    '2025-12-31',
    TRUE,
    ARRAY['20ft', '40ft']::container_size[],
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::UUID,
    1234,
    'Client standard avec exigences mixtes de conteneurs'
),
-- Shipping Solutions Pool
(
    'pool-ship001'::UUID,
    'client-ship001'::UUID,
    'SHIP001',
    'Shipping Solutions Inc',
    75,
    32,
    'medium',
    'standard',
    '2024-04-01',
    '2025-12-31',
    TRUE,
    ARRAY['20ft', '40ft']::container_size[],
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::UUID,
    567,
    'Client croissant avec volumes de conteneurs en expansion'
);

-- Insert stack assignments for client pools (using existing stacks from Tantarelli)
INSERT INTO stack_assignments (
    stack_id, stack_number, client_pool_id, client_code, yard_id,
    assignment_type, priority, is_exclusive, allocated_capacity,
    assigned_by, notes
)
SELECT
    ys.id,
    ys.stack_number,
    CASE
        WHEN ys.stack_number IN (1, 3, 5) THEN 'pool-maeu'::UUID
        WHEN ys.stack_number IN (7, 9, 11) THEN 'pool-mscu'::UUID
        WHEN ys.stack_number IN (13, 15, 17) THEN 'pool-cmdu'::UUID
        WHEN ys.stack_number IN (19, 21, 23) THEN 'pool-ship001'::UUID
    END,
    CASE
        WHEN ys.stack_number IN (1, 3, 5) THEN 'MAEU'
        WHEN ys.stack_number IN (7, 9, 11) THEN 'MSCU'
        WHEN ys.stack_number IN (13, 15, 17) THEN 'CMDU'
        WHEN ys.stack_number IN (19, 21, 23) THEN 'SHIP001'
    END,
    ys.yard_id,
    'exclusive',
    CASE
        WHEN ys.stack_number IN (1, 3, 5, 7, 9, 11) THEN 3 -- High priority for major clients
        ELSE 2 -- Standard priority
    END,
    TRUE,
    ys.capacity,
    NULL,
    CASE
        WHEN ys.stack_number IN (1, 3, 5) THEN 'Stacks dédiés Maersk - Haute priorité'
        WHEN ys.stack_number IN (7, 9, 11) THEN 'Stacks dédiés MSC - Compatible reefer'
        WHEN ys.stack_number IN (13, 15, 17) THEN 'Stacks assignés CMA CGM - Standard'
        WHEN ys.stack_number IN (19, 21, 23) THEN 'Stacks assignés Shipping Solutions'
    END
FROM yard_stacks ys
WHERE ys.yard_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::UUID  -- Tantarelli yard
AND ys.stack_number IN (1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23);

-- =====================================================
-- CLIENT POOLS MODULE COMPLETE
-- =====================================================

COMMENT ON TABLE clients IS 'Client registry with contact information and business terms';
COMMENT ON TABLE client_pools IS 'Client pool configuration with capacity management and performance tracking';
COMMENT ON TABLE stack_assignments IS 'Stack-to-client assignments with priority and capacity allocation';
COMMENT ON TABLE stack_utilization_stats IS 'Historical utilization statistics for performance analysis';
COMMENT ON TABLE container_assignment_requests IS 'Queue system for optimal container-to-stack placement';
COMMENT ON TABLE client_pool_performance IS 'Performance metrics and KPIs for client pool management';

-- Display success message
SELECT 'Client Pools & Stack Assignments Module (04) - Schema created successfully!' as status,
       'Includes: Client management, pool configuration, stack assignments, and performance tracking' as details;
