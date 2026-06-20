import React, { useState, useEffect } from "react";
import { Camera, Pencil, Save, X, Lock, CircleCheck, CircleX } from "lucide-react";
import { database, dbRef, ref, set, update, onValue, off, auth, uploadImageToStorage } from "./firebase.js";
import {
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";
import "./Profile.css";

function Profile({ user, onUpdateUser, loans = [] }) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    email: user?.email || "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [isToastExiting, setIsToastExiting] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("success");
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  // Filter loans for current user
  const userLoans = loans.filter(
    (loan) => loan.userId === user?.uid && loan.status === "active",
  );
  const loansLoading = false;

  // Load profile data from Firebase on mount
  useEffect(() => {
    if (!user?.uid) return;

    const userRef = dbRef(database, `users/${user.uid}`);
    const handleProfileData = (snapshot) => {
      const profileData = snapshot.val();

      if (profileData) {
        // Set avatar preview from Firebase data
        if (profileData.photoURL) {
          setAvatarPreview(profileData.photoURL);
        }
      }
    };

    onValue(userRef, handleProfileData);

    return () => {
      off(userRef, "value", handleProfileData);
    };
  }, [user?.uid]);

  // Fallback: Check if user has photoURL but avatarPreview is null
  useEffect(() => {
    if (user?.photoURL && !avatarPreview) {
      setAvatarPreview(user.photoURL);
    }
  }, [user, avatarPreview]);

  const showToastNotification = (message, type = "success") => {
    setIsToastExiting(false);
    setShowToast(true);

    // Store the message and type for the toast
    setToastMessage(message);
    setToastType(type);

    // Start exit animation after 2.5 seconds
    setTimeout(() => {
      setIsToastExiting(true);
    }, 2500);

    // Actually hide after 3 seconds (allows exit animation to complete)
    setTimeout(() => {
      setShowToast(false);
      setIsToastExiting(false);
    }, 3000);
  };

  // Save profile data to Firebase Realtime Database
  const saveProfileToFirebase = async (profileData) => {
    if (!user?.uid) {
      console.error("Cannot save to Firebase: no user UID");
      return;
    }

    try {
      const userRef = dbRef(database, `users/${user.uid}`);
      const userData = {
        displayName: profileData.displayName || user?.displayName || user?.name,
        email: profileData.email,
        photoURL: profileData.photoURL,
        updatedAt: profileData.updatedAt,
        // Keep existing fields if they exist
        role: profileData.role || "owner",
        createdAt: profileData.createdAt || new Date().toISOString(),
        lastLogin: profileData.lastLogin || null,
      };

      await update(userRef, userData);
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
        // Process the image file — returns a Blob
        const processedBlob = await processImageFile(file);

        // Create an object URL for local preview while upload completes
        const previewUrl = URL.createObjectURL(processedBlob);
        setAvatarPreview(previewUrl);

        // Upload to Firebase Storage
        const storagePath = `avatars/${user?.uid}_${Date.now()}.jpg`;
        const downloadURL = await uploadImageToStorage(processedBlob, storagePath);

        // Auto-save the avatar immediately after successful upload
        const profileData = {
          ...formData,
          photoURL: downloadURL,
          updatedAt: new Date().toISOString(),
        };

        // Update preview to use the permanent URL
        setAvatarPreview(downloadURL);

        // Save to Firebase
        try {
          await saveProfileToFirebase(profileData);
        } catch (error) {
          console.error("Failed to save avatar to Firebase:", error);
        }

        // Update the user in App component
        if (onUpdateUser) {
          onUpdateUser(profileData);
        }

        showToastNotification("Profilkép módosítása sikeres!", "success");
      } catch (error) {
        console.error("Error processing image:", error);
        showToastNotification(
          "Hiba történt a kép feldolgozása során!",
          "error",
        );
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

          // Convert to JPEG with 80% quality, resolve with Blob directly
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error("Failed to create blob from canvas"));
              }
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
    setLoading(true);
    setMessage("");

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const profileData = {
        displayName: formData.displayName,
        email: formData.email,
        photoURL: avatarPreview,
        updatedAt: new Date().toISOString(),
      };

      // Save to Firebase for real-time sync with UsersPanel
      try {
        await saveProfileToFirebase(profileData);
      } catch (error) {
        console.error("Failed to save profile to Firebase:", error);
        showToastNotification("Hiba történt a mentés során!", "error");
        setLoading(false);
        return;
      }

      showToastNotification("Profil sikeresen frissítve!", "success");
      setIsEditing(false);
      setLoading(false);

      if (onUpdateUser) {
        onUpdateUser(profileData);
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      showToastNotification("Hiba történt a frissítés során", "error");
      setIsEditing(false);
      setLoading(false);
    }
    setMessage("");
  };

  const handleEdit = () => {
    setFormData({
      displayName: user?.displayName || user?.name || "",
      email: user?.email || "",
    });
    setIsEditing(true);
  };

  const handleCancel = () => {
    setFormData({
      email: user?.email || "",
    });
    setIsEditing(false);
    setMessage("");
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showToastNotification("Az új jelszavak nem egyeznek!", "error");
      return;
    }
    if (passwordData.newPassword.length < 6) {
      showToastNotification(
        "Az új jelszónak legalább 6 karakter hosszúnak kell lennie!",
        "error",
      );
      return;
    }
    setPasswordLoading(true);
    try {
      const credential = EmailAuthProvider.credential(
        auth.currentUser.email,
        passwordData.currentPassword,
      );
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, passwordData.newPassword);
      showToastNotification("Jelszó sikeresen megváltoztatva!", "success");
      setShowPasswordForm(false);
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error) {
      console.error("Password change error:", error);
      if (error.code === "auth/wrong-password") {
        showToastNotification("Hibás jelenlegi jelszó!", "error");
      } else {
        showToastNotification(
          "Hiba történt a jelszó módosítása során!",
          "error",
        );
      }
    }
    setPasswordLoading(false);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Nincs dátum";
    return new Date(dateString).toLocaleDateString("hu-HU");
  };

  return (
    <div className="profile-container">
      <div className="profile-header">
        <h2>Profilom</h2>
      </div>

      <div className="avatar-section">
        <div className="avatar-container">
          {avatarPreview ? (
            <img src={avatarPreview} alt="Profile" className="profile-avatar" />
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
            <Camera size={20} />
          </button>
          <input
            id="avatar-upload"
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            style={{ display: "none" }}
          />
        </div>
      </div>

      <div className="profile-content">
        <div className="profile-section">
          <h3>Személyes Adatok</h3>
          <div className="profile-info">
            <div className="info-item">
              <label>Név</label>
              {!isEditing ? (
                <span>
                  {user?.displayName || user?.name || "Nincs beállítva"}
                </span>
              ) : (
                <input
                  type="text"
                  name="displayName"
                  value={formData.displayName}
                  onChange={handleInputChange}
                  className="profile-inline-input"
                  placeholder="Teljes név"
                />
              )}
            </div>
            <div className="info-item">
              <label>Email</label>
              {!isEditing ? (
                <span>{user?.email}</span>
              ) : (
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="profile-inline-input"
                  placeholder="Email cím"
                />
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
            <div className="section-actions">
              <button className="profile-edit-btn" onClick={handleEdit}>
                <Pencil size={16} style={{ verticalAlign: "middle", marginRight: 4 }} /> Profil Szerkesztése
              </button>
            </div>
          ) : (
            <div className="section-actions">
              <div className="form-actions">
                <button
                  className="save-btn"
                  onClick={handleSubmit}
                  disabled={loading}
                >
                  {loading ? "Mentés..." : <><Save size={16} style={{ verticalAlign: "middle", marginRight: 4 }} /> Mentés</>}
                </button>
                <button className="cancel-btn" onClick={handleCancel}>
                  <X size={16} style={{ verticalAlign: "middle", marginRight: 4 }} /> Mégse
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="profile-section">
          <h3>Jelszó Változtatás</h3>
          {!showPasswordForm ? (
            <div className="section-actions" style={{ marginTop: 0 }}>
              <button
                className="profile-edit-btn"
                onClick={() => setShowPasswordForm(true)}
              >
                <Lock size={16} style={{ verticalAlign: "middle", marginRight: 4 }} /> Jelszó Változtatás
              </button>
            </div>
          ) : (
            <form onSubmit={handlePasswordChange} className="password-form">
              <div className="form-group">
                <label>Jelenlegi jelszó</label>
                <input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) =>
                    setPasswordData({
                      ...passwordData,
                      currentPassword: e.target.value,
                    })
                  }
                  placeholder="Add meg a jelenlegi jelszavad"
                  required
                />
              </div>
              <div className="form-group">
                <label>Új jelszó</label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) =>
                    setPasswordData({
                      ...passwordData,
                      newPassword: e.target.value,
                    })
                  }
                  placeholder="Add meg az új jelszavad"
                  required
                  minLength={6}
                />
              </div>
              <div className="form-group">
                <label>Új jelszó megerősítése</label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) =>
                    setPasswordData({
                      ...passwordData,
                      confirmPassword: e.target.value,
                    })
                  }
                  placeholder="Írd be újra az új jelszavad"
                  required
                  minLength={6}
                />
              </div>
              <div className="form-actions">
                <button
                  type="submit"
                  className="save-btn"
                  disabled={passwordLoading}
                >
                  {passwordLoading ? "Mentés..." : <><Save size={16} style={{ verticalAlign: "middle", marginRight: 4 }} /> Jelszó Mentése</>}
                </button>
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => {
                    setShowPasswordForm(false);
                    setPasswordData({
                      currentPassword: "",
                      newPassword: "",
                      confirmPassword: "",
                    });
                  }}
                >
                  <X size={16} style={{ verticalAlign: "middle", marginRight: 4 }} /> Mégse
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="profile-section">
          <h3>Aktív Kölcsönzéseim</h3>
          {loansLoading ? (
            <div className="loading-loans">
              <p>Betöltés...</p>
            </div>
          ) : userLoans.length === 0 ? (
            <div className="no-loans">
              <p>Jelenleg nincs aktív kölcsönzésed.</p>
            </div>
          ) : (
            <div className="loans-list">
              {userLoans.map((loan) => (
                <div key={loan.id} className="loan-item">
                  <div className="loan-book-info">
                    <h4>{loan.bookTitle}</h4>
                    <p className="loan-author">{loan.bookAuthor}</p>
                  </div>
                  <div className="loan-details">
                    <p className="loan-date">
                      <strong>Kölcsönzés dátuma:</strong>{" "}
                      {formatDate(loan.loanDate)}
                    </p>
                    <p className="loan-date">
                      <strong>Visszahozás dátuma:</strong>{" "}
                      {formatDate(loan.dueDate)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Toast Notification */}
      {showToast && (
        <div
          style={{
            position: "fixed",
            top: "20px",
            right: "20px",
            background:
              toastType === "success"
                ? "linear-gradient(135deg, #28a745, #20c997)"
                : "linear-gradient(135deg, #dc3545, #c82333)",
            color: "white",
            padding: "16px 24px",
            borderRadius: "12px",
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.2)",
            zIndex: 10001,
            fontSize: "1rem",
            fontWeight: "500",
            maxWidth: "400px",
            wordWrap: "break-word",
            animation: isToastExiting
              ? "slideOutRight 0.3s ease-in forwards"
              : "slideInRight 0.3s ease-out",
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <span style={{ fontSize: "1.2rem" }}>
            {toastType === "success" ? <CircleCheck size={18} /> : <CircleX size={18} />}
          </span>
          <div>
            <div>{toastMessage}</div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Profile;
