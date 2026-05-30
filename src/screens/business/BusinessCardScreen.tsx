import React, { useRef, useState } from 'react';
import { api } from '../../services/api';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Alert,
    Share,
    Linking,
    StyleSheet,
    useWindowDimensions,
    Image,
    FlatList,
    Modal,
    ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ViewShot, { captureRef } from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import * as ImagePicker from 'expo-image-picker';
import { shareAsync } from 'expo-sharing';
import QRCode from 'react-native-qrcode-svg';
import { useAuthStore } from '../../store/useAuthStore';
import { NotifyEvents } from '../../services/notifications';
import { useColors } from '../../utils/theme';
import { analytics } from '../../services/mixpanel';

// ─── Template definitions ────────────────────────────────
interface CardTemplate {
    id: string;
    name: string;
    layout: string;
    bg: readonly [string, string, ...string[]];
    bg2?: readonly [string, string, ...string[]];
    textColor: string;
    accentColor: string;
    secondaryText: string;
    decoColor?: string;
    decoColor2?: string;
}

const TEMPLATES: CardTemplate[] = [
    {
        id: 'geo-midnight', name: 'Midnight Luxe', layout: 'geo',
        bg: ['#0F0C29', '#302B63', '#24243E'] as const,
        textColor: '#FFFFFF', accentColor: '#FFD700', secondaryText: '#B8B5FF',
        decoColor: '#FFD70030', decoColor2: '#6C63FF40',
    },
    {
        id: 'wave-ocean', name: 'Ocean Wave', layout: 'wave',
        bg: ['#0077B6', '#0096C7', '#00B4D8'] as const,
        bg2: ['#90E0EF', '#CAF0F8', '#ADE8F4'] as const,
        textColor: '#023E8A', accentColor: '#0077B6', secondaryText: '#0096C7',
        decoColor: '#FFFFFF40',
    },
    {
        id: 'prism-sunset', name: 'Sunset Prism', layout: 'prism',
        bg: ['#FF6B6B', '#EE5A24', '#F0932B'] as const,
        textColor: '#FFFFFF', accentColor: '#FFF3E0', secondaryText: '#FFE0B2',
        decoColor: '#FFFFFF20', decoColor2: '#00000015',
    },
    {
        id: 'mosaic-royal', name: 'Royal Mosaic', layout: 'mosaic',
        bg: ['#1A1A2E', '#16213E', '#0F3460'] as const,
        textColor: '#E0E0E0', accentColor: '#E94560', secondaryText: '#A0A0B0',
        decoColor: '#E9456030', decoColor2: '#533A9120',
    },
    {
        id: 'glass-frost', name: 'Frosted Glass', layout: 'glass',
        bg: ['#667EEA', '#764BA2', '#F093FB'] as const,
        textColor: '#FFFFFF', accentColor: '#FFFFFF', secondaryText: '#F0E6FF',
        decoColor: '#FFFFFF25', decoColor2: '#FFFFFF15',
    },
    {
        id: 'stripe-emerald', name: 'Emerald Stripe', layout: 'stripe',
        bg: ['#134E5E', '#71B280', '#2D8C5A'] as const,
        bg2: ['#FFFFFF', '#F0FFF4', '#E8F5E9'] as const,
        textColor: '#1B5E20', accentColor: '#134E5E', secondaryText: '#4E7C5B',
        decoColor: '#134E5E', decoColor2: '#71B28050',
    },
    {
        id: 'neon-cyber', name: 'Cyber Neon', layout: 'neon',
        bg: ['#0D0D0D', '#1A1A2E', '#0D0D0D'] as const,
        textColor: '#FFFFFF', accentColor: '#00F5FF', secondaryText: '#7B68EE',
        decoColor: '#00F5FF', decoColor2: '#FF00FF40',
    },
    {
        id: 'marble-blush', name: 'Rose Marble', layout: 'marble',
        bg: ['#FFECD2', '#FCB69F', '#FF9A9E'] as const,
        bg2: ['#FFFFFF', '#FFF5F5', '#FFF0F0'] as const,
        textColor: '#3D0C11', accentColor: '#C0392B', secondaryText: '#7B3F3F',
        decoColor: '#C0392B20', decoColor2: '#FFD1D140',
    },
    {
        id: 'deco-cobalt', name: 'Art Deco', layout: 'deco',
        bg: ['#1B2838', '#2C3E50', '#34495E'] as const,
        textColor: '#F5E6CA', accentColor: '#D4AF37', secondaryText: '#BDB395',
        decoColor: '#D4AF37', decoColor2: '#D4AF3730',
    },
    {
        id: 'aurora-nordic', name: 'Nordic Aurora', layout: 'aurora',
        bg: ['#141E30', '#243B55', '#1A3A5C'] as const,
        textColor: '#FFFFFF', accentColor: '#6DD5FA', secondaryText: '#AED6F1',
        decoColor: '#6DD5FA30', decoColor2: '#A8E06340',
    },
    {
        id: 'minimal-white', name: 'Clean White', layout: 'minimal',
        bg: ['#FFFFFF', '#FAFBFC', '#F5F5F5'] as const,
        textColor: '#111827', accentColor: '#6C5CE7', secondaryText: '#6B7280',
        decoColor: '#6C5CE710', decoColor2: '#6C5CE708',
    },
    {
        id: 'corp-navy', name: 'Corporate Navy', layout: 'corporate',
        bg: ['#0F172A', '#1E293B', '#0F172A'] as const,
        bg2: ['#F8FAFC', '#FFFFFF', '#F1F5F9'] as const,
        textColor: '#0F172A', accentColor: '#3B82F6', secondaryText: '#475569',
        decoColor: '#3B82F6', decoColor2: '#3B82F620',
    },
    {
        id: 'luxury-black', name: 'Luxury Black', layout: 'luxury',
        bg: ['#0A0A0A', '#1A1A1A', '#0A0A0A'] as const,
        textColor: '#FFFFFF', accentColor: '#C9A96E', secondaryText: '#9CA3AF',
        decoColor: '#C9A96E', decoColor2: '#C9A96E15',
    },
    {
        id: 'gradient-purple', name: 'Vivid Purple', layout: 'vivid',
        bg: ['#7C3AED', '#4F46E5', '#6D28D9'] as const,
        textColor: '#FFFFFF', accentColor: '#FDE68A', secondaryText: '#E0E7FF',
        decoColor: '#FFFFFF15', decoColor2: '#FDE68A20',
    },
    {
        id: 'terracotta', name: 'Warm Terracotta', layout: 'warm',
        bg: ['#92400E', '#B45309', '#D97706'] as const,
        bg2: ['#FFFBEB', '#FEF3C7', '#FDE68A'] as const,
        textColor: '#78350F', accentColor: '#92400E', secondaryText: '#A16207',
        decoColor: '#92400E20', decoColor2: '#D9770620',
    },
    {
        id: 'sage-green', name: 'Sage Minimal', layout: 'sage',
        bg: ['#F0FDF4', '#ECFDF5', '#F0FDF4'] as const,
        textColor: '#14532D', accentColor: '#059669', secondaryText: '#047857',
        decoColor: '#05966915', decoColor2: '#05966908',
    },
];

// ─── Card data type ──────────────────────────────────────
interface CardData {
    name: string; title: string; businessName: string;
    phone: string; email: string; website: string;
    address: string; whatsapp: string;
}
interface LayoutProps { t: CardTemplate; d: CardData; logoUri: string | null; photoUri: string | null; w: number; h: number; showQR?: boolean; vCard?: string; }

// ─── Shared sub-components ───────────────────────────────
const Avatar = ({ photoUri, name, accent, size = 48, borderW = 2 }: { photoUri: string | null; name: string; accent: string; size?: number; borderW?: number }) => {
    if (photoUri) return <Image source={{ uri: photoUri }} style={{ width: size, height: size, borderRadius: size / 2, borderWidth: borderW, borderColor: accent }} />;
    return (
        <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: borderW, borderColor: accent, justifyContent: 'center', alignItems: 'center', backgroundColor: accent + '15' }}>
            <Text style={{ fontSize: size * 0.4, fontWeight: '800', color: accent }}>{(name || 'B').charAt(0).toUpperCase()}</Text>
        </View>
    );
};

// Generate vCard string for QR code
function buildVCard(d: CardData): string {
    return `BEGIN:VCARD\nVERSION:3.0\nFN:${d.name}\nORG:${d.businessName}\nTITLE:${d.title}\n${d.phone ? `TEL:${d.phone}\n` : ''}${d.email ? `EMAIL:${d.email}\n` : ''}${d.website ? `URL:${d.website}\n` : ''}${d.address ? `ADR:;;${d.address}\n` : ''}END:VCARD`;
}

const CardQR = ({ data, bgColor, fgColor, size = 38 }: { data: string; bgColor: string; fgColor: string; size?: number }) => (
    <View style={{ backgroundColor: bgColor, padding: 3, borderRadius: 4 }}>
        <QRCode value={data} size={size} backgroundColor={bgColor} color={fgColor} />
    </View>
);

