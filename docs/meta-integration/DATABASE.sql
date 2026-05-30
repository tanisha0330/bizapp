-- =============================================
-- DATABASE SCHEMA FOR META INTEGRATION
-- =============================================
-- Database: PostgreSQL 14+
-- Purpose: Store Meta (Facebook/Instagram) integration data
-- Security: Tokens are encrypted at rest using AES-256-GCM
-- =============================================

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable encryption extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============================================
-- TABLE: users
-- =============================================
-- Main user table (if doesn't exist already)
-- =============================================

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    full_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);

-- =============================================
-- TABLE: meta_connections
-- =============================================
-- Stores Meta authentication tokens & user profile
-- =============================================

CREATE TABLE meta_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Meta User Info
    meta_user_id VARCHAR(255) NOT NULL,
    meta_username VARCHAR(255),
    meta_email VARCHAR(255),
    meta_name VARCHAR(255),
    
    -- Access Tokens (ENCRYPTED)
    access_token TEXT NOT NULL, -- Encrypted long-lived user access token
    token_type VARCHAR(50) DEFAULT 'Bearer',
    token_expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Token Metadata
    granted_scopes TEXT[], -- Array of permission scopes granted
    is_token_valid BOOLEAN DEFAULT true,
    last_token_refresh_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    connected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    disconnected_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    
    -- Constraints
    CONSTRAINT unique_user_meta UNIQUE(user_id),
    CONSTRAINT unique_meta_user UNIQUE(meta_user_id)
);

CREATE INDEX idx_meta_connections_user_id ON meta_connections(user_id);
CREATE INDEX idx_meta_connections_meta_user_id ON meta_connections(meta_user_id);
CREATE INDEX idx_meta_connections_is_active ON meta_connections(is_active);

-- =============================================
-- TABLE: meta_pages
-- =============================================
-- Stores Facebook Pages the user manages
-- =============================================

CREATE TABLE meta_pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    meta_connection_id UUID NOT NULL REFERENCES meta_connections(id) ON DELETE CASCADE,
    
    -- Page Info
    page_id VARCHAR(255) NOT NULL, -- Facebook Page ID
    page_name VARCHAR(255) NOT NULL,
    page_category VARCHAR(255),
    page_username VARCHAR(255), -- @username
    page_about TEXT,
    page_picture_url TEXT,
    page_cover_url TEXT,
    page_website VARCHAR(500),
    page_phone VARCHAR(50),
    page_likes_count INTEGER DEFAULT 0,
    page_followers_count INTEGER DEFAULT 0,
    
    -- Access Token for this specific Page (ENCRYPTED)
    page_access_token TEXT NOT NULL, -- Never expires if permissions maintained
    
    -- Permissions & Capabilities
    tasks TEXT[], -- Array of tasks user can perform (e.g., ["ANALYZE", "ADVERTISE", "MODERATE"])
    permissions TEXT[], -- Array of permissions for this page
    
    -- Instagram Connection (if linked)
    instagram_business_account_id VARCHAR(255),
    instagram_username VARCHAR(255),
    has_instagram BOOLEAN DEFAULT false,
    
    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    
    -- Constraints
    CONSTRAINT unique_page_per_connection UNIQUE(meta_connection_id, page_id)
);

CREATE INDEX idx_meta_pages_connection_id ON meta_pages(meta_connection_id);
CREATE INDEX idx_meta_pages_page_id ON meta_pages(page_id);
CREATE INDEX idx_meta_pages_instagram_id ON meta_pages(instagram_business_account_id);
CREATE INDEX idx_meta_pages_is_active ON meta_pages(is_active);

-- =============================================
-- TABLE: meta_adaccounts
-- =============================================
-- Stores Ad Accounts the user has access to
-- =============================================

CREATE TABLE meta_adaccounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    meta_connection_id UUID NOT NULL REFERENCES meta_connections(id) ON DELETE CASCADE,
    
    -- Ad Account Info
    ad_account_id VARCHAR(255) NOT NULL, -- Format: act_123456789
    ad_account_name VARCHAR(255),
    account_status INTEGER DEFAULT 1, -- 1=ACTIVE, 2=DISABLED, etc.
    currency VARCHAR(10) DEFAULT 'USD',
    timezone_id INTEGER,
    timezone_name VARCHAR(100),
    business_name VARCHAR(255),
    business_id VARCHAR(255),
    
    -- Financial Info
    balance_amount DECIMAL(15, 2) DEFAULT 0.00,
    amount_spent DECIMAL(15, 2) DEFAULT 0.00,
    spend_cap DECIMAL(15, 2),
    
    -- Capabilities
    capabilities TEXT[], -- Array of capabilities
    
    -- Access Level
    has_advertiser_access BOOLEAN DEFAULT false,
    has_analyst_access BOOLEAN DEFAULT false,
    has_admin_access BOOLEAN DEFAULT false,
    
    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    
    -- Constraints
    CONSTRAINT unique_adaccount_per_connection UNIQUE(meta_connection_id, ad_account_id)
);

