import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    StatusBar,
    ScrollView,
    Alert,
    TextInput,
    Modal,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRoute } from '@react-navigation/native';
import { useLeadStore, Lead } from '../../store/useLeadStore';
import { api } from '../../services/api';
import { Colors, Fonts, FontSize, Spacing, Radius, Shadow, Gradients, useColors } from '../../utils/theme';
import { LeadCard, LeadDetailModal } from '../../components/leads/SharedLeadComponents';
import { useFlatListScrollToTopOnFocus } from '../../utils/useScrollToTopOnFocus';
import { useBottomSafe } from '../../utils/useBottomSafe';
import { useThemeStore } from '../../utils/ThemeContext';

type FilterType = 'All' | 'New' | 'Contacted' | 'Qualified' | 'Converted' | 'Lost';

const AddLeadModal = ({
    visible,
    onClose,
    onAdd,
}: {
    visible: boolean;
    onClose: () => void;
    onAdd: (lead: Omit<Lead, 'id' | 'timestamp' | 'status' | 'notes' | 'avatar'>) => void;
}) => {
    const C = useColors();
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [source, setSource] = useState('');

    const handleSubmit = () => {
        if (!name.trim() || !phone.trim()) {
            Alert.alert('Required', 'Name and phone are required.');
            return;
        }
        onAdd({ name: name.trim(), phone: phone.trim(), email: email.trim(), adSource: source.trim() || 'Manual Entry' });
        setName(''); setPhone(''); setEmail(''); setSource('');
        onClose();
    };

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { backgroundColor: C.surface }]}>
                    <View style={[styles.modalHeader, { borderBottomColor: C.borderLight }]}>
                        <Text style={[styles.modalTitle, { color: C.text }]}>Add New Lead</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color={C.text} />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.modalForm}>
                        <TextInput style={[styles.modalInput, { backgroundColor: C.surfaceSecondary, color: C.text }]} placeholder="Full Name *" value={name} onChangeText={setName} placeholderTextColor={C.textTertiary} />
                        <TextInput style={[styles.modalInput, { backgroundColor: C.surfaceSecondary, color: C.text }]} placeholder="Phone Number *" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholderTextColor={C.textTertiary} />
                        <TextInput style={[styles.modalInput, { backgroundColor: C.surfaceSecondary, color: C.text }]} placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" placeholderTextColor={C.textTertiary} />
                        <TextInput style={[styles.modalInput, { backgroundColor: C.surfaceSecondary, color: C.text }]} placeholder="Source (e.g. Facebook Ad)" value={source} onChangeText={setSource} placeholderTextColor={C.textTertiary} />
                        <TouchableOpacity onPress={handleSubmit}>
                            <LinearGradient colors={Gradients.brand as any} style={styles.modalBtn}>
                                <Text style={styles.modalBtnText}>Add Lead</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

