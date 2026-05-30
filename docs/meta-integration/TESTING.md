# Meta Integration Testing Checklist

## 🧪 Testing Strategy

This document provides comprehensive testing procedures for both Facebook and Instagram integrations, including manual testing steps and automated curl commands for API testing.

---

## 📋 Pre-Testing Setup

### 1. Environment Verification
- [ ] Backend server running on `http://localhost:3000`
- [ ] PostgreSQL database running and schema created
- [ ] `.env` file configured with all required variables
- [ ] Meta App in Development Mode
- [ ] Test user(s) created in Meta App Dashboard

### 2. Generate Test Data
```bash
# Generate encryption key if not done
openssl rand -hex 32

# Test database connection
psql $DATABASE_URL -c "SELECT 1"

# Verify tables exist
psql $DATABASE_URL -c "\dt"
```

---

## 🔵 Facebook Integration Testing

### Test Suite 1: OAuth Authentication Flow

#### Test 1.1: Start OAuth Flow
**Objective**: Verify auth URL generation

```bash
curl -X GET "http://localhost:3000/auth/meta/start?userId=test-user-123"
```

**Expected Response**:
```json
{
  "success": true,
  "authUrl": "https://www.facebook.com/v19.0/dialog/oauth?client_id=...",
  "state": "random_state_token"
}
```

**Checklist**:
- [ ] Returns 200 status
- [ ] `authUrl` contains correct app ID
- [ ] `state` is random 64-character hex string
- [ ] `authUrl` includes all required permissions

#### Test 1.2: Complete OAuth Flow (Manual)
**Objective**: Test end-to-end OAuth

**Steps**:
1. [ ] Copy `authUrl` from Test 1.1
2. [ ] Open URL in browser
3. [ ] Log in as test user
4. [ ] Grant all permissions
5. [ ] Verify redirect to callback URL
6. [ ] Check for success redirect to frontend

**Expected Behavior**:
- Meta login dialog appears
- All permissions are listed
- After approval → redirect to `http://localhost:3000/auth/meta/callback?code=...&state=...`
- Backend processes callback → redirects to frontend with `?success=true&meta_connection_id=...`

**Database Verification**:
```bash
# Check if connection was created
psql $DATABASE_URL -c "SELECT * FROM meta_connections WHERE user_id = 'test-user-123'"
```

**Checklist**:
- [ ] Record exists in `meta_connections`
- [ ] `access_token` is encrypted (looks like gibberish)
- [ ] `token_expires_at` is ~60 days in future
- [ ] `granted_scopes` array contains requested permissions

#### Test 1.3: Permission Denial
**Objective**: Test user declining permissions

**Steps**:
1. [ ] Start OAuth flow
2. [ ] In Meta dialog, click "Cancel" or deny permissions
3. [ ] Verify error handling

**Expected Response**:
- Redirect to frontend with `?error=access_denied&error_description=...`

**Checklist**:
- [ ] No database record created
- [ ] Error message shown to user

#### Test 1.4: Invalid State Parameter
**Objective**: Test CSRF protection

```bash
curl -X GET "http://localhost:3000/auth/meta/callback?code=test_code&state=invalid_state"
```

**Expected Response**:
```json
{
  "error": "INVALID_STATE",
  "message": "Invalid or expired state parameter"
}
```

**Checklist**:
- [ ] Returns 400 status
- [ ] Rejects invalid state
- [ ] No database changes

---

### Test Suite 2: Fetch User Profile

#### Test 2.1: Get User Profile
**Objective**: Verify profile fetching

**Pre-requisite**: Have `meta_connection_id` from Test 1.2

