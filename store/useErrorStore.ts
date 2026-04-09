import { create } from 'zustand';

export type ErrorType = 'error' | 'warning' | 'info' | 'success';

interface ErrorState {
  message: string | null;
  type: ErrorType;
  setError: (message: string | null, type?: ErrorType) => void;
  clearError: () => void;
}

/**
 * Global Error Store
 * Used to trigger the GlobalErrorHandler (Toast) from anywhere in the app.
 */
export const useErrorStore = create<ErrorState>((set) => ({
  message: null,
  type: 'error',
  setError: (message, type = 'error') => set({ message, type }),
  clearError: () => set({ message: null }),
}));
