import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    ScrollView,
    Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import { useAuthStore } from '../../store/useAuthStore';
import { connectFacebook, disconnectFacebook } from '../../services/facebookAuth';
import { api } from '../../services/api';
import { AuthStackParamList } from '../../navigation/types';
import { useBottomSafe } from '../../utils/useBottomSafe';
import { FacebookConnectModal } from '../../components/FacebookConnectModal';

type ConnectAccountsRouteProp = RouteProp<AuthStackParamList, 'ConnectAccounts'>;

export const ConnectAccountsScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<ConnectAccountsRouteProp>();
    const { login, setOrganization, setProfileComplete } = useAuthStore();
    const bottomSafe = useBottomSafe();

    const params = route.params || {};
    const businessName = params.businessName || 'My Business';
    const category = params.category || '';
    const phone = (params as any).phone || '';

    const [connectingFb, setConnectingFb] = useState(false);
    const [fbConnected, setFbConnected] = useState(false);
    const [finishing, setFinishing] = useState(false);
    const [showFbModal, setShowFbModal] = useState(false);

    const handleConnectFacebook = async () => {
        if (fbConnected) return;
        setConnectingFb(true);

        try {
            const result = await connectFacebook();

            if (result.success) {
                setFbConnected(true);

                // Fetch pages from backend
                try {
                    const pagesData = await api.getMetaPages();
                    if (pagesData.pages && pagesData.pages.length > 0) {
                        navigation.navigate('SelectFacebookPages', {
                            businessName,
                            category,
                            phone,
                        });
                    } else {
                        Alert.alert('No Pages Found', 'No Facebook Pages found on your account. You can continue and connect a page later.');
                    }
                } catch (e) {
                    Alert.alert('Connection Error', 'Failed to load your Facebook Pages. Please try again.');
                }
            } else if (result.error !== 'cancelled' && result.error !== 'dismissed') {
                console.error('Facebook connection error:', result);
            }
        } catch (error: any) {
            console.error('Exception during Facebook connection:', error);
        } finally {
            setConnectingFb(false);
        }
    };

    const handleDisconnect = async () => {
        await disconnectFacebook();
        setFbConnected(false);
    };

    const handleFinish = async (skipped = false) => {
        setFinishing(true);
        try {
            // Create profile and organization on the backend
            await api.updateProfile({
                fullName: businessName,
                businessName: businessName,
                businessCategory: category,
            });

            const orgResult = await api.createOrganization(businessName);

            if (orgResult.organization) {
                setOrganization({
                    id: orgResult.organization.id,
                    name: orgResult.organization.name,
                });
            }

            setProfileComplete();
            login({
                id: orgResult.user?.id || '',
                fullName: businessName,
                email: '',
                phone: phone,
                businessName: businessName,
                businessCategory: category,
                facebookConnected: skipped ? false : fbConnected,
            });
        } catch (error) {
            console.error('Error finishing setup:', error);
            // Still login locally even if backend call fails
            login({
                fullName: businessName,
                email: '',
                phone: phone,
                businessName: businessName,
                businessCategory: category,
                facebookConnected: skipped ? false : fbConnected,
            });
        } finally {
            setFinishing(false);
        }
    };

    return (
        <ScreenWrapper className="px-6 pt-6">
            <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.logoContainer}>
                        <View style={styles.logoBadge}>
                            <Text style={styles.logoText}>Biz</Text>
                        </View>
                        <Text style={styles.logoTitle}>Biz499</Text>
                    </View>
                </View>

                {/* Progress Indicator */}
                <View style={styles.progressContainer}>
                    <View style={styles.progressDot} />
                    <View style={[styles.progressLine, styles.progressLineActive]} />
                    <View style={styles.progressDot} />
                    <View style={[styles.progressLine, styles.progressLineActive]} />
                    <View style={[styles.progressDot, styles.progressDotActive]} />
                </View>

                {/* Title */}
                <View style={styles.titleSection}>
                    <Text style={styles.title}>Connect Your Socials</Text>
                    <Text style={styles.subtitle}>
                        Link your Facebook page to run ads and manage posts directly from here.
                    </Text>
                </View>

                {/* Platforms */}
                <View style={styles.platformsContainer}>
                    {/* Facebook Card */}
                    <View style={[styles.platformCard, fbConnected && styles.platformCardConnected]}>
                        <View style={styles.platformHeader}>
                            <View style={[styles.platformIcon, { backgroundColor: '#1877F2' }]}>
                                <Ionicons name="logo-facebook" size={28} color="white" />
                            </View>
                            <View style={styles.platformInfo}>
                                <Text style={styles.platformName}>Facebook Page</Text>
                                <Text style={styles.platformStatus}>
                                    {fbConnected ? 'Connected as ' + businessName : 'Not connected'}
                                </Text>
                            </View>
                            {fbConnected && (
                                <Ionicons name="checkmark-circle" size={24} color="#34C759" />
                            )}
                        </View>

                        {!fbConnected ? (
                            <TouchableOpacity
                                onPress={() => setShowFbModal(true)}
                                disabled={connectingFb}
                                style={[styles.connectButton, { backgroundColor: '#1877F2' }]}
                                activeOpacity={0.8}
                            >

                                {connectingFb ? (
                                    <ActivityIndicator color="white" size="small" />
                                ) : (
                                    <Text style={styles.connectButtonText}>Connect Facebook</Text>
                                )}
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity
                                onPress={handleDisconnect}
                                style={styles.disconnectButton}
                            >
                                <Text style={styles.disconnectText}>Disconnect</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </ScrollView>

            {/* Bottom Actions - Absolute positioned */}
            <View style={[styles.bottomContainer, { paddingBottom: bottomSafe }]}>
                <TouchableOpacity
                    onPress={() => handleFinish(false)}
                    disabled={finishing}
                    activeOpacity={0.8}
                >
                    <LinearGradient
                        colors={['#1A7CFF', '#0066E6']}
                        style={styles.continueButton}
                    >
                        <Text style={styles.continueButtonText}>
                            {finishing ? 'Setting up...' : 'Continue'}
                        </Text>
                    </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => handleFinish(true)}
                    disabled={finishing}
                    style={styles.skipButton}
                >
                    <Text style={styles.skipText}>Skip for now</Text>
                </TouchableOpacity>
            </View>
            <FacebookConnectModal 
                visible={showFbModal} 
                onClose={() => setShowFbModal(false)} 
                onConnect={handleConnectFacebook} 
                loading={connectingFb} 
            />
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    header: {
        marginBottom: 24,
    },
    logoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    logoBadge: {
        backgroundColor: '#1D1D1F',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        marginRight: 4,
    },
    logoText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
    },
    logoTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1D1D1F',
    },
    progressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 32,
    },
    progressDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#E5E5E7',
    },
    progressDotActive: {
        backgroundColor: '#1A7CFF',
        width: 24,
    },
    progressLine: {
        width: 40,
        height: 2,
        backgroundColor: '#E5E5E7',
        marginHorizontal: 4,
    },
    progressLineActive: {
        backgroundColor: '#1A7CFF',
    },
    titleSection: {
        marginBottom: 32,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: '#1D1D1F',
        marginBottom: 12,
    },
    subtitle: {
        fontSize: 16,
        color: '#6E6E73',
        lineHeight: 24,
    },
    platformsContainer: {
        gap: 20,
    },
    platformCard: {
        padding: 20,
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#E5E5E7',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    platformCardConnected: {
        borderColor: '#34C759',
        backgroundColor: '#F2FFF5',
    },
    platformHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    platformIcon: {
        width: 56,
        height: 56,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    platformInfo: {
        flex: 1,
    },
    platformName: {
        fontSize: 17,
        fontWeight: '600',
        color: '#1D1D1F',
        marginBottom: 4,
    },
    platformStatus: {
        fontSize: 14,
        color: '#6E6E73',
    },
    connectButton: {
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    connectButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    disconnectButton: {
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E5E5E7',
        backgroundColor: 'white',
    },
    disconnectText: {
        color: '#FF3B30',
        fontSize: 15,
        fontWeight: '600',
    },
    bottomContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 24,
        paddingBottom: 16,
        backgroundColor: 'white',
        borderTopWidth: 1,
        borderTopColor: '#F5F5F7',
    },
    continueButton: {
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: 'center',
        shadowColor: '#1A7CFF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 6,
        marginBottom: 16,
    },
    continueButtonText: {
        color: '#FFFFFF',
        fontSize: 17,
        fontWeight: '600',
    },
    skipButton: {
        alignItems: 'center',
        paddingVertical: 8,
    },
    skipText: {
        color: '#8E8E93',
        fontSize: 16,
        fontWeight: '500',
    },
});
