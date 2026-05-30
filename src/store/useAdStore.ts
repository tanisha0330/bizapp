import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Ad {
    id: string;
    title: string;
    goal: string;
    platform: 'Meta' | 'Google';
    primaryText: string;
    cta: string;
    imageUri?: string;
    location: string;
    interest?: string;
    ageMin: number;
    ageMax: number;
    dailyBudget: number;
    durationDays: number;
    status: 'Draft' | 'Published' | 'Launching' | 'Active' | 'Paused' | 'Failed';
    createdAt: string;
    backendCampaignId?: string;
    backendError?: string;
}

interface AdState {
    ads: Ad[];
    addAd: (ad: Ad) => void;
    updateAd: (id: string, ad: Partial<Ad>) => void;
    deleteAd: (id: string) => void;
}

export const useAdStore = create<AdState>()(
    persist(
        (set) => ({
            ads: [],
            addAd: (ad) => set((state) => ({ ads: [ad, ...state.ads] })),
            updateAd: (id, updatedAd) =>
                set((state) => ({
                    ads: state.ads.map((ad) => (ad.id === id ? { ...ad, ...updatedAd } : ad)),
                })),
            deleteAd: (id) => set((state) => ({ ads: state.ads.filter((ad) => ad.id !== id) })),
        }),
        {
            name: 'ad-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
