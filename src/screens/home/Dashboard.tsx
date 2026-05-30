import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    StatusBar,
    Image,
    Linking,
    Animated,
    ActivityIndicator,
    Alert,
    RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuthStore } from '../../store/useAuthStore';
import { useScrollToTopOnFocus } from '../../utils/useScrollToTopOnFocus';
import { useFacebookStore } from '../../store/useFacebookStore';
import { useLeadStore } from '../../store/useLeadStore';
import { useAdStore } from '../../store/useAdStore';
import { useDesignStore } from '../../store/useDesignStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { connectFacebook } from '../../services/facebookAuth';
import { api } from '../../services/api';
import { Colors, Fonts, FontSize, Spacing, Radius, Shadow, useColors } from '../../utils/theme';
import { analytics } from '../../services/mixpanel';
import { registerForPushNotifications } from '../../services/notifications';
import { FacebookConnectModal } from '../../components/FacebookConnectModal';

interface AdReport {
    id: string;
    title: string;
    dateRange: string;
    startDate?: string;
    adViews: string;
    leads?: number;
    calls?: number;
    spent: string;
    platforms: string[];
    isDemo: boolean;
    status?: string;
    pageId?: string;
    pageName?: string;
}

const DEMO_ADS: AdReport[] = [
    {
        id: '1',
        title: 'Lead Generation',
        dateRange: '01 May to 10 May, 2023',
        adViews: '2,11,109',
        leads: 191,
        spent: '₹10000',
        platforms: ['facebook'],
        isDemo: true,
    },
    {
        id: '2',
        title: 'Google Calls Ad',
        dateRange: '01 Apr to 30 Apr, 2023',
        adViews: '5,265',
        calls: 181,
        spent: '₹7730',
        platforms: ['google'],
        isDemo: true,
    },
];

const BUSINESS_TOOLS = [
    { key: 'ad', label: 'Create Ad', sub: 'Campaigns', icon: 'rocket-outline', route: 'CreateAd', gradient: ['#FF4757', '#EE5A24'] },
    { key: 'poster', label: 'Own Poster', sub: 'Upload & edit', icon: 'create-outline', route: 'CustomPoster', gradient: ['#1A7CFF', '#00CEFF'] },
    { key: 'web', label: 'Make Site', sub: 'Free builder', icon: 'globe-outline', route: 'WebsiteBuilder', gradient: ['#00D68F', '#00B894'] },
    { key: 'card', label: 'Biz Card', sub: 'Digital card', icon: 'id-card-outline', route: 'BusinessCard', gradient: ['#6C5CE7', '#A29BFE'] },
];

const PlatformIcon = ({ platform }: { platform: string }) => {
    if (platform === 'facebook') {
        return (
            <View style={[styles.platformIcon, { backgroundColor: Colors.facebook }]}>
                <Ionicons name="logo-facebook" size={14} color="white" />
            </View>
        );
    }
    if (platform === 'google') {
        return (
            <View style={[styles.platformIcon, styles.googleIcon]}>
                <Text style={styles.googleText}>G</Text>
            </View>
        );
    }
    return null;
};

const AdCard = ({ ad, onPress, onLeadsPress }: { ad: AdReport; onPress?: () => void; onLeadsPress?: () => void }) => (
    <TouchableOpacity style={styles.adCard} activeOpacity={0.7} onPress={onPress} disabled={!onPress}>
        {/* Header: Title + Badge */}
        <View style={styles.adCardHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, marginRight: 10 }}>
                <View style={styles.adIconBox}>
                    {ad.platforms.map((p, i) => (
                        <PlatformIcon key={i} platform={p} />
                    ))}
                </View>
                <TouchableOpacity style={{ flex: 1 }} activeOpacity={0.7} onPress={onLeadsPress} disabled={!onLeadsPress}>
                    <Text style={styles.adTitle} numberOfLines={1}>{ad.title}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        {ad.pageName && <Text style={[styles.adDate, { color: Colors.brand }]} numberOfLines={1}>{ad.pageName}</Text>}
                        {ad.pageName && ad.dateRange ? <Text style={styles.adDate}>·</Text> : null}
                        {ad.dateRange ? <Text style={styles.adDate} numberOfLines={1}>{ad.dateRange}</Text> : null}
                    </View>
                </TouchableOpacity>
            </View>
            {ad.isDemo ? (
                <View style={styles.demoBadge}>
                    <Text style={styles.demoBadgeText}>Demo</Text>
                </View>
            ) : (
                <View style={[styles.demoBadge, {
                    backgroundColor: ad.status === 'ACTIVE' ? Colors.successBg : ad.status === 'PAUSED' ? Colors.warningBg : Colors.surfaceSecondary
                }]}>
                    <Text style={[styles.demoBadgeText, {
                        color: ad.status === 'ACTIVE' ? Colors.success : ad.status === 'PAUSED' ? Colors.warning : Colors.textSecondary
                    }]}>
                        {ad.status === 'ACTIVE' ? 'Live' : ad.status === 'PAUSED' ? 'Paused' : 'Ended'}
                    </Text>
                </View>
            )}
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
            {[
                { label: 'Views', value: ad.adViews },
                ...(ad.leads && parseInt(String(ad.leads)) > 0 ? [{ label: 'Leads', value: String(ad.leads) }] : []),
                ...(ad.calls && parseInt(String(ad.calls)) > 0 ? [{ label: 'Calls', value: String(ad.calls) }] : []),
                { label: 'Spent', value: ad.spent },
            ].map((stat, i) => (
                <View key={stat.label} style={styles.statItem}>
                    <Text style={styles.statValue} numberOfLines={1}>{stat.value}</Text>
                    <Text style={styles.statLabel}>{stat.label}</Text>
                </View>
            ))}
        </View>
    </TouchableOpacity>
);

