export interface User {
  uid: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  isOnline: boolean;
  lastSeen: number;
}

export interface Chat {
  id: string;
  name: string;
  participantIds: string[];
  lastMessageText?: string;
  lastUpdated: number;
  isGroup?: boolean;
  typingUsers?: string[]; // IDs of users currently typing
  unreadCounts?: Record<string, number>; // Maps userId to number of unread messages
}

export interface Message {
  id: string;
  chatId: string;
  text: string;
  senderId: string;
  senderType: 'human' | 'ai';
  type: 'text' | 'image' | 'audio';
  createdAt: number;
  readBy?: string[];
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  localUri?: string; // For optimistic UI playback before upload
  replyToId?: string;

  replyTo?: Message; // Preview data for the replied message
  audioUrl?: string;
  mediaUrl?: string;
  reactions?: Record<string, string[]>; // emoji: [uids]
  deliveredTo?: string[];
  editedAt?: number;
}
