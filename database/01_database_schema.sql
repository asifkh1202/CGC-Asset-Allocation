-- =====================================================
-- Enterprise Security Compliance Platform
-- Database Schema - PostgreSQL 15
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- 1. USERS TABLE - Authentication & RBAC
-- =====================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'viewer'
        CHECK (role IN ('super_admin', 'national_lead', 'regional_manager', 'viewer', 'auditor')),
    region VARCHAR(100),
    department VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. DEVICES TABLE - Master Device Registry
-- =====================================================
CREATE TABLE devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_key VARCHAR(255) UNIQUE NOT NULL,
    computer_name VARCHAR(255),
    serial_number VARCHAR(255),
    os_type VARCHAR(100),
    os_version VARCHAR(255),
    region VARCHAR(100),
    department VARCHAR(100),
    last_seen TIMESTAMP WITH TIME ZONE,
    first_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 3. INVENTORIES TABLE - Tool-Specific Data
-- =====================================================
CREATE TABLE inventories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    upload_id UUID,
    tool_name VARCHAR(50) NOT NULL
        CHECK (tool_name IN ('Cube', 'AD', 'DC', 'KES', 'DLP')),
    device_key VARCHAR(255) NOT NULL,
    computer_name VARCHAR(255),
    serial_number VARCHAR(255),
    os_type VARCHAR(100),
    os_version VARCHAR(255),
    region VARCHAR(100),
    department VARCHAR(100),
    ip_address VARCHAR(45),
    mac_address VARCHAR(17),
    last_logged_user VARCHAR(255),
    additional_data JSONB,
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INTEGER NOT NULL CHECK (year BETWEEN 2000 AND 2100),
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT fk_inventories_upload FOREIGN KEY (upload_id) REFERENCES uploads(id) ON DELETE SET NULL,
    CONSTRAINT fk_inventories_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- =====================================================
-- 4. UPLOADS TABLE - File Tracking
-- =====================================================
CREATE TABLE uploads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    filename VARCHAR(500) NOT NULL,
    original_name VARCHAR(500) NOT NULL,
    tool_name VARCHAR(50) NOT NULL
        CHECK (tool_name IN ('Cube', 'AD', 'DC', 'KES', 'DLP')),
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INTEGER NOT NULL CHECK (year BETWEEN 2000 AND 2100),
    row_count INTEGER DEFAULT 0,
    duplicate_count INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'processing'
        CHECK (status IN ('processing', 'completed', 'failed', 'partial')),
    error_message TEXT,
    file_size BIGINT,
    uploaded_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT fk_uploads_user FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
);

-- =====================================================
-- 5. COMPLIANCE_RESULTS TABLE - Calculated Metrics
-- =====================================================
CREATE TABLE compliance_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    baseline_tool VARCHAR(50) NOT NULL
        CHECK (baseline_tool IN ('Cube', 'AD', 'DC', 'KES', 'DLP')),
    comparison_tool VARCHAR(50) NOT NULL
        CHECK (comparison_tool IN ('Cube', 'AD', 'DC', 'KES', 'DLP')),
    region VARCHAR(100),
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INTEGER NOT NULL CHECK (year BETWEEN 2000 AND 2100),
    baseline_total INTEGER DEFAULT 0,
    found_count INTEGER DEFAULT 0,
    missing_count INTEGER DEFAULT 0,
    compliance_percentage DECIMAL(5,2) DEFAULT 0.00,
    os_breakdown JSONB,
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_compliance_result UNIQUE (baseline_tool, comparison_tool, region, month, year)
);

-- =====================================================
-- 6. DEVICE_MAPPING TABLE - Cross-Tool Indexing
-- =====================================================
CREATE TABLE device_mapping (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id UUID NOT NULL,
    device_key VARCHAR(255) NOT NULL,
    tool_name VARCHAR(50) NOT NULL
        CHECK (tool_name IN ('Cube', 'AD', 'DC', 'KES', 'DLP')),
    inventory_id UUID,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT fk_mapping_device FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
    CONSTRAINT fk_mapping_inventory FOREIGN KEY (inventory_id) REFERENCES inventories(id) ON DELETE SET NULL,
    CONSTRAINT unique_device_tool_period UNIQUE (device_key, tool_name, month, year)
);

-- =====================================================
-- 7. ALERTS TABLE - Notifications
-- =====================================================
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alert_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'info'
        CHECK (severity IN ('critical', 'warning', 'info', 'success')),
    title VARCHAR(500) NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB,
    is_acknowledged BOOLEAN DEFAULT false,
    acknowledged_by UUID,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    region VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT fk_alerts_user FOREIGN KEY (acknowledged_by) REFERENCES users(id) ON DELETE SET NULL
);

-- =====================================================
-- 8. AUDIT_LOGS TABLE - Security Trail
-- =====================================================
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100),
    resource_id VARCHAR(255),
    details JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- =====================================================
