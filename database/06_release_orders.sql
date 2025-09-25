-- =====================================================
-- CDMS (Container Depot Management System) - Release Orders & Booking References Module
-- Module: Release Orders & Booking References
-- Version: 1.0
-- Description: Complete booking reference and release order management with container tracking
-- Dependencies: 01_foundation_schema.sql, 02_yard_management.sql, 03_container_management.sql, 04_client_pools.sql, 05_gate_operations.sql
-- =====================================================

-- Set search path
SET search_path = cdms_core, public;

-- =====================================================
-- RELEASE ORDERS ENUMS
-- =====================================================

-- Release order status
CREATE TYPE release_order_status AS ENUM ('draft', 'pending', 'validated', 'partial', 'in_process', 'completed', 'cancelled', 'expired');

-- Container release status
CREATE TYPE container_release_status AS ENUM ('pending', 'ready', 'released', 'cancelled', 'no_show');

-- Booking validation status
CREATE TYPE booking_validation_status AS ENUM ('not_validated', 'validating', 'validated', 'rejected', 'expired');

-- Document status
CREATE TYPE document_status AS ENUM ('pending', 'received', 'approved', 'rejected', 'expired');

-- =====================================================
-- BOOKING REFERENCES TABLES
-- =====================================================

-- Booking References (master booking information)
CREATE TABLE booking_references (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Booking identification
    booking_number VARCHAR(50) UNIQUE NOT NULL,
    booking_reference VARCHAR(50), -- Alternative reference

    -- Client information
    client_id UUID REFERENCES clients(id),
    client_code VARCHAR(10),
    client_name VARCHAR(100),

    -- Booking type and operations
    booking_type booking_type NOT NULL,

    -- Container quantities breakdown
    container_quantities_20ft INTEGER DEFAULT 0 CHECK (container_quantities_20ft >= 0),
    container_quantities_40ft INTEGER DEFAULT 0 CHECK (container_quantities_40ft >= 0),
    total_containers INTEGER GENERATED ALWAYS AS (container_quantities_20ft + container_quantities_40ft) STORED,

    -- Quantity management
    max_quantity_threshold INTEGER DEFAULT 10,
    requires_detailed_breakdown BOOLEAN GENERATED ALWAYS AS (total_containers > max_quantity_threshold) STORED,

    -- Processing status
    status booking_validation_status DEFAULT 'not_validated',
    validation_notes TEXT,

    -- Dates and timing
    estimated_release_date DATE,
    earliest_release_date DATE,
    latest_release_date DATE,
    booking_expires_at TIMESTAMP WITH TIME ZONE,

    -- Operational requirements
    special_requirements TEXT,
    handling_instructions TEXT,
    priority_level priority_level DEFAULT 'medium',

    -- Documentation requirements
    required_documents TEXT[],
    documentation_complete BOOLEAN DEFAULT FALSE,

    -- Performance tracking
    containers_assigned INTEGER DEFAULT 0,
    containers_released INTEGER DEFAULT 0,
    containers_remaining INTEGER GENERATED ALWAYS AS (total_containers - containers_released) STORED,

    -- Financial information
    estimated_charges DECIMAL(12,2) DEFAULT 0.00,
    currency VARCHAR(3) DEFAULT 'USD',

    -- User tracking
    created_by UUID REFERENCES users(id),
    validated_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    validated_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Notes
    notes TEXT
);

