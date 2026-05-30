import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Image,
    ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import { useColors } from '../../utils/theme';
import { useFacebookStore } from '../../store/useFacebookStore';
import { useAuthStore } from '../../store/useAuthStore';
import { AuthStackParamList } from '../../navigation/types';
import { useBottomSafe } from '../../utils/useBottomSafe';

type SelectFacebookPagesRouteProp = RouteProp<AuthStackParamList, 'SelectFacebookPages'>;

export const SelectFacebookPagesScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<SelectFacebookPagesRouteProp>();
    const login = useAuthStore((state) => state.login);
    const bottomSafe = useBottomSafe();

    const {
        profile,
        pages,
        selectedPages,
        togglePageSelection,
        selectAllPages,
        deselectAllPages,
    } = useFacebookStore();

    const C = useColors();
    const [finishing, setFinishing] = useState(false);

    // Get route params
    const params = (route.params || {}) as any;
    const businessName = params.businessName || 'My Business';
    const category = params.category || '';
    const phone = params.phone || '';
    const fromDashboard = params.fromDashboard || false;

    const handleFinish = () => {
        setFinishing(true);

        const selectedPagesData = pages.filter((page) =>
            selectedPages.includes(page.id)
        );

        setTimeout(() => {
            setFinishing(false);
            if (fromDashboard) {
                // Already logged in — just go back
                navigation.goBack();
            } else {
                login({
                    fullName: businessName,
                    email: profile?.email || `${businessName.toLowerCase().replace(/\s+/g, '')}@biz499.com`,
                    phone: phone || '+910000000000',
                    businessName: businessName,
                    businessCategory: category,
                    facebookConnected: true,
                    facebookPages: selectedPagesData,
                });
            }
        }, 500);
    };

    const handleSkip = () => {
        if (fromDashboard) {
            // Select all pages by default and go back
            selectAllPages();
            navigation.goBack();
            return;
        }
        setFinishing(true);
        setTimeout(() => {
            setFinishing(false);
            login({
                fullName: businessName,
                email: profile?.email || `${businessName.toLowerCase().replace(/\s+/g, '')}@biz499.com`,
                phone: phone || '+910000000000',
                businessName: businessName,
                businessCategory: category,
                facebookConnected: true,
                facebookPages: [],
            });
        }, 500);
    };

    if (!profile || pages.length === 0) {
        return (
            <ScreenWrapper className="px-6 pt-6 items-center justify-center">
                <ActivityIndicator size="large" color="#1A7CFF" />
                <Text style={[styles.loadingText, { color: C.textSecondary }]}>Loading your pages...</Text>
            </ScreenWrapper>
        );
    }

    return (
        <ScreenWrapper className="px-6 pt-6">
            <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.logoContainer}>
                        <View style={styles.logoBadge}>
                            <Text style={styles.logoText}>Biz</Text>
                        </View>
                        <Text style={[styles.logoTitle, { color: C.text }]}>Biz499</Text>
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
                    <Text style={[styles.title, { color: C.text }]}>Select Your Pages</Text>
                    <Text style={[styles.subtitle, { color: C.textSecondary }]}>
                        Choose the Facebook pages you want to manage with Biz499
                    </Text>
                </View>

                {/* Profile Info */}
                <View style={[styles.profileCard, { backgroundColor: C.surface }]}>
                    <Image
                        source={{ uri: profile.picture?.data?.url }}
                        style={styles.profileImage}
                    />
                    <View style={styles.profileInfo}>
                        <Text style={[styles.profileName, { color: C.text }]}>{profile.name}</Text>
                        <Text style={[styles.profileEmail, { color: C.textSecondary }]}>{profile.email}</Text>
                    </View>
                    <Ionicons name="checkmark-circle" size={24} color="#34C759" />
                </View>

                {/* Select All / Deselect All */}
                <View style={styles.actionRow}>
                    <Text style={[styles.pagesCount, { color: C.text }]}>
                        {selectedPages.length} of {pages.length} selected
                    </Text>
                    <TouchableOpacity
                        onPress={
                            selectedPages.length === pages.length
                                ? deselectAllPages
                                : selectAllPages
                        }
                    >
                        <Text style={styles.selectAllText}>
                            {selectedPages.length === pages.length ? 'Deselect All' : 'Select All'}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Pages List */}
                <View style={styles.pagesContainer}>
                    {pages.map((page) => {
                        const isSelected = selectedPages.includes(page.id);
                        return (
                            <TouchableOpacity
                                key={page.id}
                                onPress={() => togglePageSelection(page.id)}
                                style={[styles.pageCard, { backgroundColor: C.surface, borderColor: C.borderLight }, isSelected && styles.pageCardSelected]}
                                activeOpacity={0.7}
                            >
                                <View style={styles.pageContent}>
                                    {/* Checkbox */}
                                    <View
                                        style={[
                                            styles.checkbox,
                                            isSelected && styles.checkboxSelected,
                                        ]}
                                    >
                                        {isSelected && (
                                            <Ionicons name="checkmark" size={16} color="white" />
                                        )}
                                    </View>

                                    {/* Page Image */}
                                    <Image
                                        source={{ uri: page.picture?.data?.url }}
                                        style={styles.pageImage}
                                    />

                                    {/* Page Info */}
                                    <View style={styles.pageInfo}>
                                        <Text style={[styles.pageName, { color: C.text }]}>{page.name}</Text>
                                        <Text style={[styles.pageCategory, { color: C.textSecondary }]}>{page.category}</Text>
                                        {page.instagram && (
                                            <View style={styles.instagramBadge}>
                                                <Ionicons
                                                    name="logo-instagram"
                                                    size={12}
                                                    color="#E4405F"
                                                />
                                                <Text style={styles.instagramText}>
                                                    @{page.instagram.username}
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </ScrollView>

            {/* Bottom Actions */}
            <View style={[styles.bottomContainer, { backgroundColor: C.surface, borderTopColor: C.borderLight, paddingBottom: bottomSafe }]}>
                <TouchableOpacity
                    onPress={handleFinish}
                    disabled={finishing || selectedPages.length === 0}
                    activeOpacity={0.8}
                >
                    <LinearGradient
                        colors={
                            selectedPages.length === 0
                                ? ['#CCCCCC', '#AAAAAA']
                                : ['#1A7CFF', '#0066E6']
                        }
                        style={styles.continueButton}
                    >
                        <Text style={styles.continueButtonText}>
                            {finishing
                                ? 'Setting up...'
                                : `Continue with ${selectedPages.length} page${selectedPages.length !== 1 ? 's' : ''}`}
                        </Text>
                    </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={handleSkip}
                    disabled={finishing}
                    style={styles.skipButton}
                >
                    <Text style={[styles.skipText, { color: C.textSecondary }]}>Skip page selection</Text>
                </TouchableOpacity>
            </View>
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
        marginBottom: 24,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: '#1D1D1F',
        marginBottom: 12,
    },
    subtitle: {
        fontSize: 16,
        color: '#8E8E93',
        lineHeight: 24,
    },
    profileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F5F9FF',
        padding: 16,
        borderRadius: 12,
        marginBottom: 20,
    },
    profileImage: {
        width: 48,
        height: 48,
        borderRadius: 24,
        marginRight: 12,
    },
    profileInfo: {
        flex: 1,
    },
    profileName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1D1D1F',
    },
    profileEmail: {
        fontSize: 14,
        color: '#8E8E93',
        marginTop: 2,
    },
    actionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    pagesCount: {
        fontSize: 14,
        fontWeight: '500',
        color: '#1D1D1F',
    },
    selectAllText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1A7CFF',
    },
    pagesContainer: {
        gap: 12,
    },
    pageCard: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 12,
        borderWidth: 2,
        borderColor: '#E5E5E7',
    },
    pageCardSelected: {
        borderColor: '#1A7CFF',
        backgroundColor: '#F5F9FF',
    },
    pageContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: '#C7C7CC',
        marginRight: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxSelected: {
        backgroundColor: '#1A7CFF',
        borderColor: '#1A7CFF',
    },
    pageImage: {
        width: 48,
        height: 48,
        borderRadius: 8,
        marginRight: 12,
    },
    pageInfo: {
        flex: 1,
    },
    pageName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1D1D1F',
        marginBottom: 4,
    },
    pageCategory: {
        fontSize: 14,
        color: '#8E8E93',
    },
    instagramBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    instagramText: {
        fontSize: 12,
        color: '#E4405F',
        marginLeft: 4,
        fontWeight: '500',
    },
    bottomContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'white',
        paddingHorizontal: 24,
        paddingVertical: 20,
        borderTopWidth: 1,
        borderTopColor: '#E5E5E7',
    },
    continueButton: {
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    continueButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    skipButton: {
        paddingVertical: 12,
        alignItems: 'center',
        marginTop: 8,
    },
    skipText: {
        fontSize: 14,
        color: '#8E8E93',
        fontWeight: '500',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#8E8E93',
    },
});