CREATE INDEX idx_meta_adaccounts_connection_id ON meta_adaccounts(meta_connection_id);
CREATE INDEX idx_meta_adaccounts_ad_account_id ON meta_adaccounts(ad_account_id);
CREATE INDEX idx_meta_adaccounts_business_id ON meta_adaccounts(business_id);
CREATE INDEX idx_meta_adaccounts_is_active ON meta_adaccounts(is_active);

-- =============================================
-- TABLE: selected_page_mapping
-- =============================================
-- Maps which Page and Ad Account the user selected
-- for running ads
-- =============================================

CREATE TABLE selected_page_mapping (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    meta_connection_id UUID NOT NULL REFERENCES meta_connections(id) ON DELETE CASCADE,
    
    -- Selected Page
    selected_page_id UUID NOT NULL REFERENCES meta_pages(id) ON DELETE CASCADE,
    page_id VARCHAR(255) NOT NULL, -- Denormalized for quick access
    
    -- Selected Ad Account (nullable - can be selected later)
    selected_adaccount_id UUID REFERENCES meta_adaccounts(id) ON DELETE SET NULL,
    ad_account_id VARCHAR(255), -- Denormalized
    
    -- Settings
    is_primary BOOLEAN DEFAULT true, -- Primary page for ads
    is_active BOOLEAN DEFAULT true,
    
    -- Audit Fields
    selected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT unique_user_selection UNIQUE(user_id)
);

CREATE INDEX idx_selected_page_user_id ON selected_page_mapping(user_id);
CREATE INDEX idx_selected_page_meta_connection_id ON selected_page_mapping(meta_connection_id);
CREATE INDEX idx_selected_page_selected_page_id ON selected_page_mapping(selected_page_id);
CREATE INDEX idx_selected_page_selected_adaccount_id ON selected_page_mapping(selected_adaccount_id);

-- =============================================
-- TABLE: meta_api_logs
-- =============================================
-- Logs all Meta API calls for debugging & auditing
-- =============================================

CREATE TABLE meta_api_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    meta_connection_id UUID REFERENCES meta_connections(id) ON DELETE SET NULL,
    
    -- Request Info
    endpoint VARCHAR(500) NOT NULL,
    method VARCHAR(10) NOT NULL, -- GET, POST, DELETE
    request_params JSONB,
    
    -- Response Info
    response_status INTEGER,
    response_body JSONB,
    response_time_ms INTEGER,
    
    -- Error Info
    is_error BOOLEAN DEFAULT false,
    error_code VARCHAR(50),
    error_message TEXT,
    error_type VARCHAR(100),
    
    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address INET
);

CREATE INDEX idx_meta_api_logs_user_id ON meta_api_logs(user_id);
CREATE INDEX idx_meta_api_logs_created_at ON meta_api_logs(created_at);
CREATE INDEX idx_meta_api_logs_is_error ON meta_api_logs(is_error);
CREATE INDEX idx_meta_api_logs_endpoint ON meta_api_logs(endpoint);

-- =============================================
-- TABLE: meta_webhooks
-- =============================================
-- Stores webhook events from Meta
-- =============================================

CREATE TABLE meta_webhooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Webhook Data
    event_type VARCHAR(100) NOT NULL, -- e.g., "permissions_revoked"
    object_type VARCHAR(100), -- e.g., "page", "user"
    object_id VARCHAR(255),
    
    -- Payload
    raw_payload JSONB NOT NULL,
    
    -- Processing Status
    is_processed BOOLEAN DEFAULT false,
    processed_at TIMESTAMP WITH TIME ZONE,
    processing_error TEXT,
    
    -- Audit Fields
    received_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_meta_webhooks_event_type ON meta_webhooks(event_type);
CREATE INDEX idx_meta_webhooks_object_id ON meta_webhooks(object_id);
CREATE INDEX idx_meta_webhooks_is_processed ON meta_webhooks(is_processed);
CREATE INDEX idx_meta_webhooks_received_at ON meta_webhooks(received_at);

-- =============================================
-- FUNCTIONS & TRIGGERS
-- =============================================

-- Function to update 'updated_at' timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to all tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meta_connections_updated_at BEFORE UPDATE ON meta_connections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meta_pages_updated_at BEFORE UPDATE ON meta_pages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meta_adaccounts_updated_at BEFORE UPDATE ON meta_adaccounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_selected_page_mapping_updated_at BEFORE UPDATE ON selected_page_mapping
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- VIEWS FOR EASY QUERYING
-- =============================================

