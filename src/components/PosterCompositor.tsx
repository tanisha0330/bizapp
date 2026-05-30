import React, { useRef, useEffect, useState, useCallback } from 'react';
import { View, Text, Image, StyleSheet, Dimensions } from 'react-native';
import ViewShot from 'react-native-view-shot';
import { PosterBrief } from '../services/geminiService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DISPLAY_SIZE = SCREEN_WIDTH * 0.75;

interface PosterCompositorProps {
    backgroundUri: string;
    brief: PosterBrief;
    onCapture: (uri: string) => void;
}

export const PosterCompositor: React.FC<PosterCompositorProps> = ({
    backgroundUri,
    brief,
    onCapture,
}) => {
    const viewShotRef = useRef<ViewShot>(null);
    const [bgLoaded, setBgLoaded] = useState(false);
    const [captured, setCaptured] = useState(false);

    const captureImage = useCallback(async () => {
        if (!viewShotRef.current?.capture || captured) return;
        try {
            const uri = await viewShotRef.current.capture();
            setCaptured(true);
            onCapture(uri);
        } catch (err) {
            console.error('ViewShot capture failed:', err);
        }
    }, [onCapture, captured]);

    useEffect(() => {
        if (bgLoaded && !captured) {
            const timer = setTimeout(captureImage, 800);
            return () => clearTimeout(timer);
        }
    }, [bgLoaded, captureImage, captured]);

    // Fallback: if image doesn't load in 5 seconds, capture anyway
    useEffect(() => {
        const fallback = setTimeout(() => {
            if (!captured) {
                setBgLoaded(true);
            }
        }, 5000);
        return () => clearTimeout(fallback);
    }, [captured]);

    const hasLightBg = /light|white|pastel|soft|minimal/i.test(brief.mood + ' ' + brief.colors);
    const primaryColor = hasLightBg ? '#1A1A2E' : '#FFFFFF';
    const secondaryColor = hasLightBg ? '#374151' : 'rgba(255,255,255,0.85)';
    const shadowCol = hasLightBg ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.6)';

    // Parse accent color from brief
    const accentMatch = brief.colors.match(/#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}/);
    const accentColor = accentMatch ? accentMatch[0] : '#6C5CE7';

    return (
        <ViewShot
            ref={viewShotRef}
            options={{
                format: 'png',
                quality: 1,
                width: DISPLAY_SIZE * 3,
                height: DISPLAY_SIZE * 3,
            }}
            style={[styles.poster, { width: DISPLAY_SIZE, height: DISPLAY_SIZE }]}
        >
            {/* Background */}
            <Image
                source={{ uri: backgroundUri }}
                style={StyleSheet.absoluteFill}
                resizeMode="cover"
                onLoad={() => setBgLoaded(true)}
            />

            {/* Subtle overlay for text readability */}
            <View style={[StyleSheet.absoluteFill, styles.overlay]} />

            {/* Content */}
            <View style={styles.textContainer}>

                {/* Offer badge — top right */}
                {!!brief.offer && (
                    <View style={styles.offerRow}>
                        <View style={[styles.offerBadge, { backgroundColor: accentColor }]}>
                            <Text style={styles.offerText}>{brief.offer}</Text>
                        </View>
                    </View>
                )}

                {/* Center: Headline + Subtext */}
                <View style={styles.centerSection}>
                    {!!brief.headline && (
                        <Text
                            style={[styles.headline, { color: primaryColor, textShadowColor: shadowCol }]}
                            numberOfLines={2}
                            adjustsFontSizeToFit
                            minimumFontScale={0.6}
                        >
                            {brief.headline}
                        </Text>
                    )}
                    {!!brief.subtext && (
                        <Text
                            style={[styles.subtext, { color: secondaryColor, textShadowColor: shadowCol }]}
                            numberOfLines={2}
                            adjustsFontSizeToFit
                        >
                            {brief.subtext}
                        </Text>
                    )}

                    {/* CTA */}
                    {!!brief.cta && (
                        <View style={[styles.ctaButton, { backgroundColor: accentColor }]}>
                            <Text style={styles.ctaText}>{brief.cta}</Text>
                        </View>
                    )}
                </View>

                {/* Bottom: Business name + Contact — clean strip */}
                <View style={[styles.bottomStrip, { backgroundColor: hasLightBg ? 'rgba(0,0,0,0.05)' : 'rgba(0,0,0,0.35)' }]}>
                    {!!brief.businessName && (
                        <Text
                            style={[styles.businessName, { color: primaryColor }]}
                            numberOfLines={1}
                        >
                            {brief.businessName}
                        </Text>
                    )}
                    {!!brief.contact && (
                        <Text
                            style={[styles.contact, { color: secondaryColor }]}
                            numberOfLines={1}
                        >
                            {brief.contact}
                        </Text>
                    )}
                </View>
            </View>
        </ViewShot>
    );
};

const styles = StyleSheet.create({
    poster: {
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#1A1A2E',
    },
    overlay: {
        backgroundColor: 'rgba(0,0,0,0.08)',
    },
    textContainer: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'space-between',
    },
    offerRow: {
        alignItems: 'flex-end',
        paddingTop: 16,
        paddingRight: 16,
    },
    offerBadge: {
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 14,
    },
    offerText: {
        fontFamily: 'Jakarta-Bold',
        fontSize: 12,
        fontWeight: '800',
        color: '#FFFFFF',
        letterSpacing: 0.5,
    },
    centerSection: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    headline: {
        fontFamily: 'Jakarta-ExtraBold',
        fontSize: 28,
        fontWeight: '800',
        textAlign: 'center',
        letterSpacing: -0.3,
        lineHeight: 34,
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 8,
    },
    subtext: {
        fontFamily: 'Jakarta-Medium',
        fontSize: 13,
        fontWeight: '500',
        textAlign: 'center',
        marginTop: 8,
        letterSpacing: 0.3,
        lineHeight: 18,
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    ctaButton: {
        paddingHorizontal: 20,
        paddingVertical: 7,
        borderRadius: 16,
        marginTop: 14,
    },
    ctaText: {
        fontFamily: 'Jakarta-Bold',
        fontSize: 11,
        fontWeight: '700',
        color: '#FFFFFF',
        letterSpacing: 0.5,
        textAlign: 'center',
    },
    bottomStrip: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        alignItems: 'center',
    },
    businessName: {
        fontFamily: 'Jakarta-Bold',
        fontSize: 13,
        fontWeight: '700',
        textAlign: 'center',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
    },
    contact: {
        fontFamily: 'Jakarta-Regular',
        fontSize: 9,
        fontWeight: '400',
        textAlign: 'center',
        marginTop: 2,
        letterSpacing: 0.3,
        opacity: 0.85,
    },
});
