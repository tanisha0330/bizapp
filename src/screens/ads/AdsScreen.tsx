import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    StatusBar,
    Alert,
    RefreshControl,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAdStore, Ad } from '../../store/useAdStore';
import { api } from '../../services/api';
import { Colors, Fonts, FontSize, Spacing, Radius, Shadow, Gradients, useColors } from '../../utils/theme';

type TabType = 'All' | 'Active' | 'Draft';

const StatusBadge = ({ status, C }: { status: string; C: ReturnType<typeof useColors> }) => {
    const config: Record<string, { color: string; bg: string }> = {
        Published: { color: C.success, bg: C.successBg },
        Draft: { color: C.warning, bg: C.warningBg },
        Running: { color: C.success, bg: C.successBg },
        Active: { color: C.success, bg: C.successBg },
        Launching: { color: C.info, bg: C.infoBg },
        Paused: { color: C.warning, bg: C.warningBg },
        Failed: { color: C.danger, bg: C.dangerBg },
        Completed: { color: C.info, bg: C.infoBg },
    };
    const c = config[status] || { color: C.textTertiary, bg: C.surfaceSecondary };

    return (
        <View style={[styles.badge, { backgroundColor: c.bg }]}>
            <View style={[styles.badgeDot, { backgroundColor: c.color }]} />
            <Text style={[styles.badgeText, { color: c.color }]}>{status}</Text>
        </View>
    );
};

const PlatformIcon = ({ platform, C }: { platform: string; C: ReturnType<typeof useColors> }) => {
    if (platform === 'Google') return <MaterialCommunityIcons name="google" size={20} color={C.google} />;
    return <Ionicons name="logo-facebook" size={20} color={C.facebook} />;
};

