-- =====================================================
-- CDMS (Container Depot Management System) - Yard Management Module
-- Module: Yard Management
-- Version: 1.0
-- Description: Complete yard management with multi-depot support (Tantarelli, Vridi, San Pedro)
-- Dependencies: 01_foundation_schema.sql
-- =====================================================

-- Set search path
SET search_path = cdms_core, public;

-- =====================================================
-- YARD MANAGEMENT ENUMS
-- =====================================================

-- Yard block types
CREATE TYPE yard_block_type AS ENUM ('storage', 'maintenance', 'inspection', 'gate');

-- Stack configuration rules
CREATE TYPE stack_config_rule AS ENUM ('odd_only', 'even_only', 'both', 'paired_40ft', 'special_20ft');

-- =====================================================
-- YARD MANAGEMENT TABLES
-- =====================================================

-- Main Yards table
CREATE TABLE yards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    description TEXT,
    location VARCHAR(255),
    layout yard_layout DEFAULT 'standard',
    is_active BOOLEAN DEFAULT TRUE,
    total_capacity INTEGER DEFAULT 0,
    current_occupancy INTEGER DEFAULT 0,

    -- Geographic and operational info
    timezone VARCHAR(50) DEFAULT 'Africa/Abidjan',
    contact_manager VARCHAR(100),
    contact_phone VARCHAR(20),
    contact_email VARCHAR(255),

    -- Address information
    address_street VARCHAR(255),
    address_city VARCHAR(100),
    address_state VARCHAR(100),
    address_zip_code VARCHAR(20),
    address_country VARCHAR(100) DEFAULT 'Côte d''Ivoire',

    -- Operational parameters
    max_stack_height INTEGER DEFAULT 5,
    operating_hours_start TIME DEFAULT '06:00',
    operating_hours_end TIME DEFAULT '22:00',

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

-- User Yard Assignments (which users can access which yards)
CREATE TABLE user_yard_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    yard_id UUID REFERENCES yards(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    assigned_by UUID REFERENCES users(id),
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(user_id, yard_id)
);

-- Yard Sections (areas within a yard)
CREATE TABLE yard_sections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    yard_id UUID REFERENCES yards(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    description TEXT,

    -- 3D Position in yard
    position_x DECIMAL(10,2) DEFAULT 0,
    position_y DECIMAL(10,2) DEFAULT 0,
    position_z DECIMAL(10,2) DEFAULT 0,

    -- Dimensions
    width DECIMAL(10,2),
    length DECIMAL(10,2),

    -- Visual and operational
    color_hex VARCHAR(7) DEFAULT '#3b82f6',
    is_active BOOLEAN DEFAULT TRUE,
    max_stacks INTEGER,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),

    UNIQUE(yard_id, name)
);

-- Yard Stacks (container stacks within sections)
CREATE TABLE yard_stacks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    yard_id UUID REFERENCES yards(id) ON DELETE CASCADE,
    section_id UUID REFERENCES yard_sections(id) ON DELETE CASCADE,
    stack_number INTEGER NOT NULL,

    -- Stack configuration
    rows INTEGER NOT NULL DEFAULT 1,
    max_tiers INTEGER NOT NULL DEFAULT 5,
    capacity INTEGER GENERATED ALWAYS AS (rows * max_tiers) STORED,
    current_occupancy INTEGER DEFAULT 0,

    -- 3D Position within section
    position_x DECIMAL(10,2) DEFAULT 0,
    position_y DECIMAL(10,2) DEFAULT 0,
    position_z DECIMAL(10,2) DEFAULT 0,

    -- Dimensions (based on container size)
    width DECIMAL(8,2) DEFAULT 12.0, -- meters
    length DECIMAL(8,2) DEFAULT 6.0, -- meters

    -- Special properties for Tantarelli layout
    is_odd_stack BOOLEAN DEFAULT FALSE,
    config_rule stack_config_rule DEFAULT 'both',

    -- Operational status
    is_active BOOLEAN DEFAULT TRUE,
    maintenance_mode BOOLEAN DEFAULT FALSE,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),

    UNIQUE(yard_id, section_id, stack_number)
);