// Social Account Card
const SocialAccountCard = ({
    name, icon, iconColor, bgColor, connected, profileName, loading, comingSoon, onPress,
}: {
    name: string; icon: string; iconColor: string; bgColor: string;
    connected: boolean; profileName?: string; loading?: boolean; comingSoon?: boolean; onPress: () => void;
}) => (
    <TouchableOpacity
        style={[styles.socialCard, connected && styles.socialCardConnected]}
        onPress={onPress}
        activeOpacity={comingSoon ? 1 : 0.8}
        disabled={loading}
    >
        <View style={[styles.socialIconBox, { backgroundColor: bgColor }]}>
            <Ionicons name={icon as any} size={22} color={iconColor} />
        </View>
        <View style={styles.socialInfo}>
            <Text style={styles.socialName}>{name}</Text>
            <Text style={styles.socialStatus}>
                {loading ? 'Connecting...' : connected ? profileName || 'Connected' : comingSoon ? 'Coming Soon' : 'Tap to connect'}
            </Text>
        </View>
        {loading ? (
            <ActivityIndicator size="small" color={bgColor} />
        ) : connected ? (
            <View style={styles.connectedChip}>
                <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                <Text style={styles.connectedChipText}>Linked</Text>
            </View>
        ) : comingSoon ? (
            <View style={styles.comingSoonChip}>
                <Text style={styles.comingSoonText}>Soon</Text>
            </View>
        ) : (
            <View style={styles.linkChip}>
                <Ionicons name="add" size={16} color={Colors.brand} />
                <Text style={styles.linkChipText}>Link</Text>
            </View>
        )}
    </TouchableOpacity>
);

