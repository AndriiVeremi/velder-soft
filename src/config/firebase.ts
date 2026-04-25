import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  initializeAuth, 
  getReactNativePersistence, 
  browserLocalPersistence,
  getAuth
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Singleton app initialization
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth based on platform
let authInstance;

if (Platform.OS === 'web') {
  authInstance = getAuth(app);
} else {
  // Check if auth is already initialized to avoid "Auth instance already exists" error
  try {
    authInstance = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch (e) {
    // If already initialized, get the existing instance
    authInstance = getAuth(app);
  }
}

export const auth = authInstance;
export const db = getFirestore(app, process.env.EXPO_PUBLIC_FIREBASE_DATABASE_ID || '(default)');
export const storage = getStorage(app);

export default app;