-- Release Orders (specific release instructions)
CREATE TABLE release_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Order identification
    release_order_number VARCHAR(50) UNIQUE,

    -- Booking reference linkage
    booking_reference_id UUID REFERENCES booking_references(id),
    booking_number VARCHAR(50),

    -- Client information
    client_id UUID REFERENCES clients(id),
    client_code VARCHAR(10),
    client_name VARCHAR(100),

    -- Order type and operations
    booking_type booking_type,

    -- Container quantities for this specific release
    container_quantities_20ft INTEGER DEFAULT 0 CHECK (container_quantities_20ft >= 0),
    container_quantities_40ft INTEGER DEFAULT 0 CHECK (container_quantities_40ft >= 0),
    total_containers INTEGER GENERATED ALWAYS AS (container_quantities_20ft + container_quantities_40ft) STORED,
    remaining_containers INTEGER DEFAULT 0,

    -- Transport information
    transport_company VARCHAR(100),
    driver_name VARCHAR(100),
    vehicle_number VARCHAR(20),
    transport_company_id UUID REFERENCES transport_companies(id),
    driver_id UUID REFERENCES drivers(id),
    vehicle_id UUID REFERENCES vehicles(id),

    -- Status and progress
    status release_order_status DEFAULT 'draft',
    processing_started_at TIMESTAMP WITH TIME ZONE,

    -- Dates and scheduling
    estimated_release_date DATE,
    scheduled_pickup_date DATE,
    scheduled_pickup_time TIME,
    actual_release_started_at TIMESTAMP WITH TIME ZONE,
    actual_release_completed_at TIMESTAMP WITH TIME ZONE,

    -- Location and yard information
    release_from_yard_id UUID REFERENCES yards(id),
    release_from_yard_code VARCHAR(20),

    -- Documentation and compliance
    delivery_order_number VARCHAR(50),
    customs_clearance_ref VARCHAR(50),
    export_documentation_ref VARCHAR(50),
    documentation_complete BOOLEAN DEFAULT FALSE,

    -- Performance metrics
    processing_duration INTERVAL GENERATED ALWAYS AS (actual_release_completed_at - actual_release_started_at) STORED,
    containers_processed INTEGER DEFAULT 0,

    -- Special instructions and requirements
    special_instructions TEXT,
    handling_requirements TEXT,
    priority_level priority_level DEFAULT 'medium',

    -- User tracking
    created_by UUID REFERENCES users(id),
    validated_by UUID REFERENCES users(id),
    assigned_to UUID REFERENCES users(id),
    completed_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    validated_at TIMESTAMP WITH TIME ZONE,
    assigned_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Notes and additional information
    notes TEXT,
    cancellation_reason TEXT
);

-- Release Order Containers (specific containers in release orders)
CREATE TABLE release_order_containers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Release order linkage
    release_order_id UUID REFERENCES release_orders(id) ON DELETE CASCADE,
    release_order_number VARCHAR(50),

    -- Container information
    container_id UUID REFERENCES containers(id),
    container_number VARCHAR(20) NOT NULL,
    container_type container_type,
    container_size container_size,

    -- Current status and location
    status container_release_status DEFAULT 'pending',
    current_location TEXT,
    current_yard_id UUID REFERENCES yards(id),
    current_position_id UUID REFERENCES yard_positions(id),

    -- Selection and assignment
    selected_at TIMESTAMP WITH TIME ZONE,
    selected_by UUID REFERENCES users(id),
    assignment_method VARCHAR(50), -- 'manual', 'auto', 'client_requested'

    -- Processing timeline
    ready_for_release_at TIMESTAMP WITH TIME ZONE,
    release_started_at TIMESTAMP WITH TIME ZONE,
    released_at TIMESTAMP WITH TIME ZONE,
    gate_out_operation_id UUID REFERENCES gate_out_operations(id),

    -- Validation and checks
    pre_release_checks_completed BOOLEAN DEFAULT FALSE,
    pre_release_checks_passed BOOLEAN,
    validation_notes TEXT,

    -- Documentation specific to container
    container_documentation JSONB DEFAULT '{}',
    seal_numbers TEXT[],

    -- Performance tracking
    dwell_time_days INTEGER,
    processing_time_minutes INTEGER,

    -- Notes and additional information
    notes TEXT,
    rejection_reason TEXT,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(release_order_id, container_number)
);

-- Container Selection Criteria (for automatic container selection)
CREATE TABLE container_selection_criteria (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Booking/Release order linkage
    booking_reference_id UUID REFERENCES booking_references(id),
    release_order_id UUID REFERENCES release_orders(id),
    client_code VARCHAR(10),

    -- Selection criteria
    container_types container_type[],
    container_sizes container_size[],
    preferred_yards UUID[],
    excluded_yards UUID[],

    -- Age and timing criteria
    max_dwell_days INTEGER,
    min_dwell_days INTEGER,
    arrival_date_from DATE,
    arrival_date_to DATE,

    -- Condition requirements
    acceptable_conditions container_condition[],
    exclude_damaged BOOLEAN DEFAULT TRUE,
    exclude_maintenance BOOLEAN DEFAULT TRUE,

    -- Location preferences
    preferred_sections TEXT[],
    preferred_stacks INTEGER[],
    avoid_high_tiers BOOLEAN DEFAULT FALSE,
    max_tier_level INTEGER,

    -- Priority and scoring
    priority_score INTEGER DEFAULT 100,
    selection_algorithm VARCHAR(50) DEFAULT 'fifo', -- 'fifo', 'lifo', 'closest', 'optimal'

    -- User and timing
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Notes
    notes TEXT
);

