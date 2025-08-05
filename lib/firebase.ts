
import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyB8Uq7C69k1xuueZqiMCB-Kx1TX4fQb0NQ",
  authDomain: "showai-23713.firebaseapp.com",
  projectId: "showai-23713",
  storageBucket: "showai-23713.firebasestorage.app",
  messagingSenderId: "72019299027",
  appId: "1:72019299027:web:acc6eccd67a7ee1a43e226",
  measurementId: "G-H8FTYFLJ4L"
};

// Initialize Firebase app
const app = initializeApp(firebaseConfig);

// Firebase Authentication - used for user login/logout and auth state management
export const auth = getAuth(app);

// Google Auth Provider - used for Google Sign-In
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Firestore Database - used for storing user data, recordings, properties, and metadata
export const db = getFirestore(app);

// Firebase Storage - used for storing audio files and other media uploads
export const storage = getStorage(app);

// Firebase Analytics - used for tracking user interactions and app performance (browser only)
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

// Global flags to prevent multiple emulator connections
let firestoreEmulatorConnected = false;
let storageEmulatorConnected = false;
let authEmulatorConnected = false;

// Development Environment Setup
if (typeof window !== 'undefined') {
  const isDevelopment = process.env.NEXT_PUBLIC_IS_DEV === 'true';
  const useEmulators = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true';
  
  console.log('🔥 Firebase Environment Setup:');
  console.log('- Development mode:', isDevelopment);
  console.log('- Use emulators:', useEmulators);
  console.log('- Current origin:', window.location.origin);
  
  if (isDevelopment && useEmulators) {
    console.log('🚀 Connecting to Firebase Emulators...');
    
// Connect to Auth Emulator
try {
  if (!authEmulatorConnected) {
    console.log('🔐 Connecting to Auth Emulator on localhost:9099');
    connectAuthEmulator(auth, 'http://localhost:9099');
    authEmulatorConnected = true;
    console.log('✅ Auth Emulator connected');
  }
} catch (error) {
  if (error instanceof Error && error.message.includes('already connected')) {
    console.log('🔐 Auth Emulator already connected');
    authEmulatorConnected = true;
  } else {
    console.error('❌ Auth Emulator connection failed:', error);
  }
}

// Connect to Firestore Emulator
try {
  if (!firestoreEmulatorConnected) {
    console.log('📊 Connecting to Firestore Emulator on localhost:8080');
    connectFirestoreEmulator(db, 'localhost', 8080);
    firestoreEmulatorConnected = true;
    console.log('✅ Firestore Emulator connected');
  }
} catch (error) {
  if (error instanceof Error && error.message.includes('already started')) {
    console.log('📊 Firestore Emulator already connected');
    firestoreEmulatorConnected = true;
  } else {
    console.error('❌ Firestore Emulator connection failed:', error);
  }
}

// Connect to Storage Emulator
try {
  if (!storageEmulatorConnected) {
    console.log('💾 Connecting to Storage Emulator on localhost:9199');
    connectStorageEmulator(storage, 'localhost', 9199);
    storageEmulatorConnected = true;
    console.log('✅ Storage Emulator connected successfully');
    console.log('📂 Storage uploads will use: http://localhost:9199');
  }
} catch (error) {
  if (
    error instanceof Error &&
    (error.message.includes('already started') || error.message.includes('already connected'))
  ) {
    console.log('💾 Storage Emulator already connected');
    storageEmulatorConnected = true;
    console.log('📂 Storage uploads will use: http://localhost:9199');
  } else {
    console.error('❌ Storage Emulator connection failed:', error);
    console.log('🔄 Falling back to production Storage service');
    console.log('📂 Storage uploads will use: https://firebasestorage.googleapis.com');

    const { getStorage: getFreshStorage } = require('firebase/storage');
    const fallbackStorage = getFreshStorage(app);
    Object.assign(storage, fallbackStorage);
  }
}

    
    if (firestoreEmulatorConnected && storageEmulatorConnected && authEmulatorConnected) {
      console.log('🎉 All Firebase Emulators connected successfully!');
    }
    
  } else {
    console.log('☁️ Using Production Firebase Services');
    console.log('📂 Storage uploads will use: https://firebasestorage.googleapis.com');
    
    if (isDevelopment && !useEmulators) {
      console.log('💡 Tip: Set NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true in .env.local to use emulators');
      console.log('💡 Or start emulators with: firebase emulators:start');
    }
  }
}

// Export the main Firebase app instance for advanced configuration if needed
export { app };
