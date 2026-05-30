# Facebook OAuth Setup Guide - Quick Start

## ⚠️ IMPORTANT: Current Status

Your app now has **REAL Facebook OAuth** implemented, but you need to complete the setup to make it work.

## What Changed

✅ **BEFORE** (Mock Implementation):
- Clicked "Connect Facebook" → fake 1.5 second delay → marked as connected
- No actual authentication
- No real Facebook login

✅ **NOW** (Real OAuth Implementation):
- Clicks "Connect Facebook" → Opens Facebook login in browser
- User enters Facebook email/password
- User grants permissions
- Returns to app with real connection

## 🚀 Setup Steps (15 minutes)

### Step 1: Create Facebook App (5 minutes

)

1. **Go to** [Meta for Developers](https://developers.facebook.com/)
2. **Click** "Create App" (top right)
3. **Select** "Business" as app type
4. **Enter**:
   - App Name: `Biz499` (or your name)
   - Contact Email: your email
5. **Click** "Create App"
6. **Copy** your **App ID** (we'll use it in Step 3)

### Step 2: Add Facebook Login (3 minutes)

1. In your app dashboard, **click** "Add Product"
2. Find **"Facebook Login"** → Click "Set Up"
3. Select **"Web"** (yes, even for React Native)
4. Skip the quickstart

### Step 3: Configure Your App (5 minutes)

1. **Open** `src/config/metaConfig.ts` in your project
2. **Replace** this line:
   ```typescript
   APP_ID: 'YOUR_FACEBOOK_APP_ID_HERE',
   ```
   With your actual App ID:
   ```typescript
   APP_ID: '1234567890123456',  // ← Your App ID from Step 1
   ```

3. **Save the file**

### Step 4: Configure Backend URL (2 minutes)

In `src/config/metaConfig.ts`, update the API_URL:

```typescript
// If you have a backend running:
API_URL: __DEV__
    ? 'http://YOUR_COMPUTER_IP:3000'  // e.g., 'http://192.168.1.100:3000'
    : 'https://your-production-api.com',

// If you DON'T have a backend yet (testing only):
API_URL: __DEV__
    ? 'http://localhost:3000'
    : 'https://your-production-api.com',
```

**⚠️ Important**: For mobile testing, you CANNOT use `localhost`. Use your computer's IP address (find it in your network settings).

### Step 5: Test It! (2 minutes)

1. **Reload** your app (shake device → Reload)
2. **Navigate** to "Connect Accounts" screen
3. **Click** "Connect Facebook"
4. **You should see**:
   - Facebook login page opens in browser
   - Login with your Facebook account
   - Grant permissions
   - Redirect back to app

## 🧪 Testing Without Backend

If you don't have the backend set up yet, here's what will happen:

1. ✅ Facebook OAuth will open
2. ✅ User can log in
3. ✅ Permissions granted
4. ❌ **Error**: "Failed to connect" (because there's no backend to exchange the token)

This is **expected behavior**! The OAuth part is working, you just need the backend.

## 🐛 Troubleshooting

### Issue: "Facebook App ID not configured"
**Solution**: Update `src/config/metaConfig.ts` with your App ID from Step 1

### Issue: "OAuth dialog doesn't open"
**Solution**: 
1. Check that `expo-web-browser` is installed: `npm install expo-web-browser`
2. Reload the app after install

### Issue: "Failed to connect" after logging in
**Solution**: This is normal if you don't have Backend set up yet. The OAuth part worked! You just need to:
1. Set up the backend (see `docs/meta-integration/README.md`)
2. Or for now, you can skip this screen

### Issue: "Redirect URI mismatch"
**Solution**: 
1. Go to Meta Developer Dashboard
2. Settings → Basic
3. Add your redirect URI: `YOUR_BACKEND_URL/auth/meta/callback`

## 📋 What's Next?

### Option A: Full Implementation (Recommended)
Set up the complete backend integration:
1. Follow `docs/meta-integration/README.md`
2. Set up database
3. Deploy backend
4. Configure OAuth redirect URIs
5. Test end-to-end flow

### Option B: Skip for Now
If you want to test the app without Facebook:
1. Click "Skip for now" on Connect Accounts screen
2. You can set up Facebook integration later

## 📱 User Flow (After Setup)

1. User clicks "Connect Facebook"
2. Browser opens with Facebook login
3. User enters email/password  ← **THIS IS THE REAL LOGIN**
4. Facebook shows permission dialog
5. User clicks "Continue"
6. Redirects to your backend
7. Backend exchanges code for token
8. Redirects back to app
9. ✅ Connected!

## 🔒 Security Notes

- ✅ Real OAuth 2.0 flow
- ✅ CSRF protection (state parameter)
- ✅ Tokens never stored in app (sent to backend only)
- ✅ User must enter real Facebook credentials

## 🆘 Need Help?

Check the full documentation:
- Architecture: `docs/meta-integration/ARCHITECTURE.md`
- Backend Setup: `docs/meta-integration/README.md`
- Testing: `docs/meta-integration/TESTING.md`

---

**Ready to test?** Update your App ID in `metaConfig.ts` and reload the app!