const ContactRow = ({ icon, text, color, size = 10 }: { icon: string; text: string; color: string; size?: number }) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 3 }}>
        <Ionicons name={icon as any} size={size} color={color} />
        <Text style={{ color, fontSize: size, fontWeight: '500' }} numberOfLines={1}>{text}</Text>
    </View>
);

// ─── TEMPLATE LAYOUTS ────────────────────────────────────

// 1. Geometric — overlapping circles + diagonal shapes
const GeoLayout = ({ t, d, logoUri, photoUri, w, h }: LayoutProps) => (
    <LinearGradient colors={t.bg} style={[cs.card, { width: w, height: h }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <View style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: 60, backgroundColor: t.decoColor }} />
        <View style={{ position: 'absolute', bottom: -40, left: -20, width: 100, height: 100, borderRadius: 50, backgroundColor: t.decoColor2 }} />
        <View style={{ position: 'absolute', top: 20, right: 60, width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: t.decoColor }} />
        {logoUri && <Image source={{ uri: logoUri }} style={cs.logoTopRight} />}
        <View style={{ flex: 1, justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Avatar photoUri={photoUri} name={d.name} accent={t.accentColor} size={50} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[cs.name, { color: t.textColor }]} numberOfLines={1}>{d.name || 'Your Name'}</Text>
                    <Text style={{ color: t.accentColor, fontSize: 11, fontWeight: '700', marginTop: 2 }}>{d.title}</Text>
                    <Text style={{ color: t.secondaryText, fontSize: 10, fontWeight: '600', marginTop: 1, textTransform: 'uppercase', letterSpacing: 1 }}>{d.businessName}</Text>
                </View>
            </View>
            <View style={{ height: 1, backgroundColor: t.accentColor + '30', marginVertical: 8 }} />
            <View>
                {d.phone ? <ContactRow icon="call-outline" text={d.phone} color={t.secondaryText} /> : null}
                {d.email ? <ContactRow icon="mail-outline" text={d.email} color={t.secondaryText} /> : null}
                {d.website ? <ContactRow icon="globe-outline" text={d.website} color={t.accentColor} /> : null}
            </View>
        </View>
    </LinearGradient>
);

// 2. Wave — curved divider between two gradient halves
const WaveLayout = ({ t, d, logoUri, photoUri, w, h }: LayoutProps) => (
    <View style={[cs.card, { width: w, height: h, padding: 0, overflow: 'hidden' }]}>
        {/* Top gradient area */}
        <LinearGradient colors={t.bg} style={{ height: h * 0.48, padding: 16, justifyContent: 'center' }} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <View style={{ position: 'absolute', bottom: -15, left: 0, right: 0, height: 30, backgroundColor: t.bg2?.[0] || '#FFF', borderTopLeftRadius: 999, borderTopRightRadius: 999 }} />
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Avatar photoUri={photoUri} name={d.name} accent="#FFFFFF" size={46} borderW={3} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[cs.name, { color: '#FFFFFF', fontSize: 17 }]} numberOfLines={1}>{d.name || 'Your Name'}</Text>
                    <Text style={{ color: '#FFFFFFCC', fontSize: 11, fontWeight: '600' }}>{d.title}</Text>
                </View>
                {logoUri && <Image source={{ uri: logoUri }} style={{ width: 36, height: 36, borderRadius: 8, resizeMode: 'contain' }} />}
            </View>
        </LinearGradient>
        {/* Bottom white area */}
        <LinearGradient colors={t.bg2 || ['#FFF', '#F8F8F8', '#F0F0F0']} style={{ flex: 1, paddingHorizontal: 16, paddingTop: 14, justifyContent: 'center' }} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}>
            <Text style={{ color: t.textColor, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 6 }}>{d.businessName}</Text>
            {d.phone ? <ContactRow icon="call-outline" text={d.phone} color={t.secondaryText} /> : null}
            {d.email ? <ContactRow icon="mail-outline" text={d.email} color={t.secondaryText} /> : null}
            {d.website ? <ContactRow icon="globe-outline" text={d.website} color={t.accentColor} /> : null}
        </LinearGradient>
    </View>
);

