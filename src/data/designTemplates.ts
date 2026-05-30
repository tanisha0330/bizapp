// Design Templates Data - Indian Business Ad Templates
// Each template defines layout, colors, fields, and styling for the ad editor

export interface TemplateField {
    id: string;
    type: 'text' | 'logo' | 'image' | 'phone' | 'cta' | 'tagline' | 'address' | 'website';
    label: string;
    defaultValue: string;
    placeholder: string;
    visible: boolean;
    style: {
        fontSize?: number;
        fontWeight?: 'normal' | 'bold' | '600' | '700' | '800' | '900';
        color?: string;
        textAlign?: 'left' | 'center' | 'right';
        letterSpacing?: number;
        textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
    };
    position: {
        top?: number;
        bottom?: number;
        left?: number;
        right?: number;
    };
}

export interface DesignTemplate {
    id: string;
    name: string;
    category: string;
    categoryIcon: string;
    description: string;
    thumbnail: string;
    aspectRatio: '1:1' | '4:5' | '9:16' | '16:9';
    backgroundImageUrl?: string;  // Stock photo background (Unsplash CDN)
    overlayOpacity?: number;      // 0-1, how dark the photo overlay is (default 0.5)
    colors: {
        primary: string;
        secondary: string;
        accent: string;
        background: readonly [string, string, ...string[]];
        textPrimary: string;
        textSecondary: string;
    };
    fields: TemplateField[];
    decorations: {
        type: 'circles' | 'waves' | 'dots' | 'geometric' | 'festive' | 'minimal' | 'food';
        opacity: number;
    };
    badge?: {
        text: string;
        color: string;
        bgColor: string;
    };
    tags: string[];
}

