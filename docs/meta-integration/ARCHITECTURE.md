# Meta (Facebook + Instagram) Integration Architecture

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        React Native App (Expo)                       │
│                                                                       │
│  ┌────────────────┐  ┌─────────────────┐  ┌──────────────────┐    │
│  │ ConnectMeta    │  │ SelectPage      │  │ SelectAdAccount  │    │
│  │ Screen         │─▶│ Screen          │─▶│ Screen           │    │
│  └────────────────┘  └─────────────────┘  └──────────────────┘    │
│           │                    │                     │              │
│           │                    │                     │              │
└───────────┼────────────────────┼─────────────────────┼──────────────┘
            │                    │                     │
            │ HTTPS              │ HTTPS               │ HTTPS
            ▼                    ▼                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Node.js Backend (Express)                       │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                     Auth & API Routes                         │  │
│  │                                                                │  │
│  │  GET  /auth/meta/start                                        │  │
│  │  GET  /auth/meta/callback                                     │  │
│  │  GET  /meta/me                                                │  │
│  │  GET  /meta/pages                                             │  │
│  │  POST /meta/select-page                                       │  │
│  │  GET  /meta/instagram                                         │  │
│  │  GET  /meta/adaccounts                                        │  │
│  │  POST /meta/select-adaccount                                  │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                             │                                        │
│                             │                                        │
│  ┌──────────────────────────▼──────────────────────────────────┐  │
│  │              Token Exchange & Storage Service                │  │
│  │                                                                │  │
│  │  • Short-lived → Long-lived token exchange                   │  │
│  │  • Token encryption at rest (AES-256)                        │  │
│  │  • Token refresh logic (60-day expiry)                       │  │
│  │  • Secure storage in PostgreSQL                              │  │
│  └────────────────────────────┬──────────────────────────────────┘  │
│                                │                                     │
└────────────────────────────────┼─────────────────────────────────────┘
                                 │
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  PostgreSQL DB  │    │   Meta Graph API │    │  Facebook Login │
│                 │    │                  │    │      OAuth      │
│  • users        │    │  /me             │    │                 │
│  • meta_        │    │  /me/accounts    │    │  Permissions:   │
│    connections  │    │  /{page-id}      │    │  • pages_       │
│  • meta_pages   │    │  /me/adaccounts  │    │    show_list    │
│  • meta_        │    │  /debug_token    │    │  • ads_         │
│    adaccounts   │    │                  │    │    management   │
│  • selected_    │    │                  │    │  • instagram_   │
│    page_mapping │    │                  │    │    basic        │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Authentication Flow

```
┌──────┐                                      ┌──────────┐
│ User │                                      │  Backend │
└───┬──┘                                      └────┬─────┘
    │                                              │
    │ 1. Click "Connect Facebook"                 │
    ├─────────────────────────────────────────────▶
    │                                              │
    │ 2. Returns Meta OAuth URL                   │
    │◀─────────────────────────────────────────────┤
    │                                              │
    │ 3. Opens browser with OAuth URL             │
    ├──────────────┐                              │
    │              │                              │
┌───▼──────────────▼────┐                        │
│  Meta Login Dialog    │                        │
│  • User authenticates │                        │
│  • Grants permissions │                        │
└───────────┬───────────┘                        │
            │                                     │
            │ 4. Redirect with code              │
            ├────────────────────────────────────▶
            │                                     │
            │                                     │ 5. Exchange code
            │                                     │    for short-lived token
            │                                     ├──────────────┐
            │                                     │              │
            │                                     │ 6. Exchange  │
            │                                     │    for long- │
            │                                     │    lived     │
            │                                     │    token     │
            │                                     │◀─────────────┘
            │                                     │
            │                                     │ 7. Fetch user profile
            │                                     │    /me?fields=...
            │                                     ├──────────────┐
            │                                     │              │
            │                                     │◀─────────────┘
            │                                     │
            │                                     │ 8. Save encrypted
            │                                     │    token + profile
            │                                     │    to DB
            │                                     ├──────────────┐
            │                                     │              │
            │ 9. Success + user_id               │◀─────────────┘
            │◀────────────────────────────────────┤
            │                                     │
```

