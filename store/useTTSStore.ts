import { create } from 'zustand';

interface TTSState {
  playingId: string | null;
  setPlayingId: (id: string | null) => void;
}

/**
 * Global store to track which message is currently being spoken.
 */
export const useTTSStore = create<TTSState>((set) => ({
  playingId: null,
  setPlayingId: (id) => set({ playingId: id }),
}));
