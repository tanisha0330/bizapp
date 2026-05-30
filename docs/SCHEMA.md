# Biz499 - Comprehensive Application Schema

**Last Updated:** February 16, 2026  
**Project:** Digital Marketing & Ad Management Platform  
**Tech Stack:** React Native (Expo), Node.js, PostgreSQL

---

## Table of Contents

1. [Overview](#overview)
2. [Database Schema](#database-schema)
3. [Type Definitions](#type-definitions)
4. [API Endpoints](#api-endpoints)
5. [State Management](#state-management)
6. [Entity Relationships](#entity-relationships)
7. [Data Flow](#data-flow)

---

## Overview

Biz499 is a comprehensive digital marketing platform that enables small businesses to:
- Connect their Facebook/Instagram accounts
- Create and manage advertising campaigns
- Generate AI-powered design assets
- Track leads and business growth
- Manage multiple Facebook Pages and Ad Accounts

---

## Database Schema

### Core Tables

#### 1. **users**
Main user authentication and profile table.

```sql
CREATE TABLE users (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email               VARCHAR(255) UNIQUE NOT NULL,
    phone               VARCHAR(20),
    full_name           VARCHAR(255),
    business_name       VARCHAR(255),
    business_category   VARCHAR(100),
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active           BOOLEAN DEFAULT true,
    last_login_at       TIMESTAMP WITH TIME ZONE
);
```

**Indexes:**
- `idx_users_email` on `email`
- `idx_users_phone` on `phone`

---

#### 2. **meta_connections**
Stores Facebook/Instagram OAuth connections and access tokens.

```sql
CREATE TABLE meta_connections (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id                     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Meta User Info
    meta_user_id                VARCHAR(255) NOT NULL,
    meta_username               VARCHAR(255),
    meta_email                  VARCHAR(255),
    meta_name                   VARCHAR(255),
    
    -- Access Tokens (ENCRYPTED using AES-256-GCM)
    access_token                TEXT NOT NULL,
    token_type                  VARCHAR(50) DEFAULT 'Bearer',
    token_expires_at            TIMESTAMP WITH TIME ZONE,
    
    -- Token Metadata
    granted_scopes              TEXT[],
    is_token_valid              BOOLEAN DEFAULT true,
    last_token_refresh_at       TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Audit Fields
    created_at                  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    connected_at                TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    disconnected_at             TIMESTAMP WITH TIME ZONE,
    is_active                   BOOLEAN DEFAULT true,
    
    CONSTRAINT unique_user_meta UNIQUE(user_id),
    CONSTRAINT unique_meta_user UNIQUE(meta_user_id)
);
```

**Indexes:**
- `idx_meta_connections_user_id` on `user_id`
- `idx_meta_connections_meta_user_id` on `meta_user_id`
- `idx_meta_connections_is_active` on `is_active`

---

#### 3. **meta_pages**
Facebook Pages managed by the user.

```sql
CREATE TABLE meta_pages (
    id                              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    meta_connection_id              UUID NOT NULL REFERENCES meta_connections(id) ON DELETE CASCADE,
    
    -- Page Info
    page_id                         VARCHAR(255) NOT NULL,
    page_name                       VARCHAR(255) NOT NULL,
    page_category                   VARCHAR(255),
    page_username                   VARCHAR(255),
    page_about                      TEXT,
    page_picture_url                TEXT,
    page_cover_url                  TEXT,
    page_website                    VARCHAR(500),
    page_phone                      VARCHAR(50),
    page_likes_count                INTEGER DEFAULT 0,
    page_followers_count            INTEGER DEFAULT 0,
    
    -- Access Token (ENCRYPTED)
    page_access_token               TEXT NOT NULL,
    
    -- Permissions
    tasks                           TEXT[],
    permissions                     TEXT[],
    
    -- Instagram Integration
    instagram_business_account_id   VARCHAR(255),
    instagram_username              VARCHAR(255),
    has_instagram                   BOOLEAN DEFAULT false,
    
    -- Audit Fields
    created_at                      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at                      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_synced_at                  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active                       BOOLEAN DEFAULT true,
    
    CONSTRAINT unique_page_per_connection UNIQUE(meta_connection_id, page_id)
);
```

**Indexes:**
- `idx_meta_pages_connection_id` on `meta_connection_id`
- `idx_meta_pages_page_id` on `page_id`
- `idx_meta_pages_instagram_id` on `instagram_business_account_id`

---

#### 4. **meta_adaccounts**
Facebook Ad Accounts accessible by the user.

```sql
CREATE TABLE meta_adaccounts (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    meta_connection_id      UUID NOT NULL REFERENCES meta_connections(id) ON DELETE CASCADE,
    
    -- Ad Account Info
    ad_account_id           VARCHAR(255) NOT NULL,
    ad_account_name         VARCHAR(255),
    account_status          INTEGER DEFAULT 1,
    currency                VARCHAR(10) DEFAULT 'USD',
    timezone_id             INTEGER,
    timezone_name           VARCHAR(100),
    business_name           VARCHAR(255),
    business_id             VARCHAR(255),
    
    -- Financial Info
    balance_amount          DECIMAL(15, 2) DEFAULT 0.00,
    amount_spent            DECIMAL(15, 2) DEFAULT 0.00,
    spend_cap               DECIMAL(15, 2),
    
    -- Capabilities
    capabilities            TEXT[],
    
    -- Access Level
    has_advertiser_access   BOOLEAN DEFAULT false,
    has_analyst_access      BOOLEAN DEFAULT false,
    has_admin_access        BOOLEAN DEFAULT false,
    
    -- Audit Fields
    created_at              TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_synced_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active               BOOLEAN DEFAULT true,
    
    CONSTRAINT unique_adaccount_per_connection UNIQUE(meta_connection_id, ad_account_id)
);
```

**Indexes:**
- `idx_meta_adaccounts_connection_id` on `meta_connection_id`
- `idx_meta_adaccounts_ad_account_id` on `ad_account_id`
- `idx_meta_adaccounts_business_id` on `business_id`

---

#### 5. **selected_page_mapping**
Maps user's selected Page and Ad Account for running campaigns.

```sql
CREATE TABLE selected_page_mapping (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id                 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    meta_connection_id      UUID NOT NULL REFERENCES meta_connections(id) ON DELETE CASCADE,
    
    -- Selected Page
    selected_page_id        UUID NOT NULL REFERENCES meta_pages(id) ON DELETE CASCADE,
    page_id                 VARCHAR(255) NOT NULL,
    
    -- Selected Ad Account (optional)
    selected_adaccount_id   UUID REFERENCES meta_adaccounts(id) ON DELETE SET NULL,
    ad_account_id           VARCHAR(255),
    
    -- Settings
    is_primary              BOOLEAN DEFAULT true,
    is_active               BOOLEAN DEFAULT true,
    
    -- Audit Fields
    selected_at             TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_user_selection UNIQUE(user_id)
);
```

---

#### 6. **ads** (Application-Level)
Campaign ads created by users.

```sql
CREATE TABLE ads (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Ad Details
    title               VARCHAR(255) NOT NULL,
    goal                VARCHAR(100),
    platform            VARCHAR(50) DEFAULT 'Meta',
    primary_text        TEXT,
    cta                 VARCHAR(100),
    image_uri           TEXT,
    
    -- Targeting
    location            VARCHAR(255),
    interest            VARCHAR(255),
    age_min             INTEGER DEFAULT 18,
    age_max             INTEGER DEFAULT 65,
    
    -- Budget
    daily_budget        DECIMAL(10, 2),
    duration_days       INTEGER,
    
    -- Status
    status              VARCHAR(50) DEFAULT 'Draft',
    
    -- Meta Integration
    meta_campaign_id    VARCHAR(255),
    meta_adset_id       VARCHAR(255),
    meta_ad_id          VARCHAR(255),
    
    -- Audit Fields
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

#### 7. **designs** (AI-Generated Designs)
Design assets created using AI or templates.

```sql
CREATE TABLE designs (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Design Info
    title               VARCHAR(255),
    template_id         VARCHAR(100),
    category            VARCHAR(100),
    
    -- Image Data
    image_uri           TEXT,
    thumbnail_uri       TEXT,
    
    -- AI Generation
    ai_prompt           TEXT,
    ai_model            VARCHAR(50),
    
    -- Template Fields (JSON)
    template_data       JSONB,
    
    -- Audit Fields
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

#### 8. **leads**
Lead management for business growth tracking.

```sql
CREATE TABLE leads (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Lead Info
    name                VARCHAR(255),
    email               VARCHAR(255),
    phone               VARCHAR(20),
    company             VARCHAR(255),
    
    -- Source
    source              VARCHAR(100),
    campaign_id         UUID REFERENCES ads(id) ON DELETE SET NULL,
    
    -- Status
    status              VARCHAR(50) DEFAULT 'New',
    priority            VARCHAR(20) DEFAULT 'Medium',
    
    -- Notes
    notes               TEXT,
    
    -- Audit Fields
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

### Logging & Audit Tables

#### **meta_api_logs**
Logs all Meta API calls for debugging and auditing.

```sql
CREATE TABLE meta_api_logs (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID REFERENCES users(id) ON DELETE SET NULL,
    meta_connection_id  UUID REFERENCES meta_connections(id) ON DELETE SET NULL,
    
    -- Request Info
    endpoint            VARCHAR(500) NOT NULL,
    method              VARCHAR(10) NOT NULL,
    request_params      JSONB,
    
    -- Response Info
    response_status     INTEGER,
    response_body       JSONB,
    response_time_ms    INTEGER,
    
    -- Error Info
    is_error            BOOLEAN DEFAULT false,
    error_code          VARCHAR(50),
    error_message       TEXT,
    error_type          VARCHAR(100),
    
    -- Audit Fields
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address          INET
);
```

---

#### **meta_webhooks**
Stores webhook events from Meta/Facebook.

```sql
CREATE TABLE meta_webhooks (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Webhook Data
    event_type          VARCHAR(100) NOT NULL,
    object_type         VARCHAR(100),
    object_id           VARCHAR(255),
    
    -- Payload
    raw_payload         JSONB NOT NULL,
    
    -- Processing Status
    is_processed        BOOLEAN DEFAULT false,
    processed_at        TIMESTAMP WITH TIME ZONE,
    processing_error    TEXT,
    
    -- Audit Fields
    received_at         TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

## Type Definitions

### Frontend TypeScript Interfaces

#### **User Types**

```typescript
interface User {
    id?: string;
    fullName: string;
    email: string;
    phone: string;
    businessName?: string;
    businessCategory?: string;
    facebookConnected?: boolean;
    facebookPages?: FacebookPage[];
    createdAt?: string;
    updatedAt?: string;
}
```

---

#### **Facebook/Meta Types**

```typescript
interface FacebookProfile {
    id: string;
    name: string;
    email?: string;
    picture?: {
        data: {
            url: string;
        };
    };
}

interface FacebookPage {
    id: string;
    name: string;
    category: string;
    access_token: string;
    tasks?: string[];
    picture?: {
        data: {
            url: string;
        };
    };
    instagram?: {
        id: string;
        username: string;
        profile_picture_url: string;
    } | null;
    selected?: boolean;
}

interface MetaConnection {
    id: string;
    userId: string;
    metaUserId: string;
    metaName: string;
    metaEmail?: string;
    accessToken: string; // Encrypted
    tokenExpiresAt: string;
    isTokenValid: boolean;
    grantedScopes: string[];
    isActive: boolean;
    connectedAt: string;
}

interface AdAccount {
    id: string;
    adAccountId: string;
    adAccountName: string;
    accountStatus: number;
    currency: string;
    balanceAmount: number;
    amountSpent: number;
    spendCap?: number;
    capabilities: string[];
}
```

---

#### **Ad Types**

```typescript
interface Ad {
    id: string;
    title: string;
    goal: string;
    platform: 'Meta' | 'Google';
    primaryText: string;
    cta: string;
    imageUri?: string;
    
    // Targeting
    location: string;
    interest?: string;
    ageMin: number;
    ageMax: number;
    
    // Budget
    dailyBudget: number;
    durationDays: number;
    
    // Status
    status: 'Draft' | 'Published' | 'Active' | 'Paused' | 'Completed';
    
    // Meta Integration
    metaCampaignId?: string;
    metaAdsetId?: string;
    metaAdId?: string;
    
    createdAt: string;
    updatedAt?: string;
}
```

---

#### **Design Template Types**

```typescript
interface TemplateField {
    id: string;
    type: 'text' | 'logo' | 'image' | 'phone' | 'cta' | 'tagline' | 'address' | 'website';
    label: string;
    defaultValue: string;
    placeholder: string;
    visible: boolean;
    style: {
        fontSize?: number;
        fontWeight?: 'normal' | 'bold' | '600' | '700' | '800' | '900';
        color?: string;
        textAlign?: 'left' | 'center' | 'right';
        letterSpacing?: number;
        textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
    };
    position: {
        top?: number;
        bottom?: number;
        left?: number;
        right?: number;
    };
}

interface DesignTemplate {
    id: string;
    name: string;
    category: string;
    categoryIcon: string;
    description: string;
    thumbnail: string;
    aspectRatio: '1:1' | '4:5' | '9:16' | '16:9';
    colors: {
        primary: string;
        secondary: string;
        accent: string;
        background: readonly [string, string, ...string[]];
        textPrimary: string;
        textSecondary: string;
    };
    fields: TemplateField[];
    decorations: {
        type: 'circles' | 'waves' | 'dots' | 'geometric' | 'festive' | 'minimal' | 'food';
        opacity: number;
    };
    badge?: {
        text: string;
        color: string;
        bgColor: string;
    };
    tags: string[];
}

interface Design {
    id: string;
    userId: string;
    title: string;
    templateId: string;
    category: string;
    imageUri: string;
    thumbnailUri?: string;
    aiPrompt?: string;
    aiModel?: string;
    templateData?: Record<string, any>;
    createdAt: string;
    updatedAt?: string;
}
```

---

#### **Lead Types**

```typescript
interface Lead {
    id: string;
    userId: string;
    name: string;
    email?: string;
    phone?: string;
    company?: string;
    source: string;
    campaignId?: string;
    status: 'New' | 'Contacted' | 'Qualified' | 'Converted' | 'Lost';
    priority: 'Low' | 'Medium' | 'High';
    notes?: string;
    createdAt: string;
    updatedAt?: string;
}
```

---

## API Endpoints

### Base URL
```
http://localhost:3000
```

### Authentication & OAuth

#### **GET /auth/meta/callback**
Facebook OAuth callback endpoint.

**Query Parameters:**
- `code` - Authorization code from Facebook
- `state` - State parameter for CSRF protection
- `error` - Error code (if OAuth failed)
- `error_description` - Error description

**Response:**
- Redirects to app with session ID or error

---

#### **GET /auth/session/:sessionId**
Retrieve OAuth session data.

**Parameters:**
- `sessionId` - Session ID from callback

**Response:**
```json
{
    "code": "string",
    "state": "string",
    "timestamp": 1234567890
}
```

---

### Meta API Integration

#### **POST /api/meta/exchange-token**
Exchange short-lived token for long-lived token.

**Request Body:**
```json
{
    "code": "string",
    "redirectUri": "string"
}
```

**Response:**
```json
{
    "accessToken": "string",
    "tokenType": "Bearer",
    "expiresIn": 5184000
}
```

---

#### **GET /api/meta/profile**
Get Facebook user profile.

**Headers:**
- `Authorization: Bearer {accessToken}`

**Response:**
```json
{
    "id": "string",
    "name": "string",
    "email": "string",
    "picture": {
        "data": {
            "url": "string"
        }
    }
}
```

---

#### **GET /api/meta/pages**
Get user's Facebook Pages.

**Headers:**
- `Authorization: Bearer {accessToken}`

**Response:**
```json
{
    "data": [
        {
            "id": "string",
            "name": "string",
            "category": "string",
            "access_token": "string",
            "tasks": ["ANALYZE", "ADVERTISE"],
            "picture": {
                "data": {
                    "url": "string"
                }
            }
        }
    ]
}
```

---

#### **GET /api/meta/pages/:pageId/instagram**
Get Instagram Business Account linked to Page.

**Headers:**
- `Authorization: Bearer {pageAccessToken}`

**Response:**
```json
{
    "instagram_business_account": {
        "id": "string",
        "username": "string",
        "profile_picture_url": "string"
    }
}
```

---

#### **GET /api/meta/adaccounts**
Get user's Ad Accounts.

**Headers:**
- `Authorization: Bearer {accessToken}`

**Response:**
```json
{
    "data": [
        {
            "id": "act_123456789",
            "name": "string",
            "account_status": 1,
            "currency": "USD",
            "balance": "100.50",
            "amount_spent": "250.75"
        }
    ]
}
```

---

### Ad Management

#### **POST /api/ads/create**
Create a new ad campaign.

**Request Body:**
```json
{
    "userId": "uuid",
    "title": "string",
    "goal": "string",
    "platform": "Meta",
    "primaryText": "string",
    "cta": "string",
    "imageUri": "string",
    "location": "string",
    "interest": "string",
    "ageMin": 18,
    "ageMax": 65,
    "dailyBudget": 100,
    "durationDays": 7
}
```

**Response:**
```json
{
    "id": "uuid",
    "status": "Draft",
    "createdAt": "2026-02-16T10:00:00Z"
}
```

---

#### **GET /api/ads**
Get all ads for a user.

**Query Parameters:**
- `userId` - User UUID

**Response:**
```json
{
    "ads": [
        {
            "id": "uuid",
            "title": "string",
            "status": "Draft",
            "dailyBudget": 100,
            "createdAt": "2026-02-16T10:00:00Z"
        }
    ]
}
```

---

#### **PUT /api/ads/:adId**
Update an ad campaign.

**Request Body:**
```json
{
    "title": "string",
    "status": "Published",
    "dailyBudget": 150
}
```

---

#### **DELETE /api/ads/:adId**
Delete an ad campaign.

**Response:**
```json
{
    "success": true
}
```

---

### Design Management

#### **POST /api/designs/create**
Create a new design.

**Request Body:**
```json
{
    "userId": "uuid",
    "title": "string",
    "templateId": "string",
    "category": "string",
    "imageUri": "string",
    "templateData": {}
}
```

---

#### **GET /api/designs**
Get all designs for a user.

**Query Parameters:**
- `userId` - User UUID

---

#### **POST /api/designs/ai-generate**
Generate design using AI (Google Gemini).

**Request Body:**
```json
{
    "prompt": "string",
    "template": "string"
}
```

---

## State Management

### Zustand Stores

#### **useAuthStore**
Manages user authentication state.

```typescript
interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    onboardingSeen: boolean;
    _hasHydrated: boolean;
    login: (user: User) => void;
    logout: () => void;
    setOnboardingSeen: () => void;
    updateUser: (user: Partial<User>) => void;
    setHasHydrated: (state: boolean) => void;
}
```

**Storage:** AsyncStorage (`auth-storage-v3`)

---

#### **useFacebookStore**
Manages Facebook/Meta connection state.

```typescript
interface FacebookStore {
    isConnected: boolean;
    profile: FacebookProfile | null;
    pages: FacebookPage[];
    selectedPages: string[];
    loading: boolean;
    error: string | null;
    
    setConnection: (profile: FacebookProfile, pages: FacebookPage[]) => void;
    togglePageSelection: (pageId: string) => void;
    selectAllPages: () => void;
    deselectAllPages: () => void;
    getSelectedPages: () => FacebookPage[];
    disconnect: () => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
}
```

**Storage:** Memory (not persisted)

---

#### **useAdStore**
Manages ad campaigns state.

```typescript
interface AdState {
    ads: Ad[];
    addAd: (ad: Ad) => void;
    updateAd: (id: string, ad: Partial<Ad>) => void;
    deleteAd: (id: string) => void;
}
```

**Storage:** AsyncStorage (`ad-storage`)

---

## Entity Relationships

### Database ER Diagram

```
┌─────────────┐
│   users     │
└──────┬──────┘
       │
       │ 1:1
       ├────────────────────────────────┐
       │                                │
       ▼                                ▼
┌─────────────────┐            ┌──────────────┐
│ meta_connections│            │     ads      │
└────────┬────────┘            └──────────────┘
         │
         │ 1:N
         ├─────────────┬──────────────┐
         │             │              │
         ▼             ▼              ▼
  ┌────────────┐  ┌──────────────┐  ┌──────────────────────┐
  │ meta_pages │  │meta_adaccounts│  │selected_page_mapping │
  └────────────┘  └──────────────┘  └──────────────────────┘
         │
         │ 1:1
         ▼
  ┌─────────────────┐
  │ instagram_account│
  └─────────────────┘
```

### Key Relationships

1. **User → Meta Connections** (1:1)
   - One user has one Meta connection
   - Cascade delete

2. **Meta Connection → Pages** (1:N)
   - One connection can manage multiple pages
   - Cascade delete

3. **Meta Connection → Ad Accounts** (1:N)
   - One connection has access to multiple ad accounts
   - Cascade delete

4. **User → Ads** (1:N)
   - One user creates multiple ads
   - Cascade delete

5. **User → Designs** (1:N)
   - One user creates multiple designs
   - Cascade delete

6. **User → Leads** (1:N)
   - One user has multiple leads
   - Cascade delete

7. **Ad → Leads** (1:N)
   - One ad can generate multiple leads
   - Set NULL on delete

---

## Data Flow

### 1. Facebook OAuth Flow

```
User → App → Open Facebook OAuth URL
            ↓
Facebook Login & Permissions Grant
            ↓
Facebook redirects to Backend (/auth/meta/callback)
            ↓
Backend stores code in session, redirects to App
            ↓
App retrieves session, exchanges code for token
            ↓
App stores token, fetches profile & pages
            ↓
Store in database: meta_connections, meta_pages
```

---

### 2. Ad Creation Flow

```
User fills ad form → useAdStore.addAd()
                    ↓
Store in AsyncStorage
                    ↓
API call: POST /api/ads/create
                    ↓
Store in database: ads table
                    ↓
If published: Create Meta Campaign
                    ↓
Store meta_campaign_id, meta_ad_id
```

---

### 3. Design Creation Flow

```
User selects template → TemplateEditorScreen
                       ↓
Edit fields & customize
                       ↓
Generate image using ViewShot
                       ↓
Save to Media Library & AsyncStorage
                       ↓
API call: POST /api/designs/create
                       ↓
Store in database: designs table
```

---

### 4. AI Design Generation Flow

```
User enters prompt → AIDesignCreatorScreen
                    ↓
API call: Google Gemini AI
                    ↓
Generate design concept
                    ↓
Apply to template
                    ↓
Render & save image
                    ↓
Store in designs table
```

---

## Security Considerations

### 1. **Token Encryption**
All OAuth tokens (access_token, page_access_token) are encrypted using AES-256-GCM before storing in the database.

```javascript
const crypto = require('crypto');
const algorithm = 'aes-256-gcm';
const key = Buffer.from(process.env.TOKEN_ENCRYPTION_KEY, 'hex');

function encrypt(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}
```

### 2. **Environment Variables**
```env
META_APP_ID=your_app_id
META_APP_SECRET=your_app_secret
TOKEN_ENCRYPTION_KEY=64_character_hex_key
DATABASE_URL=postgresql://user:pass@host:5432/biz499
GEMINI_API_KEY=your_gemini_key
```

### 3. **API Security**
- Use HTTPS only in production
- Implement rate limiting
- Validate all inputs
- Sanitize user data
- Use parameterized queries to prevent SQL injection

---

## Maintenance & Monitoring

### Regular Tasks

#### Clean Old Logs
```sql
-- Run monthly
DELETE FROM meta_api_logs 
WHERE created_at < NOW() - INTERVAL '90 days';
```

#### Clean Processed Webhooks
```sql
-- Run weekly
DELETE FROM meta_webhooks 
WHERE is_processed = true 
AND received_at < NOW() - INTERVAL '30 days';
```

#### Monitor Token Expiry
```sql
-- Check expiring tokens
SELECT u.email, mc.token_expires_at
FROM meta_connections mc
JOIN users u ON mc.user_id = u.id
WHERE mc.token_expires_at < NOW() + INTERVAL '7 days'
AND mc.is_active = true;
```

---

## Backup & Recovery

### Database Backup
```bash
# Full backup
pg_dump -U postgres -d biz499 > biz499_backup_$(date +%Y%m%d).sql

# Tables only
pg_dump -U postgres -d biz499 \
  -t users \
  -t meta_connections \
  -t meta_pages \
  -t meta_adaccounts \
  -t ads \
  -t designs \
  > biz499_core_backup.sql
```

### Restore
```bash
psql -U postgres -d biz499 < biz499_backup.sql
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Feb 16, 2026 | Initial schema documentation |

---

## Contact & Support

For questions about this schema, contact the development team or refer to:
- [Meta Integration Guide](./meta-integration/README.md)
- [Database Schema SQL](./meta-integration/DATABASE.sql)
- [API Documentation](./meta-integration/BACKEND_ROUTES_PART1.md)
