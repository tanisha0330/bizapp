require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Security: reject requests without proper origin/content-type (CSRF mitigation for APIs)
app.use((req, res, next) => {
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
        const contentType = req.headers['content-type'] || '';
        if (!contentType.includes('application/json')) {
            return res.status(415).json({ error: 'Content-Type must be application/json' });
        }
    }
    next();
});

// Security headers
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
});

// Configuration
const META_APP_ID = process.env.META_APP_ID || '2328965314198107';
const META_APP_SECRET = process.env.META_APP_SECRET || '';
const GRAPH_API_VERSION = 'v19.0';
const GRAPH_API_BASE_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

// In-memory storage (replace with database in production)
const userConnections = new Map();

/**
 * OAuth Callback - Receives redirect from Facebook
 */
app.get('/auth/meta/callback', async (req, res) => {
    const { code, state, error, error_description } = req.query;

    // Handle Facebook errors
    if (error) {
        console.error('Facebook OAuth error:', error, error_description);
        return res.redirect(`exp://192.168.29.212:8081/--/auth/callback?error=${error}&error_description=${encodeURIComponent(error_description || '')}`);
    }

    if (!code) {
        return res.redirect(`exp://192.168.29.212:8081/--/auth/callback?error=no_code`);
    }

    // Store temporarily for the app to pick up
    const sessionId = Math.random().toString(36).substring(7);
    userConnections.set(`session_${sessionId}`, {
        code,
        state,
        timestamp: Date.now(),
    });

    // Redirect back to app with session ID
    res.redirect(`exp://192.168.29.212:8081/--/auth/callback?session=${sessionId}`);
});

/**
 * Exchange session for tokens and user data
 */
app.post('/auth/meta/session', async (req, res) => {
    try {
        const { sessionId, userId } = req.body;

        if (!sessionId) {
            return res.status(400).json({ error: 'missing_session_id' });
        }

        // Get session data
        const session = userConnections.get(`session_${sessionId}`);
        if (!session) {
            return res.status(404).json({ error: 'session_not_found', message: 'Session expired or invalid' });
        }

        const { code, state } = session;

        // Clean up session
        userConnections.delete(`session_${sessionId}`);

        console.log('Exchanging code for token...', { userId });

        // Exchange authorization code for access token
        const tokenUrl = `${GRAPH_API_BASE_URL}/oauth/access_token`;
        const tokenResponse = await axios.get(tokenUrl, {
            params: {
                client_id: META_APP_ID,
                client_secret: META_APP_SECRET,
                redirect_uri: `${process.env.API_URL || 'http://localhost:3000'}/auth/meta/callback`,
                code: code,
            },
        });

        const { access_token, token_type, expires_in } = tokenResponse.data;

        // Get user profile
        const profileResponse = await axios.get(`${GRAPH_API_BASE_URL}/me`, {
            params: {
                access_token: access_token,
                fields: 'id,name,email,picture',
            },
        });

        const profile = profileResponse.data;

        // Get user's Facebook pages
        const pagesResponse = await axios.get(`${GRAPH_API_BASE_URL}/me/accounts`, {
            params: {
                access_token: access_token,
                fields: 'id,name,category,access_token,tasks,picture',
            },
        });

        const pages = pagesResponse.data.data || [];

        // For each page, try to get Instagram account if linked
        const pagesWithInstagram = await Promise.all(
            pages.map(async (page) => {
                try {
                    const igResponse = await axios.get(`${GRAPH_API_BASE_URL}/${page.id}`, {
                        params: {
                            access_token: page.access_token,
                            fields: 'instagram_business_account{id,username,profile_picture_url}',
                        },
                    });
                    return {
                        ...page,
                        instagram: igResponse.data.instagram_business_account || null,
                    };
                } catch (error) {
                    return { ...page, instagram: null };
                }
            })
        );

        // Store connection data
        userConnections.set(userId, {
            userId,
            profile,
            accessToken: access_token,
            tokenType: token_type,
            expiresIn: expires_in,
            expiresAt: Date.now() + expires_in * 1000,
            pages: pagesWithInstagram,
            connectedAt: new Date().toISOString(),
        });

        console.log(`✅ Facebook connected for user ${userId}`);
        console.log(`   Profile: ${profile.name} (${profile.email})`);
        console.log(`   Pages: ${pages.length} page(s) found`);

        res.json({
            success: true,
            profile,
            pages: pagesWithInstagram,
            pagesCount: pagesWithInstagram.length,
        });

    } catch (error) {
        console.error('Token exchange error:', error.response?.data || error.message);
        res.status(500).json({
            error: 'token_exchange_failed',
            message: error.response?.data?.error?.message || 'Failed to exchange authorization code',
        });
    }
});

/**
 * OAuth Callback - Exchange code for access token (deprecated, use /auth/meta/session)
 */
