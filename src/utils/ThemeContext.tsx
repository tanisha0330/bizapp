import React, { createContext, useContext } from 'react';
import { useColorScheme, StatusBar, Platform } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemeMode = 'system' | 'light' | 'dark';

interface ThemeState {
    mode: ThemeMode;
    isDark: boolean;
    setMode: (mode: ThemeMode) => void;
    setIsDark: (isDark: boolean) => void;
}

export const useThemeStore = create<ThemeState>()(
    persist(
        (set) => ({
            mode: 'system' as ThemeMode,
            isDark: false,
            setMode: (mode) => set({ mode }),
            setIsDark: (isDark) => set({ isDark }),
        }),
        {
            name: 'theme-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);

const ThemeContext = createContext<{ isDark: boolean }>({ isDark: false });

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
    const systemScheme = useColorScheme();
    const { mode, setIsDark } = useThemeStore();

    const isDark = mode === 'system' ? systemScheme === 'dark' : mode === 'dark';

    React.useEffect(() => {
        setIsDark(isDark);
        if (Platform.OS === 'android') {
            StatusBar.setBackgroundColor(isDark ? '#0F172A' : '#FFFFFF', true);
            StatusBar.setBarStyle(isDark ? 'light-content' : 'dark-content', true);
        }
    }, [isDark, setIsDark]);

    return (
        <ThemeContext.Provider value={{ isDark }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);