-- Booking Documentation (track required documents)
CREATE TABLE booking_documentation (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Booking linkage
    booking_reference_id UUID REFERENCES booking_references(id) ON DELETE CASCADE,
    release_order_id UUID REFERENCES release_orders(id) ON DELETE CASCADE,

    -- Document information
    document_type VARCHAR(100) NOT NULL,
    document_name VARCHAR(200),
    document_reference VARCHAR(100),
    is_required BOOLEAN DEFAULT TRUE,

    -- Document status
    status document_status DEFAULT 'pending',
    received_at TIMESTAMP WITH TIME ZONE,
    approved_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,

    -- Document details
    file_path TEXT,
    file_url TEXT,
    file_size INTEGER,
    mime_type VARCHAR(100),

    -- Validation
    validated_by UUID REFERENCES users(id),
    validation_notes TEXT,
    rejection_reason TEXT,

    -- Metadata
    uploaded_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Release Order Progress Tracking
CREATE TABLE release_order_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Release order linkage
    release_order_id UUID REFERENCES release_orders(id) ON DELETE CASCADE,

    -- Progress snapshot
    snapshot_date DATE DEFAULT CURRENT_DATE,
    snapshot_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Container counts
    total_containers INTEGER DEFAULT 0,
    containers_identified INTEGER DEFAULT 0,
    containers_ready INTEGER DEFAULT 0,
    containers_in_progress INTEGER DEFAULT 0,
    containers_completed INTEGER DEFAULT 0,
    containers_cancelled INTEGER DEFAULT 0,

    -- Progress percentages
    identification_progress DECIMAL(5,2) DEFAULT 0.00,
    preparation_progress DECIMAL(5,2) DEFAULT 0.00,
    completion_progress DECIMAL(5,2) DEFAULT 0.00,
    overall_progress DECIMAL(5,2) DEFAULT 0.00,

    -- Timing estimates
    estimated_completion_time TIMESTAMP WITH TIME ZONE,
    estimated_remaining_hours DECIMAL(6,2),

    -- Issues and blockers
    blocking_issues INTEGER DEFAULT 0,
    warning_count INTEGER DEFAULT 0,
    critical_issues INTEGER DEFAULT 0,

    -- Performance metrics
    avg_processing_time_minutes DECIMAL(8,2),
    throughput_containers_per_hour DECIMAL(6,2),

    -- Recorded by
    recorded_by UUID REFERENCES users(id),

    -- Notes
    notes TEXT
);

-- =====================================================
-- INDEXES FOR RELEASE ORDERS MODULE
-- =====================================================

-- Booking references indexes
CREATE INDEX idx_booking_references_number ON booking_references(booking_number);
CREATE INDEX idx_booking_references_client ON booking_references(client_code);
CREATE INDEX idx_booking_references_status ON booking_references(status);
CREATE INDEX idx_booking_references_type ON booking_references(booking_type);
CREATE INDEX idx_booking_references_date ON booking_references(estimated_release_date) WHERE estimated_release_date IS NOT NULL;
CREATE INDEX idx_booking_references_pending ON booking_references(created_at) WHERE status IN ('not_validated', 'validating', 'validated');
CREATE INDEX idx_booking_references_breakdown ON booking_references(requires_detailed_breakdown) WHERE requires_detailed_breakdown = TRUE;

-- Release orders indexes
CREATE INDEX idx_release_orders_number ON release_orders(release_order_number);
CREATE INDEX idx_release_orders_booking ON release_orders(booking_number) WHERE booking_number IS NOT NULL;
CREATE INDEX idx_release_orders_client ON release_orders(client_code);
CREATE INDEX idx_release_orders_status ON release_orders(status);
CREATE INDEX idx_release_orders_date ON release_orders(scheduled_pickup_date) WHERE scheduled_pickup_date IS NOT NULL;
CREATE INDEX idx_release_orders_transport ON release_orders(transport_company_id) WHERE transport_company_id IS NOT NULL;
CREATE INDEX idx_release_orders_yard ON release_orders(release_from_yard_id) WHERE release_from_yard_id IS NOT NULL;
CREATE INDEX idx_release_orders_pending ON release_orders(created_at) WHERE status IN ('pending', 'validated', 'in_process');