```bash
curl -X GET "http://localhost:3000/meta/me" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response**:
```json
{
  "success": true,
  "profile": {
    "id": "123456789",
    "name": "Test User",
    "email": "test@example.com",
    "picture": {
      "data": {
        "url": "https://..."
      }
    }
  }
}
```

**Checklist**:
- [ ] Returns 200 status
- [ ] Profile data matches Meta account
- [ ] Picture URL is valid

---

### Test Suite 3: Facebook Pages

#### Test 3.1: Fetch Pages List
**Objective**: Get user's Facebook Pages

```bash
curl -X GET "http://localhost:3000/meta/pages" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Response**:
```json
{
  "success": true,
  "pages": [
    {
      "id": "page_id_123",
      "name": "Test Business Page",
      "category": "Business",
      "access_token": "EAA...",
      "username": "testpage",
      "fan_count": 42,
      "tasks": ["ANALYZE", "ADVERTISE", "MODERATE"]
    }
  ],
  "count": 1
}
```

**Checklist**:
- [ ] Returns all pages user manages
- [ ] Each page has `access_token`
- [ ] Page data stored in `meta_pages` table
- [ ] Tokens are encrypted in database

**Database Verification**:
```bash
psql $DATABASE_URL -c "SELECT page_id, page_name, has_instagram FROM meta_pages"
```

#### Test 3.2: No Pages Found
**Objective**: Handle user with no pages

**Setup**: Use test user without any pages

**Expected Response**:
```json
{
  "success": true,
  "pages": [],
  "count": 0,
  "message": "No Facebook Pages found. Create a page to continue."
}
```

**Checklist**:
- [ ] Returns 200 (not error)
- [ ] Empty array
- [ ] Helpful message

#### Test 3.3: Select a Page
**Objective**: Save user's page selection

```bash
curl -X POST "http://localhost:3000/meta/select-page" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "pageId": "page_id_123",
    "metaPageId": "uuid-from-pages-response"
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Page selected successfully",
  "selection": {
    "page_id": "page_id_123",
    "page_name": "Test Business Page"
  }
}
```

**Checklist**:
- [ ] Record created in `selected_page_mapping`
- [ ] `is_primary` set to true
- [ ] Old selection (if any) set to inactive

**Database Verification**:
```bash
psql $DATABASE_URL -c "SELECT * FROM selected_page_mapping WHERE user_id = 'test-user-123'"
```

---

## 📷 Instagram Integration Testing

### Test Suite 4: Instagram Business Account

#### Test 4.1: Fetch Instagram Account
**Objective**: Get Instagram account linked to selected page

**Pre-requisite**: 
- Page must be selected (Test 3.3)
- Instagram Business account linked to page

```bash
curl -X GET "http://localhost:3000/meta/instagram" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Response** (If Instagram linked):
```json
{
  "success": true,
  "instagram": {
    "id": "instagram_account_id",
    "username": "testbusiness",
    "profile_picture_url": "https://...",
    "followers_count": 150,
    "follows_count": 200,
    "media_count": 25
  }
}
```

**Expected Response** (If no Instagram):
```json
{
  "success": true,
  "instagram": null,
  "message": "No Instagram Business account linked to this page"
}
```

**Checklist**:
- [ ] Returns 200 in both cases
- [ ] If linked: Instagram data populated
- [ ] `meta_pages.instagram_business_account_id` updated
- [ ] `meta_pages.has_instagram` set correctly

#### Test 4.2: Link Instagram to Page (Manual)
**Objective**: Test Instagram linking process

**Steps**:
1. [ ] Log into Facebook as test user
2. [ ] Go to test Facebook Page
3. [ ] Navigate to Settings → Instagram
4. [ ] Click "Connect Account"
5. [ ] Log into Instagram Business account
6. [ ] Grant permissions
7. [ ] Back in app, call `/meta/instagram` again
8. [ ] Verify Instagram data now appears

**Checklist**:
- [ ] Instagram successfully linked in Facebook
- [ ] API returns Instagram data after linking
- [ ] Database updated with Instagram info

---

### Test Suite 5: Ad Accounts

#### Test 5.1: Fetch Ad Accounts
**Objective**: Get user's Meta Ad Accounts

```bash
curl -X GET "http://localhost:3000/meta/adaccounts" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Response**:
```json
{
  "success": true,
  "adAccounts": [
    {
      "id": "act_123456789",
      "account_id": "123456789",
      "name": "Test Ad Account",
      "account_status": 1,
      "currency": "USD",
      "timezone_name": "America/Los_Angeles",
      "balance": "0.00",
      "capabilities": ["DIRECT_SALES", "CAN_USE_REACH_AND_FREQUENCY"]
    }
  ],
  "count": 1
}
```