-- Yard Positions (individual container positions within stacks)
CREATE TABLE yard_positions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    yard_id UUID REFERENCES yards(id) ON DELETE CASCADE,
    section_id UUID REFERENCES yard_sections(id) ON DELETE CASCADE,
    stack_id UUID REFERENCES yard_stacks(id) ON DELETE CASCADE,

    -- Position coordinates within stack
    row_number INTEGER NOT NULL,
    bay_number INTEGER NOT NULL,
    tier_number INTEGER NOT NULL,

    -- Absolute 3D position in yard
    position_x DECIMAL(10,2),
    position_y DECIMAL(10,2),
    position_z DECIMAL(10,2),

    -- Occupancy information
    is_occupied BOOLEAN DEFAULT FALSE,
    container_id UUID, -- Will reference containers table when created
    container_number VARCHAR(20),
    container_size container_size,

    -- Reservation system
    reserved_until TIMESTAMP WITH TIME ZONE,
    reserved_by UUID REFERENCES users(id),
    client_code VARCHAR(10),

    -- Operational
    placed_at TIMESTAMP WITH TIME ZONE,
    is_accessible BOOLEAN DEFAULT TRUE,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(stack_id, row_number, bay_number, tier_number)
);

-- Yard Blocks (special operational areas)
CREATE TABLE yard_blocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    yard_id UUID REFERENCES yards(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    block_type yard_block_type NOT NULL,

    -- Capacity and occupancy
    capacity INTEGER DEFAULT 0,
    current_occupancy INTEGER DEFAULT 0,

    -- 3D Position and dimensions
    position_x DECIMAL(10,2) DEFAULT 0,
    position_y DECIMAL(10,2) DEFAULT 0,
    position_z DECIMAL(10,2) DEFAULT 0,
    width DECIMAL(10,2),
    length DECIMAL(10,2),
    height DECIMAL(10,2),

    -- Operational status
    is_active BOOLEAN DEFAULT TRUE,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),

    UNIQUE(yard_id, name)
);

-- Yard Operation Logs (specific to yard operations)
CREATE TABLE yard_operation_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    yard_id UUID REFERENCES yards(id) ON DELETE CASCADE,
    yard_code VARCHAR(20),

    -- Operation details
    operation_type gate_operation_type NOT NULL,
    container_number VARCHAR(20),

    -- User and timing
    user_id UUID REFERENCES users(id),
    user_name VARCHAR(100),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Operation data and status
    details JSONB DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'success' CHECK (status IN ('success', 'failed', 'pending')),
    error_message TEXT,

    -- Context
    session_id UUID REFERENCES user_sessions(id),
    ip_address INET
);

-- Yard Statistics (aggregated data for reporting)
CREATE TABLE yard_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    yard_id UUID REFERENCES yards(id) ON DELETE CASCADE,
    yard_code VARCHAR(20),

    -- Statistical data
    total_containers INTEGER DEFAULT 0,
    containers_in INTEGER DEFAULT 0,
    containers_out INTEGER DEFAULT 0,
    occupancy_rate DECIMAL(5,2) DEFAULT 0, -- percentage
    pending_operations INTEGER DEFAULT 0,

    -- Time-based data
    stats_date DATE DEFAULT CURRENT_DATE,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(yard_id, stats_date)
);

-- =====================================================
-- INDEXES FOR YARD MANAGEMENT
-- =====================================================