-- Release order containers indexes
CREATE INDEX idx_release_order_containers_order ON release_order_containers(release_order_id);
CREATE INDEX idx_release_order_containers_container ON release_order_containers(container_id);
CREATE INDEX idx_release_order_containers_number ON release_order_containers(container_number);
CREATE INDEX idx_release_order_containers_status ON release_order_containers(status);
CREATE INDEX idx_release_order_containers_ready ON release_order_containers(ready_for_release_at) WHERE status = 'ready';
CREATE INDEX idx_release_order_containers_location ON release_order_containers(current_yard_id, current_position_id);

-- Container selection criteria indexes
CREATE INDEX idx_container_selection_booking ON container_selection_criteria(booking_reference_id) WHERE booking_reference_id IS NOT NULL;
CREATE INDEX idx_container_selection_release ON container_selection_criteria(release_order_id) WHERE release_order_id IS NOT NULL;
CREATE INDEX idx_container_selection_client ON container_selection_criteria(client_code);

-- Documentation indexes
CREATE INDEX idx_booking_documentation_booking ON booking_documentation(booking_reference_id) WHERE booking_reference_id IS NOT NULL;
CREATE INDEX idx_booking_documentation_release ON booking_documentation(release_order_id) WHERE release_order_id IS NOT NULL;
CREATE INDEX idx_booking_documentation_type ON booking_documentation(document_type);
CREATE INDEX idx_booking_documentation_status ON booking_documentation(status);
CREATE INDEX idx_booking_documentation_required ON booking_documentation(is_required) WHERE is_required = TRUE;

-- Progress tracking indexes
CREATE INDEX idx_release_order_progress_order ON release_order_progress(release_order_id);
CREATE INDEX idx_release_order_progress_date ON release_order_progress(snapshot_date);
CREATE INDEX idx_release_order_progress_completion ON release_order_progress(overall_progress);

-- =====================================================
-- TRIGGERS FOR RELEASE ORDERS MODULE
-- =====================================================

-- Add updated_at triggers
CREATE TRIGGER update_booking_references_updated_at BEFORE UPDATE ON booking_references
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_release_orders_updated_at BEFORE UPDATE ON release_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_release_order_containers_updated_at BEFORE UPDATE ON release_order_containers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_booking_documentation_updated_at BEFORE UPDATE ON booking_documentation
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add audit triggers
CREATE TRIGGER audit_booking_references_changes AFTER INSERT OR UPDATE OR DELETE ON booking_references
    FOR EACH ROW EXECUTE FUNCTION create_audit_log_entry();

CREATE TRIGGER audit_release_orders_changes AFTER INSERT OR UPDATE OR DELETE ON release_orders
    FOR EACH ROW EXECUTE FUNCTION create_audit_log_entry();

CREATE TRIGGER audit_release_order_containers_changes AFTER INSERT OR UPDATE OR DELETE ON release_order_containers
    FOR EACH ROW EXECUTE FUNCTION create_audit_log_entry();

-- =====================================================
-- RELEASE ORDERS SPECIFIC FUNCTIONS
-- =====================================================

-- Function to generate release order number
CREATE OR REPLACE FUNCTION generate_release_order_number()
RETURNS VARCHAR(50) AS $$
DECLARE
    sequence_num INTEGER;
    order_number VARCHAR(50);
BEGIN
    -- Get next sequence number for today
    SELECT COALESCE(MAX(CAST(SUBSTRING(release_order_number FROM '([0-9]+)$') AS INTEGER)), 0) + 1
    INTO sequence_num
    FROM release_orders
    WHERE release_order_number LIKE 'RO-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-%';

    order_number := 'RO-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(sequence_num::TEXT, 4, '0');

    RETURN order_number;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-assign release order number
