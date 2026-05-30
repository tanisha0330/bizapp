-- Biz499 D1 Schema (SQLite-compatible)
-- Run: wrangler d1 execute biz499-db --local --file=./migrations/0001_initial.sql

-- Users
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    phone TEXT UNIQUE NOT NULL,
    email TEXT,
    full_name TEXT,
    business_name TEXT,
    business_category TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    is_active INTEGER DEFAULT 1,
    last_login_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);

-- Organizations
CREATE TABLE IF NOT EXISTS organizations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    owner_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_orgs_owner ON organizations(owner_user_id);

-- Org Members
CREATE TABLE IF NOT EXISTS org_members (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'admin',
    joined_at TEXT DEFAULT (datetime('now')),
    UNIQUE(org_id, user_id)
);

-- Ad Accounts (platform-level)
CREATE TABLE IF NOT EXISTS ad_accounts (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    platform TEXT NOT NULL DEFAULT 'meta',
    platform_account_id TEXT,
    currency TEXT DEFAULT 'INR',
    timezone TEXT DEFAULT 'Asia/Kolkata',
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ad_accounts_org ON ad_accounts(org_id);

-- Meta Connections (Facebook OAuth)
CREATE TABLE IF NOT EXISTS meta_connections (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    meta_user_id TEXT NOT NULL,
    meta_name TEXT,
    meta_email TEXT,
    access_token TEXT NOT NULL,
    token_expires_at TEXT,
    granted_scopes TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id)
);
CREATE INDEX IF NOT EXISTS idx_meta_conn_user ON meta_connections(user_id);

-- Meta Pages
CREATE TABLE IF NOT EXISTS meta_pages (
    id TEXT PRIMARY KEY,
    meta_connection_id TEXT NOT NULL REFERENCES meta_connections(id) ON DELETE CASCADE,
    page_id TEXT NOT NULL,
    page_name TEXT NOT NULL,
    page_category TEXT,
    page_access_token TEXT NOT NULL,
    page_picture_url TEXT,
    instagram_business_account_id TEXT,
    instagram_username TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(meta_connection_id, page_id)
);
CREATE INDEX IF NOT EXISTS idx_meta_pages_conn ON meta_pages(meta_connection_id);

-- Meta Ad Accounts
CREATE TABLE IF NOT EXISTS meta_ad_accounts (
    id TEXT PRIMARY KEY,
    meta_connection_id TEXT NOT NULL REFERENCES meta_connections(id) ON DELETE CASCADE,
    ad_account_id TEXT NOT NULL,
    ad_account_name TEXT,
    account_status INTEGER DEFAULT 1,
    currency TEXT DEFAULT 'INR',
    business_name TEXT,
    business_id TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(meta_connection_id, ad_account_id)
);

-- Creatives (stored in R2)
CREATE TABLE IF NOT EXISTS creatives (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    org_id TEXT REFERENCES organizations(id) ON DELETE SET NULL,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER NOT NULL DEFAULT 0,
    r2_key TEXT NOT NULL,
    thumbnail_r2_key TEXT,
    width INTEGER,
    height INTEGER,
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_creatives_user ON creatives(user_id);

-- Campaigns
CREATE TABLE IF NOT EXISTS campaigns (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ad_account_id TEXT NOT NULL REFERENCES ad_accounts(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    objective TEXT NOT NULL DEFAULT 'OUTCOME_AWARENESS',
    status TEXT NOT NULL DEFAULT 'draft',
    daily_budget REAL NOT NULL DEFAULT 0,
    total_budget REAL,
    start_date TEXT NOT NULL,
    end_date TEXT,
    targeting TEXT DEFAULT '{}',
    creative_id TEXT REFERENCES creatives(id) ON DELETE SET NULL,
    primary_text TEXT,
    headline TEXT,
    cta TEXT DEFAULT 'LEARN_MORE',
    destination_url TEXT,
    meta_campaign_id TEXT,
    meta_adset_id TEXT,
    meta_ad_id TEXT,
    page_id TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_campaigns_user ON campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_ad_account ON campaigns(ad_account_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);

-- Campaign Analytics (daily snapshots)
CREATE TABLE IF NOT EXISTS campaign_analytics (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    spend REAL DEFAULT 0,
    conversions INTEGER DEFAULT 0,
    reach INTEGER DEFAULT 0,
    cpc REAL DEFAULT 0,
    cpm REAL DEFAULT 0,
    ctr REAL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(campaign_id, date)
);
CREATE INDEX IF NOT EXISTS idx_analytics_campaign ON campaign_analytics(campaign_id);
CREATE INDEX IF NOT EXISTS idx_analytics_date ON campaign_analytics(date);

-- Leads
CREATE TABLE IF NOT EXISTS leads (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    campaign_id TEXT REFERENCES campaigns(id) ON DELETE SET NULL,
    name TEXT,
    email TEXT,
    phone TEXT,
    company TEXT,
    source TEXT,
    status TEXT DEFAULT 'new',
    priority TEXT DEFAULT 'medium',
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_leads_user ON leads(user_id);

-- API Logs
CREATE TABLE IF NOT EXISTS api_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL,
    request_params TEXT,
    response_status INTEGER,
    response_time_ms INTEGER,
    is_error INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_api_logs_user ON api_logs(user_id);
