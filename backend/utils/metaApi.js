const axios = require('axios');

// Meta Graph API configuration
const GRAPH_API_VERSION = process.env.META_GRAPH_API_VERSION || 'v19.0';
const GRAPH_API_BASE_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

/**
 * Make a GET request to Meta Graph API
 * @param {string} endpoint - API endpoint (e.g., '/me' or '/me/accounts')
 * @param {string} accessToken - Meta access token
 * @param {object} params - Query parameters
 * @returns {Promise<object>} - API response data
 */
async function graphGet(endpoint, accessToken, params = {}) {
    try {
        const url = `${GRAPH_API_BASE_URL}${endpoint}`;
        const response = await axios.get(url, {
            params: {
                access_token: accessToken,
                ...params,
            },
            timeout: 30000, // 30 second timeout
        });
        return response.data;
    } catch (error) {
        throw handleGraphAPIError(error);
    }
}

/**
 * Make a POST request to Meta Graph API
 * @param {string} endpoint - API endpoint
 * @param {string} accessToken - Meta access token
 * @param {object} data - Request body data
 * @returns {Promise<object>} - API response data
 */
async function graphPost(endpoint, accessToken, data = {}) {
    try {
        const url = `${GRAPH_API_BASE_URL}${endpoint}`;
        const response = await axios.post(url, null, {
            params: {
                access_token: accessToken,
                ...data,
            },
            timeout: 30000,
        });
        return response.data;
    } catch (error) {
        throw handleGraphAPIError(error);
    }
}

/**
 * Exchange short-lived token for long-lived token
 * @param {string} shortLivedToken - Short-lived access token from OAuth
 * @returns {Promise<object>} - { access_token, token_type, expires_in }
 */
async function exchangeForLongLivedToken(shortLivedToken) {
    try {
        const url = `${GRAPH_API_BASE_URL}/oauth/access_token`;
        const response = await axios.get(url, {
            params: {
                grant_type: 'fb_exchange_token',
                client_id: process.env.META_APP_ID,
                client_secret: process.env.META_APP_SECRET,
                fb_exchange_token: shortLivedToken,
            },
        });
        return response.data;
    } catch (error) {
        throw handleGraphAPIError(error);
    }
}

/**
 * Get user profile information
 * @param {string} accessToken - Meta access token
 * @returns {Promise<object>} - User profile data
 */
async function getUserProfile(accessToken) {
    return await graphGet('/me', accessToken, {
        fields: 'id,name,email,picture.width(200).height(200)',
    });
}

/**
 * Get user's Facebook Pages
 * @param {string} accessToken - Meta access token
 * @returns {Promise<array>} - Array of pages
 */
async function getUserPages(accessToken) {
    const data = await graphGet('/me/accounts', accessToken, {
        fields: [
            'id',
            'name',
            'category',
            'username',
            'about',
            'picture',
            'cover',
            'website',
            'phone',
            'fan_count',
            'followers_count',
            'access_token',
            'tasks',
            'permissions',
        ].join(','),
    });
    return data.data || [];
}

/**
 * Get Instagram Business Account linked to a Facebook Page
 * @param {string} pageId - Facebook Page ID
 * @param {string} pageAccessToken - Page access token
 * @returns {Promise<object|null>} - Instagram account data or null
 */
async function getPageInstagramAccount(pageId, pageAccessToken) {
    try {
        const data = await graphGet(`/${pageId}`, pageAccessToken, {
            fields: 'instagram_business_account{id,username,profile_picture_url,followers_count,follows_count,media_count}',
        });
        return data.instagram_business_account || null;
    } catch (error) {
        // Many pages don't have Instagram linked, so return null instead of throwing
        if (error.code === 'INSTAGRAM_NOT_LINKED') {
            return null;
        }
        throw error;
    }
}

/**
 * Get user's Ad Accounts
 * @param {string} accessToken - Meta access token
 * @returns {Promise<array>} - Array of ad accounts
 */
async function getUserAdAccounts(accessToken) {
    const data = await graphGet('/me/adaccounts', accessToken, {
        fields: [
            'id',
            'account_id',
            'name',
            'account_status',
            'currency',
            'timezone_id',
            'timezone_name',
            'business_name',
            'business',
            'balance',
            'amount_spent',
            'spend_cap',
            'capabilities',
        ].join(','),
    });
    return data.data || [];
}

