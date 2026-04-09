import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from './storage';
import { User } from '../types';

export type AuthProvider = 'email' | 'google';

interface AuthState {
  user: User | null;
  status: 'idle' | 'loading' | 'authenticated';
  lastUsedProvider: AuthProvider | null;
  setUser: (user: User | null, provider?: AuthProvider) => void;
  updateProfile: (profile: Partial<User>) => void;
  setStatus: (status: 'idle' | 'loading' | 'authenticated') => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      status: 'idle',
      lastUsedProvider: null,
      setUser: (user, provider) => 
        set((state) => ({ 
          user, 
          status: user ? 'authenticated' : 'idle',
          lastUsedProvider: provider || state.lastUsedProvider 
        })),
      updateProfile: (profile) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...profile } : null
        })),
      setStatus: (status) => set({ status }),
      logout: () => set({ user: null, status: 'idle' }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => zustandStorage),
    }
  )
);
