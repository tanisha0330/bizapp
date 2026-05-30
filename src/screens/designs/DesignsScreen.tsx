import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    FlatList,
    TextInput,
    Image,
    Animated,
    Alert,
    StyleSheet,
    Platform,
    useWindowDimensions,
    Modal,
    Linking,
} from 'react-native';
import { shareAsync } from 'expo-sharing';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import {
    DESIGN_TEMPLATES,
    DesignTemplate,
    getTemplatesByCategory,
    searchTemplates,
} from '../../data/designTemplates';
import { useDesignStore, SavedDesign } from '../../store/useDesignStore';
import { Colors, Fonts, FontSize, Spacing, Radius, Shadow, Gradients, useColors } from '../../utils/theme';
import { useFlatListScrollToTopOnFocus } from '../../utils/useScrollToTopOnFocus';
import { saveImageToPhone } from '../../utils/designExport';

// ─── Template Preview Card (Large) ─────────────────────────────
const TemplateLargeCard = ({
    template,
    onPress,
    width,
    C,
}: {
    template: DesignTemplate;
    onPress: () => void;
    width: number;
    C: ReturnType<typeof useColors>;
}) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const dots = useMemo(
        () => Array.from({ length: 20 }, () => ({
            top: Math.random() * 200,
            left: Math.random() * (width - 20),
            size: 3 + Math.random() * 5,
        })),
        [template.id, width]
    );

    const handlePressIn = () => {
        Animated.spring(scaleAnim, {
            toValue: 0.97,
            useNativeDriver: true,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 3,
            useNativeDriver: true,
        }).start();
    };

    return (
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                activeOpacity={1}
                style={[styles.largeCard, { width, backgroundColor: C.surface }]}
            >
                {/* Template Preview */}
                <View style={styles.largeCardGradient}>
                    {template.backgroundImageUrl ? (
                        <>
                            <Image
                                source={{ uri: template.backgroundImageUrl }}
                                style={StyleSheet.absoluteFillObject}
                                resizeMode="cover"
                            />
                            <LinearGradient
                                colors={[`rgba(0,0,0,${(template.overlayOpacity ?? 0.55) + 0.05})`, `rgba(0,0,0,${(template.overlayOpacity ?? 0.55) - 0.1})`, `rgba(0,0,0,${(template.overlayOpacity ?? 0.55) + 0.05})`]}
                                start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
                                style={StyleSheet.absoluteFillObject}
                            />
                            <View style={[StyleSheet.absoluteFillObject, { backgroundColor: template.colors.background[0] + '45' }]} />
                        </>
                    ) : (
                        <LinearGradient
                            colors={template.colors.background as unknown as readonly [string, string, ...string[]]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={StyleSheet.absoluteFillObject}
                        />
                    )}
                    {/* Decorative Elements */}
                    {template.decorations.type === 'circles' && (
                        <>
                            <View style={[styles.decoCircle, { top: -30, right: -30, opacity: template.decorations.opacity }]} />
                            <View style={[styles.decoCircleSm, { bottom: 20, left: -20, opacity: template.decorations.opacity }]} />
                        </>
                    )}
                    {template.decorations.type === 'dots' && (
                        <View style={[styles.decoDotsContainer, { opacity: template.decorations.opacity }]}>
                            {dots.map((dot, i) => (
                                <View
                                    key={i}
                                    style={[
                                        styles.decoDot,
                                        {
                                            top: dot.top,
                                            left: dot.left,
                                            width: dot.size,
                                            height: dot.size,
                                            backgroundColor: template.colors.secondary,
                                        },
                                    ]}
                                />
                            ))}
                        </View>
                    )}
                    {template.decorations.type === 'geometric' && (
                        <>
                            <View style={[styles.decoTriangle, { opacity: template.decorations.opacity, borderBottomColor: template.colors.secondary }]} />
                            <View style={[styles.decoRect, { opacity: template.decorations.opacity, borderColor: template.colors.secondary }]} />
                        </>
                    )}
                    {template.decorations.type === 'waves' && (
                        <View style={[styles.decoWave, { opacity: template.decorations.opacity, backgroundColor: template.colors.secondary }]} />
                    )}
                    {template.decorations.type === 'festive' && (
                        <>
                            <View style={[styles.decoStar, { top: 15, right: 40, opacity: template.decorations.opacity + 0.15 }]}>
                                <Text style={{ fontSize: 22 }}>✨</Text>
                            </View>
                            <View style={[styles.decoStar, { bottom: 60, left: 20, opacity: template.decorations.opacity + 0.1 }]}>
                                <Text style={{ fontSize: 18 }}>⭐</Text>
                            </View>
                            <View style={[styles.decoStar, { top: 60, left: 40, opacity: template.decorations.opacity }]}>
                                <Text style={{ fontSize: 14 }}>✨</Text>
                            </View>
                        </>
                    )}
                    {template.decorations.type === 'food' && (
                        <>
                            <View style={[styles.decoStar, { top: 10, right: 15, opacity: 0.25 }]}>
                                <Text style={{ fontSize: 30 }}>🍛</Text>
                            </View>
                            <View style={[styles.decoStar, { bottom: 50, right: 30, opacity: 0.2 }]}>
                                <Text style={{ fontSize: 24 }}>🍽️</Text>
                            </View>
                        </>
                    )}

                    {/* Badge */}
                    {template.badge && (
                        <View
                            style={[
                                styles.badge,
                                { backgroundColor: template.badge.bgColor },
                            ]}
                        >
                            <Text
                                style={[
                                    styles.badgeText,
                                    { color: template.badge.color },
                                ]}
                            >
                                {template.badge.text}
                            </Text>
                        </View>
                    )}

                    {/* Logo Placeholder */}
                    <View style={[styles.logoPlaceholder, { borderColor: template.colors.textPrimary + '30' }]}>
                        <Ionicons name="image-outline" size={16} color={template.colors.textPrimary + '60'} />
                        <Text style={[styles.logoText, { color: template.colors.textPrimary + '60' }]}>LOGO</Text>
                    </View>

                    {/* Template Content Preview */}
                    <View style={styles.previewContent}>
                        {template.fields
                            .filter(f => f.visible && f.type !== 'logo' && f.type !== 'phone')
                            .slice(0, 4)
                            .map((field, index) => {
                                if (field.type === 'cta') {
                                    return (
                                        <View
                                            key={field.id}
                                            style={[
                                                styles.ctaButton,
                                                {
                                                    backgroundColor:
                                                        field.style.color === '#FFFFFF'
                                                            ? template.colors.primary
                                                            : template.colors.secondary || template.colors.accent,
                                                },
                                            ]}
                                        >
                                            <Text
                                                style={[
                                                    styles.ctaText,
                                                    {
                                                        color: field.style.color || '#FFFFFF',
                                                        fontSize: (field.style.fontSize || 14) * 0.65,
                                                        fontWeight: field.style.fontWeight || '700',
                                                    },
                                                ]}
                                            >
                                                {field.defaultValue}
                                            </Text>
                                        </View>
                                    );
                                }
                                return (
                                    <Text
                                        key={field.id}
                                        numberOfLines={2}
                                        style={{
                                            fontSize: Math.min((field.style.fontSize || 16) * 0.6, 20),
                                            fontWeight: field.style.fontWeight || 'normal',
                                            color: field.style.color || template.colors.textPrimary,
                                            textAlign: (field.style.textAlign as any) || 'left',
                                            letterSpacing: field.style.letterSpacing ? field.style.letterSpacing * 0.5 : 0,
                                            marginTop: index === 0 ? 0 : 3,
                                            textTransform: field.style.textTransform || 'none',
                                        }}
                                    >
                                        {field.defaultValue}
                                    </Text>
                                );
                            })}
                    </View>

                    {/* Phone badge */}
                    <View style={[styles.phoneBadge, { backgroundColor: template.colors.primary + 'DD' }]}>
                        <Ionicons name="call" size={11} color="#FFF" />
                        <Text style={styles.phoneText}>Your Number</Text>
                    </View>
                </View>

                {/* Card Footer */}
                <View style={[styles.largeCardFooter, { backgroundColor: C.surface }]}>
                    <View style={styles.cardFooterLeft}>
                        <Text style={[styles.cardTitle, { color: C.text }]}>{template.name}</Text>
                        <Text style={[styles.cardCategory, { color: C.textTertiary }]}>
                            {template.categoryIcon} {template.category}
                        </Text>
                    </View>
                    <View style={styles.useButton}>
                        <LinearGradient
                            colors={Gradients.brand as any}
                            style={styles.useButtonGradient}
                        >
                            <Text style={styles.useButtonText}>Use Template</Text>
                            <Ionicons name="arrow-forward" size={14} color="#FFF" />
                        </LinearGradient>
                    </View>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
};

// ─── Template Preview Card (Small — for category grids) ──────
const TemplateSmallCard = ({
    template,
    onPress,
    width,
    C,
}: {
    template: DesignTemplate;
    onPress: () => void;
    width: number;
    C: ReturnType<typeof useColors>;
}) => (
    <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.85}
        style={[styles.smallCard, { width, backgroundColor: C.surface }]}
    >
        <View style={styles.smallCardGradient}>
            {template.backgroundImageUrl ? (
                <>
                    <Image
                        source={{ uri: template.backgroundImageUrl }}
                        style={StyleSheet.absoluteFillObject}
                        resizeMode="cover"
                    />
                    <LinearGradient
                        colors={[`rgba(0,0,0,${(template.overlayOpacity ?? 0.55) + 0.05})`, `rgba(0,0,0,${(template.overlayOpacity ?? 0.55) - 0.1})`, `rgba(0,0,0,${(template.overlayOpacity ?? 0.55) + 0.05})`]}
                        start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
                        style={StyleSheet.absoluteFillObject}
                    />
                    <View style={[StyleSheet.absoluteFillObject, { backgroundColor: template.colors.background[0] + '45' }]} />
                </>
            ) : (
                <LinearGradient
                    colors={template.colors.background as unknown as readonly [string, string, ...string[]]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFillObject}
                />
            )}
            {/* Decorations */}
            {template.decorations.type === 'festive' && (
                <View style={[styles.decoStar, { top: 8, right: 12, opacity: 0.35 }]}>
                    <Text style={{ fontSize: 16 }}>✨</Text>
                </View>
            )}

            {/* Badge */}
            {template.badge && (
                <View style={[styles.smallBadge, { backgroundColor: template.badge.bgColor }]}>
                    <Text style={[styles.smallBadgeText, { color: template.badge.color }]}>
                        {template.badge.text}
                    </Text>
                </View>
            )}

            {/* Mini preview */}
            <View style={styles.smallPreviewContent}>
                {template.fields
                    .filter(f => f.visible && f.type !== 'logo' && f.type !== 'phone')
                    .slice(0, 2)
                    .map((field, index) => {
                        if (field.type === 'cta') {
                            return (
                                <View
                                    key={field.id}
                                    style={[
                                        styles.smallCtaButton,
                                        {
                                            backgroundColor:
                                                field.style.color === '#FFFFFF'
                                                    ? template.colors.primary
                                                    : template.colors.secondary || template.colors.accent,
                                        },
                                    ]}
                                >
                                    <Text
                                        style={{
                                            color: field.style.color || '#FFF',
                                            fontSize: 8,
                                            fontWeight: '700',
                                        }}
                                    >
                                        {field.defaultValue}
                                    </Text>
                                </View>
                            );
                        }
                        return (
                            <Text
                                key={field.id}
                                numberOfLines={2}
                                style={{
                                    fontSize: Math.min((field.style.fontSize || 14) * 0.42, 14),
                                    fontWeight: field.style.fontWeight || 'normal',
                                    color: field.style.color || template.colors.textPrimary,
                                    textAlign: (field.style.textAlign as any) || 'left',
                                    marginTop: index === 0 ? 0 : 2,
                                    textTransform: field.style.textTransform || 'none',
                                }}
                            >
                                {field.defaultValue}
                            </Text>
                        );
                    })}
            </View>
        </View>

        {/* Footer */}
        <View style={[styles.smallCardFooter, { backgroundColor: C.surface }]}>
            <Text style={[styles.smallCardTitle, { color: C.text }]} numberOfLines={1}>{template.name}</Text>
            <Text style={[styles.smallCardCategory, { color: C.textTertiary }]} numberOfLines={1}>
                {template.categoryIcon} {template.category}
            </Text>
        </View>
    </TouchableOpacity>
);

