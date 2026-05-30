import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Alert,
    Image,
    Platform,
    StyleSheet,
    Animated,
    useWindowDimensions,
    Keyboard,
    TouchableWithoutFeedback,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import ViewShot from 'react-native-view-shot';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import { DesignTemplate, TemplateField } from '../../data/designTemplates';
import { EXPORT_SIZES } from '../../data/exportSizes';
import { useAuthStore } from '../../store/useAuthStore';
import { useDesignStore } from '../../store/useDesignStore';
import { useColors } from '../../utils/theme';
import { useBottomSafe } from '../../utils/useBottomSafe';
import { captureAndSaveDesign, captureDesignImage, showExportError } from '../../utils/designExport';

type EditorTab = 'text' | 'image' | 'colors' | 'export';

// Color palette presets
const COLOR_PRESETS = [
    {
        name: 'Ocean',
        colors: { primary: '#0F4C81', secondary: '#00B4D8', accent: '#CAF0F8', background: ['#0F4C81', '#023E73'] as readonly [string, string, ...string[]] },
    },
    {
        name: 'Sunset',
        colors: { primary: '#FF6B35', secondary: '#FFD700', accent: '#FFF4E0', background: ['#FF6B35', '#F7418F'] as readonly [string, string, ...string[]] },
    },
    {
        name: 'Forest',
        colors: { primary: '#2D6A4F', secondary: '#95D5B2', accent: '#D8F3DC', background: ['#2D6A4F', '#1B4332'] as readonly [string, string, ...string[]] },
    },
    {
        name: 'Royal',
        colors: { primary: '#7B2CBF', secondary: '#C77DFF', accent: '#E0AAFF', background: ['#7B2CBF', '#3C096C'] as readonly [string, string, ...string[]] },
    },
    {
        name: 'Midnight',
        colors: { primary: '#1D1D1F', secondary: '#48484A', accent: '#E5E5E7', background: ['#1D1D1F', '#2C2C2E'] as readonly [string, string, ...string[]] },
    },
    {
        name: 'Rose',
        colors: { primary: '#BE185D', secondary: '#F472B6', accent: '#FDF2F8', background: ['#BE185D', '#9D174D'] as readonly [string, string, ...string[]] },
    },
    {
        name: 'Gold',
        colors: { primary: '#B8860B', secondary: '#FFD700', accent: '#FFF8DC', background: ['#1A0A2E', '#16213E'] as readonly [string, string, ...string[]] },
    },
    {
        name: 'Crimson',
        colors: { primary: '#DC2626', secondary: '#FDE047', accent: '#FEF3C7', background: ['#DC2626', '#991B1B'] as readonly [string, string, ...string[]] },
    },
];

