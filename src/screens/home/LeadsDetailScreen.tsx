import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Linking,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/api';
import { useLeadStore, Lead } from '../../store/useLeadStore';
import { Colors, Fonts, FontSize, Spacing, Radius, useColors } from '../../utils/theme';
import { LeadCard, LeadDetailModal } from '../../components/leads/SharedLeadComponents';

const STANDARD_KEYS = new Set([
    'id', 'formId', 'formName', 'pageName', 'pageId', 'createdAt',
    'name', 'full_name', 'first_name', 'email', 'phone_number', 'phone', 'city',
]);

function mapFbToLead(l: any): Lead {
    const customFields: Record<string, string> = {};
    for (const key of Object.keys(l)) {
        if (!STANDARD_KEYS.has(key) && l[key] && typeof l[key] === 'string') {
            customFields[key] = l[key];
        }
    }
    return {
        id: `fb_${l.id}`,
        name: l.name || 'Unknown',
        phone: l.phone_number || l.phone || '',
        email: l.email || '',
        city: l.city || '',
        adSource: `FB: ${l.formName || 'Lead Form'}`,
        status: 'New' as const,
        timestamp: l.createdAt,
        notes: '',
        avatar: (l.name || 'F')[0].toUpperCase(),
        customFields: Object.keys(customFields).length > 0 ? customFields : undefined,
    };
}