export const DESIGN_TEMPLATES: DesignTemplate[] = [
    // ============================================
    // 1. REAL ESTATE TEMPLATE
    // ============================================
    {
        id: 'real-estate-01',
        name: 'Dream Home',
        category: 'Real Estate',
        categoryIcon: '🏠',
        description: 'Premium real estate ad template for property listings',
        thumbnail: '🏡',
        aspectRatio: '1:1',
        backgroundImageUrl: 'https://images.unsplash.com/photo-1560184897-ae75f418493e?w=800&q=80&fit=crop',
        overlayOpacity: 0.6,
        colors: {
            primary: '#1B4D3E',
            secondary: '#C9A96E',
            accent: '#E8D5B5',
            background: ['#1B4D3E', '#0D2E24'] as const,
            textPrimary: '#FFFFFF',
            textSecondary: '#C9A96E',
        },
        fields: [
            {
                id: 'headline',
                type: 'text',
                label: 'Headline',
                defaultValue: 'Your Dream Home\nAwaits!',
                placeholder: 'Enter headline...',
                visible: true,
                style: { fontSize: 32, fontWeight: '900', color: '#FFFFFF', textAlign: 'left', letterSpacing: 1 },
                position: { top: 15, left: 8 },
            },
            {
                id: 'property-type',
                type: 'tagline',
                label: 'Property Type',
                defaultValue: '2 BHK / 3 BHK Apartments',
                placeholder: 'e.g., 2 BHK, Villa...',
                visible: true,
                style: { fontSize: 16, fontWeight: '600', color: '#C9A96E', textAlign: 'left' },
                position: { top: 42, left: 8 },
            },
            {
                id: 'price',
                type: 'text',
                label: 'Starting Price',
                defaultValue: '₹45 Lakh*',
                placeholder: 'Enter price...',
                visible: true,
                style: { fontSize: 28, fontWeight: '800', color: '#FFFFFF', textAlign: 'left' },
                position: { top: 52, left: 8 },
            },
            {
                id: 'location',
                type: 'address',
                label: 'Location',
                defaultValue: '📍 Whitefield, Bangalore',
                placeholder: 'Enter location...',
                visible: true,
                style: { fontSize: 14, fontWeight: '600', color: '#E8D5B5', textAlign: 'left' },
                position: { top: 62, left: 8 },
            },
            {
                id: 'features',
                type: 'text',
                label: 'Key Features',
                defaultValue: '🏊 Pool  🌳 Garden  🅿️ Parking',
                placeholder: 'Enter features...',
                visible: true,
                style: { fontSize: 13, fontWeight: 'normal', color: '#FFFFFF', textAlign: 'left' },
                position: { top: 68, left: 8 },
            },
            {
                id: 'phone',
                type: 'phone',
                label: 'Phone Number',
                defaultValue: '+91 98765 43210',
                placeholder: 'Enter phone...',
                visible: true,
                style: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', textAlign: 'center' },
                position: { bottom: 8, right: 8 },
            },
            {
                id: 'cta',
                type: 'cta',
                label: 'Call to Action',
                defaultValue: 'BOOK SITE VISIT',
                placeholder: 'CTA text...',
                visible: true,
                style: { fontSize: 14, fontWeight: '700', color: '#1B4D3E', textAlign: 'center', textTransform: 'uppercase' },
                position: { bottom: 14, left: 8 },
            },
            {
                id: 'business-name',
                type: 'text',
                label: 'Business Name',
                defaultValue: 'SKYLINE PROPERTIES',
                placeholder: 'Your business name...',
                visible: true,
                style: { fontSize: 12, fontWeight: '700', color: '#C9A96E', textAlign: 'center', letterSpacing: 3, textTransform: 'uppercase' },
                position: { top: 5, right: 8 },
            },
            {
                id: 'logo',
                type: 'logo',
                label: 'Logo',
                defaultValue: '',
                placeholder: 'Upload logo...',
                visible: true,
                style: {},
                position: { top: 5, left: 8 },
            },
        ],
        decorations: { type: 'geometric', opacity: 0.15 },
        badge: { text: 'RERA Approved', color: '#1B4D3E', bgColor: '#C9A96E' },
        tags: ['real estate', 'property', 'apartment', 'home'],
    },

    // ============================================
    // 2. SECOND HAND ELECTRONICS
    // ============================================
    {
        id: 'electronics-01',
        name: 'Tech Deals',
        category: 'Electronics',
        categoryIcon: '📱',
        description: 'Eye-catching template for used electronics & gadgets',
        thumbnail: '🖥️',
        aspectRatio: '1:1',
        backgroundImageUrl: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=800&q=80&fit=crop',
        overlayOpacity: 0.72,
        colors: {
            primary: '#6C3AED',
            secondary: '#A78BFA',
            accent: '#F59E0B',
            background: ['#0F0F23', '#1A1A3E', '#2D1B69'] as const,
            textPrimary: '#FFFFFF',
            textSecondary: '#A78BFA',
        },
        fields: [
            {
                id: 'headline',
                type: 'text',
                label: 'Headline',
                defaultValue: 'Certified\nPre-Owned\nGadgets',
                placeholder: 'Enter headline...',
                visible: true,
                style: { fontSize: 30, fontWeight: '900', color: '#FFFFFF', textAlign: 'left' },
                position: { top: 12, left: 8 },
            },
            {
                id: 'discount',
                type: 'tagline',
                label: 'Discount Banner',
                defaultValue: 'UP TO 60% OFF',
                placeholder: 'Enter discount...',
                visible: true,
                style: { fontSize: 22, fontWeight: '800', color: '#F59E0B', textAlign: 'left', letterSpacing: 2 },
                position: { top: 45, left: 8 },
            },
            {
                id: 'subtitle',
                type: 'text',
                label: 'Description',
                defaultValue: 'Laptops • Phones • Tablets\nWith 6 Month Warranty',
                placeholder: 'Enter description...',
                visible: true,
                style: { fontSize: 14, fontWeight: '600', color: '#A78BFA', textAlign: 'left' },
                position: { top: 55, left: 8 },
            },
            {
                id: 'assurance',
                type: 'text',
                label: 'Quality Assurance',
                defaultValue: '✅ Quality Checked  ✅ Warranty  ✅ EMI Available',
                placeholder: 'Enter assurance...',
                visible: true,
                style: { fontSize: 11, fontWeight: '600', color: '#FFFFFF', textAlign: 'left' },
                position: { top: 68, left: 8 },
            },
            {
                id: 'phone',
                type: 'phone',
                label: 'Phone Number',
                defaultValue: '+91 98765 43210',
                placeholder: 'Enter phone...',
                visible: true,
                style: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', textAlign: 'center' },
                position: { bottom: 8, right: 8 },
            },
            {
                id: 'cta',
                type: 'cta',
                label: 'Call to Action',
                defaultValue: 'SHOP NOW',
                placeholder: 'CTA text...',
                visible: true,
                style: { fontSize: 15, fontWeight: '800', color: '#0F0F23', textAlign: 'center', textTransform: 'uppercase' },
                position: { bottom: 14, left: 8 },
            },
            {
                id: 'business-name',
                type: 'text',
                label: 'Store Name',
                defaultValue: 'GADGET GARAGE',
                placeholder: 'Your store name...',
                visible: true,
                style: { fontSize: 13, fontWeight: '800', color: '#F59E0B', textAlign: 'center', letterSpacing: 3, textTransform: 'uppercase' },
                position: { top: 4, right: 8 },
            },
            {
                id: 'logo',
                type: 'logo',
                label: 'Logo',
                defaultValue: '',
                placeholder: 'Upload logo...',
                visible: true,
                style: {},
                position: { top: 4, left: 8 },
            },
        ],
        decorations: { type: 'dots', opacity: 0.2 },
        badge: { text: 'BEST DEALS', color: '#FFFFFF', bgColor: '#F59E0B' },
        tags: ['electronics', 'gadgets', 'phone', 'laptop', 'second hand'],
    },

    // ============================================
    // 3. DRY FRUITS & PREMIUM FOODS
    // ============================================
    {
        id: 'dryfruits-01',
        name: 'Premium Dry Fruits',
        category: 'Dry Fruits',
        categoryIcon: '🥜',
        description: 'Elegant template for dry fruits and premium food items',
        thumbnail: '🌰',
        aspectRatio: '1:1',
        backgroundImageUrl: 'https://images.pexels.com/photos/31896555/pexels-photo-31896555.jpeg?auto=compress&cs=tinysrgb&w=900&h=900&fit=crop',
        overlayOpacity: 0.5,
        colors: {
            primary: '#8B4513',
            secondary: '#DAA520',
            accent: '#FFF8DC',
            background: ['#FDF6E3', '#F5E6C8', '#EDCF98'] as const,
            textPrimary: '#3E2723',
            textSecondary: '#8B4513',
        },
        fields: [
            {
                id: 'headline',
                type: 'text',
                label: 'Headline',
                defaultValue: 'Premium Quality\nDry Fruits',
                placeholder: 'Enter headline...',
                visible: true,
                style: { fontSize: 32, fontWeight: '900', color: '#3E2723', textAlign: 'center' },
                position: { top: 12, left: 8 },
            },
            {
                id: 'tagline',
                type: 'tagline',
                label: 'Tagline',
                defaultValue: '✨ Farm Fresh | 100% Natural ✨',
                placeholder: 'Enter tagline...',
                visible: true,
                style: { fontSize: 14, fontWeight: '600', color: '#8B4513', textAlign: 'center' },
                position: { top: 38, left: 8 },
            },
            {
                id: 'products',
                type: 'text',
                label: 'Products',
                defaultValue: 'Almonds • Cashews • Pistachios\nWalnuts • Raisins • Dates',
                placeholder: 'Enter products...',
                visible: true,
                style: { fontSize: 15, fontWeight: '700', color: '#5D4037', textAlign: 'center' },
                position: { top: 48, left: 8 },
            },
            {
                id: 'offer',
                type: 'text',
                label: 'Special Offer',
                defaultValue: 'Order Above ₹999 & Get\nFREE Home Delivery',
                placeholder: 'Enter offer...',
                visible: true,
                style: { fontSize: 14, fontWeight: '700', color: '#8B4513', textAlign: 'center' },
                position: { top: 62, left: 8 },
            },
            {
                id: 'phone',
                type: 'phone',
                label: 'Phone / WhatsApp',
                defaultValue: '📞 +91 98765 43210',
                placeholder: 'Enter phone...',
                visible: true,
                style: { fontSize: 15, fontWeight: '700', color: '#3E2723', textAlign: 'center' },
                position: { bottom: 10, left: 8 },
            },
            {
                id: 'cta',
                type: 'cta',
                label: 'Call to Action',
                defaultValue: 'ORDER NOW',
                placeholder: 'CTA text...',
                visible: true,
                style: { fontSize: 15, fontWeight: '800', color: '#FFF8DC', textAlign: 'center', textTransform: 'uppercase' },
                position: { bottom: 16, left: 8 },
            },
            {
                id: 'business-name',
                type: 'text',
                label: 'Business Name',
                defaultValue: 'ROYAL DRY FRUITS',
                placeholder: 'Your business name...',
                visible: true,
                style: { fontSize: 13, fontWeight: '800', color: '#3E2723', textAlign: 'center', letterSpacing: 4, textTransform: 'uppercase' },
                position: { top: 4, left: 8 },
            },
            {
                id: 'logo',
                type: 'logo',
                label: 'Logo',
                defaultValue: '',
                placeholder: 'Upload logo...',
                visible: true,
                style: {},
                position: { top: 4, left: 8 },
            },
        ],
        decorations: { type: 'minimal', opacity: 0.1 },
        badge: { text: '100% NATURAL', color: '#FFF8DC', bgColor: '#8B4513' },
        tags: ['dry fruits', 'food', 'organic', 'premium', 'healthy'],
    },

    // ============================================
    // 4. FOOD / RESTAURANT
    // ============================================
    {
        id: 'food-restaurant-01',
        name: 'Tasty Bites',
        category: 'Food & Restaurant',
        categoryIcon: '🍽️',
        description: 'Mouth-watering restaurant and food delivery template',
        thumbnail: '🍔',
        aspectRatio: '1:1',
        backgroundImageUrl: 'https://images.pexels.com/photos/33430559/pexels-photo-33430559.jpeg?auto=compress&cs=tinysrgb&w=900&h=900&fit=crop',
        overlayOpacity: 0.62,
        colors: {
            primary: '#DC2626',
            secondary: '#FDE047',
            accent: '#FEF3C7',
            background: ['#DC2626', '#B91C1C', '#991B1B'] as const,
            textPrimary: '#FFFFFF',
            textSecondary: '#FDE047',
        },
        fields: [
            {
                id: 'headline',
                type: 'text',
                label: 'Headline',
                defaultValue: 'Taste the\nBest Indian\nCuisine!',
                placeholder: 'Enter headline...',
                visible: true,
                style: { fontSize: 34, fontWeight: '900', color: '#FFFFFF', textAlign: 'left' },
                position: { top: 12, left: 8 },
            },
            {
                id: 'offer',
                type: 'tagline',
                label: 'Special Offer',
                defaultValue: '🔥 FLAT 30% OFF',
                placeholder: 'Enter offer...',
                visible: true,
                style: { fontSize: 22, fontWeight: '800', color: '#FDE047', textAlign: 'left', letterSpacing: 1 },
                position: { top: 48, left: 8 },
            },
            {
                id: 'subtitle',
                type: 'text',
                label: 'Menu Highlights',
                defaultValue: 'Biryani • Tandoori • Thali\nFresh & Hygienic | Pure Veg & Non-Veg',
                placeholder: 'Enter menu items...',
                visible: true,
                style: { fontSize: 13, fontWeight: '600', color: '#FFFFFF', textAlign: 'left' },
                position: { top: 58, left: 8 },
            },
            {
                id: 'timing',
                type: 'text',
                label: 'Timing',
                defaultValue: '🕐 11 AM - 11 PM | All Days',
                placeholder: 'Enter timing...',
                visible: true,
                style: { fontSize: 12, fontWeight: '600', color: '#FEF3C7', textAlign: 'left' },
                position: { top: 70, left: 8 },
            },
            {
                id: 'phone',
                type: 'phone',
                label: 'Phone / Order',
                defaultValue: '📞 +91 98765 43210',
                placeholder: 'Enter phone...',
                visible: true,
                style: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', textAlign: 'center' },
                position: { bottom: 8, right: 8 },
            },
            {
                id: 'cta',
                type: 'cta',
                label: 'Call to Action',
                defaultValue: 'ORDER NOW',
                placeholder: 'CTA text...',
                visible: true,
                style: { fontSize: 15, fontWeight: '800', color: '#DC2626', textAlign: 'center', textTransform: 'uppercase' },
                position: { bottom: 14, left: 8 },
            },
            {
                id: 'business-name',
                type: 'text',
                label: 'Restaurant Name',
                defaultValue: 'SPICE GARDEN',
                placeholder: 'Your restaurant name...',
                visible: true,
                style: { fontSize: 13, fontWeight: '800', color: '#FDE047', textAlign: 'center', letterSpacing: 3, textTransform: 'uppercase' },
                position: { top: 4, right: 8 },
            },
            {
                id: 'logo',
                type: 'logo',
                label: 'Logo',
                defaultValue: '',
                placeholder: 'Upload logo...',
                visible: true,
                style: {},
                position: { top: 4, left: 8 },
            },
        ],
        decorations: { type: 'food', opacity: 0.15 },
        badge: { text: 'FREE DELIVERY', color: '#DC2626', bgColor: '#FDE047' },
        tags: ['food', 'restaurant', 'biryani', 'delivery', 'cuisine'],
    },

    // ============================================
    // 5. HAPPY HOLI SALE
    // ============================================
    {
        id: 'holi-sale-01',
        name: 'Holi Celebration',
        category: 'Festival Sale',
        categoryIcon: '🎨',
        description: 'Vibrant Holi festival sale template with colorful splashes',
        thumbnail: '🌈',
        aspectRatio: '1:1',
        backgroundImageUrl: 'https://images.pexels.com/photos/3447328/pexels-photo-3447328.jpeg?auto=compress&cs=tinysrgb&w=900&h=900&fit=crop',
        overlayOpacity: 0.56,
        colors: {
            primary: '#E91E63',
            secondary: '#FF9800',
            accent: '#4CAF50',
            background: ['#FF6F00', '#E91E63', '#9C27B0'] as const,
            textPrimary: '#FFFFFF',
            textSecondary: '#FFF9C4',
        },
        fields: [
            {
                id: 'festival',
                type: 'text',
                label: 'Festival Name',
                defaultValue: 'Happy Holi!',
                placeholder: 'Enter greeting...',
                visible: true,
                style: { fontSize: 38, fontWeight: '900', color: '#FFFFFF', textAlign: 'center', letterSpacing: 2 },
                position: { top: 10, left: 8 },
            },
            {
                id: 'offer-headline',
                type: 'tagline',
                label: 'Offer Headline',
                defaultValue: '🎉 COLOURFUL SALE 🎉',
                placeholder: 'Enter offer headline...',
                visible: true,
                style: { fontSize: 20, fontWeight: '800', color: '#FFF9C4', textAlign: 'center', letterSpacing: 2 },
                position: { top: 32, left: 8 },
            },
            {
                id: 'discount',
                type: 'text',
                label: 'Discount',
                defaultValue: 'UP TO\n50% OFF',
                placeholder: 'Enter discount...',
                visible: true,
                style: { fontSize: 36, fontWeight: '900', color: '#FFFFFF', textAlign: 'center' },
                position: { top: 42, left: 8 },
            },
            {
                id: 'validity',
                type: 'text',
                label: 'Validity',
                defaultValue: 'Valid: 10th - 15th March 2026',
                placeholder: 'Enter validity...',
                visible: true,
                style: { fontSize: 13, fontWeight: '600', color: '#FFF9C4', textAlign: 'center' },
                position: { top: 65, left: 8 },
            },
            {
                id: 'categories',
                type: 'text',
                label: 'Categories',
                defaultValue: 'Fashion • Electronics • Home Decor\nAll Categories Available!',
                placeholder: 'Enter categories...',
                visible: true,
                style: { fontSize: 13, fontWeight: '600', color: '#FFFFFF', textAlign: 'center' },
                position: { top: 72, left: 8 },
            },
            {
                id: 'phone',
                type: 'phone',
                label: 'Phone',
                defaultValue: '+91 98765 43210',
                placeholder: 'Enter phone...',
                visible: true,
                style: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', textAlign: 'center' },
                position: { bottom: 8, right: 8 },
            },
            {
                id: 'cta',
                type: 'cta',
                label: 'Call to Action',
                defaultValue: 'GRAB DEALS NOW',
                placeholder: 'CTA text...',
                visible: true,
                style: { fontSize: 15, fontWeight: '800', color: '#E91E63', textAlign: 'center', textTransform: 'uppercase' },
                position: { bottom: 14, left: 8 },
            },
            {
                id: 'business-name',
                type: 'text',
                label: 'Business Name',
                defaultValue: 'YOUR BUSINESS',
                placeholder: 'Your business name...',
                visible: true,
                style: { fontSize: 12, fontWeight: '700', color: '#FFFFFF', textAlign: 'center', letterSpacing: 3, textTransform: 'uppercase' },
                position: { top: 4, left: 8 },
            },
            {
                id: 'logo',
                type: 'logo',
                label: 'Logo',
                defaultValue: '',
                placeholder: 'Upload logo...',
                visible: true,
                style: {},
                position: { top: 4, left: 8 },
            },
        ],
        decorations: { type: 'festive', opacity: 0.25 },
        badge: { text: 'HOLI SPECIAL', color: '#FFFFFF', bgColor: '#E91E63' },
        tags: ['holi', 'festival', 'sale', 'colorful', 'celebration'],
    },

    // ============================================
    // 6. DIWALI SUPER SAVER SALE
    // ============================================
    {
        id: 'diwali-sale-01',
        name: 'Diwali Dhamaka',
        category: 'Festival Sale',
        categoryIcon: '🪔',
        description: 'Grand Diwali sale template with festive golden theme',
        thumbnail: '✨',
        aspectRatio: '1:1',
        backgroundImageUrl: 'https://images.pexels.com/photos/18849427/pexels-photo-18849427.jpeg?auto=compress&cs=tinysrgb&w=900&h=900&fit=crop',
        overlayOpacity: 0.7,
        colors: {
            primary: '#B8860B',
            secondary: '#FFD700',
            accent: '#FFF8DC',
            background: ['#1A0A2E', '#16213E', '#0F3460'] as const,
            textPrimary: '#FFD700',
            textSecondary: '#FFFFFF',
        },
        fields: [
            {
                id: 'festival',
                type: 'text',
                label: 'Festival Greeting',
                defaultValue: '🪔 Shubh Deepavali 🪔',
                placeholder: 'Enter greeting...',
                visible: true,
                style: { fontSize: 30, fontWeight: '900', color: '#FFD700', textAlign: 'center', letterSpacing: 1 },
                position: { top: 8, left: 8 },
            },
            {
                id: 'sale-headline',
                type: 'tagline',
                label: 'Sale Headline',
                defaultValue: 'DIWALI SUPER SAVER',
                placeholder: 'Enter headline...',
                visible: true,
                style: { fontSize: 24, fontWeight: '800', color: '#FFFFFF', textAlign: 'center', letterSpacing: 3 },
                position: { top: 28, left: 8 },
            },
            {
                id: 'discount',
                type: 'text',
                label: 'Main Offer',
                defaultValue: 'FLAT\n70% OFF',
                placeholder: 'Enter offer...',
                visible: true,
                style: { fontSize: 40, fontWeight: '900', color: '#FFD700', textAlign: 'center' },
                position: { top: 40, left: 8 },
            },
            {
                id: 'subtitle',
                type: 'text',
                label: 'Sub Offer',
                defaultValue: '+ Extra 10% Off on Orders Above ₹2999',
                placeholder: 'Enter sub offer...',
                visible: true,
                style: { fontSize: 13, fontWeight: '700', color: '#FFFFFF', textAlign: 'center' },
                position: { top: 62, left: 8 },
            },
            {
                id: 'products',
                type: 'text',
                label: 'Products',
                defaultValue: 'Clothing • Jewellery • Electronics • Home Décor',
                placeholder: 'Enter products...',
                visible: true,
                style: { fontSize: 12, fontWeight: '600', color: '#FFD700', textAlign: 'center' },
                position: { top: 70, left: 8 },
            },
            {
                id: 'phone',
                type: 'phone',
                label: 'Contact',
                defaultValue: '+91 98765 43210',
                placeholder: 'Enter phone...',
                visible: true,
                style: { fontSize: 14, fontWeight: '700', color: '#FFD700', textAlign: 'center' },
                position: { bottom: 8, right: 8 },
            },
            {
                id: 'cta',
                type: 'cta',
                label: 'Call to Action',
                defaultValue: 'SHOP THE SALE',
                placeholder: 'CTA text...',
                visible: true,
                style: { fontSize: 15, fontWeight: '800', color: '#1A0A2E', textAlign: 'center', textTransform: 'uppercase' },
                position: { bottom: 14, left: 8 },
            },
            {
                id: 'business-name',
                type: 'text',
                label: 'Business Name',
                defaultValue: 'YOUR BRAND',
                placeholder: 'Your business name...',
                visible: true,
                style: { fontSize: 12, fontWeight: '700', color: '#FFD700', textAlign: 'center', letterSpacing: 4, textTransform: 'uppercase' },
                position: { top: 3, left: 8 },
            },
            {
                id: 'logo',
                type: 'logo',
                label: 'Logo',
                defaultValue: '',
                placeholder: 'Upload logo...',
                visible: true,
                style: {},
                position: { top: 3, left: 8 },
            },
        ],
        decorations: { type: 'festive', opacity: 0.2 },
        badge: { text: 'MEGA SALE', color: '#1A0A2E', bgColor: '#FFD700' },
        tags: ['diwali', 'deepavali', 'festival', 'sale', 'mega', 'discount'],
    },

    // ============================================
    // 7. FASHION / CLOTHING STORE
    // ============================================
    {
        id: 'fashion-01',
        name: 'Fashion Forward',
        category: 'Fashion',
        categoryIcon: '👗',
        description: 'Trendy fashion store template for clothing businesses',
        thumbnail: '🛍️',
        aspectRatio: '1:1',
        backgroundImageUrl: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&q=80&fit=crop',
        overlayOpacity: 0.48,
        colors: {
            primary: '#1E1E1E',
            secondary: '#F472B6',
            accent: '#FDF2F8',
            background: ['#FDF2F8', '#FECDD3', '#F9A8D4'] as const,
            textPrimary: '#1E1E1E',
            textSecondary: '#9D174D',
        },
        fields: [
            {
                id: 'headline',
                type: 'text',
                label: 'Headline',
                defaultValue: 'New Collection\nArrived!',
                placeholder: 'Enter headline...',
                visible: true,
                style: { fontSize: 34, fontWeight: '900', color: '#1E1E1E', textAlign: 'left' },
                position: { top: 14, left: 8 },
            },
            {
                id: 'tagline',
                type: 'tagline',
                label: 'Tagline',
                defaultValue: 'Spring/Summer \'26 Collection',
                placeholder: 'Enter tagline...',
                visible: true,
                style: { fontSize: 16, fontWeight: '600', color: '#9D174D', textAlign: 'left' },
                position: { top: 38, left: 8 },
            },
            {
                id: 'offer',
                type: 'text',
                label: 'Offer',
                defaultValue: 'FLAT 40% OFF\non First Purchase',
                placeholder: 'Enter offer...',
                visible: true,
                style: { fontSize: 22, fontWeight: '800', color: '#BE185D', textAlign: 'left' },
                position: { top: 50, left: 8 },
            },
            {
                id: 'categories',
                type: 'text',
                label: 'Categories',
                defaultValue: 'Sarees • Kurtis • Lehengas • Western Wear',
                placeholder: 'Enter categories...',
                visible: true,
                style: { fontSize: 12, fontWeight: '600', color: '#4A4A4A', textAlign: 'left' },
                position: { top: 65, left: 8 },
            },
            {
                id: 'phone',
                type: 'phone',
                label: 'WhatsApp / Phone',
                defaultValue: '📱 +91 98765 43210',
                placeholder: 'Enter phone...',
                visible: true,
                style: { fontSize: 14, fontWeight: '700', color: '#1E1E1E', textAlign: 'center' },
                position: { bottom: 8, right: 8 },
            },
            {
                id: 'cta',
                type: 'cta',
                label: 'Call to Action',
                defaultValue: 'SHOP NOW',
                placeholder: 'CTA text...',
                visible: true,
                style: { fontSize: 15, fontWeight: '800', color: '#FFFFFF', textAlign: 'center', textTransform: 'uppercase' },
                position: { bottom: 14, left: 8 },
            },
            {
                id: 'business-name',
                type: 'text',
                label: 'Store Name',
                defaultValue: 'ETHNIC ELEGANCE',
                placeholder: 'Your store name...',
                visible: true,
                style: { fontSize: 12, fontWeight: '700', color: '#1E1E1E', textAlign: 'center', letterSpacing: 3, textTransform: 'uppercase' },
                position: { top: 5, right: 8 },
            },
            {
                id: 'logo',
                type: 'logo',
                label: 'Logo',
                defaultValue: '',
                placeholder: 'Upload logo...',
                visible: true,
                style: {},
                position: { top: 5, left: 8 },
            },
        ],
        decorations: { type: 'waves', opacity: 0.15 },
        badge: { text: 'TRENDING', color: '#FFFFFF', bgColor: '#BE185D' },
        tags: ['fashion', 'clothing', 'saree', 'kurti', 'ethnic', 'western'],
    },

    // ============================================
    // 8. SALON & BEAUTY
    // ============================================
    {
        id: 'salon-01',
        name: 'Glamour Studio',
        category: 'Salon & Beauty',
        categoryIcon: '💇‍♀️',
        description: 'Elegant salon and beauty parlour template',
        thumbnail: '✂️',
        aspectRatio: '1:1',
        backgroundImageUrl: 'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=800&q=80&fit=crop',
        overlayOpacity: 0.58,
        colors: {
            primary: '#9D174D',
            secondary: '#F472B6',
            accent: '#FDF2F8',
            background: ['#831843', '#9D174D', '#BE185D'] as const,
            textPrimary: '#FFFFFF',
            textSecondary: '#FBCFE8',
        },
        fields: [
            { id: 'headline', type: 'text', label: 'Headline', defaultValue: 'Look Your\nBest Today!', placeholder: 'Enter headline...', visible: true, style: { fontSize: 34, fontWeight: '900', color: '#FFFFFF', textAlign: 'left' }, position: { top: 12, left: 8 } },
            { id: 'services', type: 'tagline', label: 'Services', defaultValue: 'Hair • Makeup • Facial • Bridal', placeholder: 'Enter services...', visible: true, style: { fontSize: 14, fontWeight: '600', color: '#FBCFE8', textAlign: 'left' }, position: { top: 40, left: 8 } },
            { id: 'offer', type: 'text', label: 'Offer', defaultValue: 'FLAT 30% OFF\non First Visit', placeholder: 'Enter offer...', visible: true, style: { fontSize: 22, fontWeight: '800', color: '#FDE047', textAlign: 'left' }, position: { top: 50, left: 8 } },
            { id: 'phone', type: 'phone', label: 'Phone', defaultValue: '📞 +91 98765 43210', placeholder: 'Enter phone...', visible: true, style: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', textAlign: 'center' }, position: { bottom: 8, right: 8 } },
            { id: 'cta', type: 'cta', label: 'CTA', defaultValue: 'BOOK NOW', placeholder: 'CTA text...', visible: true, style: { fontSize: 15, fontWeight: '800', color: '#9D174D', textAlign: 'center', textTransform: 'uppercase' }, position: { bottom: 14, left: 8 } },
            { id: 'business-name', type: 'text', label: 'Salon Name', defaultValue: 'GLAMOUR STUDIO', placeholder: 'Your salon name...', visible: true, style: { fontSize: 12, fontWeight: '700', color: '#FBCFE8', textAlign: 'center', letterSpacing: 3, textTransform: 'uppercase' }, position: { top: 4, right: 8 } },
            { id: 'logo', type: 'logo', label: 'Logo', defaultValue: '', placeholder: 'Upload logo...', visible: true, style: {}, position: { top: 4, left: 8 } },
        ],
        decorations: { type: 'waves', opacity: 0.15 },
        badge: { text: 'NEW OFFER', color: '#FFFFFF', bgColor: '#F472B6' },
        tags: ['salon', 'beauty', 'hair', 'makeup', 'spa', 'bridal'],
    },

    // ============================================
    // 9. GYM & FITNESS
    // ============================================
    {
        id: 'gym-01',
        name: 'Power Fitness',
        category: 'Gym & Fitness',
        categoryIcon: '💪',
        description: 'Bold fitness and gym template',
        thumbnail: '🏋️',
        aspectRatio: '1:1',
        backgroundImageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80&fit=crop',
        overlayOpacity: 0.7,
        colors: {
            primary: '#DC2626',
            secondary: '#FBBF24',
            accent: '#FEF3C7',
            background: ['#0F0F0F', '#1A1A1A', '#2D2D2D'] as const,
            textPrimary: '#FFFFFF',
            textSecondary: '#FBBF24',
        },
        fields: [
            { id: 'headline', type: 'text', label: 'Headline', defaultValue: 'Transform\nYour Body', placeholder: 'Enter headline...', visible: true, style: { fontSize: 34, fontWeight: '900', color: '#FFFFFF', textAlign: 'left' }, position: { top: 12, left: 8 } },
            { id: 'offer', type: 'tagline', label: 'Offer', defaultValue: 'JOIN TODAY - 50% OFF', placeholder: 'Enter offer...', visible: true, style: { fontSize: 18, fontWeight: '800', color: '#FBBF24', textAlign: 'left', letterSpacing: 1 }, position: { top: 40, left: 8 } },
            { id: 'features', type: 'text', label: 'Features', defaultValue: '🏋️ Personal Training\n🥊 Crossfit\n🧘 Yoga & Zumba', placeholder: 'Enter features...', visible: true, style: { fontSize: 14, fontWeight: '600', color: '#FFFFFF', textAlign: 'left' }, position: { top: 52, left: 8 } },
            { id: 'phone', type: 'phone', label: 'Phone', defaultValue: '+91 98765 43210', placeholder: 'Enter phone...', visible: true, style: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', textAlign: 'center' }, position: { bottom: 8, right: 8 } },
            { id: 'cta', type: 'cta', label: 'CTA', defaultValue: 'JOIN NOW', placeholder: 'CTA text...', visible: true, style: { fontSize: 15, fontWeight: '800', color: '#0F0F0F', textAlign: 'center', textTransform: 'uppercase' }, position: { bottom: 14, left: 8 } },
            { id: 'business-name', type: 'text', label: 'Gym Name', defaultValue: 'POWER FITNESS', placeholder: 'Your gym name...', visible: true, style: { fontSize: 12, fontWeight: '700', color: '#DC2626', textAlign: 'center', letterSpacing: 3, textTransform: 'uppercase' }, position: { top: 4, right: 8 } },
            { id: 'logo', type: 'logo', label: 'Logo', defaultValue: '', placeholder: 'Upload logo...', visible: true, style: {}, position: { top: 4, left: 8 } },
        ],
        decorations: { type: 'geometric', opacity: 0.2 },
        badge: { text: 'LIMITED OFFER', color: '#0F0F0F', bgColor: '#FBBF24' },
        tags: ['gym', 'fitness', 'workout', 'health', 'training'],
    },

    // ============================================
    // 10. EDUCATION / COACHING
    // ============================================
    {
        id: 'education-01',
        name: 'Smart Academy',
        category: 'Education',
        categoryIcon: '📚',
        description: 'Education and coaching institute template',
        thumbnail: '🎓',
        aspectRatio: '1:1',
        backgroundImageUrl: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&q=80&fit=crop',
        overlayOpacity: 0.62,
        colors: {
            primary: '#1565C0',
            secondary: '#42A5F5',
            accent: '#E3F2FD',
            background: ['#0D47A1', '#1565C0', '#1976D2'] as const,
            textPrimary: '#FFFFFF',
            textSecondary: '#BBDEFB',
        },
        fields: [
            { id: 'headline', type: 'text', label: 'Headline', defaultValue: 'Admissions\nOpen 2026-27', placeholder: 'Enter headline...', visible: true, style: { fontSize: 32, fontWeight: '900', color: '#FFFFFF', textAlign: 'left' }, position: { top: 12, left: 8 } },
            { id: 'courses', type: 'tagline', label: 'Courses', defaultValue: 'IIT-JEE • NEET • Board Exams', placeholder: 'Enter courses...', visible: true, style: { fontSize: 15, fontWeight: '600', color: '#BBDEFB', textAlign: 'left' }, position: { top: 38, left: 8 } },
            { id: 'features', type: 'text', label: 'Features', defaultValue: '✅ Expert Faculty\n✅ Small Batch Size\n✅ Study Material Included', placeholder: 'Enter features...', visible: true, style: { fontSize: 13, fontWeight: '600', color: '#FFFFFF', textAlign: 'left' }, position: { top: 50, left: 8 } },
            { id: 'result', type: 'text', label: 'Result', defaultValue: '🏆 100% Result in 2025', placeholder: 'Enter result...', visible: true, style: { fontSize: 16, fontWeight: '800', color: '#FFCA28', textAlign: 'center' }, position: { top: 70, left: 8 } },
            { id: 'phone', type: 'phone', label: 'Phone', defaultValue: '+91 98765 43210', placeholder: 'Enter phone...', visible: true, style: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', textAlign: 'center' }, position: { bottom: 8, right: 8 } },
            { id: 'cta', type: 'cta', label: 'CTA', defaultValue: 'ENROLL NOW', placeholder: 'CTA text...', visible: true, style: { fontSize: 14, fontWeight: '800', color: '#0D47A1', textAlign: 'center', textTransform: 'uppercase' }, position: { bottom: 14, left: 8 } },
            { id: 'business-name', type: 'text', label: 'Institute Name', defaultValue: 'SMART ACADEMY', placeholder: 'Your institute name...', visible: true, style: { fontSize: 12, fontWeight: '700', color: '#BBDEFB', textAlign: 'center', letterSpacing: 3, textTransform: 'uppercase' }, position: { top: 4, right: 8 } },
            { id: 'logo', type: 'logo', label: 'Logo', defaultValue: '', placeholder: 'Upload logo...', visible: true, style: {}, position: { top: 4, left: 8 } },
        ],
        decorations: { type: 'geometric', opacity: 0.15 },
        badge: { text: 'ADMISSIONS OPEN', color: '#0D47A1', bgColor: '#FFCA28' },
        tags: ['education', 'coaching', 'tuition', 'academy', 'school', 'college'],
    },

    // ============================================
    // 11. AUTOMOBILE / CAR DEALER
    // ============================================
    {
        id: 'auto-01',
        name: 'Auto Hub',
        category: 'Automobile',
        categoryIcon: '🚗',
        description: 'Car dealership and automobile service template',
        thumbnail: '🏎️',
        aspectRatio: '1:1',
        backgroundImageUrl: 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800&q=80&fit=crop',
        overlayOpacity: 0.65,
        colors: {
            primary: '#1A1A2E',
            secondary: '#E94560',
            accent: '#0F3460',
            background: ['#16213E', '#0F3460', '#1A1A2E'] as const,
            textPrimary: '#FFFFFF',
            textSecondary: '#E94560',
        },
        fields: [
            { id: 'headline', type: 'text', label: 'Headline', defaultValue: 'Pre-Owned\nCars Sale', placeholder: 'Enter headline...', visible: true, style: { fontSize: 34, fontWeight: '900', color: '#FFFFFF', textAlign: 'left' }, position: { top: 12, left: 8 } },
            { id: 'offer', type: 'tagline', label: 'Offer', defaultValue: 'EMI Starting ₹4,999/month', placeholder: 'Enter offer...', visible: true, style: { fontSize: 16, fontWeight: '700', color: '#E94560', textAlign: 'left' }, position: { top: 40, left: 8 } },
            { id: 'features', type: 'text', label: 'Features', defaultValue: '✅ Certified Cars\n✅ Easy Finance\n✅ Free RC Transfer', placeholder: 'Enter features...', visible: true, style: { fontSize: 13, fontWeight: '600', color: '#FFFFFF', textAlign: 'left' }, position: { top: 52, left: 8 } },
            { id: 'phone', type: 'phone', label: 'Phone', defaultValue: '+91 98765 43210', placeholder: 'Enter phone...', visible: true, style: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', textAlign: 'center' }, position: { bottom: 8, right: 8 } },
            { id: 'cta', type: 'cta', label: 'CTA', defaultValue: 'BOOK TEST DRIVE', placeholder: 'CTA text...', visible: true, style: { fontSize: 14, fontWeight: '800', color: '#1A1A2E', textAlign: 'center', textTransform: 'uppercase' }, position: { bottom: 14, left: 8 } },
            { id: 'business-name', type: 'text', label: 'Dealer Name', defaultValue: 'AUTO HUB', placeholder: 'Your dealer name...', visible: true, style: { fontSize: 12, fontWeight: '700', color: '#E94560', textAlign: 'center', letterSpacing: 3, textTransform: 'uppercase' }, position: { top: 4, right: 8 } },
            { id: 'logo', type: 'logo', label: 'Logo', defaultValue: '', placeholder: 'Upload logo...', visible: true, style: {}, position: { top: 4, left: 8 } },
        ],
        decorations: { type: 'geometric', opacity: 0.15 },
        badge: { text: 'BEST DEALS', color: '#FFFFFF', bgColor: '#E94560' },
        tags: ['automobile', 'car', 'dealer', 'vehicle', 'auto'],
    },

    // ============================================
    // 12. MEDICAL / DOCTOR
    // ============================================
    {
        id: 'medical-01',
        name: 'Health Plus',
        category: 'Healthcare',
        categoryIcon: '🏥',
        description: 'Doctor clinic and healthcare template',
        thumbnail: '⚕️',
        aspectRatio: '1:1',
        backgroundImageUrl: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&q=80&fit=crop',
        overlayOpacity: 0.6,
        colors: {
            primary: '#00695C',
            secondary: '#26A69A',
            accent: '#E0F2F1',
            background: ['#004D40', '#00695C', '#00796B'] as const,
            textPrimary: '#FFFFFF',
            textSecondary: '#B2DFDB',
        },
        fields: [
            { id: 'headline', type: 'text', label: 'Headline', defaultValue: 'Your Health\nOur Priority', placeholder: 'Enter headline...', visible: true, style: { fontSize: 32, fontWeight: '900', color: '#FFFFFF', textAlign: 'left' }, position: { top: 12, left: 8 } },
            { id: 'doctor', type: 'tagline', label: 'Doctor Name', defaultValue: 'Dr. Sharma | MBBS, MD', placeholder: 'Enter doctor name...', visible: true, style: { fontSize: 15, fontWeight: '600', color: '#B2DFDB', textAlign: 'left' }, position: { top: 38, left: 8 } },
            { id: 'services', type: 'text', label: 'Services', defaultValue: 'General Medicine • Pediatrics\nCardiology • Orthopedics', placeholder: 'Enter services...', visible: true, style: { fontSize: 13, fontWeight: '600', color: '#FFFFFF', textAlign: 'left' }, position: { top: 50, left: 8 } },
            { id: 'timing', type: 'text', label: 'Timing', defaultValue: '🕐 Mon-Sat: 9 AM - 8 PM', placeholder: 'Enter timing...', visible: true, style: { fontSize: 13, fontWeight: '600', color: '#B2DFDB', textAlign: 'left' }, position: { top: 65, left: 8 } },
            { id: 'phone', type: 'phone', label: 'Phone', defaultValue: '+91 98765 43210', placeholder: 'Enter phone...', visible: true, style: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', textAlign: 'center' }, position: { bottom: 8, right: 8 } },
            { id: 'cta', type: 'cta', label: 'CTA', defaultValue: 'BOOK APPOINTMENT', placeholder: 'CTA text...', visible: true, style: { fontSize: 14, fontWeight: '800', color: '#004D40', textAlign: 'center', textTransform: 'uppercase' }, position: { bottom: 14, left: 8 } },
            { id: 'business-name', type: 'text', label: 'Clinic Name', defaultValue: 'HEALTH PLUS CLINIC', placeholder: 'Your clinic name...', visible: true, style: { fontSize: 11, fontWeight: '700', color: '#B2DFDB', textAlign: 'center', letterSpacing: 3, textTransform: 'uppercase' }, position: { top: 4, right: 8 } },
            { id: 'logo', type: 'logo', label: 'Logo', defaultValue: '', placeholder: 'Upload logo...', visible: true, style: {}, position: { top: 4, left: 8 } },
        ],
        decorations: { type: 'minimal', opacity: 0.1 },
        badge: { text: 'OPEN TODAY', color: '#004D40', bgColor: '#80CBC4' },
        tags: ['medical', 'doctor', 'clinic', 'health', 'hospital', 'healthcare'],
    },

    // ============================================
    // 13. GROCERY / KIRANA
    // ============================================
    {
        id: 'grocery-01',
        name: 'Fresh Mart',
        category: 'Grocery',
        categoryIcon: '🛒',
        description: 'Grocery store and kirana shop template',
        thumbnail: '🥬',
        aspectRatio: '1:1',
        backgroundImageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80&fit=crop',
        overlayOpacity: 0.55,
        colors: {
            primary: '#2E7D32',
            secondary: '#66BB6A',
            accent: '#E8F5E9',
            background: ['#1B5E20', '#2E7D32', '#388E3C'] as const,
            textPrimary: '#FFFFFF',
            textSecondary: '#C8E6C9',
        },
        fields: [
            { id: 'headline', type: 'text', label: 'Headline', defaultValue: 'Fresh Groceries\nAt Your Door', placeholder: 'Enter headline...', visible: true, style: { fontSize: 32, fontWeight: '900', color: '#FFFFFF', textAlign: 'left' }, position: { top: 12, left: 8 } },
            { id: 'offer', type: 'tagline', label: 'Offer', defaultValue: '🔥 Up to 40% OFF on Daily Needs', placeholder: 'Enter offer...', visible: true, style: { fontSize: 16, fontWeight: '700', color: '#FFCA28', textAlign: 'left' }, position: { top: 38, left: 8 } },
            { id: 'products', type: 'text', label: 'Products', defaultValue: 'Fruits • Vegetables • Dairy\nAtta • Rice • Pulses • Oil', placeholder: 'Enter products...', visible: true, style: { fontSize: 14, fontWeight: '600', color: '#FFFFFF', textAlign: 'left' }, position: { top: 50, left: 8 } },
            { id: 'delivery', type: 'text', label: 'Delivery', defaultValue: '🚚 Free Delivery on ₹500+ Orders', placeholder: 'Enter delivery...', visible: true, style: { fontSize: 13, fontWeight: '600', color: '#C8E6C9', textAlign: 'left' }, position: { top: 65, left: 8 } },
            { id: 'phone', type: 'phone', label: 'Phone', defaultValue: '+91 98765 43210', placeholder: 'Enter phone...', visible: true, style: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', textAlign: 'center' }, position: { bottom: 8, right: 8 } },
            { id: 'cta', type: 'cta', label: 'CTA', defaultValue: 'ORDER NOW', placeholder: 'CTA text...', visible: true, style: { fontSize: 15, fontWeight: '800', color: '#1B5E20', textAlign: 'center', textTransform: 'uppercase' }, position: { bottom: 14, left: 8 } },
            { id: 'business-name', type: 'text', label: 'Store Name', defaultValue: 'FRESH MART', placeholder: 'Your store name...', visible: true, style: { fontSize: 12, fontWeight: '700', color: '#C8E6C9', textAlign: 'center', letterSpacing: 3, textTransform: 'uppercase' }, position: { top: 4, right: 8 } },
            { id: 'logo', type: 'logo', label: 'Logo', defaultValue: '', placeholder: 'Upload logo...', visible: true, style: {}, position: { top: 4, left: 8 } },
        ],
        decorations: { type: 'minimal', opacity: 0.12 },
        badge: { text: 'FREE DELIVERY', color: '#1B5E20', bgColor: '#A5D6A7' },
        tags: ['grocery', 'kirana', 'supermarket', 'vegetables', 'fruits', 'organic'],
    },

    // ============================================
    // 14. JEWELLERY
    // ============================================
    {
        id: 'jewellery-01',
        name: 'Royal Jewels',
        category: 'Jewellery',
        categoryIcon: '💎',
        description: 'Luxury jewellery store template',
        thumbnail: '👑',
        aspectRatio: '1:1',
        backgroundImageUrl: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800&q=80&fit=crop',
        overlayOpacity: 0.58,
        colors: {
            primary: '#B8860B',
            secondary: '#FFD700',
            accent: '#FFF8DC',
            background: ['#1A0A2E', '#2D1B69', '#0F3460'] as const,
            textPrimary: '#FFD700',
            textSecondary: '#FFFFFF',
        },
        fields: [
            { id: 'headline', type: 'text', label: 'Headline', defaultValue: 'Exquisite\nJewellery\nCollection', placeholder: 'Enter headline...', visible: true, style: { fontSize: 32, fontWeight: '900', color: '#FFD700', textAlign: 'center' }, position: { top: 12, left: 8 } },
            { id: 'tagline', type: 'tagline', label: 'Tagline', defaultValue: '✨ Crafted with Love ✨', placeholder: 'Enter tagline...', visible: true, style: { fontSize: 14, fontWeight: '600', color: '#FFFFFF', textAlign: 'center' }, position: { top: 42, left: 8 } },
            { id: 'categories', type: 'text', label: 'Categories', defaultValue: 'Gold • Diamond • Silver • Kundan', placeholder: 'Enter categories...', visible: true, style: { fontSize: 14, fontWeight: '600', color: '#FFD700', textAlign: 'center' }, position: { top: 55, left: 8 } },
            { id: 'offer', type: 'text', label: 'Offer', defaultValue: 'Making Charges Starting ₹199/gm', placeholder: 'Enter offer...', visible: true, style: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', textAlign: 'center' }, position: { top: 65, left: 8 } },
            { id: 'phone', type: 'phone', label: 'Phone', defaultValue: '+91 98765 43210', placeholder: 'Enter phone...', visible: true, style: { fontSize: 14, fontWeight: '700', color: '#FFD700', textAlign: 'center' }, position: { bottom: 8, right: 8 } },
            { id: 'cta', type: 'cta', label: 'CTA', defaultValue: 'VISIT STORE', placeholder: 'CTA text...', visible: true, style: { fontSize: 14, fontWeight: '800', color: '#1A0A2E', textAlign: 'center', textTransform: 'uppercase' }, position: { bottom: 14, left: 8 } },
            { id: 'business-name', type: 'text', label: 'Store Name', defaultValue: 'ROYAL JEWELS', placeholder: 'Your store name...', visible: true, style: { fontSize: 12, fontWeight: '700', color: '#FFD700', textAlign: 'center', letterSpacing: 4, textTransform: 'uppercase' }, position: { top: 4, left: 8 } },
            { id: 'logo', type: 'logo', label: 'Logo', defaultValue: '', placeholder: 'Upload logo...', visible: true, style: {}, position: { top: 4, left: 8 } },
        ],
        decorations: { type: 'minimal', opacity: 0.1 },
        badge: { text: 'BIS HALLMARK', color: '#1A0A2E', bgColor: '#FFD700' },
        tags: ['jewellery', 'gold', 'diamond', 'silver', 'wedding', 'bridal'],
    },

    // ============================================
    // 15. TRAVEL & TOURISM
    // ============================================
    {
        id: 'travel-01',
        name: 'Wanderlust Tours',
        category: 'Travel',
        categoryIcon: '✈️',
        description: 'Travel agency and tour package template',
        thumbnail: '🌍',
        aspectRatio: '1:1',
        backgroundImageUrl: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&q=80&fit=crop',
        overlayOpacity: 0.52,
        colors: {
            primary: '#0277BD',
            secondary: '#4FC3F7',
            accent: '#E1F5FE',
            background: ['#01579B', '#0277BD', '#0288D1'] as const,
            textPrimary: '#FFFFFF',
            textSecondary: '#B3E5FC',
        },
        fields: [
            { id: 'headline', type: 'text', label: 'Headline', defaultValue: 'Explore\nIncredible\nIndia!', placeholder: 'Enter headline...', visible: true, style: { fontSize: 34, fontWeight: '900', color: '#FFFFFF', textAlign: 'left' }, position: { top: 12, left: 8 } },
            { id: 'package', type: 'tagline', label: 'Package', defaultValue: 'Goa 3N/4D Package', placeholder: 'Enter package...', visible: true, style: { fontSize: 16, fontWeight: '700', color: '#FFCA28', textAlign: 'left' }, position: { top: 40, left: 8 } },
            { id: 'price', type: 'text', label: 'Price', defaultValue: 'Starting ₹8,999\nper person', placeholder: 'Enter price...', visible: true, style: { fontSize: 20, fontWeight: '800', color: '#FFFFFF', textAlign: 'left' }, position: { top: 50, left: 8 } },
            { id: 'includes', type: 'text', label: 'Includes', defaultValue: '🏨 Hotel • 🚗 Transport • 🍽️ Meals', placeholder: 'Enter includes...', visible: true, style: { fontSize: 12, fontWeight: '600', color: '#B3E5FC', textAlign: 'left' }, position: { top: 65, left: 8 } },
            { id: 'phone', type: 'phone', label: 'Phone', defaultValue: '+91 98765 43210', placeholder: 'Enter phone...', visible: true, style: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', textAlign: 'center' }, position: { bottom: 8, right: 8 } },
            { id: 'cta', type: 'cta', label: 'CTA', defaultValue: 'BOOK NOW', placeholder: 'CTA text...', visible: true, style: { fontSize: 15, fontWeight: '800', color: '#01579B', textAlign: 'center', textTransform: 'uppercase' }, position: { bottom: 14, left: 8 } },
            { id: 'business-name', type: 'text', label: 'Agency Name', defaultValue: 'WANDERLUST TOURS', placeholder: 'Your agency name...', visible: true, style: { fontSize: 11, fontWeight: '700', color: '#B3E5FC', textAlign: 'center', letterSpacing: 3, textTransform: 'uppercase' }, position: { top: 4, right: 8 } },
            { id: 'logo', type: 'logo', label: 'Logo', defaultValue: '', placeholder: 'Upload logo...', visible: true, style: {}, position: { top: 4, left: 8 } },
        ],
        decorations: { type: 'waves', opacity: 0.15 },
        badge: { text: 'BEST DEAL', color: '#01579B', bgColor: '#4FC3F7' },
        tags: ['travel', 'tourism', 'tour', 'holiday', 'vacation', 'trip'],
    },
];

const templateVariants: Array<{
    sourceId: string;
    id: string;
    name: string;
    description?: string;
    backgroundImageUrl?: string;
    overlayOpacity?: number;
    badgeText?: string;
    headline?: string;
    tagline?: string;
    offer?: string;
    tags?: string[];
}> = [
    {
        sourceId: 'real-estate-01',
        id: 'real-estate-02',
        name: 'Luxury Villa',
        backgroundImageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=900&q=80&fit=crop',
        headline: 'Luxury Villa\nFor Sale',
        tagline: 'Independent Homes | Prime Location',
        offer: 'Starting ₹1.2 Cr*',
        badgeText: 'NEW LAUNCH',
    },
    {
        sourceId: 'real-estate-01',
        id: 'real-estate-03',
        name: 'Rental Homes',
        backgroundImageUrl: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=900&q=80&fit=crop',
        headline: 'Move-In Ready\nRental Homes',
        tagline: 'Fully Furnished Apartments',
        offer: 'From ₹18,000/month',
        badgeText: 'NO BROKERAGE',
    },
    {
        sourceId: 'electronics-01',
        id: 'electronics-02',
        name: 'Mobile Exchange',
        backgroundImageUrl: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=900&q=80&fit=crop',
        headline: 'Exchange Your\nOld Phone',
        tagline: 'Instant Value | Same Day Upgrade',
        offer: 'UP TO ₹15,000 BONUS',
        badgeText: 'EXCHANGE DEAL',
    },
    {
        sourceId: 'electronics-01',
        id: 'electronics-03',
        name: 'Laptop Bazaar',
        backgroundImageUrl: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=900&q=80&fit=crop',
        headline: 'Refurbished\nLaptops Sale',
        tagline: 'Business Laptops With Warranty',
        offer: 'STARTING ₹14,999',
        badgeText: 'WARRANTY',
    },
    {
        sourceId: 'dryfruits-01',
        id: 'dryfruits-02',
        name: 'Dry Fruit Gift Box',
        backgroundImageUrl: 'https://images.pexels.com/photos/7407264/pexels-photo-7407264.jpeg?auto=compress&cs=tinysrgb&w=900&h=900&fit=crop',
        headline: 'Premium Gift\nHampers',
        tagline: 'Festive Packs | Bulk Orders',
        offer: 'Custom Boxes From ₹499',
        badgeText: 'GIFT PACKS',
    },
    {
        sourceId: 'dryfruits-01',
        id: 'dryfruits-03',
        name: 'Healthy Nuts',
        backgroundImageUrl: 'https://images.pexels.com/photos/14048852/pexels-photo-14048852.jpeg?auto=compress&cs=tinysrgb&w=900&h=900&fit=crop',
        headline: 'Healthy Nuts\nDaily Fresh',
        tagline: 'Almonds | Walnuts | Pistachios',
        offer: 'Save 15% On Family Packs',
        badgeText: 'FRESH STOCK',
    },
    {
        sourceId: 'food-restaurant-01',
        id: 'food-restaurant-02',
        name: 'Biryani Feast',
        backgroundImageUrl: 'https://images.pexels.com/photos/4224314/pexels-photo-4224314.jpeg?auto=compress&cs=tinysrgb&w=900&h=900&fit=crop',
        headline: 'Weekend\nBiryani Feast!',
        tagline: 'Dum Biryani | Kebabs | Raita',
        offer: 'BUY 1 GET 1',
        badgeText: 'HOT DEAL',
    },
    {
        sourceId: 'food-restaurant-01',
        id: 'food-restaurant-03',
        name: 'Cafe Combo',
        backgroundImageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=900&q=80&fit=crop',
        headline: 'Cafe Combos\nFor Two',
        tagline: 'Pizza • Pasta • Coffee',
        offer: 'COMBOS FROM ₹299',
        badgeText: 'CAFE SPECIAL',
    },
    {
        sourceId: 'holi-sale-01',
        id: 'holi-sale-02',
        name: 'Holi Mega Deals',
        backgroundImageUrl: 'https://images.pexels.com/photos/2635390/pexels-photo-2635390.jpeg?auto=compress&cs=tinysrgb&w=900&h=900&fit=crop',
        headline: 'Happy Holi\nMega Deals',
        tagline: 'Colours, Style & Celebration',
        offer: 'UP TO\n60% OFF',
        badgeText: 'HOLI DEALS',
    },
    {
        sourceId: 'diwali-sale-01',
        id: 'diwali-sale-02',
        name: 'Diwali Lights Sale',
        backgroundImageUrl: 'https://images.pexels.com/photos/33243963/pexels-photo-33243963.jpeg?auto=compress&cs=tinysrgb&w=900&h=900&fit=crop',
        headline: 'Festival Of\nLights Sale',
        tagline: 'DIWALI DHAMAKA OFFERS',
        offer: 'FLAT\n55% OFF',
        badgeText: 'DIWALI SPECIAL',
    },
    {
        sourceId: 'diwali-sale-01',
        id: 'diwali-sale-03',
        name: 'Diwali Home Decor',
        backgroundImageUrl: 'https://images.pexels.com/photos/34400035/pexels-photo-34400035.jpeg?auto=compress&cs=tinysrgb&w=900&h=900&fit=crop',
        headline: 'Brighten Your\nHome',
        tagline: 'Decor • Gifts • Festive Picks',
        offer: 'STARTING\n₹199',
        badgeText: 'NEW ARRIVALS',
    },
    {
        sourceId: 'fashion-01',
        id: 'fashion-02',
        name: 'Ethnic Festive',
        backgroundImageUrl: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=900&q=80&fit=crop',
        headline: 'Festive Wear\nCollection',
        tagline: 'Sarees | Lehengas | Kurtis',
        offer: 'FLAT 35% OFF',
        badgeText: 'FESTIVE DROP',
    },
    {
        sourceId: 'fashion-01',
        id: 'fashion-03',
        name: 'Street Style',
        backgroundImageUrl: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=900&q=80&fit=crop',
        headline: 'Street Style\nArrivals',
        tagline: 'Trendy Looks For Every Day',
        offer: 'BUY 2 SAVE 20%',
        badgeText: 'TRENDING',
    },
    {
        sourceId: 'salon-01',
        id: 'salon-02',
        name: 'Bridal Glow',
        backgroundImageUrl: 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=900&q=80&fit=crop',
        headline: 'Bridal Glow\nPackages',
        tagline: 'Makeup • Hair • Facial',
        offer: 'SAVE ₹2,000',
        badgeText: 'BRIDAL',
    },
    {
        sourceId: 'salon-01',
        id: 'salon-03',
        name: 'Hair Makeover',
        backgroundImageUrl: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=900&q=80&fit=crop',
        headline: 'Hair Makeover\nWeek',
        tagline: 'Cut • Color • Keratin',
        offer: 'FLAT 25% OFF',
        badgeText: 'BOOK TODAY',
    },
    {
        sourceId: 'gym-01',
        id: 'gym-02',
        name: 'Weight Loss Plan',
        backgroundImageUrl: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=900&q=80&fit=crop',
        headline: 'Lose Weight\nFeel Strong',
        tagline: 'Trainer + Diet Plan Included',
        offer: 'JOIN AT ₹999',
        badgeText: 'NEW BATCH',
    },
    {
        sourceId: 'gym-01',
        id: 'gym-03',
        name: 'Yoga Studio',
        backgroundImageUrl: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=900&q=80&fit=crop',
        headline: 'Morning Yoga\nSessions',
        tagline: 'Flexibility • Strength • Calm',
        offer: '7 DAY FREE TRIAL',
        badgeText: 'TRIAL OPEN',
    },
    {
        sourceId: 'education-01',
        id: 'education-02',
        name: 'Kids Tuition',
        backgroundImageUrl: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=900&q=80&fit=crop',
        headline: 'Tuition Classes\nNow Open',
        tagline: 'Class 1-10 | All Subjects',
        offer: 'FREE DEMO CLASS',
        badgeText: 'DEMO OPEN',
    },
    {
        sourceId: 'education-01',
        id: 'education-03',
        name: 'Computer Course',
        backgroundImageUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=900&q=80&fit=crop',
        headline: 'Computer\nCourses',
        tagline: 'Tally | Excel | Coding',
        offer: 'CERTIFICATE INCLUDED',
        badgeText: 'JOB SKILLS',
    },
    {
        sourceId: 'auto-01',
        id: 'auto-02',
        name: 'Car Service',
        backgroundImageUrl: 'https://images.unsplash.com/photo-1487754180451-c456f719a1fc?w=900&q=80&fit=crop',
        headline: 'Car Service\nCamp',
        tagline: 'Oil Change | AC | Full Checkup',
        offer: 'STARTING ₹999',
        badgeText: 'SERVICE CAMP',
    },
    {
        sourceId: 'auto-01',
        id: 'auto-03',
        name: 'Bike Deals',
        backgroundImageUrl: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=900&q=80&fit=crop',
        headline: 'Pre-Owned\nBike Sale',
        tagline: 'Verified Bikes | Easy EMI',
        offer: 'FROM ₹29,999',
        badgeText: 'BIKE DEALS',
    },
    {
        sourceId: 'medical-01',
        id: 'medical-02',
        name: 'Dental Care',
        backgroundImageUrl: 'https://images.unsplash.com/photo-1606811971618-4486d14f3f99?w=900&q=80&fit=crop',
        headline: 'Smile Care\nClinic',
        tagline: 'Dental Checkup | Cleaning',
        offer: 'FREE CONSULTATION',
        badgeText: 'DENTAL',
    },
    {
        sourceId: 'medical-01',
        id: 'medical-03',
        name: 'Health Checkup',
        backgroundImageUrl: 'https://images.unsplash.com/photo-1584982751601-97dcc096659c?w=900&q=80&fit=crop',
        headline: 'Full Body\nCheckup',
        tagline: 'Reports Same Day',
        offer: 'PACKAGES FROM ₹799',
        badgeText: 'HEALTH CAMP',
    },
    {
        sourceId: 'grocery-01',
        id: 'grocery-02',
        name: 'Fruit Basket',
        backgroundImageUrl: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=900&q=80&fit=crop',
        headline: 'Fresh Fruits\nDaily',
        tagline: 'Seasonal | Imported | Organic',
        offer: 'COMBOS FROM ₹299',
        badgeText: 'FRESH TODAY',
    },
    {
        sourceId: 'grocery-01',
        id: 'grocery-03',
        name: 'Monthly Grocery',
        backgroundImageUrl: 'https://images.unsplash.com/photo-1543168256-418811576931?w=900&q=80&fit=crop',
        headline: 'Monthly Grocery\nSaver',
        tagline: 'Atta • Rice • Oil • Pulses',
        offer: 'SAVE UP TO 20%',
        badgeText: 'MONTHLY PACK',
    },
    {
        sourceId: 'jewellery-01',
        id: 'jewellery-02',
        name: 'Gold Bangles',
        backgroundImageUrl: 'https://images.unsplash.com/photo-1601121141461-9d6647bca1ed?w=900&q=80&fit=crop',
        headline: 'Gold Bangles\nCollection',
        tagline: 'Traditional | Daily Wear',
        offer: 'LOW MAKING CHARGES',
        badgeText: 'HALLMARK',
    },
    {
        sourceId: 'jewellery-01',
        id: 'jewellery-03',
        name: 'Bridal Jewellery',
        backgroundImageUrl: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=900&q=80&fit=crop',
        headline: 'Bridal\nJewellery Sets',
        tagline: 'Gold • Kundan • Diamond',
        offer: 'BOOKINGS OPEN',
        badgeText: 'BRIDAL',
    },
    {
        sourceId: 'travel-01',
        id: 'travel-02',
        name: 'Goa Holiday',
        backgroundImageUrl: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=900&q=80&fit=crop',
        headline: 'Goa Holiday\nPackages',
        tagline: 'Beach Stay | Sightseeing',
        offer: 'FROM ₹7,999',
        badgeText: 'GOA DEAL',
    },
    {
        sourceId: 'travel-01',
        id: 'travel-03',
        name: 'Himachal Trip',
        backgroundImageUrl: 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=900&q=80&fit=crop',
        headline: 'Himachal\nGetaway',
        tagline: 'Manali • Shimla • Kasol',
        offer: '4N/5D FROM ₹9,999',
        badgeText: 'HILL TRIP',
    },
];

const cloneTemplate = (variant: typeof templateVariants[number]): DesignTemplate => {
    const source = DESIGN_TEMPLATES.find(template => template.id === variant.sourceId);
    if (!source) {
        throw new Error(`Missing template source: ${variant.sourceId}`);
    }

    const clonedFields = source.fields.map(field => {
        let defaultValue = field.defaultValue;

        if (field.id === 'headline' || field.id === 'festival') {
            defaultValue = variant.headline ?? defaultValue;
        } else if (field.type === 'tagline' || field.id === 'sale-headline' || field.id === 'property-type') {
            defaultValue = variant.tagline ?? defaultValue;
        } else if (field.id === 'discount' || field.id === 'price' || field.id === 'offer') {
            defaultValue = variant.offer ?? defaultValue;
        }

        return { ...field, defaultValue, style: { ...field.style }, position: { ...field.position } };
    });

    return {
        ...source,
        id: variant.id,
        name: variant.name,
        description: variant.description ?? source.description,
        backgroundImageUrl: variant.backgroundImageUrl ?? source.backgroundImageUrl,
        overlayOpacity: variant.overlayOpacity ?? source.overlayOpacity,
        fields: clonedFields,
        badge: source.badge
            ? { ...source.badge, text: variant.badgeText ?? source.badge.text }
            : undefined,
        tags: [...source.tags, ...(variant.tags ?? [])],
    };
};

DESIGN_TEMPLATES.push(...templateVariants.map(cloneTemplate));

// Group templates by category
export const getTemplatesByCategory = (): { category: string; icon: string; templates: DesignTemplate[] }[] => {
    const categoryMap = new Map<string, { icon: string; templates: DesignTemplate[] }>();

    DESIGN_TEMPLATES.forEach(template => {
        if (!categoryMap.has(template.category)) {
            categoryMap.set(template.category, { icon: template.categoryIcon, templates: [] });
        }
        categoryMap.get(template.category)!.templates.push(template);
    });

    return Array.from(categoryMap.entries()).map(([category, data]) => ({
        category,
        icon: data.icon,
        templates: data.templates,
    }));
};

// Search templates
export const searchTemplates = (query: string): DesignTemplate[] => {
    const lowerQuery = query.toLowerCase();
    return DESIGN_TEMPLATES.filter(template =>
        template.name.toLowerCase().includes(lowerQuery) ||
        template.category.toLowerCase().includes(lowerQuery) ||
        template.description.toLowerCase().includes(lowerQuery) ||
        template.tags.some(tag => tag.includes(lowerQuery))
    );
};
