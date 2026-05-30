/**
 * Gemini AI Configuration
 *
 * All Gemini API calls go through the backend proxy.
 * API keys are stored as Cloudflare Worker secrets — never in the app.
 */

export const GEMINI_CONFIG = {
    MODEL_NAME: 'gemini-2.5-flash',
    IMAGE_MODEL: 'gemini-2.5-flash-image',
};

export function validateGeminiConfig(): boolean {
    // Gemini calls go through backend proxy — no local key needed
    return true;
}
