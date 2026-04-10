import { zustandStorage } from '@/store/storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { getApp, getApps, initializeApp } from 'firebase/app';
// @ts-ignore getReactNativePersistence exists in the RN bundle but is missing from web TS definitions
import { connectAuthEmulator, getAuth, getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { connectDatabaseEmulator, getDatabase } from 'firebase/database';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions';
import { connectStorageEmulator, getStorage } from 'firebase/storage';
import { Platform } from 'react-native';
import { firebaseConfig } from './firebaseConfig';

/** Must match the region where Cloud Functions are deployed (see `firebase deploy` logs). */
const CLOUD_FUNCTIONS_REGION = 'us-central1';

/** When unset/false, dev builds use production Firebase (deployed project). Set to "true" only while emulators are running. */
function shouldUseFirebaseEmulators(): boolean {
  return (
    __DEV__ &&
    process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATORS === 'true'
  );
}

/**
 * Host machine as seen from the running app.
 * Metro may use 127.0.0.1 (adb reverse); Firebase emulators on the host must still use
 * 10.0.2.2 from an Android emulator — not the emulator's loopback.
 */
function getEmulatorHost(): string {
  if (Platform.OS === 'android' && !Device.isDevice) {
    return '10.0.2.2';
  }
  const fromManifest = Constants.expoConfig?.hostUri?.split(':').shift();
  if (fromManifest) return fromManifest;
  return Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
}

let app: ReturnType<typeof initializeApp>;
let auth: ReturnType<typeof getAuth>;
let db: ReturnType<typeof getFirestore>;
let functions: ReturnType<typeof getFunctions>;
let storage: ReturnType<typeof getStorage>;
let rtdb: ReturnType<typeof getDatabase>;

// Check if Firebase is already initialized
if (getApps().length === 0) {
  // 1. Initialize App
  app = initializeApp(firebaseConfig);

  // 2. Initialize Auth with Custom Persistence
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(zustandStorage),
  });

  // 3. Initialize Services
  db = getFirestore(app);
  functions = getFunctions(app, CLOUD_FUNCTIONS_REGION);
  storage = getStorage(app);
  rtdb = getDatabase(app);

  // 4. Emulators only when explicitly enabled (see EXPO_PUBLIC_USE_FIREBASE_EMULATORS)
  if (shouldUseFirebaseEmulators()) {
    const host = getEmulatorHost();

    connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
    connectFirestoreEmulator(db, host, 8080);
    connectFunctionsEmulator(functions, host, 5001);
    connectStorageEmulator(storage, host, 9199);
    connectDatabaseEmulator(rtdb, host, 9000);

    console.log(`🔥 [Firebase] Connected to local emulators at ${host}`);
  } else if (__DEV__) {
    console.log(
      '🔥 [Firebase] Using production backend (dev). Set EXPO_PUBLIC_USE_FIREBASE_EMULATORS=true when running firebase emulators.',
    );
  }
} else {
  // 5. App already exists during Fast Refresh, just grab the existing instances
  app = getApp();
  auth = getAuth(app);
  db = getFirestore(app);
  functions = getFunctions(app, CLOUD_FUNCTIONS_REGION);
  storage = getStorage(app);
  rtdb = getDatabase(app);
}

export { auth, db, functions, rtdb, storage };
export default app;