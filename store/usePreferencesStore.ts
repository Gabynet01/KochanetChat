import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from './storage';

interface PreferencesState {
  theme: 'light' | 'dark' | 'system';
  hasOnboarded: boolean;
  notificationsEnabled: boolean;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setHasOnboarded: (onboarded: boolean) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      theme: 'system',
      hasOnboarded: false,
      notificationsEnabled: true,
      setTheme: (theme) => set({ theme }),
      setHasOnboarded: (onboarded) => set({ hasOnboarded: onboarded }),
      setNotificationsEnabled: (enabled) => set({ notificationsEnabled: enabled }),
    }),
    {
      name: 'preferences-storage',
      storage: createJSONStorage(() => zustandStorage),
    }
  )
);
