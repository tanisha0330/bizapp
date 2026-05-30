// ─── Biz499 Design System ─────────────────────────────────────
// Centralized theme for consistent, premium UI across the app
// Supports light and dark mode

import { useThemeStore } from './ThemeContext';

// ─── Light Palette ───────────────────────────────────────────
const LightColors = {
    // Brand
    brand: '#6C5CE7',
    brandLight: '#A29BFE',
    brandDark: '#5A4BD1',
    brandBg: '#F0EDFF',

    // Accent
    accent: '#00CEFF',
    accentLight: '#E0F9FF',

    // Semantic
    success: '#00D68F',
    successBg: '#E6FBF4',
    warning: '#FFAA00',
    warningBg: '#FFF7E6',
    danger: '#FF4757',
    dangerBg: '#FFE8EB',
    info: '#339AF0',
    infoBg: '#E7F3FF',

    // Neutrals
    text: '#0F172A',
    textSecondary: '#475569',
    textTertiary: '#94A3B8',
    textInverse: '#FFFFFF',

    // Surfaces
    background: '#F8FAFC',
    surface: '#FFFFFF',
    surfaceSecondary: '#F1F5F9',
    surfaceTertiary: '#E2E8F0',

    // Borders
    border: '#E2E8F0',
    borderLight: '#F1F5F9',
    borderFocus: '#6C5CE7',

    // Platform
    facebook: '#1877F2',
    instagram: '#E4405F',
    google: '#DB4437',
    whatsapp: '#25D366',
    youtube: '#FF0000',
};

// ─── Dark Palette ────────────────────────────────────────────
const DarkColors: typeof LightColors = {
    // Brand
    brand: '#8B7CF6',
    brandLight: '#A29BFE',
    brandDark: '#6C5CE7',
    brandBg: '#1E1B4B',

    // Accent
    accent: '#22D3EE',
    accentLight: '#0C2D3A',

    // Semantic
    success: '#34D399',
    successBg: '#064E3B',
    warning: '#FBBF24',
    warningBg: '#451A03',
    danger: '#F87171',
    dangerBg: '#450A0A',
    info: '#60A5FA',
    infoBg: '#172554',

    // Neutrals
    text: '#F1F5F9',
    textSecondary: '#94A3B8',
    textTertiary: '#64748B',
    textInverse: '#0F172A',

    // Surfaces
    background: '#0F172A',
    surface: '#1E293B',
    surfaceSecondary: '#273548',
    surfaceTertiary: '#334155',

    // Borders
    border: '#334155',
    borderLight: '#1E293B',
    borderFocus: '#8B7CF6',

    // Platform
    facebook: '#4599F5',
    instagram: '#E4405F',
    google: '#EA6258',
    whatsapp: '#25D366',
    youtube: '#FF4444',
};

// ─── Dynamic Colors Hook ─────────────────────────────────────
export function useColors() {
    const { isDark } = useThemeStore();
    return isDark ? DarkColors : LightColors;
}

// Static fallback for non-component code (defaults to light)
export const Colors = LightColors;

export const Fonts = {
    regular: 'Jakarta-Regular',
    medium: 'Jakarta-Medium',
    semiBold: 'Jakarta-SemiBold',
    bold: 'Jakarta-Bold',
    extraBold: 'Jakarta-ExtraBold',
};

export const FontSize = {
    xs: 11,
    sm: 13,
    base: 15,
    md: 17,
    lg: 20,
    xl: 24,
    '2xl': 28,
    '3xl': 34,
    display: 40,
};

export const Spacing = {
    xs: 4,
    sm: 8,
    md: 14,
    lg: 18,
    xl: 22,
    '2xl': 28,
    '3xl': 36,
    '4xl': 44,
};

export const Radius = {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    '2xl': 24,
    full: 999,
};

export const Shadow = {
    sm: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 2,
    },
    md: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 4,
    },
    lg: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 8,
    },
    brand: {
        shadowColor: '#6C5CE7',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 8,
    },
};

// Gradient presets
export const Gradients = {
    brand: ['#6C5CE7', '#5A4BD1'] as readonly [string, string],
    brandLight: ['#A29BFE', '#6C5CE7'] as readonly [string, string],
    sunset: ['#FF6B6B', '#EE5A24'] as readonly [string, string],
    ocean: ['#0984E3', '#6C5CE7'] as readonly [string, string],
    mint: ['#00D68F', '#00B894'] as readonly [string, string],
    dark: ['#1E293B', '#0F172A'] as readonly [string, string],
    glass: ['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.7)'] as readonly [string, string],
};

// Dark-aware gradients
export function useGradients() {
    const { isDark } = useThemeStore();
    if (!isDark) return Gradients;
    return {
        ...Gradients,
        glass: ['rgba(30,41,59,0.9)', 'rgba(30,41,59,0.7)'] as readonly [string, string],
    };
}
