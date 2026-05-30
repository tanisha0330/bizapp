# Meta Developer Dashboard Setup Guide

## Step 1: Create Meta Developer Account

1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Click **"Get Started"** in the top right
3. Log in with your Facebook account
4. Complete the developer account registration
5. Verify your email address

## Step 2: Create a New App

1. Navigate to [Meta App Dashboard](https://developers.facebook.com/apps)
2. Click **"Create App"**
3. Select **"Business"** as app type (for running ads)
4. Fill in app details:
   - **App Name**: `Biz499` (or your app name)
   - **App Contact Email**: your-email@example.com
   - **Business Portfolio**: Create new or select existing
5. Click **"Create App"**
6. Note down your **App ID** - you'll need this

## Step 3: Add Facebook Login Product

1. In your app dashboard, go to **"Add Products"**
2. Find **"Facebook Login"** and click **"Set Up"**
3. Select **"Web"** as the platform (even for React Native - we'll use web OAuth flow)
4. Skip the quickstart or follow it for context

### Configure Facebook Login Settings

1. Go to **Facebook Login → Settings** in left sidebar
2. Under **"Valid OAuth Redirect URIs"**, add:
   ```
   https://your-backend-domain.com/auth/meta/callback
   http://localhost:3000/auth/meta/callback (for local testing)
   ```
3. **Client OAuth Login**: ✅ Yes
4. **Web OAuth Login**: ✅ Yes
5. **Force Web OAuth Reauthentication**: ❌ No
6. **Login with the JavaScript SDK**: ❌ No
7. **Use Strict Mode for Redirect URIs**: ✅ Yes
8. Click **"Save Changes"**

## Step 4: Configure App Settings

### Basic Settings

1. Go to **Settings → Basic** in left sidebar
2. Note down your **App Secret** (click "Show" and copy)
   - ⚠️ **NEVER commit this to git or expose it in client code**
3. Add **App Domains**:
   ```
   your-backend-domain.com
   localhost (for testing)
   ```
4. **Privacy Policy URL**: Add your privacy policy URL
5. **Terms of Service URL**: Add your TOS URL
6. **App Icon**: Upload a 1024x1024 icon
7. Click **"Save Changes"**

### Advanced Settings

1. Go to **Settings → Advanced**
2. **Security Settings**:
   - ✅ **Require App Secret**: Yes
   - ✅ **App Secret Proof for Server API calls**: Yes
3. **iOS/Android Platform Settings** (for production):
   - Add your iOS Bundle ID
   - Add your Android Package Name
   - Add Android Key Hashes
4. Click **"Save Changes"**

## Step 5: Add Required Permissions

Go to **App Review → Permissions and Features**

### Standard Access (Available Immediately)

These are pre-approved:
- ✅ `email`
- ✅ `public_profile`

### Advanced Access (Requires Review)

Request these permissions:

1. **pages_show_list**
   - Purpose: "Allow users to see their Facebook Pages"
   - Click "Get Advanced Access"

2. **pages_read_engagement**
   - Purpose: "Read Page engagement data for ad targeting"

3. **ads_management**
   - Purpose: "Create and manage ads on behalf of user"

4. **business_management**
   - Purpose: "Access Business Manager data"

5. **instagram_basic**
   - Purpose: "Access linked Instagram Business account"

6. **instagram_manage_insights** (Optional)
   - Purpose: "Read Instagram insights for ad optimization"

7. **pages_manage_ads**
   - Purpose: "Run ads on Facebook Pages"

### How to Request Advanced Access

1. Click **"Get Advanced Access"** on each permission
2. Fill out the use case form:
   - Explain: "Our app helps small businesses create and manage Facebook/Instagram ads"
   - Provide screenshots of your app
   - Create a screencast showing the user flow
3. Submit for review
4. Wait 1-5 business days for approval

⚠️ **Development Mode**: You can test with `Standard Access` permissions using Test Users

## Step 6: Set Up Test Users

While waiting for Advanced Access approval, use Test Users:

1. Go to **Roles → Test Users**
2. Click **"Add Test Users"**
3. Create 2-3 test users
4. For each test user:
   - Click **"Edit"** → **"Log in as this test user"**
   - Create a Facebook Page for this test user
   - Link an Instagram Business account (if testing IG)
   - Create a test Ad Account

### Create Test Ad Account

1. Log in as test user
2. Go to [Meta Business Suite](https://business.facebook.com/)
3. Click **"Create Ad Account"**
4. Fill in details:
   - **Time Zone**: Your timezone
   - **Currency**: Your currency
   - **Account Name**: "Test Ad Account"

## Step 7: Configure Business Integration

1. Go to **Business Settings** at [business.facebook.com](https://business.facebook.com/)
2. Under **"Users" → "System Users"**, create a system user (for server-to-server calls)
3. Generate a System User Access Token (for advanced use cases)

## Step 8: Set Up Webhooks (Optional - for production)

1. In Meta App Dashboard, go to **"Webhooks"**
2. Click **"Create Subscription"**
3. Add your webhook endpoint:
   ```
   https://your-backend-domain.com/webhooks/meta
   ```
4. Set **Verify Token**: `your-random-secret-token`
5. Subscribe to events:
   - `permissions` - When user revokes permissions
   - `page` - Page updates
   - `feed` - Post updates

## Step 9: Environment Variables Setup

Create a `.env` file in your backend:

```bash
# Meta App Credentials
META_APP_ID=your_app_id_here
META_APP_SECRET=your_app_secret_here

# OAuth Configuration
META_REDIRECT_URI=https://your-backend-domain.com/auth/meta/callback
META_REDIRECT_URI_DEV=http://localhost:3000/auth/meta/callback

# Graph API Version
META_GRAPH_API_VERSION=v19.0

# Encryption Key (generate with: openssl rand -hex 32)
TOKEN_ENCRYPTION_KEY=your_32_byte_hex_key_here

# Frontend URL (for redirects after auth)
FRONTEND_URL=exp://your-expo-app-url
FRONTEND_URL_WEB=https://your-web-app-url

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/biz499

# JWT Secret (for session management)
JWT_SECRET=your_jwt_secret_here
```

## Step 10: Testing in Development Mode

### Development Mode Limitations

- ⚠️ Only works for:
  - App Admins
  - App Developers
  - App Testers
  - Test Users
- Real users CANNOT use your app until it's in **Live Mode**

### Add Your Account as Developer

1. Go to **Roles → Roles**
2. Click **"Add Developers"**
3. Enter your Facebook profile name or user ID
4. Assign role: **Developer** or **Administrator**

### Testing OAuth Flow

1. Start your backend server
2. Open your app
3. Click "Connect Facebook"
4. You should see Meta login dialog
5. Grant permissions
6. Should redirect back to your app with success

## Step 11: Submit for App Review (Before Production)

When ready for real users:

1. Go to **App Review → Requests**
2. Click **"Add Items"**
3. Select all permissions you need
4. For each permission:
   - Upload demo video (screencast)
   - Explain use case in detail
   - Provide step-by-step instructions
   - Add privacy policy link
5. Submit review
6. Wait 1-7 days for Meta review
7. Address any feedback from Meta

### App Review Checklist

- ✅ All permissions have detailed use case
- ✅ Privacy policy is comprehensive
- ✅ Terms of service are clear
- ✅ Demo video shows complete user flow
- ✅ App follows Meta Platform Policies
- ✅ Data usage is clearly explained
- ✅ User data deletion is supported

## Step 12: Switch to Live Mode

Once approved:

1. Go to **Settings → Basic**
2. At the top, toggle **"App Mode"** from **Development** to **Live**
3. Confirm the switch
4. Your app is now public! 🎉

## Troubleshooting Common Issues

### Issue: "Invalid OAuth redirect URI"

**Solution**: Ensure exact match in Facebook Login Settings
- Check for trailing slashes
- Verify HTTP vs HTTPS
- Check domain spelling

### Issue: "This authorization code has been used"

**Solution**: Code can only be used once
- Don't refresh the callback page
- Implement proper one-time use handling

### Issue: "Error validating access token"

**Solution**: Token may be expired
- Implement token refresh logic
- Check token expiry before API calls
- Exchange for long-lived token immediately

### Issue: "Permissions error" in development

**Solution**: Add yourself as app tester/developer
- Go to Roles → Roles
- Add your account

### Issue: "Cannot load M.facebook.com"

**Solution**: OAuth dialog blocked
- Check for popup blockers
- Use `_blank` target in web opens
- Ensure HTTPS in production

## Helpful Resources

- [Meta for Developers](https://developers.facebook.com/)
- [Graph API Reference](https://developers.facebook.com/docs/graph-api)
- [Facebook Login Documentation](https://developers.facebook.com/docs/facebook-login)
- [Permissions Reference](https://developers.facebook.com/docs/permissions/reference)
- [Business Manager Setup](https://business.facebook.com/)
- [App Review Guidelines](https://developers.facebook.com/docs/app-review)

## Next Steps

After completing this setup:

1. ✅ Note down `META_APP_ID` and `META_APP_SECRET`
2. ✅ Configure `.env` in backend
3. ✅ Set up database schema (see DATABASE.md)
4. ✅ Implement backend endpoints (see backend code)
5. ✅ Implement React Native screens
6. ✅ Test with test users
7. ✅ Submit for app review
8. ✅ Launch to production