**Checklist**:
- [ ] Returns all ad accounts
- [ ] Account status = 1 (ACTIVE)
- [ ] Data saved to `meta_adaccounts` table
- [ ] Multiple accounts handled correctly

**Database Verification**:
```bash
psql $DATABASE_URL -c "SELECT ad_account_id, ad_account_name, account_status FROM meta_adaccounts"
```

#### Test 5.2: No Ad Accounts
**Objective**: Handle user with no ad accounts

**Expected Response**:
```json
{
  "success": true,
  "adAccounts": [],
  "count": 0,
  "message": "No Ad Accounts found. Create one in Meta Business Manager."
}
```

**Checklist**:
- [ ] Returns 200 (not error)
- [ ] Helpful instructions provided

#### Test 5.3: Select Ad Account
**Objective**: Link ad account to selected page

```bash
curl -X POST "http://localhost:3000/meta/select-adaccount" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "adAccountId": "act_123456789",
    "metaAdAccountId": "uuid-from-adaccounts-response"
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Ad Account selected successfully",
  "selection": {
    "ad_account_id": "act_123456789",
    "ad_account_name": "Test Ad Account",
    "page_id": "page_id_123"
  }
}
```

**Checklist**:
- [ ] `selected_page_mapping.selected_adaccount_id` updated
- [ ] Ad account linked to page
- [ ] Ready to create ads

---

## 🔄 Token & Lifecycle Testing

### Test Suite 6: Token Management

#### Test 6.1: Token Expiry Check
**Objective**: Verify token expiry calculation

```bash
psql $DATABASE_URL -c "SELECT 
  user_id, 
  token_expires_at,
  (token_expires_at - NOW()) AS time_remaining,
  is_token_valid
FROM meta_connections"
```

**Checklist**:
- [ ] `token_expires_at` is future date
- [ ] Time remaining ≈ 60 days (long-lived token)
- [ ] `is_token_valid` = true

#### Test 6.2: Simulate Token Expiry
**Objective**: Test expired token handling

**Setup**:
```bash
# Manually set token as expired
psql $DATABASE_URL -c "UPDATE meta_connections 
  SET token_expires_at = NOW() - INTERVAL '1 day',
      is_token_valid = false
  WHERE user_id = 'test-user-123'"
```

**Test**: Try to fetch pages with expired token

```bash
curl -X GET "http://localhost:3000/meta/pages" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Response**:
```json
{
  "error": "TOKEN_EXPIRED",
  "message": "Your Facebook connection has expired. Please reconnect.",
  "action": "RECONNECT_REQUIRED"
}
```

**Checklist**:
- [ ] Detects expired token
- [ ] Returns appropriate error
- [ ] Frontend can handle reconnection

---

## 🔒 Security Testing

### Test Suite 7: Security Validation

#### Test 7.1: Token Encryption Verification
```bash
# View encrypted token in database
psql $DATABASE_URL -c "SELECT access_token FROM meta_connections LIMIT 1"
```

**Checklist**:
- [ ] Token is NOT plain text
- [ ] Format: `iv:authTag:encryptedData`
- [ ] Each part is hex string

#### Test 7.2: SQL Injection Prevention
```bash
curl -X GET "http://localhost:3000/meta/pages?userId='; DROP TABLE meta_pages; --" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Checklist**:
- [ ] Does NOT execute SQL
- [ ] Returns validation error or no results
- [ ] Database tables intact

#### Test 7.3: Unauthorized Access
```bash
# Try accessing endpoint without auth
curl -X GET "http://localhost:3000/meta/pages"
```

**Expected Response**:
```json
{
  "error": "UNAUTHORIZED",
  "message": "Access token is required"
}
```

**Checklist**:
- [ ] Returns 401 status
- [ ] No data leaked