// ─── Category Pill ──────────────────────────────────────────────
const CategoryPill = ({
    label,
    icon,
    selected,
    onPress,
    C,
}: {
    label: string;
    icon: string;
    selected: boolean;
    onPress: () => void;
    C: ReturnType<typeof useColors>;
}) => (
    <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.8}
        style={[
            styles.categoryPill,
            { backgroundColor: C.surfaceSecondary, borderColor: C.borderLight },
            selected && [styles.categoryPillActive, { backgroundColor: C.brand, borderColor: C.brand }],
        ]}
    >
        <Text style={styles.categoryPillIcon}>{icon}</Text>
        <Text
            style={[
                styles.categoryPillText,
                { color: C.textSecondary },
                selected && [styles.categoryPillTextActive, { color: C.textInverse }],
            ]}
        >
            {label}
        </Text>
    </TouchableOpacity>
);

// ─── My Design Card ────────────────────────────────────────────
const MyDesignCard = ({
    design,
    onPress,
    onEdit,
    onRunAd,
    onDelete,
    width: cardWidth,
    C,
}: {
    design: SavedDesign;
    onPress: () => void;
    onEdit: () => void;
    onRunAd: () => void;
    onDelete: () => void;
    width: number;
    C: ReturnType<typeof useColors>;
}) => (
    <View style={[myDesignStyles.card, { width: cardWidth, backgroundColor: C.surface }]}>
        <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
            <Image
                source={{ uri: design.imageUri }}
                style={[myDesignStyles.cardImage, { width: cardWidth, height: cardWidth }]}
                resizeMode="cover"
            />
        </TouchableOpacity>
        <View style={myDesignStyles.cardFooter}>
            <View style={myDesignStyles.cardInfo}>
                <Text style={[myDesignStyles.cardName, { color: C.text }]} numberOfLines={1}>{design.name}</Text>
                <Text style={[myDesignStyles.cardCategory, { color: C.textTertiary }]}>
                    {design.categoryIcon} {design.category}
                </Text>
            </View>
            <View style={myDesignStyles.cardActions}>
                <TouchableOpacity onPress={onEdit} style={myDesignStyles.editBtn} activeOpacity={0.8}>
                    <Ionicons name="create-outline" size={12} color="#1A7CFF" />
                    <Text style={myDesignStyles.editText} numberOfLines={1}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={onRunAd} style={myDesignStyles.runAdBtn} activeOpacity={0.8}>
                    <Ionicons name="rocket-outline" size={12} color="#FFF" />
                    <Text style={myDesignStyles.runAdText} numberOfLines={1}>Ad</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={onDelete}
                    style={[myDesignStyles.deleteBtn, { backgroundColor: C.dangerBg }]}
                    activeOpacity={0.7}
                >
                    <Ionicons name="trash-outline" size={16} color={C.danger} />
                </TouchableOpacity>
            </View>
        </View>
    </View>
);