export const Dashboard = () => {
    const navigation = useNavigation<any>();
    const user = useAuthStore((state) => state.user);
    const updateUser = useAuthStore((state) => state.updateUser);
    const fbPages = useFacebookStore((state) => state.pages);
    const fbSelectedPages = useFacebookStore((state) => state.selectedPages);
    const fbProfile = useFacebookStore((state) => state.profile);
    const leads = useLeadStore(s => s.leads);
    const ads = useAdStore(s => s.ads);
    const designs = useDesignStore(s => s.designs);
    const [showInstructions, setShowInstructions] = useState(false);
    const [connectingFb, setConnectingFb] = useState(false);
    const [fbProfileName, setFbProfileName] = useState<string | undefined>();
    const [realCampaigns, setRealCampaigns] = useState<AdReport[]>([]);
    const [accountStats, setAccountStats] = useState<Record<string, string> | null>(null);
    const [fbLeadsTotal, setFbLeadsTotal] = useState(0);
    const [activeAdsFromFb, setActiveAdsFromFb] = useState(0);
    const [completionDismissed, setCompletionDismissed] = useState(false);
    const [syncing, setSyncing] = useState(false);

    useEffect(() => {
        AsyncStorage.getItem('setup_card_dismissed').then(v => { if (v === '1') setCompletionDismissed(true); });
    }, []);

    const dismissCompletionCard = () => {
        setCompletionDismissed(true);
        AsyncStorage.setItem('setup_card_dismissed', '1');
    };
    const blinkAnim = useRef(new Animated.Value(1)).current;
    const occasionListRef = useRef<any>(null);
    const occasionIndexRef = useRef(0);
    const C = useColors();
    const dashScrollRef = useScrollToTopOnFocus();

    // ── Computed values ──────────────────────────────────
    // Leads with status "New": saved leads (local + FB) with New status,
    // plus unsaved FB leads (not yet interacted with, so implicitly New)
    const savedFbCount = leads.filter(l => l.id.startsWith('fb_')).length;
    const unsavedFbNew = Math.max(0, fbLeadsTotal - savedFbCount);
    const newLeadsCount = leads.filter(l => l.status === 'New').length + unsavedFbNew;
    // Active ads: prefer real FB campaign count, fall back to local store
    const activeAdsCount = activeAdsFromFb > 0
        ? activeAdsFromFb
        : ads.filter(a => a.status === 'Active' || a.status === 'Published' || a.status === 'Launching').length;

    // Filter campaigns to only active pages — reacts instantly when a page is removed
    const displayedCampaigns = useMemo(() => {
        const activePageIds = new Set(fbPages.map((p: any) => p.page_id || p.id));
        return realCampaigns.filter(c => !c.pageId || activePageIds.has(c.pageId));
    }, [realCampaigns, fbPages]);

    const completionSteps = [
        { label: 'Connect Facebook', done: !!user?.facebookConnected, action: () => setShowInstructions(true) },
        { label: 'Create your first Ad', done: ads.length > 0, action: () => navigation.navigate('CreateAd' as never) },
        { label: 'Save a Design', done: designs.length > 0, action: () => navigation.navigate('Designs' as never) },
    ];
    const completionCount = completionSteps.filter(s => s.done).length;
    const allDone = completionCount === completionSteps.length;

    const upcomingOccasions = useMemo(() => {
        const now = new Date();
        const y = now.getFullYear();
        const occasions = [
            { name: 'New Year', emoji: '🎆', month: 0, day: 1, grad: ['#4158D0', '#C850C0'] as const },
            { name: 'Makar Sankranti', emoji: '🪁', month: 0, day: 14, grad: ['#F7971E', '#FFD200'] as const },
            { name: 'Republic Day', emoji: '🇮🇳', month: 0, day: 26, grad: ['#11998E', '#38EF7D'] as const },
            { name: "Valentine's Day", emoji: '💕', month: 1, day: 14, grad: ['#FF416C', '#FF4B2B'] as const },
            { name: "Women's Day", emoji: '💜', month: 2, day: 8, grad: ['#8E2DE2', '#4A00E0'] as const },
            { name: 'Holi', emoji: '🎨', month: 2, day: 14, grad: ['#f953c6', '#b91d73'] as const },
            { name: "Mother's Day", emoji: '💐', month: 4, day: 11, grad: ['#FF8C00', '#FF4757'] as const },
            { name: "Father's Day", emoji: '👨', month: 5, day: 15, grad: ['#1A7CFF', '#00CEFF'] as const },
            { name: 'Independence Day', emoji: '🇮🇳', month: 7, day: 15, grad: ['#11998E', '#38EF7D'] as const },
            { name: 'Raksha Bandhan', emoji: '🎀', month: 7, day: 19, grad: ['#FC5C7D', '#6A82FB'] as const },
            { name: 'Ganesh Chaturthi', emoji: '🐘', month: 8, day: 27, grad: ['#F7971E', '#FFD200'] as const },
            { name: 'Navratri', emoji: '🔱', month: 9, day: 2, grad: ['#FF416C', '#FF4B2B'] as const },
            { name: 'Dussehra', emoji: '🏹', month: 9, day: 12, grad: ['#4158D0', '#C850C0'] as const },
            { name: 'Diwali', emoji: '🪔', month: 9, day: 20, grad: ['#F7971E', '#FFD200'] as const },
            { name: 'Christmas', emoji: '🎄', month: 11, day: 25, grad: ['#11998E', '#38EF7D'] as const },
        ];
        const found: Array<typeof occasions[0] & { daysLeft: number }> = [];
        for (let yr = y; yr <= y + 1; yr++) {
            for (const occ of occasions) {
                const d = new Date(yr, occ.month, occ.day);
                const diff = Math.ceil((d.getTime() - now.getTime()) / 86400000);
                if (diff >= 0 && diff <= 365 && found.length < 12) {
                    found.push({ ...occ, daysLeft: diff });
                }
            }
        }
        return found;
    }, []);

    useEffect(() => {
        analytics.track('App Open');
        api.trackEvent('app_open');
        syncFacebookState();
        // Register silently — no prompt, no alert
        //registerForPushNotifications().catch(() => {});
        }, []);

    // Re-sync when Dashboard regains focus (e.g. navigating back from Profile after removing a page)
    useFocusEffect(
        useCallback(() => {
            syncFacebookState();
        }, [])
    );

    const syncFacebookState = async () => {
        setSyncing(true);
        try {
            const status = await api.getMetaStatus();
            if (!status.connected) return;

            updateUser({ facebookConnected: true });
            if (status.profile) setFbProfileName(status.profile.name);

            // Run pages, campaigns, and leads in parallel — not sequential
            const [pagesData, fbData, leadsData] = await Promise.allSettled([
                api.getMetaPages(),
                api.getFbCampaigns(),
                api.getFbLeads(),
            ]);

            // Pages
            if (pagesData.status === 'fulfilled' && pagesData.value.pages?.length > 0) {
                useFacebookStore.getState().setConnection(
                    status.profile as any || { id: '', name: '' },
                    pagesData.value.pages,
                );
            }

            // Campaigns
            if (fbData.status === 'fulfilled') {
                const { campaigns, insights } = fbData.value;
                if (insights) setAccountStats(insights);
                setActiveAdsFromFb((campaigns || []).filter((c: any) => c.status === 'ACTIVE').length);
                if (campaigns?.length > 0) {
                    setRealCampaigns(campaigns.slice(0, 5).map((c: any) => ({
                        id: c.id,
                        title: c.name || 'Campaign',
                        dateRange: c.start_time
                            ? `${new Date(c.start_time).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} to ${c.stop_time ? new Date(c.stop_time).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Present'}`
                            : '',
                        startDate: c.start_time || null,
                        adViews: parseInt(c.insights?.impressions || '0').toLocaleString('en-IN'),
                        leads: parseInt(c.insights?.leads || '0'),
                        spent: `₹${Math.round(parseFloat(c.insights?.spend || '0')).toLocaleString('en-IN')}`,
                        platforms: ['facebook'],
                        isDemo: false,
                        status: c.status,
                        pageId: c.pageId || null,
                        pageName: c.pageName || null,
                    })));
                }
            }

            // Leads count
            if (leadsData.status === 'fulfilled') {
                setFbLeadsTotal(leadsData.value.totalLeads || 0);
            }
        } catch (err: any) {
            console.error('syncFacebookState error:', err?.message);
        } finally {
            setSyncing(false);
        }
    };

    const handleConnectFacebook = async () => {
        setConnectingFb(true);
        try {
            const result = await connectFacebook();
            setShowInstructions(false);
            if (result.success) {
                await syncFacebookState();
                // Navigate to page selection if pages were found
                const fbPages = useFacebookStore.getState().pages;
                if (fbPages.length > 0) {
                    navigation.navigate('SelectFacebookPages', {
                        businessName: user?.businessName || 'My Business',
                        category: user?.businessCategory || '',
                        fromDashboard: true,
                    });
                } else {
                    Alert.alert('Success!', 'Facebook connected successfully!');
                }
            } else if (result.error !== 'cancelled' && result.error !== 'dismissed') {
                Alert.alert('Connection Failed', result.errorDescription || 'Could not connect to Facebook.');
            }
        } catch {
            setShowInstructions(false);
            Alert.alert('Error', 'An error occurred while connecting to Facebook.');
        } finally {
            setConnectingFb(false);
        }
    };

    useEffect(() => {
        if (upcomingOccasions.length <= 1) return;
        const timer = setInterval(() => {
            occasionIndexRef.current = (occasionIndexRef.current + 1) % upcomingOccasions.length;
            occasionListRef.current?.scrollToIndex({ index: occasionIndexRef.current, animated: true });
        }, 3000);
        return () => clearInterval(timer);
    }, [upcomingOccasions.length]);

    useEffect(() => {
        if (!user?.facebookConnected) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(blinkAnim, { toValue: 0.6, duration: 800, useNativeDriver: true }),
                    Animated.timing(blinkAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
                ])
            ).start();
        }
    }, [user?.facebookConnected]);

    const greeting = () => {
        const h = new Date().getHours();
        if (h < 12) return 'Good Morning';
        if (h < 17) return 'Good Afternoon';
        return 'Good Evening';
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: C.surface }]} edges={['top']}>
            <StatusBar barStyle={C.background !== Colors.background ? 'light-content' : 'dark-content'} />

            {/* Header */}
            <View style={[styles.header, { backgroundColor: C.surface, borderBottomColor: C.borderLight }]}>
                {/* Profile — tap navigates to profile */}
                <TouchableOpacity
                    style={styles.profileBtn}
                    onPress={() => navigation.navigate('ProfileDetails' as never)}
                    activeOpacity={0.7}
                >
                    <View style={styles.avatarRingWrap}>
                        <LinearGradient
                            colors={['#1A7CFF', '#6C5CE7', '#FF4757']}
                            style={styles.avatarRing}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                        >
                            {user?.profilePhoto ? (
                                <Image source={{ uri: user.profilePhoto }} style={styles.profileAvatar} />
                            ) : (
                                <LinearGradient colors={['#1A7CFF', '#6C5CE7']} style={styles.avatarCircle} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                                    <Text style={styles.avatarText}>
                                        {(user?.businessName || user?.fullName || 'B').charAt(0).toUpperCase()}
                                    </Text>
                                </LinearGradient>
                            )}
                        </LinearGradient>
                        <View style={styles.avatarBadge}>
                            <Ionicons name="settings-sharp" size={8} color="#FFF" />
                        </View>
                    </View>
                    <View style={styles.profileTextWrap}>
                        <Text style={[styles.greetingText, { color: C.textTertiary }]} numberOfLines={1}>{greeting()}</Text>
                        <Text style={[styles.headerTitle, { color: C.text }]} numberOfLines={1} ellipsizeMode="tail">
                            {user?.businessName || user?.fullName || 'My Business'}
                        </Text>
                    </View>
                </TouchableOpacity>

                {/* Right actions */}
                <View style={styles.headerRight}>
                    <TouchableOpacity
                        style={styles.createAdBtn}
                        onPress={() => navigation.navigate('CreateAd' as never)}
                        activeOpacity={0.85}
                    >
                        <LinearGradient
                            colors={['#FF4757', '#C0392B']}
                            style={styles.createAdGrad}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                        >
                            <Ionicons name="rocket-outline" size={15} color="#FFF" />
                            <Text style={styles.createAdText}>Create Ad</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView
                ref={dashScrollRef}
                contentContainerStyle={[styles.scrollContent, { maxWidth: 600, alignSelf: 'center', width: '100%' }]}
                showsVerticalScrollIndicator={false}
                style={{ backgroundColor: C.background }}
                refreshControl={<RefreshControl refreshing={syncing} onRefresh={syncFacebookState} />}
            >
                {/* ── 1. Today at a Glance ───────────────────────── */}
                <View style={styles.glanceRow}>
                    {[
                        { label: 'New Leads', value: newLeadsCount, icon: 'people', color: '#FF4757', grad: ['#FF4757', '#FF6B81'] as const, route: 'Leads' },
                        { label: 'Active Ads', value: activeAdsCount, icon: 'rocket', color: '#1A7CFF', grad: ['#1A7CFF', '#00CEFF'] as const, route: 'Ads' },
                        { label: 'Designs', value: designs.length, icon: 'color-palette', color: '#6C5CE7', grad: ['#6C5CE7', '#A29BFE'] as const, route: 'Designs' },
                    ].map(stat => (
                        <TouchableOpacity
                            key={stat.label}
                            style={[styles.glancePill, { backgroundColor: C.surface, borderColor: C.borderLight }]}
                            activeOpacity={0.8}
                            onPress={() => navigation.navigate(stat.route as never)}
                        >
                            <LinearGradient
                                colors={stat.grad}
                                style={styles.glanceIconBox}
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                            >
                                <Ionicons name={stat.icon as any} size={18} color="#FFF" />
                            </LinearGradient>
                            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={[styles.glanceNum, { color: stat.color, width: '100%', textAlign: 'center' }]}>{stat.value}</Text>
                            <Text numberOfLines={1} style={[styles.glanceLabel, { color: C.textTertiary }]}>{stat.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* ── 2. New Leads Alert ──────────────────────────── */}
                {newLeadsCount > 0 && (
                    <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={() => navigation.navigate('Leads' as never)}
                        style={styles.leadsAlertWrap}
                    >
                        <LinearGradient
                            colors={['#FF4757', '#C0392B']}
                            style={styles.leadsAlertGrad}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                        >
                            <View style={styles.leadsAlertDot} />
                            <Ionicons name="people" size={18} color="#FFF" />
                            <Text style={styles.leadsAlertText}>
                                {newLeadsCount} new lead{newLeadsCount > 1 ? 's' : ''} waiting — tap to follow up
                            </Text>
                            <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.8)" />
                        </LinearGradient>
                    </TouchableOpacity>
                )}

                {/* ── 4. Profile Completion Card ─────────────────── */}
                {!allDone && !completionDismissed && (
                    <View style={[styles.completionCard, { backgroundColor: C.surface, borderColor: C.borderLight }]}>
                        <View style={styles.completionHeader}>
                            <View>
                                <Text style={[styles.completionTitle, { color: C.text }]}>
                                    Set up your business
                                </Text>
                                <Text style={[styles.completionSub, { color: C.textTertiary }]}>
                                    {completionCount} of {completionSteps.length} done
                                </Text>
                            </View>
                            <TouchableOpacity onPress={dismissCompletionCard} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                <Ionicons name="close" size={18} color={C.textTertiary} />
                            </TouchableOpacity>
                        </View>
                        <View style={[styles.progressTrack, { backgroundColor: C.borderLight }]}>
                            <View style={[styles.progressFill, { width: `${(completionCount / completionSteps.length) * 100}%` as any }]} />
                        </View>
                        {completionSteps.map((step, i) => (
                            <TouchableOpacity
                                key={i}
                                style={styles.completionStep}
                                onPress={step.done ? undefined : step.action}
                                activeOpacity={step.done ? 1 : 0.7}
                            >
                                <View style={[styles.completionCheck, step.done && styles.completionCheckDone]}>
                                    {step.done
                                        ? <Ionicons name="checkmark" size={12} color="#FFF" />
                                        : <Text style={{ fontSize: 10, color: Colors.brand, fontWeight: '700' }}>{i + 1}</Text>
                                    }
                                </View>
                                <Text style={[styles.completionStepLabel, { color: step.done ? C.textTertiary : C.text }, step.done && { textDecorationLine: 'line-through' }]}>
                                    {step.label}
                                </Text>
                                {!step.done && <Ionicons name="chevron-forward" size={14} color={C.textTertiary} />}
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {/* Tutorial Video Banner */}
                <TouchableOpacity
                    style={styles.tutorialCard}
                    activeOpacity={0.9}
                    onPress={() => Linking.openURL('https://www.youtube.com/watch?v=nN-dxgjq-uo')}
                >
                    <Image
                        source={{ uri: 'https://img.youtube.com/vi/nN-dxgjq-uo/mqdefault.jpg' }}
                        style={StyleSheet.absoluteFill}
                        resizeMode="cover"
                    />
                    <LinearGradient
                        colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.75)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                        style={styles.tutorialGradient}
                    >
                        <View style={styles.tutorialContent}>
                            <View style={styles.playIconContainer}>
                                <Ionicons name="play" size={22} color="#FFFFFF" />
                            </View>
                            <View style={styles.tutorialInfo}>
                                <Text style={styles.tutorialTitle}>How to use Biz499?</Text>
                                <Text style={styles.tutorialSubtitle}>Watch this quick video to learn how to run ads efficiently.</Text>
                            </View>
                        </View>
                    </LinearGradient>
                </TouchableOpacity>

                {/* Connected Pages / Accounts */}
                <Text style={[styles.sectionTitle, { color: C.text }]}>
                    {user?.facebookConnected && fbPages.length > 0
                        ? 'Your Facebook Pages'
                        : 'Connected Accounts'}
                </Text>

                {/* Show actual pages if connected — only selected pages, or all if none selected */}
                {user?.facebookConnected && fbPages.length > 0 ? (
                    <View style={styles.socialSection}>
                        {(fbSelectedPages.length > 0
                            ? fbPages.filter((p: any) =>
                                fbSelectedPages.includes(p.page_id || p.id))
                            : fbPages
                        ).map((page: any) => (
                            <TouchableOpacity
                                key={page.page_id || page.id}
                                style={[styles.socialCard, styles.socialCardConnected, { backgroundColor: C.surface, borderColor: C.borderLight }]}
                                activeOpacity={0.7}
                                onPress={() => navigation.navigate('PageInsights', {
                                    pageId: page.page_id || page.id,
                                    pageName: page.page_name || page.name,
                                    pageCategory: page.page_category || page.category,
                                })}
                            >
                                <View style={[styles.socialIconBox, { backgroundColor: Colors.facebook }]}>
                                    <Ionicons name="logo-facebook" size={22} color="#FFF" />
                                </View>
                                <View style={styles.socialInfo}>
                                    <Text style={[styles.socialName, { color: C.text }]}>{page.page_name || page.name}</Text>
                                    <Text style={[styles.socialStatus, { color: C.textSecondary }]}>
                                        {page.page_category || page.category || 'Facebook Page'}
                                        {fbProfile?.name ? ` · ${fbProfile.name}` : ''}
                                    </Text>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color={C.textTertiary} />
                            </TouchableOpacity>
                        ))}
                        <TouchableOpacity
                            style={[styles.socialCard, { backgroundColor: C.surface, borderColor: Colors.brand, borderWidth: 1.5 }]}
                            activeOpacity={0.8}
                            onPress={() => setShowInstructions(true)}
                        >
                            <View style={[styles.socialIconBox, { backgroundColor: Colors.brandBg }]}>
                                <Ionicons name="add-circle-outline" size={22} color={Colors.brand} />
                            </View>
                            <View style={styles.socialInfo}>
                                <Text style={[styles.socialName, { color: Colors.brand }]}>Add Facebook Page</Text>
                                <Text style={[styles.socialStatus, { color: C.textSecondary }]}>Connect another page or account</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={Colors.brand} />
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.socialSection}>
                        <SocialAccountCard
                            name="Facebook"
                            icon="logo-facebook"
                            iconColor="#FFF"
                            bgColor={Colors.facebook}
                            connected={!!user?.facebookConnected}
                            profileName={fbProfileName}
                            loading={connectingFb}
                            onPress={() => {
                                if (!user?.facebookConnected) setShowInstructions(true);
                                else navigation.navigate('ProfileDetails');
                            }}
                        />
                    </View>
                )}

                {/* Account Stats Summary */}
                {accountStats && (
                    <View style={{ marginBottom: Spacing.xl }}>
                        <Text style={[styles.sectionTitle, { color: C.text }]}>All Time Performance</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
                            {[
                                { label: 'Impressions', value: parseInt(accountStats.impressions || '0').toLocaleString('en-IN'), route: null },
                                { label: 'Reach', value: parseInt(accountStats.reach || '0').toLocaleString('en-IN'), route: null },
                                { label: 'Clicks', value: parseInt(accountStats.clicks || '0').toLocaleString('en-IN'), route: null },
                                { label: 'Spent', value: `₹${Math.round(parseFloat(accountStats.spend || '0')).toLocaleString('en-IN')}`, route: null },
                                ...(parseInt(accountStats.leads || '0') > 0 ? [{ label: 'Leads', value: accountStats.leads, route: 'LeadsDetail', routeParams: { title: 'Leads', fromDate: null } }] : []),
                                ...(parseInt(accountStats.messages || '0') > 0 ? [{ label: 'Messages', value: accountStats.messages, route: 'LeadsDetail', routeParams: { title: 'Messages', messageCount: parseInt(accountStats.messages || '0') } }] : []),
                                ...(parseInt(accountStats.purchases || '0') > 0 ? [{ label: 'Sales', value: accountStats.purchases, route: null }] : []),
                            ].map(stat => (
                                <TouchableOpacity
                                    key={stat.label}
                                    activeOpacity={stat.route ? 0.75 : 1}
                                    onPress={stat.route ? () => navigation.navigate(stat.route as never, (stat as any).routeParams) : undefined}
                                    style={{ width: '30%', flexGrow: 1, backgroundColor: C.surface, borderRadius: Radius.lg, paddingVertical: 12, paddingHorizontal: 8, alignItems: 'center', ...Shadow.sm }}
                                >
                                    <Text
                                        numberOfLines={1}
                                        adjustsFontSizeToFit
                                        minimumFontScale={0.6}
                                        style={{ fontFamily: Fonts.bold, fontSize: FontSize.lg, color: stat.route ? C.brand : C.text, width: '100%', textAlign: 'center' }}
                                    >{stat.value}</Text>
                                    <Text numberOfLines={1} style={{ fontFamily: Fonts.medium, fontSize: FontSize.xs, color: C.textTertiary, marginTop: 2 }}>{stat.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                )}

                {/* Ad Reports */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md, marginTop: Spacing.sm }}>
                    <Text style={[styles.sectionTitle, { color: C.text, marginBottom: 0, marginTop: 0 }]}>
                        {displayedCampaigns.length > 0 ? 'Your Ad Campaigns' : syncing ? 'Ad Campaigns' : 'How ads report will look'}
                    </Text>
                    {syncing && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <ActivityIndicator size="small" color={C.brand} />
                            <Text style={{ fontFamily: Fonts.medium, fontSize: 12, color: C.brand }}>Syncing...</Text>
                        </View>
                    )}
                </View>
                {displayedCampaigns.length > 0 ? (
    displayedCampaigns.map((ad) => (
        <AdCard
            key={ad.id}
            ad={ad}
            onPress={!ad.isDemo ? () => navigation.navigate('PageInsights', { pageName: 'Ad Insights' }) : undefined}
            onLeadsPress={!ad.isDemo && ad.leads && ad.leads > 0 ? () => navigation.navigate('LeadsDetail', { title: 'Leads', campaignName: ad.title, campaignId: ad.id, pageId: ad.pageId || null, fromDate: ad.startDate || null }) : undefined}
        />
    ))
) : (
    // IF CAMPAIGN NOT AVAILABLE
    <View style={{ padding: 20, alignItems: 'center', backgroundColor: C.surfaceSecondary, borderRadius: 12 }}>
        <Ionicons name="analytics-outline" size={32} color={C.textTertiary} />
        <Text style={{ fontFamily: Fonts.medium, color: C.textSecondary, marginTop: 10 }}>
            {user?.facebookConnected ? "No active campaigns found." : "Connect Facebook to see real-time ad reports."}
        </Text>
    </View>
)}

                {/* Business Tools */}
                <Text style={[styles.sectionTitle, { color: C.text }]}>Business Tools</Text>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.toolsRow}
                    contentContainerStyle={{ paddingRight: 16 }}
                >
                    {BUSINESS_TOOLS.map((tool) => (
                        <TouchableOpacity
                            key={tool.key}
                            style={[styles.toolCard, { backgroundColor: C.surface, borderWidth: 1, borderColor: C.borderLight }]}
                            activeOpacity={0.8}
                            onPress={() => navigation.navigate(tool.route as never)}
                        >
                            <LinearGradient
                                colors={tool.gradient as any}
                                style={styles.toolIconCircle}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            >
                                <Ionicons name={tool.icon as any} size={22} color="#FFF" />
                            </LinearGradient>
                            <Text style={[styles.toolLabel, { color: C.text }]} numberOfLines={1}>{tool.label}</Text>
                            <Text style={{ fontFamily: Fonts.regular, fontSize: 10, color: C.textTertiary, marginTop: 2 }}>{tool.sub}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* ── 3. Recent Designs ──────────────────────────── */}
                {designs.length > 0 && (
                    <View style={{ marginBottom: Spacing['2xl'] }}>
                        <View style={styles.sectionRowHeader}>
                            <Text style={[styles.sectionTitle, { color: C.text, marginBottom: 0 }]}>Recent Designs</Text>
                            <TouchableOpacity onPress={() => navigation.navigate('Designs' as never)}>
                                <Text style={styles.seeAllText}>See All</Text>
                            </TouchableOpacity>
                        </View>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
                        >
                            {designs.slice(0, 6).map(design => (
                                <TouchableOpacity
                                    key={design.id}
                                    style={styles.designThumbWrap}
                                    activeOpacity={0.85}
                                    onPress={() => navigation.navigate('Designs' as never)}
                                >
                                    {design.imageUri ? (
                                        <Image source={{ uri: design.imageUri }} style={styles.designThumb} resizeMode="cover" />
                                    ) : (
                                        <LinearGradient
                                            colors={['#6C5CE7', '#A29BFE']}
                                            style={styles.designThumb}
                                        >
                                            <Text style={{ fontSize: 28 }}>{design.categoryIcon || '🎨'}</Text>
                                        </LinearGradient>
                                    )}
                                    <Text style={[styles.designThumbName, { color: C.textSecondary }]} numberOfLines={1}>
                                        {design.name}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                            <TouchableOpacity
                                style={styles.designThumbNew}
                                onPress={() => navigation.navigate('Designs' as never)}
                                activeOpacity={0.8}
                            >
                                <View style={[styles.designThumb, { backgroundColor: C.surfaceSecondary, alignItems: 'center', justifyContent: 'center' }]}>
                                    <Ionicons name="add" size={28} color={Colors.brand} />
                                </View>
                                <Text style={[styles.designThumbName, { color: Colors.brand }]}>New</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                )}

                {/* ── 5. Upcoming Occasions Carousel ─────────────── */}
                {upcomingOccasions.length > 0 && (
                    <View style={{ marginBottom: Spacing.xl }}>
                        <Text style={[styles.sectionTitle, { color: C.text, marginHorizontal: Spacing.xl }]}>Upcoming Occasions</Text>
                        <FlatList
                            ref={occasionListRef}
                            data={upcomingOccasions}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            keyExtractor={(item, i) => `${item.name}-${i}`}
                            contentContainerStyle={{ paddingHorizontal: Spacing.xl, gap: 10 }}
                            onScrollToIndexFailed={() => {}}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    activeOpacity={0.88}
                                    onPress={() => navigation.navigate('Designs' as never)}
                                    style={styles.occasionPill}
                                >
                                    <LinearGradient
                                        colors={item.grad}
                                        style={styles.occasionPillGrad}
                                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                                    >
                                        <Text style={styles.occasionEmoji}>{item.emoji}</Text>
                                        <View style={{ flex: 1, minWidth: 0 }}>
                                            <Text style={styles.occasionTitle} numberOfLines={1}>{item.name}</Text>
                                            <Text style={styles.occasionMonth} numberOfLines={1}>
                                                {new Date(Date.now() + item.daysLeft * 86400000).toLocaleString('default', { month: 'short', day: 'numeric' })} · {item.daysLeft === 0 ? 'Today!' : `${item.daysLeft}d away`}
                                            </Text>
                                        </View>
                                        <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.8)" />
                                    </LinearGradient>
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                )}

            </ScrollView>

          {/* Facebook Connect Modal - moved to separate component */}
            {/*showInstructions && (
                // <View style={styles.modalOverlay}>
                //     <View style={[styles.modalContent, { backgroundColor: C.surface }]}>
                //         <View style={[styles.modalHeader, { borderBottomColor: C.borderLight }]}>
                //             <View style={{ flex: 1 }}>
                //                 <Text style={[styles.modalTitle, { color: C.text }]}>Connect Facebook</Text>
                //                 <Text style={[styles.modalSubtitle, { color: C.textSecondary }]}>Grant access to view ad performance</Text>
                //             </View>
                //             <TouchableOpacity onPress={() => setShowInstructions(false)} style={styles.closeButton}>
                //                 <Ionicons name="close" size={24} color={C.text} />
                //             </TouchableOpacity>
                //         </View>

                //         <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={styles.modalScroll} showsVerticalScrollIndicator={false} bounces={false}>
                //             <View style={styles.modalIconContainer}>
                //                 <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.facebook, alignItems: 'center', justifyContent: 'center' }}>
                //                     <Ionicons name="logo-facebook" size={32} color="white" />
                //                 </View>
                //             </View>

                //             <View style={styles.permissionBox}>
                //                 <Text style={styles.permissionTitle}>You are providing access to:</Text>
                //                 {[
                //                     { icon: 'document-text', title: 'Page Access', desc: 'Read data from your Facebook Pages' },
                //                     { icon: 'briefcase', title: 'Campaign Access', desc: 'Read ad campaigns and retrieve leads' },
                //                     { icon: 'analytics', title: 'Insights & Analytics', desc: 'View performance metrics and reports' },
                //                 ].map((perm, i) => (
                //                     <View key={i} style={styles.permissionItem}>
                //                         <View style={styles.permissionIconBox}>
                //                             <Ionicons name={perm.icon as any} size={18} color={Colors.brand} />
                //                         </View>
                //                         <View style={{ flex: 1 }}>
                //                             <Text style={styles.permissionItemTitle}>{perm.title}</Text>
                //                             <Text style={styles.permissionItemDesc}>{perm.desc}</Text>
                //                         </View>
                //                     </View>
                //                 ))}
                //             </View>

                //             <Text style={styles.modalNote}>
                //                 By connecting, you allow Biz499 to run ads and manage campaigns from this app on your behalf.
                //             </Text>

                //             <TouchableOpacity
                //                 style={styles.modalButton}
                //                 onPress={handleConnectFacebook}
                //                 disabled={connectingFb}
                //             >
                //                 {connectingFb ? (
                //                     <ActivityIndicator color="white" size="small" />
                //                 ) : (
                //                     <>
                //                         <Ionicons name="logo-facebook" size={20} color="white" style={{ marginRight: 8 }} />
                //                         <Text style={styles.modalButtonText}>Continue with Facebook</Text>
                //                     </>
                //                 )}
                //             </TouchableOpacity>

                //             <TouchableOpacity
                //                 style={styles.cancelButton}
                //                 onPress={() => setShowInstructions(false)}
                //             >
                //                 <Text style={styles.cancelButtonText}>Cancel</Text>
                //             </TouchableOpacity>
                //         </ScrollView>
                //     </View>
                // </View>
           )*/} 

       
    <FacebookConnectModal         //TANISHA-CHANGE3
    visible={showInstructions} 
    onClose={() => setShowInstructions(false)} 
    onConnect={handleConnectFacebook} 
    loading={connectingFb} 
/>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    // ── Header CTA ───────────────────────────────────────
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 },
    createAdBtn: { borderRadius: 22, overflow: 'hidden' },
    createAdGrad: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 22 },
    createAdText: { fontSize: 13, fontFamily: Fonts.bold, color: '#FFF', letterSpacing: 0.1 },

    // ── Today at a Glance ────────────────────────────────
    glanceRow: { flexDirection: 'row', gap: Spacing.sm, marginHorizontal: Spacing.xl, marginTop: Spacing.lg, marginBottom: Spacing.lg },
    glancePill: { flex: 1, borderRadius: Radius.xl, borderWidth: 1, paddingVertical: 14, alignItems: 'center', gap: 6 },
    glanceIconBox: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    glanceNum: { fontFamily: Fonts.bold, fontSize: 22, lineHeight: 26 },
    glanceLabel: { fontFamily: Fonts.medium, fontSize: 10, textAlign: 'center' },

    // ── New Leads Alert ──────────────────────────────────
    leadsAlertWrap: { marginHorizontal: Spacing.xl, marginBottom: Spacing.lg, borderRadius: Radius.lg, overflow: 'hidden' },
    leadsAlertGrad: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 12 },
    leadsAlertDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFF', opacity: 0.9 },
    leadsAlertText: { flex: 1, fontFamily: Fonts.semiBold, fontSize: 13, color: '#FFF' },

    // ── Profile Completion ───────────────────────────────
    completionCard: { marginHorizontal: Spacing.xl, marginBottom: Spacing.xl, borderRadius: Radius.xl, borderWidth: 1, padding: 16 },
    completionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
    completionTitle: { fontFamily: Fonts.bold, fontSize: FontSize.md },
    completionSub: { fontFamily: Fonts.regular, fontSize: FontSize.xs, marginTop: 2 },
    progressTrack: { height: 4, borderRadius: 2, marginBottom: 14, overflow: 'hidden' },
    progressFill: { height: 4, borderRadius: 2, backgroundColor: Colors.brand },
    completionStep: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(0,0,0,0.06)' },
    completionCheck: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: Colors.brand, alignItems: 'center', justifyContent: 'center' },
    completionCheckDone: { backgroundColor: Colors.brand, borderColor: Colors.brand },
    completionStepLabel: { flex: 1, fontFamily: Fonts.medium, fontSize: 13 },

    // ── Recent Designs ───────────────────────────────────
    sectionRowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.xl, marginBottom: Spacing.md },
    seeAllText: { fontFamily: Fonts.semiBold, fontSize: 13, color: Colors.brand },
    designThumbWrap: { width: 90, alignItems: 'center' },
    designThumbNew: { width: 90, alignItems: 'center' },
    designThumb: { width: 90, height: 90, borderRadius: 14, marginBottom: 6, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
    designThumbName: { fontFamily: Fonts.medium, fontSize: 10, textAlign: 'center' },

    // ── Upcoming Occasions Carousel ──────────────────────
    occasionPill: { borderRadius: 14, overflow: 'hidden', width: 190, height: 64 },
    occasionPillGrad: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, width: 190, height: 64, borderRadius: 14 },
    occasionEmoji: { fontSize: 24 },
    occasionTitle: { fontFamily: Fonts.bold, fontSize: 13, color: '#FFF' },
    occasionMonth: { fontFamily: Fonts.medium, fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 2 },

    container: {
        flex: 1,
        backgroundColor: Colors.surface,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.xl,
        paddingVertical: 10,
        backgroundColor: Colors.surface,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: Colors.borderLight,
    },
    profileBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flexShrink: 1,
        flexGrow: 1,
        minWidth: 0,
        marginRight: 12,
    },
    profileTextWrap: {
        flexShrink: 1,
        minWidth: 0,
    },
    avatarRingWrap: {
        position: 'relative',
        flexShrink: 0,
    },
    avatarRing: {
        width: 44,
        height: 44,
        borderRadius: 22,
        padding: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#6C5CE7',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: Colors.surface,
    },
    profileAvatar: {
        width: 38,
        height: 38,
        borderRadius: 19,
        resizeMode: 'cover',
    },
    avatarCircle: {
        width: 38,
        height: 38,
        borderRadius: 19,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontFamily: Fonts.bold,
        fontSize: 16,
        color: '#FFF',
    },
    greetingText: {
        fontFamily: Fonts.regular,
        fontSize: 11,
        color: Colors.textSecondary,
        marginBottom: 1,
    },
    headerTitle: {
        fontFamily: Fonts.bold,
        fontSize: 15,
        color: Colors.text,
        letterSpacing: -0.3,
    },
    notifButton: {
        width: 40,
        height: 40,
        borderRadius: Radius.md,
        backgroundColor: Colors.surfaceSecondary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    notifBadge: {
        position: 'absolute',
        top: 4,
        right: 4,
        minWidth: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#FF4757',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 3,
        borderWidth: 1.5,
        borderColor: Colors.surface,
    },
    notifBadgeText: {
        fontSize: 9,
        fontFamily: Fonts.bold,
        color: '#FFF',
        lineHeight: 12,
    },
    scrollContent: {
        padding: Spacing.xl,
        paddingBottom: 120,
    },
    sectionTitle: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.md,
        color: Colors.text,
        marginBottom: Spacing.md,
        marginTop: Spacing.sm,
    },

    // Business Tools
    toolsRow: {
        marginBottom: Spacing['2xl'],
    },
    toolCard: {
        width: 90,
        backgroundColor: Colors.surface,
        borderRadius: 16,
        paddingVertical: 14,
        paddingHorizontal: 8,
        alignItems: 'center',
        marginLeft: Spacing.sm,
    },
    toolIconCircle: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    toolLabel: {
        fontFamily: Fonts.medium,
        fontSize: 11,
        color: Colors.textSecondary,
        textAlign: 'center',
        lineHeight: 14,
        marginTop: 2,
    },

    // Social Accounts
    socialSection: {
        marginBottom: Spacing['2xl'],
        gap: Spacing.sm,
    },
    socialCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        borderRadius: Radius.lg,
        padding: 14,
        borderWidth: 1,
        borderColor: Colors.borderLight,
    },
    socialCardConnected: {
        borderColor: '#C6F6D5',
        backgroundColor: '#FAFFFE',
    },
    socialIconBox: {
        width: 42,
        height: 42,
        borderRadius: Radius.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: Spacing.md,
    },
    socialInfo: { flex: 1 },
    socialName: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.base,
        color: Colors.text,
    },
    socialStatus: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.xs,
        color: Colors.textSecondary,
        marginTop: 1,
    },
    connectedChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.successBg,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: Radius.sm,
        gap: 4,
    },
    connectedChipText: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.xs,
        color: Colors.success,
    },
    comingSoonChip: {
        backgroundColor: Colors.surfaceSecondary,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: Radius.sm,
    },
    comingSoonText: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.xs,
        color: Colors.textTertiary,
    },
    linkChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.brandBg,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: Radius.sm,
        gap: 2,
    },
    linkChipText: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.xs,
        color: Colors.brand,
    },

    // Ad Cards
    adCard: {
        backgroundColor: Colors.surface,
        borderRadius: Radius.xl,
        padding: Spacing.lg,
        marginBottom: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.borderLight,
        ...Shadow.sm,
    },
    adCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    adIconBox: {
        width: 38,
        height: 38,
        borderRadius: 10,
        backgroundColor: Colors.surfaceSecondary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    adTitle: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.base,
        color: Colors.text,
    },
    adDate: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.xs,
        color: Colors.textTertiary,
        marginTop: 1,
    },
    demoBadge: {
        backgroundColor: Colors.surfaceSecondary,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    demoBadgeText: {
        fontFamily: Fonts.semiBold,
        fontSize: 11,
        color: Colors.textSecondary,
    },
    statsGrid: {
        flexDirection: 'row',
        backgroundColor: Colors.surfaceSecondary,
        borderRadius: Radius.md,
        padding: 12,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statValue: {
        fontFamily: Fonts.bold,
        fontSize: FontSize.md,
        color: Colors.text,
        marginBottom: 2,
    },
    statLabel: {
        fontFamily: Fonts.medium,
        fontSize: 10,
        color: Colors.textTertiary,
        letterSpacing: 0.3,
        textTransform: 'uppercase',
    },
    platformIcon: {
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    googleIcon: {
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    googleText: {
        fontSize: 12,
        fontFamily: Fonts.semiBold,
        color: Colors.text,
    },
    // Removed: seeDetailsButton, seeDetailsText (cards are now tappable)

    // Tutorial Card
    tutorialCard: {
        marginBottom: Spacing['2xl'],
        borderRadius: Radius.xl,
        overflow: 'hidden',
        height: 140,
        ...Shadow.lg,
    },
    tutorialGradient: {
        flex: 1,
        padding: Spacing.xl,
        justifyContent: 'flex-end',
    },
    tutorialContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    playIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: Spacing.lg,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    tutorialInfo: { flex: 1 },
    tutorialTitle: {
        fontFamily: Fonts.bold,
        fontSize: FontSize.md,
        color: '#FFFFFF',
        marginBottom: 2,
    },
    tutorialSubtitle: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.xs,
        color: 'rgba(255, 255, 255, 0.85)',
        lineHeight: 18,
    },

    // Modal
    modalOverlay: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.xl,
    },
    modalContent: {
        backgroundColor: Colors.surface,
        borderRadius: Radius['2xl'],
        width: '100%',
        maxWidth: 400,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: Spacing.xl,
        borderBottomWidth: 1,
        borderBottomColor: Colors.borderLight,
    },
    modalTitle: {
        fontFamily: Fonts.bold,
        fontSize: FontSize.xl,
        color: Colors.text,
    },
    modalSubtitle: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.sm,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    closeButton: { padding: 4 },
    modalScroll: { padding: 20, paddingBottom: 24 },
    modalIconContainer: {
        alignItems: 'center',
        marginBottom: 16,
    },
    permissionBox: {
        backgroundColor: Colors.surfaceSecondary,
        borderRadius: Radius.lg,
        padding: 16,
        marginBottom: 16,
    },
    permissionTitle: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.sm,
        color: Colors.text,
        marginBottom: 12,
    },
    permissionItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    permissionIconBox: {
        width: 36,
        height: 36,
        borderRadius: 20,
        backgroundColor: Colors.brandBg,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: Spacing.md,
    },
    permissionItemTitle: {
        fontFamily: Fonts.semiBold,
        fontSize: FontSize.base,
        color: Colors.text,
        marginBottom: 2,
    },
    permissionItemDesc: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.sm,
        color: Colors.textSecondary,
        lineHeight: 18,
    },
    modalNote: {
        fontFamily: Fonts.regular,
        fontSize: FontSize.sm,
        color: Colors.textSecondary,
        lineHeight: 20,
        textAlign: 'center',
        marginBottom: Spacing.xl,
        paddingHorizontal: 10,
    },
    modalButton: {
        backgroundColor: Colors.facebook,
        paddingVertical: 16,
        borderRadius: Radius.md,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
    },
    modalButtonText: {
        fontFamily: Fonts.semiBold,
        color: '#FFFFFF',
        fontSize: FontSize.md,
    },
    cancelButton: {
        paddingVertical: 14,
        borderRadius: Radius.md,
        alignItems: 'center',
        marginTop: Spacing.md,
    },
    cancelButtonText: {
        fontFamily: Fonts.medium,
        fontSize: FontSize.base,
        color: Colors.textTertiary,
    },
});
