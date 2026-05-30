import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { api } from './api';
import { NotifyEvents } from './notifications';

WebBrowser.maybeCompleteAuthSession();

/**
 * Parse query params from a URL string (works with custom schemes like biz499://)
 */
function parseQueryParams(urlString: string): Record<string, string> {
    const params: Record<string, string> = {};
    const qIndex = urlString.indexOf('?');
    if (qIndex === -1) return params;
    // Strip fragment (#...) that Facebook appends (e.g. #_=_)
    let queryString = urlString.substring(qIndex + 1);
    const hashIndex = queryString.indexOf('#');
    if (hashIndex !== -1) queryString = queryString.substring(0, hashIndex);
    for (const pair of queryString.split('&')) {
        const [key, value] = pair.split('=');
        if (key) params[decodeURIComponent(key)] = decodeURIComponent(value || '');
    }
    return params;
}

/**
 * Connect to Facebook using OAuth via backend
 */
export async function connectFacebook(): Promise<{
    success: boolean;
    error?: string;
    errorDescription?: string;
}> {
    try {
        // Build redirect URI using Linking for proper scheme handling (works in Expo Go + production)
        const redirectUrl = Linking.createURL('auth/callback');
        console.log('OAuth app redirect URL:', redirectUrl);

        // Get OAuth URL from backend, passing our app redirect URL so it redirects back correctly
        const { url } = await api.getOAuthUrl(redirectUrl);

        // Open browser for Facebook authentication
        const result = await WebBrowser.openAuthSessionAsync(url, redirectUrl);

        console.log('OAuth browser result:', result.type);

        if (result.type === 'success' && result.url) {
            console.log('OAuth return URL:', result.url);
            const params = parseQueryParams(result.url);

            if (params.error) {
                return {
                    success: false,
                    error: params.error,
                    errorDescription: params.error_description || 'Facebook authentication failed',
                };
            }

            // The backend callback already exchanged the code for tokens.
            const status = await api.getMetaStatus();
            if (status.connected) {
                NotifyEvents.facebookConnected();
                return { success: true };
            }

            return {
                success: false,
                error: 'exchange_failed',
                errorDescription: 'Token exchange may have failed. Please try again.',
            };
        }

        // On Android production builds, Chrome Custom Tabs often return 'dismiss'
        // even when the OAuth flow succeeded (deep link redirect doesn't always
        // get captured by openAuthSessionAsync). Check backend status as fallback.
        if (result.type === 'cancel' || result.type === 'dismiss') {
            if (Platform.OS === 'android') {
                // Give the backend callback a moment to complete
                await new Promise(r => setTimeout(r, 1500));
                try {
                    const status = await api.getMetaStatus();
                    if (status.connected) {
                        console.log('OAuth succeeded via Android fallback check');
                        NotifyEvents.facebookConnected();
                        return { success: true };
                    }
                } catch {}
            }
            return {
                success: false,
                error: 'cancelled',
                errorDescription: 'User cancelled the login process',
            };
        }

        return {
            success: false,
            error: 'unknown_result',
            errorDescription: `Browser returned: ${result.type}`,
        };
    } catch (error: any) {
        console.error('Facebook OAuth error:', error);
        return {
            success: false,
            error: 'exception',
            errorDescription: error.message || 'An error occurred during authentication',
        };
    }
}

/**
 * Check if user has Facebook connection
 */
export async function checkFacebookConnection(): Promise<boolean> {
    try {
        const status = await api.getMetaStatus();
        return status.connected === true;
    } catch (error) {
        console.error('Error checking connection:', error);
        return false;
    }
}

/**
 * Disconnect Facebook — clears backend connection and local store
 */
export async function disconnectFacebook(): Promise<boolean> {
    try {
        await api.disconnectMeta();
        // Clear local Facebook store
        const { useFacebookStore } = require('../store/useFacebookStore');
        useFacebookStore.getState().disconnect();
        return true;
    } catch (error) {
        console.error('Error disconnecting:', error);
        return false;
    }
}
