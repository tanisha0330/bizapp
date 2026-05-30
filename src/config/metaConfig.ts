/**
 * Configuration for Facebook/Meta Integration
 * 
 * SETUP INSTRUCTIONS:
 * 1. Go to https://developers.facebook.com/
 * 2. Create a new app or use existing one
 * 3. Add "Facebook Login" product
 * 4. Copy your App ID from Settings > Basic
 * 5. Replace the values below
 */

export const META_CONFIG = {
    // ⚠️ REQUIRED: Get this from Meta Developer Dashboard > Settings > Basic
    APP_ID: '1065859666601001',

    // Your app name (for display purposes)
    APP_NAME: 'Biz499',

    // Backend API URL — change to 'https://api.biz499.com' once custom domain is live
    API_URL: 'https://biz499-api.amitkumarsingh474.workers.dev',

    // Graph API version
    GRAPH_API_VERSION: 'v19.0',

    // Required permissions for your app
    PERMISSIONS: [
        'public_profile',
        'pages_show_list',
        'pages_read_engagement',
        'pages_manage_ads',
        'ads_management',
        'ads_read',
        'business_management',
        'leads_retrieval',
    ],
};

/**
 * Validate configuration
 */
export function validateConfig(): boolean {
    if (META_CONFIG.APP_ID === 'YOUR_FACEBOOK_APP_ID_HERE') {
        console.log(
            '📘 Facebook OAuth not configured (optional)\n' +
            'To enable Facebook login:\n' +
            '1. Get App ID from https://developers.facebook.com/apps\n' +
            '2. Update META_CONFIG.APP_ID in src/config/metaConfig.ts\n' +
            'OR click "Skip for now" to continue without Facebook'
        );
        return false;
    }

    if (!META_CONFIG.API_URL) {
        console.warn('⚠️ API_URL is not configured');
        return false;
    }

    return true;
}