-- View: Complete user Meta connection info
CREATE OR REPLACE VIEW v_user_meta_connections AS
SELECT 
    u.id AS user_id,
    u.email AS user_email,
    u.full_name AS user_name,
    mc.id AS meta_connection_id,
    mc.meta_user_id,
    mc.meta_name,
    mc.meta_email,
    mc.token_expires_at,
    mc.is_token_valid,
    mc.granted_scopes,
    mc.is_active AS connection_is_active,
    mc.connected_at,
    COUNT(DISTINCT mp.id) AS pages_count,
    COUNT(DISTINCT ma.id) AS adaccounts_count,
    spm.page_id AS selected_page_id,
    spm.ad_account_id AS selected_ad_account_id
FROM users u
LEFT JOIN meta_connections mc ON u.id = mc.user_id
LEFT JOIN meta_pages mp ON mc.id = mp.meta_connection_id AND mp.is_active = true
LEFT JOIN meta_adaccounts ma ON mc.id = ma.meta_connection_id AND ma.is_active = true
LEFT JOIN selected_page_mapping spm ON u.id = spm.user_id AND spm.is_active = true
GROUP BY 
    u.id, u.email, u.full_name,
    mc.id, mc.meta_user_id, mc.meta_name, mc.meta_email,
    mc.token_expires_at, mc.is_token_valid, mc.granted_scopes,
    mc.is_active, mc.connected_at,
    spm.page_id, spm.ad_account_id;

-- View: Pages with Instagram accounts
CREATE OR REPLACE VIEW v_pages_with_instagram AS
SELECT 
    mp.id,
    mp.meta_connection_id,
    mp.page_id,
    mp.page_name,
    mp.page_username,
    mp.instagram_business_account_id,
    mp.instagram_username,
    mp.page_likes_count,
    mp.page_followers_count,
    mc.user_id
FROM meta_pages mp
JOIN meta_connections mc ON mp.meta_connection_id = mc.id
WHERE mp.has_instagram = true
    AND mp.is_active = true
    AND mc.is_active = true;

-- =============================================
-- SAMPLE DATA FOR TESTING
-- =============================================

-- Insert test user (uncomment for testing)
-- INSERT INTO users (email, full_name, phone) VALUES
-- ('test@example.com', 'Test User', '+919876543210');

-- =============================================
-- SECURITY & ENCRYPTION NOTES
-- =============================================

-- Encryption in Application Layer (Node.js):
-- 
-- All access_token and page_access_token fields should be encrypted
-- before storing in the database using AES-256-GCM encryption.
-- 
-- Example encryption (in Node.js):
-- ```javascript
-- const crypto = require('crypto');
-- const algorithm = 'aes-256-gcm';
-- const key = Buffer.from(process.env.TOKEN_ENCRYPTION_KEY, 'hex');
-- 
-- function encrypt(text) {
--     const iv = crypto.randomBytes(16);
--     const cipher = crypto.createCipheriv(algorithm, key, iv);
--     let encrypted = cipher.update(text, 'utf8', 'hex');
--     encrypted += cipher.final('hex');
--     const authTag = cipher.getAuthTag();
--     return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
-- }
-- 
-- function decrypt(text) {
--     const parts = text.split(':');
--     const iv = Buffer.from(parts[0], 'hex');
--     const authTag = Buffer.from(parts[1], 'hex');
--     const encrypted = parts[2];
--     const decipher = crypto.createDecipheriv(algorithm, key, iv);
--     decipher.setAuthTag(authTag);
--     let decrypted = decipher.update(encrypted, 'hex', 'utf8');
--     decrypted += decipher.final('utf8');
--     return decrypted;
-- }
-- ```

-- =============================================
-- BACKUP & MAINTENANCE
-- =============================================

-- Regular backup command:
-- pg_dump -U postgres -d biz499 -t meta_connections -t meta_pages -t meta_adaccounts -t selected_page_mapping > meta_backup.sql

-- Clean old API logs (run monthly):
-- DELETE FROM meta_api_logs WHERE created_at < NOW() - INTERVAL '90 days';

-- Clean processed webhooks (run weekly):
-- DELETE FROM meta_webhooks WHERE is_processed = true AND received_at < NOW() - INTERVAL '30 days';

-- =============================================
-- USEFUL QUERIES
-- =============================================

-- Get user's active Meta connection with pages:
-- SELECT * FROM v_user_meta_connections WHERE user_email = 'user@example.com';

-- Get all pages for a user:
-- SELECT mp.* FROM meta_pages mp
-- JOIN meta_connections mc ON mp.meta_connection_id = mc.id
-- JOIN users u ON mc.user_id = u.id
-- WHERE u.email = 'user@example.com' AND mp.is_active = true;

-- Get selected page and ad account for a user:
-- SELECT 
--     u.email,
--     mp.page_name,
--     mp.page_username,
--     ma.ad_account_name,
--     ma.ad_account_id
-- FROM selected_page_mapping spm
-- JOIN users u ON spm.user_id = u.id
-- JOIN meta_pages mp ON spm.selected_page_id = mp.id
-- LEFT JOIN meta_adaccounts ma ON spm.selected_adaccount_id = ma.id
-- WHERE u.email = 'user@example.com';