// ─── Template Canvas ───────────────────────────────────────────
const TemplateCanvas = ({
    template,
    fields,
    colors,
    logoUri,
    bgImageUri,
    productImageUri,
    size,
    viewShotRef,
}: {
    template: DesignTemplate;
    fields: TemplateField[];
    colors: typeof COLOR_PRESETS[0]['colors'];
    logoUri: string | null;
    bgImageUri?: string | null;
    productImageUri?: string | null;
    size: number;
    viewShotRef: any;
}) => {
    const bgColors = colors.background || template.colors.background;
    const pad = Math.round(size * 0.044);

    // Separate fields by role for structured layout
    const headlineField = fields.find(f => f.id === 'headline');
    const taglineField  = fields.find(f => f.type === 'tagline' && f.visible);
    const phoneField    = fields.find(f => f.type === 'phone'   && f.visible);
    const ctaField      = fields.find(f => f.type === 'cta'     && f.visible);
    const bizNameField  = fields.find(f => f.id   === 'business-name' && f.visible);
    const bodyFields    = fields.filter(f =>
        f.visible && f.type !== 'logo' && f.type !== 'phone' && f.type !== 'cta' &&
        f.id !== 'headline' && f.id !== 'business-name' && f.type !== 'tagline'
    );

    const ctaBg = ctaField
        ? (ctaField.style.color === '#FFFFFF'
            ? colors.primary || template.colors.primary
            : colors.secondary || template.colors.secondary || colors.accent || template.colors.accent)
        : template.colors.secondary;

    const hasProduct = !!productImageUri && !bgImageUri;
    const textRight  = hasProduct ? size * 0.47 : pad; // text area ends before product image

    return (
        <View style={styles.canvasWrapper}>
            <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1.0, result: 'tmpfile' }}>
                <View collapsable={false} style={[styles.canvas, { width: size, height: size }]}>

                    {/* ── Background ── */}
                    {bgImageUri ? (
                        // User-uploaded background: show as-is
                        <Image source={{ uri: bgImageUri }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                    ) : template.backgroundImageUrl ? (
                        // Stock photo background with dark + brand-color overlay
                        <>
                            <Image
                                source={{ uri: template.backgroundImageUrl }}
                                style={StyleSheet.absoluteFillObject}
                                resizeMode="cover"
                            />
                            {/* Dark gradient for readability */}
                            <LinearGradient
                                colors={[`rgba(0,0,0,${(template.overlayOpacity ?? 0.55) + 0.08})`, `rgba(0,0,0,${(template.overlayOpacity ?? 0.55) - 0.1})`, `rgba(0,0,0,${(template.overlayOpacity ?? 0.55) + 0.1})`]}
                                start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
                                style={StyleSheet.absoluteFillObject}
                            />
                            {/* Brand color tint */}
                            <View style={[StyleSheet.absoluteFillObject, { backgroundColor: bgColors[0] + '50' }]} />
                        </>
                    ) : (
                        // Fallback: solid gradient
                        <LinearGradient
                            colors={bgColors as unknown as readonly [string, string, ...string[]]}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                            style={StyleSheet.absoluteFillObject}
                        />
                    )}

                    {/* ── Decorative elements ── */}
                    {template.decorations.type === 'festive' && (
                        <>
                            <View style={{ position: 'absolute', top: 20, right: 50, opacity: template.decorations.opacity + 0.2 }}><Text style={{ fontSize: 28 }}>✨</Text></View>
                            <View style={{ position: 'absolute', bottom: 80, left: 25, opacity: template.decorations.opacity + 0.15 }}><Text style={{ fontSize: 22 }}>⭐</Text></View>
                            <View style={{ position: 'absolute', top: 80, left: 50, opacity: template.decorations.opacity }}><Text style={{ fontSize: 16 }}>✨</Text></View>
                        </>
                    )}
                    {template.decorations.type === 'food' && (
                        <>
                            <View style={{ position: 'absolute', top: 15, right: 20, opacity: 0.3 }}><Text style={{ fontSize: 36 }}>🍛</Text></View>
                            <View style={{ position: 'absolute', bottom: 70, right: 35, opacity: 0.25 }}><Text style={{ fontSize: 28 }}>🍽️</Text></View>
                        </>
                    )}
                    {template.decorations.type === 'geometric' && (
                        <>
                            <View style={{ position: 'absolute', top: -30, right: 40, width: 0, height: 0, borderLeftWidth: 50, borderRightWidth: 50, borderBottomWidth: 90, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: template.colors.secondary + '25' }} />
                            <View style={{ position: 'absolute', bottom: 60, right: -15, width: 80, height: 80, borderWidth: 2, borderColor: template.colors.secondary + '30', transform: [{ rotate: '45deg' }] }} />
                        </>
                    )}
                    {template.decorations.type === 'waves' && (
                        <View style={{ position: 'absolute', bottom: -50, left: -30, width: 250, height: 100, borderRadius: 120, backgroundColor: template.colors.secondary + '25' }} />
                    )}
                    {template.decorations.type === 'circles' && (
                        <>
                            <View style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.08)' }} />
                            <View style={{ position: 'absolute', bottom: 20, left: -30, width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.06)' }} />
                        </>
                    )}
                    {template.decorations.type === 'dots' && Array.from({ length: 12 }).map((_, i) => (
                        <View key={i} style={{ position: 'absolute', top: (i * 83) % size, left: (i * 137) % size, width: 4 + (i % 3) * 2, height: 4 + (i % 3) * 2, borderRadius: 10, backgroundColor: template.colors.secondary + '30' }} />
                    ))}

                    {/* ── Product / Hero image (right side) ── */}
                    {hasProduct && (
                        <View style={{ position: 'absolute', right: 0, top: size * 0.14, bottom: size * 0.17, width: size * 0.52, overflow: 'hidden', borderTopLeftRadius: size * 0.06, borderBottomLeftRadius: size * 0.06 }}>
                            <Image source={{ uri: productImageUri! }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                            {/* Fade edge to blend with background */}
                            <LinearGradient
                                colors={[bgColors[0], 'transparent']}
                                start={{ x: 0, y: 0.5 }} end={{ x: 0.35, y: 0.5 }}
                                style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: size * 0.2 }}
                            />
                        </View>
                    )}

                    {/* ── TOP ROW: Logo + Badge ── */}
                    <View style={{ position: 'absolute', top: pad, left: pad, right: pad, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                        {/* Logo */}
                        {logoUri ? (
                            <Image source={{ uri: logoUri }} style={{ width: size * 0.11, height: size * 0.11, borderRadius: size * 0.022 }} resizeMode="contain" />
                        ) : (
                            <View style={{ width: size * 0.11, height: size * 0.11, borderRadius: size * 0.022, borderWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.35)', alignItems: 'center', justifyContent: 'center' }}>
                                <Ionicons name="image-outline" size={size * 0.04} color="rgba(255,255,255,0.5)" />
                                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: size * 0.018, fontWeight: '700', marginTop: 1 }}>LOGO</Text>
                            </View>
                        )}
                        {/* Badge */}
                        {template.badge && (
                            <View style={{ backgroundColor: template.badge.bgColor, paddingHorizontal: size * 0.025, paddingVertical: size * 0.012, borderRadius: size * 0.015 }}>
                                <Text style={{ color: template.badge.color, fontSize: size * 0.022, fontWeight: '800', letterSpacing: 0.5 }}>{template.badge.text}</Text>
                            </View>
                        )}
                    </View>

                    {/* ── Business name (below logo) ── */}
                    {bizNameField && (
                        <View style={{ position: 'absolute', top: pad + size * 0.13, left: pad }}>
                            <Text style={{ fontSize: size * 0.024, fontWeight: '700', color: bizNameField.style.color || template.colors.textSecondary, letterSpacing: 2, textTransform: 'uppercase' }} numberOfLines={1}>
                                {bizNameField.defaultValue}
                            </Text>
                        </View>
                    )}

                    {/* ── MAIN CONTENT (left column) ── */}
                    <View style={{ position: 'absolute', top: size * 0.3, left: pad, right: textRight, bottom: size * 0.2 }}>
                        {headlineField?.visible && (
                            <Text style={{ fontSize: (headlineField.style.fontSize || 32) * (size / 500), fontWeight: headlineField.style.fontWeight || '900', color: headlineField.style.color || template.colors.textPrimary, textAlign: headlineField.style.textAlign as any || 'left', letterSpacing: headlineField.style.letterSpacing || 0 }}>
                                {headlineField.defaultValue}
                            </Text>
                        )}
                        {taglineField && (
                            <Text style={{ fontSize: (taglineField.style.fontSize || 15) * (size / 500), fontWeight: taglineField.style.fontWeight || '600', color: taglineField.style.color || template.colors.textSecondary, textAlign: taglineField.style.textAlign as any || 'left', marginTop: size * 0.012 }}>
                                {taglineField.defaultValue}
                            </Text>
                        )}
                        {bodyFields.map(f => (
                            <Text key={f.id} numberOfLines={3} style={{ fontSize: (f.style.fontSize || 13) * (size / 500), fontWeight: f.style.fontWeight || 'normal', color: f.style.color || template.colors.textPrimary, textAlign: f.style.textAlign as any || 'left', letterSpacing: f.style.letterSpacing || 0, textTransform: f.style.textTransform || 'none', marginTop: size * 0.01 }}>
                                {f.defaultValue}
                            </Text>
                        ))}
                    </View>

                    {/* ── BOTTOM BAR: divider + CTA + Phone ── */}
                    <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
                        <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.25)', marginHorizontal: pad }} />
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: pad, paddingVertical: pad * 0.85 }}>
                            {ctaField && (
                                <View style={{ backgroundColor: ctaBg, paddingHorizontal: size * 0.052, paddingVertical: size * 0.024, borderRadius: size * 0.022 }}>
                                    <Text style={{ color: ctaField.style.color || '#FFF', fontSize: (ctaField.style.fontSize || 14) * (size / 500), fontWeight: ctaField.style.fontWeight || '800', textTransform: ctaField.style.textTransform || 'uppercase', letterSpacing: 0.5 }}>
                                        {ctaField.defaultValue}
                                    </Text>
                                </View>
                            )}
                            {phoneField && (
                                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.28)', paddingHorizontal: size * 0.028, paddingVertical: size * 0.018, borderRadius: size * 0.018, gap: 5 }}>
                                    <Ionicons name="call" size={size * 0.03} color="#FFF" />
                                    <Text style={{ color: '#FFF', fontSize: size * 0.027, fontWeight: '700' }}>
                                        {phoneField.defaultValue.replace(/^[📞📱]\s*/u, '')}
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>

                </View>
            </ViewShot>
        </View>
    );
};

