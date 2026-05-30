import './global.css';
import React from 'react';
import { Text, TextInput, Animated, StyleSheet as RNStyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/navigation/RootNavigator';
import { StatusBar } from 'expo-status-bar';
import {
  useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import * as Font from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { ThemeProvider, useThemeStore } from './src/utils/ThemeContext';
import { registerForPushNotifications } from './src/services/notifications';
import { ErrorBoundary } from './src/components/ErrorBoundary';

// Limit font scaling globally to prevent text overflow on Android
if ((Text as any).defaultProps == null) (Text as any).defaultProps = {};
(Text as any).defaultProps.maxFontSizeMultiplier = 1.2;
(Text as any).defaultProps.allowFontScaling = false;

if ((TextInput as any).defaultProps == null) (TextInput as any).defaultProps = {};
(TextInput as any).defaultProps.maxFontSizeMultiplier = 1.2;
(TextInput as any).defaultProps.allowFontScaling = false;

SplashScreen.preventAutoHideAsync();

export default function App() {
  const [fontsLoaded] = useFonts({
    'Jakarta-Regular': PlusJakartaSans_400Regular,
    'Jakarta-Medium': PlusJakartaSans_500Medium,
    'Jakarta-SemiBold': PlusJakartaSans_600SemiBold,
    'Jakarta-Bold': PlusJakartaSans_700Bold,
    'Jakarta-ExtraBold': PlusJakartaSans_800ExtraBold,
  });

  const [iconFontsLoaded, setIconFontsLoaded] = React.useState(false);

  React.useEffect(() => {
    async function loadIconFonts() {
      try {
        await Font.loadAsync({
          ...Font.Ionicons,
          ...Font.MaterialCommunityIcons,
        });
        setIconFontsLoaded(true);
      } catch (e) {
        console.warn('Error loading icon fonts:', e);
        setIconFontsLoaded(true); // Continue anyway
      }
    }

    loadIconFonts();
  }, []);

  React.useEffect(() => {
    if (fontsLoaded && iconFontsLoaded) {
      SplashScreen.hideAsync();
      registerForPushNotifications();
    }
  }, [fontsLoaded, iconFontsLoaded]);

  if (!fontsLoaded || !iconFontsLoaded) return null;

  return (
    <ErrorBoundary fallbackMessage="Something went wrong. Please restart the app.">
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </ErrorBoundary>
  );
}

function AppContent() {
  const { isDark } = useThemeStore();
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const prevDark = React.useRef(isDark);

  React.useEffect(() => {
    if (prevDark.current !== isDark) {
      prevDark.current = isDark;
      fadeAnim.setValue(1);
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }).start();
    }
  }, [isDark, fadeAnim]);

  return (
    <SafeAreaProvider>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <RootNavigator />
      <Animated.View
        pointerEvents="none"
        style={{
          ...RNStyleSheet.absoluteFillObject,
          backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
          opacity: fadeAnim,
        }}
      />
    </SafeAreaProvider>
  );
}
