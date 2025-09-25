-- =====================================================
-- CDMS (Container Depot Management System) - Foundation Schema
-- Module: Foundation (Core System)
-- Version: 1.0
-- Description: Base schema with core tables for users, authentication, and system configuration
-- =====================================================

-- Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Create main schema for CDMS
CREATE SCHEMA IF NOT EXISTS cdms_core;
CREATE SCHEMA IF NOT EXISTS cdms_audit;
CREATE SCHEMA IF NOT EXISTS cdms_config;

-- Set search path
SET search_path = cdms_core, public;

-- =====================================================
-- ENUMS AND CUSTOM TYPES
-- =====================================================

-- User roles
CREATE TYPE user_role AS ENUM ('client', 'admin', 'operator', 'supervisor');

-- Container types
CREATE TYPE container_type AS ENUM ('dry', 'reefer', 'tank', 'flat_rack', 'open_top');

-- Container sizes
CREATE TYPE container_size AS ENUM ('20ft', '40ft');

-- Container status
CREATE TYPE container_status AS ENUM ('in_depot', 'out_depot', 'in_service', 'maintenance', 'cleaning');

-- Booking types
CREATE TYPE booking_type AS ENUM ('IMPORT', 'EXPORT');

-- Operation status
CREATE TYPE operation_status AS ENUM ('pending', 'in_process', 'completed', 'cancelled');

-- Gate operation types
CREATE TYPE gate_operation_type AS ENUM ('gate_in', 'gate_out', 'container_move', 'stack_assignment', 'yard_switch', 'client_pool_create', 'client_pool_update', 'container_assign', 'stack_remove', 'stack_bulk_assign', 'container_release', 'yard_create', 'yard_update', 'yard_delete', 'edi_transmission', 'codeco_generate');

-- Priority levels
CREATE TYPE priority_level AS ENUM ('low', 'medium', 'high', 'critical');

-- Yard layout types
CREATE TYPE yard_layout AS ENUM ('tantarelli', 'standard');

-- =====================================================
-- FOUNDATION TABLES
-- =====================================================

-- System Configuration
CREATE TABLE cdms_config.system_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value JSONB NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_by VARCHAR(100)
);

-- Module Access Configuration
CREATE TABLE module_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module_name VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(30) NOT NULL CHECK (category IN ('core', 'operations', 'management', 'admin')),
    required_roles user_role[],
    is_system_module BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    role user_role NOT NULL DEFAULT 'operator',
    company VARCHAR(100),
    phone VARCHAR(20),
    department VARCHAR(50),
    avatar_url TEXT,
    client_code VARCHAR(10), -- For client users
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP WITH TIME ZONE,
    password_expires_at TIMESTAMP WITH TIME ZONE,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

-- User Module Access (Junction table for user permissions)
CREATE TABLE user_module_access (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    module_name VARCHAR(50) REFERENCES module_permissions(module_name),
    has_access BOOLEAN DEFAULT FALSE,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    granted_by UUID REFERENCES users(id),
    UNIQUE(user_id, module_name)
);

-- User Sessions
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- AUDIT TABLES (in audit schema)
-- =====================================================

-- Generic audit log
CREATE TABLE cdms_audit.audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name VARCHAR(100) NOT NULL,
    record_id UUID,
    operation VARCHAR(10) NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
    old_values JSONB,
    new_values JSONB,
    changed_fields TEXT[],
    performed_by UUID REFERENCES users(id),
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT
);

