-- Digital Business Cards (shareable via link)
CREATE TABLE IF NOT EXISTS digital_cards (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    slug TEXT UNIQUE NOT NULL,
    card_data TEXT NOT NULL,
    template_id TEXT NOT NULL,
    logo_r2_key TEXT,
    photo_r2_key TEXT,
    image_r2_key TEXT,
    views INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_cards_user ON digital_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_cards_slug ON digital_cards(slug);

-- Website Requests (team-assisted flow)
CREATE TABLE IF NOT EXISTS website_requests (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    business_name TEXT NOT NULL,
    business_category TEXT,
    phone TEXT,
    email TEXT,
    website_type TEXT DEFAULT 'business',
    pages_needed TEXT,
    description TEXT,
    logo_r2_key TEXT,
    reference_urls TEXT,
    status TEXT DEFAULT 'pending',
    assigned_to TEXT,
    team_notes TEXT,
    quoted_price REAL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_website_req_user ON website_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_website_req_status ON website_requests(status);
