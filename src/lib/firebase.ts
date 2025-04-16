import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence, collection, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, connectFirestoreEmulator, CACHE_SIZE_UNLIMITED } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Constants for retry logic
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;
const BACKOFF_FACTOR = 1.5;

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || ''
};

// Initialize app
const app = initializeApp(firebaseConfig);

// Initialize auth
const auth = getAuth(app);

// Initialize Firestore with more robust error handling
let db: any;

// Initialize Firestore with standard configuration to avoid initialization errors
db = getFirestore(app);

// Try to enable persistence with error handling
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    // Multiple tabs open, persistence can only be enabled in one tab at a time
    console.warn('Firestore persistence unavailable: Multiple tabs open');
  } else if (err.code === 'unimplemented') {
    // The current browser does not support all of the features required for persistence
    console.warn('Firestore persistence unavailable: Unsupported browser');
  } else {
    console.warn('Firestore persistence error:', err);
  }
});

// Connect to emulator in development if needed
if (import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true') {
  try {
    connectFirestoreEmulator(db, 'localhost', 8080);
    console.log('Connected to Firestore emulator');
  } catch (error) {
    console.warn('Failed to connect to Firestore emulator:', error);
  }
}

const storage = getStorage(app);

// Initialize collections with retry logic
async function initializeCollections() { 
  let retries = 0;
  while (retries < MAX_RETRIES) { 
    try {
      // Wait for Firestore to be ready
      await new Promise<void>((resolve) => {
        const unsubscribe = auth.onAuthStateChanged(() => {
          unsubscribe();
          resolve();
        });
      });

      const collections = {
        goalsCollection: collection(db, 'goals'),
        goalCategoriesCollection: collection(db, 'goal_categories'),
        goalTemplatesCollection: collection(db, 'goal_templates'),
        goalProgressCollection: collection(db, 'goal_progress'),
        foodImagesCollection: collection(db, 'food_images'),
        foodImageCacheCollection: collection(db, 'food_image_cache'),
        foodImageRequestsCollection: collection(db, 'food_image_requests')
      };
      
      return collections;

    } catch (error) {
      retries++;
      if (retries === MAX_RETRIES) throw error;
      
      // Add exponential backoff with jitter
      const delay = RETRY_DELAY * Math.pow(BACKOFF_FACTOR, retries - 1) + Math.random() * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// Initialize collections and export promise 
const collectionsPromise = initializeCollections().catch(error => { 
  console.error('Failed to initialize collections:', error);
  return null;
});

export { 
  auth, 
  db, 
  storage,
  ref,
  uploadBytes,
  getDownloadURL,
  collectionsPromise as collections
};