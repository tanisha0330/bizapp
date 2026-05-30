import React, { useRef, useEffect } from 'react';
import { NavigationContainer, CommonActions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, StyleSheet, Text } from 'react-native';
import LottieView from 'lottie-react-native';
import * as Notifications from 'expo-notifications';
import { useAuthStore } from '../store/useAuthStore';
import { GetStartedScreen } from '../screens/onboarding/GetStartedScreen';
import { AuthStack } from './AuthStack';
import { MainTabs } from './MainTabs';
import { EditProfileScreen } from '../screens/profile/EditProfileScreen';
import { EditDesignScreen } from '../screens/designs/EditDesignScreen';
import { AIDesignCreatorScreen } from '../screens/designs/AIDesignCreatorScreen';
import { TemplateEditorScreen } from '../screens/designs/TemplateEditorScreen';
import { CustomPosterScreen } from '../screens/designs/CustomPosterScreen';
import BusinessCardScreen from '../screens/business/BusinessCardScreen';
import WebsiteBuilderScreen from '../screens/business/WebsiteBuilderScreen';
import { CreateAdScreen } from '../screens/create/CreateAdScreen';
import { BusinessScreen } from '../screens/business/BusinessScreen';
import { PageInsightsScreen } from '../screens/home/PageInsightsScreen';
import { LeadsDetailScreen } from '../screens/home/LeadsDetailScreen';
import { SelectFacebookPagesScreen } from '../screens/auth/SelectFacebookPagesScreen';

const Stack = createNativeStackNavigator();

export const RootNavigator = () => {
    const { isAuthenticated, onboardingSeen, _hasHydrated } = useAuthStore();
    const navRef = useRef<any>(null);
    const lastNotificationResponse = Notifications.useLastNotificationResponse();

    // Force-reset the navigation stack to GetStarted on logout
    useEffect(() => {
        if (_hasHydrated && !isAuthenticated && !onboardingSeen && navRef.current) {
            navRef.current.dispatch(
                CommonActions.reset({ index: 0, routes: [{ name: 'GetStarted' }] })
            );
        }
    }, [isAuthenticated, onboardingSeen, _hasHydrated]);

    // Cold-start: app opened from a killed state by tapping a notification
    useEffect(() => {
        if (!isAuthenticated || !lastNotificationResponse || !navRef.current) return;
        const data = lastNotificationResponse.notification.request.content.data as Record<string, any>;
        if (data?.type === 'lead') {
            setTimeout(() => {
                navRef.current?.dispatch(
                    CommonActions.navigate('LeadsDetail', { title: 'Leads', fromDate: null })
                );
            }, 300);
        }
    }, [lastNotificationResponse, isAuthenticated]);

    // Foreground / background: notification tapped while app is running
    useEffect(() => {
        if (!isAuthenticated) return;
        const sub = Notifications.addNotificationResponseReceivedListener((response) => {
            const data = response.notification.request.content.data as Record<string, any>;
            if (data?.type === 'lead' && navRef.current) {
                navRef.current.dispatch(
                    CommonActions.navigate('LeadsDetail', { title: 'Leads', fromDate: null })
                );
            }
        });
        return () => sub.remove();
    }, [isAuthenticated]);

    if (!_hasHydrated) {
        return (
            <View style={styles.loadingContainer}>
                <LottieView
                    source={require('../../assets/loading.json')}
                    autoPlay
                    loop
                    style={{ width: 80, height: 80 }}
                />
                <Text style={styles.loadingText}>Biz499</Text>
            </View>
        );
    }

    return (
        <NavigationContainer ref={navRef}>
            <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade_from_bottom', animationDuration: 200 }}>
                {!onboardingSeen ? (
                    <Stack.Screen name="GetStarted" component={GetStartedScreen} />
                ) : !isAuthenticated ? (
                    <Stack.Screen name="Auth" component={AuthStack} />
                ) : (
                    <Stack.Screen name="Main" component={MainTabs} />
                )}

                <Stack.Screen
                    name="EditProfile"
                    component={EditProfileScreen}
                    options={{ presentation: 'modal', headerShown: false }}
                />
                <Stack.Screen
                    name="EditDesign"
                    component={EditDesignScreen}
                    options={{ presentation: 'card', headerShown: false }}
                />
                <Stack.Screen
                    name="AIDesignCreator"
                    component={AIDesignCreatorScreen}
                    options={{ presentation: 'card', headerShown: false }}
                />
                <Stack.Screen
                    name="CustomPoster"
                    component={CustomPosterScreen}
                    options={{ presentation: 'card', headerShown: false }}
                />
                <Stack.Screen
                    name="TemplateEditor"
                    component={TemplateEditorScreen}
                    options={{ presentation: 'card', headerShown: false }}
                />
                <Stack.Screen
                    name="BusinessCard"
                    component={BusinessCardScreen}
                    options={{ presentation: 'card', headerShown: false }}
                />
                <Stack.Screen
                    name="WebsiteBuilder"
                    component={WebsiteBuilderScreen}
                    options={{ presentation: 'card', headerShown: false }}
                />
                <Stack.Screen
                    name="CreateAd"
                    component={CreateAdScreen}
                    options={{ presentation: 'card', headerShown: false }}
                />
                <Stack.Screen
                    name="PageInsights"
                    component={PageInsightsScreen}
                    options={{ presentation: 'card', headerShown: false }}
                />
                <Stack.Screen
                    name="LeadsDetail"
                    component={LeadsDetailScreen}
                    options={{ presentation: 'card', headerShown: false }}
                />
                <Stack.Screen
                    name="SelectFacebookPages"
                    component={SelectFacebookPagesScreen}
                    options={{ presentation: 'modal', headerShown: false }}
                />
                <Stack.Screen
                    name="ProfileDetails"
                    component={BusinessScreen}
                    options={{ presentation: 'card', headerShown: false }}
                />
            </Stack.Navigator>
        </NavigationContainer>
    );
};

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0F172A',
    },
    loadingText: {
        fontSize: 22,
        fontWeight: '800',
        color: '#FFFFFF',
        marginTop: 16,
        letterSpacing: 1,
    },
});
