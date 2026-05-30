import React, { useState } from 'react';
import { View, Text, Switch, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useAuthStore } from '../../store/useAuthStore';
import { useFacebookStore } from '../../store/useFacebookStore';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { connectFacebook, disconnectFacebook } from '../../services/facebookAuth';
import { api } from '../../services/api';
import { useColors } from '../../utils/theme';
import { useThemeStore } from '../../utils/ThemeContext';

export const ProfileScreen = () => {
    const { user, logout, updateUser } = useAuthStore();
    const fbStore = useFacebookStore();
    const navigation = useNavigation<any>();
    const [notifications, setNotifications] = useState(true);
    const [connectingFb, setConnectingFb] = useState(false);
    const C = useColors();
    const { mode, setMode } = useThemeStore();

    const handleConnectFb = async () => {
        setConnectingFb(true);
        try {
            const result = await connectFacebook();
            if (result.success) {
                updateUser({ facebookConnected: true });
                // Sync pages into store
                try {
                    const status = await api.getMetaStatus();
                    const pagesData = await api.getMetaPages();
                    if (pagesData.pages?.length > 0) {
                        fbStore.setConnection(
                            status.profile as any || { id: '', name: '' },
                            pagesData.pages,
                        );
                    }
                } catch {}
                Alert.alert('Success!', 'Facebook connected successfully!');
            } else if (result.error !== 'cancelled' && result.error !== 'dismissed') {
                Alert.alert('Connection Failed', result.errorDescription || 'Could not connect.');
            }
        } catch {
            Alert.alert('Error', 'An error occurred while connecting.');
        } finally {
            setConnectingFb(false);
        }
    };

    const handleDisconnectFb = () => {
        Alert.alert('Disconnect Facebook', 'You won\'t be able to run ads until you reconnect.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Disconnect', style: 'destructive', onPress: async () => {
                    await disconnectFacebook();
                    updateUser({ facebookConnected: false });
                },
            },
        ]);
    };

    const handleLogout = () => {
        Alert.alert('Logout', 'Are you sure you want to logout?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Logout', style: 'destructive', onPress: logout }
        ]);
    };

    return (
        <ScreenWrapper bg="bg-gray-50">
            <ScrollView className=" px-6 pt-6" style={{ backgroundColor: C.background }}>
                <Text className="text-2xl font-bold text-gray-900 mb-6" style={{ color: C.text }}>Profile</Text>

                {/* User Info Card */}
                <Card className="flex-row items-center mb-6" style={{ backgroundColor: C.surface }}>
                    <View className="w-16 h-16 bg-indigo-100 rounded-full items-center justify-center mr-4">
                        <Text className="text-2xl font-bold text-indigo-600">{user?.fullName?.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View className="flex-1">
                        <Text className="text-lg font-bold text-gray-900" style={{ color: C.text }}>{user?.fullName}</Text>
                        <Text className="text-gray-500 text-sm" style={{ color: C.textSecondary }}>{user?.email}</Text>
                        <Text className="text-gray-500 text-sm" style={{ color: C.textSecondary }}>{user?.phone?.replace(/^\++/, '+')}</Text>
                    </View>
                    <TouchableOpacity onPress={() => navigation.navigate('EditProfile')}>
                        <Ionicons name="create-outline" size={24} color={C.brand} />
                    </TouchableOpacity>
                </Card>

                {/* Settings */}
                <Text className="text-lg font-bold text-gray-800 mb-3" style={{ color: C.text }}>Settings</Text>

                <Card className="mb-2 py-2" style={{ backgroundColor: C.surface }}>
                    <View className="flex-row justify-between items-center py-3 border-b border-gray-100">
                        <View className="flex-row items-center">
                            <Ionicons name="notifications-outline" size={22} color={C.textSecondary} />
                            <Text className="ml-3 text-base text-gray-700" style={{ color: C.textSecondary }}>Notifications</Text>
                        </View>
                        <Switch
                            value={notifications}
                            onValueChange={setNotifications}
                            trackColor={{ false: '#D1D5DB', true: '#818CF8' }}
                            thumbColor={notifications ? '#4F46E5' : '#f4f3f4'}
                        />
                    </View>

                    <View className="flex-row justify-between items-center py-3 border-b border-gray-100">
                        <View className="flex-row items-center">
                            <Ionicons name="moon-outline" size={22} color={C.textSecondary} />
                            <Text className="ml-3 text-base text-gray-700" style={{ color: C.textSecondary }}>Dark Mode</Text>
                        </View>
                        <Switch
                            value={mode === 'dark' || (mode === 'system' && C.text === '#F1F5F9')}
                            onValueChange={(val) => setMode(val ? 'dark' : 'light')}
                            trackColor={{ false: '#D1D5DB', true: C.brand }}
                            thumbColor={mode === 'dark' || (mode === 'system' && C.text === '#F1F5F9') ? C.brand : '#f4f3f4'}
                        />
                    </View>

                    <TouchableOpacity className="flex-row justify-between items-center py-4 border-b border-gray-100">
                        <View className="flex-row items-center">
                            <Ionicons name="help-circle-outline" size={22} color={C.textSecondary} />
                            <Text className="ml-3 text-base text-gray-700" style={{ color: C.textSecondary }}>Help & Support</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                    </TouchableOpacity>

                    <TouchableOpacity className="flex-row justify-between items-center py-4">
                        <View className="flex-row items-center">
                            <Ionicons name="shield-checkmark-outline" size={22} color={C.textSecondary} />
                            <Text className="ml-3 text-base text-gray-700" style={{ color: C.textSecondary }}>Privacy Policy</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                    </TouchableOpacity>
                </Card>

                {/* Facebook Connection */}
                <Text className="text-lg font-bold text-gray-800 mb-3 mt-4" style={{ color: C.text }}>Connected Accounts</Text>

                {/* Facebook header row */}
                <Card className="mb-2 py-2" style={{ backgroundColor: C.surface }}>
                    <View className="flex-row justify-between items-center py-3">
                        <View className="flex-row items-center flex-1">
                            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#1877F2', alignItems: 'center', justifyContent: 'center' }}>
                                <Ionicons name="logo-facebook" size={20} color="white" />
                            </View>
                            <View className="ml-3 flex-1">
                                <Text className="text-base text-gray-700 font-semibold">
                                    {user?.facebookConnected && fbStore.profile?.name
                                        ? fbStore.profile.name
                                        : 'Facebook'}
                                </Text>
                                <Text className="text-xs text-gray-400">
                                    {user?.facebookConnected
                                        ? (() => {
                                            const visiblePages = fbStore.selectedPages.length > 0
                                                ? fbStore.pages.filter((p: any) => fbStore.selectedPages.includes(p.page_id || p.id))
                                                : fbStore.pages;
                                            const pageNames = visiblePages.map((p: any) => p.page_name || p.name).filter(Boolean);
                                            return pageNames.length > 0
                                                ? pageNames.join(', ')
                                                : 'Connected';
                                        })()
                                        : 'Not connected'}
                                </Text>
                            </View>
                        </View>
                        {user?.facebookConnected ? (
                            <TouchableOpacity onPress={handleDisconnectFb}
                                style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#FECACA' }}>
                                <Text style={{ color: '#EF4444', fontWeight: '600', fontSize: 13 }}>Disconnect</Text>
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity onPress={handleConnectFb} disabled={connectingFb}
                                style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#1877F2' }}>
                                <Text style={{ color: 'white', fontWeight: '600', fontSize: 13 }}>
                                    {connectingFb ? 'Connecting...' : 'Connect'}
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </Card>

                {/* Connected Pages list */}
                {user?.facebookConnected && fbStore.pages.length > 0 && (
                    <View style={{ marginBottom: 12 }}>
                        <Text className="text-sm font-semibold text-gray-600 mb-2 mt-2">Connected Pages</Text>
                        {(fbStore.selectedPages.length > 0
                            ? fbStore.pages.filter((p: any) => fbStore.selectedPages.includes(p.page_id || p.id))
                            : fbStore.pages
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
                                                    fbStore.removePage(pId);
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
                                        marginBottom: 8,
                                        borderWidth: 1, borderColor: '#C6F6D5',
                                        overflow: 'hidden',
                                    }}
                                >
                                    <TouchableOpacity
                                        onPress={() => navigation.navigate('PageInsights', {
                                            pageId: pId,
                                            pageName: pName,
                                            pageCategory: pCategory,
                                        })}
                                        style={{ flex: 1, flexDirection: 'row', alignItems: 'center', padding: 12 }}
                                    >
                                        <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#1877F2', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                                            <Ionicons name="logo-facebook" size={18} color="white" />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ fontWeight: '600', fontSize: 14, color: '#1F2937' }}>{pName}</Text>
                                            {pCategory ? <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 1 }}>{pCategory}</Text> : null}
                                        </View>
                                        <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={handleRemovePage}
                                        style={{ paddingHorizontal: 12, paddingVertical: 16, borderLeftWidth: 1, borderLeftColor: '#C6F6D5' }}
                                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                    >
                                        <Ionicons name="trash-outline" size={18} color="#EF4444" />
                                    </TouchableOpacity>
                                </View>
                            );
                        })}

                        {/* Add another page */}
                        <TouchableOpacity
                            onPress={() => navigation.navigate('SelectFacebookPages', {
                                businessName: user?.businessName || 'My Business',
                                category: user?.businessCategory || '',
                                fromDashboard: true,
                            })}
                            style={{
                                flexDirection: 'row', alignItems: 'center',
                                backgroundColor: '#F9FAFB', borderRadius: 12,
                                padding: 12, borderWidth: 1, borderColor: '#E5E7EB',
                                borderStyle: 'dashed',
                            }}
                        >
                            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                                <Ionicons name="add" size={20} color="#4F46E5" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontWeight: '600', fontSize: 14, color: '#4F46E5' }}>Add Another Page</Text>
                                <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 1 }}>Connect more Facebook pages</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                )}

                <Button
                    title="Logout"
                    variant="outline"
                    className="mt-6 border-red-200"
                    // @ts-ignore
                    style={{ borderColor: '#FECACA' }}
                    // @ts-ignore
                    textStyle={{ color: '#EF4444' }}
                    onPress={handleLogout}
                />

                <Text className="text-center text-gray-400 text-xs mt-6" style={{ color: C.textTertiary }}>Version 1.0.0 (Build 2026)</Text>
            </ScrollView>
        </ScreenWrapper>
    );
};