export const LeadsDetailScreen = () => {
    const C = useColors();
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const title = route.params?.title || 'Leads';
    const campaignName = route.params?.campaignName || null;
    const campaignId: string | null = route.params?.campaignId || null;
    const pageId: string | null = route.params?.pageId || null;
    const fromDate: string | null = route.params?.fromDate || null;
    const messageCount: number = route.params?.messageCount || 0;
    const isMessages = title === 'Messages';

    const { leads, addLead, updateStatus, deleteLead, addNote } = useLeadStore();

    const [fbLeads, setFbLeads] = useState<Lead[]>([]);
    const [messages, setMessages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
    const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        try {
            setError(null);
            if (isMessages) {
                const res = await api.getFbMessages();
                setMessages(res.messages || []);
            } else {
                const params: { campaignId?: string; pageId?: string } = {};
                if (campaignId) params.campaignId = campaignId;
                if (pageId) params.pageId = pageId;
                const res = await api.getFbLeads(Object.keys(params).length ? params : undefined);
                if (res.leads?.length > 0) {
                    setFbLeads(res.leads.map(mapFbToLead));
                }
            }
        } catch (err: any) {
            setError(err?.message || `Failed to load ${isMessages ? 'messages' : 'leads'}`);
        } finally {
            setLoading(false);
        }
    }, [isMessages, campaignId, pageId]);

    useEffect(() => { loadData(); }, [loadData]);

    const onRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    // Merge local store (status/notes) with fresh FB leads — same pattern as LeadsScreen
    const allLeads = useMemo(() => {
        const fbById = new Map(fbLeads.map(l => [l.id, l]));
        const mergedLocal = leads
            .filter(l => fbById.has(l.id))
            .map(l => {
                const fresh = fbById.get(l.id)!;
                return { ...l, name: fresh.name || l.name, phone: fresh.phone || l.phone, email: fresh.email || l.email, avatar: (fresh.name || l.name || 'F')[0].toUpperCase() };
            });
        const localIds = new Set(leads.map(l => l.id));
        const uniqueFb = fbLeads.filter(l => !localIds.has(l.id));
        return [...mergedLocal, ...uniqueFb];
    }, [leads, fbLeads]);

    const filterByDate = (items: Lead[]) => {
        const campaignStart = fromDate ? new Date(fromDate).getTime() : null;
        const now = new Date();
        return items.filter(item => {
            const date = new Date(item.timestamp);
            if (campaignStart && date.getTime() < campaignStart) return false;
            if (filter === 'today') return date.toDateString() === now.toDateString();
            if (filter === 'week') return now.getTime() - date.getTime() < 7 * 86400000;
            if (filter === 'month') return now.getTime() - date.getTime() < 30 * 86400000;
            return true;
        });
    };

    const filteredLeads = filterByDate(allLeads);

    const filterMessages = (items: any[]) => {
        const now = new Date();
        return items.filter(item => {
            const date = new Date(item.updatedAt);
            if (filter === 'today') return date.toDateString() === now.toDateString();
            if (filter === 'week') return now.getTime() - date.getTime() < 7 * 86400000;
            if (filter === 'month') return now.getTime() - date.getTime() < 30 * 86400000;
            return true;
        });
    };

    const filteredMessages = filterMessages(messages);
    const totalCount = isMessages ? filteredMessages.length : filteredLeads.length;

    // Derive selectedLead reactively — never stale
    const selectedLead = selectedLeadId ? allLeads.find(l => l.id === selectedLeadId) ?? null : null;

    const handleStatusChange = (id: string, status: Lead['status']) => {
        if (id.startsWith('fb_') && !leads.find(l => l.id === id)) {
            const fbLead = fbLeads.find(l => l.id === id);
            if (fbLead) { addLead({ ...fbLead, status }); return; }
        }
        updateStatus(id, status);
    };

    const handleDelete = (id: string) => {
        Alert.alert('Delete Lead', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => { deleteLead(id); setSelectedLeadId(null); } },
        ]);
    };

    const formatTime = (dateStr: string) => {
        const d = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - d.getTime();
        const diffHrs = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        if (diffHrs < 1) return 'Just now';
        if (diffHrs < 24) return `${diffHrs}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const renderMessage = ({ item }: { item: any }) => (
        <View style={[s.card, { backgroundColor: C.surface, borderColor: C.borderLight }]}>
            <View style={s.cardHeader}>
                <View style={[s.avatar, { backgroundColor: C.surfaceSecondary }]}>
                    <Ionicons name="chatbubble" size={16} color={C.brand} />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={[s.name, { color: C.text }]} numberOfLines={1}>{item.customerName}</Text>
                    <Text style={[s.time, { color: C.textTertiary }]}>{formatTime(item.updatedAt)}</Text>
                </View>
                <View style={[s.msgCount, { backgroundColor: C.brandBg }]}>
                    <Text style={[s.msgCountText, { color: C.brand }]}>{item.messageCount} msgs</Text>
                </View>
            </View>
            {item.lastMessage ? (
                <View style={[s.details, { backgroundColor: C.surfaceSecondary }]}>
                    <Text style={[s.lastMsg, { color: C.text }]} numberOfLines={2}>
                        <Text style={{ fontFamily: Fonts.semiBold }}>{item.lastMessageFrom}: </Text>
                        {item.lastMessage}
                    </Text>
                </View>
            ) : null}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
                <Ionicons name="document-text-outline" size={12} color={C.textTertiary} />
                <Text style={{ fontFamily: Fonts.regular, fontSize: 11, color: C.textTertiary }}>{item.pageName}</Text>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={[s.container, { backgroundColor: C.background }]} edges={['top']}>
            <View style={[s.header, { backgroundColor: C.surface, borderBottomColor: C.borderLight }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={[s.backBtn, { backgroundColor: C.surfaceSecondary }]}>
                    <Ionicons name="arrow-back" size={20} color={C.text} />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={[s.headerTitle, { color: C.text }]}>{campaignName || title}</Text>
                    <Text style={[s.headerSub, { color: C.textTertiary }]} numberOfLines={1}>
                        {totalCount} lead{totalCount !== 1 ? 's' : ''}{campaignId ? ' from this campaign' : fromDate ? ' since campaign start' : ''}
                    </Text>
                </View>
            </View>

            <View style={[s.filterRow, { backgroundColor: C.surface }]}>
                {([
                    { key: 'all', label: 'All' },
                    { key: 'today', label: 'Today' },
                    { key: 'week', label: '7 Days' },
                    { key: 'month', label: '30 Days' },
                ] as const).map(f => (
                    <TouchableOpacity
                        key={f.key}
                        style={[s.filterChip, { backgroundColor: C.surfaceSecondary }, filter === f.key && s.filterChipActive]}
                        onPress={() => setFilter(f.key)}
                    >
                        <Text style={[s.filterText, { color: C.textSecondary }, filter === f.key && s.filterTextActive]}>{f.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {loading ? (
                <View style={s.center}>
                    <ActivityIndicator size="large" color={C.brand} />
                    <Text style={[s.loadingText, { color: C.textTertiary }]}>
                        {campaignName ? `Loading leads for "${campaignName}"...` : `Loading ${isMessages ? 'messages' : 'leads'}...`}
                    </Text>
                </View>
            ) : error ? (
                <View style={s.center}>
                    <Ionicons name="alert-circle-outline" size={44} color={C.danger} />
                    <Text style={[s.errorText, { color: C.danger }]}>{error}</Text>
                    <TouchableOpacity onPress={loadData} style={[s.retryBtn, { backgroundColor: C.brandBg }]}>
                        <Text style={[s.retryText, { color: C.brand }]}>Retry</Text>
                    </TouchableOpacity>
                </View>
            ) : isMessages ? (
                <FlatList
                    data={filteredMessages}
                    renderItem={renderMessage}
                    keyExtractor={item => item.id}
                    contentContainerStyle={s.list}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    ListEmptyComponent={
                        <View style={s.center}>
                            <View style={[s.messengerIconBox, { backgroundColor: '#E7F3FF' }]}>
                                <Ionicons name="chatbubbles" size={32} color="#0084FF" />
                            </View>
                            <Text style={[s.emptyTitle, { color: C.text }]}>
                                {messageCount > 0 ? `${messageCount} people messaged you` : 'Messages from your ads'}
                            </Text>
                            <Text style={[s.emptySubtitle, { color: C.textTertiary }]}>
                                {messageCount > 0
                                    ? `${messageCount} people clicked "Send Message" on your ads and started a conversation. These live in your Facebook Messenger inbox.`
                                    : 'People who click "Send Message" on your ads will appear in your Facebook Messenger inbox.'}
                            </Text>
                            <TouchableOpacity
                                style={s.messengerBtn}
                                onPress={() => Linking.openURL('https://www.facebook.com/messages')}
                                activeOpacity={0.85}
                            >
                                <Ionicons name="chatbubbles" size={18} color="#FFF" />
                                <Text style={s.messengerBtnText}>Open Facebook Messenger</Text>
                            </TouchableOpacity>
                        </View>
                    }
                />
            ) : (
                <FlatList
                    data={filteredLeads}
                    renderItem={({ item }) => (
                        <LeadCard lead={item} onPress={() => setSelectedLeadId(item.id)} />
                    )}
                    keyExtractor={item => item.id}
                    contentContainerStyle={s.list}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    ListEmptyComponent={
                        <View style={s.center}>
                            <Ionicons name="people-outline" size={44} color={C.textTertiary} />
                            <Text style={[s.emptyTitle, { color: C.text }]}>No leads found</Text>
                            <Text style={[s.emptySubtitle, { color: C.textTertiary }]}>
                                {filter !== 'all' ? 'Try a different time filter.' : 'Leads from your Facebook Lead Ads will appear here.'}
                            </Text>
                        </View>
                    }
                />
            )}

            <LeadDetailModal
                lead={selectedLead}
                visible={!!selectedLeadId}
                onClose={() => setSelectedLeadId(null)}
                onUpdateStatus={handleStatusChange}
                onAddNote={addNote}
                onDelete={handleDelete}
            />
        </SafeAreaView>
    );
};

const s = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        paddingHorizontal: 20, paddingVertical: 12,
        borderBottomWidth: 1,
    },
    backBtn: {
        width: 38, height: 38, borderRadius: 19,
        alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: { fontFamily: Fonts.bold, fontSize: 18 },
    headerSub: { fontFamily: Fonts.regular, fontSize: 12, marginTop: 1 },
    filterRow: {
        flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 10, gap: 8,
    },
    filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
    filterChipActive: { backgroundColor: Colors.brand },
    filterText: { fontFamily: Fonts.semiBold, fontSize: 12 },
    filterTextActive: { color: '#FFF' },
    list: { padding: 20, paddingBottom: 100 },
    center: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 40 },
    loadingText: { fontFamily: Fonts.medium, fontSize: 14, marginTop: 12 },
    errorText: { fontFamily: Fonts.medium, fontSize: 14, marginTop: 12, textAlign: 'center' },
    retryBtn: { marginTop: 16, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
    retryText: { fontFamily: Fonts.semiBold, fontSize: 13 },
    emptyTitle: { fontFamily: Fonts.semiBold, fontSize: 16, marginTop: 12 },
    emptySubtitle: { fontFamily: Fonts.regular, fontSize: 13, textAlign: 'center', marginTop: 6, lineHeight: 20 },
    messengerIconBox: { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
    messengerBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: '#0084FF', paddingHorizontal: 24, paddingVertical: 14,
        borderRadius: 14, marginTop: 24,
    },
    messengerBtnText: { fontFamily: Fonts.bold, fontSize: 15, color: '#FFF' },
    // Message cards
    card: {
        borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    avatar: {
        width: 40, height: 40, borderRadius: 20,
        alignItems: 'center', justifyContent: 'center',
    },
    name: { fontFamily: Fonts.semiBold, fontSize: 14 },
    time: { fontFamily: Fonts.regular, fontSize: 11, marginTop: 1 },
    msgCount: {
        paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
    },
    msgCountText: { fontFamily: Fonts.semiBold, fontSize: 11 },
    details: {
        borderRadius: 10, padding: 12, marginTop: 10,
    },
    lastMsg: { fontFamily: Fonts.regular, fontSize: 13, lineHeight: 18 },
});