-- System activity log
CREATE TABLE cdms_audit.system_activity (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    activity_type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    details JSONB,
    severity VARCHAR(20) DEFAULT 'INFO' CHECK (severity IN ('DEBUG', 'INFO', 'WARN', 'ERROR', 'CRITICAL')),
    user_id UUID REFERENCES users(id),
    session_id UUID REFERENCES user_sessions(id),
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- INDEXES FOR FOUNDATION
-- =====================================================

-- Users indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_client_code ON users(client_code) WHERE client_code IS NOT NULL;
CREATE INDEX idx_users_active ON users(is_active) WHERE is_active = TRUE;

-- Sessions indexes
CREATE INDEX idx_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_sessions_active ON user_sessions(is_active, expires_at) WHERE is_active = TRUE;

-- Audit indexes
CREATE INDEX idx_audit_log_table ON cdms_audit.audit_log(table_name);
CREATE INDEX idx_audit_log_record ON cdms_audit.audit_log(record_id);
CREATE INDEX idx_audit_log_performed ON cdms_audit.audit_log(performed_at);
CREATE INDEX idx_audit_log_user ON cdms_audit.audit_log(performed_by);

CREATE INDEX idx_system_activity_type ON cdms_audit.system_activity(activity_type);
CREATE INDEX idx_system_activity_time ON cdms_audit.system_activity(created_at);
CREATE INDEX idx_system_activity_user ON cdms_audit.system_activity(user_id);

-- =====================================================
-- INITIAL DATA FOR FOUNDATION
-- =====================================================

-- Insert default module permissions
INSERT INTO module_permissions (module_name, display_name, description, category, required_roles) VALUES
('dashboard', 'Dashboard', 'Access to main dashboard and overview', 'core', ARRAY['admin', 'supervisor', 'operator', 'client']::user_role[]),
('containers', 'Container Management', 'View and manage container information', 'operations', ARRAY['admin', 'supervisor', 'operator', 'client']::user_role[]),
('gate_in', 'Gate In Operations', 'Perform gate in operations for containers', 'operations', ARRAY['admin', 'supervisor', 'operator']::user_role[]),
('gate_out', 'Gate Out Operations', 'Perform gate out operations for containers', 'operations', ARRAY['admin', 'supervisor', 'operator']::user_role[]),
('releases', 'Release Orders', 'Manage release orders and bookings', 'operations', ARRAY['admin', 'supervisor', 'operator', 'client']::user_role[]),
('edi', 'EDI Integration', 'Manage EDI messages and transmissions', 'management', ARRAY['admin', 'supervisor']::user_role[]),
('yard', 'Yard Management', 'Manage yard configuration and operations', 'management', ARRAY['admin', 'supervisor', 'operator']::user_role[]),
('clients', 'Client Management', 'Manage client information and relationships', 'management', ARRAY['admin', 'supervisor']::user_role[]),
('users', 'User Management', 'Manage system users and permissions', 'admin', ARRAY['admin']::user_role[]),
('reports', 'Reporting', 'Generate and view system reports', 'management', ARRAY['admin', 'supervisor']::user_role[]),
('depot_management', 'Depot Management', 'Manage depot operations and configuration', 'management', ARRAY['admin', 'supervisor', 'operator', 'client']::user_role[]),
('time_tracking', 'Time Tracking', 'Track time-based operations and billing', 'operations', ARRAY['admin', 'supervisor', 'operator']::user_role[]),
('analytics', 'Analytics', 'Advanced analytics and insights', 'management', ARRAY['admin', 'supervisor']::user_role[]),
('client_pools', 'Client Pool Management', 'Manage client pool assignments', 'management', ARRAY['admin', 'supervisor']::user_role[]),
('stack_management', 'Stack Management', 'Manage yard stack configurations', 'management', ARRAY['admin', 'supervisor']::user_role[]),
('module_access', 'Module Access Control', 'Manage user module permissions', 'admin', ARRAY['admin']::user_role[]),
('audit_logs', 'Audit Logs', 'View system audit logs and activity', 'admin', ARRAY['admin']::user_role[]),
('billing_reports', 'Billing Reports', 'Generate billing and financial reports', 'management', ARRAY['admin', 'supervisor']::user_role[]),
('operations_reports', 'Operations Reports', 'Generate operational reports', 'management', ARRAY['admin', 'supervisor']::user_role[]);

-- Insert default system configuration
INSERT INTO cdms_config.system_config (config_key, config_value, description) VALUES
('app_name', '"Container Depot Management System"', 'Application name'),
('app_version', '"1.0.0"', 'Current application version'),
('default_timezone', '"Africa/Abidjan"', 'Default system timezone'),
('max_login_attempts', '5', 'Maximum failed login attempts before account lock'),
('session_timeout', '3600', 'User session timeout in seconds'),
('password_policy', '{"min_length": 8, "require_uppercase": true, "require_lowercase": true, "require_numbers": true, "require_symbols": false}', 'Password policy configuration'),
('file_upload_max_size', '10485760', 'Maximum file upload size in bytes (10MB)'),
('supported_languages', '["en", "fr"]', 'Supported system languages'),
('default_language', '"en"', 'Default system language'),
('yard_default_capacity', '2500', 'Default yard capacity for new yards'),
('container_max_stack_height', '5', 'Maximum container stack height'),
('gate_operation_timeout', '1800', 'Gate operation timeout in seconds (30 minutes)');

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_config_updated_at BEFORE UPDATE ON cdms_config.system_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create audit log entries
CREATE OR REPLACE FUNCTION create_audit_log_entry()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO cdms_audit.audit_log (table_name, record_id, operation, old_values, performed_by)
        VALUES (TG_TABLE_NAME, OLD.id, TG_OP, row_to_json(OLD), NULL);
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO cdms_audit.audit_log (table_name, record_id, operation, old_values, new_values, performed_by)
        VALUES (TG_TABLE_NAME, NEW.id, TG_OP, row_to_json(OLD), row_to_json(NEW), NEW.updated_by);
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO cdms_audit.audit_log (table_name, record_id, operation, new_values, performed_by)
        VALUES (TG_TABLE_NAME, NEW.id, TG_OP, row_to_json(NEW), NEW.created_by);
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

-- Add audit triggers to users table
CREATE TRIGGER audit_users_changes AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW EXECUTE FUNCTION create_audit_log_entry();

-- =====================================================
-- FOUNDATION MODULE COMPLETE
-- =====================================================

COMMENT ON SCHEMA cdms_core IS 'Main schema for CDMS core functionality';
COMMENT ON SCHEMA cdms_audit IS 'Schema for audit logs and system activity tracking';
COMMENT ON SCHEMA cdms_config IS 'Schema for system configuration and settings';

COMMENT ON TABLE users IS 'System users with roles and permissions';
COMMENT ON TABLE module_permissions IS 'Available system modules and their access requirements';
COMMENT ON TABLE user_module_access IS 'User-specific module access permissions';
COMMENT ON TABLE user_sessions IS 'Active user sessions for authentication';

-- Display success message
SELECT 'Foundation Module (01) - Schema created successfully!' as status;