-- Yards indexes
CREATE INDEX idx_yards_code ON yards(code);
CREATE INDEX idx_yards_active ON yards(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_yards_layout ON yards(layout);

-- User assignments indexes
CREATE INDEX idx_user_yard_assignments_user ON user_yard_assignments(user_id);
CREATE INDEX idx_user_yard_assignments_yard ON user_yard_assignments(yard_id);
CREATE INDEX idx_user_yard_assignments_active ON user_yard_assignments(is_active) WHERE is_active = TRUE;

-- Sections indexes
CREATE INDEX idx_yard_sections_yard ON yard_sections(yard_id);
CREATE INDEX idx_yard_sections_active ON yard_sections(is_active) WHERE is_active = TRUE;

-- Stacks indexes
CREATE INDEX idx_yard_stacks_yard ON yard_stacks(yard_id);
CREATE INDEX idx_yard_stacks_section ON yard_stacks(section_id);
CREATE INDEX idx_yard_stacks_number ON yard_stacks(stack_number);
CREATE INDEX idx_yard_stacks_odd ON yard_stacks(is_odd_stack) WHERE is_odd_stack = TRUE;
CREATE INDEX idx_yard_stacks_active ON yard_stacks(is_active) WHERE is_active = TRUE;

-- Positions indexes
CREATE INDEX idx_yard_positions_yard ON yard_positions(yard_id);
CREATE INDEX idx_yard_positions_stack ON yard_positions(stack_id);
CREATE INDEX idx_yard_positions_occupied ON yard_positions(is_occupied, container_id) WHERE is_occupied = TRUE;
CREATE INDEX idx_yard_positions_reserved ON yard_positions(reserved_until, client_code) WHERE reserved_until > CURRENT_TIMESTAMP;
CREATE INDEX idx_yard_positions_container ON yard_positions(container_number) WHERE container_number IS NOT NULL;

-- Operation logs indexes
CREATE INDEX idx_yard_operation_logs_yard ON yard_operation_logs(yard_id);
CREATE INDEX idx_yard_operation_logs_type ON yard_operation_logs(operation_type);
CREATE INDEX idx_yard_operation_logs_timestamp ON yard_operation_logs(timestamp);
CREATE INDEX idx_yard_operation_logs_container ON yard_operation_logs(container_number) WHERE container_number IS NOT NULL;

-- Stats indexes
CREATE INDEX idx_yard_stats_yard ON yard_stats(yard_id);
CREATE INDEX idx_yard_stats_date ON yard_stats(stats_date);

-- =====================================================
-- TRIGGERS FOR YARD MANAGEMENT
-- =====================================================

-- Add updated_at triggers
CREATE TRIGGER update_yards_updated_at BEFORE UPDATE ON yards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_yard_sections_updated_at BEFORE UPDATE ON yard_sections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_yard_stacks_updated_at BEFORE UPDATE ON yard_stacks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_yard_positions_updated_at BEFORE UPDATE ON yard_positions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_yard_blocks_updated_at BEFORE UPDATE ON yard_blocks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add audit triggers
CREATE TRIGGER audit_yards_changes AFTER INSERT OR UPDATE OR DELETE ON yards
    FOR EACH ROW EXECUTE FUNCTION create_audit_log_entry();

CREATE TRIGGER audit_yard_stacks_changes AFTER INSERT OR UPDATE OR DELETE ON yard_stacks
    FOR EACH ROW EXECUTE FUNCTION create_audit_log_entry();

CREATE TRIGGER audit_yard_positions_changes AFTER INSERT OR UPDATE OR DELETE ON yard_positions
    FOR EACH ROW EXECUTE FUNCTION create_audit_log_entry();

-- =====================================================
-- YARD-SPECIFIC FUNCTIONS
-- =====================================================

-- Function to update yard occupancy when positions change
CREATE OR REPLACE FUNCTION update_yard_occupancy()
RETURNS TRIGGER AS $$
BEGIN
    -- Update stack occupancy
    UPDATE yard_stacks
    SET current_occupancy = (
        SELECT COUNT(*)
        FROM yard_positions
        WHERE stack_id = COALESCE(NEW.stack_id, OLD.stack_id)
        AND is_occupied = TRUE
    )
    WHERE id = COALESCE(NEW.stack_id, OLD.stack_id);

    -- Update yard total occupancy
    UPDATE yards
    SET current_occupancy = (
        SELECT COUNT(*)
        FROM yard_positions
        WHERE yard_id = COALESCE(NEW.yard_id, OLD.yard_id)
        AND is_occupied = TRUE
    )
    WHERE id = COALESCE(NEW.yard_id, OLD.yard_id);

    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Trigger for occupancy updates
CREATE TRIGGER update_occupancy_on_position_change
    AFTER INSERT OR UPDATE OR DELETE ON yard_positions
    FOR EACH ROW EXECUTE FUNCTION update_yard_occupancy();

-- Function to validate stack configuration for Tantarelli layout
CREATE OR REPLACE FUNCTION validate_tantarelli_stack_config()
RETURNS TRIGGER AS $$
DECLARE
    yard_layout_type yard_layout;
BEGIN
    -- Get yard layout
    SELECT layout INTO yard_layout_type
    FROM yards
    WHERE id = NEW.yard_id;

    -- Apply Tantarelli-specific rules
    IF yard_layout_type = 'tantarelli' THEN
        -- Odd stack numbers only
        IF NEW.stack_number % 2 = 0 THEN
            RAISE EXCEPTION 'Tantarelli layout only supports odd stack numbers, got %', NEW.stack_number;
        END IF;

        -- Set odd stack flag
        NEW.is_odd_stack = TRUE;

        -- Special capacity rules
        IF NEW.stack_number IN (1, 31, 101, 103) THEN
            NEW.config_rule = 'special_20ft';
        ELSE
            NEW.config_rule = 'paired_40ft';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for Tantarelli stack validation
CREATE TRIGGER validate_tantarelli_stacks BEFORE INSERT OR UPDATE ON yard_stacks
    FOR EACH ROW EXECUTE FUNCTION validate_tantarelli_stack_config();

-- =====================================================
-- INITIAL DATA FOR YARD MANAGEMENT
-- =====================================================

-- Insert default yards (Tantarelli, Vridi, San Pedro)
INSERT INTO yards (
    id, name, code, description, location, layout, total_capacity, current_occupancy,
    timezone, contact_manager, contact_phone, contact_email,
    address_street, address_city, address_state, address_zip_code, address_country,
    created_by
) VALUES
-- Depot Tantarelli
(
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::UUID,
    'Depot Tantarelli',
    'DEPOT-01',
    'Main container depot with specialized odd-numbered stack layout',
    'Tantarelli Port Complex',
    'tantarelli',
    2500,
    1847,
    'Africa/Abidjan',
    'Jean-Baptiste Kouassi',
    '+225 XX XX XX XX XX',
    'manager.tantarelli@depot.ci',
    'Zone Portuaire de Tantarelli',
    'Abidjan',
    'Lagunes',
    '01 BP 1234',
    'Côte d''Ivoire',
    NULL
),
-- Depot Vridi
(
    'b2c3d4e5-f6g7-8901-bcde-f23456789012'::UUID,
    'Depot Vridi',
    'DEPOT-02',
    'Secondary container depot with standard grid layout',
    'Port Autonome d''Abidjan - Vridi',
    'standard',
    1800,
    1245,
    'Africa/Abidjan',
    'Marie Adjoua',
    '+225 YY YY YY YY YY',
    'manager.vridi@depot.ci',
    'Boulevard de Vridi',
    'Abidjan',
    'Lagunes',
    '08 BP 5678',
    'Côte d''Ivoire',
    NULL
),
-- Depot San Pedro
(
    'c3d4e5f6-g7h8-9012-cdef-345678901234'::UUID,
    'Depot San Pedro',
    'DEPOT-03',
    'Coastal container depot with specialized handling',
    'Port Autonome de San Pedro',
    'standard',
    1200,
    890,
    'Africa/Abidjan',
    'Pierre Kouadio',
    '+225 ZZ ZZ ZZ ZZ ZZ',
    'manager.sanpedro@depot.ci',
    'Zone Portuaire San Pedro',
    'San Pedro',
    'Bas-Sassandra',
    '10 BP 3456',
    'Côte d''Ivoire',
    NULL
);

-- Insert sections for Depot Tantarelli
INSERT INTO yard_sections (id, yard_id, name, description, position_x, position_y, position_z, width, length, color_hex) VALUES
('section-top-tantarelli'::UUID, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::UUID, 'Top Section', 'Northern section of Tantarelli depot', 0, 0, 0, 400, 120, '#3b82f6'),
('section-center-tantarelli'::UUID, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::UUID, 'Center Section', 'Central section of Tantarelli depot', 0, 140, 0, 400, 100, '#f59e0b'),
('section-bottom-tantarelli'::UUID, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::UUID, 'Bottom Section', 'Southern section of Tantarelli depot', 0, 260, 0, 400, 140, '#10b981');

-- Insert sections for Depot Vridi
INSERT INTO yard_sections (id, yard_id, name, description, position_x, position_y, position_z, width, length, color_hex) VALUES
('section-a-vridi'::UUID, 'b2c3d4e5-f6g7-8901-bcde-f23456789012'::UUID, 'Section A', 'Primary section of Vridi depot', 0, 0, 0, 300, 100, '#3b82f6'),
('section-b-vridi'::UUID, 'b2c3d4e5-f6g7-8901-bcde-f23456789012'::UUID, 'Section B', 'Secondary section of Vridi depot', 0, 120, 0, 300, 100, '#10b981');

-- Insert sections for Depot San Pedro
INSERT INTO yard_sections (id, yard_id, name, description, position_x, position_y, position_z, width, length, color_hex) VALUES
('section-a-sanpedro'::UUID, 'c3d4e5f6-g7h8-9012-cdef-345678901234'::UUID, 'Section A', 'Primary section of San Pedro depot', 0, 0, 0, 250, 80, '#3b82f6'),
('section-b-sanpedro'::UUID, 'c3d4e5f6-g7h8-9012-cdef-345678901234'::UUID, 'Section B', 'Secondary section of San Pedro depot', 0, 100, 0, 250, 60, '#10b981');

-- =====================================================
-- SAMPLE STACKS DATA (Tantarelli odd-numbered stacks)
-- =====================================================

-- Insert sample Tantarelli Top Section stacks (odd numbers only: 1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31)
INSERT INTO yard_stacks (yard_id, section_id, stack_number, rows, max_tiers, position_x, position_y, position_z, is_odd_stack, config_rule)
SELECT
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::UUID,
    'section-top-tantarelli'::UUID,
    stack_num,
    CASE
        WHEN stack_num = 1 THEN 4
        WHEN stack_num = 31 THEN 7
        ELSE 5
    END,
    5,
    (row_number() OVER (ORDER BY stack_num) - 1) * 25,
    20,
    0,
    TRUE,
    CASE
        WHEN stack_num IN (1, 31) THEN 'special_20ft'
        ELSE 'paired_40ft'
    END
FROM (VALUES (1), (3), (5), (7), (9), (11), (13), (15), (17), (19), (21), (23), (25), (27), (29), (31)) AS t(stack_num);

-- Insert sample positions for some stacks (stack 1 as example)
INSERT INTO yard_positions (yard_id, section_id, stack_id, row_number, bay_number, tier_number, position_x, position_y, position_z, is_occupied)
SELECT
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::UUID,
    'section-top-tantarelli'::UUID,
    ys.id,
    r.row_num,
    r.row_num,
    t.tier_num,
    ys.position_x + (r.row_num * 6),
    ys.position_y + (r.row_num * 2.5),
    (t.tier_num - 1) * 2.6,
    FALSE
FROM yard_stacks ys
CROSS JOIN (VALUES (1), (2), (3), (4)) AS r(row_num)  -- 4 rows for stack 1
CROSS JOIN (VALUES (1), (2), (3), (4), (5)) AS t(tier_num)  -- 5 tiers
WHERE ys.stack_number = 1 AND ys.yard_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::UUID;

-- =====================================================
-- YARD MANAGEMENT MODULE VIEWS
-- =====================================================

-- View for yard overview with occupancy
CREATE VIEW v_yard_overview AS
SELECT
    y.id,
    y.name,
    y.code,
    y.layout,
    y.total_capacity,
    y.current_occupancy,
    ROUND((y.current_occupancy::DECIMAL / NULLIF(y.total_capacity, 0)) * 100, 2) as occupancy_rate,
    y.contact_manager,
    y.contact_phone,
    y.is_active,
    COUNT(DISTINCT ys.id) as section_count,
    COUNT(DISTINCT ysk.id) as stack_count,
    COUNT(DISTINCT yp.id) as total_positions,
    COUNT(DISTINCT yp.id) FILTER (WHERE yp.is_occupied = TRUE) as occupied_positions
FROM yards y
LEFT JOIN yard_sections ys ON y.id = ys.yard_id
LEFT JOIN yard_stacks ysk ON y.id = ysk.yard_id
LEFT JOIN yard_positions yp ON y.id = yp.yard_id
GROUP BY y.id, y.name, y.code, y.layout, y.total_capacity, y.current_occupancy, y.contact_manager, y.contact_phone, y.is_active;

-- View for stack utilization
CREATE VIEW v_stack_utilization AS
SELECT
    y.name as yard_name,
    y.code as yard_code,
    ys.name as section_name,
    ysk.stack_number,
    ysk.capacity,
    ysk.current_occupancy,
    ROUND((ysk.current_occupancy::DECIMAL / NULLIF(ysk.capacity, 0)) * 100, 2) as utilization_rate,
    ysk.is_odd_stack,
    ysk.config_rule,
    ysk.is_active,
    ysk.maintenance_mode
FROM yard_stacks ysk
JOIN yards y ON ysk.yard_id = y.id
JOIN yard_sections ys ON ysk.section_id = ys.id
ORDER BY y.code, ys.name, ysk.stack_number;

-- =====================================================
-- YARD MANAGEMENT MODULE COMPLETE
-- =====================================================

COMMENT ON TABLE yards IS 'Container depot/yard definitions with multi-location support';
COMMENT ON TABLE yard_sections IS 'Logical sections within each yard for organization';
COMMENT ON TABLE yard_stacks IS 'Container stacks with capacity and positioning';
COMMENT ON TABLE yard_positions IS 'Individual container positions within stacks';
COMMENT ON TABLE yard_operation_logs IS 'Detailed logs of yard-specific operations';

-- Display success message
SELECT 'Yard Management Module (02) - Schema created successfully!' as status,
       'Includes: 3 default yards (Tantarelli, Vridi, San Pedro), sections, stacks, and positions' as details;
