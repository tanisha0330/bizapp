import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PosterBrief } from '../services/geminiService';

export interface ChatMessage {
    id: string;
    type: 'user' | 'ai';
    text?: string;
    imageUri?: string;
    backgroundUri?: string;
    brief?: PosterBrief;
    compositedUri?: string;
    timestamp: string; // ISO string for serialization
}

interface PosterChatState {
    messages: ChatMessage[];
    addMessage: (msg: ChatMessage) => void;
    updateMessage: (id: string, data: Partial<ChatMessage>) => void;
    clearHistory: () => void;
}

export const usePosterChatStore = create<PosterChatState>()(
    persist(
        (set) => ({
            messages: [],
            addMessage: (msg) => set((state) => ({
                messages: [...state.messages, msg],
            })),
            updateMessage: (id, data) => set((state) => ({
                messages: state.messages.map(m => m.id === id ? { ...m, ...data } : m),
            })),
            clearHistory: () => set({ messages: [] }),
        }),
        {
            name: 'poster-chat-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