const myDesignStyles = StyleSheet.create({
    card: {
        borderRadius: 16,
        backgroundColor: '#FFF',
        overflow: 'hidden',
        marginRight: 14,
        ...Platform.select({
            ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12 },
            android: { elevation: 5 },
        }),
    },
    cardImage: {
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
    },
    cardFooter: {
        paddingHorizontal: 10,
        paddingTop: 12,
        paddingBottom: 10,
    },
    cardInfo: {
        marginBottom: 10,
    },
    cardName: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1D1D1F',
    },
    cardCategory: {
        fontSize: 11,
        color: '#86868B',
        marginTop: 2,
    },
    cardActions: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 5,
    },
    runAdBtn: {
        flexGrow: 1,
        flexShrink: 1,
        flexBasis: 0,
        minWidth: 0,
        height: 34,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        backgroundColor: '#1A7CFF',
        paddingHorizontal: 5,
        borderRadius: 8,
    },
    editBtn: {
        flexGrow: 1,
        flexShrink: 1,
        flexBasis: 0,
        minWidth: 0,
        height: 34,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        backgroundColor: '#E7F3FF',
        paddingHorizontal: 5,
        borderRadius: 8,
    },
    editText: {
        color: '#1A7CFF',
        fontSize: 11,
        fontWeight: '700',
    },
    runAdText: {
        color: '#FFF',
        fontSize: 11,
        fontWeight: '700',
    },
    deleteBtn: {
        width: 34,
        height: 34,
        borderRadius: 8,
        backgroundColor: '#FFF0F0',
        alignItems: 'center',
        justifyContent: 'center',
    },
});