// 3. Prism — angular overlapping triangles
const PrismLayout = ({ t, d, logoUri, photoUri, w, h }: LayoutProps) => (
    <LinearGradient colors={t.bg} style={[cs.card, { width: w, height: h }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        {/* Angular shapes */}
        <View style={{ position: 'absolute', top: 0, right: 0, width: 0, height: 0, borderTopWidth: h * 0.6, borderTopColor: t.decoColor || 'transparent', borderLeftWidth: w * 0.4, borderLeftColor: 'transparent' }} />
        <View style={{ position: 'absolute', bottom: 0, left: 0, width: 0, height: 0, borderBottomWidth: h * 0.4, borderBottomColor: t.decoColor2 || 'transparent', borderRightWidth: w * 0.3, borderRightColor: 'transparent' }} />
        {logoUri && <Image source={{ uri: logoUri }} style={cs.logoTopRight} />}
        <View style={{ flex: 1, justifyContent: 'center' }}>
            <Text style={{ color: t.accentColor, fontSize: 9, fontWeight: '800', letterSpacing: 3, textTransform: 'uppercase' }}>{d.businessName || 'BUSINESS'}</Text>
            <Text style={[cs.name, { color: t.textColor, fontSize: 22, marginTop: 4 }]} numberOfLines={1}>{d.name || 'Your Name'}</Text>
            <Text style={{ color: t.secondaryText, fontSize: 12, fontWeight: '600', marginTop: 2 }}>{d.title}</Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <View style={{ gap: 3 }}>
                {d.phone ? <Text style={{ color: t.secondaryText, fontSize: 10 }}>📞 {d.phone}</Text> : null}
                {d.email ? <Text style={{ color: t.secondaryText, fontSize: 10 }}>✉️ {d.email}</Text> : null}
            </View>
            <Avatar photoUri={photoUri} name={d.name} accent={t.accentColor} size={44} />
        </View>
    </LinearGradient>
);

// 4. Mosaic — geometric grid pattern
const MosaicLayout = ({ t, d, logoUri, photoUri, w, h }: LayoutProps) => (
    <LinearGradient colors={t.bg} style={[cs.card, { width: w, height: h }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        {/* Mosaic pattern */}
        <View style={{ position: 'absolute', top: 10, left: 10, width: 30, height: 30, borderWidth: 2, borderColor: t.decoColor, transform: [{ rotate: '45deg' }] }} />
        <View style={{ position: 'absolute', top: 30, left: 35, width: 20, height: 20, backgroundColor: t.decoColor2, transform: [{ rotate: '45deg' }] }} />
        <View style={{ position: 'absolute', bottom: 15, right: 15, width: 50, height: 50, borderWidth: 2, borderColor: t.decoColor, borderRadius: 4, transform: [{ rotate: '15deg' }] }} />
        <View style={{ position: 'absolute', bottom: 35, right: 50, width: 25, height: 25, backgroundColor: t.decoColor2, borderRadius: 2, transform: [{ rotate: '30deg' }] }} />

        <View style={{ flex: 1, justifyContent: 'space-between', paddingLeft: 50 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                    <Text style={[cs.name, { color: t.textColor, fontSize: 18 }]} numberOfLines={1}>{d.name || 'Your Name'}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                        <View style={{ width: 20, height: 2, backgroundColor: t.accentColor }} />
                        <Text style={{ color: t.accentColor, fontSize: 11, fontWeight: '700' }}>{d.title}</Text>
                    </View>
                </View>
                <Avatar photoUri={photoUri} name={d.name} accent={t.accentColor} size={44} />
            </View>
            <View>
                <Text style={{ color: t.accentColor, fontSize: 10, fontWeight: '800', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>{d.businessName}</Text>
                {d.phone ? <ContactRow icon="call-outline" text={d.phone} color={t.secondaryText} size={9.5} /> : null}
                {d.email ? <ContactRow icon="mail-outline" text={d.email} color={t.secondaryText} size={9.5} /> : null}
                {d.website ? <ContactRow icon="globe-outline" text={d.website} color={t.accentColor} size={9.5} /> : null}
            </View>
        </View>
        {logoUri && <Image source={{ uri: logoUri }} style={{ position: 'absolute', top: 14, right: 14, width: 30, height: 30, borderRadius: 6, resizeMode: 'contain' }} />}
    </LinearGradient>
);

// 5. Glass — frosted glass effect with blur-like overlays
const GlassLayout = ({ t, d, logoUri, photoUri, w, h }: LayoutProps) => (
    <LinearGradient colors={t.bg} style={[cs.card, { width: w, height: h }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        {/* Glowing orbs */}
        <View style={{ position: 'absolute', top: -20, left: -20, width: 80, height: 80, borderRadius: 40, backgroundColor: t.decoColor }} />
        <View style={{ position: 'absolute', bottom: -25, right: -25, width: 100, height: 100, borderRadius: 50, backgroundColor: t.decoColor2 }} />
        {/* Glass card overlay */}
        <View style={{ flex: 1, backgroundColor: t.decoColor, borderRadius: 12, padding: 14, justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Avatar photoUri={photoUri} name={d.name} accent={t.accentColor} size={48} borderW={2} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[cs.name, { color: t.textColor, fontSize: 17 }]} numberOfLines={1}>{d.name || 'Your Name'}</Text>
                    <Text style={{ color: t.secondaryText, fontSize: 11, fontWeight: '600' }}>{d.title}</Text>
                    <Text style={{ color: t.secondaryText, fontSize: 9, fontWeight: '700', letterSpacing: 1.5, marginTop: 2, textTransform: 'uppercase' }}>{d.businessName}</Text>
                </View>
                {logoUri && <Image source={{ uri: logoUri }} style={{ width: 34, height: 34, borderRadius: 8, resizeMode: 'contain' }} />}
            </View>
            <View style={{ height: 1, backgroundColor: t.accentColor + '30', marginVertical: 6 }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <View style={{ gap: 3 }}>
                    {d.phone ? <ContactRow icon="call" text={d.phone} color={t.secondaryText} /> : null}
                    {d.email ? <ContactRow icon="mail" text={d.email} color={t.secondaryText} /> : null}
                </View>
                <View style={{ gap: 3, alignItems: 'flex-end' }}>
                    {d.website ? <ContactRow icon="globe" text={d.website} color={t.accentColor} /> : null}
                </View>
            </View>
        </View>
    </LinearGradient>
);

// 6. Stripe — bold diagonal stripe accent
const StripeLayout = ({ t, d, logoUri, photoUri, w, h }: LayoutProps) => (
    <View style={[cs.card, { width: w, height: h, padding: 0, overflow: 'hidden', flexDirection: 'row' }]}>
        {/* Left accent stripe with diagonal pattern */}
        <LinearGradient colors={t.bg} style={{ width: 90, alignItems: 'center', justifyContent: 'center', paddingVertical: 14 }} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}>
            <View style={{ position: 'absolute', top: -10, left: -10, width: 40, height: 40, borderRadius: 20, backgroundColor: t.decoColor2 }} />
            <View style={{ position: 'absolute', bottom: 20, right: -5, width: 25, height: 25, borderRadius: 12, backgroundColor: t.decoColor2 }} />
            <Avatar photoUri={photoUri} name={d.name} accent="#FFFFFF" size={50} borderW={3} />
            {logoUri && <Image source={{ uri: logoUri }} style={{ width: 28, height: 28, borderRadius: 6, marginTop: 8, resizeMode: 'contain' }} />}
        </LinearGradient>
        {/* Diagonal edge */}
        <View style={{ width: 15, overflow: 'hidden' }}>
            <LinearGradient colors={t.bg} style={{ position: 'absolute', top: 0, bottom: 0, left: -30, width: 45, transform: [{ skewX: '-8deg' }] }} />
        </View>
        {/* Right content */}
        <LinearGradient colors={t.bg2 || ['#FFF', '#F5F5F5', '#EBEBEB']} style={{ flex: 1, padding: 14, justifyContent: 'center' }} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}>
            <Text style={[cs.name, { color: t.textColor, fontSize: 16 }]} numberOfLines={1}>{d.name || 'Your Name'}</Text>
            <Text style={{ color: t.accentColor, fontSize: 11, fontWeight: '700', marginTop: 2 }}>{d.title}</Text>
            <View style={{ height: 2, width: 30, backgroundColor: t.accentColor, marginVertical: 6, borderRadius: 1 }} />
            <Text style={{ color: t.textColor, fontSize: 10, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>{d.businessName}</Text>
            {d.phone ? <ContactRow icon="call-outline" text={d.phone} color={t.secondaryText} size={9.5} /> : null}
            {d.email ? <ContactRow icon="mail-outline" text={d.email} color={t.secondaryText} size={9.5} /> : null}
            {d.website ? <ContactRow icon="globe-outline" text={d.website} color={t.accentColor} size={9.5} /> : null}
        </LinearGradient>
    </View>
);

// 7. Neon — dark background with glowing neon accents
const NeonLayout = ({ t, d, logoUri, photoUri, w, h }: LayoutProps) => (
    <LinearGradient colors={t.bg} style={[cs.card, { width: w, height: h }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        {/* Neon glow lines */}
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, backgroundColor: t.decoColor, shadowColor: t.decoColor, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 8 }} />
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, backgroundColor: t.decoColor, shadowColor: t.decoColor, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 8 }} />
        <View style={{ position: 'absolute', top: 20, right: 20, width: 60, height: 60, borderRadius: 30, borderWidth: 1, borderColor: t.decoColor2 }} />
        <View style={{ position: 'absolute', bottom: 15, left: 15, width: 35, height: 35, borderRadius: 17, borderWidth: 1, borderColor: t.decoColor2 }} />
        {logoUri && <Image source={{ uri: logoUri }} style={cs.logoTopRight} />}
        <View style={{ flex: 1, justifyContent: 'center' }}>
            <Text style={{ color: t.accentColor, fontSize: 9, fontWeight: '900', letterSpacing: 4, textTransform: 'uppercase' }}>{d.businessName || 'BUSINESS'}</Text>
            <Text style={[cs.name, { color: t.textColor, fontSize: 22, marginTop: 4 }]} numberOfLines={1}>{d.name || 'Your Name'}</Text>
            <Text style={{ color: t.secondaryText, fontSize: 12, fontWeight: '600', marginTop: 2 }}>{d.title}</Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <View style={{ gap: 4 }}>
                {d.phone ? <Text style={{ color: t.accentColor, fontSize: 10, fontWeight: '500' }}>{d.phone}</Text> : null}
                {d.email ? <Text style={{ color: t.secondaryText, fontSize: 10 }}>{d.email}</Text> : null}
            </View>
            <Avatar photoUri={photoUri} name={d.name} accent={t.accentColor} size={42} />
        </View>
    </LinearGradient>
);

// 8. Marble — dual-tone with decorative marble-like swirls
const MarbleLayout = ({ t, d, logoUri, photoUri, w, h }: LayoutProps) => (
    <View style={[cs.card, { width: w, height: h, padding: 0, overflow: 'hidden' }]}>
        <LinearGradient colors={t.bg2 || ['#FFF', '#FFF', '#FFF']} style={{ flex: 1, padding: 18 }} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            {/* Marble veins */}
            <View style={{ position: 'absolute', top: 15, right: 30, width: 80, height: 80, borderRadius: 40, backgroundColor: t.decoColor2 }} />
            <View style={{ position: 'absolute', bottom: 20, left: 20, width: 60, height: 60, borderRadius: 30, backgroundColor: t.decoColor }} />
            {/* Top accent bar */}
            <LinearGradient colors={t.bg} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 5, borderTopLeftRadius: 16, borderTopRightRadius: 16 }} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                <Avatar photoUri={photoUri} name={d.name} accent={t.accentColor} size={46} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[cs.name, { color: t.textColor, fontSize: 17 }]} numberOfLines={1}>{d.name || 'Your Name'}</Text>
                    <Text style={{ color: t.accentColor, fontSize: 11, fontWeight: '700', marginTop: 1 }}>{d.title}</Text>
                </View>
                {logoUri && <Image source={{ uri: logoUri }} style={{ width: 36, height: 36, borderRadius: 8, resizeMode: 'contain' }} />}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                <View style={{ width: 25, height: 2, backgroundColor: t.accentColor, borderRadius: 1 }} />
                <Text style={{ color: t.secondaryText, fontSize: 10, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', marginLeft: 8 }}>{d.businessName}</Text>
            </View>
            <View style={{ marginTop: 8, gap: 3 }}>
                {d.phone ? <ContactRow icon="call-outline" text={d.phone} color={t.secondaryText} /> : null}
                {d.email ? <ContactRow icon="mail-outline" text={d.email} color={t.secondaryText} /> : null}
                {d.website ? <ContactRow icon="globe-outline" text={d.website} color={t.accentColor} /> : null}
            </View>
        </LinearGradient>
    </View>
);

// 9. Art Deco — 1920s geometric symmetry
const DecoLayout = ({ t, d, logoUri, photoUri, w, h }: LayoutProps) => (
    <LinearGradient colors={t.bg} style={[cs.card, { width: w, height: h }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        {/* Deco borders */}
        <View style={{ position: 'absolute', top: 8, left: 8, right: 8, bottom: 8, borderWidth: 1, borderColor: t.decoColor2, borderRadius: 10 }} />
        <View style={{ position: 'absolute', top: 12, left: 12, right: 12, bottom: 12, borderWidth: 1, borderColor: t.decoColor + '20', borderRadius: 8 }} />
        {/* Corner ornaments */}
        <View style={{ position: 'absolute', top: 14, left: 14, width: 16, height: 16, borderTopWidth: 2, borderLeftWidth: 2, borderColor: t.decoColor }} />
        <View style={{ position: 'absolute', top: 14, right: 14, width: 16, height: 16, borderTopWidth: 2, borderRightWidth: 2, borderColor: t.decoColor }} />
        <View style={{ position: 'absolute', bottom: 14, left: 14, width: 16, height: 16, borderBottomWidth: 2, borderLeftWidth: 2, borderColor: t.decoColor }} />
        <View style={{ position: 'absolute', bottom: 14, right: 14, width: 16, height: 16, borderBottomWidth: 2, borderRightWidth: 2, borderColor: t.decoColor }} />

        <View style={{ flex: 1, justifyContent: 'space-between', padding: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Avatar photoUri={photoUri} name={d.name} accent={t.accentColor} size={44} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[cs.name, { color: t.textColor, fontSize: 17 }]} numberOfLines={1}>{d.name || 'Your Name'}</Text>
                    <Text style={{ color: t.accentColor, fontSize: 11, fontWeight: '700' }}>{d.title}</Text>
                </View>
                {logoUri && <Image source={{ uri: logoUri }} style={{ width: 32, height: 32, borderRadius: 4, resizeMode: 'contain' }} />}
            </View>
            <View style={{ alignItems: 'center' }}>
                <View style={{ width: 40, height: 1, backgroundColor: t.accentColor }} />
                <Text style={{ color: t.accentColor, fontSize: 9, fontWeight: '800', letterSpacing: 3, textTransform: 'uppercase', marginTop: 4 }}>{d.businessName}</Text>
                <View style={{ width: 40, height: 1, backgroundColor: t.accentColor, marginTop: 4 }} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <View style={{ gap: 3 }}>
                    {d.phone ? <Text style={{ color: t.secondaryText, fontSize: 9.5 }}>{d.phone}</Text> : null}
                    {d.email ? <Text style={{ color: t.secondaryText, fontSize: 9.5 }}>{d.email}</Text> : null}
                </View>
                <View style={{ gap: 3, alignItems: 'flex-end' }}>
                    {d.website ? <Text style={{ color: t.accentColor, fontSize: 9.5, fontWeight: '600' }}>{d.website}</Text> : null}
                    {d.address ? <Text style={{ color: t.secondaryText, fontSize: 9 }} numberOfLines={1}>{d.address}</Text> : null}
                </View>
            </View>
        </View>
    </LinearGradient>
);

// 10. Aurora — northern lights gradient glow
const AuroraLayout = ({ t, d, logoUri, photoUri, w, h }: LayoutProps) => (
    <LinearGradient colors={t.bg} style={[cs.card, { width: w, height: h }]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}>
        {/* Aurora glow bands */}
        <View style={{ position: 'absolute', top: h * 0.15, left: 0, right: 0, height: 20, backgroundColor: t.decoColor, opacity: 0.5 }} />
        <View style={{ position: 'absolute', top: h * 0.25, left: 20, right: 40, height: 12, backgroundColor: t.decoColor2, opacity: 0.4 }} />
        <View style={{ position: 'absolute', top: h * 0.1, left: 60, right: 20, height: 8, backgroundColor: t.decoColor, opacity: 0.3 }} />

        {logoUri && <Image source={{ uri: logoUri }} style={cs.logoTopRight} />}
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginBottom: 8 }}>
                <Avatar photoUri={photoUri} name={d.name} accent={t.accentColor} size={48} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[cs.name, { color: t.textColor, fontSize: 18 }]} numberOfLines={1}>{d.name || 'Your Name'}</Text>
                    <Text style={{ color: t.accentColor, fontSize: 11, fontWeight: '700' }}>{d.title}</Text>
                    <Text style={{ color: t.secondaryText, fontSize: 10, fontWeight: '600', marginTop: 2 }}>{d.businessName}</Text>
                </View>
            </View>
            <View style={{ height: 1, backgroundColor: t.accentColor + '40', marginBottom: 6 }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <View style={{ gap: 2 }}>
                    {d.phone ? <ContactRow icon="call" text={d.phone} color={t.secondaryText} size={9.5} /> : null}
                    {d.email ? <ContactRow icon="mail" text={d.email} color={t.secondaryText} size={9.5} /> : null}
                </View>
                {d.website ? <ContactRow icon="globe" text={d.website} color={t.accentColor} size={9.5} /> : null}
            </View>
        </View>
    </LinearGradient>
);

// 11. Minimal — ultra-clean white card, thin accent line
const MinimalLayout = ({ t, d, logoUri, photoUri, w, h }: LayoutProps) => (
    <LinearGradient colors={t.bg} style={[cs.card, { width: w, height: h, borderWidth: 1, borderColor: '#E5E7EB' }]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}>
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, backgroundColor: t.accentColor, borderTopLeftRadius: 16, borderTopRightRadius: 16 }} />
        <View style={{ flex: 1, justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {logoUri ? <Image source={{ uri: logoUri }} style={{ width: 40, height: 40, borderRadius: 8, resizeMode: 'contain', marginRight: 12 }} />
                    : <Avatar photoUri={photoUri} name={d.name} accent={t.accentColor} size={44} />}
                <View style={{ flex: 1, marginLeft: logoUri ? 0 : 10 }}>
                    <Text style={[cs.name, { color: t.textColor, fontSize: 18 }]} numberOfLines={1}>{d.name || 'Your Name'}</Text>
                    <Text style={{ color: t.accentColor, fontSize: 11, fontWeight: '600', marginTop: 2 }}>{d.title}</Text>
                </View>
            </View>
            <View>
                <Text style={{ color: t.textColor, fontSize: 10, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>{d.businessName}</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <View style={{ gap: 3 }}>
                        {d.phone ? <ContactRow icon="call-outline" text={d.phone} color={t.secondaryText} /> : null}
                        {d.email ? <ContactRow icon="mail-outline" text={d.email} color={t.secondaryText} /> : null}
                    </View>
                    {d.website ? <ContactRow icon="globe-outline" text={d.website} color={t.accentColor} /> : null}
                </View>
            </View>
        </View>
    </LinearGradient>
);

// 12. Corporate — split top dark / bottom light, professional
const CorporateLayout = ({ t, d, logoUri, photoUri, w, h }: LayoutProps) => (
    <View style={[cs.card, { width: w, height: h, padding: 0, overflow: 'hidden' }]}>
        <LinearGradient colors={t.bg} style={{ height: h * 0.38, paddingHorizontal: 18, justifyContent: 'center' }} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {logoUri && <Image source={{ uri: logoUri }} style={{ width: 32, height: 32, borderRadius: 6, resizeMode: 'contain', marginRight: 10 }} />}
                <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800', letterSpacing: 2, textTransform: 'uppercase' }}>{d.businessName || 'BUSINESS'}</Text>
            </View>
        </LinearGradient>
        <View style={{ position: 'absolute', left: 18, top: h * 0.38 - 24, zIndex: 1 }}>
            <Avatar photoUri={photoUri} name={d.name} accent={t.accentColor} size={48} borderW={3} />
        </View>
        <LinearGradient colors={t.bg2 || ['#FFF', '#F8F8F8', '#F0F0F0']} style={{ flex: 1, paddingHorizontal: 18, paddingTop: 30 }} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}>
            <Text style={[cs.name, { color: t.textColor, fontSize: 17 }]} numberOfLines={1}>{d.name || 'Your Name'}</Text>
            <Text style={{ color: t.accentColor, fontSize: 11, fontWeight: '700', marginTop: 1 }}>{d.title}</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
                <View style={{ gap: 2 }}>
                    {d.phone ? <ContactRow icon="call-outline" text={d.phone} color={t.secondaryText} size={9.5} /> : null}
                    {d.email ? <ContactRow icon="mail-outline" text={d.email} color={t.secondaryText} size={9.5} /> : null}
                </View>
                {d.website ? <ContactRow icon="globe-outline" text={d.website} color={t.accentColor} size={9.5} /> : null}
            </View>
        </LinearGradient>
    </View>
);

// 13. Luxury — black with gold accents, premium feel
const LuxuryLayout = ({ t, d, logoUri, photoUri, w, h }: LayoutProps) => (
    <LinearGradient colors={t.bg} style={[cs.card, { width: w, height: h }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        {/* Gold border frame */}
        <View style={{ position: 'absolute', top: 10, left: 10, right: 10, bottom: 10, borderWidth: 0.5, borderColor: t.decoColor + '60', borderRadius: 10 }} />
        {/* Gold corner dots */}
        <View style={{ position: 'absolute', top: 7, left: 7, width: 6, height: 6, borderRadius: 3, backgroundColor: t.decoColor }} />
        <View style={{ position: 'absolute', top: 7, right: 7, width: 6, height: 6, borderRadius: 3, backgroundColor: t.decoColor }} />
        <View style={{ position: 'absolute', bottom: 7, left: 7, width: 6, height: 6, borderRadius: 3, backgroundColor: t.decoColor }} />
        <View style={{ position: 'absolute', bottom: 7, right: 7, width: 6, height: 6, borderRadius: 3, backgroundColor: t.decoColor }} />
        <View style={{ flex: 1, justifyContent: 'space-between', padding: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                    <Text style={{ color: t.decoColor, fontSize: 8, fontWeight: '800', letterSpacing: 4, textTransform: 'uppercase' }}>{d.businessName || 'BUSINESS'}</Text>
                    <Text style={[cs.name, { color: t.textColor, fontSize: 20, marginTop: 4 }]} numberOfLines={1}>{d.name || 'Your Name'}</Text>
                    <Text style={{ color: t.decoColor, fontSize: 11, fontWeight: '600', marginTop: 2 }}>{d.title}</Text>
                </View>
                {logoUri ? <Image source={{ uri: logoUri }} style={{ width: 40, height: 40, borderRadius: 8, resizeMode: 'contain' }} />
                    : <Avatar photoUri={photoUri} name={d.name} accent={t.decoColor || t.accentColor} size={44} />}
            </View>
            <View style={{ height: 0.5, backgroundColor: t.decoColor + '40' }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <View style={{ gap: 3 }}>
                    {d.phone ? <Text style={{ color: t.secondaryText, fontSize: 9.5 }}>{d.phone}</Text> : null}
                    {d.email ? <Text style={{ color: t.secondaryText, fontSize: 9.5 }}>{d.email}</Text> : null}
                </View>
                {d.website ? <Text style={{ color: t.decoColor, fontSize: 9.5, fontWeight: '600' }}>{d.website}</Text> : null}
            </View>
        </View>
    </LinearGradient>
);

// 14. Vivid — bold gradient with playful geometry
const VividLayout = ({ t, d, logoUri, photoUri, w, h }: LayoutProps) => (
    <LinearGradient colors={t.bg} style={[cs.card, { width: w, height: h }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <View style={{ position: 'absolute', top: -15, right: -15, width: 80, height: 80, borderRadius: 40, backgroundColor: t.decoColor }} />
        <View style={{ position: 'absolute', bottom: -20, left: -20, width: 70, height: 70, borderRadius: 35, backgroundColor: t.decoColor }} />
        <View style={{ position: 'absolute', top: 30, right: 50, width: 20, height: 20, borderRadius: 10, backgroundColor: t.decoColor2 }} />
        {logoUri && <Image source={{ uri: logoUri }} style={cs.logoTopRight} />}
        <View style={{ flex: 1, justifyContent: 'center' }}>
            <Avatar photoUri={photoUri} name={d.name} accent={t.accentColor} size={50} borderW={3} />
            <Text style={[cs.name, { color: t.textColor, fontSize: 20, marginTop: 8 }]} numberOfLines={1}>{d.name || 'Your Name'}</Text>
            <Text style={{ color: t.accentColor, fontSize: 12, fontWeight: '700', marginTop: 2 }}>{d.title}</Text>
            <Text style={{ color: t.secondaryText, fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginTop: 4, textTransform: 'uppercase' }}>{d.businessName}</Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <View style={{ gap: 3 }}>
                {d.phone ? <ContactRow icon="call" text={d.phone} color={t.secondaryText} /> : null}
                {d.email ? <ContactRow icon="mail" text={d.email} color={t.secondaryText} /> : null}
            </View>
            {d.website ? <ContactRow icon="globe" text={d.website} color={t.accentColor} /> : null}
        </View>
    </LinearGradient>
);

// 15. Warm — terracotta split card
const WarmLayout = ({ t, d, logoUri, photoUri, w, h }: LayoutProps) => (
    <View style={[cs.card, { width: w, height: h, padding: 0, overflow: 'hidden', flexDirection: 'row' }]}>
        <LinearGradient colors={t.bg} style={{ width: w * 0.35, alignItems: 'center', justifyContent: 'center', padding: 12 }} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}>
            <Avatar photoUri={photoUri} name={d.name} accent="#FFFFFF" size={52} borderW={3} />
            {logoUri && <Image source={{ uri: logoUri }} style={{ width: 30, height: 30, borderRadius: 6, marginTop: 8, resizeMode: 'contain' }} />}
        </LinearGradient>
        <LinearGradient colors={t.bg2 || ['#FFF', '#F5F5F5', '#F0F0F0']} style={{ flex: 1, padding: 16, justifyContent: 'center' }} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}>
            <Text style={[cs.name, { color: t.textColor, fontSize: 17 }]} numberOfLines={1}>{d.name || 'Your Name'}</Text>
            <Text style={{ color: t.accentColor, fontSize: 11, fontWeight: '700', marginTop: 2 }}>{d.title}</Text>
            <View style={{ height: 2, width: 24, backgroundColor: t.accentColor, marginVertical: 8, borderRadius: 1 }} />
            <Text style={{ color: t.textColor, fontSize: 9, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>{d.businessName}</Text>
            {d.phone ? <ContactRow icon="call-outline" text={d.phone} color={t.secondaryText} size={9.5} /> : null}
            {d.email ? <ContactRow icon="mail-outline" text={d.email} color={t.secondaryText} size={9.5} /> : null}
            {d.website ? <ContactRow icon="globe-outline" text={d.website} color={t.accentColor} size={9.5} /> : null}
        </LinearGradient>
    </View>
);

// 16. Sage — minimal green, nature-inspired
const SageLayout = ({ t, d, logoUri, photoUri, w, h }: LayoutProps) => (
    <LinearGradient colors={t.bg} style={[cs.card, { width: w, height: h, borderWidth: 1, borderColor: '#D1FAE5' }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        {/* Leaf-like decorative arcs */}
        <View style={{ position: 'absolute', top: -30, right: -30, width: 100, height: 100, borderRadius: 50, backgroundColor: t.decoColor }} />
        <View style={{ position: 'absolute', bottom: -20, left: -20, width: 60, height: 60, borderRadius: 30, backgroundColor: t.decoColor2 }} />
        <View style={{ flex: 1, justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Avatar photoUri={photoUri} name={d.name} accent={t.accentColor} size={46} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[cs.name, { color: t.textColor, fontSize: 18 }]} numberOfLines={1}>{d.name || 'Your Name'}</Text>
                    <Text style={{ color: t.accentColor, fontSize: 11, fontWeight: '600', marginTop: 2 }}>{d.title}</Text>
                    <Text style={{ color: t.secondaryText, fontSize: 10, fontWeight: '700', letterSpacing: 1, marginTop: 2, textTransform: 'uppercase' }}>{d.businessName}</Text>
                </View>
                {logoUri && <Image source={{ uri: logoUri }} style={{ width: 36, height: 36, borderRadius: 8, resizeMode: 'contain' }} />}
            </View>
            <View style={{ height: 1, backgroundColor: t.accentColor + '25', marginVertical: 6 }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <View style={{ gap: 3 }}>
                    {d.phone ? <ContactRow icon="call-outline" text={d.phone} color={t.secondaryText} /> : null}
                    {d.email ? <ContactRow icon="mail-outline" text={d.email} color={t.secondaryText} /> : null}
                </View>
                {d.website ? <ContactRow icon="globe-outline" text={d.website} color={t.accentColor} /> : null}
            </View>
        </View>
    </LinearGradient>
);

const LAYOUT_MAP: Record<string, React.FC<LayoutProps>> = {
    geo: GeoLayout, wave: WaveLayout, prism: PrismLayout, mosaic: MosaicLayout,
    glass: GlassLayout, stripe: StripeLayout, neon: NeonLayout, marble: MarbleLayout,
    deco: DecoLayout, aurora: AuroraLayout, minimal: MinimalLayout, corporate: CorporateLayout,
    luxury: LuxuryLayout, vivid: VividLayout, warm: WarmLayout, sage: SageLayout,
};

// ─── Main Screen ─────────────────────────────────────────
export default function BusinessCardScreen() {
    const navigation = useNavigation();
    const C = useColors();
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();
    const user = useAuthStore(s => s.user);
    const viewShotRef = useRef<ViewShot>(null);
    const flatListRef = useRef<FlatList>(null);

    const [selected, setSelected] = useState(0);
    const [logoUri, setLogoUri] = useState<string | null>(null);
    const [photoUri, setPhotoUri] = useState<string | null>(null);
    const [showQR, setShowQR] = useState(true);
    const [showPrintModal, setShowPrintModal] = useState(false);

    const cleanPhone = (p?: string) => {
        if (!p) return '';
        let cleaned = p.replace(/^\++/, '+');
        if (!cleaned.startsWith('+') && cleaned.length === 10) cleaned = `+91${cleaned}`;
        return cleaned;
    };

    const [cardData, setCardData] = useState<CardData>({
        name: user?.fullName || user?.businessName || '',
        title: 'Owner / Founder',
        businessName: user?.businessName || '',
        phone: cleanPhone(user?.phone),
        email: user?.email || '',
        website: user?.website || '',
        address: '',
        whatsapp: cleanPhone(user?.phone),
    });

    const cardW = width - 48;
    const cardH = cardW * 0.6;

    const pickImage = async (type: 'logo' | 'photo') => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') { Alert.alert('Permission needed', 'Grant media library access to pick images.'); return; }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
            base64: true,
        });
        if (!result.canceled && result.assets[0]) {
            const asset = result.assets[0];
            const uri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
            type === 'logo' ? setLogoUri(uri) : setPhotoUri(uri);
        }
    };

    const handleSave = async () => {
        try {
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status !== 'granted') { Alert.alert('Permission needed', 'Grant media library access.'); return; }
            if (viewShotRef.current) {
                const uri = await captureRef(viewShotRef, { format: 'png', quality: 1 });
                await MediaLibrary.saveToLibraryAsync(uri);
                api.trackEvent('card_saved');
                analytics.track('Card Saved');
                Alert.alert('Saved!', 'Business card saved to gallery.');
            }
        } catch { Alert.alert('Error', 'Failed to save card.'); }
    };

    const handleShare = async () => {
        api.trackEvent('card_shared');
        analytics.track('Card Shared');
        try {
            if (viewShotRef.current) {
                const uri = await captureRef(viewShotRef, { format: 'png', quality: 1 });
                await shareAsync(uri, { mimeType: 'image/png', dialogTitle: `${cardData.name} - Business Card` });
            } else {
                await Share.share({ message: `${cardData.name} | ${cardData.businessName}\n${cardData.phone}\n${cardData.email}\n${cardData.website}`, title: `${cardData.name} - Business Card` });
            }
        } catch {}
    };

    const handleWhatsAppShare = async () => {
        try {
            if (viewShotRef.current) {
                const uri = await captureRef(viewShotRef, { format: 'png', quality: 1 });
                await shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share via WhatsApp' });
            }
        } catch {
            const p = cardData.whatsapp.replace(/[^0-9]/g, '');
            Linking.openURL(`https://wa.me/${p}?text=${encodeURIComponent(`${cardData.name} | ${cardData.businessName}\n${cardData.phone}`)}`);
        }
    };

    const onScroll = (e: any) => {
        const idx = Math.round(e.nativeEvent.contentOffset.x / (cardW + 16));
        if (idx >= 0 && idx < TEMPLATES.length && idx !== selected) setSelected(idx);
    };

    const vCard = buildVCard(cardData);

    const renderCard = ({ item, index }: { item: CardTemplate; index: number }) => {
        const Layout = LAYOUT_MAP[item.layout] || GeoLayout;
        const isDarkCard = item.textColor === '#FFFFFF';
        const qrBg = '#FFFFFF';
        const qrFg = isDarkCard ? item.bg[0] : item.textColor;
        // Templates where contact info is at bottom-right — place QR top-right instead
        const topRightLayouts = ['prism', 'glass', 'neon', 'deco', 'corporate'];
        const useTopRight = topRightLayouts.includes(item.layout);
        const qrStyle = useTopRight
            ? { position: 'absolute' as const, top: 14, right: 14, zIndex: 10 }
            : { position: 'absolute' as const, bottom: 42, right: 35, zIndex: 10 };

        const content = (
            <View style={{ position: 'relative' }}>
                <Layout t={item} d={cardData} logoUri={logoUri} photoUri={photoUri} w={cardW} h={cardH} />
                {showQR && (
                    <View style={qrStyle}>
                        <CardQR data={vCard} bgColor={qrBg} fgColor={qrFg} size={34} />
                    </View>
                )}
            </View>
        );
        return (
            <View style={{ width: cardW, marginHorizontal: 8 }}>
                {index === selected ? (
                    <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1 }}>{content}</ViewShot>
                ) : content}
            </View>
        );
    };

    return (
        <View style={[s.container, { paddingTop: insets.top, backgroundColor: C.background }]}>
            <View style={s.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={[s.backBtn, { backgroundColor: C.surfaceSecondary }]}>
                    <Ionicons name="arrow-back" size={24} color={C.text} />
                </TouchableOpacity>
                <Text style={[s.headerTitle, { color: C.text }]}>Digital Business Card</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                {/* Swipeable cards */}
                <FlatList
                    ref={flatListRef}
                    data={TEMPLATES}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    snapToInterval={cardW + 16}
                    decelerationRate="fast"
                    contentContainerStyle={{ paddingHorizontal: 16 }}
                    keyExtractor={item => item.id}
                    renderItem={renderCard}
                    onMomentumScrollEnd={onScroll}
                    getItemLayout={(_, index) => ({ length: cardW + 16, offset: (cardW + 16) * index, index })}
                />

                {/* Dots + template name */}
                <View style={s.dotsRow}>
                    {TEMPLATES.map((_, i) => (
                        <TouchableOpacity key={i} onPress={() => { setSelected(i); flatListRef.current?.scrollToIndex({ index: i, animated: true }); }}>
                            <View style={[s.dot, { backgroundColor: C.border }, i === selected && s.dotActive]} />
                        </TouchableOpacity>
                    ))}
                </View>
                <Text style={[s.templateName, { color: C.textSecondary }]}>{TEMPLATES[selected].name}</Text>

                {/* Quick Actions */}
                <View style={s.quickActions}>
                    <TouchableOpacity style={s.quickAction} onPress={() => setShowPrintModal(true)}>
                        <View style={[s.quickIcon, { backgroundColor: '#FFF0F5' }]}><Ionicons name="print" size={20} color="#E91E63" /></View>
                        <Text style={[s.quickText, { color: C.textSecondary }]}>Print</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.quickAction} onPress={handleWhatsAppShare}>
                        <View style={[s.quickIcon, { backgroundColor: '#E8F8ED' }]}><Ionicons name="logo-whatsapp" size={20} color="#25D366" /></View>
                        <Text style={[s.quickText, { color: C.textSecondary }]}>WhatsApp</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.quickAction} onPress={handleShare}>
                        <View style={[s.quickIcon, { backgroundColor: '#EEF4FF' }]}><Ionicons name="share-social" size={20} color="#1A7CFF" /></View>
                        <Text style={[s.quickText, { color: C.textSecondary }]}>Share</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.quickAction} onPress={handleSave}>
                        <View style={[s.quickIcon, { backgroundColor: '#FFF4E5' }]}><Ionicons name="download" size={20} color="#FF9500" /></View>
                        <Text style={[s.quickText, { color: C.textSecondary }]}>Save</Text>
                    </TouchableOpacity>
                </View>

                {/* QR Code Toggle */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 24, marginTop: 8, marginBottom: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Ionicons name="qr-code-outline" size={18} color={C.textSecondary} />
                        <Text style={{ fontSize: 14, fontWeight: '600', color: C.text }}>QR Code on Card</Text>
                    </View>
                    <TouchableOpacity
                        onPress={() => setShowQR(!showQR)}
                        style={{ backgroundColor: showQR ? '#6C5CE7' : C.surfaceTertiary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14 }}
                    >
                        <Text style={{ fontSize: 12, fontWeight: '600', color: showQR ? '#FFF' : C.textSecondary }}>{showQR ? 'ON' : 'OFF'}</Text>
                    </TouchableOpacity>
                </View>
                <Text style={{ fontSize: 11, color: C.textTertiary, marginHorizontal: 24, marginBottom: 12 }}>Scan to save contact instantly</Text>

                {/* Logo & Photo */}
                <Text style={[s.section, { color: C.text }]}>Logo & Photo</Text>
                <View style={s.uploadRow}>
                    <TouchableOpacity style={[s.uploadBox, { borderColor: C.border, backgroundColor: C.surfaceSecondary }]} onPress={() => pickImage('logo')}>
                        {logoUri ? <Image source={{ uri: logoUri }} style={s.uploadImg} /> : (
                            <View style={s.uploadEmpty}><Ionicons name="image-outline" size={26} color={C.textTertiary} /><Text style={[s.uploadLabel, { color: C.textTertiary }]}>Business Logo</Text></View>
                        )}
                        {logoUri && <TouchableOpacity style={[s.removeBtn, { backgroundColor: C.surface }]} onPress={() => setLogoUri(null)}><Ionicons name="close-circle" size={22} color="#FF3B30" /></TouchableOpacity>}
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.uploadBox, { borderColor: C.border, backgroundColor: C.surfaceSecondary }]} onPress={() => pickImage('photo')}>
                        {photoUri ? <Image source={{ uri: photoUri }} style={s.uploadImgRound} /> : (
                            <View style={s.uploadEmpty}><Ionicons name="person-circle-outline" size={26} color={C.textTertiary} /><Text style={[s.uploadLabel, { color: C.textTertiary }]}>Your Photo</Text></View>
                        )}
                        {photoUri && <TouchableOpacity style={[s.removeBtn, { backgroundColor: C.surface }]} onPress={() => setPhotoUri(null)}><Ionicons name="close-circle" size={22} color="#FF3B30" /></TouchableOpacity>}
                    </TouchableOpacity>
                </View>

                {/* Form */}
                <Text style={[s.section, { color: C.text }]}>Card Details</Text>
                <View style={s.formSection}>
                    {([
                        { key: 'name', label: 'Full Name', icon: 'person-outline' },
                        { key: 'title', label: 'Title / Designation', icon: 'briefcase-outline' },
                        { key: 'businessName', label: 'Business Name', icon: 'business-outline' },
                        { key: 'phone', label: 'Phone Number', icon: 'call-outline' },
                        { key: 'email', label: 'Email', icon: 'mail-outline' },
                        { key: 'website', label: 'Website', icon: 'globe-outline' },
                        { key: 'whatsapp', label: 'WhatsApp Number', icon: 'logo-whatsapp' },
                        { key: 'address', label: 'Address', icon: 'location-outline' },
                    ] as const).map(f => (
                        <View key={f.key} style={[s.inputRow, { backgroundColor: C.surfaceSecondary }]}>
                            <Ionicons name={f.icon} size={18} color={C.textTertiary} style={{ marginRight: 10 }} />
                            <TextInput
                                style={[s.input, { color: C.text }]}
                                placeholder={f.label}
                                placeholderTextColor={C.textTertiary}
                                value={(cardData as any)[f.key]}
                                onChangeText={text => setCardData(prev => ({ ...prev, [f.key]: text }))}
                            />
                        </View>
                    ))}
                </View>
            </ScrollView>

            {/* Print Order Modal */}
            <PrintOrderModal
                visible={showPrintModal}
                onClose={() => setShowPrintModal(false)}
                cardName={cardData.name}
                businessName={cardData.businessName}
                phone={cardData.phone}
                templateName={TEMPLATES[selected].name}
                captureCard={async () => {
                    if (viewShotRef.current) {
                        return await captureRef(viewShotRef, { format: 'png', quality: 1 });
                    }
                    return null;
                }}
            />
        </View>
    );
}

// ─── Print Order Modal ──────────────────────────────────
const SIZE_OPTIONS = [
    { id: 'standard', name: 'Standard', desc: '3.5" x 2"', extra: 0 },
    { id: 'square', name: 'Square', desc: '2.5" x 2.5"', extra: 30 },
    { id: 'mini', name: 'Mini', desc: '3" x 1.5"', extra: 20 },
];

const PAPER_OPTIONS = [
    { id: 'standard', name: 'Standard', extra: 0 },
    { id: 'stiff', name: 'Stiff', extra: 50 },
    { id: 'extra-stiff', name: 'Extra Stiff', extra: 100 },
    { id: 'super-white', name: 'Super White', extra: 100 },
    { id: 'white-textured', name: 'White Textured', extra: 100 },
    { id: 'cream-textured', name: 'Cream Textured', extra: 100 },
    { id: 'non-tearable', name: 'Non Tearable', extra: 150 },
    { id: 'recycled', name: 'Recycled', extra: 100 },
    { id: 'metallic', name: 'Metallic', extra: 250 },
];

const LAMINATION_OPTIONS = [
    { id: 'none', name: 'None', extra: 0 },
    { id: 'matt', name: 'Matt', extra: 100 },
    { id: 'gloss', name: 'Gloss', extra: 100 },
];

const CORNER_OPTIONS = [
    { id: 'standard', name: 'Standard', extra: 0 },
    { id: 'rounded', name: 'Rounded', extra: 60 },
];

const SIDES_OPTIONS = [
    { id: 'single', name: 'Front Only', extra: 0 },
    { id: 'double', name: 'Front & Back', extra: 100 },
];

const QTY_OPTIONS = [100, 200, 300, 500, 1000];

const BASE_PRICE = 279; // per 100 pieces

function PrintOrderModal({ visible, onClose, cardName, businessName, phone, templateName, captureCard }: {
    visible: boolean; onClose: () => void; cardName: string; businessName: string; phone: string;
    templateName: string; captureCard: () => Promise<string | null>;
}) {
    const [size, setSize] = useState('standard');
    const [paperType, setPaperType] = useState('standard');
    const [lamination, setLamination] = useState('none');
    const [corner, setCorner] = useState('standard');
    const [sides, setSides] = useState('single');
    const [qty, setQty] = useState(100);
    const [address, setAddress] = useState('');
    const [pincode, setPincode] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const selectedSize = SIZE_OPTIONS.find(s => s.id === size)!;
    const selectedPaper = PAPER_OPTIONS.find(p => p.id === paperType)!;
    const selectedLamination = LAMINATION_OPTIONS.find(l => l.id === lamination)!;
    const selectedCorner = CORNER_OPTIONS.find(c => c.id === corner)!;
    const selectedSides = SIDES_OPTIONS.find(s => s.id === sides)!;
    const pricePerHundred = BASE_PRICE + selectedSize.extra + selectedPaper.extra + selectedLamination.extra + selectedCorner.extra + selectedSides.extra;
    const totalPrice = Math.round(pricePerHundred * (qty / 100));

    const handleOrder = async () => {
        if (!address.trim()) { Alert.alert('Address Required', 'Please enter your delivery address.'); return; }
        if (!pincode.trim() || pincode.length < 6) { Alert.alert('Pincode Required', 'Please enter a valid 6-digit pincode.'); return; }

        setSubmitting(true);
        try {
            // Save card design to gallery silently
            const cardImageUri = await captureCard();
            if (cardImageUri) {
                try {
                    const { status } = await MediaLibrary.requestPermissionsAsync();
                    if (status === 'granted') await MediaLibrary.saveToLibraryAsync(cardImageUri);
                } catch {}
            }

            const orderMsg = `🖨️ *New Business Card Print Order*\n\n`
                + `👤 Name: ${cardName}\n🏢 Business: ${businessName}\n📞 Phone: ${phone}\n\n`
                + `🎨 Template: ${templateName}\n📐 Size: ${selectedSize.name} (${selectedSize.desc})\n`
                + `📄 Paper: ${selectedPaper.name}\n✨ Lamination: ${selectedLamination.name}\n`
                + `🔲 Corner: ${selectedCorner.name}\n📋 Sides: ${selectedSides.name}\n`
                + `📦 Quantity: ${qty}\n💰 Total: ₹${totalPrice}\n\n`
                + `📍 Delivery Address:\n${address.trim()}\nPincode: ${pincode}\n\n`
                + `📎 _Card design image saved to your gallery — please attach it in this chat._\n\n`
                + `_Our team may call you for any doubts or clarifications._`;

            const waUrl = `https://wa.me/917990636954?text=${encodeURIComponent(orderMsg)}`;
            await Linking.openURL(waUrl);

            setSubmitted(true);
            analytics.track('Card Print Ordered');
            NotifyEvents.printOrderPlaced();
        } catch {
            Alert.alert('Error', 'Could not place order. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    if (submitted) {
        return (
            <Modal visible={visible} animationType="slide" transparent>
                <View style={ps.overlay}>
                    <View style={ps.content}>
                        <View style={{ alignItems: 'center', padding: 30 }}>
                            <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#E8F8ED', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                                <Ionicons name="checkmark-circle" size={40} color="#34C759" />
                            </View>
                            <Text style={ps.title}>Order Sent!</Text>
                            <Text style={{ fontSize: 14, color: '#6B7280', textAlign: 'center', marginTop: 8, lineHeight: 20 }}>
                                Your print order and card design have been shared via WhatsApp. Our team will confirm your order shortly.
                            </Text>
                            <Text style={{ fontSize: 12, color: '#9CA3AF', textAlign: 'center', marginTop: 10, lineHeight: 18 }}>
                                If needed, our team will call you for any doubts or clarifications regarding your order.
                            </Text>
                            <TouchableOpacity onPress={() => { setSubmitted(false); onClose(); }} style={[ps.orderBtn, { marginTop: 24 }]}>
                                <LinearGradient colors={['#6C5CE7', '#5A4BD1']} style={ps.orderBtnGrad}>
                                    <Text style={ps.orderBtnText}>Done</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        );
    }

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={ps.overlay}>
                <View style={ps.content}>
                    {/* Header */}
                    <View style={ps.header}>
                        <Text style={ps.title}>Print Business Cards</Text>
                        <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color="#333" /></TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} style={{ paddingHorizontal: 20 }}>
                        {/* Size */}
                        <Text style={ps.sectionTitle}>Size</Text>
                        <View style={ps.chipRow}>
                            {SIZE_OPTIONS.map(s => (
                                <TouchableOpacity key={s.id} onPress={() => setSize(s.id)} style={[ps.chipCard, size === s.id && ps.chipCardActive]}>
                                    <Text style={[ps.chipName, size === s.id && ps.chipNameActive]}>{s.name}</Text>
                                    <Text style={ps.chipDesc}>{s.desc}</Text>
                                    {s.extra > 0 && <Text style={ps.chipExtra}>+ ₹{s.extra}</Text>}
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Quantity */}
                        <Text style={ps.sectionTitle}>Quantity</Text>
                        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                            {QTY_OPTIONS.map(q => (
                                <TouchableOpacity key={q} onPress={() => setQty(q)} style={[ps.qtyChip, qty === q && ps.qtyChipActive]}>
                                    <Text style={[ps.qtyText, qty === q && ps.qtyTextActive]}>{q}</Text>
                                    {q >= 200 && <Text style={{ fontSize: 9, color: qty === q ? '#6C5CE7' : '#9CA3AF', marginTop: 2 }}>Save {Math.round((1 - 0.95 ** (q / 100)) * 100)}%</Text>}
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Paper */}
                        <Text style={ps.sectionTitle}>Paper</Text>
                        <View style={ps.chipRow}>
                            {PAPER_OPTIONS.map(p => (
                                <TouchableOpacity key={p.id} onPress={() => setPaperType(p.id)} style={[ps.chipCard, paperType === p.id && ps.chipCardActive]}>
                                    <Text style={[ps.chipName, paperType === p.id && ps.chipNameActive]}>{p.name}</Text>
                                    {p.extra > 0 ? <Text style={ps.chipExtra}>+ ₹{p.extra}</Text> : <Text style={ps.chipExtra}>₹0</Text>}
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Lamination */}
                        <Text style={ps.sectionTitle}>Lamination</Text>
                        <View style={ps.chipRow}>
                            {LAMINATION_OPTIONS.map(l => (
                                <TouchableOpacity key={l.id} onPress={() => setLamination(l.id)} style={[ps.chipCard, lamination === l.id && ps.chipCardActive]}>
                                    <Text style={[ps.chipName, lamination === l.id && ps.chipNameActive]}>{l.name}</Text>
                                    {l.extra > 0 ? <Text style={ps.chipExtra}>+ ₹{l.extra}</Text> : <Text style={ps.chipExtra}>₹0</Text>}
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Corner */}
                        <Text style={ps.sectionTitle}>Corner</Text>
                        <View style={ps.chipRow}>
                            {CORNER_OPTIONS.map(co => (
                                <TouchableOpacity key={co.id} onPress={() => setCorner(co.id)} style={[ps.chipCard, corner === co.id && ps.chipCardActive]}>
                                    <Text style={[ps.chipName, corner === co.id && ps.chipNameActive]}>{co.name}</Text>
                                    {co.extra > 0 ? <Text style={ps.chipExtra}>+ ₹{co.extra}</Text> : <Text style={ps.chipExtra}>₹0</Text>}
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Sides */}
                        <Text style={ps.sectionTitle}>Printing Sides</Text>
                        <View style={ps.chipRow}>
                            {SIDES_OPTIONS.map(si => (
                                <TouchableOpacity key={si.id} onPress={() => setSides(si.id)} style={[ps.chipCard, sides === si.id && ps.chipCardActive]}>
                                    <Text style={[ps.chipName, sides === si.id && ps.chipNameActive]}>{si.name}</Text>
                                    {si.extra > 0 ? <Text style={ps.chipExtra}>+ ₹{si.extra}</Text> : <Text style={ps.chipExtra}>₹0</Text>}
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Delivery Address */}
                        <Text style={ps.sectionTitle}>Delivery Address</Text>
                        <TextInput
                            style={ps.addressInput}
                            placeholder="Full address (house, street, city, state)"
                            placeholderTextColor="#9CA3AF"
                            value={address}
                            onChangeText={setAddress}
                            multiline
                            numberOfLines={3}
                        />
                        <TextInput
                            style={[ps.addressInput, { marginTop: 10, height: 48 }]}
                            placeholder="Pincode"
                            placeholderTextColor="#9CA3AF"
                            value={pincode}
                            onChangeText={setPincode}
                            keyboardType="number-pad"
                            maxLength={6}
                        />

                        {/* Price Summary */}
                        <Text style={ps.sectionTitle}>Order Summary</Text>
                        <View style={ps.priceCard}>
                            <View style={ps.summaryRow}><Text style={ps.summaryLabel}>Size</Text><Text style={ps.summaryValue}>{selectedSize.name}</Text></View>
                            <View style={ps.summaryRow}><Text style={ps.summaryLabel}>Quantity</Text><Text style={ps.summaryValue}>{qty} Pieces</Text></View>
                            <View style={ps.summaryRow}><Text style={ps.summaryLabel}>Paper</Text><Text style={ps.summaryValue}>{selectedPaper.name}{selectedPaper.extra > 0 ? ` (+₹${selectedPaper.extra})` : ''}</Text></View>
                            <View style={ps.summaryRow}><Text style={ps.summaryLabel}>Lamination</Text><Text style={ps.summaryValue}>{selectedLamination.name}{selectedLamination.extra > 0 ? ` (+₹${selectedLamination.extra})` : ''}</Text></View>
                            <View style={ps.summaryRow}><Text style={ps.summaryLabel}>Corner</Text><Text style={ps.summaryValue}>{selectedCorner.name}{selectedCorner.extra > 0 ? ` (+₹${selectedCorner.extra})` : ''}</Text></View>
                            <View style={ps.summaryRow}><Text style={ps.summaryLabel}>Sides</Text><Text style={ps.summaryValue}>{selectedSides.name}{selectedSides.extra > 0 ? ` (+₹${selectedSides.extra})` : ''}</Text></View>
                            <View style={ps.summaryRow}><Text style={ps.summaryLabel}>Delivery</Text><Text style={{ fontSize: 13, color: '#34C759', fontWeight: '600' }}>FREE</Text></View>
                            <View style={{ height: 1, backgroundColor: '#E5E7EB', marginVertical: 10 }} />
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <Text style={{ fontSize: 17, color: '#111827', fontWeight: '800' }}>Total Price</Text>
                                <Text style={{ fontSize: 17, color: '#6C5CE7', fontWeight: '800' }}>₹{totalPrice}</Text>
                            </View>
                            <Text style={{ fontSize: 10, color: '#9CA3AF', marginTop: 4 }}>Including shipping and taxes</Text>
                        </View>

                        {/* Order Button */}
                        <TouchableOpacity onPress={handleOrder} disabled={submitting} style={ps.orderBtn}>
                            <LinearGradient colors={['#6C5CE7', '#5A4BD1']} style={ps.orderBtnGrad}>
                                {submitting
                                    ? <ActivityIndicator color="#FFF" size="small" />
                                    : <><Ionicons name="logo-whatsapp" size={20} color="#FFF" style={{ marginRight: 8 }} /><Text style={ps.orderBtnText}>Place Order on WhatsApp</Text></>
                                }
                            </LinearGradient>
                        </TouchableOpacity>

                        <Text style={{ fontSize: 11, color: '#9CA3AF', textAlign: 'center', marginTop: 10, marginBottom: 30, lineHeight: 16 }}>
                            Your order will be sent via WhatsApp. Payment on delivery or via UPI. Delivery in 3-5 business days.
                        </Text>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const ps = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    content: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    title: { fontSize: 20, fontWeight: '800', color: '#111827' },
    sectionTitle: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 10, marginTop: 16 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
    chipCard: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: '#E5E7EB', backgroundColor: '#FAFAFA', minWidth: 80, alignItems: 'center' },
    chipCardActive: { borderColor: '#6C5CE7', backgroundColor: '#F5F3FF' },
    chipName: { fontSize: 13, fontWeight: '600', color: '#374151' },
    chipNameActive: { color: '#6C5CE7' },
    chipDesc: { fontSize: 10, color: '#9CA3AF', marginTop: 2 },
    chipExtra: { fontSize: 10, color: '#6C5CE7', marginTop: 2, fontWeight: '600' },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    summaryLabel: { fontSize: 13, color: '#6B7280' },
    summaryValue: { fontSize: 13, color: '#374151', fontWeight: '600' },
    qtyChip: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1.5, borderColor: '#E5E7EB', alignItems: 'center' },
    qtyChipActive: { borderColor: '#6C5CE7', backgroundColor: '#F5F3FF' },
    qtyText: { fontSize: 15, fontWeight: '700', color: '#6B7280' },
    qtyTextActive: { color: '#6C5CE7' },
    addressInput: { backgroundColor: '#F9FAFB', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#111827', textAlignVertical: 'top', minHeight: 80 },
    priceCard: { backgroundColor: '#F9FAFB', borderRadius: 14, padding: 16, marginTop: 16 },
    orderBtn: { marginTop: 16, width: '100%' },
    orderBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 14 },
    orderBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});

// ─── Card styles (shared across templates) ───────────────
const cs = StyleSheet.create({
    card: {
        borderRadius: 16, padding: 20,
        shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 8,
        backgroundColor: '#FFF',
    },
    name: { fontSize: 18, fontWeight: '800' },
    logoTopRight: {
        position: 'absolute', top: 14, right: 14,
        width: 36, height: 36, borderRadius: 6, resizeMode: 'contain',
        backgroundColor: 'rgba(255,255,255,0.12)',
    },
});

// ─── Screen styles ───────────────────────────────────────
const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFFFF' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F5F5F7', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#1D1D1F' },
    dotsRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 14 },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#D1D1D6' },
    dotActive: { width: 20, backgroundColor: '#1A7CFF' },
    templateName: { textAlign: 'center', fontSize: 13, fontWeight: '600', color: '#48484A', marginTop: 6, marginBottom: 4 },
    quickActions: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 24, paddingVertical: 14 },
    quickAction: { alignItems: 'center', gap: 6 },
    quickIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
    quickText: { fontSize: 12, fontWeight: '600', color: '#48484A' },
    section: { fontSize: 16, fontWeight: '700', color: '#1D1D1F', marginHorizontal: 24, marginTop: 8, marginBottom: 12 },
    uploadRow: { flexDirection: 'row', gap: 16, marginHorizontal: 24, marginBottom: 16 },
    uploadBox: { flex: 1, height: 100, borderRadius: 14, borderWidth: 2, borderColor: '#E5E5E7', borderStyle: 'dashed', overflow: 'hidden', backgroundColor: '#FAFAFA' },
    uploadEmpty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 4 },
    uploadLabel: { fontSize: 12, fontWeight: '600', color: '#86868B' },
    uploadImg: { width: '100%', height: '100%', resizeMode: 'contain' },
    uploadImgRound: { width: '100%', height: '100%', resizeMode: 'cover' },
    removeBtn: { position: 'absolute', top: 4, right: 4, backgroundColor: '#FFF', borderRadius: 11 },
    formSection: { marginHorizontal: 24, gap: 12 },
    inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F7', borderRadius: 12, paddingHorizontal: 14, height: 48 },
    input: { flex: 1, fontSize: 15, color: '#1D1D1F' },
});
