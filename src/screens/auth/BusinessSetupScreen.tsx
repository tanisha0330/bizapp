import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Dimensions,
    Platform,
    KeyboardAvoidingView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../services/api';
import { useColors } from '../../utils/theme';
import { useBottomSafe } from '../../utils/useBottomSafe';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 72) / 3;

interface Category {
    id: string;
    name: string;
    icon: string;
    iconType: 'ionicon' | 'material';
}

const CATEGORIES: Category[] = [
    { id: 'restaurant', name: 'Restaurant', icon: 'restaurant', iconType: 'ionicon' },
    { id: 'retail', name: 'Retail', icon: 'storefront', iconType: 'ionicon' },
    { id: 'health', name: 'Health', icon: 'fitness', iconType: 'ionicon' },
    { id: 'education', name: 'Education', icon: 'school', iconType: 'ionicon' },
    { id: 'realestate', name: 'Real Estate', icon: 'home', iconType: 'ionicon' },
    { id: 'salon', name: 'Salon & Spa', icon: 'content-cut', iconType: 'material' },
    { id: 'automobile', name: 'Automobile', icon: 'car', iconType: 'ionicon' },
    { id: 'finance', name: 'Finance', icon: 'bank', iconType: 'material' },
    { id: 'travel', name: 'Travel', icon: 'airplane', iconType: 'ionicon' },
    { id: 'tech', name: 'Tech', icon: 'desktop', iconType: 'ionicon' },
    { id: 'legal', name: 'Legal', icon: 'briefcase', iconType: 'ionicon' },
    { id: 'other', name: 'Other', icon: 'grid', iconType: 'ionicon' },
];

