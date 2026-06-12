import { useState, useEffect } from "react";
import {
  auth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  database,
  dbRef,
  ref,
  set,
  update,
  onValue,
} from "../firebase.js";

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Firebase authentication functions
  const handleLogin = async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password,
      );

      // Update lastLogin timestamp in database
      try {
        const userRef = dbRef(database, `users/${userCredential.user.uid}`);
        await update(userRef, {
          lastLogin: new Date().toISOString(),
        });
      } catch (dbError) {
        console.warn("Could not update last login timestamp:", dbError);
        // Don't fail login if database update fails
      }

      return userCredential.user;
    } catch (error) {
      throw error;
    }
  };

  const handleForgotPassword = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      console.error("Password reset error:", error);
      throw error;
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const handleProfileUpdate = (profileData) => {
    // Update the current user with new profile data
    if (user) {
      const updatedUser = {
        ...user,
        ...profileData,
      };
      setUser(updatedUser);
    }
  };

  // Firebase auth state
  useEffect(() => {
    let profileUnsubscribe = null;

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      // Clean up previous profile listener before creating a new one
      if (profileUnsubscribe) {
        profileUnsubscribe();
        profileUnsubscribe = null;
      }

      if (user) {
        // Load profile data from Firebase database
        const userRef = dbRef(database, `users/${user.uid}`);
        profileUnsubscribe = onValue(userRef, (snapshot) => {
          const dbProfileData = snapshot.val();

          let enhancedUser = { ...user };

          // Use database data or fallback to original Firebase auth data
          if (dbProfileData) {
            enhancedUser = {
              ...user,
              displayName:
                dbProfileData.displayName ||
                dbProfileData.name ||
                user.displayName,
              name:
                dbProfileData.name ||
                dbProfileData.displayName ||
                user.displayName,
              photoURL: dbProfileData.photoURL || user.photoURL,
              phone: dbProfileData.phone,
              address: dbProfileData.address,
              bio: dbProfileData.bio,
              role: dbProfileData.role,
            };
          }

          setUser(enhancedUser);
          // Only set loading to false after profile data is loaded
          setLoading(false);
        });
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (profileUnsubscribe) {
        profileUnsubscribe();
        profileUnsubscribe = null;
      }
    };
  }, []);

  return {
    user,
    loading,
    handleLogin,
    handleForgotPassword,
    handleLogout,
    handleProfileUpdate,
  };
}
