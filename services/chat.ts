import {
  Timestamp,
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { zustandStorage } from '../store/storage';
import { useErrorStore } from '../store/useErrorStore';
import { Chat, Message, User } from '../types';
import { db, storage } from './firebase';
import { networkService, useNetworkStore } from './network';
import { presenceService } from './presence';

/**
 * Helper to convert Firestore Timestamp to number (ms)
 */
const tsToNum = (ts: any): number => {
  if (ts instanceof Timestamp) return ts.toMillis();
  if (typeof ts === 'number') return ts;
  return Date.now();
};

/**
 * Enhanced Chat Service
 * Integrated with Firestore for real-time sync and persistence.
 */
export const chatService = {
  fetchChats: async (userId: string): Promise<Chat[]> => {
    try {
      const chatsRef = collection(db, 'chats');
      const q = query(chatsRef, where('participantIds', 'array-contains', userId), orderBy('lastUpdated', 'desc'));
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        lastUpdated: tsToNum(doc.data().lastUpdated)
      })) as Chat[];
    } catch (error) {
      console.error("fetchChats error:", error);
      useErrorStore.getState().setError("Failed to load chats.");
      return [];
    }
  },

  /**
   * Real-time subscription to the user's chat list.
   * Returns an unsubscribe function.
   */
  subscribeToChats: (userId: string, callback: (chats: Chat[]) => void) => {
    const chatsRef = collection(db, 'chats');
    const q = query(chatsRef, where('participantIds', 'array-contains', userId), orderBy('lastUpdated', 'desc'));

    return onSnapshot(q, (snapshot) => {
      const chats = snapshot.docs.map(d => ({
        ...d.data(),
        id: d.id,
        lastUpdated: tsToNum(d.data().lastUpdated)
      })) as Chat[];
      callback(chats);
    });
  },

  fetchChatById: async (chatId: string): Promise<Chat | null> => {
    try {
      const chatRef = doc(db, 'chats', chatId);
      const snap = await getDoc(chatRef);
      if (snap.exists()) {
        const data = snap.data();
        return {
          ...data,
          id: snap.id,
          lastUpdated: tsToNum(data.lastUpdated)
        } as Chat;
      }
      return null;
    } catch (error) {
      console.error("fetchChatById error:", error);
      return null;
    }
  },

  fetchUsers: async (): Promise<User[]> => {
    try {
      const usersRef = collection(db, 'users');
      const snapshot = await getDocs(usersRef);
      return snapshot.docs.map(doc => ({
        ...doc.data(),
        uid: doc.id,
        lastSeen: tsToNum(doc.data().lastSeen)
      })) as User[];
    } catch (error) {
      console.error("fetchUsers error:", error);
      useErrorStore.getState().setError("Failed to load user list.");
      return [];
    }
  },

  fetchUserById: async (uid: string): Promise<User | null> => {
    try {
      const userRef = doc(db, 'users', uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const data = snap.data();
        return {
          ...data,
          uid: snap.id,
          lastSeen: tsToNum(data.lastSeen)
        } as User;
      }
      return null;
    } catch (error) {
      console.error("fetchUserById error:", error);
      return null;
    }
  },

  createChat: async (participantIds: string[], name?: string): Promise<Chat | null> => {
    try {
      const chatsRef = collection(db, 'chats');
      const newChatData = {
        name: name || 'New Chat',
        participantIds,
        lastUpdated: serverTimestamp(),
        lastMessageText: '',
        typingUsers: []
      };
      const docRef = await addDoc(chatsRef, newChatData);
      return {
        ...newChatData,
        id: docRef.id,
        lastUpdated: Date.now()
      } as Chat;
    } catch {
      useErrorStore.getState().setError("Failed to create chat room.");
      return null;
    }
  },

  subscribeToMessages: (
    chatId: string, 
    callback: (msgs: Message[], lastDoc: any) => void,
    pageSize: number = 20
  ) => {
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    // Listen to latest messages
    const q = query(messagesRef, orderBy('createdAt', 'desc'), limit(pageSize));

    return onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map(d => {
        const data = d.data();
        return {
          ...data,
          id: d.id,
          createdAt: tsToNum(data.createdAt),
        } as Message;
      });

      // Hydrate replyTo previews from replyToId
      const hydratedMessages = messages.map(msg => {
        if (msg.replyToId && !msg.replyTo) {
          const parent = messages.find(m => m.id === msg.replyToId);
          if (parent) {
            return { ...msg, replyTo: { id: parent.id, text: parent.text, senderId: parent.senderId, senderType: parent.senderType } as Message };
          }
        }
        return msg;
      });

      const lastDoc = snapshot.docs[snapshot.docs.length - 1];
      callback(hydratedMessages, lastDoc);
    });
  },

  fetchMoreMessages: async (
    chatId: string, 
    lastVisibleDoc: any, 
    pageSize: number = 20
  ): Promise<{ messages: Message[], lastDoc: any }> => {
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const q = query(
      messagesRef, 
      orderBy('createdAt', 'desc'), 
      startAfter(lastVisibleDoc), 
      limit(pageSize)
    );

    const snapshot = await getDocs(q);
    const messages = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        createdAt: tsToNum(data.createdAt),
      } as Message;
    });

    return {
      messages,
      lastDoc: snapshot.docs[snapshot.docs.length - 1]
    };
  },

  sendMessage: async (
    chatId: string, 
    text: string, 
    senderId: string, 
    senderType: 'human' | 'ai',
    mediaUrl?: string,
    audioUrl?: string,
    replyToId?: string
  ): Promise<void> => {
    if (!networkService.getIsOnline()) {
        const tempId = `temp_${Date.now()}`;
        const newMessage: any = {
          id: tempId,
          chatId,
          text,
          senderId,
          senderType,
          type: audioUrl ? 'audio' : (mediaUrl ? 'image' : 'text'),
          mediaUrl,
          audioUrl,
          replyToId,
          createdAt: Date.now(),
          status: 'sending',
        };
        await chatService.queueOfflineMessage(newMessage);
        useErrorStore.getState().setError("You are offline. Message queued and will send once reconnected.");
        return;
    }

    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const chatRef = doc(db, 'chats', chatId);

    const messageData: any = {
      chatId,
      text,
      senderId,
      senderType,
      type: audioUrl ? 'audio' : (mediaUrl ? 'image' : 'text'),
      createdAt: serverTimestamp(),
      status: 'sent'
    };

    if (mediaUrl) messageData['mediaUrl'] = mediaUrl;
    if (audioUrl) messageData['audioUrl'] = audioUrl;
    if (replyToId) messageData['replyToId'] = replyToId;

    try {
      // 1. Add Message
      await addDoc(messagesRef, messageData);

      // 2. Update Chat metadata (last message, last updated)
      await updateDoc(chatRef, {
        lastMessageText: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
        lastUpdated: serverTimestamp()
      });
    } catch (error) {
      console.error("sendMessage error:", error);
      useErrorStore.getState().setError("Failed to send message. It will be retried when online.");
    }
  },

  setTypingStatus: async (chatId: string, userId: string, isTyping: boolean) => {
    try {
      await presenceService.setTyping(chatId, userId, isTyping);
    } catch (error) {
      console.error("setTypingStatus error:", error);
    }
  },

  subscribeToTyping: (chatId: string, callback: (uids: string[]) => void) => {
    return presenceService.subscribeToTyping(chatId, callback);
  },

  markAsRead: async (chatId: string, userId: string, messageIds: string[]) => {
    if (messageIds.length === 0) return;

    try {
      const batch = writeBatch(db);
      
      messageIds.forEach((msgId) => {
        const msgRef = doc(db, 'chats', chatId, 'messages', msgId);
        batch.update(msgRef, {
          readBy: arrayUnion(userId),
          status: 'read'
        });
      });

      // 1. Mark messages as read in batch
      await batch.commit();

      // 2. Reset unread count for this user in the chat document
      const chatRef = doc(db, 'chats', chatId);
      await updateDoc(chatRef, {
        [`unreadCounts.${userId}`]: 0
      });


    } catch (error) {
      console.error("markAsRead error:", error);
      useErrorStore.getState().setError("Failed to sync read receipts.");
    }
  },

  markAsDelivered: async (chatId: string, messageIds: string[], userId: string) => {
    if (messageIds.length === 0) return;

    try {
      const batch = writeBatch(db);

      messageIds.forEach((msgId) => {
        const msgRef = doc(db, 'chats', chatId, 'messages', msgId);
        batch.update(msgRef, {
          deliveredTo: arrayUnion(userId),
          status: 'delivered'
        });
      });

      await batch.commit();

    } catch (error) {
      console.error("markAsDelivered error:", error);
      useErrorStore.getState().setError("Failed to sync delivery receipts.");
    }
  },

  updateMessage: async (chatId: string, messageId: string, text: string) => {
    try {
      const msgRef = doc(db, 'chats', chatId, 'messages', messageId);
      await updateDoc(msgRef, {
        text,
        editedAt: serverTimestamp(),
        // Keep status as 'sent' or update if needed
      });
    } catch (error) {
      console.error("updateMessage error:", error);
      useErrorStore.getState().setError("Failed to update message.");
      throw error;
    }
  },

  /**
   * Persists a reaction to Firestore
   */
  toggleReaction: async (chatId: string, messageId: string, userId: string, emoji: string) => {
    try {
      const msgRef = doc(db, 'chats', chatId, 'messages', messageId);
      const msgSnap = await getDoc(msgRef);
      
      if (msgSnap.exists()) {
        const data = msgSnap.data();
        const reactions = data.reactions || {};
        const userList = reactions[emoji] || [];
        
        if (userList.includes(userId)) {
          // Remove reaction
          await updateDoc(msgRef, {
            [`reactions.${emoji}`]: arrayRemove(userId)
          });
        } else {
          // Add reaction
          await updateDoc(msgRef, {
            [`reactions.${emoji}`]: arrayUnion(userId)
          });
        }
      }
    } catch (error) {
      console.error("toggleReaction error:", error);
      useErrorStore.getState().setError("Failed to update reaction.");
    }
  },

  /**
   * Uploads a media file (image/attachment) to Firebase Storage
   */
  uploadMedia: async (uri: string, userId: string): Promise<string> => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      
      // Determine extension or default to .jpg
      const extension = uri.split('.').pop()?.split('?')[0] || 'jpg';
      const filename = `media/${userId}/${Date.now()}.${extension}`;
      
      const storageRef = ref(storage, filename);
      await uploadBytes(storageRef, blob);
      
      return getDownloadURL(storageRef);
    } catch (error) {
      console.error("uploadMedia error:", error);
      useErrorStore.getState().setError("Failed to upload image. Please try again.");
      throw error;
    }
  },

  // --- Offline Logic ---

  queueOfflineMessage: async (message: Message) => {
    const queueData = await zustandStorage.getItem('offline-queue');
    const queueStr = typeof queueData === 'string' ? queueData : '[]';
    const queue = JSON.parse(queueStr);
    queue.push(message);
    await zustandStorage.setItem('offline-queue', JSON.stringify(queue));
  },

  flushOfflineQueue: async () => {
    const queueData = await zustandStorage.getItem('offline-queue');
    const queueStr = typeof queueData === 'string' ? queueData : '[]';
    const queue: Message[] = JSON.parse(queueStr);
    
    if (queue.length === 0) return;

    console.log('[Online] Flushing offline queue...', queue.length);
    
    for (const msg of queue) {
        await chatService.sendMessage(
          msg.chatId, 
          msg.text, 
          msg.senderId, 
          msg.senderType, 
          msg.mediaUrl, 
          msg.audioUrl, 
          msg.replyToId
        );
    }
    
    await zustandStorage.setItem('offline-queue', '[]');
  },

  /**
   * Listens to all chats for the user and calculates total unread count across all of them.
   */
  subscribeToTotalUnreadCount: (userId: string, callback: (total: number) => void) => {
    const chatsRef = collection(db, 'chats');
    const q = query(chatsRef, where('participantIds', 'array-contains', userId));

    return onSnapshot(q, (snapshot) => {
      let total = 0;
      snapshot.docs.forEach(doc => {
        const data = doc.data() as Chat;
        total += data.unreadCounts?.[userId] || 0;
      });
      callback(total);
    });
  }
};

// Auto-flush when coming back online
useNetworkStore.subscribe((state) => {
    if (state.isOnline) {
        chatService.flushOfflineQueue();
    }
});
