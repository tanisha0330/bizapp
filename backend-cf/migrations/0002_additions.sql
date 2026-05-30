-- Migration 0002: Add missing fields and tables
-- Run: wrangler d1 execute biz499-db --local --file=./migrations/0002_additions.sql

-- Add missing profile fields to users
ALTER TABLE users ADD COLUMN website TEXT;
ALTER TABLE users ADD COLUMN address TEXT;
ALTER TABLE users ADD COLUMN city TEXT;
ALTER TABLE users ADD COLUMN state TEXT;
ALTER TABLE users ADD COLUMN pincode TEXT;
ALTER TABLE users ADD COLUMN gst_number TEXT;
ALTER TABLE users ADD COLUMN logo_url TEXT;
ALTER TABLE users ADD COLUMN bio TEXT;

-- Saved Designs (sync designs across devices)
CREATE TABLE IF NOT EXISTS saved_designs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT,
    category TEXT,
    template_id TEXT,
    design_data TEXT NOT NULL,  -- JSON blob with all design state
    thumbnail_r2_key TEXT,
    is_published INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_saved_designs_user ON saved_designs(user_id);

-- Google Connections (Google Ads OAuth)
CREATE TABLE IF NOT EXISTS google_connections (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    google_user_id TEXT NOT NULL,
    google_email TEXT,
    google_name TEXT,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    token_expires_at TEXT,
    granted_scopes TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id)
);
CREATE INDEX IF NOT EXISTS idx_google_conn_user ON google_connections(user_id);

-- Google Ad Accounts
CREATE TABLE IF NOT EXISTS google_ad_accounts (
    id TEXT PRIMARY KEY,
    google_connection_id TEXT NOT NULL REFERENCES google_connections(id) ON DELETE CASCADE,
    customer_id TEXT NOT NULL,
    descriptive_name TEXT,
    currency_code TEXT DEFAULT 'INR',
    time_zone TEXT DEFAULT 'Asia/Kolkata',
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(google_connection_id, customer_id)
);
CREATE INDEX IF NOT EXISTS idx_google_ad_accounts_conn ON google_ad_accounts(google_connection_id);
