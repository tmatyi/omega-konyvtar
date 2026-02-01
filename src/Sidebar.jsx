import React, { useState, useEffect } from "react";
import "./Sidebar.css";

function Sidebar({ user, onLogout, activeTab, onTabChange }) {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  let hoverTimeout;

  // Update main content margin when sidebar state changes
  useEffect(() => {
    const mainContent = document.querySelector(".main-content-with-sidebar");
    if (mainContent) {
      mainContent.style.marginLeft = isCollapsed ? "80px" : "280px";
    }
  }, [isCollapsed]);

  const tabs = [
    { id: "books", label: "Könyvek", icon: "📚" },
    { id: "passcard", label: "Olvasókártya", icon: "🎫" },
    { id: "logout", label: "Kijelentkezés", icon: "🚪" },
  ];

  const handleTabClick = (tabId) => {
    if (tabId === "logout") {
      setShowLogoutConfirm(true);
    } else {
      // Just navigate to the tab (hover handles expanding)
      onTabChange(tabId);
    }
  };

  const handleMouseEnter = () => {
    clearTimeout(hoverTimeout);
    setIsCollapsed(false);
  };

  const handleMouseLeave = () => {
    hoverTimeout = setTimeout(() => {
      setIsCollapsed(true);
    }, 300);
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
      <div
        className={`sidebar ${isCollapsed ? "collapsed" : ""}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="sidebar-user" onClick={() => handleTabClick("profile")}>
          <div className="user-avatar">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="User" className="user-avatar-img" />
            ) : (
              getInitials(user?.displayName || user?.email)
            )}
          </div>
          {!isCollapsed && (
            <div className="user-info">
              <div className="user-name">
                {user?.displayName || "Felhasználó"}
              </div>
              <div className="user-email">{user?.email}</div>
            </div>
          )}
          {!isCollapsed && (
            <button
              className="collapse-btn"
              onClick={(e) => {
                e.stopPropagation(); // Prevent triggering profile navigation
                setIsCollapsed(true);
              }}
            >
              ◀
            </button>
          )}
        </div>

        <nav className="sidebar-nav">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`nav-tab ${activeTab === tab.id ? "active" : ""} ${
                tab.id === "logout" ? "logout-tab" : ""
              }`}
              onClick={() => handleTabClick(tab.id)}
              title={isCollapsed ? tab.label : ""}
            >
              <span className="tab-icon">{tab.icon}</span>
              {!isCollapsed && <span className="tab-label">{tab.label}</span>}
            </button>
          ))}
        </nav>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
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
      )}
    </>
  );
}

export default Sidebar;
