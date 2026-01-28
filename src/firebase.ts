import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// TODO: Replace with your actual Firebase configuration
// Get this from your Firebase Console (Project Settings > General > Your Apps)
const firebaseConfig = {
    apiKey: "AIzaSyBPARaGJ8LxHikpBt6NDER_TSoaF0jFYb8",
    authDomain: "lens-tracker-d24e7.firebaseapp.com",
    projectId: "lens-tracker-d24e7",
    storageBucket: "lens-tracker-d24e7.firebasestorage.app",
    messagingSenderId: "749027115567",
    appId: "1:749027115567:web:c349ecdc23710f08927cda",
    measurementId: "G-475Y3EW1C4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
