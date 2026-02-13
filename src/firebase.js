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
};
