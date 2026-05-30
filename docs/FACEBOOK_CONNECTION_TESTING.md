# Facebook Page Connection - Testing Guide

## ✅ What Was Built

### Backend Server
- **Location:** `/backend/server.js`
- **Features:**
  - OAuth token exchange endpoint
  - Fetches user's Facebook pages automatically
  - Fetches Instagram accounts linked to pages
  - Connection status management
  - In-memory storage (can be replaced with database)

### Frontend Components
1. **Facebook Store** (`src/store/useFacebookStore.ts`)
   - Manages Facebook profile and pages
   - Handles page selection state
   - Select/deselect pages functionality

2. **Updated ConnectAccountsScreen** (`src/screens/auth/ConnectAccountsScreen.tsx`)
   - Facebook OAuth integration
   - Navigates to page selection after successful login

3. **New SelectFacebookPagesScreen** (`src/screens/auth/SelectFacebookPagesScreen.tsx`)
   - Displays all Facebook pages
   - Shows Instagram accounts if linked
   - Multi-select functionality
   - Beautiful UI with checkboxes

### Flow
```
User clicks "Connect Facebook"
    ↓
Opens Facebook login (OAuth)
    ↓
User logs in & grants permissions
    ↓
Backend fetches all pages & Instagram accounts
    ↓
Shows SelectFacebookPagesScreen
    ↓
User selects pages to manage
    ↓
Completes onboarding with selected pages
```

## 🚀 Current Status

### ✅ Running
- **Backend Server:** http://localhost:3000
  - Health check: http://localhost:3000/health
  - OAuth exchange: POST /auth/meta/exchange
  - Get pages: GET /meta/pages
  
- **Expo Dev Server:** exp://192.168.29.212:8081
  - Scan QR code to test on device
  - Or press 'i' for iOS simulator
  - Or press 'a' for Android

### ⚠️ Setup Required

**IMPORTANT:** To test the full OAuth flow, you need:

1. **Facebook App Secret** (Required for OAuth to work)
   - Go to https://developers.facebook.com/apps
   - Select your app (ID: 2328965314198107)
   - Go to Settings > Basic
   - Copy "App Secret"
   - Edit `/backend/.env` and add:
     ```
     META_APP_SECRET=your_app_secret_here
     ```
   - Restart backend server

2. **Facebook App Configuration**
   - In Facebook Developer Dashboard:
   - Add "Facebook Login" product
   - Set OAuth Redirect URIs:
     ```
     http://localhost:3000/auth/meta/callback
     ```

## 📱 Testing Steps

### Option 1: Test with Real Facebook OAuth

**Prerequisites:**
- Add META_APP_SECRET to `/backend/.env`
- Have a Facebook account with at least one page

**Steps:**
1. Open app in Expo Go
2. Complete onboarding (name, business setup)
3. On "Connect Your Socials" screen, click "Connect Facebook"
4. Facebook login will open in browser
5. Log in with your Facebook account
6. Grant permissions
7. You'll be navigated to page selection screen
8. Select pages you want to manage
9. Click "Continue with X pages"
10. Complete onboarding!

**Expected Result:**
- See all your Facebook pages with their profile pictures
- See Instagram accounts if linked (with @ username)
- Select/deselect pages
- Selected pages stored in auth store

### Option 2: Test UI Without OAuth

**If you don't have META_APP_SECRET:**
1. You can still see the UI flow
2. Click "Skip for now" on Connect Accounts screen
3. Complete onboarding without Facebook

## 🧪 Testing the Backend

### Health Check
```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-02-15T...",
  "activeConnections": 0
}
```

### Check Connection Status
```bash
curl "http://localhost:3000/meta/connection-status?userId=test-user"
```

## 🐛 Troubleshooting

### "OAuth will not work" warning
- **Cause:** META_APP_SECRET not set
- **Fix:** Add it to `/backend/.env` from Facebook Developer Dashboard

