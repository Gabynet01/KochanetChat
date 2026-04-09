import { useEffect, useState } from 'react';
import { chatService } from '../services/chat';
import { useAuthStore } from '../store/useAuthStore';
import { useChatStore } from '../store/useChatStore';
import { Chat, User } from '../types';

/**
 * useChatParticipant Hook
 * Resolves the partner participant for a 1-on-1 chat and fetches their profile.
 * Uses a global Zustand cache to minimize Firestore reads.
 */
export const useChatParticipant = (chat: Chat) => {
  const { user: currentUser } = useAuthStore();
  const { profiles, upsertProfile } = useChatStore();
  const [partner, setPartner] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  // Identify the other participant ID
  const partnerId = chat.participantIds.find(id => id !== currentUser?.uid);

  useEffect(() => {
    if (!partnerId) return;

    // Check cache first
    if (profiles[partnerId]) {
      setPartner(profiles[partnerId]);
      return;
    }

    // Otherwise fetch from Firestore
    const fetchPartner = async () => {
      setLoading(true);
      try {
        const data = await chatService.fetchUserById(partnerId);
        if (data) {
          upsertProfile(data);
          setPartner(data);
        }
      } catch (error) {
        console.error("Failed to fetch partner profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPartner();
  }, [partnerId, profiles, upsertProfile]);

  return { partner, loading };
};