export const BusinessSetupScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const C = useColors();
    const bottomSafe = useBottomSafe();
    const phone = route.params?.phone || '';

    const [businessName, setBusinessName] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const selectedCatName = CATEGORIES.find(c => c.id === selectedCategory)?.name || '';
    const isValid = businessName.trim().length >= 2 && selectedCategory;

    const handleNext = async () => {
        if (!isValid) return;

        setLoading(true);
        try {
            // Save profile to backend
            await api.updateProfile({
                businessName: businessName.trim(),
                businessCategory: selectedCatName,
            });
        } catch (error) {
            console.error('Failed to save profile:', error);
        } finally {
            setLoading(false);
            navigation.navigate('ConnectAccounts', {
                businessName: businessName.trim(),
                category: selectedCatName,
                phone,
            });
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: C.background }]}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        style={styles.backButton}
                    >
                        <Ionicons name="arrow-back" size={24} color={C.text} />
                    </TouchableOpacity>
                    <View style={styles.logoContainer}>
                        <View style={styles.logoBadge}>
                            <Text style={styles.logoText}>Biz</Text>
                        </View>
                        <Text style={[styles.logoTitle, { color: C.text }]}>Biz499</Text>
                    </View>
                    <View style={{ width: 40 }} />
                </View>

                {/* Progress */}
                <View style={styles.progressContainer}>
                    <View style={styles.progressDot} />
                    <View style={[styles.progressLine, styles.progressLineActive]} />
                    <View style={[styles.progressDot, styles.progressDotActive]} />
                    <View style={styles.progressLine} />
                    <View style={styles.progressDot} />
                </View>

                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Title */}
                    <View style={styles.titleSection}>
                        <Text style={[styles.title, { color: C.text }]}>Set up your business</Text>
                        <Text style={[styles.subtitle, { color: C.textSecondary }]}>
                            Tell us about your business to get started
                        </Text>
                    </View>

                    {/* Business Name */}
                    <View style={styles.inputContainer}>
                        <Text style={[styles.inputLabel, { color: C.text }]}>Business Name</Text>
                        <TextInput
                            style={[styles.textInput, { backgroundColor: C.surfaceSecondary, color: C.text, borderColor: C.borderLight }]}
                            placeholder="Enter your business name"
                            placeholderTextColor={C.textTertiary}
                            value={businessName}
                            onChangeText={setBusinessName}
                            autoCapitalize="words"
                            autoFocus
                        />
                    </View>

                    {/* Category Selection */}
                    <View style={styles.categorySection}>
                        <Text style={[styles.inputLabel, { color: C.text }]}>Select Category</Text>
                        <View style={styles.categoryGrid}>
                            {CATEGORIES.map((cat) => (
                                <TouchableOpacity
                                    key={cat.id}
                                    style={[
                                        styles.categoryCard,
                                        { backgroundColor: C.surface, borderColor: C.borderLight },
                                        selectedCategory === cat.id && styles.categoryCardSelected,
                                    ]}
                                    onPress={() => setSelectedCategory(cat.id)}
                                    activeOpacity={0.7}
                                >
                                    <View
                                        style={[
                                            styles.categoryIcon,
                                            { backgroundColor: C.surfaceSecondary },
                                            selectedCategory === cat.id && styles.categoryIconSelected,
                                        ]}
                                    >
                                        {cat.iconType === 'ionicon' ? (
                                            <Ionicons
                                                name={cat.icon as any}
                                                size={24}
                                                color={selectedCategory === cat.id ? '#1A7CFF' : C.textSecondary}
                                            />
                                        ) : (
                                            <MaterialCommunityIcons
                                                name={cat.icon as any}
                                                size={24}
                                                color={selectedCategory === cat.id ? '#1A7CFF' : C.textSecondary}
                                            />
                                        )}
                                    </View>
                                    <Text
                                        style={[
                                            styles.categoryName,
                                            { color: C.text },
                                            selectedCategory === cat.id && styles.categoryNameSelected,
                                        ]}
                                        numberOfLines={1}
                                    >
                                        {cat.name}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </ScrollView>

                {/* Bottom Button */}
                <View style={[styles.bottomContainer, { backgroundColor: C.surface, borderTopColor: C.borderLight, paddingBottom: bottomSafe }]}>
                    <TouchableOpacity
                        onPress={handleNext}
                        disabled={!isValid || loading}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={isValid ? ['#1A7CFF', '#0066E6'] : ['#D1D1D6', '#A1A1A6']}
                            style={styles.nextButton}
                        >
                            <Text style={styles.nextButtonText}>
                                {loading ? 'Setting up...' : 'Continue'}
                            </Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingTop: 8,
        paddingBottom: 16,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
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
        marginBottom: 24,
        paddingHorizontal: 24,
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
    scrollContent: {
        paddingHorizontal: 24,
        paddingBottom: 120,
    },
    titleSection: {
        marginBottom: 24,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: '#1D1D1F',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 15,
        color: '#6E6E73',
    },
    inputContainer: {
        marginBottom: 24,
    },
    inputLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1D1D1F',
        marginBottom: 8,
    },
    textInput: {
        backgroundColor: '#F5F5F7',
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#E5E5E7',
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: '#1D1D1F',
    },
    categorySection: {
        flex: 1,
    },
    categoryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    categoryCard: {
        width: CARD_WIDTH,
        backgroundColor: '#F5F5F7',
        borderRadius: 16,
        paddingVertical: 16,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    categoryCardSelected: {
        backgroundColor: '#EEF4FF',
        borderColor: '#1A7CFF',
    },
    categoryIcon: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    categoryIconSelected: {
        backgroundColor: '#DCE8FF',
    },
    categoryName: {
        fontSize: 12,
        fontWeight: '500',
        color: '#48484A',
        textAlign: 'center',
    },
    categoryNameSelected: {
        color: '#1A7CFF',
        fontWeight: '600',
    },
    bottomContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 24,
        borderTopWidth: 1,
        borderTopColor: '#F5F5F7',
    },
    nextButton: {
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: '#1A7CFF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 6,
    },
    nextButtonText: {
        color: '#FFFFFF',
        fontSize: 17,
        fontWeight: '600',
    },
});
