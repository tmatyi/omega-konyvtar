import React, { useState, useEffect } from "react";
import { database, ref, set, update } from "./firebase.js";
import "./Profile.css";

function Profile({ user, onUpdateUser }) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    email: user?.email || "",
    phone: "",
    address: "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [avatarPreview, setAvatarPreview] = useState(null);

  // Load saved profile data from localStorage on mount
  useEffect(() => {
    console.log("Profile component mounted, user:", user?.email);
    const savedProfile = localStorage.getItem(`profile_${user?.email}`);
    console.log("Saved profile found:", !!savedProfile);

    if (savedProfile) {
      try {
        const profileData = JSON.parse(savedProfile);
        console.log("Parsed profile data:", profileData);
        setFormData((prev) => ({
          ...prev,
          ...profileData,
        }));
        if (profileData.photoURL) {
          console.log("Setting avatar preview from saved data");
          setAvatarPreview(profileData.photoURL);
        }
      } catch (error) {
        console.error("Error loading saved profile:", error);
      }
    } else {
      console.log("No saved profile, using Firebase data");
      // Use Firebase user data if no saved profile
      setAvatarPreview(user?.photoURL || null);
    }
  }, [user]);

  // Fallback: Check if user has photoURL but avatarPreview is null
  useEffect(() => {
    if (user?.photoURL && !avatarPreview) {
      console.log("Fallback: Setting avatar from user.photoURL");
      setAvatarPreview(user.photoURL);
    }
  }, [user, avatarPreview]);

  // Save profile data to localStorage whenever it changes
  const saveProfileToStorage = (profileData) => {
    if (user?.email) {
      console.log(
        "Saving profile to storage:",
        profileData.photoURL ? "has avatar" : "no avatar",
      );
      localStorage.setItem(
        `profile_${user.email}`,
        JSON.stringify(profileData),
      );
      console.log("Profile saved to localStorage");
    } else {
      console.error("Cannot save profile: no user email");
    }
  };

  // Save profile data to Firebase Realtime Database
  const saveProfileToFirebase = async (profileData) => {
    if (!user?.uid) {
      console.error("Cannot save to Firebase: no user UID");
      return;
    }

    console.log("Saving profile to Firebase:", profileData);

    try {
      const userRef = ref(database, `users/${user.uid}`);
      const userData = {
        displayName: user?.displayName || user?.name,
        email: profileData.email,
        photoURL: profileData.photoURL,
        phone: profileData.phone,
        address: profileData.address,
        updatedAt: profileData.updatedAt,
        // Keep existing fields if they exist
        role: profileData.role || "member",
        createdAt: profileData.createdAt || new Date().toISOString(),
        lastLogin: profileData.lastLogin || null,
      };

      await update(userRef, userData);
      console.log("Profile saved to Firebase Realtime Database");
    } catch (error) {
      console.error("Error saving profile to Firebase:", error);
      throw error;
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      // Only accept JPG, JPEG, and PNG
      const validTypes = ["image/jpeg", "image/jpg", "image/png"];
      if (!validTypes.includes(file.type)) {
        setMessage("Kérem csak JPG, JPEG vagy PNG formátumot válasszon!");
        setMessageType("error");
        return;
      }

      // Check file size (max 10MB before processing)
      if (file.size > 10 * 1024 * 1024) {
        setMessage("A képfájl mérete nem haladhatja meg a 10MB-ot!");
        setMessageType("error");
        return;
      }

      try {
        // Process the image file
        const processedImage = await processImageFile(file);

        setAvatarPreview(processedImage);
        setMessage("Profilkép sikeresen feldolgozva!");
        setMessageType("success");

        // Auto-save the avatar immediately after successful processing
        const profileData = {
          ...formData,
          photoURL: processedImage,
          updatedAt: new Date().toISOString(),
        };

        console.log("Auto-saving avatar after upload");
        saveProfileToStorage(profileData);

        // Also save to Firebase for real-time sync
        try {
          await saveProfileToFirebase(profileData);
        } catch (error) {
          console.error("Failed to save avatar to Firebase:", error);
        }

        // Update the user in App component
        if (onUpdateUser) {
          onUpdateUser(profileData);
        }

        setMessage("Profilkép automatikusan mentve!");
        setMessageType("success");
      } catch (error) {
        console.error("Error processing image:", error);
        setMessage("Hiba történt a kép feldolgozása során!");
        setMessageType("error");
      }
    }
  };

  const processImageFile = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");

          // Calculate new dimensions (max 500x500, maintain aspect ratio)
          let { width, height } = img;
          const maxSize = 500;

          if (width > maxSize || height > maxSize) {
            if (width > height) {
              height = (height * maxSize) / width;
              width = maxSize;
            } else {
              width = (width * maxSize) / height;
              height = maxSize;
            }
          }

          canvas.width = width;
          canvas.height = height;

          // Draw and resize image
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to JPEG with 80% quality for smaller file size
          canvas.toBlob(
            (blob) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result);
              reader.readAsDataURL(blob);
            },
            "image/jpeg",
            0.8,
          );
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const triggerAvatarUpload = () => {
    const fileInput = document.getElementById("avatar-upload");
    if (fileInput) {
      fileInput.click();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("handleSubmit called");
    setLoading(true);
    setMessage("");

    try {
      // Here you would typically update the user profile in Firebase
      // For now, we'll just show a success message
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const profileData = {
        displayName: user?.displayName || user?.name,
        ...formData,
        photoURL: avatarPreview,
        updatedAt: new Date().toISOString(),
      };

      console.log("About to save profile data:", profileData);
      // Save to localStorage for persistence
      saveProfileToStorage(profileData);

      // Also save to Firebase for real-time sync with UsersPanel
      try {
        console.log("About to save profile to Firebase:", profileData);
        await saveProfileToFirebase(profileData);
        console.log("Profile saved to both localStorage and Firebase");
      } catch (error) {
        console.error("Failed to save profile to Firebase:", error);
        // Still show success since localStorage save worked
        console.log("Profile saved to localStorage only");
      }

      setMessage(
        "Profil sikeresen frissítve!" +
          (avatarPreview ? " Profilkép is frissítve!" : ""),
      );
      setMessageType("success");
      setIsEditing(false);
      setLoading(false);

      if (onUpdateUser) {
        onUpdateUser(profileData);
      }
    } catch (error) {
      setMessage("Hiba történt a frissítés során");
      setMessageType("error");
      setIsEditing(false);
      setLoading(false);
      setMessage("");
    }
  };

  const handleEdit = () => {
    setFormData({
      email: user?.email || "",
      phone: user?.phone || "",
      address: user?.address || "",
    });
    setIsEditing(true);
  };

  const handleCancel = () => {
    setFormData({
      email: user?.email || "",
      phone: "",
      address: "",
    });
    setIsEditing(false);
    setMessage("");
  };

  return (
    <div className="profile-container">
      <div className="profile-header">
        <h2>Profilom</h2>
        <div className="avatar-section">
          <div className="avatar-container">
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt="Profile"
                className="profile-avatar"
              />
            ) : (
              <div className="avatar-placeholder">
                {user?.displayName?.charAt(0)?.toUpperCase() ||
                  user?.email?.charAt(0)?.toUpperCase() ||
                  "U"}
              </div>
            )}
            <button
              className="avatar-change-btn"
              onClick={triggerAvatarUpload}
              title="Profilkép cseréje"
            >
              📷
            </button>
            <input
              id="avatar-upload"
              type="file"
              accept="image/jpeg,image/jpg,image/png"
              onChange={handleAvatarChange}
              style={{ display: "none" }}
            />
          </div>
        </div>
      </div>

      <div className="profile-content">
        <div className="profile-section">
          <h3>Személyes Adatok</h3>
          <div className="profile-info">
            <div className="info-item">
              <label>Név</label>
              <span>
                {user?.displayName || user?.name || "Nincs beállítva"}
              </span>
            </div>
            <div className="info-item">
              <label>Email</label>
              <span>{user?.email}</span>
            </div>
            <div className="info-item">
              <label>Telefonszám</label>
              {isEditing ? (
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="edit-input"
                  placeholder="+36 20 123 4567"
                />
              ) : (
                <span>{user?.phone || "Nincs megadva"}</span>
              )}
            </div>
            <div className="info-item">
              <label>Lakcím</label>
              {isEditing ? (
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  className="edit-input"
                  placeholder="1234 Budapest, Utca utca 1."
                />
              ) : (
                <span>{user?.address || "Nincs megadva"}</span>
              )}
            </div>
            <div className="info-item">
              <label>Regisztráció dátuma</label>
              <span>
                {user?.metadata?.creationTime
                  ? new Date(user.metadata.creationTime).toLocaleDateString(
                      "hu-HU",
                    )
                  : "Ismeretlen"}
              </span>
            </div>
            <div className="info-item">
              <label>Utolsó bejelentkezés</label>
              <span>
                {user?.metadata?.lastSignInTime
                  ? new Date(user.metadata.lastSignInTime).toLocaleDateString(
                      "hu-HU",
                    )
                  : "Ismeretlen"}
              </span>
            </div>
          </div>

          {!isEditing ? (
            <button className="edit-btn" onClick={handleEdit}>
              ✏️ Profil Szerkesztése
            </button>
          ) : (
            <div className="form-actions">
              <button
                className="save-btn"
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? "Mentés..." : "💾 Mentés"}
              </button>
              <button className="cancel-btn" onClick={handleCancel}>
                ❌ Mégse
              </button>
            </div>
          )}

          {message && <div className={`message ${messageType}`}>{message}</div>}
        </div>

        <div className="profile-section">
          <h3>Statisztikák</h3>
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-number">0</div>
              <div className="stat-label">Hozzáadott könyv</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">0</div>
              <div className="stat-label">Kölcsönzés</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">0</div>
              <div className="stat-label">Foglalás</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">0</div>
              <div className="stat-label">Értékelés</div>
            </div>
          </div>
        </div>

        <div className="profile-section">
          <h3>Beállítások</h3>
          <div className="settings-list">
            <div className="setting-item">
              <label>Értesítések</label>
              <div className="setting-control">
                <label className="switch">
                  <input type="checkbox" defaultChecked />
                  <span className="slider"></span>
                </label>
              </div>
            </div>
            <div className="setting-item">
              <label>Email hírlevél</label>
              <div className="setting-control">
                <label className="switch">
                  <input type="checkbox" />
                  <span className="slider"></span>
                </label>
              </div>
            </div>
            <div className="setting-item">
              <label>Profil láthatósága</label>
              <div className="setting-control">
                <select className="setting-select">
                  <option value="public">Nyilvános</option>
                  <option value="friends">Barátok</option>
                  <option value="private">Privát</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;
