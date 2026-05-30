# Meta Integration - Backend Routes Implementation

This document contains the complete backend route implementations. Create these files in your `backend/routes/` directory.

## File Structure

```
backend/
├── routes/
│   ├── auth.js          # OAuth authentication routes
│   └── meta.js          # Meta API routes
├── utils/
│   ├── encryption.js    # (Already created)
│   ├── metaApi.js       # (Already created)
│   └── db.js            # Database helper (see below)
├── middleware/
│   └── auth.js          # Auth middleware (see below)
├── .env                 # Environment variables
├── package.json
└── server.js            # Main server file
```

## 1. Database Helper (`backend/utils/db.js`)

```javascript
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

/**
 * Query helper function
 */
async function query(text, params) {
    const start = Date.now();
    try {
        const res = await pool.query(text, params);
        const duration = Date.now() - start;
        console.log('Executed query', { text, duration, rows: res.rowCount });
        return res;
    } catch (error) {
        console.error('Database query error:', error);
        throw error;
    }
}

/**
 * Transaction helper
 */
async function transaction(callback) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

module.exports = { query, transaction, pool };
```

## 2. Auth Middleware (`backend/middleware/auth.js`)

```javascript
const jwt = require('jsonwebtoken');

/**
 * Verify JWT token and attach user to request
 */
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({
            error: 'UNAUTHORIZED',
            message: 'Access token is required',
        });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({
                error: 'FORBIDDEN',
                message: 'Invalid or expired token',
            });
        }
        req.user = user;
        next();
    });
}

/**
 * Optional authentication - attach user if token exists
 */
function optionalAuth(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return next();
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (!err) {
            req.user = user;
        }
        next();
    });
}

module.exports = { authenticateToken, optionalAuth };
```

## 3. Authentication Routes (`backend/routes/auth.js`)

```javascript
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { encrypt, generateToken } = require('../utils/encryption');
const {
    buildAuthUrl,
    exchangeCodeForToken,
    exchangeForLongLivedToken,
    getUserProfile,
    debugToken,
} = require('../utils/metaApi');
const { query } = require('../utils/db');

// Store state tokens temporarily (use Redis in production)
const stateStore = new Map();

/**
 * GET /auth/meta/start
 * Start Meta OAuth flow
 */
router.get('/meta/start', async (req, res) => {
    try {
        const { userId } = req.query;

        if (!userId) {
            return res.status(400).json({
                error: 'MISSING_USER_ID',
                message: 'userId query parameter is required',
            });
        }

        // Generate random state for CSRF protection
        const state = generateToken(32);
        
        // Store state with user ID (expires in 10 minutes)
        stateStore.set(state, {
            userId,
            createdAt: Date.now(),
        });

        // Clean up old states
        setTimeout(() => stateStore.delete(state), 10 * 60 * 1000);

        // Determine redirect URI based on environment
        const redirectUri = process.env.NODE_ENV === 'production'
            ? process.env.META_REDIRECT_URI
            : process.env.META_REDIRECT_URI_DEV;

        // Build OAuth URL
        const authUrl = buildAuthUrl(state, redirectUri);

        res.json({
            success: true,
            authUrl,
            state,
        });
    } catch (error) {
        console.error('Error starting Meta auth:', error);
        res.status(500).json({
            error: 'AUTH_START_ERROR',
            message: 'Failed to start authentication',
        });
    }
});

/**
 * GET /auth/meta/callback
 * Handle OAuth callback from Meta
 */
router.get('/meta/callback', async (req, res) => {
    try {
        const { code, state, error, error_description } = req.query;

        // Handle user denied permissions
        if (error) {
            const frontendUrl = process.env.FRONTEND_URL || 'exp://localhost:8081';
            return res.redirect(
                `${frontendUrl}?error=${error}&error_description=${encodeURIComponent(error_description)}`
            );
        }

        // Validate state
        if (!state || !stateStore.has(state)) {
            return res.status(400).json({
                error: 'INVALID_STATE',
                message: 'Invalid or expired state parameter',
            });
        }

        const stateData = stateStore.get(state);
        stateStore.delete(state); // Use state only once

        // Check if state is expired (older than 10 minutes)
        if (Date.now() - stateData.createdAt > 10 * 60 * 1000) {
            return res.status(400).json({
                error: 'STATE_EXPIRED',
                message: 'Authentication state has expired',
            });
        }

        const { userId } = stateData;

        if (!code) {
            return res.status(400).json({
                error: 'MISSING_CODE',
                message: 'Authorization code is required',
            });
        }

        // Determine redirect URI (must match the one used in /start)
        const redirectUri = process.env.NODE_ENV === 'production'
            ? process.env.META_REDIRECT_URI
            : process.env.META_REDIRECT_URI_DEV;

        // Exchange code for short-lived token
        const shortLivedTokenData = await exchangeCodeForToken(code, redirectUri);

        // Exchange for long-lived token (60 days)
        const longLivedTokenData = await exchangeForLongLivedToken(
            shortLivedTokenData.access_token
        );

        const { access_token, expires_in } = longLivedTokenData;

        // Get user profile
        const profile = await getUserProfile(access_token);

        // Debug token to get additional info
        const tokenDebug = await debugToken(access_token);
        const scopes = tokenDebug.data?.scopes || [];

        // Calculate token expiry
        const expiresAt = new Date(Date.now() + expires_in * 1000);

        // Encrypt access token before storing
        const encryptedToken = encrypt(access_token);

        // Check if connection already exists
        const existingConnection = await query(
            'SELECT id FROM meta_connections WHERE user_id = $1',
            [userId]
        );

        let metaConnectionId;

        if (existingConnection.rows.length > 0) {
            // Update existing connection
            metaConnectionId = existingConnection.rows[0].id;
            await query(
                `UPDATE meta_connections 
                 SET access_token = $1,
                     token_expires_at = $2,
                     granted_scopes = $3,
                     is_token_valid = true,
                     last_token_refresh_at = CURRENT_TIMESTAMP,
                     meta_user_id = $4,
                     meta_name = $5,
                     meta_email = $6,
                     updated_at = CURRENT_TIMESTAMP,
                     is_active = true
                 WHERE id = $7`,
                [
                    encryptedToken,
                    expiresAt,
                    scopes,
                    profile.id,
                    profile.name,
                    profile.email,
                    metaConnectionId,
                ]
            );
        } else {
            // Create new connection
            const result = await query(
                `INSERT INTO meta_connections (
                    user_id,
                    meta_user_id,
                    meta_name,
                    meta_email,
                    access_token,
                    token_expires_at,
                    granted_scopes,
                    is_token_valid
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, true)
                RETURNING id`,
                [
                    userId,
                    profile.id,
                    profile.name,
                    profile.email,
                    encryptedToken,
                    expiresAt,
                    scopes,
                ]
            );
            metaConnectionId = result.rows[0].id;
        }

        // Redirect to frontend with success
        const frontendUrl = process.env.FRONTEND_URL || 'exp://localhost:8081';
        res.redirect(
            `${frontendUrl}?success=true&meta_connection_id=${metaConnectionId}`
        );
    } catch (error) {
        console.error('Error in Meta callback:', error);
        const frontendUrl = process.env.FRONTEND_URL || 'exp://localhost:8081';
        res.redirect(
            `${frontendUrl}?error=callback_failed&error_description=${encodeURIComponent(
                error.message
            )}`
        );
    }
});

module.exports = router;
```

## CONTINUED IN NEXT FILE

See `BACKEND_ROUTES_PART2.md` for Meta API routes implementation.
