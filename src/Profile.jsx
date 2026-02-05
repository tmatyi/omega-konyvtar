import React, { useState, useEffect } from "react";
import { database, ref, set, update, onValue, off } from "./firebase.js";
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
  const [showToast, setShowToast] = useState(false);
  const [isToastExiting, setIsToastExiting] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("success");
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [userLoans, setUserLoans] = useState([]);
  const [loansLoading, setLoansLoading] = useState(true);

  // Load user's current loans
  useEffect(() => {
    if (!user?.uid) return;

    const loansRef = ref(database, "loans");
    const handleLoansData = (snapshot) => {
      const loansData = snapshot.val();
      const userCurrentLoans = [];

      if (loansData) {
        Object.keys(loansData).forEach((loanId) => {
          const loan = loansData[loanId];
          if (loan.userId === user.uid && loan.status === "active") {
            userCurrentLoans.push({
              id: loanId,
              ...loan,
            });
          }
        });
      }

      setUserLoans(userCurrentLoans);
      setLoansLoading(false);
    };

    onValue(loansRef, handleLoansData);

    return () => {
      off(loansRef, "value", handleLoansData);
    };
  }, [user?.uid]);

  // Load profile data from Firebase on mount
  useEffect(() => {
    if (!user?.uid) return;

    const userRef = ref(database, `users/${user.uid}`);
    const handleProfileData = (snapshot) => {
      const profileData = snapshot.val();

      if (profileData) {
        console.log("Profile data loaded from Firebase:", profileData);

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
      console.log("Fallback: Setting avatar from user.photoURL");
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

        // Auto-save the avatar immediately after successful processing
        const profileData = {
          ...formData,
          photoURL: processedImage,
          updatedAt: new Date().toISOString(),
        };

        console.log("Auto-saving avatar after upload");

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
    setLoading(true);
    setMessage("");

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const profileData = {
        displayName: user?.displayName || user?.name,
        ...formData,
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
            📷
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
            <div className="section-actions">
              <button className="profile-edit-btn" onClick={handleEdit}>
                ✏️ Profil Szerkesztése
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
                  {loading ? "Mentés..." : "💾 Mentés"}
                </button>
                <button className="cancel-btn" onClick={handleCancel}>
                  ❌ Mégse
                </button>
              </div>
            </div>
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
            {toastType === "success" ? "✅" : "❌"}
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