// ═══════════════════════════════════════════════════════════════
// TEMPLATE EDITOR SCREEN
// ═══════════════════════════════════════════════════════════════
export const TemplateEditorScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const template: DesignTemplate = route.params?.template;
    const { width } = useWindowDimensions();
    const C = useColors();
    const bottomSafe = useBottomSafe();
    const { user } = useAuthStore();
    const { addDesign } = useDesignStore();
    const viewShotRef = useRef<any>(null);

    // Calculate dynamic sizes
    const canvasSize = Math.min(width - 40, 450); // Cap canvas size for large screens
    const contentMaxWidth = 600; // Cap content width for large screens

    // Initialize fields with auto-population logic
    const initializeFields = () => {
        if (!template?.fields) return [];
        return template.fields.map(f => {
            const field = { ...f };
            // Auto-populate data from auth store
            if (user) {
                if (field.id === 'business-name' || field.label.toLowerCase().includes('business')) {
                    field.defaultValue = user.businessName || user.fullName || field.defaultValue;
                }
                if (field.type === 'phone' || field.label.toLowerCase().includes('phone')) {
                    const cleanP = user.phone ? user.phone.replace(/^\++/, '+') : '';
                    field.defaultValue = cleanP ? `📞 ${cleanP}` : field.defaultValue;
                }
                if (field.type === 'website' && field.defaultValue === '') {
                    field.defaultValue = user?.website || '';
                }
            }
            return field;
        });
    };

    // State
    const [fields, setFields] = useState<TemplateField[]>(initializeFields);
    const [activeTab, setActiveTab] = useState<EditorTab>('text');
    const [logoUri, setLogoUri] = useState<string | null>(null);
    const [bgImageUri, setBgImageUri] = useState<string | null>(null);
    const [productImageUri, setProductImageUri] = useState<string | null>(null);
    const [selectedColorPreset, setSelectedColorPreset] = useState<number | null>(null);
    const [customColors, setCustomColors] = useState(template?.colors || COLOR_PRESETS[0].colors);
    const [saving, setSaving] = useState(false);
    const [editingFieldId, setEditingFieldId] = useState<string | null>(null);

    const activeColors = useMemo(() => {
        if (selectedColorPreset !== null) {
            return COLOR_PRESETS[selectedColorPreset].colors;
        }
        return customColors;
    }, [selectedColorPreset, customColors]);

    // Handlers
    const toggleFieldVisibility = useCallback((id: string) => {
        setFields(prev => prev.map(f => (f.id === id ? { ...f, visible: !f.visible } : f)));
    }, []);

    const updateFieldValue = useCallback((id: string, value: string) => {
        setFields(prev => prev.map(f => (f.id === id ? { ...f, defaultValue: value } : f)));
    }, []);

    const pickLogo = useCallback(async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
            setLogoUri(result.assets[0].uri);
        }
    }, []);

    const pickProductImage = useCallback(async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.9,
        });
        if (!result.canceled && result.assets[0]) {
            setProductImageUri(result.assets[0].uri);
            setBgImageUri(null); // product image and bg image are mutually exclusive
        }
    }, []);

    const pickBackgroundImage = useCallback(async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.9,
        });

        if (!result.canceled && result.assets[0]) {
            setBgImageUri(result.assets[0].uri);
            Alert.alert('Background Updated', 'Custom background image applied!');
        }
    }, []);

    const handleExport = useCallback(async () => {
        if (saving) return; // Prevent double taps
        setSaving(true);
        try {
            const designId = `design-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            const now = new Date().toISOString();
            const { imageUri, phoneSaved } = await captureAndSaveDesign({
                viewRef: viewShotRef,
                addDesign,
                saveToPhone: true,
                design: {
                    id: designId,
                    name: template.name,
                    templateId: template.id,
                    templateName: template.name,
                    category: template.category,
                    categoryIcon: template.categoryIcon,
                    createdAt: now,
                    updatedAt: now,
                },
            });

            Alert.alert(
                'Saved!',
                phoneSaved
                    ? 'Design saved to your phone and My Designs.'
                    : 'Design saved to My Designs. Phone gallery permission was not granted.',
                [
                    { text: 'OK' },
                    {
                        text: 'Run Ad',
                        onPress: () => {
                            navigation.navigate('CreateAd', { designUri: imageUri, designName: template.name });
                        },
                    },
                ]
            );

        } catch (error) {
            console.error('Export failed:', error);
            showExportError();
        } finally {
            setSaving(false);
        }
    }, [saving, viewShotRef, addDesign, template, navigation]);

    const handleSaveAndPost = useCallback(async () => {
        if (saving) return;
        setSaving(true);
        try {
            const designId = `design-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            const now = new Date().toISOString();
            const { imageUri } = await captureAndSaveDesign({
                viewRef: viewShotRef,
                addDesign,
                design: {
                    id: designId,
                    name: template.name,
                    templateId: template.id,
                    templateName: template.name,
                    category: template.category,
                    categoryIcon: template.categoryIcon,
                    createdAt: now,
                    updatedAt: now,
                },
            });

            // Navigate to ad creation with the design
            navigation.navigate('CreateAd', { designUri: imageUri, designName: template.name });
        } catch (error) {
            console.error('Save and post failed:', error);
            showExportError('Could not prepare ad');
        } finally {
            setSaving(false);
        }
    }, [saving, viewShotRef, template, addDesign, navigation]);

    if (!template) {
        return (
            <ScreenWrapper bg="bg-white">
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>Template not found</Text>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.errorButton}>
                        <Text style={styles.errorButtonText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </ScreenWrapper>
        );
    }

    const tabs: { key: EditorTab; label: string; icon: string }[] = [
        { key: 'text', label: 'Text', icon: 'text' },
        { key: 'image', label: 'Image', icon: 'image-outline' },
        { key: 'colors', label: 'Colors', icon: 'color-palette-outline' },
        { key: 'export', label: 'Export', icon: 'share-outline' },
    ];

    return (
        <ScreenWrapper bg="bg-white">
            {/* ── Header ──────────────────────────────────────── */}
            <View style={[styles.editorHeader, { backgroundColor: C.surface, borderBottomColor: C.borderLight }]}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={[styles.backButton, { backgroundColor: C.surfaceSecondary }]}
                    activeOpacity={0.7}
                >
                    <Ionicons name="chevron-back" size={24} color={C.text} />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={[styles.editorTitle, { color: C.text }]} numberOfLines={1}>
                        {template.name}
                    </Text>
                    <Text style={styles.editorCategory}>
                        {template.categoryIcon} {template.category}
                    </Text>
                </View>
                <TouchableOpacity
                    onPress={handleExport}
                    style={styles.exportHeaderButton}
                    activeOpacity={0.7}
                >
                    <Ionicons name="download-outline" size={22} color="#1A7CFF" />
                </TouchableOpacity>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 120, alignItems: 'center' }}
                keyboardShouldPersistTaps="handled"
            >
                {/* ── Canvas Preview ─────────────────────────────── */}
                <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
                    <View>
                        <TemplateCanvas
                            template={template}
                            fields={fields}
                            colors={activeColors as any}
                            logoUri={logoUri}
                            bgImageUri={bgImageUri}
                            productImageUri={productImageUri}
                            size={canvasSize}
                            viewShotRef={viewShotRef}
                        />
                    </View>
                </TouchableWithoutFeedback>

                <View style={{ width: Math.min(width, contentMaxWidth) }}>
                    {/* ── Editor Tabs ────────────────────────────────── */}
                    <View style={styles.tabBar}>
                        {tabs.map(tab => (
                            <TouchableOpacity
                                key={tab.key}
                                onPress={() => setActiveTab(tab.key)}
                                style={[styles.tab, activeTab === tab.key && styles.activeTab]}
                                activeOpacity={0.7}
                            >
                                <Ionicons
                                    name={tab.icon as any}
                                    size={20}
                                    color={activeTab === tab.key ? '#1A7CFF' : '#86868B'}
                                />
                                <Text
                                    style={[
                                        styles.tabLabel,
                                        activeTab === tab.key && styles.activeTabLabel,
                                    ]}
                                >
                                    {tab.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* ── Tab Content ─────────────────────────────────── */}
                    <View style={styles.tabContent}>
                        {/* TEXT TAB */}
                        {activeTab === 'text' && (
                            <View>
                                <Text style={[styles.tabSectionTitle, { color: C.text }]}>Edit Text Fields</Text>
                                <Text style={styles.tabSectionSubtitle}>
                                    Tap any field to edit · Toggle visibility with the eye icon
                                </Text>

                                {fields
                                    .filter(f => f.type !== 'logo')
                                    .map(field => (
                                        <View key={field.id} style={styles.fieldRow}>
                                            <View style={styles.fieldHeader}>
                                                <View style={styles.fieldLabelRow}>
                                                    <View style={[styles.fieldTypeBadge, { backgroundColor: getFieldColor(field.type) + '15' }]}>
                                                        <Text style={[styles.fieldTypeText, { color: getFieldColor(field.type) }]}>
                                                            {field.label}
                                                        </Text>
                                                    </View>
                                                </View>
                                                <TouchableOpacity
                                                    onPress={() => toggleFieldVisibility(field.id)}
                                                    style={styles.visibilityButton}
                                                >
                                                    <Ionicons
                                                        name={field.visible ? 'eye' : 'eye-off'}
                                                        size={20}
                                                        color={field.visible ? '#1A7CFF' : '#D1D1D6'}
                                                    />
                                                </TouchableOpacity>
                                            </View>

                                            <TextInput
                                                style={[
                                                    styles.fieldInput,
                                                    { backgroundColor: C.surfaceSecondary, color: C.text },
                                                    !field.visible && styles.fieldInputDisabled,
                                                    editingFieldId === field.id && styles.fieldInputFocused,
                                                ]}
                                                value={field.defaultValue}
                                                onChangeText={text => updateFieldValue(field.id, text)}
                                                placeholder={field.placeholder}
                                                placeholderTextColor="#A1A1A6"
                                                multiline
                                                editable={field.visible}
                                                onFocus={() => setEditingFieldId(field.id)}
                                                onBlur={() => setEditingFieldId(null)}
                                                returnKeyType="done"
                                                blurOnSubmit={true}
                                                onSubmitEditing={Keyboard.dismiss}
                                            />
                                        </View>
                                    ))}
                            </View>
                        )}

                        {/* IMAGE TAB */}
                        {activeTab === 'image' && (
                            <View>
                                <Text style={styles.tabSectionTitle}>Images & Media</Text>
                                <Text style={styles.tabSectionSubtitle}>
                                    Add your logo and background image
                                </Text>

                                {/* Logo Upload */}
                                <TouchableOpacity
                                    onPress={pickLogo}
                                    style={styles.imageUploadCard}
                                    activeOpacity={0.8}
                                >
                                    <LinearGradient
                                        colors={['#EEF4FF', '#DCE8FF']}
                                        style={styles.imageUploadGradient}
                                    >
                                        {logoUri ? (
                                            <Image
                                                source={{ uri: logoUri }}
                                                style={styles.uploadPreview}
                                                resizeMode="contain"
                                            />
                                        ) : (
                                            <View style={styles.uploadPlaceholder}>
                                                <View style={styles.uploadIconContainer}>
                                                    <Ionicons name="business-outline" size={32} color="#1A7CFF" />
                                                </View>
                                                <Text style={styles.uploadTitle}>Upload Logo</Text>
                                                <Text style={styles.uploadSubtitle}>PNG, JPG — Square recommended</Text>
                                            </View>
                                        )}
                                    </LinearGradient>
                                    {logoUri && (
                                        <View style={styles.imageActions}>
                                            <TouchableOpacity style={styles.imageActionBtn} onPress={pickLogo}>
                                                <Ionicons name="swap-horizontal" size={16} color="#1A7CFF" />
                                                <Text style={styles.imageActionText}>Change</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity style={styles.imageActionBtn} onPress={() => setLogoUri(null)}>
                                                <Ionicons name="trash-outline" size={16} color="#FF3B30" />
                                                <Text style={[styles.imageActionText, { color: '#FF3B30' }]}>Remove</Text>
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                </TouchableOpacity>

                                {/* Product / Hero Photo */}
                                <TouchableOpacity
                                    onPress={pickProductImage}
                                    style={[styles.imageUploadCard, { marginTop: 16 }]}
                                    activeOpacity={0.8}
                                >
                                    <LinearGradient
                                        colors={productImageUri ? ['#F0FFF4', '#DCFCE7'] : ['#FFF7ED', '#FEE2E2']}
                                        style={styles.imageUploadGradient}
                                    >
                                        {productImageUri ? (
                                            <Image source={{ uri: productImageUri }} style={styles.uploadPreview} resizeMode="cover" />
                                        ) : (
                                            <View style={styles.uploadPlaceholder}>
                                                <View style={[styles.uploadIconContainer, { backgroundColor: '#FEE2E2' }]}>
                                                    <Ionicons name="shirt-outline" size={32} color="#EF4444" />
                                                </View>
                                                <Text style={styles.uploadTitle}>Product / Hero Photo</Text>
                                                <Text style={styles.uploadSubtitle}>Appears on right side of poster</Text>
                                            </View>
                                        )}
                                    </LinearGradient>
                                    {productImageUri && (
                                        <View style={styles.imageActions}>
                                            <TouchableOpacity style={styles.imageActionBtn} onPress={pickProductImage}>
                                                <Ionicons name="swap-horizontal" size={16} color="#1A7CFF" />
                                                <Text style={styles.imageActionText}>Change</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity style={styles.imageActionBtn} onPress={() => setProductImageUri(null)}>
                                                <Ionicons name="trash-outline" size={16} color="#FF3B30" />
                                                <Text style={[styles.imageActionText, { color: '#FF3B30' }]}>Remove</Text>
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                </TouchableOpacity>

                                {/* Background Image */}
                                <TouchableOpacity
                                    onPress={pickBackgroundImage}
                                    style={[styles.imageUploadCard, { marginTop: 16 }]}
                                    activeOpacity={0.8}
                                >
                                    <LinearGradient
                                        colors={['#F5F5F7', '#ECECEE']}
                                        style={styles.imageUploadGradient}
                                    >
                                        <View style={styles.uploadPlaceholder}>
                                            <View style={[styles.uploadIconContainer, { backgroundColor: '#F0F0F2' }]}>
                                                <Ionicons name="images-outline" size={32} color="#48484A" />
                                            </View>
                                            <Text style={styles.uploadTitle}>Background Image</Text>
                                            <Text style={styles.uploadSubtitle}>Replace gradient with your own image</Text>
                                        </View>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* COLORS TAB */}
                        {activeTab === 'colors' && (
                            <View>
                                <Text style={styles.tabSectionTitle}>Color Theme</Text>
                                <Text style={styles.tabSectionSubtitle}>
                                    Choose a preset or customize your brand colors
                                </Text>

                                {/* Original Template Colors */}
                                <TouchableOpacity
                                    style={[
                                        styles.colorPresetCard,
                                        selectedColorPreset === null && styles.colorPresetCardActive,
                                    ]}
                                    onPress={() => {
                                        setSelectedColorPreset(null);
                                        setCustomColors(template.colors);
                                    }}
                                    activeOpacity={0.8}
                                >
                                    <View style={styles.colorPresetHeader}>
                                        <Text style={styles.colorPresetName}>Original</Text>
                                        {selectedColorPreset === null && (
                                            <Ionicons name="checkmark-circle" size={20} color="#1A7CFF" />
                                        )}
                                    </View>
                                    <View style={styles.colorSwatches}>
                                        {template.colors.background.map((color, i) => (
                                            <View
                                                key={i}
                                                style={[styles.colorSwatch, { backgroundColor: color }]}
                                            />
                                        ))}
                                        <View style={[styles.colorSwatch, { backgroundColor: template.colors.secondary }]} />
                                    </View>
                                </TouchableOpacity>

                                {/* Presets Grid */}
                                <View style={styles.presetsGrid}>
                                    {COLOR_PRESETS.map((preset, index) => (
                                        <TouchableOpacity
                                            key={preset.name}
                                            style={[
                                                styles.colorPresetCard,
                                                styles.colorPresetCardSmall,
                                                selectedColorPreset === index && styles.colorPresetCardActive,
                                            ]}
                                            onPress={() => setSelectedColorPreset(index)}
                                            activeOpacity={0.8}
                                        >
                                            <View style={styles.colorPresetHeader}>
                                                <Text style={styles.colorPresetNameSmall}>{preset.name}</Text>
                                                {selectedColorPreset === index && (
                                                    <Ionicons name="checkmark-circle" size={16} color="#1A7CFF" />
                                                )}
                                            </View>
                                            <View style={styles.colorSwatches}>
                                                {preset.colors.background.map((color, i) => (
                                                    <View
                                                        key={i}
                                                        style={[styles.colorSwatchSmall, { backgroundColor: color }]}
                                                    />
                                                ))}
                                            </View>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        )}

                        {/* EXPORT TAB */}
                        {activeTab === 'export' && (
                            <View>
                                <Text style={styles.tabSectionTitle}>Export & Share</Text>
                                <Text style={styles.tabSectionSubtitle}>
                                    Save to gallery or share directly
                                </Text>

                                {/* Export Options */}
                                <TouchableOpacity
                                    style={styles.exportCard}
                                    onPress={handleExport}
                                    activeOpacity={0.85}
                                >
                                    <LinearGradient
                                        colors={['#1A7CFF', '#0066E6']}
                                        style={styles.exportCardGradient}
                                    >
                                        <View style={styles.exportCardIcon}>
                                            <Ionicons name="download-outline" size={28} color="#FFF" />
                                        </View>
                                        <View style={styles.exportCardContent}>
                                            <Text style={styles.exportCardTitle}>Save to Gallery</Text>
                                            <Text style={styles.exportCardSubtitle}>
                                                Export as high-quality PNG image
                                            </Text>
                                        </View>
                                        <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.7)" />
                                    </LinearGradient>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.exportCard, { marginTop: 12 }]}
                                    onPress={async () => {
                                        try {
                                            const uri = await captureDesignImage(viewShotRef);
                                            if (await Sharing.isAvailableAsync()) {
                                                await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share Design' });
                                            } else {
                                                Alert.alert('Sharing not available', 'Sharing is not supported on this device.');
                                            }
                                        } catch (e) {
                                            showExportError('Failed to share design');
                                        }
                                    }}
                                    activeOpacity={0.85}
                                >
                                    <View style={styles.exportCardFlat}>
                                        <View style={[styles.exportCardIcon, { backgroundColor: '#E8F8ED' }]}>
                                            <Ionicons name="logo-whatsapp" size={28} color="#25D366" />
                                        </View>
                                        <View style={styles.exportCardContent}>
                                            <Text style={[styles.exportCardTitle, { color: '#1D1D1F' }]}>Share via WhatsApp & More</Text>
                                            <Text style={[styles.exportCardSubtitle, { color: '#86868B' }]}>
                                                WhatsApp, Instagram, Facebook & more
                                            </Text>
                                        </View>
                                        <Ionicons name="chevron-forward" size={20} color="#D1D1D6" />
                                    </View>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.exportCard, { marginTop: 12 }]}
                                    onPress={handleSaveAndPost}
                                    activeOpacity={0.85}
                                >
                                    <View style={styles.exportCardFlat}>
                                        <View style={[styles.exportCardIcon, { backgroundColor: '#F0FFF4' }]}>
                                            <Ionicons name="rocket-outline" size={28} color="#34C759" />
                                        </View>
                                        <View style={styles.exportCardContent}>
                                            <Text style={[styles.exportCardTitle, { color: '#1D1D1F' }]}>Post as Ad</Text>
                                            <Text style={[styles.exportCardSubtitle, { color: '#86868B' }]}>
                                                Publish directly to your social accounts
                                            </Text>
                                        </View>
                                        <Ionicons name="chevron-forward" size={20} color="#D1D1D6" />
                                    </View>
                                </TouchableOpacity>

                                {/* Size Options - Multi-size export */}
                                <Text style={[styles.tabSectionTitle, { marginTop: 28 }]}>Export Sizes</Text>
                                <Text style={styles.tabSectionSubtitle}>Choose size for your platform</Text>
                                <View style={styles.sizeOptions}>
                                    {EXPORT_SIZES.slice(0, 12).map(size => (
                                        <TouchableOpacity key={size.id} style={styles.sizeOption} activeOpacity={0.7}>
                                            <Ionicons name={size.icon as any} size={18} color="#48484A" />
                                            <Text style={styles.sizeLabel}>{size.name}</Text>
                                            <Text style={styles.sizeValue}>{size.width}×{size.height}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        )}
                    </View>
                </View>
            </ScrollView>

            {/* ── Bottom Action Bar ──────────────────────────── */}
            <View style={[styles.bottomBar, { backgroundColor: C.surface, borderTopColor: C.borderLight, paddingBottom: bottomSafe }]}>
                <TouchableOpacity
                    style={styles.bottomBtn}
                    onPress={handleExport}
                    activeOpacity={0.85}
                >
                    <LinearGradient
                        colors={['#1A7CFF', '#0066E6']}
                        style={styles.bottomBtnGradient}
                    >
                        {saving ? (
                            <Text style={styles.bottomBtnText}>Saving...</Text>
                        ) : (
                            <>
                                <Ionicons name="download-outline" size={20} color="#FFF" />
                                <Text style={styles.bottomBtnText}>Export Design</Text>
                            </>
                        )}
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </ScreenWrapper>
    );
};

// ─── Helpers ────────────────────────────────────────────────
function getFieldColor(type: string): string {
    switch (type) {
        case 'text': return '#1A7CFF';
        case 'tagline': return '#6C3AED';
        case 'phone': return '#34C759';
        case 'cta': return '#FF9500';
        case 'address': return '#FF3B30';
        case 'website': return '#007AFF';
        default: return '#86868B';
    }
}

// ═══════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
    // Header
    editorHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F2',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#F5F5F7',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerCenter: {
        flex: 1,
        alignItems: 'center',
    },
    editorTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#1D1D1F',
    },
    editorCategory: {
        fontSize: 12,
        color: '#86868B',
        marginTop: 1,
    },
    exportHeaderButton: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#EEF4FF',
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Canvas
    canvasWrapper: {
        alignItems: 'center',
        paddingVertical: 20,
        paddingHorizontal: 20,
    },
    canvas: {
        borderRadius: 16,
        overflow: 'hidden',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 12 },
                shadowOpacity: 0.15,
                shadowRadius: 24,
            },
            android: { elevation: 10 },
        }),
    },
    canvasContent: {
        flex: 1,
        padding: 24,
        justifyContent: 'center',
    },
    canvasLogo: {
        position: 'absolute',
        top: 18,
        left: 18,
        width: 45,
        height: 45,
        borderRadius: 10,
    },
    canvasLogoPlaceholder: {
        position: 'absolute',
        top: 18,
        left: 18,
        width: 45,
        height: 45,
        borderRadius: 10,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderColor: 'rgba(255,255,255,0.35)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    canvasLogoText: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 8,
        fontWeight: '700',
        marginTop: 1,
    },
    canvasPhoneBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(0,0,0,0.3)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        marginTop: 10,
    },
    canvasCta: {
        alignSelf: 'flex-start',
        paddingHorizontal: 24,
        paddingVertical: 10,
        borderRadius: 10,
        marginTop: 12,
    },

    // Tab Bar
    tabBar: {
        flexDirection: 'row',
        marginHorizontal: 20,
        backgroundColor: '#F5F5F7',
        borderRadius: 14,
        padding: 4,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 11,
        gap: 5,
    },
    activeTab: {
        backgroundColor: '#FFFFFF',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 8,
            },
            android: { elevation: 2 },
        }),
    },
    tabLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#86868B',
    },
    activeTabLabel: {
        color: '#1A7CFF',
    },

    // Tab Content
    tabContent: {
        paddingHorizontal: 20,
        paddingTop: 20,
    },
    tabSectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1D1D1F',
        marginBottom: 4,
    },
    tabSectionSubtitle: {
        fontSize: 13,
        color: '#86868B',
        marginBottom: 20,
    },

    // Field Row
    fieldRow: {
        marginBottom: 16,
        backgroundColor: '#FAFAFA',
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: '#F0F0F2',
    },
    fieldHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    fieldLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    fieldTypeBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    fieldTypeText: {
        fontSize: 12,
        fontWeight: '700',
    },
    visibilityButton: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: '#F0F0F2',
        alignItems: 'center',
        justifyContent: 'center',
    },
    fieldInput: {
        fontSize: 15,
        color: '#1D1D1F',
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        padding: 12,
        borderWidth: 1.5,
        borderColor: '#E5E5E7',
        minHeight: 44,
    },
    fieldInputDisabled: {
        opacity: 0.4,
        backgroundColor: '#F5F5F7',
    },
    fieldInputFocused: {
        borderColor: '#1A7CFF',
        backgroundColor: '#FAFCFF',
    },

    // Image Upload
    imageUploadCard: {
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#E5E5E7',
    },
    imageUploadGradient: {
        padding: 30,
        alignItems: 'center',
    },
    uploadPlaceholder: {
        alignItems: 'center',
    },
    uploadIconContainer: {
        width: 68,
        height: 68,
        borderRadius: 20,
        backgroundColor: '#DCE8FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 14,
    },
    uploadTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#1D1D1F',
    },
    uploadSubtitle: {
        fontSize: 13,
        color: '#86868B',
        marginTop: 4,
    },
    uploadPreview: {
        width: 80,
        height: 80,
        borderRadius: 16,
    },
    imageActions: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 16,
        padding: 12,
        borderTopWidth: 1,
        borderTopColor: '#F0F0F2',
    },
    imageActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 10,
        backgroundColor: '#F5F5F7',
        gap: 6,
    },
    imageActionText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1A7CFF',
    },

    // Colors
    colorPresetCard: {
        borderRadius: 14,
        padding: 14,
        backgroundColor: '#FAFAFA',
        borderWidth: 2,
        borderColor: '#F0F0F2',
        marginBottom: 12,
    },
    colorPresetCardActive: {
        borderColor: '#1A7CFF',
        backgroundColor: '#FAFCFF',
    },
    colorPresetCardSmall: {
        width: '48%' as any,
    },
    colorPresetHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    colorPresetName: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1D1D1F',
    },
    colorPresetNameSmall: {
        fontSize: 13,
        fontWeight: '700',
        color: '#1D1D1F',
    },
    colorSwatches: {
        flexDirection: 'row',
        gap: 6,
    },
    colorSwatch: {
        width: 28,
        height: 28,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.08)',
    },
    colorSwatchSmall: {
        width: 22,
        height: 22,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.08)',
    },
    presetsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },

    // Export
    exportCard: {
        borderRadius: 16,
        overflow: 'hidden',
    },
    exportCardGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 18,
    },
    exportCardFlat: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 18,
        backgroundColor: '#FAFAFA',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#F0F0F2',
    },
    exportCardIcon: {
        width: 52,
        height: 52,
        borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    exportCardContent: {
        flex: 1,
    },
    exportCardTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFF',
    },
    exportCardSubtitle: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 2,
    },

    // Size Options
    sizeOptions: {
        marginTop: 12,
    },
    sizeOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        backgroundColor: '#FAFAFA',
        borderRadius: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#F0F0F2',
    },
    sizeLabel: {
        flex: 1,
        fontSize: 15,
        fontWeight: '600',
        color: '#1D1D1F',
        marginLeft: 12,
    },
    sizeValue: {
        fontSize: 13,
        color: '#86868B',
    },

    // Bottom Bar
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FFF',
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: Platform.OS === 'ios' ? 34 : 20,
        borderTopWidth: 1,
        borderTopColor: '#F0F0F2',
    },
    bottomBtn: {
        borderRadius: 14,
        overflow: 'hidden',
    },
    bottomBtnGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 14,
        gap: 8,
    },
    bottomBtnText: {
        color: '#FFF',
        fontSize: 17,
        fontWeight: '700',
    },

    // Error
    errorContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
    },
    errorText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1D1D1F',
        marginBottom: 16,
    },
    errorButton: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: '#EEF4FF',
    },
    errorButtonText: {
        color: '#1A7CFF',
        fontWeight: '600',
        fontSize: 15,
    },
});