// ═══════════════════════════════════════════════════════════════
// MAIN DESIGNS SCREEN
// ═══════════════════════════════════════════════════════════════
// ─── Animated AI Banner ──────────────────────────────────────
const AIBannerAnimated = ({ onPress }: { onPress: () => void }) => {
    const shimmer = useRef(new Animated.Value(0)).current;
    const scale = useRef(new Animated.Value(1)).current;

    React.useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(shimmer, { toValue: 1, duration: 2000, useNativeDriver: true }),
                Animated.timing(shimmer, { toValue: 0, duration: 2000, useNativeDriver: true }),
            ])
        ).start();
    }, [shimmer]);

    const shimmerTranslate = shimmer.interpolate({
        inputRange: [0, 1],
        outputRange: [-100, 200],
    });

    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.9}
            onPressIn={() => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true }).start()}
            onPressOut={() => Animated.spring(scale, { toValue: 1, friction: 3, useNativeDriver: true }).start()}
            style={{ marginBottom: 16 }}
        >
            <Animated.View style={{ transform: [{ scale }] }}>
                <LinearGradient
                    colors={['#FF6B6B', '#6C3AED', '#4F46E5', '#3B82F6']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                        alignItems: 'center',
                        borderRadius: 16, paddingVertical: 28, paddingHorizontal: 14,
                        marginHorizontal: 8,
                        overflow: 'hidden',
                    }}
                >
                    {/* Shimmer effect */}
                    <Animated.View style={{
                        position: 'absolute', top: 0, bottom: 0, width: 80,
                        backgroundColor: 'rgba(255,255,255,0.12)',
                        transform: [{ translateX: shimmerTranslate }, { skewX: '-20deg' }],
                    }} />

                    <View style={{
                        width: 50, height: 50, borderRadius: 15,
                        backgroundColor: 'rgba(255,255,255,0.2)',
                        alignItems: 'center', justifyContent: 'center', marginBottom: 10,
                    }}>
                        <Ionicons name="sparkles" size={26} color="#FFF" />
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ fontFamily: Fonts.bold, fontSize: 18, color: '#FFF' }}>Create with AI</Text>
                        <View style={{ backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 10, padding: 4 }}>
                            <Ionicons name="arrow-forward" size={14} color="#FFF" />
                        </View>
                    </View>
                    <Text style={{ fontFamily: Fonts.regular, fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 4, textAlign: 'center' }}>
                        Describe your poster, AI designs it instantly
                    </Text>
                </LinearGradient>
            </Animated.View>
        </TouchableOpacity>
    );
};