export const AdsScreen = () => {
    const navigation = useNavigation<any>();
    const { ads, deleteAd, updateAd } = useAdStore();
    const C = useColors();
    const [activeTab, setActiveTab] = useState<TabType>('All');
    const [refreshing, setRefreshing] = useState(false);
    const [backendCampaigns, setBackendCampaigns] = useState<any[]>([]);
    const [fbCampaigns, setFbCampaigns] = useState<any[]>([]);
    const [loadingFb, setLoadingFb] = useState(true);

    const loadCampaigns = useCallback(async () => {
        try {
            const res = await api.getCampaigns();
            if (res.campaigns) setBackendCampaigns(res.campaigns);
        } catch {}
    }, []);

    const loadFbCampaigns = useCallback(async () => {
        try {
            const res = await api.getFbCampaigns();
            console.log('AdsScreen: FB campaigns loaded:', res.campaigns?.length || 0);
            if (res.campaigns) setFbCampaigns(res.campaigns);
        } catch (err: any) {
            console.error('AdsScreen: Failed to load FB campaigns:', err?.message);
        }
        finally { setLoadingFb(false); }
    }, []);

    useEffect(() => { loadCampaigns(); loadFbCampaigns(); }, [loadCampaigns, loadFbCampaigns]);

    const onRefresh = async () => {
        setRefreshing(true);
        await Promise.all([loadCampaigns(), loadFbCampaigns()]);
        setRefreshing(false);
    };

    // Map Facebook API status to our status labels
    const mapFbStatus = (status: string): Ad['status'] => {
        switch (status) {
            case 'ACTIVE': return 'Active';
            case 'PAUSED': return 'Paused';
            case 'ARCHIVED': case 'DELETED': return 'Paused';
            default: return 'Draft';
        }
    };

    // Get Biz499 backend campaign meta IDs to avoid duplicates
    const biz499MetaIds = new Set(
        backendCampaigns
            .map(c => c.meta_campaign_id || c.metaCampaignId)
            .filter(Boolean)
    );

    const allAds = [
        ...ads,
        ...backendCampaigns.map(c => ({
            id: c.id,
            title: c.name || c.title || 'Campaign',
            goal: c.objective || '',
            platform: (c.platform || 'Meta') as 'Meta' | 'Google',
            primaryText: c.primaryText || '',
            cta: c.cta || '',
            imageUri: c.imageUri || '',
            location: c.location || '',
            interest: c.interest || '',
            ageMin: c.ageMin || 18,
            ageMax: c.ageMax || 65,
            dailyBudget: c.dailyBudget || 0,
            durationDays: c.durationDays || 7,
            status: c.status || 'Draft',
            createdAt: c.createdAt || new Date().toISOString(),
            clicks: c.clicks || 0,
            impressions: c.impressions || 0,
            spent: c.spent || 0,
        } as Ad & { clicks?: number; impressions?: number; spent?: number })),
        // Facebook campaign history (exclude ones already tracked by Biz499)
        ...fbCampaigns
            .filter(c => !biz499MetaIds.has(c.id))
            .map(c => ({
                id: `fb_${c.id}`,
                title: c.name || 'Facebook Campaign',
                goal: c.objective || '',
                platform: 'Meta' as const,
                primaryText: '', cta: '', imageUri: '',
                location: '', interest: '',
                ageMin: 18, ageMax: 65,
                dailyBudget: c.daily_budget ? Math.round(parseInt(c.daily_budget) / 100) : 0,
                durationDays: 0,
                status: mapFbStatus(c.status),
                createdAt: c.created_time || new Date().toISOString(),
                clicks: parseInt(c.insights?.clicks || '0'),
                impressions: parseInt(c.insights?.impressions || '0'),
                spent: parseFloat(c.insights?.spend || '0'),
                source: 'facebook' as const,
                fbCampaignId: c.id,
            })),
    ];

    const filteredAds = activeTab === 'All'
        ? allAds
        : activeTab === 'Active'
            ? allAds.filter(ad => ['Active', 'Running', 'Launching', 'Published'].includes(ad.status))
            : allAds.filter(ad => ['Draft', 'Failed', 'Paused'].includes(ad.status));

    const handleCreateAd = () => navigation.navigate('CreateAd');

    const handleDelete = (id: string) => {
        Alert.alert('Delete Ad', 'Are you sure you want to delete this ad?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => deleteAd(id) },
        ]);
    };

    const handleLaunch = async (ad: Ad) => {
        const campaignId = ad.backendCampaignId;
        if (!campaignId) {
            Alert.alert('Cannot Launch', 'This ad was saved locally. Please create a new ad with Facebook connected to launch.');
            return;
        }
        Alert.alert('Launch Campaign', 'This will submit your ad to Meta for review and start spending your budget. Continue?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Launch', onPress: async () => {
                    try {
                        updateAd(ad.id, { status: 'Launching' });
                        await api.launchCampaign(campaignId);
                        updateAd(ad.id, { status: 'Launching' });
                        await loadCampaigns();
                        Alert.alert('Launching!', 'Your ad is being submitted to Meta for review.');
                    } catch (err: any) {
                        updateAd(ad.id, { status: 'Failed', backendError: err?.message });
                        Alert.alert('Launch Failed', err?.message || 'Could not launch campaign.');
                    }
                },
            },
        ]);
    };

    const handlePause = async (id: string) => {
        try {
            await api.pauseCampaign(id);
            await loadCampaigns();
            Alert.alert('Paused', 'Campaign paused successfully.');
        } catch {
            Alert.alert('Error', 'Failed to pause campaign.');
        }
    };

    const handleResume = async (id: string) => {
        try {
            await api.resumeCampaign(id);
            await loadCampaigns();
            Alert.alert('Resumed', 'Campaign resumed successfully.');
        } catch {
            Alert.alert('Error', 'Failed to resume campaign.');
        }
    };

    const renderAdItem = ({ item }: { item: any }) => (
        <View style={[styles.adCard, { backgroundColor: C.surface, borderColor: C.borderLight }]}>
            <View style={styles.adHeader}>
                <View style={styles.adTitleRow}>
                    <View style={[styles.platformIconContainer, { backgroundColor: C.surfaceSecondary }]}>
                        <PlatformIcon platform={item.platform} C={C} />
                    </View>
                    <View style={styles.adInfo}>
                        <Text style={[styles.adTitle, { color: C.text }]} numberOfLines={1}>{item.title}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={[styles.adDate, { color: C.textTertiary }]}>
                                {item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                            </Text>
                            {item.source === 'facebook' && (
                                <View style={{ backgroundColor: C.surfaceSecondary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                    <Text style={{ fontSize: 10, fontFamily: Fonts.semiBold, color: C.facebook }}>FB History</Text>
                                </View>
                            )}
                        </View>
                    </View>
                </View>
                <StatusBadge status={item.status} C={C} />
            </View>

            <View style={[styles.statsRow, { backgroundColor: C.surfaceSecondary }]}>
                <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: C.text }]}>{item.clicks || 0}</Text>
                    <Text style={[styles.statLabel, { color: C.textTertiary }]}>Clicks</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: C.borderLight }]} />
                <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: C.text }]}>{(item.impressions || 0).toLocaleString()}</Text>
                    <Text style={[styles.statLabel, { color: C.textTertiary }]}>Impressions</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: C.borderLight }]} />
                <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: C.text }]}>
                        {typeof item.spent === 'number' ? `₹${item.spent}` : `₹${item.dailyBudget * item.durationDays}`}
                    </Text>
                    <Text style={[styles.statLabel, { color: C.textTertiary }]}>{item.status === 'Draft' ? 'Budget' : 'Spent'}</Text>
                </View>
            </View>

            <View style={styles.detailRow}>
                {item.goal ? <Text style={[styles.detailChip, { backgroundColor: C.surfaceSecondary, color: C.textSecondary }]}>{item.goal}</Text> : null}
                {item.location ? <Text style={[styles.detailChip, { backgroundColor: C.surfaceSecondary, color: C.textSecondary }]}>{item.location}</Text> : null}
                <Text style={[styles.detailChip, { backgroundColor: C.surfaceSecondary, color: C.textSecondary }]}>{item.ageMin}-{item.ageMax} yrs</Text>
            </View>

            <View style={[styles.actionRow, { borderTopColor: C.borderLight }]}>
                {(item.status === 'Running' || item.status === 'Active') ? (
                    <TouchableOpacity style={styles.actionButton} onPress={() => handlePause(item.backendCampaignId || item.id)}>
                        <Ionicons name="pause" size={18} color={C.warning} />
                        <Text style={[styles.actionText, { color: C.warning }]}>Pause</Text>
                    </TouchableOpacity>
                ) : item.status === 'Paused' ? (
                    <TouchableOpacity style={styles.actionButton} onPress={() => handleResume(item.backendCampaignId || item.id)}>
                        <Ionicons name="play" size={18} color={C.success} />
                        <Text style={[styles.actionText, { color: C.success }]}>Resume</Text>
                    </TouchableOpacity>
                ) : item.status === 'Launching' ? (
                    <View style={styles.actionButton}>
                        <Ionicons name="time-outline" size={18} color={C.info} />
                        <Text style={[styles.actionText, { color: C.info }]}>Submitting to Meta...</Text>
                    </View>
                ) : item.status === 'Failed' ? (
                    <View style={{ flexDirection: 'row', gap: 16 }}>
                        <TouchableOpacity style={styles.actionButton} onPress={() => handleLaunch(item)}>
                            <Ionicons name="refresh" size={18} color={C.brand} />
                            <Text style={[styles.actionText, { color: C.brand }]}>Retry</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionButton} onPress={() => handleDelete(item.id)}>
                            <Ionicons name="trash-outline" size={18} color={C.danger} />
                            <Text style={[styles.actionText, { color: C.danger }]}>Delete</Text>
                        </TouchableOpacity>
                    </View>
                ) : item.status === 'Draft' ? (
                    <View style={{ flexDirection: 'row', gap: 16 }}>
                        <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('CreateAd', { draftAd: item })}>
                            <Ionicons name="create-outline" size={18} color={C.brand} />
                            <Text style={[styles.actionText, { color: C.brand }]}>Edit</Text>
                        </TouchableOpacity>
                        {item.backendCampaignId ? (
                            <TouchableOpacity style={styles.actionButton} onPress={() => handleLaunch(item)}>
                                <Ionicons name="rocket-outline" size={18} color={C.success} />
                                <Text style={[styles.actionText, { color: C.success }]}>Launch</Text>
                            </TouchableOpacity>
                        ) : null}
                        <TouchableOpacity style={styles.actionButton} onPress={() => handleDelete(item.id)}>
                            <Ionicons name="trash-outline" size={18} color={C.danger} />
                            <Text style={[styles.actionText, { color: C.danger }]}>Delete</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <TouchableOpacity style={styles.actionButton}>
                        <Ionicons name="bar-chart-outline" size={18} color={C.brand} />
                        <Text style={[styles.actionText, { color: C.brand }]}>Report</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: C.surface }]} edges={['top']}>
            <StatusBar barStyle={C.background !== Colors.background ? 'light-content' : 'dark-content'} />

            <View style={[styles.header, { borderBottomColor: C.borderLight }]}>
                <Text style={[styles.screenTitle, { color: C.text }]}>My Ads</Text>
                <View style={[styles.countBadge, { backgroundColor: C.brandBg }]}>
                    <Text style={[styles.countText, { color: C.brand }]}>{allAds.length}</Text>
                </View>
            </View>

            <View style={[styles.tabsContainer, { backgroundColor: C.surface }]}>
                {(['All', 'Active', 'Draft'] as TabType[]).map((tab) => (
                    <TouchableOpacity
                        key={tab}
                        style={[styles.tab, { backgroundColor: C.surfaceSecondary }, activeTab === tab && styles.activeTab]}
                        onPress={() => setActiveTab(tab)}
                    >
                        <Text style={[styles.tabText, { color: C.textSecondary }, activeTab === tab && styles.activeTabText]}>{tab}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {loadingFb && (
                <View style={[styles.syncBanner, { backgroundColor: C.brandBg }]}>
                    <ActivityIndicator size="small" color={C.brand} />
                    <Text style={[styles.syncBannerText, { color: C.brand }]}>Loading campaigns from Facebook...</Text>
                </View>
            )}

            <FlatList
                contentContainerStyle={styles.listContent}
                style={{ backgroundColor: C.background }}
                data={filteredAds}
                renderItem={renderAdItem}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <View style={[styles.emptyIconCircle, { backgroundColor: C.surfaceSecondary }]}>
                            <Ionicons name="megaphone-outline" size={36} color={C.textTertiary} />
                        </View>
                        <Text style={[styles.emptyTitle, { color: C.text }]}>No ads yet</Text>
                        <Text style={[styles.emptySubtitle, { color: C.textTertiary }]}>Create your first ad to start growing your business</Text>
                        <TouchableOpacity style={styles.emptyBtn} onPress={handleCreateAd}>
                            <LinearGradient colors={Gradients.brand as any} style={styles.emptyBtnGrad}>
                                <Text style={styles.emptyBtnText}>Create Ad</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                }
            />

            <TouchableOpacity style={styles.fab} activeOpacity={0.9} onPress={handleCreateAd}>
                <LinearGradient colors={Gradients.brand as any} style={styles.fabGradient}>
                    <Ionicons name="add" size={30} color="white" />
                </LinearGradient>
            </TouchableOpacity>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.surface },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: Spacing.xl, paddingTop: Spacing.xs, paddingBottom: Spacing.md,
        borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
    },
    screenTitle: { fontFamily: Fonts.bold, fontSize: 18, color: Colors.text, letterSpacing: -0.3 },
    countBadge: { backgroundColor: Colors.brandBg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.sm },
    countText: { fontFamily: Fonts.bold, fontSize: FontSize.sm, color: Colors.brand },
    tabsContainer: {
        flexDirection: 'row', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md,
        backgroundColor: Colors.surface, gap: Spacing.sm,
    },
    tab: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: Radius.full, backgroundColor: Colors.surfaceSecondary },
    activeTab: { backgroundColor: Colors.brand },
    tabText: { fontFamily: Fonts.semiBold, fontSize: FontSize.sm, color: Colors.textSecondary },
    activeTabText: { color: Colors.textInverse },
    listContent: { padding: Spacing.xl, paddingBottom: 100 },
    adCard: {
        backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: Spacing.lg, marginBottom: Spacing.lg,
        borderWidth: 1, borderColor: Colors.borderLight, ...Shadow.sm,
    },
    adHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
    adTitleRow: { flexDirection: 'row', flex: 1, marginRight: 12 },
    platformIconContainer: {
        width: 40, height: 40, borderRadius: Radius.md, backgroundColor: Colors.surfaceSecondary,
        justifyContent: 'center', alignItems: 'center', marginRight: 12,
    },
    adInfo: { flex: 1 },
    adTitle: { fontFamily: Fonts.semiBold, fontSize: FontSize.md, color: Colors.text, marginBottom: 2 },
    adDate: { fontFamily: Fonts.regular, fontSize: FontSize.xs, color: Colors.textTertiary },
    badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    badgeDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
    badgeText: { fontFamily: Fonts.semiBold, fontSize: FontSize.xs },
    statsRow: {
        flexDirection: 'row', backgroundColor: Colors.surfaceSecondary, borderRadius: Radius.md,
        padding: 12, marginBottom: 12,
    },
    statItem: { flex: 1, alignItems: 'center' },
    statDivider: { width: 1, backgroundColor: Colors.border, marginVertical: 4 },
    statValue: { fontFamily: Fonts.bold, fontSize: FontSize.md, color: Colors.text, marginBottom: 2 },
    statLabel: { fontFamily: Fonts.medium, fontSize: FontSize.xs, color: Colors.textTertiary },
    detailRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
    detailChip: {
        fontFamily: Fonts.semiBold, fontSize: FontSize.xs, color: Colors.textSecondary,
        backgroundColor: Colors.surfaceSecondary, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
    },
    actionRow: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.borderLight,
    },
    actionButton: { flexDirection: 'row', alignItems: 'center' },
    actionText: { fontFamily: Fonts.semiBold, fontSize: FontSize.sm, marginLeft: 6 },
    fab: {
        position: 'absolute', bottom: 24, right: 24,
        ...Shadow.brand,
    },
    fabGradient: { width: 60, height: 60, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    syncBanner: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        paddingHorizontal: 16, paddingVertical: 10,
    },
    syncBannerText: { fontFamily: Fonts.medium, fontSize: 13 },
    emptyState: { alignItems: 'center', paddingTop: 60 },
    emptyIconCircle: {
        width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.surfaceSecondary,
        justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.lg,
    },
    emptyTitle: { fontFamily: Fonts.semiBold, fontSize: FontSize.lg, color: Colors.text, marginBottom: Spacing.sm },
    emptySubtitle: { fontFamily: Fonts.regular, fontSize: FontSize.sm, color: Colors.textTertiary, textAlign: 'center', width: '70%', marginBottom: Spacing.xl },
    emptyBtn: { borderRadius: Radius.md, overflow: 'hidden' },
    emptyBtnGrad: { paddingHorizontal: 28, paddingVertical: 14, borderRadius: Radius.md },
    emptyBtnText: { fontFamily: Fonts.bold, fontSize: FontSize.base, color: '#FFFFFF' },
});
