import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
    TextInput,
    ActivityIndicator,
    Modal,
    KeyboardAvoidingView,
    Platform,
    Linking,
    Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'react-native';
import { useAuthStore } from '../../store/useAuthStore';
import { useFacebookStore } from '../../store/useFacebookStore';
import { useNavigation } from '@react-navigation/native';
import { connectFacebook, disconnectFacebook } from '../../services/facebookAuth';
import { api } from '../../services/api';
import { Colors, Fonts, FontSize, Spacing, Radius, Shadow, Gradients, useColors } from '../../utils/theme';
import { useThemeStore } from '../../utils/ThemeContext';
import { analytics } from '../../services/mixpanel';

// ─── Edit Modal ─────────────────────────────────────────────────
const EditFieldModal = ({
    visible, label, value, onSave, onCancel, keyboardType = 'default',
}: {
    visible: boolean; label: string; value: string;
    onSave: (val: string) => void; onCancel: () => void;
    keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'url';
}) => {
    const C = useColors();
    const [text, setText] = useState(value);

    useEffect(() => {
        if (visible) setText(value);
    }, [visible, value]);

    return (
        <Modal visible={visible} transparent animationType="fade">
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.modalOverlay}
            >
                <View style={[styles.modalContainer, { backgroundColor: C.surface }]}>
                    <View style={styles.modalHeader}>
                        <Text style={[styles.modalTitle, { color: C.text }]}>Edit {label}</Text>
                        <TouchableOpacity onPress={onCancel} style={[styles.modalCloseBtn, { backgroundColor: C.surfaceSecondary }]}>
                            <Ionicons name="close" size={20} color={C.textSecondary} />
                        </TouchableOpacity>
                    </View>
                    <TextInput
                        style={[styles.modalInput, { backgroundColor: C.surfaceSecondary, color: C.text, borderColor: C.borderLight }]}
                        value={text}
                        onChangeText={setText}
                        placeholder={`Enter ${label.toLowerCase()}`}
                        placeholderTextColor={C.textSecondary}
                        autoFocus
                        keyboardType={keyboardType}
                        autoCapitalize={keyboardType === 'email-address' || keyboardType === 'url' ? 'none' : 'sentences'}
                    />
                    <View style={styles.modalActions}>
                        <TouchableOpacity onPress={onCancel} style={[styles.modalCancelBtn, { backgroundColor: C.surfaceSecondary }]}>
                            <Text style={[styles.modalCancelText, { color: C.textSecondary }]}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => onSave(text.trim())} style={styles.modalSaveBtn}>
                            <Text style={styles.modalSaveText}>Save</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

// ─── Integration Row ────────────────────────────────────────────
const IntegrationRow = ({
    connected, loading, profileName, onConnect, onDisconnect,
}: {
    connected: boolean; loading: boolean; profileName?: string;
    onConnect: () => void; onDisconnect: () => void;
}) => {
    const C = useColors();
    return (
    <View style={styles.integrationRow}>
        <View style={styles.integrationLeft}>
            <View style={[styles.platformIcon, { backgroundColor: Colors.facebook }]}>
                <Ionicons name="logo-facebook" size={22} color="white" />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={[styles.platformName, { color: C.text }]}>Facebook Page</Text>
                <Text style={[styles.connectionStatus, { color: C.textSecondary }]}>
                    {loading ? 'Connecting...' : connected ? profileName ? `Connected as ${profileName}` : 'Connected' : 'Not connected'}
                </Text>
            </View>
        </View>
        {loading ? (
            <ActivityIndicator size="small" color={Colors.brand} />
        ) : connected ? (
            <View style={styles.connectedActions}>
                <View style={styles.connectedBadge}>
                    <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
                    <Text style={styles.connectedBadgeText}>Active</Text>
                </View>
                <TouchableOpacity onPress={onDisconnect} style={styles.disconnectButton}>
                    <Ionicons name="close-circle-outline" size={20} color={Colors.danger} />
                </TouchableOpacity>
            </View>
        ) : (
            <TouchableOpacity onPress={onConnect} style={styles.connectBtn}>
                <Text style={styles.connectBtnText}>Connect</Text>
            </TouchableOpacity>
        )}
    </View>
    );
};

