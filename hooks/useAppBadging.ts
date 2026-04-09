import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { chatService } from '../services/chat';
import { useAuthStore } from '../store/useAuthStore';
import { useChatStore } from '../store/useChatStore';

/**
 * Hook to synchronize the global unread message count with the app icon badge.
 */
export function useAppBadging() {
  const { user, status } = useAuthStore();
  const setTotalUnreadCount = useChatStore((state) => state.setTotalUnreadCount);

  useEffect(() => {
    if (status !== 'authenticated' || !user?.uid) {
      // Clear badge on logout
      Notifications.setBadgeCountAsync(0).catch(() => {});
      setTotalUnreadCount(0);
      return;
    }

    const unsubscribe = chatService.subscribeToTotalUnreadCount(user.uid, (total) => {

      setTotalUnreadCount(total);
      Notifications.setBadgeCountAsync(total).catch((err) => {
        console.warn('Failed to set badge count:', err);
      });
    });

    return () => {
      unsubscribe();
    };
  }, [user?.uid, status, setTotalUnreadCount]);
}
