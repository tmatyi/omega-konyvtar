import { useState, useEffect } from "react";
import {
  auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  database,
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
        const userRef = ref(database, `users/${userCredential.user.uid}`);
        await update(userRef, {
          lastLogin: new Date().toISOString(),
        });
        console.log("Last login timestamp updated");
      } catch (dbError) {
        console.warn("Could not update last login timestamp:", dbError);
        // Don't fail login if database update fails
      }

      return userCredential.user;
    } catch (error) {
      throw error;
    }
  };

  const handleRegister = async (email, password, name, phone, address) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );

      // Create user record in Realtime Database
      const userRef = ref(database, `users/${userCredential.user.uid}`);
      const userData = {
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        displayName: name || email.split("@")[0], // Use name or first part of email
        phone: phone || "",
        address: address || "",
        role: "member", // Default role for new users
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        photoURL: null,
        bio: "",
      };

      await set(userRef, userData);
      console.log("User record created in database:", userData);

      return userCredential.user;
    } catch (error) {
      console.error("Registration error:", error);
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
      console.log("User profile updated in App component");
    }
  };

  // Firebase auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log("Auth state changed - user logged in:", user.email);

        // Load profile data from Firebase database
        const userRef = ref(database, `users/${user.uid}`);
        onValue(userRef, (snapshot) => {
          const dbProfileData = snapshot.val();
          console.log("Database profile data:", dbProfileData);

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
          console.log(
            "User enhanced with profile data, displayName:",
            enhancedUser.displayName,
          );
          console.log(
            "User enhanced with profile data, name:",
            enhancedUser.name,
          );
          // Only set loading to false after profile data is loaded
          setLoading(false);
        });
      } else {
        setUser(null);
        console.log("User is logged out");
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return {
    user,
    loading,
    handleLogin,
    handleRegister,
    handleLogout,
    handleProfileUpdate,
  };
}