export const DesignsScreen = () => {
    const navigation = useNavigation<any>();
    const { width } = useWindowDimensions();
    const C = useColors();
    const { designs, removeDesign } = useDesignStore();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [previewDesign, setPreviewDesign] = useState<SavedDesign | null>(null);
    const flatListResetRef = useFlatListScrollToTopOnFocus();

    const handleRunAd = useCallback(
        (design: SavedDesign) => {
            navigation.navigate('CreateAd', { designUri: design.imageUri, designName: design.name });
        },
        [navigation]
    );

    const handleEditSavedDesign = useCallback(
        (design: SavedDesign) => {
            setPreviewDesign(null);
            navigation.navigate('CustomPoster', {
                imageUri: design.imageUri,
                designName: design.name,
            });
        },
        [navigation]
    );

    // Responsive dimensions
    const isTablet = width > 768;
    const padding = 20;
    const gap = 16;

    // My Designs card width keeps the footer actions usable on narrow phones.
    const myDesignCardWidth = isTablet ? 210 : Math.min(220, Math.max(176, (width - 46) / 2));

    // Calculate card width dynamically based on available width
    // For featured (horizontal list): show roughly 85-90% of screen width on mobile, less on tablet
    const largeCardWidth = isTablet
        ? (width - (padding * 2) - gap) / 2 // 2 per row logic if it were grid, or just fixed size
        : width - 48;

    // For grid
    const numColumns = isTablet ? 4 : 2;
    const smallCardWidth = (width - (padding * 2) - (gap * (numColumns - 1))) / numColumns;


    // Categories for filter pills
    const categories = useMemo(() => {
        const cats = getTemplatesByCategory();
        return [{ category: 'All', icon: '🔥' }, ...cats.map(c => ({ category: c.category, icon: c.icon }))];
    }, []);

    // Filtered templates
    const filteredTemplates = useMemo(() => {
        let templates = DESIGN_TEMPLATES;

        if (searchQuery.trim()) {
            templates = searchTemplates(searchQuery);
        }

        if (selectedCategory !== 'All') {
            templates = templates.filter(t => t.category === selectedCategory);
        }

        return templates;
    }, [searchQuery, selectedCategory]);

    // Featured (first 3)
    const featuredTemplates = useMemo(
        () => (searchQuery || selectedCategory !== 'All' ? [] : DESIGN_TEMPLATES.slice(0, 3)),
        [searchQuery, selectedCategory]
    );

    const handleTemplatePress = useCallback(
        (template: DesignTemplate) => {
            navigation.navigate('TemplateEditor', { template });
        },
        [navigation]
    );

    return (
        <ScreenWrapper bg="bg-white" edges={['top', 'left', 'right']} style={{ backgroundColor: C.background }}>
            {/* ── Header ─────────────────────────────────────── */}
            <View style={[styles.header, { backgroundColor: C.background, borderBottomColor: C.borderLight }]}>
                <View>
                    <Text style={[styles.headerTitle, { color: C.text }]}>Design Studio</Text>
                    <Text style={[styles.headerSubtitle, { color: C.textSecondary }]}>Create stunning ads in seconds</Text>
                </View>
            </View>

            <FlatList
                ref={flatListResetRef}
                ListHeaderComponent={() => (
                    <View>
                        {/* ── AI Design Creator Banner (full width, animated) ── */}
                        <AIBannerAnimated onPress={() => navigation.navigate('AIDesignCreator')} />

                        {/* ── My Designs ──────────────────────────────────── */}
                        {designs.length > 0 && (
                            <View style={styles.section}>
                                <View style={styles.sectionHeader}>
                                    <View>
                                        <Text style={[styles.sectionTitle, { color: C.text }]}>My Designs</Text>
                                        <Text style={[styles.sectionSubtitle, { color: C.textTertiary }]}>
                                            {designs.length} design{designs.length !== 1 ? 's' : ''} saved
                                        </Text>
                                    </View>
                                </View>
                                <FlatList
                                    data={designs}
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={{ paddingHorizontal: 20 }}
                                    keyExtractor={item => item.id}
                                    renderItem={({ item }) => (
                                        <MyDesignCard
                                            design={item}
                                            width={myDesignCardWidth}
                                            C={C}
                                            onPress={() => setPreviewDesign(item)}
                                            onEdit={() => handleEditSavedDesign(item)}
                                            onRunAd={() => handleRunAd(item)}
                                            onDelete={() => {
                                                Alert.alert(
                                                    'Delete Design',
                                                    `Remove "${item.name}" from My Designs?`,
                                                    [
                                                        { text: 'Cancel', style: 'cancel' },
                                                        { text: 'Delete', style: 'destructive', onPress: () => removeDesign(item.id) },
                                                    ]
                                                );
                                            }}
                                        />
                                    )}
                                />
                            </View>
                        )}

                        {/* ── Quick Tools ────────────── */}
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <Text style={[styles.sectionTitle, { color: C.text }]}>Quick Tools</Text>
                            </View>
                            <View style={{ flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.xl }}>
                                {[
                                    { label: 'Own Poster', sub: 'Upload & edit', icon: 'create-outline', route: 'CustomPoster', gradient: ['#1A7CFF', '#00CEFF'] },
                                    { label: 'Biz Card', sub: 'Digital card', icon: 'id-card-outline', route: 'BusinessCard', gradient: ['#6C5CE7', '#A29BFE'] },
                                    { label: 'Make Site', sub: 'Free builder', icon: 'globe-outline', route: 'WebsiteBuilder', gradient: ['#00D68F', '#00B894'] },
                                ].map(tool => (
                                    <TouchableOpacity
                                        key={tool.route}
                                        style={{ flex: 1, backgroundColor: C.surface, borderRadius: Radius.lg, paddingVertical: 14, paddingHorizontal: 8, alignItems: 'center', borderWidth: 1, borderColor: C.borderLight }}
                                        onPress={() => navigation.navigate(tool.route as never)}
                                        activeOpacity={0.8}
                                    >
                                        <LinearGradient
                                            colors={tool.gradient as any}
                                            style={{ width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}
                                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                                        >
                                            <Ionicons name={tool.icon as any} size={22} color="#FFF" />
                                        </LinearGradient>
                                        <Text style={{ fontFamily: Fonts.medium, fontSize: 11, color: C.text, textAlign: 'center' }} numberOfLines={1}>{tool.label}</Text>
                                        <Text style={{ fontFamily: Fonts.regular, fontSize: 10, color: C.textTertiary, marginTop: 2, textAlign: 'center' }}>{tool.sub}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* ── Need Help? ─────────────────────────────────── */}
                        <TouchableOpacity
                            activeOpacity={0.88}
                            onPress={() => Linking.openURL('https://wa.me/917990636954?text=Hi%2C%20I%20need%20help%20creating%20a%20poster%20or%20running%20an%20ad%20on%20Biz499')}
                            style={{ marginHorizontal: 20, marginBottom: 16 }}
                        >
                            <LinearGradient
                                colors={['#1A7CFF', '#6C5CE7']}
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                                style={{ borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 }}
                            >
                                <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
                                    <Ionicons name="chatbubble-ellipses" size={22} color="#FFF" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontFamily: Fonts.bold, fontSize: 14, color: '#FFF' }}>Still not sure what to create?</Text>
                                    <Text style={{ fontFamily: Fonts.regular, fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 3, lineHeight: 17 }}>
                                        Our team helps with everything — from poster to running your first ad.
                                    </Text>
                                </View>
                                <Ionicons name="arrow-forward-circle" size={26} color="rgba(255,255,255,0.9)" />
                            </LinearGradient>
                        </TouchableOpacity>

                        {/* ── Featured Templates (Horizontal) ────────────── */}
                        {featuredTemplates.length > 0 && (
                            <View style={styles.section}>
                                <View style={styles.sectionHeader}>
                                    <View>
                                        <Text style={[styles.sectionTitle, { color: C.text }]}>🔥 Featured Templates</Text>
                                        <Text style={[styles.sectionSubtitle, { color: C.textTertiary }]}>Hand-picked for your business</Text>
                                    </View>
                                </View>
                                <FlatList
                                    data={featuredTemplates}
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={{ paddingHorizontal: 20 }}
                                    keyExtractor={item => item.id}
                                    renderItem={({ item }) => (
                                        <View style={{ marginRight: 16 }}>
                                            <TemplateLargeCard
                                                template={item}
                                                onPress={() => handleTemplatePress(item)}
                                                width={largeCardWidth}
                                                C={C}
                                            />
                                        </View>
                                    )}
                                    snapToInterval={largeCardWidth + 16}
                                    decelerationRate="fast"
                                />
                            </View>
                        )}
                        {/* ── All Templates Grid ──────────────────────────── */}
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <View>
                                    <Text style={[styles.sectionTitle, { color: C.text }]}>
                                        {selectedCategory === 'All' ? '📋 All Templates' : `${categories.find(c => c.category === selectedCategory)?.icon || ''} ${selectedCategory}`}
                                    </Text>
                                    <Text style={[styles.sectionSubtitle, { color: C.textTertiary }]}>
                                        {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''} available
                                    </Text>
                                </View>
                            </View>

                            {/* Category Filters */}
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.categoryContainer}
                                style={{ flexGrow: 0, marginBottom: 12 }}
                            >
                                {categories.map(cat => (
                                    <CategoryPill
                                        key={cat.category}
                                        label={cat.category}
                                        icon={cat.icon}
                                        selected={selectedCategory === cat.category}
                                        onPress={() => setSelectedCategory(cat.category)}
                                        C={C}
                                    />
                                ))}
                            </ScrollView>

                            <View style={styles.sectionHeader}>
                            </View>

                            {filteredTemplates.length === 0 && (
                                <View style={styles.emptyState}>
                                    <View style={[styles.emptyIcon, { backgroundColor: C.surfaceSecondary }]}>
                                        <Ionicons name="search-outline" size={48} color={C.textTertiary} />
                                    </View>
                                    <Text style={[styles.emptyTitle, { color: C.text }]}>No templates found</Text>
                                    <Text style={[styles.emptySubtitle, { color: C.textTertiary }]}>
                                        Try a different search or category
                                    </Text>
                                    <TouchableOpacity
                                        style={[styles.resetButton, { backgroundColor: C.brand }]}
                                        onPress={() => {
                                            setSearchQuery('');
                                            setSelectedCategory('All');
                                        }}
                                    >
                                        <Text style={styles.resetButtonText}>Reset Filters</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    </View>
                )}
                data={filteredTemplates.length > 0 ? filteredTemplates : []}
                key={numColumns} // Force re-render when columns change
                numColumns={numColumns}
                keyExtractor={item => item.id}
                columnWrapperStyle={{ gap: gap, paddingHorizontal: 20 }}
                contentContainerStyle={{ paddingBottom: 120 }}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                    <TemplateSmallCard
                        template={item}
                        onPress={() => handleTemplatePress(item)}
                        width={smallCardWidth}
                        C={C}
                    />
                )}
            />

            {/* Full-screen design preview */}
            {previewDesign && (
                <Modal visible={!!previewDesign} animationType="fade" transparent>
                    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center' }}>
                        {/* Close */}
                        <TouchableOpacity
                            onPress={() => setPreviewDesign(null)}
                            style={{ position: 'absolute', top: 50, right: 20, zIndex: 10, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}
                        >
                            <Ionicons name="close" size={24} color="#FFF" />
                        </TouchableOpacity>

                        {/* Design name */}
                        <Text style={{ color: '#FFF', fontFamily: Fonts.bold, fontSize: 18, textAlign: 'center', marginBottom: 12, paddingHorizontal: 20 }} numberOfLines={1}>
                            {previewDesign.name}
                        </Text>

                        {/* Image */}
                        <Image
                            source={{ uri: previewDesign.imageUri }}
                            style={{ width: width - 40, height: width - 40, alignSelf: 'center', borderRadius: 16 }}
                            resizeMode="contain"
                        />

                        {/* Category + date */}
                        <Text style={{ color: 'rgba(255,255,255,0.6)', fontFamily: Fonts.regular, fontSize: 13, textAlign: 'center', marginTop: 10 }}>
                            {previewDesign.categoryIcon} {previewDesign.category} · {new Date(previewDesign.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </Text>

                        {/* Actions */}
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 18, marginTop: 24, paddingHorizontal: 32 }}>
                            <TouchableOpacity
                                style={{ alignItems: 'center', width: '22%' }}
                                onPress={() => handleEditSavedDesign(previewDesign)}
                            >
                                <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: '#1A7CFF', alignItems: 'center', justifyContent: 'center' }}>
                                    <Ionicons name="create-outline" size={24} color="#FFF" />
                                </View>
                                <Text style={{ color: '#FFF', fontFamily: Fonts.medium, fontSize: 12, marginTop: 6 }}>Edit</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={{ alignItems: 'center', width: '22%' }}
                                onPress={async () => {
                                    try {
                                        if (previewDesign.imageUri && await saveImageToPhone(previewDesign.imageUri)) {
                                            Alert.alert('Saved!', 'Design saved to gallery.');
                                        } else {
                                            Alert.alert('Permission needed', 'Please allow photo access to save this design.');
                                        }
                                    } catch { Alert.alert('Error', 'Could not save.'); }
                                }}
                            >
                                <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' }}>
                                    <Ionicons name="download-outline" size={24} color="#FFF" />
                                </View>
                                <Text style={{ color: '#FFF', fontFamily: Fonts.medium, fontSize: 12, marginTop: 6 }}>Save</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={{ alignItems: 'center', width: '22%' }}
                                onPress={async () => {
                                    try {
                                        if (previewDesign.imageUri) {
                                            await shareAsync(previewDesign.imageUri, { mimeType: 'image/png', dialogTitle: 'Share Design' });
                                        }
                                    } catch {}
                                }}
                            >
                                <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' }}>
                                    <Ionicons name="share-social-outline" size={24} color="#FFF" />
                                </View>
                                <Text style={{ color: '#FFF', fontFamily: Fonts.medium, fontSize: 12, marginTop: 6 }}>Share</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={{ alignItems: 'center', width: '22%' }}
                                onPress={() => {
                                    setPreviewDesign(null);
                                    handleRunAd(previewDesign);
                                }}
                            >
                                <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: '#34C759', alignItems: 'center', justifyContent: 'center' }}>
                                    <Ionicons name="rocket-outline" size={24} color="#FFF" />
                                </View>
                                <Text style={{ color: '#FFF', fontFamily: Fonts.medium, fontSize: 12, marginTop: 6 }}>Run Ad</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={{ alignItems: 'center', width: '22%' }}
                                onPress={() => {
                                    Alert.alert('Delete Design', 'Are you sure?', [
                                        { text: 'Cancel', style: 'cancel' },
                                        { text: 'Delete', style: 'destructive', onPress: () => {
                                            removeDesign(previewDesign.id);
                                            setPreviewDesign(null);
                                        }},
                                    ]);
                                }}
                            >
                                <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: 'rgba(255,59,48,0.15)', alignItems: 'center', justifyContent: 'center' }}>
                                    <Ionicons name="trash-outline" size={24} color="#FF3B30" />
                                </View>
                                <Text style={{ color: '#FF3B30', fontFamily: Fonts.medium, fontSize: 12, marginTop: 6 }}>Delete</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            )}
        </ScreenWrapper>
    );
};

