import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Lead {
    id: string;
    name: string;
    phone: string;
    email: string;
    city?: string;
    adSource: string;
    campaignId?: string;
    timestamp: string;
    status: 'New' | 'Contacted' | 'Qualified' | 'Converted' | 'Lost';
    notes: string;
    avatar: string;
    customFields?: Record<string, string>; // all extra form questions
}

interface LeadState {
    leads: Lead[];
    addLead: (lead: Lead) => void;
    updateLead: (id: string, data: Partial<Lead>) => void;
    deleteLead: (id: string) => void;
    updateStatus: (id: string, status: Lead['status']) => void;
    addNote: (id: string, note: string) => void;
}

export const useLeadStore = create<LeadState>()(
    persist(
        (set) => ({
            leads: [],
            addLead: (lead) => set((state) => ({ leads: [lead, ...state.leads] })),
            updateLead: (id, data) =>
                set((state) => ({
                    leads: state.leads.map((l) => (l.id === id ? { ...l, ...data } : l)),
                })),
            deleteLead: (id) => set((state) => ({ leads: state.leads.filter((l) => l.id !== id) })),
            updateStatus: (id, status) =>
                set((state) => ({
                    leads: state.leads.map((l) => (l.id === id ? { ...l, status } : l)),
                })),
            addNote: (id, note) =>
                set((state) => ({
                    leads: state.leads.map((l) =>
                        l.id === id ? { ...l, notes: l.notes ? `${l.notes}\n${note}` : note } : l
                    ),
                })),
        }),
        {
            name: 'lead-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
