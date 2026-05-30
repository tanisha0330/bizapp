import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SavedDesign {
  id: string;
  name: string;
  templateId: string;
  templateName: string;
  category: string;
  categoryIcon: string;
  imageUri: string; // local file URI of the exported PNG
  createdAt: string;
  updatedAt: string;
}

interface DesignStore {
  designs: SavedDesign[];
  addDesign: (design: SavedDesign) => void;
  removeDesign: (id: string) => void;
  getDesign: (id: string) => SavedDesign | undefined;
}

export const useDesignStore = create<DesignStore>()(
  persist(
    (set, get) => ({
      designs: [],
      addDesign: (design) =>
        set((state) => ({
          designs: [design, ...state.designs],
        })),
      removeDesign: (id) =>
        set((state) => ({
          designs: state.designs.filter((d) => d.id !== id),
        })),
      getDesign: (id) => get().designs.find((d) => d.id === id),
    }),
    {
      name: 'design-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
