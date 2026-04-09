import NetInfo from '@react-native-community/netinfo';
import { create } from 'zustand';

interface NetworkState {
  isOnline: boolean;
  setIsOnline: (online: boolean) => void;
}

/**
 * Network Store
 * Real-time connectivity state powered by NetInfo.
 */
export const useNetworkStore = create<NetworkState>((set) => ({
  isOnline: true,
  setIsOnline: (online) => set({ isOnline: online }),
}));

// Initialize real-time listener
NetInfo.addEventListener((state) => {
  const online = !!state.isConnected && state.isInternetReachable !== false;
  useNetworkStore.getState().setIsOnline(online);
});

/**
 * Service to check network status in non-hook contexts
 */
export const networkService = {
  getIsOnline: () => useNetworkStore.getState().isOnline,
  /**
   * Manually fetch latest connection state
   */
  refresh: async () => {
    const state = await NetInfo.fetch();
    const online = !!state.isConnected && state.isInternetReachable !== false;
    useNetworkStore.getState().setIsOnline(online);
    return online;
  }
};
