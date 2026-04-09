import * as Speech from 'expo-speech';
import { useCallback, useEffect } from 'react';
import { useTTSStore } from '../store/useTTSStore';

/**
 * Custom Hook: useTTS
 * Manages native Text-to-Speech lifecycle for any Assistant's message.
 * Shared state ensures only one message speaks at a time.
 */
export function useTTS() {
  const { playingId, setPlayingId } = useTTSStore();

  const stop = useCallback(async () => {
    await Speech.stop();
    setPlayingId(null);
  }, [setPlayingId]);

  const speak = useCallback(async (text: string, id: string) => {
    // 1. If currently speaking THIS message, stop it.
    if (playingId === id) {
      await stop();
      return;
    }

    // 2. Stop anything else currently speaking
    await Speech.stop();
    setPlayingId(id);

    // 3. Start speaking
    Speech.speak(text, {
      onDone: () => setPlayingId(null),
      onError: () => setPlayingId(null),
      onStopped: () => setPlayingId(null),
    });
  }, [playingId, stop, setPlayingId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // NOTE: We don't globally stop on every unmount of a bubble, 
      // but only if the app unmounts or we explicitly stop it.
    };
  }, []);

  return {
    speak,
    stop,
    isPlaying: (id: string) => playingId === id,
  };
}