CREATE OR REPLACE FUNCTION assign_release_order_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.release_order_number IS NULL THEN
        NEW.release_order_number := generate_release_order_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for release order number assignment
CREATE TRIGGER assign_release_order_number_trigger BEFORE INSERT ON release_orders
    FOR EACH ROW EXECUTE FUNCTION assign_release_order_number();

-- Function to update release order progress when container status changes
CREATE OR REPLACE FUNCTION update_release_order_progress()
RETURNS TRIGGER AS $$
DECLARE
    total_count INTEGER;
    ready_count INTEGER;
    released_count INTEGER;
    progress_pct DECIMAL(5,2);
BEGIN
    -- Get counts for the release order
    SELECT
        COUNT(*),
        COUNT(*) FILTER (WHERE status = 'ready'),
        COUNT(*) FILTER (WHERE status = 'released')
    INTO total_count, ready_count, released_count
    FROM release_order_containers
    WHERE release_order_id = COALESCE(NEW.release_order_id, OLD.release_order_id);

    -- Calculate progress percentage
    IF total_count > 0 THEN
        progress_pct := ROUND((released_count::DECIMAL / total_count) * 100, 2);
    ELSE
        progress_pct := 0.00;
    END IF;

    -- Update release order
    UPDATE release_orders
    SET remaining_containers = total_count - released_count,
        containers_processed = released_count,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = COALESCE(NEW.release_order_id, OLD.release_order_id);

    -- Update or insert progress record
    INSERT INTO release_order_progress (
        release_order_id,
        total_containers,
        containers_ready,
        containers_completed,
        completion_progress,
        overall_progress,
        recorded_by
    ) VALUES (
        COALESCE(NEW.release_order_id, OLD.release_order_id),
        total_count,
        ready_count,
        released_count,
        progress_pct,
        progress_pct,
        COALESCE(NEW.updated_by, OLD.updated_by)
    )
    ON CONFLICT (release_order_id, snapshot_date)
    DO UPDATE SET
        total_containers = EXCLUDED.total_containers,
        containers_ready = EXCLUDED.containers_ready,
        containers_completed = EXCLUDED.containers_completed,
        completion_progress = EXCLUDED.completion_progress,
        overall_progress = EXCLUDED.overall_progress,
        snapshot_time = CURRENT_TIMESTAMP;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger for progress updates
CREATE TRIGGER update_progress_on_container_status_change
    AFTER INSERT OR UPDATE OR DELETE ON release_order_containers
    FOR EACH ROW EXECUTE FUNCTION update_release_order_progress();

