import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    StatusBar,
    Modal,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import * as Application from 'expo-application';
import LottieView from 'lottie-react-native';
import { api, setToken } from '../../services/api';
import { useAuthStore } from '../../store/useAuthStore';
import { useColors } from '../../utils/theme';
import { useThemeStore } from '../../utils/ThemeContext';
import { analytics } from '../../services/mixpanel';

export const LoginScreen = () => {
    const navigation = useNavigation<any>();
    const { login, setOrganization, setProfileComplete } = useAuthStore();
    const C = useColors();
    const { isDark } = useThemeStore();
    const [showWebView, setShowWebView] = useState(false);
    const [deviceId, setDeviceId] = useState('');

    const CLIENT_ID = '18972046343814697886';

    useEffect(() => {
        const fetchDeviceId = async () => {
            let id: string | null = null;
            try {
                id = Application.getAndroidId();
            } catch (e) {
                try {
                    id = await Application.getIosIdForVendorAsync();
                } catch (iosErr) {
                    id = 'expo-' + Math.random().toString(36).substring(7);
                }
            }
            setDeviceId(id || 'expo-fallback');
        };
        fetchDeviceId();
    }, []);

    const handleSignIn = () => {
        setShowWebView(true);
    };

    const handlePhoneAuthComplete = async (event: any) => {
        try {
            const encodedJWT = event.nativeEvent.data;
            setShowWebView(false);

            // Send the Phone.Email JWT to our backend
            const result = await api.verifyOtp(encodedJWT);

            // Store the app JWT token
            await setToken(result.token);

            const phone = result.user.phone;

            if (result.hasProfile && result.hasOrganization) {
                // Returning user with complete setup - go straight to main app
                if (result.organization) {
                    setOrganization(result.organization);
                }
                setProfileComplete();
                login({
                    id: result.user.id,
                    fullName: result.user.fullName || '',
                    email: result.user.email || '',
                    phone,
                    businessName: result.user.businessName || undefined,
                    businessCategory: result.user.businessCategory || undefined,
                });
                analytics.identify(result.user.id, { name: result.user.fullName ?? undefined, phone: result.user.phone ?? undefined, email: result.user.email ?? undefined, businessName: result.user.businessName ?? undefined, businessCategory: result.user.businessCategory ?? undefined });
                analytics.track('Login');
                api.trackEvent('login');
            } else {
                // New user or incomplete profile - go to BusinessSetup
                analytics.track('Signup');
                api.trackEvent('signup');
                setTimeout(() => {
                    navigation.navigate('BusinessSetup', { phone });
                }, 200);
            }
        } catch (error) {
            setShowWebView(false);
            Alert.alert('Sign In Failed', 'Something went wrong. Please try again.');
        }
    };

    const phoneEmailURL = `https://auth.phone.email/log-in?client_id=${CLIENT_ID}&auth_type=4&device=${deviceId}`;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: C.background }]}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.logoContainer}>
                    <View style={styles.logoBadge}>
                        <Text style={styles.logoText}>Biz</Text>
                    </View>
                    <Text style={[styles.logoTitle, { color: C.text }]}>Biz499</Text>
                </View>
            </View>

            {/* Progress */}
            <View style={styles.progressContainer}>
                <View style={[styles.progressDot, styles.progressDotActive]} />
                <View style={styles.progressLine} />
                <View style={styles.progressDot} />
                <View style={styles.progressLine} />
                <View style={styles.progressDot} />
            </View>

            {/* Hero */}
            <View style={styles.heroSection}>
                <View style={styles.animationContainer}>
                    <LottieView
                        source={require('../../../assets/login-animation.json')}
                        autoPlay
                        loop
                        style={styles.animation}
                    />
                </View>

                <Text style={[styles.title, { color: C.text }]}>Welcome to Biz499</Text>
                <Text style={[styles.subtitle, { color: C.textSecondary }]}>
                    AI-powered ads, free social posts, and built-in CRM — all in one app.
                </Text>
            </View>

            {/* Bottom */}
            <View style={[styles.bottomContainer, { backgroundColor: C.surface, borderTopColor: C.borderLight }]}>
                <TouchableOpacity onPress={handleSignIn} activeOpacity={0.8}>
                    <LinearGradient
                        colors={['#1A7CFF', '#0066E6']}
                        style={styles.signInButton}
                    >
                        <Ionicons name="phone-portrait-outline" size={20} color="#FFF" />
                        <Text style={styles.signInText}>Sign in with Phone</Text>
                    </LinearGradient>
                </TouchableOpacity>

                <Text style={[styles.termsText, { color: C.textSecondary }]}>
                    By continuing, you agree to our{' '}
                    <Text style={styles.termsLink}>Terms</Text> &{' '}
                    <Text style={styles.termsLink}>Privacy Policy</Text>
                </Text>
            </View>

            {/* Phone.Email WebView Modal */}
            <Modal
                visible={showWebView}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setShowWebView(false)}
            >
                <SafeAreaView style={[styles.modalContainer, { backgroundColor: C.surface }]}>
                    <View style={[styles.modalHeader, { borderBottomColor: C.borderLight }]}>
                        <TouchableOpacity
                            onPress={() => setShowWebView(false)}
                            style={styles.closeButton}
                        >
                            <Ionicons name="close" size={28} color={C.text} />
                        </TouchableOpacity>
                        <Text style={[styles.modalTitle, { color: C.text }]}>Verify Phone Number</Text>
                        <View style={{ width: 28 }} />
                    </View>

                    {deviceId ? (
                        <WebView
                            source={{ uri: phoneEmailURL }}
                            style={styles.webView}
                            onMessage={handlePhoneAuthComplete}
                            javaScriptEnabled
                            domStorageEnabled
                            startInLoadingState
                            renderLoading={() => (
                                <View style={styles.loadingContainer}>
                                    <ActivityIndicator size="large" color="#1A7CFF" />
                                    <Text style={[styles.loadingText, { color: C.textSecondary }]}>Loading...</Text>
                                </View>
                            )}
                        />
                    ) : (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color="#1A7CFF" />
                        </View>
                    )}
                </SafeAreaView>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    header: {
        paddingHorizontal: 24,
        paddingTop: 8,
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
        marginTop: 24,
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
    heroSection: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
    },
    animationContainer: {
        width: 220,
        height: 220,
        marginBottom: 24,
    },
    animation: {
        width: '100%',
        height: '100%',
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: '#1D1D1F',
        textAlign: 'center',
        marginBottom: 12,
    },
    subtitle: {
        fontSize: 15,
        color: '#6E6E73',
        textAlign: 'center',
        lineHeight: 22,
    },
    bottomContainer: {
        paddingHorizontal: 24,
        paddingBottom: 24,
        borderTopWidth: 1,
        borderTopColor: '#F5F5F7',
        paddingTop: 16,
    },
    signInButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 12,
        gap: 10,
        shadowColor: '#1A7CFF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 6,
    },
    signInText: {
        color: '#FFFFFF',
        fontSize: 17,
        fontWeight: '600',
    },
    termsText: {
        fontSize: 13,
        color: '#6E6E73',
        lineHeight: 18,
        textAlign: 'center',
        marginTop: 16,
    },
    termsLink: {
        color: '#1A7CFF',
        fontWeight: '500',
    },
    modalContainer: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5E7',
    },
    closeButton: {
        padding: 4,
    },
    modalTitle: {
        fontSize: 17,
        fontWeight: '600',
        color: '#1D1D1F',
    },
    webView: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 15,
        color: '#6E6E73',
    },
});
