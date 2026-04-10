import { useErrorStore } from '@/store/useErrorStore';
import {
  User as FirebaseUser,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { User } from '../types';
import { auth, db } from './firebase';

/**
 * Maps Firebase User to our internal User type.
 */
export const mapFirebaseUser = (firebaseUser: FirebaseUser): User => ({
  uid: firebaseUser.uid,
  email: firebaseUser.email || '',
  displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
  avatarUrl: firebaseUser.photoURL || undefined,
  isOnline: true,
  lastSeen: Date.now(),
});

/**
 * Authorization Service
 * Integrated with Firebase Authentication SDK.
 */
export const authService = {
  /**
   * Log in with email and password.
   */
  login: async (email: string, password: string): Promise<User | null> => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = mapFirebaseUser(userCredential.user);
      await authService.syncUserProfile(user);
      return user;
    } catch (error: any) {
      const message = authService.parseAuthError(error.code);
      useErrorStore.getState().setError(message);
      return null;
    }
  },

  /**
   * Log out of the current session.
   */
  logout: async (): Promise<void> => {
    try {
      await signOut(auth);
    } catch {
      useErrorStore.getState().setError("Failed to log out. Please try again.");
    }
  },

  /**
   * Log in with Google Credential (for SSO).
   */
  loginWithGoogle: async (idToken: string): Promise<User | null> => {
    try {
      const credential = GoogleAuthProvider.credential(idToken);
      const userCredential = await signInWithCredential(auth, credential);
      const user = mapFirebaseUser(userCredential.user);
      await authService.syncUserProfile(user);
      return user;
    } catch (error) {
      console.error(error);
      useErrorStore.getState().setError("Google Sign-In failed.");
      return null;
    }
  },


  /**
   * Syncs user details to Firestore for presence and profile lookups.
   */
  syncUserProfile: async (user: User): Promise<void> => {
    try {
      const userRef = doc(db, 'users', user.uid);
      // isOnline is owned by RTDB → onUserStatusChanged (Cloud Function). Writing true here
      // on every foreground overwrote offline state and blocked push for that recipient.
      const { isOnline: _ignored, ...profile } = user;
      await setDoc(
        userRef,
        {
          ...profile,
          lastSeen: serverTimestamp(),
        },
        { merge: true },
      );
    } catch (error) {
      console.error("syncUserProfile error:", error);
    }
  },

  /**
   * Updates the user's push notification token in Firestore.
   */
  updatePushToken: async (uid: string, token: string): Promise<void> => {
    try {
      const userRef = doc(db, 'users', uid);
      await setDoc(userRef, { pushToken: token }, { merge: true });
      console.log(`Push token updated for user ${uid}`);
    } catch (error) {
      console.error("Failed to update push token:", error);
      useErrorStore.getState().setError("Failed to register for push notifications.");
    }
  },

  /**
   * Subscribes to Auth State changes.
   */
  subscribeToAuthChanges: (callback: (user: User | null) => void) => {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const user = mapFirebaseUser(firebaseUser);
        callback(user);
      } else {
        callback(null);
      }
    });
  },

  /**
   * Helper to parse Firebase Auth error codes into human-readable messages.
   */
  parseAuthError: (code: string): string => {
    switch (code) {
      case 'auth/invalid-email': return 'Invalid email address format.';
      case 'auth/user-disabled': return 'This account has been disabled.';
      case 'auth/user-not-found': return 'No user found with this email.';
      case 'auth/wrong-password': return 'Incorrect password.';
      case 'auth/invalid-credential': return 'Invalid credentials. Please check your email and password.';
      case 'auth/network-request-failed': return 'Network error. Please check your connection.';
      case 'auth/too-many-requests': return 'Too many failed attempts. Try again later.';
      default: return 'An unexpected error occurred. Please try again.';
    }
  }
};
