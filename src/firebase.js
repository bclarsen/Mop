import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAjDw0R--wWvrD9oP1fV02J-Rk7gyy7Aw8",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "cleaner-app-e63bc.firebaseapp.com",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "cleaner-app-e63bc",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "cleaner-app-e63bc.firebasestorage.app",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "488147887616",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:488147887616:web:44e769d2b715978239dae5",
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-B5WF881JM5"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

