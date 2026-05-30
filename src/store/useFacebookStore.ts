import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface FacebookPage {
    id: string;
    name: string;
    category: string;
    access_token: string;
    tasks?: string[];
    picture?: {
        data: {
            url: string;
        };
    };
    instagram?: {
        id: string;
        username: string;
        profile_picture_url: string;
    } | null;
    selected?: boolean;
}

interface FacebookProfile {
    id: string;
    name: string;
    email?: string;
    picture?: {
        data: {
            url: string;
        };
    };
}

interface FacebookStore {
    isConnected: boolean;
    profile: FacebookProfile | null;
    pages: FacebookPage[];
    selectedPages: string[];
    loading: boolean;
    error: string | null;

    // Actions
    setConnection: (profile: FacebookProfile, pages: FacebookPage[]) => void;
    togglePageSelection: (pageId: string) => void;
    selectAllPages: () => void;
    deselectAllPages: () => void;
    getSelectedPages: () => FacebookPage[];
    removePage: (pageId: string) => void;
    disconnect: () => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
}

export const useFacebookStore = create<FacebookStore>()(
    persist(
        (set, get) => ({
            isConnected: false,
            profile: null,
            pages: [],
            selectedPages: [],
            loading: false,
            error: null,

            setConnection: (profile, pages) =>
                set((state) => {
                    const normalizedPages = pages.map((page: any) => ({
                        ...page,
                        id: page.page_id || page.id,
                        name: page.page_name || page.name,
                        category: page.page_category || page.category || '',
                        access_token: page.page_access_token || page.access_token || '',
                        selected: false,
                    }));
                    // Preserve existing selection if pages still exist
                    const newIds = normalizedPages.map((p: any) => p.id);
                    const kept = state.selectedPages.filter((id: string) => newIds.includes(id));
                    return {
                        isConnected: true,
                        profile,
                        pages: normalizedPages,
                        selectedPages: kept,
                        error: null,
                    };
                }),

            togglePageSelection: (pageId) =>
                set((state) => {
                    const isSelected = state.selectedPages.includes(pageId);
                    return {
                        selectedPages: isSelected
                            ? state.selectedPages.filter((id) => id !== pageId)
                            : [...state.selectedPages, pageId],
                        pages: state.pages.map((page) =>
                            page.id === pageId ? { ...page, selected: !isSelected } : page
                        ),
                    };
                }),

            selectAllPages: () =>
                set((state) => ({
                    selectedPages: state.pages.map((p) => p.id),
                    pages: state.pages.map((page) => ({ ...page, selected: true })),
                })),

            deselectAllPages: () =>
                set((state) => ({
                    selectedPages: [],
                    pages: state.pages.map((page) => ({ ...page, selected: false })),
                })),

            getSelectedPages: () => {
                const state = get();
                return state.pages.filter((page) => state.selectedPages.includes(page.id));
            },

            removePage: (pageId) =>
                set((state) => ({
                    pages: state.pages.filter((p) => p.id !== pageId),
                    selectedPages: state.selectedPages.filter((id) => id !== pageId),
                })),

            disconnect: () =>
                set({
                    isConnected: false,
                    profile: null,
                    pages: [],
                    selectedPages: [],
                    error: null,
                }),

            setLoading: (loading) => set({ loading }),

            setError: (error) => set({ error }),
        }),
        {
            name: 'facebook-storage-v1',
            storage: createJSONStorage(() => AsyncStorage),
            // Only persist connection data, not transient loading/error state
            partialize: (state) => ({
                isConnected: state.isConnected,
                profile: state.profile,
                pages: state.pages,
                selectedPages: state.selectedPages,
            }),
        }
    )
);
