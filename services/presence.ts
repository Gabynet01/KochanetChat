import { 
  ref, 
  onValue, 
  onDisconnect, 
  set
} from 'firebase/database';
import { rtdb } from './firebase';

export interface UserPresence {
  state: 'online' | 'offline';
  last_changed: number;
}

export const presenceService = {
  /**
   * Initializes presence for the current user.
   * Sets them as 'online' and configures 'onDisconnect' to set them 'offline'.
   */
  initialize: async (userId: string) => {
    const userStatusRef = ref(rtdb, `/status/${userId}`);
    const isOfflineData: UserPresence = {
      state: 'offline',
      last_changed: Date.now(), // Fallback, onDisconnect handles this mostly
    };
    const isOnlineData: UserPresence = {
      state: 'online',
      last_changed: Date.now(),
    };

    // Use .info/connected to handle initial connection
    const connectedRef = ref(rtdb, '.info/connected');
    onValue(connectedRef, (snapshot) => {
      if (snapshot.val() === false) {
        return;
      }

      onDisconnect(userStatusRef)
        .set(isOfflineData)
        .then(() => {
          set(userStatusRef, isOnlineData);
        });
    });
  },

  /**
   * Manually set the user's online/offline status.
   */
  setOnline: async (userId: string, isOnline: boolean) => {
    const userStatusRef = ref(rtdb, `/status/${userId}`);
    const data: UserPresence = {
      state: isOnline ? 'online' : 'offline',
      last_changed: Date.now(),
    };
    await set(userStatusRef, data);
  },

  /**
   * Subscribes to another user's status.
   */
  subscribeToUserStatus: (userId: string, callback: (status: UserPresence | null) => void) => {
    const userStatusRef = ref(rtdb, `/status/${userId}`);
    return onValue(userStatusRef, (snapshot) => {
      const data = snapshot.val();
      callback(data as UserPresence);
    });
  },

  /**
   * Helper to format the status for the UI
   */
  formatStatus: (status: UserPresence | null): string => {
    if (!status) return 'Offline';
    if (status.state === 'online') return 'Online';
    
    // For offline, we could calculate "Last seen X mins ago" if we wanted.
    return 'Offline';
  },

  /**
   * RTDB Typing Indicator implementation
   */
  setTyping: async (chatId: string, userId: string, isTyping: boolean) => {
    const typingRef = ref(rtdb, `typing/${chatId}/${userId}`);
    if (isTyping) {
      // Ensure it's removed if user disconnects suddenly
      onDisconnect(typingRef).remove();
      await set(typingRef, true);
    } else {
      await set(typingRef, null); // null removes the key in RTDB
    }
  },

  /**
   * Subscribes to typing status of a specific chat.
   * Returns a list of UIDs currently typing.
   */
  subscribeToTyping: (chatId: string, callback: (uids: string[]) => void) => {
    const typingRef = ref(rtdb, `typing/${chatId}`);
    return onValue(typingRef, (snapshot) => {
      const data = snapshot.val() || {};
      const typingUids = Object.keys(data).filter(uid => data[uid] === true);
      callback(typingUids);
    });
  }
};
