import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBottomSafe } from '../../utils/useBottomSafe';

export const UserDetailsScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const phone = route.params?.phone || '';
    const bottomSafe = useBottomSafe();
    const token = route.params?.token || '';

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleContinue = () => {
        if (!firstName.trim()) {
            setError('Please enter your first name');
            return;
        }

        if (!lastName.trim()) {
            setError('Please enter your last name');
            return;
        }

        setLoading(true);
        setError('');

        // Simulate API call to save user details
        setTimeout(() => {
            setLoading(false);
            navigation.navigate('BusinessSetup');
        }, 1000);
    };

    const formatPhone = (p: string) => {
        const digits = p.replace(/[^\d]/g, '');
        const last10 = digits.length > 10 ? digits.slice(-10) : digits;
        return last10.replace(/(\d{5})(\d{5})/, '$1 $2');
    };

    const isValid = firstName.trim().length >= 2 && lastName.trim().length >= 2;

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.keyboardView}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity
                            onPress={() => navigation.goBack()}
                            style={styles.backButton}
                        >
                            <Ionicons name="arrow-back" size={24} color="#1D1D1F" />
                        </TouchableOpacity>
                        <View style={styles.logoContainer}>
                            <View style={styles.logoBadge}>
                                <Text style={styles.logoText}>Biz</Text>
                            </View>
                            <Text style={styles.logoTitle}>Biz499</Text>
                        </View>
                        <View style={{ width: 40 }} />
                    </View>

                    {/* Success Icon */}
                    <View style={styles.successContainer}>
                        <View style={styles.successIcon}>
                            <Ionicons name="checkmark-circle" size={64} color="#34C759" />
                        </View>
                        <Text style={styles.successText}>Phone Verified!</Text>
                        {phone && (
                            <Text style={styles.phoneText}>+91 {formatPhone(phone)}</Text>
                        )}
                    </View>

                    {/* Title */}
                    <View style={styles.titleSection}>
                        <Text style={styles.title}>What's your name?</Text>
                        <Text style={styles.subtitle}>
                            Help us personalize your experience
                        </Text>
                    </View>

                    {/* Name Inputs */}
                    <View style={styles.formSection}>
                        <View style={styles.inputContainer}>
                            <Text style={styles.inputLabel}>First Name</Text>
                            <TextInput
                                style={styles.textInput}
                                placeholder="Enter your first name"
                                placeholderTextColor="#A1A1A6"
                                value={firstName}
                                onChangeText={(text) => {
                                    setFirstName(text);
                                    setError('');
                                }}
                                autoCapitalize="words"
                                autoFocus
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.inputLabel}>Last Name</Text>
                            <TextInput
                                style={styles.textInput}
                                placeholder="Enter your last name"
                                placeholderTextColor="#A1A1A6"
                                value={lastName}
                                onChangeText={(text) => {
                                    setLastName(text);
                                    setError('');
                                }}
                                autoCapitalize="words"
                            />
                        </View>

                        {error ? <Text style={styles.errorText}>{error}</Text> : null}
                    </View>
                </ScrollView>

                {/* Bottom Button */}
                <View style={[styles.bottomContainer, { paddingBottom: bottomSafe }]}>
                    <TouchableOpacity
                        onPress={handleContinue}
                        disabled={!isValid || loading}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={isValid ? ['#1A7CFF', '#0066E6'] : ['#D1D1D6', '#A1A1A6']}
                            style={styles.continueButton}
                        >
                            <Text style={styles.continueButtonText}>
                                {loading ? 'Please wait...' : 'Continue'}
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
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingBottom: 120,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 8,
        marginBottom: 32,
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
    successContainer: {
        alignItems: 'center',
        marginBottom: 32,
    },
    successIcon: {
        marginBottom: 16,
    },
    successText: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1D1D1F',
        marginBottom: 4,
    },
    phoneText: {
        fontSize: 16,
        color: '#6E6E73',
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
    formSection: {
        flex: 1,
    },
    inputContainer: {
        marginBottom: 20,
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
    errorText: {
        color: '#FF3B30',
        fontSize: 14,
        marginTop: 8,
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
    continueButton: {
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: '#1A7CFF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 6,
    },
    continueButtonText: {
        color: '#FFFFFF',
        fontSize: 17,
        fontWeight: '600',
    },
});
