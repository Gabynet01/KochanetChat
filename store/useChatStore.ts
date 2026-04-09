import { create } from 'zustand';
import { User } from '../types';

interface ChatStore {
  totalUnreadCount: number;
  refreshKey: number;
  profiles: Record<string, User>;
  setTotalUnreadCount: (count: number) => void;
  triggerRefresh: () => void;
  upsertProfile: (user: User) => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  totalUnreadCount: 0,
  refreshKey: 0,
  profiles: {},
  setTotalUnreadCount: (count) => set({ totalUnreadCount: count }),
  triggerRefresh: () => set((state) => ({ refreshKey: state.refreshKey + 1 })),
  upsertProfile: (user) => set((state) => ({
    profiles: { ...state.profiles, [user.uid]: user }
  })),
}));
