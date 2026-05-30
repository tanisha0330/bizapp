import { ViewProps, Platform, KeyboardAvoidingView, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar, StatusBarStyle } from 'expo-status-bar';
import { useColors } from '../utils/theme';
import { useThemeStore } from '../utils/ThemeContext';

interface ScreenWrapperProps extends ViewProps {
    bg?: string;
    statusBarStyle?: StatusBarStyle;
    children: React.ReactNode;
    scrollable?: boolean;
    keyboardAvoiding?: boolean;
    keyboardOffset?: number;
    edges?: ('top' | 'bottom' | 'left' | 'right')[];
}

export const ScreenWrapper = ({
    children,
    bg = "bg-white",
    statusBarStyle,
    className,
    scrollable = false,
    keyboardAvoiding = true,
    keyboardOffset = Platform.OS === 'ios' ? 64 : 0,
    edges = ['top', 'bottom', 'left', 'right'],
    style,
    ...props
}: ScreenWrapperProps) => {
    const C = useColors();
    const { isDark } = useThemeStore();
    const resolvedStatusBar = statusBarStyle || (isDark ? 'light' : 'dark');
    const content = scrollable ? (
        <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
        >
            {children}
        </ScrollView>
    ) : (
        children
    );

    const wrappedContent = keyboardAvoiding ? (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1 }}
            keyboardVerticalOffset={keyboardOffset}
        >
            {content}
        </KeyboardAvoidingView>
    ) : (
        content
    );

    return (
        <SafeAreaView
            className={`flex-1 ${bg} ${className || ''}`}
            style={[styles.container, { backgroundColor: C.background }, style]}
            edges={edges}
            {...props}
        >
            <StatusBar style={resolvedStatusBar} />
            {wrappedContent}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
});
