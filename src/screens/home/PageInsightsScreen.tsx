import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/api';
import { Colors, Fonts, FontSize, Spacing, Radius, Shadow, useColors } from '../../utils/theme';

type FilterType = 'All' | 'Active' | 'Paused' | 'Ended';

export const PageInsightsScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const C = useColors();
    const { pageName, pageId, pageCategory } = route.params || {};

    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [insights, setInsights] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<FilterType>('All');

    const loadData = useCallback(async () => {
        try {
            setError(null);
            const res = await api.getFbCampaigns(pageId);
            if (res.campaigns) setCampaigns(res.campaigns);
            if (res.insights) setInsights(res.insights);
        } catch (err: any) {
            setError(err?.message || 'Failed to load ad data');
        } finally {
            setLoading(false);
        }
    }, [pageId]);

    useEffect(() => { loadData(); }, [loadData]);

    const onRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    const fmt = (val: string | number | undefined) => {
        const n = parseInt(String(val || '0'));
        if (n >= 100000) return `${(n / 100000).toFixed(1)}L`;
        if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
        return n.toLocaleString('en-IN');
    };

    const fmtMoney = (val: string | number | undefined) => {
        const n = parseFloat(String(val || '0'));
        if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
        if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
        return `₹${Math.round(n).toLocaleString('en-IN')}`;
    };

    const statusOf = (status: string): { label: string; color: string; bg: string } => {
        if (status === 'ACTIVE') return { label: 'Active', color: C.success, bg: C.successBg };
        if (status === 'PAUSED') return { label: 'Paused', color: C.warning, bg: C.warningBg };
        return { label: 'Ended', color: C.textTertiary, bg: C.surfaceSecondary };
    };

    const filteredCampaigns = campaigns.filter(c => {
        if (filter === 'All') return true;
        if (filter === 'Active') return c.status === 'ACTIVE';
        if (filter === 'Paused') return c.status === 'PAUSED';
        return c.status !== 'ACTIVE' && c.status !== 'PAUSED';
    });

    // Header summary stats
    const totalLeads = campaigns.reduce((sum, c) => sum + parseInt(c.insights?.leads || '0'), 0);
    const totalSpend = campaigns.reduce((sum, c) => sum + parseFloat(c.insights?.spend || '0'), 0);
    const activeCount = campaigns.filter(c => c.status === 'ACTIVE').length;

    const renderCampaign = ({ item: c }: { item: any }) => {
        const ins = c.insights || {};
        const st = statusOf(c.status);
        const leads = parseInt(ins.leads || '0');
        const clicks = parseInt(ins.clicks || '0');
        const impressions = parseInt(ins.impressions || '0');
        const spend = parseFloat(ins.spend || '0');
        const messages = parseInt(ins.messages || '0');
        const startDate = c.start_time
            ? new Date(c.start_time).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
            : null;

        return (
            <TouchableOpacity
                style={[s.card, { backgroundColor: C.surface, borderColor: C.borderLight }]}
                activeOpacity={leads > 0 ? 0.7 : 1}
                onPress={leads > 0 ? () => navigation.navigate('LeadsDetail', {
                    title: 'Leads',
                    campaignName: c.name,
                    campaignId: c.id,
                    pageId: c.pageId || pageId || null,
                    fromDate: c.start_time || null,
                }) : undefined}
            >
                {/* Card header */}
                <View style={s.cardHeader}>
                    <View style={[s.campaignIcon, { backgroundColor: C.brandBg }]}>
                        <Ionicons name="megaphone" size={18} color={C.brand} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={[s.campaignName, { color: C.text }]} numberOfLines={1}>{c.name}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                            {c.pageName && (
                                <Text style={[s.campaignDate, { color: C.brand }]} numberOfLines={1}>
                                    {c.pageName}
                                </Text>
                            )}
                            {c.pageName && startDate && <Text style={[s.campaignDate, { color: C.textTertiary }]}>·</Text>}
                            {startDate && <Text style={[s.campaignDate, { color: C.textTertiary }]}>{startDate}</Text>}
                        </View>
                    </View>
                    <View style={[s.statusBadge, { backgroundColor: st.bg }]}>
                        <View style={[s.statusDot, { backgroundColor: st.color }]} />
                        <Text style={[s.statusText, { color: st.color }]}>{st.label}</Text>
                    </View>
                </View>

                {/* Stats row */}
                <View style={[s.statsRow, { backgroundColor: C.surfaceSecondary }]}>
                    {[
                        { label: 'Views', value: fmt(impressions) },
                        { label: 'Clicks', value: fmt(clicks) },
                        { label: 'Spent', value: fmtMoney(spend) },
                    ].map((stat, i, arr) => (
                        <React.Fragment key={stat.label}>
                            <View style={s.statCell}>
                                <Text style={[s.statValue, { color: C.text }]}>{stat.value}</Text>
                                <Text style={[s.statLabel, { color: C.textTertiary }]}>{stat.label}</Text>
                            </View>
                            {i < arr.length - 1 && <View style={[s.statDivider, { backgroundColor: C.border }]} />}
                        </React.Fragment>
                    ))}
                </View>

                {/* Results row — leads, messages */}
                {(leads > 0 || messages > 0) && (
                    <View style={s.resultsRow}>
                        {leads > 0 && (
                            <View style={[s.resultChip, { backgroundColor: C.successBg }]}>
                                <Ionicons name="people" size={12} color={C.success} />
                                <Text style={[s.resultChipText, { color: C.success }]}>{leads} Leads</Text>
                                {parseFloat(ins.costPerLead || '0') > 0 && (
                                    <Text style={[s.resultChipCost, { color: C.success }]}>· ₹{Math.round(parseFloat(ins.costPerLead))}/lead</Text>
                                )}
                            </View>
                        )}
                        {messages > 0 && (
                            <View style={[s.resultChip, { backgroundColor: C.brandBg }]}>
                                <Ionicons name="chatbubbles" size={12} color={C.brand} />
                                <Text style={[s.resultChipText, { color: C.brand }]}>{messages} Messages</Text>
                            </View>
                        )}
                        {leads > 0 && (
                            <View style={s.tapHint}>
                                <Text style={[s.tapHintText, { color: C.brand }]}>View leads</Text>
                                <Ionicons name="chevron-forward" size={12} color={C.brand} />
                            </View>
                        )}
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={[s.container, { backgroundColor: C.background }]} edges={['top']}>
            {/* Header */}
            <View style={[s.header, { backgroundColor: C.surface, borderBottomColor: C.borderLight }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={[s.backBtn, { backgroundColor: C.surfaceSecondary }]}>
                    <Ionicons name="arrow-back" size={20} color={C.text} />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={[s.headerTitle, { color: C.text }]} numberOfLines={1}>{pageName || 'Ad Campaigns'}</Text>
                    <Text style={[s.headerSub, { color: C.textTertiary }]} numberOfLines={1}>
                        {pageCategory || 'Facebook Page'}
                    </Text>
                </View>
                {/* Summary pills */}
                <View style={[s.summaryPills, { backgroundColor: C.surfaceSecondary }]}>
                    <View style={s.pill}>
                        <Text style={[s.pillNum, { color: C.text }]}>{campaigns.length}</Text>
                        <Text style={[s.pillLabel, { color: C.textTertiary }]}>Ads</Text>
                    </View>
                    <View style={s.pillDivider} />
                    <View style={s.pill}>
                        <Text style={[s.pillNum, { color: Colors.success }]}>{activeCount}</Text>
                        <Text style={[s.pillLabel, { color: C.textTertiary }]}>Live</Text>
                    </View>
                    <View style={s.pillDivider} />
                    <View style={s.pill}>
                        <Text style={[s.pillNum, { color: Colors.brand }]}>{totalLeads}</Text>
                        <Text style={[s.pillLabel, { color: C.textTertiary }]}>Leads</Text>
                    </View>
                </View>
            </View>

            {/* All-time spend bar */}
            {insights && !loading && (
                <View style={[s.spendBar, { backgroundColor: C.surface, borderBottomColor: C.borderLight }]}>
                    {[
                        { label: 'Total Spent', value: fmtMoney(insights.spend) },
                        { label: 'Impressions', value: fmt(insights.impressions) },
                        { label: 'Clicks', value: fmt(insights.clicks) },
                        ...(parseFloat(insights.costPerLead || '0') > 0 ? [{ label: '₹/Lead', value: `₹${Math.round(parseFloat(insights.costPerLead))}` }] : []),
                    ].map(m => (
                        <View key={m.label} style={s.spendCell}>
                            <Text style={[s.spendValue, { color: C.brand }]}>{m.value}</Text>
                            <Text style={[s.spendLabel, { color: C.textTertiary }]}>{m.label}</Text>
                        </View>
                    ))}
                </View>
            )}

            {/* Filter tabs */}
            <View style={[s.filterRow, { backgroundColor: C.surface }]}>
                {(['All', 'Active', 'Paused', 'Ended'] as FilterType[]).map(f => (
                    <TouchableOpacity
                        key={f}
                        style={[s.filterChip, { backgroundColor: C.surfaceSecondary }, filter === f && s.filterChipActive]}
                        onPress={() => setFilter(f)}
                    >
                        <Text style={[s.filterText, { color: C.textSecondary }, filter === f && s.filterTextActive]}>{f}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Content */}
            {loading ? (
                <View style={s.center}>
                    <ActivityIndicator size="large" color={C.brand} />
                    <Text style={[s.loadingText, { color: C.textTertiary }]}>Loading campaigns...</Text>
                </View>
            ) : error ? (
                <View style={s.center}>
                    <Ionicons name="alert-circle-outline" size={44} color={C.danger} />
                    <Text style={[s.errorText, { color: C.danger }]}>{error}</Text>
                    <TouchableOpacity onPress={loadData} style={[s.retryBtn, { backgroundColor: C.brandBg }]}>
                        <Text style={[s.retryText, { color: C.brand }]}>Retry</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={filteredCampaigns}
                    renderItem={renderCampaign}
                    keyExtractor={c => c.id}
                    contentContainerStyle={s.list}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brand} />}
                    ListEmptyComponent={
                        <View style={s.center}>
                            <Ionicons name="megaphone-outline" size={44} color={C.textTertiary} />
                            <Text style={[s.emptyTitle, { color: C.text }]}>No {filter !== 'All' ? filter.toLowerCase() : ''} campaigns</Text>
                            <Text style={[s.emptySubtitle, { color: C.textTertiary }]}>
                                {filter !== 'All' ? 'Try a different filter.' : 'Run an ad to see campaigns here.'}
                            </Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
};

const s = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        paddingHorizontal: 16, paddingTop: Spacing.xs, paddingBottom: Spacing.md,
        borderBottomWidth: 1,
    },
    backBtn: {
        width: 38, height: 38, borderRadius: 19,
        alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    },
    headerTitle: { fontFamily: Fonts.bold, fontSize: 18, letterSpacing: -0.3 },
    headerSub: { fontFamily: Fonts.regular, fontSize: 12, marginTop: 1 },
    summaryPills: {
        flexDirection: 'row', borderRadius: Radius.md, padding: 5, flexShrink: 0,
    },
    pill: { paddingHorizontal: 6, alignItems: 'center' },
    pillNum: { fontFamily: Fonts.bold, fontSize: 12 },
    pillLabel: { fontFamily: Fonts.medium, fontSize: 10 },
    pillDivider: { width: 1, backgroundColor: Colors.border, marginVertical: 4 },

    spendBar: {
        flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 10,
        borderBottomWidth: 1, gap: 4,
    },
    spendCell: { flex: 1, alignItems: 'center' },
    spendValue: { fontFamily: Fonts.bold, fontSize: 13 },
    spendLabel: { fontFamily: Fonts.medium, fontSize: 10, marginTop: 1 },

    filterRow: {
        flexDirection: 'row', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, gap: 8,
    },
    filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.full },
    filterChipActive: { backgroundColor: Colors.brand },
    filterText: { fontFamily: Fonts.semiBold, fontSize: 12 },
    filterTextActive: { color: '#FFF' },

    list: { padding: Spacing.xl, paddingBottom: 100 },
    center: { alignItems: 'center', paddingTop: 60 },
    loadingText: { fontFamily: Fonts.medium, fontSize: 14, marginTop: 12 },
    errorText: { fontFamily: Fonts.medium, fontSize: 14, marginTop: 12, textAlign: 'center' },
    retryBtn: { marginTop: 16, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
    retryText: { fontFamily: Fonts.semiBold, fontSize: 13 },
    emptyTitle: { fontFamily: Fonts.semiBold, fontSize: FontSize.lg, marginTop: 12 },
    emptySubtitle: { fontFamily: Fonts.regular, fontSize: FontSize.sm, textAlign: 'center', marginTop: 6, paddingHorizontal: 40 },

    card: {
        borderRadius: Radius.xl, padding: Spacing.lg,
        marginBottom: Spacing.md, borderWidth: 1, ...Shadow.sm,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
    campaignIcon: {
        width: 38, height: 38, borderRadius: 12,
        alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    },
    campaignName: { fontFamily: Fonts.semiBold, fontSize: FontSize.base },
    campaignDate: { fontFamily: Fonts.regular, fontSize: 11, marginTop: 1 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    statusText: { fontFamily: Fonts.semiBold, fontSize: 11 },

    statsRow: {
        flexDirection: 'row', borderRadius: Radius.md, padding: 10, marginBottom: 10,
    },
    statCell: { flex: 1, alignItems: 'center' },
    statValue: { fontFamily: Fonts.bold, fontSize: FontSize.md, marginBottom: 2 },
    statLabel: { fontFamily: Fonts.medium, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.3 },
    statDivider: { width: 1, marginVertical: 4 },

    resultsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
    resultChip: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8,
    },
    resultChipText: { fontFamily: Fonts.semiBold, fontSize: 12 },
    resultChipCost: { fontFamily: Fonts.medium, fontSize: 11 },
    tapHint: { flexDirection: 'row', alignItems: 'center', gap: 2, marginLeft: 'auto' },
    tapHintText: { fontFamily: Fonts.semiBold, fontSize: 12 },
});
