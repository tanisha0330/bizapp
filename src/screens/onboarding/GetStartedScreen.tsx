import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    Dimensions,
    StyleSheet,
    Animated,
    StatusBar,
    TouchableOpacity,
    TouchableWithoutFeedback,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import LottieView from 'lottie-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/useAuthStore';
import { useColors } from '../../utils/theme';
import { useBottomSafe } from '../../utils/useBottomSafe';

const { width, height } = Dimensions.get('window');
const SLIDE_DURATION = 4500;

const SLIDES = [
    {
        id: '1',
        title: 'AI Powered Ad Publishing',
        description: 'Easily publish highly targeted digital ads that reach the right people and grow your business',
        animation: require('../../../assets/onboarding-ads.json'),
        gradient: ['#667eea', '#764ba2'] as const,
        lottieScale: 1,
    },
    {
        id: '2',
        title: 'Free Social Media Posts',
        description: 'Get unlimited free festival and business posts with AI generated captions and hashtags',
        animation: require('../../../assets/onboarding-social.json'),
        gradient: ['#f093fb', '#f5576c'] as const,
        lottieScale: 1.3,
    },
    {
        id: '3',
        title: 'In-App Free CRM',
        description: 'Track all your leads and connect with them in seconds for faster conversions',
        animation: require('../../../assets/onboarding-crm.json'),
        gradient: ['#4facfe', '#00f2fe'] as const,
        lottieScale: 1,
    },
];

