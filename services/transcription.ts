import { httpsCallable } from 'firebase/functions';
import { functions, storage } from './firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useErrorStore } from '../store/useErrorStore';

interface TranscriptionResponse {
  text: string;
}

export const transcriptionService = {
  /**
   * Uploads an audio file to Storage and transcribes it via Cloud Function.
   */
  transcribe: async (uri: string, userId: string): Promise<string> => {
    try {
      // 1. Convert URI to Blob/Blob-like for upload
      const response = await fetch(uri);
      const blob = await response.blob();

      // 2. Upload to Firebase Storage
      const filename = `audio/${userId}/${Date.now()}.m4a`;
      const storageRef = ref(storage, filename);
      await uploadBytes(storageRef, blob);

      // 3. Call Cloud Function for transcription
      const transcribeFunc = httpsCallable<{ storagePath: string }, TranscriptionResponse>(
        functions, 
        'transcribeAudio'
      );
      
      const result = await transcribeFunc({ storagePath: filename });
      return result.data.text;
      
    } catch (error) {
      console.error('Transcription service error:', error);
      useErrorStore.getState().setError("Failed to transcribe your voice message. Please check your network.");
      throw error; // Re-throw to inform caller
    }
  },

  /**
   * Just upload the audio and return the download URL
   * (Used for persistent audio messages)
   */
  uploadAudio: async (uri: string, userId: string): Promise<string> => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const filename = `audio/${userId}/${Date.now()}.m4a`;
      const storageRef = ref(storage, filename);
      await uploadBytes(storageRef, blob);
      return getDownloadURL(storageRef);
    } catch (error) {
      console.error('uploadAudio error:', error);
      useErrorStore.getState().setError("Failed to upload audio message.");
      throw error;
    }
  }
};