// ═══════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
    // Header
    header: {
        paddingHorizontal: Spacing.xl,
        paddingTop: Spacing.xs,
        paddingBottom: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.borderLight,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 14,
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: Fonts.bold,
        color: Colors.text,
        letterSpacing: -0.3,
    },
    headerSubtitle: {
        fontSize: 12,
        fontFamily: Fonts.regular,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    aiButton: {
        borderRadius: Radius.lg,
        overflow: 'hidden',
    },
    aiButtonGradient: {
        width: 44,
        height: 44,
        borderRadius: Radius.lg,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Search
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surfaceSecondary,
        borderRadius: Radius.md,
        paddingHorizontal: 14,
        height: 46,
        borderWidth: 1.5,
        borderColor: 'transparent',
    },
    searchContainerFocused: {
        borderColor: Colors.brand,
        backgroundColor: Colors.surface,
    },
    searchInput: {
        flex: 1,
        fontSize: FontSize.base,
        fontFamily: Fonts.regular,
        color: Colors.text,
        marginLeft: 10,
        paddingVertical: 0,
    },
    clearButton: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: Colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Categories
    categoryContainer: {
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.lg,
        gap: Spacing.sm,
    },
    categoryPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
        paddingVertical: 10,
        borderRadius: Radius.full,
        backgroundColor: Colors.surfaceSecondary,
        borderWidth: 1.5,
        borderColor: Colors.borderLight,
    },
    categoryPillActive: {
        backgroundColor: Colors.brand,
        borderColor: Colors.brand,
    },
    categoryPillIcon: {
        fontSize: 14,
        marginRight: 6,
    },
    categoryPillText: {
        fontSize: FontSize.sm,
        fontFamily: Fonts.semiBold,
        color: Colors.textSecondary,
    },
    categoryPillTextActive: {
        color: Colors.textInverse,
    },

    // Sections
    section: {
        marginBottom: Spacing.sm,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: Spacing.lg,
        paddingTop: Spacing.sm,
        paddingHorizontal: Spacing.xl,
    },
    sectionTitle: {
        fontSize: FontSize.lg,
        fontFamily: Fonts.semiBold,
        color: Colors.text,
    },
    sectionSubtitle: {
        fontSize: FontSize.sm,
        fontFamily: Fonts.regular,
        color: Colors.textTertiary,
        marginTop: 2,
    },

    // Large Card
    largeCard: {
        borderRadius: 20,
        backgroundColor: '#FFF',
        overflow: 'hidden',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.12,
                shadowRadius: 20,
            },
            android: {
                elevation: 8,
            },
        }),
    },
    largeCardGradient: {
        height: 240,
        padding: 18,
        overflow: 'hidden',
    },
    largeCardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
    },
    cardFooterLeft: {
        flex: 1,
        marginRight: 12,
    },
    cardTitle: {
        fontSize: 17,
        fontFamily: Fonts.semiBold,
        color: Colors.text,
    },
    cardCategory: {
        fontSize: FontSize.sm,
        fontFamily: Fonts.regular,
        color: Colors.textTertiary,
        marginTop: 2,
    },
    useButton: {
        borderRadius: 12,
        overflow: 'hidden',
    },
    useButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        gap: 6,
    },
    useButtonText: {
        color: '#FFF',
        fontSize: FontSize.sm,
        fontFamily: Fonts.bold,
    },

    // Small Card
    smallCard: {
        borderRadius: 16,
        backgroundColor: '#FFF',
        overflow: 'hidden',
        marginBottom: 16,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 12,
            },
            android: {
                elevation: 5,
            },
        }),
    },
    smallCardGradient: {
        height: 150,
        padding: 14,
        overflow: 'hidden',
    },
    smallPreviewContent: {
        flex: 1,
        justifyContent: 'center',
    },
    smallCtaButton: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        alignSelf: 'flex-start',
        marginTop: 6,
    },
    smallBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 6,
    },
    smallBadgeText: {
        fontSize: 8,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    smallCardFooter: {
        padding: 12,
        backgroundColor: '#FFF',
    },
    smallCardTitle: {
        fontSize: FontSize.sm,
        fontFamily: Fonts.bold,
        color: Colors.text,
        marginBottom: 2,
    },
    smallCardCategory: {
        fontSize: FontSize.xs,
        fontFamily: Fonts.regular,
        color: Colors.textTertiary,
    },

    // AI Banner
    aiBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        borderRadius: 20,
        marginHorizontal: 20,
    },
    aiBannerIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    aiBannerContent: {
        flex: 1,
        marginRight: 12,
    },
    aiBannerTitle: {
        fontSize: 17,
        fontFamily: Fonts.semiBold,
        color: '#FFF',
        marginBottom: 4,
    },
    aiBannerSubtitle: {
        fontSize: FontSize.sm,
        fontFamily: Fonts.regular,
        color: 'rgba(255,255,255,0.9)',
        lineHeight: 18,
    },

    // Empty State
    emptyState: {
        alignItems: 'center',
        paddingVertical: 40,
        paddingHorizontal: 40,
    },
    emptyIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#F5F5F7',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 17,
        fontFamily: Fonts.semiBold,
        color: Colors.text,
        marginBottom: Spacing.sm,
    },
    emptySubtitle: {
        fontSize: FontSize.sm,
        fontFamily: Fonts.regular,
        color: Colors.textTertiary,
        textAlign: 'center',
        marginBottom: Spacing['2xl'],
    },
    resetButton: {
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.md,
        borderRadius: Radius.md,
        backgroundColor: Colors.brand,
    },
    resetButtonText: {
        fontSize: FontSize.sm,
        fontFamily: Fonts.semiBold,
        color: '#FFF',
    },

    // Deco styles
    decoCircle: {
        position: 'absolute',
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    decoCircleSm: {
        position: 'absolute',
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255,255,255,0.08)',
    },
    decoDotsContainer: {
        ...StyleSheet.absoluteFillObject,
    },
    decoDot: {
        position: 'absolute',
        borderRadius: 999,
        opacity: 0.3,
    },
    decoTriangle: {
        position: 'absolute',
        top: -20,
        right: 40,
        width: 0,
        height: 0,
        borderLeftWidth: 40,
        borderRightWidth: 40,
        borderBottomWidth: 70,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    decoRect: {
        position: 'absolute',
        bottom: 40,
        right: -10,
        width: 60,
        height: 60,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.1)',
        transform: [{ rotate: '45deg' }],
    },
    decoWave: {
        position: 'absolute',
        bottom: -40,
        left: -20,
        width: 200,
        height: 80,
        borderRadius: 100,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    decoStar: {
        position: 'absolute',
    },
    badge: {
        position: 'absolute',
        top: 18,
        right: 18,
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 8,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1,
    },
    logoPlaceholder: {
        position: 'absolute',
        top: 20,
        left: 20,
        width: 60,
        height: 60,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: 'rgba(0,0,0,0.1)',
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoText: {
        fontSize: 10,
        fontWeight: '700',
        marginTop: 4,
    },
    previewContent: {
        marginTop: 80,
        paddingHorizontal: 20,
    },
    ctaButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        alignSelf: 'flex-start',
        marginTop: 12,
    },
    ctaText: {
        fontSize: 14,
        fontWeight: '700',
    },
    phoneBadge: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 6,
    },
    phoneText: {
        color: '#FFF',
        fontSize: 11,
        fontWeight: '700',
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
        paddingHorizontal: 20,
    },
});
