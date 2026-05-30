# Fix "Expo wants to use Facebook" → "Biz499 wants to use Facebook"

## ✅ What I Fixed in Code

Updated `app.json` with Facebook configuration:
- Added `FacebookDisplayName: "Biz499"` for iOS
- Added `facebookDisplayName: "Biz499"` for Android
- Added Facebook App ID and URL schemes

## 🔧 Final Step: Update Facebook Developer Dashboard

To change the app name from "Expo" to "Biz499" in the OAuth prompt:

### 1. Go to Facebook Developer Dashboard
Visit: https://developers.facebook.com/apps/2328965314198107/settings/basic/

### 2. Update App Display Name
- Look for **"App Name"** or **"Display Name"** field
- Change it from whatever it is to: **Biz499**
- Click **"Save Changes"**

### 3. Update App Domains (if needed)
In the same settings page:
- **App Domains:** Add `localhost` (for development)

### 4. Check OAuth Settings
Go to: Facebook Login → Settings

**Valid OAuth Redirect URIs:**
```
http://localhost:3000/auth/meta/callback
exp://192.168.29.212:8081
fb2328965314198107://authorize
biz499://
```

### 5. Restart Your App
After making these changes:
```bash
# Stop current Expo server (Ctrl+C)
# Clear cache and restart
npx expo start -c
```

## 🎯 What Will Change

**Before:**
> "Expo wants to use Facebook to sign in"

**After:**
> "Biz499 wants to use Facebook to sign in"

## ⚠️ Note

The app name change in Facebook Developer Dashboard might take a few minutes to propagate. If you still see "Expo" after changes:
1. Clear your browser cache
2. Try in incognito/private browsing mode
3. Wait 5-10 minutes for Facebook to update

## 📱 For Production Build

When you create a production build with EAS:
```bash
eas build --platform ios
eas build --platform android
```

The production app will automatically show "Biz499" because we've configured it in `app.json`.

The "Expo" name appears only because you're using Expo Go for development. In production builds, it will always show "Biz499".
