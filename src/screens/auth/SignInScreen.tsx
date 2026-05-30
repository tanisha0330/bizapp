import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Application from 'expo-application';
import { useNavigation } from '@react-navigation/native';
import { jwtDecode } from 'jwt-decode';
import { useColors } from '../../utils/theme';

interface PhoneEmailJWT {
    phone_number?: string;
    phone?: string;
    sub?: string;
    email?: string;
    [key: string]: any;
}

export const SignInScreen = () => {
    const C = useColors();
    const navigation = useNavigation<any>();
    const [deviceId, setDeviceId] = useState('');

    // Phone.email OAuth config (client_id is public, used in the login URL)
    const userInfo = {
        iss: 'phmail',
        aud: 'user',
        client_id: '18972046343814697886',
    };

    // Declaring sign-in URL
    // Note: Most Phone.email implementations only require the client_id in the URL.
    const URI = `https://auth.phone.email/log-in?client_id=${userInfo.client_id}&auth_type=4&device=${deviceId}`;

    // Hooks
    useEffect(() => {
        const fetchDeviceId = async () => {
            // Use expo-application to get device ID (works in Expo Go)
            let id: string | null = null;

            try {
                id = await Application.getAndroidId();
            } catch (e) {
                // Not Android, continue to iOS check
            }

            // For iOS, use getIosIdForVendorAsync or generate a fallback
            if (!id) {
                try {
                    id = await Application.getIosIdForVendorAsync();
                } catch (e) {
                    // Fallback for web or if methods fail
                    id = 'expo-device-' + Math.random().toString(36).substring(7);
                }
            }

            setDeviceId(id || 'expo-device-fallback');
        };

        fetchDeviceId();
    }, []);

    const phoneAuthJwt = (event: any) => {
        try {
            // Getting encodedJWT from the WebView message
            const encodedJWT = event.nativeEvent.data;

            console.log('Received JWT:', encodedJWT);

            // Decode the JWT to extract phone number
            const decoded: PhoneEmailJWT = jwtDecode(encodedJWT);
            console.log('Decoded JWT:', decoded);

            // Extract phone number from various possible fields
            const phoneNumber = decoded.phone_number || decoded.phone || decoded.sub || '';

            // Clean phone number (remove country code if present)
            const cleanPhone = phoneNumber.replace(/^\+91/, '').replace(/\D/g, '');

            // Navigate to user details screen (name collection)
            // Phone.Email already verified the OTP, so we skip OTP verification
            navigation.replace('UserDetails', {
                phone: cleanPhone,
                token: encodedJWT,
                verified: true
            });
        } catch (error) {
            console.error('Error processing JWT:', error);
            Alert.alert(
                'Authentication Error',
                'Failed to process authentication. Please try again.',
                [{ text: 'OK', onPress: () => navigation.goBack() }]
            );
        }
    };

    // Safety check: Don't load the WebView until the deviceId is fetched
    if (!deviceId) {
        return (
            <View style={[styles.mainWrapper, { justifyContent: 'center', backgroundColor: C.background }]}>
                <ActivityIndicator size="large" color="#1A7CFF" />
            </View>
        );
    }

    // Returning JSX
    return (
        <WebView
            source={{ uri: URI }}
            style={[styles.webView, { backgroundColor: C.background }]}
            onMessage={phoneAuthJwt}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            renderLoading={() => (
                <View style={[styles.mainWrapper, { justifyContent: 'center', backgroundColor: C.background }]}>
                    <ActivityIndicator size="large" color="#1A7CFF" />
                </View>
            )}
        />
    );
};

const styles = StyleSheet.create({
    mainWrapper: {
        flex: 1,
        backgroundColor: '#fff',
    },
    webView: {
        flex: 1,
    },
});
