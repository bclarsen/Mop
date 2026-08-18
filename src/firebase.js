import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import {
  initializeAuth,
  browserPopupRedirectResolver,
  browserLocalPersistence,
  browserSessionPersistence,
  inMemoryPersistence,
  GoogleAuthProvider
} from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCH4Ce8v9zMzci3B0NmiytOQ1VGUX0uItA",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "mop---production.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "mop---production",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "mop---production.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "101857482436",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:101857482436:web:065ef1c21a45aa9202db91",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-ZZG861H80X"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Use Web Storage (localStorage) persistence to guarantee zero IndexedDB lock/closing collisions
export const auth = initializeAuth(app, {
  persistence: [browserLocalPersistence, browserSessionPersistence, inMemoryPersistence],
  popupRedirectResolver: browserPopupRedirectResolver
});

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });




