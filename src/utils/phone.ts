/**
 * Normalize and format phone numbers consistently across the app.
 * Handles cases where phone may already have +91 prefix or just digits.
 */

export function normalizePhone(phone: string): string {
    // Strip all non-digit characters except leading +
    const digits = phone.replace(/[^\d]/g, '');
    // Ensure single + prefix with country code
    if (digits.length >= 12 && digits.startsWith('91')) {
        return `+${digits}`;
    }
    if (digits.length === 10) {
        return `+91${digits}`;
    }
    return `+${digits}`;
}

export function formatPhoneDisplay(phone?: string): string {
    if (!phone) return 'Not set';
    // Remove any duplicate + signs
    let cleaned = phone.replace(/^\++/, '+');
    // If no + prefix, add +91
    if (!cleaned.startsWith('+')) {
        cleaned = cleaned.length === 10 ? `+91${cleaned}` : `+${cleaned}`;
    }
    return cleaned;
}

export function formatPhoneSpaced(phone?: string): string {
    if (!phone) return '';
    const display = formatPhoneDisplay(phone);
    // Format as +91 XXXXX XXXXX
    const match = display.match(/^\+(\d{2})(\d{5})(\d{5})$/);
    if (match) {
        return `+${match[1]} ${match[2]} ${match[3]}`;
    }
    return display;
}