-- Function to automatically select containers for release order
CREATE OR REPLACE FUNCTION auto_select_containers_for_release_order(
    p_release_order_id UUID,
    p_client_code VARCHAR(10),
    p_container_size container_size,
    p_quantity INTEGER,
    p_yard_id UUID DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    selected_count INTEGER := 0;
    container_rec RECORD;
BEGIN
    -- Find available containers for the client
    FOR container_rec IN
        SELECT c.id, c.container_number, c.current_position_id, c.current_yard_id,
               c.gate_in_date, yp.tier_number
        FROM containers c
        LEFT JOIN yard_positions yp ON c.current_position_id = yp.id
        WHERE c.client_code = p_client_code
        AND c.container_size = p_container_size
        AND c.status = 'in_depot'
        AND c.id NOT IN (
            SELECT container_id FROM release_order_containers
            WHERE container_id IS NOT NULL
            AND status NOT IN ('cancelled', 'released')
        )
        AND (p_yard_id IS NULL OR c.current_yard_id = p_yard_id)
        ORDER BY c.gate_in_date ASC, yp.tier_number ASC NULLS LAST
        LIMIT p_quantity
    LOOP
        -- Insert container into release order
        INSERT INTO release_order_containers (
            release_order_id,
            container_id,
            container_number,
            container_type,
            container_size,
            current_yard_id,
            current_position_id,
            status,
            selected_at,
            assignment_method
        ) VALUES (
            p_release_order_id,
            container_rec.id,
            container_rec.container_number,
            'dry', -- Default, could be enhanced
            p_container_size,
            container_rec.current_yard_id,
            container_rec.current_position_id,
            'pending',
            CURRENT_TIMESTAMP,
            'auto'
        );

        selected_count := selected_count + 1;
    END LOOP;

    RETURN selected_count;
END;
$$ LANGUAGE plpgsql;

-- Function to validate release order completion
CREATE OR REPLACE FUNCTION validate_release_order_completion()
RETURNS TRIGGER AS $$
DECLARE
    pending_containers INTEGER;
    total_containers INTEGER;
BEGIN
    -- Count containers
    SELECT
        COUNT(*),
        COUNT(*) FILTER (WHERE status NOT IN ('released', 'cancelled'))
    INTO total_containers, pending_containers
    FROM release_order_containers
    WHERE release_order_id = NEW.id;

    -- Update status based on container progress
    IF total_containers = 0 THEN
        NEW.status := 'draft';
    ELSIF pending_containers = 0 AND total_containers > 0 THEN
        NEW.status := 'completed';
        NEW.completed_at := CURRENT_TIMESTAMP;
    ELSIF pending_containers < total_containers THEN
        NEW.status := 'partial';
    ELSIF pending_containers = total_containers THEN
        -- Check if any containers are ready
        IF EXISTS (SELECT 1 FROM release_order_containers WHERE release_order_id = NEW.id AND status = 'ready') THEN
            NEW.status := 'in_process';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for release order status validation
CREATE TRIGGER validate_release_order_status BEFORE UPDATE ON release_orders
    FOR EACH ROW EXECUTE FUNCTION validate_release_order_completion();

-- =====================================================
-- VIEWS FOR RELEASE ORDERS MODULE
-- =====================================================

-- View for booking reference overview
CREATE VIEW v_booking_reference_overview AS
SELECT
    br.id,
    br.booking_number,
    br.client_code,
    br.client_name,
    br.booking_type,
    br.total_containers,
    br.container_quantities_20ft,
    br.container_quantities_40ft,
    br.requires_detailed_breakdown,
    br.status,
    br.estimated_release_date,
    br.containers_assigned,
    br.containers_released,
    br.containers_remaining,
    COALESCE(ro_count.release_orders_count, 0) as release_orders_count,
    COALESCE(ro_count.active_release_orders, 0) as active_release_orders,
    br.created_at,
    u.name as created_by_name
FROM booking_references br
LEFT JOIN users u ON br.created_by = u.id
LEFT JOIN (
    SELECT
        booking_reference_id,
        COUNT(*) as release_orders_count,
        COUNT(*) FILTER (WHERE status NOT IN ('completed', 'cancelled')) as active_release_orders
    FROM release_orders
    WHERE booking_reference_id IS NOT NULL
    GROUP BY booking_reference_id
) ro_count ON br.id = ro_count.booking_reference_id;

-- View for release order details
CREATE VIEW v_release_order_details AS
SELECT
    ro.id,
    ro.release_order_number,
    ro.booking_number,
    ro.client_code,
    ro.client_name,
    ro.booking_type,
    ro.total_containers,
    ro.remaining_containers,
    ro.status,
    ro.scheduled_pickup_date,
    ro.transport_company,
    ro.driver_name,
    ro.vehicle_number,
    y.name as release_from_yard_name,
    ro.priority_level,
    ro.documentation_complete,
    ro.created_at,
    ro.estimated_release_date,
    COALESCE(cont_stats.containers_pending, 0) as containers_pending,
    COALESCE(cont_stats.containers_ready, 0) as containers_ready,
    COALESCE(cont_stats.containers_released, 0) as containers_released,
    COALESCE(cont_stats.containers_cancelled, 0) as containers_cancelled,
    CASE
        WHEN ro.total_containers > 0 THEN
            ROUND((COALESCE(cont_stats.containers_released, 0)::DECIMAL / ro.total_containers) * 100, 1)
        ELSE 0
    END as completion_percentage,
    u1.name as created_by_name,
    u2.name as assigned_to_name
FROM release_orders ro
LEFT JOIN yards y ON ro.release_from_yard_id = y.id
LEFT JOIN users u1 ON ro.created_by = u1.id
LEFT JOIN users u2 ON ro.assigned_to = u2.id
LEFT JOIN (
    SELECT
        release_order_id,
        COUNT(*) FILTER (WHERE status = 'pending') as containers_pending,
        COUNT(*) FILTER (WHERE status = 'ready') as containers_ready,
        COUNT(*) FILTER (WHERE status = 'released') as containers_released,
        COUNT(*) FILTER (WHERE status = 'cancelled') as containers_cancelled
    FROM release_order_containers
    GROUP BY release_order_id
) cont_stats ON ro.id = cont_stats.release_order_id;

-- View for pending release operations
CREATE VIEW v_pending_release_operations AS
SELECT
    ro.id,
    ro.release_order_number,
    ro.client_code,
    ro.client_name,
    ro.total_containers,
    ro.remaining_containers,
    ro.scheduled_pickup_date,
    ro.status,
    ro.priority_level,
    COUNT(roc.id) as total_container_assignments,
    COUNT(roc.id) FILTER (WHERE roc.status = 'ready') as ready_containers,
    COUNT(roc.id) FILTER (WHERE roc.status = 'pending') as pending_containers,
    MIN(roc.ready_for_release_at) as earliest_ready_time,
    ro.created_at,
    (CURRENT_TIMESTAMP - ro.created_at) as age
FROM release_orders ro
LEFT JOIN release_order_containers roc ON ro.id = roc.release_order_id
WHERE ro.status IN ('pending', 'validated', 'in_process')
GROUP BY ro.id, ro.release_order_number, ro.client_code, ro.client_name,
         ro.total_containers, ro.remaining_containers, ro.scheduled_pickup_date,
         ro.status, ro.priority_level, ro.created_at
ORDER BY ro.priority_level DESC, ro.scheduled_pickup_date NULLS LAST, ro.created_at;

-- View for container release queue
CREATE VIEW v_container_release_queue AS
SELECT
    roc.id,
    roc.container_number,
    roc.container_size,
    roc.status as container_status,
    ro.release_order_number,
    ro.client_code,
    ro.client_name,
    ro.status as release_order_status,
    ro.priority_level,
    roc.current_location,
    y.name as current_yard_name,
    roc.ready_for_release_at,
    roc.selected_at,
    ro.scheduled_pickup_date,
    CASE
        WHEN roc.status = 'ready' THEN 0
        WHEN roc.status = 'pending' THEN 1
        ELSE 2
    END as queue_priority,
    (CURRENT_TIMESTAMP - roc.selected_at) as waiting_time
FROM release_order_containers roc
JOIN release_orders ro ON roc.release_order_id = ro.id
LEFT JOIN yards y ON roc.current_yard_id = y.id
WHERE roc.status IN ('pending', 'ready')
AND ro.status NOT IN ('completed', 'cancelled')
ORDER BY queue_priority, ro.priority_level DESC, ro.scheduled_pickup_date NULLS LAST, roc.selected_at;

-- =====================================================
-- SAMPLE DATA FOR RELEASE ORDERS MODULE
-- =====================================================

-- Insert sample booking references
INSERT INTO booking_references (
    id, booking_number, client_code, client_name, booking_type,
    container_quantities_20ft, container_quantities_40ft,
    max_quantity_threshold, status, estimated_release_date,
    priority_level, notes
) VALUES
-- Maersk booking
('booking-maeu-001'::UUID, 'BK-MAEU-2025-020', 'MAEU', 'Maersk Line', 'EXPORT', 5, 8, 10, 'validated', '2025-01-15', 'high', 'Urgent export booking for Maersk - containers ready for release'),

-- MSC booking with detailed breakdown required
('booking-mscu-001'::UUID, 'BK-MSCU-2025-025', 'MSCU', 'MSC Mediterranean Shipping', 'IMPORT', 8, 15, 10, 'validated', '2025-01-16', 'high', 'Large booking requiring detailed breakdown - priority handling'),

-- CMA CGM standard booking
('booking-cmdu-001'::UUID, 'BK-CMDU-2025-030', 'CMDU', 'CMA CGM', 'EXPORT', 3, 4, 10, 'validated', '2025-01-14', 'medium', 'Standard export booking for CMA CGM'),

-- Shipping Solutions smaller booking
('booking-ship001-001'::UUID, 'BK-SHIP001-2025-012', 'SHIP001', 'Shipping Solutions Inc', 'EXPORT', 2, 1, 10, 'validated', '2025-01-13', 'medium', 'Small booking for freight forwarder');

-- Insert sample release orders
INSERT INTO release_orders (
    id, booking_reference_id, booking_number, client_code, client_name, booking_type,
    container_quantities_20ft, container_quantities_40ft, remaining_containers,
    status, estimated_release_date, scheduled_pickup_date, scheduled_pickup_time,
    transport_company, driver_name, vehicle_number, release_from_yard_id,
    priority_level, special_instructions, notes
) VALUES
-- First release for Maersk booking
('release-maeu-001'::UUID, 'booking-maeu-001'::UUID, 'BK-MAEU-2025-020', 'MAEU', 'Maersk Line', 'EXPORT', 2, 3, 5, 'in_process', '2025-01-15', '2025-01-15', '10:30:00', 'SIVOM Transport', 'Kouamé Yves', 'TRK-001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::UUID, 'high', 'First batch release - priority containers', 'Release of 5 containers for immediate export'),

-- MSC release order
('release-mscu-001'::UUID, 'booking-mscu-001'::UUID, 'BK-MSCU-2025-025', 'MSCU', 'MSC Mediterranean Shipping', 'IMPORT', 4, 6, 10, 'pending', '2025-01-16', '2025-01-16', '14:00:00', 'GETMA Logistics', 'Koné Seydou', 'TRK-003', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::UUID, 'high', 'Reefer containers require temperature monitoring', 'First release batch from large import booking'),

-- CMA CGM complete release
('release-cmdu-001'::UUID, 'booking-cmdu-001'::UUID, 'BK-CMDU-2025-030', 'CMDU', 'CMA CGM', 'EXPORT', 3, 4, 7, 'pending', '2025-01-14', '2025-01-14', '09:00:00', 'Express Cargo CI', 'Diabaté Fatou', 'TRK-002', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::UUID, 'medium', 'Complete booking release', 'Full release of all containers in booking');

-- Insert some container assignments to release orders
INSERT INTO release_order_containers (
    release_order_id, container_id, container_number, container_type, container_size,
    status, current_yard_id, current_location, selected_at, assignment_method, notes
) VALUES
-- Containers for Maersk release
('release-maeu-001'::UUID, 'cont-maeu-001'::UUID, 'MAEU1234567', 'dry', '40ft', 'ready', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::UUID, 'Stack S3, Tier 1', '2025-01-12 14:30:00', 'auto', 'Auto-selected container ready for release'),
('release-maeu-001'::UUID, 'cont-maeu-002'::UUID, 'MAEU2345678', 'dry', '20ft', 'ready', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::UUID, 'Stack S5, Tier 2', '2025-01-12 14:30:00', 'auto', 'Auto-selected container ready for release'),

-- Containers for MSC release
('release-mscu-001'::UUID, 'cont-mscu-001'::UUID, 'MSCU3456789', 'reefer', '40ft', 'pending', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::UUID, 'Stack S7, Tier 1', '2025-01-12 15:00:00', 'auto', 'Reefer container requiring special handling'),
('release-mscu-001'::UUID, 'cont-mscu-002'::UUID, 'MSCU4567890', 'dry', '20ft', 'ready', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::UUID, 'Stack S9, Tier 3', '2025-01-12 15:00:00', 'auto', 'Standard container ready for release'),

-- Container for CMA CGM release
('release-cmdu-001'::UUID, 'cont-cmdu-001'::UUID, 'CMDU5678901', 'dry', '40ft', 'pending', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::UUID, 'Stack S11, Tier 1', '2025-01-12 16:00:00', 'auto', 'High-cube container pending release preparation');

-- =====================================================
-- RELEASE ORDERS MODULE COMPLETE
-- =====================================================

COMMENT ON TABLE booking_references IS 'Master booking information with container quantities and validation status';
COMMENT ON TABLE release_orders IS 'Specific release orders with transport details and progress tracking';
COMMENT ON TABLE release_order_containers IS 'Individual container assignments to release orders with status tracking';
COMMENT ON TABLE container_selection_criteria IS 'Automated container selection rules and preferences';
COMMENT ON TABLE booking_documentation IS 'Document management for bookings and release orders';
COMMENT ON TABLE release_order_progress IS 'Progress tracking and performance metrics for release orders';

-- Display success message
SELECT 'Release Orders & Booking References Module (06) - Schema created successfully!' as status,
       'Includes: Booking management, release orders, container assignments, and progress tracking' as details;
