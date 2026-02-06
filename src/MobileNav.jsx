import React, { useState } from "react";
import "./MobileNav.css";

function MobileNav({ user, onLogout, activeTab, onTabChange }) {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleTabClick = (tabId) => {
    if (tabId === "logout") {
      console.log("Logout clicked, showing confirm modal");
      setShowLogoutConfirm(true);
    } else {
      onTabChange(tabId);
    }
  };

  const handleLogoutConfirm = () => {
    setShowLogoutConfirm(false);
    onLogout();
  };

  const handleLogoutCancel = () => {
    setShowLogoutConfirm(false);
  };

  const getInitials = (name) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      <div className="mobile-nav">
        <div
          className="mobile-nav-user"
          onClick={() => handleTabClick("profile")}
        >
          <div className="mobile-user-avatar">
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt="User"
                className="mobile-user-avatar-img"
              />
            ) : (
              getInitials(user?.displayName || user?.email)
            )}
          </div>
          <div className="mobile-user-info">
            <div className="mobile-user-name">
              {user?.displayName || "Felhasználó"}
            </div>
            <div className="mobile-user-email">{user?.email}</div>
          </div>
        </div>

        <div className="mobile-nav-tabs">
          <button
            className={`mobile-nav-tab ${activeTab === "books" ? "active" : ""}`}
            onClick={() => handleTabClick("books")}
          >
            <span className="mobile-nav-icon">�</span>
            <span className="mobile-nav-label">Bolt</span>
          </button>

          <button
            className={`mobile-nav-tab ${activeTab === "library" ? "active" : ""}`}
            onClick={() => handleTabClick("library")}
          >
            <span className="mobile-nav-icon">🏛️</span>
            <span className="mobile-nav-label">Könyvtár</span>
          </button>

          <button
            className={`mobile-nav-tab ${activeTab === "passcard" ? "active" : ""}`}
            onClick={() => handleTabClick("passcard")}
          >
            <span className="mobile-nav-icon">🎫</span>
            <span className="mobile-nav-label">Olvasókártya</span>
          </button>

          {user?.role === "admin" && (
            <button
              className={`mobile-nav-tab ${activeTab === "users" ? "active" : ""}`}
              onClick={() => handleTabClick("users")}
            >
              <span className="mobile-nav-icon">👥</span>
              <span className="mobile-nav-label">Felhasználók</span>
            </button>
          )}

          <button
            className="mobile-nav-tab logout-tab"
            onClick={() => handleTabClick("logout")}
          >
            <span className="mobile-nav-icon">🚪</span>
            <span className="mobile-nav-label">Kijelentkezés</span>
          </button>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <>
          {console.log("Rendering logout confirm modal")}
          <div className="logout-confirm-overlay">
            <div className="logout-confirm-modal">
              <div className="logout-confirm-header">
                <h3>Kijelentkezés Megerősítése</h3>
              </div>
              <div className="logout-confirm-body">
                <p>Biztosan ki szeretne jelentkezni?</p>
                <p className="logout-confirm-subtext">
                  Újra be kell jelentkeznie a fiókjához való hozzáféréshez.
                </p>
              </div>
              <div className="logout-confirm-actions">
                <button
                  className="logout-confirm-cancel"
                  onClick={handleLogoutCancel}
                >
                  Mégse
                </button>
                <button
                  className="logout-confirm-logout"
                  onClick={handleLogoutConfirm}
                >
                  Kijelentkezés
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

export default MobileNav;
