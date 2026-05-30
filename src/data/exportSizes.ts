// Multi-size export presets for designs
export interface ExportSize {
    id: string;
    name: string;
    platform: string;
    width: number;
    height: number;
    icon: string;
}

export const EXPORT_SIZES: ExportSize[] = [
    // Instagram
    { id: 'ig-post', name: 'Instagram Post', platform: 'Instagram', width: 1080, height: 1080, icon: 'logo-instagram' },
    { id: 'ig-story', name: 'Instagram Story', platform: 'Instagram', width: 1080, height: 1920, icon: 'logo-instagram' },
    { id: 'ig-reel', name: 'Instagram Reel Cover', platform: 'Instagram', width: 1080, height: 1920, icon: 'logo-instagram' },

    // Facebook
    { id: 'fb-post', name: 'Facebook Post', platform: 'Facebook', width: 1200, height: 630, icon: 'logo-facebook' },
    { id: 'fb-story', name: 'Facebook Story', platform: 'Facebook', width: 1080, height: 1920, icon: 'logo-facebook' },
    { id: 'fb-cover', name: 'Facebook Cover', platform: 'Facebook', width: 820, height: 312, icon: 'logo-facebook' },
    { id: 'fb-ad', name: 'Facebook Ad', platform: 'Facebook', width: 1200, height: 628, icon: 'logo-facebook' },

    // WhatsApp
    { id: 'wa-status', name: 'WhatsApp Status', platform: 'WhatsApp', width: 1080, height: 1920, icon: 'logo-whatsapp' },
    { id: 'wa-dp', name: 'WhatsApp DP', platform: 'WhatsApp', width: 500, height: 500, icon: 'logo-whatsapp' },

    // Google
    { id: 'g-display', name: 'Google Display', platform: 'Google', width: 300, height: 250, icon: 'globe-outline' },
    { id: 'g-leaderboard', name: 'Google Leaderboard', platform: 'Google', width: 728, height: 90, icon: 'globe-outline' },
    { id: 'g-banner', name: 'Google Banner', platform: 'Google', width: 468, height: 60, icon: 'globe-outline' },

    // General
    { id: 'square', name: 'Square (1:1)', platform: 'General', width: 1080, height: 1080, icon: 'square-outline' },
    { id: 'landscape', name: 'Landscape (16:9)', platform: 'General', width: 1920, height: 1080, icon: 'tablet-landscape-outline' },
    { id: 'portrait', name: 'Portrait (9:16)', platform: 'General', width: 1080, height: 1920, icon: 'phone-portrait-outline' },
    { id: 'a4', name: 'A4 Print', platform: 'Print', width: 2480, height: 3508, icon: 'print-outline' },
];

// Group by platform
export const getExportSizesByPlatform = (): { platform: string; sizes: ExportSize[] }[] => {
    const map = new Map<string, ExportSize[]>();
    EXPORT_SIZES.forEach(s => {
        if (!map.has(s.platform)) map.set(s.platform, []);
        map.get(s.platform)!.push(s);
    });
    return Array.from(map.entries()).map(([platform, sizes]) => ({ platform, sizes }));
};