/**
 * Debug an access token to check its validity and metadata
 * @param {string} accessToken - Token to debug
 * @returns {Promise<object>} - Token debug info
 */
async function debugToken(accessToken) {
    const appAccessToken = `${process.env.META_APP_ID}|${process.env.META_APP_SECRET}`;
    return await graphGet('/debug_token', appAccessToken, {
        input_token: accessToken,
    });
}

/**
 * Get permissions granted for an access token
 * @param {string} userId - Meta user ID
 * @param {string} accessToken - User access token
 * @returns {Promise<array>} - Array of permission objects
 */
async function getTokenPermissions(userId, accessToken) {
    const data = await graphGet(`/${userId}/permissions`, accessToken);
    return data.data || [];
}

/**
 * Handle Graph API errors and convert to user-friendly format
 * @param {Error} error - Axios error object
 * @returns {Error} - Formatted error
 */
function handleGraphAPIError(error) {
    if (error.response) {
        const { data, status } = error.response;
        const graphError = data.error || {};

        // Create custom error with Graph API details
        const customError = new Error(graphError.message || 'Meta API Error');
        customError.code = graphError.code || 'GRAPH_API_ERROR';
        customError.type = graphError.type || 'OAuthException';
        customError.statusCode = status;
        customError.fbtrace_id = graphError.fbtrace_id;
        customError.isMetaError = true;

        // Add specific error codes
        if (graphError.code === 190) {
            customError.code = 'INVALID_TOKEN';
            customError.message = 'Access token is invalid or expired';
        } else if (graphError.code === 102) {
            customError.code = 'API_SESSION_EXPIRED';
            customError.message = 'Session has expired. Please reconnect.';
        } else if (graphError.code === 10) {
            customError.code = 'PERMISSION_DENIED';
            customError.message = 'Permission denied. Please grant required permissions.';
        } else if (graphError.code === 100) {
            customError.code = 'INVALID_PARAMETER';
            customError.message = graphError.message;
        } else if (status === 429) {
            customError.code = 'RATE_LIMIT_EXCEEDED';
            customError.message = 'Rate limit exceeded. Please try again later.';
        }

        return customError;
    } else if (error.request) {
        const networkError = new Error('Network error while connecting to Meta');
        networkError.code = 'NETWORK_ERROR';
        networkError.isMetaError = true;
        return networkError;
    } else {
        return error;
    }
}

/**
 * Build OAuth authorization URL
 * @param {string} state - Random state parameter for CSRF protection
 * @param {string} redirectUri - OAuth redirect URI
 * @returns {string} - Authorization URL
 */
function buildAuthUrl(state, redirectUri) {
    const params = new URLSearchParams({
        client_id: process.env.META_APP_ID,
        redirect_uri: redirectUri,
        state: state,
        scope: [
            'email',
            'public_profile',
            'pages_show_list',
            'pages_read_engagement',
            'pages_manage_ads',
            'ads_management',
            'business_management',
            'instagram_basic',
            'instagram_manage_insights',
        ].join(','),
        response_type: 'code',
        auth_type: 'rerequest', // Force permission dialog even if previously granted
    });

    return `https://www.facebook.com/${GRAPH_API_VERSION}/dialog/oauth?${params.toString()}`;
}

/**
 * Exchange OAuth code for access token
 * @param {string} code - OAuth authorization code
 * @param {string} redirectUri - OAuth redirect URI (must match the one used in auth)
 * @returns {Promise<object>} - { access_token, token_type, expires_in }
 */
async function exchangeCodeForToken(code, redirectUri) {
    try {
        const url = `${GRAPH_API_BASE_URL}/oauth/access_token`;
        const response = await axios.get(url, {
            params: {
                client_id: process.env.META_APP_ID,
                client_secret: process.env.META_APP_SECRET,
                redirect_uri: redirectUri,
                code: code,
            },
        });
        return response.data;
    } catch (error) {
        throw handleGraphAPIError(error);
    }
}

module.exports = {
    graphGet,
    graphPost,
    exchangeForLongLivedToken,
    getUserProfile,
    getUserPages,
    getPageInstagramAccount,
    getUserAdAccounts,
    debugToken,
    getTokenPermissions,
    buildAuthUrl,
    exchangeCodeForToken,
    handleGraphAPIError,
};