// ─── Support Contact Constants ──────────────────────────────────
const SUPPORT_PHONE = '+917990636954';
const SUPPORT_EMAIL = 'support@biz499.com';
const SUPPORT_WHATSAPP = '+917990636954';

export const BusinessScreen = () => {
    const { user, updateUser, logout } = useAuthStore();
    const C = useColors();
    const { mode, setMode } = useThemeStore();
    const navigation = useNavigation();

    const fbPages = useFacebookStore((s) => s.pages);
    const fbSelectedPages = useFacebookStore((s) => s.selectedPages);
    const removePage = useFacebookStore((s) => s.removePage);

    const [fbConnected, setFbConnected] = useState(false);
    const [helpOpen, setHelpOpen] = useState(false);
    const [profilePhoto, setProfilePhoto] = useState<string | null>(user?.profilePhoto || null);

    const pickProfilePhoto = async () => {
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
            setProfilePhoto(uri);
            updateUser({ profilePhoto: uri });
            // Upload to backend
            try {
                await api.updateProfile({ profilePhoto: uri });
            } catch (e) {
                console.warn('Failed to save profile photo to backend:', e);
            }
        }
    };
    const [fbProfileName, setFbProfileName] = useState<string | undefined>();
    const [connectingFb, setConnectingFb] = useState(false);
    const [checkingFb, setCheckingFb] = useState(true);
    const [saving, setSaving] = useState(false);

    const [editField, setEditField] = useState<{
        label: string; key: string; value: string;
        keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'url';
    } | null>(null);

    useEffect(() => { checkFbStatus(); }, []);

    const checkFbStatus = useCallback(async () => {
        setCheckingFb(true);
        try {
            const status = await api.getMetaStatus();
            setFbConnected(status.connected);
            if (status.connected && status.profile) setFbProfileName(status.profile.name);
        } catch {
            setFbConnected(!!user?.facebookConnected);
        } finally {
            setCheckingFb(false);
        }
    }, [user?.facebookConnected]);

    const formatPhone = (phone?: string) => {
        if (!phone) return 'Not set';
        let cleaned = phone.replace(/^\++/, '+');
        if (!cleaned.startsWith('+')) {
            cleaned = cleaned.length === 10 ? `+91${cleaned}` : `+${cleaned}`;
        }
        return cleaned;
    };

    const handleConnectFacebook = async () => {
        setConnectingFb(true);
        try {
            const result = await connectFacebook();
            if (result.success) {
                setFbConnected(true);
                updateUser({ facebookConnected: true });
                await checkFbStatus();
                Alert.alert('Success', 'Facebook connected successfully!');
            } else if (result.error !== 'cancelled' && result.error !== 'dismissed') {
                Alert.alert('Connection Failed', result.errorDescription || 'Could not connect to Facebook');
            }
        } catch {
            Alert.alert('Error', 'An unexpected error occurred');
        } finally {
            setConnectingFb(false);
        }
    };

    const handleDisconnectFacebook = () => {
        Alert.alert('Disconnect Facebook', 'Are you sure? This will stop any running ad campaigns.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Disconnect', style: 'destructive',
                onPress: async () => {
                    const success = await disconnectFacebook();
                    if (success) {
                        setFbConnected(false);
                        setFbProfileName(undefined);
                        updateUser({ facebookConnected: false });
                    }
                },
            },
        ]);
    };

    const handleSaveField = async (key: string, value: string) => {
        setEditField(null);
        if (!value) return;
        setSaving(true);
        try {
            updateUser({ [key]: value });
            await api.updateProfile({
                fullName: key === 'fullName' ? value : user?.fullName || '',
                email: key === 'email' ? value : user?.email,
                businessName: key === 'businessName' ? value : user?.businessName,
                businessCategory: key === 'businessCategory' ? value : user?.businessCategory,
            });
        } catch {
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteAccount = () => {
        Alert.alert('Delete Account', 'Are you sure? This will permanently delete your account and all data. This cannot be undone.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete Forever', style: 'destructive', onPress: async () => {
                    try {
                        await api.deleteAccount();
                    } catch (err: any) {
                        console.error('Backend delete failed:', err);
                    }
                    // Clear all local stores regardless of backend result
                    const { useFacebookStore } = require('../../store/useFacebookStore');
                    const { useAdStore } = require('../../store/useAdStore');
                    useFacebookStore.getState().disconnect();
                    useAdStore.setState({ ads: [] });
                    await logout();
                },
            },
        ]);
    };

    const openWhatsApp = () => {
        const url = `https://wa.me/${SUPPORT_WHATSAPP.replace('+', '')}?text=${encodeURIComponent('Hi, I need help with Biz499 app.')}`;
        Linking.openURL(url).catch(() => Alert.alert('Error', 'Could not open WhatsApp'));
    };

    const openEmail = () => {
        const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Biz499 Support Request')}`;
        Linking.openURL(url).catch(() => Alert.alert('Error', 'Could not open email'));
    };

    const openCall = () => {
        Linking.openURL(`tel:${SUPPORT_PHONE}`).catch(() => Alert.alert('Error', 'Could not make a call'));
    };

    // Business detail fields config
    const businessFields = [
        { label: 'Business Name', key: 'businessName', value: user?.businessName || user?.fullName || '', icon: 'storefront-outline', kbd: 'default' as const },
        { label: 'Owner Name', key: 'fullName', value: user?.fullName || '', icon: 'person-outline', kbd: 'default' as const },
        { label: 'Mobile Number', key: 'phone', value: formatPhone(user?.phone), icon: 'call-outline', kbd: 'phone-pad' as const },
        { label: 'Email Address', key: 'email', value: user?.email || '', icon: 'mail-outline', kbd: 'email-address' as const },
        { label: 'Website', key: 'website', value: user?.website || '', icon: 'globe-outline', kbd: 'url' as const },
        { label: 'Category', key: 'businessCategory', value: user?.businessCategory || '', icon: 'pricetag-outline', kbd: 'default' as const },
    ];

    return (
        <ScreenWrapper bg="" edges={['top', 'left', 'right']} style={{ backgroundColor: C.background }}>
            {/* ─── Header ────────────────────────────────────── */}
            <View style={[styles.header, { backgroundColor: C.background, borderBottomColor: C.borderLight }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {navigation.canGoBack() && (
                        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 12, width: 36, height: 36, borderRadius: 12, backgroundColor: C.surfaceSecondary, alignItems: 'center', justifyContent: 'center' }}>
                            <Ionicons name="arrow-back" size={20} color={C.text} />
                        </TouchableOpacity>
                    )}
                    <View>
                        <Text style={[styles.headerTitle, { color: C.text }]}>My Profile</Text>
                        <Text style={[styles.headerSubtitle, { color: C.textSecondary }]}>Manage your business details</Text>
                    </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {saving && <ActivityIndicator size="small" color={Colors.brand} />}
                    <TouchableOpacity
                        onPress={() => setMode(mode === 'dark' ? 'light' : 'dark')}
                        style={{
                            width: 52, height: 30, borderRadius: 15,
                            backgroundColor: mode === 'dark' ? '#1E293B' : '#E8E4FF',
                            flexDirection: 'row', alignItems: 'center',
                            paddingHorizontal: 3,
                            borderWidth: 1.5,
                            borderColor: mode === 'dark' ? '#FBBF24' : '#6C5CE7',
                        }}
                        activeOpacity={0.7}
                    >
                        <View style={{
                            width: 24, height: 24, borderRadius: 12,
                            backgroundColor: mode === 'dark' ? '#FBBF24' : '#6C5CE7',
                            alignItems: 'center', justifyContent: 'center',
                            marginLeft: mode === 'dark' ? 22 : 0,
                        }}>
                            <Ionicons name={mode === 'dark' ? 'sunny' : 'moon'} size={14} color="#FFF" />
                        </View>
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                style={{ backgroundColor: C.background }}
                showsVerticalScrollIndicator={false}
            >
                {/* ─── Business Details (with avatar) ─────────────── */}
                <View style={styles.section}>
                    <View style={[styles.card, { backgroundColor: C.surface }]}>
                        {/* Avatar + Name header */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.borderLight }}>
                            <TouchableOpacity onPress={pickProfilePhoto} activeOpacity={0.8} style={{ position: 'relative' }}>
                                {profilePhoto ? (
                                    <Image source={{ uri: profilePhoto }} style={{ width: 56, height: 56, borderRadius: 18, resizeMode: 'cover' }} />
                                ) : (
                                    <LinearGradient
                                        colors={Gradients.brand as any}
                                        style={styles.avatarContainer}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                    >
                                        <Text style={styles.avatarText}>
                                            {(user?.businessName || user?.fullName || 'B').charAt(0).toUpperCase()}
                                        </Text>
                                    </LinearGradient>
                                )}
                                <View style={{ position: 'absolute', bottom: -2, right: -2, width: 22, height: 22, borderRadius: 11, backgroundColor: C.brand, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.surface }}>
                                    <Ionicons name="camera" size={11} color="#FFF" />
                                </View>
                            </TouchableOpacity>
                            <View style={{ flex: 1, marginLeft: 12 }}>
                                <Text style={[styles.profileName, { color: C.text }]} numberOfLines={1}>
                                    {user?.businessName || user?.fullName || 'My Business'}
                                </Text>
                                <Text style={{ fontFamily: Fonts.regular, fontSize: 12, color: C.textSecondary, marginTop: 2 }}>
                                    Tap any field below to edit
                                </Text>
                            </View>
                        </View>
                        {businessFields.map((field, index) => (
                            <React.Fragment key={field.key}>
                                {index > 0 && <View style={[styles.divider, { backgroundColor: C.borderLight }]} />}
                                <TouchableOpacity
                                    style={styles.fieldRow}
                                    onPress={() => setEditField({
                                        label: field.label,
                                        key: field.key,
                                        value: field.key === 'phone' ? (user?.phone || '') : field.value,
                                        keyboardType: field.kbd,
                                    })}
                                    activeOpacity={0.6}
                                >
                                    <View style={[
                                        styles.fieldIcon,
                                        { backgroundColor: field.value && field.value !== 'Not set' ? C.brandBg : C.surfaceSecondary }
                                    ]}>
                                        <Ionicons
                                            name={field.icon as any}
                                            size={18}
                                            color={field.value && field.value !== 'Not set' ? Colors.brand : Colors.textTertiary}
                                        />
                                    </View>
                                    <View style={styles.fieldContent}>
                                        <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>{field.label}</Text>
                                        <Text
                                            style={[
                                                styles.fieldValue,
                                                { color: C.text },
                                                (!field.value || field.value === 'Not set') && [styles.fieldValueEmpty, { color: C.textSecondary }],
                                            ]}
                                            numberOfLines={1}
                                        >
                                            {field.value || 'Not set'}
                                        </Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
                                </TouchableOpacity>
                            </React.Fragment>
                        ))}
                    </View>
                </View>

                {/* ─── Integrations ───────────────────────────────── */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { color: C.text }]}>Integrations</Text>
                        <Text style={[styles.sectionSubtitle, { color: C.textSecondary }]}>Connect social accounts to run ads</Text>
                    </View>
                    <View style={[styles.card, { backgroundColor: C.surface }]}>
                        {checkingFb ? (
                            <View style={styles.loadingRow}>
                                <ActivityIndicator size="small" color={Colors.brand} />
                                <Text style={[styles.loadingText, { color: C.textSecondary }]}>Checking connection...</Text>
                            </View>
                        ) : (
                            <IntegrationRow
                                connected={fbConnected}
                                loading={connectingFb}
                                profileName={fbProfileName}
                                onConnect={handleConnectFacebook}
                                onDisconnect={handleDisconnectFacebook}
                            />
                        )}
                    </View>

                    {/* Connected Pages — one row per page with remove button */}
                    {fbConnected && fbPages.length > 0 && (
                        <View style={{ marginTop: 8 }}>
                            <Text style={{ fontSize: 12, fontWeight: '600', color: C.textSecondary, marginBottom: 6, paddingHorizontal: 2 }}>
                                Connected Pages
                            </Text>
                            {(fbSelectedPages.length > 0
                                ? fbPages.filter((p: any) => fbSelectedPages.includes(p.page_id || p.id))
                                : fbPages
                            ).map((page: any) => {
                                const pName = page.page_name || page.name || 'Facebook Page';
                                const pCategory = page.page_category || page.category || '';
                                const pId = page.page_id || page.id;

                                const handleRemovePage = () => {
                                    Alert.alert(
                                        'Remove Page',
                                        `Remove "${pName}" from your connected pages?`,
                                        [
                                            { text: 'Cancel', style: 'cancel' },
                                            {
                                                text: 'Remove',
                                                style: 'destructive',
                                                onPress: async () => {
                                                    try {
                                                        await api.removeMetaPage(pId);
                                                        removePage(pId);
                                                    } catch (e: any) {
                                                        Alert.alert('Error', e.message || 'Failed to remove page');
                                                    }
                                                },
                                            },
                                        ]
                                    );
                                };

                                return (
                                    <View
                                        key={pId}
                                        style={{
                                            flexDirection: 'row', alignItems: 'center',
                                            backgroundColor: '#FAFFFE', borderRadius: 12,
                                            marginBottom: 8, borderWidth: 1, borderColor: '#C6F6D5',
                                            overflow: 'hidden',
                                        }}
                                    >
                                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', padding: 12 }}>
                                            <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#1877F2', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                                                <Ionicons name="logo-facebook" size={16} color="white" />
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={{ fontWeight: '600', fontSize: 14, color: '#1F2937' }}>{pName}</Text>
                                                {pCategory ? <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>{pCategory}</Text> : null}
                                            </View>
                                        </View>
                                        <TouchableOpacity
                                            onPress={handleRemovePage}
                                            style={{ paddingHorizontal: 14, paddingVertical: 16, borderLeftWidth: 1, borderLeftColor: '#C6F6D5' }}
                                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                        >
                                            <Ionicons name="trash-outline" size={18} color="#EF4444" />
                                        </TouchableOpacity>
                                    </View>
                                );
                            })}
                        </View>
                    )}
                </View>

                {/* ─── Help & Support (Collapsible) ──────────────── */}
                <View style={styles.section}>
                    <TouchableOpacity
                        onPress={() => setHelpOpen(!helpOpen)}
                        activeOpacity={0.7}
                        style={[styles.card, { backgroundColor: C.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 16 }]}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <View style={[styles.supportIcon, { backgroundColor: C.surfaceSecondary }]}>
                                <Ionicons name="help-circle-outline" size={20} color={C.brand} />
                            </View>
                            <View>
                                <Text style={[styles.supportTitle, { color: C.text, fontWeight: '800', fontSize: 16 }]}>Help & Support</Text>
                                <Text style={[styles.supportDesc, { color: C.textSecondary }]}>Need assistance? We're here to help</Text>
                            </View>
                        </View>
                        <Ionicons name={helpOpen ? 'chevron-up' : 'chevron-down'} size={20} color={C.textTertiary} />
                    </TouchableOpacity>

                    {helpOpen && (
                        <View style={[styles.card, { backgroundColor: C.surface, marginTop: 8 }]}>
                            <TouchableOpacity style={styles.supportRow} onPress={openWhatsApp} activeOpacity={0.6}>
                                <View style={[styles.supportIcon, { backgroundColor: C.surfaceSecondary }]}>
                                    <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
                                </View>
                                <View style={styles.supportContent}>
                                    <Text style={[styles.supportTitle, { color: C.text }]}>Chat on WhatsApp</Text>
                                    <Text style={[styles.supportDesc, { color: C.textSecondary }]}>Quick replies, usually within minutes</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={16} color={C.textTertiary} />
                            </TouchableOpacity>

                            <View style={[styles.divider, { backgroundColor: C.borderLight }]} />

                            <TouchableOpacity style={styles.supportRow} onPress={openEmail} activeOpacity={0.6}>
                                <View style={[styles.supportIcon, { backgroundColor: C.surfaceSecondary }]}>
                                    <Ionicons name="mail-outline" size={20} color={C.brand} />
                                </View>
                                <View style={styles.supportContent}>
                                    <Text style={[styles.supportTitle, { color: C.text }]}>Email Support</Text>
                                    <Text style={[styles.supportDesc, { color: C.textSecondary }]}>{SUPPORT_EMAIL}</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={16} color={C.textTertiary} />
                            </TouchableOpacity>

                            <View style={[styles.divider, { backgroundColor: C.borderLight }]} />

                            <TouchableOpacity style={styles.supportRow} onPress={openCall} activeOpacity={0.6}>
                                <View style={[styles.supportIcon, { backgroundColor: C.surfaceSecondary }]}>
                                    <Ionicons name="call-outline" size={20} color="#FF9500" />
                                </View>
                                <View style={styles.supportContent}>
                                    <Text style={[styles.supportTitle, { color: C.text }]}>Call Us</Text>
                                    <Text style={[styles.supportDesc, { color: C.textSecondary }]}>Mon-Sat, 10 AM - 7 PM</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={16} color={C.textTertiary} />
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {/* ─── Account ────────────────────────────────────── */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { color: C.text }]}>Account</Text>
                    </View>
                    <View style={[styles.card, { backgroundColor: C.surface }]}>
                        <TouchableOpacity style={styles.actionRow} onPress={() => { analytics.reset(); logout(); }} activeOpacity={0.6}>
                            <View style={[styles.supportIcon, { backgroundColor: C.surfaceSecondary }]}>
                                <Ionicons name="log-out-outline" size={20} color={Colors.danger} />
                            </View>
                            <View style={styles.supportContent}>
                                <Text style={[styles.supportTitle, { color: Colors.danger }]}>Log Out</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
                        </TouchableOpacity>
                        <View style={[styles.divider, { backgroundColor: C.borderLight }]} />
                        <TouchableOpacity style={styles.actionRow} onPress={handleDeleteAccount} activeOpacity={0.6}>
                            <View style={[styles.supportIcon, { backgroundColor: C.surfaceSecondary }]}>
                                <Ionicons name="trash-outline" size={20} color={Colors.danger} />
                            </View>
                            <View style={styles.supportContent}>
                                <Text style={[styles.supportTitle, { color: Colors.danger }]}>Delete Account</Text>
                                <Text style={[styles.supportDesc, { color: C.textSecondary }]}>Permanently remove all your data</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
                        </TouchableOpacity>
                    </View>
                </View>

                <Text style={[styles.versionText, { color: C.textSecondary }]}>Biz499 v1.0.0</Text>
            </ScrollView>

            {editField && (
                <EditFieldModal
                    visible={true}
                    label={editField.label}
                    value={editField.value}
                    keyboardType={editField.keyboardType}
                    onCancel={() => setEditField(null)}
                    onSave={(val) => handleSaveField(editField.key, val)}
                />
            )}
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 40,
    },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 16,
        backgroundColor: Colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F2',
    },
    headerTitle: {
        fontFamily: Fonts.bold,
        fontSize: 18,
        color: Colors.text,
        letterSpacing: -0.3,
    },
    headerSubtitle: {
        fontFamily: Fonts.regular,
        fontSize: 12,
        color: Colors.textSecondary,
        marginTop: 2,
    },

    // Profile Card
    profileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        paddingHorizontal: 20,
        paddingVertical: 20,
        marginBottom: 8,
    },
    avatarContainer: {
        width: 60,
        height: 60,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    avatarText: {
        fontFamily: Fonts.bold,
        fontSize: 24,
        color: '#FFFFFF',
    },
    profileInfo: {
        flex: 1,
    },
    profileName: {
        fontFamily: Fonts.bold,
        fontSize: 18,
        color: Colors.text,
        marginBottom: 4,
    },
    profileMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 2,
    },
    profileCategory: {
        fontFamily: Fonts.regular,
        fontSize: 13,
        color: Colors.textSecondary,
    },

    // Sections
    section: {
        marginTop: 20,
        paddingHorizontal: 20,
    },
    sectionHeader: {
        marginBottom: 10,
    },
    sectionTitle: {
        fontFamily: Fonts.bold,
        fontSize: 17,
        color: Colors.text,
    },
    sectionSubtitle: {
        fontFamily: Fonts.regular,
        fontSize: 13,
        color: Colors.textSecondary,
        marginTop: 2,
    },

    // Card
    card: {
        backgroundColor: Colors.surface,
        borderRadius: 16,
        overflow: 'hidden',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.04,
                shadowRadius: 8,
            },
            android: { elevation: 2 },
        }),
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: '#ECECEE',
        marginLeft: 64,
    },

    // Business Detail Field Row
    fieldRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
    },
    fieldIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    fieldContent: {
        flex: 1,
    },
    fieldLabel: {
        fontFamily: Fonts.regular,
        fontSize: 12,
        color: Colors.textTertiary,
        marginBottom: 2,
    },
    fieldValue: {
        fontFamily: Fonts.medium,
        fontSize: 15,
        color: Colors.text,
    },
    fieldValueEmpty: {
        color: Colors.textTertiary,
        fontStyle: 'italic',
    },

    // Integration
    integrationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
    },
    integrationLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    platformIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    platformName: {
        fontFamily: Fonts.semiBold,
        fontSize: 15,
        color: Colors.text,
        marginBottom: 1,
    },
    connectionStatus: {
        fontFamily: Fonts.regular,
        fontSize: 12,
        color: Colors.textSecondary,
    },
    connectedActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    connectedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.successBg,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        gap: 4,
    },
    connectedBadgeText: {
        fontFamily: Fonts.semiBold,
        fontSize: 12,
        color: Colors.success,
    },
    disconnectButton: {
        padding: 4,
    },
    connectBtn: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 10,
        backgroundColor: Colors.facebook,
    },
    connectBtnText: {
        fontFamily: Fonts.bold,
        fontSize: 13,
        color: '#FFF',
    },
    loadingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        gap: 12,
    },
    loadingText: {
        fontFamily: Fonts.regular,
        fontSize: 13,
        color: Colors.textSecondary,
    },

    // Support Row
    supportRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
    },
    supportIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    supportContent: {
        flex: 1,
    },
    supportTitle: {
        fontFamily: Fonts.medium,
        fontSize: 15,
        color: Colors.text,
    },
    supportDesc: {
        fontFamily: Fonts.regular,
        fontSize: 12,
        color: Colors.textSecondary,
        marginTop: 1,
    },

    // Account Actions
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
    },

    // Version
    versionText: {
        textAlign: 'center',
        fontFamily: Fonts.regular,
        color: Colors.textTertiary,
        fontSize: 12,
        marginTop: 24,
        marginBottom: 8,
    },

    // Edit Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    modalContainer: {
        backgroundColor: Colors.surface,
        borderRadius: 20,
        padding: 24,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    modalTitle: {
        fontFamily: Fonts.bold,
        fontSize: 18,
        color: Colors.text,
    },
    modalCloseBtn: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: '#F5F5F7',
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalInput: {
        fontFamily: Fonts.regular,
        fontSize: 16,
        color: Colors.text,
        backgroundColor: '#F8F8FA',
        borderRadius: 12,
        padding: 14,
        borderWidth: 1.5,
        borderColor: '#E5E5E7',
        minHeight: 48,
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 20,
        gap: 10,
    },
    modalCancelBtn: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: '#F5F5F7',
    },
    modalCancelText: {
        fontFamily: Fonts.semiBold,
        fontSize: 15,
        color: Colors.textSecondary,
    },
    modalSaveBtn: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: Colors.brand,
    },
    modalSaveText: {
        fontFamily: Fonts.semiBold,
        fontSize: 15,
        color: '#FFF',
    },
});
