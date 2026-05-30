import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Fonts, Shadow, Gradients, useColors } from '../utils/theme';
import { useThemeStore } from '../utils/ThemeContext';
import { registerForPushNotifications } from '../services/notifications';

import { Dashboard } from '../screens/home/Dashboard';
import { DesignsScreen } from '../screens/designs/DesignsScreen';
import { AdsScreen } from '../screens/ads/AdsScreen';
import { LeadsScreen } from '../screens/leads/LeadsScreen';
import { NewsScreen } from '../screens/news/NewsScreen';
import { ErrorBoundary } from '../components/ErrorBoundary';

const withErrorBoundary = (Component: React.ComponentType, msg?: string) => () => (
    <ErrorBoundary fallbackMessage={msg}><Component /></ErrorBoundary>
);

const Tab = createBottomTabNavigator();

export const MainTabs = () => {
    const insets = useSafeAreaInsets();
    const C = useColors();
    const { isDark } = useThemeStore();

    // Register for push notifications automatically on login
    useEffect(() => {
        registerForPushNotifications();
    }, []);

    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarStyle: [styles.tabBar, { height: 62 + insets.bottom, paddingBottom: insets.bottom, backgroundColor: C.surface }],
                tabBarActiveTintColor: C.brand,
                tabBarInactiveTintColor: C.textTertiary,
                tabBarLabelStyle: styles.tabBarLabel,
                tabBarIconStyle: styles.tabBarIcon,
                tabBarIcon: ({ focused, color }) => {
                    let iconName: any;
                    let IconComponent: any = Ionicons;

                    switch (route.name) {
                        case 'Home':
                            iconName = focused ? 'home' : 'home-outline';
                            break;
                        case 'Designs':
                            iconName = focused ? 'color-palette' : 'color-palette-outline';
                            break;
                        case 'Ads':
                            IconComponent = MaterialCommunityIcons;
                            iconName = 'rocket-launch';
                            return (
                                <View style={styles.centerButtonWrapper}>
                                    <LinearGradient
                                        colors={focused ? Gradients.brand : (isDark ? ['#2D2B4E', '#252340'] : ['#F0EDFF', '#E8E4FF']) as any}
                                        style={[styles.centerButton, { borderColor: C.surface }]}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                    >
                                        <IconComponent name={iconName} size={26} color={focused ? '#FFFFFF' : Colors.brand} />
                                    </LinearGradient>
                                </View>
                            );
                        case 'Leads':
                            iconName = focused ? 'people' : 'people-outline';
                            break;
                        case 'News':
                            iconName = focused ? 'newspaper' : 'newspaper-outline';
                            break;
                    }

                    return (
                        <View style={styles.iconWrapper}>
                            <IconComponent name={iconName} size={22} color={color} />
                            {focused && <View style={[styles.activeIndicator, { backgroundColor: Colors.brand }]} />}
                        </View>
                    );
                },
            })}
        >
            <Tab.Screen name="Home" component={withErrorBoundary(Dashboard, 'Dashboard failed to load.')} />
            <Tab.Screen name="Designs" component={withErrorBoundary(DesignsScreen, 'Design Studio failed to load.')} />
            <Tab.Screen
                name="Ads"
                component={withErrorBoundary(AdsScreen, 'Ads section failed to load.')}
                options={{ tabBarLabel: '' }}
            />
            <Tab.Screen name="Leads" component={withErrorBoundary(LeadsScreen, 'Leads section failed to load.')} />
            <Tab.Screen name="News" component={withErrorBoundary(NewsScreen, 'News feed failed to load.')} />
        </Tab.Navigator>
    );
};

const styles = StyleSheet.create({
    tabBar: {
        backgroundColor: Colors.surface,
        borderTopWidth: 0,
        ...Shadow.lg,
        paddingTop: 6,
    },
    tabBarLabel: {
        fontFamily: Fonts.semiBold,
        fontSize: 10,
        marginTop: 0,
        marginBottom: 4,
    },
    tabBarIcon: {
        marginTop: 2,
    },
    iconWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    activeIndicator: {
        width: 4,
        height: 4,
        borderRadius: 2,
        marginTop: 3,
    },
    centerButtonWrapper: {
        marginTop: -28,
        ...Shadow.brand,
    },
    centerButton: {
        width: 54,
        height: 54,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: Colors.surface,
    },
});
