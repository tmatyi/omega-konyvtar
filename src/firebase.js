import { initializeApp } from "firebase/app";
import {
  getDatabase,
  ref,
  onValue,
  off,
  push,
  update,
  remove,
  set,
} from "firebase/database";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  sendPasswordResetEmail,
} from "firebase/auth";
import { getFunctions, httpsCallable } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyDsGop0bF9OvJalbi56-jSr4n4wiq7686w",
  authDomain: "kpregisztracio-6fb9d.firebaseapp.com",
  databaseURL:
    "https://kpregisztracio-6fb9d-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "kpregisztracio-6fb9d",
  storageBucket: "kpregisztracio-6fb9d.firebasestorage.app",
  messagingSenderId: "240075112829",
  appId: "1:240075112829:web:daf571abbe7775d3828c14",
  measurementId: "G-N8DN0K75C6",
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);

// Set authentication persistence to local storage (remembers login across app restarts)
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error("Error setting auth persistence:", error);
});

// Environment-aware database prefix helper
// In staging mode, all paths are prefixed with "staging/"
// to keep staging data separate from production data in the same RTDB.
const appEnv = typeof import.meta !== "undefined" ? import.meta.env.VITE_APP_ENV : "production";
const isStaging = appEnv === "staging";

/**
 * Returns the database prefix: "staging/" for staging builds, "" for production.
 */
export function dbPrefix() {
  return isStaging ? "staging/" : "";
}

/**
 * Wraps the firebase ref() function to automatically prepend the environment prefix.
 * Use this instead of raw ref() for all database paths.
 */
export function dbRef(db, path) {
  return ref(db, dbPrefix() + path);
}

// Firebase Callable Functions — wrappers for Cloud Functions
const functions = getFunctions(app);

/**
 * Validates an invite token. Unauthenticated — callable from AcceptInvite page.
 */
export function validateInvite(token, email) {
  const fn = httpsCallable(functions, "validateInvite");
  return fn({ token, email });
}

/**
 * Marks an invite as accepted. Requires the user to be authenticated.
 */
export function acceptInviteCallable(token, email) {
  const fn = httpsCallable(functions, "acceptInvite");
  return fn({ token, email });
}

/**
 * Deletes a user's Auth account and RTDB record. Requires admin authentication.
 */
export function deleteUserCallable(uid) {
  const fn = httpsCallable(functions, "deleteUserAccount");
  return fn({ uid });
}

export {
  database,
  ref,
  onValue,
  off,
  update,
  push,
  remove,
  set,
  auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  sendPasswordResetEmail,
  functions,
  getFunctions,
  httpsCallable,
};