## Data Flow for Page & Ad Account Selection

```
1. User Profile → 2. Fetch Pages → 3. Select Page → 4. Fetch IG → 5. Fetch Ad Accounts → 6. Select Ad Account

┌────────────┐     ┌──────────┐     ┌────────────┐     ┌──────────┐     ┌──────────────┐     ┌──────────┐
│  /meta/me  │────▶│ /meta/   │────▶│ POST /meta/│────▶│ /meta/   │────▶│  /meta/ad    │────▶│ POST /   │
│            │     │  pages   │     │  select-   │     │instagram │     │  accounts    │     │  meta/   │
│  Returns:  │     │          │     │  page      │     │          │     │              │     │  select- │
│  • FB User │     │ Returns: │     │            │     │ Returns: │     │  Returns:    │     │  ad      │
│    ID      │     │ • Page   │     │ Saves:     │     │ • IG     │     │  • Ad        │     │  account │
│  • Name    │     │   list   │     │ • Selected │     │   User   │     │    Account   │     │          │
│  • Email   │     │ • Page   │     │   page_id  │     │   ID     │     │    list      │     │ Saves:   │
│            │     │   Access │     │ • Mapping  │     │ • IG     │     │  • Access    │     │ • Ad     │
│            │     │   Tokens │     │            │     │   Handle │     │    Token     │     │   Acct   │
└────────────┘     └──────────┘     └────────────┘     └──────────┘     └──────────────┘     │   ID     │
                                                                                                └──────────┘
```

## Security Layers

1. **Client Side (React Native)**
   - No sensitive tokens stored
   - Communicates only with backend API
   - Uses secure HTTPS
   - Session management via JWT

2. **Backend**
   - Environment variables for App ID/Secret
   - Token encryption at rest (AES-256-GCM)
   - Secure token exchange
   - Input validation & sanitization
   - Rate limiting on auth endpoints

3. **Database**
   - Encrypted connection (SSL)
   - Encrypted token storage
   - Foreign key constraints
   - Audit logs for token access

## Tech Stack

- **Frontend**: React Native (Expo) + TypeScript
- **Backend**: Node.js + Express.js
- **Database**: PostgreSQL (or Supabase)
- **Auth**: Facebook Login OAuth 2.0
- **API**: Meta Graph API v19.0+
- **Security**: crypto (AES-256-GCM), bcrypt, helmet
- **Environment**: dotenv

## Key Permissions Required

- `pages_show_list` - List user's Facebook Pages
- `pages_read_engagement` - Read Page engagement data
- `pages_manage_posts` - Post on behalf of Page
- `pages_manage_ads` - Manage ads for Page
- `ads_management` - Access to Ads Manager
- `business_management` - Access to Business Manager
- `instagram_basic` - Access to Instagram Business account
- `instagram_manage_insights` - Read Instagram insights

## Error Handling Strategy

1. **Permission Denied** → Show modal explaining required permissions
2. **No Pages Found** → Guide user to create/get access to a Page
3. **No IG Account** → Optional - can skip, show instructions to link
4. **No Ad Accounts** → Guide to create Ad Account in Business Manager
5. **Token Expired** → Auto-refresh or prompt re-authentication
6. **API Rate Limit** → Exponential backoff with user feedback
7. **Network Errors** → Retry logic with clear error messages

## Token Lifecycle Management

| Token Type | Validity | Refresh Strategy |
|------------|----------|------------------|
| Short-lived User Token | ~2 hours | Exchange for long-lived immediately |
| Long-lived User Token | ~60 days | Auto-refresh 7 days before expiry |
| Page Access Token | Never expires (if permissions maintained) | Store securely, validate before each use |
| Ad Account Token | Tied to user token | Refresh when user token refreshes |
