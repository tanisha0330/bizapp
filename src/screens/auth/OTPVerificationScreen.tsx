import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Keyboard,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBottomSafe } from '../../utils/useBottomSafe';

export const OTPVerificationScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const phone = route.params?.phone || '9876543210';
    const bottomSafe = useBottomSafe();

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [timer, setTimer] = useState(30);
    const [error, setError] = useState('');
    const inputRefs = useRef<TextInput[]>([]);
    const scrollViewRef = useRef<ScrollView>(null);

    useEffect(() => {
        if (timer <= 0) return;
        const interval = setInterval(() => setTimer((t) => t - 1), 1000);
        return () => clearInterval(interval);
    }, [timer]);

    const handleOtpChange = (value: string, index: number) => {
        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);
        setError('');

        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        } else if (value && index === 5) {
            Keyboard.dismiss();
        }
    };

    const handleKeyPress = (e: any, index: number) => {
        if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handleVerify = () => {
        const otpString = otp.join('');

        if (!firstName.trim()) {
            setError('Please enter your first name');
            return;
        }

        if (!lastName.trim()) {
            setError('Please enter your last name');
            return;
        }

        if (otpString.length !== 6) {
            setError('Please enter a valid 6-digit OTP');
            return;
        }

        setLoading(true);
        setTimeout(() => {
            setLoading(false);
            navigation.navigate('BusinessSetup');
        }, 1500);
    };

    const handleResend = () => {
        if (timer > 0) return;
        setTimer(30);
        setOtp(['', '', '', '', '', '']);
    };

    const formatPhone = (p: string) => {
        // Strip any + prefix and country code for display
        const digits = p.replace(/[^\d]/g, '');
        const last10 = digits.length > 10 ? digits.slice(-10) : digits;
        return last10.replace(/(\d{5})(\d{5})/, '$1 $2');
    };

    const isValid = firstName.trim().length >= 2 && lastName.trim().length >= 2 && otp.join('').length === 6;

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.keyboardView}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
                <ScrollView
                    ref={scrollViewRef}
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

                    {/* Title */}
                    <View style={styles.titleSection}>
                        <Text style={styles.title}>Complete your profile</Text>
                        <View style={styles.phoneRow}>
                            <Text style={styles.subtitle}>
                                Verify OTP sent to +91 {formatPhone(phone)}
                            </Text>
                            <TouchableOpacity onPress={() => navigation.goBack()}>
                                <Ionicons name="pencil" size={18} color="#1A7CFF" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Name Inputs */}
                    <View style={styles.nameSection}>
                        <View style={styles.inputContainer}>
                            <Text style={styles.inputLabel}>First Name</Text>
                            <TextInput
                                style={styles.textInput}
                                placeholder="Enter your first name"
                                placeholderTextColor="#A1A1A6"
                                value={firstName}
                                onChangeText={setFirstName}
                                autoCapitalize="words"
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.inputLabel}>Last Name</Text>
                            <TextInput
                                style={styles.textInput}
                                placeholder="Enter your last name"
                                placeholderTextColor="#A1A1A6"
                                value={lastName}
                                onChangeText={setLastName}
                                autoCapitalize="words"
                            />
                        </View>
                    </View>

                    {/* OTP Input */}
                    <View style={styles.otpSection}>
                        <Text style={styles.inputLabel}>Enter OTP</Text>
                        <View style={styles.otpContainer}>
                            {otp.map((digit, index) => (
                                <TextInput
                                    key={index}
                                    ref={(ref) => { if (ref) inputRefs.current[index] = ref; }}
                                    style={[
                                        styles.otpInput,
                                        digit && styles.otpInputFilled,
                                        error && styles.otpInputError,
                                    ]}
                                    value={digit}
                                    onChangeText={(v) => handleOtpChange(v, index)}
                                    onKeyPress={(e) => handleKeyPress(e, index)}
                                    keyboardType="number-pad"
                                    maxLength={1}
                                    textContentType="oneTimeCode"
                                />
                            ))}
                        </View>
                    </View>

                    {error ? <Text style={styles.errorText}>{error}</Text> : null}

                    {/* Timer / Resend */}
                    <View style={styles.timerContainer}>
                        {timer > 0 ? (
                            <Text style={styles.timerText}>Resend OTP in {timer}s</Text>
                        ) : (
                            <TouchableOpacity onPress={handleResend}>
                                <Text style={styles.resendText}>Resend OTP</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </ScrollView>

                {/* Bottom Button */}
                <View style={[styles.bottomContainer, { paddingBottom: bottomSafe }]}>
                    <TouchableOpacity
                        onPress={handleVerify}
                        disabled={!isValid || loading}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={isValid ? ['#1A7CFF', '#0066E6'] : ['#D1D1D6', '#A1A1A6']}
                            style={styles.verifyButton}
                        >
                            <Text style={styles.verifyButtonText}>
                                {loading ? 'Verifying...' : 'Continue'}
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
        marginBottom: 24,
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
    titleSection: {
        marginBottom: 24,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: '#1D1D1F',
        marginBottom: 8,
    },
    phoneRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    subtitle: {
        fontSize: 14,
        color: '#6E6E73',
    },
    nameSection: {
        marginBottom: 24,
    },
    inputContainer: {
        marginBottom: 16,
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
    otpSection: {
        marginBottom: 16,
    },
    otpContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    otpInput: {
        width: 48,
        height: 56,
        borderWidth: 2,
        borderColor: '#E5E5E7',
        borderRadius: 12,
        fontSize: 24,
        fontWeight: '600',
        textAlign: 'center',
        color: '#1D1D1F',
        backgroundColor: '#F5F5F7',
    },
    otpInputFilled: {
        borderColor: '#1A7CFF',
        backgroundColor: '#EEF4FF',
    },
    otpInputError: {
        borderColor: '#FF3B30',
    },
    errorText: {
        color: '#FF3B30',
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 16,
    },
    timerContainer: {
        alignItems: 'center',
        marginTop: 8,
    },
    timerText: {
        fontSize: 14,
        color: '#6E6E73',
    },
    resendText: {
        fontSize: 14,
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
    verifyButton: {
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: '#1A7CFF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 6,
    },
    verifyButtonText: {
        color: '#FFFFFF',
        fontSize: 17,
        fontWeight: '600',
    },
});