-- 9. COMPLIANCE_SNAPSHOTS TABLE - Historical Tracking
-- =====================================================
CREATE TABLE compliance_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    snapshot_date DATE NOT NULL,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    region VARCHAR(100),
    data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES - Performance Optimization (15+)
-- =====================================================

-- Users indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_region ON users(region);
CREATE INDEX idx_users_active ON users(is_active);

-- Devices indexes
CREATE INDEX idx_devices_device_key ON devices(device_key);
CREATE INDEX idx_devices_region ON devices(region);
CREATE INDEX idx_devices_os_type ON devices(os_type);
CREATE INDEX idx_devices_active ON devices(is_active);

-- Inventories indexes
CREATE INDEX idx_inventories_tool ON inventories(tool_name);
CREATE INDEX idx_inventories_device_key ON inventories(device_key);
CREATE INDEX idx_inventories_period ON inventories(month, year);
CREATE INDEX idx_inventories_region ON inventories(region);
CREATE INDEX idx_inventories_upload ON inventories(upload_id);

-- Compliance results indexes
CREATE INDEX idx_compliance_baseline ON compliance_results(baseline_tool);
CREATE INDEX idx_compliance_period ON compliance_results(month, year);
CREATE INDEX idx_compliance_region ON compliance_results(region);

-- Device mapping indexes
CREATE INDEX idx_mapping_device_key ON device_mapping(device_key);
CREATE INDEX idx_mapping_tool ON device_mapping(tool_name);

-- Alerts indexes
CREATE INDEX idx_alerts_severity ON alerts(severity);
CREATE INDEX idx_alerts_acknowledged ON alerts(is_acknowledged);
CREATE INDEX idx_alerts_created ON alerts(created_at DESC);

-- Audit logs indexes
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_created ON audit_logs(created_at DESC);

-- Snapshots indexes
CREATE INDEX idx_snapshots_period ON compliance_snapshots(month, year);
CREATE INDEX idx_snapshots_region ON compliance_snapshots(region);

-- =====================================================
-- VIEWS - Analytical Views for Reporting
-- =====================================================

-- View 1: Compliance Overview by Region and Tool
CREATE OR REPLACE VIEW vw_compliance_overview AS
SELECT
    cr.baseline_tool,
    cr.comparison_tool,
    cr.region,
    cr.month,
    cr.year,
    cr.baseline_total,
    cr.found_count,
    cr.missing_count,
    cr.compliance_percentage,
    CASE
        WHEN cr.compliance_percentage >= 90 THEN 'green'
        WHEN cr.compliance_percentage >= 75 THEN 'amber'
        WHEN cr.compliance_percentage >= 60 THEN 'orange'
        ELSE 'red'
    END AS status_color,
    cr.calculated_at
FROM compliance_results cr
ORDER BY cr.year DESC, cr.month DESC, cr.region;

-- View 2: Device Coverage Summary
CREATE OR REPLACE VIEW vw_device_coverage AS
SELECT
    d.device_key,
    d.computer_name,
    d.serial_number,
    d.os_type,
    d.region,
    COUNT(DISTINCT dm.tool_name) AS tools_covered,
    ARRAY_AGG(DISTINCT dm.tool_name) AS tool_list,
    CASE
        WHEN COUNT(DISTINCT dm.tool_name) = 5 THEN 'fully_covered'
        WHEN COUNT(DISTINCT dm.tool_name) >= 3 THEN 'partially_covered'
        ELSE 'low_coverage'
    END AS coverage_status
FROM devices d
LEFT JOIN device_mapping dm ON d.id = dm.device_id
GROUP BY d.device_key, d.computer_name, d.serial_number, d.os_type, d.region;

-- =====================================================
-- SEED DATA - Default Admin User
-- =====================================================
-- Password: SecurePass123! (bcrypt hashed)
INSERT INTO users (email, password_hash, first_name, last_name, role, region)
VALUES (
    'admin@enterprise.com',
    '$2b$10$rQZ8kHzM6kGh0X5tVQZXOeJfGxQfBqhT9XvKjYw5nZsE3hR2mKpWe',
    'System',
    'Administrator',
    'super_admin',
    'National'
) ON CONFLICT (email) DO NOTHING;

-- =====================================================
-- FUNCTIONS - Utility Functions
-- =====================================================

-- Function: Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_devices_updated_at
    BEFORE UPDATE ON devices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function: Generate device key
CREATE OR REPLACE FUNCTION generate_device_key(serial_no VARCHAR, computer_name VARCHAR)
RETURNS VARCHAR AS $$
BEGIN
    IF serial_no IS NOT NULL AND serial_no != '' THEN
        RETURN UPPER(REGEXP_REPLACE(TRIM(serial_no), '[^A-Za-z0-9]', '', 'g'));
    ELSIF computer_name IS NOT NULL AND computer_name != '' THEN
        RETURN UPPER(REGEXP_REPLACE(TRIM(computer_name), '[^A-Za-z0-9]', '', 'g'));
    ELSE
        RETURN NULL;
    END IF;
END;
$$ LANGUAGE plpgsql;