---

## 📊 Complete Integration Flow Test

### End-to-End Test Scenario

**Objective**: Complete user journey from connection to ad-ready state

1. [ ] **Start**: User clicks "Connect Facebook" in app
2. [ ] **OAuth**: Complete authentication and permission grant
3. [ ] **Callback**: Verify redirect and database creation
4. [ ] **Profile**: Fetch and display user profile
5. [ ] **Pages**: List user's Facebook Pages
6. [ ] **Select Page**: User selects a page
7. [ ] **Instagram**: Fetch Instagram (if linked)
8. [ ] **Ad Accounts**: List user's ad accounts
9. [ ] **Select Ad Account**: User selects ad account
10. [ ] **Verification**: Confirm complete setup in database

**Database Final State Check**:
```bash
psql $DATABASE_URL << EOF
SELECT 
  u.email,
  mc.meta_name,
  mc.is_token_valid,
  mp.page_name,
  mp.instagram_username,
  ma.ad_account_name,
  spm.is_active AS setup_complete
FROM users u
JOIN meta_connections mc ON u.id = mc.user_id
LEFT JOIN selected_page_mapping spm ON u.id = spm.user_id
LEFT JOIN meta_pages mp ON spm.selected_page_id = mp.id
LEFT JOIN meta_adaccounts ma ON spm.selected_adaccount_id = ma.id
WHERE u.id = 'test-user-123';
EOF
```

**Expected Output**:
- All joins successful
- Page selected
- Ad account selected
- `setup_complete` = true

---

## 🐛 Error Scenarios Testing

### Test Suite 8: Error Handling

#### Test 8.1: Network Failure
```bash
# Stop Meta API (simulate by using invalid token)
curl -X GET "http://localhost:3000/meta/pages" \
  -H "Authorization: Bearer INVALID_TOKEN"
```

**Checklist**:
- [ ] Returns user-friendly error
- [ ] Logs error details
- [ ] Doesn't crash server

#### Test 8.2: Database Connection Failure
**Setup**: Stop PostgreSQL temporarily

**Checklist**:
- [ ] Catches database error
- [ ] Returns 503 Service Unavailable
- [ ] Doesn't expose connection details

#### Test 8.3: Missing Permissions
**Objective**: Test with limited permissions

**Setup**: Reconnect but deny `pages_show_list`

**Checklist**:
- [ ] Detects missing permission
- [ ] Shows permission request dialog
- [ ] Guides user to grant permission

---

## ✅ Testing Summary Checklist

### Facebook Integration
- [ ] OAuth flow complete
- [ ] Pages fetched successfully
- [ ] Page selected and saved
- [ ] All errors handled gracefully

### Instagram Integration
- [ ] Instagram account detected (if linked)
- [ ] Handles "not linked" gracefully
- [ ] Data displayed correctly

### Ad Accounts
- [ ] Ad accounts fetched
- [ ] Ad account selected
- [ ] Linked to page correctly

### Security
- [ ] Tokens encrypted
- [ ] SQL injection prevented
- [ ] Unauthorized access blocked
- [ ] CSRF protection working

### Error Handling
- [ ] Network errors handled
- [ ] Token expiry detected
- [ ] Missing permissions handled
- [ ] Empty states handled

---

## 📈 Performance Testing

```bash
# Load test (requires 'ab' - Apache Bench)
ab -n 100 -c 10 -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3000/meta/pages
```

**Target Metrics**:
- [ ] Average response time < 500ms
- [ ] No failed requests
- [ ] Handles concurrent requests

---

## 🎉 Production Readiness Checklist

Before going live:
- [ ] All tests passing
- [ ] App approved by Meta (permissions granted)
- [ ] SSL/HTTPS enabled
- [ ] Environment variables secured
- [ ] Database backups configured
- [ ] Error monitoring enabled (e.g., Sentry)
- [ ] Rate limiting implemented
- [ ] API logging enabled
- [ ] Privacy policy published
- [ ] Terms of service published

---

**Testing complete?** Ready to deploy! 🚀
