import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

type ProfileStore = {
  selectedProfileId: number;
  setSelectedProfileId: (id: number) => void;
};

export const useProfileStore = create<ProfileStore>()(
  persist(
    (set) => ({
      selectedProfileId: 1,
      setSelectedProfileId: (id) => set({ selectedProfileId: id }),
    }),
    {
      name: 'okusuri-profile-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
