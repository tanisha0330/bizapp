import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearToken } from '../services/api';

interface User {
    id?: string;
    fullName: string;
    email: string;
    phone: string;
    businessName?: string;
    businessCategory?: string;
    website?: string;
    facebookConnected?: boolean;
    facebookPages?: any[];
    profilePhoto?: string;
}

interface Organization {
    id: string;
    name: string;
}

interface AuthState {
    user: User | null;
    organization: Organization | null;
    hasProfile: boolean;
    hasOrganization: boolean;
    isAuthenticated: boolean;
    onboardingSeen: boolean;
    _hasHydrated: boolean;
    login: (user: User) => void;
    logout: () => Promise<void>;
    setOnboardingSeen: () => void;
    updateUser: (user: Partial<User>) => void;
    setOrganization: (org: Organization) => void;
    setProfileComplete: () => void;
    setHasHydrated: (state: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            organization: null,
            hasProfile: false,
            hasOrganization: false,
            isAuthenticated: false,
            onboardingSeen: false,
            _hasHydrated: false,
            login: (user) => set({ user, isAuthenticated: true }),
            logout: async () => {
                // Reset state immediately so navigator switches to GetStarted right away
                set({ user: null, organization: null, hasProfile: false, hasOrganization: false, isAuthenticated: false, onboardingSeen: false });
                // Clean up storage in background
                clearToken().catch(() => {});
                AsyncStorage.removeItem('auth-storage-v4').catch(() => {});
            },
            setOnboardingSeen: () => set({ onboardingSeen: true }),
            updateUser: (updatedUser) =>
                set((state) => ({
                    user: state.user ? { ...state.user, ...updatedUser } : null,
                })),
            setOrganization: (org) => set({ organization: org, hasOrganization: true }),
            setProfileComplete: () => set({ hasProfile: true }),
            setHasHydrated: (state) => set({ _hasHydrated: state }),
        }),
        {
            name: 'auth-storage-v4',
            storage: createJSONStorage(() => AsyncStorage),
            onRehydrateStorage: () => (state) => {
                state?.setHasHydrated(true);
            },
        }
    )
);