app.post('/auth/meta/exchange', async (req, res) => {
    try {
        const { code, userId, state } = req.body;

        if (!code) {
            return res.status(400).json({ error: 'missing_code', message: 'Authorization code is required' });
        }

        console.log('Exchanging code for token...', { userId });

        // Exchange authorization code for access token
        const tokenUrl = `${GRAPH_API_BASE_URL}/oauth/access_token`;
        const tokenResponse = await axios.get(tokenUrl, {
            params: {
                client_id: META_APP_ID,
                client_secret: META_APP_SECRET,
                redirect_uri: `${process.env.API_URL || 'http://localhost:3000'}/auth/meta/callback`,
                code: code,
            },
        });

        const { access_token, token_type, expires_in } = tokenResponse.data;

        // Get user profile
        const profileResponse = await axios.get(`${GRAPH_API_BASE_URL}/me`, {
            params: {
                access_token: access_token,
                fields: 'id,name,email,picture',
            },
        });

        const profile = profileResponse.data;

        // Get user's Facebook pages
        const pagesResponse = await axios.get(`${GRAPH_API_BASE_URL}/me/accounts`, {
            params: {
                access_token: access_token,
                fields: 'id,name,category,access_token,tasks,picture',
            },
        });

        const pages = pagesResponse.data.data || [];

        // For each page, try to get Instagram account if linked
        const pagesWithInstagram = await Promise.all(
            pages.map(async (page) => {
                try {
                    const igResponse = await axios.get(`${GRAPH_API_BASE_URL}/${page.id}`, {
                        params: {
                            access_token: page.access_token,
                            fields: 'instagram_business_account{id,username,profile_picture_url}',
                        },
                    });
                    return {
                        ...page,
                        instagram: igResponse.data.instagram_business_account || null,
                    };
                } catch (error) {
                    // Instagram not linked to this page
                    return { ...page, instagram: null };
                }
            })
        );

        // Store connection data
        userConnections.set(userId, {
            userId,
            profile,
            accessToken: access_token,
            tokenType: token_type,
            expiresIn: expires_in,
            expiresAt: Date.now() + expires_in * 1000,
            pages: pagesWithInstagram,
            connectedAt: new Date().toISOString(),
        });

        console.log(`✅ Facebook connected for user ${userId}`);
        console.log(`   Profile: ${profile.name} (${profile.email})`);
        console.log(`   Pages: ${pages.length} page(s) found`);

        res.json({
            success: true,
            profile,
            pages: pagesWithInstagram,
            pagesCount: pagesWithInstagram.length,
        });

    } catch (error) {
        console.error('Token exchange error:', error.response?.data || error.message);
        res.status(500).json({
            error: 'token_exchange_failed',
            message: error.response?.data?.error?.message || 'Failed to exchange authorization code',
        });
    }
});

/**
 * Get connection status
 */
app.get('/meta/connection-status', (req, res) => {
    const { userId } = req.query;
    
    if (!userId) {
        return res.status(400).json({ error: 'missing_user_id' });
    }

    const connection = userConnections.get(userId);
    
    if (!connection) {
        return res.json({ connected: false });
    }

    // Check if token is expired
    const isExpired = Date.now() > connection.expiresAt;
    
    res.json({
        connected: !isExpired,
        profile: connection.profile,
        pagesCount: connection.pages?.length || 0,
        connectedAt: connection.connectedAt,
    });
});

/**
 * Get user's Facebook pages
 */
app.get('/meta/pages', (req, res) => {
    const { userId } = req.query;
    
    if (!userId) {
        return res.status(400).json({ error: 'missing_user_id' });
    }

    const connection = userConnections.get(userId);
    
    if (!connection) {
        return res.status(404).json({ error: 'not_connected', message: 'User not connected to Facebook' });
    }

    res.json({
        pages: connection.pages || [],
        profile: connection.profile,
    });
});

/**
 * Disconnect Facebook
 */
app.post('/meta/disconnect', (req, res) => {
    const { userId } = req.body;
    
    if (!userId) {
        return res.status(400).json({ error: 'missing_user_id' });
    }

    const hadConnection = userConnections.has(userId);
    userConnections.delete(userId);
    
    res.json({
        success: true,
        message: hadConnection ? 'Disconnected successfully' : 'No connection found',
    });
});

/**
 * Health check
 */
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        activeConnections: userConnections.size,
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`\n🚀 Backend server running on port ${PORT}`);
    console.log(`📘 Facebook App ID: ${META_APP_ID}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health\n`);
    
    if (!META_APP_SECRET) {
        console.warn('⚠️  META_APP_SECRET not set! OAuth will not work.');
        console.warn('   Set it in backend/.env file\n');
    }
});

module.exports = app;