### Backend server not starting
- **Check:** Port 3000 is not in use
- **Fix:** `lsof -ti:3000 | xargs kill -9`

### Expo server port conflicts
- **Fix:** `lsof -ti:8081 | xargs kill -9 && npx expo start`

### "Facebook App ID not configured"
- **Check:** APP_ID in `src/config/metaConfig.ts`
- **Should be:** 2328965314198107

### OAuth returns to wrong URL
- **Check:** Redirect URIs in Facebook App Settings
- **Should include:** `http://localhost:3000/auth/meta/callback`

## 📋 API Endpoints

### POST /auth/meta/exchange
Exchange OAuth code for access token and fetch pages

**Body:**
```json
{
  "code": "oauth_code_from_facebook",
  "userId": "user-id",
  "state": "csrf-state"
}
```

**Response:**
```json
{
  "success": true,
  "profile": {
    "id": "...",
    "name": "...",
    "email": "..."
  },
  "pages": [
    {
      "id": "page-id",
      "name": "Page Name",
      "category": "Business",
      "access_token": "...",
      "picture": {...},
      "instagram": {
        "id": "ig-id",
        "username": "username"
      }
    }
  ],
  "pagesCount": 1
}
```

### GET /meta/pages?userId=XXX
Get stored pages for a user

**Response:**
```json
{
  "pages": [...],
  "profile": {...}
}
```

### GET /meta/connection-status?userId=XXX
Check if user is connected

**Response:**
```json
{
  "connected": true,
  "profile": {...},
  "pagesCount": 2,
  "connectedAt": "2026-02-15T..."
}
```

### POST /meta/disconnect
Disconnect Facebook

**Body:**
```json
{
  "userId": "user-id"
}
```

## 🎨 Features Implemented

1. **Real Facebook OAuth Flow**
   - Opens browser for authentication
   - CSRF protection with state parameter
   - Secure token exchange via backend

2. **Automatic Page Discovery**
   - Fetches all pages user manages
   - Gets page access tokens
   - Fetches Instagram accounts linked to pages

3. **Page Selection UI**
   - Beautiful card-based design
   - Checkboxes for selection
   - Select all / Deselect all
   - Shows page category
   - Shows linked Instagram handle
   - Real-time selection count

4. **Data Persistence**
   - Facebook profile stored in useFacebookStore
   - Pages stored with selection state
   - Selected pages added to user profile in useAuthStore
   - Persists across app restarts

5. **Error Handling**
   - Handles user cancellation
   - Handles OAuth errors
   - Handles network failures
   - Graceful degradation (can skip)

## 🔐 Security Notes

- OAuth state validation for CSRF protection
- App Secret kept server-side only (never in frontend)
- Access tokens stored server-side (not in app)
- In production, replace in-memory storage with database
- Add token encryption for stored tokens

## 🎯 Next Steps (Future Enhancements)

1. **Database Integration**
   - Replace in-memory Map with PostgreSQL/MongoDB
   - Store user connections permanently
   - Add token encryption

2. **Token Refresh**
   - Implement token refresh logic
   - Handle expired tokens
   - Re-authenticate flow

3. **Page Management**
   - Add/remove pages after onboarding
   - View page insights
   - Post to selected pages

4. **Instagram Integration**
   - Post to Instagram via API
   - Get Instagram insights
   - Manage Instagram content

5. **Ads Management**
   - Create ads for selected pages
   - View ad performance
   - Manage ad campaigns

## ✨ Summary

You now have a fully functional Facebook page connection system that:
- ✅ Uses real OAuth (when META_APP_SECRET is provided)
- ✅ Automatically fetches all user's pages
- ✅ Shows Instagram accounts if linked
- ✅ Allows multi-page selection
- ✅ Beautiful, intuitive UI
- ✅ Proper state management
- ✅ Error handling

To test the complete flow, just add your `META_APP_SECRET` to `/backend/.env` and restart the backend server!