export const LeadsScreen = () => {
    const { leads, addLead, updateStatus, deleteLead, addNote } = useLeadStore();
    const C = useColors();
    const { isDark } = useThemeStore();
    const bottomSafe = useBottomSafe();
    const route = useRoute<any>();
    const initialFilter = (route.params?.filter as FilterType) || 'All';
    const [activeFilter, setActiveFilter] = useState<FilterType>(initialFilter);
    const [showAddModal, setShowAddModal] = useState(false);
    const leadsListRef = useFlatListScrollToTopOnFocus();
    const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [fbLeads, setFbLeads] = useState<Lead[]>([]);
    const [fromCache, setFromCache] = useState(false);
    const [fbLoading, setFbLoading] = useState(true);

    // Fetch Facebook leads on mount
    const syncFbLeads = useCallback(async () => {
        setFbLoading(true);
        try {
            const res = await api.getFbLeads();
            if (res.leads?.length > 0) {
                const STANDARD_KEYS = new Set([
                    'id', 'formId', 'formName', 'pageName', 'pageId', 'createdAt',
                    'name', 'full_name', 'first_name', 'email', 'phone_number', 'phone', 'city',
                ]);
                const mapped: Lead[] = res.leads.map((l: any) => {
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
                });
                setFbLeads(mapped);
                setFromCache(!!res.fromCache);
            }
        } catch (err: any) {
            console.error('LeadsScreen: FB leads error:', err?.message);
        } finally {
            setFbLoading(false);
        }
    }, []);

    useEffect(() => { syncFbLeads(); }, [syncFbLeads]);

    // Merge local + FB leads
    // For leads saved locally (status changed), refresh name/email/phone from FB API
    // so stale local data never shadows fresh FB data
    const allLeads = useMemo(() => {
        const fbById = new Map(fbLeads.map(l => [l.id, l]));

        // Local leads: refresh display fields from FB if available
        const mergedLocal = leads.map(l => {
            const fresh = fbById.get(l.id);
            if (!fresh) return l;
            return {
                ...l,
                name: fresh.name || l.name,
                phone: fresh.phone || l.phone,
                email: fresh.email || l.email,
                avatar: (fresh.name || l.name || 'F')[0].toUpperCase(),
            };
        });

        // FB leads not already in local store
        const localIds = new Set(leads.map(l => l.id));
        const uniqueFbLeads = fbLeads.filter(l => !localIds.has(l.id));

        return [...mergedLocal, ...uniqueFbLeads];
    }, [leads, fbLeads]);

    const filteredLeads = useMemo(() => {
        let result = allLeads;
        if (activeFilter !== 'All') {
            result = result.filter(l => l.status === activeFilter);
        }
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(l =>
                l.name.toLowerCase().includes(q) ||
                l.phone.includes(q) ||
                l.email.toLowerCase().includes(q)
            );
        }
        return result;
    }, [allLeads, activeFilter, searchQuery]);

    // Derive from allLeads so status updates reflect immediately in the modal
    const selectedLead = selectedLeadId ? allLeads.find(l => l.id === selectedLeadId) ?? null : null;

    const stats = useMemo(() => ({
        total: allLeads.length,
        new: allLeads.filter(l => l.status === 'New').length,
        converted: allLeads.filter(l => l.status === 'Converted').length,
    }), [allLeads]);

    const handleAddLead = (data: Omit<Lead, 'id' | 'timestamp' | 'status' | 'notes' | 'avatar'>) => {
        const avatars = ['👨‍💼', '👩‍💼', '👨‍💻', '👩‍🎨', '👨‍🔧', '👩‍🏫', '👨‍⚕️', '👩‍🍳'];
        addLead({
            ...data,
            id: Math.random().toString(36).substr(2, 9),
            timestamp: new Date().toISOString(),
            status: 'New',
            notes: '',
            avatar: avatars[Math.floor(Math.random() * avatars.length)],
        });
    };

    const handleStatusChange = (id: string, status: Lead['status']) => {
        // If it's a FB lead not yet in local store, save it first
        if (id.startsWith('fb_') && !leads.find(l => l.id === id)) {
            const fbLead = fbLeads.find(l => l.id === id);
            if (fbLead) {
                addLead({ ...fbLead, status });
                return;
            }
        }
        updateStatus(id, status);
    };

    const handleDelete = (id: string) => {
        Alert.alert('Delete Lead', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => deleteLead(id) },
        ]);
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: C.surface }]} edges={['top']}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

            {/* Header */}
            <View style={[styles.header, { backgroundColor: C.surface, borderBottomColor: C.borderLight }]}>
                <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={[styles.headerTitle, { color: C.text }]}>Leads</Text>
                    <Text style={[styles.headerSubtitle, { color: C.textSecondary }]} numberOfLines={1}>Manage customers</Text>
                </View>
                <View style={[styles.statsContainer, { backgroundColor: C.surfaceSecondary }]}>
                    <View style={styles.statBox}>
                        <Text style={[styles.statNumber, { color: C.text }]}>{stats.total}</Text>
                        <Text style={[styles.statLabel, { color: C.textTertiary }]}>Total</Text>
                    </View>
                    <View style={styles.verticalDivider} />
                    <View style={styles.statBox}>
                        <Text style={[styles.statNumber, { color: '#34C759' }]}>{stats.new}</Text>
                        <Text style={[styles.statLabel, { color: C.textTertiary }]}>New</Text>
                    </View>
                    <View style={styles.verticalDivider} />
                    <View style={styles.statBox}>
                        <Text style={[styles.statNumber, { color: '#5856D6' }]}>{stats.converted}</Text>
                        <Text style={[styles.statLabel, { color: C.textTertiary }]}>Won</Text>
                    </View>
                </View>
            </View>

            {/* Search */}
            <View style={[styles.searchContainer, { backgroundColor: C.surfaceSecondary }]}>
                <Ionicons name="search" size={18} color={C.textTertiary} />
                <TextInput
                    style={[styles.searchInput, { color: C.text }]}
                    placeholder="Search leads..."
                    placeholderTextColor={C.textTertiary}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            {/* Cache warning banner */}
            {fromCache && (
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.warningBg, paddingHorizontal: 16, paddingVertical: 8, gap: 8 }}>
                    <Ionicons name="warning-outline" size={16} color={Colors.warning} />
                    <Text style={{ fontFamily: Fonts.medium, fontSize: 12, color: Colors.warning, flex: 1 }}>
                        Facebook connection issue — showing last saved leads. Reconnect Facebook to refresh.
                    </Text>
                </View>
            )}

            {/* Filter Tabs */}
            <View style={[styles.filterRow, { backgroundColor: C.surface }]}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
                    {(['All', 'New', 'Contacted', 'Qualified', 'Converted', 'Lost'] as FilterType[]).map(f => (
                        <TouchableOpacity
                            key={f}
                            style={[styles.filterChip, { backgroundColor: C.surfaceSecondary }, activeFilter === f && styles.filterChipActive]}
                            onPress={() => setActiveFilter(f)}
                        >
                            <Text style={[styles.filterText, { color: C.textSecondary }, activeFilter === f && styles.filterTextActive]}>{f}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* FB Sync loading banner */}
            {fbLoading && (
                <View style={[styles.syncBanner, { backgroundColor: C.brandBg }]}>
                    <ActivityIndicator size="small" color={C.brand} />
                    <Text style={[styles.syncBannerText, { color: C.brand }]}>Syncing leads from Facebook...</Text>
                </View>
            )}

            {/* Leads List */}
            <FlatList
                ref={leadsListRef}
                contentContainerStyle={[styles.listContent, { paddingBottom: bottomSafe + 80 }]}
                style={{ backgroundColor: C.background }}
                data={filteredLeads}
                renderItem={({ item }) => (
                    <LeadCard
                        lead={item}
                        onPress={() => setSelectedLeadId(item.id)}
                    />
                )}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Ionicons name="people-outline" size={48} color={C.textTertiary} />
                        <Text style={[styles.emptyTitle, { color: C.text }]}>No leads yet</Text>
                        <Text style={[styles.emptySubtitle, { color: C.textTertiary }]}>
                            {leads.length === 0 ? 'Add leads manually or run ads to capture them' : 'No leads match your filter'}
                        </Text>
                    </View>
                }
            />

            {/* FAB - Add Lead */}
            <TouchableOpacity style={[styles.fab, { bottom: bottomSafe + 16 }]} activeOpacity={0.9} onPress={() => setShowAddModal(true)}>
                <LinearGradient colors={Gradients.brand as any} style={styles.fabGradient}>
                    <Ionicons name="person-add" size={24} color="white" />
                </LinearGradient>
            </TouchableOpacity>

            <AddLeadModal
                visible={showAddModal}
                onClose={() => setShowAddModal(false)}
                onAdd={handleAddLead}
            />

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

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.surface },
    header: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingTop: Spacing.xs, paddingBottom: Spacing.md,
        borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
    },
    headerTitle: { fontFamily: Fonts.bold, fontSize: 18, color: Colors.text, letterSpacing: -0.3 },
    headerSubtitle: { fontFamily: Fonts.regular, fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
    statsContainer: { flexDirection: 'row', backgroundColor: Colors.surfaceSecondary, borderRadius: Radius.md, padding: 5 },
    statBox: { paddingHorizontal: 5, alignItems: 'center' },
    statNumber: { fontFamily: Fonts.bold, fontSize: 12, color: Colors.text },
    statLabel: { fontFamily: Fonts.medium, fontSize: 10, color: Colors.textTertiary },
    verticalDivider: { width: 1, backgroundColor: Colors.border, marginVertical: 4 },
    searchContainer: {
        flexDirection: 'row', alignItems: 'center', marginHorizontal: Spacing.xl, marginBottom: Spacing.sm,
        paddingHorizontal: 14, height: 40, backgroundColor: Colors.surfaceSecondary, borderRadius: Radius.sm,
    },
    searchInput: { flex: 1, marginLeft: Spacing.sm, fontFamily: Fonts.regular, fontSize: FontSize.base, color: Colors.text },
    filterRow: { backgroundColor: Colors.surface, paddingBottom: Spacing.md },
    filterScroll: { paddingHorizontal: Spacing.xl },
    filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.full, backgroundColor: Colors.surfaceSecondary, marginRight: Spacing.sm },
    filterChipActive: { backgroundColor: Colors.brand },
    filterText: { fontFamily: Fonts.semiBold, fontSize: FontSize.sm, color: Colors.textSecondary },
    filterTextActive: { color: Colors.textInverse },
    listContent: { padding: Spacing.xl, paddingBottom: 100 },
    syncBanner: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        paddingHorizontal: 16, paddingVertical: 10,
    },
    syncBannerText: { fontFamily: Fonts.medium, fontSize: 13 },
    emptyState: { alignItems: 'center', paddingTop: 60 },
    emptyTitle: { fontFamily: Fonts.semiBold, fontSize: FontSize.lg, color: Colors.text, marginTop: Spacing.lg, marginBottom: Spacing.sm },
    emptySubtitle: { fontFamily: Fonts.regular, fontSize: FontSize.sm, color: Colors.textTertiary, textAlign: 'center', width: '70%' },
    fab: { position: 'absolute', bottom: 24, right: 24, ...Shadow.brand },
    fabGradient: { width: 56, height: 56, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: Colors.surface, borderTopLeftRadius: Radius['2xl'], borderTopRightRadius: Radius['2xl'], paddingBottom: 40 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.xl, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
    modalTitle: { fontFamily: Fonts.bold, fontSize: FontSize.lg, color: Colors.text },
    modalForm: { padding: Spacing.xl, gap: 14 },
    modalInput: { backgroundColor: Colors.surfaceSecondary, borderRadius: Radius.md, paddingHorizontal: Spacing.lg, height: 48, fontFamily: Fonts.regular, fontSize: FontSize.base, color: Colors.text },
    modalBtn: { alignItems: 'center', paddingVertical: Spacing.lg, borderRadius: Radius.md, marginTop: Spacing.sm },
    modalBtnText: { fontFamily: Fonts.bold, fontSize: FontSize.md, color: Colors.textInverse },
});