export const GetStartedScreen = () => {
    const C = useColors();
    const bottomSafe = useBottomSafe();
    const setOnboardingSeen = useAuthStore((s) => s.setOnboardingSeen);
    const [currentIndex, setCurrentIndex] = useState(0);
    const progress = useRef(new Animated.Value(0)).current;
    const animRef = useRef<Animated.CompositeAnimation | null>(null);
    const indexRef = useRef(0);

    const goTo = useCallback((index: number) => {
        if (index >= SLIDES.length) {
            setOnboardingSeen();
            return;
        }
        indexRef.current = index;
        setCurrentIndex(index);
    }, [setOnboardingSeen]);

    useEffect(() => {
        progress.setValue(0);
        animRef.current?.stop();
        animRef.current = Animated.timing(progress, {
            toValue: 1,
            duration: SLIDE_DURATION,
            useNativeDriver: false,
        });
        animRef.current.start(({ finished }) => {
            // Don't auto-advance on last slide — user must tap the button
            if (finished && indexRef.current < SLIDES.length - 1) {
                goTo(indexRef.current + 1);
            }
        });
        return () => { animRef.current?.stop(); };
    }, [currentIndex]);

    const handleTapLeft = () => {
        animRef.current?.stop();
        goTo(Math.max(0, indexRef.current - 1));
    };

    const handleTapRight = () => {
        animRef.current?.stop();
        goTo(indexRef.current + 1);
    };

    const slide = SLIDES[currentIndex];

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {/* Full screen gradient */}
            <LinearGradient
                colors={slide.gradient}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

            {/* Floating decorative circles */}
            <View style={[styles.floatingCircle, styles.floatingCircle1]} />
            <View style={[styles.floatingCircle, styles.floatingCircle2]} />
            <View style={[styles.floatingCircle, styles.floatingCircle3]} />

            <SafeAreaView style={styles.safeArea} edges={['top']}>
                {/* Story progress bars */}
                <View style={styles.progressRow}>
                    {SLIDES.map((_, i) => (
                        <View key={i} style={styles.progressBarBg}>
                            <Animated.View
                                style={[
                                    styles.progressBarFill,
                                    {
                                        width: i < currentIndex
                                            ? '100%'
                                            : i === currentIndex
                                                ? progress.interpolate({
                                                    inputRange: [0, 1],
                                                    outputRange: ['0%', '100%'],
                                                })
                                                : '0%',
                                    },
                                ]}
                            />
                        </View>
                    ))}
                </View>

                {/* Skip button */}
                {currentIndex < SLIDES.length - 1 && (
                    <TouchableOpacity style={styles.skipButton} onPress={setOnboardingSeen}>
                        <Text style={styles.skipText}>Skip</Text>
                    </TouchableOpacity>
                )}

                {/* Tap zones */}
                <TouchableWithoutFeedback onPress={handleTapLeft}>
                    <View style={styles.tapLeft} />
                </TouchableWithoutFeedback>
                <TouchableWithoutFeedback onPress={handleTapRight}>
                    <View style={styles.tapRight} />
                </TouchableWithoutFeedback>

                {/* Lottie animation */}
                <View style={styles.animationContainer} pointerEvents="none">
                    <LottieView
                        source={slide.animation}
                        autoPlay
                        loop
                        style={[
                            styles.lottie,
                            { transform: [{ scale: slide.lottieScale }] },
                        ]}
                    />
                </View>
            </SafeAreaView>

            {/* Bottom content card */}
            <View style={[styles.bottomCard, { backgroundColor: C.background, paddingBottom: bottomSafe + 12, minHeight: BOTTOM_CARD_HEIGHT + bottomSafe }]}>
                <Text style={[styles.title, { color: C.text }]}>{slide.title}</Text>
                <Text style={[styles.description, { color: C.textSecondary }]}>{slide.description}</Text>

                <TouchableOpacity
                    onPress={() => {
                        if (currentIndex < SLIDES.length - 1) {
                            animRef.current?.stop();
                            goTo(currentIndex + 1);
                        } else {
                            setOnboardingSeen();
                        }
                    }}
                    activeOpacity={0.85}
                    style={styles.ctaWrapper}
                >
                    <LinearGradient
                        colors={['#1A7CFF', '#0066E6']}
                        style={styles.ctaButton}
                    >
                        <Ionicons
                            name={currentIndex === SLIDES.length - 1 ? 'checkmark' : 'arrow-forward'}
                            size={22}
                            color="#FFF"
                        />
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const BOTTOM_CARD_HEIGHT = height * 0.32;

const styles = StyleSheet.create({
    container: { flex: 1 },
    safeArea: { flex: 1 },

    floatingCircle: {
        position: 'absolute',
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 100,
    },
    floatingCircle1: { width: 100, height: 100, top: 80, left: -30 },
    floatingCircle2: { width: 60, height: 60, top: height * 0.3, right: 20 },
    floatingCircle3: { width: 40, height: 40, top: 160, right: -10 },

    progressRow: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingTop: 12,
        gap: 6,
        zIndex: 10,
    },
    progressBarBg: {
        flex: 1,
        height: 3,
        borderRadius: 2,
        backgroundColor: 'rgba(255,255,255,0.35)',
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#FFFFFF',
        borderRadius: 2,
    },

    skipButton: {
        position: 'absolute',
        top: 68,
        right: 24,
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 20,
        zIndex: 10,
    },
    skipText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },

    tapLeft: {
        position: 'absolute',
        top: 60,
        left: 0,
        width: width * 0.35,
        bottom: BOTTOM_CARD_HEIGHT,
        zIndex: 5,
    },
    tapRight: {
        position: 'absolute',
        top: 60,
        right: 0,
        width: width * 0.65,
        bottom: BOTTOM_CARD_HEIGHT,
        zIndex: 5,
    },

    animationContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: BOTTOM_CARD_HEIGHT - 20,
    },
    lottie: {
        width: width * 0.7,
        height: height * 0.4,
    },

    bottomCard: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        borderTopLeftRadius: 40,
        borderTopRightRadius: 40,
        paddingHorizontal: 28,
        paddingTop: 28,
        justifyContent: 'space-between',
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        textAlign: 'center',
        letterSpacing: -0.4,
        marginBottom: 8,
    },
    description: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 21,
    },
    ctaWrapper: { alignItems: 'flex-end' },
    ctaButton: {
        width: 56,
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#1A7CFF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
});
